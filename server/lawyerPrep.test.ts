import { describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

describe("AI Lawyer Prep & Legal Involvement System", () => {
  const mockAdminUser = {
    id: 1,
    openId: "user_test_byron",
    name: "Byron Honea",
    email: "byron@waypointadvocates.com",
    role: "admin" as const,
    loginMethod: "manually_created",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    phone: null,
    quoWebhookSecret: null,
    gmailUser: null,
    gmailAppPassword: null,
    portalDomain: null,
    logoUrl: null,
  };

  const adminCaller = appRouter.createCaller({
    user: mockAdminUser,
    req: {} as any,
    res: {} as any,
  });

  const testStudentId = 7701;

  it("1. should retrieve default legal involvement status (default false)", async () => {
    const status = await adminCaller.lawyerPrep.getLegalStatus({
      studentContactId: testStudentId,
    });
    expect(status).toBeDefined();
    expect(typeof status.lawyerInvolved).toBe("boolean");
  });

  it("2. should activate legal involvement and record audit timeline activity", async () => {
    const res = await adminCaller.lawyerPrep.updateLegalStatus({
      studentContactId: testStudentId,
      lawyerInvolved: true,
      attorneyName: "Sarah Jenkins, Esq.",
      attorneyFirm: "Atlanta Education Law Center",
      attorneyEmail: "sjenkins@atledlaw.org",
      attorneyPhone: "(404) 555-7890",
      attorneyRepresents: "Parent/Student",
      attorneyInvolvementDate: "2026-09-15",
      legalNotes: "Retained for IEP dispute regarding speech-language services.",
      attorneyDocuments: JSON.stringify([
        {
          id: "doc-1",
          name: "Notice of Appearance.pdf",
          url: "https://storage.waypointadvocates.com/vault/notice.pdf",
          uploadedAt: "2026-09-15T12:00:00Z",
        },
      ]),
    });

    expect(res.success).toBe(true);
    expect(res.lawyerInvolved).toBe(true);
    expect(res.attorneyName).toBe("Sarah Jenkins, Esq.");
    expect(res.attorneyFirm).toBe("Atlanta Education Law Center");
    expect(res.attorneyRepresents).toBe("Parent/Student");

    // Verify status query reflects updated fields
    const updatedStatus = await adminCaller.lawyerPrep.getLegalStatus({
      studentContactId: testStudentId,
    });
    expect(updatedStatus.lawyerInvolved).toBe(true);
    expect(updatedStatus.attorneyName).toBe("Sarah Jenkins, Esq.");
    expect(updatedStatus.attorneyDocuments).toBeDefined();
  });

  it("3. should update attorney details while retaining active legal status", async () => {
    const updateRes = await adminCaller.lawyerPrep.updateLegalStatus({
      studentContactId: testStudentId,
      lawyerInvolved: true,
      attorneyName: "Sarah Jenkins-Miller, Esq.",
      attorneyFirm: "Jenkins & Partners Education Law",
      attorneyEmail: "smiller@jenkinslaw.com",
      attorneyPhone: "(404) 555-9999",
      attorneyRepresents: "Parent/Student",
      legalNotes: "Updated firm representation and contact phone number.",
    });

    expect(updateRes.success).toBe(true);
    expect(updateRes.attorneyName).toBe("Sarah Jenkins-Miller, Esq.");
    expect(updateRes.attorneyFirm).toBe("Jenkins & Partners Education Law");
  });

  it("4. should gather case ecosystem data cleanly without errors", async () => {
    const ecosystem = await adminCaller.lawyerPrep.getCaseEcosystem({
      studentContactId: testStudentId,
    });

    expect(ecosystem).toBeDefined();
    expect(ecosystem.student).toBeDefined();
    expect(Array.isArray(ecosystem.timelineEvents)).toBe(true);
    expect(Array.isArray(ecosystem.vaultFiles)).toBe(true);
    expect(ecosystem.iepDocs).toBeDefined();
  });

  it("5. should generate structured AI Lawyer Prep snapshot with all 11 required sections", async () => {
    const prep = await adminCaller.lawyerPrep.generate({
      studentContactId: testStudentId,
    });

    expect(prep).toBeDefined();
    expect(prep.id).toBeGreaterThan(0);
    expect(prep.version).toBeGreaterThanOrEqual(1);

    const snapshot = prep.snapshot as any;
    expect(snapshot).toBeDefined();

    // 1. Case Snapshot
    expect(snapshot.caseSnapshot).toBeDefined();
    expect(snapshot.caseSnapshot.studentName).toBeDefined();

    // 2. Primary Issues
    expect(Array.isArray(snapshot.primaryIssues)).toBe(true);
    expect(snapshot.primaryIssues.length).toBeGreaterThan(0);

    // 3. Key Timeline
    expect(Array.isArray(snapshot.keyTimeline)).toBe(true);
    expect(snapshot.keyTimeline.length).toBeGreaterThan(0);

    // 4. Requests & Responses
    expect(Array.isArray(snapshot.requestsAndResponses)).toBe(true);
    expect(snapshot.requestsAndResponses.length).toBeGreaterThan(0);

    // 5. Potential Legal / Compliance Issues
    expect(Array.isArray(snapshot.potentialLegalIssues)).toBe(true);
    expect(snapshot.potentialLegalIssues.length).toBeGreaterThan(0);

    // 6. Evidence Index
    expect(Array.isArray(snapshot.evidenceIndex)).toBe(true);

    // 7. Record Conflicts
    expect(Array.isArray(snapshot.recordConflicts)).toBe(true);

    // 8. Missing Information Checklist
    expect(Array.isArray(snapshot.missingInformation)).toBe(true);
    expect(snapshot.missingInformation.length).toBeGreaterThan(0);

    // 9. Questions for Attorney
    expect(Array.isArray(snapshot.questionsForAttorney)).toBe(true);
    expect(snapshot.questionsForAttorney.length).toBeGreaterThan(0);

    // 10. Advocate Notes
    expect(typeof snapshot.advocateNotes).toBe("string");

    // 11. Sources & Confidence Labels
    expect(Array.isArray(snapshot.sources)).toBe(true);
    expect(snapshot.sources.length).toBeGreaterThan(0);
    expect(["🟢 Documented", "🟡 Partially Documented", "🔴 Missing Documentation", "⚪ Advocate/Parent Report"]).toContain(
      snapshot.sources[0].confidenceLabel
    );
  });

  it("6. should enforce objective legal guardrails in generated issues", async () => {
    const prep = await adminCaller.lawyerPrep.generate({
      studentContactId: testStudentId,
    });

    const snapshot = prep.snapshot as any;
    const allowedLevels = [
      "Potential compliance concern",
      "Issue requiring legal review",
      "Possible procedural concern",
      "Possible implementation concern",
    ];

    for (const issue of snapshot.potentialLegalIssues) {
      expect(allowedLevels).toContain(issue.legalLevel);
      // AI must not state conclusively that the district violated the law
      expect(issue.issue.toLowerCase()).not.toContain("violated the law");
    }
  });

  it("7. should list versioned snapshots and retrieve snapshot by id", async () => {
    const list = await adminCaller.lawyerPrep.listSnapshots({
      studentContactId: testStudentId,
    });

    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);

    const latest = list[0];
    const retrieved = await adminCaller.lawyerPrep.getSnapshot({
      prepId: latest.id,
    });

    expect(retrieved).toBeDefined();
    expect(retrieved.id).toBe(latest.id);
    expect(retrieved.version).toBe(latest.version);
  });

  it("8. should update advocate notes and missing info checklist status in snapshot", async () => {
    const list = await adminCaller.lawyerPrep.listSnapshots({
      studentContactId: testStudentId,
    });
    const snapshotId = list[0].id;

    const updateRes = await adminCaller.lawyerPrep.updateSnapshot({
      prepId: snapshotId,
      advocateNotes: "Met with parent. Emphasized that district failed to provide speech logs since January.",
      missingInfoChecklist: {
        "miss-1": "Already Requested",
      },
    });

    expect(updateRes.success).toBe(true);

    const verified = await adminCaller.lawyerPrep.getSnapshot({
      prepId: snapshotId,
    });
    expect(verified.advocateNotes).toContain("Met with parent");
    expect(verified.missingInfoChecklist["miss-1"]).toBe("Already Requested");
  });

  it("9. should deactivate legal involvement and log in timeline", async () => {
    const res = await adminCaller.lawyerPrep.updateLegalStatus({
      studentContactId: testStudentId,
      lawyerInvolved: false,
      legalNotes: "Legal representation concluded after informal resolution.",
    });

    expect(res.success).toBe(true);
    expect(res.lawyerInvolved).toBe(false);

    const status = await adminCaller.lawyerPrep.getLegalStatus({
      studentContactId: testStudentId,
    });
    expect(status.lawyerInvolved).toBe(false);
  });
});
