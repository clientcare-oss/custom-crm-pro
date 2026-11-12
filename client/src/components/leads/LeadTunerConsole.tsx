import React, { useEffect } from "react";
import {
  MoreHorizontal,
  Plus,
  Phone,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { WorkspaceStageTab } from "./LeadStageStrip";

export type TunerStageId = WorkspaceStageTab;

export interface TunerStageMeta {
  id: WorkspaceStageTab;
  label: string;
  cbChannel: string;
  rescueSubtext: string;
  knobAngle: number; // degrees for the rotary indicator
  needlePercent: number; // % across the glass scale
}

export const TUNER_STAGES: TunerStageMeta[] = [
  {
    id: "inquiry",
    label: "New Leads",
    cbChannel: "CH 09 • NEW LEADS",
    rescueSubtext: "Incoming family inquiries ready to schedule discovery",
    knobAngle: -54,
    needlePercent: 12.5,
  },
  {
    id: "discovery",
    label: "Discovery",
    cbChannel: "CH 16 • DISCOVERY",
    rescueSubtext: "Scheduled discovery calls & live family conversations",
    knobAngle: -18,
    needlePercent: 37.5,
  },
  {
    id: "decision",
    label: "Decision",
    cbChannel: "CH 22 • DECISION",
    rescueSubtext: "Service plan offers, agreements & initial payment readiness",
    knobAngle: 18,
    needlePercent: 62.5,
  },
  {
    id: "onboarding",
    label: "Onboarding",
    cbChannel: "CH 68 • ONBOARDING",
    rescueSubtext: "Completing setup & transitioning families into active services",
    knobAngle: 54,
    needlePercent: 87.5,
  },
];

interface LeadTunerConsoleProps {
  selectedStage: WorkspaceStageTab;
  onSelectStage: (stage: WorkspaceStageTab) => void;
  stageCounts: {
    inquiry: number;
    discovery: number;
    decision: number;
    onboarding: number;
  };
  currentStageLeads: any[];
  onManageForms: () => void;
  onNewInquiry: () => void;
  onAddTestLead?: () => void;
  isAddingTestLead?: boolean;
  onOpenLead?: (leadId: number, stage: WorkspaceStageTab) => void;
  isClientOpen?: boolean;
  openedClientName?: string;
  openedClientStudentName?: string;
  openedClientStatusLabel?: string;
  openedClientNextAction?: string;
  openedClientCurrentStage?: WorkspaceStageTab;
}

function getInitials(name?: string): string {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "FM";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
}

export function LeadTunerConsole({
  selectedStage,
  onSelectStage,
  stageCounts,
  onManageForms,
  onNewInquiry,
  onAddTestLead,
  isAddingTestLead = false,
  isClientOpen = false,
  openedClientName,
  openedClientStudentName,
  openedClientStatusLabel,
  openedClientNextAction,
  openedClientCurrentStage,
}: LeadTunerConsoleProps) {
  const activeStageIndex = Math.max(
    0,
    TUNER_STAGES.findIndex((s) => s.id === selectedStage)
  );
  const activeStageMeta = TUNER_STAGES[activeStageIndex] || TUNER_STAGES[0];
  const activeStageCount = stageCounts[selectedStage] ?? 0;

  const clientCurrentStageIndex = Math.max(
    0,
    TUNER_STAGES.findIndex(
      (s) => s.id === (openedClientCurrentStage || selectedStage)
    )
  );
  const clientFirstName =
    String(openedClientName || "Family")
      .trim()
      .split(/\s+/)[0] || "Family";
  const clientInitials = getInitials(openedClientName);

  const handleStepStage = (delta: number) => {
    const nextIdx =
      (activeStageIndex + delta + TUNER_STAGES.length) % TUNER_STAGES.length;
    onSelectStage(TUNER_STAGES[nextIdx].id);
  };

  // Support Left/Right keyboard navigation when not typing in an input/textarea/select
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        (e.target as HTMLElement | null)?.isContentEditable
      ) {
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleStepStage(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleStepStage(1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeStageIndex, selectedStage]);

  return (
    <div className="w-full space-y-2.5" data-testid="lead-tuner-console">
      {/* ─── 1. TOP HEADER BAR: WAYPOINT CRM ——— Lead Center | + New inquiry ─── */}
      <div className="flex items-center justify-between gap-3 px-2">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <span
            className="text-[11px] sm:text-xs font-serif uppercase tracking-[0.24em] text-[#D8C7A5] whitespace-nowrap"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            WAYPOINT CRM
          </span>
          <span
            aria-hidden="true"
            className="w-8 sm:w-16 h-[1px] bg-gradient-to-r from-[#C5A059]/40 via-[#DFBE77]/80 to-[#C5A059]/40 shrink-0"
          />
          <h1
            className="text-2xl sm:text-[32px] font-bold tracking-tight text-white leading-none truncate"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Lead Center
          </h1>
        </div>

        {/* Right Header Controls: + New inquiry (+ discreet 3-dot menu for Add Test Lead / Manage Forms) */}
        <div className="flex items-center gap-2 shrink-0">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                data-testid="lead-center-more-options-btn"
                aria-label="More Lead Center options"
                className="h-8 w-8 rounded-full bg-[#09152B]/80 hover:bg-[#12264A] border border-[#C5A059]/40 hover:border-[#FFE394]/70 text-[#D8C7A5] hover:text-[#FFE394] inline-flex items-center justify-center transition-all cursor-pointer"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-60 bg-[#07162B] border border-[#3A2C18] text-[#FFF4D4] shadow-2xl"
            >
              {onAddTestLead && (
                <>
                  <DropdownMenuItem
                    data-testid="add-test-lead-menu-item"
                    disabled={isAddingTestLead}
                    onClick={onAddTestLead}
                    className="cursor-pointer focus:bg-[#102B4E] focus:text-[#FFE394] gap-2 text-xs py-2 font-semibold text-[#FFE394]"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-[#DFBE77]" />
                    <span>
                      {isAddingTestLead ? "Adding Test Lead..." : "Add Test Lead"}
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-[#3A2C18]/60" />
                </>
              )}
              <DropdownMenuItem
                onClick={() => onSelectStage("discovery")}
                className="cursor-pointer focus:bg-[#102B4E] focus:text-[#FFE394] gap-2 text-xs py-2"
              >
                <Phone className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>Tune to Discovery Stage</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onManageForms}
                className="cursor-pointer focus:bg-[#102B4E] focus:text-[#FFE394] gap-2 text-xs py-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>Lead Forms & Intake Routing</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            type="button"
            onClick={onNewInquiry}
            data-testid="new-service-inquiry-btn"
            className="h-9 px-5 rounded-full bg-gradient-to-b from-[#EAD08A] via-[#C89D4C] to-[#987026] hover:from-[#F3DC9B] hover:via-[#D5AA58] hover:to-[#A87D2E] text-[#07162B] font-serif font-bold text-xs sm:text-sm inline-flex items-center gap-1.5 border border-[#FFE5A3]/85 shadow-[0_4px_14px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.5)] transition-all cursor-pointer"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New inquiry</span>
          </button>
        </div>
      </div>

      {/* ─── 2. PHOTOREALISTIC BRASS & NAVY CB RADIO CHASSIS WITH LIVE INTERACTIVE OVERLAYS ─── */}
      <div className="relative w-full aspect-[1004/318] select-none">
        {/* Base High-Res Radio Hardware Artwork (Switches cleanly between Browse Mode & Single-Client Mode) */}
        <img
          src={
            isClientOpen
              ? "/images/lead-center-radio-client-clean.png?v=2"
              : "/images/lead-center-radio-chassis-clean.png?v=5"
          }
          alt="Waypoint Lead Center Radio Console"
          draggable={false}
          className="w-full h-full object-contain pointer-events-none block"
        />

        {/* ── DYNAMIC BRASS PLAQUES FOR SINGLE-CLIENT MODE ── */}
        {isClientOpen && (
          <>
            {/* Top-Center Brass Plaque: "{FIRST_NAME}'S JOURNEY" */}
            <div
              className="absolute flex items-center justify-center pointer-events-none px-2"
              style={{
                left: "46.6%",
                top: "9.1%",
                width: "22.2%",
                height: "7.8%",
              }}
            >
              <span
                className="font-serif font-bold uppercase tracking-[0.22em] text-[#1C1204] drop-shadow-[0_1px_0_rgba(255,236,185,0.5)] truncate"
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: "clamp(7px, 0.95vw, 12px)",
                }}
              >
                {clientFirstName.toUpperCase()}&apos;S JOURNEY
              </span>
            </div>

            {/* Bottom-Left Brass Plaque: "FAMILY WORKSPACE" */}
            <div
              className="absolute flex items-center justify-center pointer-events-none px-1"
              style={{
                left: "13.3%",
                top: "83.6%",
                width: "13.5%",
                height: "6.0%",
              }}
            >
              <span
                className="font-serif font-bold uppercase tracking-[0.15em] text-[#1C1204] drop-shadow-[0_1px_0_rgba(255,236,185,0.5)] whitespace-nowrap"
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: "clamp(5.5px, 0.68vw, 8.5px)",
                }}
              >
                FAMILY WORKSPACE
              </span>
            </div>
          </>
        )}

        {/* ── OVERLAY A: LEFT CRT SCREEN LIVE READOUT ── */}
        {isClientOpen ? (
          /* SINGLE-CLIENT CRT VIEW ("NOW VIEWING" + Initials Circle + Parent + Student + Green Status Dot) */
          <div
            className="absolute flex flex-col items-center justify-between text-center pointer-events-none px-2"
            style={{
              left: "6.8%",
              top: "15.2%",
              width: "24.5%",
              height: "64.2%",
            }}
          >
            {/* Top Header: —— NOW VIEWING —— */}
            <div className="w-full flex items-center justify-center gap-1.5">
              <span className="w-5 sm:w-7 h-[1px] bg-gradient-to-r from-transparent to-[#CBD5E1]/70" />
              <span
                className="font-serif uppercase tracking-[0.18em] text-[#E2E8F0] whitespace-nowrap"
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: "clamp(6.5px, 0.78vw, 10px)",
                }}
              >
                NOW VIEWING
              </span>
              <span className="w-5 sm:w-7 h-[1px] bg-gradient-to-l from-transparent to-[#CBD5E1]/70" />
            </div>

            {/* Circular Initials Ring (EV) */}
            <div
              className="rounded-full border-[1.5px] border-[#E2E8F0]/85 bg-[#0A1936]/80 shadow-[0_0_10px_rgba(148,163,184,0.35),inset_0_0_6px_rgba(255,255,255,0.18)] flex items-center justify-center font-serif font-bold text-white shrink-0"
              style={{
                width: "clamp(20px, 2.7vw, 35px)",
                height: "clamp(20px, 2.7vw, 35px)",
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "clamp(8px, 1.05vw, 13.5px)",
              }}
            >
              {clientInitials}
            </div>

            {/* Parent Name + PARENT Label */}
            <div className="flex flex-col items-center leading-none">
              <div
                data-testid="radio-channel-display"
                className="font-serif font-bold text-white tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] line-clamp-2"
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: "clamp(11px, 1.8vw, 22px)",
                  lineHeight: 1.04,
                }}
              >
                {openedClientName || "Family Inquiry"}
              </div>
              <span
                className="mt-0.5 font-serif uppercase tracking-[0.22em] text-[#CBD5E1]/90"
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: "clamp(5.5px, 0.65vw, 8.5px)",
                }}
              >
                PARENT
              </span>
            </div>

            {/* Horizontal Divider */}
            <div className="w-[78%] h-[1px] bg-gradient-to-r from-transparent via-[#93C5FD]/45 to-transparent" />

            {/* Student Name + STUDENT Label */}
            <div className="flex flex-col items-center leading-none">
              <div
                className="font-serif italic text-[#F1F5F9] drop-shadow-[0_1px_5px_rgba(0,0,0,0.85)] truncate max-w-full"
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: "clamp(9px, 1.25vw, 15.5px)",
                }}
              >
                {openedClientStudentName || "Student"}
              </div>
              <span
                className="mt-0.5 font-serif uppercase tracking-[0.22em] text-[#CBD5E1]/85"
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: "clamp(5.5px, 0.62vw, 8px)",
                }}
              >
                STUDENT
              </span>
            </div>

            {/* Horizontal Divider */}
            <div className="w-[70%] h-[1px] bg-gradient-to-r from-transparent via-[#93C5FD]/30 to-transparent" />

            {/* Green Glowing Status Dot + Sub-Status Label */}
            <div className="flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#4ADE80] shadow-[0_0_8px_#4ADE80,0_0_12px_#22C55E] shrink-0" />
              <span
                className="font-serif italic text-[#F1F5F9] leading-none drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)] whitespace-nowrap"
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: "clamp(8px, 1.05vw, 13px)",
                }}
              >
                {openedClientStatusLabel || "Intake received"}
              </span>
            </div>
          </div>
        ) : (
          /* BROWSE ALL FAMILIES CRT VIEW */
          <div
            className="absolute flex flex-col items-center justify-between text-center pointer-events-none px-1"
            style={{
              left: "6.8%",
              top: "38.2%",
              width: "24.5%",
              height: "39.0%",
            }}
          >
            {/* Active Stage Title */}
            <div
              data-testid="radio-channel-display"
              className="font-serif font-bold text-white leading-none tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] whitespace-nowrap"
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "clamp(13px, 2.55vw, 31px)",
              }}
            >
              {activeStageMeta.label}
            </div>

            {/* Top Horizontal Divider */}
            <div className="w-[82%] h-[1px] bg-gradient-to-r from-transparent via-[#93C5FD]/55 to-transparent" />

            {/* Live Family Count */}
            <div
              className="font-serif italic text-[#F1F5F9] leading-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] whitespace-nowrap"
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "clamp(10px, 1.8vw, 22px)",
              }}
            >
              {activeStageCount}{" "}
              {activeStageCount === 1 ? "family" : "families"}
            </div>

            {/* Bottom Horizontal Divider */}
            <div className="w-[70%] h-[1px] bg-gradient-to-r from-transparent via-[#93C5FD]/30 to-transparent" />

            {/* Subtitle */}
            <div
              className="font-serif italic text-[#CBD5E1] leading-none drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)] whitespace-nowrap"
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "clamp(8px, 1.15vw, 14px)",
              }}
            >
              Open a family below
            </div>
          </div>
        )}

        {/* ── OVERLAY B: CENTER 4-STAGE TUNER GLASS WINDOW (`x: 35.7%..74.2%, y: 21.0%..51.8%`) ── */}
        <div
          className="absolute rounded-[11px] overflow-hidden flex flex-col justify-between"
          style={{
            left: "35.7%",
            top: "21.0%",
            width: "38.5%",
            height: "30.8%",
          }}
        >
          {/* Warm Amber/Gold Spotlight Glow Behind Selected Stage */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 w-[34%] -translate-x-1/2 transition-all duration-300 motion-reduce:transition-none ease-out"
            style={{
              left: `${activeStageMeta.needlePercent}%`,
              background:
                "radial-gradient(ellipse at 50% 68%, rgba(255, 195, 85, 0.42) 0%, rgba(212, 148, 48, 0.16) 52%, transparent 80%)",
            }}
          />

          {/* 4 Clickable Stage Columns */}
          <div
            className="relative z-10 grid grid-cols-4 divide-x divide-[#C5A059]/30 h-[74%] items-start pt-[2.5%]"
            role="tablist"
            aria-label="Lead Center Stages"
          >
            {TUNER_STAGES.map((stage, stageIdx) => {
              const count = stageCounts[stage.id] ?? 0;
              const isSelected = stage.id === selectedStage;
              const clientStageState =
                stageIdx < clientCurrentStageIndex
                  ? "COMPLETE"
                  : stageIdx === clientCurrentStageIndex
                  ? "CURRENT"
                  : "UPCOMING";

              return (
                <button
                  key={stage.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  data-testid={`radio-stage-${stage.id}`}
                  onClick={() => onSelectStage(stage.id)}
                  className="group h-full min-w-0 px-1 flex flex-col items-center justify-start gap-1 sm:gap-1.5 transition-colors cursor-pointer focus:outline-hidden"
                >
                  <span
                    className={cn(
                      "font-serif leading-none tracking-tight transition-colors whitespace-nowrap",
                      isSelected
                        ? "font-bold text-[#FFFDF5] drop-shadow-[0_0_10px_rgba(255,215,120,0.85)]"
                        : "font-medium text-[#D8CFC0] group-hover:text-white"
                    )}
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontSize: "clamp(9px, 1.32vw, 16.5px)",
                    }}
                  >
                    {stage.label}
                  </span>

                  {isClientOpen ? (
                    /* Single-Client Mode: CURRENT / UPCOMING / COMPLETE */
                    <span
                      data-testid={`radio-stage-count-${stage.id}`}
                      className={cn(
                        "font-serif italic uppercase tracking-[0.08em] leading-none transition-colors whitespace-nowrap mt-0.5",
                        clientStageState === "CURRENT"
                          ? "text-[#FFE394] font-semibold drop-shadow-[0_0_8px_rgba(255,215,120,0.75)]"
                          : clientStageState === "COMPLETE"
                          ? "text-[#D8C7A5]"
                          : "text-[#94A3B8]/90 group-hover:text-[#CBD5E1]"
                      )}
                      style={{
                        fontFamily: "'Playfair Display', Georgia, serif",
                        fontSize: "clamp(6.5px, 0.78vw, 10px)",
                      }}
                    >
                      {clientStageState}
                    </span>
                  ) : (
                    /* Browse Mode: Stage Count Bubble */
                    <span
                      data-testid={`radio-stage-count-${stage.id}`}
                      className={cn(
                        "inline-flex items-center justify-center rounded-full min-w-[22px] sm:min-w-[28px] px-2 py-[1px] sm:py-[2px] font-serif font-bold leading-none transition-all whitespace-nowrap",
                        isSelected
                          ? "bg-gradient-to-b from-[#FFE59E] via-[#D6A648] to-[#9E711E] text-[#07162B] border border-[#FFF4D4] shadow-[0_0_10px_rgba(255,215,120,0.7),0_2px_4px_rgba(0,0,0,0.8)]"
                          : "bg-[#061124]/95 text-[#E5D7B8] border border-[#C5A059]/55 shadow-[inset_0_1px_2px_rgba(0,0,0,0.85)] group-hover:border-[#FFE394]/80 group-hover:text-[#FFF4D4]"
                      )}
                      style={{
                        fontFamily: "'Playfair Display', Georgia, serif",
                        fontSize: "clamp(8px, 1.05vw, 13px)",
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Horizontal Gold Frequency Scale + Tick Marks + Sliding Glowing Needle (Pinned Near Bottom Edge) */}
          <div className="relative z-10 h-[24%] flex items-end pb-[4.5%] px-[3%]">
            <div className="relative h-[1.5px] w-full bg-gradient-to-r from-[#6E5528] via-[#E5C175] to-[#6E5528]">
              {/* Tick Marks Along Bottom Scale */}
              {Array.from({ length: 29 }).map((_, idx) => {
                const pct = 3 + (idx * 94) / 28;
                const isMajor = idx % 7 === 0;
                const isMedium = idx % 7 === 3 || idx % 7 === 4;
                return (
                  <span
                    key={idx}
                    style={{ left: `${pct}%` }}
                    className={cn(
                      "absolute -translate-x-1/2 w-[1px] sm:w-[1.5px]",
                      isMajor
                        ? "h-1.5 sm:h-2.5 -top-1.5 sm:-top-2.5 bg-[#FFE394]"
                        : isMedium
                        ? "h-1 sm:h-1.5 -top-1 sm:-top-1.5 bg-[#C5A059]/80"
                        : "h-0.5 sm:h-1 -top-0.5 sm:-top-1 bg-[#C5A059]/50"
                    )}
                  />
                );
              })}

              {/* Glowing Vertical Gold Needle & Luminous Orb */}
              <div
                data-testid="radio-tuning-needle"
                className="absolute -top-2.5 sm:-top-3.5 -translate-x-1/2 flex flex-col items-center transition-all duration-300 motion-reduce:transition-none ease-out"
                style={{ left: `${activeStageMeta.needlePercent}%` }}
              >
                {!isClientOpen && (
                  <div className="w-[2px] sm:w-[2.5px] h-2.5 sm:h-3.5 rounded-full bg-gradient-to-b from-[#FFFDF5] via-[#FFE394] to-[#E5A93C] shadow-[0_0_8px_#FFE394,0_0_14px_#F59E0B]" />
                )}
                <div
                  className={cn(
                    "w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full bg-gradient-to-b from-[#FFFDF5] via-[#FFE394] to-[#B87D1E] border border-[#FFF6D6] shadow-[0_0_12px_#FFE394,0_0_20px_#F59E0B]",
                    !isClientOpen ? "-mt-0.5" : "mt-1.5 sm:mt-2"
                  )}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── OVERLAY C: STATUS PILL (`x: 36.8%..74.2%, y: 56.8%..65.4%`) ── */}
        <div
          className="absolute flex items-center justify-center gap-2 pointer-events-none"
          style={{
            left: "36.8%",
            top: "56.8%",
            width: "37.4%",
            height: "8.6%",
          }}
        >
          <span
            className="font-serif uppercase tracking-[0.22em] text-[#D8C7A5]"
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "clamp(7px, 0.9vw, 11px)",
            }}
          >
            {isClientOpen ? "NEXT:" : "VIEWING:"}
          </span>
          <span
            className="font-serif italic font-semibold text-[#FFF4D4]"
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "clamp(9px, 1.25vw, 15.5px)",
            }}
          >
            {isClientOpen
              ? openedClientNextAction || "Schedule discovery"
              : activeStageMeta.label}
          </span>
        </div>

        {/* ── OVERLAY D: INTERACTIVE "VIEW STAGE" BUTTONS & ROTARY KNOB ── */}
        {/* Left Step Button `◀` */}
        <button
          type="button"
          onClick={() => handleStepStage(-1)}
          aria-label="Previous stage"
          data-testid="radio-prev-stage-btn"
          title="Previous Stage (Arrow Left)"
          className="absolute rounded-full hover:ring-2 hover:ring-[#FFE394]/80 focus:outline-hidden cursor-pointer transition-all"
          style={{
            left: "75.8%",
            top: "33.5%",
            width: "2.9%",
            height: "9.2%",
          }}
        />

        {/* Central 3D Rotary Knob (Whole Knob Physically Rotates Inside Dark Socket) */}
        <button
          type="button"
          onClick={() => handleStepStage(1)}
          data-testid="radio-rotary-dial"
          aria-label={`Current stage: ${activeStageMeta.label}. Click to tune next stage`}
          title={`Current stage: ${activeStageMeta.label} (Click to turn dial)`}
          className="absolute rounded-full hover:brightness-105 focus:outline-hidden cursor-pointer transition-transform duration-300 motion-reduce:transition-none ease-out flex items-center justify-center"
          style={{
            left: "78.64%",
            top: "22.01%",
            width: "9.16%",
            height: "28.93%",
            transform: `rotate(${activeStageMeta.knobAngle}deg)`,
          }}
        >
          <img
            src="/images/lead-center-radio-knob.png?v=5"
            alt=""
            draggable={false}
            className="w-full h-full object-contain pointer-events-none block rounded-full"
          />
        </button>

        {/* Right Step Button `▶` */}
        <button
          type="button"
          onClick={() => handleStepStage(1)}
          aria-label="Next stage"
          data-testid="radio-next-stage-btn"
          title="Next Stage (Arrow Right)"
          className="absolute rounded-full hover:ring-2 hover:ring-[#FFE394]/80 focus:outline-hidden cursor-pointer transition-all"
          style={{
            left: "87.5%",
            top: "33.5%",
            width: "2.9%",
            height: "9.2%",
          }}
        />
      </div>
    </div>
  );
}
