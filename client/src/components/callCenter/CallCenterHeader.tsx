import { Headset, RefreshCw } from "lucide-react";
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
    <header className="absolute top-0 left-0 right-0 z-40 pt-2 sm:pt-3 px-3 sm:px-5 lg:px-6">
      {/* Floating Maritime Control Plaque (sitting right over the top shelf image) */}
      <div className="w-full bg-[#05142B]/85 backdrop-blur-md border border-[#8C6418]/70 rounded-2xl p-2.5 sm:p-3 shadow-[0_10px_28px_rgba(0,0,0,0.85),inset_0_1px_2px_rgba(255,255,255,0.08)] relative">
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

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 pl-1 pr-1">
          {/* 1. Left: Headset Icon + Title in Serif Gold + Page ID Badge + Subtitle */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-[#1F1404] via-[#0E2442] to-[#040D1B] border border-[#C5A059]/70 flex items-center justify-center text-[#FFE394] shadow-lg shadow-black/60 shrink-0">
              <Headset className="h-5 w-5 text-[#FFE394] drop-shadow-[0_0_8px_rgba(255,227,148,0.7)]" />
            </div>

            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-serif font-bold tracking-wide text-[#FFF8E7] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] whitespace-nowrap leading-none">
                  Call Center
                </h1>
                <PageIdBadge id="PG-018" />
              </div>
              <div className="text-[10px] sm:text-[11px] font-serif font-semibold text-[#C6B697] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                Inbound & Outbound Telephony · Live Advocacy Dispatch
              </div>
            </div>
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
