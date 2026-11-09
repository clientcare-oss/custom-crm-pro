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
  StickyNote,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import PageIdBadge from "@/components/PageIdBadge";
import {
  IEP_VERSION_OPTIONS,
  IepVersionOption,
  type ComparatorWorkspaceView,
} from "./types";

interface ComparisonHeaderProps {
  currentView: ComparatorWorkspaceView;
  onViewChange: (view: ComparatorWorkspaceView) => void;
  userPreferredView?: ComparatorWorkspaceView | null;
  orgDefaultView?: ComparatorWorkspaceView;
  onSetUserPreferredView?: (view: ComparatorWorkspaceView | null) => void;
  onSetOrgDefaultView?: (view: ComparatorWorkspaceView) => void;
  advocateMode?: boolean;
  onToggleAdvocateMode?: () => void;
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
  userPreferredView = null,
  orgDefaultView = "original_documents",
  onSetUserPreferredView,
  onSetOrgDefaultView,
  advocateMode = false,
  onToggleAdvocateMode,
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

  const viewOptions: Array<{
    id: ComparatorWorkspaceView;
    label: string;
    icon: React.ReactNode;
  }> = [
    {
      id: "original_documents",
      label: "Original Documents",
      icon: <Columns3 className="h-3.5 w-3.5" />,
    },
    {
      id: "cards",
      label: "Cards",
      icon: <GitCompare className="h-3.5 w-3.5" />,
    },
    {
      id: "notes",
      label: "Notes",
      icon: <StickyNote className="h-3.5 w-3.5" />,
    },
  ];

