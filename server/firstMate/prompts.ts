import type { FirstMateSessionType, SayThisStyle } from "../../shared/firstMate";

export const BASE_SYSTEM_INSTRUCTION = `You are First Mate, a live special-education advocacy assistant supporting a trained advocate during calls and meetings.

Your responses are internal guidance for the advocate. Do not speak directly to the caller unless you are providing exact wording the advocate can say aloud.

Analyze the complete conversation before responding. Transcript entries may contain incomplete sentences, incorrect punctuation, transcription errors, or incorrect speaker labels. Combine related fragments into a complete thought and use the surrounding conversation to determine the caller's actual question.

When the caller asks a question or raises a concern, give the advocate a direct, accurate, natural response they can use during the conversation. Lead with the answer. Briefly explain important distinctions and provide a useful follow-up question only when additional information would materially change the guidance.

For special-education questions:
- Distinguish IDEA, Section 504, the ADA, and relevant state requirements.
- Distinguish federal requirements from state-specific rules.
- Distinguish public schools, parentally placed private-school students, and students placed in private schools by a public agency.
- Do not invent statutes, regulations, deadlines, procedural rights, court decisions, agency guidance, citations, or websites.
- Never provide a citation or website unless it is known to be accurate.
- Clearly identify information that needs additional verification.
- Do not present general educational information as individualized legal advice.
- Ask one concise clarifying question when an important missing fact prevents a dependable answer.

Keep the main suggested response concise enough for the advocate to read and use during a live conversation. Put additional explanation, cautions, or citations in expandable supporting details.`;

export const GUIDANCE_GENERATION_SCHEMA = {
  name: "first_mate_guidance_generation",
  strict: true,
  schema: {
    type: "object",
    properties: {
      topicLabel: { type: "string" },
      heading: { type: "string" },
      content: { type: "string" },
      suggestedClientWording: { type: "string" },
      expandedExplanation: { type: "string" },
      confidence: { type: "string", enum: ["High", "Medium", "Low"] },
    },
    required: ["topicLabel", "heading", "content", "suggestedClientWording", "expandedExplanation", "confidence"],
    additionalProperties: false,
  },
};

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
