/**
 * Waypoint Advocates — Federal Guidance Archive Data Engine
 * Official U.S. Department of Education Guidance, Dear Colleague Letters (DCL),
 * OSEP Policy Letters, OCR Guidance, and Policy Support Documents.
 *
 * Official Repositories:
 * - OSEP Policy Letters & Support Documents: https://sites.ed.gov/idea/policy-letters-policy-support-documents/
 * - IDEA Policy Guidance: https://sites.ed.gov/idea/policy-guidance/
 * - OCR Reading Room: https://www2.ed.gov/about/offices/list/ocr/frontpage/faq/readingroom.html
 * - U.S. Department of Education: https://www.ed.gov
 */

export type GuidanceStatus =
  | "Current / Verified"
  | "Historical"
  | "Superseded"
  | "Withdrawn or Rescinded"
  | "Status Unconfirmed"
  | "Source Unavailable";

export type IssuingOffice = "OSEP" | "OSERS" | "OCR" | "ED Office of the Secretary" | "ED & DOJ";

export type DocumentType =
  | "Dear Colleague Letter"
  | "Policy Letter"
  | "Questions and Answers"
  | "Policy Guidance Document"
  | "Resource Guide"
  | "Technical Assistance Memo"
  | "Fact Sheet";

export interface FederalGuidanceDocumentData {
  id: string;
  documentNumber?: string;
  title: string;
  issuingOffice: IssuingOffice;
  dateIssued: string; // YYYY-MM-DD
  publicationYear: number;
  documentType: DocumentType;
  relatedLaws: string[];
  relatedCitations: string[];
  summary: string;
  keyPoints: string[];
  officialSourceUrl: string;
  pdfUrl?: string;
  topics: string[];
  guidanceStatus: GuidanceStatus;
  statusNotice?: string;
  supersededBy?: string;
  rescissionDate?: string;
  lastVerifiedDate: string;
  verificationNotes?: string;
}

export interface GuidanceLawLinkData {
  guidanceId: string;
  provisionId: string;
  sectionCitation: string;
  relationshipType: "interprets" | "clarifies" | "implements" | "enforces";
  notes?: string;
}

