import crypto from "node:crypto";
import {
  getMycoConfig,
  listMycoSpores,
  listMycoSyncLogs,
  recordMycoSyncLog,
  upsertMycoSpore,
  type MycoConfigRecord,
  type MycoSporeKind,
  type MycoSporeRecord,
  type MycoSyncLogRecord,
} from "../db/myco";
import { _execDnsSelectInternal } from "../db/doNotServe";
import { evaluateDoNotServeCandidate } from "./doNotServeService";

export function sanitizeTextForMycoFerpa(text: string): string {
  if (!text) return "";
  return text
    // Mask email addresses
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED-EMAIL]")
    // Mask US phone numbers
    .replace(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/g, "[REDACTED-PHONE]")
    // Mask SSN-like patterns
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[REDACTED-ID]")
    // Mask explicit DOB patterns
    .replace(/\b(?:DOB|Date of Birth)\s*[:=-]?\s*\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/gi, "DOB: [REDACTED-DOB]");
}

export function computeMycoSignature(rawBody: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
}

export function verifyMycoWebhookAuth(params: {
  rawBody: string;
  signatureHeader?: string | null;
  secretHeader?: string | null;
  expectedSecret: string;
}): boolean {
  const expected = (params.expectedSecret || "").trim();
  if (!expected) return true;

  const providedSecret = (params.secretHeader || "").trim();
  if (providedSecret && providedSecret === expected) {
    return true;
  }

  const providedSig = (params.signatureHeader || "")
    .trim()
    .replace(/^sha256=/i, "");
  if (!providedSig) return false;

  const computed = computeMycoSignature(params.rawBody, expected);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(providedSig, "utf8"),
      Buffer.from(computed, "utf8")
    );
  } catch {
    return false;
  }
}

export async function syncCrmEventToMyco(input: {
  ownerId?: number;
  eventType: string;
  kind?: MycoSporeKind;
  title: string;
  summary: string;
  tags?: string[];
  author?: string;
  source?: string;
  entityType?: string | null;
  entityId?: string | null;
  contactCandidate?: {
    contactId?: number | null;
    fullName?: string | null;
    phone?: string | null;
    email?: string | null;
  };
}): Promise<{
  ok: boolean;
  blockedByDoNotServe: boolean;
  spore: MycoSporeRecord | null;
  log: MycoSyncLogRecord;
}> {
  const ownerId = input.ownerId ?? 1;
  const config = await getMycoConfig(ownerId);

  // 1. Check Do Not Serve if contact candidate info is attached
  if (input.contactCandidate) {
    const dnsEval = await evaluateDoNotServeCandidate({
      ownerId,
      contactIds: input.contactCandidate.contactId ? [input.contactCandidate.contactId] : [],
      names: input.contactCandidate.fullName ? [input.contactCandidate.fullName] : [],
      phones: input.contactCandidate.phone ? [input.contactCandidate.phone] : [],
      emails: input.contactCandidate.email ? [input.contactCandidate.email] : [],
      targetEntityType: "myco_outbound_sync",
      targetEntityId: input.contactCandidate.email || input.contactCandidate.phone || input.title,
    });

    const hardMatches = dnsEval.matches.filter((m) => m.matchTier === "hard_match");
    if (dnsEval.hasActiveMatch && hardMatches.length > 0) {
      const log = await recordMycoSyncLog({
        ownerId,
        direction: "outbound",
        eventType: input.eventType,
        status: "blocked_do_not_serve",
        summary: `Suppressed outbound Myco sync (${input.title}): matched active Do Not Serve restriction.`,
        doNotServeMatched: true,
        ferpaSanitized: config.ferpaSanitizeExternal,
      });
      return {
        ok: false,
        blockedByDoNotServe: true,
        spore: null,
        log,
      };
    }
  }

  const shouldSanitize = config.ferpaSanitizeExternal;
  const finalTitle = shouldSanitize ? sanitizeTextForMycoFerpa(input.title) : input.title;
  const finalSummary = shouldSanitize ? sanitizeTextForMycoFerpa(input.summary) : input.summary;

  const spore = await upsertMycoSpore({
    ownerId,
    kind: input.kind || "workflow",
    title: finalTitle,
    summary: finalSummary,
    tags: input.tags || ["crm-sync", input.eventType],
    source: input.source || "waypoint-crm",
    author: input.author || "Waypoint CRM Bridge",
    ferpaSanitized: shouldSanitize,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
  });

  let deliveryStatus: MycoSyncLogRecord["status"] = "stored_locally";
  let deliveryNote = `Recorded spore "${spore.title}" in Myco collective memory (.myco/spores.json & D1).`;

  if (config.enabled && config.endpointUrl && /^https?:\/\//i.test(config.endpointUrl)) {
    const payload = JSON.stringify({
      event: input.eventType,
      project: "custom-crm-pro",
      practice: "Waypoint Advocates",
      ferpaSanitized: shouldSanitize,
      spore,
      timestamp: new Date().toISOString(),
    });
    const sig = computeMycoSignature(payload, config.webhookSecret);

    try {
      const res = await fetch(config.endpointUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-myco-signature": `sha256=${sig}`,
          "x-myco-project": "custom-crm-pro",
        },
        body: payload,
      });
      if (res.ok) {
        deliveryStatus = "delivered";
        deliveryNote = `Synced spore "${spore.title}" to local Myco store and remote daemon (${res.status}).`;
      } else {
        deliveryStatus = "stored_locally";
        deliveryNote = `Saved spore "${spore.title}" locally; remote endpoint returned HTTP ${res.status}.`;
      }
    } catch {
      deliveryStatus = "stored_locally";
      deliveryNote = `Saved spore "${spore.title}" locally (remote endpoint offline/unreachable).`;
    }
  }

  const log = await recordMycoSyncLog({
    ownerId,
    direction: "outbound",
    eventType: input.eventType,
    status: deliveryStatus,
    summary: deliveryNote,
    doNotServeMatched: false,
    ferpaSanitized: shouldSanitize,
    payloadPreview: JSON.stringify({ id: spore.id, kind: spore.kind, title: spore.title }),
  });

  return {
    ok: true,
    blockedByDoNotServe: false,
    spore,
    log,
  };
}

