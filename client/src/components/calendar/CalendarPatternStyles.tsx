import React from "react";
import {
  CheckCircle2,
  Clock,
  Ban,
  Building2,
  Users,
  Plane,
  User,
  AlertTriangle,
  AlertOctagon,
  Briefcase,
  GraduationCap,
  Coffee,
  Navigation,
  Hourglass,
  Sparkles,
} from "lucide-react";

export type CalendarItemPatternKey =
  | "confirmed"
  | "proposed_hold"
  | "block_time"
  | "office_closure"
  | "internal_event"
  | "office_closed"
  | "holiday"
  | "pto_vacation"
  | "personal_day"
  | "sick_out"
  | "blackout"
  | "protected_work"
  | "staff_training"
  | "team_meeting"
  | "lunch_break"
  | "travel_transition"
  | "buffer_time";

export type CalendarPatternKey = CalendarItemPatternKey;

export interface PatternDefinition {
  key: CalendarItemPatternKey;
  label: string;
  name?: string;
  shortLabel: string;
  sub: string;
  patternName: string;
  patternSymbol: string; // e.g. "///////", "◇◇◇◇", "\\\\\\\\", "····", "====", "XXXX", "||||"
  accentColor: string;
  borderColor: string;
  borderClass: string;
  badgeClass: string;
  inlineBackground: string;
  fabricBackground: string; // Subtle backdrop shading for unavailable time slots
  sampleBadge: string;
  sampleTitle: string;
  sampleTime: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}

