import React from "react";
import { ArrowLeft, Sparkles, Shield, User, FileCheck, CheckCircle2, PlayCircle, Save, Loader2, Database, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MeetingWorkspaceStatus, WorkspaceTab } from "./types";

interface HeaderSectionProps {
  studentName: string;
  caseId?: string | null;
  meetingDate: string;
  meetingType: string;
  status: MeetingWorkspaceStatus;
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  onBack: () => void;
  onStartLiveMeeting: () => void;
  isSaving?: boolean;
  lastSavedAt?: Date | null;
  onSave?: () => void;
}

export function HeaderSection({
  studentName,
  caseId,
  meetingDate,
  meetingType,
  status,
  activeTab,
  onSelectTab,
  onBack,
  onStartLiveMeeting,
  isSaving,
  lastSavedAt,
  onSave,
}: HeaderSectionProps) {
  const normalizedActiveTab = (activeTab === "PREP" ? "ASSEMBLY" : activeTab === "PARENT_READY" ? "BLUEPRINT" : activeTab === "ADVOCATE_READY" ? "MEETING_MODE" : activeTab) as WorkspaceTab;

  const tabs: { key: WorkspaceTab; label: string; icon: any; highlight?: boolean; subtitle: string }[] = [
    { key: "ASSEMBLY", label: "✨ ASSEMBLY", icon: Sparkles, subtitle: "Build the case" },
    { key: "BLUEPRINT", label: "📋 BLUEPRINT", icon: FileCheck, subtitle: "Know the plan" },
    { key: "MEETING_MODE", label: "⚡ MEETING MODE", icon: PlayCircle, highlight: true, subtitle: "Run the meeting" },
  ];

  const getStatusBadge = () => {
    switch (status) {
      case "LIVE":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-950/90 border border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.35)] shrink-0">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            LIVE MEETING
          </span>
        );
      case "READY":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-cyan-950/90 border border-cyan-500 text-cyan-300 shrink-0">
            <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
            READY
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#06172E] border border-[#144A7E] text-blue-200 shrink-0">
            <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />
            COMPLETED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#071C3C] border border-[#144A7E] text-amber-300 shrink-0">
            <Sparkles className="h-3.5 w-3.5 text-[#F5B544]" />
            PREPARING
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 w-full">
      {/* Top action row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs h-8 border-[#0D4B84] bg-gradient-to-br from-[#0B3767] via-[#0A254D] to-[#071C3C] text-blue-200 hover:text-white hover:border-[#F5B544]/60 shadow-md cursor-pointer shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Case
          </Button>

          {/* Student chip */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-[#092244]/90 border border-[#144A7E] text-xs shrink-0 flex-wrap">
            <span className="text-blue-300/70">Student:</span>
            <span className="font-bold text-white tracking-wide">{studentName}</span>
            {caseId && (
              <span className="px-1.5 py-0.5 rounded bg-[#071C3C] border border-amber-500/40 text-[11px] font-mono font-bold text-amber-300 shadow-sm">
                Case #{caseId.replace(/^Case\s*#?/i, "")}
              </span>
            )}
            <span className="text-blue-400/40">·</span>
            <span className="text-blue-200">{meetingType}</span>
            <span className="text-blue-400/40">·</span>
            <span className="text-amber-300/90 font-mono text-[11.5px]">{meetingDate}</span>
          </div>
        </div>

        {/* Live Sync Status & Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 flex-wrap">
          {/* Cloudflare D1 Live Sync Pill */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#05162D] border border-[#144E8A] text-xs shadow-inner">
            {isSaving ? (
              <>
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                <span className="text-amber-200 font-medium flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin text-amber-400" />
                  Syncing to D1...
                </span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-emerald-300 font-medium flex items-center gap-1">
                  <Database className="h-3 w-3 text-emerald-400" />
                  <span>Saved to Cloudflare D1</span>
                  {lastSavedAt && (
                    <span className="text-blue-300/60 font-mono text-[11px] ml-1">
                      ({lastSavedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })})
                    </span>
                  )}
                </span>
              </>
            )}
          </div>

          {/* Explicit Manual Save Button */}
          {onSave && (
            <Button
              size="sm"
              onClick={onSave}
              disabled={isSaving}
              className="h-8 text-xs font-bold bg-[#0D4B84] hover:bg-[#145D9F] text-white border border-[#206BBC] px-3 cursor-pointer shadow-md inline-flex items-center gap-1.5"
              title="Save all targets, notes, and strategy to Cloudflare D1 immediately"
            >
              <Save className="h-3.5 w-3.5 text-[#F5B544]" />
              <span>Save</span>
            </Button>
          )}

          {getStatusBadge()}
          {status !== "LIVE" && status !== "COMPLETED" && (
            <Button
              size="sm"
              onClick={onStartLiveMeeting}
              className="inline-flex items-center gap-1.5 text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg border border-emerald-400/30 cursor-pointer"
            >
              <PlayCircle className="h-3.5 w-3.5" />
              Launch Live Meeting
            </Button>
          )}
        </div>
      </div>

      {/* Main Header & 5-Tab Command Bar Deck (Fits 100% without scrollbar) */}
      <div className="rounded-2xl bg-gradient-to-br from-[#0B3767] via-[#0A254D] to-[#071C3C] border border-[#0D4B84] p-3.5 sm:p-4 shadow-2xl space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span className="text-[#F5B544] select-none">⚡</span>
              <span>Meeting Workspace</span>
            </h1>
            <p className="text-xs text-blue-200/80 mt-0.5">
              Prepare, navigate, and close out IEP and 504 meetings · Single source of truth across all views
            </p>
          </div>
        </div>

        {/* 3 Primary Consolidated Stages (Assembly -> Blueprint -> Meeting Mode) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5 p-1.5 rounded-xl bg-[#061B35] border border-[#0F3C6D] shadow-inner">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = normalizedActiveTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onSelectTab(tab.key)}
                className={cn(
                  "min-w-0 h-12 px-3 py-2 rounded-lg transition-all flex items-center justify-between gap-2 cursor-pointer select-none border",
                  isActive
                    ? tab.highlight
                      ? "bg-gradient-to-r from-[#F5B544] to-amber-500 text-[#07162B] border-amber-300 shadow-[0_2px_14px_rgba(245,181,68,0.45)] font-extrabold"
                      : "bg-[#0E427B] text-[#F5B544] border-[#2368B2] shadow-[0_2px_8px_rgba(0,0,0,0.4)] font-bold"
                    : tab.highlight
                    ? "bg-[#092244]/80 text-[#F5B544] hover:bg-amber-400/15 hover:text-amber-200 border-amber-500/40 shadow-sm"
                    : "text-blue-200/80 hover:text-white hover:bg-white/[0.08] border-transparent"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive ? (tab.highlight ? "text-[#07162B]" : "text-[#F5B544]") : (tab.highlight ? "text-[#F5B544]" : "text-blue-300/70")
                    )}
                  />
                  <div className="text-left truncate">
                    <div className={cn("text-xs font-bold truncate leading-tight", isActive && tab.highlight ? "text-[#07162B]" : "")}>
                      {tab.label}
                    </div>
                    <div className={cn("text-[10px] truncate leading-tight", isActive && tab.highlight ? "text-[#07162B]/80 font-medium" : "text-blue-300/60")}>
                      {tab.subtitle}
                    </div>
                  </div>
                </div>

                {tab.highlight && !isActive && (
                  <span className="text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40 shrink-0">
                    Primary
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
