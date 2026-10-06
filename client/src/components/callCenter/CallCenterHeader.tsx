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
    <header
      className="relative w-full z-10 pb-2 px-3 sm:px-5 lg:px-6"
      style={{ paddingTop: "calc(100% * 228 / 1024)" }}
    >
      {/* Floating Maritime Control Plaque (framed between cascading vines) */}
      <div className="w-full bg-[#05142B]/92 backdrop-blur-md border border-[#8C6418]/70 rounded-2xl p-3 sm:p-4 shadow-[0_12px_32px_rgba(0,0,0,0.9),inset_0_1px_2px_rgba(255,255,255,0.1)] relative">
        {/* Brass Corner Rivets */}
        <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-[#8C6418] border border-[#FFE394]/60 flex items-center justify-center text-[6px] text-[#2A1804] font-mono select-none">
          +
        </div>
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#8C6418] border border-[#FFE394]/60 flex items-center justify-center text-[6px] text-[#2A1804] font-mono select-none">
          +
        </div>
        <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-[#8C6418] border border-[#FFE394]/60 flex items-center justify-center text-[6px] text-[#2A1804] font-mono select-none">
          +
        </div>
        <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-[#8C6418] border border-[#FFE394]/60 flex items-center justify-center text-[6px] text-[#2A1804] font-mono select-none">
          +
        </div>

        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4 pl-1 pr-1">
          {/* 1. Left: Headset Icon + Title in Serif Gold + Page ID Badge + Calls Today Counter */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#1F1404] via-[#0E2442] to-[#040D1B] border border-[#C5A059]/70 flex items-center justify-center text-[#FFE394] shadow-lg shadow-black/60 shrink-0">
              <Headset className="h-5.5 w-5.5 text-[#FFE394] drop-shadow-[0_0_8px_rgba(255,227,148,0.7)]" />
            </div>

            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold tracking-wide text-[#FFF8E7] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] whitespace-nowrap leading-none">
                  Call Center
                </h1>
                <PageIdBadge id="PG-018" />
              </div>
              <div className="text-[10px] sm:text-[11px] font-serif font-semibold text-[#C6B697] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                Inbound & Outbound Telephony · Live Advocacy Dispatch
              </div>
            </div>

            {/* Calls Today Counter */}
            <button
              type="button"
              onClick={() => onSelectStat?.("calls")}
              className={`flex items-center gap-1.5 px-3 h-8.5 rounded-xl border transition-all cursor-pointer shadow-xs text-xs whitespace-nowrap ml-1 ${
                activeFilter === "calls"
                  ? "bg-[#07162B] border-[#C5A059] text-[#FFE394] shadow-[0_0_12px_rgba(197,160,89,0.35)]"
                  : "bg-[#020A17]/80 border-[#3A2C18] text-[#C6B697] hover:border-[#C5A059]/60 hover:text-[#FFF4D4]"
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
          <div className="flex items-center gap-2.5 shrink-0 self-end lg:self-auto flex-wrap sm:flex-nowrap">
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="text-[#C6B697] hover:text-[#FFF4D4] hover:bg-[#07162B] border border-[#3A2C18] bg-[#020A17]/80 h-8.5 w-8.5 p-0 rounded-xl shrink-0 cursor-pointer shadow-sm"
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
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-[#020A17]/90 border border-[#3A2C18] shadow-xs whitespace-nowrap h-8.5">
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
        </div>
      </div>
    </header>
  );
}

export default CallCenterHeader;
