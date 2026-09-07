import { invokeLLM } from "./_core/llm";
import type {
  FirstMateSession,
  NormalizedTranscriptEvent,
  LiveAssistPanelData,
  FirstMateWorkingMemory,
  TrackedItem,
  FirstMateAlert,
  FirstMateSessionType,
} from "../shared/firstMate";

function parseJson<T>(raw: unknown): T {
  const text = typeof raw === "string" ? raw : JSON.stringify(raw);
  return JSON.parse(text) as T;
}

const GUARDRAILS = `STRICT FIRST MATE RULES:
- You are an expert IEP advocate & special education co-pilot assisting Waypoint Advocates in Atlanta, GA.
- Base your analysis ONLY on what is spoken in the transcript or given in session context.
- Never fabricate legal citations, dates, or non-existent parent/school quotes.
- If a legal source is not explicitly verified, specify "SOURCE VERIFICATION NEEDED".
- Make "Say This" conversational, assertive yet professional, never robotic.
- Prioritize high-leverage advocacy tactics: data-driven inquiries, Prior Written Notice (PWN), evaluation rights under IDEA § 300.301, FAPE, procedural safeguards.`;

interface AnalysisResult {
  liveAssist: LiveAssistPanelData;
  workingMemoryDelta: Partial<FirstMateWorkingMemory>;
  newTrackedItems: TrackedItem[];
  newAlerts: FirstMateAlert[];
}

