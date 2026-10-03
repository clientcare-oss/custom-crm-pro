import React from "react";
import { Headset, RefreshCw, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/_core/hooks/useAuth";
import PageIdBadge from "@/components/PageIdBadge";
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
    <header className="flex items-center justify-between gap-3 pb-3 border-b border-[#3A2C18] w-full">
      {/* 1. Left: Headset Icon + Title in Serif Gold + Page ID Badge + Calls Today Counter */}
      <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
        <div className="w-11 h-11 rounded-xl bg-[#020A17] border border-[#3A2C18] flex items-center justify-center text-[#FFE394] shadow-md shadow-black/40 shrink-0">
          <Headset className="h-5.5 w-5.5 text-[#C5A059]" />
        </div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl sm:text-2xl font-serif font-bold tracking-wide text-[#FFF4D4] whitespace-nowrap">
            Call Center
          </h1>
          <PageIdBadge id="PG-018" />
        </div>

        {/* Calls Today Counter */}
        <button
          type="button"
          onClick={() => onSelectStat?.("calls")}
          className={`flex items-center gap-1.5 px-3 h-8 rounded-xl border transition-all cursor-pointer shadow-xs text-xs whitespace-nowrap ml-1 ${
            activeFilter === "calls"
              ? "bg-[#07162B] border-[#C5A059] text-[#FFE394] shadow-[0_0_12px_rgba(197,160,89,0.25)]"
              : "bg-[#020A17] border-[#3A2C18] text-[#C6B697] hover:border-[#C5A059]/60 hover:text-[#FFF4D4]"
          }`}
          title="Filter calls today"
        >
          <div className="w-5 h-5 rounded-md bg-[#000814] border border-[#3A2C18] flex items-center justify-center text-[#C5A059] shrink-0">
            <Phone className="h-3 w-3" />
          </div>
          <span className="font-serif font-bold text-[#FFE394] text-sm leading-none">{callsTodayCount}</span>
          <span className="text-[#C6B697] text-[11px] font-medium leading-none">Calls Today</span>
        </button>
      </div>

      {/* 2. Right Controls: Refresh, Simulation Settings, Profile Pill */}
      <div className="flex items-center gap-2 shrink-0">
        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="text-[#A69371] hover:text-[#FFF4D4] hover:bg-[#07162B] border border-[#3A2C18]/60 h-8 w-8 p-0 rounded-xl shrink-0 cursor-pointer"
            title="Refresh logs & status"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-[#C5A059]" : ""}`} />
          </Button>
        )}

        {/* Call Center Simulation Rig */}
        {onStartSimulation && onResetSimulation && (
          <CallCenterTestPanel
            onStartSimulation={onStartSimulation}
            activeSimulation={activeSimulation}
            onResetSimulation={onResetSimulation}
          />
        )}

        {/* Employee Profile Pill */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-[#020A17] border border-[#3A2C18] shadow-xs whitespace-nowrap h-8">
          <Avatar className="h-5.5 w-5.5 rounded-full border border-[#FFE394]/50 bg-gradient-to-br from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shrink-0">
            <AvatarFallback className="bg-transparent text-[#07162B] text-[10px] font-bold">
              {userInit}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-semibold text-[#FFF4D4] whitespace-nowrap">
            {userName}
          </span>
        </div>
      </div>
    </header>
  );
}

export default CallCenterHeader;
