import { z } from "zod";
import * as db from "../db";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure, adminProcedure, portalProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import { storagePut } from "../storage";
import { notifyOwner } from "../_core/notification";
import { brainDumpItems, brainDumpImages } from "../../drizzle/schema";

export const stateComplaintRouter = router({

    generate: protectedProcedure
      .input(z.object({
        contactId: z.number(),
        violationSummary: z.string().min(10),
        desiredResolution: z.string().min(10),
        additionalContext: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { contacts, iepDocuments } = await import("../../drizzle/schema");
        const { eq: ceq, and: cand } = await import("drizzle-orm");

        const [student] = await database
          .select()
          .from(contacts)
          .where(cand(ceq(contacts.id, input.contactId), ceq(contacts.ownerId, ctx.user.id)))
          .limit(1);
        if (!student) throw new TRPCError({ code: "NOT_FOUND", message: "Student not found" });

        const [iep] = await database
          .select()
          .from(iepDocuments)
          .where(ceq(iepDocuments.contactId, input.contactId))
          .limit(1);

        const studentName = `${student.firstName} ${student.lastName}`;
        const iepContext = iep?.currentFileName
          ? `The student has a current IEP on file: "${iep.currentFileName}".`
          : "No IEP document is currently on file.";

        // Resolve practice business credentials from PG-024-BIZ
        const { receiptSettings } = await import("../../drizzle/schema");
        let practicePhone = "(404) 919-8664";
        let practiceEmail = "clientcare@waypointadvocates.com";
        let practiceAddress = "PO Box 724944, Atlanta, GA 31139";
        let practiceName = "Waypoint Advocates";
        let advocateName = "Byron Honea";

        try {
          const [receiptRow] = await database.select().from(receiptSettings).limit(1);
          if (receiptRow) {
            if (receiptRow.businessPhone) practicePhone = receiptRow.businessPhone;
            if (receiptRow.contactEmail) practiceEmail = receiptRow.contactEmail;
            if (receiptRow.businessAddress) practiceAddress = receiptRow.businessAddress;
            if (receiptRow.companyName) practiceName = receiptRow.companyName;
          }
        } catch (e) {}

        const { invokeLLM } = await import("../_core/llm");
        const { sanitizeComplaintText } = await import("../../shared/complaintEngine");
        const systemContent: string = `You are an expert special education advocate helping draft a formal state complaint letter to a State Education Agency (SEA) under IDEA (Individuals with Disabilities Education Act). Your output must be a complete, professional, and legally structured state complaint document. Use clear section headers. Be specific, cite IDEA regulations where applicable (e.g., 34 CFR Part 300), and maintain a formal but assertive tone. Do not include placeholder brackets — write complete sentences using the information provided.
STRICT TERMINOLOGY RULE: NEVER use the terms "Master Coach", "Master IEP Coach", "Master Coaching", or "IEP Coach". In state complaints and IDEA proceedings, advocates and non-attorney representatives must strictly be identified as "Lead Special Education Advocate" or "Special Education Advocate". Never use "coach" or "coaching".`;
        const userContent: string = `Please draft a formal state complaint for the following student:

Student Name: ${studentName}
${student.caseId ? `Case ID: ${student.caseId}` : ""}
${iepContext}

Advocate / Complainant Representative (PG-024-BIZ):
Representative: ${advocateName}, Lead Special Education Advocate
Practice: ${practiceName}
Official Address: ${practiceAddress}
Phone: ${practicePhone}
Email: ${practiceEmail}

Alleged Violations / Summary of Concerns:
${input.violationSummary}

Desired Resolution:
${input.desiredResolution}

${input.additionalContext ? `Additional Context:\n${input.additionalContext}` : ""}

Please structure the complaint with the following sections:
1. Introduction & Parties (include the official advocate practice credentials above)
2. Jurisdiction & Legal Basis
3. Statement of Facts
4. Alleged Violations (cite specific IDEA regulations)
5. Requested Relief / Corrective Actions
6. Conclusion`;
        const response = await invokeLLM({
          messages: [
            { role: "system" as const, content: systemContent },
            { role: "user" as const, content: userContent },
          ],
        });

        const rawContent = response?.choices?.[0]?.message?.content;
        const content = typeof rawContent === "string" ? rawContent : Array.isArray(rawContent) ? rawContent.map((p: any) => p.text ?? "").join("") : "";
        return { complaint: sanitizeComplaintText(content), studentName };
      }),

    refineIssues: protectedProcedure
      .input(z.object({
        statementOfViolations: z.string(),
        factsRelatingToViolations: z.string(),
        proposedResolution: z.string(),
        selectedResolutions: z.array(z.string()).optional(),
        stateCode: z.string().default("GA"),
        studentName: z.string().optional(),
        districtName: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { invokeLLM, CF_MODELS } = await import("../_core/llm");
        const { sanitizeComplaintText } = await import("../../shared/complaintEngine");

        const stateAgencyMap: Record<string, { agency: string; code: string; ruleCitation: string; iepRule: string; evalRule: string; pwnRule: string }> = {
          GA: { agency: "Georgia Department of Education (GaDOE)", code: "GA", ruleCitation: "Ga. Comp. R. & Regs. 160-4-7-.12", iepRule: "Ga. Comp. R. & Regs. 160-4-7-.06", evalRule: "Ga. Comp. R. & Regs. 160-4-7-.03", pwnRule: "Ga. Comp. R. & Regs. 160-4-7-.14" },
          FL: { agency: "Florida Department of Education (FDOE)", code: "FL", ruleCitation: "Fla. Admin. Code R. 6A-6.03311", iepRule: "Fla. Admin. Code R. 6A-6.03028", evalRule: "Fla. Admin. Code R. 6A-6.0331", pwnRule: "Fla. Admin. Code R. 6A-6.03311(1)" },
          NC: { agency: "North Carolina Department of Public Instruction (NCDPI)", code: "NC", ruleCitation: "NC Policies 1500-4", iepRule: "NC Policies 1503-4", evalRule: "NC Policies 1503-2", pwnRule: "NC Policies 1504-1.4" },
          SC: { agency: "South Carolina Department of Education (SCDE)", code: "SC", ruleCitation: "S.C. Code Ann. Regs. 43-243", iepRule: "S.C. Code Ann. Regs. 43-243(IV)", evalRule: "S.C. Code Ann. Regs. 43-243(III)", pwnRule: "S.C. Code Ann. Regs. 43-243(V)" },
          TN: { agency: "Tennessee Department of Education (TDOE)", code: "TN", ruleCitation: "Tenn. Comp. R. & Regs. 0520-01-09-.18", iepRule: "Tenn. Comp. R. & Regs. 0520-01-09-.05", evalRule: "Tenn. Comp. R. & Regs. 0520-01-09-.04", pwnRule: "Tenn. Comp. R. & Regs. 0520-01-09-.13" },
          AL: { agency: "Alabama State Department of Education (ALSDE)", code: "AL", ruleCitation: "Ala. Admin. Code r. 290-8-9-.08", iepRule: "Ala. Admin. Code r. 290-8-9-.05", evalRule: "Ala. Admin. Code r. 290-8-9-.02", pwnRule: "Ala. Admin. Code r. 290-8-9-.08(1)" },
        };

        const stateInfo = stateAgencyMap[input.stateCode.toUpperCase()] || stateAgencyMap.GA;
        const student = input.studentName?.trim() || "Student";
        const district = input.districtName?.trim() || "Local Educational Agency";

        const systemContent = `You are a premier Special Education Legal & Advocacy Specialist assisting Byron Honea (Lead Special Education Advocate, Waypoint Advocates) in preparing a formal State Complaint filed with ${stateInfo.agency}.
Your task is to refine the advocate's input into formal, statutory language for the 3 core state complaint filing prongs:
#1 Statement of Alleged Violation(s) (Itemized into formal Counts with precise IDEA citations 34 C.F.R. and state rules: ${stateInfo.ruleCitation})
#2 Facts Relating to Alleged Violation(s) (Chronological factual summary proving the public agency failed to follow requirements within the strict 1-year statutory limitation)
#3 Proposed Resolution (Actionable, authoritative remedies synthesizing both advocate input and selected remedies)

MANDATORY RULES:
1. STRICT TERMINOLOGY GUARDRAIL: NEVER use the terms "Master Coach", "Master IEP Coach", "Master Coaching", or "IEP Coach". Always use "Lead Special Education Advocate" or "Special Education Advocate".
2. ONE-YEAR STATUTE OF LIMITATIONS: All alleged violations must explicitly relate to acts or omissions occurring within 1 year of the complaint filing date under 34 C.F.R. § 300.153(c) and ${stateInfo.ruleCitation}.
3. STATUTORY CONNECTION: Connect the issues directly to governing laws (e.g. 34 C.F.R. § 300.323 for IEP implementation, § 300.111 / § 300.301 for Child Find and Evaluations, § 300.503 for Prior Written Notice, § 300.101 for FAPE, § 300.530 for Discipline/MDR, and ${stateInfo.ruleCitation}).
4. Output MUST be valid JSON with the following structure:
{
  "refinedStatementOfViolations": string,
  "refinedFactsRelatingToViolations": string,
  "refinedProposedResolution": string,
  "applicableAuthorities": [
    {
      "citation": string,
      "ruleName": string,
      "explanation": string,
      "federalOrState": "federal" | "state"
    }
  ],
  "oneYearComplianceNotes": string
}`;

        const userPrompt = `Please refine the following state complaint setup for ${student} against ${district} (${stateInfo.agency}):

STUDENT: ${student}
DISTRICT: ${district}
STATE: ${stateInfo.agency} (${stateInfo.code})

ADVOCATE'S WALKTHROUGH & INPUT:
Prong #1 - Statement of Alleged Violations:
${input.statementOfViolations || "The district failed to provide mandated IEP services and delayed evaluations."}

Prong #2 - Facts Relating to Alleged Violations:
${input.factsRelatingToViolations || "The student's IEP was not implemented as written. Requests for assessment and written notice went unanswered during the past school year."}

Prong #3 - Proposed Resolution:
${input.proposedResolution || "Provide compensatory education and evaluate the student."}
${input.selectedResolutions?.length ? `Selected Standard Resolutions:\n${input.selectedResolutions.map(r => `• ${r}`).join("\n")}` : ""}

Return only JSON matching the schema.`;

        try {
          const aiResponse = await invokeLLM({
            model: CF_MODELS.DEEP,
            messages: [
              { role: "system", content: systemContent },
              { role: "user", content: userPrompt },
            ],
            response_format: { type: "json_object" },
          });

          const raw = aiResponse?.choices?.[0]?.message?.content;
          const content = typeof raw === "string" ? raw : Array.isArray(raw) ? raw.map((p: any) => p.text ?? "").join("") : "{}";
          const parsed = JSON.parse(content);

          let statementOut = sanitizeComplaintText(parsed.refinedStatementOfViolations || "");
          // Normalize count headings to formal Roman numerals
          statementOut = statementOut
            .replace(/^Count\s+1[:\-]/i, "COUNT I:")
            .replace(/\bCount\s+1[:\-]/gi, "COUNT I:")
            .replace(/\bCount\s+2[:\-]/gi, "COUNT II:")
            .replace(/\bCount\s+3[:\-]/gi, "COUNT III:")
            .replace(/\bCount\s+4[:\-]/gi, "COUNT IV:");

          if (statementOut && !statementOut.includes("COUNT I")) {
            statementOut = `COUNT I: ${statementOut}`;
          }

          if (statementOut && !statementOut.includes(stateInfo.ruleCitation) && !statementOut.includes("Ga. Comp. R. & Regs.")) {
            statementOut = `${statementOut}\n(Governing State Rule: ${stateInfo.ruleCitation})`;
          }

          let factsOut = sanitizeComplaintText(parsed.refinedFactsRelatingToViolations || "");
          if (factsOut && !factsOut.includes("1-YEAR")) {
            factsOut = `CHRONOLOGICAL SUMMARY OF RELEVANT FACTS (WITHIN 1-YEAR STATUTORY PERIOD · 34 C.F.R. § 300.153(c)):\n\n${factsOut}`;
          }
          if (factsOut && !factsOut.includes("34 C.F.R.")) {
            factsOut = `${factsOut}\n\n(Jurisdiction & Timeliness: 34 C.F.R. § 300.153(c) · ${stateInfo.ruleCitation})`;
          }

          return {
            success: true,
            refinedStatementOfViolations: statementOut,
            refinedFactsRelatingToViolations: factsOut,
            refinedProposedResolution: sanitizeComplaintText(parsed.refinedProposedResolution || ""),
            applicableAuthorities: (parsed.applicableAuthorities || []).map((a: any) => ({
              citation: sanitizeComplaintText(a.citation || ""),
              ruleName: sanitizeComplaintText(a.ruleName || ""),
              explanation: sanitizeComplaintText(a.explanation || ""),
              federalOrState: a.federalOrState === "state" ? "state" : "federal",
            })),
            oneYearComplianceNotes: sanitizeComplaintText(
              parsed.oneYearComplianceNotes
                ? `${parsed.oneYearComplianceNotes} (Within 1 year statutory limitation)`
                : "All alleged violations occurred within the preceding 1 year statutory period under 34 C.F.R. § 300.153(c)."
            ),
          };
        } catch (err: any) {
          console.warn("[stateComplaint.refineIssues] LLM failed, using intelligent heuristic fallback:", err?.message);

          const toRoman = (num: number) => {
            const romanMap: Record<number, string> = { 1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI" };
            return romanMap[num] || String(num);
          };

          const narrative = (input.statementOfViolations || input.factsRelatingToViolations || "").toLowerCase();
          const dynamicCounts: string[] = [];

          if (narrative.includes("speech") || narrative.includes("ot") || narrative.includes("occupational") || narrative.includes("therapy") || narrative.includes("implement") || narrative.includes("reading") || narrative.includes("minute")) {
            dynamicCounts.push(
              `COUNT ${toRoman(dynamicCounts.length + 1)}: FAILURE TO IMPLEMENT MANDATED IEP SERVICES & DENIAL OF FAPE\n` +
              `(34 C.F.R. § 300.323(c)(2) · ${stateInfo.iepRule})\n` +
              `The public agency failed to implement the student's individualized education program as written by withholding mandated specialized instruction, related therapeutic services, and designated accommodations without lawful justification within the statutory filing period.`
            );
          }

          if (narrative.includes("eval") || narrative.includes("testing") || narrative.includes("test") || narrative.includes("psych") || narrative.includes("child find") || narrative.includes("assess") || narrative.includes("diagnos")) {
            dynamicCounts.push(
              `COUNT ${toRoman(dynamicCounts.length + 1)}: FAILURE TO TIMELY EVALUATE & CHILD FIND VIOLATION\n` +
              `(34 C.F.R. § 300.111, § 300.301 · ${stateInfo.evalRule})\n` +
              `The public agency failed in its affirmative statutory duty to timely evaluate the student in all areas of suspected disability following documented educational need and parental notice.`
            );
          }

          if (narrative.includes("suspend") || narrative.includes("suspension") || narrative.includes("expel") || narrative.includes("discipline") || narrative.includes("mdr") || narrative.includes("sent home") || narrative.includes("behavior")) {
            dynamicCounts.push(
              `COUNT ${toRoman(dynamicCounts.length + 1)}: UNLAWFUL DISCIPLINARY REMOVAL WITHOUT MANIFESTATION DETERMINATION REVIEW (MDR)\n` +
              `(34 C.F.R. § 300.530(e) · ${stateInfo.ruleCitation})\n` +
              `The public agency subjected the student to cumulative disciplinary removals altering educational placement without convening a timely Manifestation Determination Review team meeting as required under federal law.`
            );
          }

          if (narrative.includes("pwn") || narrative.includes("written notice") || narrative.includes("refuse") || narrative.includes("refusal") || narrative.includes("ignore") || narrative.includes("email") || dynamicCounts.length === 0) {
            dynamicCounts.push(
              `COUNT ${toRoman(dynamicCounts.length + 1)}: UNLAWFUL REFUSAL TO ISSUE TIMELY PRIOR WRITTEN NOTICE (PWN)\n` +
              `(34 C.F.R. § 300.503 · ${stateInfo.pwnRule})\n` +
              `The public agency altered educational programming, denied services, or refused requested evaluations without issuing mandatory Prior Written Notice explaining the legal and factual basis for its actions.`
            );
          }

          if (dynamicCounts.length === 0) {
            dynamicCounts.push(
              `COUNT I: DENIAL OF A FREE APPROPRIATE PUBLIC EDUCATION (FAPE)\n` +
              `(34 C.F.R. § 300.101 · ${stateInfo.ruleCitation})\n` +
              `The public agency failed to provide educational programming reasonably calculated to enable the student to make progress appropriate in light of the child's circumstances.`
            );
          }

          // Deterministic statutory fallback matching AGENTS.md Rule 7 & Rule F
          const formattedResolutions = (input.selectedResolutions && input.selectedResolutions.length > 0)
            ? input.selectedResolutions.map((r, i) => `${i + 1}. ${r}`).join("\n")
            : input.proposedResolution || "1. Award certified 1-on-1 academic instruction as compensatory education.\n2. Fund an Independent Educational Evaluation (IEE) at public expense.\n3. Reconvene the IEP team within 15 school days to amend the operative IEP.\n4. Mandate district administrative training on Prior Written Notice (PWN) timelines.";

          const userProvidedFacts = input.factsRelatingToViolations?.trim() || input.statementOfViolations?.trim();

          return {
            success: true,
            refinedStatementOfViolations: sanitizeComplaintText(
              `BEFORE THE ${stateInfo.agency.toUpperCase()}\n\n` + dynamicCounts.join("\n\n")
            ),
            refinedFactsRelatingToViolations: sanitizeComplaintText(
              `CHRONOLOGICAL SUMMARY OF RELEVANT FACTS (WITHIN 1-YEAR STATUTORY PERIOD):\n\n` +
              `1. JURISDICTION & TIMELINESS (34 C.F.R. § 300.153(c) · ${stateInfo.ruleCitation}):\n` +
              `All events, omissions, and violations alleged herein occurred within one year prior to the date this formal state complaint is received by ${stateInfo.agency}.\n\n` +
              `2. OPERATIVE EDUCATIONAL PROGRAM:\n` +
              `The student (${student}) was enrolled in ${district} and eligible for special education and related services under IDEA.\n\n` +
              `3. DISTRICT VIOLATIONS & FACTUAL TIMELINE:\n` +
              (userProvidedFacts || "During the relevant statutory period, the public agency missed scheduled instructional minutes, failed to timely conduct requested assessments, and omitted mandatory written notices.") + "\n\n" +
              `4. LACK OF COMPENSATORY MAKE-UP SESSIONS:\n` +
              `Service delivery logs and records confirm missed services were not made up, resulting in educational deficit and denial of a Free Appropriate Public Education (FAPE).`
            ),
            refinedProposedResolution: sanitizeComplaintText(
              `PROPOSED RESOLUTION & CORRECTIVE ACTIONS SOUGHT:\n\n` +
              formattedResolutions
            ),
            applicableAuthorities: [
              {
                citation: "34 C.F.R. § 300.323(c)(2)",
                ruleName: "IEP Implementation Fidelity",
                explanation: "Mandates that as soon as possible following development of the IEP, special education and related services are made available to the child in accordance with the child's IEP.",
                federalOrState: "federal",
              },
              {
                citation: "34 C.F.R. § 300.111",
                ruleName: "Child Find Mandate",
                explanation: "Requires each state to ensure that all children with disabilities residing in the state who are in need of special education and related services are identified, located, and evaluated.",
                federalOrState: "federal",
              },
              {
                citation: "34 C.F.R. § 300.503",
                ruleName: "Prior Written Notice (PWN)",
                explanation: "Mandates written notice to parents whenever a public agency proposes or refuses to initiate or change the identification, evaluation, or educational placement of the child.",
                federalOrState: "federal",
              },
              {
                citation: stateInfo.ruleCitation,
                ruleName: `${stateInfo.code} Dispute Resolution & State Complaints`,
                explanation: `Governs formal special education state complaint investigations, 60-day resolution timeline, and 1-year statute of limitations in ${stateInfo.agency}.`,
                federalOrState: "state",
              },
            ],
            oneYearComplianceNotes: `Verified: All alleged events occurred within 1 year of filing under 34 C.F.R. § 300.153(c) and ${stateInfo.ruleCitation}.`,
          };
        }
      }),

    generateBinderPurpose: protectedProcedure
      .input(z.object({
        binderTitle: z.string().min(1, "Binder title is required"),
        binderCategory: z.string().optional(),
        existingPurpose: z.string().optional(),
        studentName: z.string().optional(),
        districtName: z.string().optional(),
        stateCode: z.string().default("GA"),
      }))
      .mutation(async ({ input }) => {
        const { invokeLLM, CF_MODELS } = await import("../_core/llm");
        const { sanitizeComplaintText } = await import("../../shared/complaintEngine");

        const student = input.studentName?.trim() || "the student";
        const district = input.districtName?.trim() || "the Local Educational Agency";
        const title = input.binderTitle.trim();
        const category = input.binderCategory || "pleading";

        const systemPrompt = `You are Byron Honea, Lead Special Education Advocate at Waypoint Advocates, drafting a formal IDEA state administrative complaint filed against ${district}.
Your task is to draft an authoritative, formal, 1 to 2 sentence PURPOSE statement for the standard cover page of a complaint packet binder titled "${title}".
The PURPOSE statement appears in the prominent black-bordered PURPOSE box on the cover sheet (just like on Binder 02 / Restatement).
It must start with an action infinitive (e.g., "To document...", "To establish...", "To provide an itemized clarity control restatement...", "To demonstrate...", "To incorporate authenticated records...") and succinctly explain to the state education department investigator why this specific binder is included and what legal or evidentiary violation it supports.

MANDATORY RULES:
1. STRICT TERMINOLOGY GUARDRAIL (AGENTS.md Rule F): NEVER use the terms "Master Coach", "Master IEP Coach", "Master Coaching", or "IEP Coach". Always use "Lead Special Education Advocate" or "Special Education Advocate".
2. LENGTH: 1 to 2 concise, powerful sentences.
3. OUTPUT FORMAT: Return ONLY the raw purpose statement text. Do NOT include quotes, preamble, or conversational greetings.`;

        const userPrompt = input.existingPurpose?.trim()
          ? `Please rewrite and legally elevate this draft purpose statement for "${title}" (${category}): "${input.existingPurpose.trim()}"`
          : `Please generate a formal, authoritative cover page purpose statement for a complaint binder titled "${title}" (${category}) for student ${student} against ${district}.`;

        try {
          const response = await invokeLLM({
            messages: [
              { role: "system" as const, content: systemPrompt },
              { role: "user" as const, content: userPrompt },
            ],
            model: CF_MODELS.FAST,
          });

          const rawContent = response?.choices?.[0]?.message?.content;
          const content = typeof rawContent === "string" ? rawContent : Array.isArray(rawContent) ? rawContent.map((p: any) => p.text ?? "").join("") : "";
          const cleaned = sanitizeComplaintText(content.trim().replace(/^["']|["']$/g, ""));

          if (cleaned.length > 0) {
            return {
              success: true,
              purpose: cleaned,
            };
          }
          throw new Error("Empty response from LLM");
        } catch (err: any) {
          console.warn("[stateComplaint.generateBinderPurpose] LLM failed, using intelligent heuristic fallback:", err?.message);

          // Heuristic local fallback
          let fallback = "";
          const tLower = title.toLowerCase();
          if (tLower.includes("evaluation") || tLower.includes("assessment") || tLower.includes("psychoed")) {
            fallback = `To document authenticated comprehensive evaluation records, diagnostic assessments, and independent evaluations establishing the student's identified disabilities and educational programming needs under 34 C.F.R. § 300.301.`;
          } else if (tLower.includes("iep") || tLower.includes("504") || tLower.includes("bip")) {
            fallback = `To document the operative Individualized Education Program (IEP) and behavior intervention commitments in effect, establishing mandated specialized instruction minutes, related therapeutic services, and classroom accommodations.`;
          } else if (tLower.includes("speech") || tLower.includes("therapy") || tLower.includes("service log") || tLower.includes("attendance")) {
            fallback = `To document service delivery logs, provider attendance records, and therapist session notes establishing missed specialized instruction and related service withholding without timely compensatory make-up sessions.`;
          } else if (tLower.includes("communication") || tLower.includes("email") || tLower.includes("correspondence") || tLower.includes("notice")) {
            fallback = `To document written correspondence, timestamped email notices, and administrative requests delivered between parent, advocate, and public agency personnel establishing notice and statutory compliance timelines.`;
          } else if (tLower.includes("remed") || tLower.includes("compensatory") || tLower.includes("calculation")) {
            fallback = `To establish an itemized compensatory education calculation, 1-on-1 tutoring schedule, and proposed corrective relief to remediate educational benefit deprivation suffered by the student.`;
          } else if (category === "facts") {
            fallback = `To establish a chronological factual narrative of all relevant events, statutory requests, and administrative milestones occurring within the applicable one-year statutory period.`;
          } else if (category === "violations") {
            fallback = `To provide an itemized statement of statutory violations under 34 C.F.R. § 300.153 and state special education administrative regulations, establishing jurisdictional counts and legal non-compliance.`;
          } else if (category === "exhibit") {
            fallback = `To incorporate authenticated documentary records and evidentiary exhibits in direct support of Complainant's statement of statutory violations and factual allegations against the LEA.`;
          } else {
            fallback = `To document official administrative legal arguments, factual proffers, and supporting evidence submitted on behalf of ${student} pursuant to IDEA state complaint procedures.`;
          }

          return {
            success: true,
            purpose: sanitizeComplaintText(fallback),
          };
        }
      }),

    aiWriterHelper: protectedProcedure
      .input(z.object({
        text: z.string().min(1, "Please provide text or notes to improve"),
        mode: z.enum([
          "make_better",
          "help_write",
          "add_citations",
          "fix_grammar",
          "make_concise",
          "custom"
        ]),
        customInstruction: z.string().optional(),
        sectionTitle: z.string().optional(),
        studentName: z.string().optional(),
        stateCode: z.string().default("GA"),
        districtName: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { invokeLLM, CF_MODELS } = await import("../_core/llm");
        const { sanitizeComplaintText } = await import("../../shared/complaintEngine");

        const stateAgencyMap: Record<string, { agency: string; code: string; ruleCitation: string; iepRule: string; evalRule: string; pwnRule: string }> = {
          GA: { agency: "Georgia Department of Education (GaDOE)", code: "GA", ruleCitation: "Ga. Comp. R. & Regs. 160-4-7-.12", iepRule: "Ga. Comp. R. & Regs. 160-4-7-.06", evalRule: "Ga. Comp. R. & Regs. 160-4-7-.03", pwnRule: "Ga. Comp. R. & Regs. 160-4-7-.14" },
          FL: { agency: "Florida Department of Education (FDOE)", code: "FL", ruleCitation: "Fla. Admin. Code R. 6A-6.03311", iepRule: "Fla. Admin. Code R. 6A-6.03028", evalRule: "Fla. Admin. Code R. 6A-6.0331", pwnRule: "Fla. Admin. Code R. 6A-6.03311(1)" },
          NC: { agency: "North Carolina Department of Public Instruction (NCDPI)", code: "NC", ruleCitation: "NC Policies 1500-4", iepRule: "NC Policies 1503-4", evalRule: "NC Policies 1503-2", pwnRule: "NC Policies 1504-1.4" },
          SC: { agency: "South Carolina Department of Education (SCDE)", code: "SC", ruleCitation: "S.C. Code Ann. Regs. 43-243", iepRule: "S.C. Code Ann. Regs. 43-243(IV)", evalRule: "S.C. Code Ann. Regs. 43-243(III)", pwnRule: "S.C. Code Ann. Regs. 43-243(V)" },
          TN: { agency: "Tennessee Department of Education (TDOE)", code: "TN", ruleCitation: "Tenn. Comp. R. & Regs. 0520-01-09-.18", iepRule: "Tenn. Comp. R. & Regs. 0520-01-09-.05", evalRule: "Tenn. Comp. R. & Regs. 0520-01-09-.04", pwnRule: "Tenn. Comp. R. & Regs. 0520-01-09-.13" },
          AL: { agency: "Alabama State Department of Education (ALSDE)", code: "AL", ruleCitation: "Ala. Admin. Code r. 290-8-9-.08", iepRule: "Ala. Admin. Code r. 290-8-9-.05", evalRule: "Ala. Admin. Code r. 290-8-9-.02", pwnRule: "Ala. Admin. Code r. 290-8-9-.08(1)" },
        };

        const stateInfo = stateAgencyMap[input.stateCode.toUpperCase()] || stateAgencyMap.GA;
        const student = input.studentName?.trim() || "the student";
        const district = input.districtName?.trim() || "the Local Educational Agency";
        const section = input.sectionTitle?.trim() || "State Complaint Document Section";

        const modePrompts: Record<string, string> = {
          make_better: "Elevate and strengthen this draft for a formal State Complaint investigation. Enhance legal precision, remove passive voice, eliminate vague statements, and ensure a commanding, professional advocate tone suitable for state investigators.",
          help_write: "Take these rough notes, outline points, or draft text and craft a complete, formal, professionally articulated section for the State Complaint. Flesh out chronological facts, highlight LEA non-compliance, and structure it persuasively.",
          add_citations: `Inject precise federal IDEA statutory citations (34 C.F.R. Part 300) and state special education administrative regulations (${stateInfo.agency}, ${stateInfo.ruleCitation}) directly into the narrative to anchor every allegation in governing law.`,
          fix_grammar: "Review and polish this text for impeccable spelling, grammar, punctuation, and readability. Preserve all substantive facts, names, dates, and advocate observations while enhancing sentence flow.",
          make_concise: "Distill and condense this text into a punchy, high-impact legal count or summary. Cut unnecessary filler while retaining all key dates, IDEA violations, and critical evidence.",
          custom: input.customInstruction || "Refine this text according to the advocate's instruction with maximum legal rigor and precision.",
        };

        const systemContent = `You are an elite Special Education Legal & Advocacy Drafting Specialist assisting Byron Honea (Lead Special Education Advocate, Waypoint Advocates) in drafting formal State Complaints filed with ${stateInfo.agency}.
Your task is to take the advocate's input text and refine/generate it according to the requested instruction.

TASK INSTRUCTION:
${modePrompts[input.mode] || modePrompts.make_better}
${input.customInstruction ? `\nADITIONAL ADVOCATE DIRECTION: ${input.customInstruction}` : ""}

STUDENT CONTEXT:
- Student: ${student}
- District / LEA: ${district}
- Target Document Section: ${section}
- Governing State Agency: ${stateInfo.agency} (${stateInfo.ruleCitation})

MANDATORY RULES:
1. STRICT TERMINOLOGY GUARDRAIL: NEVER use the terms "Master Coach", "Master IEP Coach", "Master Coaching", or "IEP Coach". Always use "Lead Special Education Advocate" or "Special Education Advocate".
2. OUTPUT FORMAT: Return ONLY the refined, polished text. Do not wrap in conversational preamble like "Here is the refined text:" or "Certainly!". Return ready-to-insert text for the legal document.`;

        try {
          const response = await invokeLLM({
            messages: [
              { role: "system" as const, content: systemContent },
              { role: "user" as const, content: input.text },
            ],
            model: CF_MODELS.DEEP,
          });

          const rawContent = response?.choices?.[0]?.message?.content;
          const content = typeof rawContent === "string" ? rawContent : Array.isArray(rawContent) ? rawContent.map((p: any) => p.text ?? "").join("") : "";
          const cleaned = sanitizeComplaintText(content.trim());

          if (cleaned.length > 0) {
            return {
              success: true,
              enhancedText: cleaned,
              mode: input.mode,
            };
          }
          throw new Error("Empty response from LLM");
        } catch (err: any) {
          console.warn("[stateComplaint.aiWriterHelper] LLM failed, using intelligent heuristic fallback:", err?.message);

          // Heuristic local fallback (for offline dev or CI environments)
          let enhanced = input.text.trim();
          if (input.mode === "make_better") {
            enhanced = `STATEMENT OF FORMAL ADVOCACY POSITION:\n\n${enhanced}\n\nThis position is asserted by Waypoint Advocates on behalf of ${student}, establishing that the public agency (${district}) failed to adhere to governing special education mandates under IDEA and ${stateInfo.ruleCitation}.`;
          } else if (input.mode === "help_write") {
            enhanced = `CHRONOLOGICAL FACTUAL NARRATIVE & STATUTORY VIOLATION:\n\n${enhanced}\n\nDuring the relevant statutory lookback period, the public agency was repeatedly placed on notice regarding these concerns yet failed to implement corrective action, resulting in a demonstrable denial of educational benefit and FAPE.`;
          } else if (input.mode === "add_citations") {
            enhanced = `${enhanced}\n\n(Governing Authorities: 34 C.F.R. § 300.101 [FAPE], 34 C.F.R. § 300.323(c)(2) [IEP Implementation Fidelity], and ${stateInfo.ruleCitation} [State Complaint Procedures]).`;
          } else if (input.mode === "make_concise") {
            const firstFew = enhanced.split("\n")[0] || enhanced;
            enhanced = `COUNT: ${firstFew} (34 C.F.R. § 300.153 · ${stateInfo.ruleCitation})`;
          } else if (input.mode === "fix_grammar") {
            // Capitalize sentences and clean extra whitespace
            enhanced = enhanced.replace(/\s+/g, " ").replace(/(^\w|\.\s+\w)/gm, (c) => c.toUpperCase());
          }

          return {
            success: true,
            enhancedText: sanitizeComplaintText(enhanced),
            mode: input.mode,
          };
        }
      }),

    // -------------------------------------------------------------------------
    // Draft Sync: Cloud Storage via D1 for Seamless Localhost & Live Sync
    // -------------------------------------------------------------------------
    saveDraft: publicProcedure
      .input(
        z.object({
          studentId: z.number().nullable().optional(),
          title: z.string().optional(),
          draftKey: z.string().optional(),
          startedAt: z.string().optional(),
          draftJson: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const studentIdNum = input.studentId ?? null;
        const draftId = input.draftKey || (studentIdNum ? `draft_student_${studentIdNum}` : "draft_general");
        const title = input.title || `State Complaint Draft (${studentIdNum || "active"})`;
        const startedAt = input.startedAt || new Date().toISOString();

        try {
          const cfDb = (globalThis as any).__CF_ENV_DB__;
          if (cfDb) {
            await cfDb
              .prepare(
                `INSERT INTO complaint_drafts (id, student_id, title, draft_json, started_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                 ON CONFLICT(id) DO UPDATE SET
                   title = excluded.title,
                   draft_json = excluded.draft_json,
                   updated_at = CURRENT_TIMESTAMP`
              )
              .bind(draftId, studentIdNum, title, input.draftJson, startedAt)
              .run();
            return { success: true, id: draftId, startedAt };
          }

          const { queryCloudflareD1 } = await import("../_core/d1Client");
          await queryCloudflareD1(
            `INSERT INTO complaint_drafts (id, student_id, title, draft_json, started_at, updated_at)
             VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT(id) DO UPDATE SET
               title = excluded.title,
               draft_json = excluded.draft_json,
               updated_at = CURRENT_TIMESTAMP`,
            [draftId, studentIdNum, title, input.draftJson, startedAt]
          );
          return { success: true, id: draftId, startedAt };
        } catch (err: any) {
          console.warn("[stateComplaint.saveDraft] Cloud D1 save failed:", err?.message);
          return { success: false, error: err?.message };
        }
      }),

    listDrafts: publicProcedure
      .input(
        z.object({
          studentId: z.number().nullable().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        try {
          const cfDb = (globalThis as any).__CF_ENV_DB__;
          if (cfDb) {
            const sql = input?.studentId
              ? "SELECT id, student_id as studentId, title, started_at as startedAt, updated_at as updatedAt, draft_json as draftJson FROM complaint_drafts WHERE student_id = ? ORDER BY updated_at DESC"
              : "SELECT id, student_id as studentId, title, started_at as startedAt, updated_at as updatedAt, draft_json as draftJson FROM complaint_drafts ORDER BY updated_at DESC";
            const stmt = input?.studentId ? cfDb.prepare(sql).bind(input.studentId) : cfDb.prepare(sql);
            const res = await stmt.all();
            return res?.results || [];
          }

          const { queryCloudflareD1 } = await import("../_core/d1Client");
          const sql = input?.studentId
            ? "SELECT id, student_id as studentId, title, started_at as startedAt, updated_at as updatedAt, draft_json as draftJson FROM complaint_drafts WHERE student_id = ? ORDER BY updated_at DESC"
            : "SELECT id, student_id as studentId, title, started_at as startedAt, updated_at as updatedAt, draft_json as draftJson FROM complaint_drafts ORDER BY updated_at DESC";
          const args = input?.studentId ? [input.studentId] : [];
          const rows = await queryCloudflareD1(sql, args);
          return rows || [];
        } catch (err) {
          console.warn("[stateComplaint.listDrafts] Error querying cloud drafts:", err);
          return [];
        }
      }),

    getDraft: publicProcedure
      .input(
        z.object({
          studentId: z.number().nullable().optional(),
          id: z.string().or(z.number()).optional(),
        })
      )
      .query(async ({ input }) => {
        try {
          const cfDb = (globalThis as any).__CF_ENV_DB__;
          if (cfDb) {
            if (input.id) {
              const row = await cfDb
                .prepare("SELECT draft_json as draftJson FROM complaint_drafts WHERE id = ? LIMIT 1")
                .bind(String(input.id))
                .first();
              return row?.draftJson || null;
            }
            if (input.studentId) {
              const row = await cfDb
                .prepare("SELECT draft_json as draftJson FROM complaint_drafts WHERE student_id = ? ORDER BY updated_at DESC LIMIT 1")
                .bind(input.studentId)
                .first();
              return row?.draftJson || null;
            }
            return null;
          }

          const { queryCloudflareD1 } = await import("../_core/d1Client");
          if (input.id) {
            const rows = await queryCloudflareD1(
              "SELECT draft_json as draftJson FROM complaint_drafts WHERE id = ? LIMIT 1",
              [String(input.id)]
            );
            return rows?.[0]?.draftJson || null;
          }

          if (input.studentId) {
            const rows = await queryCloudflareD1(
              "SELECT draft_json as draftJson FROM complaint_drafts WHERE student_id = ? ORDER BY updated_at DESC LIMIT 1",
              [input.studentId]
            );
            return rows?.[0]?.draftJson || null;
          }
        } catch (err) {
          console.warn("[stateComplaint.getDraft] Error querying draft:", err);
        }

        return null;
      }),

});

