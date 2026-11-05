import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, adminProcedure, assertClientContactOwnership } from "../_core/trpc";
import { checkBackendCaseAccess } from "../_core/staffAccess";
import { queryCloudflareD1 } from "../_core/d1Client";
import * as db from "../db";
import { isFileLinkedToStudent, resolveVaultFileBinary } from "../db/meetingWorkspace";
import { invokeLLM, CF_MODELS } from "../_core/llm";
import { recordCaseActivity } from "../services/caseActivityService";
import { parseAdvocateReadyDocument } from "../services/advocateReadyParser";
import { classifyDocument } from "../services/documentClassifier";
import { inMemoryVaultFiles } from "./clientFiles";
import {
  extractAndIndexPdfDocument,
  searchIndexedDocument,
  verifySourceReferenceAgainstIndex,
} from "../services/intelDocumentIndexService";
import {
  updateVaultRecordMetadata,
  runEvaluationsToIepComparison,
  runFirstMateRecordsReview,
} from "../services/recordsReviewService";

async function assertAuthorizedStudentVaultFile(
  ctx: any,
  studentContactId: number,
  fileId: number
): Promise<any> {
  if (ctx.staffAccess?.isStaff) {
    const caseLevel = checkBackendCaseAccess(ctx.staffAccess, "files");
    if (caseLevel === "none") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Access to Student Document Vault & IEP files is restricted for your role.",
      });
    }
  } else {
    await assertClientContactOwnership(ctx, studentContactId);
  }

  // Locate file record in memory (test mode) or clientFiles database table
  let fileRecord: any = null;
  const studentMemFiles = inMemoryVaultFiles.get(studentContactId) || [];
  fileRecord = studentMemFiles.find((f: any) => Number(f.id) === Number(fileId)) || null;

  if (!fileRecord) {
    for (const [ownerId, files] of Array.from(inMemoryVaultFiles.entries())) {
      const found = files.find((f: any) => Number(f.id) === Number(fileId));
      if (found) {
        if (Number(ownerId) !== Number(studentContactId) && Number(found.studentContactId) !== Number(studentContactId) && Number(found.clientId) !== Number(studentContactId)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This document belongs to a different student record.",
          });
        }
        fileRecord = found;
        break;
      }
    }
  }

  if (!fileRecord) {
    try {
      const rows = await queryCloudflareD1(
        "SELECT * FROM clientFiles WHERE id = ? LIMIT 1",
        [fileId]
      );
      if (rows && rows.length > 0) {
        fileRecord = rows[0];
      }
    } catch {}
  }

  if (!fileRecord) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Document not found or you do not have permission to access it.",
    });
  }

  const isLinked = await isFileLinkedToStudent(fileRecord, studentContactId);
  if (!isLinked) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Access denied: document is not associated with the selected student.",
    });
  }

  return fileRecord;
}

function extractLLMText(response: any): string {
  if (!response) return "{}";
  if (typeof response === "string") return response;
  if (response.content) {
    return typeof response.content === "string" ? response.content : JSON.stringify(response.content);
  }
  const firstChoice = response.choices?.[0]?.message?.content;
  if (typeof firstChoice === "string") return firstChoice;
  if (Array.isArray(firstChoice)) {
    return firstChoice.map((c: any) => (typeof c === "string" ? c : (c as any).text || "")).join("");
  }
  return "{}";
}

