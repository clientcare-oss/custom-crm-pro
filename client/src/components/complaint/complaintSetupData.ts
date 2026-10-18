// Predefined Common Allegations & Extensive Common Resolutions Library
// Specifically curated for IDEA State Complaints (GaDOE and Southeast SEAs)
// Per Byron Honea / Waypoint Advocates Special Education Standards

export interface CommonAllegationPreset {
  id: string;
  shortTitle: string;
  category: "IEP Implementation" | "Child Find & Evaluation" | "Prior Written Notice" | "Related Services" | "Discipline & Behavior" | "Procedural Safeguards" | "FAPE & Placement";
  federalCitation: string;
  stateCitationGa: string;
  promptSnippet: string;
}

export const COMMON_ALLEGATION_PRESETS: CommonAllegationPreset[] = [
  {
    id: "iep-failure",
    shortTitle: "Failure to Implement IEP Services",
    category: "IEP Implementation",
    federalCitation: "34 C.F.R. § 300.323(c)(2)",
    stateCitationGa: "Ga. Comp. R. & Regs. 160-4-7-.06",
    promptSnippet: "The public agency failed to provide mandated specialized instruction and accommodations as specified in the operative IEP, resulting in an accumulated deficit of instructional minutes.",
  },
  {
    id: "child-find",
    shortTitle: "Child Find & Evaluation Delays",
    category: "Child Find & Evaluation",
    federalCitation: "34 C.F.R. § 300.111, § 300.301",
    stateCitationGa: "Ga. Comp. R. & Regs. 160-4-7-.03",
    promptSnippet: "The public agency failed in its affirmative statutory Child Find duty by delaying or ignoring formal requests for comprehensive psychological and academic evaluations within statutory 60-day timelines.",
  },
  {
    id: "pwn-refusal",
    shortTitle: "Failure to Issue Timely Prior Written Notice (PWN)",
    category: "Prior Written Notice",
    federalCitation: "34 C.F.R. § 300.503",
    stateCitationGa: "Ga. Comp. R. & Regs. 160-4-7-.14",
    promptSnippet: "The public agency refused parental requests for evaluations, accommodations, and service adjustments without issuing mandatory Prior Written Notice explaining the legal and factual justifications.",
  },
  {
    id: "related-services",
    shortTitle: "Deprivation of Related Services (Speech / OT / PT)",
    category: "Related Services",
    federalCitation: "34 C.F.R. § 300.34, § 300.320(a)(4)",
    stateCitationGa: "Ga. Comp. R. & Regs. 160-4-7-.06",
    promptSnippet: "The public agency routinely canceled scheduled therapy sessions (speech-language, occupational therapy, or physical therapy) without providing certified substitute providers or compensatory make-up sessions.",
  },
  {
    id: "discipline-mdr",
    shortTitle: "Unlawful Disciplinary Removal / MDR Failure",
    category: "Discipline & Behavior",
    federalCitation: "34 C.F.R. § 300.530(e)",
    stateCitationGa: "Ga. Comp. R. & Regs. 160-4-7-.10",
    promptSnippet: "The public agency removed the student from their educational placement for disciplinary infractions exceeding 10 cumulative school days without conducting a lawful Manifestation Determination Review (MDR).",
  },
  {
    id: "bip-fba",
    shortTitle: "Failure to Conduct FBA / Implement BIP",
    category: "Discipline & Behavior",
    federalCitation: "34 C.F.R. § 300.530(f)",
    stateCitationGa: "Ga. Comp. R. & Regs. 160-4-7-.10",
    promptSnippet: "The public agency failed to conduct a timely Functional Behavior Assessment (FBA) and failed to implement positive behavioral interventions specified in the student's Behavior Intervention Plan (BIP).",
  },
  {
    id: "placement-change",
    shortTitle: "Unilateral Change in Educational Placement",
    category: "FAPE & Placement",
    federalCitation: "34 C.F.R. § 300.116, § 300.327",
    stateCitationGa: "Ga. Comp. R. & Regs. 160-4-7-.07",
    promptSnippet: "The public agency unilaterally altered the student's least restrictive environment (LRE) placement or abbreviated the student's school day without an IEP team decision or parental agreement.",
  },
  {
    id: "progress-monitoring",
    shortTitle: "Failure to Monitor & Report IEP Goal Progress",
    category: "IEP Implementation",
    federalCitation: "34 C.F.R. § 300.320(a)(3)",
    stateCitationGa: "Ga. Comp. R. & Regs. 160-4-7-.06",
    promptSnippet: "The public agency failed to collect objective progress monitoring data and failed to provide periodic progress reports regarding the student's advancement toward measurable annual IEP goals.",
  },
];

