import {
  BASE_SYSTEM_INSTRUCTION,
  getSessionTypeProfile,
  FAST_ASSIST_SCHEMA,
  DEEP_ASSIST_SCHEMA,
  getRephrasePrompt,
} from "./firstMate/prompts";
import { executeOpenAiChat } from "./firstMate/openAiClient";
import { FirstMateKnowledgeProvider } from "./firstMate/knowledgeProvider";
import type {
  FirstMateSession,
  FirstMateSessionType,
  NormalizedTranscriptEvent,
  FastAssistOutput,
  DeepAssistOutput,
  SayThisStyle,
  FirstMateDevLogEntry,
  TrackedItem,
  FirstMateAlert,
  ConflictDetection,
} from "../shared/firstMate";

export interface FastAssistExecutionResult {
  fastAssist: FastAssistOutput;
  devLog: FirstMateDevLogEntry;
}

export interface DeepAssistExecutionResult {
  deepAssist: DeepAssistOutput;
  devLog: FirstMateDevLogEntry;
}

/**
 * FAST ASSIST: Sub-second live conversational guidance.
 * Produces immediately usable Say This, Ask Next, and Current Issue.
 */
export async function runFastAssist(
  session: FirstMateSession,
  transcript: NormalizedTranscriptEvent[],
  newTurn: NormalizedTranscriptEvent
): Promise<FastAssistExecutionResult> {
  const sessionType = session.sessionType;
  const recentTurns = transcript
    .slice(-8)
    .map(
      (t) =>
        `${t.speakerRole}: "${t.text}"`
    )
    .join("\n");

  const systemPrompt = `${BASE_SYSTEM_INSTRUCTION}

${getSessionTypeProfile(sessionType)}

TASK: FAST ASSIST LIVE GUIDANCE
Produce live, immediate guidance for the Waypoint advocate. Keep responses concise enough to read in 3 seconds.`;

  const userPrompt = `Active Session: ${session.title || sessionType}
Attached: ${session.attachedName || "Student"} (${session.attachedSubtitle || ""})
Active Thread: ${session.sessionState.currentTopic || "General Discussion"}

Recent Conversation:
${recentTurns}

Latest Speaker Turn:
${newTurn.speakerRole}: "${newTurn.text}"`;

  const result = await executeOpenAiChat<FastAssistOutput>({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: FAST_ASSIST_SCHEMA,
    },
    temperature: 0.2,
    stage: "FAST",
  });

  if (result.success && result.data?.quickAssist?.sayThis) {
    return {
      fastAssist: result.data,
      devLog: result.devLog,
    };
  }

  // Resilient deterministic fallback
  return {
    fastAssist: generateFallbackFastAssist(newTurn, session),
    devLog: result.devLog,
  };
}

/**
 * DEEP ASSIST: Background reasoning and rolling memory enrichment.
 * Analyzes rolling memory, facts to check, new trackable detections,
 * conversation threads, and cross-turn conflict detection.
 */
export async function runDeepAssist(
  session: FirstMateSession,
  transcript: NormalizedTranscriptEvent[],
  newTurn: NormalizedTranscriptEvent
): Promise<DeepAssistExecutionResult> {
  const sessionType = session.sessionType;
  const fullTranscriptText = transcript
    .map(
      (t, idx) =>
        `[#${idx + 1}] ${t.speakerRole}: "${t.text}"`
    )
    .join("\n");

  const existingTrackedSummary = [
    ...session.requests.map((r) => `[REQUEST] ${r.summary}`),
    ...session.refusals.map((r) => `[REFUSAL] ${r.summary}`),
    ...session.commitments.map((c) => `[COMMITMENT] ${c.summary}`),
    ...session.proposals.map((p) => `[PROPOSAL] ${p.summary}`),
  ].join("; ");

  const systemPrompt = `${BASE_SYSTEM_INSTRUCTION}

${getSessionTypeProfile(sessionType)}

TASK: DEEP ASSIST & ROLLING MEMORY
Analyze the full conversation history.
1. Check for cross-turn conflicts or contradictions between earlier statements and current statements (e.g. parent stated request was sent on Aug 12, school later claims no request received).
2. Extract new trackable items (Requests, Refusals, Proposals, Commitments, Important Dates). Do NOT duplicate dismissed items.
3. Provide Why It Matters and facts to verify.`;

  const userPrompt = `Attached Client: ${session.attachedName || "Student"}
Dismissed Item IDs: ${session.dismissedItemIds?.join(", ") || "None"}
Existing Tracked Items: ${existingTrackedSummary || "None"}
Current Working Memory: ${JSON.stringify(session.sessionState)}

Full Session Transcript:
${fullTranscriptText}

Latest Turn Analyzed:
${newTurn.speakerRole}: "${newTurn.text}"`;

  const result = await executeOpenAiChat<DeepAssistOutput>({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: DEEP_ASSIST_SCHEMA,
    },
    temperature: 0.3,
    stage: "DEEP",
  });

  if (result.success && result.data?.whyItMatters) {
    // Enrich with verified sources or safe safeguard
    const activeTopic = result.data.activeThreadName || session.sessionState.currentTopic || "General";
    const sources = FirstMateKnowledgeProvider.getSourcesForTopic(activeTopic);

    return {
      deepAssist: {
        ...result.data,
        sources,
      },
      devLog: result.devLog,
    };
  }

  // Resilient deterministic fallback
  return {
    deepAssist: generateFallbackDeepAssist(newTurn, session, transcript),
    devLog: result.devLog,
  };
}