export const meetingWorkspaceRouter = router({
  /**
   * Get active meeting workspace or create one for student
   */
  getOrCreate: protectedProcedure
    .input(
      z.object({
        studentContactId: z.number(),
        appointmentId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      let resolvedStudentId = input.studentContactId;

      // Smart Parent-to-Student auto-resolution guard:
      // If a parent ID was passed, find their student child so the meeting workspace
      // is always linked to the student record and never splits.
      if (input.studentContactId > 0) {
        try {
          const contact = await db.getContactById(input.studentContactId);
          if (contact && (contact.jobTitle === "Parent" || (!contact.gradeLevel && contact.parentContactId === null))) {
            const allContacts = await db.getContactsByOwner();
            const child = allContacts.find((c: any) => (c.parentContactId ?? c.parent_contact_id) === input.studentContactId);
            if (child) {
              resolvedStudentId = child.id;
            }
          }
        } catch (e) {
          console.warn("[meetingWorkspace.getOrCreate] Auto-resolve parent error:", e);
        }
      }

      let workspace = await db.getWorkspaceByStudentId(resolvedStudentId);

      if (!workspace) {
        // Fetch student contact details to generate friendly title/date
        const contact = await db.getContactById(resolvedStudentId);
        const studentName = contact ? `${contact.firstName} ${contact.lastName}` : "Student";
        const today = new Date().toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });

        workspace = await db.createWorkspace({
          studentContactId: resolvedStudentId,
          appointmentId: input.appointmentId,
          title: `${studentName} — Annual IEP Meeting`,
          meetingDate: `${today} · 10:00 AM`,
          meetingType: "Annual IEP Meeting",
          status: "PREPARING",
          activeTab: "PREP",
          prepStep: "iep_intel",
          detectedIepOrder: JSON.stringify([
            "Parent Concerns",
            "Present Levels / Academics",
            "Special Factors",
            "Annual Goals",
            "Accommodations / Supports",
            "Related Services / AAC",
            "Placement / LRE",
            "ESY & Transportation",
          ]),
          iepIntelFindings: JSON.stringify([]),
          parentIntelConcerns: JSON.stringify([]),
          parentConcernStatement: "",
          pcsApproved: false,
          meetingTargets: JSON.stringify([]),
          parkingLot: JSON.stringify([]),
          additionalItems: JSON.stringify([]),
          closeoutChecks: JSON.stringify({
            allRequestsRaised: false,
            pwnIdentified: false,
            agreedLocationsClear: false,
            followUpAssigned: false,
            nextMeetingDiscussed: false,
          }),
        });
      }

      return workspace;
    }),

  /**
   * Get workspace by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const workspace = await db.getWorkspaceById(input.id);
      if (!workspace) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Meeting workspace not found" });
      }
      return workspace;
    }),

  /**
   * List workspaces for student
   */
  listByStudent: protectedProcedure
    .input(z.object({ studentContactId: z.number() }))
    .query(async ({ input }) => {
      let resolvedId = input.studentContactId;
      try {
        const contact = await db.getContactById(input.studentContactId);
        if (contact && (contact.jobTitle === "Parent" || (!contact.gradeLevel && contact.parentContactId === null))) {
          const allContacts = await db.getContactsByOwner();
          const child = allContacts.find((c: any) => (c.parentContactId ?? c.parent_contact_id) === input.studentContactId);
          if (child) resolvedId = child.id;
        }
      } catch {}
      return db.listWorkspacesByStudentId(resolvedId);
    }),

  /**
   * Save workspace state
   */
  save: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        meetingTitle: z.string().optional(),
        meetingDate: z.string().optional(),
        meetingType: z.string().optional(),
        status: z.string().optional(),
        activeTab: z.string().optional(),
        prepStep: z.string().optional(),
        detectedIepOrder: z.union([z.string(), z.array(z.any()), z.any()]).optional(),
        iepIntelFindings: z.union([z.string(), z.array(z.any()), z.any()]).optional(),
        parentIntelConcerns: z.union([z.string(), z.array(z.any()), z.any()]).optional(),
        parentConcernStatement: z.string().optional(),
        pcsApproved: z.boolean().optional(),
        pcsLastApprovedAt: z.union([z.date(), z.string()]).optional().nullable(),
        meetingTargets: z.union([z.string(), z.array(z.any()), z.any()]).optional(),
        parkingLot: z.union([z.string(), z.array(z.any()), z.any()]).optional(),
        additionalItems: z.union([z.string(), z.array(z.any()), z.any()]).optional(),
        closeoutChecks: z.union([z.string(), z.record(z.string(), z.any()), z.any()]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, meetingTitle, ...data } = input;
      const serialize = (val: any) => {
        if (val === undefined) return undefined;
        if (val === null) return null;
        if (typeof val === "string") return val;
        try {
          return JSON.stringify(val);
        } catch {
          return "[]";
        }
      };

      const payload: any = {
        ...data,
        title: data.title || meetingTitle,
        detectedIepOrder: serialize(data.detectedIepOrder),
        iepIntelFindings: serialize(data.iepIntelFindings),
        parentIntelConcerns: serialize(data.parentIntelConcerns),
        meetingTargets: serialize(data.meetingTargets),
        parkingLot: serialize(data.parkingLot),
        additionalItems: serialize(data.additionalItems),
        closeoutChecks: serialize(data.closeoutChecks),
      };

      if (data.pcsLastApprovedAt) {
        payload.pcsLastApprovedAt = new Date(data.pcsLastApprovedAt);
      }

      const updated = await db.updateWorkspace(id, payload);
      if (!updated) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update workspace" });
      }
      return updated;
    }),

  /**
   * Phase 2A: Load & Index an Authorized Student Vault Document for the Intel Unit
   */
  getVaultDocument: protectedProcedure
    .input(
      z.object({
        studentContactId: z.number(),
        workspaceId: z.number().optional(),
        fileId: z.number(),
        forceReindex: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const fileRecord = await assertAuthorizedStudentVaultFile(
        ctx,
        input.studentContactId,
        input.fileId
      );

      const fileName = String(fileRecord.fileName || "Document");
      const mimeType = String(fileRecord.mimeType || "application/pdf");
      const classified = classifyDocument(fileName);
      const uploadedAt = fileRecord.uploadedAt
        ? String(fileRecord.uploadedAt)
        : null;
      const fallbackDate =
        fileRecord.documentDate || classified.extractedDate || null;

      // Reject non-PDF formats cleanly with an explicit "unsupported" status
      const isPdf =
        mimeType.toLowerCase().includes("pdf") ||
        fileName.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        return {
          status: "unsupported" as const,
          message: `Unsupported file format (${fileName}). The Intel Unit document workbench requires a PDF file to render pages and verify source coordinates.`,
          fileId: Number(fileRecord.id),
          studentContactId: input.studentContactId,
          fileName,
          documentType: fileRecord.documentType || classified.documentType,
          iepDocumentDate: fallbackDate,
          iepDocumentDateLabel: fallbackDate ? "Documented Date" : null,
          uploadedAt,
          pageCount: 0,
          index: null,
          pdfBase64: null,
        };
      }

      const pdfBuffer = await resolveVaultFileBinary(fileRecord);
      if (!pdfBuffer || pdfBuffer.length === 0) {
        return {
          status: "unavailable" as const,
          message: `Document file binary for "${fileName}" is unavailable in local storage.`,
          fileId: Number(fileRecord.id),
          studentContactId: input.studentContactId,
          fileName,
          documentType: fileRecord.documentType || classified.documentType,
          iepDocumentDate: fallbackDate,
          iepDocumentDateLabel: fallbackDate ? "Documented Date" : null,
          uploadedAt,
          pageCount: 0,
          index: null,
          pdfBase64: null,
        };
      }

      const index = await extractAndIndexPdfDocument({
        fileId: Number(fileRecord.id),
        studentContactId: input.studentContactId,
        workspaceId: input.workspaceId ?? null,
        fileName,
        pdfBuffer,
        uploadedAt,
        fallbackMetadataDate: fallbackDate,
        forceReindex: input.forceReindex,
      });

      return {
        status: "ready" as const,
        message: null,
        fileId: Number(fileRecord.id),
        studentContactId: input.studentContactId,
        fileName,
        documentType: fileRecord.documentType || classified.documentType,
        iepDocumentDate: index.iepDocumentDate,
        iepDocumentDateLabel: index.iepDocumentDateLabel,
        uploadedAt,
        pageCount: index.pageCount,
        index,
        pdfBase64: pdfBuffer.toString("base64"),
      };
    }),

  /**
   * Phase 2A: Full-Document Search Across All Indexed Pages of an Authorized Vault PDF
   */
  searchDocumentIndex: protectedProcedure
    .input(
      z.object({
        studentContactId: z.number(),
        fileId: z.number(),
        query: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const fileRecord = await assertAuthorizedStudentVaultFile(
        ctx,
        input.studentContactId,
        input.fileId
      );

      const fileName = String(fileRecord.fileName || "Document");
      const classified = classifyDocument(fileName);
      const pdfBuffer = await resolveVaultFileBinary(fileRecord);

      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Document binary for "${fileName}" is unavailable for search.`,
        });
      }

      const index = await extractAndIndexPdfDocument({
        fileId: Number(fileRecord.id),
        studentContactId: input.studentContactId,
        fileName,
        pdfBuffer,
        uploadedAt: fileRecord.uploadedAt ? String(fileRecord.uploadedAt) : null,
        fallbackMetadataDate:
          fileRecord.documentDate || classified.extractedDate || null,
      });

      return searchIndexedDocument(index, input.query);
    }),

  /**
   * Phase 2A: Conservative Citation & Excerpt Verification Against an Indexed Vault PDF
   */
  verifySourceCitation: protectedProcedure
    .input(
      z.object({
        studentContactId: z.number(),
        fileId: z.number(),
        pdfPageNumber: z.number().nullable().optional(),
        excerpt: z.string().nullable().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const fileRecord = await assertAuthorizedStudentVaultFile(
        ctx,
        input.studentContactId,
        input.fileId
      );

      const fileName = String(fileRecord.fileName || "Document");
      const classified = classifyDocument(fileName);
      const pdfBuffer = await resolveVaultFileBinary(fileRecord);

      if (!pdfBuffer || pdfBuffer.length === 0) {
        return {
          documentId: Number(fileRecord.id),
          fileName,
          contentFingerprint: "",
          pdfPageNumber: input.pdfPageNumber ?? null,
          printedPageLabel: null,
          excerpt: input.excerpt ?? null,
          boundingBoxes: [],
          verificationStatus: "unverified" as const,
          verificationReason: "Source needs verification — document binary unavailable",
        };
      }

      const index = await extractAndIndexPdfDocument({
        fileId: Number(fileRecord.id),
        studentContactId: input.studentContactId,
        fileName,
        pdfBuffer,
        uploadedAt: fileRecord.uploadedAt ? String(fileRecord.uploadedAt) : null,
        fallbackMetadataDate:
          fileRecord.documentDate || classified.extractedDate || null,
      });

      return verifySourceReferenceAgainstIndex(index, {
        pdfPageNumber: input.pdfPageNumber,
        excerpt: input.excerpt,
      });
    }),

  /**
   * Records Review Drawer: Assign or correct a document's category/group
   * or designate/replace the Current IEP without deleting historical records.
   */
  updateRecordMetadata: protectedProcedure
    .input(
      z.object({
        studentContactId: z.number(),
        fileId: z.number(),
        recordGroup: z.enum([
          "current_iep",
          "school_evaluation",
          "outside_evaluation",
          "historical_iep",
        ]),
        documentDate: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertAuthorizedStudentVaultFile(
        ctx,
        input.studentContactId,
        input.fileId
      );
      return updateVaultRecordMetadata({
        studentContactId: input.studentContactId,
        fileId: input.fileId,
        recordGroup: input.recordGroup,
        documentDate: input.documentDate,
      });
    }),

  /**
   * Records Review Compare View: Connect selected School & Outside Evaluations
   * to the Current IEP across Present Levels, Goals, Accommodations, Services,
   * Placement, Behavior Supports, and Assistive Technology.
   */
  compareEvaluationsWithIep: protectedProcedure
    .input(
      z.object({
        studentContactId: z.number(),
        workspaceId: z.number().optional(),
        currentIepFileId: z.number(),
        evaluationFileIds: z.array(z.number()),
        sectionFilter: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const contact = await db.getContactById(input.studentContactId);
      const studentName = contact
        ? `${contact.firstName} ${contact.lastName}`.trim()
        : "Student";

      const iepRecord = await assertAuthorizedStudentVaultFile(
        ctx,
        input.studentContactId,
        input.currentIepFileId
      );

      const loadIndexedRecord = async (fileRecord: any) => {
        const fileName = String(fileRecord.fileName || "Document.pdf");
        const mimeType = String(fileRecord.mimeType || "application/pdf");
        const isPdf =
          mimeType.toLowerCase().includes("pdf") ||
          fileName.toLowerCase().endsWith(".pdf");
        if (!isPdf) {
          return {
            fileRecord,
            index: null,
            status: "unsupported" as const,
          };
        }
        const pdfBuffer = await resolveVaultFileBinary(fileRecord);
        if (!pdfBuffer || pdfBuffer.length === 0) {
          return {
            fileRecord,
            index: null,
            status: "unavailable" as const,
          };
        }
        const classified = classifyDocument(fileName);
        const index = await extractAndIndexPdfDocument({
          fileId: Number(fileRecord.id),
          studentContactId: input.studentContactId,
          workspaceId: input.workspaceId ?? null,
          fileName,
          pdfBuffer,
          uploadedAt: fileRecord.uploadedAt
            ? String(fileRecord.uploadedAt)
            : null,
          fallbackMetadataDate:
            fileRecord.documentDate || classified.extractedDate || null,
        });
        return {
          fileRecord,
          index,
          status: "ready" as const,
        };
      };

      const iepLoaded = await loadIndexedRecord(iepRecord);

      const evalLoadedList: Array<{
        fileRecord: any;
        index: Awaited<ReturnType<typeof extractAndIndexPdfDocument>> | null;
        status: "ready" | "unavailable" | "unsupported" | "error";
      }> = [];
      for (const evalId of input.evaluationFileIds) {
        if (evalId === input.currentIepFileId) continue;
        const evRecord = await assertAuthorizedStudentVaultFile(
          ctx,
          input.studentContactId,
          evalId
        );
        evalLoadedList.push(await loadIndexedRecord(evRecord));
      }

      return runEvaluationsToIepComparison({
        studentName,
        currentIepFile: iepLoaded.fileRecord,
        currentIepIndex: iepLoaded.index,
        currentIepStatus: iepLoaded.status,
        evaluations: evalLoadedList,
        sectionFilter: input.sectionFilter,
      });
    }),

  /**
   * First Mate Contextual Records Review Assistant:
   * Uses the advocate's selected source records and active passage/page context,
   * reporting exact source citations and extraction/OCR limitations.
   */
  askFirstMateRecordsReview: protectedProcedure
    .input(
      z.object({
        studentContactId: z.number(),
        workspaceId: z.number().optional(),
        action: z.enum([
          "explain_passage",
          "compare_eval_with_iep",
          "find_recommendations",
          "turn_into_question",
          "custom_question",
        ]),
        selectedFileIds: z.array(z.number()),
        activeFileId: z.number().nullable().optional(),
        activePageNumber: z.number().nullable().optional(),
        selectedPassageText: z.string().nullable().optional(),
        customPrompt: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const contact = await db.getContactById(input.studentContactId);
      const studentName = contact
        ? `${contact.firstName} ${contact.lastName}`.trim()
        : "Student";

      const uniqueIds = Array.from(
        new Set(
          [
            ...input.selectedFileIds,
            ...(input.activeFileId ? [input.activeFileId] : []),
          ].filter((id) => id > 0)
        )
      );

      const loadedRecords: Array<{
        fileRecord: any;
        index: Awaited<ReturnType<typeof extractAndIndexPdfDocument>> | null;
        status: "ready" | "unavailable" | "unsupported" | "error";
      }> = [];
      for (const fid of uniqueIds) {
        const rec = await assertAuthorizedStudentVaultFile(
          ctx,
          input.studentContactId,
          fid
        );
        const fileName = String(rec.fileName || "Document.pdf");
        const mimeType = String(rec.mimeType || "application/pdf");
        const isPdf =
          mimeType.toLowerCase().includes("pdf") ||
          fileName.toLowerCase().endsWith(".pdf");
        if (!isPdf) {
          loadedRecords.push({
            fileRecord: rec,
            index: null,
            status: "unsupported" as const,
          });
          continue;
        }
        const pdfBuffer = await resolveVaultFileBinary(rec);
        if (!pdfBuffer || pdfBuffer.length === 0) {
          loadedRecords.push({
            fileRecord: rec,
            index: null,
            status: "unavailable" as const,
          });
          continue;
        }
        const classified = classifyDocument(fileName);
        const index = await extractAndIndexPdfDocument({
          fileId: Number(rec.id),
          studentContactId: input.studentContactId,
          workspaceId: input.workspaceId ?? null,
          fileName,
          pdfBuffer,
          uploadedAt: rec.uploadedAt ? String(rec.uploadedAt) : null,
          fallbackMetadataDate:
            rec.documentDate || classified.extractedDate || null,
        });
        loadedRecords.push({
          fileRecord: rec,
          index,
          status: "ready" as const,
        });
      }

      return runFirstMateRecordsReview({
        studentName,
        action: input.action,
        records: loadedRecords,
        activeFileId: input.activeFileId,
        activePageNumber: input.activePageNumber,
        selectedPassageText: input.selectedPassageText,
        customPrompt: input.customPrompt,
      });
    }),

  /**
   * Step 1: Run IEP Intel (Neutralized in Phase 2A per Section 8)
   * Does not generate document findings from diagnosis/challenges alone or fabricate quotes/page numbers.
   * Preserves existing saved findings in the student's workspace.
   */
  runIepIntel: protectedProcedure
    .input(
      z.object({
        studentContactId: z.number(),
        iepFileName: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const existingWs = await db.getWorkspaceByStudentId(input.studentContactId);
      let existingFindings: any[] = [];
      let existingOrder: string[] = [
        "Parent Concerns",
        "Present Levels / Academics",
        "Special Factors",
        "Annual Goals",
        "Accommodations / Supports",
        "Related Services / AAC",
        "Placement / LRE",
        "ESY & Transportation",
      ];

      if (existingWs?.iepIntelFindings) {
        try {
          const parsed = JSON.parse(existingWs.iepIntelFindings);
          if (Array.isArray(parsed)) existingFindings = parsed;
        } catch {}
      }
      if (existingWs?.detectedIepOrder) {
        try {
          const parsed = JSON.parse(existingWs.detectedIepOrder);
          if (Array.isArray(parsed) && parsed.length > 0) existingOrder = parsed;
        } catch {}
      }

      return {
        status: "document_audit_pending" as const,
        message:
          "Automated IEP chapter auditing is disabled until connected to verified IEP source evidence (Phase 2B). Use Document Search or Capture as Finding on the indexed IEP PDF to record verified source findings. Existing saved findings and imports remain preserved.",
        detectedOrder: existingOrder,
        findings: existingFindings,
      };
    }),

  /**
   * Step 2: Run Parent Intel
   * Scans authorized case history and gathers un-invented family concerns with source attribution
   */
  runParentIntel: protectedProcedure
    .input(z.object({ studentContactId: z.number() }))
    .mutation(async ({ input }) => {
      const contact = await db.getContactById(input.studentContactId);
      const studentName = contact ? `${contact.firstName} ${contact.lastName}`.trim() : "Student";
      const challenges = (contact?.challenges || "").trim();
      const notes = (contact?.notes || "").trim();

      let compassStatus = "";
      if (contact?.caseId) {
        const compass = await db.getCaseCompass(contact.caseId);
        if (compass) {
          compassStatus = `${compass.currentStatus || ""} ${compass.lastMeetingSummary || ""}`.trim();
        }
      }

      // If no real parent-reported challenges, case notes, or compass notes exist, do not fabricate concerns
      if (!challenges && !notes && !compassStatus) {
        const existingWs = await db.getWorkspaceByStudentId(input.studentContactId);
        let savedConcerns: any[] = [];
        if (existingWs?.parentIntelConcerns) {
          try {
            const parsed = JSON.parse(existingWs.parentIntelConcerns);
            if (Array.isArray(parsed)) savedConcerns = parsed;
          } catch {}
        }
        return {
          status: "unavailable" as const,
          message: `No recorded parent concerns or intake notes are on file yet for ${studentName}. Add parent concerns manually below.`,
          concerns: savedConcerns,
        };
      }

      const systemPrompt = `You are Waypoint Advocates' Parent Intel Gatherer.
Your task is to identify and extract what the family/parent has ACTUALLY communicated as concerns from authorized case records.
DO NOT invent parent concerns or use placeholder student names.
Every concern must cite its authentic case source (e.g. "Parent Intake Profile", "Advocate Case Notes", "Case Compass").
Output JSON:
{
  "concerns": [
    {
      "id": string,
      "topic": string,
      "concern": string,
      "source": string,
      "status": "keep" | "edit" | "dismiss"
    }
  ]
}`;

      const userPrompt = `Student: ${studentName}
Parent Reported Challenges: ${challenges || "None recorded"}
Advocate / Case Notes: ${notes || "None recorded"}
Case Compass: ${compassStatus || "None recorded"}

Extract grounded parent concerns strictly from the non-empty fields above with source attribution.`;

      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          model: CF_MODELS.DEEP,
          responseFormat: { type: "json_object" },
        });

        const raw = extractLLMText(response);
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.concerns)) {
          return parsed;
        }
      } catch (err) {
        console.warn("[meetingWorkspace] LLM fallback for Parent Intel:", err);
      }

      const fallbackConcerns: any[] = [];
      if (challenges) {
        fallbackConcerns.push({
          id: `pc-${Date.now()}-1`,
          topic: "Reported Student Challenges",
          concern: challenges,
          source: "Student Profile — Challenges",
          status: "keep",
        });
      }
      if (notes) {
        fallbackConcerns.push({
          id: `pc-${Date.now()}-2`,
          topic: "Advocate Case Notes",
          concern: notes,
          source: "Student Profile — Case Notes",
          status: "keep",
        });
      }
      if (compassStatus) {
        fallbackConcerns.push({
          id: `pc-${Date.now()}-3`,
          topic: "Case Compass Summary",
          concern: compassStatus,
          source: "Case Compass",
          status: "keep",
        });
      }

      return {
        concerns: fallbackConcerns,
      };
    }),

  /**
   * Step 3: Generate Parent Concern Statement (PCS) Draft
   */
  generatePcsDraft: protectedProcedure
    .input(
      z.object({
        studentContactId: z.number(),
        approvedConcerns: z.array(
          z.object({
            topic: z.string(),
            concern: z.string(),
            source: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const contact = await db.getContactById(input.studentContactId);
      const studentName = contact ? `${contact.firstName} ${contact.lastName}` : "Our child";

      const concernsList = input.approvedConcerns
        .map((c, i) => `${i + 1}. ${c.topic}: ${c.concern}`)
        .join("\n");

      const systemPrompt = `You are Waypoint Advocates' Lead Special Education Advocate.
Draft a professional, authoritative, child-centered Parent Concern Statement (PCS) based strictly on the approved family concerns provided.
Format in clean, structured paragraphs with clear headings.
Tone: Collaborative, clear, legally sound, and focused on meaningful educational benefit and FAPE.`;

      const userPrompt = `Student Name: ${studentName}
Approved Family Concerns:
${concernsList}

Generate a complete, ready-to-edit Parent Concern Statement draft.`;

      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          model: CF_MODELS.DEEP,
        });

        const text = extractLLMText(response);
        if (text && text.trim().length > 50) {
          return { pcsDraft: text.trim() };
        }
      } catch (err) {
        console.warn("[meetingWorkspace] LLM fallback for PCS draft:", err);
      }

      // Default high quality draft
      const fallbackPcs = `### PARENT CONCERN STATEMENT FOR ${studentName.toUpperCase()}

**1. Emotional Regulation & Transition Support**
We are concerned about ${studentName}'s transition into the school environment each morning. Without a structured, predictable check-in routine upon arrival, ${studentName} begins the academic day in an elevated state of stress, which negatively impacts classroom engagement.

**2. Sensory Needs & Environmental Accommodations**
We observe consistent signs of sensory overload following unstructured or high-decibel periods, such as cafeteria, gym, and assemblies. We request proactive sensory accommodations, including access to noise-reduction headphones and designated sensory cooldown breaks, to prevent dysregulation.

**3. Functional Communication & Independent Help-Seeking**
When academic tasks become overwhelming or writing demands trigger fatigue, ${studentName} currently shuts down rather than seeking assistance. We request explicit accommodations and visual supports to allow ${studentName} to independently and reliably signal a need for support.

**Parent Request:**
We ask that these concerns be incorporated directly into the Present Levels and corresponding accommodation and service sections of ${studentName}'s IEP during today's meeting.`;

      return { pcsDraft: fallbackPcs };
    }),

  /**
   * Step 4: Build IEP Blueprint
   * Generates distinct Meeting Targets obeying "ONE TARGET, ONE REQUEST, ONE IEP LOCATION, ONE TEAM DECISION"
   */
  buildBlueprint: protectedProcedure
    .input(
      z.object({
        studentContactId: z.number(),
        detectedOrder: z.array(z.string()).optional(),
        approvedFindings: z.array(z.any()).optional(),
        approvedConcerns: z.array(z.any()).optional(),
        pcsText: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { studentContactId, detectedOrder, approvedFindings, approvedConcerns, pcsText } = input;

      const contact = await db.getContactById(studentContactId);
      const studentName = contact ? `${contact.firstName} ${contact.lastName}` : "Student";

      const systemPrompt = `You are Waypoint Advocates' Lead IEP Blueprint Architect.
Your task is to transform approved IEP intel, parent concerns, and PCS draft into distinct, razor-sharp MEETING TARGETS.

HARD RULES:
1. ONE TARGET, ONE REQUEST, ONE IEP LOCATION, ONE TEAM DECISION.
2. Structure output strictly by the provided IEP Section order if supplied.
3. Every target must contain:
   - targetName: Clean, scannable title (e.g. "Noise Support", "Writing Baseline", "AAC Modeling")
   - iepSection: Mapped section matching detected structure
   - quickAdvocateSayThis: Exactly ONE assertive, clear sentence to say aloud live
   - fullAdvocateScript: Expanded advocacy script for complex discussions
   - putItHereLocation: Exact section/page in the IEP where this change belongs
   - possibleIepWording: Specific, measurable IEP contractual language
   - whyWeWantIt: Objective educational justification
   - supportingEvidence: Specific data, evaluations, or observations
   - ifTeamDisagrees: Exact pushback question or PWN request
   - parentWhatWeWant: Plain-language, parent-empowering summary
   - parentWhyWeWantIt: Plain-language rationale for families
   - parentSupportingEvidence: Accessible summary of data for parents

Output JSON format:
{
  "detectedOrder": string[],
  "targets": [
    {
      "id": string,
      "targetName": string,
      "iepSection": string,
      "sectionOrder": number,
      "targetOrder": number,
      "quickAdvocateSayThis": string,
      "fullAdvocateScript": string,
      "putItHereLocation": string,
      "possibleIepWording": string,
      "whyWeWantIt": string,
      "supportingEvidence": string,
      "sources": string[],
      "ifTeamDisagrees": string,
      "parentWhatWeWant": string,
      "parentWhyWeWantIt": string,
      "parentSupportingEvidence": string,
      "meetingStatus": "NOT_DISCUSSED",
      "requestRaised": boolean,
      "pwnNeeded": boolean,
      "addedToIep": boolean,
      "followUpNeeded": boolean
    }
  ]
}`;

      const userPrompt = `Student: ${studentName}
Detected Section Order: ${JSON.stringify(detectedOrder || ["Parent Concerns", "Present Levels / Academics", "Special Factors", "Annual Goals", "Accommodations / Supports", "Related Services / AAC"])}
Approved IEP Intel: ${JSON.stringify(approvedFindings?.slice(0, 5) || [])}
Approved Parent Concerns: ${JSON.stringify(approvedConcerns?.slice(0, 5) || [])}
Approved PCS Text: ${pcsText || "Parent Concern Statement established."}

Build 5-8 distinct meeting targets.`;

      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          model: CF_MODELS.DEEP,
          responseFormat: { type: "json_object" },
        });

        const raw = extractLLMText(response);
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.targets) && parsed.targets.length > 0) {
          return parsed;
        }
      } catch (err) {
        console.warn("[meetingWorkspace] LLM fallback for Blueprint targets:", err);
      }

      // Build deterministic targets strictly from approved findings and parent concerns (no hardcoded student names or fabricated page numbers)
      const firstName = contact?.firstName || "the student";
      const dynamicTargets: any[] = [];
      let orderIdx = 1;

      for (const finding of approvedFindings || []) {
        const canonicalId = finding.id
          ? String(finding.id).startsWith("target-from-")
            ? String(finding.id)
            : `target-from-${finding.id}`
          : `tgt-${Date.now()}-${orderIdx}`;
        const sourceLabel = finding.sourceRef?.fileName
          ? `${finding.sourceRef.fileName}${
              finding.sourceRef.pdfPageNumber
                ? ` · PDF p. ${finding.sourceRef.pdfPageNumber}`
                : ""
            }`
          : finding.quote || "Source needs verification";
        const evidenceText =
          finding.sourceRef?.excerpt ||
          finding.evalSourceRef?.excerpt ||
          finding.quote ||
          "Source needs verification";
        const resolvedQuestion =
          finding.proposedQuestion || finding.text || "";

        dynamicTargets.push({
          id: canonicalId,
          sourceFindingId: finding.id || undefined,
          targetName: `${finding.category || "IEP Review"}: ${(finding.text || "").slice(0, 52)}${(finding.text || "").length > 52 ? "…" : ""}`,
          iepSection: finding.section || finding.category || "Present Levels / Academics",
          sectionOrder: orderIdx,
          targetOrder: orderIdx,
          quickAdvocateSayThis: resolvedQuestion,
          fullAdvocateScript: `Regarding ${finding.section || finding.category || "this section"} for ${firstName}: ${finding.text || ""}`,
          putItHereLocation: `IEP Section: ${finding.section || finding.category || "Relevant Section"}`,
          possibleIepWording: finding.text || "",
          whyWeWantIt: finding.text || `Addresses documented finding for ${firstName} in ${finding.section || finding.category || "the IEP"}.`,
          supportingEvidence: evidenceText,
          sources: [sourceLabel],
          ifTeamDisagrees: "Request specific evaluation data supporting the team's position and document any refusal in Prior Written Notice.",
          parentWhatWeWant: resolvedQuestion,
          parentWhyWeWantIt: `Ensures ${firstName}'s IEP reflects accurate baselines and appropriate supports.`,
          parentSupportingEvidence: evidenceText,
          meetingStatus: "NOT_DISCUSSED",
          requestRaised: false,
          pwnNeeded: false,
          addedToIep: false,
          followUpNeeded: false,
          sourceRef: finding.sourceRef,
          evalSourceRef: finding.evalSourceRef,
          priority: finding.priority || "medium",
        });
        orderIdx++;
      }

      for (const concern of approvedConcerns || []) {
        dynamicTargets.push({
          id: `tgt-${Date.now()}-${orderIdx}`,
          targetName: concern.topic || "Parent Priority",
          iepSection: "Parent Concerns",
          sectionOrder: 1,
          targetOrder: orderIdx,
          quickAdvocateSayThis: concern.concern || "",
          fullAdvocateScript: `For ${firstName}, the family is raising ${concern.topic || "this priority"}: ${concern.concern || ""}`,
          putItHereLocation: "IEP Section: Parent Concerns",
          possibleIepWording: concern.concern || "",
          whyWeWantIt: `Directly addresses family priority for ${firstName}.`,
          supportingEvidence: concern.source || "Parent Concern Statement",
          sources: [concern.source || "Parent Concern Statement"],
          ifTeamDisagrees: "Ensure parent concern and team response are recorded in the IEP and Prior Written Notice.",
          parentWhatWeWant: concern.concern || "",
          parentWhyWeWantIt: `Supports ${firstName}'s daily access to learning.`,
          parentSupportingEvidence: concern.source || "Parent Concern Statement",
          meetingStatus: "NOT_DISCUSSED",
          requestRaised: false,
          pwnNeeded: false,
          addedToIep: false,
          followUpNeeded: false,
        });
        orderIdx++;
      }

      return {
        targets: dynamicTargets,
      };
    }),

  /**
   * Complete live meeting, preserve history, and synchronize outcomes with CRM modules
   */
  completeMeeting: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        studentContactId: z.number(),
        summary: z.object({
          totalTargets: z.number(),
          raisedTargets: z.number(),
          agreedTargets: z.array(z.string()),
          deniedTargets: z.array(z.string()),
          pwnTargets: z.array(z.string()),
          parkingLotItems: z.array(z.string()),
          followUpItems: z.array(
            z.object({
              title: z.string(),
              ownerDate: z.string().optional(),
            })
          ),
          notes: z.string().optional(),
        }),
        syncToCompass: z.boolean().optional().default(true),
        syncToTimeline: z.boolean().optional().default(true),
        syncToTasks: z.boolean().optional().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const { id, studentContactId, summary, syncToCompass, syncToTimeline, syncToTasks } = input;

      const contact = await db.getContactById(studentContactId);
      const studentName = contact ? `${contact.firstName} ${contact.lastName}` : "Student";
      const now = new Date();

      // 1. Update Meeting Workspace status to COMPLETED
      await db.updateWorkspace(id, {
        status: "COMPLETED",
        completedAt: now,
        completedSummary: JSON.stringify(summary),
      });

      // 2. Sync to Activity Timeline if requested
      if (syncToTimeline && contact) {
        try {
          const agreedText = summary.agreedTargets.length > 0 ? `Agreed: ${summary.agreedTargets.join(", ")}` : "No direct agreements";
          const pwnText = summary.pwnTargets.length > 0 ? ` · PWN Requested: ${summary.pwnTargets.join(", ")}` : "";
          await recordCaseActivity({
            studentContactId: studentContactId,
            caseId: contact.caseId || `WP-${studentContactId}`,
            eventType: "meeting",
            title: `IEP Meeting Completed: ${studentName}`,
            description: `IEP Meeting concluded. ${summary.raisedTargets} of ${summary.totalTargets} requests raised. ${agreedText}${pwnText}.`,
            ownerName: "Byron Honea",
            ownerRole: "Lead IEP Advocate",
            isCompleted: true,
          });
        } catch (err) {
          console.warn("[meetingWorkspace] Timeline sync error:", err);
        }
      }

      // 3. Sync to Tasks for follow-up items
      if (syncToTasks && summary.followUpItems.length > 0 && contact) {
        try {
          for (const item of summary.followUpItems) {
            await db.createTask({
              title: `[IEP Follow-Up] ${item.title} (${studentName})`,
              description: `Generated from IEP Meeting Closeout on ${now.toLocaleDateString()}. Assigned to: ${item.ownerDate || "Advocate"}`,
              status: "todo",
              priority: "high",
              contactId: studentContactId,
            });
          }
        } catch (err) {
          console.warn("[meetingWorkspace] Tasks sync error:", err);
        }
      }

      // 4. Update Case Compass snapshot if requested
      if (syncToCompass && contact?.caseId) {
        try {
          const agreedCount = summary.agreedTargets.length;
          const pwnCount = summary.pwnTargets.length;
          const statusText = `IEP Meeting held on ${now.toLocaleDateString()}. ${agreedCount} accommodations/services agreed, ${pwnCount} items flagged for Prior Written Notice.`;
          const nextStep = summary.followUpItems[0]?.title
            ? `Follow up on: ${summary.followUpItems[0].title}`
            : pwnCount > 0
            ? "Review school Prior Written Notice document"
            : "Review finalized IEP document against blueprint";

          await db.upsertCaseCompass(contact.caseId, {
            currentStatus: statusText,
            lastMeetingSummary: `Meeting concluded with ${summary.raisedTargets}/${summary.totalTargets} requests addressed. Agreed: ${summary.agreedTargets.slice(0, 3).join(", ")}.`,
            nextStep: nextStep,
            whoHasBall: pwnCount > 0 ? "School District (PWN Delivery)" : "Waypoint / Parent (Final IEP Review)",
          });
        } catch (err) {
          console.warn("[meetingWorkspace] Compass sync error:", err);
        }
      }

      // 5. Intelligent Review Opportunity Automation (Trigger A: First Completed Advocacy Meeting)
      try {
        await db.evaluateAndTriggerMeetingReviewOpportunity({
          studentContactId,
          meetingWorkspaceId: id,
          meetingTitle: `IEP Meeting: ${studentName}`,
          meetingType: "IEP Meeting",
          assignedAdvocate: "Byron Honea",
        });
      } catch (revErr) {
        console.warn("[meetingWorkspace] Review opportunity trigger warning:", revErr);
      }

      return { success: true };
    }),

  /**
   * Manual Import: Parse externally created Advocate Ready document into structured Targets
   */
  parseAdvocateReadyImport: protectedProcedure
    .input(
      z.object({
        studentContactId: z.number().optional(),
        rawContent: z.string().min(1, "Please provide document content to import"),
        fileName: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { rawContent, fileName } = input;
      let effectiveStudentId = input.studentContactId || 0;

      // If studentContactId is 0 or missing, attempt to find Jeremiah Mitchell or fallback
      if (!effectiveStudentId || effectiveStudentId === 0) {
        const contacts = await db.getContactsByOwner();
        const jeremiah = contacts.find(
          (c) =>
            c.firstName?.trim().toLowerCase() === "jeremiah" &&
            c.lastName?.trim().toLowerCase() === "mitchell"
        );
        if (jeremiah) {
          effectiveStudentId = jeremiah.id;
        } else if (contacts.length > 0) {
          effectiveStudentId = contacts[0].id;
        }
      }

      const contact = effectiveStudentId ? await db.getContactById(effectiveStudentId) : null;
      const studentName = contact ? `${contact.firstName} ${contact.lastName}` : "Jeremiah Mitchell";

      // 1. Run deterministic & flexible parser
      let parseResult = parseAdvocateReadyDocument(rawContent, fileName);

      // 2. If no targets found, invoke Cloudflare Workers AI to extract meeting targets from notes/504
      if (parseResult.targets.length === 0) {
        try {
          const aiResponse = await invokeLLM({
            model: CF_MODELS.FAST,
            messages: [
              {
                role: "system",
                content: `You are Waypoint Advocates' Senior Special Education / Section 504 / IEP Meeting Strategist.
The user provided meeting notes, a Section 504 Plan, an IEP excerpt, or advocacy prep notes.
Extract all discrete meeting targets/accommodations/goals/requests into structured JSON.
Output valid JSON only with this schema:
{
  "detectedOrder": ["Section 1", "Section 2"],
  "targets": [
    {
      "targetName": "Concise Label (e.g. Speech-to-Text Accommodation)",
      "iepSection": "Accommodations / Supports",
      "quickAdvocateSayThis": "Clear advocate statement: We are requesting...",
      "possibleIepWording": "Draft wording for the plan...",
      "whyWeWantIt": "Rationale based on student needs...",
      "ifTeamDisagrees": "Say this if team refuses: If refused, please provide Prior Written Notice..."
    }
  ]
}`
              },
              {
                role: "user",
                content: `Student: ${studentName}\nDocument Content:\n${rawContent}`
              }
            ],
            response_format: { type: "json_object" }
          });

          const rawText = extractLLMText(aiResponse);
          const parsedAi = JSON.parse(rawText);
          if (parsedAi?.targets && Array.isArray(parsedAi.targets) && parsedAi.targets.length > 0) {
            const batchId = `draft-${Date.now()}`;
            const aiTargets = parsedAi.targets.map((t: any, idx: number) => {
              const extId = `TARGET-${String(idx + 1).padStart(3, "0")}`;
              return {
                id: `${batchId}-${extId}`,
                externalTargetId: extId,
                targetName: t.targetName || `Target ${idx + 1}`,
                iepSection: t.iepSection || "Accommodations / Supports",
                sectionOrder: idx + 1,
                targetOrder: idx + 1,
                quickAdvocateSayThis: t.quickAdvocateSayThis || `We request: ${t.targetName}`,
                fullAdvocateScript: t.quickAdvocateSayThis || `We request: ${t.targetName}`,
                putItHereLocation: t.iepSection || "Accommodations / Supports",
                possibleIepWording: t.possibleIepWording || t.targetName,
                whyWeWantIt: t.whyWeWantIt || "To support student access and educational progress.",
                supportingEvidence: fileName || "Section 504 / IEP case records.",
                sources: [fileName || "Imported Document"],
                ifTeamDisagrees: t.ifTeamDisagrees || "If refused, request Prior Written Notice.",
                parentWhatWeWant: t.targetName,
                parentWhyWeWantIt: t.whyWeWantIt || "To remove educational barriers.",
                parentSupportingEvidence: "Case records.",
                meetingStatus: "NOT_DISCUSSED" as const,
                requestRaised: false,
                pwnNeeded: false,
                addedToIep: false,
                followUpNeeded: false,
                included: true,
                validationErrors: [],
              };
            });

            parseResult = {
              success: true,
              detectedOrder: parsedAi.detectedOrder || parseResult.detectedOrder,
              targets: aiTargets,
              additionalItems: parseResult.additionalItems,
              totalTargetsCount: aiTargets.length,
              validationErrors: [],
              batchId,
              rawSummary: `Extracted ${aiTargets.length} meeting targets with AI assist.`,
            };
          }
        } catch (aiErr) {
          console.warn("[parseAdvocateReadyImport] AI fallback note:", aiErr);
        }
      }

      if (!parseResult.success && parseResult.targets.length === 0) {
        const errorMsg = parseResult.validationErrors.length > 0
          ? parseResult.validationErrors.join(" ")
          : "Failed to parse document: no valid targets could be identified.";
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: errorMsg,
        });
      }

      // Check existing workspace to check for duplicates and meeting details
      let workspace = effectiveStudentId ? await db.getWorkspaceByStudentId(effectiveStudentId) : null;
      let existingTargets: any[] = [];
      if (workspace?.meetingTargets) {
        try {
          existingTargets = JSON.parse(workspace.meetingTargets);
        } catch {
          existingTargets = [];
        }
      }

      const existingExtIds = new Set(existingTargets.map((t: any) => t.externalTargetId || t.id));
      const parsedExtIds = parseResult.targets.map((t) => t.externalTargetId);
      const isDuplicate = parsedExtIds.length > 0 && parsedExtIds.filter((id) => existingExtIds.has(id)).length >= Math.min(5, parsedExtIds.length);

      const hasMeetingSelected = !!workspace?.appointmentId;
      const meetingTitle = hasMeetingSelected
        ? workspace?.title || "Scheduled IEP Meeting"
        : "Unassigned Draft";

      return {
        success: parseResult.success,
        studentContactId: effectiveStudentId,
        studentName,
        meetingId: workspace?.appointmentId || null,
        meetingTitle,
        isUnassignedDraft: !hasMeetingSelected,
        detectedOrder: parseResult.detectedOrder,
        targets: parseResult.targets,
        additionalItems: parseResult.additionalItems,
        totalTargetsCount: parseResult.totalTargetsCount,
        validationErrors: parseResult.validationErrors,
        batchId: parseResult.batchId,
        isDuplicate,
        existingDraftCount: existingTargets.length,
      };
    }),

  /**
   * Save Advocate Ready imported targets as draft records in workspace
   */
  saveAdvocateReadyDraft: protectedProcedure
    .input(
      z.object({
        studentContactId: z.number(),
        meetingId: z.number().optional().nullable(),
        targets: z.array(
          z.object({
            id: z.string(),
            externalTargetId: z.string().optional(),
            targetName: z.string(),
            iepSection: z.string(),
            sectionOrder: z.number().optional(),
            targetOrder: z.number().optional(),
            quickAdvocateSayThis: z.string().optional(),
            fullAdvocateScript: z.string().optional(),
            putItHereLocation: z.string().optional(),
            possibleIepWording: z.string().optional(),
            whyWeWantIt: z.string().optional(),
            supportingEvidence: z.string().optional(),
            sources: z.array(z.string()).optional(),
            ifTeamDisagrees: z.string().optional(),
            parentWhatWeWant: z.string().optional(),
            parentWhyWeWantIt: z.string().optional(),
            parentSupportingEvidence: z.string().optional(),
            included: z.boolean().optional(),
          })
        ),
        detectedOrder: z.array(z.string()),
        additionalItems: z.array(z.string()).optional(),
        mode: z.enum(["draft", "replace", "append"]).default("replace"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { studentContactId, targets: incomingTargets, detectedOrder, additionalItems, mode } = input;

      let workspace = await db.getWorkspaceByStudentId(studentContactId);

      const contact = await db.getContactById(studentContactId);
      const studentName = contact ? `${contact.firstName} ${contact.lastName}` : "Student";

      if (!workspace) {
        workspace = await db.createWorkspace({
          studentContactId,
          appointmentId: input.meetingId || undefined,
          title: `${studentName} — Annual IEP Meeting`,
          meetingDate: "October 21, 2026 · 10:00 AM",
          meetingType: "Annual IEP Meeting",
          status: "PREPARING",
          activeTab: "BLUEPRINT",
          prepStep: "blueprint",
          detectedIepOrder: JSON.stringify(detectedOrder),
          iepIntelFindings: JSON.stringify([]),
          parentIntelConcerns: JSON.stringify([]),
          parentConcernStatement: "",
          pcsApproved: true,
          meetingTargets: JSON.stringify([]),
          parkingLot: JSON.stringify([]),
          additionalItems: JSON.stringify([]),
          closeoutChecks: JSON.stringify({
            allRequestsRaised: false,
            pwnIdentified: false,
            agreedLocationsClear: false,
            followUpAssigned: false,
            nextMeetingDiscussed: false,
          }),
        });
      }

      // Format discrete target records with all 6 tracking checkboxes initialized to unchecked
      const formattedNewTargets = incomingTargets
        .filter((t) => t.included !== false)
        .map((t, idx) => ({
          id: t.id || `tgt-imp-${Date.now()}-${idx + 1}`,
          externalTargetId: t.externalTargetId || `TARGET-${String(idx + 1).padStart(3, "0")}`,
          targetName: t.targetName,
          iepSection: t.iepSection || "Accommodations / Supports",
          sectionOrder: t.sectionOrder ?? (idx + 1),
          targetOrder: t.targetOrder ?? (idx + 1),
          quickAdvocateSayThis: t.quickAdvocateSayThis || `We are requesting ${t.targetName.toLowerCase()}.`,
          fullAdvocateScript: t.fullAdvocateScript || t.quickAdvocateSayThis || "",
          putItHereLocation: t.putItHereLocation || t.iepSection || "IEP Accommodations",
          possibleIepWording: t.possibleIepWording || "",
          whyWeWantIt: t.whyWeWantIt || "To support educational progress.",
          supportingEvidence: t.supportingEvidence || "Documented observations and records.",
          sources: t.sources && t.sources.length > 0 ? t.sources : ["Imported Advocate Ready"],
          ifTeamDisagrees: t.ifTeamDisagrees || "If refused, please document refusal rationale in Prior Written Notice.",
          parentWhatWeWant: t.parentWhatWeWant || t.targetName,
          parentWhyWeWantIt: t.parentWhyWeWantIt || t.whyWeWantIt || "To help the student succeed in school.",
          parentSupportingEvidence: t.parentSupportingEvidence || t.supportingEvidence || "Evaluations and school reports.",
          meetingStatus: "NOT_DISCUSSED" as const,
          requestRaised: false,
          pwnNeeded: false,
          addedToIep: false,
          followUpNeeded: false,
        }));

      const currentWorkspace = workspace || ({
        id: 1,
        studentContactId,
        appointmentId: input.meetingId || null,
        title: `${studentName} — Annual IEP Meeting`,
        meetingDate: "October 21, 2026 · 10:00 AM",
        meetingType: "Annual IEP Meeting",
        status: "PREPARING",
        activeTab: "BLUEPRINT",
        prepStep: "blueprint",
        detectedIepOrder: JSON.stringify(detectedOrder),
        iepIntelFindings: "[]",
        parentIntelConcerns: "[]",
        parentConcernStatement: "",
        pcsApproved: true,
        meetingTargets: "[]",
        parkingLot: "[]",
        additionalItems: "[]",
        closeoutChecks: JSON.stringify({
          allRequestsRaised: false,
          pwnIdentified: false,
          agreedLocationsClear: false,
          followUpAssigned: false,
          nextMeetingDiscussed: false,
        }),
      } as any);

      let finalTargets: any[] = [];
      if (mode === "append" && currentWorkspace.meetingTargets) {
        try {
          const existing = JSON.parse(currentWorkspace.meetingTargets);
          finalTargets = [...existing, ...formattedNewTargets];
        } catch {
          finalTargets = formattedNewTargets;
        }
      } else {
        finalTargets = formattedNewTargets;
      }

      // Format additionalItems
      let formattedAdditional: any[] = [];
      if (additionalItems && additionalItems.length > 0) {
        formattedAdditional = additionalItems.map((text, i) => ({
          id: `add-imp-${Date.now()}-${i + 1}`,
          text,
          status: "open",
        }));
      }

      let currentFindings: any[] = [];
      try {
        currentFindings = currentWorkspace.iepIntelFindings ? JSON.parse(currentWorkspace.iepIntelFindings) : [];
      } catch {}

      let currentConcerns: any[] = [];
      try {
        currentConcerns = currentWorkspace.parentIntelConcerns ? JSON.parse(currentWorkspace.parentIntelConcerns) : [];
      } catch {}

      const derivedFindings = currentFindings.length > 0 ? currentFindings : finalTargets
        .filter((t: any) => t.iepSection !== "Parent Concerns")
        .map((t: any, idx: number) => ({
          id: `fnd-imp-${idx + 1}`,
          category: t.iepSection || "Accommodations / Supports",
          section: t.iepSection || "Accommodations / Supports",
          text: `${t.targetName}: ${t.whyWeWantIt || t.quickAdvocateSayThis || ""}`,
          quote: t.supportingEvidence || t.possibleIepWording || undefined,
          status: (t.iepSection === "Accommodations / Supports" || t.iepSection === "Special Education Services") ? "important" : "keep",
          isCustom: false,
        }));

      const derivedConcerns = currentConcerns.length > 0 ? currentConcerns : finalTargets
        .filter((t: any) => t.iepSection === "Parent Concerns" || t.parentWhatWeWant || t.parentWhyWeWantIt)
        .map((t: any, idx: number) => ({
          id: `pci-imp-${idx + 1}`,
          topic: t.targetName,
          concern: t.parentWhyWeWantIt || t.whyWeWantIt || t.parentWhatWeWant || t.quickAdvocateSayThis || "",
          source: t.sources?.[0] || "Advocate Ready Document",
          status: "keep",
          isCustom: false,
        }));

      await db.updateWorkspace(currentWorkspace.id, {
        meetingTargets: JSON.stringify(finalTargets),
        detectedIepOrder: JSON.stringify(detectedOrder),
        additionalItems: formattedAdditional.length > 0 ? JSON.stringify(formattedAdditional) : currentWorkspace.additionalItems,
        iepIntelFindings: JSON.stringify(derivedFindings),
        parentIntelConcerns: JSON.stringify(derivedConcerns),
        prepStep: "blueprint",
        activeTab: "BLUEPRINT",
        pcsApproved: true,
      });

      try {
        if (contact?.caseId) {
          await recordCaseActivity({
            studentContactId,
            caseId: contact.caseId,
            eventType: "document_imported",
            title: `Advocate Ready Draft Imported (${finalTargets.length} targets)`,
            description: `Imported ${finalTargets.length} discrete targets for ${studentName} into IEP Meeting Workspace.`,
            ownerName: ctx.user.name || "Advocate",
          });
        }
      } catch (err) {
        console.warn("[meetingWorkspace] Case activity log warning:", err);
      }

      return {
        success: true,
        workspaceId: currentWorkspace.id,
        savedTargetsCount: finalTargets.length,
        isUnassignedDraft: !currentWorkspace.appointmentId,
        studentName,
      };
    }),
});