export interface ResolutionItem {
  id: string;
  category: ResolutionCategory;
  title: string;
  details: string;
  isPopular?: boolean;
}

export type ResolutionCategory =
  | "Compensatory Education"
  | "Evaluations & IEE"
  | "IEP Amendments"
  | "Dedicated Staff & Placement"
  | "Behavioral & Discipline"
  | "Staff Training & Systemic"
  | "Financial Reimbursement";

export const RESOLUTION_CATEGORIES: ResolutionCategory[] = [
  "Compensatory Education",
  "Evaluations & IEE",
  "IEP Amendments",
  "Dedicated Staff & Placement",
  "Behavioral & Discipline",
  "Staff Training & Systemic",
  "Financial Reimbursement",
];

export const EXTENSIVE_COMMON_RESOLUTIONS: ResolutionItem[] = [
  // ── Compensatory Education ──
  {
    id: "comp-tutoring-1on1",
    category: "Compensatory Education",
    title: "1-on-1 Certified Academic Instruction (Compensatory Tutoring)",
    details: "Award 60 hours of direct, one-on-one compensatory academic instruction delivered by a certified special education teacher to remediate lost instructional time.",
    isPopular: true,
  },
  {
    id: "comp-speech",
    category: "Compensatory Education",
    title: "Compensatory Speech-Language Therapy Hours",
    details: "Provide compensatory speech-language pathology sessions matching all missed minutes documented in attendance logs, delivered by a licensed SLP outside regular school hours or during summer breaks.",
    isPopular: true,
  },
  {
    id: "comp-ot",
    category: "Compensatory Education",
    title: "Compensatory Occupational Therapy (OT) Hours",
    details: "Provide certified compensatory occupational therapy hours to address sensory integration, fine motor deficits, and executive regulation lost due to service withholding.",
    isPopular: true,
  },
  {
    id: "comp-pt",
    category: "Compensatory Education",
    title: "Compensatory Physical Therapy (PT) Hours",
    details: "Award compensatory physical therapy sessions administered by a licensed physical therapist to address gross motor deficits and school mobility barriers.",
  },
  {
    id: "comp-reading-specialist",
    category: "Compensatory Education",
    title: "Orton-Gillingham / Certified Structured Literacy Specialist",
    details: "Fund 40 hours of multi-sensory structured literacy intervention by a certified Orton-Gillingham or Wilson Reading System practitioner at district expense.",
    isPopular: true,
  },
  {
    id: "comp-summer-esy",
    category: "Compensatory Education",
    title: "Comprehensive Summer / ESY Compensatory Program",
    details: "Fund and provide full enrollment in an Extended School Year (ESY) program with specialized 1-on-1 instruction and related therapies during the upcoming summer recess.",
  },
  {
    id: "comp-counseling",
    category: "Compensatory Education",
    title: "Compensatory Social-Emotional / Psychological Counseling",
    details: "Provide 20 hours of compensatory school psychological or licensed mental health counseling sessions to remediate school avoidance and trauma caused by inappropriate discipline.",
  },

  // ── Evaluations & Independent Educational Evaluations (IEE) ──
  {
    id: "iee-comprehensive",
    category: "Evaluations & IEE",
    title: "Comprehensive Independent Educational Evaluation (IEE) at Public Expense",
    details: "Order the district to fund a comprehensive Independent Educational Evaluation (IEE) at public expense across all areas of suspected disability by an evaluator chosen by the parent.",
    isPopular: true,
  },
  {
    id: "iee-neuropsych",
    category: "Evaluations & IEE",
    title: "Independent Neuropsychological Evaluation at Public Expense",
    details: "Fund a full independent pediatric neuropsychological evaluation at public expense to examine cognitive processing, executive functioning, and memory profiles.",
    isPopular: true,
  },
  {
    id: "iee-fba-bcba",
    category: "Evaluations & IEE",
    title: "Independent Functional Behavior Assessment (FBA) by a BCBA",
    details: "Contract with an independent Board Certified Behavior Analyst (BCBA-D or BCBA) to conduct a rigorous FBA across multiple educational settings.",
    isPopular: true,
  },
  {
    id: "iee-at",
    category: "Evaluations & IEE",
    title: "Independent Assistive Technology (AT) Evaluation",
    details: "Fund an independent comprehensive assistive technology assessment to evaluate hardware, speech-to-text software, and high/low-tech AAC devices.",
  },
  {
    id: "iee-speech-diagnostic",
    category: "Evaluations & IEE",
    title: "Independent Comprehensive Speech & Pragmatic Language Evaluation",
    details: "Fund an independent diagnostic speech-language evaluation focusing on expressive, receptive, and social pragmatic communicative competencies.",
  },
  {
    id: "iee-sensory-ot",
    category: "Evaluations & IEE",
    title: "Independent Sensory Processing & Occupational Therapy Evaluation",
    details: "Fund an independent occupational therapy assessment including standardized sensory profile testing and ergonomic classroom environmental assessments.",
  },

  // ── IEP Amendments & Convening ──
  {
    id: "iep-reconvene-15days",
    category: "IEP Amendments",
    title: "Reconvene IEP Team Within 10–15 School Days to Amend Plan",
    details: "Order the district to reconvene the full IEP team within 15 school days to review evaluation data, incorporate compensatory services, and update accommodations.",
    isPopular: true,
  },
  {
    id: "iep-measurable-goals",
    category: "IEP Amendments",
    title: "Draft Objective, Baseline-Referenced Measurable Annual Goals",
    details: "Revise all academic and functional IEP goals to include verifiable baseline scores, precise measurement criteria, and scheduled bi-weekly progress monitoring schedules.",
    isPopular: true,
  },
  {
    id: "iep-increase-minutes",
    category: "IEP Amendments",
    title: "Increase Specialized Co-Teaching & Push-in Instruction Minutes",
    details: "Increase weekly specialized instruction minutes in general education core academic subjects with guaranteed co-teaching ratios.",
  },
  {
    id: "iep-concrete-accommodations",
    category: "IEP Amendments",
    title: "Incorporate Explicit Sensory, Executive & Testing Accommodations",
    details: "Formulate concrete, mandatory accommodations including sensory breaks, visual schedules, reduced distraction testing, audio textbooks, and graphic organizers.",
  },
  {
    id: "iep-service-delivery-clarity",
    category: "IEP Amendments",
    title: "Define Service Delivery Modality, Setting & Provider Qualifications",
    details: "Specify all related service minutes as direct, 1-on-1 or small-group instruction with certified providers rather than indirect or consultative models.",
  },

  // ── Dedicated Staff & Placement ──
  {
    id: "staff-1on1-para",
    category: "Dedicated Staff & Placement",
    title: "Assign Dedicated 1-on-1 Paraprofessional / Adult Support",
    details: "Assign a full-time dedicated 1:1 adult aide/paraprofessional trained in the student's behavior intervention plan and sensory accommodations throughout the instructional school day.",
    isPopular: true,
  },
  {
    id: "staff-lre-restoration",
    category: "Dedicated Staff & Placement",
    title: "Restore Student to Least Restrictive Environment (LRE)",
    details: "Return the student immediately to general education placement with appropriate supplementary aids and services in compliance with 34 C.F.R. § 300.114.",
    isPopular: true,
  },
  {
    id: "staff-small-group",
    category: "Dedicated Staff & Placement",
    title: "Specialized Small-Group Setting with Low Student-Teacher Ratio",
    details: "Provide academic core instruction in a specialized support classroom with a maximum 4:1 student-to-adult ratio.",
  },
  {
    id: "staff-daily-comm-log",
    category: "Dedicated Staff & Placement",
    title: "Daily Structured Home-to-School Communication Protocol",
    details: "Implement a daily structured written communication log detailing goal progress, behavior triggers, accommodations delivered, and meal/sensory notes.",
  },
  {
    id: "staff-at-device-provision",
    category: "Dedicated Staff & Placement",
    title: "Provide Dedicated Assistive Technology Hardware & Software",
    details: "Provide the student with a dedicated touchscreen laptop or tablet loaded with approved assistive reading/writing software for both school and home use.",
  },

  // ── Behavioral & Discipline ──
  {
    id: "behav-mdr-convening",
    category: "Behavioral & Discipline",
    title: "Convene Lawful Manifestation Determination Review (MDR)",
    details: "Reconvene the IEP team with mandatory participants to conduct a formal, compliant MDR regarding recent disciplinary exclusions.",
    isPopular: true,
  },
  {
    id: "behav-bip-overhaul",
    category: "Behavioral & Discipline",
    title: "Develop & Implement Trauma-Informed Positive BIP",
    details: "Draft and implement an evidence-based Positive Behavior Intervention Plan (BIP) emphasizing antecedent modifications, de-escalation, and replacement behaviors.",
    isPopular: true,
  },
  {
    id: "behav-expunge-suspensions",
    category: "Behavioral & Discipline",
    title: "Expunge Unlawful Suspensions & Attendance Marks from Cumulative Record",
    details: "Direct the public agency to expunge all disciplinary suspensions, informal removals, and truancy referrals from the student's permanent cumulative record.",
    isPopular: true,
  },
  {
    id: "behav-stop-informal-removals",
    category: "Behavioral & Discipline",
    title: "Cease Informal Removals, Early Pickups & Shortened Days",
    details: "Order the school to immediately cease informal disciplinary calls to parents, off-the-record suspensions, and unauthorized shortened school days.",
  },

  // ── Staff Training & Systemic ──
  {
    id: "train-pwn-timelines",
    category: "Staff Training & Systemic",
    title: "Mandatory Staff Training on Prior Written Notice (PWN) Timelines",
    details: "Order mandatory, documented training for school administrators and special education staff on statutory PWN triggers under 34 C.F.R. § 300.503.",
    isPopular: true,
  },
  {
    id: "train-iep-fidelity",
    category: "Staff Training & Systemic",
    title: "Mandatory Training on IEP Implementation Fidelity & Service Logs",
    details: "Conduct training for general and special education teachers regarding mandatory adherence to IEP service hours and maintenance of accurate electronic service logs.",
    isPopular: true,
  },
  {
    id: "train-childfind",
    category: "Staff Training & Systemic",
    title: "Training on Child Find Identification & 60-Day Evaluation Clock",
    details: "Mandate comprehensive training for school counselors, general educators, and SST teams regarding affirmative Child Find duties and evaluation referral procedures.",
  },
  {
    id: "train-audit-logs",
    category: "Staff Training & Systemic",
    title: "Third-Party Audit of School Special Education Service Delivery Logs",
    details: "Direct the state education agency to conduct an administrative compliance audit of related service delivery logs at the student's school over the preceding 12 months.",
  },
  {
    id: "train-deliver-records",
    category: "Staff Training & Systemic",
    title: "Immediate Delivery of All Educational & Service Tracking Records",
    details: "Order the district to provide complete, unredacted copies of all educational records, provider notes, attendance logs, and internal communications within 10 school days.",
  },

  // ── Financial Reimbursement ──
  {
    id: "reimb-private-evals",
    category: "Financial Reimbursement",
    title: "Direct Reimbursement for Parent-Funded Private Evaluations",
    details: "Order full direct reimbursement to the parent/guardian for out-of-pocket expenses incurred for private diagnostic, psychological, or therapy evaluations.",
    isPopular: true,
  },
  {
    id: "reimb-private-tutoring",
    category: "Financial Reimbursement",
    title: "Direct Reimbursement for Parent-Funded Private Therapies & Tutoring",
    details: "Reimburse the parent for documented private tutoring, speech therapy, and occupational therapy costs incurred during periods when the district failed to provide IEP services.",
    isPopular: true,
  },
  {
    id: "reimb-transportation-mileage",
    category: "Financial Reimbursement",
    title: "Reimbursement for Mileage & Transportation Costs",
    details: "Reimburse parent travel expenses at standard state mileage rates incurred for transporting the student to specialized services or independent evaluations.",
  },
  {
    id: "reimb-specialized-transport",
    category: "Financial Reimbursement",
    title: "District-Provided Door-to-Door Specialized Transportation",
    details: "Provide specialized door-to-door district transportation with an adult monitor, climate control, and appropriate seating harnesses.",
  },
];