/**
 * REPHRASE SAY THIS: Instant alternative phrasing (Softer, Firmer, Shorter, Another Version).
 */
export async function rephraseSayThis(
  currentSayThis: string,
  style: SayThisStyle,
  sessionType: FirstMateSessionType
): Promise<{ text: string; devLog: FirstMateDevLogEntry }> {
  const prompt = getRephrasePrompt(currentSayThis, style, sessionType);

  const result = await executeOpenAiChat({
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
    stage: "REPHRASE",
  });

  if (result.success && result.rawContent) {
    const cleaned = result.rawContent.replace(/^["']|["']$/g, "").trim();
    return { text: cleaned, devLog: result.devLog };
  }

  // Fallback rephrasing heuristics
  let fallbackText = currentSayThis;
  switch (style) {
    case "softer":
      fallbackText = `Could we walk through the specific information the team is looking at to determine this?`;
      break;
    case "firmer":
      fallbackText = `Is the team formally denying the parent's request on the record today?`;
      break;
    case "shorter":
      fallbackText = `What data supports that conclusion?`;
      break;
    case "another_version":
      fallbackText = `Help me understand how the team reached that decision without formal progress monitoring.`;
      break;
    case "followup_question":
      fallbackText = `When was the student's baseline last measured in this area?`;
      break;
  }

  return { text: fallbackText, devLog: result.devLog };
}

/**
 * ASK FIRST MATE: Contextual Q&A using full active session memory.
 */
export async function askFirstMate(session: FirstMateSession, query: string): Promise<string> {
  const transcriptSummary = session.transcript
    .slice(-25)
    .map((t) => `${t.speakerRole}: "${t.text}"`)
    .join("\n");

  const trackedSummary = [
    ...session.requests.map((r) => `[Request by ${r.speaker}] ${r.summary}`),
    ...session.refusals.map((r) => `[Refusal by ${r.speaker}] ${r.summary}`),
    ...session.proposals.map((p) => `[Proposal by ${p.speaker}] ${p.summary}`),
    ...session.commitments.map((c) => `[Commitment by ${c.speaker}] ${c.summary}`),
  ].join("\n");

  const prompt = `${BASE_SYSTEM_INSTRUCTION}

${getSessionTypeProfile(session.sessionType)}

You are answering the Waypoint advocate during an active conversation.
Answer directly, tactically, and concisely in 2-3 sentences.
Resolve pronouns (he/she/they/mom/school) using the transcript context.
If something is not in the transcript, say "Not specified in the conversation so far."`;

  const result = await executeOpenAiChat({
    messages: [
      { role: "system", content: prompt },
      {
        role: "user",
        content: `Transcript:\n${transcriptSummary || "(No transcript entries)"}\n\nTracked Items:\n${trackedSummary || "(None)"}\n\nAdvocate Query: "${query}"`,
      },
    ],
    temperature: 0.3,
    stage: "ASK",
  });

  if (result.success && result.rawContent) {
    return result.rawContent.trim();
  }

  // Fallback heuristic answers
  const q = query.toLowerCase();
  if (q.includes("what should i ask") || q.includes("ask next")) {
    return session.liveAssist?.askNext?.[0] || "Ask for the specific baseline data the team is relying upon.";
  }
  if (q.includes("refuse") || q.includes("denied")) {
    const refusals = session.refusals.map((r) => r.summary).join("; ");
    return refusals
      ? `The school has declined: ${refusals}. Request formal Prior Written Notice (PWN).`
      : "No formal refusals have been confirmed yet in this session.";
  }
  if (q.includes("request") || q.includes("mom request")) {
    const requests = session.requests.map((r) => r.summary).join("; ");
    return requests ? `Parent requests logged: ${requests}.` : "No specific parent requests logged yet.";
  }
  if (q.includes("commit")) {
    const commitments = session.commitments.map((c) => c.summary).join("; ");
    return commitments ? `Team commitments: ${commitments}.` : "No formal commitments logged yet.";
  }
  if (q.includes("summarize") || q.includes("happened")) {
    return `Active ${session.sessionType} discussing: ${session.liveAssist?.currentIssue || "team observations"}. ${session.refusals.length} refusal(s) and ${session.requests.length} request(s) tracked.`;
  }
  return "Based on the conversation: verify baseline progress data and ensure parent concerns are entered into the written meeting minutes.";
}

/**
 * GENERATE SESSION SUMMARY: Structured meeting / call draft summary.
 */
export async function generateSessionSummary(session: FirstMateSession): Promise<string> {
  const isMeeting = session.sessionType === "IEP_MEETING" || session.sessionType === "SECTION_504_MEETING";
  const transcriptText = session.transcript
    .map(
      (t) =>
        `${t.speakerRole} (${new Date(t.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}): ${t.text}`
    )
    .join("\n");

  const promptStructure = isMeeting
    ? `Generate an IEP / Section 504 Meeting Summary with:
### Meeting Purpose
### Parent Concerns
### Requests Made
### Proposals & Options Considered
### Requests Granted & Commitments
### Requests Refused & Reasons Given
### Services & Accommodations Discussed
### Open Issues & Unresolved Questions
### Immediate Follow-Up Actions & Deadlines`
    : `Generate a Call / Strategy Summary with:
### Reason for Call
### Key Discussion Points
### Requests & Inquiries
### School / Client Responses
### Open Issues
### Recommended Next Steps & Follow-Up`;

  const result = await executeOpenAiChat({
    messages: [
      {
        role: "system",
        content: `${BASE_SYSTEM_INSTRUCTION}\n\nGenerate an editable, factual advocate summary for this ${session.sessionType}. Use Markdown format. Mark unverified details as [Pending Verification].`,
      },
      {
        role: "user",
        content: `${promptStructure}\n\nTranscript:\n${transcriptText || "(No transcript recorded)"}\n\nRequests: ${JSON.stringify(session.requests)}\nRefusals: ${JSON.stringify(session.refusals)}\nCommitments: ${JSON.stringify(session.commitments)}`,
      },
    ],
    temperature: 0.2,
    stage: "SUMMARY",
  });

  if (result.success && result.rawContent) {
    return result.rawContent.trim();
  }

  // Fallback summary template
  if (isMeeting) {
    return `### Meeting Purpose
${session.title || "Annual IEP Review / Evaluation Discussion"} for ${session.attachedName || "Student"}.

### Parent Concerns
${session.requests.map((r) => `- ${r.summary}`).join("\n") || "- Academic progress and support levels."}

### Requests Made
${session.requests.map((r) => `- [${r.speaker}] ${r.summary}`).join("\n") || "- Initial evaluation request."}

### Requests Refused & Reasons Given
${session.refusals.map((r) => `- ${r.summary}`).join("\n") || "- None formally logged."}

### Team Commitments
${session.commitments.map((c) => `- ${c.summary}`).join("\n") || "- Review updated progress monitoring data."}

### Open Issues
${session.openIssues.map((o) => `- ${o.summary}`).join("\n") || "- Prior Written Notice (PWN) documentation."}

### Immediate Follow-Up Actions
- Request formal Prior Written Notice (PWN) within 5 school days.
- Confirm receipt of evaluation consent documents.
- Review draft meeting minutes.`;
  }

  return `### Reason for Call
${session.title || "Advocacy Consultation Call"} regarding ${session.attachedName || "Student"}.

### Key Discussion Points
- Current school placement and teacher observations.
- Parent concerns and historical IEP service implementation.

### Requests & Inquiries
${session.requests.map((r) => `- ${r.summary}`).join("\n") || "- Initial intake discussion."}

### Next Steps & Follow-Up
- Schedule full strategy call or IEP pre-meeting review.
- Gather existing educational evaluations and progress reports.`;
}

// ─── DETERMINISTIC FALLBACK HELPERS (For offline testing resilience) ───

function generateFallbackFastAssist(
  newTurn: NormalizedTranscriptEvent,
  session: FirstMateSession
): FastAssistOutput {
  const text = newTurn.text.toLowerCase();
  const role = newTurn.speakerRole;

  if (
    (role === "School" || role === "Administrator" || role === "Teacher") &&
    (text.includes("don't believe an evaluation") ||
      text.includes("not necessary") ||
      text.includes("passing") ||
      text.includes("won't evaluate"))
  ) {
    return {
      currentIssue: {
        label: "Possible Evaluation Refusal",
        description: "School is declining to conduct an evaluation despite parent concerns.",
        priority: "High Priority",
        confidence: "High",
      },
      quickAssist: {
        sayThis: "What data is the team relying on to determine that an evaluation is not necessary?",
        askNext: "Was the parent's evaluation request made in writing?",
      },
      alert: {
        type: "POSSIBLE_REFUSAL",
        severity: "critical",
        message: "Possible evaluation refusal detected. Request data basis and PWN.",
      },
      confidence: "High",
    };
  }

  if (text.includes("reduce") || text.includes("cut") || text.includes("30 minutes")) {
    return {
      currentIssue: {
        label: "Proposed Service Reduction",
        description: "Team has proposed decreasing service frequency or minutes.",
        priority: "High Priority",
        confidence: "High",
      },
      quickAssist: {
        sayThis: "What objective baseline data demonstrates that the student can maintain progress with fewer minutes?",
        askNext: "Has the student met all previous annual goals in this service area?",
      },
      alert: {
        type: "SERVICE_REDUCTION",
        severity: "attention",
        message: "Proposed service reduction. Check objective progress monitoring data.",
      },
      confidence: "High",
    };
  }

  if (role === "Parent" && (text.includes("want") || text.includes("request") || text.includes("testing") || text.includes("evaluate"))) {
    return {
      currentIssue: {
        label: "Parent Request Logged",
        description: "Parent has formally stated a concern or requested testing.",
        priority: "Standard",
        confidence: "High",
      },
      quickAssist: {
        sayThis: "Let's make sure this specific request is documented in the meeting notes.",
        askNext: "When was the request submitted?",
      },
      alert: {
        type: "PARENT_REQUEST_DETECTED",
        severity: "info",
        message: "Parent request logged. Confirm response in meeting notes.",
      },
      confidence: "High",
    };
  }

  return {
    currentIssue: {
      label: session.liveAssist?.currentIssue || "Ongoing Discussion",
      description: session.liveAssist?.currentIssueDescription || "Reviewing present levels and team observations.",
      priority: "Standard",
      confidence: "Medium",
    },
    quickAssist: {
      sayThis: "Could you clarify how that impacts the student's daily classroom performance?",
      askNext: "What accommodations have been most effective so far?",
    },
    alert: null,
    confidence: "Medium",
  };
}

function generateFallbackDeepAssist(
  newTurn: NormalizedTranscriptEvent,
  session: FirstMateSession,
  transcript: NormalizedTranscriptEvent[]
): DeepAssistOutput {
  const text = newTurn.text.toLowerCase();
  const role = newTurn.speakerRole;

  // Check for Scenario 4 conflict detection:
  // Parent stated evaluation request sent earlier, school claims never received
  const earlierDateTurn = transcript.find(
    (t) =>
      t.speakerRole === "Parent" &&
      (t.text.toLowerCase().includes("august") || t.text.toLowerCase().includes("sent") || t.text.toLowerCase().includes("requested testing"))
  );

  const isSchoolDenyingReceipt =
    (role === "School" || role === "Administrator") &&
    (text.includes("haven't received") || text.includes("never received") || text.includes("no record of"));

  const conflicts: ConflictDetection[] = [];
  if (earlierDateTurn && isSchoolDenyingReceipt) {
    conflicts.push({
      id: `conflict-${Date.now()}`,
      title: "Potential Timeline Conflict",
      message: `Earlier in this session the parent stated the evaluation request was submitted ("${earlierDateTurn.text}"). The school now states they have not received it.`,
      earlierStatement: earlierDateTurn.text,
      currentStatement: newTurn.text,
      timestamp: Date.now(),
      resolved: false,
    });
  }

  const detections: DeepAssistOutput["detections"] = [];
  if (
    (role === "School" || role === "Administrator") &&
    (text.includes("don't believe") || text.includes("not necessary") || text.includes("passing"))
  ) {
    detections.push({
      type: "POSSIBLE_REFUSAL" as const,
      summary: "Evaluation request declined citing passing grades",
      confidence: "High" as const,
      supportingTranscriptText: newTurn.text,
    });
  }

  if (text.includes("reduce speech") || text.includes("30 minutes")) {
    detections.push({
      type: "PROPOSAL" as const,
      summary: "Proposed reduction of speech therapy to 30 minutes",
      confidence: "High" as const,
      supportingTranscriptText: newTurn.text,
    });
  }

  if (text.includes("transition warnings") && text.includes("can")) {
    detections.push({
      type: "COMMITMENT" as const,
      summary: "Team agreed to add transition warnings to accommodations",
      confidence: "High" as const,
      supportingTranscriptText: newTurn.text,
    });
  }

  const sources = FirstMateKnowledgeProvider.getSourcesForTopic(text);

  return {
    whyItMatters:
      "Parents have the right to request an evaluation at any time. The school must consider the request and cannot deny it without a proper review of all available data and a formal Prior Written Notice.",
    check: [
      "Confirm method of delivery and date of initial written request.",
      "Verify whether classroom performance data includes reading fluency baselines.",
      "Check if 60-day evaluation timeline was initiated.",
    ],
    detections,
    sessionStateUpdates: {
      currentTopic: detections[0]?.summary || "Educational Evaluation & Services",
    },
    followUp: ["Request Prior Written Notice (PWN)", "Confirm evaluation consent forms"],
    activeThreadName: detections[0]?.summary ? "Initial Evaluation" : undefined,
    conflicts,
    sources,
  };
}

/**
 * Unified turn analysis executing both Fast Assist and Deep Assist.
 * Backward compatible with tests and legacy callers.
 */
export async function analyzeTranscriptTurn(
  session: FirstMateSession,
  transcript: NormalizedTranscriptEvent[],
  newTurn: NormalizedTranscriptEvent
) {
  const [fastRes, deepRes] = await Promise.all([
    runFastAssist(session, transcript, newTurn),
    runDeepAssist(session, transcript, newTurn),
  ]);

  const newTrackedItems: TrackedItem[] = deepRes.deepAssist.detections.map((d) => ({
    id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: d.type,
    summary: d.summary,
    speaker: newTurn.speakerRole,
    timestamp: Date.now(),
    status: "detected" as const,
    supportingTranscriptText: d.supportingTranscriptText || newTurn.text,
  }));

  return {
    liveAssist: {
      currentIssue: fastRes.fastAssist.currentIssue.label,
      currentIssuePriority: fastRes.fastAssist.currentIssue.priority || "High Priority",
      currentIssueDescription: fastRes.fastAssist.currentIssue.description,
      sayThis: fastRes.fastAssist.quickAssist.sayThis,
      askNext: [fastRes.fastAssist.quickAssist.askNext, ...(session.liveAssist?.askNext || []).slice(0, 2)].filter(Boolean),
      whyItMatters: deepRes.deepAssist.whyItMatters,
      confidence: fastRes.fastAssist.confidence,
      sources: deepRes.deepAssist.sources,
      quickAnswer: fastRes.fastAssist.quickAssist.sayThis,
    },
    newTrackedItems,
    alerts: fastRes.fastAssist.alert
      ? [
          {
            id: `alert-${Date.now()}`,
            type: fastRes.fastAssist.alert.type,
            title: fastRes.fastAssist.alert.message,
            message: fastRes.fastAssist.alert.message,
            timestamp: Date.now(),
            dismissed: false,
          },
        ]
      : [],
    sessionStateUpdates: deepRes.deepAssist.sessionStateUpdates,
    conflicts: deepRes.deepAssist.conflicts || [],
  };
}
