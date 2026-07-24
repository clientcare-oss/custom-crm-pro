import { isWithinLookback } from "../shared/complaintEngine";
import type { Allegation, ComplaintCase, EvidenceLink, RequestedRemedy, TimelineEvent } from "../drizzle/schema";

export type ReadinessItem = {
  key: string;
  label: string;
  status: "ok" | "warning" | "error";
  detail: string;
  /** Left-rail section key the direct-action button should open */
  sectionKey: string;
};

export type ReadinessCategory = {
  key: "required_information" | "allegation_development" | "evidence_support" | "writing_review" | "filing_logistics";
  label: string;
  status: "not_started" | "needs_information" | "ready_for_review" | "ready_to_file";
  items: ReadinessItem[];
};

export type ReadinessReport = {
  categories: ReadinessCategory[];
  percentComplete: number;
  readyToFile: boolean;
  blockers: number;
  warnings: number;
};

function categoryStatus(items: ReadinessItem[]): ReadinessCategory["status"] {
  if (!items.length) return "not_started";
  const errors = items.filter(i => i.status === "error").length;
  const warnings = items.filter(i => i.status === "warning").length;
  if (errors === items.length) return "not_started";
  if (errors > 0) return "needs_information";
  if (warnings > 0) return "ready_for_review";
  return "ready_to_file";
}

