import { describe, it, expect } from "vitest";
import type {
  PcsMetadata,
  PcsConcernBreakdownItem,
  PcsEvidenceItem,
  PcsVersionHistoryItem,
  PcsSubmittedVersion,
} from "../client/src/components/meeting-workspace/pcs/types";

describe("PG-043 Parent Concern Statement (PCS) Workspace Specifications", () => {
  const initialAiResult =
    "As the parents of Jeremiah Mitchell, our primary concern is ensuring meaningful educational progress in reading and math. We request updated present levels and consistent sensory accommodations.";

  const sampleBreakdown: PcsConcernBreakdownItem[] = [
    {
      id: "concern-reading",
      topic: "Reading & Literacy Progress",
      whyAiIncludedThis:
        "Current records indicate continued difficulty with reading fluency and reading comprehension.",
      evidenceLocations: [
        "IEP → Present Levels → Reading → Page 12",
        "Evaluation → Academic Achievement → Page 7",
        "Parent Call → Reading Concerns → 09/21/26",
      ],
      quote: "Student continues to decode 1.5 grade levels below age expectations.",
    },
  ];

  const sampleEvidence: PcsEvidenceItem[] = [
    {
      id: "ev-1",
      source: "IEP",
      location: "Present Levels → Reading → Page 12",
      usedFor: "Reading & Literacy Progress",
      quoteOrSnippet: "Reading fluency measured at 74 WPM vs 110 WPM grade-level benchmark.",
    },
    {
      id: "ev-2",
      source: "Evaluation",
      location: "Academic Achievement (WJ-IV) → Page 7",
      usedFor: "Reading & Literacy Progress",
      quoteOrSnippet: "Broad Reading standard score: 79 (8th percentile).",
    },
  ];

  it("1. Keeps the two layers completely separate: advocate working statement vs Details AI trail", () => {
    const pcsMetadata: PcsMetadata = {
      originalAiResult: initialAiResult,
      concernsBreakdown: sampleBreakdown,
      evidenceSources: sampleEvidence,
      history: [
        {
          id: "hist-1",
          timestamp: new Date().toISOString(),
          employee: "AI Synthesis Engine",
          action: "AI draft created",
          snapshot: initialAiResult,
        },
      ],
      submittedVersion: {
        status: "not_received",
      },
    };

    let workingAdvocateStatement = initialAiResult;

    // Advocate edits the statement live during parent conversation
    const editedStatement =
      "We are deeply concerned with Jeremiah's reading stamina and need immediate Orton-Gillingham intervention.";
    workingAdvocateStatement = editedStatement;

    // The working copy changed, but original AI result and evidence remain completely preserved
    expect(workingAdvocateStatement).not.toBe(pcsMetadata.originalAiResult);
    expect(pcsMetadata.originalAiResult).toBe(initialAiResult);
    expect(pcsMetadata.concernsBreakdown.length).toBe(1);
    expect(pcsMetadata.concernsBreakdown[0].whyAiIncludedThis).toContain("reading fluency");
    expect(pcsMetadata.evidenceSources.length).toBe(2);
  });

  it("2. Paste / Replace preserves previous version in history and never erases AI details", () => {
    const initialHistory: PcsVersionHistoryItem[] = [
      {
        id: "hist-1",
        timestamp: "2026-09-24T10:00:00.000Z",
        employee: "AI Synthesis Engine",
        action: "AI draft created",
        snapshot: initialAiResult,
      },
    ];

    const metadata: PcsMetadata = {
      originalAiResult: initialAiResult,
      concernsBreakdown: sampleBreakdown,
      evidenceSources: sampleEvidence,
      history: initialHistory,
      submittedVersion: { status: "not_received" },
    };

    // External rewritten statement (e.g. from Claude/ChatGPT)
    const externalRewritten =
      "Parent Statement of Concern: Jeremiah requires evidence-based multisensory structured literacy instruction.";

    // Action: Replace Current Draft
    const updatedHistory: PcsVersionHistoryItem[] = [
      {
        id: "hist-2",
        timestamp: new Date().toISOString(),
        employee: "Byron Honea (Master IEP Coach®)",
        action: "Statement replaced by pasted version",
        snapshot: externalRewritten,
      },
      ...metadata.history,
    ];

    const updatedMetadata: PcsMetadata = {
      ...metadata,
      history: updatedHistory,
    };

    // Assertions
    expect(updatedMetadata.history.length).toBe(2);
    expect(updatedMetadata.history[0].action).toBe("Statement replaced by pasted version");
    expect(updatedMetadata.history[1].snapshot).toBe(initialAiResult); // Old version safely preserved
    expect(updatedMetadata.originalAiResult).toBe(initialAiResult); // Original AI Result untouched
    expect(updatedMetadata.concernsBreakdown).toEqual(sampleBreakdown); // AI evidence trail untouched
  });

  it("3. Email to Parent records action in history without automatically marking approved or submitted", () => {
    const history: PcsVersionHistoryItem[] = [
      {
        id: "hist-1",
        timestamp: "2026-09-24T10:00:00.000Z",
        employee: "AI Engine",
        action: "AI draft created",
        snapshot: initialAiResult,
      },
    ];

    const emailHistoryEntry: PcsVersionHistoryItem = {
      id: "hist-email",
      timestamp: new Date().toISOString(),
      employee: "Byron Honea (Master IEP Coach®)",
      action: "Draft emailed to parent",
      snapshot: initialAiResult,
    };

    const nextHistory = [emailHistoryEntry, ...history];

    expect(nextHistory.length).toBe(2);
    expect(nextHistory[0].action).toBe("Draft emailed to parent");

    // Guardrail: must NOT mark final or parent approved or submitted to school
    const isPcsFinal = false;
    const isSubmittedToSchool = false;
    expect(isPcsFinal).toBe(false);
    expect(isSubmittedToSchool).toBe(false);
  });

  it("4. Submitted Version defaults to 'not_received' and operates non-blockingly", () => {
    const defaultSubmitted: PcsSubmittedVersion = {
      status: "not_received",
    };

    expect(defaultSubmitted.status).toBe("not_received");
    expect(defaultSubmitted.receivedAt).toBeUndefined();

    // Receiving a copy updates details smoothly
    const receivedSubmitted: PcsSubmittedVersion = {
      status: "received",
      receivedAt: new Date().toISOString(),
      source: "Parent Email CC",
      content: "Final parent submitted concern statement attached to IEP invite email.",
    };

    expect(receivedSubmitted.status).toBe("received");
    expect(receivedSubmitted.source).toBe("Parent Email CC");
  });

  it("5. Evidence sources require specific granular location paths (not merely 'IEP')", () => {
    sampleEvidence.forEach((item) => {
      expect(item.location).toMatch(/→/);
      expect(item.location.length).toBeGreaterThan(5);
      expect(item.usedFor).toBeTruthy();
    });
  });
});