export async function captureCrmSnapshotToMyco(
  ownerId = 1,
  actorName = "Byron Honea"
): Promise<{
  spore: MycoSporeRecord;
  log: MycoSyncLogRecord;
  metrics: {
    contactsCount: number;
    leadsCount: number;
    projectsCount: number;
    activeDoNotServeCount: number;
  };
}> {
  let contactsCount = 0;
  let leadsCount = 0;
  let projectsCount = 0;
  let activeDoNotServeCount = 0;

  try {
    const cRows = await _execDnsSelectInternal(`SELECT COUNT(*) AS cnt FROM contacts`, []);
    contactsCount = Number(cRows[0]?.cnt ?? 0);
  } catch {
    contactsCount = 0;
  }
  try {
    const lRows = await _execDnsSelectInternal(`SELECT COUNT(*) AS cnt FROM leads`, []);
    leadsCount = Number(lRows[0]?.cnt ?? 0);
  } catch {
    leadsCount = 0;
  }
  try {
    const pRows = await _execDnsSelectInternal(`SELECT COUNT(*) AS cnt FROM projects`, []);
    projectsCount = Number(pRows[0]?.cnt ?? 0);
  } catch {
    projectsCount = 0;
  }
  try {
    const dRows = await _execDnsSelectInternal(
      `SELECT COUNT(*) AS cnt FROM do_not_serve_entries WHERE status = 'active'`,
      []
    );
    activeDoNotServeCount = Number(dRows[0]?.cnt ?? 0);
  } catch {
    activeDoNotServeCount = 0;
  }

  const title = `Waypoint CRM Operational Snapshot (${new Date().toISOString().slice(0, 10)})`;
  const summary =
    `Aggregate FERPA-safe CRM snapshot: ${contactsCount} contact records, ${leadsCount} lead inquiries, ` +
    `${projectsCount} student advocacy workspaces, and ${activeDoNotServeCount} active Do Not Serve restrictions enforced across Phone, SMS, Lead Forms, Intake, and Marketing.`;

  const result = await syncCrmEventToMyco({
    ownerId,
    eventType: "crm.snapshot.synced",
    kind: "discovery",
    title,
    summary,
    tags: ["crm-snapshot", "metrics", "PG-014", "ferpa-safe"],
    author: actorName,
    source: "PG-014 Integrations",
  });

  return {
    spore: result.spore!,
    log: result.log,
    metrics: {
      contactsCount,
      leadsCount,
      projectsCount,
      activeDoNotServeCount,
    },
  };
}

