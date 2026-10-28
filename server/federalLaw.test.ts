import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

describe("Federal Education Law Library & Federal Guidance Archive", () => {
  const caller = appRouter.createCaller({
    user: { id: 1, email: "advocate@waypointadvocates.com", role: "admin", name: "Lead Advocate" },
  } as any);

  it("should list federal legal provisions with default filter", async () => {
    const provisions = await caller.federalLaw.listProvisions({});
    expect(provisions.length).toBeGreaterThan(5);

    const ideaPbis = provisions.find((p) => p.sectionCitation === "34 CFR § 300.324");
    expect(ideaPbis).toBeDefined();
    expect(ideaPbis?.act).toBe("IDEA Part B");
    expect(ideaPbis?.topics).toContain("Behavioral interventions");
  });

  it("should filter provisions by topic and search term", async () => {
    const fapeProvisions = await caller.federalLaw.listProvisions({ topic: "FAPE" });
    expect(fapeProvisions.length).toBeGreaterThan(0);
    expect(fapeProvisions.every((p) => p.topics.includes("FAPE"))).toBe(true);

    const searchResults = await caller.federalLaw.listProvisions({ search: "Child Find" });
    expect(searchResults.some((p) => p.sectionCitation.includes("300.111"))).toBe(true);
  });

  it("should get provision by ID with attached related guidance documents", async () => {
    const provision = await caller.federalLaw.getProvisionById({ id: "idea-300-324" });
    expect(provision).toBeDefined();
    expect(provision.title).toContain("Development, review, and revision of IEP");
    expect(provision.relatedGuidance).toBeDefined();
    expect(provision.relatedGuidance.length).toBeGreaterThan(0);

    const dclBehavior = provision.relatedGuidance.find((g) => g.id === "dcl-2016-08-01-behavior");
    expect(dclBehavior).toBeDefined();
    expect(dclBehavior?.issuingOffice).toBe("OSERS");
  });

  it("should list federal guidance documents and filter by issuing office and status", async () => {
    const guidanceList = await caller.federalLaw.listGuidance({});
    expect(guidanceList.length).toBeGreaterThan(5);

    const ocrDocs = await caller.federalLaw.listGuidance({ issuingOffice: "OCR" });
    expect(ocrDocs.length).toBeGreaterThan(0);
    expect(ocrDocs.every((d) => d.issuingOffice === "OCR")).toBe(true);

    const currentDocs = await caller.federalLaw.listGuidance({ guidanceStatus: "Current / Verified" });
    expect(currentDocs.length).toBeGreaterThan(0);
  });

  it("should get guidance by ID with attached related federal law provisions", async () => {
    const doc = await caller.federalLaw.getGuidanceById({ id: "dcl-2016-08-01-behavior" });
    expect(doc).toBeDefined();
    expect(doc.title).toContain("Behavioral Supports");
    expect(doc.relatedProvisions).toBeDefined();
    expect(doc.relatedProvisions.length).toBeGreaterThan(0);

    const pbisProvision = doc.relatedProvisions.find((p) => p.sectionCitation.includes("300.324"));
    expect(pbisProvision).toBeDefined();
  });

  it("should perform unified legal search across State, Federal Law, and Guidance", async () => {
    const results = await caller.federalLaw.unifiedSearch({
      query: "behavior intervention",
      limit: 20,
    });

    expect(results.length).toBeGreaterThan(0);

    // Verify categories are represented
    const categoriesFound = new Set(results.map((r) => r.sourceCategory));
    expect(categoriesFound.has("federal_law") || categoriesFound.has("federal_guidance")).toBe(true);

    // Verify distinction between binding law and guidance
    const federalLawResult = results.find((r) => r.sourceCategory === "federal_law");
    if (federalLawResult) {
      expect(federalLawResult.isBindingLaw).toBe(true);
      expect(federalLawResult.authorityType).toContain("Binding");
    }

    const guidanceResult = results.find((r) => r.sourceCategory === "federal_guidance");
    if (guidanceResult) {
      expect(guidanceResult.isBindingLaw).toBe(false);
      expect(guidanceResult.authorityType).toContain("Guidance");
    }
  });

  it("should retrieve verified First Mate legal assist guidance", async () => {
    const assist = await caller.federalLaw.firstMateAssist({
      query: "Find federal guidance concerning behavioral supports in an IEP",
    });

    expect(assist.results.length).toBeGreaterThan(0);
    expect(assist.results[0]).toHaveProperty("legalStatusText");
    expect(assist.results[0]).toHaveProperty("officialSource");
    expect(assist.results[0]).toHaveProperty("isBindingLaw");
  });
});
