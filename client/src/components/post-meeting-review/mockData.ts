import type { PortmasterFinding, PortmasterSessionState } from "./types";

export const INITIAL_PORTMASTER_FINDINGS: PortmasterFinding[] = [
  {
    id: "pm-find-1",
    title: "Reading Services",
    category: "Services",
    severity: "review_first",
    sourceTags: ["comparator_found", "meeting_conflict"],
    visualType: "comparator_circuit",
    oneLineExplanation: "Frequency does not match meeting decision (reduced 5x/wk → 3x/wk).",
    whyPortmasterFlagged:
      "The school modified the specialized reading service frequency from daily (5x/week) to 3x/week. During the September 18 IEP meeting, the team explicitly committed to maintaining the full 5x/week allocation based on recent progress monitoring data.",
    previousIep: {
      section: "Section IV: Specialized Instruction",
      page: 9,
      value: "30 minutes · 5x weekly (Pull-out)",
      details: "Direct Orton-Gillingham multisensory reading instruction in resource room setting.",
    },
    meetingRecord: {
      agreedDecision: "Team agreed to maintain specialized reading instruction at 30 minutes, 5 times per week without reduction.",
      decisionDate: "Sept 18, 2026",
      evidence: {
        timestamp: "01:14:22",
        speaker: "Special Ed Lead (Mrs. Abernathy)",
        transcriptExcerpt:
          "\"Looking at the reading fluency baseline, we will keep the current frequency of 30 minutes, 5 days a week so we don't disrupt his momentum heading into 5th grade.\"",
        audioClipDuration: "0:42",
        decisionQuote: "Continue specialized reading 30 min / 5x weekly.",
        meetingDate: "September 18, 2026",
      },
    },
    updatedIep: {
      section: "Section IV: Services Schedule",
      page: 8,
      value: "30 minutes · 3x weekly (Pull-out)",
      details: "Small group reading instruction scheduled Mon/Wed/Fri only.",
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
      value: "Active BIP Attached (Sensory-driven de-escalation)",
      details: "Includes 5-minute scheduled sensory breaks, calm-down corner access, and functional behavior matrix.",
    },
    updatedIep: {
      section: "Section VII: Special Factors",
      page: 12,
      value: "BIP Checkbox: Not Checked",
      details: "Entire 3-page positive behavioral intervention protocol removed from updated draft.",
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
          "\"He can keep his headphones in his desk and put them on whenever class transitions get loud or during assembly time—that works well for us.\"",
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
          "\"We have medical verification of heat-triggered asthma. We will update the route sheet for direct curb-to-curb van service with A/C.\"",
        decisionQuote: "Direct curb-to-curb A/C transport approved.",
        meetingDate: "September 18, 2026",
      },
    },
    updatedIep: {
      section: "Section IX: Transportation",
      page: 15,
      value: "Specialized Transport: NO",
      details: "Marked as regular district bus transport without climate control specifications.",
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
    oneLineExplanation: "Wording changed enough to require advocate review (service delivery model shifted).",
    whyPortmasterFlagged:
      "OT service minutes were maintained at 60 min/monthly, but delivery model was altered from direct individual pull-out to integrated consultative group support without advocate notice.",
    previousIep: {
      section: "Section V: Related Services",
      page: 12,
      value: "60 minutes monthly (Direct 1:1 Pull-out)",
      details: "Sensory integration and fine-motor handwriting therapy in OT clinic room.",
    },
    updatedIep: {
      section: "Section V: Related Services",
      page: 11,
      value: "60 minutes monthly (Indirect Consultation / Group)",
      details: "Consultation with classroom staff and embedded push-in group observation.",
      changeLabel: "MODIFIED",
    },
    comparatorDiff: {
      metricLabel: "Delivery Model",
      previousVal: "Direct 1:1 Pull-out",
      updatedVal: "Indirect Consult / Push-in",
    },
    decision: "unreviewed",
  },
];

export function createDefaultPortmasterSession(studentId: number, studentName = "Mikey Peroni"): PortmasterSessionState {
  return {
    studentId,
    studentName,
    grade: "Grade 5",
    schoolDistrict: "Cobb County Schools",
    meetingType: "Annual IEP",
    meetingDate: "September 18, 2026",
    totalAnalyzedCount: 42,
    clearedAutomaticallyCount: 37,
    findings: INITIAL_PORTMASTER_FINDINGS,
    status: "in_review",
  };
}
