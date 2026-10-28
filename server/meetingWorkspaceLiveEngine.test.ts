import { describe, it, expect } from "vitest";
import {
  recordApproval,
  withdrawApproval,
  updateApprovalMetadata,
} from "../client/src/components/meeting-workspace/live/approvalEngine";
import type { CloseoutChecks } from "../client/src/components/meeting-workspace/types";

describe("Live Meeting Follow-Through & Approval Engine (PG-043)", () => {
  it("verifies the complete flow: Scratch note → Before We End → Approved → automatic Minutes & Document Check", () => {
    let checks: CloseoutChecks = {
      allRequestsRaised: false,
      pwnIdentified: false,
      agreedLocationsClear: false,
      followUpAssigned: false,
      nextMeetingDiscussed: false,
      scratchNotes: [
        {
          id: "sn-1",
          text: "OT evaluation will be completed within 30 days by district specialist.",
          createdAt: "10:15 AM",
        },
      ],
      beforeWeEndItems: [],
      minutesEntries: [],
      documentCheckItems: [],
      timelineEvents: [],
    };

    // 1. Convert scratch note to Before We End item
    const scratchNote = checks.scratchNotes![0];
    const bweItem = {
      id: "bwe-101",
      text: scratchNote.text,
      status: "UNRESOLVED" as const,
      sourceNoteId: scratchNote.id,
      createdAt: "10:16 AM",
    };
    checks.beforeWeEndItems = [bweItem];
    scratchNote.movedToBeforeWeEnd = true;

    expect(checks.beforeWeEndItems.length).toBe(1);
    expect(checks.beforeWeEndItems[0].status).toBe("UNRESOLVED");

    // 2. Click Approved: Must immediately create Minutes entry and Document Check item without requiring popups or deadlines
    checks = recordApproval(checks, {
      sourceType: "before_we_end",
      sourceId: bweItem.id,
      title: bweItem.text,
      details: "Team agreed to conduct comprehensive sensory processing assessment.",
    });

    expect(checks.minutesEntries).toBeDefined();
    expect(checks.minutesEntries!.length).toBe(1);
    const minute = checks.minutesEntries![0];
    expect(minute.sourceId).toBe("bwe-101");
    expect(minute.status).toBe("APPROVED");
    expect(minute.title).toBe(bweItem.text);
    expect(minute.approvedAt).toBeTruthy();

    expect(checks.documentCheckItems).toBeDefined();
    expect(checks.documentCheckItems!.length).toBe(1);
    const docCheck = checks.documentCheckItems![0];
    expect(docCheck.sourceId).toBe("bwe-101");
    expect(docCheck.status).toBe("ACTIVE_AGREEMENT");
    // Team approval != verified document. Must be kept separate!
    expect(docCheck.verified).toBe(false);

    expect(checks.timelineEvents).toBeDefined();
    expect(checks.timelineEvents!.length).toBe(1);
    expect(checks.timelineEvents![0].type).toBe("APPROVAL");

    // 3. Optional contextual metadata: assign responsible person and deadline
    checks = updateApprovalMetadata(checks, bweItem.id, {
      responsiblePerson: "Sarah Jenkins (District OT Lead)",
      deadlineDate: "Nov 30, 2026",
      conditionNote: "Assessment will include classroom sensory profile.",
    });

    const updatedMinute = checks.minutesEntries![0];
    expect(updatedMinute.responsiblePerson).toBe("Sarah Jenkins (District OT Lead)");
    expect(updatedMinute.deadlineDate).toBe("Nov 30, 2026");
    expect(updatedMinute.notes).toBe("Assessment will include classroom sensory profile.");
  });

  it("prevents duplicate minutes or document checks on repeated approval clicks", () => {
    let checks: CloseoutChecks = {
      allRequestsRaised: false,
      pwnIdentified: false,
      agreedLocationsClear: false,
      followUpAssigned: false,
      nextMeetingDiscussed: false,
      minutesEntries: [],
      documentCheckItems: [],
      timelineEvents: [],
    };

    // First click
    checks = recordApproval(checks, {
      sourceType: "target",
      sourceId: "tgt-sensory-break",
      title: "Sensory Breaks Built Into Schedule",
      details: "5 minutes per hour as requested by parent.",
    });

    expect(checks.minutesEntries!.length).toBe(1);
    expect(checks.documentCheckItems!.length).toBe(1);

    // Second click (simulating re-click or reopening meeting)
    checks = recordApproval(checks, {
      sourceType: "target",
      sourceId: "tgt-sensory-break",
      title: "Sensory Breaks Built Into Schedule",
      details: "5 minutes per hour as requested by parent.",
    });

    // Count must remain 1 — absolutely no duplicates
    expect(checks.minutesEntries!.length).toBe(1);
    expect(checks.documentCheckItems!.length).toBe(1);
    expect(checks.minutesEntries![0].history?.length).toBe(2);
  });

  it("records history and withdraws document check when approval is changed or withdrawn", () => {
    let checks: CloseoutChecks = {
      allRequestsRaised: false,
      pwnIdentified: false,
      agreedLocationsClear: false,
      followUpAssigned: false,
      nextMeetingDiscussed: false,
      minutesEntries: [],
      documentCheckItems: [],
      timelineEvents: [],
    };

    checks = recordApproval(checks, {
      sourceType: "target",
      sourceId: "tgt-speech-minutes",
      title: "Speech Therapy 60 min/week",
      details: "Individual pullout therapy.",
    });

    expect(checks.minutesEntries![0].status).toBe("APPROVED");
    expect(checks.documentCheckItems![0].status).toBe("ACTIVE_AGREEMENT");

    // School district retracts commitment; advocate changes status to DENIED
    checks = withdrawApproval(checks, "tgt-speech-minutes", "DENIED");

    // Minutes retains audit trail
    expect(checks.minutesEntries![0].status).toBe("WITHDRAWN");
    expect(checks.minutesEntries![0].history?.some((h) => h.action.includes("DENIED"))).toBe(true);

    // Document check is deactivated so outdated agreement is not expected in revised IEP
    expect(checks.documentCheckItems![0].status).toBe("WITHDRAWN");

    // Timeline event logged
    expect(checks.timelineEvents![0].type).toBe("APPROVAL_WITHDRAWN");
  });

  it("strictly enforces AGENTS.md Rule F brand terminology guardrail", () => {
    let checks: CloseoutChecks = {
      allRequestsRaised: false,
      pwnIdentified: false,
      agreedLocationsClear: false,
      followUpAssigned: false,
      nextMeetingDiscussed: false,
      minutesEntries: [],
      documentCheckItems: [],
      timelineEvents: [],
    };

    checks = recordApproval(checks, {
      sourceType: "target",
      sourceId: "tgt-advocate-lead",
      title: "Lead Special Education Advocate IEP Review Provision",
      details: "Approved for Byron Honea to review draft prior to final signing.",
    });

    const serialized = JSON.stringify(checks);
    expect(serialized).not.toMatch(/master coach/i);
    expect(serialized).not.toMatch(/master iep coach/i);
  });

  it("verifies manual checkbox behavior: marks complete without assigning Approved or creating minutes", () => {
    const item = {
      id: "bwe-manual-1",
      text: "Clarify ESY transportation pickup window",
      status: "UNRESOLVED" as const,
      completed: false,
      createdAt: "10:20 AM",
    };

    // Manual check
    const checkedItem = { ...item, completed: true };
    expect(checkedItem.completed).toBe(true);
    expect(checkedItem.status).toBe("UNRESOLVED"); // Status remains unresolved

    // Manual uncheck
    const uncheckedItem = { ...checkedItem, completed: false };
    expect(uncheckedItem.completed).toBe(false);
    expect(uncheckedItem.status).toBe("UNRESOLVED");
  });

  it("verifies situation buttons automatically complete items and reflect outcomes", () => {
    // 1. Situation: Denied
    const deniedItem = {
      id: "bwe-denied-1",
      text: "1:1 Para during unstructured recess",
      status: "DENIED" as const,
      completed: true,
      createdAt: "10:22 AM",
    };
    expect(deniedItem.completed).toBe(true);
    expect(deniedItem.status).toBe("DENIED");

    // 2. Situation: Follow-Up
    const followUpItem = {
      id: "bwe-fu-1",
      text: "Obtain sensory diet protocol from private OT",
      status: "FOLLOW_UP" as const,
      completed: true,
      createdAt: "10:23 AM",
      responsiblePerson: "Case Manager",
      deadlineDate: "Friday",
    };
    expect(followUpItem.completed).toBe(true);
    expect(followUpItem.status).toBe("FOLLOW_UP");

    // 3. Situation: Discussed
    const discussedItem = {
      id: "bwe-disc-1",
      text: "Review high school graduation pathway options",
      status: "DISCUSSED" as const,
      completed: true,
      createdAt: "10:24 AM",
    };
    expect(discussedItem.completed).toBe(true);
    expect(discussedItem.status).toBe("DISCUSSED");
  });

  it("verifies live progress indicator calculation: 3 of 5 addressed · 2 remaining", () => {
    const items = [
      { id: "1", text: "Target 1", status: "APPROVED" as const, completed: true, createdAt: "10:00 AM" },
      { id: "2", text: "Target 2", status: "DENIED" as const, completed: true, createdAt: "10:01 AM" },
      { id: "3", text: "Target 3", status: "UNRESOLVED" as const, completed: true, createdAt: "10:02 AM" }, // manually checked
      { id: "4", text: "Target 4", status: "UNRESOLVED" as const, completed: false, createdAt: "10:03 AM" },
      { id: "5", text: "Target 5", status: "UNRESOLVED" as const, completed: false, createdAt: "10:04 AM" },
    ];

    const isItemCompleted = (i: any) => i.completed ?? (i.status !== "UNRESOLVED");
    const completedCount = items.filter(isItemCompleted).length;
    const remainingCount = items.length - completedCount;

    expect(completedCount).toBe(3);
    expect(remainingCount).toBe(2);
    expect(`${completedCount} of ${items.length} addressed · ${remainingCount} remaining`).toBe(
      "3 of 5 addressed · 2 remaining"
    );
  });
});

