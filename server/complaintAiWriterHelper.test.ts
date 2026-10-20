import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

describe("State Complaint AI Writer Helper (PG-020)", () => {
  const caller = appRouter.createCaller({
    user: { id: "test-advocate", name: "Byron Honea", role: "admin" },
  } as any);

  it("should make draft text better with advocate authority and legal posture", async () => {
    const result = await caller.stateComplaint.aiWriterHelper({
      text: "The school canceled speech therapy for 3 weeks and didn't tell us.",
      mode: "make_better",
      studentName: "Brooklyn Smith",
      districtName: "Cobb County School District",
      stateCode: "GA",
    });

    expect(result.success).toBe(true);
    expect(result.enhancedText.length).toBeGreaterThan(20);
    expect(result.enhancedText).not.toContain("Master Coach");
    expect(result.enhancedText).not.toContain("Master IEP Coach");
  });

  it("should help write chronological factual narrative from rough notes", async () => {
    const result = await caller.stateComplaint.aiWriterHelper({
      text: "- Oct 12: emailed principal\n- Oct 18: no response\n- Nov 2: meeting held without mom",
      mode: "help_write",
      studentName: "Brooklyn Smith",
      stateCode: "GA",
    });

    expect(result.success).toBe(true);
    expect(result.enhancedText).toContain("Oct");
    expect(result.enhancedText.toLowerCase()).not.toContain("master coach");
  });

  it("should inject IDEA and state statutory citations", async () => {
    const result = await caller.stateComplaint.aiWriterHelper({
      text: "District failed to implement the IEP accommodations in math class.",
      mode: "add_citations",
      stateCode: "GA",
    });

    expect(result.success).toBe(true);
    expect(result.enhancedText).toContain("34 C.F.R.");
    expect(result.enhancedText).toContain("Ga. Comp. R. & Regs.");
  });

  it("strictly enforces AGENTS.md Rule F on all outputs", async () => {
    const result = await caller.stateComplaint.aiWriterHelper({
      text: "As a Master Coach, I demand make up services.",
      mode: "make_better",
      stateCode: "GA",
    });

    expect(result.enhancedText.toLowerCase()).not.toContain("master coach");
    expect(result.enhancedText.toLowerCase()).not.toContain("master iep coach");
  });

  it("should generate tailored binder purpose for new binders (PG-020)", async () => {
    const result = await caller.stateComplaint.generateBinderPurpose({
      binderTitle: "Speech-Language Therapy Attendance & Provider Service Logs",
      binderCategory: "exhibit",
      studentName: "Brooklyn Smith",
      districtName: "Cobb County School District",
      stateCode: "GA",
    });

    expect(result.success).toBe(true);
    expect(result.purpose.length).toBeGreaterThan(15);
    expect(result.purpose.startsWith("To ")).toBe(true);
    expect(result.purpose.toLowerCase()).not.toContain("master coach");
    expect(result.purpose.toLowerCase()).not.toContain("operative");
  });

  it("should reword existing binder purpose into authoritative legal phrasing", async () => {
    const result = await caller.stateComplaint.generateBinderPurpose({
      binderTitle: "Parent Written Re-Evaluation Request Records",
      binderCategory: "exhibit",
      existingPurpose: "Show mom sent email asking for testing",
      studentName: "Elijah Santiago",
      districtName: "Atlanta Public Schools",
      stateCode: "GA",
    });

    expect(result.success).toBe(true);
    expect(result.purpose.length).toBeGreaterThan(20);
    expect(result.purpose.toLowerCase()).not.toContain("master coach");
  });
});