export const CALENDAR_PATTERNS: Record<CalendarItemPatternKey, PatternDefinition> = {
  confirmed: {
    key: "confirmed",
    label: "Confirmed Appointment",
    shortLabel: "Confirmed",
    sub: "Client/student meeting with set date & time",
    patternName: "Vibrant Emerald Green (Confirmed)",
    patternSymbol: "●●●●",
    accentColor: "#34D399",
    borderColor: "#10B981",
    borderClass:
      "border-solid border-emerald-500 border-l-[8px] border-l-emerald-300 shadow-[0_4px_25px_rgba(16,185,129,0.35),inset_0_1px_1px_rgba(110,231,183,0.3)]",
    badgeClass:
      "bg-emerald-500 text-emerald-950 border-emerald-300 font-extrabold shadow-[0_0_10px_rgba(52,211,153,0.6)]",
    inlineBackground:
      "radial-gradient(ellipse at top left, rgba(52, 211, 153, 0.30) 0%, transparent 70%), linear-gradient(135deg, #065F46 0%, #047857 45%, #064E3B 100%)",
    fabricBackground:
      "repeating-linear-gradient(45deg, rgba(16, 185, 129, 0.25) 0px, rgba(16, 185, 129, 0.25) 8px, rgba(6, 78, 59, 0.65) 8px, rgba(6, 78, 59, 0.65) 16px)",
    sampleBadge: "CONFIRMED",
    sampleTitle: "IEP Annual Review",
    sampleTime: "10:00 AM",
    icon: CheckCircle2,
  },

  proposed_hold: {
    key: "proposed_hold",
    label: "Proposed Meeting / Hold Dates",
    shortLabel: "Candidate Hold",
    sub: "Protected candidate times awaiting confirmation",
    patternName: "Diagonal Amber Tentative Hazard",
    patternSymbol: "//////",
    accentColor: "#F59E0B",
    borderColor: "#F59E0B",
    borderClass: "border-dashed border-amber-500/70 border-l-4 border-l-amber-400",
    badgeClass: "bg-amber-500/25 text-amber-300 border-amber-500/50",
    inlineBackground:
      "repeating-linear-gradient(45deg, rgba(245, 158, 11, 0.16) 0px, rgba(245, 158, 11, 0.16) 8px, rgba(16, 43, 78, 0.5) 8px, rgba(16, 43, 78, 0.5) 16px)",
    fabricBackground:
      "repeating-linear-gradient(45deg, rgba(245, 158, 11, 0.08) 0px, rgba(245, 158, 11, 0.08) 8px, rgba(5, 20, 43, 0.4) 8px, rgba(5, 20, 43, 0.4) 16px)",
    sampleBadge: "1 OF 3 HOLDS",
    sampleTitle: "Hold: Eligibility Review",
    sampleTime: "1:00 PM",
    icon: Clock,
  },

  office_closed: {
    key: "office_closed",
    label: "Office Closed",
    shortLabel: "Office Closed",
    sub: "Organization closure: scheduled, weather, or emergency",
    patternName: "Dense Diagonal Crosshatch (Closure)",
    patternSymbol: "////////",
    accentColor: "#F43F5E",
    borderColor: "#F43F5E",
    borderClass: "border-solid border-rose-900/70 border-l-4 border-l-rose-500",
    badgeClass: "bg-rose-950/90 text-rose-300 border-rose-700/70",
    inlineBackground:
      "repeating-linear-gradient(45deg, rgba(244, 63, 94, 0.25) 0px, rgba(244, 63, 94, 0.25) 8px, rgba(20, 5, 10, 0.85) 8px, rgba(20, 5, 10, 0.85) 16px)",
    fabricBackground:
      "repeating-linear-gradient(45deg, rgba(244, 63, 94, 0.14) 0px, rgba(244, 63, 94, 0.14) 8px, rgba(20, 5, 10, 0.55) 8px, rgba(20, 5, 10, 0.55) 16px)",
    sampleBadge: "HARD BLOCK",
    sampleTitle: "Office Closed (Entire Company)",
    sampleTime: "All Day",
    icon: Building2,
  },

  office_closure: {
    key: "office_closure",
    label: "Office Closure / Holiday",
    shortLabel: "Closure / Holiday",
    sub: "Organization-wide closure or holiday",
    patternName: "Crimson Protective Crosshatch",
    patternSymbol: "////////",
    accentColor: "#F43F5E",
    borderColor: "#F43F5E",
    borderClass: "border-solid border-rose-900/60 border-l-4 border-l-rose-500",
    badgeClass: "bg-rose-950/80 text-rose-300 border-rose-700/60",
    inlineBackground:
      "repeating-linear-gradient(45deg, rgba(244, 63, 94, 0.22) 0px, rgba(244, 63, 94, 0.22) 8px, rgba(20, 5, 10, 0.8) 8px, rgba(20, 5, 10, 0.8) 16px)",
    fabricBackground:
      "repeating-linear-gradient(45deg, rgba(244, 63, 94, 0.12) 0px, rgba(244, 63, 94, 0.12) 8px, rgba(20, 5, 10, 0.5) 8px, rgba(20, 5, 10, 0.5) 16px)",
    sampleBadge: "OFFICE CLOSED",
    sampleTitle: "Holiday / Closure",
    sampleTime: "Closed",
    icon: Building2,
  },

  holiday: {
    key: "holiday",
    label: "Holiday",
    shortLabel: "Holiday",
    sub: "Federal, state, or company observed holiday",
    patternName: "Fine Diamond Lattice Mesh",
    patternSymbol: "◇◇◇◇",
    accentColor: "#DFBE77",
    borderColor: "#DFBE77",
    borderClass: "border-solid border-[#3A2C18] border-l-4 border-l-[#DFBE77]",
    badgeClass: "bg-[#DFBE77]/20 text-[#FFE394] border-[#DFBE77]/50",
    inlineBackground:
      "radial-gradient(ellipse at 50% 50%, rgba(223, 190, 119, 0.2) 20%, rgba(5, 20, 43, 0.9) 80%), repeating-linear-gradient(45deg, rgba(223, 190, 119, 0.08) 0px, rgba(223, 190, 119, 0.08) 6px, transparent 6px, transparent 12px), repeating-linear-gradient(-45deg, rgba(223, 190, 119, 0.08) 0px, rgba(223, 190, 119, 0.08) 6px, transparent 6px, transparent 12px)",
    fabricBackground:
      "repeating-linear-gradient(45deg, rgba(223, 190, 119, 0.06) 0px, rgba(223, 190, 119, 0.06) 6px, transparent 6px, transparent 12px)",
    sampleBadge: "OBSERVED",
    sampleTitle: "Memorial Day Holiday",
    sampleTime: "All Day",
    icon: Sparkles,
  },

  pto_vacation: {
    key: "pto_vacation",
    label: "PTO / Vacation",
    shortLabel: "PTO",
    sub: "Planned employee time off (hard block)",
    patternName: "Wide Diagonal Weave",
    patternSymbol: "\\\\\\\\",
    accentColor: "#38BDF8",
    borderColor: "#38BDF8",
    borderClass: "border-solid border-sky-900/60 border-l-4 border-l-sky-400",
    badgeClass: "bg-sky-950/80 text-sky-300 border-sky-700/60",
    inlineBackground:
      "repeating-linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0px, rgba(56, 189, 248, 0.2) 10px, rgba(16, 43, 78, 0.6) 10px, rgba(16, 43, 78, 0.6) 20px)",
    fabricBackground:
      "repeating-linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0px, rgba(56, 189, 248, 0.1) 10px, rgba(16, 43, 78, 0.3) 10px, rgba(16, 43, 78, 0.3) 20px)",
    sampleBadge: "PTO",
    sampleTitle: "Vacation Time Off",
    sampleTime: "Full Day",
    icon: Plane,
  },

  personal_day: {
    key: "personal_day",
    label: "Personal Day",
    shortLabel: "Personal",
    sub: "Private personal day (quiet, details optional)",
    patternName: "Soft Dotted Field Pattern",
    patternSymbol: "········",
    accentColor: "#A78BFA",
    borderColor: "#A78BFA",
    borderClass: "border-solid border-indigo-900/60 border-l-4 border-l-indigo-400",
    badgeClass: "bg-indigo-950/80 text-indigo-300 border-indigo-700/60",
    inlineBackground:
      "radial-gradient(circle, rgba(167, 139, 250, 0.3) 1.5px, transparent 1.5px) 0 0 / 12px 12px, linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(7, 22, 43, 0.95))",
    fabricBackground:
      "radial-gradient(circle, rgba(167, 139, 250, 0.15) 1px, transparent 1px) 0 0 / 12px 12px",
    sampleBadge: "PERSONAL",
    sampleTitle: "Personal Day (Unavailable)",
    sampleTime: "Full Day",
    icon: User,
  },

  sick_out: {
    key: "sick_out",
    label: "Sick / Out",
    shortLabel: "Sick / Out",
    sub: "Unexpected absence (immediate availability block)",
    patternName: "Fine Horizontal Hatch",
    patternSymbol: "========",
    accentColor: "#FB7185",
    borderColor: "#FB7185",
    borderClass: "border-solid border-rose-900/70 border-l-4 border-l-rose-400",
    badgeClass: "bg-rose-950/80 text-rose-300 border-rose-600/60",
    inlineBackground:
      "repeating-linear-gradient(0deg, rgba(251, 113, 133, 0.22) 0px, rgba(251, 113, 133, 0.22) 4px, rgba(15, 23, 42, 0.8) 4px, rgba(15, 23, 42, 0.8) 8px)",
    fabricBackground:
      "repeating-linear-gradient(0deg, rgba(251, 113, 133, 0.1) 0px, rgba(251, 113, 133, 0.1) 4px, rgba(15, 23, 42, 0.4) 4px, rgba(15, 23, 42, 0.4) 8px)",
    sampleBadge: "OUT TODAY",
    sampleTitle: "Out (Unscheduled Absence)",
    sampleTime: "Rest of Day",
    icon: AlertTriangle,
  },

  blackout: {
    key: "blackout",
    label: "Blackout",
    shortLabel: "Blackout",
    sub: "Strict scheduling freeze (Company, Team, or Individual)",
    patternName: "Crossed Diagonal Double Hatch",
    patternSymbol: "XXXXXXXX",
    accentColor: "#F43F5E",
    borderColor: "#F43F5E",
    borderClass: "border-solid border-rose-950 border-l-4 border-l-rose-600",
    badgeClass: "bg-rose-950 text-rose-200 border-rose-600 font-bold",
    inlineBackground:
      "repeating-linear-gradient(45deg, rgba(244, 63, 94, 0.25) 0px, rgba(244, 63, 94, 0.25) 6px, transparent 6px, transparent 12px), repeating-linear-gradient(-45deg, rgba(244, 63, 94, 0.25) 0px, rgba(244, 63, 94, 0.25) 6px, rgba(10, 5, 15, 0.85) 6px, rgba(10, 5, 15, 0.85) 12px)",
    fabricBackground:
      "repeating-linear-gradient(45deg, rgba(244, 63, 94, 0.12) 0px, rgba(244, 63, 94, 0.12) 6px, transparent 6px, transparent 12px), repeating-linear-gradient(-45deg, rgba(244, 63, 94, 0.12) 0px, rgba(244, 63, 94, 0.12) 6px, transparent 6px, transparent 12px)",
    sampleBadge: "BLACKOUT",
    sampleTitle: "Scheduling Freeze (Do Not Book)",
    sampleTime: "Strict Block",
    icon: AlertOctagon,
  },

  protected_work: {
    key: "protected_work",
    label: "Protected Work Time",
    shortLabel: "Protected Work",
    sub: "Casework, complaint writing, document review (Soft/Hard)",
    patternName: "Thin Vertical Pinstripe",
    patternSymbol: "||||||||",
    accentColor: "#C084FC",
    borderColor: "#C084FC",
    borderClass: "border-solid border-purple-900/60 border-l-4 border-l-purple-400",
    badgeClass: "bg-purple-950/80 text-purple-300 border-purple-700/60",
    inlineBackground:
      "repeating-linear-gradient(90deg, rgba(192, 132, 252, 0.2) 0px, rgba(192, 132, 252, 0.2) 4px, rgba(15, 23, 42, 0.8) 4px, rgba(15, 23, 42, 0.8) 12px)",
    fabricBackground:
      "repeating-linear-gradient(90deg, rgba(192, 132, 252, 0.1) 0px, rgba(192, 132, 252, 0.1) 4px, transparent 4px, transparent 12px)",
    sampleBadge: "CASEWORK",
    sampleTitle: "Deep Casework / Preparation",
    sampleTime: "2:00–5:00 PM",
    icon: Briefcase,
  },

  staff_training: {
    key: "staff_training",
    label: "Staff Training",
    shortLabel: "Training",
    sub: "Professional development & team learning",
    patternName: "Subtle Checker Grid Pattern",
    patternSymbol: "▦ ▦ ▦",
    accentColor: "#34D399",
    borderColor: "#34D399",
    borderClass: "border-solid border-emerald-900/60 border-l-4 border-l-emerald-400",
    badgeClass: "bg-emerald-950/80 text-emerald-300 border-emerald-700/60",
    inlineBackground:
      "repeating-linear-gradient(45deg, rgba(52, 211, 153, 0.16) 0px, rgba(52, 211, 153, 0.16) 6px, transparent 6px, transparent 12px), repeating-linear-gradient(135deg, rgba(52, 211, 153, 0.16) 0px, rgba(52, 211, 153, 0.16) 6px, rgba(5, 20, 35, 0.8) 6px, rgba(5, 20, 35, 0.8) 12px)",
    fabricBackground:
      "repeating-linear-gradient(45deg, rgba(52, 211, 153, 0.08) 0px, rgba(52, 211, 153, 0.08) 6px, transparent 6px, transparent 12px)",
    sampleBadge: "TRAINING",
    sampleTitle: "Advocacy Protocol Workshop",
    sampleTime: "1:00–3:00 PM",
    icon: GraduationCap,
  },

  team_meeting: {
    key: "team_meeting",
    label: "Team / Internal Meeting",
    shortLabel: "Team Meeting",
    sub: "Case conference, supervision, operations sync",
    patternName: "Fine Alternating Horizontal Weave",
    patternSymbol: "≡≡≡≡",
    accentColor: "#60A5FA",
    borderColor: "#60A5FA",
    borderClass: "border-solid border-blue-900/60 border-l-4 border-l-blue-400",
    badgeClass: "bg-blue-950/80 text-blue-300 border-blue-700/60",
    inlineBackground:
      "repeating-linear-gradient(0deg, rgba(96, 165, 250, 0.18) 0px, rgba(96, 165, 250, 0.18) 5px, rgba(16, 43, 78, 0.6) 5px, rgba(16, 43, 78, 0.6) 10px)",
    fabricBackground:
      "repeating-linear-gradient(0deg, rgba(96, 165, 250, 0.08) 0px, rgba(96, 165, 250, 0.08) 5px, transparent 5px, transparent 10px)",
    sampleBadge: "INTERNAL",
    sampleTitle: "Weekly Team Operations",
    sampleTime: "11:00 AM",
    icon: Users,
  },

  lunch_break: {
    key: "lunch_break",
    label: "Lunch / Break",
    shortLabel: "Lunch",
    sub: "Daily personal break or meal interval",
    patternName: "Light Micro-Stripe Pattern",
    patternSymbol: "········",
    accentColor: "#FBBF24",
    borderColor: "#FBBF24",
    borderClass: "border-solid border-amber-900/50 border-l-4 border-l-amber-500",
    badgeClass: "bg-amber-950/70 text-amber-300 border-amber-700/50",
    inlineBackground:
      "repeating-linear-gradient(90deg, rgba(251, 191, 36, 0.15) 0px, rgba(251, 191, 36, 0.15) 3px, rgba(15, 23, 42, 0.75) 3px, rgba(15, 23, 42, 0.75) 8px)",
    fabricBackground:
      "repeating-linear-gradient(90deg, rgba(251, 191, 36, 0.08) 0px, rgba(251, 191, 36, 0.08) 3px, transparent 3px, transparent 8px)",
    sampleBadge: "LUNCH",
    sampleTitle: "Lunch & Personal Break",
    sampleTime: "12:30–1:00 PM",
    icon: Coffee,
  },

  travel_transition: {
    key: "travel_transition",
    label: "Travel / Transition",
    shortLabel: "Travel",
    sub: "Transition time, commute, or school visit travel",
    patternName: "Directional Chevron Pattern",
    patternSymbol: ">>>>>>",
    accentColor: "#2DD4BF",
    borderColor: "#2DD4BF",
    borderClass: "border-solid border-teal-900/60 border-l-4 border-l-teal-400",
    badgeClass: "bg-teal-950/80 text-teal-300 border-teal-700/60",
    inlineBackground:
      "repeating-linear-gradient(135deg, rgba(45, 212, 191, 0.2) 0px, rgba(45, 212, 191, 0.2) 6px, transparent 6px, transparent 12px), repeating-linear-gradient(45deg, rgba(45, 212, 191, 0.2) 0px, rgba(45, 212, 191, 0.2) 6px, rgba(5, 25, 30, 0.8) 6px, rgba(5, 25, 30, 0.8) 12px)",
    fabricBackground:
      "repeating-linear-gradient(135deg, rgba(45, 212, 191, 0.1) 0px, rgba(45, 212, 191, 0.1) 6px, transparent 6px, transparent 12px)",
    sampleBadge: "TRANSIT",
    sampleTitle: "School Observation Commute",
    sampleTime: "45 min",
    icon: Navigation,
  },

  buffer_time: {
    key: "buffer_time",
    label: "Buffer Time",
    shortLabel: "Buffer",
    sub: "Pre/post meeting decompression or setup",
    patternName: "Subtle Edge Stripe",
    patternSymbol: "||||",
    accentColor: "#94A3B8",
    borderColor: "#94A3B8",
    borderClass: "border-solid border-slate-700/60 border-l-4 border-l-slate-400",
    badgeClass: "bg-slate-800/80 text-slate-300 border-slate-600/60",
    inlineBackground:
      "repeating-linear-gradient(90deg, rgba(148, 163, 184, 0.15) 0px, rgba(148, 163, 184, 0.15) 2px, rgba(15, 23, 42, 0.75) 2px, rgba(15, 23, 42, 0.75) 8px)",
    fabricBackground:
      "repeating-linear-gradient(90deg, rgba(148, 163, 184, 0.08) 0px, rgba(148, 163, 184, 0.08) 2px, transparent 2px, transparent 8px)",
    sampleBadge: "BUFFER",
    sampleTitle: "Meeting Decompression Buffer",
    sampleTime: "15 min",
    icon: Hourglass,
  },

  block_time: {
    key: "block_time",
    label: "Block Time",
    shortLabel: "Blocked Time",
    sub: "PTO, personal, sick, blackout, protected work, lunch",
    patternName: "Slate Diagonal Hatch Pattern",
    patternSymbol: "\\\\\\\\",
    accentColor: "#94A3B8",
    borderColor: "#94A3B8",
    borderClass: "border-solid border-slate-700/60 border-l-4 border-l-slate-400",
    badgeClass: "bg-slate-800/80 text-slate-300 border-slate-600/60",
    inlineBackground:
      "repeating-linear-gradient(135deg, rgba(148, 163, 184, 0.18) 0px, rgba(148, 163, 184, 0.18) 6px, rgba(15, 23, 42, 0.75) 6px, rgba(15, 23, 42, 0.75) 12px)",
    fabricBackground:
      "repeating-linear-gradient(135deg, rgba(148, 163, 184, 0.09) 0px, rgba(148, 163, 184, 0.09) 6px, transparent 6px, transparent 12px)",
    sampleBadge: "PTO / UNAVAILABLE",
    sampleTitle: "Protected Work / PTO",
    sampleTime: "All Day",
    icon: Ban,
  },

  internal_event: {
    key: "internal_event",
    label: "Internal Event",
    shortLabel: "Internal Event",
    sub: "Team meeting, staff training, case conference",
    patternName: "Cobalt Directional Weave Pattern",
    patternSymbol: "≡≡≡≡",
    accentColor: "#60A5FA",
    borderColor: "#60A5FA",
    borderClass: "border-solid border-blue-900/60 border-l-4 border-l-blue-400",
    badgeClass: "bg-blue-950/80 text-blue-300 border-blue-700/60",
    inlineBackground:
      "repeating-linear-gradient(90deg, rgba(96, 165, 250, 0.18) 0px, rgba(96, 165, 250, 0.18) 8px, rgba(16, 43, 78, 0.6) 8px, rgba(16, 43, 78, 0.6) 16px)",
    fabricBackground:
      "repeating-linear-gradient(90deg, rgba(96, 165, 250, 0.09) 0px, rgba(96, 165, 250, 0.09) 8px, transparent 8px, transparent 16px)",
    sampleBadge: "INTERNAL",
    sampleTitle: "Team Meeting & Training",
    sampleTime: "2:00 PM",
    icon: Users,
  },
};

