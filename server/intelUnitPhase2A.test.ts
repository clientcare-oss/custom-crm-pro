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
});
