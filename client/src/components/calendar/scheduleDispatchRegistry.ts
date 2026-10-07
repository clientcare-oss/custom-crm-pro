export type ScheduleMode =
  | "MEETINGS"
  | "CLIENT_SESSIONS"
  | "HOLDS"
  | "BLOCKS"
  | "INTERNAL"
  | "BLUEPRINT";

export interface MeetingTypeOption {
  id: string;
  name: string;
  category: "IEP" | "504" | "OTHER";
  typicalDuration: string;
  defaultDurationMinutes: number;
  description: string;
  waypointRole: string;
  checklist: string[];
}

export const IEP_MEETINGS: MeetingTypeOption[] = [
  {
    id: "annual-iep",
    name: "Annual IEP Meeting",
    category: "IEP",
    typicalDuration: "60 – 120 minutes",
    defaultDurationMinutes: 60,
    description: "Yearly review of the IEP, progress, goals, services, and placement.",
    waypointRole:
      "Advocate attends virtually, provides real-time strategy support, helps ensure parent concerns are addressed, and tracks decisions.",
    checklist: [
      "Request draft IEP (3 days prior)",
      "Review evaluations and data",
      "Prepare parent concerns",
      "Build meeting targets",
      "Confirm recording permission",
    ],
  },
  {
    id: "initial-iep",
    name: "Initial IEP / Eligibility",
    category: "IEP",
    typicalDuration: "90 – 120 minutes",
    defaultDurationMinutes: 90,
    description: "Determination of IDEA eligibility and initial IEP goal/service construction.",
    waypointRole:
      "Advocate analyzes multi-disciplinary evaluation reports, evaluates eligibility criteria, and shapes foundational services.",
    checklist: [
      "Obtain complete psychoeducational report",
      "Verify 60-day statutory timeline",
      "Prepare parent concerns on suspected disabilities",
      "Formulate measurable baseline targets",
    ],
  },
  {
    id: "iep-amendment",
    name: "IEP Amendment / Addendum",
    category: "IEP",
    typicalDuration: "45 – 60 minutes",
    defaultDurationMinutes: 60,
    description: "Targeted modification of specific IEP goals, service minutes, accommodations, or placement.",
    waypointRole:
      "Advocate ensures agreed revisions are strictly codified in writing and Prior Written Notice is properly documented.",
    checklist: [
      "Identify specific IEP sections being amended",
      "Review latest progress monitoring data",
      "Draft proposed amendment language",
      "Ensure Prior Written Notice (PWN) is scheduled",
    ],
  },
  {
    id: "triennial-reeval",
    name: "Triennial Re-evaluation / MET",
    category: "IEP",
    typicalDuration: "60 – 90 minutes",
    defaultDurationMinutes: 90,
    description: "3-year comprehensive re-evaluation meeting to evaluate ongoing eligibility and update baselines.",
    waypointRole:
      "Advocate reviews psycho-ed test batteries, identifies unaddressed deficit areas, and requests independent educational evaluation (IEE) if needed.",
    checklist: [
      "Compare previous baseline scores to current data",
      "Verify all suspected disability areas were tested",
      "Prepare parent concerns regarding assessment validity",
      "Check assistive technology assessment status",
    ],
  },
  {
    id: "manifestation-determination",
    name: "Manifestation Determination (MDR)",
    category: "IEP",
    typicalDuration: "60 – 90 minutes",
    defaultDurationMinutes: 60,
    description: "Statutory review within 10 school days of disciplinary removal exceeding 10 cumulative school days.",
    waypointRole:
      "Advocate establishes direct nexus between student disability or failure to implement IEP/BIP and the conduct infraction.",
    checklist: [
      "Request complete disciplinary file & incident report",
      "Audit implementation fidelity of behavior plan (BIP)",
      "Review current IEP accommodations and services",
      "Prepare manifestation nexus argument",
    ],
  },
];

