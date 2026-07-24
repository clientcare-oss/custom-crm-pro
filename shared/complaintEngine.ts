// Waypoint Complaint Engine (PG-020) — shared constants

export const ISSUE_CATEGORIES = [
  { key: "child_find", label: "Child Find", desc: "The school may have failed to identify, locate, or evaluate a child who may need special education." },
  { key: "evaluation", label: "Evaluation", desc: "Problems with the initial evaluation — not conducted, delayed, or incomplete." },
  { key: "reevaluation", label: "Reevaluation", desc: "Problems with reevaluation timing, scope, or refusal." },
  { key: "eligibility", label: "Eligibility", desc: "Disagreement or error in how eligibility was decided." },
  { key: "iep_development", label: "IEP Development", desc: "The IEP was not developed properly — goals, services, or team process issues." },
  { key: "iep_implementation", label: "IEP Implementation", desc: "The school did not deliver services or supports written in the IEP." },
  { key: "fape", label: "FAPE", desc: "The student was denied a free appropriate public education." },
  { key: "lre", label: "LRE", desc: "The student was not educated in the least restrictive environment." },
  { key: "parent_participation", label: "Parent Participation", desc: "Parents were excluded from meetings or decisions." },
  { key: "pwn", label: "Prior Written Notice", desc: "The school failed to provide required written notice of decisions or refusals." },
  { key: "records", label: "Records", desc: "Problems accessing, correcting, or receiving education records." },
  { key: "progress_monitoring", label: "Progress Monitoring", desc: "Progress on goals was not measured or reported as required." },
  { key: "related_services", label: "Related Services", desc: "Speech, OT, PT, counseling, or other related services were not provided." },
  { key: "behavior_fba_bip", label: "Behavior / FBA / BIP", desc: "Behavior support, functional behavior assessment, or behavior plan issues." },
  { key: "discipline_mdr", label: "Discipline / MDR", desc: "Suspension, expulsion, or manifestation determination review problems." },
  { key: "transportation", label: "Transportation", desc: "Special transportation was not provided or was inappropriate." },
  { key: "esy", label: "ESY", desc: "Extended school year services were denied or not considered." },
  { key: "transition", label: "Transition", desc: "Transition planning or services were missing or inadequate." },
  { key: "at_aac", label: "Assistive Technology / AAC", desc: "Assistive technology or communication devices were not considered or provided." },
  { key: "procedural_safeguards", label: "Procedural Safeguards", desc: "Required safeguards, notices, or parental rights were not honored." },
  { key: "other", label: "Other", desc: "Another concern not covered by the categories above." },
] as const;

export type IssueCategoryKey = (typeof ISSUE_CATEGORIES)[number]["key"];

export const STORY_PROMPTS = [
  { key: "what_happened", question: "What happened?", helper: "Describe the problem in your own words. Plain language is perfect." },
  { key: "when_noticed", question: "When did you first notice the problem?", helper: "A date, a month, a school year — whatever you remember." },
  { key: "school_agreed", question: "What did the school agree to do?", helper: "Think about IEPs, meetings, emails, or promises." },
  { key: "school_did", question: "What did the school actually do?", helper: "What was delivered, skipped, delayed, or changed." },
  { key: "student_affected", question: "How did this affect the student?", helper: "Grades, behavior, emotions, attendance, skills, communication." },
  { key: "asked_to_correct", question: "What have you already asked the school to correct?", helper: "Requests, complaints, meetings, or emails you have sent." },
] as const;

export const EVIDENCE_CATEGORIES = [
  { key: "iep", label: "IEP" },
  { key: "evaluation", label: "Evaluation" },
  { key: "pwn", label: "PWN" },
  { key: "email", label: "Email" },
  { key: "meeting_notice", label: "Meeting Notice" },
  { key: "service_log", label: "Service Log" },
  { key: "progress_data", label: "Progress Data" },
  { key: "behavior", label: "Behavior" },
  { key: "discipline", label: "Discipline" },
  { key: "medical", label: "Medical" },
  { key: "parent_record", label: "Parent Record" },
  { key: "school_record", label: "School Record" },
  { key: "other", label: "Other" },
] as const;

export const IMPACT_CATEGORIES = [
  { key: "academic", label: "Academic" },
  { key: "functional", label: "Functional" },
  { key: "behavioral", label: "Behavioral" },
  { key: "communication", label: "Communication" },
  { key: "safety", label: "Safety" },
  { key: "emotional", label: "Emotional" },
  { key: "attendance", label: "Attendance" },
  { key: "regression", label: "Regression" },
  { key: "lost_access", label: "Lost Access to Education" },
  { key: "other", label: "Other" },
] as const;

