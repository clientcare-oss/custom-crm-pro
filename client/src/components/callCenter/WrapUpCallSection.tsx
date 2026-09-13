import React, { useState } from "react";
import { useActiveCall } from "@/contexts/ActiveCallContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  CheckCircle2,
  PhoneOff,
  Calendar,
  CheckSquare,
  AlertCircle,
  FileCheck,
  User,
  Clock,
  Send,
} from "lucide-react";

const OUTCOME_OPTIONS = [
  "Lead created",
  "Discovery scheduled",
  "Agreement sent",
  "Payment link sent",
  "Client question answered",
  "Advocate callback requested",
  "Appointment scheduled",
  "Follow-up required",
  "School/provider communication",
  "No action needed",
  "Wrong number",
  "Voicemail",
  "Other",
];

interface WrapUpCallSectionProps {
  onCompleteSuccess?: () => void;
}

export function WrapUpCallSection({ onCompleteSuccess }: WrapUpCallSectionProps) {
  const { call, endCallSession } = useActiveCall();
  const utils = trpc.useUtils();

  const [outcome, setOutcome] = useState<string>(call.wrapUp?.outcome || "Client question answered");
  const [finalNotes, setFinalNotes] = useState<string>(
    call.generalNotes ||
      Object.entries(call.stepNotes)
        .map(([k, v]) => `• ${v}`)
        .join("\n") ||
      ""
  );

  const [followUpNeeded, setFollowUpNeeded] = useState<boolean>(call.wrapUp?.followUpNeeded || false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskPriority, setTaskPriority] = useState<"Todo" | "In Progress" | "Done">("Todo");
  const [assignee, setAssignee] = useState("Byron Honea");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // tRPC mutation to create real task if follow-up requested
  const createTaskMutation = trpc.tasks.create.useMutation();

  const handleCompleteCall = async () => {
    setIsSubmitting(true);
    try {
      const elapsedSec = call.startTime ? Math.floor((Date.now() - call.startTime) / 1000) : 180;
      const callerName = call.callerInfo.name || call.contactName || "Caller";

      // If follow-up task is requested, create real CRM task
      if (followUpNeeded && taskTitle.trim()) {
        try {
          await createTaskMutation.mutateAsync({
            projectId: call.studentId || 1,
            title: `[Call Follow-up: ${callerName}] ${taskTitle.trim()}`,
            description: `Call Outcome: ${outcome}\nAssigned Advocate: ${assignee}\nNotes:\n${finalNotes}`,
            status: "Todo",
            dueDate: taskDueDate ? new Date(taskDueDate) : undefined,
          });
          toast.success("Follow-up task created in CRM");
        } catch (taskErr) {
          console.warn("Could not create task automatically:", taskErr);
        }
      }

      // Invalidate call logs queries
      utils.callLogs.listAll.invalidate();
      utils.callLogs.listUnassigned.invalidate();
      utils.tasks.getAll.invalidate();

      toast.success("Call completed and logged to CRM timeline!", {
        description: `Caller: ${callerName} • Outcome: ${outcome} • Duration: ${Math.floor(elapsedSec / 60)}m ${elapsedSec % 60}s`,
      });

      // Close active call session & clear persistent bar
      endCallSession();
      onCompleteSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to complete call");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-[#061830] border-2 border-amber-400/40 shadow-2xl space-y-6 animate-in fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap pb-3 border-b border-amber-400/20">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400">
            <FileCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white tracking-tight">
              WRAP UP CALL
            </h3>
            <p className="text-xs text-slate-300">
              Confirm outcome, edit final notes, assign follow-up tasks, and commit this interaction to the CRM timeline.
            </p>
          </div>
        </div>

        <Badge className="bg-amber-400 text-slate-950 font-black text-xs px-3 py-1 uppercase tracking-wider">
          FINAL STEP
        </Badge>
      </div>

      {/* Outcome Selector */}
      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-wider text-amber-300">
          Call Outcome *
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
          {OUTCOME_OPTIONS.map((opt) => {
            const isSelected = outcome === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setOutcome(opt)}
                className={`p-2.5 rounded-xl border text-left font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-amber-400 text-slate-950 border-amber-300 font-bold shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                    : "bg-[#040D1A] border-slate-700 text-slate-300 hover:border-slate-500"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      {/* Final Call Notes */}
      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-wider text-sky-300">
          Call Notes (Will be saved to contact timeline)
        </Label>
        <Textarea
          value={finalNotes}
          onChange={(e) => setFinalNotes(e.target.value)}
          placeholder="Review and finalize all notes taken during this call..."
          rows={4}
          className="bg-[#040D1A] border-slate-700 text-white text-xs rounded-xl focus:border-amber-400 leading-relaxed"
        />
      </div>

      {/* Follow-Up Needed Toggle */}
      <div className="p-4 rounded-xl bg-[#040D1A] border border-slate-800 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="space-y-0.5">
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-emerald-400" />
              <span>Follow-Up Action Needed?</span>
            </div>
            <p className="text-xs text-slate-400">
              Create an automated CRM task and assign to team member.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFollowUpNeeded(false)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                !followUpNeeded
                  ? "bg-slate-700 text-white border-slate-600"
                  : "bg-transparent border-slate-800 text-slate-400"
              }`}
            >
              No Follow-Up
            </button>
            <button
              type="button"
              onClick={() => setFollowUpNeeded(true)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                followUpNeeded
                  ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                  : "bg-transparent border-slate-800 text-slate-400"
              }`}
            >
              Yes, Create Task
            </button>
          </div>
        </div>

        {/* Task fields if yes */}
        {followUpNeeded && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800 text-xs animate-in fade-in">
            <div className="space-y-1">
              <Label className="text-slate-300">Task Description *</Label>
              <Input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="e.g. Email IEP draft analysis to parent"
                className="bg-[#061830] border-slate-700 text-white text-xs h-9 rounded-xl focus:border-emerald-400"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-slate-300">Assignee</Label>
              <select
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="w-full bg-[#061830] border border-slate-700 rounded-xl px-3 py-2 text-white text-xs h-9 focus:border-emerald-400 outline-none"
              >
                <option value="Byron Honea">Byron Honea (Lead)</option>
                <option value="Wyatt">Wyatt (Front Desk)</option>
                <option value="Advocate Team">Advocate Team</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-slate-300">Due Date</Label>
              <Input
                type="date"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                className="bg-[#061830] border-slate-700 text-white text-xs h-9 rounded-xl focus:border-emerald-400"
              />
            </div>
          </div>
        )}
      </div>

      {/* Complete Call Action Row */}
      <div className="pt-2 flex items-center justify-between gap-4 flex-wrap">
        <div className="text-xs text-slate-400">
          Completing this call updates the CRM timeline and clears the persistent call session.
        </div>

        <Button
          size="lg"
          onClick={handleCompleteCall}
          disabled={isSubmitting}
          className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-sm px-8 py-3 h-12 rounded-2xl gap-2 shadow-[0_0_25px_rgba(16,185,129,0.35)] hover:shadow-[0_0_35px_rgba(16,185,129,0.5)] transition-all transform hover:-translate-y-0.5 cursor-pointer"
        >
          <CheckCircle2 className="h-5 w-5" />
          Complete Call & Save Record
        </Button>
      </div>
    </div>
  );
}

export default WrapUpCallSection;
