import React, { useState } from "react";
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  FileText,
  ListChecks,
  Sparkles,
  Users,
  X,
  Calendar,
  ArrowLeft,
  Radio,
  Plus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { GuideClientLiveModal } from "@/components/guidance/GuideClientLiveModal";
import type { FamilyLifecycleStage } from "./StudentCurrentFocusPanel";

interface StudentJourneyGuideButtonProps {
  student: any;
  parent?: any;
  stage: FamilyLifecycleStage;
  isDiscoveryCompleted?: boolean;
  hasComplaintDraft?: boolean;
  onNavigate: (path: string) => void;
  onSetActiveTab?: (tab: string) => void;
  onOpenScheduleModal?: () => void;
  onOpenApprovalModal?: () => void;
  isOpen?: boolean;
  onToggle?: () => void;
  className?: string;
}

export interface JourneyStepDefinition {
  id: string;
  stepNumber: number;
  title: string;
  subtitle: string;
  status: "completed" | "current" | "upcoming";
  iconType: "records" | "advocacy" | "blueprint" | "meeting" | "parent_update";
  inThisStepBullets: string[];
  whyItMatters: string;
  openPath: (studentId: number, hasComplaintDraft?: boolean) => string;
  progressPercent: number;
  activeSubStepIndex: number; // 0-based index into subSteps
  subSteps: {
    number: number;
    label: string;
    status: "completed" | "current" | "upcoming";
  }[];
  todos: {
    id: string;
    label: string;
    defaultChecked: boolean;
  }[];
  nextActionText: string;
}

const JOURNEY_STEPS: JourneyStepDefinition[] = [
  {
    id: "records_review",
    stepNumber: 1,
    title: "Records Review",
    subtitle: "Review and summarize student records, evaluations, and findings.",
    status: "completed",
    iconType: "records",
    inThisStepBullets: [
      "Audit prior IEPs & 504 plans",
      "Analyze psychoeducational evaluations",
      "Identify baseline data gaps",
      "Summarize key findings for parents",
    ],
    whyItMatters:
      "Thorough record analysis uncovers hidden service gaps and anchors every request in objective evaluation data.",
    openPath: (studentId) =>
      `/meeting-workspace/${studentId}?tab=assemble&step=iep_intel`,
    progressPercent: 100,
    activeSubStepIndex: 4,
    subSteps: [
      { number: 1, label: "Upload Files", status: "completed" },
      { number: 2, label: "IEP Audit", status: "completed" },
      { number: 3, label: "Evaluations", status: "completed" },
      { number: 4, label: "Gap Analysis", status: "completed" },
      { number: 5, label: "Summary Ready", status: "completed" },
    ],
    todos: [
      { id: "rr-1", label: "Upload current IEP & evaluations", defaultChecked: true },
      { id: "rr-2", label: "Run IEP Intelligence baseline audit", defaultChecked: true },
      { id: "rr-3", label: "Flag missing evaluation areas", defaultChecked: true },
      { id: "rr-4", label: "Finalize records review summary", defaultChecked: true },
    ],
    nextActionText: "Records review complete. Proceed to Advocacy Steps.",
  },
  {
    id: "advocacy_steps",
    stepNumber: 2,
    title: "Advocacy Steps",
    subtitle: "Identify priorities, recommendations, and action steps.",
    status: "completed",
    iconType: "advocacy",
    inThisStepBullets: [
      "Align parent concerns & priorities",
      "Select statutory IDEA protections",
      "Draft strategic service recommendations",
      "Sequence pre-meeting action items",
    ],
    whyItMatters:
      "Clear advocacy priorities transform parent concerns into actionable, legally grounded requests for the IEP team.",
    openPath: (studentId) =>
      `/meeting-workspace/${studentId}?tab=assemble`,
    progressPercent: 100,
    activeSubStepIndex: 4,
    subSteps: [
      { number: 1, label: "Parent Goals", status: "completed" },
      { number: 2, label: "Service Asks", status: "completed" },
      { number: 3, label: "Placement", status: "completed" },
      { number: 4, label: "Action Plan", status: "completed" },
      { number: 5, label: "Confirmed", status: "completed" },
    ],
    todos: [
      { id: "as-1", label: "Capture parent top 3 priorities", defaultChecked: true },
      { id: "as-2", label: "Map priorities to IDEA accommodations", defaultChecked: true },
      { id: "as-3", label: "Recommend related service minutes", defaultChecked: true },
      { id: "as-4", label: "Approve advocacy action checklist", defaultChecked: true },
    ],
    nextActionText: "Advocacy priorities locked. Move to Meeting Blueprint.",
  },
  {
    id: "meeting_blueprint",
    stepNumber: 3,
    title: "Meeting Blueprint",
    subtitle: "Design a clear, focused plan for the IEP or school meeting.",
    status: "current",
    iconType: "blueprint",
    inThisStepBullets: [
      "Set meeting goals",
      "Prepare key questions",
      "Outline proposed changes",
      "Organize your talking points",
    ],
    whyItMatters:
      "A strong blueprint keeps the meeting focused, strategic, and centered on your student's needs.",
    openPath: (studentId) =>
      `/meeting-workspace/${studentId}?tab=blueprint`,
    progressPercent: 60,
    activeSubStepIndex: 2,
    subSteps: [
      { number: 1, label: "Priorities", status: "completed" },
      { number: 2, label: "Data & Evidence", status: "completed" },
      { number: 3, label: "Goals & Changes", status: "current" },
      { number: 4, label: "Talking Points", status: "upcoming" },
      { number: 5, label: "Review & Finalize", status: "upcoming" },
    ],
    todos: [
      { id: "mb-1", label: "Review proposed goals (3)", defaultChecked: true },
      { id: "mb-2", label: "Outline requested changes", defaultChecked: true },
      { id: "mb-3", label: "Build key talking points", defaultChecked: false },
      { id: "mb-4", label: "Finalize meeting plan", defaultChecked: false },
    ],
    nextActionText: "Complete goals and changes, then move to Talking Points.",
  },
  {
    id: "meeting",
    stepNumber: 4,
    title: "Meeting",
    subtitle: "Run the meeting, capture live notes, decisions, and next steps.",
    status: "upcoming",
    iconType: "meeting",
    inThisStepBullets: [
      "Launch live Meeting Space co-pilot",
      "Record audio & real-time transcript",
      "Track district commitments & refusals",
      "Use First Mate live statutory prompts",
    ],
    whyItMatters:
      "Capturing every decision and district response in real time ensures full accountability for Prior Written Notice.",
    openPath: (studentId) =>
      `/meeting-workspace/${studentId}?tab=meeting-space`,
    progressPercent: 20,
    activeSubStepIndex: 0,
    subSteps: [
      { number: 1, label: "Agenda Check", status: "current" },
      { number: 2, label: "Live Recording", status: "upcoming" },
      { number: 3, label: "Goal Negotiation", status: "upcoming" },
      { number: 4, label: "Commitments", status: "upcoming" },
      { number: 5, label: "Wrap-Up", status: "upcoming" },
    ],
    todos: [
      { id: "mt-1", label: "Open Blueprint talking points side-by-side", defaultChecked: true },
      { id: "mt-2", label: "Start Voyage live audio recorder", defaultChecked: false },
      { id: "mt-3", label: "Log school team commitments & PWN items", defaultChecked: false },
      { id: "mt-4", label: "Confirm follow-up deadlines before adjournment", defaultChecked: false },
    ],
    nextActionText: "Launch Meeting Space when the school IEP session begins.",
  },
  {
    id: "parent_update_documents",
    stepNumber: 5,
    title: "Parent Update & Documents",
    subtitle:
      "Create a clear summary for parents and generate final documents (e.g., IEP notes, follow-ups, or request letters).",
    status: "upcoming",
    iconType: "parent_update",
    inThisStepBullets: [
      "Generate parent-friendly meeting recap",
      "Audit school Prior Written Notice (PWN)",
      "Draft follow-up or request letters",
      "Publish approved summary to Parent Portal",
    ],
    whyItMatters:
      "Prompt post-meeting documentation locks in the school's commitments and keeps the family informed and confident.",
    openPath: (studentId, hasComplaintDraft) =>
      hasComplaintDraft
        ? `/state-complaint-builder?studentId=${studentId}`
        : `/post-meeting-review/${studentId}`,
    progressPercent: 0,
    activeSubStepIndex: 0,
    subSteps: [
      { number: 1, label: "Meeting Recap", status: "current" },
      { number: 2, label: "PWN Decoder", status: "upcoming" },
      { number: 3, label: "Draft Letters", status: "upcoming" },
      { number: 4, label: "Parent Update", status: "upcoming" },
      { number: 5, label: "Archive & Close", status: "upcoming" },
    ],
    todos: [
      { id: "pu-1", label: "Review AI meeting transcript summary", defaultChecked: false },
      { id: "pu-2", label: "Compare PWN against agreed commitments", defaultChecked: false },
      { id: "pu-3", label: "Generate parent update & follow-up letter", defaultChecked: false },
      { id: "pu-4", label: "Share final packet to Parent Portal", defaultChecked: false },
    ],
    nextActionText: "Complete post-meeting review and send parent summary.",
  },
];

