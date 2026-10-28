/**
 * Waypoint Advocates — Federal Education Law Library
 * Comprehensive legal compendium of federal statutes, federal regulations,
 * procedural safeguards, and statutory timelines governing special education.
 *
 * Primary Sources:
 * - Individuals with Disabilities Education Act (IDEA), 20 U.S.C. Chapter 33
 * - IDEA Part B Regulations, 34 CFR Part 300
 * - IDEA Part C Regulations, 34 CFR Part 303
 * - Section 504 of the Rehabilitation Act of 1973, 29 U.S.C. § 794; 34 CFR Part 104
 * - Americans with Disabilities Act (ADA) Title II, 42 U.S.C. § 12131; 28 CFR Part 35
 * - Family Educational Rights and Privacy Act (FERPA), 20 U.S.C. § 1232g; 34 CFR Part 99
 * - Every Student Succeeds Act (ESSA), 20 U.S.C. § 6301 et seq.
 */

export interface FederalLegalProvisionData {
  id: string;
  act: "IDEA Part B" | "IDEA Part C" | "Section 504" | "ADA Title II" | "FERPA" | "ESSA";
  subpart: string;
  sectionCitation: string;
  title: string;
  plainLanguageExplanation: string;
  keyPoints: string[];
  advocacyTips: string;
  statutoryTimeline?: string;
  officialUrl: string;
  authorityType: "Statute" | "Federal Regulation";
  topics: string[];
  relatedCitations?: string[];
  lastVerifiedDate: string;
  verificationStatus: "Verified" | "Review Needed" | "Unverified";
}

export const FEDERAL_ACTS = [
  "IDEA Part B",
  "IDEA Part C",
  "Section 504",
  "ADA Title II",
  "FERPA",
  "ESSA",
] as const;

export const FEDERAL_SUBPARTS = [
  "Subpart A — General Provisions & Definitions",
  "Subpart B — State Eligibility, FAPE & LRE",
  "Subpart D — Evaluations, Eligibility & IEP Development",
  "Subpart E — Procedural Safeguards, Due Process & MDR",
  "Subpart G — Authorization & Allotment",
  "Part C — Infants & Toddlers with Disabilities",
  "Section 504 Subpart D — Preschool, Elementary & Secondary Education",
  "ADA Title II — Public Entities & Effective Communication",
  "FERPA — Privacy of Education Records",
  "ESSA — Academic Standards & Assessments",
] as const;

export const FEDERAL_TOPICS = [
  "FAPE",
  "IEP development",
  "Evaluation and eligibility",
  "Dyslexia and reading disabilities",
  "Behavioral interventions",
  "Discipline and MDR",
  "Restraint and seclusion",
  "Bullying and harassment",
  "LRE and inclusion",
  "Parent participation",
  "Procedural safeguards",
  "Prior Written Notice",
  "Compensatory services",
  "Section 504 accommodations",
  "Transportation",
  "Assistive technology",
  "Transition services",
  "State complaints",
  "Due process",
] as const;