/**
 * Precedence hierarchy for overlapping operational availability restrictions:
 * 1. OFFICE CLOSED / EMERGENCY CLOSURE
 * 2. BLACKOUT
 * 3. PTO / SICK / PERSONAL
 * 4. TRAINING / INTERNAL MEETING
 * 5. PROTECTED WORK
 * 6. BUFFER / BREAK
 * 7. INFORMATIONAL EVENT / HOLIDAY
 */
export const PATTERN_PRECEDENCE_ORDER: CalendarItemPatternKey[] = [
  "office_closed",
  "office_closure",
  "blackout",
  "sick_out",
  "pto_vacation",
  "personal_day",
  "staff_training",
  "team_meeting",
  "protected_work",
  "travel_transition",
  "lunch_break",
  "buffer_time",
  "holiday",
  "block_time",
  "internal_event",
  "proposed_hold",
  "confirmed",
];

/**
 * Detect the pattern key for any calendar appointment, hold, or operational block
 */
export function detectItemPatternKey(item: {
  isHold?: boolean;
  meetingType?: string | null;
  blockType?: string | null;
  title?: string | null;
  status?: string | null;
  schedulingEffect?: string | null;
  isClosure?: boolean;
}): CalendarItemPatternKey {
  if (item.isHold) return "proposed_hold";
  if (item.isClosure) return "office_closed";

  const rawType = (item.blockType || item.meetingType || "").toUpperCase();
  const lowerTitle = (item.title || "").toLowerCase();

  // 1. Office Closed
  if (
    rawType === "OFFICE_CLOSED" ||
    lowerTitle.includes("[office closed]") ||
    lowerTitle.includes("office closed") ||
    lowerTitle.includes("emergency closure") ||
    lowerTitle.includes("weather closure") ||
    lowerTitle.includes("company-wide closure")
  ) {
    return "office_closed";
  }

  // 2. Blackout
  if (
    rawType === "BLACKOUT" ||
    lowerTitle.includes("[blackout]") ||
    lowerTitle.includes("blackout") ||
    lowerTitle.includes("scheduling freeze")
  ) {
    return "blackout";
  }

  // 3. Sick / Out
  if (
    rawType === "SICK_OUT" ||
    rawType === "SICK" ||
    lowerTitle.includes("[sick") ||
    lowerTitle.includes("out today") ||
    lowerTitle.includes("sick / out")
  ) {
    return "sick_out";
  }

  // 4. PTO / Vacation
  if (
    rawType === "PTO_VACATION" ||
    rawType === "PTO" ||
    lowerTitle.includes("[pto") ||
    lowerTitle.includes("[vacation") ||
    lowerTitle.includes("pto / vacation")
  ) {
    return "pto_vacation";
  }

  // 5. Personal Day
  if (
    rawType === "PERSONAL_DAY" ||
    lowerTitle.includes("[personal day]") ||
    lowerTitle.includes("personal day")
  ) {
    return "personal_day";
  }

  // 6. Holiday
  if (
    rawType === "HOLIDAY" ||
    lowerTitle.includes("holiday") ||
    lowerTitle.includes("memorial day") ||
    lowerTitle.includes("thanksgiving") ||
    lowerTitle.includes("labor day") ||
    lowerTitle.includes("christmas")
  ) {
    return "holiday";
  }

  // 7. Protected Casework
  if (
    rawType === "PROTECTED_WORK" ||
    lowerTitle.includes("[protected") ||
    lowerTitle.includes("protected work") ||
    lowerTitle.includes("casework") ||
    lowerTitle.includes("deep work")
  ) {
    return "protected_work";
  }

  // 8. Staff Training
  if (
    rawType === "STAFF_TRAINING" ||
    lowerTitle.includes("staff training") ||
    lowerTitle.includes("training") ||
    lowerTitle.includes("workshop")
  ) {
    return "staff_training";
  }

  // 9. Team / Internal Meeting
  if (
    rawType === "TEAM_MEETING" ||
    rawType === "INTERNAL_MEETING" ||
    lowerTitle.includes("team meeting") ||
    lowerTitle.includes("case conference") ||
    lowerTitle.includes("supervision") ||
    lowerTitle.includes("operations meeting")
  ) {
    return "team_meeting";
  }

  // 10. Lunch / Break
  if (
    rawType === "LUNCH_BREAK" ||
    lowerTitle.includes("[lunch") ||
    lowerTitle.includes("lunch / break") ||
    lowerTitle.includes("lunch break")
  ) {
    return "lunch_break";
  }

  // 11. Travel / Transition
  if (
    rawType === "TRAVEL_TRANSITION" ||
    lowerTitle.includes("[travel") ||
    lowerTitle.includes("travel / transition") ||
    lowerTitle.includes("transit")
  ) {
    return "travel_transition";
  }

  // 12. Buffer Time
  if (
    rawType === "BUFFER_TIME" ||
    lowerTitle.includes("[buffer") ||
    lowerTitle.includes("buffer time")
  ) {
    return "buffer_time";
  }

  // 13. Other unavailable
  if (
    lowerTitle.startsWith("[other unavailable") ||
    lowerTitle.startsWith("[unavailable") ||
    rawType.includes("UNAVAILABLE")
  ) {
    return "block_time";
  }

  if (lowerTitle.startsWith("[internal]")) {
    return "internal_event";
  }

  // Default Confirmed Client Meeting
  return "confirmed";
}

