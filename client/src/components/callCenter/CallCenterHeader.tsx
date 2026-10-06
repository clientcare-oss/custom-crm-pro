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
    <header className="absolute top-0 left-0 right-0 z-40 pt-2 sm:pt-2.5 px-3 sm:px-5 lg:px-6 pointer-events-auto">
      {/* Written directly on the wall — No container, sleek, smaller */}
      <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
        {/* Left: Written on the Navy Wood Wall */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#05142B]/70 border border-[#C5A059]/40 flex items-center justify-center text-[#FFE394] shadow-sm shrink-0">
            <Headset className="h-4 w-4 text-[#FFE394] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]" />
          </div>

          <div className="space-y-0 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-serif font-bold tracking-wider text-[#FFF8E7] drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] whitespace-nowrap leading-tight">
                Call Center
              </h1>
              <PageIdBadge id="PG-018" />
            </div>
            <div className="text-[9.5px] sm:text-[10px] font-serif font-medium text-[#D8C7A5]/85 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] tracking-wide">
              Inbound & Outbound Telephony · Live Advocacy Dispatch
            </div>
          </div>
        </div>

        {/* Right Controls: Minimalist wall-floating controls */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="text-[#D8C7A5] hover:text-[#FFF4D4] hover:bg-[#07162B]/80 border border-[#8C6418]/40 bg-[#020A17]/60 h-7 w-7 p-0 rounded-lg shrink-0 cursor-pointer shadow-sm"
              title="Refresh logs & status"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin text-[#C5A059]" : ""}`} />
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
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#020A17]/70 border border-[#8C6418]/40 shadow-xs whitespace-nowrap h-7">
            <Avatar className="h-4.5 w-4.5 rounded-full border border-[#FFE394]/50 bg-gradient-to-br from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shrink-0">
              <AvatarFallback className="bg-transparent text-[#07162B] text-[9px] font-bold">
                {userInit}
              </AvatarFallback>
            </Avatar>
            <span className="text-[11px] font-medium text-[#FFF4D4] whitespace-nowrap">
              {userName}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default CallCenterHeader;
