import React, { useState } from "react";
import { useLocation } from "wouter";
import { useFirstMate } from "@/contexts/FirstMateContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ExternalLink, Radio, Pause, AlertCircle, ArrowUpRight, Square } from "lucide-react";
import { toast } from "sonner";

// Radar reticle logo matching Waypoint specifications
function RadarReticleIcon({ className = "w-5 h-5", pulse = false }: { className?: string; pulse?: boolean }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="launcherGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
          <stop offset="80%" stopColor="#0891b2" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#launcherGlow)" stroke="#06b6d4" strokeWidth="4" />
      <circle
        cx="50"
        cy="50"
        r="32"
        stroke="#22d3ee"
        strokeWidth="2.5"
        strokeDasharray="4 4"
        className={pulse ? "animate-[spin_6s_linear_infinite]" : ""}
        style={{ transformOrigin: "50% 50%" }}
      />
      <circle cx="50" cy="50" r="18" stroke="#06b6d4" strokeWidth="3" />
      <circle cx="50" cy="50" r="4.5" fill="#22d3ee" />
      <line x1="50" y1="4" x2="50" y2="18" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" />
      <line x1="50" y1="82" x2="50" y2="96" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" />
      <line x1="4" y1="50" x2="18" y2="50" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" />
      <line x1="82" y1="50" x2="96" y2="50" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function FirstMateGlobalLauncher() {
  const { session, openPopoutWindow, isPopout, stopListening } = useFirstMate();
  const [location, setLocation] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // If we are already inside the popout standalone window, don't render a floating launcher
  if (isPopout) return null;

  // Determine launcher state
  const hasActiveAlert = (session.alerts || []).some((a) => !a.dismissed);
  const isLive = session.status === "ACTIVE";
  const isPaused = session.status === "PAUSED";
  
  let stateKey: "ALERT" | "LIVE" | "PAUSED" | "READY" = "READY";
  if (hasActiveAlert && (isLive || isPaused)) {
    stateKey = "ALERT";
  } else if (isLive) {
    stateKey = "LIVE";
  } else if (isPaused) {
    stateKey = "PAUSED";
  }

  const handleClick = () => {
    if (session.status === "ACTIVE" || session.status === "PAUSED") {
      // Toggle mini options menu
      setMenuOpen(!menuOpen);
    } else {
      // Not active: navigate directly to First Mate start panel
      setLocation("/first-mate");
    }
  };

  return (
    <div className="fixed bottom-24 right-6 z-40 flex flex-col items-end">
      {/* Quick context action menu when clicked during active session */}
      {menuOpen && (
        <div className="mb-2 bg-[#061222] border border-cyan-500/30 rounded-xl p-2.5 shadow-2xl shadow-cyan-950/80 text-xs w-64 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isLive ? "bg-emerald-400" : "bg-amber-400"} opacity-75`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isLive ? "bg-emerald-500" : "bg-amber-500"}`} />
              </span>
              <span className="font-bold text-white uppercase tracking-wider text-[10px]">
                {isLive ? "First Mate Live" : "First Mate Paused"}
              </span>
            </div>
            <span className="font-mono text-cyan-300 text-[10px] font-bold">
              {formatTime(session.durationSeconds)}
            </span>
          </div>

          <div className="text-[11px] text-slate-300 mb-2 truncate">
            <span className="text-slate-400">Target: </span>
            <span className="font-semibold text-white">{session.attachedName || "Avery Jenkins"}</span>
          </div>

          {session.liveAssist?.currentIssue && (
            <div className="p-1.5 bg-cyan-950/40 border border-cyan-500/20 rounded-lg text-[10px] text-cyan-200 mb-2">
              <span className="font-bold text-cyan-400 uppercase tracking-wider">Issue: </span>
              {session.liveAssist.currentIssue}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            {(isLive || isPaused) && (
              <button
                onClick={async () => {
                  setMenuOpen(false);
                  await stopListening();
                  toast.success("Recording stopped immediately for compliance.");
                }}
                className="w-full h-8 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-[11px] flex items-center justify-between transition-colors cursor-pointer border border-rose-400/40 shadow-sm"
                title="Stop recording immediately for compliance"
              >
                <span className="flex items-center gap-1.5">
                  <Square className="w-3 h-3 fill-white" />
                  Stop Listening
                </span>
              </button>
            )}

            <button
              onClick={() => {
                setMenuOpen(false);
                openPopoutWindow();
              }}
              className="w-full h-8 px-2.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 font-semibold flex items-center justify-between transition-colors cursor-pointer"
            >
              <span>Pop Out Floating Window</span>
              <ExternalLink className="w-3.5 h-3.5 text-cyan-300" />
            </button>

            <button
              onClick={() => {
                setMenuOpen(false);
                setLocation("/first-mate");
              }}
              className="w-full h-8 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-semibold flex items-center justify-between transition-colors cursor-pointer"
            >
              <span>Open Full First Mate Page</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      )}

      {/* Main Persistent Radar Trigger Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleClick}
              className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer shadow-lg ${
                stateKey === "ALERT"
                  ? "bg-[#091728] border-2 border-rose-500/80 shadow-rose-950/60 hover:scale-105"
                  : stateKey === "LIVE"
                  ? "bg-[#071322] border-2 border-cyan-400/80 shadow-cyan-950/70 hover:scale-105"
                  : stateKey === "PAUSED"
                  ? "bg-[#071322] border-2 border-amber-400/80 shadow-amber-950/50 hover:scale-105"
                  : "bg-[#081525]/90 border border-cyan-500/30 shadow-black/40 hover:border-cyan-400/60 hover:scale-105"
              }`}
              aria-label="First Mate Copilot"
            >
              {/* Radar Icon */}
              <RadarReticleIcon
                className="w-6 h-6 text-cyan-400"
                pulse={stateKey === "LIVE"}
              />

              {/* LIVE radar wave effect */}
              {stateKey === "LIVE" && (
                <span className="absolute inset-0 rounded-full border border-cyan-400 animate-ping opacity-25 pointer-events-none" />
              )}

              {/* State Badges / Attention Dots */}
              {stateKey === "ALERT" && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full ring-2 ring-[#071322] flex items-center justify-center shadow-md animate-bounce">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                </span>
              )}

              {stateKey === "PAUSED" && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full ring-2 ring-[#071322] flex items-center justify-center shadow-md">
                  <Pause className="w-2.5 h-2.5 text-black fill-black" />
                </span>
              )}

              {stateKey === "LIVE" && !hasActiveAlert && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full ring-2 ring-[#071322] shadow-sm" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" className="bg-[#061222] border border-cyan-500/30 text-white text-xs py-1 px-2.5">
            {stateKey === "ALERT"
              ? "First Mate: Critical Alert Detected"
              : stateKey === "LIVE"
              ? `First Mate Live (${formatTime(session.durationSeconds)})`
              : stateKey === "PAUSED"
              ? "First Mate: Paused"
              : "First Mate Copilot"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
