import React, { useRef, useState } from "react";
import {
  FolderOpen,
  Download,
  Mail,
  Columns2,
  Layers,
  StickyNote,
  Settings2,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";
import { IepVersionOption, type ComparatorWorkspaceView } from "./types";

interface ComparisonHeaderProps {
  currentView: ComparatorWorkspaceView;
  onViewChange: (view: ComparatorWorkspaceView) => void;
  userPreferredView: ComparatorWorkspaceView | null;
  orgDefaultView: ComparatorWorkspaceView;
  onSetUserPreferredView: (view: ComparatorWorkspaceView | null) => void;
  onSetOrgDefaultView: (view: ComparatorWorkspaceView) => void;
  advocateMode: boolean;
  onToggleAdvocateMode: () => void;
  oldVersion: IepVersionOption;
  newVersion: IepVersionOption;
  onSelectOldVersion: (v: IepVersionOption) => void;
  onSelectNewVersion: (v: IepVersionOption) => void;
  onUploadOldFile: (file: File) => void;
  onUploadNewFile: (file: File) => void;
  onToggleFilePickerModal: () => void;
  onOpenSchoolEmailModal: () => void;
  flaggedProblemCount: number;
  onPrintBrief: () => void;
  onBackToTools?: () => void;
  studentName?: string;
  studentGrade?: string;
}

export function ComparisonHeader({
  currentView,
  onViewChange,
  userPreferredView,
  orgDefaultView,
  onSetUserPreferredView,
  onSetOrgDefaultView,
  advocateMode,
  onToggleAdvocateMode,
  onUploadOldFile,
  onUploadNewFile,
  onToggleFilePickerModal,
  onOpenSchoolEmailModal,
  flaggedProblemCount,
  onPrintBrief,
  onBackToTools,
  studentName = "Michael Sheep",
  studentGrade = "Grade 8",
}: ComparisonHeaderProps) {
  const oldFileInputRef = useRef<HTMLInputElement>(null);
  const newFileInputRef = useRef<HTMLInputElement>(null);
  const [prefMenuOpen, setPrefMenuOpen] = useState(false);

  const viewTabs: Array<{
    id: ComparatorWorkspaceView;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: "original_documents",
      label: "Original documents",
      icon: Columns2,
    },
    {
      id: "cards",
      label: "Cards",
      icon: Layers,
    },
    {
      id: "notes",
      label: "Notes",
      icon: StickyNote,
    },
  ];

  const viewLabelMap: Record<ComparatorWorkspaceView, string> = {
    original_documents: "Original documents",
    cards: "Cards",
    notes: "Notes",
  };

  return (
    <div className="space-y-2 text-left relative">
      {/* Hidden inputs for direct file uploads */}
      <input
        ref={oldFileInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUploadOldFile(f);
        }}
      />
      <input
        ref={newFileInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUploadNewFile(f);
        }}
      />

      {/* Ambient Top Violet/Indigo Light Wave (Matches Picture) */}
      <div
        className="pointer-events-none absolute -top-3 right-32 w-[480px] h-16 opacity-60 blur-2xl"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(124,106,230,0.45) 0%, rgba(88,70,190,0.18) 55%, transparent 100%)",
        }}
      />

      {/* ── ROW 1: TOP TITLE BAR (IEP Comparator | Michael Sheep / Grade 8 ... Change files | Export) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-0.5 pb-1.5 border-b border-[#1A2542]/80 relative z-10">
        {/* Left: Title + Student Name / Grade + PG-010-IEP */}
        <div className="flex flex-wrap items-center gap-3">
          {onBackToTools && (
            <button
              type="button"
              onClick={onBackToTools}
              className="p-1.5 rounded-lg bg-[#091328] hover:bg-[#112040] border border-[#223052] text-[#A6B3D0] hover:text-white transition-all cursor-pointer"
              title="Back to Tools"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
          )}

          <h1
            className="text-xl sm:text-[23px] font-bold tracking-tight text-[#FBF6EC] leading-none"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            IEP Comparator
          </h1>

          <span className="text-[#2C3B5E] text-lg font-light select-none">|</span>

          <span className="text-sm text-[#B8C4DE] font-medium">
            {studentName} <span className="text-[#6E7D9E]">/</span>{" "}
            {studentGrade === "8th Grade" ? "Grade 8" : studentGrade}
          </span>

          <span className="px-1.5 py-0.5 rounded bg-[#0A142B] border border-[#263558] text-[9.5px] font-mono font-semibold text-[#8E9BB8]">
            PG-010-IEP
          </span>
        </div>

        {/* Right: Change files + Export + Subtle Quick Utilities */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenSchoolEmailModal}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#091328] hover:bg-[#122244] border border-[#243356] text-xs font-medium text-[#C8D2EC] hover:text-white transition-all cursor-pointer"
            title="Draft Parent-to-School IEP Correction Email"
          >
            <Mail className="h-3.5 w-3.5 text-[#DFBE77]" />
            <span className="hidden md:inline">Email School</span>
            {flaggedProblemCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#DFBE77] text-[#07162B] text-[10px] font-bold">
                {flaggedProblemCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onToggleFilePickerModal}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#0B152C] hover:bg-[#132244] border border-[#2A3B63] text-xs font-medium text-[#E2E8F8] hover:text-white transition-all cursor-pointer shadow-sm"
          >
            <FolderOpen className="h-3.5 w-3.5 text-[#DFBE77]" />
            <span>Change files</span>
          </button>

          <button
            type="button"
            onClick={onPrintBrief}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-b from-[#E5C887] via-[#C69F56] to-[#987230] text-[#07162B] font-bold text-xs border border-[#FFE394]/70 shadow-[0_4px_14px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.5)] hover:brightness-105 transition-all cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* ── ROW 2: FOLDER TABS (Original documents | Cards | Notes) ── */}
      <div className="flex items-center justify-between gap-2 pt-0.5 px-1">
        <div
          role="tablist"
          aria-label="IEP Comparator Workspace Views"
          className="inline-flex items-center gap-1.5"
        >
          {viewTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onViewChange(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-b from-[#E5C887] via-[#C69F56] to-[#9E7936] text-[#07162B] font-bold border border-[#FFE394]/80 shadow-[0_4px_14px_rgba(197,160,89,0.3)]"
                    : "bg-transparent hover:bg-[#0D1A36] text-[#B8C4DE] hover:text-white font-medium border border-transparent"
                }`}
              >
                <Icon
                  className={`h-3.5 w-3.5 ${
                    isActive ? "text-[#07162B]" : "text-[#8E9BB8]"
                  }`}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Subtle Right Utilities: Advocate Mode & View Preferences */}
        <div className="flex items-center gap-1.5 relative">
          <button
            type="button"
            onClick={onToggleAdvocateMode}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all cursor-pointer ${
              advocateMode
                ? "bg-[#241E12] border-[#C5A059]/60 text-[#FFE394]"
                : "bg-transparent border-transparent text-[#8E9BB8] hover:text-white"
            }`}
            title="Toggle Advocate Mode"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Advocate Mode</span>
          </button>

          <button
            type="button"
            onClick={() => setPrefMenuOpen((prev) => !prev)}
            className="p-1.5 rounded-lg text-[#8E9BB8] hover:text-white hover:bg-[#0D1A36] transition-all cursor-pointer"
            title="Default View Preferences"
          >
            <Settings2 className="h-3.5 w-3.5" />
          </button>

          {prefMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 z-50 w-72 rounded-xl bg-[#071329] border border-[#2B3B60] shadow-[0_18px_45px_rgba(0,0,0,0.9)] p-3.5 space-y-3 text-left">
              <div className="flex items-center justify-between border-b border-[#1C2846] pb-2">
                <span className="text-xs font-bold text-[#FFF4D4]">
                  Default View Preference
                </span>
                <button
                  type="button"
                  onClick={() => setPrefMenuOpen(false)}
                  className="text-[11px] text-[#9AA6C4] hover:text-white cursor-pointer"
                >
                  Close
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#9AA6C4]">
                  My Staff Default
                </label>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => onSetUserPreferredView(null)}
                    className={`px-2 py-1 rounded text-[11px] border text-left cursor-pointer ${
                      userPreferredView === null
                        ? "bg-[#C5A059]/20 border-[#C5A059] text-[#FFF4D4] font-semibold"
                        : "bg-[#040B1A] border-[#1E2B4A] text-[#9AA6C4]"
                    }`}
                  >
                    Use Org Default
                  </button>
                  {(["original_documents", "cards", "notes"] as ComparatorWorkspaceView[]).map(
                    (v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => onSetUserPreferredView(v)}
                        className={`px-2 py-1 rounded text-[11px] border text-left cursor-pointer ${
                          userPreferredView === v
                            ? "bg-[#C5A059]/20 border-[#C5A059] text-[#FFF4D4] font-semibold"
                            : "bg-[#040B1A] border-[#1E2B4A] text-[#9AA6C4]"
                        }`}
                      >
                        {viewLabelMap[v]}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-[#1C2846]">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#9AA6C4]">
                  Organization Default
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {(["original_documents", "cards", "notes"] as ComparatorWorkspaceView[]).map(
                    (v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => onSetOrgDefaultView(v)}
                        className={`px-2 py-1 rounded text-[10px] border text-center cursor-pointer ${
                          orgDefaultView === v
                            ? "bg-[#C5A059]/20 border-[#C5A059] text-[#FFE394] font-semibold"
                            : "bg-[#040B1A] border-[#1E2B4A] text-[#9AA6C4]"
                        }`}
                      >
                        {viewLabelMap[v]}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