export const SECTION_504_MEETINGS: MeetingTypeOption[] = [
  {
    id: "initial-504",
    name: "Initial 504 Plan",
    category: "504",
    typicalDuration: "45 – 60 minutes",
    defaultDurationMinutes: 60,
    description: "Evaluation of substantial life activity impairment under Section 504 and creation of accommodation plan.",
    waypointRole:
      "Advocate translates physician diagnoses into enforceable accommodations and ensures equal educational access.",
    checklist: [
      "Assemble specialist and physician documentation",
      "Draft customized accommodation schedule",
      "Verify standardized testing accommodations",
      "Confirm teacher notification protocol",
    ],
  },
  {
    id: "504-annual-review",
    name: "504 Annual / Review",
    category: "504",
    typicalDuration: "45 – 60 minutes",
    defaultDurationMinutes: 45,
    description: "Annual review of Section 504 accommodations, teacher compliance logs, and grade level adjustments.",
    waypointRole:
      "Advocate audits accommodation effectiveness with teachers and refines supports for changing academic demands.",
    checklist: [
      "Gather parent feedback on accommodation delivery",
      "Review teacher implementation records",
      "Update health protocols or technology tools",
    ],
  },
  {
    id: "504-reevaluation",
    name: "504 Re-evaluation",
    category: "504",
    typicalDuration: "45 – 60 minutes",
    defaultDurationMinutes: 60,
    description: "Periodic re-evaluation of Section 504 eligibility and accommodation efficacy.",
    waypointRole:
      "Advocate prevents premature accommodation roll-back and protects student protections under Rehabilitation Act.",
    checklist: [
      "Obtain updated medical records",
      "Review academic progress and classroom observations",
      "Establish continued need for formal 504 plan",
    ],
  },
  {
    id: "504-discipline",
    name: "504 Discipline / Manifestation",
    category: "504",
    typicalDuration: "60 minutes",
    defaultDurationMinutes: 60,
    description: "Section 504 manifestation determination hearing prior to disciplinary exclusion.",
    waypointRole:
      "Advocate protects student rights against disability-based discrimination and disciplinary exclusion.",
    checklist: [
      "Examine disciplinary referral details",
      "Verify accommodation implementation by staff",
      "Prepare defense against discriminatory discipline",
    ],
  },
];

export const OTHER_SCHOOL_MEETINGS: MeetingTypeOption[] = [
  {
    id: "eval-eligibility",
    name: "Evaluation / Eligibility",
    category: "OTHER",
    typicalDuration: "60 – 90 minutes",
    defaultDurationMinutes: 60,
    description: "Evaluation results review to determine special education qualification and service eligibility.",
    waypointRole:
      "Advocate reviews assessment methodology and ensures parent observations are integrated into eligibility records.",
    checklist: [
      "Audit formal assessment reports",
      "Prepare parent input document",
      "Formulate diagnostic questions for school psych",
    ],
  },
  {
    id: "fba-bip",
    name: "FBA / BIP Meeting",
    category: "OTHER",
    typicalDuration: "60 minutes",
    defaultDurationMinutes: 60,
    description: "Functional Behavior Assessment review and Behavior Intervention Plan creation or modification.",
    waypointRole:
      "Advocate ensures replacement behaviors and positive behavioral interventions replace punitive disciplinary measures.",
    checklist: [
      "Review ABC data and antecedent triggers",
      "Ensure proactive accommodations are included",
      "Verify crisis de-escalation protocols",
    ],
  },
  {
    id: "resolution-complaint",
    name: "Resolution / Complaint",
    category: "OTHER",
    typicalDuration: "90 – 180 minutes",
    defaultDurationMinutes: 90,
    description: "Formal state complaint resolution meeting, mediation session, or pre-hearing conference.",
    waypointRole:
      "Advocate provides strategic negotiation, evidence presentation, and settlement structuring for compensatory education.",
    checklist: [
      "Compile documentary evidence and timeline",
      "Calculate compensatory service hours owed",
      "Prepare settlement agreement terms",
    ],
  },
  {
    id: "transition-meeting",
    name: "Transition Meeting",
    category: "OTHER",
    typicalDuration: "45 – 60 minutes",
    defaultDurationMinutes: 60,
    description: "Secondary transition, vocational readiness, or preschool-to-kindergarten transition planning.",
    waypointRole:
      "Advocate aligns transition assessments with post-secondary education, vocational training, and independent living goals.",
    checklist: [
      "Review age-appropriate transition assessment",
      "Coordinate agency linkages (VR, Medicaid waiver)",
      "Establish graduation track and course of study",
    ],
  },
  {
    id: "other-school-meeting",
    name: "Other School Meeting",
    category: "OTHER",
    typicalDuration: "45 – 60 minutes",
    defaultDurationMinutes: 60,
    description: "Specialized school conference, administrative team check-in, or multi-tiered support review.",
    waypointRole:
      "Advocate represents family interests and ensures all school commitments are recorded with clear accountability.",
    checklist: [
      "Clarify agenda and school participants",
      "Prepare parent agenda items",
      "Take detailed minutes for follow-up documentation",
    ],
  },
];