/**
 * Small Block pattern preview component
 */
export function PatternPreviewBlock({
  patternKey,
  size = "md",
  interactive = false,
  showDescription = false,
}: {
  patternKey: CalendarItemPatternKey;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  showDescription?: boolean;
}) {
  const p = CALENDAR_PATTERNS[patternKey] || CALENDAR_PATTERNS.confirmed;
  const Icon = p.icon;

  if (size === "sm") {
    return (
      <div
        style={{ background: p.inlineBackground }}
        className={`h-7 px-2 rounded-md ${p.borderClass} flex items-center justify-between gap-1.5 shadow-sm text-[10px] font-mono shrink-0 select-none ${
          interactive ? "hover:scale-[1.02] transition-transform" : ""
        }`}
        title={`${p.label} Pattern: ${p.patternName} (${p.patternSymbol})`}
      >
        <div className="flex items-center gap-1 min-w-0">
          <Icon className="w-3 h-3 shrink-0" style={{ color: p.accentColor }} />
          <span className="font-semibold text-[#FFF4D4] truncate text-[9px] uppercase tracking-wide">
            {p.shortLabel}
          </span>
        </div>
        <span
          className={`text-[8px] px-1 py-0.2 rounded border font-bold uppercase tracking-wider shrink-0 ${p.badgeClass}`}
        >
          {p.sampleBadge.split(" ")[0]}
        </span>
      </div>
    );
  }

  if (size === "lg") {
    return (
      <div
        style={{ background: p.inlineBackground }}
        className={`p-3 rounded-xl ${p.borderClass} shadow-md transition-all ${
          interactive ? "hover:scale-[1.01] hover:brightness-110" : ""
        }`}
      >
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <div
              className="p-1 rounded-md bg-[#020A17]/80 border border-[#3A2C18]"
              style={{ color: p.accentColor }}
            >
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="font-serif font-bold text-xs text-[#FFF4D4] flex items-center gap-1.5">
                <span>{p.label}</span>
                <span className="text-[10px] text-[#FFE394] font-mono font-bold">{p.patternSymbol}</span>
              </div>
              <div className="text-[10px] text-[#A69371] font-mono">{p.patternName}</div>
            </div>
          </div>
          <span
            className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${p.badgeClass}`}
          >
            {p.sampleBadge}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-[#3A2C18]/40">
          <span className="text-[#FFE394] font-medium truncate">{p.sampleTitle}</span>
          <span className="text-[11px] font-mono text-[#C6B697] shrink-0">{p.sampleTime}</span>
        </div>

        {showDescription && (
          <p className="text-[11px] text-[#C6B697] mt-1.5 leading-snug">{p.sub}</p>
        )}
      </div>
    );
  }

  // Medium (Default)
  return (
    <div
      style={{ background: p.inlineBackground }}
      className={`h-11 px-2.5 rounded-lg ${p.borderClass} flex items-center justify-between gap-2 shadow-sm text-xs select-none ${
        interactive ? "hover:brightness-110 transition-all" : ""
      }`}
      title={`${p.label}: ${p.patternName} (${p.patternSymbol})`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: p.accentColor }} />
        <div className="truncate">
          <div className="font-serif font-bold text-[#FFF4D4] text-[11px] leading-tight truncate flex items-center gap-1.5">
            <span>{p.sampleTitle}</span>
            <span className="text-[9px] text-[#FFE394] font-mono">{p.patternSymbol}</span>
          </div>
          <div className="text-[9px] text-[#A69371] font-mono">{p.patternName}</div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span
          className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${p.badgeClass}`}
        >
          {p.sampleBadge}
        </span>
      </div>
    </div>
  );
}