export async function processMycoWebhookPayload(params: {
  ownerId?: number;
  rawBody: string;
  body: Record<string, any>;
  signatureHeader?: string | null;
  secretHeader?: string | null;
  skipAuthCheck?: boolean;
}): Promise<{
  ok: boolean;
  httpStatus: number;
  error?: string;
  doNotServeMatched: boolean;
  doNotServeSummary?: string | null;
  spore?: MycoSporeRecord | null;
  log: MycoSyncLogRecord;
}> {
  const ownerId = params.ownerId ?? 1;
  const config = await getMycoConfig(ownerId);

  if (!params.skipAuthCheck) {
    const valid = verifyMycoWebhookAuth({
      rawBody: params.rawBody,
      signatureHeader: params.signatureHeader,
      secretHeader: params.secretHeader,
      expectedSecret: config.webhookSecret,
    });
    if (!valid) {
      const log = await recordMycoSyncLog({
        ownerId,
        direction: "inbound",
        eventType: String(params.body?.event || "webhook.unauthorized"),
        status: "rejected_signature",
        summary: "Rejected inbound Myco webhook: invalid x-myco-signature / x-myco-secret.",
        doNotServeMatched: false,
        ferpaSanitized: true,
        payloadPreview: params.rawBody.slice(0, 200),
      });
      return {
        ok: false,
        httpStatus: 401,
        error: "Invalid Myco webhook signature or secret",
        doNotServeMatched: false,
        log,
      };
    }
  }

  const eventType = String(params.body?.event || params.body?.type || "spore.created");
  const candidate = params.body?.contact || params.body?.person || {};
  const candidateName = String(candidate.fullName || candidate.name || params.body?.fullName || "").trim();
  const candidatePhone = String(candidate.phone || params.body?.phone || "").trim();
  const candidateEmail = String(candidate.email || params.body?.email || "").trim();

  let doNotServeMatched = false;
  let doNotServeSummary: string | null = null;

  if (candidateName || candidatePhone || candidateEmail) {
    const dnsResult = await evaluateDoNotServeCandidate({
      ownerId,
      names: candidateName ? [candidateName] : [],
      phones: candidatePhone ? [candidatePhone] : [],
      emails: candidateEmail ? [candidateEmail] : [],
      targetEntityType: "myco_inbound_webhook",
      targetEntityId: candidateEmail || candidatePhone || candidateName || eventType,
    });

    if (dnsResult.hasActiveMatch && dnsResult.matches.length > 0) {
      doNotServeMatched = true;
      const topMatch = dnsResult.matches[0];
      doNotServeSummary = topMatch
        ? `Restricted match (${topMatch.matchTier}): ${topMatch.displayName}`
        : "Matched Do Not Serve register";
    }
  }

  const sporePayload = params.body?.spore || params.body?.data || params.body || {};
  const rawTitle = String(
    sporePayload.title ||
      params.body?.title ||
      (candidateName ? `Myco Inbound Signal · ${candidateName}` : `Myco Event · ${eventType}`)
  ).trim();
  const rawSummary = String(
    sporePayload.summary ||
      sporePayload.content ||
      params.body?.summary ||
      `Received Myco event "${eventType}".`
  ).trim();

  const rawKind = String(sporePayload.kind || params.body?.kind || "discovery").toLowerCase();
  const allowedKinds: MycoSporeKind[] = [
    "architecture",
    "guardrail",
    "decision",
    "discovery",
    "workflow",
    "case_note",
  ];
  const kind: MycoSporeKind = allowedKinds.includes(rawKind as MycoSporeKind)
    ? (rawKind as MycoSporeKind)
    : "discovery";

  const tags: string[] = Array.isArray(sporePayload.tags)
    ? sporePayload.tags.map(String)
    : ["myco-webhook", eventType];
  if (doNotServeMatched && !tags.includes("do-not-serve-flagged")) {
    tags.push("do-not-serve-flagged");
  }

  const spore = await upsertMycoSpore({
    id: sporePayload.id ? String(sporePayload.id) : undefined,
    ownerId,
    kind,
    title: doNotServeMatched ? `[DNS Review] ${rawTitle}` : rawTitle,
    summary: doNotServeSummary ? `${rawSummary} (${doNotServeSummary})` : rawSummary,
    tags,
    source: String(sporePayload.source || "myco-webhook"),
    author: String(sporePayload.author || "Myco Daemon"),
    ferpaSanitized: Boolean(config.ferpaSanitizeExternal),
  });

  const log = await recordMycoSyncLog({
    ownerId,
    direction: "inbound",
    eventType,
    status: doNotServeMatched ? "blocked_do_not_serve" : "delivered",
    summary: doNotServeMatched
      ? `Inbound Myco event "${eventType}" flagged by Do Not Serve (${doNotServeSummary}).`
      : `Ingested inbound Myco spore "${spore.title}" (${spore.kind}).`,
    doNotServeMatched,
    ferpaSanitized: config.ferpaSanitizeExternal,
    payloadPreview: params.rawBody.slice(0, 300),
  });

  return {
    ok: true,
    httpStatus: 200,
    doNotServeMatched,
    doNotServeSummary,
    spore,
    log,
  };
}

export async function getMycoIntegrationOverview(ownerId = 1): Promise<{
  config: MycoConfigRecord;
  spores: MycoSporeRecord[];
  logs: MycoSyncLogRecord[];
  stats: {
    totalSpores: number;
    byKind: Record<string, number>;
    inboundCount: number;
    outboundCount: number;
    dnsFlaggedCount: number;
  };
}> {
  const [config, spores, logs] = await Promise.all([
    getMycoConfig(ownerId),
    listMycoSpores({ ownerId, limit: 50 }),
    listMycoSyncLogs(ownerId, 20),
  ]);

  const byKind: Record<string, number> = {};
  for (const s of spores) {
    byKind[s.kind] = (byKind[s.kind] || 0) + 1;
  }

  const inboundCount = logs.filter((l) => l.direction === "inbound").length;
  const outboundCount = logs.filter((l) => l.direction === "outbound").length;
  const dnsFlaggedCount = logs.filter((l) => l.doNotServeMatched).length;

  return {
    config,
    spores,
    logs,
    stats: {
      totalSpores: spores.length,
      byKind,
      inboundCount,
      outboundCount,
      dnsFlaggedCount,
    },
  };
}

