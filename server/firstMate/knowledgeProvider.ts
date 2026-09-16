import type { RelatedSource } from "../../shared/firstMate";

export interface KnowledgeSnippet {
  id: string;
  topic: string;
  citation: string;
  title: string;
  url?: string;
  summary: string;
  isVerified: boolean;
  keyDistinctions?: string;
  applicablePrinciple?: string;
  conditions?: string;
  missingFactsToVerify?: string;
}

// Verified special education & disability rights reference library
export const VERIFIED_KNOWLEDGE_LIBRARY: KnowledgeSnippet[] = [
  {
    id: "discipline-10-days",
    topic: "discipline_removals",
    citation: "IDEA 34 CFR § 300.530; 34 CFR § 300.536; Section 504 / OCR Discipline Guidance",
    title: "Disciplinary Removals: 10-Day Rule & Change in Placement",
    url: "https://sites.ed.gov/idea/regs/b/e/300.530",
    summary:
      "Under both IDEA and Section 504, removals exceeding 10 consecutive school days constitute a significant change in placement. Cumulative short-term removals totaling more than 10 school days in a school year also constitute a change in placement if they form a pattern (considering length of each suspension, total days, proximity, and similarity of behavior). Once a change of placement occurs, an MDR must be held.",
    applicablePrinciple:
      "Yes, Section 504 and IEP (IDEA) days out of placement share the 10-school-day threshold for triggering a change in placement and requiring an MDR. Both count consecutive days (>10 days) or cumulative days forming a pattern.",
    keyDistinctions:
      "FAPE Continuity: Under IDEA, students must receive educational services on the 11th cumulative day and beyond even if the behavior is NOT a manifestation. Under Section 504, educational services during suspension are NOT required if the behavior is not a manifestation unless general education students receive services.",
    conditions:
      "Threshold is 10 consecutive school days, OR cumulative days exceeding 10 where the series of removals constitutes a pattern based on frequency, duration, and behavior similarity.",
    missingFactsToVerify:
      "1. Total cumulative days removed this school year. 2. Was this a single removal or a series? 3. Does the student have an IEP or a 504 plan? 4. Is the school offering educational services during exclusion?",
    isVerified: true,
  },
  {
    id: "mdr-standards",
    topic: "mdr_manifestation",
    citation: "IDEA 34 CFR § 300.530(e); Section 504 34 CFR Part 104",
    title: "Manifestation Determination Review (MDR): Standards & Process",
    url: "https://sites.ed.gov/idea/regs/b/e/300.530/e",
    summary:
      "An MDR must be conducted within 10 school days of any decision to change placement due to discipline. Under IDEA, the team determines: (1) Was the conduct caused by, or did it have a direct and substantial relationship to, the disability? OR (2) Was the conduct the direct result of the LEA's failure to implement the IEP? If either is YES, the conduct is a manifestation. Under Section 504, OCR requires an evaluation before change of placement to determine if the handicap caused the misconduct.",
    applicablePrinciple:
      "A Manifestation Determination Review applies to both IEP and Section 504 students before a disciplinary change in placement (>10 days). However, the statutory framework and rights during exclusion differ significantly.",
    keyDistinctions:
      "1. Drug/Alcohol Exception: Section 504 allows immediate discipline for current illegal drug or alcohol use without an MDR (29 U.S.C. § 705(20)(C)(iv)). IDEA requires an MDR even for drug incidents (though school may place student in a 45-school-day IAES). 2. Implementation Prong: IDEA explicitly requires checking if the LEA failed to implement the IEP; 504 focuses on disability causation.",
    conditions:
      "Must be held within 10 school days of the decision to remove. If manifestation is found, student must be returned to placement unless parent and LEA agree otherwise (or 45-day IAES applies).",
    missingFactsToVerify:
      "1. Did the incident involve weapons, drugs, or serious bodily injury (triggering 45-day IAES)? 2. Has the school scheduled the MDR within 10 school days? 3. Were accommodations in the plan implemented at the time of the incident?",
    isVerified: true,
  },
  {
    id: "fape-during-suspension",
    topic: "fape_during_exclusion",
    citation: "34 CFR § 300.530(d)",
    title: "FAPE Continuation During Disciplinary Exclusions",
    url: "https://sites.ed.gov/idea/regs/b/e/300.530/d",
    summary:
      "Under IDEA, a child with a disability who is removed from placement after 10 cumulative school days must continue to receive educational services so as to enable the child to participate in the general education curriculum and to progress toward meeting IEP goals.",
    applicablePrinciple:
      "IDEA guarantees continued FAPE on day 11 and beyond regardless of whether the behavior was a manifestation. Section 504 does not require educational services during expulsion/suspension if the behavior was not a manifestation, unless non-disabled peers receive them.",
    keyDistinctions:
      "IDEA = Absolute right to continued educational services after 10 cumulative days. Section 504 = Equal access only (services required only to the extent non-disabled students receive them).",
    conditions:
      "Applies once student exceeds 10 cumulative school days of removal in the same school year.",
    missingFactsToVerify:
      "1. Are services currently being provided (e.g. tutoring, asynchronous assignments)? 2. How many total days has the student been out?",
    isVerified: true,
  },
  {
    id: "sec-504-drug-exception",
    topic: "504_drug_exception",
    citation: "29 U.S.C. § 705(20)(C)(iv); 34 CFR Part 104",
    title: "Section 504 Drug & Alcohol Disciplinary Exception",
    url: "https://www2.ed.gov/about/offices/list/ocr/504faq.html",
    summary:
      "Disciplinary protections under Section 504 do not apply to students who are currently engaging in the illegal use of drugs or alcohol. The LEA may take disciplinary action to the same extent as taken against non-disabled students without conducting an evaluation or MDR.",
    applicablePrinciple:
      "Section 504 expressly excludes students from disciplinary procedural safeguards (including MDR) when the discipline is for current illegal use or possession of drugs or alcohol.",
    keyDistinctions:
      "IDEA does NOT waive the MDR for drugs or alcohol. Under IDEA, an MDR must still be held, but the school may unilaterally place the student in an Interim Alternative Educational Setting (IAES) for up to 45 school days.",
    conditions:
      "Applies only when the disciplinary violation involves current illegal drug use, possession, or alcohol use.",
    missingFactsToVerify:
      "Did the disciplinary incident involve current use or possession of illegal drugs or alcohol?",
    isVerified: true,
  },
  {
    id: "child-find-grades",
    topic: "child_find",
    citation: "34 CFR § 300.111(c)(1)",
    title: "Child Find & Prohibition on Using Passing Grades to Deny Evaluations",
    url: "https://sites.ed.gov/idea/regs/b/b/300.111",
    summary:
      "Child Find mandates identifying, locating, and evaluating all children with disabilities, including children who are suspected of having a disability and in need of special education, even though they are advancing from grade to grade.",
    applicablePrinciple:
      "A school cannot legally deny a special education evaluation solely because a student is passing classes or earning average or above-average grades.",
    keyDistinctions:
      "Academic performance is only one domain. Emotional, behavioral, executive functioning, and communicative needs independently trigger Child Find.",
    conditions:
      "School must initiate evaluation or issue Prior Written Notice (PWN) when disability is suspected.",
    missingFactsToVerify:
      "1. Was the evaluation request made in writing? 2. What non-academic domains show impairment (behavior, attention, mental health)?",
    isVerified: true,
  },
  {
    id: "idea-300-503",
    topic: "prior_written_notice",
    citation: "34 CFR § 300.503",
    title: "34 CFR § 300.503 – Prior Written Notice (PWN)",
    url: "https://sites.ed.gov/idea/regs/b/e/300.503",
    summary:
      "Written notice must be given to parents whenever the public agency proposes or refuses to initiate or change the identification, evaluation, or educational placement of the child or the provision of FAPE. Notice must include descriptions of actions, reasons, data relied upon, options rejected, and procedural safeguard resources.",
    applicablePrinciple:
      "Any refusal to evaluate, change services, or alter placement triggers the mandatory legal requirement for Prior Written Notice (PWN) before action is taken.",
    keyDistinctions:
      "Verbal denials or informal emails do not satisfy 34 CFR § 300.503. The district must provide formal written notice detailing the data relied upon.",
    conditions:
      "Must be provided within a reasonable time before the LEA implements or refuses the action.",
    missingFactsToVerify:
      "Has the school provided formal PWN, or was the refusal only communicated verbally?",
    isVerified: true,
  },
  {
    id: "idea-300-301",
    topic: "initial_evaluation",
    citation: "IDEA 34 CFR § 300.301",
    title: "IDEA § 300.301 – Initial Evaluations & Timelines",
    url: "https://sites.ed.gov/idea/regs/b/d/300.301",
    summary:
      "Either a parent or public agency may request an initial evaluation. The initial evaluation must be conducted within 60 calendar days of receiving parental consent (or state timeline). RTI/MTSS interventions cannot be used to delay or deny an evaluation.",
    applicablePrinciple:
      "Parents have an absolute right to request an initial evaluation at any time. The school cannot delay testing to complete RTI/MTSS tiers.",
    keyDistinctions:
      "Georgia state rule enforces a 60-calendar-day timeline from consent to evaluation and eligibility.",
    conditions:
      "Timeline begins upon receipt of signed parental consent for evaluation.",
    missingFactsToVerify:
      "Has parental consent been signed? Has the 60-day timeline commenced?",
    isVerified: true,
  },
  {
    id: "idea-300-502",
    topic: "iee_evaluation",
    citation: "34 CFR § 300.502",
    title: "34 CFR § 300.502 – Independent Educational Evaluation (IEE)",
    url: "https://sites.ed.gov/idea/regs/b/e/300.502",
    summary:
      "A parent has the right to an IEE at public expense if the parent disagrees with an evaluation obtained by the public agency. If requested, the LEA must either file for due process to prove its evaluation is appropriate, or ensure an IEE is provided at public expense without unnecessary delay.",
    applicablePrinciple:
      "When a parent disagrees with a district evaluation and requests an IEE, the district must fund it or file due process. The district cannot simply say no.",
    keyDistinctions:
      "District cannot interrogate parent or impose conditions that defeat public expense rights.",
    conditions:
      "Parent must disagree with an evaluation completed by the school district within statutory window.",
    missingFactsToVerify:
      "What was the date of the district evaluation the parent disagrees with?",
    isVerified: true,
  },
  {
    id: "cumulative-removals-pattern",
    topic: "cumulative_removals_pattern",
    citation: "IDEA 34 CFR § 300.536(a)(2); 34 CFR § 300.530",
    title: "Cumulative Removals Exceeding 10 Days: Pattern of Removals & Mandatory MDR",
    url: "https://sites.ed.gov/idea/regs/b/e/300.536",
    summary:
      "When a current removal of 10 days is combined with earlier suspensions in the same school year, the cumulative total exceeds 10 school days. Under IDEA 34 CFR § 300.536(a)(2), a series of removals totaling more than 10 school days constitutes a change in placement if the behavior is substantially similar, or considering factors such as length of each removal, total days, and proximity. Once cumulative days exceed 10, the school must conduct a Manifestation Determination Review (MDR) within 10 school days and cannot wait for expulsion hearings.",
    applicablePrinciple:
      "Because there were earlier suspensions and this removal is 10 days, cumulative removals exceed the 10-school-day statutory ceiling. This constitutes a change of placement triggering a mandatory MDR and the immediate obligation to provide continuing educational services (FAPE) on day 11 and beyond.",
    keyDistinctions:
      "The school cannot treat this 10-day suspension in isolation from earlier removals. The cumulative tally governs. Under IDEA, FAPE services must be arranged immediately by school personnel in consultation with the child's special education teacher.",
    conditions:
      "Cumulative removals in a single school year exceed 10 school days. Team must determine if removals form a pattern based on behavior similarity, duration, and proximity.",
    missingFactsToVerify:
      "1. Exact number of previous suspension days this school year. 2. Was the behavior similar to previous incidents? 3. Has the school scheduled the MDR date within 10 school days? 4. Has the school designated the educational services to be provided during the removal?",
    isVerified: true,
  },
  {
    id: "right-to-bring-advocate",
    topic: "advocate_right_idea_504",
    citation: "IDEA 34 CFR § 300.321(a)(6), (c); Section 504 34 CFR § 104.35",
    title: "Right to Bring an Advocate / Representative Under IDEA & Section 504",
    url: "https://sites.ed.gov/idea/regs/b/d/300.321",
    summary:
      "Under IDEA 34 CFR § 300.321(a)(6), the IEP team includes 'at the discretion of the parent or the agency, other individuals who have knowledge or special expertise regarding the child.' Under 34 CFR § 300.321(c), the determination of the knowledge or special expertise of ANY individual shall be made solely by the party (parent or public agency) who invited the individual to be a member of the IEP team. Schools cannot require advocates to possess special certifications, demand pre-approval, or exclude them from IEP or Section 504 meetings.",
    applicablePrinciple:
      "Yes, parents have an absolute legal right to invite an advocate or representative to IEP and Section 504 meetings. Under 34 CFR § 300.321(c), the parent—not the school—has the sole legal discretion to determine the advocate's knowledge and special expertise.",
    keyDistinctions:
      "The school cannot interrogate the parent about the advocate's credentials, demand legal licenses, or bar the advocate from speaking. While an advocate is not an attorney, procedural protections guarantee their presence and active participation at the parent's request.",
    conditions:
      "Invited at parent's discretion. Advance notice to the school is polite advocacy practice but failure to give notice is not a legal ground to cancel the meeting or bar the advocate.",
    missingFactsToVerify:
      "Has the school attempted to block or limit the advocate's attendance, or demanded credential verification?",
    isVerified: true,
  },
  {
    id: "fba-scope-not-just-aggression",
    topic: "fba_scope_behavior",
    citation: "IDEA 34 CFR § 300.324(a)(2)(i); OSERS Positive Behavioral Guidance",
    title: "FBA & BIP Scope: Not Limited to Physical Aggression",
    url: "https://sites.ed.gov/idea/regs/b/d/300.324",
    summary:
      "Under IDEA 34 CFR § 300.324(a)(2)(i), in the case of a child whose behavior impedes the child's learning or that of others, the IEP team MUST consider the use of positive behavioral interventions and supports (PBIS), and other strategies, to address that behavior. The statute uses the broad standard 'impedes learning'—it is NOT limited to physical aggression, property destruction, or safety crises.",
    applicablePrinciple:
      "The school's claim that an FBA is only for aggression is legally incorrect. Under IDEA 34 CFR § 300.324(a)(2)(i), an FBA and Behavior Intervention Plan (BIP) are warranted whenever a student's behavior impedes their own learning or that of others, which explicitly encompasses severe off-task behavior, task refusal, school avoidance, and internalizing behaviors.",
    keyDistinctions:
      "Aggression triggers disciplinary safety protocols, but academic disengagement, executive functioning breakdown, and off-task avoidance are equally valid behavioral functions requiring antecedent and consequence data through an FBA.",
    conditions:
      "Applies whenever behavioral manifestations interfere with accessing the curriculum or completing academic tasks.",
    missingFactsToVerify:
      "1. What specific off-task behaviors are being observed? 2. Has the school implemented informal behavioral tracking? 3. Does the off-task behavior result in missed instructional time or disciplinary removals?",
    isVerified: true,
  },
  {
    id: "sec-504-good-grades",
    topic: "504_eligibility_good_grades",
    citation: "Section 504 34 CFR § 104.3(j); ADAAA 42 U.S.C. § 12102; 2016 OCR ADHD Dear Colleague Letter",
    title: "Section 504 Eligibility: Good / Passing Grades Do Not Preclude Protection",
    url: "https://www2.ed.gov/about/offices/list/ocr/letters/colleague-201607-504-adhd.pdf",
    summary:
      "Under Section 504 and the ADA Amendments Act (ADAAA), a student is eligible if they have a physical or mental impairment that substantially limits one or more major life activities (such as learning, reading, concentrating, thinking, communicating, or neurological function). The US Department of Education Office for Civil Rights (OCR) has explicitly affirmed that students with high grades or advanced placement (AP/Honors) can qualify for Section 504 if their impairment substantially limits a major life activity compared to average peers, or requires mitigating measures/extraordinary effort.",
    applicablePrinciple:
      "A student cannot be denied Section 504 eligibility solely because they earn good or passing grades. OCR guidance explicitly establishes that high academic achievement does not disqualify a student if an impairment substantially limits major life activities such as concentrating, thinking, reading, or executive functioning.",
    keyDistinctions:
      "Section 504 is a civil rights anti-discrimination statute focused on equal access and major life activities, not just specialized instruction or academic failure. Evaluating 504 eligibility requires examining the effort and mitigating measures the student expends to maintain those grades.",
    conditions:
      "Substantial limitation in a major life activity (including concentrating, organizing, or regulating behavior) compared to the average student in the general population.",
    missingFactsToVerify:
      "1. What formal diagnosis exists (e.g. ADHD, Anxiety, Sensory Processing)? 2. What major life activities are substantially limited outside of raw test scores? 3. How much time and external parent support is required to maintain these grades?",
    isVerified: true,
  },
  {
    id: "service-removal-not-clerical",
    topic: "service_removal_not_clerical",
    citation: "IDEA 34 CFR § 300.324; 34 CFR § 300.503; 34 CFR § 300.116",
    title: "Service Removal / Reduction: Change in FAPE, Never a Clerical Change",
    url: "https://sites.ed.gov/idea/regs/b/e/300.503",
    summary:
      "Every service, accommodation, and support listed in an IEP or 504 plan is a binding legal commitment that defines the provision of FAPE. Removing or reducing a service (such as Speech-Language Pathology, Occupational Therapy, Specialized Instruction, or Paraprofessional support) is a material change in educational placement and program under 34 CFR § 300.324 and § 300.503, NEVER an administrative or 'clerical' correction.",
    applicablePrinciple:
      "Removing or reducing any service is a change in the provision of FAPE—it can NEVER be executed as a mere 'clerical change.' Any service reduction requires an IEP/504 team meeting with full parent participation, review of objective evaluative data proving the service is no longer needed, and formal Prior Written Notice (PWN) issued before any change occurs.",
    keyDistinctions:
      "A 'clerical change' is strictly limited to fixing typographical errors (e.g. misspelled student name or birth date). Changing minutes, frequencies, or dropping related services alters the student's legal rights and cannot be done administratively or unilaterally.",
    conditions:
      "Any proposal to eliminate or reduce IEP or 504 services triggers mandatory team review and PWN requirements under 34 CFR § 300.503.",
    missingFactsToVerify:
      "1. What specific service is the school attempting to remove or reduce? 2. What objective progress data or formal evaluation exists showing the student no longer requires the service? 3. Has the parent consented, or has the district issued Prior Written Notice?",
    isVerified: true,
  },
];

