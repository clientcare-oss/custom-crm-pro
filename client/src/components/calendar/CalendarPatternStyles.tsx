import React from "react";
import { CheckCircle2, Clock, Ban, Building2, Users } from "lucide-react";

export type CalendarItemPatternKey =
  | "confirmed"
  | "proposed_hold"
  | "block_time"
  | "office_closure"
  | "internal_event";

export interface PatternDefinition {
  key: CalendarItemPatternKey;
  label: string;
  shortLabel: string;
  sub: string;
  patternName: string;
  accentColor: string;
  borderColor: string;
  borderClass: string;
  badgeClass: string;
  inlineBackground: string;
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
    patternName: "Solid Obsidian Navy + 24k Gold Bevel",
    accentColor: "#C5A059",
    borderColor: "#C5A059",
    borderClass: "border-solid border-[#3A2C18] border-l-4 border-l-[#C5A059]",
    badgeClass: "bg-[#C5A059]/20 text-[#FFE394] border-[#C5A059]/50",
    inlineBackground:
      "linear-gradient(135deg, rgba(5,20,43,0.98) 0%, rgba(2,10,23,0.95) 100%)",
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
    patternName: "Diagonal Amber Tentative Hazard Stripes",
    accentColor: "#F59E0B",
    borderColor: "#F59E0B",
    borderClass: "border-dashed border-amber-500/70 border-l-4 border-l-amber-400",
    badgeClass: "bg-amber-500/25 text-amber-300 border-amber-500/50",
    inlineBackground:
      "repeating-linear-gradient(45deg, rgba(245, 158, 11, 0.16) 0px, rgba(245, 158, 11, 0.16) 8px, rgba(16, 43, 78, 0.5) 8px, rgba(16, 43, 78, 0.5) 16px)",
    sampleBadge: "1 OF 3 HOLDS",
    sampleTitle: "Hold: Eligibility Review",
    sampleTime: "1:00 PM",
    icon: Clock,
  },
  block_time: {
    key: "block_time",
    label: "Block Time",
    shortLabel: "Blocked Time",
    sub: "PTO, personal, sick, blackout, protected work, lunch",
    patternName: "Slate Diagonal Hatch Pattern",
    accentColor: "#94A3B8",
    borderColor: "#94A3B8",
    borderClass: "border-solid border-slate-700/60 border-l-4 border-l-slate-400",
    badgeClass: "bg-slate-800/80 text-slate-300 border-slate-600/60",
    inlineBackground:
      "repeating-linear-gradient(135deg, rgba(148, 163, 184, 0.18) 0px, rgba(148, 163, 184, 0.18) 6px, rgba(15, 23, 42, 0.75) 6px, rgba(15, 23, 42, 0.75) 12px)",
    sampleBadge: "PTO / UNAVAILABLE",
    sampleTitle: "Protected Work / PTO",
    sampleTime: "All Day",
    icon: Ban,
  },
  office_closure: {
    key: "office_closure",
    label: "Office Closure / Holiday",
    shortLabel: "Office Closed",
    sub: "Organization-wide closure or holiday",
    patternName: "Crimson Protective Crosshatch",
    accentColor: "#F43F5E",
    borderColor: "#F43F5E",
    borderClass: "border-solid border-rose-900/60 border-l-4 border-l-rose-500",
    badgeClass: "bg-rose-950/80 text-rose-300 border-rose-700/60",
    inlineBackground:
      "repeating-linear-gradient(45deg, rgba(244, 63, 94, 0.22) 0px, rgba(244, 63, 94, 0.22) 8px, rgba(20, 5, 10, 0.8) 8px, rgba(20, 5, 10, 0.8) 16px)",
    sampleBadge: "OFFICE CLOSED",
    sampleTitle: "Holiday / Closure",
    sampleTime: "Closed",
    icon: Building2,
  },
  internal_event: {
    key: "internal_event",
    label: "Internal Event",
    shortLabel: "Internal Event",
    sub: "Team meeting, staff training, case conference",
    patternName: "Cobalt Directional Weave Pattern",
    accentColor: "#60A5FA",
    borderColor: "#60A5FA",
    borderClass: "border-solid border-blue-900/60 border-l-4 border-l-blue-400",
    badgeClass: "bg-blue-950/80 text-blue-300 border-blue-700/60",
    inlineBackground:
      "repeating-linear-gradient(90deg, rgba(96, 165, 250, 0.18) 0px, rgba(96, 165, 250, 0.18) 8px, rgba(16, 43, 78, 0.6) 8px, rgba(16, 43, 78, 0.6) 16px)",
    sampleBadge: "INTERNAL",
    sampleTitle: "Team Meeting & Training",
    sampleTime: "2:00 PM",
    icon: Users,
  },
};

