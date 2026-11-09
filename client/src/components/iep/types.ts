export type ItemCategory =
  | "admin"
  | "eligibility"
  | "plaafp"
  | "concerns"
  | "goals"
  | "accommodations"
  | "services"
  | "related"
  | "behavior"
  | "placement";

export type ItemStatus =
  | "added"
  | "removed"
  | "modified"
  | "unchanged"
  | "reworded"
  | "needs_review";

export type ItemSeverity = "informational" | "review" | "high_attention";

export interface ComparisonItem {
  id: string;
  category: ItemCategory;
  categoryLabel: string;
  title: string;
  shortSummary?: string;
  previousValue: string;
  newValue: string;
  oldHighlightToken?: string;
  newHighlightToken?: string;
  measurement?: string;
  frequency?: string;
  status: ItemStatus;
  severity: ItemSeverity;
  explanation: string;
  suggestedQuestion: string;
  reviewNote?: string;
  previousLocation?: string;
  newLocation?: string;
  userNote?: string;
  isReviewed?: boolean;
  isStarred?: boolean;
  linkedMinutes?: boolean;
  numericDiff?: string;
  highlightedField?: string;
}

export interface IepVersionOption {
  id: string;
  label: string;
  date: string;
  type: "proposed" | "active" | "historical";
  badgeText: string;
}

export const IEP_VERSION_OPTIONS: IepVersionOption[] = [
  {
    id: "v-proposed-2026-05",
    label: "May 14, 2026",
    date: "May 14, 2026",
    type: "proposed",
    badgeText: "Proposed IEP",
  },
  {
    id: "v-current-2026-03",
    label: "Mar 3, 2026",
    date: "Mar 3, 2026",
    type: "active",
    badgeText: "Previous Annual IEP",
  },
  {
    id: "v-hist-2025-01",
    label: "Jan 15, 2025",
    date: "Jan 15, 2025",
    type: "historical",
    badgeText: "Initial Triennial",
  },
];