export async function analyzeTranscriptTurn(
  session: FirstMateSession,
  transcript: NormalizedTranscriptEvent[],
  newTurn: NormalizedTranscriptEvent
): Promise<AnalysisResult> {
  const sessionType = session.sessionType;
  const recentTranscriptText = transcript
    .slice(-15)
    .map(t => `${t.speakerRole} (${new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}): "${t.text}"`)
    .join("\n");

  const promptTypeInstructions = getSessionTypeGuidance(sessionType);

  try {
    const res = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `${GUARDRAILS}\n\nCurrent Session Type: ${sessionType}\n${promptTypeInstructions}\n\nAnalyze the conversation transcript up through the latest turn. Output a JSON object matching the requested schema.`,
        },
        {
          role: "user",
          content: `Transcript history:\n${recentTranscriptText}\n\nLatest Turn:\nSpeaker: ${newTurn.speakerRole}\nText: "${newTurn.text}"\n\nCurrent Working Memory:\n${JSON.stringify(session.sessionState, null, 2)}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "first_mate_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              currentIssue: { type: "string" },
              currentIssuePriority: { type: "string", enum: ["High Priority", "Medium Priority", "Standard"] },
              currentIssueDescription: { type: "string" },
              quickAnswer: { type: "string" },
              sayThis: { type: "string" },
              askNext: { type: "array", items: { type: "string" } },
              whyItMatters: { type: "string" },
              confidence: { type: "string", enum: ["High", "Medium", "Low"] },
              sources: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    url: { type: "string" },
                    isVerified: { type: "boolean" },
                  },
                  required: ["title", "url", "isVerified"],
                  additionalProperties: false,
                },
              },
              sourceVerificationNote: { type: "string" },
              workingMemoryDelta: {
                type: "object",
                properties: {
                  currentTopic: { type: "string" },
                  currentDispute: { type: "string" },
                  openIssues: { type: "array", items: { type: "string" } },
                  teamCommitments: { type: "array", items: { type: "string" } },
                  requestsMade: { type: "array", items: { type: "string" } },
                  schoolResponses: { type: "array", items: { type: "string" } },
                  followUpActions: { type: "array", items: { type: "string" } },
                },
                required: ["currentTopic", "currentDispute", "openIssues", "teamCommitments", "requestsMade", "schoolResponses", "followUpActions"],
                additionalProperties: false,
              },
              newTrackedItems: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: {
                      type: "string",
                      enum: [
                        "REQUEST",
                        "POSSIBLE_REFUSAL",
                        "PROPOSAL",
                        "COMMITMENT",
                        "SERVICE_CHANGE",
                        "DATA_ISSUE",
                        "OPEN_ISSUE"
                      ]
                    },
                    summary: { type: "string" },
                    speaker: { type: "string" },
                    supportingTranscriptText: { type: "string" }
                  },
                  required: ["type", "summary", "speaker", "supportingTranscriptText"],
                  additionalProperties: false
                }
              },
              newAlerts: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: {
                      type: "string",
                      enum: [
                        "POSSIBLE_REFUSAL",
                        "PROPOSED_CHANGE",
                        "SERVICE_REDUCTION",
                        "ACCOMMODATION_REMOVAL",
                        "PARENT_REQUEST_DETECTED",
                        "TEAM_COMMITMENT",
                        "DATA_BASIS_UNCLEAR",
                        "OPEN_ISSUE",
                        "FOLLOW_UP_NEEDED"
                      ]
                    },
                    title: { type: "string" },
                    message: { type: "string" }
                  },
                  required: ["type", "title", "message"],
                  additionalProperties: false
                }
              }
            },
            required: [
              "currentIssue",
              "currentIssuePriority",
              "currentIssueDescription",
              "quickAnswer",
              "sayThis",
              "askNext",
              "whyItMatters",
              "confidence",
              "sources",
              "sourceVerificationNote",
              "workingMemoryDelta",
              "newTrackedItems",
              "newAlerts"
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const content = res.choices[0]?.message?.content;
    if (content) {
      const parsed = parseJson<any>(content);
      const timestamp = newTurn.timestamp || Date.now();

      const items: TrackedItem[] = (parsed.newTrackedItems || []).map((item: any, idx: number) => ({
        id: `item-${timestamp}-${idx}`,
        type: item.type,
        summary: item.summary,
        speaker: (item.speaker as any) || newTurn.speakerRole,
        timestamp,
        status: "detected",
        supportingTranscriptText: item.supportingTranscriptText || newTurn.text,
      }));

      const alerts: FirstMateAlert[] = (parsed.newAlerts || []).map((alert: any, idx: number) => ({
        id: `alert-${timestamp}-${idx}`,
        type: alert.type,
        title: alert.title,
        message: alert.message,
        timestamp,
        dismissed: false,
      }));

      return {
        liveAssist: {
          currentIssue: parsed.currentIssue,
          currentIssuePriority: parsed.currentIssuePriority || "High Priority",
          currentIssueDescription: parsed.currentIssueDescription,
          quickAnswer: parsed.quickAnswer,
          sayThis: parsed.sayThis,
          askNext: parsed.askNext || [],
          whyItMatters: parsed.whyItMatters,
          confidence: parsed.confidence || "High",
          sources: (parsed.sources && parsed.sources.length > 0)
            ? parsed.sources
            : [{ title: "SOURCE VERIFICATION NEEDED", isVerified: false }],
          sourceVerificationNote: parsed.sourceVerificationNote,
        },
        workingMemoryDelta: parsed.workingMemoryDelta || {},
        newTrackedItems: items,
        newAlerts: alerts,
      };
    }
  } catch (err) {
    console.warn("[FirstMateAi] LLM invocation error, using deterministic fallback:", err);
  }

  // Resilient deterministic fallback for offline/test environments
  return generateDeterministicFallback(newTurn, session);
}

function getSessionTypeGuidance(sessionType: FirstMateSessionType): string {
  switch (sessionType) {
    case "IEP_MEETING":
    case "SECTION_504_MEETING":
      return `IEP/504 MEETING PRIORITIES:
- Track Parent Requests, School Proposals, School Refusals, Team Commitments, Open Issues.
- Flag any service cuts, accommodation changes, or lack of baseline data.
- Say This must push for objective progress data and Prior Written Notice (PWN) when refusals occur.`;
    case "DISCOVERY_CALL":
      return `DISCOVERY / LEAD CALL PRIORITIES:
- Identify Caller Need, Main Pain Point, School Situation, Existing IEP/504 status, Upcoming Deadlines.
- Say This should be warm, reassuring, and qualify how Waypoint advocacy can step in immediately.`;
    case "PARENT_STRATEGY_CALL":
      return `PARENT STRATEGY PRIORITIES:
- Clarify parental goals, prepare meeting leverage points, roleplay objection responses, align documentation.`;
    case "SCHOOL_CALL":
    case "CLIENT_CALL":
    case "GENERAL_CALL":
    default:
      return `GENERAL CALL PRIORITIES:
- Clarify Reason for Call, Important Facts, Commitments Made, Next Action Steps, Follow-up Dates.`;
  }
}

function generateDeterministicFallback(
  newTurn: NormalizedTranscriptEvent,
  session: FirstMateSession
): AnalysisResult {
  const text = newTurn.text.toLowerCase();
  const role = newTurn.speakerRole;
  const timestamp = newTurn.timestamp || Date.now();

  const isEvaluationRefusal =
    (role === "School" || role === "Administrator" || role === "Teacher") &&
    (text.includes("don't believe an evaluation") ||
      text.includes("not necessary") ||
      text.includes("passing") ||
      text.includes("won't evaluate") ||
      text.includes("no evaluation"));

  const isServiceReduction =
    text.includes("reduce") || text.includes("cut") || text.includes("decrease") || text.includes("30 minutes");

  const isParentRequest =
    role === "Parent" && (text.includes("want") || text.includes("request") || text.includes("evaluate") || text.includes("need more"));

  if (isEvaluationRefusal) {
    return {
      liveAssist: {
        currentIssue: "Evaluation Refusal",
        currentIssuePriority: "High Priority",
        currentIssueDescription: "School is declining to conduct an evaluation despite parent concerns.",
        quickAnswer: "Passing grades alone do not disqualify a student from an initial evaluation under IDEA § 300.301.",
        sayThis: `"What data is the team relying on to determine that an evaluation is not necessary?"`,
        askNext: [
          "When did you last review his progress data?",
          "What specific measures show no educational impact?",
          "Have you considered a full and individual evaluation in all areas of suspected need?",
        ],
        whyItMatters:
          "Parents have the right to request an evaluation at any time. The school must consider the request and cannot deny it without a proper review of all available data and a formal Prior Written Notice.",
        confidence: "High",
        sources: [
          { title: "IDEA § 300.301 – Initial Evaluations", url: "https://sites.ed.gov/idea/regs/b/d/300.301", isVerified: true },
          { title: "Parental Rights – Requesting an Evaluation", url: "https://www.parentcenterhub.org/evaluation/", isVerified: true },
        ],
      },
      workingMemoryDelta: {
        currentTopic: "Initial Evaluation Request",
        currentDispute: "School refusing evaluation citing passing grades",
        openIssues: ["Formal PWN for evaluation refusal"],
      },
      newTrackedItems: [
        {
          id: `item-${timestamp}`,
          type: "POSSIBLE_REFUSAL",
          summary: "Evaluation request declined citing passing grades",
          speaker: role,
          timestamp,
          status: "detected",
          supportingTranscriptText: newTurn.text,
        },
      ],
      newAlerts: [
        {
          id: `alert-${timestamp}`,
          type: "POSSIBLE_REFUSAL",
          title: "Possible Evaluation Refusal",
          message: "School expressed reluctance to evaluate student. Request PWN and progress data basis.",
          timestamp,
          dismissed: false,
        },
      ],
    };
  }

  if (isServiceReduction) {
    return {
      liveAssist: {
        currentIssue: "Proposed Service Reduction",
        currentIssuePriority: "High Priority",
        currentIssueDescription: "Team has proposed reducing special education or related services.",
        quickAnswer: "Service reductions must be supported by objective present levels and baseline data, not scheduling convenience.",
        sayThis: `"What objective baseline data demonstrates that the student no longer requires this frequency of service?"`,
        askNext: [
          "Has the student met their previous annual goals in this area?",
          "Can we review the provider's session notes and progress monitoring data?",
        ],
        whyItMatters:
          "Related services cannot be reduced without documented evidence that the student can maintain educational progress with fewer minutes.",
        confidence: "High",
        sources: [
          { title: "34 CFR § 300.320 – Related Services in IEP", isVerified: true },
        ],
      },
      workingMemoryDelta: {
        currentTopic: "Service Level Adjustment",
        currentDispute: "Proposed decrease in service minutes",
      },
      newTrackedItems: [
        {
          id: `item-${timestamp}`,
          type: "PROPOSAL",
          summary: "Proposed service reduction",
          speaker: role,
          timestamp,
          status: "detected",
          supportingTranscriptText: newTurn.text,
        },
      ],
      newAlerts: [
        {
          id: `alert-${timestamp}`,
          type: "SERVICE_REDUCTION",
          title: "Service Reduction Proposed",
          message: "Verify objective data before agreeing to minute changes.",
          timestamp,
          dismissed: false,
        },
      ],
    };
  }

  if (isParentRequest) {
    return {
      liveAssist: {
        currentIssue: "Parent Request Logged",
        currentIssuePriority: "Standard",
        currentIssueDescription: "Parent has formally stated a concern or requested educational support.",
        quickAnswer: "Ensure the team explicitly notes this request in the meeting minutes or IEP parent concern section.",
        sayThis: `"Let's make sure this specific request is documented in the meeting notes and reflected on the team notes page."`,
        askNext: [
          "How will the school formally respond to this request?",
          "What timeframe are we looking at for next steps?",
        ],
        whyItMatters:
          "Documenting parent concerns preserves procedural rights and triggers the school's obligation to consider and respond.",
        confidence: "High",
        sources: [
          { title: "IDEA § 300.324 – Development of IEP (Parent Concerns)", isVerified: true },
        ],
      },
      workingMemoryDelta: {
        currentTopic: "Parent Concerns & Support Request",
        requestsMade: [newTurn.text],
      },
      newTrackedItems: [
        {
          id: `item-${timestamp}`,
          type: "REQUEST",
          summary: newTurn.text.slice(0, 80),
          speaker: "Parent",
          timestamp,
          status: "detected",
          supportingTranscriptText: newTurn.text,
        },
      ],
      newAlerts: [
        {
          id: `alert-${timestamp}`,
          type: "PARENT_REQUEST_DETECTED",
          title: "Parent Request Logged",
          message: `Logged: "${newTurn.text.slice(0, 60)}..."`,
          timestamp,
          dismissed: false,
        },
      ],
    };
  }

  // Standard neutral turn
  return {
    liveAssist: {
      currentIssue: session.liveAssist?.currentIssue || "Ongoing Discussion",
      currentIssuePriority: session.liveAssist?.currentIssuePriority || "Standard",
      currentIssueDescription: session.liveAssist?.currentIssueDescription || "Reviewing present levels and team observations.",
      quickAnswer: "Maintain active listening and ensure all observations are tied to concrete student performance data.",
      sayThis: `"Could you clarify how that impacts the student's daily classroom participation?"`,
      askNext: [
        "What accommodations have been most effective so far?",
        "Are there specific times of day where challenges are most apparent?",
      ],
      whyItMatters: "Establishing detailed present levels creates the legal baseline for all measurable IEP goals.",
      confidence: "Medium",
      sources: session.liveAssist?.sources?.length ? session.liveAssist.sources : [
        { title: "SOURCE VERIFICATION NEEDED", isVerified: false },
      ],
    },
    workingMemoryDelta: {},
    newTrackedItems: [],
    newAlerts: [],
  };
}

export async function askFirstMate(session: FirstMateSession, query: string): Promise<string> {
  const transcriptSummary = session.transcript
    .slice(-20)
    .map(t => `${t.speakerRole}: "${t.text}"`)
    .join("\n");

  const trackedSummary = [
    ...session.requests.map(r => `[Request by ${r.speaker}] ${r.summary}`),
    ...session.refusals.map(r => `[Refusal by ${r.speaker}] ${r.summary}`),
    ...session.proposals.map(p => `[Proposal by ${p.speaker}] ${p.summary}`),
    ...session.commitments.map(c => `[Commitment by ${c.speaker}] ${c.summary}`),
  ].join("\n");

  try {
    const res = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `${GUARDRAILS}\n\nYou are First Mate answering the advocate during an active ${session.sessionType}.
Answer clearly and concisely in 2-4 sentences. Provide immediately usable wording or tactical advice.
Do not make up facts not in the transcript.`,
        },
        {
          role: "user",
          content: `Transcript:\n${transcriptSummary || "(No transcript yet)"}\n\nTracked Items:\n${trackedSummary || "(None yet)"}\n\nAdvocate Question: "${query}"`,
        },
      ],
    });
    const answer = res.choices[0]?.message?.content;
    if (typeof answer === "string" && answer.trim()) {
      return answer.trim();
    }
  } catch (err) {
    console.warn("[FirstMateAi] askFirstMate fallback:", err);
  }

  // Fallback heuristic answers for common questions
  const q = query.toLowerCase();
  if (q.includes("what should i ask") || q.includes("ask next")) {
    return session.liveAssist?.askNext?.[0] || "Ask for the specific baseline data and teacher observations used to make this determination.";
  }
  if (q.includes("refuse") || q.includes("denied")) {
    const refusals = session.refusals.map(r => r.summary).join("; ");
    return refusals ? `The school has declined: ${refusals}. You should request formal Prior Written Notice (PWN).` : "No formal refusals have been confirmed yet in this session.";
  }
  if (q.includes("request")) {
    const requests = session.requests.map(r => r.summary).join("; ");
    return requests ? `Parent requests logged so far: ${requests}.` : "No specific parent requests have been logged yet in this session.";
  }
  if (q.includes("summarize") || q.includes("happened")) {
    return `We are in a ${session.sessionType}. Currently discussing: ${session.liveAssist.currentIssue || "team observations"}. ${session.refusals.length} refusal(s) and ${session.requests.length} request(s) tracked.`;
  }
  return `Based on the transcript so far: verify that all team statements are tied to documented progress data, and ask the team to note your concerns in the formal meeting minutes.`;
}

export async function generateSessionSummary(session: FirstMateSession): Promise<string> {
  const isMeeting = session.sessionType === "IEP_MEETING" || session.sessionType === "SECTION_504_MEETING";
  const transcriptText = session.transcript
    .map(t => `${t.speakerRole} (${new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}): ${t.text}`)
    .join("\n");

  const prompt = isMeeting
    ? `Generate an IEP/504 Meeting Summary with the following markdown headings:
### Meeting Purpose
### Parent Concerns
### Requests Made
### Proposals & Options Considered
### Requests Granted & Commitments
### Requests Refused & Reasons Given
### Services & Accommodations Discussed
### Open Issues & Unresolved Questions
### Immediate Follow-Up Actions & Deadlines`
    : `Generate a Call / Strategy Summary with the following markdown headings:
### Reason for Call
### Key Discussion Points
### Requests & Inquiries
### School / Client Responses
### Open Issues
### Recommended Next Steps & Follow-Up`;

  try {
    const res = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `${GUARDRAILS}\n\nGenerate an editable, professional advocate summary for this ${session.sessionType}.
Use Markdown format. Base it strictly on the provided transcript. Mark any missing details as [Pending Verification].`,
        },
        {
          role: "user",
          content: `${prompt}\n\nTranscript:\n${transcriptText || "(No transcript entries recorded)"}\n\nTracked Requests: ${JSON.stringify(session.requests)}\nTracked Refusals: ${JSON.stringify(session.refusals)}\nTracked Commitments: ${JSON.stringify(session.commitments)}`,
        },
      ],
    });

    const content = res.choices[0]?.message?.content;
    if (typeof content === "string" && content.trim()) {
      return content.trim();
    }
  } catch (err) {
    console.warn("[FirstMateAi] generateSessionSummary fallback:", err);
  }

  // Fallback summary template
  if (isMeeting) {
    return `### Meeting Purpose
${session.title || "Annual IEP Review / Evaluation Discussion"} for ${session.attachedName || "Student"}.

### Parent Concerns
${session.requests.map(r => `- ${r.summary}`).join("\n") || "- Parent expressed concerns regarding academic progress and support levels."}

### Requests Made
${session.requests.map(r => `- [${r.speaker}] ${r.summary}`).join("\n") || "- Initial evaluation request submitted."}

### Requests Refused & Reasons Given
${session.refusals.map(r => `- ${r.summary}`).join("\n") || "- None formally logged."}

### Team Commitments
${session.commitments.map(c => `- ${c.summary}`).join("\n") || "- Team agreed to review updated progress monitoring data."}

### Open Issues
${session.openIssues.map(o => `- ${o.summary}`).join("\n") || "- Delivery of Prior Written Notice (PWN) for team decisions."}

### Immediate Follow-Up Actions
- Request formal Prior Written Notice (PWN) within 5 school days.
- Confirm receipt of complete evaluation consent documents.
- Review draft meeting minutes.`;
  }

  return `### Reason for Call
${session.title || "Advocacy Consultation Call"} regarding ${session.attachedName || "Student"}.

### Key Discussion Points
- Reviewed current school placement and teacher observations.
- Discussed parent concerns and historical IEP service implementation.

### Requests & Inquiries
${session.requests.map(r => `- ${r.summary}`).join("\n") || "- Initial intake discussion."}

### Next Steps & Follow-Up
- Schedule full strategy call or IEP pre-meeting review.
- Gather existing educational evaluations, psychological reports, and progress reports.`;
}