/**
 * Detect the pattern key for any calendar appointment or hold
 */
export function detectItemPatternKey(item: {
  isHold?: boolean;
  meetingType?: string | null;
  title?: string | null;
  status?: string | null;
}): CalendarItemPatternKey {
  if (item.isHold) return "proposed_hold";

  const lowerTitle = (item.title || "").toLowerCase();
  const lowerType = (item.meetingType || "").toLowerCase();

  // Check Office Closure
  if (
    lowerTitle.includes("[office closed]") ||
    lowerTitle.includes("office closed") ||
    lowerTitle.includes("holiday") ||
    lowerTitle.includes("closure") ||
    lowerType.includes("closure") ||
    lowerType.includes("holiday")
  ) {
    return "office_closure";
  }

  // Check Block Time
  if (
    lowerTitle.startsWith("[pto") ||
    lowerTitle.startsWith("[vacation") ||
    lowerTitle.startsWith("[sick") ||
    lowerTitle.startsWith("[personal") ||
    lowerTitle.startsWith("[blackout") ||
    lowerTitle.startsWith("[protected") ||
    lowerTitle.startsWith("[lunch") ||
    lowerTitle.startsWith("[travel") ||
    lowerTitle.startsWith("[buffer") ||
    lowerTitle.startsWith("[other unavailable") ||
    lowerType.includes("pto") ||
    lowerType.includes("vacation") ||
    lowerType.includes("sick") ||
    lowerType.includes("blackout") ||
    lowerType.includes("unavailable")
  ) {
    return "block_time";
  }

  // Check Internal Event
  if (
    lowerTitle.startsWith("[internal]") ||
    lowerTitle.includes("team meeting") ||
    lowerTitle.includes("staff training") ||
    lowerTitle.includes("case conference") ||
    lowerTitle.includes("supervision") ||
    lowerTitle.includes("operations meeting") ||
    lowerType.includes("internal") ||
    lowerType.includes("staff training") ||
    lowerType.includes("team meeting")
  ) {
    return "internal_event";
  }

  // Default to Confirmed Appointment
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
  const p = CALENDAR_PATTERNS[patternKey];
  const Icon = p.icon;

  if (size === "sm") {
    return (
      <div
        style={{ background: p.inlineBackground }}
        className={`h-7 px-2 rounded-md ${p.borderClass} flex items-center justify-between gap-1.5 shadow-sm text-[10px] font-mono shrink-0 select-none ${
          interactive ? "hover:scale-[1.02] transition-transform" : ""
        }`}
        title={`${p.label} Pattern: ${p.patternName}`}
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
              <div className="font-serif font-bold text-xs text-[#FFF4D4]">{p.label}</div>
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
      title={`${p.label}: ${p.patternName}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: p.accentColor }} />
        <div className="truncate">
          <div className="font-serif font-bold text-[#FFF4D4] text-[11px] leading-tight truncate">
            {p.sampleTitle}
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
 * Calendar Pattern Legend Bar for PG-007
 * Displays the 5 distinct patterns in compact small blocks
 */
export function CalendarPatternLegendBar({
  onSelectPattern,
}: {
  onSelectPattern?: (key: CalendarItemPatternKey) => void;
}) {
  const keys: CalendarItemPatternKey[] = [
    "confirmed",
    "proposed_hold",
    "block_time",
    "office_closure",
    "internal_event",
  ];

  return (
    <div className="rounded-xl border border-[#3A2C18] bg-[#05142B]/95 p-2 shadow-[0_4px_16px_rgba(0,0,0,0.85)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#C5A059] animate-pulse" />
          <span className="text-[11px] font-serif font-bold text-[#FFE394] uppercase tracking-wider">
            Calendar Visual Patterns & Small Block Key
          </span>
          <span className="text-[10px] text-[#A69371] font-mono hidden md:inline">
            — Distinct textures and borders identify every schedule item
          </span>
        </div>
        <div className="text-[10px] font-mono text-[#C6B697]">5 Defined Patterns</div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {keys.map((key) => {
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
