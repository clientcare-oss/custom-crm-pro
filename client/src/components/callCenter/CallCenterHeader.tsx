import React from "react";
import { Headset, RefreshCw, Bug, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/_core/hooks/useAuth";

import { CallCenterTestPanel, SimulatedCallState } from "./CallCenterTestPanel";

interface CallCenterHeaderProps {
  callsTodayCount?: number;
  activeFilter?: string;
  onSelectStat?: (filterKey: string) => void;
  isQuoConfigured?: boolean;
  onOpenSettings?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onStartSimulation?: (sim: SimulatedCallState) => void;
  activeSimulation?: SimulatedCallState | null;
  onResetSimulation?: () => void;
}

export function CallCenterHeader({
  callsTodayCount = 6,
  activeFilter,
  onSelectStat,
  isQuoConfigured = true,
  onOpenSettings,
  onRefresh,
  isRefreshing = false,
  onStartSimulation,
  activeSimulation = null,
  onResetSimulation,
}: CallCenterHeaderProps) {
  const { user } = useAuth();
  const userName = user?.name || "Byron Honea";
  const userInit = (user?.name ? user.name[0] : "B").toUpperCase();

  return (
    <header className="flex items-center justify-between gap-3 pb-2 border-b border-sky-500/10 w-full">
      {/* 1. Left: Larger Headset Icon + Call Center Title + Calls Today Counter */}
      <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
        <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/35 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)] shrink-0">
          <Headset className="h-5.5 w-5.5" />
        </div>
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white font-sans whitespace-nowrap">
          Call Center
        </h1>

        {/* Calls Today Counter moved into Top Bar */}
        <button
          type="button"
          onClick={() => onSelectStat?.("calls")}
          className={`flex items-center gap-1.5 px-2.5 h-8 rounded-lg border transition-all cursor-pointer shadow-xs text-xs whitespace-nowrap ml-1 ${
            activeFilter === "calls"
              ? "bg-sky-500/20 border-sky-400 text-white shadow-[0_0_12px_rgba(56,189,248,0.25)]"
              : "bg-[#000821] border-sky-500/25 text-slate-200 hover:border-sky-400/50 hover:bg-sky-500/10"
          }`}
          title="Filter calls today"
        >
          <div className="w-5 h-5 rounded-md bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
            <Phone className="h-3 w-3" />
          </div>
          <span className="font-black text-white text-sm leading-none">{callsTodayCount}</span>
          <span className="text-slate-300 text-[11px] font-medium leading-none">Calls Today</span>
        </button>
      </div>

      {/* 2. Right Controls: Refresh, Settings Gear, User Pill, and Red Feedback & Issues Button in one aligned row */}
      <div className="flex items-center gap-2 shrink-0">
        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="text-slate-400 hover:text-white hover:bg-sky-500/10 h-8 w-8 p-0 rounded-lg shrink-0"
            title="Refresh logs & status"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-amber-400" : ""}`} />
          </Button>
        )}

        {/* Small Settings Gear for Call Center Testing (Admin / Dev only) */}
        {onStartSimulation && onResetSimulation && (
          <CallCenterTestPanel
            onStartSimulation={onStartSimulation}
            activeSimulation={activeSimulation}
            onResetSimulation={onResetSimulation}
          />
        )}

        {/* Employee Profile Pill — solely shows Byron Honea */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#000821] border border-sky-500/25 shadow-xs whitespace-nowrap h-8">
          <Avatar className="h-6 w-6 rounded-md border border-sky-400/30 bg-[#001035] text-white font-semibold shrink-0">
            <AvatarFallback className="bg-[#001035] text-sky-200 text-[10px] font-bold">
              {userInit}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-semibold text-white whitespace-nowrap">
            {userName}
          </span>
        </div>

        {/* 3. Red Developer Bug / Feedback & Issues Button — perfectly aligned on the top line */}
        <Button
          onClick={() => window.dispatchEvent(new CustomEvent("open-issue-reporter"))}
          className="h-8 px-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 rounded-lg text-xs font-bold gap-1.5 shadow-xs transition-all cursor-pointer shrink-0"
          title="Report Issue / Feedback to Linear Backlog (⌥+F)"
        >
          <Bug className="w-3.5 h-3.5" /> Feedback & Issues
        </Button>
      </div>
    </header>
  );
}

export default CallCenterHeader;
