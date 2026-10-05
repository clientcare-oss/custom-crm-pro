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
    { key: "BLUEPRINT", label: "📋 BLUEPRINT", icon: FileCheck, subtitle: "Discuss with parents and edit" },
    { key: "MEETING_MODE", label: "⚡ MEETING MODE", icon: PlayCircle, highlight: true, subtitle: "Run the meeting" },
  ];

  const getStatusBadge = () => {
    switch (status) {
      case "LIVE":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-950/90 border border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.35)] shrink-0 font-mono">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            LIVE MEETING
          </span>
        );
      case "READY":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-cyan-950/90 border border-cyan-500 text-cyan-300 shrink-0 font-mono">
            <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
            READY
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-[#020A17] border border-[#3A2C18] text-[#C6B697] shrink-0 font-mono">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#FFE394]" />
            COMPLETED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-[#020A17] border border-[#3A2C18] text-[#FFE394] shrink-0 font-mono">
            <Sparkles className="h-3.5 w-3.5 text-[#DFBE77]" />
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
            className="inline-flex items-center gap-2 text-xs h-8 border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] hover:border-[#C5A059]/60 shadow-md cursor-pointer shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Case
          </Button>

          {/* Student chip */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-[#05142B]/90 border border-[#3A2C18] text-xs shrink-0 flex-wrap shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
            <span className="text-[#A69371]">Student:</span>
            <span className="font-bold text-[#FFF4D4] tracking-wide">{studentName}</span>
            {caseId && (
              <span className="px-1.5 py-0.5 rounded-lg bg-[#020A17] border border-[#3A2C18] text-[11px] font-mono font-bold text-[#FFE394] shadow-inner">
                Case #{caseId.replace(/^Case\s*#?/i, "")}
              </span>
            )}
            <span className="text-[#3A2C18]">·</span>
            <span className="text-[#C6B697]">{meetingType}</span>
            <span className="text-[#3A2C18]">·</span>
            <span className="text-[#FFE394] font-mono text-[11.5px]">{meetingDate}</span>
          </div>
        </div>

        {/* Live Sync Status & Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 flex-wrap">
          {/* Cloudflare D1 Live Sync Pill */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[#020A17]/90 border border-[#3A2C18] text-xs shadow-inner">
            {isSaving ? (
              <>
                <span className="h-2 w-2 rounded-full bg-[#FFE394] animate-ping" />
                <span className="text-[#FFE394] font-medium flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin text-[#FFE394]" />
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
                    <span className="text-[#A69371] font-mono text-[11px] ml-1">
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
              className="h-8 text-xs font-bold border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] hover:border-[#C5A059]/60 px-3 cursor-pointer shadow-md inline-flex items-center gap-1.5"
              title="Save all targets, notes, and strategy to Cloudflare D1 immediately"
            >
              <Save className="h-3.5 w-3.5 text-[#DFBE77]" />
              <span>Save</span>
            </Button>
          )}

          {getStatusBadge()}
          {status !== "LIVE" && status !== "COMPLETED" && (
            <Button
              size="sm"
              onClick={onStartLiveMeeting}
              className="inline-flex items-center gap-1.5 text-xs font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)] hover:brightness-105 cursor-pointer transition-all"
            >
              <PlayCircle className="h-3.5 w-3.5" />
              Launch Live Meeting
            </Button>
          )}
        </div>
      </div>

      {/* Main Header & 5-Tab Command Bar Deck (Fits 100% without scrollbar) */}
      <div className="rounded-xl bg-[#05142B]/90 border border-[#3A2C18] p-3.5 sm:p-4 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-serif font-black tracking-wide text-[#FFF4D4] flex items-center gap-2">
              <span className="text-[#DFBE77] select-none">⚡</span>
              <span>Meeting Workspace</span>
            </h1>
            <p className="text-xs text-[#C6B697] mt-0.5">
              Prepare, navigate, and close out IEP and 504 meetings · Single source of truth across all views
            </p>
          </div>
        </div>

        {/* 3 Primary Consolidated Stages (Assembly -> Blueprint -> Meeting Mode) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5 p-1.5 rounded-lg bg-[#020A17]/80 border border-[#3A2C18]/60 shadow-inner">
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
                    ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)]"
                    : "border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] hover:border-[#C5A059]/40"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive ? "text-[#07162B]" : tab.highlight ? "text-[#DFBE77]" : "text-[#A69371]"
                    )}
                  />
                  <div className="text-left truncate">
                    <div className={cn("text-xs font-bold truncate leading-tight", isActive ? "text-[#07162B]" : "text-[#FFF4D4]")}>
                      {tab.label}
                    </div>
                    <div className={cn("text-[10px] truncate leading-tight", isActive ? "text-[#07162B]/85 font-medium" : "text-[#C6B697]")}>
                      {tab.subtitle}
                    </div>
                  </div>
                </div>

                {tab.highlight && !isActive && (
                  <span className="text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-[#C5A059]/20 text-[#FFE394] border border-[#C5A059]/40 shrink-0 font-mono">
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