export interface ClientSessionOption {
  id: string;
  name: string;
  typicalDuration: string;
  defaultDurationMinutes: number;
  description: string;
  waypointRole: string;
  checklist: string[];
}

export const CLIENT_SESSION_OPTIONS: ClientSessionOption[] = [
  {
    id: "discovery-call",
    name: "Discovery Call",
    typicalDuration: "30 minutes",
    defaultDurationMinutes: 30,
    description: "Initial consultation with prospective family to evaluate special education advocacy needs and fit.",
    waypointRole: "Advocate listens to parent concerns, explains Waypoint advocacy models, and recommends case strategy.",
    checklist: [
      "Review intake questionnaire answers",
      "Confirm student grade and current IEP/504 status",
      "Identify immediate school deadlines or disputes",
      "Recommend advocacy package tier",
    ],
  },
  {
    id: "strategy-session",
    name: "1:1 Advocate Strategy Session",
    typicalDuration: "60 minutes",
    defaultDurationMinutes: 60,
    description: "Deep dive tactical game planning with parents to define leverage points, requests, and meeting strategy.",
    waypointRole: "Advocate leads collaborative strategy, drafts parent agenda, and aligns talking points.",
    checklist: [
      "Review latest school correspondence",
      "Formulate parent priority hierarchy",
      "Rehearse objection handling playbooks",
      "Draft parent letter to school team",
    ],
  },
  {
    id: "pre-meeting-consult",
    name: "Parent Pre-Meeting Consultation",
    typicalDuration: "45 minutes",
    defaultDurationMinutes: 45,
    description: "Final preparation conference with parents immediately prior to an upcoming school meeting.",
    waypointRole: "Advocate reviews draft document changes, confirms roles during meeting, and finalizes speaking points.",
    checklist: [
      "Inspect school draft IEP or evaluation results",
      "Confirm audio recording permissions",
      "Agree on real-time private messaging channel",
      "Set boundary triggers for meeting adjournment",
    ],
  },
  {
    id: "records-review",
    name: "Records Review Meeting",
    typicalDuration: "60 minutes",
    defaultDurationMinutes: 60,
    description: "Comprehensive review of psychological evaluations, IEP drafts, progress monitoring data, and emails.",
    waypointRole: "Advocate presents diagnostic findings, legal compliance audits, and actionable opportunities.",
    checklist: [
      "Audit chronological educational records",
      "Identify missing mandatory evaluations",
      "Flag non-compliant progress reporting",
      "Deliver written advocacy case brief",
    ],
  },
  {
    id: "post-meeting-review",
    name: "Post-Meeting Review",
    typicalDuration: "45 minutes",
    defaultDurationMinutes: 45,
    description: "Debriefing IEP meeting outcomes, inspecting newly finalized documents, and issuing PWN response.",
    waypointRole: "Advocate compares finalized IEP against agreed terms, detects omissions, and files objections.",
    checklist: [
      "Compare finalized IEP against meeting notes",
      "Verify placement and service minutes match",
      "Draft 10-day parent response letter if needed",
      "Schedule follow-up compliance checkpoint",
    ],
  },
  {
    id: "other-client-apt",
    name: "Other Client Appointment",
    typicalDuration: "30 – 60 minutes",
    defaultDurationMinutes: 60,
    description: "General family consultation, check-in, or specialized advocacy advisory appointment.",
    waypointRole: "Advocate addresses parent questions and provides ongoing guidance.",
    checklist: [
      "Review case notes and recent developments",
      "Answer parent questions",
      "Update case action items",
    ],
  },
];

