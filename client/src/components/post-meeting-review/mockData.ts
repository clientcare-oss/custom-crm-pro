import type { PortmasterFinding, PortmasterSessionState } from "./types";

export const INITIAL_PORTMASTER_FINDINGS: PortmasterFinding[] = [
  {
    id: "pm-find-1",
    title: "Reading Comprehension Services",
    category: "Services",
    severity: "review_first",
    sourceTags: ["comparator_found", "meeting_conflict"],
    visualType: "comparator_circuit",
    oneLineExplanation: "Frequency changed from 5x/week to 3x/week. The meeting record supports continuing 5x/week.",
    whyPortmasterFlagged:
      "The service decreased from 5x/week to 3x/week. The meeting record supports continuing 5x/week. This appears to be an unexplained change.",
    previousIep: {
      section: "Section IV: Specialized Instruction",
      page: 9,
      value: "30 minutes · 5x weekly (Pull-out)",
      details:
        "By May 3, 2027, Michael will receive specialized reading instruction 30 minutes, 5 times per week in a resource room setting. Direct Orton-Gillingham multisensory reading instruction focused on foundational reading skills and vocabulary.",
    },
    meetingRecord: {
      agreedDecision: "Continue current reading service at 30 minutes 5 times per week.",
      decisionDate: "Sept 18, 2026",
      evidence: {
        timestamp: "01:14:22",
        speaker: "Special Ed Lead (Mrs. Abernathy)",
        transcriptExcerpt:
          "Team agreed to maintain reading supports at 5x/week. Progress has been positive.",
        audioClipDuration: "0:42",
        decisionQuote: "Continue specialized reading 30 min / 5x weekly.",
        meetingDate: "September 18, 2026",
      },
    },
    updatedIep: {
      section: "Section IV: Services Schedule",
      page: 8,
      value: "30 minutes · 3x weekly (Pull-out)",
      details:
        "By May 14, 2027, Michael will receive specialized reading instruction 30 minutes, 3 times per week in a small group setting. Small group reading instruction scheduled Mon/Wed/Fri only. Focus on foundational reading skills and vocabulary.",
      changeLabel: "MODIFIED",
    },
    comparatorDiff: {
      metricLabel: "Frequency",
      previousVal: "5x / week",
      updatedVal: "3x / week",
    },
    decision: "unreviewed",
  },
  {
    id: "pm-find-2",
    title: "Behavior Plan (BIP)",
    category: "Behavior",
    severity: "review_first",
    sourceTags: ["comparator_found"],
    visualType: "comparator_circuit",
    oneLineExplanation: "Section from previous IEP appears to have been removed.",
    whyPortmasterFlagged:
      "The Behavior Intervention Plan (BIP) attachments and sensory de-escalation protocol present on pages 14–16 of the previous IEP were omitted entirely from the updated document, with no corresponding team discussion or PWN justification recorded.",
    previousIep: {
      section: "Section VII: Behavior Support Plan",
      page: 14,
      value: "Active BIP Attached",
      details:
        "Active BIP Attached. Protocol includes 5-minute scheduled sensory breaks, calm-down corner access, and structured functional behavior reinforcement matrix.",
    },
    updatedIep: {
      section: "Section VII: Special Factors",
      page: 12,
      value: "BIP Checkbox: Not Checked",
      details:
        "Special factors checklist indicates Behavior Plan is Not Checked. The positive behavior supports and sensory protocol previously on pages 14–16 have been omitted from the finalized draft.",
      changeLabel: "REMOVED",
    },
    comparatorDiff: {
      metricLabel: "Attachment",
      previousVal: "BIP Present (Pages 14-16)",
      updatedVal: "BIP Omitted",
    },
    decision: "unreviewed",
  },
  {
    id: "pm-find-3",
    title: "Noise-Cancelling Headphones",
    category: "Accommodations",
    severity: "check",
    sourceTags: ["meeting_verification"],
    visualType: "standard_portmaster",
    oneLineExplanation: "Accommodation exists but wording differs from the meeting agreement.",
    whyPortmasterFlagged:
      "The team agreed that student would have on-demand access to noise-cancelling headphones throughout the school day whenever sensory overload occurs. The updated IEP restricts access strictly to 'independent testing environments'.",
    previousIep: {
      section: "Section VI: Classroom Accommodations",
      page: 11,
      value: "Not listed in previous IEP",
      details: "New accommodation requested by parent at this annual review.",
    },
    meetingRecord: {
      agreedDecision: "Provide on-demand access to personal noise-cancelling headphones in classroom, cafeteria, and assemblies upon student or teacher prompt.",
      decisionDate: "Sept 18, 2026",
      evidence: {
        timestamp: "00:38:15",
        speaker: "General Ed Teacher (Mr. Miller)",
        transcriptExcerpt:
          "He can keep his headphones in his desk and put them on whenever class transitions get loud or during assembly time—that works well for us.",
        decisionQuote: "Headphones available all day upon prompt or request.",
        meetingDate: "September 18, 2026",
      },
    },
    updatedIep: {
      section: "Section VI: Testing Accommodations",
      page: 10,
      value: "Noise-reducing headphones for standardized tests only",
      details: "Wording limits use to formal testing settings; excludes regular class and cafeteria.",
      changeLabel: "MODIFIED",
    },
    decision: "unreviewed",
  },
  {
    id: "pm-find-4",
    title: "Specialized Transportation Support",
    category: "Transportation",
    severity: "check",
    sourceTags: ["meeting_verification"],
    visualType: "standard_portmaster",
    oneLineExplanation: "Agreed support could not be located in the updated IEP.",
    whyPortmasterFlagged:
      "During the meeting, the district agreed to provide air-conditioned, curb-to-curb specialized transportation due to student's medical heat intolerance. In the updated IEP, Section IX (Transportation) is marked 'Regular bus route'.",
    previousIep: {
      section: "Section IX: Related Services - Transportation",
      page: 18,
      value: "Regular bus with aide",
      details: "Morning and afternoon transport via standard district route.",
    },
    meetingRecord: {
      agreedDecision: "Approve curb-to-curb climate-controlled transportation with front-row seating priority.",
      decisionDate: "Sept 18, 2026",
      evidence: {
        timestamp: "01:42:08",
        speaker: "Transportation Supervisor (Ms. Diaz)",
        transcriptExcerpt:
          "We have medical verification of heat-triggered asthma. We will update the route sheet for direct curb-to-curb van service with A/C.",
        decisionQuote: "Direct curb-to-curb A/C transport approved.",
        meetingDate: "September 18, 2026",
      },
    },
    updatedIep: {
      section: "Section IX: Transportation",
      page: 16,
      value: "Regular bus route assigned",
      details: "No specialized van route or climate control modifications recorded.",
      changeLabel: "UNLOCATED",
    },
    decision: "unreviewed",
  },
  {
    id: "pm-find-5",
    title: "Occupational Therapy (OT) Service Delivery",
    category: "Related Services",
    severity: "check",
    sourceTags: ["comparator_found"],
    visualType: "comparator_circuit",
    oneLineExplanation: "Wording changed enough to require advocate review (consultative vs direct).",
    whyPortmasterFlagged:
      "The delivery model shifted from direct push-in fine motor support to consultative collaboration without corresponding parent consent documented.",
    previousIep: {
      section: "Section IV: Related Services - OT",
      page: 10,
      value: "Direct Push-in · 45 min weekly",
      details:
        "Licensed Occupational Therapist provides direct fine-motor handwriting and keyboarding instruction inside general education classroom.",
    },
    updatedIep: {
      section: "Section IV: Related Services - OT",
      page: 9,
      value: "Consultative · 30 min monthly",
      details:
        "Occupational Therapist consults with instructional staff on adaptive seating and assistive technology devices once per month.",
      changeLabel: "MODIFIED",
    },
    comparatorDiff: {
      metricLabel: "Delivery Model",
      previousVal: "Direct Push-in 45m/wk",
      updatedVal: "Consultative 30m/mo",
    },
    decision: "unreviewed",
  },
];

export function createDefaultPortmasterSession(studentId: number, studentName: string): PortmasterSessionState {
  return {
    studentId,
    studentName,
    meetingId: 1092,
    meetingType: "Annual IEP",
    meetingDate: "September 18, 2026",
    status: "in_review",
    findings: INITIAL_PORTMASTER_FINDINGS,
    clearedAutomaticallyCount: 37,
    totalAnalyzedCount: 42,
  };
}
