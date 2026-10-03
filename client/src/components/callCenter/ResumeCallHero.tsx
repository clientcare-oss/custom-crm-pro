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
    <div className="rounded-2xl bg-[#05142B]/95 border-2 border-[#059669] p-4 sm:p-5 shadow-[0_8px_24px_rgba(0,0,0,0.85)] relative overflow-hidden animate-in fade-in transition-all select-none">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="w-11 h-11 rounded-xl bg-[#020A17] border border-[#3A2C18] flex items-center justify-center text-[#6EE7B7] shadow-md shadow-black/40">
              <Phone className="h-5 w-5 text-[#6EE7B7]" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#10B981] shadow-[0_0_8px_#34d399]" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-serif font-bold text-[#FFF4D4] tracking-tight">
                Active Call in Progress
              </h3>
              <Badge className="bg-[#04241B]/90 text-[#6EE7B7] border border-[#059669]/60 font-bold text-xs uppercase px-2.5 py-0.5 shadow-xs">
                ACTIVE SESSION
              </Badge>
            </div>
            <div className="text-xs text-[#C6B697] mt-1 flex items-center gap-3 flex-wrap">
              <span>
                Caller: <strong className="text-[#FFF4D4]">{callerName}</strong>
              </span>
              {call.studentName && (
                <span className="text-[#FFE394] font-medium">
                  • Student: {call.studentName}
                </span>
              )}
              <span className="text-[#C6B697]">
                • Type: {call.callType || "General"}
              </span>
              <span className="font-mono text-[#FFE394] font-bold bg-[#020A17] px-2 py-0.5 rounded-lg border border-[#3A2C18]">
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
            className="text-[#A69371] hover:text-rose-400 hover:bg-[#07162B] text-xs h-9 px-3 rounded-xl gap-1.5 cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            Discard Session
          </Button>

          <Button
            size="sm"
            onClick={onResumeCall}
            className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-9 px-4 rounded-xl gap-1.5 border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)] hover:brightness-105 cursor-pointer"
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