export const REMEDY_OPTIONS = [
  { key: "compensatory_education", label: "Compensatory Education", purpose: "Make up for services or instruction the student lost." },
  { key: "missed_services", label: "Delivery of Missed Services", purpose: "Provide the specific service hours that were not delivered." },
  { key: "evaluation", label: "Evaluation or Reevaluation", purpose: "Obtain current, complete information about the student's needs." },
  { key: "iep_meeting", label: "IEP Meeting", purpose: "Convene the team to correct the IEP or address the violation." },
  { key: "revised_goals", label: "Revised Goals", purpose: "Replace vague or unmeasurable goals with appropriate ones." },
  { key: "data_collection", label: "Additional Data Collection", purpose: "Gather the data needed to make informed decisions." },
  { key: "service_recovery", label: "Service Recovery Plan", purpose: "A written plan and schedule to restore missed services." },
  { key: "staff_training", label: "Staff Training", purpose: "Prevent the violation from recurring through training." },
  { key: "policy_correction", label: "Policy Correction", purpose: "Correct a district practice or policy that caused the violation." },
  { key: "records_production", label: "Records Production", purpose: "Produce complete education records to the parent." },
  { key: "transportation_correction", label: "Transportation Correction", purpose: "Fix transportation services required by the IEP." },
  { key: "behavioral_support", label: "Behavioral Support", purpose: "Provide FBA, BIP, or behavior services the student needs." },
  { key: "progress_reporting", label: "Progress Reporting", purpose: "Regular, meaningful progress reports on IEP goals." },
  { key: "custom", label: "Other Custom Action", purpose: "A remedy specific to this situation." },
] as const;

// Georgia + IDEA authority reference library (versioned legal content).
// Suggestions are labeled potentially relevant until reviewed.
export const AUTHORITY_LIBRARY_VERSION = "2026-07";
export const AUTHORITY_LIBRARY: {
  issueKeys: string[];
  group: "federal" | "georgia";
  citation: string;
  subject: string;
}[] = [
  { issueKeys: ["child_find"], group: "federal", citation: "34 C.F.R. § 300.111", subject: "Child Find — duty to identify, locate, and evaluate all children with disabilities" },
  { issueKeys: ["child_find"], group: "georgia", citation: "Ga. Comp. R. & Regs. 160-4-7-.03", subject: "Child Find (Georgia special education rule)" },
  { issueKeys: ["evaluation", "eligibility"], group: "federal", citation: "34 C.F.R. § 300.301", subject: "Initial evaluations — 60-day timeline and scope" },
  { issueKeys: ["evaluation", "reevaluation"], group: "federal", citation: "34 C.F.R. § 300.304", subject: "Evaluation procedures — all areas of suspected disability" },
  { issueKeys: ["evaluation", "eligibility"], group: "georgia", citation: "Ga. Comp. R. & Regs. 160-4-7-.04", subject: "Evaluations and Reevaluations (Georgia rule)" },
  { issueKeys: ["reevaluation"], group: "federal", citation: "34 C.F.R. § 300.303", subject: "Reevaluations — timing and conditions" },
  { issueKeys: ["eligibility"], group: "federal", citation: "34 C.F.R. § 300.306", subject: "Determination of eligibility" },
  { issueKeys: ["eligibility"], group: "georgia", citation: "Ga. Comp. R. & Regs. 160-4-7-.05", subject: "Eligibility Determination and Categories (Georgia rule)" },
  { issueKeys: ["iep_development", "fape"], group: "federal", citation: "34 C.F.R. § 300.320", subject: "Definition and required content of the IEP" },
  { issueKeys: ["iep_development"], group: "federal", citation: "34 C.F.R. § 300.324", subject: "Development, review, and revision of the IEP" },
  { issueKeys: ["iep_development", "iep_implementation"], group: "georgia", citation: "Ga. Comp. R. & Regs. 160-4-7-.06", subject: "Individualized Education Program (Georgia rule)" },
  { issueKeys: ["iep_implementation", "fape", "related_services"], group: "federal", citation: "34 C.F.R. § 300.323", subject: "When IEPs must be in effect; provision of services" },
  { issueKeys: ["fape"], group: "federal", citation: "34 C.F.R. § 300.101", subject: "Free appropriate public education (FAPE)" },
  { issueKeys: ["fape"], group: "georgia", citation: "Ga. Comp. R. & Regs. 160-4-7-.02", subject: "Free Appropriate Public Education (Georgia rule)" },
  { issueKeys: ["lre"], group: "federal", citation: "34 C.F.R. § 300.114", subject: "Least restrictive environment requirements" },
  { issueKeys: ["lre"], group: "georgia", citation: "Ga. Comp. R. & Regs. 160-4-7-.07", subject: "Least Restrictive Environment (Georgia rule)" },
  { issueKeys: ["parent_participation"], group: "federal", citation: "34 C.F.R. § 300.322", subject: "Parent participation in meetings" },
  { issueKeys: ["parent_participation", "procedural_safeguards"], group: "federal", citation: "34 C.F.R. § 300.501", subject: "Opportunity to examine records; parent participation in meetings" },
  { issueKeys: ["pwn", "procedural_safeguards"], group: "federal", citation: "34 C.F.R. § 300.503", subject: "Prior written notice requirements" },
  { issueKeys: ["records"], group: "federal", citation: "34 C.F.R. § 300.613", subject: "Access rights to education records" },
  { issueKeys: ["progress_monitoring"], group: "federal", citation: "34 C.F.R. § 300.320(a)(3)", subject: "Measuring and reporting progress toward annual goals" },
  { issueKeys: ["related_services"], group: "federal", citation: "34 C.F.R. § 300.34", subject: "Related services definition and scope" },
  { issueKeys: ["behavior_fba_bip"], group: "federal", citation: "34 C.F.R. § 300.324(a)(2)(i)", subject: "Consideration of behavioral interventions and supports" },
  { issueKeys: ["discipline_mdr", "behavior_fba_bip"], group: "federal", citation: "34 C.F.R. § 300.530", subject: "Discipline — authority of school personnel; manifestation determination" },
  { issueKeys: ["discipline_mdr"], group: "georgia", citation: "Ga. Comp. R. & Regs. 160-4-7-.10", subject: "Discipline (Georgia rule)" },
  { issueKeys: ["transportation"], group: "federal", citation: "34 C.F.R. § 300.34(c)(16)", subject: "Transportation as a related service" },
  { issueKeys: ["esy"], group: "federal", citation: "34 C.F.R. § 300.106", subject: "Extended school year services" },
  { issueKeys: ["transition"], group: "federal", citation: "34 C.F.R. § 300.320(b)", subject: "Transition services in the IEP" },
  { issueKeys: ["at_aac"], group: "federal", citation: "34 C.F.R. § 300.105", subject: "Assistive technology availability" },
  { issueKeys: ["procedural_safeguards"], group: "federal", citation: "34 C.F.R. § 300.504", subject: "Procedural safeguards notice" },
  { issueKeys: ["procedural_safeguards"], group: "georgia", citation: "Ga. Comp. R. & Regs. 160-4-7-.09", subject: "Procedural Safeguards / Parent Rights (Georgia rule)" },
  { issueKeys: ["other", "fape", "child_find", "evaluation", "iep_development", "iep_implementation"], group: "georgia", citation: "Ga. Comp. R. & Regs. 160-4-7-.12", subject: "State Complaints (Georgia complaint procedures, one-year filing limit)" },
];

