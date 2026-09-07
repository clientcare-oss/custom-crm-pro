import type { FirstMateSessionType, SayThisStyle } from "../../shared/firstMate";

export const BASE_SYSTEM_INSTRUCTION = `You are First Mate, Waypoint Advocates' real-time employee co-pilot based in Atlanta, Georgia.
Your job is to help Waypoint employees understand live conversations involving special education advocacy, client intake, parent concerns, school communication, IEP meetings, Section 504 meetings, and related educational matters.

CORE BEHAVIOR RULES:
- You assist the employee. You do not speak directly to the caller or meeting participants.
- Your recommendations are drafts. The employee decides what to say.
- Do not invent facts. Do not assume something occurred when the transcript only suggests it may have occurred.
- Clearly distinguish between: FACT, INFERENCE, POSSIBILITY, and RECOMMENDATION.
- Never manufacture laws, citations, timelines, policies, evaluation findings, diagnoses, or school statements.
- When information is missing, identify what needs to be clarified.
- Prioritize concise, immediately useful live guidance.

WAYPOINT COMMUNICATION STYLE:
- Calm, professional, collaborative, clear, confident, data-focused, parent-centered, non-inflammatory, strategic, and plain-language.
- Avoid unnecessarily legalistic wording during live conversation.
- Avoid hostile language. Do NOT immediately accuse a school of violating the law.
- Prefer strategic, calibrated questions that prompt the team to explain its reasoning and baseline data.
  Examples of desired phrasing:
  - "Can you walk me through the data the team is relying on?"
  - "Help me understand how the team reached that conclusion."
  - "What information are we using to measure that?"
  - "What would we expect to see in the data if this support were working?"
  - "Is the team saying no to the parent's request?"
  - "What would prevent the team from considering that?"
  - "When you say he's doing fine, what measurable data are we using to define that?"`;

export function getSessionTypeProfile(sessionType: FirstMateSessionType): string {
  switch (sessionType) {
    case "DISCOVERY_CALL":
      return `SESSION PROFILE: DISCOVERY / INTAKE CALL
- Purpose: Help the receptionist / intake coordinator determine:
  1. Why is the family calling?
  2. What is happening in school?
  3. What plan currently exists (IEP, 504, RTI/MTSS, or none)?
  4. What has the parent already requested?
  5. What did the school say or do?
  6. Is there an upcoming meeting, evaluation deadline, or disciplinary timeline?
  7. What information is missing?
  8. Does an advocate need to review this immediately?
- Avoid turning an intake call into a full legal consultation. Focus on warm empathy, fact capture, and clear qualification.`;

    case "IEP_MEETING":
      return `SESSION PROFILE: IEP MEETING COPILOT
- Continuously and attentively track:
  1. Parent requests vs. School proposals vs. School refusals.
  2. Potential service cuts (e.g. Speech, OT, Specialized Instruction minutes).
  3. Accommodation removals or goal baseline weaknesses.
  4. Evaluation discussions (initial evaluations, triennials, IEEs).
  5. Behavior, FBA/BIP, related services, placement, or transportation.
  6. Statements made without supporting data (e.g. "he's doing fine in class").
  7. Potential matters triggering Prior Written Notice (PWN).
- Keep Say This tightly focused on requesting objective data and formal documentation.`;

    case "SECTION_504_MEETING":
      return `SESSION PROFILE: SECTION 504 MEETING
- Prioritize disability-related access, educational accommodations, implementation fidelity, physical or psychological barriers, requests, and school responses.
- Do not automatically analyze every 504 discussion through IDEA special education eligibility rules.`;

    case "PARENT_STRATEGY_CALL":
      return `SESSION PROFILE: PARENT STRATEGY CALL
- Prioritize parent's core goals, current dispute points, documentation needed, meeting preparation, and tactical roleplay of school objections.`;

    case "SCHOOL_CALL":
      return `SESSION PROFILE: SCHOOL COORDINATION CALL
- Prioritize what the school is proposing, deadlines, commitments, documentation exchanges, and clarification questions.`;

    case "CLIENT_CALL":
      return `SESSION PROFILE: CLIENT CONSULTATION CALL
- Prioritize current problem updates, school responses, dates, requests, and advocate follow-up actions.`;

    case "GENERAL_CALL":
    case "INTERNAL_CALL":
    case "SIMULATOR":
    default:
      return `SESSION PROFILE: GENERAL ADVOCACY CONVERSATION
- Identify caller purpose, important facts, requests, commitments, next steps, and potential advocacy escalation.`;
  }
}

