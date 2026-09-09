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
  previousValue: string;
  newValue: string;
  status: ItemStatus;
  severity: ItemSeverity;
  explanation: string;
  suggestedQuestion: string;
  previousLocation?: string;
  newLocation?: string;
  userNote?: string;
  isReviewed?: boolean;
  isStarred?: boolean;
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
    label: "March 3, 2026",
    date: "March 3, 2026",
    type: "active",
    badgeText: "Current Annual",
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
    title: "Reading Comprehension Goal",
    previousValue: "By May 3, 2027, Michael will improve reading comprehension by answering literal and inferential questions with 70% accuracy across three consecutive data probes. (Measurement: Curriculum-based assessments and teacher data, Frequency: Weekly, Setting: Small group, Criteria: 70% accuracy)",
    newValue: "By May 14, 2027, Michael will improve reading comprehension by answering literal and inferential questions with 80% accuracy across three consecutive data probes. (Measurement: Curriculum-based assessments and teacher data, Frequency: Weekly, Setting: Small group, Criteria: 80% accuracy)",
    status: "modified",
    severity: "review",
    explanation: "The target accuracy criterion increased from 70% to 80% with the timeline extended by 11 days. The skill focus and evaluation methods remain unchanged.",
    suggestedQuestion: "What baseline progress data supported raising the target accuracy threshold to 80%?",
    previousLocation: "Page 9 · Section V",
    newLocation: "Page 8 · Section V",
    numericDiff: "Criterion: 70% → 80%",
    highlightedField: "Accuracy Threshold & Timeline",
  },
  {
    id: "comp-2",
    category: "services",
    categoryLabel: "Special Education Services",
    title: "Occupational Therapy Services",
    previousValue: "Direct OT services to address fine motor and visual motor skills. Frequency: 1x per week, Duration: 30 minutes, Location: School",
    newValue: "Direct OT services to address fine motor and visual motor skills. Frequency: 2x per week, Duration: 30 minutes, Location: School",
    status: "modified",
    severity: "high_attention",
    explanation: "Weekly occupational therapy services increased from 1 session to 2 sessions per week, resulting in a weekly increase of +30 minutes.",
    suggestedQuestion: "What evaluations or baseline tasks indicated a need for additional visual-motor training sessions?",
    previousLocation: "Page 14 · Section VII",
    newLocation: "Page 15 · Section VII",
    numericDiff: "+30 min/week",
    highlightedField: "Service Frequency: 1x/wk → 2x/wk",
  },
  {
    id: "comp-3",
    category: "accommodations",
    categoryLabel: "Accommodations",
    title: "Breaks as needed",
    previousValue: "",
    newValue: "Student will receive scheduled and unscheduled breaks as needed during instruction and state testing. (NEW ADDITION)",
    status: "added",
    severity: "review",
    explanation: "Unscheduled breaks accommodation has been added to support self-regulation and anxiety control during academic assessments.",
    suggestedQuestion: "How will breaks be monitored or requested to minimize missed instructional time?",
    previousLocation: "Not Included in Previous IEP",
    newLocation: "Page 11 · Section VI",
    numericDiff: "New Support Added",
    highlightedField: "Instructional & Testing Breaks",
  },
  {
    id: "comp-4",
    category: "related",
    categoryLabel: "Related Services",
    title: "Counseling Services",
    previousValue: "Direct counseling to address social skills and self-regulation. Frequency: 1x per week, Duration: 30 minutes, Location: School",
    newValue: "",
    status: "removed",
    severity: "high_attention",
    explanation: "Counseling related services have been entirely removed from the proposed IEP. No corresponding target support was identified.",
    suggestedQuestion: "What behavior logs or student counseling records justified the complete removal of counseling minutes?",
    previousLocation: "Page 16 · Section VIII",
    newLocation: "Omitted in Proposed IEP",
    numericDiff: "-30 min/week",
    highlightedField: "Discontinued Service Support",
  },
  {
    id: "comp-5",
    category: "admin",
    categoryLabel: "Administrative",
    title: "IEP Annual Review Date",
    previousValue: "March 3, 2026",
    newValue: "May 14, 2026",
    status: "modified",
    severity: "informational",
    explanation: "The IEP review date was changed to reflect the actual meeting timestamp. This does not impact special education services.",
    suggestedQuestion: "Does the new timeline align with transition reviews?",
    previousLocation: "Page 1 · Cover Page",
    newLocation: "Page 1 · Cover Page",
    numericDiff: "+72 Days Offset",
    highlightedField: "Meeting Timestamp",
  },
  {
    id: "comp-6",
    category: "accommodations",
    categoryLabel: "Accommodations",
    title: "Preferential seating",
    previousValue: "Student will be placed in a setting with preferential seating (near the point of instruction).",
    newValue: "Student will be placed near the teacher or center of instruction to reduce auditory distractions.",
    status: "reworded",
    severity: "informational",
    explanation: "The language was updated to clarify proximity, but the classroom accommodation remains substantively identical.",
    suggestedQuestion: "Can the class teacher confirm this layout is set up?",
    previousLocation: "Page 6 · Section VI",
    newLocation: "Page 6 · Section VI",
    numericDiff: "Language Clarification",
    highlightedField: "Auditory Distraction Reduction",
  },
  {
    id: "comp-7",
    category: "placement",
    categoryLabel: "Placement & LRE",
    title: "General Education Environment Percentage",
    previousValue: "80% of the school week in general education environments",
    newValue: "72% of the school week in general education environments",
    status: "modified",
    severity: "high_attention",
    explanation: "General education inclusion time has decreased by 8 percentage points (transitioning 8% more time to resource setting).",
    suggestedQuestion: "What academic or behavior evidence supported removing general education minutes in favor of resource classroom settings?",
    previousLocation: "Page 18 · Section X",
    newLocation: "Page 19 · Section X",
    numericDiff: "-8% General Ed Time",
    highlightedField: "LRE Inclusion Percentage",
  },
  {
    id: "comp-8",
    category: "concerns",
    categoryLabel: "Parent Concerns",
    title: "Sensory Overload & Reading Fluency Focus",
    previousValue: "Parent expressed concerns regarding sensory sensitivity and reading test anxiety.",
    newValue: "Parent expressed concerns regarding sensory sensitivity and reading test anxiety.",
    status: "unchanged",
    severity: "informational",
    explanation: "Parent concerns were fully imported and retained letter-for-letter in the new proposed IEP.",
    suggestedQuestion: "No changes needed here.",
    previousLocation: "Page 3 · Section II",
    newLocation: "Page 3 · Section II",
    numericDiff: "100% Match",
    highlightedField: "Retained Unchanged",
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
        gradientText: "from-purple-300 to-fuchsia-400",
      };
    case "unchanged":
    default:
      return {
        label: "Unchanged Baseline",
        badgeBg: "bg-slate-800/50",
        badgeText: "text-slate-400",
        badgeBorder: "border-white/10",
        borderColor: "border-white/5",
        activeBorderColor: "border-slate-400",
        glowColor: "rgba(148, 163, 184, 0.25)",
        glowRgba: "rgba(148, 163, 184, 0.08)",
        circuitHex: "#64748b",
        circuitGlow: "rgba(148, 163, 184, 0.5)",
        nodeRing: "border-slate-500/60 shadow-[0_0_6px_rgba(148,163,184,0.3)]",
        nodeCore: "bg-slate-400",
        dotBg: "bg-slate-400",
        gradientText: "from-slate-200 to-slate-400",
      };
  }
}
