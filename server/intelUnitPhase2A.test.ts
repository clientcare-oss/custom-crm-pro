import { beforeAll, describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  extractAndIndexPdfDocument,
  searchIndexedDocument,
  verifySourceReferenceAgainstIndex,
} from "./services/intelDocumentIndexService";
import { resolveVaultFileBinary } from "./db/meetingWorkspace";
import { queryCloudflareD1 } from "./_core/d1Client";

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 9060114,
      openId: "user_3HamsO4oLoKLKOnDi9BR16e6RZW",
      email: "byron@waypointadvocates.com",
      name: "Byron Honea",
      loginMethod: "clerk",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

function createRestrictedStaffContext(): TrpcContext {
  return {
    user: {
      id: 9060250,
      openId: "user_3KPhcRBro_wyatt",
      email: "wyatt.smith@waypointadvocates.com",
      name: "Wyatt Smith",
      loginMethod: "clerk",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

describe("Intel Unit Phase 2A — Vault PDF Indexing, Table Search, Citation Verification & Persistence", () => {
  const BROOKLYN_STUDENT_ID = 120044;
  const REESE_STUDENT_ID = 120040;
  const CURRENT_IEP_FILE_ID = 507; // 'current IEP.pdf' (24 pages)
  const PREVIOUS_IEP_FILE_ID = 508; // 'Previous IEP.pdf' (22 pages)
  const NON_PDF_IMAGE_FILE_ID = 510; // 'brooklyns_statement.png'
  const UNAVAILABLE_BINARY_FILE_ID = 501; // Reese's '/documents/Reese_Vance_2026_Annual_IEP.pdf' (no binary on disk)

  beforeAll(async () => {
    try {
      await queryCloudflareD1(
        `CREATE TABLE IF NOT EXISTS contacts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ownerId INTEGER NOT NULL DEFAULT 1,
          firstName TEXT NOT NULL,
          lastName TEXT NOT NULL,
          email TEXT DEFAULT NULL,
          parentContactId INTEGER DEFAULT NULL
        )`,
        []
      );
      await queryCloudflareD1(
        `CREATE TABLE IF NOT EXISTS clientFiles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          clientId INTEGER NOT NULL,
          projectId INTEGER DEFAULT NULL,
          fileName TEXT NOT NULL,
          fileUrl TEXT NOT NULL,
          fileKey TEXT NOT NULL,
          fileSize INTEGER DEFAULT NULL,
          mimeType TEXT DEFAULT 'application/pdf',
          uploadedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          studentContactId INTEGER,
          category TEXT DEFAULT 'ieps-504s',
          documentType TEXT DEFAULT 'Other',
          documentDate TEXT,
          uploadOrigin TEXT DEFAULT 'Client',
          isCurrentPlan INTEGER DEFAULT 0
        )`,
        []
      );
      await queryCloudflareD1(
        `CREATE TABLE IF NOT EXISTS iepDocuments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          contactId INTEGER NOT NULL,
          currentFileKey TEXT DEFAULT NULL,
          currentFileName TEXT DEFAULT NULL,
          currentFileUrl TEXT DEFAULT NULL,
          previousFileKey TEXT DEFAULT NULL,
          previousFileName TEXT DEFAULT NULL,
          previousFileUrl TEXT DEFAULT NULL
        )`,
        []
      );

      await queryCloudflareD1(
        "INSERT OR IGNORE INTO contacts (id, ownerId, firstName, lastName, parentContactId) VALUES (120040, 1, 'Reese', 'Vance', 120039), (120043, 1, 'Chris', 'Smith', NULL), (120044, 1, 'Brooklyn', 'Smith', 120043)",
        []
      );
      await queryCloudflareD1(
        "INSERT OR IGNORE INTO clientFiles (id, clientId, studentContactId, fileName, fileKey, fileUrl, mimeType, uploadedAt, documentType, documentDate, isCurrentPlan) VALUES (501, 120040, 120040, 'Reese_Vance_2026_Annual_IEP.pdf', 'vault/reese-vance/2026-annual-iep.pdf', '/documents/Reese_Vance_2026_Annual_IEP.pdf', 'application/pdf', '2026-10-01 10:00:00', 'Current IEP', '2026-09-15', 1), (507, 120043, 120044, 'current IEP.pdf', 'iep-documents/current_IEP.pdf', '/storage/iep-documents/current_IEP.pdf', 'application/pdf', '2026-10-16 11:06:15', 'Current IEP', '2026-10-16', 1), (508, 120043, 120044, 'Previous IEP.pdf', 'iep-documents/Previous_IEP.pdf', '/storage/iep-documents/Previous_IEP.pdf', 'application/pdf', '2026-10-10 12:36:38', 'Previous IEP', '2026-10-10', 0), (510, 120043, 120044, 'brooklyns statement.png', 'iep-documents/brooklyns_statement.png', '/storage/iep-documents/brooklyns_statement.png', 'image/png', '2026-10-16 12:00:00', 'Other', '2026-10-16', 0)",
        []
      );
      await queryCloudflareD1(
        "UPDATE clientFiles SET clientId = 120043, studentContactId = 120044 WHERE id IN (506, 507, 508, 509, 510, 511)",
        []
      );
      await queryCloudflareD1(
        "UPDATE iepDocuments SET contactId = 120044 WHERE contactId = 120042",
        []
      );

      // Self-contained CI fixture generation when gitignored uploads/ directory is absent in GitHub Actions
      const uploadsDir = path.resolve(process.cwd(), "uploads", "iep-documents");
      const currentPdfPath = path.join(uploadsDir, "current_IEP.pdf");
      const prevPdfPath = path.join(uploadsDir, "Previous_IEP.pdf");

      if (!fs.existsSync(currentPdfPath) || !fs.existsSync(prevPdfPath)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        const buildFixturePdf = async (totalPages: number, mathPageNum: number) => {
          const doc = await PDFDocument.create();
          const font = await doc.embedFont(StandardFonts.Helvetica);
          for (let i = 1; i <= totalPages; i++) {
            const page = doc.addPage([612, 792]);
            page.drawText(
              `PAULDING COUNTY SCHOOL DISTRICT - INDIVIDUALIZED EDUCATION PROGRAM (IEP) - IEP Meeting Date: 4/23/2026`,
              { x: 36, y: 740, size: 10, font }
            );
            if (i === mathPageNum) {
              page.drawText(
                `The WJ-IV ACH was given to provide information regarding Brooklyn's Reading Comprehension and Math skills.`,
                { x: 36, y: 680, size: 10, font }
              );
              page.drawText(
                `Based on the results of the WJ-IV ACH, Brooklyn's math reasoning and math computation were in the average range.`,
                { x: 36, y: 650, size: 10, font }
              );
              page.drawText(
                `Winter '25: 349 (P3) Spring '26: 368 (P3) Baselines/Data Gathered:`,
                { x: 36, y: 620, size: 10, font }
              );
              page.drawText(
                `When assessed on single-step word problems involving multiplication, division, subtraction, and addition, Brooklyn answered questions at 0% accuracy.`,
                { x: 36, y: 590, size: 9, font }
              );
            } else {
              page.drawText(
                `Student Name: Brooklyn Faith Smith - Section Content for Page ${i} of ${totalPages} with documented IEP provisions.`,
                { x: 36, y: 680, size: 10, font }
              );
            }
            page.drawText(`${i} of ${totalPages}`, { x: 520, y: 36, size: 9, font });
          }
          return Buffer.from(await doc.save());
        };

        if (!fs.existsSync(currentPdfPath)) {
          fs.writeFileSync(currentPdfPath, await buildFixturePdf(24, 3));
        }
        if (!fs.existsSync(prevPdfPath)) {
          fs.writeFileSync(prevPdfPath, await buildFixturePdf(22, 4));
        }
      }
    } catch {}
  });

  it("1 & 2. Loads real 24-page Vault PDF (current IEP.pdf) without a second upload, distinguishes IEP date from upload date, and indexes all 24 pages", async () => {
    const caller = appRouter.createCaller(createAdminContext());

    const vaultList = await caller.clientFiles.listVault({
      studentId: BROOKLYN_STUDENT_ID,
    });
    expect(vaultList.some((f: any) => f.id === CURRENT_IEP_FILE_ID)).toBe(true);
    expect(vaultList.some((f: any) => f.id === PREVIOUS_IEP_FILE_ID)).toBe(true);

    const docRes = await caller.meetingWorkspace.getVaultDocument({
      studentContactId: BROOKLYN_STUDENT_ID,
      fileId: CURRENT_IEP_FILE_ID,
    });

    expect(docRes.status).toBe("ready");
    expect(docRes.fileName).toBe("current IEP.pdf");
    expect(docRes.pageCount).toBe(24);
    expect(docRes.iepDocumentDate).toBe("4/23/2026");
    expect(docRes.uploadedAt).toBeTruthy();
    expect(docRes.iepDocumentDate).not.toBe(docRes.uploadedAt);
    expect(docRes.pdfBase64).toBeTruthy();
    expect(docRes.index?.overallStatus).toBe("complete");
    expect(docRes.index?.readablePageCount).toBe(24);
    expect(docRes.index?.unreadablePageCount).toBe(0);
    expect(docRes.index?.pages.length).toBe(24);
  }, 30000);

  it("2b. Reports failed/unreadable pages accurately and never marks a document 'complete' when pages fail extraction", async () => {
    // Pass a corrupt/non-PDF buffer to verify failed extraction reporting
    const corruptedIndex = await extractAndIndexPdfDocument({
      fileId: 999901,
      studentContactId: BROOKLYN_STUDENT_ID,
      fileName: "Corrupted_Scan.pdf",
      pdfBuffer: Buffer.from("not-a-valid-pdf-binary"),
      forceReindex: true,
    });
    expect(corruptedIndex.overallStatus).toBe("failed");
    expect(corruptedIndex.readablePageCount).toBe(0);
  });

  it("3 & 5. Searches and locates Math Present Levels text inside tables on PDF pages 3-4 with normalized percentage bounding boxes (0..100%)", async () => {
    const caller = appRouter.createCaller(createAdminContext());

    const searchWj = await caller.meetingWorkspace.searchDocumentIndex({
      studentContactId: BROOKLYN_STUDENT_ID,
      fileId: CURRENT_IEP_FILE_ID,
      query: "WJ-IV ACH",
    });

    expect(searchWj.totalMatches).toBeGreaterThan(0);
    const page3Hit = searchWj.hits.find((h) => h.pdfPageNumber === 3);
    expect(page3Hit).toBeDefined();
    expect(page3Hit?.boundingBoxes.length).toBeGreaterThan(0);

    for (const box of page3Hit!.boundingBoxes) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x).toBeLessThanOrEqual(100);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeLessThanOrEqual(100);
      expect(box.width).toBeGreaterThan(0);
      expect(box.height).toBeGreaterThan(0);
    }

    const searchMathTable = await caller.meetingWorkspace.searchDocumentIndex({
      studentContactId: BROOKLYN_STUDENT_ID,
      fileId: CURRENT_IEP_FILE_ID,
      query: "single-step word problems involving multiplication",
    });
    expect(searchMathTable.totalMatches).toBeGreaterThan(0);
    expect(searchMathTable.hits[0].pdfPageNumber).toBe(3);
    expect(searchMathTable.hits[0].boundingBoxes.length).toBeGreaterThan(0);
  });

  it("4 & 6. Verifies exact citations as 'verified', labels page-only references as 'page_only', and labels altered numbers or negation as 'unverified' ('Source needs verification')", async () => {
    const rows = await queryCloudflareD1(
      "SELECT * FROM clientFiles WHERE id = ? LIMIT 1",
      [CURRENT_IEP_FILE_ID]
    );
    const pdfBuffer = await resolveVaultFileBinary(rows[0] as any);
    expect(pdfBuffer).toBeTruthy();

    const index = await extractAndIndexPdfDocument({
      fileId: CURRENT_IEP_FILE_ID,
      studentContactId: BROOKLYN_STUDENT_ID,
      fileName: "current IEP.pdf",
      pdfBuffer: pdfBuffer!,
    });

    // 1. Exact table passage on page 3 -> "verified" with boundingBoxes
    const exactMatch = verifySourceReferenceAgainstIndex(index, {
      pdfPageNumber: 3,
      excerpt: "When assessed on single-step word problems involving multiplication, division",
    });
    expect(exactMatch.verificationStatus).toBe("verified");
    expect(exactMatch.pdfPageNumber).toBe(3);
    expect(exactMatch.boundingBoxes.length).toBeGreaterThan(0);

    // 2. Altered number ("368" -> "999" in Spring '26 score) -> "unverified" with empty boundingBoxes
    const alteredNumber = verifySourceReferenceAgainstIndex(index, {
      pdfPageNumber: 3,
      excerpt: "Winter '25: 349 (P3) Spring '26: 999 (P3)",
    });
    expect(alteredNumber.verificationStatus).toBe("unverified");
    expect(alteredNumber.boundingBoxes).toEqual([]);
    expect(alteredNumber.verificationReason).toContain("Source needs verification");

    // 3. Altered negation ("were not in the average range" instead of "were in the average range") -> "unverified"
    const alteredNegation = verifySourceReferenceAgainstIndex(index, {
      pdfPageNumber: 3,
      excerpt: "math reasoning and math computation were not in the average range",
    });
    expect(alteredNegation.verificationStatus).toBe("unverified");
    expect(alteredNegation.boundingBoxes).toEqual([]);

    // 4. Page-only reference (no excerpt) -> "page_only" with empty boundingBoxes (no invented highlight box)
    const pageOnly = verifySourceReferenceAgainstIndex(index, {
      pdfPageNumber: 4,
      excerpt: "",
    });
    expect(pageOnly.verificationStatus).toBe("page_only");
    expect(pageOnly.pdfPageNumber).toBe(4);
    expect(pageOnly.boundingBoxes).toEqual([]);
  });

  it("3b. Handles unsupported non-PDF files (.png) and unavailable binaries cleanly without crashing", async () => {
    const caller = appRouter.createCaller(createAdminContext());

    const unsupportedRes = await caller.meetingWorkspace.getVaultDocument({
      studentContactId: BROOKLYN_STUDENT_ID,
      fileId: NON_PDF_IMAGE_FILE_ID,
    });
    expect(unsupportedRes.status).toBe("unsupported");
    expect(unsupportedRes.pdfBase64).toBeNull();

    const unavailableRes = await caller.meetingWorkspace.getVaultDocument({
      studentContactId: REESE_STUDENT_ID,
      fileId: UNAVAILABLE_BINARY_FILE_ID,
    });
    expect(unavailableRes.status).toBe("unavailable");
    expect(unavailableRes.pdfBase64).toBeNull();
  });

  it("8 & 11. Preserves findings, goal drafts, accommodation drafts, and per-document state across saves, document switches, and Blueprint handoffs, while neutralizing legacy runIepIntel fabrication", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const TEST_STUDENT_ID = 990201;

    const ws = await caller.meetingWorkspace.getOrCreate({
      studentContactId: TEST_STUDENT_ID,
    });
    expect(ws).toBeTruthy();

    // Neutralized runIepIntel must NOT invent fake findings from diagnosis/challenges alone
    const scanRes = await caller.meetingWorkspace.runIepIntel({
      studentContactId: TEST_STUDENT_ID,
    });
    expect(scanRes.status).toBe("document_audit_pending");
    expect(scanRes.findings).toEqual([]);

    // Save findings, Blueprint targets, and per-document scoped Intel Unit drafts (doc:507 vs doc:508)
    const verifiedFinding = {
      id: "intel-src-verified-1",
      category: "Present Levels",
      section: "Present Levels / Academics",
      text: "Math computation baseline requires multi-step word problem support.",
      quote: 'PDF p. 4: "single-step word problems involving multiplication"',
      status: "important",
      isCustom: true,
      sourceRef: {
        documentId: CURRENT_IEP_FILE_ID,
        fileName: "current IEP.pdf",
        pdfPageNumber: 4,
        excerpt: "single-step word problems involving multiplication",
        verificationStatus: "verified",
      },
    };

    const blueprintTarget = {
      id: "target-from-intel-src-verified-1",
      targetName: "Present Levels",
      iepSection: "Present Levels / Academics",
      sectionOrder: 1,
      targetOrder: 1,
      quickAdvocateSayThis: verifiedFinding.text,
      fullAdvocateScript: verifiedFinding.text,
      putItHereLocation: "Present Levels / Academics",
      possibleIepWording: verifiedFinding.text,
      whyWeWantIt: verifiedFinding.text,
      supportingEvidence: verifiedFinding.quote,
      sources: ["current IEP.pdf · PDF p. 4"],
      ifTeamDisagrees: "Request PWN.",
      parentWhatWeWant: verifiedFinding.text,
      parentWhyWeWantIt: verifiedFinding.text,
      parentSupportingEvidence: verifiedFinding.quote,
      requestRaised: false,
      meetingStatus: "NOT_DISCUSSED",
      pwnNeeded: false,
      addedToIep: false,
      followUpNeeded: false,
      isCustom: true,
    };

    const intelUnitState = {
      selectedDocId: CURRENT_IEP_FILE_ID,
      activeChapter: "goals",
      byDocument: {
        [`doc:${CURRENT_IEP_FILE_ID}`]: {
          pageNumber: 4,
          zoomPercent: 120,
          goalSlots: [
            {
              id: "goal-slot-1",
              domain: "Math Problem Solving",
              originalGoal: "Solve single-step multiplication word problems",
              sourcePage: "PDF p. 11",
              sourceQuote: "Solve single-step multiplication word problems",
              baselineCheck: "documented",
              measurementCheck: "gap_identified",
              conditionCheck: "documented",
              alignmentCheck: "documented",
              findingSummary: "Goal lacks multi-step baseline alignment",
              reasoning: "Needs explicit trial criterion",
              selectedSuggestionKey: "strengthen_measurement",
              suggestions: [],
            },
          ],
          accommodationSlots: [],
          chapterStates: {},
        },
        [`doc:${PREVIOUS_IEP_FILE_ID}`]: {
          pageNumber: 7,
          zoomPercent: 100,
          goalSlots: [
            {
              id: "goal-slot-prior-1",
              domain: "Prior Year Reading Fluency",
              originalGoal: "Prior reading goal text",
              sourcePage: "PDF p. 7",
              sourceQuote: "Prior reading goal text",
              baselineCheck: "unchecked",
              measurementCheck: "unchecked",
              conditionCheck: "unchecked",
              alignmentCheck: "unchecked",
              findingSummary: "Prior document draft preserved separately",
              reasoning: "",
              selectedSuggestionKey: null,
              suggestions: [],
            },
          ],
          accommodationSlots: [],
          chapterStates: {},
        },
      },
    };

    await caller.meetingWorkspace.save({
      id: ws!.id,
      iepIntelFindings: [verifiedFinding],
      meetingTargets: [blueprintTarget],
      closeoutChecks: {
        allRequestsRaised: false,
        pwnIdentified: false,
        agreedLocationsClear: false,
        followUpAssigned: false,
        nextMeetingDiscussed: false,
        intelUnitState,
      },
    });

    // Reload workspace (simulating page refresh or student switch back)
    const reloaded = await caller.meetingWorkspace.getOrCreate({
      studentContactId: TEST_STUDENT_ID,
    });
    const reloadedFindings = JSON.parse(reloaded!.iepIntelFindings || "[]");
    const reloadedTargets = JSON.parse(reloaded!.meetingTargets || "[]");
    const reloadedChecks = JSON.parse(reloaded!.closeoutChecks || "{}");

    expect(reloadedFindings.length).toBe(1);
    expect(reloadedFindings[0].sourceRef.pdfPageNumber).toBe(4);
    expect(reloadedTargets.length).toBe(1);
    expect(reloadedTargets[0].id).toBe("target-from-intel-src-verified-1");

    // Verify both documents' drafts are preserved independently without overwriting each other
    expect(
      reloadedChecks.intelUnitState.byDocument[`doc:${CURRENT_IEP_FILE_ID}`]
        .goalSlots[0].domain
    ).toBe("Math Problem Solving");
    expect(
      reloadedChecks.intelUnitState.byDocument[`doc:${PREVIOUS_IEP_FILE_ID}`]
        .goalSlots[0].domain
    ).toBe("Prior Year Reading Fluency");
  });

  it("9. Connects Prior IEP (Previous IEP.pdf, 22 pages) in the drawer through the same indexing foundation", async () => {
    const caller = appRouter.createCaller(createAdminContext());

    const priorDocRes = await caller.meetingWorkspace.getVaultDocument({
      studentContactId: BROOKLYN_STUDENT_ID,
      fileId: PREVIOUS_IEP_FILE_ID,
    });

    expect(priorDocRes.status).toBe("ready");
    expect(priorDocRes.fileName).toBe("Previous IEP.pdf");
    expect(priorDocRes.pageCount).toBe(22);
    expect(priorDocRes.index?.readablePageCount).toBe(22);
  }, 30000);

  it("10. Rejects unauthorized file requests (restricted staff role or cross-student file access)", async () => {
    // 1. Staff member with files='none' access
    const restrictedCaller = appRouter.createCaller(createRestrictedStaffContext());
    await expect(
      restrictedCaller.meetingWorkspace.getVaultDocument({
        studentContactId: BROOKLYN_STUDENT_ID,
        fileId: CURRENT_IEP_FILE_ID,
      })
    ).rejects.toThrow(/restricted|permission/i);

    // 2. Cross-student request: trying to load Brooklyn Smith's IEP (507) under Reese Vance (120040)
    const adminCaller = appRouter.createCaller(createAdminContext());
    await expect(
      adminCaller.meetingWorkspace.getVaultDocument({
        studentContactId: REESE_STUDENT_ID,
        fileId: CURRENT_IEP_FILE_ID,
      })
    ).rejects.toThrow(/not associated|permission/i);
  });

  it("12. Records Review: categorizes school/outside evaluations, compares evaluations with Current IEP, and runs First Mate with source citations and limitations", async () => {
    const caller = appRouter.createCaller(createAdminContext());

    // 1. Re-assign file 508 as a school evaluation and verify Current IEP (507) remains intact
    const metaRes = await caller.meetingWorkspace.updateRecordMetadata({
      studentContactId: BROOKLYN_STUDENT_ID,
      fileId: PREVIOUS_IEP_FILE_ID,
      recordGroup: "school_evaluation",
      documentDate: "2026-03-10",
    });
    expect(metaRes.recordGroup).toBe("school_evaluation");

    // 2. Compare school evaluation (508) with Current IEP (507)
    const cmpRes = await caller.meetingWorkspace.compareEvaluationsWithIep({
      studentContactId: BROOKLYN_STUDENT_ID,
      currentIepFileId: CURRENT_IEP_FILE_ID,
      evaluationFileIds: [PREVIOUS_IEP_FILE_ID],
      sectionFilter: "all",
    });
    expect(cmpRes.reviewedDocuments.length).toBe(2);
    expect(cmpRes.connections.length).toBeGreaterThan(0);
    expect(cmpRes.connections[0].evalSource.fileId).toBe(PREVIOUS_IEP_FILE_ID);
    expect(cmpRes.connections[0].proposedMeetingQuestion).toBeTruthy();

    // 3. Ask First Mate using selected records
    const fmRes = await caller.meetingWorkspace.askFirstMateRecordsReview({
      studentContactId: BROOKLYN_STUDENT_ID,
      action: "explain_passage",
      selectedFileIds: [CURRENT_IEP_FILE_ID, PREVIOUS_IEP_FILE_ID],
      activeFileId: CURRENT_IEP_FILE_ID,
      activePageNumber: 3,
      selectedPassageText:
        "When assessed on single-step word problems involving multiplication, division, subtraction, and addition, Brooklyn answered questions at 0% accuracy.",
    });
    expect(fmRes.answerSummary).toBeTruthy();
    expect(fmRes.sourceRecordsUsed.length).toBe(2);
    expect(fmRes.citations.length).toBeGreaterThan(0);
    expect(fmRes.draftFindings.length).toBeGreaterThan(0);
    expect(fmRes.draftFindings[0].isAiDraft).toBe(true);
  }, 30000);

  it("13. Guided Review: orders findings strictly by IEP page and passage position (not severity) and avoids fabricated highlights for missing items", async () => {
    const { sortFindingsInIepDocumentOrder } = await import(
      "../client/src/components/meeting-workspace/intel-unit/intelUnitTypes"
    );
    const { buildGuidedReviewSequence } = await import(
      "../client/src/components/meeting-workspace/intel-unit/guidedReviewHelpers"
    );

    const caller = appRouter.createCaller(createAdminContext());
    const docRes = await caller.meetingWorkspace.getVaultDocument({
      studentContactId: BROOKLYN_STUDENT_ID,
      fileId: CURRENT_IEP_FILE_ID,
    });
    expect(docRes.index).toBeTruthy();

    // Create out-of-order findings with high-severity items on later pages and low-severity items on earlier pages
    const unsortedFindings = [
      {
        id: "fnd-late-high",
        category: "Services",
        section: "Special Education Services",
        text: "High priority service grid item on page 14",
        quote: "PDF p. 14",
        status: "important" as const,
        priority: "high" as const,
        sourceRef: {
          documentId: CURRENT_IEP_FILE_ID,
          fileName: "current IEP.pdf",
          pdfPageNumber: 14,
          excerpt: "Service delivery minutes",
          boundingBoxes: [{ x: 10, y: 45, width: 60, height: 4 }],
          verificationStatus: "verified" as const,
        },
      },
      {
        id: "fnd-early-low-bottom",
        category: "Present Levels",
        section: "Present Levels",
        text: "Lower passage on page 3",
        quote: "PDF p. 3",
        status: "keep" as const,
        priority: "low" as const,
        sourceRef: {
          documentId: CURRENT_IEP_FILE_ID,
          fileName: "current IEP.pdf",
          pdfPageNumber: 3,
          excerpt: "Single-step word problems",
          boundingBoxes: [{ x: 10, y: 72, width: 60, height: 4 }],
          verificationStatus: "verified" as const,
        },
      },
      {
        id: "fnd-early-low-top",
        category: "Present Levels",
        section: "Present Levels",
        text: "Upper passage on page 3",
        quote: "PDF p. 3",
        status: "keep" as const,
        priority: "low" as const,
        sourceRef: {
          documentId: CURRENT_IEP_FILE_ID,
          fileName: "current IEP.pdf",
          pdfPageNumber: 3,
          excerpt: "WJ-IV ACH scores",
          boundingBoxes: [{ x: 10, y: 18, width: 60, height: 4 }],
          verificationStatus: "verified" as const,
        },
      },
    ];

    const sorted = sortFindingsInIepDocumentOrder(
      unsortedFindings,
      CURRENT_IEP_FILE_ID
    );
    expect(sorted.map((f) => f.id)).toEqual([
      "fnd-early-low-top",
      "fnd-early-low-bottom",
      "fnd-late-high",
    ]);

    // Build guided sequence with a "Not located" evaluation recommendation
    const guidedSeq = buildGuidedReviewSequence({
      savedFindings: unsortedFindings,
      documentIndex: docRes.index,
      comparisonConnections: [
        {
          id: "conn-missing-at",
          iepSection: "Assistive Technology",
          evalFindingOrRecommendation:
            "Provide dedicated text-to-speech assistive technology across core classes.",
          status: "Not located",
          explanation:
            "Not located in the reviewed Current IEP sections.",
          proposedMeetingQuestion:
            "How will the team address the outside evaluation recommendation for text-to-speech assistive technology?",
          evalSource: {
            fileId: PREVIOUS_IEP_FILE_ID,
            fileName: "Outside_Eval.pdf",
            recordGroup: "outside_evaluation",
            documentDate: "2026-03-10",
            pdfPageNumber: 4,
            printedPageLabel: "4 of 22",
            excerpt:
              "Provide dedicated text-to-speech assistive technology across core classes.",
            boundingBoxes: [{ x: 12, y: 30, width: 70, height: 5 }],
            verificationStatus: "verified",
          },
          iepPassage: null,
        },
      ],
      decisionsMap: {},
    });

    expect(guidedSeq.length).toBeGreaterThan(3);
    const missingItem = guidedSeq.find((f) => f.id === "fnd-conn-missing-at");
    expect(missingItem).toBeDefined();
    expect(missingItem?.iepLocateStatus).toBe("Not located");
    expect(missingItem?.sourceRef).toBeUndefined();
    expect(missingItem?.evalSourceRef?.documentId).toBe(PREVIOUS_IEP_FILE_ID);
    expect(missingItem?.relevantIepSectionPage).toBeGreaterThanOrEqual(1);
  });

  it("14. Preserves one connected finding across Records Review -> Blueprint -> Meeting Space without duplicates or lost outcomes", async () => {
    const {
      getCanonicalTargetIdForFinding,
      resolveConnectedTargetForFinding,
      hasRecordedMeetingOutcome,
      getFindingStageStatus,
      upsertConnectedTargetFromFinding,
      syncFindingUpdateToTargets,
      reconcileSourceMaterialChanges,
    } = await import(
      "../client/src/components/meeting-workspace/intel-unit/connectedFindingWorkflow"
    );

    // 1. Create a finding in Records Review with IEP + Evaluation citations
    const finding = {
      id: "fnd-e2e-math-goal",
      category: "Annual Goals",
      section: "Annual Goals",
      text: "Math word-problem goal lacks multi-step baseline and explicit trial criterion.",
      quote: "When assessed on single-step word problems, Brooklyn answered at 0% accuracy.",
      status: "keep" as const,
      advocateConfirmed: true,
      reviewDecision: "saved" as const,
      priority: "high" as const,
      proposedQuestion:
        "Can we revise the math word-problem goal to include explicit visual modeling and a measurable 4-of-5 trial criterion?",
      whyItMatters:
        "School evaluation recommends structured visual modeling for word problems.",
      sourceRef: {
        documentId: CURRENT_IEP_FILE_ID,
        fileName: "current IEP.pdf",
        pdfPageNumber: 11,
        printedPageLabel: "11 of 21",
        sectionHeading: "Annual Goals",
        excerpt: "Solve single-step multiplication word problems",
        boundingBoxes: [{ x: 10, y: 24, width: 70, height: 5 }],
        verificationStatus: "verified" as const,
      },
      evalSourceRef: {
        documentId: PREVIOUS_IEP_FILE_ID,
        fileName: "School_Eval.pdf",
        pdfPageNumber: 6,
        printedPageLabel: "6 of 22",
        sectionHeading: "Math Recommendations",
        excerpt: "Provide explicit visual schema instruction for word problems.",
        boundingBoxes: [{ x: 12, y: 40, width: 65, height: 5 }],
        verificationStatus: "verified" as const,
      },
    };

    // Initially saved for later in Records Review (not yet in Blueprint)
    const initialStage = getFindingStageStatus(finding, [], "PREPARING");
    expect(initialStage.stageStatus).toBe("saved_for_later");

    // 2. Send to Blueprint -> creates one canonical connected target
    const firstSend = upsertConnectedTargetFromFinding({
      finding,
      targets: [],
    });
    expect(firstSend.wasExisting).toBe(false);
    expect(firstSend.updatedTargets.length).toBe(1);
    expect(firstSend.target.id).toBe(getCanonicalTargetIdForFinding(finding.id));
    expect(firstSend.target.sourceFindingId).toBe(finding.id);
    expect(firstSend.target.sourceRef?.pdfPageNumber).toBe(11);
    expect(firstSend.target.evalSourceRef?.pdfPageNumber).toBe(6);
    expect(firstSend.target.quickAdvocateSayThis).toBe(finding.proposedQuestion);

    const blueprintStage = getFindingStageStatus(
      finding,
      firstSend.updatedTargets,
      "PREPARING"
    );
    expect(blueprintStage.stageStatus).toBe("in_blueprint");

    // 3. Edit the finding in Records Review -> updates the connected target in place without creating a duplicate
    const editedFinding = {
      ...finding,
      text: "Updated rationale: Math word-problem goal lacks multi-step baseline and visual schema support.",
      proposedQuestion:
        "Updated question: Can we add visual schema modeling and bi-weekly progress monitoring to the math goal?",
      priority: "high" as const,
    };
    const syncedTargets = syncFindingUpdateToTargets(
      editedFinding,
      firstSend.updatedTargets
    );
    expect(syncedTargets.length).toBe(1);
    expect(syncedTargets[0].quickAdvocateSayThis).toContain("Updated question:");
    expect(syncedTargets[0].whyWeWantIt).toContain("Updated rationale:");

    // Sending again updates in place rather than duplicating
    const secondSend = upsertConnectedTargetFromFinding({
      finding: editedFinding,
      targets: syncedTargets,
    });
    expect(secondSend.wasExisting).toBe(true);
    expect(secondSend.updatedTargets.length).toBe(1);

    // 4. Advance to Meeting Space and record a live meeting outcome
    const liveTargets = secondSend.updatedTargets.map((t) => ({
      ...t,
      requestRaised: true,
      meetingStatus: "AGREED" as const,
      addedToIep: true,
      notes: "Team agreed to add visual schema support and bi-weekly tracking.",
    }));

    const meetingStage = getFindingStageStatus(
      editedFinding,
      liveTargets,
      "LIVE"
    );
    expect(meetingStage.stageStatus).toBe("on_meeting_agenda");
    expect(hasRecordedMeetingOutcome(liveTargets[0])).toBe(true);

    // Verify original evidence remains accessible on the live target
    const resolvedTarget = resolveConnectedTargetForFinding(
      editedFinding,
      liveTargets
    );
    expect(resolvedTarget?.sourceRef?.documentId).toBe(CURRENT_IEP_FILE_ID);
    expect(resolvedTarget?.sourceRef?.pdfPageNumber).toBe(11);
    expect(resolvedTarget?.evalSourceRef?.documentId).toBe(PREVIOUS_IEP_FILE_ID);

    // 5. Source material change reconciliation: if evaluation file 508 is removed from vault,
    // flag the finding & target for review without erasing the finding or its recorded meeting outcome
    const reconciledFindings = reconcileSourceMaterialChanges({
      findings: [editedFinding],
      vaultDocuments: [
        {
          id: CURRENT_IEP_FILE_ID,
          fileName: "current IEP.pdf",
          folderCategory: "IEP",
          recordGroup: "current_iep",
          documentDate: "2026-05-01",
          createdAt: "2026-05-01",
        },
      ],
      designatedCurrentIepId: CURRENT_IEP_FILE_ID,
    });
    expect(reconciledFindings.length).toBe(1);
    expect(reconciledFindings[0].sourceMaterialFlaggedForReview).toBe(true);

    const reconciledTargets = syncFindingUpdateToTargets(
      reconciledFindings[0],
      liveTargets
    );
    expect(reconciledTargets.length).toBe(1);
    expect(reconciledTargets[0].sourceMaterialFlaggedForReview).toBe(true);
    expect(reconciledTargets[0].meetingStatus).toBe("AGREED");
    expect(reconciledTargets[0].notes).toContain("Team agreed");
  });

  it("15. Blueprint parent-friendly plan workflow: 4 editable sections, deliberate parent-review status, destination routing (Final Meeting Plan / Keep in Blueprint / Parent Doesn't Want / Set Aside), combining items while retaining all sources, and preserving meeting outcomes", async () => {
    const {
      getEffectiveParentReviewStatus,
      getEffectiveTargetDestination,
      isTargetIncludedInFinalMeetingPlan,
      setTargetParentReviewStatus,
      setTargetDestination,
      toggleTargetIncludedInFinalMeetingPlan,
      removeTargetFromActivePlan,
      restoreTargetToActivePlan,
      upsertConnectedTargetFromFinding,
      combinePlanItemsPreservingSources,
    } = await import(
      "../client/src/components/meeting-workspace/intel-unit/connectedFindingWorkflow"
    );

    // 1. Send an existing records-review finding into Blueprint with source references intact
    const readingFinding = {
      id: "fnd-reading-gap",
      category: "Annual Goals",
      section: "Annual Goals",
      text: "The IEP describes reading difficulties, but it does not include a reading goal.",
      quote: "Broad Reading standard score: 79 (8th percentile).",
      status: "keep" as const,
      advocateConfirmed: true,
      reviewDecision: "saved" as const,
      priority: "high" as const,
      proposedQuestion:
        "A measurable reading goal based on your child's current reading skills.",
      whyItMatters:
        "We need a clear way to track whether your child's reading is improving.",
      sourceRef: {
        documentId: CURRENT_IEP_FILE_ID,
        fileName: "current IEP.pdf",
        pdfPageNumber: 7,
        printedPageLabel: "7 of 21",
        excerpt: "Broad Reading standard score: 79",
        boundingBoxes: [{ x: 10, y: 20, width: 65, height: 5 }],
        verificationStatus: "verified" as const,
      },
    };

    const sendRes = upsertConnectedTargetFromFinding({
      finding: readingFinding,
      targets: [],
    });
    let planItem = sendRes.target;

    // Newly added findings stay in Blueprint ("keep_in_blueprint") with "review_with_parent"
    expect(getEffectiveTargetDestination(planItem)).toBe("keep_in_blueprint");
    expect(getEffectiveParentReviewStatus(planItem)).toBe("review_with_parent");
    expect(isTargetIncludedInFinalMeetingPlan(planItem)).toBe(false);
    expect(planItem.sourceRef?.pdfPageNumber).toBe(7);

    // 2. Edit the 4 parent-friendly sections inline and record parent input
    planItem = {
      ...planItem,
      parentWhatWeFound:
        "The IEP describes reading difficulties, but it does not include a reading goal.",
      parentWhyWeWantIt:
        "We need a clear way to track whether your child's reading is improving.",
      parentWhatWeWant:
        "A measurable reading goal based on your child's current reading skills.",
      parentInput:
        "Parent confirmed child avoids reading aloud at home; high priority for the family.",
    };
    expect(planItem.parentWhatWeFound).toContain("does not include a reading goal");
    expect(planItem.parentInput).toContain("high priority for the family");

    // 3. Deliberately change parent-review status (Review with Parent -> Parent Approved -> Ready for Meeting)
    // Verify it NEVER automatically sends the item to the Final Meeting Plan
    planItem = setTargetParentReviewStatus(planItem, "parent_approved");
    expect(getEffectiveParentReviewStatus(planItem)).toBe("parent_approved");
    expect(getEffectiveTargetDestination(planItem)).toBe("keep_in_blueprint");
    expect(isTargetIncludedInFinalMeetingPlan(planItem)).toBe(false);

    planItem = setTargetParentReviewStatus(planItem, "ready_for_meeting");
    expect(getEffectiveParentReviewStatus(planItem)).toBe("ready_for_meeting");
    expect(isTargetIncludedInFinalMeetingPlan(planItem)).toBe(false);

    // Can return to Review with Parent when changes are needed
    planItem = setTargetParentReviewStatus(planItem, "review_with_parent");
    expect(getEffectiveParentReviewStatus(planItem)).toBe("review_with_parent");
    planItem = setTargetParentReviewStatus(planItem, "parent_approved");

    // 4. Directly select "Include in Final Meeting Plan" -> reflects the exact same destination setting
    planItem = toggleTargetIncludedInFinalMeetingPlan(planItem);
    expect(getEffectiveTargetDestination(planItem)).toBe("final_meeting_plan");
    expect(isTargetIncludedInFinalMeetingPlan(planItem)).toBe(true);

    // Record a live meeting outcome on the item
    planItem = {
      ...planItem,
      requestRaised: true,
      meetingStatus: "AGREED",
      notes: "Team agreed to draft a phonics & fluency reading goal.",
    };

    // 5. Move into Parent Doesn't Want, Set Aside, Keep in Blueprint, or Remove from Plan
    // Moving out of Final Meeting Plan removes it from active requests WITHOUT erasing meeting notes/outcomes
    planItem = setTargetDestination(
      planItem,
      "parent_doesnt_want",
      "Parent prefers to focus on math first and revisit reading next quarter."
    );
    expect(getEffectiveTargetDestination(planItem)).toBe("parent_doesnt_want");
    expect(planItem.tags).toContain("PARENT_DOESNT_WANT");
    expect(planItem.parentDoesntWantReason).toContain("focus on math first");
    expect(isTargetIncludedInFinalMeetingPlan(planItem)).toBe(false);
    expect(planItem.meetingStatus).toBe("AGREED");
    expect(planItem.notes).toContain("Team agreed");

    planItem = setTargetDestination(planItem, "set_aside");
    expect(getEffectiveTargetDestination(planItem)).toBe("set_aside");
    expect(isTargetIncludedInFinalMeetingPlan(planItem)).toBe(false);

    // Remove from Plan and restore without losing evidence or creating duplicates
    planItem = removeTargetFromActivePlan(planItem);
    expect(planItem.removedFromPlan).toBe(true);
    expect(isTargetIncludedInFinalMeetingPlan(planItem)).toBe(false);

    planItem = restoreTargetToActivePlan(planItem, "final_meeting_plan");
    expect(planItem.removedFromPlan).toBe(false);
    expect(isTargetIncludedInFinalMeetingPlan(planItem)).toBe(true);
    expect(planItem.sourceRef?.pdfPageNumber).toBe(7);
    expect(planItem.meetingStatus).toBe("AGREED");

    // 6. Combine related findings into one request while retaining every source reference
    const secondFinding = {
      id: "fnd-reading-eval-rec",
      category: "Evaluations",
      section: "Annual Goals",
      text: "Outside evaluation recommends Orton-Gillingham multisensory decoding benchmarks.",
      status: "keep" as const,
      proposedQuestion: "Include multisensory decoding benchmarks in the reading goal.",
      evalSourceRef: {
        documentId: PREVIOUS_IEP_FILE_ID,
        fileName: "Outside_Eval.pdf",
        recordGroup: "outside_evaluation" as const,
        pdfPageNumber: 12,
        excerpt: "Provide multisensory decoding benchmarks.",
        verificationStatus: "verified" as const,
      },
    };

    const combineRes = combinePlanItemsPreservingSources({
      primaryTarget: planItem,
      additionalFindings: [secondFinding],
      allTargets: [planItem],
      allFindings: [readingFinding, secondFinding],
    });

    expect(combineRes.updatedTargets.length).toBe(1);
    expect(combineRes.combinedTarget.combinedSourceFindingIds).toEqual([
      "fnd-reading-gap",
      "fnd-reading-eval-rec",
    ]);
    expect(combineRes.combinedTarget.combinedSourceItems?.length).toBe(2);
    expect(combineRes.combinedTarget.sourceRef?.pdfPageNumber).toBe(7);
    expect(combineRes.combinedTarget.evalSourceRef?.pdfPageNumber).toBe(12);
  });

  it("16. Blueprint 'What to Say to the Parent' read-aloud script: tailored suggestions (accommodation / missing goal / clarification), plain-language framing, separation from formal request & feedback, and preservation of manual edits when regenerating", async () => {
    const {
      detectWhatToSayToParentStyle,
      generateWhatToSayToParentScript,
      getEffectiveWhatToSayToParentScript,
      updateWhatToSayToParentManualEdit,
      regenerateWhatToSayToParentForTarget,
      regenerateWhatToSayToParentAcrossTargets,
      upsertConnectedTargetFromFinding,
    } = await import(
      "../client/src/components/meeting-workspace/intel-unit/connectedFindingWorkflow"
    );

    // 1. Possible accommodation framing
    const accommodationItem = {
      id: "tgt-accom",
      targetName: "Quiet Transition Support",
      iepSection: "Accommodations / Supports",
      parentWhatWeFound: "unstructured hallway transitions cause sensory overload",
      parentWhyWeWantIt: "stay regulated and ready to learn",
      parentWhatWeWant: "a 2-minute visual transition warning and noise-reducing headphones",
    };
    expect(detectWhatToSayToParentStyle(accommodationItem)).toBe("accommodation");
    const accomScript = generateWhatToSayToParentScript(accommodationItem, {
      studentName: "Leo Martinez",
    });
    expect(accomScript).toContain("We found a possible accommodation that may help with");
    expect(accomScript).toContain("We’d like to ask the IEP team to consider");
    expect(accomScript).toContain("Leo");
    expect(accomScript).toContain("Does that sound helpful based on what you see?");

    // 2. Missing goal framing
    const missingGoalItem = {
      id: "tgt-goal",
      targetName: "Reading Fluency Goal",
      iepSection: "Annual Goals",
      parentWhatWeFound:
        "The IEP describes reading difficulties, but it does not include a reading goal.",
      parentWhyWeWantIt:
        "We need a clear way to track whether your child's reading is improving.",
      parentWhatWeWant:
        "A measurable reading goal based on your child's current reading skills.",
    };
    expect(detectWhatToSayToParentStyle(missingGoalItem)).toBe("missing_goal");
    const goalScript = generateWhatToSayToParentScript(missingGoalItem);
    expect(goalScript).toContain("We noticed the IEP describes reading difficulties, but we didn’t find a goal addressing it.");
    expect(goalScript).toContain("We’d like to ask the team about adding a measurable reading goal");
    expect(goalScript).toContain("Is this something you want us to bring up?");

    // 3. Clarification needed framing + jargon cleanup
    const clarificationItem = {
      id: "tgt-clarify",
      targetName: "Behavior Prompting Clarification",
      iepSection: "Present Levels",
      parentWhatWeFound:
        "The PLAAFP states behavior does not impede learning when 1:1 adult prompt is provided",
      parentWhyWeWantIt: "Clarify daily support needs",
      parentWhatWeWant:
        "Can the team clarify how often 1:1 adult prompting is needed and whether an FBA should be considered?",
    };
    expect(detectWhatToSayToParentStyle(clarificationItem)).toBe("clarification");
    const clarifyScript = generateWhatToSayToParentScript(clarificationItem);
    expect(clarifyScript).toContain("We found something we’d like the team to explain more clearly.");
    expect(clarifyScript).toContain("but it isn’t clear how often 1:1 adult prompting is needed");
    expect(clarifyScript).toContain("functional behavior assessment");
    expect(clarifyScript).not.toContain("PLAAFP");
    expect(clarifyScript).toContain("What has your experience been?");

    // 4. Inline editing & strict preservation when regenerating suggestions or syncing findings
    const finding = {
      id: "fnd-custom-script",
      category: "Accommodations",
      section: "Accommodations / Supports",
      text: "Extended time is listed without specifying the exact percentage.",
      status: "keep" as const,
      proposedQuestion: "Specify 50% extended time on classroom tests and quizzes.",
    };

    const created = upsertConnectedTargetFromFinding({
      finding,
      targets: [],
    }).target;
    expect(created.whatToSayToParent).toBeTruthy();
    expect(created.whatToSayToParentEdited).toBe(false);

    // Employee edits "What to Say to the Parent" inline
    const customParentScript =
      "When we looked at the testing accommodations, we noticed extended time is listed without a specific amount. We'd like to ask the team to consider specifying 50% extra time. How does that sound to you?";
    const editedTarget = updateWhatToSayToParentManualEdit(
      created,
      customParentScript
    );
    expect(editedTarget.whatToSayToParent).toBe(customParentScript);
    expect(editedTarget.whatToSayToParentEdited).toBe(true);
    expect(getEffectiveWhatToSayToParentScript(editedTarget)).toBe(
      customParentScript
    );

    // Verify formal meeting request, technical analysis, and parent feedback remain separate
    expect(editedTarget.parentWhatWeWant).toBe(
      "Specify 50% extended time on classroom tests and quizzes."
    );
    expect(editedTarget.fullAdvocateScript).toBe(
      "Extended time is listed without specifying the exact percentage."
    );

    // Regenerating suggestions on an edited item does NOT overwrite the employee's edit
    const singleRegen = regenerateWhatToSayToParentForTarget(editedTarget, {
      studentName: "Leo",
      forceOverwriteEdited: false,
    });
    expect(singleRegen.wasSkippedBecauseEdited).toBe(true);
    expect(singleRegen.updatedTarget.whatToSayToParent).toBe(customParentScript);
    expect(singleRegen.suggestedScript).not.toBe(customParentScript);

    // Bulk regeneration refreshes unedited items while preserving edited ones
    const uneditedTarget = upsertConnectedTargetFromFinding({
      finding: {
        ...finding,
        id: "fnd-unedited",
      },
      targets: [],
    }).target;

    const bulkRegen = regenerateWhatToSayToParentAcrossTargets(
      [editedTarget, uneditedTarget],
      { studentName: "Leo" }
    );
    expect(bulkRegen.preservedEditedCount).toBe(1);
    expect(bulkRegen.regeneratedCount).toBe(1);
    expect(bulkRegen.updatedTargets[0].whatToSayToParent).toBe(
      customParentScript
    );

    // Re-upserting from Step 1 also preserves the employee's edited parent script
    const reupserted = upsertConnectedTargetFromFinding({
      finding: {
        ...finding,
        text: "Updated finding detail from Step 1.",
      },
      targets: [editedTarget],
    }).target;
    expect(reupserted.whatToSayToParent).toBe(customParentScript);
    expect(reupserted.whatToSayToParentEdited).toBe(true);
  });
});