/**
 * Custom SVG Open Glowing Book Illustration matching Reference 1 ("What is the Student Journey?")
 */
function GlowingOpenBookIllustration({ className }: { className?: string }) {
  return (
    <div className={cn("relative flex items-center justify-center select-none shrink-0", className)}>
      {/* Warm golden radial aura behind book */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(255,212,112,0.48) 0%, rgba(212,163,62,0.18) 48%, transparent 75%)",
          filter: "blur(4px)",
        }}
      />
      <svg
        viewBox="0 0 110 82"
        className="w-22 h-16.5 relative z-10 drop-shadow-[0_6px_12px_rgba(0,0,0,0.85)]"
        fill="none"
      >
        <defs>
          <linearGradient id="bookCoverGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1B3C6E" />
            <stop offset="100%" stopColor="#091933" />
          </linearGradient>
          <linearGradient id="pageLeftGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#D8C398" />
            <stop offset="70%" stopColor="#FFF6E0" />
            <stop offset="100%" stopColor="#E6D2A8" />
          </linearGradient>
          <linearGradient id="pageRightGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#E6D2A8" />
            <stop offset="30%" stopColor="#FFF8E8" />
            <stop offset="100%" stopColor="#D6BF92" />
          </linearGradient>
          <radialGradient id="spineGlow" cx="50%" cy="48%" r="42%">
            <stop offset="0%" stopColor="#FFF7D6" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#F5C75B" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#F5C75B" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Sparkle particles */}
        <circle cx="14" cy="22" r="1.4" fill="#FFE699" opacity="0.85" />
        <circle cx="22" cy="11" r="1" fill="#FFE699" opacity="0.65" />
        <circle cx="94" cy="18" r="1.5" fill="#FFE699" opacity="0.85" />
        <circle cx="86" cy="10" r="1.1" fill="#FFE699" opacity="0.6" />
        <circle cx="18" cy="64" r="1.2" fill="#F5C75B" opacity="0.75" />
        <circle cx="92" cy="62" r="1.2" fill="#F5C75B" opacity="0.75" />

        {/* Outer Leather Hardcover Base */}
        <path
          d="M12 22 L52 28 L55 31 L58 28 L98 22 L103 64 L58 70 L55 73 L52 70 L7 64 Z"
          fill="url(#bookCoverGrad)"
          stroke="#D4AF37"
          strokeWidth="1.5"
        />

        {/* Lower Page Stack Thickness */}
        <path
          d="M11 60 L53 66 L55 69 L57 66 L99 60 L100 64 L57 70 L55 72 L53 70 L10 64 Z"
          fill="#C5A978"
        />

        {/* Left Open Parchment Page */}
        <path
          d="M15 16 C28 15, 43 18, 55 25 L55 66 C43 59, 28 57, 12 59 Z"
          fill="url(#pageLeftGrad)"
          stroke="#C8AD7D"
          strokeWidth="0.9"
        />

        {/* Right Open Parchment Page */}
        <path
          d="M95 16 C82 15, 67 18, 55 25 L55 66 C67 59, 82 57, 98 59 Z"
          fill="url(#pageRightGrad)"
          stroke="#C8AD7D"
          strokeWidth="0.9"
        />

        {/* Subtle ruled text lines on Left Page */}
        <line x1="21" y1="26" x2="48" y2="30" stroke="#9E865C" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
        <line x1="20" y1="33" x2="48" y2="37" stroke="#9E865C" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
        <line x1="19" y1="40" x2="48" y2="44" stroke="#9E865C" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
        <line x1="18" y1="47" x2="44" y2="51" stroke="#9E865C" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />

        {/* Subtle ruled text lines on Right Page */}
        <line x1="62" y1="30" x2="89" y2="26" stroke="#9E865C" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
        <line x1="62" y1="37" x2="90" y2="33" stroke="#9E865C" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
        <line x1="62" y1="44" x2="91" y2="40" stroke="#9E865C" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
        <line x1="62" y1="51" x2="87" y2="47" stroke="#9E865C" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />

        {/* Center Spine Radiant Light */}
        <ellipse cx="55" cy="43" rx="22" ry="20" fill="url(#spineGlow)" />
      </svg>
    </div>
  );
}

