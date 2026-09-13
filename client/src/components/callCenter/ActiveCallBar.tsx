import React, { useState, useEffect } from "react";
import { useActiveCall } from "@/contexts/ActiveCallContext";
import { Phone, ArrowRight, FileText, CheckCircle, X, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function ActiveCallBar() {
  const { call, updateCall, setGeneralNotes, endCallSession } = useActiveCall();
  const [location, setLocation] = useLocation();
  const [elapsed, setElapsed] = useState(0);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [quickNote, setQuickNote] = useState("");
  const [isMinimized, setIsMinimized] = useState(false);

  // Live timer ticker
  useEffect(() => {
    if (!call.isActive || !call.startTime) return;
    const updateTimer = () => {
      const diffSec = Math.floor((Date.now() - (call.startTime || Date.now())) / 1000);
      setElapsed(Math.max(0, diffSec));
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [call.isActive, call.startTime]);

  if (!call.isActive) return null;

  const formatTimer = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleReturnToCall = () => {
    if (location !== "/call-center" && location !== "/call-logs") {
      setLocation("/call-center");
    }
    // Smooth scroll down to workspace
    setTimeout(() => {
      const el = document.getElementById("call-workspace-section");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 200);
  };

  const handleSaveQuickNote = () => {
    if (!quickNote.trim()) {
      setIsNoteModalOpen(false);
      return;
    }
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const formatted = `[${timestamp}] ${quickNote.trim()}`;
    const nextNotes = call.generalNotes ? `${call.generalNotes}\n${formatted}` : formatted;
    setGeneralNotes(nextNotes);
    setQuickNote("");
    setIsNoteModalOpen(false);
    toast.success("Note added to active call");
  };

  const callerDisplayName =
    call.callerInfo.name ||
    call.contactName ||
    call.callerInfo.phone ||
    "Caller";

  return (
    <>
      {/* Floating Persistent Call Bar */}
      <div
        className={`fixed z-50 transition-all duration-300 ${
          isMinimized
            ? "bottom-4 right-4"
            : "bottom-4 left-1/2 -translate-x-1/2 w-[95%] max-w-4xl"
        }`}
      >
        <div className="rounded-2xl bg-[#07162B]/95 border-2 border-emerald-500/40 shadow-[0_10px_35px_rgba(0,0,0,0.55),0_0_20px_rgba(16,185,129,0.2)] backdrop-blur-md px-4 py-3 text-white flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4">
          {/* Status Indicator & Live Duration */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <Phone className="h-4 w-4 animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  ACTIVE CALL
                </span>
                <span className="font-mono font-bold text-xs text-white bg-slate-900/60 px-2 py-0.5 rounded-md border border-slate-700">
                  {formatTimer(elapsed)}
                </span>
              </div>
            </div>
          </div>

          {/* Caller & Call Details */}
          {!isMinimized && (
            <div className="hidden sm:flex items-center gap-2.5 min-w-0 flex-1 px-2 border-l border-slate-700/60">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="font-bold text-sm text-white truncate">
                    {callerDisplayName}
                  </span>
                  {call.studentName && (
                    <span className="text-xs text-amber-300 font-medium truncate">
                      • Student: {call.studentName}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-300 truncate">
                  {call.callType || "Call in progress"}
                  {call.completedStepIds.length > 0 && (
                    <span className="text-slate-400">
                      {" "}
                      • {call.completedStepIds.length} step{call.completedStepIds.length > 1 ? "s" : ""} completed
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsNoteModalOpen(true)}
              className="border-sky-500/30 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20 text-xs h-8 px-2.5 rounded-xl gap-1"
              title="Add quick note to call"
            >
              <FileText className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Add Note</span>
            </Button>

            <Button
              size="sm"
              onClick={handleReturnToCall}
              className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs h-8 px-3 rounded-xl gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
            >
              <span>Return to Call</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsMinimized(!isMinimized)}
              className="text-slate-400 hover:text-white h-8 w-8 p-0 rounded-xl"
              title={isMinimized ? "Expand bar" : "Minimize bar"}
            >
              {isMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Note Floating Modal */}
      <Dialog open={isNoteModalOpen} onOpenChange={setIsNoteModalOpen}>
        <DialogContent className="max-w-md bg-[#07162B] border border-sky-500/30 text-white rounded-2xl shadow-2xl p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="h-4.5 w-4.5 text-amber-400" />
              Add Call Note
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-slate-300">
              Document details while speaking with <strong>{callerDisplayName}</strong> without navigating away:
            </p>
            <Textarea
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              placeholder="Type call observation, client request, or follow-up note..."
              rows={4}
              className="bg-[#040D1A] border-slate-700 text-white text-xs placeholder:text-slate-500 rounded-xl focus:border-amber-400"
              autoFocus
            />
          </div>
          <DialogFooter className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsNoteModalOpen(false)}
              className="text-slate-400 hover:text-white text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveQuickNote}
              className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs px-4 rounded-xl"
            >
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ActiveCallBar;
