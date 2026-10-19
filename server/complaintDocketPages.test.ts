import { describe, it, expect } from "vitest";
import {
  getDocketTotalPages,
  getBinderPageRange,
  getPageDisplayBadge,
  STATE_FORM_PAGE_COUNT,
  PAGES_PER_BINDER,
} from "../client/src/pages/complaint/ComplaintWorkspace";

describe("State Complaint Packet Index & Continuous Page Renumbering (PG-020)", () => {
  const initialPages = [
    { id: "cover", number: "01", title: "State Form", category: "cover" },
    { id: "clarity_control", number: "02", title: "Clarity Control Restatement", category: "restatement" },
    { id: "chronological_summary", number: "03", title: "Chronological Summary", category: "facts" },
    { id: "exhibit_index", number: "04", title: "Exhibit Index", category: "pleading" },
    { id: "exhibit_a", number: "05", title: "Exhibit A (Student's IEP)", category: "exhibit" },
    { id: "exhibit_b", number: "06", title: "Exhibit B (Evaluations)", category: "exhibit" },
    { id: "exhibit_c", number: "07", title: "Exhibit C (Communications)", category: "exhibit" },
  ];

  it("calculates initial continuous page ranges across 7 binders", () => {
    // 4 pages for binder 01 + 6 * 2 pages = 16 pages total
    const total = getDocketTotalPages(initialPages as any);
    expect(total).toBe(16);

    // Binder 01: Pages 01–04
    expect(getBinderPageRange(0, initialPages as any).badge).toBe("01–04");
    // Binder 02: Pages 05–06
    expect(getBinderPageRange(1, initialPages as any).badge).toBe("05–06");
    // Binder 03: Pages 07–08
    expect(getBinderPageRange(2, initialPages as any).badge).toBe("07–08");
    // Binder 07: Pages 15–16
    expect(getBinderPageRange(6, initialPages as any).badge).toBe("15–16");
  });

  it("dynamically shifts and updates all subsequent page numbers when a binder is removed", () => {
    // Remove Binder 02 ("clarity_control")
    const updatedPages = initialPages.filter((p) => p.id !== "clarity_control");
    expect(updatedPages.length).toBe(6);

    // Total pages should now be 14 (16 - 2)
    const newTotal = getDocketTotalPages(updatedPages as any);
    expect(newTotal).toBe(14);

    // Binder 01 remains Pages 01–04
    expect(getBinderPageRange(0, updatedPages as any).badge).toBe("01–04");
    expect(getPageDisplayBadge(updatedPages[0], 0)).toBe("01");

    // Chronological summary is now Binder 02 and should seamlessly take Pages 05–06 (no gaps!)
    expect(getBinderPageRange(1, updatedPages as any).badge).toBe("05–06");
    expect(getPageDisplayBadge(updatedPages[1], 1)).toBe("02");

    // Exhibit Index is now Binder 03 and takes Pages 07–08
    expect(getBinderPageRange(2, updatedPages as any).badge).toBe("07–08");
    expect(getPageDisplayBadge(updatedPages[2], 2)).toBe("03");

    // Last binder is now Binder 06 and takes Pages 13–14
    expect(getBinderPageRange(5, updatedPages as any).badge).toBe("13–14");
    expect(getPageDisplayBadge(updatedPages[5], 5)).toBe("06");
  });

  it("dynamically increases total and shifts ranges when a binder is added", () => {
    const pagesWithNewBinder = [
      ...initialPages,
      { id: "student_impact", number: "08", title: "Student Impact Statement", category: "pleading" },
    ];

    expect(getDocketTotalPages(pagesWithNewBinder as any)).toBe(18);
    expect(getBinderPageRange(7, pagesWithNewBinder as any).badge).toBe("17–18");
    expect(getPageDisplayBadge(pagesWithNewBinder[7], 7)).toBe("08");
  });

  it("correctly handles multi-page evidentiary PDF attachments in docket ranges", () => {
    const pagesWithPdfExhibit = [
      initialPages[0], // 4 pages
      initialPages[1], // 2 pages
      {
        id: "exhibit_a",
        number: "03",
        title: "Exhibit A (Attached 5-page PDF)",
        category: "exhibit",
        renderedPages: [{}, {}, {}, {}, {}], // 5 PDF pages + 1 cover page = 6 pages
      },
    ];

    // 4 + 2 + (1 + 5) = 12 total pages
    const total = getDocketTotalPages(pagesWithPdfExhibit as any);
    expect(total).toBe(12);

    const exhibitRange = getBinderPageRange(2, pagesWithPdfExhibit as any);
    expect(exhibitRange.coverPage).toBe(7);
    expect(exhibitRange.contentStart).toBe(8);
    expect(exhibitRange.contentEnd).toBe(12);
  });
});