export function buildReadinessReport(input: {
  c: ComplaintCase;
  allegations: Allegation[];
  timeline: TimelineEvent[];
  evidenceLinks: EvidenceLink[];
  evidenceCount: number;
  remedies: RequestedRemedy[];
  draftSections: string[];
}): ReadinessReport {
  const { c } = input;
  const accepted = input.allegations.filter(a => ["accepted", "needs_facts", "needs_evidence", "drafted", "ready_for_review"].includes(a.status));

  // --- Required Information (Georgia state-required fields) ---
  const req: ReadinessItem[] = [];
  const reqField = (key: string, label: string, value: unknown, sectionKey = "case-information") => {
    req.push({
      key, label, sectionKey,
      status: value ? "ok" : "error",
      detail: value ? "Provided" : `${label} is required by the Georgia complaint form.`,
    });
  };
  reqField("complainant_name", "Complainant name", c.complainantName);
  reqField("complainant_relationship", "Relationship to student", c.complainantRelationship);
  reqField("complainant_address", "Complainant address", c.complainantAddress);
  reqField("complainant_phone", "Complainant telephone", c.complainantPhone);
  reqField("complainant_email", "Complainant email", c.complainantEmail);
  reqField("student_name", "Student name", c.studentName);
  reqField("student_dob", "Student date of birth", c.studentDob);
  reqField("student_address", "Student address", c.studentAddress);
  reqField("student_school", "Current school", c.studentSchool);
  reqField("agency", "Public agency filed against", c.agencyName);
  req.push({
    key: "gtid", label: "GTID", sectionKey: "case-information",
    status: c.studentGtid ? "ok" : "warning",
    detail: c.studentGtid ? "Provided" : "GTID is requested when known — optional but recommended.",
  });
  if (c.parentDifferent) {
    reqField("parent_name", "Parent name (parent differs from complainant)", c.parentName);
  }
  req.push({
    key: "signature", label: "Complainant signature", sectionKey: "filing-review",
    status: c.signatureName && c.signatureDate ? "ok" : "error",
    detail: c.signatureName && c.signatureDate ? `Signed by ${c.signatureName}` : "Georgia requires the complainant's signature and date.",
  });

  // --- Allegation Development ---
  const alg: ReadinessItem[] = [];
  if (!accepted.length) {
    alg.push({
      key: "no_allegations", label: "Accepted allegations", sectionKey: "allegations",
      status: "error", detail: "The complaint needs at least one accepted allegation.",
    });
  } else {
    for (const a of accepted) {
      const elements = (a.requiredElements ?? []) as { text: string; met: boolean }[];
      const unmet = elements.filter(e => !e.met);
      alg.push({
        key: `alg_${a.id}_elements`, label: `Allegation ${String(a.seqNumber).padStart(2, "0")} — required elements`, sectionKey: "allegations",
        status: elements.length === 0 ? "warning" : unmet.length ? "warning" : "ok",
        detail: elements.length === 0
          ? "No required-element checklist yet."
          : unmet.length ? `${unmet.length} of ${elements.length} elements not yet supported.` : "All required elements marked supported.",
      });
      alg.push({
        key: `alg_${a.id}_notice`, label: `Allegation ${String(a.seqNumber).padStart(2, "0")} — district notice`, sectionKey: "allegations",
        status: a.districtNotice ? "ok" : "warning",
        detail: a.districtNotice ? "District notice described." : "Describe how and when the district knew or should have known.",
      });
    }
  }

  // One-year lookback per allegation (via linked timeline events)
  const lookbackProblems: string[] = [];
  for (const a of accepted) {
    const linkedEvents = input.timeline.filter(t => ((t.linkedAllegationIds ?? []) as number[]).includes(a.id));
    const datedEvents = linkedEvents.filter(e => e.eventDate);
    if (datedEvents.length && datedEvents.every(e => isWithinLookback(e.eventDate) === false)) {
      lookbackProblems.push(`Allegation ${String(a.seqNumber).padStart(2, "0")}`);
    }
  }
  alg.push({
    key: "lookback", label: "One-year filing window", sectionKey: "timeline",
    status: lookbackProblems.length ? "error" : "ok",
    detail: lookbackProblems.length
      ? `${lookbackProblems.join(", ")}: every linked dated event is more than one year old. GaDOE can only investigate violations within one year of receipt.`
      : "No allegation relies solely on events outside the one-year window.",
  });

  // --- Evidence Support ---
  const ev: ReadinessItem[] = [];
  ev.push({
    key: "evidence_exists", label: "Evidence library", sectionKey: "evidence",
    status: input.evidenceCount ? "ok" : "warning",
    detail: input.evidenceCount ? `${input.evidenceCount} evidence item(s) on file.` : "No evidence uploaded. A complaint may be filed without exhibits, but evidence strengthens it.",
  });
  for (const a of accepted) {
    const links = input.evidenceLinks.filter(l => l.targetType === "allegation" && l.targetId === a.id);
    ev.push({
      key: `alg_${a.id}_evidence`, label: `Allegation ${String(a.seqNumber).padStart(2, "0")} — supporting evidence`, sectionKey: "allegations",
      status: links.length ? "ok" : "warning",
      detail: links.length ? `${links.length} exhibit(s) linked.` : "No evidence linked to this allegation yet.",
    });
  }

  // --- Writing Review ---
  const wr: ReadinessItem[] = [];
  for (const a of accepted) {
    wr.push({
      key: `alg_${a.id}_draft`, label: `Allegation ${String(a.seqNumber).padStart(2, "0")} — drafted language`, sectionKey: "complaint-draft",
      status: a.draftStatement && a.draftFacts ? "ok" : "error",
      detail: a.draftStatement && a.draftFacts ? "Statement and facts narrative drafted." : "Draft the allegation statement and facts narrative.",
    });
  }
  wr.push({
    key: "resolution", label: "Proposed resolution", sectionKey: "requested-remedies",
    status: input.remedies.filter(r => r.accepted).length ? "ok" : "error",
    detail: input.remedies.filter(r => r.accepted).length
      ? `${input.remedies.filter(r => r.accepted).length} remedy item(s) selected.`
      : "Georgia asks for a proposed resolution to the extent known. Add at least one requested remedy.",
  });

  // --- Filing Logistics ---
  const fl: ReadinessItem[] = [];
  fl.push({
    key: "mediation", label: "Mediation selection", sectionKey: "filing-review",
    status: c.mediationRequested !== "undecided" ? "ok" : "warning",
    detail: c.mediationRequested !== "undecided" ? `Mediation: ${c.mediationRequested === "yes" ? "requested" : "not requested"}.` : "Decide whether to request mediation.",
  });
  fl.push({
    key: "district_copy", label: "District copy delivery", sectionKey: "filing-review",
    status: c.districtCopyDelivered && c.districtCopyRecipient && c.districtCopyDate && c.districtCopyMethod ? "ok" : "error",
    detail: c.districtCopyDelivered && c.districtCopyRecipient && c.districtCopyDate && c.districtCopyMethod
      ? `Delivered to ${c.districtCopyRecipient} on ${c.districtCopyDate instanceof Date ? c.districtCopyDate.toLocaleDateString() : c.districtCopyDate} via ${c.districtCopyMethod}.`
      : "Georgia requires confirming a copy was delivered to the superintendent or special education director (recipient, date, and method).",
  });
  fl.push({
    key: "accuracy", label: "Final accuracy confirmation", sectionKey: "filing-review",
    status: c.confirmedAccuracy ? "ok" : "error",
    detail: c.confirmedAccuracy ? "Complainant confirmed factual accuracy." : "Confirm factual accuracy, evidence selection, recipient information, and filing method before export.",
  });

  const categories: ReadinessCategory[] = [
    { key: "required_information", label: "Required Information", items: req, status: categoryStatus(req) },
    { key: "allegation_development", label: "Allegation Development", items: alg, status: categoryStatus(alg) },
    { key: "evidence_support", label: "Evidence Support", items: ev, status: categoryStatus(ev) },
    { key: "writing_review", label: "Writing Review", items: wr, status: categoryStatus(wr) },
    { key: "filing_logistics", label: "Filing Logistics", items: fl, status: categoryStatus(fl) },
  ];

  const allItems = categories.flatMap(cat => cat.items);
  const okCount = allItems.filter(i => i.status === "ok").length;
  const percentComplete = allItems.length ? Math.round((okCount / allItems.length) * 100) : 0;
  const readyToFile = allItems.every(i => i.status !== "error");
  const blockers = allItems.filter(i => i.status === "error").length;
  const warnings = allItems.filter(i => i.status === "warning").length;

  return { categories, percentComplete, readyToFile, blockers, warnings };
}
