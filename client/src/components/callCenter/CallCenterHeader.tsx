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
    <header className="absolute top-0 left-0 right-0 z-40 pt-2 sm:pt-2.5 px-3 sm:px-6 pointer-events-auto">
      {/* Written directly on the wall — Centered title, sleek wall typography */}
      <div className="w-full relative flex items-center justify-between min-h-[36px]">
        {/* Positioned directly above the books next to the salt lamp */}
        <div
          className="flex items-center gap-2.5 sm:gap-3"
          style={{ paddingLeft: "calc(100% * 175 / 1024)" }}
        >
          <div className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-xl bg-[#05142B]/80 border border-[#C5A059]/50 flex items-center justify-center text-[#FFE394] shadow-md shadow-black/50 shrink-0">
            <Headset className="h-4.5 w-4.5 text-[#FFE394] drop-shadow-[0_1px_4px_rgba(255,227,148,0.7)]" />
          </div>

          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-['Outfit',sans-serif] font-bold tracking-tight text-[#FFF8E7] drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] whitespace-nowrap leading-none">
              Call Center
            </h1>
            <PageIdBadge id="PG-018" />
          </div>
        </div>

        {/* Right Controls: Minimalist wall-floating controls */}
        <div className="flex items-center justify-end gap-2 shrink-0">
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