/**
 * Custom SVG Rolled Architectural Blueprint Illustration matching Reference 1 & Reference 2
 */
function BlueprintScrollIllustration({ className }: { className?: string }) {
  return (
    <div className={cn("relative flex items-center justify-center select-none shrink-0", className)}>
      {/* Warm golden corner glow under blueprint */}
      <div
        className="absolute -bottom-1 -right-1 w-14 h-10 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(255,215,115,0.5) 0%, rgba(212,163,62,0.18) 55%, transparent 80%)",
          filter: "blur(3px)",
        }}
      />
      <svg
        viewBox="0 0 92 70"
        className="w-full h-full relative z-10 drop-shadow-[0_6px_12px_rgba(0,0,0,0.85)]"
        fill="none"
      >
        <defs>
          <linearGradient id="bpSheetGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2664B8" />
            <stop offset="55%" stopColor="#174488" />
            <stop offset="100%" stopColor="#0D2A58" />
          </linearGradient>
          <linearGradient id="bpRollGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#143A75" />
            <stop offset="45%" stopColor="#4B8EE8" />
            <stop offset="100%" stopColor="#102E5E" />
          </linearGradient>
        </defs>

        {/* Main Unfurled Blueprint Sheet */}
        <path
          d="M22 14 L84 8 L76 58 L14 54 Z"
          fill="url(#bpSheetGrad)"
          stroke="#F4D068"
          strokeWidth="1.4"
        />

        {/* Inner Technical Blueprint Border & Grid Lines */}
        <path
          d="M27 19 L78 14 L71 53 L20 49 Z"
          stroke="#8CC2FF"
          strokeWidth="0.9"
          strokeOpacity="0.7"
        />
        <line x1="44" y1="17" x2="39" y2="51" stroke="#8CC2FF" strokeWidth="0.8" strokeOpacity="0.6" />
        <line x1="61" y1="15" x2="56" y2="52" stroke="#8CC2FF" strokeWidth="0.8" strokeOpacity="0.6" />
        <line x1="23" y1="34" x2="74" y2="31" stroke="#8CC2FF" strokeWidth="0.8" strokeOpacity="0.6" />

        {/* Architectural Schematic Callout Box */}
        <rect
          x="47"
          y="22"
          width="18"
          height="12"
          transform="rotate(-4 47 22)"
          stroke="#BAE0FF"
          strokeWidth="1"
          fill="#1B529E"
          fillOpacity="0.45"
        />

        {/* Rolled Left Cylinder of the Blueprint */}
        <path
          d="M18 11 C22 11, 25 14, 24 18 L16 55 C15 58, 11 59, 8 57 C5 55, 5 52, 6 48 L14 14 C15 12, 16 11, 18 11 Z"
          fill="url(#bpRollGrad)"
          stroke="#93C5FD"
          strokeWidth="1.1"
        />
        {/* Top Cylinder Curl */}
        <ellipse cx="19" cy="13.5" rx="4.2" ry="2.3" fill="#0B2144" stroke="#93C5FD" strokeWidth="1" />

        {/* Bottom-right golden specular flare */}
        <circle cx="73" cy="55" r="4" fill="#FFE699" opacity="0.65" />
      </svg>
    </div>
  );
}

/**
 * Renders the step icon on the left side of each collapsed/expanded card
 */
function StepCardIcon({
  iconType,
  isExpanded,
}: {
  iconType: JourneyStepDefinition["iconType"];
  isExpanded?: boolean;
}) {
  if (iconType === "blueprint") {
    return (
      <div className="w-12 h-11 flex items-center justify-center shrink-0">
        <BlueprintScrollIllustration className="w-12 h-11" />
      </div>
    );
  }

  const baseBox = cn(
    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all",
    isExpanded
      ? "bg-[#122E59] border-[#D4AF37]/70 text-[#93C5FD] shadow-[0_4px_10px_rgba(0,0,0,0.6)]"
      : "bg-[#0B2142]/90 border-[#284E87]/70 text-[#7BA7E1]"
  );

  if (iconType === "records") {
    return (
      <div className={baseBox}>
        <FileText className="w-5 h-5 stroke-[1.8]" />
      </div>
    );
  }
  if (iconType === "advocacy") {
    return (
      <div className={baseBox}>
        <ListChecks className="w-5 h-5 stroke-[1.8]" />
      </div>
    );
  }
  if (iconType === "meeting") {
    return (
      <div className={baseBox}>
        <Users className="w-5 h-5 stroke-[1.8]" />
      </div>
    );
  }
  return (
    <div className={baseBox}>
      <FileText className="w-5 h-5 stroke-[1.8]" />
    </div>
  );
}

/**
 * Tactile Top-Right Plaque Button ("Student Journey / Guide Me")
 */