export interface BlueprintMilestone {
  dayOffset: number;
  label: string;
  title: string;
  description: string;
  defaultChecked: boolean;
}

export const STANDARD_IEP_BLUEPRINT_MILESTONES: BlueprintMilestone[] = [
  {
    dayOffset: -7,
    label: "-7 days",
    title: "Records Check",
    description: "Audit existing IEP, evaluation reports, and current progress baselines.",
    defaultChecked: true,
  },
  {
    dayOffset: -5,
    label: "-5 days",
    title: "Advocate Review",
    description: "Formulate strategic advocacy plan, identify compliance risks, and draft targets.",
    defaultChecked: true,
  },
  {
    dayOffset: -3,
    label: "-3 days",
    title: "Draft IEP Due",
    description: "Request and inspect school's proposed draft document prior to meeting.",
    defaultChecked: true,
  },
  {
    dayOffset: -2,
    label: "-2 days",
    title: "Parent Prep",
    description: "Pre-meeting consultation with family to align on priorities and talking points.",
    defaultChecked: true,
  },
  {
    dayOffset: 0,
    label: "DAY 0",
    title: "IEP Meeting",
    description: "Advocate attends school-facing meeting virtually or in person with family.",
    defaultChecked: true,
  },
  {
    dayOffset: 1,
    label: "+1 day",
    title: "Meeting Follow-Up",
    description: "Send written confirmation of decisions and agreements to school team.",
    defaultChecked: true,
  },
  {
    dayOffset: 3,
    label: "+3 days",
    title: "Amended IEP Review",
    description: "Verify final IEP matches agreed terms and inspect Prior Written Notice.",
    defaultChecked: true,
  },
];

export const INTERNAL_EVENT_OPTIONS = [
  "Team Meeting",
  "Staff Training",
  "Case Review",
  "Supervision",
  "Administrative Meeting",
  "Company Event",
  "Other",
];

export const BLOCK_REASONS = {
  OFFICE_CLOSED: ["Holiday", "Weather", "Training Day", "Company Closure", "Other"],
  PERSONAL_BLACKOUT: ["PTO", "Vacation", "Personal", "Medical", "Unavailable", "Other"],
  AVAILABILITY_BLOCK: ["No Client Bookings", "No School Meetings", "Admin Time", "Travel / Buffer", "Custom"],
  RECURRING_BLOCK: ["Every Monday", "Lunch", "Documentation Time", "Weekly Admin", "Custom"],
};

export function getMeetingOptionByName(name: string): MeetingTypeOption | ClientSessionOption | undefined {
  const allSchool = [...IEP_MEETINGS, ...SECTION_504_MEETINGS, ...OTHER_SCHOOL_MEETINGS];
  const foundSchool = allSchool.find((m) => m.name.toLowerCase() === name.toLowerCase());
  if (foundSchool) return foundSchool;

  const foundClient = CLIENT_SESSION_OPTIONS.find((c) => c.name.toLowerCase() === name.toLowerCase());
  if (foundClient) return foundClient;

  // Fallback default
  return IEP_MEETINGS[0];
}