export const VERIFIED_FEDERAL_GUIDANCE_DOCUMENTS: FederalGuidanceDocumentData[] = [
  {
    id: "dcl-2016-08-01-behavior",
    documentNumber: "OSEP 16-07",
    title: "Dear Colleague Letter on Ensuring Equity and Providing Behavioral Supports to Students with Disabilities",
    issuingOffice: "OSERS",
    dateIssued: "2016-08-01",
    publicationYear: 2016,
    documentType: "Dear Colleague Letter",
    relatedLaws: ["IDEA Part B", "Section 504"],
    relatedCitations: ["34 CFR § 300.324(a)(2)(i)", "34 CFR § 300.530"],
    summary:
      "Clarifies that failure to provide appropriate positive behavioral interventions and supports (PBIS) in an IEP when a child's behavior impedes learning can result in a denial of FAPE. Emphasizes that disciplinary removals (including informal removals and sending children home early) can trigger a change of placement and require a Manifestation Determination Review.",
    keyPoints: [
      "School districts must proactively assess and provide positive behavioral supports before resorting to disciplinary exclusions.",
      "Informal removals (e.g., repeatedly calling parents to pick up a student early due to behavior) count toward the 10-day disciplinary limit.",
      "Failure to implement behavioral supports required by an IEP constitutes an implementation failure and a denial of FAPE.",
      "Schools must not rely on repeated short-term suspensions in lieu of conducting an FBA and adopting a BIP.",
    ],
    officialSourceUrl: "https://sites.ed.gov/idea/files/dcl-on-pbis-in-ieps-08-01-2016.pdf",
    pdfUrl: "https://sites.ed.gov/idea/files/dcl-on-pbis-in-ieps-08-01-2016.pdf",
    topics: ["Behavioral interventions", "Discipline and MDR", "FAPE", "IEP development"],
    guidanceStatus: "Current / Verified",
    lastVerifiedDate: "2026-10-01",
    verificationNotes: "Verified active guidance on sites.ed.gov/idea.",
  },
  {
    id: "dcl-2015-10-23-dyslexia",
    documentNumber: "OSERS DCL 2015-10",
    title: "Dear Colleague Letter on Dyslexia, Dyscalculia, and Dysgraphia in Evaluations and IEPs",
    issuingOffice: "OSERS",
    dateIssued: "2015-10-23",
    publicationYear: 2015,
    documentType: "Dear Colleague Letter",
    relatedLaws: ["IDEA Part B"],
    relatedCitations: ["34 CFR § 300.8(c)(10)", "34 CFR § 300.307", "34 CFR § 300.309"],
    summary:
      "Clarifies that nothing in IDEA prohibits schools from using the terms 'dyslexia,' 'dyscalculia,' and 'dysgraphia' in evaluations, eligibility determinations, or IEP documents. OSERS strongly encourages states and LEAs to use these specific terms to accurately identify students' conditions and tailor instruction.",
    keyPoints: [
      "IDEA's definition of Specific Learning Disability explicitly includes Dyslexia as an example.",
      "Districts may not refuse to evaluate or refuse to include the word 'dyslexia' in IEP paperwork.",
      "Using precise diagnostic terminology helps educators design targeted, evidence-based reading interventions (e.g., structured literacy).",
      "Schools cannot claim state regulations prohibit using clinical terminology in IEP meetings.",
    ],
    officialSourceUrl: "https://sites.ed.gov/idea/files/idea-dyslexia-guidance.pdf",
    pdfUrl: "https://sites.ed.gov/idea/files/idea-dyslexia-guidance.pdf",
    topics: ["Dyslexia and reading disabilities", "Evaluation and eligibility", "IEP development"],
    guidanceStatus: "Current / Verified",
    lastVerifiedDate: "2026-10-01",
    verificationNotes: "Verified active guidance on sites.ed.gov/idea.",
  },
  {
    id: "osep-letter-zirkel-2019",
    documentNumber: "Letter to Zirkel",
    title: "OSEP Policy Letter: Independent Educational Evaluations (IEE) and Public Expense Rules",
    issuingOffice: "OSEP",
    dateIssued: "2019-12-11",
    publicationYear: 2019,
    documentType: "Policy Letter",
    relatedLaws: ["IDEA Part B"],
    relatedCitations: ["34 CFR § 300.502", "34 CFR § 300.502(b)(2)"],
    summary:
      "Clarifies parent rights regarding Independent Educational Evaluations (IEEs) at public expense. Affirms that when a parent requests an IEE, the public agency must without unnecessary delay either file a due process complaint or ensure an IEE is provided at public expense, and cannot simply say 'no' or delay action.",
    keyPoints: [
      "Public agency has no legal option to refuse an IEE without filing for due process.",
      "The agency cannot place unreasonable cost caps or geographic boundaries that prevent parents from finding a qualified independent evaluator.",
      "Agency must act without unnecessary delay; delaying months while attempting informal discussions violates federal regulations.",
      "Parent is not required to explain why they disagree with the district's evaluation as a condition of receiving an IEE.",
    ],
    officialSourceUrl: "https://sites.ed.gov/idea/policy-letters-policy-support-documents/",
    topics: ["Procedural safeguards", "Evaluation and eligibility", "Due process"],
    guidanceStatus: "Current / Verified",
    lastVerifiedDate: "2026-10-01",
    verificationNotes: "Verified in OSEP Policy Letters Archive.",
  },
  {
    id: "ocr-dcl-2013-08-bullying",
    title: "Dear Colleague Letter: Preventing and Addressing Bullying of Students with Disabilities",
    issuingOffice: "OCR",
    dateIssued: "2013-08-20",
    publicationYear: 2013,
    documentType: "Dear Colleague Letter",
    relatedLaws: ["IDEA Part B", "Section 504", "ADA Title II"],
    relatedCitations: ["34 CFR § 300.101", "34 CFR § 104.33"],
    summary:
      "Explains that bullying of a student with a disability on any basis can result in a denial of FAPE under IDEA and Section 504 if it results in the student being unable to participate in or benefit from educational programs. When a school knows or should know of bullying, it must convene the IEP team to determine if needs have changed.",
    keyPoints: [
      "Bullying can deny FAPE even if the bullying is not explicitly based on the student's disability.",
      "School must immediately convene the IEP or 504 team to assess whether student grades, attendance, or emotional needs have changed.",
      "The school cannot simply tell the bullied student to change classrooms or schedules if that alters their placement in the LRE.",
      "Remedies may include compensatory educational services, counseling, and environmental adjustments.",
    ],
    officialSourceUrl: "https://www2.ed.gov/about/offices/list/ocr/letters/colleague-201308.pdf",
    pdfUrl: "https://www2.ed.gov/about/offices/list/ocr/letters/colleague-201308.pdf",
    topics: ["Bullying and harassment", "FAPE", "Section 504 accommodations", "IEP development"],
    guidanceStatus: "Current / Verified",
    lastVerifiedDate: "2026-10-01",
    verificationNotes: "Verified on ed.gov OCR Reading Room.",
  },
  {
    id: "osep-qa-2022-07-discipline",
    title: "Questions and Answers: Addressing the Needs of Children with Disabilities and IDEA's Discipline Provisions",
    issuingOffice: "OSEP",
    dateIssued: "2022-07-19",
    publicationYear: 2022,
    documentType: "Questions and Answers",
    relatedLaws: ["IDEA Part B"],
    relatedCitations: ["34 CFR § 300.530", "34 CFR § 300.536", "34 CFR § 300.534"],
    summary:
      "Comprehensive federal guidance addressing student behavior, disciplinary removals, Manifestation Determination Reviews (MDR), and informal removals. Highlights the duty of schools to support students with mental health and behavioral challenges, avoid exclusionary discipline, and ensure educational continuity.",
    keyPoints: [
      "Informal removals (shortened school days, repeated calls for parents to take students home) violate IDEA if conducted without IEP team process.",
      "MDR must carefully evaluate whether the LEA failed to implement the IEP before deciding behavior was not a manifestation.",
      "Schools must provide educational services after the 10th cumulative day of removal in a school year.",
      "Students not yet found eligible are protected if the school had a 'basis of knowledge' prior to the incident.",
    ],
    officialSourceUrl: "https://sites.ed.gov/idea/files/qa-addressing-the-needs-of-children-with-disabilities-and-idea-discipline-provisions.pdf",
    pdfUrl: "https://sites.ed.gov/idea/files/qa-addressing-the-needs-of-children-with-disabilities-and-idea-discipline-provisions.pdf",
    topics: ["Discipline and MDR", "Behavioral interventions", "FAPE", "Procedural safeguards"],
    guidanceStatus: "Current / Verified",
    lastVerifiedDate: "2026-10-01",
    verificationNotes: "Verified active guidance on sites.ed.gov/idea.",
  },
  {
    id: "ocr-dcl-2016-07-adhd",
    title: "Dear Colleague Letter and Resource Guide on Students with ADHD and Section 504",
    issuingOffice: "OCR",
    dateIssued: "2016-07-26",
    publicationYear: 2016,
    documentType: "Dear Colleague Letter",
    relatedLaws: ["Section 504", "ADA Title II"],
    relatedCitations: ["34 CFR § 104.33", "34 CFR § 104.35", "34 CFR § 300.8(c)(9)"],
    summary:
      "Provides comprehensive guidance on the obligation of school districts to identify, evaluate, and provide appropriate accommodations and services to students with Attention Deficit Hyperactivity Disorder (ADHD) under Section 504.",
    keyPoints: [
      "Districts may not refuse to evaluate a student for 504 accommodations merely because the student gets good grades.",
      "Schools cannot rely on mitigating measures like ADHD medication to deny 504 eligibility.",
      "Evaluations must be comprehensive and conducted at no cost to the family.",
      "Failure to provide behavioral interventions, organizational supports, and testing accommodations violates Section 504.",
    ],
    officialSourceUrl: "https://www2.ed.gov/about/offices/list/ocr/letters/colleague-201607-504-adhd.pdf",
    pdfUrl: "https://www2.ed.gov/about/offices/list/ocr/letters/colleague-201607-504-adhd.pdf",
    topics: ["Section 504 accommodations", "Evaluation and eligibility", "FAPE"],
    guidanceStatus: "Current / Verified",
    lastVerifiedDate: "2026-10-01",
    verificationNotes: "Verified on ed.gov OCR Reading Room.",
  },
  {
    id: "ocr-dcl-2016-12-restraint",
    title: "Dear Colleague Letter on Restraint and Seclusion of Students with Disabilities",
    issuingOffice: "OCR",
    dateIssued: "2016-12-28",
    publicationYear: 2016,
    documentType: "Resource Guide",
    relatedLaws: ["Section 504", "ADA Title II"],
    relatedCitations: ["34 CFR § 104.4", "34 CFR § 104.33"],
    summary:
      "Addresses the use of restraint and seclusion in public schools under Section 504. Warns that the discriminatory use of physical restraint or seclusion against students with disabilities can constitute unlawful discrimination and deny FAPE.",
    keyPoints: [
      "Restraint or seclusion should never be used as punishment, discipline, or staff convenience.",
      "Repeated use indicates that the student's IEP or BIP is failing and must be immediately reevaluated.",
      "Trauma from restraint can severely impair learning and constitute a denial of educational benefit under Section 504.",
    ],
    officialSourceUrl: "https://www2.ed.gov/about/offices/list/ocr/letters/colleague-201612-504-restraint-seclusion-ps.pdf",
    pdfUrl: "https://www2.ed.gov/about/offices/list/ocr/letters/colleague-201612-504-restraint-seclusion-ps.pdf",
    topics: ["Restraint and seclusion", "Behavioral interventions", "Section 504 accommodations"],
    guidanceStatus: "Current / Verified",
    lastVerifiedDate: "2026-10-01",
    verificationNotes: "Verified on ed.gov OCR Reading Room.",
  },
  {
    id: "osep-letter-musgrove-2010",
    documentNumber: "Letter to Musgrove",
    title: "OSEP Policy Letter: Audio and Video Recording of IEP Meetings",
    issuingOffice: "OSEP",
    dateIssued: "2010-11-23",
    publicationYear: 2010,
    documentType: "Policy Letter",
    relatedLaws: ["IDEA Part B"],
    relatedCitations: ["34 CFR § 300.322", "34 CFR § 300.501"],
    summary:
      "Clarifies that while Part B of IDEA does not explicitly address audio or video recording of IEP meetings, public agencies must ensure that parents can meaningfully participate. If a district policy limits recording, an exception must be granted if recording is necessary for a parent to understand or participate in the meeting.",
    keyPoints: [
      "IDEA neither prohibits nor explicitly mandates allowing parents to record IEP meetings.",
      "State law and local board policy govern recording, but must yield if a parent requires a recording to understand proceedings.",
      "If a parent has a disability, language barrier, or needs recording for meaningful participation, district must permit recording.",
    ],
    officialSourceUrl: "https://sites.ed.gov/idea/policy-letters-policy-support-documents/",
    topics: ["Parent participation", "IEP development", "Procedural safeguards"],
    guidanceStatus: "Current / Verified",
    lastVerifiedDate: "2026-10-01",
    verificationNotes: "Verified in OSEP Policy Letters Archive.",
  },
  {
    id: "osep-letter-baus-2015",
    documentNumber: "Letter to Baus",
    title: "OSEP Policy Letter: Agency Criteria and Restrictions on Independent Educational Evaluations (IEE)",
    issuingOffice: "OSEP",
    dateIssued: "2015-02-23",
    publicationYear: 2015,
    documentType: "Policy Letter",
    relatedLaws: ["IDEA Part B"],
    relatedCitations: ["34 CFR § 300.502(e)"],
    summary:
      "Clarifies that while a school district may establish criteria under which an IEE is obtained, those criteria cannot be so restrictive that they eliminate a parent's ability to obtain an independent evaluation. The criteria must match the criteria the public agency uses when it initiates an evaluation.",
    keyPoints: [
      "Districts cannot impose criteria on an IEE evaluator that it does not impose on its own school psychologists or evaluators.",
      "Parents must be given the opportunity to demonstrate unique circumstances justifying an evaluator who does not meet standard agency criteria.",
      "Districts cannot cap evaluator fees below the prevailing market rate in the region.",
    ],
    officialSourceUrl: "https://sites.ed.gov/idea/policy-letters-policy-support-documents/",
    topics: ["Procedural safeguards", "Evaluation and eligibility"],
    guidanceStatus: "Current / Verified",
    lastVerifiedDate: "2026-10-01",
    verificationNotes: "Verified in OSEP Policy Letters Archive.",
  },
  {
    id: "osep-memo-11-07-rti",
    documentNumber: "OSEP Memo 11-07",
    title: "OSEP Memorandum: Response to Intervention (RTI) Cannot Be Used to Delay or Deny an Evaluation",
    issuingOffice: "OSEP",
    dateIssued: "2011-01-21",
    publicationYear: 2011,
    documentType: "Technical Assistance Memo",
    relatedLaws: ["IDEA Part B"],
    relatedCitations: ["34 CFR § 300.111", "34 CFR § 300.301", "34 CFR § 300.307"],
    summary:
      "Strict federal guidance clarifying that an LEA cannot use Response to Intervention (RTI) or Multi-Tiered System of Supports (MTSS) strategies to delay or deny a timely initial evaluation to determine eligibility for special education and related services when a parent requests an evaluation or a disability is suspected.",
    keyPoints: [
      "RTI cannot be used as an excuse to stop or postpone the 60-day evaluation timeline.",
      "If a parent requests an evaluation in writing, the district cannot say 'we must complete Tier 2 or Tier 3 RTI first.'",
      "District must either provide written consent within a reasonable timeframe or issue Prior Written Notice refusing the evaluation.",
      "One of the most powerful and cited OSEP memoranda in special education advocacy.",
    ],
    officialSourceUrl: "https://sites.ed.gov/idea/files/idea-memo-11-07.pdf",
    pdfUrl: "https://sites.ed.gov/idea/files/idea-memo-11-07.pdf",
    topics: ["Evaluation and eligibility", "FAPE", "Procedural safeguards", "Dyslexia and reading disabilities"],
    guidanceStatus: "Current / Verified",
    lastVerifiedDate: "2026-10-01",
    verificationNotes: "Verified active foundational guidance on sites.ed.gov/idea.",
  },
  {
    id: "osep-psd-2023-supervision",
    title: "OSEP Policy Support Document: State General Supervision and Timely Dispute Resolution",
    issuingOffice: "OSEP",
    dateIssued: "2023-07-24",
    publicationYear: 2023,
    documentType: "Policy Guidance Document",
    relatedLaws: ["IDEA Part B"],
    relatedCitations: ["34 CFR § 300.149", "34 CFR § 300.151", "34 CFR § 300.152"],
    summary:
      "Updated guidance reinforcing state educational agencies' (SEAs) statutory responsibility under IDEA to monitor LEAs, investigate state complaints within 60 days, ensure corrective actions are completed within one year, and order appropriate compensatory services for affected students.",
    keyPoints: [
      "States cannot extend the 60-day complaint resolution timeline except under exceptional circumstances documented on a case-by-case basis.",
      "SEAs must actively order compensatory services and corrective action plans when LEAs fail to implement IEPs.",
      "General supervision requires states to have effective data monitoring systems to catch systemic noncompliance.",
    ],
    officialSourceUrl: "https://sites.ed.gov/idea/files/osep-general-supervision-guidance-07-24-2023.pdf",
    pdfUrl: "https://sites.ed.gov/idea/files/osep-general-supervision-guidance-07-24-2023.pdf",
    topics: ["State complaints", "Procedural safeguards", "Compensatory services"],
    guidanceStatus: "Current / Verified",
    lastVerifiedDate: "2026-10-01",
    verificationNotes: "Verified on sites.ed.gov/idea.",
  },
  {
    id: "osep-dcl-2021-10-compensatory",
    title: "Return to School Roadmap: Development and Implementation of IEPs and Compensatory Services",
    issuingOffice: "OSEP",
    dateIssued: "2021-10-19",
    publicationYear: 2021,
    documentType: "Dear Colleague Letter",
    relatedLaws: ["IDEA Part B"],
    relatedCitations: ["34 CFR § 300.101", "34 CFR § 300.324"],
    summary:
      "Guides IEP teams on addressing learning loss, regression, and missed special education and related services. Emphasizes that IEP teams must determine whether compensatory services are owed to students with disabilities whose services were delayed, interrupted, or not provided in accordance with their IEPs.",
    keyPoints: [
      "Compensatory education is owed when a child fails to receive required IEP services and suffers educational harm or lack of expected progress.",
      "The IEP team must calculate missed minutes and determine whether additional specialized instruction or therapy is required.",
      "School staffing shortages do not relieve districts of the obligation to provide compensatory services.",
    ],
    officialSourceUrl: "https://sites.ed.gov/idea/files/dcl-iep-compensatory-services-10-19-2021.pdf",
    pdfUrl: "https://sites.ed.gov/idea/files/dcl-iep-compensatory-services-10-19-2021.pdf",
    topics: ["Compensatory services", "FAPE", "IEP development"],
    guidanceStatus: "Historical",
    statusNotice: "Retained for historical research regarding post-interruption compensatory service standards.",
    lastVerifiedDate: "2026-10-01",
    verificationNotes: "Official historical guidance from OSEP.",
  },
  {
    id: "withdrawn-notice-2017-rescission",
    title: "Notice of Rescission of 2016 Guidance on Transgender Students (Archival Sample)",
    issuingOffice: "ED & DOJ",
    dateIssued: "2017-02-22",
    publicationYear: 2017,
    documentType: "Dear Colleague Letter",
    relatedLaws: ["Title IX", "Section 504"],
    relatedCitations: ["34 CFR Part 106", "34 CFR § 104.4"],
    summary:
      "Official joint notification by the Department of Education and Department of Justice withdrawing the May 13, 2016 Dear Colleague Letter on Transgender Students. Retained in the archive to document the official rescission date, regulatory rationale, and statutory history.",
    keyPoints: [
      "Archival document demonstrating formal rescission under federal administrative procedure.",
      "Documents retained for legal research must clearly indicate whether they reflect current agency position.",
      "Withdrawal was published in official correspondence on February 22, 2017.",
    ],
    officialSourceUrl: "https://www2.ed.gov/about/offices/list/ocr/letters/colleague-201702-title-ix.pdf",
    pdfUrl: "https://www2.ed.gov/about/offices/list/ocr/letters/colleague-201702-title-ix.pdf",
    topics: ["Procedural safeguards", "Bullying and harassment"],
    guidanceStatus: "Withdrawn or Rescinded",
    statusNotice: "Officially withdrawn and rescinded by joint ED/DOJ letter on February 22, 2017.",
    rescissionDate: "2017-02-22",
    lastVerifiedDate: "2026-10-01",
    verificationNotes: "Archival record of official rescission.",
  },
];

