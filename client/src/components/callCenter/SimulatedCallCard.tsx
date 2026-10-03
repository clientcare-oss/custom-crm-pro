import React, { useEffect, useState } from "react";
import {
  PhoneIncoming,
  PhoneOff,
  FileEdit,
  RotateCcw,
  CheckCircle2,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  onReset,
  onBeginIntake,
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

  // ── 1. POST-CALL STATE: "TEST CALL COMPLETE" ──
  if (simulation.isEnded) {
    return (
      <div className="rounded-2xl bg-[#05142B]/90 border border-[#3A2C18] p-4 sm:p-5 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] relative overflow-hidden animate-in fade-in">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#020A17] border border-[#3A2C18] flex items-center justify-center text-[#C5A059] shadow-inner">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg font-bold text-[#FFF4D4] tracking-tight">
                  Test Call Completed
                </h3>
                <Badge className="bg-[#020A17] text-[#FFE394] border border-[#3A2C18] text-xs px-2 py-0.5 font-mono">
                  Duration: {formatTimer(elapsedSeconds || 42)}
                </Badge>
              </div>
              <div className="text-xs text-[#C6B697] mt-0.5 flex items-center gap-3 flex-wrap">
                <span>
                  Caller: <strong className="text-[#FFF4D4] font-medium">{simulation.callerName}</strong> ({simulation.phoneNumber})
                </span>
                {simulation.relatedStudent && (
                  <span className="text-[#FAD77B] font-medium">
                    • Student: {simulation.relatedStudent}
                  </span>
                )}
                <span className="text-[#D8C7A5] font-mono">• {simulation.scenario}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={onReset}
              className="border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] text-xs h-9 px-3 rounded-xl gap-1.5 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5 text-[#C5A059]" />
              Reset State
            </Button>

            <Button
              size="sm"
              onClick={() => onBeginIntake(simulation)}
              className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-9 px-4 rounded-xl gap-1.5 border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)] hover:brightness-110 cursor-pointer"
            >
              <FileEdit className="h-4 w-4" />
              <span>Work Post-Call Notes</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── 2. ACTIVE INCOMING CALL STATE (NAVY LEATHER WITH BRASS ACCENTS & PULSE) ──
  return (
    <div className="rounded-2xl bg-[#05142B]/95 border-2 border-[#C5A059] p-4 sm:p-5 shadow-[0_8px_32px_rgba(0,0,0,0.95),inset_0_1px_1px_rgba(255,255,255,0.08)] relative overflow-hidden animate-in fade-in transition-all">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Caller Identity Block */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-[#020A17] border-2 border-[#C5A059] flex items-center justify-center text-[#FFE394] shadow-[0_0_20px_rgba(197,160,89,0.4)]">
              <PhoneIncoming className="h-5 w-5 animate-bounce text-[#FFE394]" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFE394] opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#C5A059]" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-serif text-lg sm:text-xl font-bold text-[#FFF4D4] tracking-tight">
                Incoming Call Ringing...
              </h3>
              <Badge className="bg-gradient-to-r from-[#DFBE77] to-[#C5A059] text-[#07162B] font-bold text-xs uppercase px-2.5 py-0.5 shadow-sm border border-[#FFE394]/60">
                INCOMING RING
              </Badge>
              {simulation.isCrmMatch && (
                <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold">
                  CRM Match
                </Badge>
              )}
            </div>

            <div className="text-xs text-[#C6B697] mt-1 flex items-center gap-3 flex-wrap">
              <span>
                Caller: <strong className="text-[#FFF4D4] font-medium">{simulation.callerName}</strong> ({simulation.phoneNumber})
              </span>
              {simulation.relatedStudent && (
                <span className="text-[#FAD77B] font-medium">
                  • Student: {simulation.relatedStudent}
                </span>
              )}
              <span className="text-[#D8C7A5]">
                • Scenario: {simulation.scenario}
              </span>
              <span className="font-mono text-[#FFE394] font-bold bg-[#020A17] px-2 py-0.5 rounded border border-[#3A2C18]">
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
            className="border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:text-rose-400 hover:bg-rose-500/10 text-xs h-9 px-3 rounded-xl gap-1.5 cursor-pointer"
          >
            <PhoneOff className="h-4 w-4" />
            Decline
          </Button>

          <Button
            size="sm"
            onClick={() => onBeginIntake(simulation)}
            className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-9 px-4 rounded-xl gap-1.5 border border-[#FFE394]/50 shadow-[0_3px_12px_rgba(0,0,0,0.8)] hover:brightness-110 cursor-pointer"
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