export function StudentJourneyGuideButton({
  student,
  isOpen = false,
  onToggle,
  className,
}: StudentJourneyGuideButtonProps) {
  const studentName = student
    ? `${student.firstName || ""} ${student.lastName || ""}`.trim() || "Student"
    : "Student";

  return (
    <button
      type="button"
      onClick={onToggle}
      data-testid="student-journey-guide-me-btn"
      title={
        isOpen
          ? `Return to Dossier Focus View for ${studentName}`
          : `Open Guided Student Journey on Right Panel for ${studentName}`
      }
      className={cn(
        "group relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[9px] select-none cursor-pointer transition-all duration-200 shrink-0",
        isOpen
          ? "bg-gradient-to-b from-[#1E4682] via-[#122F5E] to-[#091A38] border-2 border-[#FFE394] shadow-[0_0_16px_rgba(244,208,104,0.35),0_6px_16px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,248,214,0.4)]"
          : "bg-gradient-to-b from-[#143364] via-[#0B2144] to-[#061329] border border-[#D4AF37]/70 hover:border-[#FFE394] shadow-[0_6px_16px_rgba(0,0,0,0.85),0_2px_4px_rgba(0,0,0,0.7),inset_0_1px_0.5px_rgba(255,243,196,0.28),inset_0_-1.5px_2px_rgba(0,0,0,0.92)] hover:from-[#1A407C] hover:via-[#0F2A56] hover:to-[#081833] hover:shadow-[0_8px_20px_rgba(0,0,0,0.9),0_0_12px_rgba(229,193,104,0.3),inset_0_1px_1px_rgba(255,248,214,0.4)]",
        "active:translate-y-[0.5px]",
        className
      )}
    >
      {/* Subtle inner top specular reflection & brushed sheen */}
      <div
        className="absolute inset-0 rounded-[8px] pointer-events-none opacity-45"
        style={{
          background:
            "radial-gradient(ellipse at 35% 15%, rgba(147,197,253,0.24) 0%, transparent 68%)",
        }}
      />

      {/* Left Golden Open Book Icon */}
      <BookOpen
        className="relative z-10 w-4 h-4 text-[#F2CE74] group-hover:text-[#FFF0B8] stroke-[1.9] shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] transition-transform duration-200 group-hover:scale-105"
      />

      {/* Right Stacked Two-Line Typography: "Workflow Guide" / "Guide Me" */}
      <div className="relative z-10 flex flex-col items-start text-left leading-none">
        <span
          className="text-[11.5px] font-bold tracking-tight text-[#FFFDF7] group-hover:text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)] whitespace-nowrap"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Workflow Guide
        </span>
        <span className="text-[9.5px] italic font-normal text-[#C8D7EC] group-hover:text-[#E2EEFF] mt-0.5 tracking-wide whitespace-nowrap drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
          {isOpen ? "Back to Overview" : "Guide Me"}
        </span>
      </div>
    </button>
  );
}

/**
 * Inline Right-Side Student Journey & Step-by-Step Guide Panel
 * Renders directly inside the right column of the Student Dossier (PG-030) — NEVER a popup modal.
 * Matches Reference Image 1 (5-Step Accordion with "What is the Student Journey?")
 * and Reference Image 2 (Detailed Step Progress Bar, 5-Stage Horizontal Stepper, To-Do Checklist & Next Action).
 */
