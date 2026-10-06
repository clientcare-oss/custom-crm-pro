import React from "react";
import {
  ChevronDown,
  Sparkles,
  FileText,
  PlayCircle,
  Upload,
  Save,
  Calendar,
  Check,
  Loader2,
  ChevronRight,
  Database,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import type { WorkspaceTab, MeetingWorkspaceStatus } from "./types";

export interface MeetingWorkspaceAnimatedHeaderProps {
  // Student & Case
  studentName?: string;
  selectedStudentId?: number | null;
  studentList?: any[];
  caseId?: string | null;
  onSelectStudent?: (studentId: number) => void;

  // Meeting details
  meetingType?: string;
  meetingDate?: string;

  // Navigation & Tabs
  activeTab?: WorkspaceTab;
  onSelectTab?: (tab: WorkspaceTab) => void;
  onBack?: () => void;

  // Actions
  onImportClick?: () => void;
  onSaveClick?: () => void;
  isSaving?: boolean;
  lastSavedAt?: Date | null;
  status?: MeetingWorkspaceStatus;
}

/**
 * MeetingWorkspaceAnimatedHeader — PG-043
 * Panoramic Steampunk Study & Library Shelf Canopy with authentic interactive UI:
 * - Upper Shelf: Breadcrumb, Student selector, Case badge, Meeting type, Date, Import & Save actions
 * - Lower Shelf: Aged Parchment Title Plaque + 3 Interactive Stage Cards (Assemble, Blueprint, Meeting Mode)
 * - Trailing lush green ivy vines draped gracefully over the workspace deck below
 */
export function MeetingWorkspaceAnimatedHeader({
  studentName = "Elijah Santiago",
  selectedStudentId,
  studentList = [],
  caseId = "WP-2026-0031",
  onSelectStudent,
  meetingType = "Annual IEP Meeting",
  meetingDate = "10/21/2026",
  activeTab = "ASSEMBLY",
  onSelectTab,
  onBack,
  onImportClick,
  onSaveClick,
  isSaving = false,
  lastSavedAt,
  status = "PREPARING",
}: MeetingWorkspaceAnimatedHeaderProps) {
  const normalizedTab =
    activeTab === "PREP"
      ? "ASSEMBLY"
      : activeTab === "PARENT_READY"
      ? "BLUEPRINT"
      : activeTab === "ADVOCATE_READY"
      ? "MEETING_MODE"
      : activeTab;

  const displayCaseId = caseId ? caseId.replace(/^Case\s*#?/i, "") : "WP-2026-0031";

  return (
    <div className="w-full relative select-none overflow-visible">
      {/* ── Panoramic Canopy Container (1024 x 341 native aspect ratio, ~3:1) ── */}
      <div className="relative w-full max-w-[1700px] mx-auto overflow-hidden rounded-b-3xl border-b border-[#3A2C18] bg-[#030914] shadow-[0_16px_45px_rgba(0,0,0,0.95)] @container">
        
        {/* Deep ambient maritime backdrop behind the shelf */}
        <div className="absolute inset-0 bg-[#07162B] [background:radial-gradient(ellipse_at_50%_0%,_#102B4E_0%,_#07162B_55%,_#030D1A_100%)] pointer-events-none" />

        {/* ── Base High-Res Transparent Study Shelf Image (1024 x 341) ── */}
        <img
          src="/images/meeting-workspace-shelf.png"
          alt="Advocacy Strategy Library & Study Shelf Canopy"
          className="w-full h-auto block select-none pointer-events-none relative z-10"
        />

        {/* ── Overlay Interactive Layer ── */}
        <div className="absolute inset-0 z-20 pointer-events-none text-white">

          {/* ══════════════════════════════════════════════════════════════
              ROW 1: Breadcrumb (Left) & Actions (Right)
              y ≈ 20..50px in 341px height -> top ≈ 5.8% to 14.5%
             ══════════════════════════════════════════════════════════════ */}
          <div
            className="absolute flex items-center justify-between pointer-events-auto"
            style={{
              top: "5.8%",
              left: "3.5%",
              right: "17%", // Leaves room for the stained glass lamp shade on the right
              height: "10%",
            }}
          >
            {/* Breadcrumb: Advocacy > Meeting Workspace */}
            <div className="flex items-center gap-1 sm:gap-2 text-[clamp(10px,1.15cqw,14px)] font-serif">
              <button
                type="button"
                onClick={onBack}
                className="text-[#D8C7A5] hover:text-[#FFF4D4] transition-colors cursor-pointer tracking-wide flex items-center gap-1"
                title="Back to Advocacy Case"
              >
                <span>Advocacy</span>
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-[#A69371] shrink-0" />
              <span className="text-[#FFF4D4] font-semibold tracking-wide">
                Meeting Workspace
              </span>
            </div>

            {/* Top Right Action Buttons: [ Import Advocate Ready ] [ Save Workspace ] ✨ */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              {/* Import Advocate Ready */}
              <button
                type="button"
                onClick={onImportClick}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-[#0B254A]/90 hover:bg-[#12386E] border border-[#2B5E9E] text-[#CDE1FF] hover:text-white text-[clamp(9px,0.95cqw,12px)] font-semibold shadow-[0_2px_8px_rgba(0,0,0,0.5)] transition-all cursor-pointer"
                title="Import Advocate Ready strategy document"
              >
                <Upload className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#86B4F5] shrink-0" />
                <span className="whitespace-nowrap">Import Advocate Ready</span>
              </button>

              {/* Save Workspace */}
              <button
                type="button"
                onClick={onSaveClick}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-[#0A182E]/90 hover:bg-[#122847] border border-[#C5A059]/60 hover:border-[#FFE394] text-[#FFE394] hover:text-[#FFF4D4] text-[clamp(9px,0.95cqw,12px)] font-semibold shadow-[0_2px_8px_rgba(0,0,0,0.6)] transition-all cursor-pointer"
                title="Save workspace state to Cloudflare D1"
              >
                {isSaving ? (
                  <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin text-[#FFE394]" />
                ) : (
                  <Save className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#DFBE77] shrink-0" />
                )}
                <span className="whitespace-nowrap">
                  {isSaving ? "Saving..." : "Save Workspace"}
                </span>
              </button>

              {/* Subtle 4-point Sparkle Accent / Page ID */}
              <div
                className="hidden md:flex items-center justify-center text-[#DFBE77]/80 hover:text-[#FFE394] transition-colors cursor-default"
                title="Page ID: PG-043 · Meeting Workspace"
              >
                <Sparkles className="w-4 h-4 text-[#DFBE77]" />
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              ROW 2: Student, Case, Meeting, Date Metadata Strip
              y ≈ 60..95px in 341px height -> top ≈ 17.6% to 27.8%
             ══════════════════════════════════════════════════════════════ */}
          <div
            className="absolute flex items-center gap-2 sm:gap-3 flex-wrap pointer-events-auto"
            style={{
              top: "17.6%",
              left: "3.5%",
              right: "17%",
              height: "10.2%",
            }}
          >
            {/* Student Dropdown Selector */}
            <div className="flex items-center gap-1.5 text-[clamp(9px,0.95cqw,12px)]">
              <span className="text-[#A69371] font-medium">Student:</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#061B36]/90 hover:bg-[#0B2A54] border border-[#1B3E6B] hover:border-[#386CB5] text-[#FFF4D4] font-semibold shadow-inner transition-all cursor-pointer">
                    <span className="truncate max-w-[130px] sm:max-w-[180px]">{studentName}</span>
                    <ChevronDown className="w-3 h-3 text-[#A69371] shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4] w-72 max-h-80 overflow-y-auto shadow-2xl z-50">
                  {studentList?.map((c) => {
                    const cCaseId = c.caseId || (c.id === 120034 ? "WP-2026-0029" : null);
                    return (
                      <DropdownMenuItem
                        key={c.id}
                        onClick={() => onSelectStudent?.(c.id)}
                        className="flex items-center justify-between gap-2 text-xs hover:bg-[#071E3D] hover:text-[#FFF4D4] cursor-pointer py-2 text-[#D8C7A5]"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-[#FFF4D4]">
                            {c.firstName} {c.lastName}
                          </span>
                          {cCaseId && (
                            <span className="text-[10px] font-mono text-[#FFE394]/90">
                              Case #{cCaseId.replace(/^Case\s*#?/i, "")}
                            </span>
                          )}
                        </div>
                        {c.id === selectedStudentId && (
                          <Badge className="bg-[#C5A059]/20 text-[#FFE394] border-[#C5A059]/40 text-[10px] py-0 shrink-0">
                            Active
                          </Badge>
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Case Badge */}
            <div className="flex items-center gap-1.5 text-[clamp(9px,0.95cqw,12px)]">
              <span className="text-[#A69371] font-medium">Case:</span>
              <div className="px-2 py-1 rounded-lg bg-[#061B36]/90 border border-[#1B3E6B] text-[#D8C7A5] font-mono font-medium shadow-inner">
                #{displayCaseId}
              </div>
            </div>

            {/* Meeting Type Selector */}
            <div className="flex items-center gap-1.5 text-[clamp(9px,0.95cqw,12px)]">
              <span className="text-[#A69371] font-medium">Meeting:</span>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#061B36]/90 border border-[#1B3E6B] text-[#FFF4D4] font-medium shadow-inner">
                <span>{meetingType}</span>
                <ChevronDown className="w-3 h-3 text-[#A69371] shrink-0" />
              </div>
            </div>

            {/* Meeting Date Badge */}
            <div className="flex items-center gap-1.5 text-[clamp(9px,0.95cqw,12px)]">
              <span className="text-[#A69371] font-medium">Date:</span>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#061B36]/90 border border-[#1B3E6B] text-[#FFE394] font-mono shadow-inner">
                <span>{meetingDate}</span>
                <Calendar className="w-3 h-3 text-[#A69371] shrink-0" />
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              ROW 3: Lower Shelf Runner (Parchment Plaque & 3 Stage Cards)
              y ≈ 118..216px in 341px height -> top ≈ 34.6% to 63.3%
             ══════════════════════════════════════════════════════════════ */}

          {/* ── Left Parchment Plaque: Meeting Workspace (Prepare • Navigate • Close the Loop) ── */}
          <div
            className="absolute pointer-events-auto rounded-xl border border-[#BFA26F]/90 bg-gradient-to-br from-[#FAF3DF] via-[#F4E6C3] to-[#E5D0A1] shadow-[0_8px_22px_rgba(0,0,0,0.7),inset_0_1px_2px_rgba(255,255,255,0.75)] p-2 sm:p-3 lg:p-3.5 flex flex-col justify-between overflow-hidden"
            style={{
              left: "3.5%",
              width: "36.5%",
              top: "34.6%",
              height: "28.7%",
            }}
          >
            {/* Subtle vintage parchment corner ornaments */}
            <div className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-[#8C6B25]/30 border border-[#8C6B25]/50 pointer-events-none" />
            <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#8C6B25]/30 border border-[#8C6B25]/50 pointer-events-none" />
            <div className="absolute bottom-1 left-1 w-1.5 h-1.5 rounded-full bg-[#8C6B25]/30 border border-[#8C6B25]/50 pointer-events-none" />
            <div className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-[#8C6B25]/30 border border-[#8C6B25]/50 pointer-events-none" />

            <div>
              <h1 className="font-serif font-black text-[clamp(12px,1.75cqw,22px)] text-[#111E30] tracking-tight leading-none drop-shadow-sm">
                Meeting Workspace
              </h1>
              <p className="font-serif font-bold text-[clamp(8.5px,0.95cqw,12px)] text-[#3B4D68] tracking-wide mt-0.5 sm:mt-1">
                Prepare &nbsp;•&nbsp; Navigate &nbsp;•&nbsp; Close the Loop
              </p>
            </div>

            <p className="text-[clamp(7.5px,0.8cqw,10.5px)] text-[#4F6078] leading-tight sm:leading-snug font-sans line-clamp-2">
              Bring everything together, build your strategy, and run a focused, effective IEP or 504 meeting.
            </p>
          </div>

          {/* ── Stage 1: ASSEMBLE (Build the case) ── */}
          <button
            type="button"
            onClick={() => onSelectTab?.("ASSEMBLY")}
            className={`absolute pointer-events-auto rounded-xl transition-all cursor-pointer flex flex-col items-center justify-between p-2 sm:p-2.5 text-center group ${
              normalizedTab === "ASSEMBLY"
                ? "bg-gradient-to-b from-[#E7C67D] via-[#D8AD56] to-[#BD8E37] border border-[#FFE8A3]/75 shadow-[0_8px_20px_rgba(0,0,0,0.65),inset_0_1px_2px_rgba(255,255,255,0.4)]"
                : "bg-[#061833]/90 hover:bg-[#0A2246] border border-[#1C3A65] hover:border-[#386CB5] shadow-[0_4px_14px_rgba(0,0,0,0.55)]"
            }`}
            style={{
              left: "41.5%",
              width: "12.0%",
              top: "34.6%",
              height: "28.7%",
            }}
          >
            {/* Top Icon */}
            <div className="flex items-center justify-center pt-0.5">
              <Sparkles
                className={`w-[clamp(14px,1.5cqw,20px)] h-[clamp(14px,1.5cqw,20px)] ${
                  normalizedTab === "ASSEMBLY"
                    ? "text-[#1A1202]"
                    : "text-[#C5D5EB] group-hover:text-white"
                }`}
              />
            </div>

            {/* Title & Subtitle */}
            <div className="flex flex-col items-center">
              <span
                className={`font-black text-[clamp(8.5px,1.05cqw,13px)] tracking-wider uppercase leading-tight ${
                  normalizedTab === "ASSEMBLY"
                    ? "text-[#1A1202]"
                    : "text-[#FFF4D4] group-hover:text-white"
                }`}
              >
                ASSEMBLE
              </span>
              <span
                className={`text-[clamp(7.5px,0.85cqw,10.5px)] font-medium leading-tight mt-0.5 ${
                  normalizedTab === "ASSEMBLY"
                    ? "text-[#3A2808]"
                    : "text-[#8EA6C9] group-hover:text-[#B0C7E8]"
                }`}
              >
                Build the case
              </span>
            </div>

            {/* Bottom Number Badge: ( 1 ) */}
            <div
              className={`w-[clamp(16px,1.6cqw,22px)] h-[clamp(16px,1.6cqw,22px)] rounded-full flex items-center justify-center font-bold text-[clamp(9px,0.9cqw,11.5px)] shadow-sm ${
                normalizedTab === "ASSEMBLY"
                  ? "bg-[#FFEAB5] text-[#1A1202] border border-[#8C6B25]"
                  : "bg-[#020B17] text-[#8EA6C9] border border-[#1C3A65] group-hover:border-[#386CB5]"
              }`}
            >
              1
            </div>
          </button>

          {/* ── Stage 2: BLUEPRINT (Discuss with parents and edit) ── */}
          <button
            type="button"
            onClick={() => onSelectTab?.("BLUEPRINT")}
            className={`absolute pointer-events-auto rounded-xl transition-all cursor-pointer flex flex-col items-center justify-between p-2 sm:p-2.5 text-center group ${
              normalizedTab === "BLUEPRINT"
                ? "bg-gradient-to-b from-[#E7C67D] via-[#D8AD56] to-[#BD8E37] border border-[#FFE8A3]/75 shadow-[0_8px_20px_rgba(0,0,0,0.65),inset_0_1px_2px_rgba(255,255,255,0.4)]"
                : "bg-[#061833]/90 hover:bg-[#0A2246] border border-[#1C3A65] hover:border-[#386CB5] shadow-[0_4px_14px_rgba(0,0,0,0.55)]"
            }`}
            style={{
              left: "54.5%",
              width: "12.0%",
              top: "34.6%",
              height: "28.7%",
            }}
          >
            {/* Top Icon */}
            <div className="flex items-center justify-center pt-0.5">
              <FileText
                className={`w-[clamp(14px,1.5cqw,20px)] h-[clamp(14px,1.5cqw,20px)] ${
                  normalizedTab === "BLUEPRINT"
                    ? "text-[#1A1202]"
                    : "text-[#C5D5EB] group-hover:text-white"
                }`}
              />
            </div>

            {/* Title & Subtitle */}
            <div className="flex flex-col items-center">
              <span
                className={`font-black text-[clamp(8.5px,1.05cqw,13px)] tracking-wider uppercase leading-tight ${
                  normalizedTab === "BLUEPRINT"
                    ? "text-[#1A1202]"
                    : "text-[#FFF4D4] group-hover:text-white"
                }`}
              >
                BLUEPRINT
              </span>
              <span
                className={`text-[clamp(7px,0.8cqw,10px)] font-medium leading-tight mt-0.5 ${
                  normalizedTab === "BLUEPRINT"
                    ? "text-[#3A2808]"
                    : "text-[#8EA6C9] group-hover:text-[#B0C7E8]"
                }`}
              >
                Discuss with parents and edit
              </span>
            </div>

            {/* Bottom Number Badge: ( 2 ) */}
            <div
              className={`w-[clamp(16px,1.6cqw,22px)] h-[clamp(16px,1.6cqw,22px)] rounded-full flex items-center justify-center font-bold text-[clamp(9px,0.9cqw,11.5px)] shadow-sm ${
                normalizedTab === "BLUEPRINT"
                  ? "bg-[#FFEAB5] text-[#1A1202] border border-[#8C6B25]"
                  : "bg-[#020B17] text-[#8EA6C9] border border-[#1C3A65] group-hover:border-[#386CB5]"
              }`}
            >
              2
            </div>
          </button>

          {/* ── Stage 3: MEETING MODE (Run the meeting) ── */}
          <button
            type="button"
            onClick={() => onSelectTab?.("MEETING_MODE")}
            className={`absolute pointer-events-auto rounded-xl transition-all cursor-pointer flex flex-col items-center justify-between p-2 sm:p-2.5 text-center group ${
              normalizedTab === "MEETING_MODE"
                ? "bg-gradient-to-b from-[#E7C67D] via-[#D8AD56] to-[#BD8E37] border border-[#FFE8A3]/75 shadow-[0_8px_20px_rgba(0,0,0,0.65),inset_0_1px_2px_rgba(255,255,255,0.4)]"
                : "bg-[#061833]/90 hover:bg-[#0A2246] border border-[#1C3A65] hover:border-[#386CB5] shadow-[0_4px_14px_rgba(0,0,0,0.55)]"
            }`}
            style={{
              left: "67.5%",
              width: "13.0%",
              top: "34.6%",
              height: "28.7%",
            }}
          >
            {/* Top Icon */}
            <div className="flex items-center justify-center pt-0.5">
              <PlayCircle
                className={`w-[clamp(14px,1.5cqw,20px)] h-[clamp(14px,1.5cqw,20px)] ${
                  normalizedTab === "MEETING_MODE"
                    ? "text-[#1A1202]"
                    : "text-[#C5D5EB] group-hover:text-white"
                }`}
              />
            </div>

            {/* Title & Subtitle */}
            <div className="flex flex-col items-center">
              <span
                className={`font-black text-[clamp(8.5px,1.05cqw,13px)] tracking-wider uppercase leading-tight ${
                  normalizedTab === "MEETING_MODE"
                    ? "text-[#1A1202]"
                    : "text-[#FFF4D4] group-hover:text-white"
                }`}
              >
                MEETING MODE
              </span>
              <span
                className={`text-[clamp(7.5px,0.85cqw,10.5px)] font-medium leading-tight mt-0.5 ${
                  normalizedTab === "MEETING_MODE"
                    ? "text-[#3A2808]"
                    : "text-[#8EA6C9] group-hover:text-[#B0C7E8]"
                }`}
              >
                Run the meeting
              </span>
            </div>

            {/* Bottom Number Badge: ( 3 ) */}
            <div
              className={`w-[clamp(16px,1.6cqw,22px)] h-[clamp(16px,1.6cqw,22px)] rounded-full flex items-center justify-center font-bold text-[clamp(9px,0.9cqw,11.5px)] shadow-sm ${
                normalizedTab === "MEETING_MODE"
                  ? "bg-[#FFEAB5] text-[#1A1202] border border-[#8C6B25]"
                  : "bg-[#020B17] text-[#8EA6C9] border border-[#1C3A65] group-hover:border-[#386CB5]"
              }`}
            >
              3
            </div>
          </button>

        </div>
      </div>
    </div>
  );
}

export default MeetingWorkspaceAnimatedHeader;
