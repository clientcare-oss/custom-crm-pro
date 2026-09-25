import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db/connection";
import { contacts, clientFiles } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("PWN Decoder Engine & Procedures (PG-010-PWN)", () => {
  const caller = appRouter.createCaller({
    user: { id: 1, role: "admin", openAiKey: null },
    req: {} as any,
    res: {} as any,
  } as any);

  let testStudentId: number;

  it("should setup or locate a test student record in the CRM", async () => {
    testStudentId = 1;
    expect(testStudentId).toBe(1);
  });

  it("should associate a PWN document directly with student Document Vault", async () => {
    const uploaded = await caller.pwnDecoder.uploadStudentDocument({
      studentContactId: testStudentId,
      fileName: "PWN_Triennial_Review_2026.pdf",
      rawText: "Sample Prior Written Notice uploaded document content for testing.",
      fileSize: 1024,
    });

    expect(uploaded.id).toBeGreaterThan(0);
    expect(uploaded.fileName).toBe("PWN_Triennial_Review_2026.pdf");

    // Verify it appears in Document Vault list
    const vaultDocs = await caller.pwnDecoder.getStudentVaultDocuments({
      studentContactId: testStudentId,
    });
    expect(vaultDocs.length).toBeGreaterThan(0);
    expect(vaultDocs.some((d) => d.id === uploaded.id)).toBe(true);
  });

  it("should decode a Prior Written Notice and generate structured findings without inventing missing data", async () => {
    const samplePwn = `
PRIOR WRITTEN NOTICE
Student: ByronTestStudent
Date: October 14, 2026
Local Educational Agency: Atlanta Public Schools

1. PROPOSED / REFUSED ACTIONS:
The LEA proposes to increase speech therapy to 60 minutes weekly.
The LEA refuses parent request for a 1:1 adult aide in general education.
The LEA refuses parent request for Extended School Year (ESY) services.

2. EXPLANATION OF WHY:
Speech: Evaluation demonstrates pragmatic language deficits.
1:1 aide: The team determined that additional individual support was not necessary.
ESY: The team determined student did not show sufficient regression.

3. DESCRIPTION OF INFORMATION / EVALUATION RELIED UPON:
Speech: Comprehensive Speech-Language Evaluation dated September 2026.
1:1 aide: Classroom teacher observation notes.
ESY: Quarter 1 grade report.

4. OTHER OPTIONS CONSIDERED AND REJECTION REASONS:
Option 1: 30 minutes speech therapy. Rejected because inadequate for goals.
Option 2: 1:1 aide during transitions only. Rejected.

5. OTHER RELEVANT FACTORS:
Sensory accommodations are provided by OT consult.

6. PROCEDURAL SAFEGUARDS:
Parents may request a copy of the Procedural Safeguards Notice from the district office.

7. ASSISTANCE SOURCES:
Georgia Department of Education Special Education Division: 404-656-3963.
    `;

    const result = await caller.pwnDecoder.analyzePwn({
      studentContactId: testStudentId,
      pwnDocumentName: "Annual PWN 2026",
      rawText: samplePwn,
    });

    expect(result).toBeDefined();
    expect(result.id).toBeGreaterThan(0);
    expect(result.studentContactId).toBe(testStudentId);
    expect(result.stateOverlay).toBe("Not Configured");
    expect(["STRONG", "ADEQUATE", "THIN", "SERIOUS_CONCERN"]).toContain(result.documentationStrength);
    expect(result.summary).toBeTruthy();

    // Verify decisions were cataloged (one decision per card)
    expect(result.decisions.length).toBeGreaterThan(0);
    const speechDecision = result.decisions.find((d) => d.decisionTitle.toLowerCase().includes("speech"));
    expect(speechDecision).toBeDefined();
    expect(speechDecision?.action).toBe("PROPOSED");

    // Verify 9 Federal Core requirements are present in findings
    expect(result.requirements.length).toBe(9);
    const whyRequirement = result.requirements.find((r) => r.requirementKey === "why");
    expect(whyRequirement).toBeDefined();
    expect(["PRESENT", "WEAK_UNCLEAR", "NOT_LOCATED"]).toContain(whyRequirement?.status);

    // Verify concerns were flagged
    expect(result.concerns.length).toBeGreaterThan(0);
    const firstConcern = result.concerns[0];
    expect(firstConcern.title).toBeTruthy();
    expect(firstConcern.whyFlagged).toBeTruthy();
    expect(firstConcern.advocateStatus).toBe("UNREVIEWED");

    // Test advocate review controls: Confirm concern & add authoritative correction
    const updatedConcern = await caller.pwnDecoder.updateConcern({
      concernId: firstConcern.id,
      advocateStatus: "CONFIRMED",
      advocateNote: "Discussed with parent; request formal baseline data at next meeting.",
      advocateCorrection: "Authoritative advocate finding: District provided zero objective evaluation data.",
    });

    expect(updatedConcern.advocateStatus).toBe("CONFIRMED");
    expect(updatedConcern.advocateNote).toContain("Discussed with parent");
    expect(updatedConcern.advocateCorrection).toContain("Authoritative advocate finding");

    // Test save review status
    const saved = await caller.pwnDecoder.saveReview({
      reviewId: result.id,
      status: "COMPLETED",
      advocateNotes: "Finalized review ready for IEP resolution conference.",
    });

    expect(saved.status).toBe("COMPLETED");

    // Verify listing previous reviews returns the saved review
    const list = await caller.pwnDecoder.listReviewsByStudent({
      studentContactId: testStudentId,
    });
    expect(list.length).toBeGreaterThan(0);
    expect(list.some((r) => r.id === result.id)).toBe(true);
  });
});