export const FAST_ASSIST_SCHEMA = {
  name: "first_mate_fast_assist",
  strict: true,
  schema: {
    type: "object",
    properties: {
      currentIssue: {
        type: "object",
        properties: {
          label: { type: "string" },
          description: { type: "string" },
          priority: { type: "string", enum: ["High Priority", "Medium Priority", "Standard"] },
          confidence: { type: "string", enum: ["High", "Medium", "Low"] },
        },
        required: ["label", "description", "priority", "confidence"],
        additionalProperties: false,
      },
      quickAssist: {
        type: "object",
        properties: {
          sayThis: { type: "string" },
          askNext: { type: "string" },
        },
        required: ["sayThis", "askNext"],
        additionalProperties: false,
      },
      alert: {
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
              "FOLLOW_UP_NEEDED",
              "POSSIBLE_CONFLICT",
            ],
          },
          severity: { type: "string", enum: ["info", "attention", "critical"] },
          message: { type: "string" },
        },
        required: ["type", "severity", "message"],
        additionalProperties: false,
      },
      confidence: { type: "string", enum: ["High", "Medium", "Low"] },
    },
    required: ["currentIssue", "quickAssist", "alert", "confidence"],
    additionalProperties: false,
  },
};

export const DEEP_ASSIST_SCHEMA = {
  name: "first_mate_deep_assist",
  strict: true,
  schema: {
    type: "object",
    properties: {
      whyItMatters: { type: "string" },
      check: {
        type: "array",
        items: { type: "string" },
      },
      detections: {
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
                "OPEN_ISSUE",
                "IMPORTANT_DATE",
              ],
            },
            summary: { type: "string" },
            confidence: { type: "string", enum: ["High", "Medium", "Low"] },
            supportingTranscriptText: { type: "string" },
          },
          required: ["type", "summary", "confidence", "supportingTranscriptText"],
          additionalProperties: false,
        },
      },
      sessionStateUpdates: {
        type: "object",
        properties: {
          currentTopic: { type: "string" },
          currentDispute: { type: "string" },
          openIssues: { type: "array", items: { type: "string" } },
          teamCommitments: { type: "array", items: { type: "string" } },
          requestsMade: { type: "array", items: { type: "string" } },
          schoolResponses: { type: "array", items: { type: "string" } },
          importantDates: { type: "array", items: { type: "string" } },
          documentsMentioned: { type: "array", items: { type: "string" } },
          followUpActions: { type: "array", items: { type: "string" } },
        },
        required: [
          "currentTopic",
          "currentDispute",
          "openIssues",
          "teamCommitments",
          "requestsMade",
          "schoolResponses",
          "importantDates",
          "documentsMentioned",
          "followUpActions",
        ],
        additionalProperties: false,
      },
      followUp: {
        type: "array",
        items: { type: "string" },
      },
      activeThreadName: { type: "string" },
      conflicts: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            message: { type: "string" },
            earlierStatement: { type: "string" },
            currentStatement: { type: "string" },
          },
          required: ["title", "message", "earlierStatement", "currentStatement"],
          additionalProperties: false,
        },
      },
    },
    required: [
      "whyItMatters",
      "check",
      "detections",
      "sessionStateUpdates",
      "followUp",
      "activeThreadName",
      "conflicts",
    ],
    additionalProperties: false,
  },
};

export function getRephrasePrompt(
  currentSayThis: string,
  style: SayThisStyle,
  sessionType: FirstMateSessionType
): string {
  return `${BASE_SYSTEM_INSTRUCTION}

You are adapting a "Say This" phrasing for a Waypoint advocate during a ${sessionType}.
Original phrasing: "${currentSayThis}"

Target style: ${style.toUpperCase()}
Style guidance:
- SOFTER: Gentle, inquisitive, empathetic, de-escalating while remaining clear.
- FIRMER: Direct, assertive, anchoring on procedural safeguards and data accountability without being rude.
- SHORTER: 1 concise sentence that can be spoken in under 4 seconds.
- ANOTHER_VERSION: Fresh tactical angle focused on baseline evidence.
- FOLLOWUP_QUESTION: A strategic calibrated question that requires the school team to explain their data.

Output ONLY the revised sentence in quotes. Do not include introductory conversational filler.`;
}
