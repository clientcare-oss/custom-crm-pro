import { describe, it, expect } from "vitest";
import {
  getDocketTotalPages,
  getBinderPageRange,
  getPageDisplayBadge,
  paginateTextContent,
  getBinderContentPageCount,
  syncExhibitIndexTableOfSections,
  formatExhibitIndexHighlights,
  extractCleanExhibitTitle,
  generateMasterExhibitIndexContent,
  STATE_FORM_PAGE_COUNT,
  PAGES_PER_BINDER,
} from "../client/src/pages/complaint/ComplaintWorkspace";
import { INITIAL_GADOE_FORM_STATE } from "../client/src/components/complaint/stateFormsData";

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

  it("paginates long legal text across multiple 8.5x11 sheets without truncation", () => {
    // Generate a long legal narrative with 5 paragraphs totalling ~5,000 characters
    const para1 = "Paragraph 1: Allegation of severe denial of FAPE. ".repeat(25);
    const para2 = "Paragraph 2: Factual timeline of missed specialized instruction sessions. ".repeat(25);
    const para3 = "Paragraph 3: Complete omission of Prior Written Notice under 34 CFR 300.503. ".repeat(25);

    const longStatement = `${para1}\n\n${para2}\n\n${para3}`;
    expect(longStatement.length).toBeGreaterThan(4500);

    const sheets = paginateTextContent(longStatement);
    expect(sheets.length).toBeGreaterThanOrEqual(2);
    expect(sheets.every((s) => s.trim().length > 0)).toBe(true);

    // Verify all content from the paragraphs is preserved across the sheets
    const joined = sheets.join("\n\n");
    expect(joined).toContain("Paragraph 1: Allegation of severe denial of FAPE.");
    expect(joined).toContain("Paragraph 2: Factual timeline of missed specialized instruction sessions.");
    expect(joined).toContain("Paragraph 3: Complete omission of Prior Written Notice");
  });

  it("dynamically increases total docket pages and shifts subsequent ranges when Clarity Control statement expands to multiple sheets", () => {
    // Normal single-page statement
    const pagesWithSinglePageClarity = [
      { id: "cover", number: "01", title: "State Form", category: "cover" },
      { id: "clarity_control", number: "02", title: "Clarity Control Restatement", category: "restatement", content: "Short statement." },
      { id: "chronological_summary", number: "03", title: "Chronological Summary", category: "facts", content: "Short facts." },
      { id: "exhibit_index", number: "04", title: "Exhibit Index", category: "pleading", content: "Index content." },
      { id: "exhibit_a", number: "05", title: "Exhibit A (Student's IEP)", category: "exhibit" },
    ];

    // 4 (Form) + 1+1 (Clarity) + 1+1 (Chrono) + 1+1 (Index) + 1+1 (Exh A) = 12 total pages
    expect(getDocketTotalPages(pagesWithSinglePageClarity as any)).toBe(12);
    expect(getBinderPageRange(1, pagesWithSinglePageClarity as any).badge).toBe("05–06");
    expect(getBinderPageRange(2, pagesWithSinglePageClarity as any).badge).toBe("07–08");

    // Long statement that expands to 2 sheets (1 cover + 2 content sheets = 3 sheets for Clarity Control)
    const longStatement = "Paragraph text detailing ongoing statutory non-compliance and service omissions. ".repeat(40);
    const pagesWithMultiPageClarity = [
      { id: "cover", number: "01", title: "State Form", category: "cover" },
      { id: "clarity_control", number: "02", title: "Clarity Control Restatement", category: "restatement", content: longStatement },
      { id: "chronological_summary", number: "03", title: "Chronological Summary", category: "facts", content: "Short facts." },
      { id: "exhibit_index", number: "04", title: "Exhibit Index", category: "pleading", content: "Index content." },
      { id: "exhibit_a", number: "05", title: "Exhibit A (Student's IEP)", category: "exhibit" },
    ];

    const claritySheetCount = getBinderContentPageCount(pagesWithMultiPageClarity[1] as any);
    expect(claritySheetCount).toBeGreaterThanOrEqual(2);

    // Total docket pages increases dynamically
    const newTotal = getDocketTotalPages(pagesWithMultiPageClarity as any);
    expect(newTotal).toBe(12 + (claritySheetCount - 1));

    // Clarity Control range expands to Pages 05–07 (or 05–08 depending on sheet count)
    const clarityRange = getBinderPageRange(1, pagesWithMultiPageClarity as any);
    expect(clarityRange.coverPage).toBe(5);
    expect(clarityRange.contentStart).toBe(6);
    expect(clarityRange.contentEnd).toBe(5 + claritySheetCount);
    expect(clarityRange.badge).toBe(`05–0${5 + claritySheetCount}`);

    // Chronological Summary starts immediately on the next continuous page with zero overlap or gaps!
    const chronoRange = getBinderPageRange(2, pagesWithMultiPageClarity as any);
    expect(chronoRange.coverPage).toBe(5 + claritySheetCount + 1);
    expect(chronoRange.contentStart).toBe(chronoRange.coverPage + 1);
  });

  it("formats exhibit index highlight ranges according to formal Georgia filing standards", () => {
    // Single page
    expect(formatExhibitIndexHighlights([14])).toBe("Highlighted section: Page 14");
    // Contiguous range
    expect(formatExhibitIndexHighlights([14, 15, 16])).toBe("Highlighted sections: Pages 14–16");
    // Multiple ranges / nonconsecutive pages
    expect(formatExhibitIndexHighlights([14, 15, 16, 22, 23])).toBe("Highlighted sections: Pages 14–16, 22–23");
    // Deduplication and sorting
    expect(formatExhibitIndexHighlights([23, 14, 15, 14, 22, 16])).toBe("Highlighted sections: Pages 14–16, 22–23");
    // Empty array returns null (no highlighted line rendered)
    expect(formatExhibitIndexHighlights([])).toBeNull();
  });

  it("extracts clean professional legal exhibit titles without redundant prefixes or vault metadata", () => {
    expect(extractCleanExhibitTitle("Exhibit A (Student's IEP)")).toBe("Operative IEP & Specialized Instruction Schedule");
    expect(extractCleanExhibitTitle("Exhibit B (Evaluations)")).toBe("Psychoeducational Evaluations & Parent Written Requests");
    expect(extractCleanExhibitTitle("Exhibit C (Communications)")).toBe("District Correspondence & Service Logs");
    expect(extractCleanExhibitTitle("Exhibit D — Physical Therapy Evaluation")).toBe("Physical Therapy Evaluation");
    expect(extractCleanExhibitTitle("Exhibit E: 2025_09_Speech_Therapy_Logs.pdf")).toBe("Speech Therapy Logs");
  });

  it("synchronizes Master Exhibit Index as a clean formal Table of Contents with dynamic page ranges and highlights", () => {
    const rawExhibitIndexContent = "Legacy filler text";
    const longStatement = "Paragraph text detailing ongoing statutory non-compliance and service omissions. ".repeat(40);
    const pages = [
      { id: "cover", number: "01", title: "State Form", category: "cover" },
      { id: "clarity_control", number: "02", title: "Clarity Control Restatement", category: "restatement", content: longStatement },
      { id: "chronological_summary", number: "03", title: "Chronological Summary", category: "facts", content: "Short facts." },
      { id: "exhibit_index", number: "04", title: "Master Exhibit Index", category: "pleading", content: rawExhibitIndexContent },
      {
        id: "exhibit_a",
        number: "05",
        title: "Exhibit A — Operative IEP & Specialized Instruction Schedule",
        category: "exhibit",
        exhibitTag: "Exhibit A",
        highlights: [
          { id: "h1", pageNumber: 3 },
          { id: "h2", pageNumber: 4 },
          { id: "h3", pageNumber: 5 },
          { id: "h4", pageNumber: 11 },
          { id: "h5", pageNumber: 12 },
        ],
      },
    ];

    const synced = syncExhibitIndexTableOfSections(rawExhibitIndexContent, pages as any);

    // 1. Heading verification
    expect(synced).toContain("MASTER EXHIBIT INDEX");
    expect(synced).toContain("Formal State Complaint");

    // 2. Exhibit letter and continuous page range (dynamically shifted by long Clarity Control statement)
    expect(synced).toContain("Exhibit A");
    // Verify Exhibit A reflects starting docket page range
    expect(synced).toMatch(/Exhibit A\s+Pages \d+–\d+/);

    // 3. Clean full exhibit title
    expect(synced).toContain("Operative IEP & Specialized Instruction Schedule");

    // 4. Highlighted sections line with continuous compiled complaint page numbers
    expect(synced).toMatch(/Highlighted sections: Pages \d+–\d+, \d+–\d+/);

    // 5. Verifies removal of internal metadata and filler
    expect(synced).not.toContain("PG-023-VAULT");
    expect(synced).not.toContain("Attached from Document Vault");
    expect(synced).not.toContain("TABLE OF COMPLAINT FILING SECTIONS");
    expect(synced).not.toContain("All exhibits are sequentially tabbed and incorporated");
  });

  it("defaults state mediation willingness to 'no' unless explicitly changed by user", () => {
    // Official GaDOE default form state must have 'no' preselected for mediation willingness
    expect(INITIAL_GADOE_FORM_STATE.mediationWillingness).toBe("no");

    // Allows user to select 'yes' or 'na' when clicked
    const userSelectedYes = { ...INITIAL_GADOE_FORM_STATE, mediationWillingness: "yes" as const };
    expect(userSelectedYes.mediationWillingness).toBe("yes");

    const userSelectedNa = { ...INITIAL_GADOE_FORM_STATE, mediationWillingness: "na" as const };
    expect(userSelectedNa.mediationWillingness).toBe("na");
  });
});

