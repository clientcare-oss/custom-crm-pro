import { invokeLLM } from "./_core/llm";
import { AUTHORITY_LIBRARY, ISSUE_CATEGORIES } from "../shared/complaintEngine";

function parseJson<T>(raw: unknown): T {
  const text = typeof raw === "string" ? raw : JSON.stringify(raw);
  return JSON.parse(text) as T;
}

const GUARDRAILS = `STRICT RULES:
- You may only use facts explicitly present in the provided material. Never invent dates, quotations, evidence, services, personnel, events, or legal conclusions.
- Do not make statements sound more certain than the material supports. Use "reported", "according to the parent", or "the records indicate" where appropriate.
- Do not add citations, names, or factual details that are absent from the provided material.`;

// ---------- Story intake fact extraction ----------
export type ExtractedFactOut = {
  factType: "date" | "person" | "service" | "meeting" | "decision" | "denial" | "delay" | "missed_action" | "issue_category" | "other";
  factText: string;
};

export async function extractFactsFromStory(promptKey: string, question: string, answer: string): Promise<ExtractedFactOut[]> {
  const issueList = ISSUE_CATEGORIES.map(i => `${i.key}: ${i.label}`).join("; ");
  const res = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You extract structured facts from a parent/advocate's plain-language answer about a special education dispute. ${GUARDRAILS}
Fact types: date, person, service, meeting, decision, denial, delay, missed_action, issue_category, other.
For issue_category facts, factText must be one of these keys: ${issueList}.
Extract only what is actually stated. Short factText (one sentence max). Return an empty list if nothing is extractable.`,
      },
      { role: "user", content: `Question asked: "${question}"\n\nAnswer given:\n${answer}` },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "extracted_facts", strict: true,
        schema: {
          type: "object",
          properties: {
            facts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  factType: { type: "string", enum: ["date", "person", "service", "meeting", "decision", "denial", "delay", "missed_action", "issue_category", "other"] },
                  factText: { type: "string" },
                },
                required: ["factType", "factText"], additionalProperties: false,
              },
            },
          },
          required: ["facts"], additionalProperties: false,
        },
      },
    },
  });
  const content = res.choices[0]?.message?.content;
  try {
    return parseJson<{ facts: ExtractedFactOut[] }>(content).facts;
  } catch {
    return [];
  }
}

// ---------- Allegation suggestions ----------
export type AllegationSuggestion = {
  plainTitle: string;
  formalTitle: string;
  confidence: "possible" | "likely" | "strong";
  reasonSuggested: string;
  issueCategories: string[];
  requiredElements: string[];
  missingInfo: string[];
  factsUsed: { type: string; refId: number | null; text: string }[];
};

export async function suggestAllegations(input: {
  confirmedIssues: string[];
  facts: { id: number; factType: string; factText: string }[];
  timeline: { id: number; title: string; eventDate: string | null; details: string | null }[];
  storyAnswers: { promptKey: string; answerText: string | null }[];
  existingTitles: string[];
}): Promise<AllegationSuggestion[]> {
  const issueList = ISSUE_CATEGORIES.map(i => `${i.key}: ${i.label}`).join("; ");
  const material = [
    `CONFIRMED ISSUE CATEGORIES: ${input.confirmedIssues.join(", ") || "(none confirmed yet)"}`,
    `CONFIRMED FACTS:\n${input.facts.map(f => `[fact#${f.id}] (${f.factType}) ${f.factText}`).join("\n") || "(none)"}`,
    `TIMELINE EVENTS:\n${input.timeline.map(t => `[event#${t.id}] ${t.eventDate ?? "date unknown"} — ${t.title}: ${t.details ?? ""}`).join("\n") || "(none)"}`,
    `STORY ANSWERS:\n${input.storyAnswers.map(s => `[${s.promptKey}] ${s.answerText ?? ""}`).join("\n") || "(none)"}`,
    `ALLEGATIONS ALREADY IN THE COMPLAINT (do not duplicate): ${input.existingTitles.join(" | ") || "(none)"}`,
  ].join("\n\n");

  const res = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an IDEA special education advocacy assistant analyzing a potential Georgia state complaint. Suggest potential allegations grounded ONLY in the provided material. ${GUARDRAILS}
For each suggestion provide:
- plainTitle: plain language, e.g. "The district may have failed to provide the speech services written in the IEP."
- formalTitle: e.g. "Failure to implement the student's IEP and provide required related services."
- confidence: possible | likely | strong (based on how directly the facts support it)
- reasonSuggested: one or two sentences citing the specific facts/events that triggered the suggestion
- issueCategories: one or more keys from: ${issueList}
- requiredElements: the factual propositions ordinarily needed to establish this allegation (3-5 items)
- missingInfo: questions or documents needed to confirm, narrow, or reject it
- factsUsed: reference the facts/events used, with type "fact" or "event" and the numeric refId from [fact#N]/[event#N] markers (null if from a story answer), plus a short text
Suggest at most 5 allegations. Fewer, well-grounded suggestions are better. Return an empty array if the material does not support any.`,
      },
      { role: "user", content: material },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "allegation_suggestions", strict: true,
        schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  plainTitle: { type: "string" },
                  formalTitle: { type: "string" },
                  confidence: { type: "string", enum: ["possible", "likely", "strong"] },
                  reasonSuggested: { type: "string" },
                  issueCategories: { type: "array", items: { type: "string" } },
                  requiredElements: { type: "array", items: { type: "string" } },
                  missingInfo: { type: "array", items: { type: "string" } },
                  factsUsed: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: ["fact", "event", "story"] },
                        refId: { type: ["integer", "null"] },
                        text: { type: "string" },
                      },
                      required: ["type", "refId", "text"], additionalProperties: false,
                    },
                  },
                },
                required: ["plainTitle", "formalTitle", "confidence", "reasonSuggested", "issueCategories", "requiredElements", "missingInfo", "factsUsed"],
                additionalProperties: false,
              },
            },
          },
          required: ["suggestions"], additionalProperties: false,
        },
      },
    },
  });
  const content = res.choices[0]?.message?.content;
  try {
    return parseJson<{ suggestions: AllegationSuggestion[] }>(content).suggestions;
  } catch {
    return [];
  }
}

