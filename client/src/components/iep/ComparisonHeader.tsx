import React, { useRef } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  FolderOpen,
  Download,
  ArrowLeftRight,
  ChevronDown,
  Check,
  Upload,
  User,
  ArrowLeft,
  GitCompare,
  Columns3,
  Mail,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import PageIdBadge from "@/components/PageIdBadge";
import { IEP_VERSION_OPTIONS, IepVersionOption } from "./types";

interface ComparisonHeaderProps {
  currentView: "split" | "board";
  onViewChange: (view: "split" | "board") => void;
  oldVersion: IepVersionOption;
  newVersion: IepVersionOption;
  onSelectOldVersion: (version: IepVersionOption) => void;
  onSelectNewVersion: (version: IepVersionOption) => void;
  onUploadOldFile: (file: File) => void;
  onUploadNewFile: (file: File) => void;
  onToggleFilePickerModal: () => void;
  onOpenSchoolEmailModal: () => void;
  flaggedProblemCount: number;
  onPrintBrief: () => void;
  onBackToTools: () => void;
  studentName?: string;
  studentGrade?: string;
}

export function ComparisonHeader({
  currentView,
  onViewChange,
  oldVersion,
  newVersion,
  onSelectOldVersion,
  onSelectNewVersion,
  onUploadOldFile,
  onUploadNewFile,
  onToggleFilePickerModal,
  onOpenSchoolEmailModal,
  flaggedProblemCount,
  onPrintBrief,
  onBackToTools,
  studentName = "Michael Sheep",
  studentGrade = "8th Grade",
}: ComparisonHeaderProps) {
  const oldFileInputRef = useRef<HTMLInputElement>(null);
  const newFileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3.5 text-left">
      {/* Hidden Direct File Inputs so user can upload Old (Left) or New (Right) with 1 click */}
      <input
        ref={oldFileInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUploadOldFile(file);
          e.target.value = "";
        }}
      />
      <input
        ref={newFileInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUploadNewFile(file);
          e.target.value = "";
        }}
      />

      {/* ── TOP HEADER BAR: TITLE + STUDENT SUBTITLE + VIEW TOGGLE / CHANGE FILES / EXPORT ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onBackToTools}
            className="mt-1.5 p-2 rounded-lg bg-[#0A1326] border border-[#22304D] text-[#9AA4BC] hover:text-white hover:border-[#3E5280] transition-colors cursor-pointer"
            title="Back to Tools"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div>
            <div className="flex items-center gap-3">
              <h1
                className="text-3xl sm:text-[38px] font-bold text-[#FBF6EC] tracking-tight leading-none"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                IEP Comparator
              </h1>
              <PageIdBadge id="PG-010-IEP" />
            </div>

            <div className="flex items-center gap-2 text-[14px] text-[#B8C2D8] mt-2">
              <User className="h-3.5 w-3.5 text-[#8E98B4]" />
              <span className="font-medium text-[#E5E9F5]">{studentName}</span>
              <span className="text-[#5E6B8A]">/</span>
              <span>{studentGrade}</span>
            </div>
          </div>
        </div>

        {/* Top-Right Action Buttons: View Switcher (Main Split vs Connected Cards), Change files & Export brief */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
          {/* View Mode Toggle: Main Split View vs Connected Cards View */}
          <div className="inline-flex p-1 rounded-lg bg-[#070E1F] border border-[#28385C]">
            <button
              type="button"
              onClick={() => onViewChange("split")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                currentView === "split"
                  ? "bg-[#2C336A] text-white border border-[#6E78FF]/60 shadow-sm"
                  : "text-[#9AA6C4] hover:text-white"
              }`}
              title="Main Split Comparison View"
            >
              <Columns3 className="h-3.5 w-3.5" />
              <span>Main View</span>
            </button>
            <button
              type="button"
              onClick={() => onViewChange("board")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                currentView === "board"
                  ? "bg-[#2C336A] text-white border border-[#6E78FF]/60 shadow-sm"
                  : "text-[#9AA6C4] hover:text-white"
              }`}
              title="Connected Cards Circuit View (with connecting lines)"
            >
              <GitCompare className="h-3.5 w-3.5" />
              <span>Cards View</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleFilePickerModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0B1428] hover:bg-[#12203D] border border-[#2A3958] hover:border-[#496090] text-[13.5px] font-medium text-[#E6EBF8] transition-all cursor-pointer shadow-sm"
          >
            <FolderOpen className="h-4 w-4 text-[#A9B4D0]" />
            <span>Change files</span>
          </button>

          <button
            type="button"
            onClick={onPrintBrief}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0B1428] hover:bg-[#12203D] border border-[#2A3958] hover:border-[#496090] text-[13.5px] font-medium text-[#E6EBF8] transition-all cursor-pointer shadow-sm"
          >
            <Download className="h-4 w-4 text-[#A9B4D0]" />
            <span>Export brief</span>
          </button>
        </div>
      </div>

      {/* ── SIMPLE OLD (LEFT) vs. NEW (RIGHT) FILE SELECTOR BAR ── */}
      <div className="w-full rounded-xl bg-[#070E1F]/95 border border-[#1E2B4A] px-4 py-2.5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.85)] flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-5">
        {/* LEFT PILL: ALWAYS OLD / PREVIOUS FILE */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="w-full sm:w-auto min-w-[250px] inline-flex items-center justify-between gap-3 px-4 py-2 rounded-lg bg-[#0D162B] hover:bg-[#13203B] border border-[#2C3A5E] hover:border-[#4D6194] text-[13px] text-[#DCE2F2] transition-all cursor-pointer shadow-sm group"
              title="Choose Old / Previous IEP File (Always on Left)"
            >
              <div className="flex items-center gap-2.5 truncate">
                <FileText className="h-4 w-4 text-[#9AA6C4] shrink-0" />
                <span className="uppercase tracking-wider text-[11px] font-bold text-[#A6B2D0]">
                  PREVIOUS
                </span>
                <span className="text-[#5C698A]">•</span>
                <span className="font-medium text-[#F3F6FF] truncate">
                  {oldVersion.date}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-[#7E8AA8] group-hover:text-white shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="center"
            className="bg-[#0B1528] border border-[#2A3958] text-[#E6EBF8] w-72 z-50 p-1.5 shadow-2xl"
          >
            <DropdownMenuLabel className="text-[10.5px] uppercase tracking-wider text-[#9AA6C4]">
              Left Side · Old / Previous IEP
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[#1E2B48]" />
            {IEP_VERSION_OPTIONS.map((v) => (
              <DropdownMenuItem
                key={v.id}
                onClick={() => onSelectOldVersion(v)}
                className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer hover:bg-white/[0.06]"
              >
                <div>
                  <div className="text-xs font-semibold text-white">
                    {v.date}
                  </div>
                  <div className="text-[11px] text-[#9AA6C4]">{v.badgeText}</div>
                </div>
                {oldVersion.id === v.id && (
                  <Check className="h-4 w-4 text-[#FFE394]" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="bg-[#1E2B48]" />
            <DropdownMenuItem
              onClick={() => oldFileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-xs font-semibold text-[#FFE394] hover:bg-[#162442]"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Upload Old / Previous File...</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* CENTER ARROW ICON: OLD (LEFT) ⇄ NEW (RIGHT) */}
        <div className="flex items-center justify-center text-[#7E8AA8]">
          <ArrowLeftRight className="h-4 w-4" />
        </div>

        {/* RIGHT PILL: ALWAYS NEW / PROPOSED FILE */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="w-full sm:w-auto min-w-[250px] inline-flex items-center justify-between gap-3 px-4 py-2 rounded-lg bg-gradient-to-r from-[#23275A] via-[#2B2F6B] to-[#202454] hover:brightness-110 border border-[#727CFF]/75 text-[13px] text-white transition-all cursor-pointer shadow-[0_0_22px_rgba(104,114,255,0.28)] group"
              title="Choose New / Proposed IEP File (Always on Right)"
            >
              <div className="flex items-center gap-2.5 truncate">
                <FileText className="h-4 w-4 text-[#B8C0FF] shrink-0" />
                <span className="uppercase tracking-wider text-[11px] font-bold text-[#D4D9FF]">
                  PROPOSED
                </span>
                <span className="text-[#8E96D8]">•</span>
                <span className="font-semibold text-white truncate">
                  {newVersion.date}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-[#C2C8FF] group-hover:text-white shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="center"
            className="bg-[#0B1528] border border-[#2A3958] text-[#E6EBF8] w-72 z-50 p-1.5 shadow-2xl"
          >
            <DropdownMenuLabel className="text-[10.5px] uppercase tracking-wider text-[#B8C0FF]">
              Right Side · New / Proposed IEP
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[#1E2B48]" />
            {IEP_VERSION_OPTIONS.map((v) => (
              <DropdownMenuItem
                key={v.id}
                onClick={() => onSelectNewVersion(v)}
                className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer hover:bg-white/[0.06]"
              >
                <div>
                  <div className="text-xs font-semibold text-white">
                    {v.date}
                  </div>
                  <div className="text-[11px] text-[#9AA6C4]">{v.badgeText}</div>
                </div>
                {newVersion.id === v.id && (
                  <Check className="h-4 w-4 text-[#939BFF]" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="bg-[#1E2B48]" />
            <DropdownMenuItem
              onClick={() => newFileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-xs font-semibold text-[#B8C0FF] hover:bg-[#1E2352]"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Upload New / Proposed File...</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── PARENT SCHOOL CORRECTION EMAIL NEXT-STEP BANNER ── */}
      <div className="w-full rounded-xl bg-gradient-to-r from-[#171836] via-[#121A38] to-[#0C142B] border border-[#4B3F28]/80 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-[#2A2115] border border-[#C5A059]/50 text-[#FFE394] shrink-0">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <p className="text-xs sm:text-[13.5px] text-[#EDE8DC]">
            <strong className="text-[#FFE394] font-semibold">
              Waypoint found {flaggedProblemCount}{" "}
              {flaggedProblemCount === 1 ? "problem" : "problems"}
            </strong>{" "}
            — use this email template to notify your school of any issues found
            and request IEP corrections.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenSchoolEmailModal}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-gradient-to-b from-[#E5C887] via-[#C69F56] to-[#987230] text-[#0E1322] font-bold text-xs border border-[#FCE7B6]/75 shadow-sm hover:brightness-110 transition-all cursor-pointer shrink-0 self-start sm:self-center"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          <Mail className="h-3.5 w-3.5" />
          <span>Open School Email Template ({flaggedProblemCount})</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
