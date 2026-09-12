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

  // ── 1. POST-CALL STATE: "TEST CALL COMPLETE" ──
  if (simulation.isEnded) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-[#061830] via-[#092244] to-[#041022] border-2 border-amber-400/50 p-6 space-y-4 shadow-2xl relative overflow-hidden animate-in fade-in">
        {/* Test Mode Stripe Top Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-400/20 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Badge className="bg-amber-400 text-slate-950 font-black text-xs px-2.5 py-0.5 tracking-wider uppercase">
              TEST CALL COMPLETE
            </Badge>
            <span className="text-xs text-slate-300">
              Duration: <span className="font-mono font-bold text-white">{formatTimer(elapsedSeconds || 42)}</span>
            </span>
          </div>

          <Button
            size="sm"
            onClick={onReset}
            className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs h-7 px-3 rounded-lg gap-1"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Test State
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Caller Summary
            </div>
            <div className="text-base font-bold text-white">
              {simulation.callerName}
            </div>
            <div className="text-xs font-mono text-sky-300">
              {simulation.phoneNumber}
            </div>
            {simulation.relatedStudent && (
              <div className="text-xs text-amber-300 font-medium">
                Student: {simulation.relatedStudent}
              </div>
            )}
            <div className="text-xs text-slate-300">
              Scenario: <span className="font-semibold text-white">{simulation.scenario}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#040D1A]/90 border border-slate-800 space-y-2 text-xs">
            <div className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              Simulated Post-Call Pipeline
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              In production, completed Quo calls automatically generate call logs, audio waveforms, and AI summaries. You can test saving this note or testing lead ingestion below.
            </p>
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onBeginIntake(simulation)}
                className="border-sky-500/30 text-sky-300 hover:bg-sky-500/10 text-xs h-7 px-2.5 rounded-lg gap-1"
              >
                <FileEdit className="h-3 w-3" />
                Work Post-Call Notes
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const confirmSave = window.confirm(
                    "Test Mode Safety: Save this simulated caller to the REAL CRM database as a Lead?\n\n(Default recommendation is Cancel/No during tests)"
                  );
                  if (confirmSave && onCreateLeadTest) {
                    onCreateLeadTest(simulation);
                  } else {
                    toast.info("Simulation kept in test memory (No database changes)");
                  }
                }}
                className="border-amber-400/30 text-amber-300 hover:bg-amber-400/10 text-xs h-7 px-2.5 rounded-lg gap-1"
              >
                <UserPlus className="h-3 w-3" />
                Test Create Lead
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── 2. ACTIVE INCOMING CALL STATE ──
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#092244] via-[#061830] to-[#041022] border-[3px] border-yellow-400 animate-pulse-border-yellow p-6 space-y-5 relative overflow-hidden animate-in fade-in transition-all">
      {/* Top Test Banner Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-yellow-400/30 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <Badge className="bg-yellow-400 text-slate-950 font-black text-xs px-2.5 py-0.5 tracking-wider uppercase flex items-center gap-1.5 shadow-sm">
            <Radio className="h-3 w-3 animate-pulse text-slate-950" />
            SIMULATED INCOMING CALL
          </Badge>
          <span className="text-[11px] text-yellow-200/90 font-mono">
            Elapsed: <span className="font-bold text-white">{formatTimer(elapsedSeconds)}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] border-sky-400/40 text-sky-300 bg-sky-950/40">
            Quo Webhook Event Test
          </Badge>
          <Button
            size="sm"
            variant="ghost"
            onClick={onReset}
            className="text-slate-400 hover:text-white text-xs h-7 px-2"
            title="Cancel & Reset"
          >
            Cancel
          </Button>
        </div>
      </div>

      {/* Main Incoming Call Info Row */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Caller Identity Block */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-yellow-400/10 border-2 border-yellow-400/50 flex items-center justify-center text-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.35)]">
              <PhoneIncoming className="h-7 w-7 animate-bounce" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-yellow-500" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl font-black text-white tracking-tight">
                {simulation.callerName}
              </h3>
              {simulation.isCrmMatch ? (
                <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] font-semibold gap-1">
                  <UserCheck className="h-3 w-3" />
                  CRM Match: {simulation.callerType}
                </Badge>
              ) : (
                <Badge className="bg-slate-700/50 text-slate-300 border-slate-600 text-[10px] font-semibold gap-1">
                  <UserX className="h-3 w-3" />
                  Unknown Caller
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-300 mt-1 flex-wrap">
              <span className="font-mono text-sky-300 text-sm font-bold">
                {simulation.phoneNumber}
              </span>
              {simulation.relatedStudent && (
                <span className="text-yellow-300 font-medium">
                  • Student: {simulation.relatedStudent}
                </span>
              )}
              <span className="text-slate-400">
                • Scenario: <span className="text-slate-200">{simulation.scenario}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons: Begin Intake, Open Quo, End Test Call */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
          <Button
            size="sm"
            onClick={() => onBeginIntake(simulation)}
            className="bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-bold text-xs h-9 px-4 rounded-xl gap-1.5 shadow-[0_0_15px_rgba(250,204,21,0.3)]"
          >
            <FileEdit className="h-4 w-4" />
            Begin Intake
          </Button>

          {simulation.isCrmMatch && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onOpenContact(simulation)}
              className="border-sky-500/40 text-sky-300 hover:bg-sky-500/10 text-xs h-9 px-3 rounded-xl gap-1.5"
            >
              <UserCheck className="h-4 w-4" />
              Open Contact
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpenQuo(simulation)}
            className="border-sky-500/40 text-sky-300 hover:bg-sky-500/10 text-xs h-9 px-3 rounded-xl gap-1.5"
          >
            <ExternalLink className="h-4 w-4" />
            Open Quo
          </Button>

          <Button
            size="sm"
            onClick={onEndCall}
            className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs h-9 px-4 rounded-xl gap-1.5"
          >
            <PhoneOff className="h-4 w-4" />
            End Test Call
          </Button>
        </div>
      </div>

      {/* Non-invasive Sub-Banner explaining behavior */}
      <div className="p-2.5 rounded-xl bg-[#040D1A]/80 border border-yellow-400/25 flex items-center justify-between text-[11px] text-slate-300">
        <div className="flex items-center gap-1.5 text-yellow-300">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Mini First Mate on the right has adapted prompts for: <strong>"{simulation.scenario}"</strong></span>
        </div>
        <span className="text-slate-500 hidden sm:inline">Simulated Quo call event</span>
      </div>
    </div>
  );
}

export default SimulatedCallCard;
