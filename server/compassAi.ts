import { invokeLLM, CF_MODELS } from "./_core/llm";
import * as db from "./db";
import { eq, desc } from "drizzle-orm";
import { contacts, projectTasks, caseActivityTimeline, firstMateSessions, meetingWorkspaces, discoveryCalls, CaseCompass } from "../drizzle/schema";
import { firstMateSessionStore } from "./firstMate/sessionStore";

export interface GenerateCaseCompassAiInput {
  studentId: number;
  caseId?: string;
  meetingId?: string;
  meetingTitle?: string;
  transcriptText?: string;
  extraInstructions?: string;
  advocateName?: string;
}

export interface CompassSourceReference {
  label: string;
  timestamp?: string;
  quote?: string;
  source: string;
}

export interface CaseCompassAiOutput {
  currentStatus: string;
  nextStep: string;
  whoHasBall: string;
  ideaRiskLevel: "Low" | "Moderate" | "Elevated" | "Urgent";
  sourceReferences: CompassSourceReference[];
  unresolvedIssues: string[];
  rationale: string;
  aiModel: string;
}

/**
 * Intelligent deterministic heuristic fallback when LLM is offline or in mock/test mode.
 * Follows strict AGENTS.md Rule F (never uses Master Coach).
 */
function generateHeuristicCompassUpdate(params: {
  studentName: string;
  currentCompass: CaseCompass | null;
  previousUnresolved: string[];
  transcriptText?: string;
  openTasks: any[];
  recentActivities: any[];
}): CaseCompassAiOutput {
  const { studentName, currentCompass, previousUnresolved, transcriptText = "", openTasks } = params;
  const lower = transcriptText.toLowerCase();

  // 1. Detect IDEA Risk Level based on substantive dispute indicators
  let ideaRiskLevel: "Low" | "Moderate" | "Elevated" | "Urgent" = currentCompass?.ideaRiskLevel as any || "Moderate";
  const urgentKeywords = ["due process", "state complaint", "emergency", "manifestation", "expulsion", "suspension", "10 days", "unlawful removal"];
  const elevatedKeywords = ["denied", "denial", "refusal", "refused", "delay", "iee", "compensatory", "fape", "missed service", "regression"];
  const lowKeywords = ["agreement reached", "full compliance", "accommodations accepted", "progress verified", "smooth transition"];

  if (urgentKeywords.some((k) => lower.includes(k))) {
    ideaRiskLevel = "Urgent";
  } else if (elevatedKeywords.some((k) => lower.includes(k))) {
    ideaRiskLevel = "Elevated";
  } else if (lowKeywords.some((k) => lower.includes(k))) {
    ideaRiskLevel = "Low";
  }

  // 2. Identify unresolved issues (combining existing memory with new transcript detections)
  const unresolvedIssues: string[] = [...previousUnresolved];

  if (lower.includes("speech") && (lower.includes("reduc") || lower.includes("deni") || lower.includes("miss"))) {
    if (!unresolvedIssues.some((i) => i.toLowerCase().includes("speech"))) {
      unresolvedIssues.push("Speech & language compensatory services audit and therapy minute dispute");
    }
  }
  if (lower.includes("occupational") || lower.includes(" ot ")) {
    if (lower.includes("miss") || lower.includes("eval") || lower.includes("deni")) {
      if (!unresolvedIssues.some((i) => i.toLowerCase().includes("ot") || i.toLowerCase().includes("occupational"))) {
        unresolvedIssues.push("Occupational therapy makeup minutes and sensory evaluation pending");
      }
    }
  }
  if (lower.includes("iee") || lower.includes("independent")) {
    if (!unresolvedIssues.some((i) => i.toLowerCase().includes("iee"))) {
      unresolvedIssues.push("Independent Educational Evaluation (IEE) request & funding approval");
    }
  }
  if (lower.includes("para") || lower.includes("1:1") || lower.includes("aide")) {
    if (!unresolvedIssues.some((i) => i.toLowerCase().includes("para") || i.toLowerCase().includes("aide"))) {
      unresolvedIssues.push("1:1 Dedicated Paraprofessional support qualification and data verification");
    }
  }
  if (unresolvedIssues.length === 0) {
    unresolvedIssues.push("IEP accommodations compliance and quarterly progress data tracking");
  }

  // 3. Synthesize Current Status
  let currentStatus = currentCompass?.currentStatus || `Advocacy and IEP case monitoring in active progress for ${studentName}.`;
  if (transcriptText) {
    if (ideaRiskLevel === "Urgent") {
      currentStatus = `High-priority dispute active for ${studentName}. Addressing urgent statutory compliance concerns and securing immediate district follow-through.`;
    } else if (ideaRiskLevel === "Elevated") {
      currentStatus = `Active advocacy engagement for ${studentName}. Reviewing recent meeting outcomes, demanding prior written notice (PWN), and addressing unresolved service allocations.`;
    } else {
      currentStatus = `IEP strategy and student supports proceeding as scheduled for ${studentName}. Current accommodations and service delivery under routine monitoring.`;
    }
  }

  // 4. Synthesize Next Step
  let nextStep = currentCompass?.nextStep || "Review pending school records and confirm upcoming team meeting schedule.";
  if (openTasks.length > 0) {
    nextStep = `${openTasks[0].title}. Coordinate with Waypoint lead advocate on submission timeline.`;
  } else if (lower.includes("iee")) {
    nextStep = "Transmit formal IEE request letter with evaluator criteria to District Special Education Director.";
  } else if (lower.includes("pwn") || lower.includes("prior written notice")) {
    nextStep = "Submit written response challenging school district's PWN and document parental disagreement.";
  }

  // 5. Synthesize Who Has the Ball
  let whoHasBall = currentCompass?.whoHasBall || "School District & Waypoint Advocates";
  if (lower.includes("district must") || lower.includes("school will") || lower.includes("school said")) {
    whoHasBall = "School District (Special Ed Administration)";
  } else if (lower.includes("parent will") || lower.includes("send records")) {
    whoHasBall = "Parent & Waypoint Advocates";
  }

  // 5b. Firm Foundation Kickoff: Dedicated handling for Discovery Calls
  const isDiscovery = lower.includes("discovery call") || lower.includes("intake record") || lower.includes("family story");
  if (isDiscovery) {
    currentStatus = `Representation initiated following family discovery call for ${studentName}. Establishing core advocacy priorities, auditing educational history, and laying a firm foundation for IEP compliance.`;
    nextStep = `Family transmitting complete educational records, current IEP/504 documents, and recent psychological assessments for advocate forensic review.`;
    whoHasBall = "Parent & Waypoint Advocates (Record Gathering)";
    if (ideaRiskLevel !== "Urgent") {
      ideaRiskLevel = "Moderate";
    }
  }

  // 6. Source References
  const sourceReferences: CompassSourceReference[] = [];
  if (transcriptText) {
    const lines = transcriptText.split("\n").filter((l) => l.trim().length > 10);
    if (lines.length > 0) {
      sourceReferences.push({
        label: "Meeting Transcript Event",
        timestamp: "Recent Session",
        quote: lines[0].slice(0, 140),
        source: "Finalized Meeting Transcript",
      });
    }
  }

  return {
    currentStatus,
    nextStep,
    whoHasBall,
    ideaRiskLevel,
    sourceReferences,
    unresolvedIssues,
    rationale: `Synthesized from case history, recent meeting turns, and ${unresolvedIssues.length} active unresolved concerns.`,
    aiModel: "Waypoint Heuristic Synthesis Engine (Offline Fallback)",
  };
}

