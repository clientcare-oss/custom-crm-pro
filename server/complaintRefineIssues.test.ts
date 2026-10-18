import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

describe("State Complaint Issue Refinement (PG-020-SET)", () => {
  const caller = appRouter.createCaller({
    user: { id: "test-advocate", name: "Byron Honea", role: "admin" },
  } as any);

  it("should successfully refine complaint issues across 3 statutory prongs", async () => {
    const result = await caller.stateComplaint.refineIssues({
      statementOfViolations: "The district failed to provide specialized instruction and canceled therapy sessions.",
      factsRelatingToViolations: "Operative IEP mandated 150 min weekly. Starting October 2025, services ceased.",
      proposedResolution: "Give the student compensatory hours and an IEE.",
      selectedResolutions: [
        "Award 60 hours of certified 1-on-1 academic compensatory instruction.",
        "Fund an Independent Educational Evaluation (IEE) at public expense.",
        "Reconvene the IEP team within 15 school days.",
      ],
      stateCode: "GA",
      studentName: "Elijah Santiago",
      districtName: "Atlanta Public Schools",
    });

    expect(result.success).toBe(true);
    expect(result.refinedStatementOfViolations).toContain("COUNT I");
    expect(result.refinedStatementOfViolations).toContain("34 C.F.R.");
    expect(result.refinedFactsRelatingToViolations).toContain("1-YEAR STATUTORY PERIOD");
    expect(result.refinedProposedResolution.toLowerCase()).toContain("compensatory");
    expect(result.applicableAuthorities.length).toBeGreaterThan(0);
    expect(result.oneYearComplianceNotes).toContain("1 year");
  });

  it("strictly enforces AGENTS.md Rule F prohibiting Master Coach in output", async () => {
    const result = await caller.stateComplaint.refineIssues({
      statementOfViolations: "Advocate Byron Honea acting on behalf of the student.",
      factsRelatingToViolations: "IEP services were withheld by the school district.",
      proposedResolution: "Reconvene IEP team.",
      stateCode: "GA",
      studentName: "Elijah Santiago",
      districtName: "Atlanta Public Schools",
    });

    const combinedText = `${result.refinedStatementOfViolations} ${result.refinedFactsRelatingToViolations} ${result.refinedProposedResolution}`;
    expect(combinedText.toLowerCase()).not.toContain("master coach");
    expect(combinedText.toLowerCase()).not.toContain("master coaching");
    expect(combinedText.toLowerCase()).not.toContain("master iep coach");
  });

  it("maps state-specific administrative regulations for Georgia", async () => {
    const result = await caller.stateComplaint.refineIssues({
      statementOfViolations: "IEP implementation failure",
      factsRelatingToViolations: "Missed speech sessions in November 2025.",
      proposedResolution: "Provide make-up sessions.",
      stateCode: "GA",
      studentName: "Elijah Santiago",
      districtName: "Atlanta Public Schools",
    });

    expect(result.refinedStatementOfViolations).toContain("Ga. Comp. R. & Regs.");
    expect(result.refinedFactsRelatingToViolations).toContain("34 C.F.R. § 300.153(c)");
  });
});