export const MICHAEL_SHEEP_COMPARISON: ComparisonItem[] = [
  {
    id: "comp-1",
    category: "goals",
    categoryLabel: "Annual Goals",
    title: "Reading comprehension",
    shortSummary: "Accuracy target increased from 70% to 80%.",
    previousValue:
      "Michael will answer literal and inferential questions with 70% accuracy across three consecutive data probes.",
    newValue:
      "Michael will answer literal and inferential questions with 80% accuracy across three consecutive data probes.",
    oldHighlightToken: "70%",
    newHighlightToken: "80%",
    measurement: "Curriculum-based assessments",
    frequency: "Weekly",
    status: "modified",
    severity: "review",
    explanation:
      "Accuracy target increased from 70% to 80%. The skill focus and evaluation methods remain unchanged.",
    suggestedQuestion:
      "What baseline progress data supported raising the target accuracy threshold to 80%?",
    reviewNote:
      "Confirm the new target is supported by current baseline data.",
    previousLocation: "Page 9 · Section V",
    newLocation: "Page 8 · Section V",
    numericDiff: "Criterion: 70% → 80%",
    highlightedField: "Accuracy Threshold",
    isReviewed: true,
  },
  {
    id: "comp-2",
    category: "services",
    categoryLabel: "Related Services",
    title: "Speech minutes",
    shortSummary:
      "Direct speech-language therapy minutes (30 min/week) were removed from Section VII.",
    previousValue:
      "Michael will receive 30 minutes per week of direct small-group speech-language therapy addressing pragmatic and expressive language.",
    newValue:
      "No direct speech-language therapy minutes listed in proposed Section VII service matrix (moved to monthly consult only).",
    oldHighlightToken: "30 minutes per week",
    newHighlightToken: "monthly consult only",
    measurement: "SLP quarterly therapy logs",
    frequency: "Weekly vs. Consult",
    status: "removed",
    severity: "high_attention",
    explanation:
      "Direct weekly speech-language therapy minutes were removed without a formal speech re-evaluation.",
    suggestedQuestion:
      "What standardized speech-language evaluation data supports discontinuing direct weekly therapy?",
    reviewNote:
      "Request Prior Written Notice and standardized language scores before consenting to any service reduction.",
    previousLocation: "Page 14 · Section VII",
    newLocation: "Page 15 · Section VII",
    numericDiff: "-30 min/week",
    highlightedField: "Direct Speech Minutes Removed",
    isReviewed: true,
    isStarred: true,
  },
  {
    id: "comp-3",
    category: "accommodations",
    categoryLabel: "Classroom & Testing Accommodations",
    title: "Testing accommodations",
    shortSummary:
      "Extended testing time changed from double time (100%) to time-and-a-half (50%).",
    previousValue:
      "Michael will receive 100% extended time (double time) in a small-group setting on all classroom quizzes, district benchmarks, and state assessments.",
    newValue:
      "Michael will receive 50% extended time (time-and-a-half) in a small-group setting on all classroom quizzes, district benchmarks, and state assessments.",
    oldHighlightToken: "100% extended time",
    newHighlightToken: "50% extended time",
    measurement: "Testing accommodation logs",
    frequency: "All timed assessments",
    status: "modified",
    severity: "high_attention",
    explanation:
      "Extended testing time was reduced from 100% (double time) to 50% (time-and-a-half).",
    suggestedQuestion:
      "How much time did Michael actually use on his most recent district benchmark exams?",
    reviewNote:
      "Check teacher testing logs to verify whether Michael still requires double time on reading passages.",
    previousLocation: "Page 11 · Section VI",
    newLocation: "Page 11 · Section VI",
    numericDiff: "100% → 50% Extended Time",
    highlightedField: "Extended Time Allowance",
    isStarred: true,
  },
  {
    id: "comp-4",
    category: "accommodations",
    categoryLabel: "Accommodations",
    title: "Break access",
    shortSummary:
      "Scheduled and unscheduled sensory/regulation breaks added across classroom and testing settings.",
    previousValue:
      "No explicit sensory or self-regulation break accommodation was included in the previous IEP.",
    newValue:
      "Student will have access to scheduled and unscheduled 5-minute regulation breaks during instruction and state testing.",
    oldHighlightToken: "No explicit",
    newHighlightToken: "5-minute regulation breaks",
    measurement: "Teacher & student check-in log",
    frequency: "As needed daily",
    status: "added",
    severity: "review",
    explanation:
      "Unscheduled breaks accommodation has been added to support self-regulation and reduce test fatigue.",
    suggestedQuestion:
      "How will breaks be requested so Michael does not miss core direct instruction?",
    reviewNote:
      "Ensure the break card protocol is non-stigmatizing and stops the testing clock during state exams.",
    previousLocation: "Not in Previous IEP",
    newLocation: "Page 12 · Section VI",
    numericDiff: "New Support Added",
    highlightedField: "Instructional & Testing Breaks",
  },
  {
    id: "comp-5",
    category: "goals",
    categoryLabel: "Annual Goals",
    title: "Goal wording",
    shortSummary:
      "Written expression goal reworded to specify graphic organizer usage prior to drafting.",
    previousValue:
      "Michael will compose a 5-sentence paragraph with a topic sentence and supporting details with 75% rubric accuracy.",
    newValue:
      "Given a visual graphic organizer, Michael will compose a 5-sentence paragraph with a topic sentence and supporting details with 75% rubric accuracy.",
    oldHighlightToken: "Michael will compose",
    newHighlightToken: "Given a visual graphic organizer,",
    measurement: "Writing rubric samples",
    frequency: "Bi-weekly",
    status: "reworded",
    severity: "informational",
    explanation:
      "Added condition specifying a visual graphic organizer scaffold prior to paragraph drafting.",
    suggestedQuestion:
      "Will the same graphic organizer scaffold be permitted on district writing assessments?",
    reviewNote:
      "Make sure 'visual graphic organizer' is also listed in Section VI Classroom Accommodations.",
    previousLocation: "Page 10 · Section V",
    newLocation: "Page 9 · Section V",
    numericDiff: "Scaffold Condition Added",
    highlightedField: "Goal Condition Wording",
  },
  {
    id: "comp-6",
    category: "related",
    categoryLabel: "Related Services & Transportation",
    title: "Transportation",
    shortSummary:
      "Specialized curb-to-curb bus transportation changed to standard bus route with assigned seating.",
    previousValue:
      "Special transportation: Curb-to-curb small-bus route with bus monitor due to sensory and transition safety needs.",
    newValue:
      "General transportation: Standard neighborhood bus route with preferential front-row seating.",
    oldHighlightToken: "Curb-to-curb small-bus route",
    newHighlightToken: "Standard neighborhood bus route",
    measurement: "Transportation incident logs",
    frequency: "Daily AM / PM transit",
    status: "modified",
    severity: "high_attention",
    explanation:
      "Specialized curb-to-curb transportation was modified to general bus transportation without a transition safety assessment.",
    suggestedQuestion:
      "What evaluation or observation showed Michael can safely navigate the general bus route without a monitor?",
    reviewNote:
      "Flag for immediate team discussion—parent has reported sensory overload on crowded buses.",
    previousLocation: "Page 17 · Section IX",
    newLocation: "Page 17 · Section IX",
    numericDiff: "Special → Standard Bus",
    highlightedField: "Related Service Transportation",
    isStarred: true,
  },
  {
    id: "comp-7",
    category: "placement",
    categoryLabel: "Placement & LRE",
    title: "General education inclusion",
    shortSummary:
      "General education classroom time decreased from 80% to 72% of the school week.",
    previousValue:
      "Michael participates in the general education environment for 80% of the instructional day alongside non-disabled peers.",
    newValue:
      "Michael participates in the general education environment for 72% of the instructional day alongside non-disabled peers.",
    oldHighlightToken: "80%",
    newHighlightToken: "72%",
    measurement: "Master schedule minutes",
    frequency: "Daily instructional schedule",
    status: "modified",
    severity: "review",
    explanation:
      "General education inclusion time decreased by 8 percentage points.",
    suggestedQuestion:
      "Which subject period is being moved from general education co-taught to resource pull-out?",
    reviewNote:
      "Verify whether supplementary aids and services were tried in general ed before increasing pull-out time.",
    previousLocation: "Page 18 · Section X",
    newLocation: "Page 19 · Section X",
    numericDiff: "-8% General Ed Time",
    highlightedField: "LRE Inclusion Percentage",
  },
];