export function StudentJourneyInlinePanel({
  student,
  parent,
  hasComplaintDraft = false,
  onNavigate,
  onClose,
}: {
  student: any;
  parent?: any;
  stage?: FamilyLifecycleStage;
  isDiscoveryCompleted?: boolean;
  hasComplaintDraft?: boolean;
  onNavigate: (path: string) => void;
  onClose: () => void;
}) {
  const studentId = student?.id || 0;

  // Controls the dismissible "What is the Student Journey?" intro card
  const [showIntroBanner, setShowIntroBanner] = useState(true);

  // Currently expanded step in the 5-step accordion (defaults to Step 3: Meeting Blueprint per Reference Image 1)
  const [expandedStepId, setExpandedStepId] = useState<string | null>("meeting_blueprint");

  // Which step is currently showing the Image 2 "Guide Me" detailed progress/checklist view inside its card
  const [guidedDetailStepId, setGuidedDetailStepId] = useState<string | null>(null);

  // Interactive checkbox state for all step To-Do items
  const [todoChecks, setTodoChecks] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const step of JOURNEY_STEPS) {
      for (const todo of step.todos) {
        initial[todo.id] = todo.defaultChecked;
      }
    }
    return initial;
  });

  // Live co-browse portal modal trigger if advocate wants to co-browse with parent
  const [liveCoBrowseOpen, setLiveCoBrowseOpen] = useState(false);

  // Selected Plan & Project dropdown selectors + extensible custom workflow filter tags
  const PLAN_OPTIONS = [
    "Anchor",
    "Navigator",
    "Family",
    "Harbor",
    "State Complaint",
  ];
  const PROJECT_OPTIONS = [
    "Annual IEP",
    "Initial Evaluation",
    "504 Plan Review",
    "Triennial Re-Eval",
    "Manifestation (MDR)",
    "State Complaint",
  ];

  const EXTRA_WORKFLOW_MODULES: {
    id: string;
    label: string;
    defaultValue: string;
    options: string[];
  }[] = [
      {
        id: "track",
        label: "Track",
        defaultValue: "Standard Prep",
        options: [
          "Standard Prep",
          "Expedited 10-Day",
          "Dispute / PWN Audit",
          "IEE Request",
          "Placement Change",
        ],
      },
      {
        id: "focus",
        label: "Focus",
        defaultValue: "Reading & Goals",
        options: [
          "Reading & Goals",
          "Behavior / BIP",
          "Speech & OT Minutes",
          "Accommodations",
          "Transition Plan",
        ],
      },
      {
        id: "mode",
        label: "Meeting",
        defaultValue: "Virtual (Zoom/Teams)",
        options: [
          "Virtual (Zoom/Teams)",
          "In-Person School",
          "Parent Prep Only",
          "State Mediation",
        ],
      },
      {
        id: "district_stance",
        label: "Stance",
        defaultValue: "Collaborative",
        options: [
          "Collaborative",
          "Data-Contested",
          "High-Conflict",
          "Compliance Escalation",
        ],
      },
    ];

  const [selectedPlan, setSelectedPlan] = useState<string>(() => {
    const raw = (parent?.planTier || student?.planType || "").toLowerCase();
    if (raw.includes("navigator")) return "Navigator";
    if (raw.includes("family")) return "Family";
    if (raw.includes("harbor")) return "Harbor";
    if (raw.includes("complaint")) return "State Complaint";
    return "Anchor";
  });

  const [selectedProject, setSelectedProject] = useState<string>(() => {
    if (hasComplaintDraft) return "State Complaint";
    const raw = (student?.planType || "").toLowerCase();
    if (raw.includes("504")) return "504 Plan Review";
    if (raw.includes("initial")) return "Initial Evaluation";
    return "Annual IEP";
  });

  const [activeExtraModules, setActiveExtraModules] = useState<
    Record<string, string>
  >({});

  const toggleTodo = (todoId: string) => {
    setTodoChecks((prev) => ({ ...prev, [todoId]: !prev[todoId] }));
  };

  return (
    <div
      data-testid="student-journey-inline-panel"
      className="flex flex-col justify-between h-full space-y-3 text-left animate-in fade-in duration-200"
    >
      <div>
        {/* ─── Top Header Row: "Student Workflow Guide" + Back Button + Compact Custom Workflow Builder Strip ─── */}
        <div className="space-y-2 pb-0.5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2.5">
                <h3
                  className="text-2xl sm:text-[28px] font-bold tracking-tight text-[#FFFDF7] drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] leading-tight"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Student Workflow Guide
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#081A38] hover:bg-[#102A54] border border-[#D4AF37]/55 hover:border-[#FFE394] text-[#D8C7A5] hover:text-white text-[11px] font-semibold cursor-pointer transition-all shadow-sm"
                  title="Return to standard Student Dossier overview"
                >
                  <ArrowLeft className="w-3 h-3 text-[#FFE394]" />
                  <span>Dossier View</span>
                </button>
              </div>
              <p className="text-xs sm:text-[13px] text-[#C8D6EA] drop-shadow">
                A guided, step-by-step workflow for this client.
              </p>
            </div>
          </div>

          {/* ─── Compact Custom Workflow Selector Strip (Smaller pills so more workflow selectors fit side-by-side) ─── */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {/* 1. Plan Dropdown Pill (Compact) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  data-testid="student-journey-plan-selector"
                  className="inline-flex items-center justify-between gap-1.5 h-6.5 px-2.5 rounded-[6px] bg-gradient-to-b from-[#0A1D3B] via-[#07152C] to-[#040D1E] hover:from-[#102952] hover:to-[#07162E] border border-[#C5A059]/75 hover:border-[#FFE394] text-[#E6EEF8] hover:text-white text-[11px] leading-none shadow-[0_2px_8px_rgba(0,0,0,0.7),inset_0_1px_0.5px_rgba(255,238,186,0.2)] cursor-pointer transition-all shrink-0"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  <span>
                    <span className="text-[#B8CAE0]">Plan:</span>{" "}
                    <strong className="font-semibold text-[#FFFDF7]">
                      {selectedPlan}
                    </strong>
                  </span>
                  <ChevronDown className="w-3 h-3 text-[#E5C168] shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="bg-[#06152D] border border-[#C5A059]/70 text-[#FFF4D4] rounded-xl p-1 min-w-[150px] shadow-2xl"
              >
                {PLAN_OPTIONS.map((plan) => (
                  <DropdownMenuItem
                    key={plan}
                    onClick={() => setSelectedPlan(plan)}
                    className={cn(
                      "text-[11.5px] py-1.5 px-2.5 rounded-lg cursor-pointer flex items-center justify-between",
                      selectedPlan === plan
                        ? "bg-[#133262] text-[#FFE394] font-bold"
                        : "text-[#DCE6F5] hover:bg-white/10"
                    )}
                  >
                    <span>Plan: {plan}</span>
                    {selectedPlan === plan && (
                      <Check className="w-3 h-3 text-[#FFE394]" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 2. Project Dropdown Pill (Compact) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  data-testid="student-journey-project-selector"
                  className="inline-flex items-center justify-between gap-1.5 h-6.5 px-2.5 rounded-[6px] bg-gradient-to-b from-[#0A1D3B] via-[#07152C] to-[#040D1E] hover:from-[#102952] hover:to-[#07162E] border border-[#C5A059]/75 hover:border-[#FFE394] text-[#E6EEF8] hover:text-white text-[11px] leading-none shadow-[0_2px_8px_rgba(0,0,0,0.7),inset_0_1px_0.5px_rgba(255,238,186,0.2)] cursor-pointer transition-all shrink-0"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  <span>
                    <span className="text-[#B8CAE0]">Project:</span>{" "}
                    <strong className="font-semibold text-[#FFFDF7]">
                      {selectedProject}
                    </strong>
                  </span>
                  <ChevronDown className="w-3 h-3 text-[#E5C168] shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="bg-[#06152D] border border-[#C5A059]/70 text-[#FFF4D4] rounded-xl p-1 min-w-[170px] shadow-2xl"
              >
                {PROJECT_OPTIONS.map((proj) => (
                  <DropdownMenuItem
                    key={proj}
                    onClick={() => setSelectedProject(proj)}
                    className={cn(
                      "text-[11.5px] py-1.5 px-2.5 rounded-lg cursor-pointer flex items-center justify-between",
                      selectedProject === proj
                        ? "bg-[#133262] text-[#FFE394] font-bold"
                        : "text-[#DCE6F5] hover:bg-white/10"
                    )}
                  >
                    <span>Project: {proj}</span>
                    {selectedProject === proj && (
                      <Check className="w-3 h-3 text-[#FFE394]" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 3. Any Additional Custom Workflow Pills Added by the Advocate */}
            {EXTRA_WORKFLOW_MODULES.filter(
              (m) => activeExtraModules[m.id] !== undefined
            ).map((mod) => {
              const currentVal = activeExtraModules[mod.id];
              return (
                <DropdownMenu key={mod.id}>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      data-testid={`student-journey-extra-${mod.id}`}
                      className="inline-flex items-center justify-between gap-1.5 h-6.5 px-2.5 rounded-[6px] bg-gradient-to-b from-[#0A1D3B] via-[#07152C] to-[#040D1E] hover:from-[#102952] hover:to-[#07162E] border border-[#C5A059]/75 hover:border-[#FFE394] text-[#E6EEF8] hover:text-white text-[11px] leading-none shadow-[0_2px_8px_rgba(0,0,0,0.7),inset_0_1px_0.5px_rgba(255,238,186,0.2)] cursor-pointer transition-all shrink-0"
                      style={{
                        fontFamily: "'Playfair Display', Georgia, serif",
                      }}
                    >
                      <span>
                        <span className="text-[#B8CAE0]">{mod.label}:</span>{" "}
                        <strong className="font-semibold text-[#FFFDF7]">
                          {currentVal}
                        </strong>
                      </span>
                      <ChevronDown className="w-3 h-3 text-[#E5C168] shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="bg-[#06152D] border border-[#C5A059]/70 text-[#FFF4D4] rounded-xl p-1 min-w-[175px] shadow-2xl"
                  >
                    {mod.options.map((opt) => (
                      <DropdownMenuItem
                        key={opt}
                        onClick={() =>
                          setActiveExtraModules((prev) => ({
                            ...prev,
                            [mod.id]: opt,
                          }))
                        }
                        className={cn(
                          "text-[11.5px] py-1.5 px-2.5 rounded-lg cursor-pointer flex items-center justify-between",
                          currentVal === opt
                            ? "bg-[#133262] text-[#FFE394] font-bold"
                            : "text-[#DCE6F5] hover:bg-white/10"
                        )}
                      >
                        <span>
                          {mod.label}: {opt}
                        </span>
                        {currentVal === opt && (
                          <Check className="w-3 h-3 text-[#FFE394]" />
                        )}
                      </DropdownMenuItem>
                    ))}
                    <div className="my-1 border-t border-[#1E3B68]" />
                    <DropdownMenuItem
                      onClick={() =>
                        setActiveExtraModules((prev) => {
                          const next = { ...prev };
                          delete next[mod.id];
                          return next;
                        })
                      }
                      className="text-[11px] py-1 px-2.5 rounded-lg cursor-pointer text-rose-300 hover:bg-rose-950/50"
                    >
                      Remove {mod.label} Filter
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            })}

            {/* 4. Compact "+ Add" Button to Add More Workflow Selectors to this Student Space */}
            {EXTRA_WORKFLOW_MODULES.some(
              (m) => activeExtraModules[m.id] === undefined
            ) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      data-testid="student-journey-add-workflow-pill"
                      title="Add another custom workflow filter to this student's journey"
                      className="inline-flex items-center justify-center gap-1 h-6.5 px-2 rounded-[6px] bg-[#07162E]/90 hover:bg-[#102952] border border-dashed border-[#C5A059]/65 hover:border-[#FFE394] text-[#FFE394] hover:text-white text-[10.5px] font-semibold leading-none shadow-sm cursor-pointer transition-all shrink-0"
                    >
                      <Plus className="w-3 h-3 text-[#FFE394]" />
                      <span>Add</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="bg-[#06152D] border border-[#C5A059]/70 text-[#FFF4D4] rounded-xl p-1 min-w-[185px] shadow-2xl"
                  >
                    <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-[#C6B697] border-b border-[#1E3B68]/80">
                      Add Workflow Parameter
                    </div>
                    {EXTRA_WORKFLOW_MODULES.filter(
                      (m) => activeExtraModules[m.id] === undefined
                    ).map((mod) => (
                      <DropdownMenuItem
                        key={mod.id}
                        onClick={() =>
                          setActiveExtraModules((prev) => ({
                            ...prev,
                            [mod.id]: mod.defaultValue,
                          }))
                        }
                        className="text-[11.5px] py-1.5 px-2.5 rounded-lg cursor-pointer flex items-center justify-between text-[#DCE6F5] hover:bg-white/10"
                      >
                        <span>
                          + {mod.label} ({mod.defaultValue})
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

            {/* Subtle Horizontal Extending Rule Line to the Right */}
            <div className="flex-1 min-w-[24px] h-[1px] bg-gradient-to-r from-[#2B4C7E]/80 via-[#2B4C7E]/45 to-transparent ml-1" />
          </div>
        </div>

        {/* ─── Dismissible "What is the Student Journey?" Banner Card (Reference Image 1) ─── */}
        {showIntroBanner && (
          <div
            className={cn(
              "relative mt-2.5 p-3.5 sm:p-4 rounded-2xl overflow-hidden transition-all",
              "bg-gradient-to-r from-[#132C52] via-[#0D2140] to-[#0A1A35]",
              "border border-[#D4AF37]/75",
              "shadow-[0_10px_26px_rgba(0,0,0,0.85),0_0_18px_rgba(212,175,55,0.18),inset_0_1px_1px_rgba(255,238,186,0.3)]"
            )}
          >
            {/* Subtle top gold rim gleam */}
            <div className="flex items-center gap-3.5 sm:gap-4 pr-6">
              <GlowingOpenBookIllustration />

              <div className="space-y-1 min-w-0 flex-1">
                <h4
                  className="text-base sm:text-[18px] font-bold text-[#FFE8A3] tracking-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  What is the Student Workflow Guide?
                </h4>
                <p className="text-xs sm:text-[12.5px] text-[#DCE6F5] leading-relaxed">
                  A streamlined, connected workflow that takes you from reviewing
                  records to updating parents — all in one place. Each step builds
                  on the last, so your work stays organized and nothing gets missed.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIntroBanner(false)}
              className="absolute top-3 right-3 w-6 h-6 rounded-lg flex items-center justify-center text-[#9FB4D4] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Dismiss introduction"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ─── 5-Step Connected Vertical Timeline & Accordion Cards (Reference Image 1 & 2) ─── */}
        <div className="relative mt-3.5 space-y-2.5">
          {JOURNEY_STEPS.map((step, index) => {
            const isExpanded = expandedStepId === step.id;
            const isGuidedDetailView = guidedDetailStepId === step.id;
            const isCompleted = step.status === "completed";
            const isCurrent = step.status === "current";
            const isLast = index === JOURNEY_STEPS.length - 1;

            // Compute dynamic progress from checked todos for the guided detail view
            const totalTodos = step.todos.length;
            const completedTodosCount = step.todos.filter(
              (t) => todoChecks[t.id]
            ).length;
            const computedProgress =
              step.id === "meeting_blueprint" && completedTodosCount === 2
                ? 60
                : Math.round((completedTodosCount / Math.max(1, totalTodos)) * 100);

            return (
              <div
                key={step.id}
                className="relative flex items-stretch gap-2.5 sm:gap-3"
              >
                {/* ── Left Timeline Rail & Step Node Indicator ── */}
                <div className="relative flex flex-col items-center w-8 shrink-0 pt-3">
                  {/* Vertical connecting line behind nodes */}
                  {!isLast && (
                    <div
                      className={cn(
                        "absolute top-8 bottom-[-14px] w-[2px] z-0",
                        isCompleted
                          ? "bg-gradient-to-b from-emerald-500/70 via-[#C5A059]/70 to-[#C5A059]/50"
                          : "bg-gradient-to-b from-[#C5A059]/60 to-[#274675]/60"
                      )}
                    />
                  )}

                  {/* Horizontal tick connecting node to card */}
                  <div
                    className={cn(
                      "absolute top-[25px] left-6 right-[-10px] h-[1.5px] z-0",
                      isExpanded || isCurrent
                        ? "bg-[#F4D068]"
                        : isCompleted
                          ? "bg-emerald-500/60"
                          : "bg-[#2C4E80]"
                    )}
                  />

                  {/* Circular Indicator Node (Green Check, Glowing Gold #3, or Navy #4/#5) */}
                  {isCompleted ? (
                    <div className="relative z-10 w-7 h-7 rounded-full bg-gradient-to-b from-[#164E38] to-[#0A291E] border-[1.5px] border-emerald-400/80 flex items-center justify-center text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.35),0_2px_6px_rgba(0,0,0,0.85)]">
                      <Check className="w-3.5 h-3.5 stroke-[2.8]" />
                    </div>
                  ) : isCurrent || isExpanded ? (
                    <div className="relative z-10 w-7.5 h-7.5 rounded-full bg-gradient-to-b from-[#233858] via-[#101F38] to-[#071020] border-2 border-[#F5C75B] flex items-center justify-center text-[#FFF4D4] font-bold text-xs shadow-[0_0_14px_rgba(245,199,91,0.55),0_2px_6px_rgba(0,0,0,0.9)]">
                      {step.stepNumber}
                    </div>
                  ) : (
                    <div className="relative z-10 w-7 h-7 rounded-full bg-gradient-to-b from-[#13294B] to-[#08152B] border border-[#3A5F94] flex items-center justify-center text-[#B8CBE6] font-bold text-xs shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
                      {step.stepNumber}
                    </div>
                  )}
                </div>

                {/* ── Right Step Accordion Card ── */}
                <div
                  className={cn(
                    "flex-1 rounded-2xl overflow-hidden transition-all duration-200",
                    isExpanded
                      ? "bg-gradient-to-b from-[#122D56] via-[#0B1F3F] to-[#07152C] border-[1.5px] border-[#F2C96B] shadow-[0_12px_30px_rgba(0,0,0,0.9),0_0_22px_rgba(242,201,107,0.25),inset_0_1px_1px_rgba(255,244,204,0.35)]"
                      : "bg-gradient-to-b from-[#0E2548] via-[#091A36] to-[#061226] border border-[#284A7E]/80 hover:border-[#D4AF37]/75 shadow-[0_6px_18px_rgba(0,0,0,0.8),inset_0_1px_0.5px_rgba(147,197,253,0.18)]"
                  )}
                >
                  {/* Card Header Row (Click anywhere to expand/collapse) */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (isExpanded) {
                        setExpandedStepId(null);
                      } else {
                        setExpandedStepId(step.id);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setExpandedStepId(isExpanded ? null : step.id);
                      }
                    }}
                    className="px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <StepCardIcon
                        iconType={step.iconType}
                        isExpanded={isExpanded}
                      />

                      <div className="min-w-0 flex-1">
                        <h4
                          className={cn(
                            "text-base sm:text-[17.5px] font-bold tracking-tight leading-snug drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]",
                            isExpanded ? "text-white" : "text-[#F2F6FC]"
                          )}
                          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                        >
                          {step.title}
                        </h4>
                        <p className="text-[11.5px] sm:text-xs text-[#B9CCE6] leading-snug mt-0.5">
                          {step.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="text-[#C8D7EC] shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="w-4.5 h-4.5 text-[#FFE394]" />
                      ) : (
                        <ChevronDown className="w-4.5 h-4.5" />
                      )}
                    </div>
                  </div>

                  {/* ── Expanded Body: Progress Bar + 5-Stage Horizontal Stepper + To Do in This Step + Next Action (Matches Reference Image) ── */}
                  {isExpanded && (
                    <div
                      data-testid={`journey-guided-detail-${step.id}`}
                      className="px-4 pb-4 pt-2.5 border-t border-[#D4AF37]/35 bg-gradient-to-b from-[#091A36]/95 to-[#051024]/95 space-y-3.5 animate-in fade-in duration-150"
                    >
                      {/* 1. Progress Header + Glowing Gold Progress Bar */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-white">
                            Progress:{" "}
                            <strong className="text-[#FFE394]">
                              {computedProgress}% Complete
                            </strong>
                          </span>
                          <span className="text-[#C8D7EC]">
                            Step {step.activeSubStepIndex + 1} of{" "}
                            {step.subSteps.length}
                          </span>
                        </div>

                        {/* Recessed Dark Track with Glowing Liquid-Gold Fill */}
                        <div className="w-full h-3 rounded-full bg-[#040C1B] border border-[#294A7A]/80 p-[1.5px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.9)] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#C89632] via-[#F2C96B] to-[#FFF0B8] shadow-[0_0_12px_rgba(244,208,104,0.8)] transition-all duration-300"
                            style={{ width: `${computedProgress}%` }}
                          />
                        </div>
                      </div>

                      {/* 2. Horizontal 5-Node Connected Sub-Stepper (Priorities -> Data & Evidence -> Goals & Changes -> Talking Points -> Review & Finalize) */}
                      <div className="relative pt-1 pb-1">
                        {/* Connecting Horizontal Rail behind circles */}
                        <div className="absolute top-[16px] left-[10%] right-[10%] h-[2px] bg-[#284A7E] z-0" />
                        <div
                          className="absolute top-[16px] left-[10%] h-[2px] bg-gradient-to-r from-emerald-400 via-[#F4D068] to-[#F4D068] z-0 transition-all duration-300"
                          style={{
                            width: `${Math.min(
                              80,
                              Math.max(0, step.activeSubStepIndex * 20)
                            )}%`,
                          }}
                        />

                        <div className="relative z-10 grid grid-cols-5 gap-1 text-center">
                          {step.subSteps.map((sub) => {
                            const isSubDone = sub.status === "completed";
                            const isSubCurrent = sub.status === "current";
                            return (
                              <div
                                key={sub.number}
                                className="flex flex-col items-center gap-1"
                              >
                                {isSubDone ? (
                                  <div className="w-6.5 h-6.5 rounded-full bg-gradient-to-b from-[#1E6B4B] to-[#0E3B28] border-[1.5px] border-emerald-400 flex items-center justify-center text-white shadow-[0_0_10px_rgba(16,185,129,0.45)]">
                                    <Check className="w-3.5 h-3.5 stroke-[2.8]" />
                                  </div>
                                ) : isSubCurrent ? (
                                  <div className="w-7 h-7 rounded-full bg-gradient-to-b from-[#233858] to-[#081326] border-2 border-[#F5C75B] flex items-center justify-center text-[#FFF4D4] font-bold text-xs shadow-[0_0_14px_rgba(245,199,91,0.7)]">
                                    {sub.number}
                                  </div>
                                ) : (
                                  <div className="w-6.5 h-6.5 rounded-full bg-gradient-to-b from-[#13294B] to-[#08152B] border border-[#3B5F94] flex items-center justify-center text-[#B8CBE6] font-bold text-xs">
                                    {sub.number}
                                  </div>
                                )}

                                <span
                                  className={cn(
                                    "text-[10.5px] sm:text-[11px] leading-tight font-medium",
                                    isSubCurrent
                                      ? "text-[#FFE394] font-bold"
                                      : isSubDone
                                        ? "text-[#DCE6F5]"
                                        : "text-[#9FB4D4]"
                                  )}
                                >
                                  {sub.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 3. Lower Split Grid: "To Do in This Step" Checklist | "Next Action" + Buttons + Blueprint */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 pt-2 border-t border-[#1E3B68]/80 items-center">
                        {/* Left Column: To Do in This Step */}
                        <div className="md:col-span-5 space-y-1.5 md:border-r md:border-[#244373]/70 md:pr-3">
                          <h5
                            className="text-xs sm:text-[13.5px] font-bold text-[#FFF4D4]"
                            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                          >
                            To Do in This Step
                          </h5>
                          <div className="space-y-1.5">
                            {step.todos.map((todo) => {
                              const checked = !!todoChecks[todo.id];
                              return (
                                <button
                                  key={todo.id}
                                  type="button"
                                  onClick={() => toggleTodo(todo.id)}
                                  className="w-full flex items-center gap-2 text-left text-[11.5px] sm:text-xs text-[#E5EEF9] hover:text-white cursor-pointer group"
                                >
                                  <div
                                    className={cn(
                                      "w-4 h-4 rounded-[4px] flex items-center justify-center border transition-all shrink-0",
                                      checked
                                        ? "bg-gradient-to-b from-emerald-500 to-emerald-700 border-emerald-300 text-white shadow-[0_0_6px_rgba(16,185,129,0.45)]"
                                        : "bg-[#08172E] border-[#42699E] group-hover:border-[#FFE394]"
                                    )}
                                  >
                                    {checked && (
                                      <Check className="w-3 h-3 stroke-[3]" />
                                    )}
                                  </div>
                                  <span
                                    className={cn(
                                      checked
                                        ? "text-[#DCE6F5]"
                                        : "text-[#B8CBE6]"
                                    )}
                                  >
                                    {todo.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Right Column: Next Action + Open > / Guide Me Buttons + Blueprint Scroll */}
                        <div className="md:col-span-7 flex flex-col justify-between space-y-2.5">
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-[#F4D068]" />
                                <h5
                                  className="text-xs sm:text-[13.5px] font-bold text-[#FFF4D4]"
                                  style={{
                                    fontFamily: "'Playfair Display', Georgia, serif",
                                  }}
                                >
                                  Next Action
                                </h5>
                              </div>
                              <div className="flex items-start gap-1.5 text-[11.5px] sm:text-xs text-[#DCE6F5] leading-relaxed">
                                <Check className="w-3.5 h-3.5 text-[#F4D068] shrink-0 mt-0.5 stroke-[2.5]" />
                                <span>{step.nextActionText}</span>
                              </div>
                            </div>

                            <BlueprintScrollIllustration className="w-20 h-15 hidden sm:flex" />
                          </div>

                          {/* Bottom Action Buttons: Gold "Open >" & Navy-Gold "✦ Guide Me" */}
                          <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
                            <button
                              type="button"
                              onClick={() =>
                                onNavigate(
                                  step.openPath(studentId, hasComplaintDraft)
                                )
                              }
                              data-testid={`journey-step-open-${step.id}`}
                              className={cn(
                                "inline-flex items-center justify-center gap-1.5 px-5 py-1.5 rounded-lg font-bold text-xs cursor-pointer transition-all",
                                "bg-gradient-to-b from-[#F5D98B] via-[#D8AD54] to-[#A67B28] hover:from-[#FFE49E] hover:via-[#E3B85F] hover:to-[#B5882F]",
                                "text-[#131822] border border-[#FFF2C2]/80",
                                "shadow-[0_4px_12px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.75)]"
                              )}
                            >
                              <span>Open</span>
                              <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setGuidedDetailStepId((prev) =>
                                  prev === step.id ? null : step.id
                                )
                              }
                              data-testid={`journey-step-guide-me-${step.id}`}
                              className={cn(
                                "inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-full font-semibold text-xs cursor-pointer transition-all",
                                "bg-gradient-to-b from-[#132F5C] via-[#0B1E3D] to-[#061226] hover:from-[#1B3F7A] hover:to-[#0A1B38]",
                                "text-[#FFE394] hover:text-white border border-[#D4AF37]/80 hover:border-[#FFE394]",
                                "shadow-[0_4px_12px_rgba(0,0,0,0.8),inset_0_1px_0.5px_rgba(255,243,196,0.28)]"
                              )}
                              title="Toggle step overview details"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-[#F4D068]" />
                              <span>Guide Me</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Optional Secondary Overview Strip ("In this step, you will:" & "Why it matters:") toggled when clicking Guide Me */}
                      {isGuidedDetailView && (
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 pt-2.5 border-t border-[#1E3B68]/70 items-start animate-in fade-in duration-150">
                          <div className="md:col-span-5 space-y-1 md:border-r md:border-[#244373]/70 md:pr-3">
                            <h5
                              className="text-xs font-bold text-[#FFE394]"
                              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                            >
                              In this step, you will:
                            </h5>
                            <ul className="space-y-1">
                              {step.inThisStepBullets.map((item) => (
                                <li
                                  key={item}
                                  className="flex items-center gap-2 text-[11px] text-[#DCE6F5]"
                                >
                                  <Check className="w-3 h-3 text-[#F4D068] shrink-0 stroke-[2.5]" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="md:col-span-7 space-y-1">
                            <h5
                              className="text-xs font-bold text-[#FFE394]"
                              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                            >
                              Why it matters:
                            </h5>
                            <p className="text-[11.5px] text-[#C6D5EB] leading-relaxed">
                              {step.whyItMatters}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Optional Footer Link: Guide Parent Live in Portal Co-Browse */}
      <div className="pt-2 border-t border-[#1E3B68]/60 flex items-center justify-between text-[11px] text-[#9FB4D4]">
        <span>
          Click any step above to expand its workflow or click{" "}
          <strong className="text-[#FFE394]">Guide Me</strong> for step-by-step progress.
        </span>
        <button
          type="button"
          onClick={() => setLiveCoBrowseOpen(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#081A38] hover:bg-[#102A54] border border-[#2C528C] text-[#93C5FD] hover:text-white font-semibold cursor-pointer transition-all shrink-0"
        >
          <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
          <span>Co-Browse Portal</span>
        </button>
      </div>

      {liveCoBrowseOpen && (
        <GuideClientLiveModal
          open={liveCoBrowseOpen}
          onOpenChange={setLiveCoBrowseOpen}
          contact={student}
          parentContact={parent}
        />
      )}
    </div>
  );
}