export const VERIFIED_FEDERAL_LEGAL_PROVISIONS: FederalLegalProvisionData[] = [
  // ── DEFINITIONS & ELIGIBILITY ─────────────────────────────────────────────
  {
    id: "idea-300-8",
    act: "IDEA Part B",
    subpart: "Subpart A — General Provisions & Definitions",
    sectionCitation: "34 CFR § 300.8",
    title: "Child with a disability (Definitions & 13 Eligibility Categories)",
    plainLanguageExplanation:
      "Defines a child with a disability as a child evaluated as having one of 13 qualifying impairments who, by reason thereof, needs special education and related services. The categories encompass Autism, Deaf-blindness, Deafness, Emotional Disturbance, Hearing Impairment, Intellectual Disability, Multiple Disabilities, Orthopedic Impairment, Other Health Impairment (including ADHD), Specific Learning Disability (including Dyslexia, Dyscalculia, and Dysgraphia), Speech or Language Impairment, Traumatic Brain Injury, and Visual Impairment. Eligibility requires both an identified disability AND a resulting educational need for specially designed instruction.",
    keyPoints: [
      "13 distinct federal disability categories under IDEA Part B.",
      "A clinical diagnosis alone does not guarantee eligibility; the disability must adversely affect educational performance and necessitate specially designed instruction.",
      "Other Health Impairment (OHI) explicitly covers chronic or acute health conditions including ADHD, diabetes, epilepsy, and sickle cell anemia.",
      "Specific Learning Disability explicitly encompasses Dyslexia, Dyscalculia, Dysgraphia, and minimal brain dysfunction.",
      "States may also use Developmental Delay for children ages 3 through 9.",
    ],
    advocacyTips:
      "When advocating for a child with ADHD, anxiety, or medical conditions, ensure the IEP team reviews both academic grades and executive functioning/behavioral impacts under the OHI or ED categories. Never accept a district statement that a student 'makes good grades and therefore cannot qualify.'",
    statutoryTimeline: "Determined at eligibility meeting within 60 calendar days of parental consent",
    officialUrl: "https://www.ecfr.gov/current/title-34/subtitle-B/chapter-III/part-300/subpart-A/section-300.8",
    authorityType: "Federal Regulation",
    topics: ["Evaluation and eligibility", "Dyslexia and reading disabilities", "FAPE"],
    relatedCitations: ["20 U.S.C. § 1401(3)", "34 CFR § 300.306", "34 CFR § 300.39"],
    lastVerifiedDate: "2026-10-01",
    verificationStatus: "Verified",
  },
  {
    id: "idea-300-34",
    act: "IDEA Part B",
    subpart: "Subpart A — General Provisions & Definitions",
    sectionCitation: "34 CFR § 300.34",
    title: "Related services (Supportive Services Required to Benefit from Instruction)",
    plainLanguageExplanation:
      "Defines related services as transportation and such developmental, corrective, and other supportive services as are required to assist a child with a disability to benefit from special education. Enumerates speech-language pathology, audiology, psychological services, physical therapy, occupational therapy, recreation, social work services, school nurse services, counseling, orientation and mobility services, and parent counseling and training.",
    keyPoints: [
      "Related services must be provided at no cost to the parent when necessary for the student to benefit from special education.",
      "The list is illustrative, not exhaustive; other services like art therapy or music therapy may qualify if required.",
      "Parent counseling and training is a mandatory related service when necessary to help parents understand the special needs of their child.",
      "Transportation encompasses travel to/from school and between schools, specialized equipment (buses, lifts, ramps), and specialized escorts.",
    ],
    advocacyTips:
      "If a student struggles with carryover of behavioral or speech strategies at home, advocate for Parent Counseling and Training under § 300.34(c)(8) as a formal related service in the IEP.",
    officialUrl: "https://www.ecfr.gov/current/title-34/subtitle-B/chapter-III/part-300/subpart-A/section-300.34",
    authorityType: "Federal Regulation",
    topics: ["FAPE", "Transportation", "IEP development", "Parent participation"],
    relatedCitations: ["20 U.S.C. § 1401(26)", "34 CFR § 300.320(a)(4)"],
    lastVerifiedDate: "2026-10-01",
    verificationStatus: "Verified",
  },
  {
    id: "idea-300-39",
    act: "IDEA Part B",
    subpart: "Subpart A — General Provisions & Definitions",
    sectionCitation: "34 CFR § 300.39",
    title: "Special education (Specially Designed Instruction)",
    plainLanguageExplanation:
      "Defines special education as specially designed instruction, at no cost to the parents, to meet the unique needs of a child with a disability. Specially designed instruction means adapting, as appropriate to the needs of an eligible child, the content, methodology, or delivery of instruction to address the child's unique needs and ensure access to the general curriculum so that the child can meet educational standards.",
    keyPoints: [
      "Core distinction between accommodations and special education: special education alters content, methodology, or delivery of instruction.",
      "Must be provided at no cost to parents (FAPE guarantee).",
      "Encompasses instruction in the classroom, home, hospitals, and residential institutions.",
      "Includes speech-language pathology if considered special education rather than related service under state standards.",
    ],
    advocacyTips:
      "Distinguish between accommodations (which change how a student accesses material) and specially designed instruction (which changes what is taught or the direct instructional methodology used by certified personnel).",
    officialUrl: "https://www.ecfr.gov/current/title-34/subtitle-B/chapter-III/part-300/subpart-A/section-300.39",
    authorityType: "Federal Regulation",
    topics: ["FAPE", "IEP development"],
    relatedCitations: ["20 U.S.C. § 1401(29)", "34 CFR § 300.101"],
    lastVerifiedDate: "2026-10-01",
    verificationStatus: "Verified",
  },

  // ── FAPE, CHILD FIND & LRE ────────────────────────────────────────────────
  {
    id: "idea-300-101",
    act: "IDEA Part B",
    subpart: "Subpart B — State Eligibility, FAPE & LRE",
    sectionCitation: "34 CFR § 300.101",
    title: "Free Appropriate Public Education (FAPE)",
    plainLanguageExplanation:
      "Establishes the fundamental statutory guarantee that a free appropriate public education must be available to all children residing in the State between the ages of 3 and 21, inclusive, including children with disabilities who have been suspended or expelled from school. FAPE requires special education and related services that are provided at public expense, under public supervision and direction, meet State educational standards, include an appropriate preschool, elementary, or secondary school education, and are provided in conformity with an IEP.",
    keyPoints: [
      "Absolute entitlement: FAPE is non-negotiable and cannot be conditioned on district funding or staff shortages.",
      "Applies to children advancing from grade to grade who nevertheless need special education.",
      "Services continue during disciplinary removals exceeding 10 cumulative school days.",
      "Supreme Court standard (Endrew F. v. Douglas County): The IEP must be reasonably calculated to enable a child to make progress appropriate in light of the child's circumstances.",
    ],
    advocacyTips:
      "Cite Endrew F. alongside § 300.101 whenever a school district proposes de minimis or trivial goals. A child's educational program must be ambitious and provide challenging objectives.",
    officialUrl: "https://www.ecfr.gov/current/title-34/subtitle-B/chapter-III/part-300/subpart-B/section-300.101",
    authorityType: "Federal Regulation",
    topics: ["FAPE", "Compensatory services", "IEP development"],
    relatedCitations: ["20 U.S.C. § 1412(a)(1)", "34 CFR § 300.17", "34 CFR § 300.530(d)"],
    lastVerifiedDate: "2026-10-01",
    verificationStatus: "Verified",
  },
  {
    id: "idea-300-111",
    act: "IDEA Part B",
    subpart: "Subpart B — State Eligibility, FAPE & LRE",
    sectionCitation: "34 CFR § 300.111",
    title: "Child Find (Affirmative Duty to Identify, Locate, and Evaluate)",
    plainLanguageExplanation:
      "Mandates that the State and school districts must have in effect policies and procedures to ensure that all children with disabilities residing in the State, including children who are homeless or wards of the State and children attending private schools, regardless of the severity of their disability, and who are in need of special education and related services, are identified, located, and evaluated. Child Find is an affirmative, ongoing duty of the public agency and does not require the parent to initiate a request.",
    keyPoints: [
      "Affirmative obligation: School districts cannot wait for parents to request an evaluation; they must act when there is suspicion of a disability.",
      "Covers highly mobile children (migrant and homeless children) and children advancing from grade to grade.",
      "Applies to private school students located within the district's boundaries.",
      "Failure of Child Find constitutes a substantive denial of FAPE and can support retroactive private placement reimbursement and compensatory education.",
    ],
    advocacyTips:
      "If a district delays evaluating a struggling student by insisting on multi-tiered systems of support (MTSS/RTI) first, invoke OSEP Memo 11-07 and § 300.111: RTI cannot be used to delay or deny an evaluation for special education.",
    officialUrl: "https://www.ecfr.gov/current/title-34/subtitle-B/chapter-III/part-300/subpart-B/section-300.111",
    authorityType: "Federal Regulation",
    topics: ["Evaluation and eligibility", "FAPE", "Compensatory services"],
    relatedCitations: ["20 U.S.C. § 1412(a)(3)", "34 CFR § 300.301", "34 CFR § 300.304"],
    lastVerifiedDate: "2026-10-01",
    verificationStatus: "Verified",
  },
  {
    id: "idea-300-114",
    act: "IDEA Part B",
    subpart: "Subpart B — State Eligibility, FAPE & LRE",
    sectionCitation: "34 CFR § 300.114",
    title: "Least Restrictive Environment (LRE Requirements)",
    plainLanguageExplanation:
      "Requires each public agency to ensure that to the maximum extent appropriate, children with disabilities, including children in public or private institutions or other care facilities, are educated with children who are nondisabled. Special classes, separate schooling, or other removal of children with disabilities from the regular educational environment occurs only if the nature or severity of the disability is such that education in regular classes with the use of supplementary aids and services cannot be achieved satisfactorily.",
    keyPoints: [
      "Strong federal presumption favoring full inclusion in the general education classroom.",
      "Removal requires prior good-faith provision of supplementary aids and services (paraprofessionals, assistive tech, modified materials).",
      "Cost or administrative inconvenience cannot be the sole basis for placing a student in a segregated setting.",
      "Placement decisions must be based on the IEP, not on disability category or availability of seats.",
    ],
    advocacyTips:
      "Before agreeing to a more restrictive placement (self-contained classroom or specialized school), demand evidence of all supplementary aids and services that were tried with fidelity in the general education classroom.",
    officialUrl: "https://www.ecfr.gov/current/title-34/subtitle-B/chapter-III/part-300/subpart-B/section-300.114",
    authorityType: "Federal Regulation",
    topics: ["LRE and inclusion", "IEP development", "FAPE"],
    relatedCitations: ["20 U.S.C. § 1412(a)(5)", "34 CFR § 300.115", "34 CFR § 300.116"],
    lastVerifiedDate: "2026-10-01",
    verificationStatus: "Verified",
  },
  {
    id: "idea-300-115",
    act: "IDEA Part B",
    subpart: "Subpart B — State Eligibility, FAPE & LRE",
    sectionCitation: "34 CFR § 300.115",
    title: "Continuum of alternative placements",
    plainLanguageExplanation:
      "Requires each public agency to ensure that a continuum of alternative placements is available to meet the needs of children with disabilities for special education and related services. The continuum must include instruction in regular classes, special classes, special schools, home instruction, and instruction in hospitals and institutions, and make provision for supplementary services (such as resource room or itinerant instruction) to be provided in conjunction with regular class placement.",
    keyPoints: [
      "A district cannot offer a one-size-fits-all placement (e.g., 'all students with autism go to classroom B').",
      "Must maintain availability of all continuum levels: general ed with support, co-taught, resource, self-contained, separate day school, residential, hospital, homebound.",
      "Alternative placements must be tailored to individual IEP goals, not administrative convenience.",
    ],
    advocacyTips:
      "If a district claims it doesn't offer a specific level of support on the continuum, remind the team that federal law mandates the availability of the full continuum.",
    officialUrl: "https://www.ecfr.gov/current/title-34/subtitle-B/chapter-III/part-300/subpart-B/section-300.115",
    authorityType: "Federal Regulation",
    topics: ["LRE and inclusion", "FAPE"],
    relatedCitations: ["34 CFR § 300.114", "34 CFR § 300.116"],
    lastVerifiedDate: "2026-10-01",
    verificationStatus: "Verified",
  },
  {
    id: "idea-300-116",
    act: "IDEA Part B",
    subpart: "Subpart B — State Eligibility, FAPE & LRE",
    sectionCitation: "34 CFR § 300.116",
    title: "Placements (Determining Educational Placement)",
    plainLanguageExplanation:
      "In determining the educational placement of a child with a disability, including a preschool child with a disability, each public agency must ensure that the placement decision is made by a group of persons, including the parents and other persons knowledgeable about the child, the meaning of evaluation data, and placement options; is made in conformity with LRE provisions; is determined at least annually; is based on the child's IEP; and is as close as possible to the child's home.",
    keyPoints: [
      "Parents are mandatory members of the placement decision group.",
      "The child must be educated in the school that he or she would attend if nondisabled unless the IEP requires some other arrangement.",
      "Placement cannot be determined solely on category of disability, configuration of delivery system, availability of educational or related services, or availability of space.",
    ],
    advocacyTips:
      "Watch out for predetermination: if school staff arrive at the IEP meeting with placement already decided without parent input, this is a procedural violation under § 300.116.",
    officialUrl: "https://www.ecfr.gov/current/title-34/subtitle-B/chapter-III/part-300/subpart-B/section-300.116",
    authorityType: "Federal Regulation",
    topics: ["LRE and inclusion", "Parent participation", "IEP development"],
    relatedCitations: ["34 CFR § 300.114", "34 CFR § 300.327"],
    lastVerifiedDate: "2026-10-01",
    verificationStatus: "Verified",
  },

  // ── EVALUATIONS & REEVALUATIONS ───────────────────────────────────────────
  {
    id: "idea-300-300",
    act: "IDEA Part B",
    subpart: "Subpart D — Evaluations, Eligibility & IEP Development",
    sectionCitation: "34 CFR § 300.300",
    title: "Parental consent for evaluations and services",
    plainLanguageExplanation:
      "Sets out explicit rules governing parental consent. The public agency proposing to conduct an initial evaluation must obtain informed consent from the parent before conducting the evaluation. Parental consent for initial evaluation must not be construed as consent for initial provision of special education and related services. Separate consent is required before services can begin. A parent may revoke consent for services in writing at any time.",
    keyPoints: [
      "Consent must be informed, voluntary, and in the parent's native language.",
      "Consent for evaluation does NOT grant the district authority to place the child or start services.",
      "If a parent refuses consent for initial services, the district cannot use due process to override the parent's refusal.",
      "Parental revocation of consent must be in writing; upon revocation, the district must provide Prior Written Notice before stopping services.",
    ],
    advocacyTips:
      "When signing consent for evaluations, parents can include a written note specifying: 'Consent is granted for evaluation only. Any placement or service changes require separate review and written agreement.'",
    officialUrl: "https://www.ecfr.gov/current/title-34/subtitle-B/chapter-III/part-300/subpart-D/section-300.300",
    authorityType: "Federal Regulation",
    topics: ["Evaluation and eligibility", "Procedural safeguards", "Parent participation"],
    relatedCitations: ["20 U.S.C. § 1414(a)(1)(D)", "34 CFR § 300.9", "34 CFR § 300.301"],
    lastVerifiedDate: "2026-10-01",
    verificationStatus: "Verified",
  },
  {
    id: "idea-300-301",
    act: "IDEA Part B",
    subpart: "Subpart D — Evaluations, Eligibility & IEP Development",
    sectionCitation: "34 CFR § 300.301",
    title: "Initial evaluations (60-Day Federal Timeline)",
    plainLanguageExplanation:
      "Requires each public agency to conduct a full and individual initial evaluation before the initial provision of special education and related services. The initial evaluation must be conducted within 60 calendar days of receiving parental consent for the evaluation, or within the state-established timeframe if shorter. Establishes exceptions only if the child enrolls in a new district after consent was given and before determination (provided the new district makes sufficient progress) or if the parent repeatedly fails or refuses to make the child available.",
    keyPoints: [
      "Federal benchmark timeline: 60 calendar days from receipt of parental consent to completion and eligibility determination.",
      "States may establish a shorter or school-day timeline (e.g., GA is 60 calendar days; TX is 45 school days).",
      "School district cannot pause or extend the timeline without valid statutory exception.",
      "Summer breaks do not automatically stop calendar-day timelines unless explicitly specified in state law.",
    ],
    advocacyTips:
      "Always obtain timestamped proof of when the school received parental consent (email confirmation, certified mail, or delivery receipt) to hold the district strictly to the 60-day clock.",
    statutoryTimeline: "60 calendar days from receipt of parent consent to evaluation and eligibility determination (or state timeline)",
    officialUrl: "https://www.ecfr.gov/current/title-34/subtitle-B/chapter-III/part-300/subpart-D/section-300.301",
    authorityType: "Federal Regulation",
    topics: ["Evaluation and eligibility", "Procedural safeguards"],
    relatedCitations: ["20 U.S.C. § 1414(a)(1)", "34 CFR § 300.304", "34 CFR § 300.305"],
    lastVerifiedDate: "2026-10-01",
    verificationStatus: "Verified",
  },
  {
    id: "idea-300-303",
    act: "IDEA Part B",
    subpart: "Subpart D — Evaluations, Eligibility & IEP Development",
    sectionCitation: "34 CFR § 300.303",
    title: "Reevaluations (Triennial Reevaluation Mandate)",
    plainLanguageExplanation:
      "Mandates that a public agency must ensure that a reevaluation of each child with a disability is conducted if the agency determines that educational or related services needs, including improved academic achievement and functional performance, warrant a reevaluation, or if the child's parent or teacher requests a reevaluation. A reevaluation must occur at least once every 3 years, unless the parent and public agency agree that a reevaluation is unnecessary, and may not occur more than once a year unless mutually agreed.",
    keyPoints: [
      "Triennial reevaluation is mandatory every 3 years unless explicitly waived in writing by both parties.",
      "Parent has the absolute right to request a reevaluation if needs change (limit once per year unless district agrees).",
      "Advocates should generally caution parents against waiving triennial evaluations, as updated objective testing is vital to verify progress and current baselines.",
    ],
    advocacyTips:
      "Never waive a 3-year reevaluation simply because school staff claim 'nothing has changed.' Standardized testing baselines are crucial for defending appropriate goals and accommodations.",
    statutoryTimeline: "At least once every 3 years; not more than once per year unless agreed",
    officialUrl: "https://www.ecfr.gov/current/title-34/subtitle-B/chapter-III/part-300/subpart-D/section-300.303",
    authorityType: "Federal Regulation",
    topics: ["Evaluation and eligibility", "Procedural safeguards"],
    relatedCitations: ["20 U.S.C. § 1414(a)(2)", "34 CFR § 300.305"],
    lastVerifiedDate: "2026-10-01",
    verificationStatus: "Verified",
  },
  {
    id: "idea-300-304",
    act: "IDEA Part B",
    subpart: "Subpart D — Evaluations, Eligibility & IEP Development",
    sectionCitation: "34 CFR § 300.304",
    title: "Evaluation procedures (Comprehensive Assessment in All Areas)",
    plainLanguageExplanation:
      "Sets comprehensive standards for evaluations: the public agency must use a variety of assessment tools and strategies to gather relevant functional, developmental, and academic information; must not use any single measure or assessment as the sole criterion for determining whether a child is a child with a disability or an appropriate educational program; must use technically sound instruments; and must ensure the child is assessed in all areas related to the suspected disability, including, if appropriate, health, vision, hearing, social and emotional status, general intelligence, academic performance, communicative status, and motor abilities.",
    keyPoints: [
      "No single test rule: a district cannot rely solely on an IQ score or a single rating scale.",
      "Must assess in ALL areas of suspected disability (speech, OT, PT, executive functioning, mental health).",
      "Assessments must be administered in the child's native language and in the form most likely to yield accurate information.",
      "The evaluation must be sufficiently comprehensive to identify all of the child's special education and related services needs.",
    ],
    advocacyTips:
      "If a student exhibits behavioral dysregulation or sensory sensitivities, demand that the evaluation include a Functional Behavioral Assessment (FBA) and Sensory Processing assessment under the 'all areas related to suspected disability' mandate.",
    officialUrl: "https://www.ecfr.gov/current/title-34/subtitle-B/chapter-III/part-300/subpart-D/section-300.304",
    authorityType: "Federal Regulation",
    topics: ["Evaluation and eligibility", "Behavioral interventions", "Dyslexia and reading disabilities"],
    relatedCitations: ["20 U.S.C. § 1414(b)", "34 CFR § 300.305", "34 CFR § 300.306"],
    lastVerifiedDate: "2026-10-01",
    verificationStatus: "Verified",
  },
  {
    id: "idea-300-306",
    act: "IDEA Part B",
    subpart: "Subpart D — Evaluations, Eligibility & IEP Development",
    sectionCitation: "34 CFR § 300.306",
    title: "Determination of eligibility (Rule for Determining Eligibility)",
    plainLanguageExplanation:
      "Upon completion of the administration of assessments and other evaluation measures, a group of qualified professionals and the parent of the child determines whether the child is a child with a disability and the educational needs of the child. A child must not be determined to be a child with a disability if the determinant factor is lack of appropriate instruction in reading (including essential components of reading instruction) or math, or limited English proficiency.",
    keyPoints: [
      "Parents are full, equal members of the eligibility determination team.",
      "District must provide a copy of the evaluation report and documentation of determination of eligibility to the parent at no cost.",
      "Determinant factor exclusionary clause: lack of instruction cannot be used to label a student disabled.",
    ],
    advocacyTips:
      "Request evaluation reports at least 3-5 days in advance of the eligibility meeting so the parent can review scores with advocates before being asked to make decisions.",
    officialUrl: "https://www.ecfr.gov/current/title-34/subtitle-B/chapter-III/part-300/subpart-D/section-300.306",
    authorityType: "Federal Regulation",
    topics: ["Evaluation and eligibility", "Parent participation", "Dyslexia and reading disabilities"],
    relatedCitations: ["20 U.S.C. § 1414(b)(4)-(5)", "34 CFR § 300.8", "34 CFR § 300.301"],
    lastVerifiedDate: "2026-10-01",
    verificationStatus: "Verified",
  },

  // ── IEP DEVELOPMENT & IMPLEMENTATION ──────────────────────────────────────
  {
    id: "idea-300-320",
    act: "IDEA Part B",
    subpart: "Subpart D — Evaluations, Eligibility & IEP Development",
    sectionCitation: "34 CFR § 300.320",
    title: "Definition of Individualized Education Program (IEP Mandatory Components)",
    plainLanguageExplanation:
      "Sets out the mandatory components of every valid IEP: (1) Present Levels of Academic Achievement and Functional Performance (PLAAFP); (2) Measurable annual goals, including academic and functional goals designed to enable the child to be involved in and make progress in the general education curriculum; (3) Description of how progress will be measured and when periodic progress reports will be provided; (4) Statement of special education, related services, and supplementary aids and services based on peer-reviewed research; (5) Explanation of the extent, if any, to which the child will not participate with nondisabled children; (6) Individual appropriate accommodations on State and districtwide assessments; (7) Projected date for beginning of services and anticipated frequency, location, and duration; (8) Postsecondary transition goals and services beginning not later than the first IEP in effect when the child turns 16 (or younger if determined appropriate by the IEP Team).",
    keyPoints: [
      "PLAAFP is the foundation: goals must align directly with deficits documented in the PLAAFP.",
      "Annual goals must be measurable (e.g., condition, behavior, criteria, measurement method).",
      "Services must be based on peer-reviewed research to the extent practicable.",
      "Transition planning is mandatory beginning not later than age 16 under federal law (many states mandate age 14).",
      "Clear frequency, location, and duration: vague phrasing like 'as needed' is legally insufficient.",
    ],
    advocacyTips:
      "Check every service line in the IEP for exact minutes, provider credentials, and setting (e.g., 'Special Education Co-Taught Math: 250 min/week in General Education setting'). Eliminate any ambiguity.",
    statutoryTimeline: "Reviewed and revised at least annually",
    officialUrl: "https://www.ecfr.gov/current/title-34/subtitle-B/chapter-III/part-300/subpart-D/section-300.320",
    authorityType: "Federal Regulation",
    topics: ["IEP development", "Transition services", "FAPE", "LRE and inclusion"],
    relatedCitations: ["20 U.S.C. § 1414(d)(1)(A)", "34 CFR § 300.324"],
    lastVerifiedDate: "2026-10-01",
    verificationStatus: "Verified",
  },
  {
    id: "idea-300-321",
    act: "IDEA Part B",
    subpart: "Subpart D — Evaluations, Eligibility & IEP Development",
    sectionCitation: "34 CFR § 300.321",
    title: "IEP Team composition (Mandatory Members and Excusal Rules)",
    plainLanguageExplanation:
      "Defines the required members of the IEP team: parents of the child; not less than one regular education teacher of the child (if participating in the regular education environment); not less than one special education teacher; an agency representative (LEA) qualified to provide or supervise specially designed instruction and knowledgeable about district resources; an individual who can interpret instructional implications of evaluation results; at the discretion of parent or agency, other individuals who have knowledge or special expertise regarding the child; and whenever appropriate, the child. Excusal of mandatory members requires written agreement and written input prior to the meeting.",
    keyPoints: [
      "The LEA representative must have authority to commit district resources.",
      "Parents have the absolute right to invite advocates, consultants, or outside providers possessing knowledge or special expertise.",
      "Mandatory members cannot simply not show up; formal written excusal signed by parent is required.",
      "Evaluation interpreter role can be filled by school psychologist, speech therapist, or special ed teacher qualified to interpret tests.",
    ],
    advocacyTips:
      "Confirm that the designated LEA representative actually possesses resource-allocation authority. If school staff say 'we have to ask the district office,' the LEA mandate is not being met.",
    officialUrl: "https://www.ecfr.gov/current/title-34/subtitle-B/chapter-III/part-300/subpart-D/section-300.321",
    authorityType: "Federal Regulation",
    topics: ["IEP development", "Parent participation"],
    relatedCitations: ["20 U.S.C. § 1414(d)(1)(B)", "34 CFR § 300.322"],
    lastVerifiedDate: "2026-10-01",
    verificationStatus: "Verified",
  },
  {
    id: "idea-300-322",
    act: "IDEA Part B",
    subpart: "Subpart D — Evaluations, Eligibility & IEP Development",
    sectionCitation: "34 CFR § 300.322",
    title: "Parent participation in IEP meetings",
    plainLanguageExplanation:
      "Requires each public agency to take steps to ensure that one or both of the parents of a child with a disability are present at each IEP Team meeting or are afforded the opportunity to participate. Steps include notifying parents of the meeting early enough to ensure they have an opportunity to attend; scheduling the meeting at a mutually agreed on time and place; stating the purpose, time, location, and who will be in attendance; and taking whatever action is necessary to ensure the parent understands the proceedings, including arranging for an interpreter.",
    keyPoints: [
      "Scheduling must be mutually agreed on: a district cannot unilaterally impose a date and time.",
      "District must provide written notice indicating who will be in attendance.",
      "District may conduct an IEP meeting without parent only if it has detailed records of multiple attempts to arrange a mutually agreed on time.",
      "The agency must give the parent a copy of the child's IEP at no cost to the parent.",
    ],
    advocacyTips:
      "If a district attempts to hold an IEP meeting during a parent's work hours without offering alternative times, invoke § 300.322(a)(2) and § 300.328 (virtual attendance).",
    officialUrl: "https://www.ecfr.gov/current/title-34/subtitle-B/chapter-III/part-300/subpart-D/section-300.322",
    authorityType: "Federal Regulation",
    topics: ["Parent participation", "IEP development", "Procedural safeguards"],
    relatedCitations: ["20 U.S.C. § 1414(d)(1)(B)(i)", "34 CFR § 300.328", "34 CFR § 300.501"],
    lastVerifiedDate: "2026-10-01",
    verificationStatus: "Verified",
  },
  {
    id: "idea-300-324",
    act: "IDEA Part B",
    subpart: "Subpart D — Evaluations, Eligibility & IEP Development",
    sectionCitation: "34 CFR § 300.324",
    title: "Development, review, and revision of IEP (Special Factors: Behavior, Language, AT)",
    plainLanguageExplanation:
      "Directs the IEP Team to consider: (1) Strengths of the child; (2) Concerns of the parents for enhancing the education of their child; (3) Results of the initial or most recent evaluation; (4) Academic, developmental, and functional needs of the child. MANDATORY SPECIAL FACTORS: in the case of a child whose behavior impedes the child's learning or that of others, the team MUST consider the use of positive behavioral interventions and supports (PBIS) and other strategies to address that behavior; language needs for children with limited English proficiency; instruction in Braille for visual impairments; communication needs including for deaf/hard of hearing; and whether the child requires assistive technology devices and services.",
    keyPoints: [
      "Behavior special factor: Requires positive behavioral interventions and supports, FBAs, and Behavior Intervention Plans (BIPs).",
      "Assistive technology: The team must systematically consider AT devices (high-tech/low-tech) and AT services (evaluations, customization, staff training).",
      "Parent concerns must be documented and addressed; ignoring parent concerns is a procedural violation.",
      "Periodic reviews: The team must review the IEP periodically, but not less than annually, to determine whether annual goals are being achieved.",
    ],
    advocacyTips:
      "When a student faces repeated behavioral write-ups or suspensions, demand an immediate IEP review under § 300.324(a)(2)(i) to mandate an independent FBA and positive behavioral intervention plan.",
    officialUrl: "https://www.ecfr.gov/current/title-34/subtitle-B/chapter-III/part-300/subpart-D/section-300.324",
    authorityType: "Federal Regulation",
    topics: [
      "Behavioral interventions",
      "IEP development",
      "Assistive technology",
      "Parent participation",
      "Discipline and MDR",
    ],
    relatedCitations: ["20 U.S.C. § 1414(d)(3)", "34 CFR § 300.530", "34 CFR § 300.105"],
    lastVerifiedDate: "2026-10-01",
    verificationStatus: "Verified",
  },

  // ── PROCEDURAL SAFEGUARDS & DISPUTE RESOLUTION ────────────────────────────
  {
    id: "idea-300-502",
    act: "IDEA Part B",
    subpart: "Subpart E — Procedural Safeguards, Due Process & MDR",
    sectionCitation: "34 CFR § 300.502",
    title: "Independent Educational Evaluation (IEE at Public Expense)",
    plainLanguageExplanation:
      "Guarantees a parent the right to an independent educational evaluation at public expense if the parent disagrees with an evaluation obtained by the public agency. Once a parent requests an IEE, the public agency MUST, without unnecessary delay, either: (1) File a due process complaint to prove that its evaluation is appropriate; or (2) Ensure that an independent educational evaluation is provided at public expense. The agency cannot simply refuse or ignore the request.",
    keyPoints: [
      "Trigger: Disagreement with a district evaluation (psychoeducational, speech, OT, FBA, AT).",
      "District has only two lawful choices: Pay for the IEE or file due process against the parents.",
      "Action must occur 'without unnecessary delay' (courts generally interpret as within 15 to 30 days).",
      "District must provide parents with agency criteria and information about where an IEE may be obtained, but criteria cannot unreasonably restrict parent choice.",
      "Parent has the right to one IEE at public expense each time the district conducts an evaluation with which the parent disagrees.",
    ],
    advocacyTips:
      "When requesting an IEE, keep the written request brief and clear: 'I disagree with the district's recent psychological evaluation dated [Date] and request an Independent Educational Evaluation at public expense pursuant to 34 CFR § 300.502.' You are not required to explain why you disagree.",
    statutoryTimeline: "Public agency must respond without unnecessary delay (file due process or grant IEE)",
    officialUrl: "https://www.ecfr.gov/current/title-34/subtitle-B/chapter-III/part-300/subpart-E/section-300.502",
    authorityType: "Federal Regulation",
    topics: ["Procedural safeguards", "Evaluation and eligibility", "Due process"],
    relatedCitations: ["20 U.S.C. § 1415(b)(1)", "34 CFR § 300.503"],
    lastVerifiedDate: "2026-10-01",
    verificationStatus: "Verified",
  },
  {
    id: "idea-300-503",
    act: "IDEA Part B",
    subpart: "Subpart E — Procedural Safeguards, Due Process & MDR",
    sectionCitation: "34 CFR § 300.503",
    title: "Prior Written Notice (PWN 7 Mandatory Elements)",
    plainLanguageExplanation:
      "Mandates that written notice must be given to the parents of a child with a disability a reasonable time before the public agency proposes or refuses to initiate or change the identification, evaluation, or educational placement of the child, or the provision of FAPE to the child. The notice must contain: (1) A description of the action proposed or refused; (2) An explanation of why the agency proposes or refuses the action; (3) A description of each evaluation procedure, assessment, record, or report used as a basis; (4) A statement of procedural safeguards protections; (5) Sources for parents to contact to obtain assistance; (6) A description of other options considered and why they were rejected; (7) A description of other factors relevant to the proposal or refusal.",
    keyPoints: [
      "Required for BOTH proposals and refusals (e.g., refusing 1-on-1 paraprofessional, refusing IEE, refusing extended school year).",
      "Must be provided in the native language of the parent.",
      "The 7 statutory elements are mandatory; boilerplate generic notices are legally deficient.",
      "Failure to provide PWN is one of the most frequently sustained procedural violations in state complaints.",
    ],
    advocacyTips:
      "Whenever the IEP team verbally denies a service, accommodation, or placement request, follow up in writing immediately: 'Please provide Prior Written Notice under 34 CFR § 300.503 documenting the district's refusal of our request for [Service] and the reasons for refusal.'",
    officialUrl: "https://www.ecfr.gov/current/title-34/subtitle-B/chapter-III/part-300/subpart-E/section-300.503",
    authorityType: "Federal Regulation",
    topics: ["Prior Written Notice", "Procedural safeguards", "FAPE", "Parent participation"],
    relatedCitations: ["20 U.S.C. § 1415(b)(3)-(4)", "34 CFR § 300.504"],
    lastVerifiedDate: "2026-10-01",
    verificationStatus: "Verified",
  },
  {
    id: "idea-300-151",
    act: "IDEA Part B",
    subpart: "Subpart B — State Eligibility, FAPE & LRE",
    sectionCitation: "34 CFR § 300.151–§ 300.153",
    title: "State complaint procedures (60-Day Investigation & Compensatory Remedies)",
    plainLanguageExplanation:
      "Requires each State Educational Agency (SEA) to adopt written procedures for resolving any complaint filed by an individual or organization alleging that a public agency has violated a requirement of Part B of IDEA. The SEA must issue a written decision within 60 calendar days addressing each allegation and containing findings of fact, conclusions, and reasons for the final decision. If a violation is found, the SEA must order remediation, including compensatory services or monetary reimbursement, as well as systemic corrective actions.",
    keyPoints: [
      "Any person or organization can file a state complaint; advocate or attorney representation is not required.",
      "Strict 60-calendar-day investigation and resolution timeline.",
      "Must allege a violation that occurred not more than one year prior to the date the complaint is received.",
      "SEA has affirmative authority to award compensatory education and require district staff training.",
    ],
    advocacyTips:
      "State complaints are ideal for clear procedural violations (e.g., failure to implement IEP accommodations, exceeding 60-day evaluation timelines, failure to provide PWN, refusal of IEE) where a full due process hearing is unnecessary.",
    statutoryTimeline: "60 calendar days from receipt of complaint to final written decision",
    officialUrl: "https://www.ecfr.gov/current/title-34/subtitle-B/chapter-III/part-300/subpart-B/section-300.151",
    authorityType: "Federal Regulation",
    topics: ["State complaints", "Procedural safeguards", "Compensatory services"],
    relatedCitations: ["34 CFR § 300.152", "34 CFR § 300.153"],
    lastVerifiedDate: "2026-10-01",
    verificationStatus: "Verified",
  },
  {
    id: "idea-300-507",
    act: "IDEA Part B",
    subpart: "Subpart E — Procedural Safeguards, Due Process & MDR",
    sectionCitation: "34 CFR § 300.507",
    title: "Due process complaint and impartial hearing",
    plainLanguageExplanation:
      "Authorizes a parent or public agency to file a due process complaint on any matter relating to the identification, evaluation, or educational placement of a child with a disability, or the provision of FAPE. The complaint must allege a violation that occurred not more than two years before the date the parent or agency knew or should have known about the alleged action (with exceptions for misrepresentations or withholding of information). Sets a 45-day hearing decision timeline following the resolution period and establishes the 'Stay-Put' rule (§ 300.518).",
    keyPoints: [
      "2-year statute of limitations from when parent knew or should have known.",
      "Resolution meeting must be convened within 15 days of receiving the complaint.",
      "Stay-Put provision: the child remains in the current educational placement during proceedings unless mutually agreed.",
      "Impartial hearing officer issues binding findings and legal remedies.",
    ],
    advocacyTips:
      "Invoking Stay-Put under § 300.518 locks in the child's current IEP services and placement during disputes, protecting against unilateral district removals or cuts to services.",
    statutoryTimeline: "Resolution meeting within 15 days; hearing decision within 45 days after resolution period",
    officialUrl: "https://www.ecfr.gov/current/title-34/subtitle-B/chapter-III/part-300/subpart-E/section-300.507",
    authorityType: "Federal Regulation",
    topics: ["Due process", "Procedural safeguards", "FAPE"],
    relatedCitations: ["20 U.S.C. § 1415(b)(6)", "34 CFR § 300.508", "34 CFR § 300.510", "34 CFR § 300.518"],
    lastVerifiedDate: "2026-10-01",
    verificationStatus: "Verified",
  },

  // ── DISCIPLINE & MANIFESTATION DETERMINATION ──────────────────────────────
  {
    id: "idea-300-530",
    act: "IDEA Part B",
    subpart: "Subpart E — Procedural Safeguards, Due Process & MDR",
    sectionCitation: "34 CFR § 300.530",
    title: "Discipline procedures and Manifestation Determination Review (MDR)",
    plainLanguageExplanation:
      "Governs disciplinary removals and protections. School personnel may remove a child with a disability who violates a code of student conduct to an appropriate interim alternative educational setting, another setting, or suspension, for not more than 10 consecutive school days. When a removal constitutes a change of placement (more than 10 cumulative school days creating a pattern), the LEA, parent, and relevant members of the IEP Team MUST conduct a Manifestation Determination Review within 10 school days. The team determines: (1) If the conduct was caused by, or had a direct and substantial relationship to, the child's disability; or (2) If the conduct was the direct result of the LEA's failure to implement the IEP. If either is yes, the conduct is a manifestation: the student returns to placement (unless special circumstances) and the team conducts an FBA and implements a BIP.",
    keyPoints: [
      "10-Day Rule: Days 1–10 cumulative in a school year can be treated similar to nondisabled peers; after day 10, educational services are mandatory.",
      "MDR must be held within 10 school days of any decision to change placement for disciplinary reasons.",
      "Manifestation found: School must return student to original placement and conduct/update FBA and BIP.",
      "District implementation failure: If school failed to provide an aide, accommodations, or behavior plan, the behavior is automatically a manifestation.",
      "Special circumstances exception: Weapons, drugs, or serious bodily injury allow unilateral 45-school-day removal to an interim setting regardless of manifestation.",
    ],
    advocacyTips:
      "At an MDR, review whether every accommodation in the IEP was implemented that day. If the school failed to implement sensory breaks or a BIP, the manifestation test is met under § 300.530(e)(1)(ii).",
    statutoryTimeline: "MDR must occur within 10 school days of decision to change placement",
    officialUrl: "https://www.ecfr.gov/current/title-34/subtitle-B/chapter-III/part-300/subpart-E/section-300.530",
    authorityType: "Federal Regulation",
    topics: ["Discipline and MDR", "Behavioral interventions", "Procedural safeguards", "FAPE"],
    relatedCitations: ["20 U.S.C. § 1415(k)", "34 CFR § 300.531", "34 CFR § 300.536"],
    lastVerifiedDate: "2026-10-01",
    verificationStatus: "Verified",
  },
  {
    id: "idea-300-534",
    act: "IDEA Part B",
    subpart: "Subpart E — Procedural Safeguards, Due Process & MDR",
    sectionCitation: "34 CFR § 300.534",
    title: "Protections for children not determined eligible for special education",
    plainLanguageExplanation:
      "Provides disciplinary protections to children who have not yet been determined eligible for special education if the public agency had 'knowledge' that the child was a child with a disability before the behavior occurred. An agency is deemed to have knowledge if: (1) The parent expressed concern in writing to supervisory or administrative personnel; (2) The parent requested an evaluation; or (3) The teacher or other personnel expressed specific concerns about a pattern of behavior directly to the director of special education or other supervisory personnel.",
    keyPoints: [
      "Basis of Knowledge rule: Prevents districts from expelling struggling students before completing a pending evaluation.",
      "If district had knowledge, the student is entitled to all § 300.530 discipline protections, including an MDR.",
      "Expedited evaluation must be conducted during disciplinary removal if evaluation was requested after behavior.",
    ],
    advocacyTips:
      "Always submit evaluation requests and concerns about behavior in writing to school administrators to firmly establish the district's 'basis of knowledge' under § 300.534.",
    officialUrl: "https://www.ecfr.gov/current/title-34/subtitle-B/chapter-III/part-300/subpart-E/section-300.534",
    authorityType: "Federal Regulation",
    topics: ["Discipline and MDR", "Evaluation and eligibility", "Procedural safeguards"],
    relatedCitations: ["20 U.S.C. § 1415(k)(5)", "34 CFR § 300.530"],
    lastVerifiedDate: "2026-10-01",
    verificationStatus: "Verified",
  },

  // ── TRANSITION & GRADUATION ───────────────────────────────────────────────
  {
    id: "idea-300-320-b",
    act: "IDEA Part B",
    subpart: "Subpart D — Evaluations, Eligibility & IEP Development",
    sectionCitation: "34 CFR § 300.320(b)",
    title: "Transition services (Postsecondary Goals and Courses of Study)",
    plainLanguageExplanation:
      "Requires that beginning not later than the first IEP to be in effect when the child turns 16 (or younger if determined appropriate by the IEP Team), and updated annually thereafter, the IEP must include: (1) Appropriate measurable postsecondary goals based upon age-appropriate transition assessments related to training, education, employment, and, where appropriate, independent living skills; (2) The transition services (including courses of study) needed to assist the child in reaching those goals.",
    keyPoints: [
      "Transition goals are mandatory in 3 domains: training/education, employment, and independent living.",
      "Must be based on formal, age-appropriate transition assessments.",
      "Student must be invited to any IEP meeting where transition is discussed.",
      "Transfer of rights at age of majority (age 18 in most states) must be explained at least one year prior.",
    ],
    advocacyTips:
      "Ensure transition assessments are conducted by qualified staff and do not consist merely of informal questionnaires. Vocational assessments, independent living scales, and college readiness profiles are crucial.",
    statutoryTimeline: "Beginning not later than the first IEP in effect when child turns 16 (or earlier if state law specifies)",
    officialUrl: "https://www.ecfr.gov/current/title-34/subtitle-B/chapter-III/part-300/subpart-D/section-300.320",
    authorityType: "Federal Regulation",
    topics: ["Transition services", "IEP development"],
    relatedCitations: ["20 U.S.C. § 1414(d)(1)(A)(i)(VIII)", "34 CFR § 300.43"],
    lastVerifiedDate: "2026-10-01",
    verificationStatus: "Verified",
  },

  // ── OTHER FEDERAL LAWS: SECTION 504 ───────────────────────────────────────
  {
    id: "sec504-104-33",
    act: "Section 504",
    subpart: "Section 504 Subpart D — Preschool, Elementary & Secondary Education",
    sectionCitation: "34 CFR § 104.33",
    title: "Free Appropriate Public Education under Section 504",
    plainLanguageExplanation:
      "A recipient that operates a public elementary or secondary education program or activity shall provide a free appropriate public education to each qualified handicapped person in the recipient's jurisdiction, regardless of the nature or severity of the person's handicap. An appropriate education is the provision of regular or special education and related aids and services that are designed to meet individual educational needs of handicapped persons as adequately as the needs of nonhandicapped persons are met, and are based upon adherence to procedures that satisfy evaluation and placement rules.",
    keyPoints: [
      "Civil rights statute: Bars disability discrimination in all programs receiving federal financial assistance.",
      "Broader definition of disability than IDEA: physical or mental impairment that substantially limits one or more major life activities (learning, reading, concentrating, breathing, walking).",
      "504 Plan provides accommodations and related aids/services, but does not typically provide specialized instruction.",
      "Mitigating measures (medication, assistive devices) cannot be considered when determining eligibility.",
    ],
    advocacyTips:
      "If a student with ADHD, diabetes, or anxiety does not qualify for IDEA special education, pursue a 504 Plan under § 104.33 for testing accommodations, health plans, and executive functioning supports.",
    officialUrl: "https://www.ecfr.gov/current/title-34/subtitle-B/chapter-I/part-104/subpart-D/section-104.33",
    authorityType: "Federal Regulation",
    topics: ["Section 504 accommodations", "FAPE", "Procedural safeguards"],
    relatedCitations: ["29 U.S.C. § 794", "34 CFR § 104.35", "34 CFR § 104.36"],
    lastVerifiedDate: "2026-10-01",
    verificationStatus: "Verified",
  },
  {
    id: "sec504-104-35",
    act: "Section 504",
    subpart: "Section 504 Subpart D — Preschool, Elementary & Secondary Education",
    sectionCitation: "34 CFR § 104.35",
    title: "Evaluation and placement under Section 504",
    plainLanguageExplanation:
      "Mandates that recipients conduct an evaluation of any person who, because of handicap, needs or is believed to need special education or related services before taking any action with respect to the initial placement of the person and any subsequent significant change in placement. Requires multi-source data collection, tests validated for specific purpose, and periodic reevaluations.",
    keyPoints: [
      "Evaluation required prior to initial 504 placement and prior to any significant change in placement.",
      "Disciplinary removal exceeding 10 school days is a significant change in placement requiring a 504 manifestation determination.",
      "Cannot charge parents for evaluations required to determine 504 eligibility.",
    ],
    advocacyTips:
      "Students with 504 Plans are protected by manifestation determination reviews prior to long-term suspensions or expulsions under § 104.35, identical to IDEA students.",
    officialUrl: "https://www.ecfr.gov/current/title-34/subtitle-B/chapter-I/part-104/subpart-D/section-104.35",
    authorityType: "Federal Regulation",
    topics: ["Section 504 accommodations", "Evaluation and eligibility", "Discipline and MDR"],
    relatedCitations: ["34 CFR § 104.33", "34 CFR § 104.36"],
    lastVerifiedDate: "2026-10-01",
    verificationStatus: "Verified",
  },

  // ── AMERICANS WITH DISABILITIES ACT (ADA) TITLE II ────────────────────────
  {
    id: "ada-title2-35-160",
    act: "ADA Title II",
    subpart: "ADA Title II — Public Entities & Effective Communication",
    sectionCitation: "28 CFR § 35.160",
    title: "General effective communication requirements (Auxiliary Aids & Services)",
    plainLanguageExplanation:
      "A public entity shall take appropriate steps to ensure that communications with applicants, participants, members of the public, and companions with disabilities are as effective as communications with others. A public entity shall furnish appropriate auxiliary aids and services where necessary to afford individuals with disabilities, including companions, an equal opportunity to participate in and enjoy the benefits of a service, program, or activity.",
    keyPoints: [
      "Effective communication standard extends to parents and companions with disabilities participating in school events and IEP meetings.",
      "Auxiliary aids include qualified interpreters, note-takers, transcription services, written materials, assistive listening systems, and captioned media.",
      "The public entity must give primary consideration to the requests of individuals with disabilities in determining what type of auxiliary aid is provided.",
    ],
    advocacyTips:
      "If a parent or student requires an ASL interpreter or real-time captioning (CART) for IEP meetings, cite 28 CFR § 35.160: the school district is legally required to provide certified auxiliary aids at no expense.",
    officialUrl: "https://www.ecfr.gov/current/title-28/judicial-administration/chapter-I/part-35/subpart-E/section-35.160",
    authorityType: "Federal Regulation",
    topics: ["Parent participation", "Assistive technology", "Procedural safeguards"],
    relatedCitations: ["42 U.S.C. § 12131", "28 CFR § 35.130"],
    lastVerifiedDate: "2026-10-01",
    verificationStatus: "Verified",
  },

  // ── FERPA ─────────────────────────────────────────────────────────────────
  {
    id: "ferpa-99-10",
    act: "FERPA",
    subpart: "FERPA — Privacy of Education Records",
    sectionCitation: "34 CFR § 99.10",
    title: "Right to inspect and review education records (45-Day Rule)",
    plainLanguageExplanation:
      "A parent or eligible student must be given the opportunity to inspect and review the student's education records. The educational agency or institution shall comply with a request for access to records without unnecessary delay and in no case more than 45 days after the request has been made. Under IDEA 34 CFR § 300.613, this timeline is tightened: records must be provided without unnecessary delay and before any meeting regarding an IEP, hearing, or resolution session, and in no case more than 45 days.",
    keyPoints: [
      "Absolute parent right to inspect all education records maintained by the school district.",
      "45-day outside limit, but IDEA requires inspection prior to any IEP meeting or due process hearing.",
      "Encompasses test protocols, emails between staff mentioning the student, behavioral logs, and disciplinary files.",
      "District may not destroy records if an outstanding request to inspect exists.",
    ],
    advocacyTips:
      "Always submit a formal FERPA and IDEA record request prior to an IEP meeting: invoke 34 CFR § 300.613 to compel the district to provide records before the meeting rather than waiting 45 days.",
    statutoryTimeline: "Without unnecessary delay and before any IEP meeting; outside limit 45 days",
    officialUrl: "https://www.ecfr.gov/current/title-34/subtitle-B/chapter-I/part-99/subpart-B/section-99.10",
    authorityType: "Federal Regulation",
    topics: ["Procedural safeguards", "Parent participation"],
    relatedCitations: ["20 U.S.C. § 1232g(a)(1)", "34 CFR § 300.613", "34 CFR § 99.20"],
    lastVerifiedDate: "2026-10-01",
    verificationStatus: "Verified",
  },

  // ── ESSA ──────────────────────────────────────────────────────────────────
  {
    id: "essa-alternate-assessment",
    act: "ESSA",
    subpart: "ESSA — Academic Standards & Assessments",
    sectionCitation: "20 U.S.C. § 6311(b)(2)(D)",
    title: "Alternate assessments aligned with alternate academic achievement standards (1% Cap)",
    plainLanguageExplanation:
      "Permits States to provide alternate assessments aligned with alternate academic achievement standards for children with the most significant cognitive disabilities, provided the total number of students assessed in each subject does not exceed 1 percent of all students in the State assessed. Requires that the parent be clearly informed that their child's academic achievement will be measured against alternate standards, and of how participation may preclude the student from completing requirements for a regular high school diploma.",
    keyPoints: [
      "1% cap on students taking alternate assessments statewide.",
      "Strict informed parental consent required regarding potential loss of regular diploma pathway.",
      "IEP team must justify assignment to alternate assessment with objective cognitive data.",
    ],
    advocacyTips:
      "Carefully analyze any recommendation for alternate assessments (e.g., GAA 2.0, STAAR-Alt). In most states, alternate assessment routes cannot lead to a regular high school diploma.",
    officialUrl: "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title20-section6311&num=0&edition=prelim",
    authorityType: "Statute",
    topics: ["IEP development", "Transition services", "Evaluation and eligibility"],
    relatedCitations: ["34 CFR § 200.6(c)", "34 CFR § 300.320(a)(6)"],
    lastVerifiedDate: "2026-10-01",
    verificationStatus: "Verified",
  },
];
