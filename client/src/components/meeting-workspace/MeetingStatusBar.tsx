import React from "react";
import { Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageIdBadge from "@/components/PageIdBadge";
import type { MeetingWorkspaceStatus } from "./types";

interface MeetingStatusBarProps {
  isSaving: boolean;
  lastSavedAt: Date | null;
  meetingStatus: MeetingWorkspaceStatus;
  onLaunchLiveMeeting: () => void;
}

export function MeetingStatusBar({
  isSaving,
  lastSavedAt,
  meetingStatus,
  onLaunchLiveMeeting,
}: MeetingStatusBarProps) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap px-3.5 py-2 rounded-xl bg-[#05142B]/85 border border-[#3A2C18] shadow-[0_4px_16px_rgba(0,0,0,0.6)] backdrop-blur-md">
      {/* Live D1 Sync Pill */}
      <div className="flex items-center gap-2 text-xs">
        {isSaving ? (
          <>
            <span className="h-2 w-2 rounded-full bg-[#FFE394] animate-ping" />
            <span className="text-[#FFE394] font-medium flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin text-[#FFE394]" />
              Syncing to Cloudflare D1...
            </span>
          </>
        ) : (
          <>
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-emerald-300 font-medium flex items-center gap-1.5">
              <span>Saved to Cloudflare D1</span>
              {lastSavedAt && (
                <span className="text-[#A69371] font-mono text-[11px]">
                  ({lastSavedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })})
                </span>
              )}
            </span>
          </>
        )}
      </div>

      {/* Quick Live Meeting Action & Page ID Badge */}
      <div className="flex items-center gap-2.5">
        {meetingStatus === "LIVE" ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-950/90 border border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.35)] font-mono">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            LIVE MEETING IN PROGRESS
          </span>
        ) : meetingStatus === "READY" ? (
          <Button
            size="sm"
            onClick={onLaunchLiveMeeting}
            className="inline-flex items-center gap-1.5 text-xs font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)] hover:brightness-105 cursor-pointer h-7 px-3"
          >
            <Zap className="h-3.5 w-3.5 fill-[#07162B]" />
            Launch Live Meeting
          </Button>
        ) : null}

        <PageIdBadge id="PG-043" name="⚡ Meeting Workspace" />
      </div>
    </div>
  );
}
