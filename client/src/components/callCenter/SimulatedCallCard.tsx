import React, { useEffect, useState } from "react";
import {
  PhoneIncoming,
  PhoneOff,
  UserCheck,
  UserX,
  FileEdit,
  ExternalLink,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Radio,
  Clock,
  CheckCircle2,
  Phone,
  UserPlus,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { SimulatedCallState } from "./CallCenterTestPanel";

interface SimulatedCallCardProps {
  simulation: SimulatedCallState;
  onEndCall: () => void;
  onReset: () => void;
  onBeginIntake: (sim: SimulatedCallState) => void;
  onOpenContact: (sim: SimulatedCallState) => void;
  onOpenQuo: (sim: SimulatedCallState) => void;
  onCreateLeadTest?: (sim: SimulatedCallState) => void;
}

export function SimulatedCallCard({
  simulation,
  onEndCall,
  onReset,
  onBeginIntake,
  onOpenContact,
  onOpenQuo,
  onCreateLeadTest,
}: SimulatedCallCardProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Live seconds timer during active simulation
  useEffect(() => {
    if (!simulation.isActive || simulation.isEnded) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [simulation.isActive, simulation.isEnded]);

  const formatTimer = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // ── 1. POST-CALL STATE: "TEST CALL COMPLETE" (COMPACT SMALL KIND) ──
  if (simulation.isEnded) {
    return (
      <div className="rounded-2xl bg-[#000821] border border-sky-500/30 p-4 sm:p-5 shadow-lg relative overflow-hidden animate-in fade-in">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-400">
              <CheckCircle2 className="h-5 w-5 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Test Call Completed
                </h3>
                <Badge className="bg-sky-500/20 text-sky-300 border border-sky-400/30 text-xs px-2 py-0.5">
                  Duration: {formatTimer(elapsedSeconds || 42)}
                </Badge>
              </div>
              <div className="text-xs text-slate-300 mt-0.5 flex items-center gap-3 flex-wrap">
                <span>
                  Caller: <strong className="text-white">{simulation.callerName}</strong> ({simulation.phoneNumber})
                </span>
                {simulation.relatedStudent && (
                  <span className="text-amber-300 font-medium">
                    • Student: {simulation.relatedStudent}
                  </span>
                )}
                <span className="text-sky-300">• {simulation.scenario}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={onReset}
              className="text-slate-400 hover:text-white text-xs h-9 px-3 rounded-xl gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset State
            </Button>

            <Button
              size="sm"
              onClick={() => onBeginIntake(simulation)}
              className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs h-9 px-4 rounded-xl gap-1.5 shadow-md"
            >
              <FileEdit className="h-4 w-4" />
              <span>Work Post-Call Notes</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── 2. ACTIVE INCOMING CALL STATE (COMPACT SMALL KIND WITH YELLOW PULSE FOR INCOMING RING) ──
  return (
    <div className="rounded-2xl bg-[#000821] border-2 border-yellow-400 animate-pulse-border-yellow p-4 sm:p-5 shadow-2xl relative overflow-hidden animate-in fade-in transition-all">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Caller Identity Block */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-yellow-400/20 border-2 border-yellow-400 flex items-center justify-center text-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.5)]">
              <PhoneIncoming className="h-5 w-5 animate-bounce text-yellow-400" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Incoming Call Ringing...
              </h3>
              <Badge className="bg-yellow-400 text-slate-950 font-black text-xs uppercase px-2.5 py-0.5 shadow-sm">
                INCOMING RING
              </Badge>
              {simulation.isCrmMatch && (
                <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold">
                  CRM Match
                </Badge>
              )}
            </div>

            <div className="text-xs text-slate-300 mt-1 flex items-center gap-3 flex-wrap">
              <span>
                Caller: <strong className="text-white">{simulation.callerName}</strong> ({simulation.phoneNumber})
              </span>
              {simulation.relatedStudent && (
                <span className="text-amber-300 font-medium">
                  • Student: {simulation.relatedStudent}
                </span>
              )}
              <span className="text-sky-300">
                • Scenario: {simulation.scenario}
              </span>
              <span className="font-mono text-yellow-300 font-bold bg-slate-900/80 px-2 py-0.5 rounded border border-yellow-400/40">
                ⏱ {formatTimer(elapsedSeconds)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={onReset}
            className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 text-xs h-9 px-3 rounded-xl gap-1.5"
          >
            <PhoneOff className="h-4 w-4" />
            Decline
          </Button>

          <Button
            size="sm"
            onClick={() => onBeginIntake(simulation)}
            className="bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-bold text-xs h-9 px-4 rounded-xl gap-1.5 shadow-[0_0_15px_rgba(250,204,21,0.4)] cursor-pointer"
          >
            <Phone className="h-4 w-4" />
            <span>Answer & Begin SOP</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default SimulatedCallCard;
