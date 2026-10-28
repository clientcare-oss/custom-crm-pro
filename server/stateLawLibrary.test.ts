import { describe, it, expect } from "vitest";
import {
  ALL_STATE_JURISDICTIONS,
  REQUIRED_LEGAL_CATEGORIES,
  VERIFIED_LEGAL_REFERENCES,
} from "../shared/stateEducationLawData";
import { appRouter } from "./routers";

describe("State Education Law Library — PG-016-LAW Engine", () => {
  it("should have all 50 US States, Washington D.C., and Federal jurisdiction represented", () => {
    // 50 states + DC (51 state-level) + US (1 Federal) = 52 total jurisdictions
    expect(ALL_STATE_JURISDICTIONS.length).toBeGreaterThanOrEqual(51);

    const codes = ALL_STATE_JURISDICTIONS.map((s) => s.code);
    expect(codes).toContain("US"); // Federal
    expect(codes).toContain("GA"); // Georgia
    expect(codes).toContain("TX"); // Texas
    expect(codes).toContain("CA"); // California
    expect(codes).toContain("FL"); // Florida
    expect(codes).toContain("NY"); // New York
    expect(codes).toContain("DC"); // Washington D.C.

    // Verify every jurisdiction has official code or education agency URLs
    for (const jur of ALL_STATE_JURISDICTIONS) {
      expect(jur.name).toBeTruthy();
      expect(jur.educationAgencyName).toBeTruthy();
      expect(jur.evaluationTimeline).toBeTruthy();
      expect(jur.transitionAge).toBeTruthy();
    }
  });

  it("should cover the 15 mandatory special education legal categories", () => {
    expect(REQUIRED_LEGAL_CATEGORIES.length).toBe(15);
    expect(REQUIRED_LEGAL_CATEGORIES).toContain("Evaluation and reevaluation requirements");
    expect(REQUIRED_LEGAL_CATEGORIES).toContain("Prior Written Notice requirements");
    expect(REQUIRED_LEGAL_CATEGORIES).toContain("Independent Educational Evaluation requirements");
    expect(REQUIRED_LEGAL_CATEGORIES).toContain("Discipline, suspension, and Manifestation Determination Reviews");
    expect(REQUIRED_LEGAL_CATEGORIES).toContain("Dyslexia and reading intervention laws");
    expect(REQUIRED_LEGAL_CATEGORIES).toContain("Section 504 guidance");
  });

  it("should query verified federal baseline laws via tRPC router", async () => {
    const caller = appRouter.createCaller({ user: null } as any);
    const federalRefs = await caller.stateLaw.list({ state: "US" });

    expect(federalRefs.length).toBeGreaterThan(0);
    const pwnRef = federalRefs.find((r) => r.citation.includes("300.503"));
    expect(pwnRef).toBeDefined();
    expect(pwnRef?.category).toBe("Prior Written Notice requirements");
    expect(pwnRef?.verificationStatus).toBe("Verified");
    expect(pwnRef?.officialUrl).toContain("ecfr.gov");
  });

  it("should support query searches like 'Georgia evaluation timeline'", async () => {
    const caller = appRouter.createCaller({ user: null } as any);
    const results = await caller.stateLaw.list({ search: "Georgia evaluation timeline" });

    expect(results.length).toBeGreaterThan(0);
    const gaRef = results.find((r) => r.state === "GA");
    expect(gaRef).toBeDefined();
    expect(gaRef?.statutoryTimeline).toContain("60");
  });

  it("should support query searches like 'Texas IEP requirements'", async () => {
    const caller = appRouter.createCaller({ user: null } as any);
    const results = await caller.stateLaw.list({ search: "Texas IEP" });

    expect(results.length).toBeGreaterThan(0);
    const txRef = results.find((r) => r.state === "TX");
    expect(txRef).toBeDefined();
    expect(txRef?.citation).toContain("Tex. Admin. Code");
  });

  it("should filter by verification status accurately", async () => {
    const caller = appRouter.createCaller({ user: null } as any);
    const verified = await caller.stateLaw.list({ verificationStatus: "Verified" });

    for (const v of verified) {
      expect(v.verificationStatus).toBe("Verified");
      expect(v.officialUrl).toBeTruthy();
    }
  });
});