// ---------- Authority suggestions (library-based with factual connection) ----------
export async function suggestAuthorities(input: {
  allegationTitle: string;
  issueCategories: string[];
  factsSummary: string;
}): Promise<{ group: "federal" | "georgia"; citation: string; subject: string; whyApplies: string }[]> {
  const candidates = AUTHORITY_LIBRARY.filter(a => a.issueKeys.some(k => input.issueCategories.includes(k)));
  if (!candidates.length) return [];
  const res = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You connect a special education allegation to potentially relevant legal authority. You are given a fixed list of candidate provisions from a verified library — you may ONLY select from that list, never add other citations. For each provision you keep, write a one-sentence plain-language explanation of the FACTUAL connection (why this provision may apply given these facts). Drop any candidate that matches only by keyword without a real factual connection. ${GUARDRAILS}`,
      },
      {
        role: "user",
        content: `ALLEGATION: ${input.allegationTitle}\n\nFACTS: ${input.factsSummary}\n\nCANDIDATES:\n${candidates.map((c, i) => `${i}: [${c.group}] ${c.citation} — ${c.subject}`).join("\n")}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "authority_selection", strict: true,
        schema: {
          type: "object",
          properties: {
            selected: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  index: { type: "integer" },
                  whyApplies: { type: "string" },
                },
                required: ["index", "whyApplies"], additionalProperties: false,
              },
            },
          },
          required: ["selected"], additionalProperties: false,
        },
      },
    },
  });
  const content = res.choices[0]?.message?.content;
  try {
    const { selected } = parseJson<{ selected: { index: number; whyApplies: string }[] }>(content);
    return selected
      .filter(s => s.index >= 0 && s.index < candidates.length)
      .map(s => ({
        group: candidates[s.index].group,
        citation: candidates[s.index].citation,
        subject: candidates[s.index].subject,
        whyApplies: s.whyApplies,
      }));
  } catch {
    return [];
  }
}

// ---------- Writing assistant ----------
export type WritingMode = "from_answers" | "from_evidence" | "improve" | "build_with_me";
export type WritingTone = "plain" | "formal" | "concise" | "detailed" | "advocate";

const TONE_INSTRUCTIONS: Record<WritingTone, string> = {
  plain: "Write in plain, everyday language a tired parent can read easily.",
  formal: "Write in formal, professional complaint language.",
  concise: "Write tightly and briefly. No filler.",
  detailed: "Write thoroughly, covering each relevant fact.",
  advocate: "Write as an experienced special education advocate would for a professional review: precise, measured, well-organized.",
};

export async function assistWriting(input: {
  mode: WritingMode;
  tone: WritingTone;
  fieldLabel: string;
  currentText: string | null;
  sources: { type: string; refId: number | null; label: string; content: string }[];
  userMessage?: string;
}): Promise<{ text: string; builtFrom: { type: string; refId: number | null; label: string }[] }> {
  const sourceBlock = input.sources.map((s, i) => `[source ${i}] (${s.type}${s.refId ? ` #${s.refId}` : ""}) ${s.label}:\n${s.content}`).join("\n\n") || "(no sources provided)";
  const modeInstr = {
    from_answers: "Draft this section using ONLY the provided verified intake answers and facts.",
    from_evidence: "Draft this section using ONLY the provided evidence summaries and confirmed extractions.",
    improve: "Improve the user's current text: clarify, organize, correct grammar — but preserve the meaning and add NOTHING new.",
    build_with_me: "The user is answering focused questions one at a time. Use their latest answer plus the sources to extend the draft.",
  }[input.mode];

  const res = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are the writing assistant of a Georgia IDEA state complaint builder. You are drafting the "${input.fieldLabel}" section. ${modeInstr} ${TONE_INSTRUCTIONS[input.tone]} ${GUARDRAILS}
Also list which source indexes you actually used.`,
      },
      {
        role: "user",
        content: `CURRENT TEXT:\n${input.currentText || "(empty)"}\n\nSOURCES:\n${sourceBlock}${input.userMessage ? `\n\nUSER NOTE: ${input.userMessage}` : ""}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "writing_output", strict: true,
        schema: {
          type: "object",
          properties: {
            text: { type: "string" },
            usedSourceIndexes: { type: "array", items: { type: "integer" } },
          },
          required: ["text", "usedSourceIndexes"], additionalProperties: false,
        },
      },
    },
  });
  const content = res.choices[0]?.message?.content;
  const parsed = parseJson<{ text: string; usedSourceIndexes: number[] }>(content);
  const builtFrom = parsed.usedSourceIndexes
    .filter(i => i >= 0 && i < input.sources.length)
    .map(i => ({ type: input.sources[i].type, refId: input.sources[i].refId, label: input.sources[i].label }));
  return { text: parsed.text, builtFrom };
}