describe("Clarity Control Restatement Auto-Restate & Mandatory Pleading (PG-020)", () => {
  it("enforces that Cover (01) and Clarity Control Restatement (02) are always present in order", async () => {
    const { ensureRequiredBinders } = await import("../client/src/pages/complaint/ComplaintWorkspace");
    
    // Older draft missing clarity_control
    const pagesWithoutClarity = [
      { id: "cover", number: "01", title: "State Form", category: "cover" },
      { id: "exhibit_a", number: "02", title: "Exhibit A", category: "exhibit" },
    ];

    const result = ensureRequiredBinders(pagesWithoutClarity as any);
    expect(result.length).toBe(3);
    expect(result[0].id).toBe("cover");
    expect(result[0].number).toBe("01");
    expect(result[1].id).toBe("clarity_control");
    expect(result[1].number).toBe("02");
    expect(result[2].id).toBe("exhibit_a");
    expect(result[2].number).toBe("03");
  });

  it("builds Clarity Control Restatement strictly from State Form Box 1, 2, and 3 without court caption", async () => {
    const { buildClarityControlContent } = await import(
      "../client/src/pages/complaint/ComplaintWorkspace"
    );

    const formState: any = {
      stateCode: "GA",
      studentName: "Brooklyn Smith",
      publicAgency: "Paulding County School District",
      statementOfViolations: "The district failed to deliver 120 minutes of speech therapy per week.",
      factsRelatingToViolations: "Service logs show zero sessions provided between Sept 1 and Nov 15, 2025.",
      proposedResolution: "Provide 24 hours of 1-on-1 compensatory speech therapy by a licensed SLP.",
    };

    const content = buildClarityControlContent(formState);

    // Verify court caption is strictly NOT present
    expect(content).not.toContain("BEFORE THE GEORGIA DEPARTMENT OF EDUCATION");
    expect(content).not.toContain("DIVISION FOR SPECIAL EDUCATION SERVICES");
    expect(content).not.toContain("BROOKLYN SMITH");
    expect(content).not.toContain("PAULDING COUNTY SCHOOL DISTRICT");
    expect(content).not.toContain("CLARITY CONTROL RESTATEMENT OF ISSUES & STATUTORY VIOLATIONS");

    // Starts directly with Section #1
    expect(content.startsWith("#1. STATEMENT OF ALLEGED VIOLATIONS")).toBe(true);

    // Verify #1, #2, #3 paragraphs auto-copied from Box 1, 2, 3
    expect(content).toContain("#1. STATEMENT OF ALLEGED VIOLATIONS");
    expect(content).toContain("The district failed to deliver 120 minutes of speech therapy per week.");

    expect(content).toContain("#2. FACTS RELATING TO ALLEGED VIOLATIONS");
    expect(content).toContain("Service logs show zero sessions provided between Sept 1 and Nov 15, 2025.");

    expect(content).toContain("#3. PROPOSED RESOLUTION TO ALLEGED VIOLATIONS");
    expect(content).toContain("Provide 24 hours of 1-on-1 compensatory speech therapy by a licensed SLP.");

    // Verify demographic contact info is NOT in the restatement
    expect(content).not.toContain("Phone:");
    expect(content).not.toContain("GTID");
    expect(content).not.toContain("Parent Address");
  });

  it("auto-updates restatement content when any State Form box text is updated", async () => {
    const { buildClarityControlContent } = await import(
      "../client/src/pages/complaint/ComplaintWorkspace"
    );

    const formState: any = {
      stateCode: "GA",
      studentName: "Elijah Santiago",
      publicAgency: "Atlanta Public Schools",
      statementOfViolations: "Initial statement of violation.",
      factsRelatingToViolations: "Initial facts.",
      proposedResolution: "Initial relief.",
    };

    const initialContent = buildClarityControlContent(formState);
    expect(initialContent).toContain("Initial statement of violation.");

    // Update Box 1
    formState.statementOfViolations = "Updated allegation: Complete failure to implement FBA/BIP.";
    const updatedContent = buildClarityControlContent(formState);
    expect(updatedContent).toContain("Updated allegation: Complete failure to implement FBA/BIP.");
    expect(updatedContent).not.toContain("Initial statement of violation.");
  });
});

