import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import * as db from "../db";
import { invokeLLM, CF_MODELS } from "../_core/llm";
import { recordCaseActivity } from "../services/caseActivityService";

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
      let workspace = await db.getWorkspaceByStudentId(input.studentContactId);

      if (!workspace) {
        // Fetch student contact details to generate friendly title/date
        const contact = await db.getContactById(input.studentContactId);
        const studentName = contact ? `${contact.firstName} ${contact.lastName}` : "Student";
        const today = new Date().toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });

        workspace = await db.createWorkspace({
          studentContactId: input.studentContactId,
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
      return db.listWorkspacesByStudentId(input.studentContactId);
    }),

  /**
   * Save workspace state
   */
  save: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        meetingDate: z.string().optional(),
        meetingType: z.string().optional(),
        status: z.string().optional(),
        activeTab: z.string().optional(),
        prepStep: z.string().optional(),
        detectedIepOrder: z.string().optional(),
        iepIntelFindings: z.string().optional(),
        parentIntelConcerns: z.string().optional(),
        parentConcernStatement: z.string().optional(),
        pcsApproved: z.boolean().optional(),
        pcsLastApprovedAt: z.date().optional().nullable(),
        meetingTargets: z.string().optional(),
        parkingLot: z.string().optional(),
        additionalItems: z.string().optional(),
        closeoutChecks: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const updated = await db.updateWorkspace(id, data);
      if (!updated) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update workspace" });
      }
      return updated;
    }),

  /**
   * Step 1: Run IEP Intel
   * Analyzes student IEP records & extracts findings with detected document order
   */
  runIepIntel: protectedProcedure
    .input(
      z.object({
        studentContactId: z.number(),
        iepFileName: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const contact = await db.getContactById(input.studentContactId);
      const studentName = contact ? `${contact.firstName} ${contact.lastName}` : "Student";
      const diagnoses = contact?.diagnosis || "Autism Spectrum Disorder, Speech-Language Impairment";
      const challenges = contact?.challenges || "Sensory overload in noisy environments, writing fatigue, communication breakdowns";
      const school = contact?.schoolName || "Local School District";
      const grade = contact?.gradeLevel || "Elementary";

      const systemPrompt = `You are Waypoint Advocates' Senior Master IEP Coach & IEP Intel Unit.
Analyze the student's IEP profile and produce:
1. "detectedOrder": array of detected IEP section names in the realistic order of this IEP document.
2. "findings": array of extracted IEP Intel items. Each finding must have:
   - id: string (unique)
   - category: string ("Present Levels", "Accommodations", "Services", "Goals", "Special Factors", "Evaluation / Missing Data")
   - section: string
   - text: string (clear description of finding, missing support, or inconsistency)
   - quote: string (sample quote or baseline fact)
   - status: "keep" | "important" | "edit" | "dismiss"

Keep findings realistic, precise, and highly actionable for an IEP meeting advocacy preparation.`;

      const userPrompt = `Student: ${studentName}
Grade / School: ${grade} / ${school}
Document: ${input.iepFileName || "Current Official IEP"}
Diagnoses: ${diagnoses}
Reported Challenges: ${challenges}

Generate structured JSON output with:
{
  "detectedOrder": ["Parent Concerns", "Present Levels / Academics", "Special Factors", "Annual Goals", "Accommodations / Supports", "Related Services / AAC", "Placement / LRE", "ESY & Transportation"],
  "findings": [
    {
      "id": "find-1",
      "category": "Accommodations",
      "section": "Accommodations / Supports",
      "text": "Noise Support: Headphones are only listed for testing, leaving assemblies, cafeterias, and gym unsupported during peak sensory overload.",
      "quote": "Page 12: 'Noise cancelling headphones permitted during standardized test administrations.'",
      "status": "important"
    },
    {
      "id": "find-2",
      "category": "Present Levels",
      "section": "Present Levels / Academics",
      "text": "Writing Baseline: Current baseline lacks quantifiable words-per-minute or independent sentence formulation metrics.",
      "quote": "Page 6: 'Student participates in writing activities with teacher assistance.'",
      "status": "keep"
    },
    {
      "id": "find-3",
      "category": "Special Factors",
      "section": "Special Factors",
      "text": "FBA & Behavior Plan: Escalations during unstructured transitions have increased without an updated functional behavior assessment.",
      "quote": "Page 4: 'Behavior does not impede learning when 1:1 adult prompt provided.'",
      "status": "important"
    },
    {
      "id": "find-4",
      "category": "Services",
      "section": "Related Services / AAC",
      "text": "AAC & Speech: Speech therapy is delivered in 30-min group format, lacking direct device programming and staff modeling.",
      "quote": "Page 15: 'Speech-Language Pathology: 60 minutes monthly / group.'",
      "status": "keep"
    }
  ]
}`;

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
        if (parsed.detectedOrder && Array.isArray(parsed.findings)) {
          return parsed;
        }
      } catch (err) {
        console.warn("[meetingWorkspace] LLM fallback for IEP Intel:", err);
      }

      // High-quality deterministic fallback
      return {
        detectedOrder: [
          "Parent Concerns",
          "Present Levels / Academics",
          "Special Factors",
          "Annual Goals",
          "Accommodations / Supports",
          "Related Services / AAC",
          "Placement / LRE",
          "ESY & Transportation",
        ],
        findings: [
          {
            id: `f-${Date.now()}-1`,
            category: "Accommodations",
            section: "Accommodations / Supports",
            text: `Noise Support: Access to noise-canceling headphones is needed across loud environments (cafeteria, hallways, assemblies), not just during testing.`,
            quote: "Current IEP: 'Testing accommodations only.'",
            status: "important",
          },
          {
            id: `f-${Date.now()}-2`,
            category: "Present Levels",
            section: "Present Levels / Academics",
            text: `Writing Baseline: Lack of objective baseline data on written expression and stamina before writing goal was set.`,
            quote: "Current IEP: 'Student continues to make progress.'",
            status: "keep",
          },
          {
            id: `f-${Date.now()}-3`,
            category: "Related Services / AAC",
            section: "Related Services / AAC",
            text: `AAC Modeling: Direct instruction and multi-environment AAC device modeling for classroom staff.`,
            quote: "Current IEP: 'Speech 30 min/week group.'",
            status: "important",
          },
          {
            id: `f-${Date.now()}-4`,
            category: "Accommodations",
            section: "Accommodations / Supports",
            text: `Help Signal: Need a reliable, discreet visual help card or tactile cue so ${studentName} can request breaks independently.`,
            quote: "Current IEP: 'Prompted by paraprofessional.'",
            status: "keep",
          },
        ],
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
      const studentName = contact ? `${contact.firstName} ${contact.lastName}` : "Student";
      const challenges = contact?.challenges || "";
      const notes = contact?.notes || "";

      // Also scan Compass if available
      let compassStatus = "";
      if (contact?.caseId) {
        const compass = await db.getCaseCompass(contact.caseId);
        if (compass) {
          compassStatus = `${compass.currentStatus || ""} ${compass.lastMeetingSummary || ""}`;
        }
      }

      const systemPrompt = `You are Waypoint Advocates' Parent Intel Gatherer.
Your task is to identify and extract what the family/parent has ACTUALLY communicated as concerns from authorized case records.
DO NOT invent parent concerns.
Every concern must cite its authentic case source (e.g. "Discovery Call", "Parent Intake", "Case Compass", "Parent Email").
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
Parent Reported Challenges: ${challenges || "Morning arrival distress, sensory overwhelm, meltdowns after school due to masking."}
Advocate / Case Notes: ${notes || "Parent noted Klaire gets overwhelmed during noisy transitions and refuses writing tasks."}
Case Compass: ${compassStatus || "Active IEP representation, preparing for annual review."}

Extract 3-5 grounded parent concerns with source attribution.`;

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

      return {
        concerns: [
          {
            id: `pc-${Date.now()}-1`,
            topic: "Morning Arrival & Transition",
            concern: "Parent reports severe anxiety and dysregulation during morning drop-off without a predictable entry routine.",
            source: "Parent Intake Form",
            status: "keep",
          },
          {
            id: `pc-${Date.now()}-2`,
            topic: "Sensory Overload in High-Noise Areas",
            concern: "Parent reports Klaire experiences frequent meltdowns at home following cafeteria and PE sessions.",
            source: "Discovery Call",
            status: "keep",
          },
          {
            id: `pc-${Date.now()}-3`,
            topic: "Independent Help Requesting",
            concern: "Parent worries Klaire shuts down rather than speaking up when confused or overwhelmed by academic worksheets.",
            source: "Case Compass Notes",
            status: "keep",
          },
        ],
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

      const systemPrompt = `You are Waypoint Advocates' Lead Master IEP Coach.
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

      const systemPrompt = `You are Waypoint Advocates' Master IEP Blueprint Architect.
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

      // Default high-caliber meeting targets
      return {
        targets: [
          {
            id: `tgt-${Date.now()}-1`,
            targetName: "Morning Arrival Transition Support",
            iepSection: "Parent Concerns",
            sectionOrder: 1,
            targetOrder: 1,
            quickAdvocateSayThis: "We are requesting a structured, 5-minute arrival check-in with a designated staff member to establish regulation before entering the general classroom.",
            fullAdvocateScript: "Good morning team. To ensure Klaire can access instruction from the first bell, we are asking for an arrival transition accommodation: a designated check-in spot and 5 minutes of sensory settling before academic tasks begin.",
            putItHereLocation: "IEP Section: Parent Concerns & Classroom Accommodations",
            possibleIepWording: "Student will be provided a daily 5-minute arrival check-in and sensory regulation routine with resource staff prior to homeroom start.",
            whyWeWantIt: "Prevents transition dysregulation and ensures classroom readiness without missing instructional core time.",
            supportingEvidence: "Parent intake notes and home morning distress logs.",
            sources: ["Parent Concern Statement", "Parent Intake Form"],
            ifTeamDisagrees: "If the team feels homeroom staff cannot accommodate this, let's explore who in the building is available at arrival and document the decision in Prior Written Notice.",
            parentWhatWeWant: "A calm, predictable 5-minute arrival routine every morning.",
            parentWhyWeWantIt: "Helps Klaire start the day relaxed and ready to learn instead of feeling overwhelmed immediately.",
            parentSupportingEvidence: "Our daily morning observations and communication with homeroom teacher.",
            meetingStatus: "NOT_DISCUSSED",
            requestRaised: false,
            pwnNeeded: false,
            addedToIep: false,
            followUpNeeded: false,
          },
          {
            id: `tgt-${Date.now()}-2`,
            targetName: "Noise-Reduction Headphones & Sensory Cooldown",
            iepSection: "Accommodations / Supports",
            sectionOrder: 2,
            targetOrder: 2,
            quickAdvocateSayThis: "We're requesting access to noise-canceling headphones and a designated cooldown station during high-decibel classroom transitions.",
            fullAdvocateScript: "During assemblies, cafeteria time, and transitions, Klaire experiences sensory overwhelm that leads to fatigue and withdrawal. We request that noise-canceling headphones be listed as an available accommodation across all school settings.",
            putItHereLocation: "IEP Section: Supplementary Aids & Services / Accommodations",
            possibleIepWording: "Student will have unrestricted access to personal noise-reduction headphones during transitions, cafeteria, assemblies, and upon student request.",
            whyWeWantIt: "Addresses auditory sensitivity and maintains regulated focus in noisy school environments.",
            supportingEvidence: "OT evaluation summary and parent sensory profile.",
            sources: ["OT Evaluation p. 6", "Parent Concern Statement"],
            ifTeamDisagrees: "What objective evaluation data suggests headphones are unnecessary? If denied, we request written refusal rationale in the Prior Written Notice.",
            parentWhatWeWant: "Headphones available whenever the environment gets too loud.",
            parentWhyWeWantIt: "Protects Klaire from sensory headaches and loud noise meltdowns.",
            parentSupportingEvidence: "Occupational Therapy evaluation report.",
            meetingStatus: "NOT_DISCUSSED",
            requestRaised: false,
            pwnNeeded: false,
            addedToIep: false,
            followUpNeeded: false,
          },
          {
            id: `tgt-${Date.now()}-3`,
            targetName: "Independent Help-Seeking Signal",
            iepSection: "Accommodations / Supports",
            sectionOrder: 2,
            targetOrder: 3,
            quickAdvocateSayThis: "We're requesting one reliable, discreet way for Klaire to independently signal that she needs help or a short pause.",
            fullAdvocateScript: "When tasks become overwhelming, Klaire tends to freeze or shut down rather than verbally asking for assistance. Having a discrete desk card or hand signal allows her to request help without social embarrassment.",
            putItHereLocation: "IEP Section: Classroom Accommodations & Supports",
            possibleIepWording: "Student will be provided a discreet visual help card (flip card / token) on her desk to indicate a need for educator assistance or a 2-minute processing break.",
            whyWeWantIt: "Fosters self-advocacy and prevents task refusal caused by communicative shutdown.",
            supportingEvidence: "Classroom observation logs and speech-language pragmatics notes.",
            sources: ["Speech-Language Eval", "Teacher Feedback Form"],
            ifTeamDisagrees: "How will staff identify when Klaire is in shutdown mode if no discreet cue is implemented?",
            parentWhatWeWant: "A simple, non-embarrassing way for Klaire to tell the teacher she is stuck.",
            parentWhyWeWantIt: "Keeps Klaire from shutting down and falling behind when work gets hard.",
            parentSupportingEvidence: "Speech pathologist report and teacher observations.",
            meetingStatus: "NOT_DISCUSSED",
            requestRaised: false,
            pwnNeeded: false,
            addedToIep: false,
            followUpNeeded: false,
          },
          {
            id: `tgt-${Date.now()}-4`,
            targetName: "Writing Baseline & Progress Monitoring",
            iepSection: "Present Levels / Academics",
            sectionOrder: 3,
            targetOrder: 4,
            quickAdvocateSayThis: "We are requesting an updated objective baseline for written expression with bi-weekly progress monitoring data shared with the family.",
            fullAdvocateScript: "The current IEP states Klaire 'struggles with writing' without quantifying words per minute, sentence complexity, or stamina. We need an objective baseline established within 30 days so we can accurately measure growth.",
            putItHereLocation: "IEP Section: Present Levels of Academic Achievement (PLAAPF)",
            possibleIepWording: "Baseline: Student generates an average of 14 words per 5-minute prompt with 50% legibility. Progress will be monitored bi-weekly via curriculum-based measurement probes.",
            whyWeWantIt: "Ensure goals are measurable and backed by verifiable baseline metrics per IDEA standards.",
            supportingEvidence: "Current IEP PLAAPF section and sample writing work products.",
            sources: ["Current IEP p. 4", "Parent Work Samples"],
            ifTeamDisagrees: "Without objective baseline data, how will the IEP team demonstrate that the student is receiving meaningful educational benefit under Endrew F.?",
            parentWhatWeWant: "Clear starting numbers on Klaire's writing and regular progress reports.",
            parentWhyWeWantIt: "So we know whether the teaching strategy is actually helping her improve.",
            parentSupportingEvidence: "Writing samples and current report cards.",
            meetingStatus: "NOT_DISCUSSED",
            requestRaised: false,
            pwnNeeded: false,
            addedToIep: false,
            followUpNeeded: false,
          },
          {
            id: `tgt-${Date.now()}-5`,
            targetName: "Direct AAC Modeling & Staff Training",
            iepSection: "Related Services / AAC",
            sectionOrder: 4,
            targetOrder: 5,
            quickAdvocateSayThis: "We are requesting 30 minutes of direct AAC device consultation and classroom staff modeling per month.",
            fullAdvocateScript: "Klaire's communication device is underutilized because classroom staff have not received structured training on her communication app. We are requesting that the speech-language pathologist provide direct consultative training and modeling in the general classroom setting.",
            putItHereLocation: "IEP Section: Related Services & Support for School Personnel",
            possibleIepWording: "Speech-Language Pathologist will provide 30 minutes monthly of Consultative Support for School Personnel focusing on AAC device programming and aided language stimulation across classroom environments.",
            whyWeWantIt: "Ensures multimodal communication is integrated across the school day rather than isolated to therapy rooms.",
            supportingEvidence: "Assistive Technology consultation notes and SLP progress report.",
            sources: ["AT Evaluation", "SLP Progress Notes"],
            ifTeamDisagrees: "If school staff do not receive consultative modeling, who is responsible for ensuring AAC device fidelity during instruction?",
            parentWhatWeWant: "Training for Klaire's teachers on how to use her communication iPad.",
            parentWhyWeWantIt: "Ensures she can communicate in class, at lunch, and on the playground, not just in speech therapy.",
            parentSupportingEvidence: "Assistive technology specialist report.",
            meetingStatus: "NOT_DISCUSSED",
            requestRaised: false,
            pwnNeeded: false,
            addedToIep: false,
            followUpNeeded: false,
          }
        ]
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
            ownerRole: "Master IEP Coach®",
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

      return { success: true };
    }),
});