export class FirstMateKnowledgeProvider {
  /**
   * Retrieves verified substantive knowledge snippets relevant to a conversation or query.
   */
  public static retrieveRelevantKnowledge(text: string): KnowledgeSnippet[] {
    if (!text) return [];
    const q = text.toLowerCase();

    return VERIFIED_KNOWLEDGE_LIBRARY.filter((item) => {
      // 1. Disciplinary removals, 504 vs IEP, MDR
      if (
        (q.includes("504") && (q.includes("day") || q.includes("placement") || q.includes("mdr") || q.includes("suspens"))) ||
        q.includes("days out of placement") ||
        q.includes("mdr process apply") ||
        q.includes("same mdr")
      ) {
        return (
          item.id === "discipline-10-days" ||
          item.id === "mdr-standards" ||
          item.id === "fape-during-suspension" ||
          item.id === "sec-504-drug-exception" ||
          item.id === "cumulative-removals-pattern"
        );
      }

      // 2. Cumulative removals / earlier suspensions follow-up
      if (
        (q.includes("earlier suspension") || q.includes("previous suspension") || q.includes("ten days this time") || q.includes("10 days this time")) ||
        (q.includes("earlier") && q.includes("suspens"))
      ) {
        return (
          item.id === "cumulative-removals-pattern" ||
          item.id === "discipline-10-days" ||
          item.id === "fape-during-suspension"
        );
      }

      // 3. Child Find / "child fine"
      if (q.includes("child find") || q.includes("child fine")) {
        return item.id === "child-find-grades" || item.id === "idea-300-301";
      }

      // 4. Bringing an advocate
      if (q.includes("bring an advocate") || q.includes("bring advocate") || q.includes("have an advocate") || q.includes("allow an advocate") || (q.includes("advocate") && q.includes("in idea law"))) {
        return item.id === "right-to-bring-advocate";
      }

      // 5. FBA / BIP scope (aggression vs off-task)
      if (q.includes("fba") || q.includes("functional behavior") || q.includes("off-task") || (q.includes("behavior") && q.includes("aggression"))) {
        return item.id === "fba-scope-not-just-aggression";
      }

      // 6. Good grades & 504 eligibility
      if (
        (q.includes("good grades") || q.includes("passing grades") || q.includes("high grades")) &&
        (q.includes("504") || q.includes("get a 504") || q.includes("cannot get a 504") || q.includes("deny"))
      ) {
        return item.id === "sec-504-good-grades" || item.id === "child-find-grades";
      }

      // 7. Service removal / clerical change
      if (
        (q.includes("remove a service") || q.includes("clerical change") || q.includes("cut service") || q.includes("reduce service")) ||
        (q.includes("service") && q.includes("clerical"))
      ) {
        return item.id === "service-removal-not-clerical" || item.id === "idea-300-503";
      }

      // 8. General MDR
      if (q.includes("mdr") || q.includes("manifestation")) {
        return item.id === "discipline-10-days" || item.id === "mdr-standards" || item.id === "fape-during-suspension";
      }

      // 9. General discipline
      if (q.includes("discipline") || q.includes("disciplinary removal") || q.includes("removed from school") || q.includes("out of placement") || q.includes("suspens") || q.includes("expul")) {
        return item.id === "discipline-10-days" || item.id === "mdr-standards" || item.id === "fape-during-suspension";
      }

      // 10. Drug/alcohol
      if (q.includes("drug") || q.includes("alcohol") || q.includes("substance")) {
        return item.id === "sec-504-drug-exception" || item.id === "mdr-standards";
      }

      // 11. PWN
      if (q.includes("pwn") || q.includes("prior written notice") || q.includes("written notice")) {
        return item.id === "idea-300-503";
      }

      // 12. Passing grades general
      if (q.includes("pass") && (q.includes("grade") || q.includes("academ") || q.includes("deni") || q.includes("refus"))) {
        return item.id === "child-find-grades" || item.id === "sec-504-good-grades" || item.id === "idea-300-503";
      }

      // 13. IEE
      if (q.includes("iee") || q.includes("independent eval")) {
        return item.id === "idea-300-502";
      }

      // 14. Initial evaluation timeline
      if (q.includes("initial eval") || q.includes("timeline") || q.includes("60 day") || q.includes("mtss") || q.includes("rti")) {
        return item.id === "idea-300-301";
      }

      // Fallback keyword matching
      return (
        q.includes(item.topic) ||
        item.title.toLowerCase().includes(q) ||
        (item.citation && q.includes(item.citation.toLowerCase()))
      );
    });
  }

