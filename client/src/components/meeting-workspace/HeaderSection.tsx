import React from "react";
import { ArrowLeft, Sparkles, Shield, User, FileCheck, CheckCircle2, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MeetingWorkspaceStatus, WorkspaceTab } from "./types";

interface HeaderSectionProps {
  studentName: string;
  meetingDate: string;
  meetingType: string;
  status: MeetingWorkspaceStatus;
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  onBack: () => void;
  onStartLiveMeeting: () => void;
}

export function HeaderSection({
  studentName,
  meetingDate,
  meetingType,
  status,
  activeTab,
  onSelectTab,
  onBack,
  onStartLiveMeeting,
}: HeaderSectionProps) {
  const tabs: { key: WorkspaceTab; label: string; icon: any; highlight?: boolean }[] = [
    { key: "PREP", label: "PREP", icon: Sparkles },
    { key: "BLUEPRINT", label: "BLUEPRINT", icon: FileCheck },
    { key: "MEETING_MODE", label: "⚡ MEETING MODE", icon: PlayCircle, highlight: true },
    { key: "ADVOCATE_READY", label: "ADVOCATE READY", icon: Shield },
    { key: "PARENT_READY", label: "PARENT READY", icon: User },
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
          <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-[#092244]/90 border border-[#144A7E] text-xs shrink-0">
            <span className="text-blue-300/70">Student:</span>
            <span className="font-bold text-white tracking-wide">{studentName}</span>
            <span className="text-blue-400/40">·</span>
            <span className="text-blue-200">{meetingType}</span>
            <span className="text-blue-400/40">·</span>
            <span className="text-amber-300/90 font-mono text-[11.5px]">{meetingDate}</span>
          </div>
        </div>

        {/* Meeting Status & Quick Action */}
        <div className="flex items-center gap-2.5 shrink-0">
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

        {/* 5 Primary Workspace View Tabs (Grid Layout, No Overflow/Scrollbar) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 sm:gap-2 p-1.5 rounded-xl bg-[#061B35] border border-[#0F3C6D] shadow-inner">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onSelectTab(tab.key)}
                className={cn(
                  "min-w-0 h-9 px-2 sm:px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none",
                  isActive
                    ? tab.highlight
                      ? "bg-gradient-to-r from-[#F5B544] to-amber-500 text-[#07162B] font-extrabold shadow-[0_2px_12px_rgba(245,181,68,0.4)]"
                      : "bg-[#0E427B] text-[#F5B544] border border-[#2368B2] shadow-[0_2px_8px_rgba(0,0,0,0.4)] font-bold"
                    : tab.highlight
                    ? "text-[#F5B544] hover:bg-amber-400/10 hover:text-amber-200 border border-amber-500/30"
                    : "text-blue-200/80 hover:text-white hover:bg-white/[0.08] border border-transparent"
                )}
              >
                <Icon
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    isActive ? (tab.highlight ? "text-[#07162B]" : "text-[#F5B544]") : "text-blue-300/70"
                  )}
                />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
