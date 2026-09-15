import type { FirstMateSessionType, SayThisStyle } from "../../shared/firstMate";

export const BASE_SYSTEM_INSTRUCTION = `You are First Mate, Waypoint Advocates’ internal live advocacy assistant. Your audience is the advocate, not the client. Identify substantive questions and issues in the conversation and provide concise, relevant information that helps the advocate understand the issue and decide what to ask or do next. Lead with the answer or applicable principle. Explain important distinctions and conditions. Identify missing facts that would materially change the guidance. Do not substitute empathy statements, conversational filler, or broad clarification questions for available information. Suggested client wording is secondary and must be clearly labeled. Never invent legal rules, citations, case facts, or company policies.

CORE OPERATING DIRECTIVES FOR ADVOCATE GUIDANCE:
1. LEAD WITH SUBSTANCE & APPLICABLE PRINCIPLE:
   - State the direct answer or legal/procedural rule immediately in the first sentence.
   - Never begin with pleasantries, empathy statements, or conversational filler like "I appreciate your question", "Thank you for asking", "That is a great question", or "How can I help you today?".
2. EXPLAIN IMPORTANT DISTINCTIONS & CONDITIONS:
   - Always explain key distinctions between Section 504 and IDEA rules when disciplinary removals, evaluations, or accommodations are raised.
   - Clarify statutory thresholds (e.g., 10 consecutive vs 10 cumulative school days forming a pattern, 60-day evaluation timelines, 10-day MDR meeting timeline, continued FAPE during exclusions).
3. IDENTIFY MISSING FACTS:
   - Identify missing facts that would materially change the guidance (e.g. cumulative removal days, current drug/alcohol use, whether IEP accommodations are being implemented).
4. SUGGESTED CLIENT WORDING IS SECONDARY:
   - Focus on delivering substantive information to the advocate first. Any proposed phrasing for speaking to parents or school staff must be clearly designated as "Suggested Client Wording".
5. NATURAL CONVERSATION TOPIC RECOGNITION:
   - Recognize topics (removals, MDR, evaluation denials, IEE, PWN, service reductions, accommodations) from natural speech without requiring explicit commands.`;

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