export const VERIFIED_GUIDANCE_LAW_LINKS: GuidanceLawLinkData[] = [
  {
    guidanceId: "dcl-2016-08-01-behavior",
    provisionId: "idea-300-324",
    sectionCitation: "34 CFR § 300.324(a)(2)(i)",
    relationshipType: "interprets",
    notes: "Clarifies mandatory duty of IEP teams to consider positive behavioral interventions before disciplinary removals.",
  },
  {
    guidanceId: "dcl-2016-08-01-behavior",
    provisionId: "idea-300-530",
    sectionCitation: "34 CFR § 300.530",
    relationshipType: "clarifies",
    notes: "Applies 10-day discipline rules to informal removals and shortened school days.",
  },
  {
    guidanceId: "dcl-2015-10-23-dyslexia",
    provisionId: "idea-300-8",
    sectionCitation: "34 CFR § 300.8(c)(10)",
    relationshipType: "clarifies",
    notes: "Confirms dyslexia is an explicit statutory example under Specific Learning Disability.",
  },
  {
    guidanceId: "dcl-2015-10-23-dyslexia",
    provisionId: "idea-300-304",
    sectionCitation: "34 CFR § 300.304",
    relationshipType: "interprets",
    notes: "Encourages comprehensive evaluation of reading, phonological processing, and written expression.",
  },
  {
    guidanceId: "osep-letter-zirkel-2019",
    provisionId: "idea-300-502",
    sectionCitation: "34 CFR § 300.502",
    relationshipType: "interprets",
    notes: "Establishes that district must act without unnecessary delay and cannot refuse IEE without filing due process.",
  },
  {
    guidanceId: "ocr-dcl-2013-08-bullying",
    provisionId: "idea-300-101",
    sectionCitation: "34 CFR § 300.101",
    relationshipType: "interprets",
    notes: "Explains how disability bullying causes educational regression and results in a denial of FAPE.",
  },
  {
    guidanceId: "ocr-dcl-2013-08-bullying",
    provisionId: "sec504-104-33",
    sectionCitation: "34 CFR § 104.33",
    relationshipType: "enforces",
    notes: "Section 504 prohibition against disability discrimination via hostile educational environment.",
  },
  {
    guidanceId: "osep-qa-2022-07-discipline",
    provisionId: "idea-300-530",
    sectionCitation: "34 CFR § 300.530",
    relationshipType: "interprets",
    notes: "Authoritative guidance on conducting MDRs, evaluating implementation failures, and FBAs.",
  },
  {
    guidanceId: "ocr-dcl-2016-07-adhd",
    provisionId: "sec504-104-33",
    sectionCitation: "34 CFR § 104.33",
    relationshipType: "interprets",
    notes: "Mandates provision of accommodations for ADHD under Section 504 FAPE.",
  },
  {
    guidanceId: "ocr-dcl-2016-07-adhd",
    provisionId: "sec504-104-35",
    sectionCitation: "34 CFR § 104.35",
    relationshipType: "enforces",
    notes: "Requires evaluation for ADHD without requiring parent to pay for medical diagnosis.",
  },
  {
    guidanceId: "ocr-dcl-2016-12-restraint",
    provisionId: "sec504-104-33",
    sectionCitation: "34 CFR § 104.33",
    relationshipType: "enforces",
    notes: "Discriminatory restraint or seclusion violates Section 504 and deprives student of FAPE.",
  },
  {
    guidanceId: "osep-letter-musgrove-2010",
    provisionId: "idea-300-322",
    sectionCitation: "34 CFR § 300.322",
    relationshipType: "interprets",
    notes: "Parent right to record IEP meetings when necessary to participate and understand decisions.",
  },
  {
    guidanceId: "osep-letter-baus-2015",
    provisionId: "idea-300-502",
    sectionCitation: "34 CFR § 300.502",
    relationshipType: "clarifies",
    notes: "Limits district agency criteria so it does not unreasonably restrict parent choice of IEE evaluator.",
  },
  {
    guidanceId: "osep-memo-11-07-rti",
    provisionId: "idea-300-111",
    sectionCitation: "34 CFR § 300.111",
    relationshipType: "enforces",
    notes: "Child find requires evaluation; MTSS/RTI cannot be used to delay or deny evaluation.",
  },
  {
    guidanceId: "osep-memo-11-07-rti",
    provisionId: "idea-300-301",
    sectionCitation: "34 CFR § 300.301",
    relationshipType: "clarifies",
    notes: "60-day evaluation timeline cannot be suspended for RTI interventions.",
  },
  {
    guidanceId: "osep-psd-2023-supervision",
    provisionId: "idea-300-151",
    sectionCitation: "34 CFR § 300.151–§ 300.153",
    relationshipType: "interprets",
    notes: "Strict 60-day state complaint timeline and SEA power to order compensatory education.",
  },
  {
    guidanceId: "osep-dcl-2021-10-compensatory",
    provisionId: "idea-300-101",
    sectionCitation: "34 CFR § 300.101",
    relationshipType: "interprets",
    notes: "IEP teams must evaluate and award compensatory services for interrupted or delayed services.",
  },
];
