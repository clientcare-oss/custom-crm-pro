import React, { useState, useEffect } from "react";
import { useActiveCall } from "@/contexts/ActiveCallContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, ArrowRight, Trash2 } from "lucide-react";

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
    <div className="adm-hero-card rounded-[20px] p-5 sm:p-6 relative overflow-hidden animate-in fade-in transition-all select-none">
      <div aria-hidden="true" className="adm-rim-glint-top" />
      <div aria-hidden="true" className="adm-rim-glint-bottom" />
      <div className="relative z-10 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="adm-icon-tile w-12 h-12 rounded-xl flex items-center justify-center text-[#6EE7B7]">
              <Phone className="h-5 w-5 text-[#6EE7B7] drop-shadow-[0_1px_4px_rgba(0,0,0,0.85)]" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#10B981] shadow-[0_0_8px_#34d399]" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl font-serif font-bold text-[#FAF6EC] tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
                Active Call in Progress
              </h3>
              <Badge className="bg-[#04241B]/90 text-[#6EE7B7] border border-[#059669]/60 font-bold text-[11px] uppercase px-2.5 py-0.5 shadow-xs">
                ACTIVE SESSION
              </Badge>
            </div>
            <div className="text-xs text-[#C6D4E6] mt-1 flex items-center gap-3 flex-wrap">
              <span>
                Caller: <strong className="text-[#FAF6EC]">{callerName}</strong>
              </span>
              {call.studentName && (
                <span className="text-[#ECC97B] font-medium">
                  • Student: {call.studentName}
                </span>
              )}
              <span className="text-[#C6D4E6]">
                • Type: {call.callType || "General"}
              </span>
              <span className="font-mono text-[#ECC97B] font-bold bg-[#050e1c] px-2 py-0.5 rounded-lg border border-[#8a7052]/55">
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
            className="adm-cal-pill text-[#D4DFEE] hover:text-rose-300 text-xs h-9 px-3 rounded-xl gap-1.5 cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            Discard Session
          </Button>

          <Button
            size="sm"
            onClick={onResumeCall}
            className="adm-cal-pill-active font-bold text-xs h-9 px-4 rounded-xl gap-1.5 cursor-pointer"
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