/**
 * Main AI Case Compass Generator.
 * Examines current approved Compass, past updates, meeting transcripts, open tasks,
 * and unresolved issues memory to propose a 5-field Case Compass update.
 */
export async function generateCaseCompassAiUpdate(
  input: GenerateCaseCompassAiInput
): Promise<CaseCompassAiOutput> {
  const conn = await db.getDb();

  // 1. Resolve student info
  let student: any = null;
  if (conn) {
    try {
      const [s] = await conn.select().from(contacts).where(eq(contacts.id, input.studentId)).limit(1);
      student = s;
    } catch {}
  }

  const studentName = student ? `${student.firstName} ${student.lastName}` : "Student";
  const caseId = input.caseId || student?.caseId || `WP-${input.studentId}`;

  // 2. Load current published compass and history
  const currentCompass = await db.getCaseCompass(caseId, input.studentId);
  const historyList = await db.getCaseCompassHistory(caseId, input.studentId);
  const previousSnapshots = historyList.slice(0, 3);

  // Parse unresolved issues memory from previous compass
  let previousUnresolved: string[] = [];
  try {
    if (currentCompass?.unresolvedIssues) {
      const parsed = JSON.parse(currentCompass.unresolvedIssues);
      if (Array.isArray(parsed)) previousUnresolved = parsed;
    }
  } catch {}

  // 3. Load open tasks
  let openTasks: any[] = [];
  if (conn) {
    try {
      openTasks = await conn
        .select()
        .from(projectTasks)
        .where(eq(projectTasks.projectId, input.studentId))
        .limit(5);
    } catch {}
  }

  // 4. Load recent timeline activities
  let recentActivities: any[] = [];
  if (conn) {
    try {
      recentActivities = await conn
        .select()
        .from(caseActivityTimeline)
        .where(eq(caseActivityTimeline.studentContactId, input.studentId))
        .orderBy(desc(caseActivityTimeline.eventDate))
        .limit(6);
    } catch {}
  }

  // 5. Resolve transcript text if not provided directly
  let transcriptText = input.transcriptText || "";
  let meetingTitle = input.meetingTitle || "";

  if (!transcriptText && input.meetingId) {
    // A. Check in-memory First Mate session runs (for active/recent runs and tests)
    try {
      const memRun = firstMateSessionStore.getRecordedRun(input.meetingId);
      if (memRun) {
        meetingTitle = memRun.title || meetingTitle;
        if (Array.isArray(memRun.transcript) && memRun.transcript.length > 0) {
          transcriptText = memRun.transcript
            .map((e: any) => `${e.speakerRole || "Speaker"}: ${e.text || ""}`)
            .join("\n");
        } else if ((memRun as any).transcriptJson) {
          try {
            const events = JSON.parse((memRun as any).transcriptJson);
            if (Array.isArray(events) && events.length > 0) {
              transcriptText = events
                .map((e: any) => `${e.speakerRole || "Speaker"}: ${e.text || ""}`)
                .join("\n");
            }
          } catch {}
        }
        if (!transcriptText && memRun.summary) {
          transcriptText = memRun.summary;
        }
      }
    } catch {}

    // B. Check Meeting Workspaces (mw-...)
    if (!transcriptText && (input.meetingId.startsWith("mw-") || conn)) {
      try {
        const mwId = Number(input.meetingId.replace("mw-", ""));
        if (!isNaN(mwId) && conn) {
          const [mw] = await conn
            .select()
            .from(meetingWorkspaces)
            .where(eq(meetingWorkspaces.id, mwId))
            .limit(1);

          if (mw) {
            meetingTitle = mw.title || "IEP Meeting Workspace";
            let mwSummary: any = null;
            try {
              if (mw.completedSummary) mwSummary = JSON.parse(mw.completedSummary);
            } catch {}

            const agreed = mwSummary?.agreedTargets?.join(", ") || "";
            const denied = mwSummary?.deniedTargets?.join(", ") || "";
            const pwn = mwSummary?.pwnTargets?.join(", ") || "";
            const notes = mwSummary?.notes || "";

            transcriptText = [
              `Meeting Workspace Closeout: ${mw.title || mw.meetingType}`,
              `Status: ${mw.status}`,
              notes ? `Advocate Notes: ${notes}` : "",
              agreed ? `Agreed Accommodations/Services: ${agreed}` : "",
              pwn ? `Prior Written Notice Demands: ${pwn}` : "",
              denied ? `Denied District Items: ${denied}` : "",
              mw.parentConcernStatement ? `Parent Concerns Statement: ${mw.parentConcernStatement}` : "",
            ]
              .filter(Boolean)
              .join("\n");
          }
        }
      } catch {}
    }

    // C. Check firstMateSessions DB table
    if (!transcriptText && conn) {
      try {
        const [fmSession] = await conn
          .select()
          .from(firstMateSessions)
          .where(eq(firstMateSessions.sessionId, input.meetingId))
          .limit(1);

        if (fmSession) {
          meetingTitle = fmSession.title || meetingTitle;
          if (fmSession.transcriptJson) {
            try {
              const events = JSON.parse(fmSession.transcriptJson);
              if (Array.isArray(events)) {
                transcriptText = events
                  .map((e: any) => `${e.speakerRole || "Speaker"}: ${e.text || ""}`)
                  .join("\n");
              }
            } catch {}
          }
          if (!transcriptText && fmSession.summary) {
            transcriptText = fmSession.summary;
          }
        }
      } catch {}
    }

    // D. Check discoveryCalls DB table (disc-...)
    if (!transcriptText && (input.meetingId.startsWith("disc-") || conn)) {
      try {
        const dcId = Number(input.meetingId.replace("disc-", ""));
        if (!isNaN(dcId) && conn) {
          const [dc] = await conn
            .select()
            .from(discoveryCalls)
            .where(eq(discoveryCalls.id, dcId))
            .limit(1);

          if (dc) {
            meetingTitle = "Discovery Call & Intake Record";
            const parts = [
              "=== WAYPOINT ADVOCATES DISCOVERY CALL RECORD ===",
              dc.theirStoryNotes ? `Family Story & Student Background:\n${dc.theirStoryNotes}` : "",
              dc.questionNotes ? `Intake Question Notes:\n${dc.questionNotes}` : "",
              dc.callScriptNotes ? `Advocate Assessment Notes:\n${dc.callScriptNotes}` : "",
              dc.pricingNotes ? `Advocacy Scope Notes:\n${dc.pricingNotes}` : "",
              dc.closingResponse ? `Client Commitment Status: ${dc.closingResponse}` : "",
              dc.additionalNotes ? `Agreed Next Steps:\n${dc.additionalNotes}` : "",
            ].filter(Boolean);
            transcriptText = parts.join("\n\n");
          }
        }
      } catch {}
    }
  }

  // Check if we can run via LLM
  const isTest = process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);
  const hasAiKey = Boolean(process.env.OPENAI_API_KEY || process.env.CLOUDFLARE_API_TOKEN);

  if (isTest && !hasAiKey) {
    return generateHeuristicCompassUpdate({
      studentName,
      currentCompass,
      previousUnresolved,
      transcriptText,
      openTasks,
      recentActivities,
    });
  }

  // Construct LLM Prompt
  const systemPrompt = `You are the Lead Special Education Advocate intelligence engine for Waypoint Advocates (Atlanta GA).
MANDATORY BRAND RULE: Strictly NEVER mention "Master Coach", "Master IEP Coach", or any variant. Always refer to "Lead Special Education Advocate" or "Waypoint Advocates".

Your mission is to analyze student case data and generate a proposed update for the authoritative Waypoint Case Compass™.
The Case Compass provides parents and advocates with an immediate 5-field status snapshot inside the Client Portal.

The 5 standardized fields are:
1. CURRENT STATUS: Briefly explain where the student's case stands (concise, authoritative, parent-friendly).
2. NEXT STEP: Identify the most immediate concrete action needed to advance the student's rights or plan.
3. WHO HAS THE BALL: Identify responsible party or parties (e.g. "School District", "Parent & Waypoint Advocates", "Independent Evaluator", "Fulton County Special Ed Director").
4. IDEA RISK LEVEL: Exactly one of: "Low", "Moderate", "Elevated", "Urgent".
   - "Low": Agreement reached, supports verified, smooth compliance.
   - "Moderate": Routine timeline monitoring, annual IEP prep, minor clarification pending.
   - "Elevated": Service reductions without PWN, delayed evaluations, missed accommodations, parent disagreement.
   - "Urgent": Unlawful removals, manifestation determinations, total denial of FAPE, imminent due process / state complaint.

CRITICAL DIRECTIVES:
- Keep entries clear, concise, parent-friendly, and empowering.
- Do NOT generate long essays. Parents view this on a circular digital dial.
- Do NOT invent facts, deadlines, decisions, or completed actions.
- DISCOVERY CALL & FIRM FOUNDATION KICKOFF: If the transcript or input is from a Discovery Call or intake session, establish an empowering, rock-solid FIRM FOUNDATION for the new client. In CURRENT STATUS: State that representation has been initiated following the family discovery call to establish core advocacy priorities. In NEXT STEP: Specify the immediate onboarding action (such as family transmitting school records, prior IEP/504 documents, or evaluations for advocate forensic audit). In WHO HAS THE BALL: Identify the record-gathering or review lead.
- UNRESOLVED ISSUE MEMORY: If a concern was previously unresolved (e.g., missing therapy logs, denied 1:1 aide, pending IEE) and there is no evidence in the recent meeting or case notes that it was resolved, YOU MUST PRESERVE THAT CONCERN. Do not assume silence means resolution.
- Provide sourceReferences with quotes or timestamps if transcript text was provided.

Respond strictly with valid JSON conforming to this structure:
{
  "currentStatus": "string",
  "nextStep": "string",
  "whoHasBall": "string",
  "ideaRiskLevel": "Low" | "Moderate" | "Elevated" | "Urgent",
  "sourceReferences": [
    { "label": "string", "timestamp": "string (optional)", "quote": "string (optional)", "source": "string" }
  ],
  "unresolvedIssues": ["string"],
  "rationale": "string"
}`;

  const userPrompt = `STUDENT DOSSIER:
Student: ${studentName} (Case ID: ${caseId})
Grade: ${student?.gradeLevel || "Not recorded"} | School: ${student?.schoolName || "Not recorded"}
Eligibility / Diagnoses: ${student?.iepEligibility || student?.diagnosis || "Special Education Case"}

CURRENT APPROVED CASE COMPASS:
- Status: ${currentCompass?.currentStatus || "(None published yet)"}
- Next Step: ${currentCompass?.nextStep || "(None recorded)"}
- Who Has Ball: ${currentCompass?.whoHasBall || "(None recorded)"}
- IDEA Risk Level: ${currentCompass?.ideaRiskLevel || "Moderate"}
- Active Unresolved Issues in Memory: ${JSON.stringify(previousUnresolved)}

PREVIOUS HISTORY SNAPSHOTS:
${previousSnapshots
  .map(
    (h, idx) =>
      `[Snapshot v${h.version || idx + 1} - ${new Date(h.savedAt).toLocaleDateString()}]: Status: "${h.currentStatus}" | Next Step: "${h.nextStep}" | Risk: ${h.ideaRiskLevel}`
  )
  .join("\n") || "(No previous history)"}

OPEN TASKS:
${openTasks.map((t) => `- [${t.status}] ${t.title}`).join("\n") || "(No open tasks)"}

RECENT CASE TIMELINE EVENTS:
${recentActivities.map((a) => `- [${a.eventType}] ${a.title}: ${a.description}`).join("\n") || "(No recent events)"}

${meetingTitle ? `MEETING: ${meetingTitle}\n` : ""}${
    transcriptText ? `COMPLETED MEETING TRANSCRIPT / NOTES:\n"""\n${transcriptText.slice(0, 5000)}\n"""\n` : ""
  }
${input.extraInstructions ? `ADVOCATE DIRECTIVES: ${input.extraInstructions}\n` : ""}

Synthesize what has changed, preserve any unresolved concerns, and generate the proposed 5-field Case Compass update in strict JSON format.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });

    const rawContent = response.choices?.[0]?.message?.content;
    const contentString = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent || {});
    const parsed = JSON.parse(contentString);

    const validRiskLevels = ["Low", "Moderate", "Elevated", "Urgent"];
    const risk: "Low" | "Moderate" | "Elevated" | "Urgent" = validRiskLevels.includes(parsed.ideaRiskLevel)
      ? parsed.ideaRiskLevel
      : "Moderate";

    return {
      currentStatus: parsed.currentStatus || currentCompass?.currentStatus || "Case active.",
      nextStep: parsed.nextStep || currentCompass?.nextStep || "Review upcoming steps.",
      whoHasBall: parsed.whoHasBall || currentCompass?.whoHasBall || "Waypoint Advocates",
      ideaRiskLevel: risk,
      sourceReferences: Array.isArray(parsed.sourceReferences) ? parsed.sourceReferences : [],
      unresolvedIssues: Array.isArray(parsed.unresolvedIssues) ? parsed.unresolvedIssues : previousUnresolved,
      rationale: parsed.rationale || "AI-synthesized Case Compass update based on recent meeting records.",
      aiModel: CF_MODELS.DEEP,
    };
  } catch (err: any) {
    console.warn("[Compass AI] invokeLLM failed, falling back to heuristic synthesizer:", err?.message || err);
    return generateHeuristicCompassUpdate({
      studentName,
      currentCompass,
      previousUnresolved,
      transcriptText,
      openTasks,
      recentActivities,
    });
  }
}

/**
 * Automatic Meeting Transcription Handoff (Workflow 5)
 * Called when a meeting transcript is finalized or a session completes.
 * 1. Checks if a draft for this meeting already exists to avoid duplicates.
 * 2. Generates a proposed 5-field Case Compass update.
 * 3. Saves it as a pending draft in caseCompassDrafts.
 * 4. Ensures it is NOT automatically published (requires advocate review).
 */
export async function generateAndSaveCompassDraftFromMeeting(params: {
  studentId: number;
  caseId: string;
  meetingId: string;
  meetingTitle?: string;
  transcriptText?: string;
  sourceReferences?: CompassSourceReference[];
}) {
  const { studentId, caseId, meetingId, meetingTitle, transcriptText, sourceReferences } = params;

  // 1. Deduplication check: check if draft for this meetingId already exists
  const existingDrafts = await db.getCaseCompassDrafts(caseId, studentId);
  const alreadyGenerated = existingDrafts.find((d) => d.meetingId === meetingId);
  if (alreadyGenerated) {
    return alreadyGenerated;
  }

  // 2. Generate proposed update
  const aiResult = await generateCaseCompassAiUpdate({
    studentId,
    caseId,
    meetingId,
    meetingTitle,
    transcriptText,
  });

  const mergedSources = (sourceReferences || []).concat(aiResult.sourceReferences || []);

  // 3. Save as reviewable pending draft
  const draft = await db.createCaseCompassDraft({
    caseId,
    studentId,
    currentStatus: aiResult.currentStatus,
    nextStep: aiResult.nextStep,
    whoHasBall: aiResult.whoHasBall,
    ideaRiskLevel: aiResult.ideaRiskLevel,
    meetingId,
    transcriptId: meetingId,
    sourceType: "ai",
    sourceReferences: JSON.stringify(mergedSources),
    unresolvedIssues: JSON.stringify(aiResult.unresolvedIssues || []),
    aiModel: aiResult.aiModel,
    createdBy: `First Mate / Meeting Handoff: ${meetingTitle || meetingId}`,
  });

  return draft;
}