  return (
    <div className="space-y-3 text-left">
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

      {/* ── TOP HEADER BAR: TITLE + STUDENT SUBTITLE + 3-VIEW SELECTOR / PREFERENCES / ACTIONS ── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3.5">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onBackToTools}
            className="mt-1 p-2 rounded-lg bg-[#0A1326] border border-[#22304D] text-[#9AA4BC] hover:text-white hover:border-[#3E5280] transition-colors cursor-pointer"
            title="Back to Tools"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div>
            <div className="flex items-center gap-3">
              <h1
                className="text-2xl sm:text-3xl font-bold text-[#FBF6EC] tracking-tight leading-none"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                IEP Comparator
              </h1>
              <PageIdBadge id="PG-010-IEP" />
            </div>

            <div className="flex items-center gap-2 text-xs sm:text-[13px] text-[#B8C2D8] mt-1.5">
              <User className="h-3.5 w-3.5 text-[#8E98B4]" />
              <span className="font-medium text-[#E5E9F5]">{studentName}</span>
              <span className="text-[#5E6B8A]">/</span>
              <span>{studentGrade}</span>
            </div>
          </div>
        </div>

        {/* Center/Right Connected 3-Way View Selector: Original Documents | Cards | Notes */}
        <div className="flex flex-wrap items-center gap-2 self-start xl:self-center">
          <div
            role="tablist"
            aria-label="Comparison Workspace Views"
            className="inline-flex p-1 rounded-xl bg-[#050C20] border border-[#22325A] shadow-inner"
          >
            {viewOptions.map((opt) => {
              const active = currentView === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onViewChange(opt.id)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? "bg-gradient-to-r from-[#2B255A] to-[#212858] text-white border border-[#727CFF]/65 shadow-[0_2px_12px_rgba(110,120,255,0.28)]"
                      : "text-[#9AA6C4] hover:text-white border border-transparent"
                  }`}
                >
                  {opt.icon}
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>

          {/* View Preference Settings Dropdown (Staff Override + Organization Default) */}
          {(onSetUserPreferredView || onSetOrgDefaultView) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="p-2 rounded-lg bg-[#0B1428] hover:bg-[#12203D] border border-[#2A3958] text-[#A9B4D0] hover:text-white transition-all cursor-pointer"
                  title="Workspace View Preferences (Staff & Organization Default)"
                  aria-label="View preferences"
                >
                  <Settings2 className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-[#0B1528] border border-[#2A3958] text-[#E6EBF8] w-72 z-50 p-1.5 shadow-2xl"
              >
                <DropdownMenuLabel className="text-[10.5px] uppercase tracking-wider text-[#9AA6C4]">
                  My Default View (Overrides Org)
                </DropdownMenuLabel>
                {viewOptions.map((opt) => (
                  <DropdownMenuItem
                    key={`user-${opt.id}`}
                    onClick={() => onSetUserPreferredView?.(opt.id)}
                    className="flex items-center justify-between px-3 py-1.5 rounded-lg cursor-pointer text-xs hover:bg-white/[0.06]"
                  >
                    <span>Always open in {opt.label}</span>
                    {userPreferredView === opt.id && (
                      <Check className="h-3.5 w-3.5 text-[#FFE394]" />
                    )}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem
                  onClick={() => onSetUserPreferredView?.(null)}
                  className="flex items-center justify-between px-3 py-1.5 rounded-lg cursor-pointer text-xs text-slate-400 hover:bg-white/[0.06]"
                >
                  <span>Use Organization Default</span>
                  {userPreferredView === null && (
                    <Check className="h-3.5 w-3.5 text-[#FFE394]" />
                  )}
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-[#1E2B48]" />
                <DropdownMenuLabel className="text-[10.5px] uppercase tracking-wider text-[#B8C0FF]">
                  Organization Default View
                </DropdownMenuLabel>
                {viewOptions.map((opt) => (
                  <DropdownMenuItem
                    key={`org-${opt.id}`}
                    onClick={() => onSetOrgDefaultView?.(opt.id)}
                    className="flex items-center justify-between px-3 py-1.5 rounded-lg cursor-pointer text-xs hover:bg-white/[0.06]"
                  >
                    <span>Org Default: {opt.label}</span>
                    {orgDefaultView === opt.id && (
                      <Check className="h-3.5 w-3.5 text-[#939BFF]" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Advocate Mode Toggle */}
          {onToggleAdvocateMode && (
            <button
              type="button"
              onClick={onToggleAdvocateMode}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                advocateMode
                  ? "bg-[#241B12] border-[#C5A059]/70 text-[#FFE394]"
                  : "bg-[#0B1428] border-[#2A3958] text-[#A9B4D0] hover:text-white"
              }`}
              title="Toggle Advocate Mode telemetry & suggested team questions"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Advocate Mode</span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggleFilePickerModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0B1428] hover:bg-[#12203D] border border-[#2A3958] hover:border-[#496090] text-xs font-medium text-[#E6EBF8] transition-all cursor-pointer shadow-sm"
          >
            <FolderOpen className="h-3.5 w-3.5 text-[#A9B4D0]" />
            <span>Change files</span>
          </button>

          <button
            type="button"
            onClick={onPrintBrief}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0B1428] hover:bg-[#12203D] border border-[#2A3958] hover:border-[#496090] text-xs font-medium text-[#E6EBF8] transition-all cursor-pointer shadow-sm"
          >
            <Download className="h-3.5 w-3.5 text-[#A9B4D0]" />
            <span>Export brief</span>
          </button>
        </div>
      </div>

      {/* ── SIMPLE OLD (LEFT) vs. NEW (RIGHT) FILE SELECTOR BAR + SCHOOL EMAIL CTA ── */}
      <div className="w-full rounded-xl bg-[#070E1F]/95 border border-[#1E2B4A] px-3.5 py-2 shadow-[inset_0_2px_10px_rgba(0,0,0,0.85)] flex flex-col lg:flex-row items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-4 w-full lg:w-auto justify-center">
          {/* LEFT PILL: ALWAYS OLD / PREVIOUS FILE */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="w-full sm:w-auto min-w-[230px] inline-flex items-center justify-between gap-3 px-3.5 py-1.5 rounded-lg bg-[#0D162B] hover:bg-[#13203B] border border-[#2C3A5E] hover:border-[#4D6194] text-xs text-[#DCE2F2] transition-all cursor-pointer shadow-sm group"
                title="Choose Old / Previous IEP File (Always on Left)"
              >
                <div className="flex items-center gap-2 truncate">
                  <FileText className="h-3.5 w-3.5 text-[#9AA6C4] shrink-0" />
                  <span className="uppercase tracking-wider text-[10.5px] font-bold text-[#A6B2D0]">
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
            <ArrowLeftRight className="h-3.5 w-3.5" />
          </div>

          {/* RIGHT PILL: ALWAYS NEW / PROPOSED FILE */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="w-full sm:w-auto min-w-[230px] inline-flex items-center justify-between gap-3 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#23275A] via-[#2B2F6B] to-[#202454] hover:brightness-110 border border-[#727CFF]/75 text-xs text-white transition-all cursor-pointer shadow-[0_0_18px_rgba(104,114,255,0.25)] group"
                title="Choose New / Proposed IEP File (Always on Right)"
              >
                <div className="flex items-center gap-2 truncate">
                  <FileText className="h-3.5 w-3.5 text-[#B8C0FF] shrink-0" />
                  <span className="uppercase tracking-wider text-[10.5px] font-bold text-[#D4D9FF]">
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

        {/* Compact School Correction Email Trigger */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 pt-2 lg:pt-0 border-[#182344]">
          <div className="flex items-center gap-2 text-xs text-[#EDE8DC]">
            <AlertTriangle className="h-3.5 w-3.5 text-[#FFE394] shrink-0" />
            <span>
              <strong className="text-[#FFE394] font-semibold">
                {flaggedProblemCount} {flaggedProblemCount === 1 ? "issue" : "issues"}
              </strong>{" "}
              flagged for school notice
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenSchoolEmailModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-b from-[#E5C887] via-[#C69F56] to-[#987230] text-[#0E1322] font-bold text-xs border border-[#FCE7B6]/75 shadow-sm hover:brightness-110 transition-all cursor-pointer shrink-0"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            <Mail className="h-3 w-3" />
            <span>School Email Template</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