/**
 * Collapsible Availability Fabric Legend Bar for PG-007
 * Displays the major operational availability patterns with their distinct symbols and descriptions
 */
export function CalendarPatternLegendBar({
  onSelectPattern,
  collapsible = true,
}: {
  onSelectPattern?: (key: CalendarItemPatternKey) => void;
  collapsible?: boolean;
}) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const primaryKeys: CalendarItemPatternKey[] = [
    "confirmed",
    "proposed_hold",
    "office_closed",
    "blackout",
    "pto_vacation",
    "personal_day",
    "protected_work",
  ];

  const extendedKeys: CalendarItemPatternKey[] = [
    "holiday",
    "sick_out",
    "staff_training",
    "team_meeting",
    "travel_transition",
    "lunch_break",
    "buffer_time",
  ];

  return (
    <div className="rounded-[5px] border border-[#3A2C18] bg-[#05142B]/95 p-2.5 shadow-[0_6px_20px_rgba(0,0,0,0.85)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#C5A059] animate-pulse" />
          <span className="text-[11px] font-serif font-bold text-[#FFE394] uppercase tracking-wider">
            Operational Availability Fabric & Small Block Legend
          </span>
          <span className="text-[10px] text-[#A69371] font-mono hidden md:inline">
            — Distinct textures and borders identify every operational availability state
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-[#C6B697]">
            {isExpanded ? "14 Availability Patterns" : "7 Core Patterns"}
          </span>
          {collapsible && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#3A2C18] bg-[#020A17] text-[#FFE394] hover:border-[#C5A059] transition-all cursor-pointer"
            >
              {isExpanded ? "Collapse Key ▲" : "Expand All (14) ▼"}
            </button>
          )}
        </div>
      </div>

      {/* Primary Pattern Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {primaryKeys.map((key) => {
          const p = CALENDAR_PATTERNS[key];
          return (
            <div
              key={key}
              onClick={() => onSelectPattern?.(key)}
              className="group cursor-pointer"
            >
              <PatternPreviewBlock patternKey={key} size="sm" interactive />
              <div className="mt-1 flex items-center justify-between px-0.5">
                <span className="text-[10px] text-[#A69371] truncate group-hover:text-[#FFF4D4] transition-colors">
                  {p.label}
                </span>
                <span className="text-[9px] font-mono text-[#FFE394]/70">{p.patternSymbol.slice(0, 4)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Expanded Secondary Pattern Strip */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-[#3A2C18]/60 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 animate-fadeIn">
          {extendedKeys.map((key) => {
            const p = CALENDAR_PATTERNS[key];
            return (
              <div
                key={key}
                onClick={() => onSelectPattern?.(key)}
                className="group cursor-pointer"
              >
                <PatternPreviewBlock patternKey={key} size="sm" interactive />
                <div className="mt-1 flex items-center justify-between px-0.5">
                  <span className="text-[10px] text-[#A69371] truncate group-hover:text-[#FFF4D4] transition-colors">
                    {p.label}
                  </span>
                  <span className="text-[9px] font-mono text-[#FFE394]/70">{p.patternSymbol.slice(0, 4)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
