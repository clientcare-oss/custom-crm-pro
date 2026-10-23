import React from "react";
import {
  ChevronDown,
  Sparkles,
  FileText,
  PlayCircle,
  Upload,
  Save,
  Loader2,
  User,
  Undo2,
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
 * Specialized layout:
 * - Upper Blue Area: Tan "Meeting Workspace" label on left + [Import] & [Save] buttons on right
 * - Lower Blue Area: Student, Case, Meeting, and Date buttons pushed down (no loose unboxed labels)
 * - Under Bottom Shelf Area: The 3 display set buttons: Assemble (1), Blueprint (2), Meeting Mode (3)
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
              ROW 1: UPPER BLUE SHELF AREA (top ≈ 20% - 31%)
              - Tan Meeting Workspace Label (Left)
              - Action Buttons: [ Import Advocate Ready ] [ Save Workspace ] (Right)
              - Tactile 3D styling
             ══════════════════════════════════════════════════════════════ */}
          <div
            className="absolute flex items-center justify-center gap-2.5 sm:gap-3.5 lg:gap-4 pointer-events-auto"
            style={{
              top: "20.5%",
              left: "10%",
              right: "24%",
              height: "10%",
            }}
          >
            {/* ── Back Loop Button (Beside Meeting Workspace) ── */}
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center justify-center p-1.5 sm:p-2 rounded-xl bg-gradient-to-b from-[#0c2449]/95 via-[#071933]/95 to-[#030e20] border border-[#1d3f6d] hover:border-[#2b5894] text-[#F1CB6C] hover:text-[#FDE295] shadow-[inset_0_1px_0.5px_rgba(255,255,255,0.22),inset_0_-1.5px_2px_rgba(0,0,0,0.85),0_4px_14px_rgba(0,0,0,0.65),0_1px_3px_rgba(0,0,0,0.75)] hover:from-[#112f5a] hover:via-[#092244] hover:to-[#051328] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),inset_0_-1.5px_2px_rgba(0,0,0,0.85),0_6px_18px_rgba(0,0,0,0.75)] active:translate-y-[0.5px] active:shadow-[inset_0_1.5px_2.5px_rgba(0,0,0,0.9),0_1px_2px_rgba(0,0,0,0.5)] transition-all cursor-pointer shrink-0 group"
                title="Return to Student Case"
                aria-label="Back to Case"
              >
                <Undo2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F1CB6C] stroke-[2.2] drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.85)] group-hover:scale-110 transition-transform" />
              </button>
            )}

            {/* ── Tan Meeting Workspace Label (Static 3D Plaque — Not Clickable) ── */}
            <div
              className="rounded-xl border border-[#C5A265] bg-gradient-to-b from-[#FAF4E4] via-[#F4E6C3] to-[#DFCA98] shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),inset_0_-1.5px_2px_rgba(110,80,25,0.45),0_5px_15px_rgba(0,0,0,0.65),0_1px_3px_rgba(0,0,0,0.7)] px-3 sm:px-3.5 py-1 sm:py-1.5 flex items-center gap-2 select-none shrink-0"
            >
              <div>
                <h1 className="font-serif font-black text-[clamp(11px,1.25cqw,16px)] text-[#111E30] tracking-tight leading-none drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)]">
                  Meeting Workspace
                </h1>
                <p className="font-serif font-bold text-[clamp(7px,0.75cqw,10px)] text-[#3B4D68] tracking-wide mt-0.5 hidden sm:block">
                  Prepare • Navigate • Close the Loop
                </p>
              </div>
            </div>

            {/* ── Action Buttons (Tactile 3D Styling) ── */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              {/* Import Advocate Ready */}
              <button
                type="button"
                onClick={onImportClick}
                className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl bg-gradient-to-b from-[#0c2449]/95 via-[#071933]/95 to-[#030e20] border border-[#1d3f6d] hover:border-[#2b5894] text-[#CDE1FF] hover:text-white text-[clamp(8.5px,0.85cqw,11.5px)] font-semibold shadow-[inset_0_1px_0.5px_rgba(255,255,255,0.22),inset_0_-1.5px_2px_rgba(0,0,0,0.85),0_4px_14px_rgba(0,0,0,0.65),0_1px_3px_rgba(0,0,0,0.75)] hover:from-[#112f5a] hover:via-[#092244] hover:to-[#051328] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),inset_0_-1.5px_2px_rgba(0,0,0,0.85),0_6px_18px_rgba(0,0,0,0.75)] active:translate-y-[0.5px] active:shadow-[inset_0_1.5px_2.5px_rgba(0,0,0,0.9),0_1px_2px_rgba(0,0,0,0.5)] transition-all cursor-pointer whitespace-nowrap"
                title="Import Advocate Ready strategy document"
              >
                <Upload className="w-3.5 h-3.5 text-[#86B4F5] shrink-0 drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.8)]" />
                <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">Import Advocate Ready</span>
              </button>

              {/* Save Workspace */}
              <button
                type="button"
                onClick={onSaveClick}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl bg-gradient-to-b from-[#14233C]/95 via-[#0A1629]/95 to-[#040A14] border border-[#8C6B25]/85 hover:border-[#DFBE77] text-[#FFE394] hover:text-[#FFF4D4] text-[clamp(8.5px,0.85cqw,11.5px)] font-semibold shadow-[inset_0_1px_0.5px_rgba(255,235,180,0.25),inset_0_-1.5px_2px_rgba(0,0,0,0.85),0_4px_14px_rgba(0,0,0,0.65),0_1px_3px_rgba(0,0,0,0.75)] hover:from-[#1C3256] hover:via-[#0F203B] hover:to-[#071120] hover:shadow-[inset_0_1px_1px_rgba(255,235,180,0.35),inset_0_-1.5px_2px_rgba(0,0,0,0.85),0_6px_18px_rgba(0,0,0,0.75)] active:translate-y-[0.5px] active:shadow-[inset_0_1.5px_2.5px_rgba(0,0,0,0.9),0_1px_2px_rgba(0,0,0,0.5)] transition-all cursor-pointer whitespace-nowrap"
                title="Save workspace state to Cloudflare D1"
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FFE394]" />
                ) : (
                  <Save className="w-3.5 h-3.5 text-[#DFBE77] shrink-0 drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.8)]" />
                )}
                <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
                  {isSaving ? "Saving..." : "Save Workspace"}
                </span>
              </button>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              ROW 2: LOWER BLUE SHELF AREA (top ≈ 38% - 52%)
              - Student line, case, meeting
              - 3D tactile buttons matching reference design
             ══════════════════════════════════════════════════════════════ */}
          <div
            className="absolute flex items-center justify-center gap-2 sm:gap-2.5 flex-wrap pointer-events-auto"
            style={{
              top: "38.5%",
              left: "22%",
              right: "24%",
              height: "11%",
            }}
          >
            {/* Student Dropdown Button (3D tactile) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-xl bg-gradient-to-b from-[#0c2449]/95 via-[#071933]/95 to-[#030e20] border border-[#1d3f6d] hover:border-[#2b5894] text-[#FFF4D4] font-semibold text-[clamp(9px,0.95cqw,12px)] shadow-[inset_0_1px_0.5px_rgba(255,255,255,0.22),inset_0_-1.5px_2px_rgba(0,0,0,0.85),0_4px_14px_rgba(0,0,0,0.65),0_1px_3px_rgba(0,0,0,0.75)] hover:from-[#112f5a] hover:via-[#092244] hover:to-[#051328] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),inset_0_-1.5px_2px_rgba(0,0,0,0.85),0_6px_18px_rgba(0,0,0,0.75)] active:translate-y-[0.5px] transition-all cursor-pointer"
                  title="Switch Active Student"
                >
                  <User className="w-3.5 h-3.5 text-[#F1CB6C] stroke-[1.9] shrink-0 drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.85)]" />
                  <span className="truncate max-w-[110px] sm:max-w-[160px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">{studentName}</span>
                  <ChevronDown className="w-3 h-3 text-[#C5A059] shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]" />
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

            {/* Case Badge Button (3D tactile) */}
            <div
              className="px-3 sm:px-3.5 py-1.5 rounded-xl bg-gradient-to-b from-[#0c2449]/90 via-[#071933]/95 to-[#030e20] border border-[#1d3f6d] text-[#D8C7A5] font-mono font-medium text-[clamp(9px,0.95cqw,12px)] shadow-[inset_0_1px_0.5px_rgba(255,255,255,0.18),inset_0_-1.5px_2px_rgba(0,0,0,0.85),0_4px_14px_rgba(0,0,0,0.65),0_1px_3px_rgba(0,0,0,0.75)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] shrink-0"
              title="Advocacy Case Number"
            >
              #{displayCaseId}
            </div>

            {/* Meeting Type Button (3D tactile) */}
            <div
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl bg-gradient-to-b from-[#0c2449]/90 via-[#071933]/95 to-[#030e20] border border-[#1d3f6d] text-[#FFF4D4] font-medium text-[clamp(9px,0.95cqw,12px)] shadow-[inset_0_1px_0.5px_rgba(255,255,255,0.18),inset_0_-1.5px_2px_rgba(0,0,0,0.85),0_4px_14px_rgba(0,0,0,0.65),0_1px_3px_rgba(0,0,0,0.75)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] shrink-0"
              title="Scheduled Meeting Type"
            >
              <span>{meetingType}</span>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              ROW 3: UNDER THE BOTTOM SHELF AREA (top ≈ 63% - 95%)
              - The 3 display set buttons: ASSEMBLE, BLUEPRINT, MEETING MODE
              - Generous spacing, tactile 3D leather cards
             ══════════════════════════════════════════════════════════════ */}
          <div
            className="absolute flex items-center justify-center gap-3 sm:gap-5 lg:gap-8 pointer-events-auto"
            style={{
              top: "63.5%",
              left: "8%",
              right: "8%",
              height: "30%",
            }}
          >
            {/* ── Stage 1: ASSEMBLE (Build the case) ── */}
            <button
              type="button"
              onClick={() => onSelectTab?.("ASSEMBLY")}
              className={`rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-between p-2.5 sm:p-3 text-center group h-full w-[24%] max-w-[220px] ${
                normalizedTab === "ASSEMBLY"
                  ? "bg-gradient-to-b from-[#F2D794] via-[#D8AD56] to-[#AD7E28] border-2 border-[#FFE8A3] shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.75),inset_0_-2.5px_3px_rgba(100,68,14,0.7),0_10px_26px_rgba(0,0,0,0.85),0_0_20px_rgba(212,175,55,0.35)] scale-102"
                  : "bg-gradient-to-b from-[#0c2449]/95 via-[#071933]/95 to-[#030e20] border border-[#1d3f6d] hover:border-[#2b5894] shadow-[inset_0_1px_0.5px_rgba(255,255,255,0.22),inset_0_-1.5px_2px_rgba(0,0,0,0.85),0_6px_18px_rgba(0,0,0,0.65),0_1px_3px_rgba(0,0,0,0.75)] hover:from-[#112f5a] hover:via-[#092244] hover:to-[#051328] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.32),inset_0_-1.5px_2px_rgba(0,0,0,0.85),0_10px_24px_rgba(0,0,0,0.8)] hover:scale-101 active:translate-y-[0.5px] active:shadow-[inset_0_1.5px_2.5px_rgba(0,0,0,0.9),0_1px_2px_rgba(0,0,0,0.5)]"
              }`}
            >
              {/* Top Icon */}
              <div className="flex items-center justify-center pt-0.5">
                <Sparkles
                  className={`w-[clamp(14px,1.4cqw,20px)] h-[clamp(14px,1.4cqw,20px)] stroke-[1.9] ${
                    normalizedTab === "ASSEMBLY"
                      ? "text-[#1A1202] drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)]"
                      : "text-[#F1CB6C] group-hover:text-[#FDE295] drop-shadow-[0_2px_3.5px_rgba(0,0,0,0.85)] group-hover:scale-105 transition-all"
                  }`}
                />
              </div>

              {/* Title & Subtitle */}
              <div className="flex flex-col items-center">
                <span
                  className={`font-serif font-black text-[clamp(9px,1.1cqw,14px)] tracking-wider uppercase leading-tight ${
                    normalizedTab === "ASSEMBLY"
                      ? "text-[#1A1202] drop-shadow-[0_1px_1px_rgba(255,255,255,0.3)]"
                      : "text-[#FFF4D4] group-hover:text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                  }`}
                >
                  ASSEMBLE
                </span>
                <span
                  className={`text-[clamp(7px,0.8cqw,10.5px)] font-medium leading-tight mt-0.5 ${
                    normalizedTab === "ASSEMBLY"
                      ? "text-[#3A2808] font-semibold"
                      : "text-[#8EA6C9] group-hover:text-[#B0C7E8] drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.8)]"
                  }`}
                >
                  Build the case
                </span>
              </div>

              {/* Bottom Number Badge: ( 1 ) */}
              <div
                className={`w-[clamp(15px,1.4cqw,20px)] h-[clamp(15px,1.4cqw,20px)] rounded-full flex items-center justify-center font-bold text-[clamp(8.5px,0.85cqw,11px)] ${
                  normalizedTab === "ASSEMBLY"
                    ? "bg-gradient-to-b from-[#FFEAB5] to-[#E3BE6A] text-[#1A1202] border border-[#8C6B25] shadow-[0_1.5px_3px_rgba(0,0,0,0.5),inset_0_1px_0.5px_rgba(255,255,255,0.7)]"
                    : "bg-gradient-to-b from-[#040E1B] to-[#01060D] text-[#8EA6C9] border border-[#162D4A] shadow-[inset_0_1px_2px_rgba(0,0,0,0.9),0_1px_0.5px_rgba(255,255,255,0.1)] group-hover:border-[#2B5894] group-hover:text-white"
                }`}
              >
                1
              </div>
            </button>

            {/* ── Stage 2: BLUEPRINT (Discuss with parents and edit) ── */}
            <button
              type="button"
              onClick={() => onSelectTab?.("BLUEPRINT")}
              className={`rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-between p-2.5 sm:p-3 text-center group h-full w-[24%] max-w-[220px] ${
                normalizedTab === "BLUEPRINT"
                  ? "bg-gradient-to-b from-[#F2D794] via-[#D8AD56] to-[#AD7E28] border-2 border-[#FFE8A3] shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.75),inset_0_-2.5px_3px_rgba(100,68,14,0.7),0_10px_26px_rgba(0,0,0,0.85),0_0_20px_rgba(212,175,55,0.35)] scale-102"
                  : "bg-gradient-to-b from-[#0c2449]/95 via-[#071933]/95 to-[#030e20] border border-[#1d3f6d] hover:border-[#2b5894] shadow-[inset_0_1px_0.5px_rgba(255,255,255,0.22),inset_0_-1.5px_2px_rgba(0,0,0,0.85),0_6px_18px_rgba(0,0,0,0.65),0_1px_3px_rgba(0,0,0,0.75)] hover:from-[#112f5a] hover:via-[#092244] hover:to-[#051328] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.32),inset_0_-1.5px_2px_rgba(0,0,0,0.85),0_10px_24px_rgba(0,0,0,0.8)] hover:scale-101 active:translate-y-[0.5px] active:shadow-[inset_0_1.5px_2.5px_rgba(0,0,0,0.9),0_1px_2px_rgba(0,0,0,0.5)]"
              }`}
            >
              {/* Top Icon */}
              <div className="flex items-center justify-center pt-0.5">
                <FileText
                  className={`w-[clamp(14px,1.4cqw,20px)] h-[clamp(14px,1.4cqw,20px)] stroke-[1.9] ${
                    normalizedTab === "BLUEPRINT"
                      ? "text-[#1A1202] drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)]"
                      : "text-[#F1CB6C] group-hover:text-[#FDE295] drop-shadow-[0_2px_3.5px_rgba(0,0,0,0.85)] group-hover:scale-105 transition-all"
                  }`}
                />
              </div>

              {/* Title & Subtitle */}
              <div className="flex flex-col items-center">
                <span
                  className={`font-serif font-black text-[clamp(9px,1.1cqw,14px)] tracking-wider uppercase leading-tight ${
                    normalizedTab === "BLUEPRINT"
                      ? "text-[#1A1202] drop-shadow-[0_1px_1px_rgba(255,255,255,0.3)]"
                      : "text-[#FFF4D4] group-hover:text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                  }`}
                >
                  BLUEPRINT
                </span>
                <span
                  className={`text-[clamp(7px,0.8cqw,10.5px)] font-medium leading-tight mt-0.5 ${
                    normalizedTab === "BLUEPRINT"
                      ? "text-[#3A2808] font-semibold"
                      : "text-[#8EA6C9] group-hover:text-[#B0C7E8] drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.8)]"
                  }`}
                >
                  Discuss with parents & edit
                </span>
              </div>

              {/* Bottom Number Badge: ( 2 ) */}
              <div
                className={`w-[clamp(15px,1.4cqw,20px)] h-[clamp(15px,1.4cqw,20px)] rounded-full flex items-center justify-center font-bold text-[clamp(8.5px,0.85cqw,11px)] ${
                  normalizedTab === "BLUEPRINT"
                    ? "bg-gradient-to-b from-[#FFEAB5] to-[#E3BE6A] text-[#1A1202] border border-[#8C6B25] shadow-[0_1.5px_3px_rgba(0,0,0,0.5),inset_0_1px_0.5px_rgba(255,255,255,0.7)]"
                    : "bg-gradient-to-b from-[#040E1B] to-[#01060D] text-[#8EA6C9] border border-[#162D4A] shadow-[inset_0_1px_2px_rgba(0,0,0,0.9),0_1px_0.5px_rgba(255,255,255,0.1)] group-hover:border-[#2B5894] group-hover:text-white"
                }`}
              >
                2
              </div>
            </button>

            {/* ── Stage 3: MEETING MODE (Run the meeting) ── */}
            <button
              type="button"
              onClick={() => onSelectTab?.("MEETING_MODE")}
              className={`rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-between p-2.5 sm:p-3 text-center group h-full w-[24%] max-w-[220px] ${
                normalizedTab === "MEETING_MODE"
                  ? "bg-gradient-to-b from-[#F2D794] via-[#D8AD56] to-[#AD7E28] border-2 border-[#FFE8A3] shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.75),inset_0_-2.5px_3px_rgba(100,68,14,0.7),0_10px_26px_rgba(0,0,0,0.85),0_0_20px_rgba(212,175,55,0.35)] scale-102"
                  : "bg-gradient-to-b from-[#0c2449]/95 via-[#071933]/95 to-[#030e20] border border-[#1d3f6d] hover:border-[#2b5894] shadow-[inset_0_1px_0.5px_rgba(255,255,255,0.22),inset_0_-1.5px_2px_rgba(0,0,0,0.85),0_6px_18px_rgba(0,0,0,0.65),0_1px_3px_rgba(0,0,0,0.75)] hover:from-[#112f5a] hover:via-[#092244] hover:to-[#051328] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.32),inset_0_-1.5px_2px_rgba(0,0,0,0.85),0_10px_24px_rgba(0,0,0,0.8)] hover:scale-101 active:translate-y-[0.5px] active:shadow-[inset_0_1.5px_2.5px_rgba(0,0,0,0.9),0_1px_2px_rgba(0,0,0,0.5)]"
              }`}
            >
              {/* Top Icon */}
              <div className="flex items-center justify-center pt-0.5">
                <PlayCircle
                  className={`w-[clamp(14px,1.4cqw,20px)] h-[clamp(14px,1.4cqw,20px)] stroke-[1.9] ${
                    normalizedTab === "MEETING_MODE"
                      ? "text-[#1A1202] drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)]"
                      : "text-[#F1CB6C] group-hover:text-[#FDE295] drop-shadow-[0_2px_3.5px_rgba(0,0,0,0.85)] group-hover:scale-105 transition-all"
                  }`}
                />
              </div>

              {/* Title & Subtitle */}
              <div className="flex flex-col items-center">
                <span
                  className={`font-serif font-black text-[clamp(9px,1.1cqw,14px)] tracking-wider uppercase leading-tight ${
                    normalizedTab === "MEETING_MODE"
                      ? "text-[#1A1202] drop-shadow-[0_1px_1px_rgba(255,255,255,0.3)]"
                      : "text-[#FFF4D4] group-hover:text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                  }`}
                >
                  MEETING MODE
                </span>
                <span
                  className={`text-[clamp(7px,0.8cqw,10.5px)] font-medium leading-tight mt-0.5 ${
                    normalizedTab === "MEETING_MODE"
                      ? "text-[#3A2808] font-semibold"
                      : "text-[#8EA6C9] group-hover:text-[#B0C7E8] drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.8)]"
                  }`}
                >
                  Run the meeting
                </span>
              </div>

              {/* Bottom Number Badge: ( 3 ) */}
              <div
                className={`w-[clamp(15px,1.4cqw,20px)] h-[clamp(15px,1.4cqw,20px)] rounded-full flex items-center justify-center font-bold text-[clamp(8.5px,0.85cqw,11px)] ${
                  normalizedTab === "MEETING_MODE"
                    ? "bg-gradient-to-b from-[#FFEAB5] to-[#E3BE6A] text-[#1A1202] border border-[#8C6B25] shadow-[0_1.5px_3px_rgba(0,0,0,0.5),inset_0_1px_0.5px_rgba(255,255,255,0.7)]"
                    : "bg-gradient-to-b from-[#040E1B] to-[#01060D] text-[#8EA6C9] border border-[#162D4A] shadow-[inset_0_1px_2px_rgba(0,0,0,0.9),0_1px_0.5px_rgba(255,255,255,0.1)] group-hover:border-[#2B5894] group-hover:text-white"
                }`}
              >
                3
              </div>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

export default MeetingWorkspaceAnimatedHeader;
