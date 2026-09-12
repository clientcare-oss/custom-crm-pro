import React from "react";
import { Headset, Settings2, ShieldCheck, ShieldAlert, RefreshCw, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/_core/hooks/useAuth";

import { CallCenterTestPanel, SimulatedCallState } from "./CallCenterTestPanel";

interface CallCenterHeaderProps {
  isQuoConfigured?: boolean;
  onOpenSettings?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onStartSimulation?: (sim: SimulatedCallState) => void;
  activeSimulation?: SimulatedCallState | null;
  onResetSimulation?: () => void;
}

export function CallCenterHeader({
  isQuoConfigured = true,
  onOpenSettings,
  onRefresh,
  isRefreshing = false,
  onStartSimulation,
  activeSimulation = null,
  onResetSimulation,
}: CallCenterHeaderProps) {
  const { user } = useAuth();
  const userName = user?.name || "Wyatt";
  const userInit = (user?.name ? user.name[0] : "W").toUpperCase();
  const userRole = user?.role === "admin" ? "Practice Lead" : "Front Desk / Intake";

  return (
    <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-2 border-b border-sky-500/10">
      {/* Title & Subtitle with Headset Icon */}
      <div className="flex items-center gap-4">
        <div className="w-13 h-13 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.15)] flex-shrink-0">
          <Headset className="h-7 w-7" />
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">
              Call Center
            </h1>
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
              PG-018
            </span>
          </div>
          <p className="text-sm text-slate-300/90 mt-0.5 font-normal">
            Manage calls, intake, follow-up, and client workflow — all in one place.
          </p>
        </div>
      </div>

      {/* Right Controls: Quo Integration Status + Employee Pill */}
      <div className="flex items-center gap-3 flex-wrap">
        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="text-slate-400 hover:text-white hover:bg-sky-500/10 h-9 px-2.5 rounded-xl"
            title="Refresh logs & status"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-amber-400" : ""}`} />
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

        {/* Quo Integration Linked Card */}
        <div
          onClick={onOpenSettings}
          className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-[#061830] border border-sky-500/30 shadow-sm cursor-pointer hover:border-sky-400/50 transition-all group"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <div className="text-left">
            <div className="text-xs font-semibold text-emerald-400 leading-none flex items-center gap-1">
              Quo Integration Linked
            </div>
            <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
              Calls open in Quo
            </div>
          </div>
        </div>

        {/* Employee Profile Pill with "Guided Horizons" */}
        <div className="relative flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-[#061830] border border-sky-500/20 shadow-sm">
          <Avatar className="h-8 w-8 rounded-lg border border-sky-400/30 bg-[#092244] text-white font-semibold">
            <AvatarFallback className="bg-[#092244] text-sky-200 text-xs font-bold">
              {userInit}
            </AvatarFallback>
          </Avatar>
          <div className="text-left">
            <div className="text-xs font-semibold text-white leading-none flex items-center gap-1.5">
              {userName}
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </div>
            <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
              {userRole}
            </div>
          </div>
          {/* Subtle Script Motto */}
          <div className="absolute -bottom-4 right-1 text-[11px] font-serif italic text-amber-400/70 pointer-events-none select-none">
            Guided Horizons
          </div>
        </div>
      </div>
    </header>
  );
}

export default CallCenterHeader;