// Helper visual theme configuration for statuses
export interface StatusTheme {
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  borderColor: string;
  activeBorderColor: string;
  glowColor: string;
  glowRgba: string;
  circuitHex: string;
  circuitGlow: string;
  nodeRing: string;
  nodeCore: string;
  dotBg: string;
  gradientText: string;
}

export function getStatusTheme(status: ItemStatus): StatusTheme {
  switch (status) {
    case "added":
      return {
        label: "Added Support",
        badgeBg: "bg-emerald-500/10",
        badgeText: "text-emerald-400",
        badgeBorder: "border-emerald-500/30",
        borderColor: "border-emerald-500/25",
        activeBorderColor: "border-emerald-400",
        glowColor: "rgba(16, 185, 129, 0.4)",
        glowRgba: "rgba(16, 185, 129, 0.18)",
        circuitHex: "#10b981",
        circuitGlow: "rgba(16, 185, 129, 0.8)",
        nodeRing: "border-emerald-400/80 shadow-[0_0_8px_rgba(16,185,129,0.5)]",
        nodeCore: "bg-emerald-400",
        dotBg: "bg-emerald-400",
        gradientText: "from-emerald-300 to-teal-400",
      };
    case "removed":
      return {
        label: "Removed Support",
        badgeBg: "bg-rose-500/10",
        badgeText: "text-rose-400",
        badgeBorder: "border-rose-500/30",
        borderColor: "border-rose-500/25",
        activeBorderColor: "border-rose-400",
        glowColor: "rgba(244, 63, 94, 0.4)",
        glowRgba: "rgba(244, 63, 94, 0.18)",
        circuitHex: "#f43f5e",
        circuitGlow: "rgba(244, 63, 94, 0.8)",
        nodeRing: "border-rose-400/80 shadow-[0_0_8px_rgba(244,63,94,0.5)]",
        nodeCore: "bg-rose-400",
        dotBg: "bg-rose-400",
        gradientText: "from-rose-300 to-red-400",
      };
    case "modified":
      return {
        label: "Modified Service",
        badgeBg: "bg-amber-500/10",
        badgeText: "text-amber-400",
        badgeBorder: "border-amber-500/30",
        borderColor: "border-amber-500/25",
        activeBorderColor: "border-amber-400",
        glowColor: "rgba(245, 158, 11, 0.45)",
        glowRgba: "rgba(245, 158, 11, 0.18)",
        circuitHex: "#f59e0b",
        circuitGlow: "rgba(245, 158, 11, 0.8)",
        nodeRing: "border-amber-400/80 shadow-[0_0_8px_rgba(245,158,11,0.5)]",
        nodeCore: "bg-amber-400",
        dotBg: "bg-amber-400",
        gradientText: "from-amber-300 to-yellow-400",
      };
    case "reworded":
      return {
        label: "Reworded Language",
        badgeBg: "bg-indigo-500/10",
        badgeText: "text-indigo-300",
        badgeBorder: "border-indigo-500/30",
        borderColor: "border-indigo-500/25",
        activeBorderColor: "border-indigo-400",
        glowColor: "rgba(99, 102, 241, 0.4)",
        glowRgba: "rgba(99, 102, 241, 0.18)",
        circuitHex: "#6366f1",
        circuitGlow: "rgba(99, 102, 241, 0.8)",
        nodeRing: "border-indigo-400/80 shadow-[0_0_8px_rgba(99,102,241,0.5)]",
        nodeCore: "bg-indigo-400",
        dotBg: "bg-indigo-400",
        gradientText: "from-indigo-300 to-blue-400",
      };
    case "needs_review":
      return {
        label: "Needs Team Review",
        badgeBg: "bg-purple-500/10",
        badgeText: "text-purple-300",
        badgeBorder: "border-purple-500/30",
        borderColor: "border-purple-500/25",
        activeBorderColor: "border-purple-400",
        glowColor: "rgba(168, 85, 247, 0.4)",
        glowRgba: "rgba(168, 85, 247, 0.18)",
        circuitHex: "#a855f7",
        circuitGlow: "rgba(168, 85, 247, 0.8)",
        nodeRing: "border-purple-400/80 shadow-[0_0_8px_rgba(168,85,247,0.5)]",
        nodeCore: "bg-purple-400",
        dotBg: "bg-purple-400",
        gradientText: "from-purple-300 to-pink-400",
      };
    default:
      return {
        label: "Unchanged",
        badgeBg: "bg-slate-800",
        badgeText: "text-slate-400",
        badgeBorder: "border-slate-700",
        borderColor: "border-white/5",
        activeBorderColor: "border-slate-500",
        glowColor: "rgba(148, 163, 184, 0.15)",
        glowRgba: "rgba(148, 163, 184, 0.08)",
        circuitHex: "#475569",
        circuitGlow: "rgba(71, 85, 105, 0.4)",
        nodeRing: "border-slate-600",
        nodeCore: "bg-slate-500",
        dotBg: "bg-slate-500",
        gradientText: "from-slate-300 to-slate-400",
      };
  }
}