export const COMPLAINT_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  in_review: "In Review",
  ready_to_file: "Ready to File",
  filed: "Filed",
  investigation: "Investigation",
  closed: "Closed",
};

export const RAIL_SECTIONS = [
  { key: "overview", label: "Overview" },
  { key: "case-information", label: "Case Information" },
  { key: "issues", label: "Issues" },
  { key: "timeline", label: "Timeline" },
  { key: "allegations", label: "Allegations" },
  { key: "evidence", label: "Evidence" },
  { key: "student-impact", label: "Student Impact" },
  { key: "requested-remedies", label: "Requested Remedies" },
  { key: "complaint-draft", label: "Complaint Draft" },
  { key: "filing-review", label: "Filing Review" },
  { key: "export", label: "Export" },
] as const;

export type RailSectionKey = (typeof RAIL_SECTIONS)[number]["key"];

export const DISABILITY_CATEGORIES = [
  "Autism", "Deaf/Blind", "Deaf/Hard of Hearing", "Emotional and Behavioral Disorder",
  "Intellectual Disability", "Orthopedic Impairment", "Other Health Impairment",
  "Significant Developmental Delay", "Specific Learning Disability", "Speech-Language Impairment",
  "Traumatic Brain Injury", "Visual Impairment",
] as const;

export function calcAge(dob: Date | string | null | undefined): number | null {
  if (!dob) return null;
  const d = typeof dob === "string" ? new Date(dob) : dob;
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

/** One-year lookback: an event dated more than 365 days before `asOf` is outside the Georgia filing window. */
export function isWithinLookback(eventDate: Date | string | null | undefined, asOf: Date = new Date()): boolean | null {
  if (!eventDate) return null;
  const d = typeof eventDate === "string" ? new Date(eventDate) : eventDate;
  if (isNaN(d.getTime())) return null;
  const oneYearAgo = new Date(asOf);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  return d >= oneYearAgo;
}
