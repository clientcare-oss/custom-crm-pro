import type { RelatedSource } from "../../shared/firstMate";

export interface KnowledgeSnippet {
  id: string;
  topic: string;
  citation: string;
  title: string;
  url?: string;
  summary: string;
  isVerified: boolean;
}

// Verified special education reference library
const VERIFIED_KNOWLEDGE_LIBRARY: KnowledgeSnippet[] = [
  {
    id: "idea-300-301",
    topic: "evaluation",
    citation: "IDEA § 300.301",
    title: "IDEA § 300.301 – Initial Evaluations",
    url: "https://sites.ed.gov/idea/regs/b/d/300.301",
    summary:
      "Either a parent of a child or a public agency may initiate a request for an initial evaluation to determine if the child is a child with a disability. The evaluation must be conducted within statutory timelines.",
    isVerified: true,
  },
  {
    id: "idea-300-503",
    topic: "pwn",
    citation: "34 CFR § 300.503",
    title: "34 CFR § 300.503 – Prior Written Notice (PWN)",
    url: "https://sites.ed.gov/idea/regs/b/e/300.503",
    summary:
      "Written notice must be given to parents whenever the public agency proposes or refuses to initiate or change the identification, evaluation, or educational placement of the child.",
    isVerified: true,
  },
  {
    id: "idea-300-502",
    topic: "iee",
    citation: "34 CFR § 300.502",
    title: "34 CFR § 300.502 – Independent Educational Evaluation (IEE)",
    url: "https://sites.ed.gov/idea/regs/b/e/300.502",
    summary:
      "A parent has the right to an independent educational evaluation at public expense if the parent disagrees with an evaluation obtained by the public agency.",
    isVerified: true,
  },
  {
    id: "idea-300-320",
    topic: "services",
    citation: "34 CFR § 300.320",
    title: "34 CFR § 300.320 – Definition of IEP & Related Services",
    url: "https://sites.ed.gov/idea/regs/b/d/300.320",
    summary:
      "The IEP must include measurable annual goals, present levels of academic achievement, and the special education and related services to be provided.",
    isVerified: true,
  },
  {
    id: "sec-504",
    topic: "504",
    citation: "34 CFR Part 104",
    title: "Section 504 of the Rehabilitation Act of 1973",
    url: "https://www2.ed.gov/about/offices/list/ocr/504faq.html",
    summary:
      "Prohibits discrimination on the basis of disability in programs receiving Federal financial assistance and ensures equal educational access through reasonable accommodations.",
    isVerified: true,
  },
  {
    id: "parent-rights",
    topic: "parental_rights",
    citation: "Procedural Safeguards",
    title: "Parental Rights – Requesting an Evaluation",
    url: "https://www.parentcenterhub.org/evaluation/",
    summary:
      "Parents hold legal procedural safeguards to participate in all identification, evaluation, and placement decisions.",
    isVerified: true,
  },
];

export class FirstMateKnowledgeProvider {
  /**
   * Match topic against verified knowledge library.
   * If a topic has no verified legal citation, explicitly return a safe
   * "SOURCE VERIFICATION NEEDED" notice to avoid hallucinated citations.
   */
  public static getSourcesForTopic(topicQuery: string): RelatedSource[] {
    const q = topicQuery.toLowerCase();

    const matches = VERIFIED_KNOWLEDGE_LIBRARY.filter(
      (item) =>
        item.topic.includes(q) ||
        item.title.toLowerCase().includes(q) ||
        q.includes(item.topic) ||
        (q.includes("refusal") && item.topic === "evaluation") ||
        (q.includes("speech") && item.topic === "services") ||
        (q.includes("reduction") && item.topic === "services") ||
        (q.includes("testing") && item.topic === "evaluation") ||
        (q.includes("iee") && item.topic === "iee")
    );

    if (matches.length > 0) {
      return matches.slice(0, 2).map((m) => ({
        title: m.title,
        url: m.url,
        isVerified: true,
      }));
    }

    // Safeguard: Never invent legal citations
    return [
      {
        title: "SOURCE VERIFICATION NEEDED",
        url: undefined,
        isVerified: false,
      },
    ];
  }
}
