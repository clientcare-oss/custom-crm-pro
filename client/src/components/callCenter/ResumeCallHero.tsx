import React, { useState, useEffect } from "react";
import { useActiveCall } from "@/contexts/ActiveCallContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, ArrowRight, Trash2, Clock, User, CheckCircle2 } from "lucide-react";

interface ResumeCallHeroProps {
  onResumeCall: () => void;
}

export function ResumeCallHero({ onResumeCall }: ResumeCallHeroProps) {
  const { call, discardCallSession } = useActiveCall();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!call.isActive || !call.startTime) return;
    const update = () => {
      const diff = Math.floor((Date.now() - (call.startTime || Date.now())) / 1000);
      setElapsed(Math.max(0, diff));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [call.isActive, call.startTime]);

  const formatTimer = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const callerName = call.callerInfo.name || call.contactName || "Caller";

  return (
    <div className="rounded-2xl bg-[#000821] border-active-call-neon-green p-4 sm:p-5 shadow-2xl relative overflow-hidden animate-in fade-in transition-all">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.3)]">
              <Phone className="h-5 w-5 text-emerald-400" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-black text-white tracking-tight">
                Active Call in Progress
              </h3>
              <Badge className="bg-emerald-400 text-slate-950 font-black text-xs uppercase px-2.5 py-0.5 shadow-sm">
                ACTIVE SESSION
              </Badge>
            </div>
            <div className="text-xs text-slate-300 mt-1 flex items-center gap-3 flex-wrap">
              <span>
                Caller: <strong className="text-white">{callerName}</strong>
              </span>
              {call.studentName && (
                <span className="text-amber-300 font-medium">
                  • Student: {call.studentName}
                </span>
              )}
              <span className="text-sky-300">
                • Type: {call.callType || "General"}
              </span>
              <span className="font-mono text-emerald-300 font-bold bg-slate-900/80 px-2 py-0.5 rounded border border-emerald-400/40">
                ⏱ {formatTimer(elapsed)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (confirm("Are you sure you want to discard this active call session?")) {
                discardCallSession();
              }
            }}
            className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 text-xs h-9 px-3 rounded-xl gap-1.5"
          >
            <Trash2 className="h-4 w-4" />
            Discard Session
          </Button>

          <Button
            size="sm"
            onClick={onResumeCall}
            className="bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs h-9 px-4 rounded-xl gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.35)] cursor-pointer"
          >
            <span>Resume Call Workflow</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ResumeCallHero;
