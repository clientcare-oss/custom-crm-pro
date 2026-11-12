import React, { useEffect } from "react";
import {
  FileText,
  MoreHorizontal,
  Plus,
  ChevronLeft,
  ChevronRight,
  Phone,
  Radio,
  Mic,
  LifeBuoy,
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
    needlePercent: 13.5,
  },
  {
    id: "discovery",
    label: "Discovery",
    cbChannel: "CH 16 • DISCOVERY",
    rescueSubtext: "Scheduled discovery calls & live family conversations",
    knobAngle: -18,
    needlePercent: 38.5,
  },
  {
    id: "decision",
    label: "Decision",
    cbChannel: "CH 22 • DECISION",
    rescueSubtext: "Service plan offers, agreements & initial payment readiness",
    knobAngle: 18,
    needlePercent: 63.5,
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
}

export function LeadTunerConsole({
  selectedStage,
  onSelectStage,
  stageCounts,
  currentStageLeads,
  onManageForms,
  onNewInquiry,
  onAddTestLead,
  isAddingTestLead = false,
  onOpenLead,
  isClientOpen = false,
  openedClientName,
}: LeadTunerConsoleProps) {
  const activeStageIndex = Math.max(
    0,
    TUNER_STAGES.findIndex((s) => s.id === selectedStage)
  );
  const activeStageMeta = TUNER_STAGES[activeStageIndex] || TUNER_STAGES[0];
  const activeStageCount = stageCounts[selectedStage] ?? 0;

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

  const featuredLead = currentStageLeads[0] || null;

  return (
    <div className="w-full space-y-3.5" data-testid="lead-tuner-console">
      {/* ─── 1. TOP HEADER BAR ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5 flex-nowrap overflow-hidden">
            <h1
              className="text-2xl sm:text-[32px] font-bold tracking-tight text-[#FFF4D4] leading-none shrink-0"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Lead Center
            </h1>
            <span className="inline-flex items-center justify-center gap-2 min-w-[215px] px-2.5 py-0.5 rounded-full bg-[#091D34] border border-[#C5A059]/55 text-[10.5px] font-mono font-bold uppercase tracking-wider text-[#FFE394] shadow-[0_2px_10px_rgba(0,0,0,0.6)] shrink-0 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse motion-reduce:animate-none shadow-[0_0_8px_#34D399] shrink-0" />
              <Radio className="w-3.5 h-3.5 text-[#DFBE77] shrink-0" />
              <span>{activeStageMeta.cbChannel} • LIVE</span>
            </span>
          </div>
          <p
            className="text-xs sm:text-sm text-[#C8B99B] mt-1 truncate"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            New Leads → Discovery → Decision → Onboarding — tune the radio to view each stage or progress a family forward.
          </p>
        </div>

        {/* Right Header Controls: Manage forms | ••• | + New Service Inquiry */}
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <button
            type="button"
            onClick={onManageForms}
            className="h-9 px-3.5 rounded-lg bg-[#0B1C36]/90 hover:bg-[#12294D] border border-[#2B4368] hover:border-[#C5A059]/60 text-[#E2EDF8] hover:text-[#FFF4D4] text-xs font-medium inline-flex items-center gap-2 shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-[#B8CCE4]" />
            <span>Manage forms</span>
          </button>

          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                data-testid="lead-center-more-options-btn"
                aria-label="More Lead Center options"
                className="h-9 w-9 rounded-lg bg-[#0B1C36]/90 hover:bg-[#12294D] border border-[#2B4368] hover:border-[#C5A059]/60 text-[#E2EDF8] hover:text-[#FFE394] inline-flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all cursor-pointer"
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
            className="h-9 px-4 rounded-lg bg-gradient-to-b from-[#EAD08A] via-[#CEA452] to-[#9E762A] hover:from-[#F2DC9C] hover:via-[#D8B05E] hover:to-[#AD8333] text-[#07162B] font-bold text-xs sm:text-sm inline-flex items-center gap-1.5 border border-[#FFE5A3]/80 shadow-[0_4px_14px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.45)] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Service Inquiry</span>
          </button>
        </div>
      </div>

      {/* ─── 2. BESPOKE BRASS & NAVY RADIO TUNER STAGE CONSOLE ─── */}
      <div
        className="relative rounded-[20px] p-[2.5px] shadow-[0_14px_38px_rgba(0,0,0,0.9),0_0_0_1px_rgba(0,0,0,0.8)]"
        style={{
          background:
            "linear-gradient(180deg, #E5C67E 0%, #9F7833 25%, #5A4016 55%, #B88E42 85%, #6A4C1B 100%)",
        }}
      >
        {/* Inner Navy Leather Instrument Chassis */}
        <div
          className="relative rounded-[18px] px-3.5 sm:px-5 py-3 sm:py-3.5 border border-[#FFE394]/30 overflow-hidden"
          style={{
            backgroundColor: "#040D22",
            backgroundImage: `
              radial-gradient(ellipse at 30% 50%, rgba(197, 160, 89, 0.08) 0%, transparent 65%),
              repeating-linear-gradient(0deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 3px),
              repeating-linear-gradient(90deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 3px)
            `,
            boxShadow:
              "inset 0 3px 12px rgba(0,0,0,0.85), inset 0 -2px 8px rgba(0,0,0,0.8)",
          }}
        >
          {/* 4 Corner Brass Rivets */}
          <span className="absolute top-2 left-2 w-2 h-2 rounded-full bg-gradient-to-br from-[#FFE5A3] via-[#B88B3A] to-[#4A3310] border border-[#241705] shadow-[0_1px_2px_rgba(0,0,0,0.9)]" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-gradient-to-br from-[#FFE5A3] via-[#B88B3A] to-[#4A3310] border border-[#241705] shadow-[0_1px_2px_rgba(0,0,0,0.9)]" />
          <span className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-gradient-to-br from-[#FFE5A3] via-[#B88B3A] to-[#4A3310] border border-[#241705] shadow-[0_1px_2px_rgba(0,0,0,0.9)]" />
          <span className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-gradient-to-br from-[#FFE5A3] via-[#B88B3A] to-[#4A3310] border border-[#241705] shadow-[0_1px_2px_rgba(0,0,0,0.9)]" />

          {/* ── TOP CB / MARINE RESCUE TRANSCEIVER MONITOR BAR (LOCKED SINGLE-LINE DIMENSIONS) ── */}
          <div className="mb-2.5 h-9 px-3 rounded-xl bg-[#020817]/95 border border-[#3A2C18] flex items-center justify-between gap-2.5 flex-nowrap overflow-hidden shadow-[inset_0_2px_6px_rgba(0,0,0,0.85)]">
            {/* Left: CB Transceiver Callsign + S-Meter Signal Bars */}
            <div className="flex items-center gap-2 shrink-0 md:w-[325px]">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#0A192F] border border-[#C5A059]/45 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping motion-reduce:animate-none" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#FFE394] whitespace-nowrap">
                  STAGE TUNER
                </span>
              </div>

              {/* 5-Bar CB Signal Strength Meter */}
              <div
                className="hidden sm:flex items-end gap-0.5 h-3 px-1 shrink-0"
                title="Channel Signal Active"
              >
                <span className="w-1 h-1.5 rounded-xs bg-emerald-400" />
                <span className="w-1 h-2 rounded-xs bg-emerald-400" />
                <span className="w-1 h-2.5 rounded-xs bg-emerald-400" />
                <span className="w-1 h-3 rounded-xs bg-[#FFE394]" />
                <span className="w-1 h-3.5 rounded-xs bg-[#DFBE77] shadow-[0_0_6px_#FFE394]" />
              </div>

              <span
                className="text-[10.5px] font-mono uppercase tracking-wider text-[#C6B697] hidden md:inline truncate whitespace-nowrap"
                data-testid="radio-channel-display"
              >
                {activeStageMeta.cbChannel} • {activeStageCount}{" "}
                {activeStageCount === 1 ? "LEAD" : "LEADS"}
              </span>
            </div>

            {/* Center: Current Stage Operational Summary */}
            <div className="flex items-center gap-2 min-w-0 flex-1 justify-center overflow-hidden">
              <LifeBuoy className="w-3.5 h-3.5 text-[#FFE394] shrink-0" />
              <p className="text-xs text-[#FFF4D4] truncate whitespace-nowrap">
                {featuredLead ? (
                  <>
                    <strong className="text-[#FFE394] font-semibold">
                      {activeStageMeta.label}:
                    </strong>{" "}
                    {featuredLead.parentName}
                    {featuredLead.studentNames?.length > 0
                      ? ` (${featuredLead.studentNames.join(", ")})`
                      : ""}{" "}
                    —{" "}
                    <span className="text-[#D8C7A5]">
                      {featuredLead.statusSummary} · Next: {featuredLead.nextActionLabel}
                    </span>
                  </>
                ) : (
                  <span className="text-[#D8C7A5]">
                    {activeStageMeta.label} — {activeStageMeta.rescueSubtext}
                  </span>
                )}
              </p>
            </div>

            {/* Right: Fixed-Width Slot for Top Lead Action so Bar Never Resizes */}
            <div className="hidden sm:flex items-center justify-end w-[170px] shrink-0">
              {featuredLead && onOpenLead ? (
                <button
                  type="button"
                  onClick={() => onOpenLead(featuredLead.id, selectedStage)}
                  className="h-6 max-w-[170px] px-2.5 rounded-md bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-[11px] inline-flex items-center gap-1.5 border border-[#FFE394]/70 shadow-[0_2px_8px_rgba(0,0,0,0.75)] hover:brightness-105 transition-colors cursor-pointer overflow-hidden"
                >
                  <Mic className="w-3 h-3 stroke-[2.4] shrink-0" />
                  <span className="truncate whitespace-nowrap">
                    Open {featuredLead.parentName}
                  </span>
                </button>
              ) : (
                <span className="text-[10.5px] font-mono uppercase tracking-wider text-[#6E84A3] whitespace-nowrap">
                  0 IN STAGE
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            {/* LEFT 8 COLS: Recessed Brass-Rimmed Frequency Glass Window */}
            <div className="lg:col-span-8 min-w-0">
              <div
                className="rounded-[22px] p-[2.5px] shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,240,190,0.4)]"
                style={{
                  background:
                    "linear-gradient(180deg, #6E501E 0%, #D5B168 50%, #593E14 100%)",
                }}
              >
                <div
                  className="relative rounded-[20px] px-2 sm:px-5 pt-3 pb-2.5 overflow-hidden border border-[#FFE5A3]/35"
                  style={{
                    background:
                      "linear-gradient(180deg, #091529 0%, #102038 52%, #192434 85%, #20232A 100%)",
                    boxShadow:
                      "inset 0 6px 18px rgba(0,0,0,0.9), inset 0 -4px 12px rgba(0,0,0,0.65)",
                  }}
                >
                  {/* Dynamic Warm Golden Spotlight Glow Behind Active Stage */}
                  <div
                    className="pointer-events-none absolute inset-y-0 w-44 -translate-x-1/2 transition-all duration-300 motion-reduce:transition-none ease-out"
                    style={{
                      left: `${activeStageMeta.needlePercent}%`,
                      background:
                        "radial-gradient(ellipse at 50% 62%, rgba(255, 205, 105, 0.36) 0%, rgba(212, 155, 62, 0.14) 45%, transparent 75%)",
                    }}
                  />

                  {/* Top Glass Highlight Reflection */}
                  <div
                    className="pointer-events-none absolute inset-x-6 top-1 h-[1px] opacity-40"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)",
                    }}
                  />

                  {/* 4 Stage Columns Inside the Tuner Window — Fixed Geometry & Zero Truncation */}
                  <div
                    className="relative z-10 grid grid-cols-4 divide-x divide-[#C5A059]/25"
                    role="tablist"
                    aria-label="Lead Center Stages"
                  >
                    {TUNER_STAGES.map((stage) => {
                      const count = stageCounts[stage.id] ?? 0;
                      const isSelected = stage.id === selectedStage;
                      return (
                        <button
                          key={stage.id}
                          type="button"
                          role="tab"
                          aria-selected={isSelected}
                          data-testid={`radio-stage-${stage.id}`}
                          onClick={() => onSelectStage(stage.id)}
                          className="group min-w-0 h-[68px] flex flex-col items-center justify-center px-1 sm:px-2 py-1 transition-colors cursor-pointer focus:outline-hidden overflow-hidden"
                        >
                          <span
                            className={cn(
                              "h-3.5 leading-none flex items-center text-[8.5px] sm:text-[9.5px] font-mono uppercase tracking-wider mb-0.5 transition-colors whitespace-nowrap",
                              isSelected
                                ? "text-[#FFE394] font-bold"
                                : "text-[#9C8D74] group-hover:text-[#DFC89C]"
                            )}
                          >
                            {stage.cbChannel}
                          </span>
                          <span
                            className={cn(
                              "h-6 leading-none flex items-center font-serif text-[11px] sm:text-[15px] md:text-[17px] tracking-tight transition-colors whitespace-nowrap",
                              isSelected
                                ? "font-bold text-[#FFFFFF] drop-shadow-[0_0_10px_rgba(255,227,148,0.6)]"
                                : "font-medium text-[#D0C5B0] group-hover:text-[#FFF4D4]"
                            )}
                            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                          >
                            {stage.label}
                          </span>

                          <span
                            data-testid={`radio-stage-count-${stage.id}`}
                            className={cn(
                              "mt-1 min-w-[28px] sm:min-w-[32px] h-5 sm:h-5.5 px-2 rounded-full text-xs font-bold inline-flex items-center justify-center transition-colors shrink-0",
                              isSelected
                                ? "bg-gradient-to-b from-[#FFE08C] to-[#C8963E] text-[#1A1205] border border-[#FFF3C4] shadow-[0_0_14px_rgba(255,215,115,0.75)]"
                                : "bg-[#2C2823]/90 text-[#DFC89C] border border-[#7D6335]/60 group-hover:border-[#C5A059]"
                            )}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Horizontal Brass Frequency Scale + Ticks + Sliding Conical Brass Needle */}
                  <div className="relative z-10 mt-3 pt-1.5 pb-2 px-2">
                    {/* Horizontal Scale Line */}
                    <div className="relative h-[2px] w-full bg-gradient-to-r from-[#6E5528] via-[#E5C175] to-[#6E5528] shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                      {/* Scale Tick Marks */}
                      {[6, 13.5, 21, 29, 38.5, 47, 55, 63.5, 72, 80, 87.5, 94].map(
                        (pct, idx) => {
                          const isMajor =
                            pct === 13.5 ||
                            pct === 38.5 ||
                            pct === 63.5 ||
                            pct === 87.5;
                          return (
                            <span
                              key={idx}
                              style={{ left: `${pct}%` }}
                              className={cn(
                                "absolute -translate-x-1/2 -top-1.5 w-[1.5px]",
                                isMajor
                                  ? "h-3.5 -top-1.5 bg-[#FFE394]"
                                  : "h-2 -top-1 bg-[#C5A059]/65"
                              )}
                            />
                          );
                        }
                      )}

                      {/* Glowing Conical Brass Pointer Needle */}
                      <div
                        data-testid="radio-tuning-needle"
                        className="absolute -top-3.5 -translate-x-1/2 flex flex-col items-center transition-all duration-300 motion-reduce:transition-none ease-out"
                        style={{ left: `${activeStageMeta.needlePercent}%` }}
                      >
                        <div className="w-3 h-3 rounded-full bg-[#FFE394] blur-[4px] opacity-90 -mb-2" />
                        <svg
                          width="15"
                          height="24"
                          viewBox="0 0 16 28"
                          fill="none"
                          className="drop-shadow-[0_3px_6px_rgba(0,0,0,0.9)]"
                        >
                          <path
                            d="M8 0L13.5 26H2.5L8 0Z"
                            fill="url(#needle-brass-grad)"
                            stroke="#FFE8A3"
                            strokeWidth="0.7"
                          />
                          <defs>
                            <linearGradient
                              id="needle-brass-grad"
                              x1="2.5"
                              y1="0"
                              x2="13.5"
                              y2="26"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop stopColor="#FFF6D6" />
                              <stop offset="0.45" stopColor="#DDA84B" />
                              <stop offset="1" stopColor="#6E4812" />
                            </linearGradient>
                          </defs>
                        </svg>
                      </div>
                    </div>

                    {/* Active Stage Family Count Label Under Needle — Locked Single Line */}
                    <div className="mt-2.5 h-5 flex items-center justify-center overflow-hidden px-2">
                      <span
                        className="font-serif italic text-xs text-[#FFF4D4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] truncate whitespace-nowrap max-w-full block"
                        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                      >
                        Viewing <strong className="text-[#FFE394] not-italic">{activeStageMeta.label}</strong> ({activeStageCount}{" "}
                        {activeStageCount === 1 ? "family" : "families"}) •{" "}
                        {activeStageMeta.rescueSubtext}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT 4 COLS: Tactile Rotary Brass CB Channel Knob */}
            <div className="lg:col-span-4 flex flex-col items-center justify-center py-0.5 shrink-0">
              <div className="flex items-center gap-2.5 w-full max-w-[240px] justify-center mb-1.5">
                <span className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[#C5A059]/70" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#DFC89C] whitespace-nowrap">
                  TUNE STAGE DIAL
                </span>
                <span className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[#C5A059]/70" />
              </div>

              {/* Left Step < | Machined Brass Rotary Dial | Right Step > */}
              <div className="flex items-center justify-center gap-3.5">
                <button
                  type="button"
                  onClick={() => handleStepStage(-1)}
                  aria-label="Previous stage"
                  data-testid="radio-prev-stage-btn"
                  className="w-8 h-8 rounded-full bg-[#09182E] hover:bg-[#122B4E] border border-[#C5A059]/70 text-[#FFE394] flex items-center justify-center shadow-[0_3px_8px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.15)] transition-colors cursor-pointer shrink-0"
                  title="Previous Stage (Arrow Left)"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* 3D Machined Conical Brass Knob (Click to cycle stage) */}
                <button
                  type="button"
                  onClick={() => handleStepStage(1)}
                  data-testid="radio-rotary-dial"
                  aria-label={`Current stage: ${activeStageMeta.label}. Click to tune next stage`}
                  title={`Current stage: ${activeStageMeta.label} (Click to turn dial)`}
                  className="group relative w-20 h-20 sm:w-22 sm:h-22 rounded-full p-[4px] flex items-center justify-center shadow-[0_10px_24px_rgba(0,0,0,0.95),0_0_0_2px_#2A1C08] cursor-pointer focus:outline-hidden shrink-0"
                  style={{
                    background:
                      "linear-gradient(145deg, #F0D28C 0%, #9E762C 45%, #4A320E 100%)",
                  }}
                >
                  {/* Outer Knurled Dark Bezel Ring */}
                  <div className="w-full h-full rounded-full p-[4px] bg-[#181209] border border-[#FFE394]/40 flex items-center justify-center shadow-inner">
                    {/* Conical Brushed Brass Face */}
                    <div
                      className="relative w-full h-full rounded-full border border-[#FFE5A3]/60 shadow-[inset_0_2px_6px_rgba(255,255,255,0.35),inset_0_-4px_8px_rgba(0,0,0,0.7)] transition-transform duration-300 motion-reduce:transition-none ease-out"
                      style={{
                        transform: `rotate(${activeStageMeta.knobAngle}deg)`,
                        background: `conic-gradient(
                          from 0deg at 50% 50%,
                          #6E4F1D 0deg,
                          #D5B067 40deg,
                          #FFF0C2 65deg,
                          #B88D3D 105deg,
                          #4E3610 155deg,
                          #A67C33 200deg,
                          #F2D388 245deg,
                          #8C6523 305deg,
                          #6E4F1D 360deg
                        )`,
                      }}
                    >
                      {/* Illuminated Ivory/Gold Indicator Notch at Top of Knob */}
                      <span className="absolute top-1.5 left-1/2 -translate-x-1/2 w-[3px] h-3.5 rounded-full bg-[#FFFDF5] shadow-[0_0_8px_#FFE394,0_1px_2px_rgba(0,0,0,0.9)]" />
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleStepStage(1)}
                  aria-label="Next stage"
                  data-testid="radio-next-stage-btn"
                  className="w-8 h-8 rounded-full bg-[#09182E] hover:bg-[#122B4E] border border-[#C5A059]/70 text-[#FFE394] flex items-center justify-center shadow-[0_3px_8px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.15)] transition-colors cursor-pointer shrink-0"
                  title="Next Stage (Arrow Right)"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Recessed CB Speaker Grille Slots + Caption */}
              <div className="mt-2 flex flex-col items-center gap-1 w-full overflow-hidden">
                <div
                  className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#040B18] border border-[#3A2C18]/90 shadow-inner shrink-0"
                  title="Stage Tuner Active"
                >
                  <span className="w-4 h-1 rounded-full bg-[#01040A] border-b border-[#C5A059]/25" />
                  <span className="w-6 h-1 rounded-full bg-[#01040A] border-b border-[#C5A059]/25" />
                  <span className="w-8 h-1 rounded-full bg-[#01040A] border-b border-[#C5A059]/25" />
                  <span className="w-6 h-1 rounded-full bg-[#01040A] border-b border-[#C5A059]/25" />
                  <span className="w-4 h-1 rounded-full bg-[#01040A] border-b border-[#C5A059]/25" />
                </div>
                <p
                  className="font-serif italic text-[11px] text-[#C6B697] text-center truncate whitespace-nowrap max-w-full"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Tuning changes viewed stage · Explicit actions progress a lead
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