  /**
   * Generates a structured prompt block containing verified special ed legal standards
   * to inject directly into the LLM system prompt.
   */
  public static getSubstantivePromptContext(queryOrTranscript: string): string {
    const snippets = this.retrieveRelevantKnowledge(queryOrTranscript);
    if (snippets.length === 0) {
      return "";
    }

    const lines = snippets.map((s) => {
      let block = `• [${s.title} | ${s.citation}]:\n  - Applicable Principle: ${s.applicablePrinciple || s.summary}`;
      if (s.keyDistinctions) {
        block += `\n  - Key Distinctions: ${s.keyDistinctions}`;
      }
      if (s.conditions) {
        block += `\n  - Conditions & Thresholds: ${s.conditions}`;
      }
      if (s.missingFactsToVerify) {
        block += `\n  - Missing Facts to Check: ${s.missingFactsToVerify}`;
      }
      return block;
    });

    return `\n\nVERIFIED SPECIAL EDUCATION & DISABILITY LEGAL STANDARDS (Apply directly to guidance):
${lines.join("\n\n")}`;
  }

  /**
   * Match topic against verified knowledge library for citation pills.
   */
  public static getSourcesForTopic(topicQuery: string): RelatedSource[] {
    const matches = this.retrieveRelevantKnowledge(topicQuery);

    if (matches.length > 0) {
      return matches.slice(0, 3).map((m) => ({
        title: `${m.title} (${m.citation})`,
        url: m.url,
        isVerified: true,
      }));
    }

    return [
      {
        title: "SOURCE VERIFICATION NEEDED",
        url: undefined,
        isVerified: false,
      },
    ];
  }
}
