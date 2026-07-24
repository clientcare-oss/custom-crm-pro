import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as cdb from "../complaintDb";
import * as ai from "../complaintAi";
import { buildReadinessReport } from "../complaintValidation";
import { storagePut } from "../storage";
import { transcribeAudio } from "../_core/voiceTranscription";
import { AUTHORITY_LIBRARY_VERSION, STORY_PROMPTS } from "../../shared/complaintEngine";
import { TRPCError } from "@trpc/server";

const dateInput = z.string().nullable().optional().transform(v => (v ? new Date(v) : null));

const caseInfoSchema = z.object({
  status: z.enum(["draft", "in_review", "ready_to_file", "filed", "investigation", "closed"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  complainantName: z.string().nullable().optional(),
  complainantRelationship: z.string().nullable().optional(),
  complainantAddress: z.string().nullable().optional(),
  complainantPhone: z.string().nullable().optional(),
  complainantEmail: z.string().nullable().optional(),
  studentName: z.string().nullable().optional(),
  studentDob: dateInput,
  studentAddress: z.string().nullable().optional(),
  studentGrade: z.string().nullable().optional(),
  studentGtid: z.string().nullable().optional(),
  studentSchool: z.string().nullable().optional(),
  studentDistrict: z.string().nullable().optional(),
  disabilityCategories: z.array(z.string()).nullable().optional(),
  isHomeless: z.boolean().optional(),
  homelessContactInfo: z.string().nullable().optional(),
  parentDifferent: z.boolean().optional(),
  parentName: z.string().nullable().optional(),
  parentAddress: z.string().nullable().optional(),
  parentPhone: z.string().nullable().optional(),
  parentEmail: z.string().nullable().optional(),
  agencyName: z.string().nullable().optional(),
  agencyContact: z.string().nullable().optional(),
  agencyAddress: z.string().nullable().optional(),
  advocateName: z.string().nullable().optional(),
  intakeDate: dateInput,
  complaintOwner: z.string().nullable().optional(),
  targetFilingDate: dateInput,
  confirmedIssues: z.array(z.string()).nullable().optional(),
  mediationRequested: z.enum(["undecided", "yes", "no"]).optional(),
  signatureName: z.string().nullable().optional(),
  signatureDate: dateInput,
  districtCopyDelivered: z.boolean().optional(),
  districtCopyRecipient: z.string().nullable().optional(),
  districtCopyDate: dateInput,
  districtCopyMethod: z.string().nullable().optional(),
  confirmedAccuracy: z.boolean().optional(),
});

async function requireCase(id: number) {
  const c = await cdb.getCase(id);
  if (!c) throw new TRPCError({ code: "NOT_FOUND", message: "Complaint case not found" });
  return c;
}

export const complaintEngineRouter = router({
  // ---------- Cases ----------
  listCases: protectedProcedure.query(() => cdb.listCases()),

  getCase: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) => requireCase(input.id)),

  createCase: protectedProcedure
    .input(z.object({ studentName: z.string().optional(), advocateName: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const caseId = await cdb.nextCaseIdNumber();
      const id = await cdb.createCase({
        caseId,
        studentName: input.studentName ?? null,
        advocateName: input.advocateName ?? ctx.user.name ?? null,
        intakeDate: new Date(),
        createdBy: ctx.user.id,
      });
      return { id, caseId };
    }),

  updateCase: protectedProcedure
    .input(z.object({ id: z.number(), data: caseInfoSchema }))
    .mutation(async ({ input }) => {
      await requireCase(input.id);
      await cdb.updateCase(input.id, input.data);
      return { success: true };
    }),

  // ---------- Story intake ----------
  getStory: protectedProcedure.input(z.object({ caseId: z.number() })).query(async ({ input }) => {
    const [answers, facts] = await Promise.all([cdb.listStoryAnswers(input.caseId), cdb.listFacts(input.caseId)]);
    return { answers, facts };
  }),

  saveStoryAnswer: protectedProcedure
    .input(z.object({ caseId: z.number(), promptKey: z.string(), answerText: z.string() }))
    .mutation(async ({ input }) => {
      await cdb.upsertStoryAnswer(input.caseId, input.promptKey, input.answerText);
      return { success: true };
    }),

  extractFacts: protectedProcedure
    .input(z.object({ caseId: z.number(), promptKey: z.string() }))
    .mutation(async ({ input }) => {
      const answers = await cdb.listStoryAnswers(input.caseId);
      const answer = answers.find(a => a.promptKey === input.promptKey);
      if (!answer?.answerText?.trim()) return { facts: [] };
      const prompt = STORY_PROMPTS.find(p => p.key === input.promptKey);
      const extracted = await ai.extractFactsFromStory(input.promptKey, prompt?.question ?? input.promptKey, answer.answerText);
      // replace previous unconfirmed extractions from this prompt
      await cdb.clearUnconfirmedFacts(input.caseId, input.promptKey);
      await cdb.insertFacts(extracted.map(f => ({
        caseId: input.caseId, factType: f.factType, factText: f.factText, sourcePrompt: input.promptKey,
      })));
      await cdb.recordAi({
        caseId: input.caseId, kind: "fact_extraction",
        inputSummary: `Prompt: ${input.promptKey}`, outputSummary: `${extracted.length} facts extracted`,
      });
      return { facts: await cdb.listFacts(input.caseId) };
    }),

  setFactStatus: protectedProcedure
    .input(z.object({ id: z.number(), status: z.enum(["unconfirmed", "confirmed", "rejected"]) }))
    .mutation(async ({ input }) => {
      await cdb.setFactStatus(input.id, input.status);
      return { success: true };
    }),

  // ---------- Timeline ----------
  listTimeline: protectedProcedure.input(z.object({ caseId: z.number() })).query(({ input }) => cdb.listTimeline(input.caseId)),

  saveTimelineEvent: protectedProcedure
    .input(z.object({
      id: z.number().optional(),
      caseId: z.number(),
      title: z.string().min(1),
      dateCertainty: z.enum(["exact", "approximate", "month_year", "before", "after", "unknown"]),
      eventDate: dateInput,
      eventEndDate: dateInput,
      details: z.string().nullable().optional(),
      peopleInvolved: z.string().nullable().optional(),
      schoolResponse: z.string().nullable().optional(),
      parentResponse: z.string().nullable().optional(),
      linkedAllegationIds: z.array(z.number()).optional(),
      linkedEvidenceIds: z.array(z.number()).optional(),
      aiDrafted: z.boolean().optional(),
      confirmed: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...values } = input;
      if (id) {
        await cdb.updateTimelineEvent(id, values);
        return { id };
      }
      const newId = await cdb.createTimelineEvent(values);
      return { id: newId };
    }),

  deleteTimelineEvent: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await cdb.deleteTimelineEvent(input.id);
    return { success: true };
  }),

  // ---------- Allegations ----------
  listAllegations: protectedProcedure.input(z.object({ caseId: z.number() })).query(async ({ input }) => {
    const list = await cdb.listAllegations(input.caseId);
    const authorities = await cdb.listAuthoritiesForCase(list.map(a => a.id));
    return { allegations: list, authorities };
  }),

  suggestAllegations: protectedProcedure
    .input(z.object({ caseId: z.number() }))
    .mutation(async ({ input }) => {
      const [c, facts, timeline, answers, existing] = await Promise.all([
        requireCase(input.caseId),
        cdb.listFacts(input.caseId),
        cdb.listTimeline(input.caseId),
        cdb.listStoryAnswers(input.caseId),
        cdb.listAllegations(input.caseId),
      ]);
      const suggestions = await ai.suggestAllegations({
        confirmedIssues: (c.confirmedIssues ?? []) as string[],
        facts: facts.filter(f => f.status !== "rejected").map(f => ({ id: f.id, factType: f.factType, factText: f.factText })),
        timeline: timeline.map(t => ({
          id: t.id, title: t.title,
          eventDate: t.eventDate ? new Date(t.eventDate).toISOString().slice(0, 10) : null,
          details: t.details,
        })),
        storyAnswers: answers.map(a => ({ promptKey: a.promptKey, answerText: a.answerText })),
        existingTitles: existing.filter(a => a.status !== "rejected").map(a => a.plainTitle),
      });
      const created: number[] = [];
      for (const s of suggestions) {
        const seq = await cdb.nextAllegationSeq(input.caseId);
        const id = await cdb.createAllegation({
          caseId: input.caseId, seqNumber: seq,
          plainTitle: s.plainTitle, formalTitle: s.formalTitle,
          status: "suggested", confidence: s.confidence,
          reasonSuggested: s.reasonSuggested,
          issueCategories: s.issueCategories,
          requiredElements: s.requiredElements.map(text => ({ text, met: false })),
          missingInfo: s.missingInfo,
          factsUsed: s.factsUsed,
          aiSuggested: true, sortOrder: seq,
        });
        created.push(id);
      }
      await cdb.recordAi({
        caseId: input.caseId, kind: "allegation_suggestion",
        inputSummary: "Facts, timeline, story answers, confirmed issues",
        outputSummary: `${suggestions.length} allegations suggested`,
      });
      return { count: suggestions.length, ids: created };
    }),

  createAllegation: protectedProcedure
    .input(z.object({ caseId: z.number(), plainTitle: z.string().min(1), formalTitle: z.string().nullable().optional(), issueCategories: z.array(z.string()).optional() }))
    .mutation(async ({ input }) => {
      const seq = await cdb.nextAllegationSeq(input.caseId);
      const id = await cdb.createAllegation({
        caseId: input.caseId, seqNumber: seq, plainTitle: input.plainTitle,
        formalTitle: input.formalTitle ?? null, status: "accepted",
        issueCategories: input.issueCategories ?? [], sortOrder: seq,
      });
      return { id, seqNumber: seq };
    }),

  updateAllegation: protectedProcedure
    .input(z.object({
      id: z.number(),
      data: z.object({
        plainTitle: z.string().optional(),
        formalTitle: z.string().nullable().optional(),
        status: z.enum(["suggested", "accepted", "needs_facts", "needs_evidence", "drafted", "ready_for_review", "excluded", "rejected"]).optional(),
        issueCategories: z.array(z.string()).optional(),
        requiredElements: z.array(z.object({ text: z.string(), met: z.boolean() })).optional(),
        missingInfo: z.array(z.string()).optional(),
        factsUsed: z.array(z.object({ type: z.string(), refId: z.number().nullable(), text: z.string() })).optional(),
        districtNotice: z.string().nullable().optional(),
        districtResponse: z.enum(["none", "action", "denial", "delay", "no_response", "incomplete", "disputed"]).optional(),
        districtResponseDetail: z.string().nullable().optional(),
        impactSummary: z.string().nullable().optional(),
        draftStatement: z.string().nullable().optional(),
        draftFacts: z.string().nullable().optional(),
        sortOrder: z.number().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      const existing = await cdb.getAllegation(input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      await cdb.updateAllegation(input.id, input.data);
      if (input.data.status && ["accepted", "rejected"].includes(input.data.status) && existing.aiSuggested) {
        await cdb.recordAi({
          caseId: existing.caseId, kind: "allegation_suggestion",
          inputSummary: `Allegation ${existing.seqNumber}: ${existing.plainTitle}`,
          outputSummary: `User ${input.data.status} the suggestion`,
          action: input.data.status === "accepted" ? "accepted" : "rejected",
        });
      }
      return { success: true };
    }),

  mergeAllegations: protectedProcedure
    .input(z.object({ keepId: z.number(), mergeId: z.number() }))
    .mutation(async ({ input }) => {
      const keep = await cdb.getAllegation(input.keepId);
      const merge = await cdb.getAllegation(input.mergeId);
      if (!keep || !merge) throw new TRPCError({ code: "NOT_FOUND" });
      const cats = Array.from(new Set([...((keep.issueCategories ?? []) as string[]), ...((merge.issueCategories ?? []) as string[])]));
      const elements = [...((keep.requiredElements ?? []) as { text: string; met: boolean }[]), ...((merge.requiredElements ?? []) as { text: string; met: boolean }[])];
      const facts = [...((keep.factsUsed ?? []) as { type: string; refId: number | null; text: string }[]), ...((merge.factsUsed ?? []) as { type: string; refId: number | null; text: string }[])];
      await cdb.updateAllegation(input.keepId, {
        issueCategories: cats, requiredElements: elements, factsUsed: facts,
        reasonSuggested: [keep.reasonSuggested, merge.reasonSuggested].filter(Boolean).join(" | "),
      });
      await cdb.deleteAllegation(input.mergeId);
      return { success: true };
    }),

  deleteAllegation: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await cdb.deleteAllegation(input.id);
    return { success: true };
  }),

  // ---------- Legal authorities ----------
  suggestAuthorities: protectedProcedure
    .input(z.object({ allegationId: z.number() }))
    .mutation(async ({ input }) => {
      const a = await cdb.getAllegation(input.allegationId);
      if (!a) throw new TRPCError({ code: "NOT_FOUND" });
      const factsSummary = ((a.factsUsed ?? []) as { text: string }[]).map(f => f.text).join("; ") || a.reasonSuggested || a.plainTitle;
      const suggestions = await ai.suggestAuthorities({
        allegationTitle: a.formalTitle || a.plainTitle,
        issueCategories: (a.issueCategories ?? []) as string[],
        factsSummary,
      });
      const existing = await cdb.listAuthorities(input.allegationId);
      const fresh = suggestions.filter(s => !existing.some(e => e.citation === s.citation));
      await cdb.insertAuthorities(fresh.map(s => ({
        allegationId: input.allegationId, group: s.group, citation: s.citation,
        subject: s.subject, whyApplies: s.whyApplies, status: "suggested" as const,
        verifiedForFilingDate: false,
      })));
      await cdb.recordAi({
        caseId: a.caseId, kind: "authority_suggestion",
        inputSummary: `Allegation ${a.seqNumber} (library ${AUTHORITY_LIBRARY_VERSION})`,
        outputSummary: `${fresh.length} authorities suggested`,
      });
      return { authorities: await cdb.listAuthorities(input.allegationId) };
    }),

  updateAuthority: protectedProcedure
    .input(z.object({
      id: z.number(),
      data: z.object({
        status: z.enum(["suggested", "confirmed", "removed"]).optional(),
        whyApplies: z.string().nullable().optional(),
        verifiedForFilingDate: z.boolean().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      await cdb.updateAuthority(input.id, input.data);
      return { success: true };
    }),

  addAuthority: protectedProcedure
    .input(z.object({
      allegationId: z.number(),
      group: z.enum(["federal", "georgia", "guidance", "case_law"]),
      citation: z.string().min(1),
      subject: z.string().nullable().optional(),
      whyApplies: z.string().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      await cdb.insertAuthorities([{ ...input, status: "confirmed", verifiedForFilingDate: false }]);
      return { success: true };
    }),

  deleteAuthority: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await cdb.deleteAuthority(input.id);
    return { success: true };
  }),

  // ---------- Evidence ----------
  listEvidence: protectedProcedure.input(z.object({ caseId: z.number() })).query(async ({ input }) => {
    const [items, links] = await Promise.all([cdb.listEvidence(input.caseId), cdb.listAllLinksForCase(input.caseId)]);
    return { items, links };
  }),

  uploadEvidence: protectedProcedure
    .input(z.object({
      caseId: z.number(),
      fileName: z.string(),
      mimeType: z.string(),
      base64: z.string(),
      title: z.string().optional(),
      category: z.string().optional(),
      docDate: dateInput,
      source: z.string().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const buffer = Buffer.from(input.base64, "base64");
      if (buffer.length > 20 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "File exceeds 20 MB limit" });
      const evidenceId = await cdb.nextEvidenceId(input.caseId);
      const safeName = input.fileName.replace(/[^\w.\-]+/g, "_");
      const { key, url } = await storagePut(`complaint-${input.caseId}/evidence/${evidenceId}-${safeName}`, buffer, input.mimeType);
      const id = await cdb.createEvidence({
        caseId: input.caseId, evidenceId,
        title: input.title || input.fileName,
        category: input.category ?? "other",
        fileKey: key, fileUrl: url, fileName: input.fileName,
        mimeType: input.mimeType, fileSize: buffer.length,
        docDate: input.docDate ?? null, source: input.source ?? null,
      });
      return { id, evidenceId, url };
    }),

  updateEvidence: protectedProcedure
    .input(z.object({
      id: z.number(),
      data: z.object({
        title: z.string().optional(),
        category: z.string().optional(),
        docDate: dateInput,
        source: z.string().nullable().optional(),
        pageCount: z.number().nullable().optional(),
        summary: z.string().nullable().optional(),
        summaryVerified: z.boolean().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      await cdb.updateEvidence(input.id, input.data);
      return { success: true };
    }),

  getEvidenceDependencies: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    return cdb.listEvidenceLinks(input.id);
  }),

  deleteEvidence: protectedProcedure
    .input(z.object({ id: z.number(), confirmed: z.boolean() }))
    .mutation(async ({ input }) => {
      const deps = await cdb.listEvidenceLinks(input.id);
      if (deps.length && !input.confirmed) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: `This evidence is linked to ${deps.length} item(s). Confirm to delete anyway.` });
      }
      await cdb.deleteEvidence(input.id);
      return { success: true };
    }),

  linkEvidence: protectedProcedure
    .input(z.object({
      evidenceItemId: z.number(),
      targetType: z.enum(["allegation", "timeline_event"]),
      targetId: z.number(),
      pageSelection: z.string().nullable().optional(),
      pageNotes: z.string().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const id = await cdb.createEvidenceLink(input);
      return { id };
    }),

  unlinkEvidence: protectedProcedure.input(z.object({ linkId: z.number() })).mutation(async ({ input }) => {
    await cdb.deleteEvidenceLink(input.linkId);
    return { success: true };
  }),

  // ---------- Student impacts ----------
  listImpacts: protectedProcedure.input(z.object({ caseId: z.number() })).query(({ input }) => cdb.listImpacts(input.caseId)),

  saveImpact: protectedProcedure
    .input(z.object({
      id: z.number().optional(),
      caseId: z.number(),
      allegationId: z.number().nullable().optional(),
      category: z.string(),
      whatChanged: z.string().nullable().optional(),
      frequency: z.string().nullable().optional(),
      duration: z.string().nullable().optional(),
      supportBasis: z.enum(["direct_evidence", "parent_observation", "student_report", "school_report", "inference"]).optional(),
      supportDetail: z.string().nullable().optional(),
      narrative: z.string().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...values } = input;
      if (id) {
        await cdb.updateImpact(id, values);
        return { id };
      }
      return { id: await cdb.createImpact(values) };
    }),

  deleteImpact: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await cdb.deleteImpact(input.id);
    return { success: true };
  }),

  // ---------- Remedies ----------
  listRemedies: protectedProcedure.input(z.object({ caseId: z.number() })).query(({ input }) => cdb.listRemedies(input.caseId)),

  saveRemedy: protectedProcedure
    .input(z.object({
      id: z.number().optional(),
      caseId: z.number(),
      allegationId: z.number().nullable().optional(),
      remedyType: z.string(),
      title: z.string().min(1),
      detail: z.string().nullable().optional(),
      purpose: z.string().nullable().optional(),
      quantification: z.string().nullable().optional(),
      aiSuggested: z.boolean().optional(),
      accepted: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...values } = input;
      if (id) {
        await cdb.updateRemedy(id, values);
        return { id };
      }
      return { id: await cdb.createRemedy(values) };
    }),

  deleteRemedy: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await cdb.deleteRemedy(input.id);
    return { success: true };
  }),

  // ---------- Writing assistant ----------
  assistWriting: protectedProcedure
    .input(z.object({
      caseId: z.number(),
      mode: z.enum(["from_answers", "from_evidence", "improve", "build_with_me"]),
      tone: z.enum(["plain", "formal", "concise", "detailed", "advocate"]),
      fieldLabel: z.string(),
      currentText: z.string().nullable(),
      allegationId: z.number().nullable().optional(),
      userMessage: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // Assemble sources from confirmed material only
      const [facts, answers, timeline, evidence] = await Promise.all([
        cdb.listFacts(input.caseId), cdb.listStoryAnswers(input.caseId),
        cdb.listTimeline(input.caseId), cdb.listEvidence(input.caseId),
      ]);
      const sources: { type: string; refId: number | null; label: string; content: string }[] = [];
      if (input.mode === "from_evidence") {
        for (const e of evidence.filter(e => e.summary)) {
          sources.push({ type: "evidence", refId: e.id, label: `${e.evidenceId} — ${e.title}`, content: e.summary! });
        }
      } else {
        for (const a of answers.filter(a => a.answerText?.trim())) {
          const prompt = STORY_PROMPTS.find(p => p.key === a.promptKey);
          sources.push({ type: "story", refId: a.id, label: prompt?.question ?? a.promptKey, content: a.answerText! });
        }
        for (const f of facts.filter(f => f.status === "confirmed")) {
          sources.push({ type: "fact", refId: f.id, label: `Confirmed fact (${f.factType})`, content: f.factText });
        }
      }
      let allegation = null;
      if (input.allegationId) {
        allegation = await cdb.getAllegation(input.allegationId);
        if (allegation) {
          const linkedEvents = timeline.filter(t => ((t.linkedAllegationIds ?? []) as number[]).includes(allegation!.id));
          for (const t of linkedEvents) {
            sources.push({
              type: "event", refId: t.id,
              label: `Timeline: ${t.title}`,
              content: `${t.eventDate ? new Date(t.eventDate).toLocaleDateString() : "Date unknown"} — ${t.details ?? ""} ${t.schoolResponse ? `School response: ${t.schoolResponse}` : ""}`,
            });
          }
        }
      }
      const result = await ai.assistWriting({
        mode: input.mode, tone: input.tone, fieldLabel: input.fieldLabel,
        currentText: input.currentText, sources, userMessage: input.userMessage,
      });
      await cdb.recordAi({
        caseId: input.caseId, kind: "writing",
        inputSummary: `${input.fieldLabel} (${input.mode}, ${input.tone})`,
        outputSummary: result.text.slice(0, 200),
      });
      return result;
    }),

  // ---------- Draft blocks ----------
  listDraftBlocks: protectedProcedure.input(z.object({ caseId: z.number() })).query(({ input }) => cdb.listDraftBlocks(input.caseId)),

  saveDraftBlock: protectedProcedure
    .input(z.object({
      caseId: z.number(),
      sectionKey: z.string(),
      allegationId: z.number().nullable(),
      content: z.string(),
      builtFrom: z.array(z.object({ type: z.string(), refId: z.number().nullable(), label: z.string() })).optional(),
      aiGenerated: z.boolean().optional(),
      userAccepted: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const id = await cdb.upsertDraftBlock(input.caseId, input.sectionKey, input.allegationId, {
        content: input.content,
        builtFrom: input.builtFrom ?? [],
        aiGenerated: input.aiGenerated ?? false,
        userAccepted: input.userAccepted ?? true,
      });
      return { id };
    }),

  // ---------- Filing review / readiness ----------
  readiness: protectedProcedure.input(z.object({ caseId: z.number() })).query(async ({ input }) => {
    const [c, allegs, timeline, links, evidence, remedies, blocks] = await Promise.all([
      requireCase(input.caseId),
      cdb.listAllegations(input.caseId),
      cdb.listTimeline(input.caseId),
      cdb.listAllLinksForCase(input.caseId),
      cdb.listEvidence(input.caseId),
      cdb.listRemedies(input.caseId),
      cdb.listDraftBlocks(input.caseId),
    ]);
    return buildReadinessReport({
      c, allegations: allegs, timeline, evidenceLinks: links,
      evidenceCount: evidence.length, remedies,
      draftSections: blocks.map(b => b.sectionKey),
    });
  }),

  aiHistory: protectedProcedure.input(z.object({ caseId: z.number() })).query(({ input }) => cdb.listAiRecords(input.caseId)),

  // ---------- Voice to text ----------
  transcribe: protectedProcedure
    .input(z.object({ audioBase64: z.string(), mimeType: z.string() }))
    .mutation(async ({ input }) => {
      const buffer = Buffer.from(input.audioBase64, "base64");
      if (buffer.length > 15 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Recording too large" });
      const ext = input.mimeType.includes("wav") ? "wav" : input.mimeType.includes("mp4") ? "mp4" : "webm";
      const { url } = await storagePut(`voice/${Date.now()}.${ext}`, buffer, input.mimeType);
      const result = await transcribeAudio({ audioUrl: url });
      if ("error" in result) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error });
      return { text: result.text };
    }),
});
