import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import {
  captureCrmSnapshotToMyco,
  computeMycoSignature,
  getMycoIntegrationOverview,
  processMycoWebhookPayload,
  sanitizeTextForMycoFerpa,
  syncCrmEventToMyco,
} from "./services/mycoService";
import { deleteMycoSpore } from "./db/myco";
import { _execDnsRunInternal } from "./db/doNotServe";
// @ts-ignore - ESM MCP script
import { handleJsonRpcMessage } from "../scripts/myco-mcp-server.mjs";

const ownerCaller = appRouter.createCaller({
  req: { headers: {} } as any,
  res: {} as any,
  user: {
    id: 1,
    openId: "test-owner-1",
    name: "Byron Honea",
    email: "byron@waypointadvocates.com",
    role: "admin",
    timezone: "America/New_York",
  } as any,
});

describe("Myco Dual Integration (Part 1 MCP Memory + Part 2 Live CRM Bridge)", () => {
  it("exposes MCP tools (initialize, tools/list, myco_recall, myco_project_summary)", () => {
    const initRes = handleJsonRpcMessage({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2024-11-05" },
    });
    expect(initRes?.result?.serverInfo?.name).toBe("myco-waypoint-mcp");

    const toolsRes = handleJsonRpcMessage({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
    });
    const toolNames = toolsRes?.result?.tools?.map((t: any) => t.name) || [];
    expect(toolNames).toContain("myco_recall");
    expect(toolNames).toContain("myco_memorize");
    expect(toolNames).toContain("myco_project_summary");

    const recallRes = handleJsonRpcMessage({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "myco_recall",
        arguments: { query: "Do Not Serve" },
      },
    });
    const parsedRecall = JSON.parse(recallRes?.result?.content?.[0]?.text || "{}");
    expect(parsedRecall.count).toBeGreaterThanOrEqual(1);
  });

  it("sanitizes FERPA student/family PII before external Myco sync", () => {
    const raw =
      "Student Leo Vance (DOB: 04/15/2016) parent email eleanor.vance@example.com phone (404) 555-0192";
    const sanitized = sanitizeTextForMycoFerpa(raw);
    expect(sanitized).not.toContain("eleanor.vance@example.com");
    expect(sanitized).not.toContain("(404) 555-0192");
    expect(sanitized).not.toContain("04/15/2016");
    expect(sanitized).toContain("[REDACTED-EMAIL]");
    expect(sanitized).toContain("[REDACTED-PHONE]");
    expect(sanitized).toContain("DOB: [REDACTED-DOB]");
  });

  it("captures CRM snapshot to Myco and blocks outbound sync for Do Not Serve entries", async () => {
    const snapshot = await captureCrmSnapshotToMyco(1, "Byron Honea");
    expect(snapshot.spore.id).toBeTruthy();
    expect(snapshot.spore.kind).toBe("discovery");

    // Clean up test snapshot spore so we keep .myco/spores.json tidy
    await deleteMycoSpore(1, snapshot.spore.id);

    const uniqueEmail = `myco.restricted.${Date.now()}@example.invalid`;
    const createdContact = await ownerCaller.contacts.create({
      firstName: "Myco",
      lastName: "Restricted",
      phone: "(202) 555-0174",
      email: uniqueEmail,
      company: "Restricted Test Household",
      jobTitle: "Parent",
    });
    const contactId = Number((createdContact as any).insertId || (createdContact as any).id);
    await ownerCaller.contacts.archive({ id: contactId, reason: "Archived for Myco DNS test" });

    const dnsCreated = await ownerCaller.doNotServe.createFromArchive({
      contactId,
      reasonSummary: "Restricted test record for Myco outbound & inbound screening.",
      appliesTo: "individual",
    });
    const entryId = dnsCreated.entryId;

    try {
      const blockedOutbound = await syncCrmEventToMyco({
        ownerId: 1,
        eventType: "lead.created",
        kind: "workflow",
        title: "Lead Sync for Restricted Contact",
        summary: "Attempting to sync restricted contact",
        contactCandidate: {
          contactId,
          fullName: "Myco Restricted",
          email: uniqueEmail,
          phone: "(202) 555-0174",
        },
      });
      expect(blockedOutbound.ok).toBe(false);
      expect(blockedOutbound.blockedByDoNotServe).toBe(true);
      expect(blockedOutbound.spore).toBeNull();

      // Test inbound webhook HMAC signature verification & Do Not Serve flagging
      const overview = await getMycoIntegrationOverview(1);
      const secret = overview.config.webhookSecret;
      const webhookPayload = {
        event: "inquiry.received",
        spore: {
          id: `spore-test-webhook-${Date.now()}`,
          kind: "discovery",
          title: "Inbound Myco Inquiry",
          summary: "Incoming contact from Myco collective",
        },
        contact: {
          fullName: "Myco Restricted",
          email: uniqueEmail,
        },
      };
      const rawBody = JSON.stringify(webhookPayload);
      const validSig = computeMycoSignature(rawBody, secret);

      const unauthorized = await processMycoWebhookPayload({
        ownerId: 1,
        rawBody,
        body: webhookPayload,
        signatureHeader: "sha256=invalid_signature",
      });
      expect(unauthorized.ok).toBe(false);
      expect(unauthorized.httpStatus).toBe(401);

      const authorized = await processMycoWebhookPayload({
        ownerId: 1,
        rawBody,
        body: webhookPayload,
        signatureHeader: `sha256=${validSig}`,
      });
      expect(authorized.ok).toBe(true);
      expect(authorized.httpStatus).toBe(200);
      expect(authorized.doNotServeMatched).toBe(true);
      expect(authorized.spore?.title).toContain("[DNS Review]");

      if (authorized.spore?.id) {
        await deleteMycoSpore(1, authorized.spore.id);
      }
    } finally {
      await _execDnsRunInternal(`DELETE FROM do_not_serve_audit_log WHERE entry_id = ?`, [entryId]).catch(() => {});
      await _execDnsRunInternal(`DELETE FROM do_not_serve_identifiers WHERE entry_id = ?`, [entryId]).catch(() => {});
      await _execDnsRunInternal(`DELETE FROM do_not_serve_entries WHERE id = ?`, [entryId]).catch(() => {});
      await _execDnsRunInternal(`DELETE FROM contacts WHERE id = ?`, [contactId]).catch(() => {});
    }
  });
});
