import React, { useState, useEffect, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  PhoneCall,
  CheckCircle2,
  Clock,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Save,
  Loader2,
  History,
  FileText,
  XCircle,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

interface LeadDiscoveryUnitProps {
  workspace: any;
  isSessionMode: boolean;
  onSetSessionMode: (session: boolean) => void;
  onRefresh: () => void;
  onNavigateStage: (
    stage: "inquiry" | "discovery" | "decision" | "onboarding",
    sessionMode?: boolean
  ) => void;
}

const DEFAULT_OPENING_SCRIPT = `"Hi, is this [Parent Name]?"

My name is [Your Name] with Waypoint Advocates. I'm calling for our scheduled discovery conversation about [Student Name] and how we can help. Do you have a few minutes?`;

const DEFAULT_VOICEMAIL_SCRIPT = `"Hi [Parent Name], this is [Your Name] with Waypoint Advocates calling for our discovery conversation about [Student Name]. Please give us a call back or reply when convenient so we can connect. Talk soon!"`;

const FALLBACK_DISCOVERY_QUESTIONS = [
  { id: 1, label: "Current Situation", subLabel: "What's going on right now?", mode: "both" },
  { id: 2, label: "IEP or 504?", subLabel: "Do they have one? Need one?", mode: "IEP/504" },
  { id: 3, label: "School Information", subLabel: "District, School, Grade, Teachers", mode: "both" },
  { id: 4, label: "Evaluations", subLabel: "Past evaluations or assessments?", mode: "both" },
  { id: 5, label: "Services & Supports", subLabel: "What services are in place now?", mode: "both" },
  { id: 6, label: "Behavior / Social", subLabel: "Behavior concerns or supports?", mode: "both" },
  { id: 7, label: "Challenges", subLabel: "What are the biggest challenges?", mode: "both" },
  { id: 8, label: "Goals", subLabel: "What are you hoping changes?", mode: "both" },
  { id: 9, label: "Timeline & Urgency", subLabel: "How soon do you need help?", mode: "both" },
];

export function LeadDiscoveryUnit({
  workspace,
  isSessionMode,
  onSetSessionMode,
  onRefresh,
  onNavigateStage,
}: LeadDiscoveryUnitProps) {
  const { lead, students = [], discoveryCall, appointments = [], journey } = workspace;

  const { data: rawQuestions = [] } = trpc.discovery.getQuestions.useQuery();
  const questions = rawQuestions.length > 0 ? rawQuestions : FALLBACK_DISCOVERY_QUESTIONS;

  // Local draft state synced with `discovery.save`
  const [theirStoryNotes, setTheirStoryNotes] = useState(
    discoveryCall?.theirStoryNotes || ""
  );
  const [howItWorksNotes, setHowItWorksNotes] = useState(
    discoveryCall?.howItWorksNotes || ""
  );
  const [additionalNotes, setAdditionalNotes] = useState(
    discoveryCall?.additionalNotes || ""
  );
  const [questionNotes, setQuestionNotes] = useState<Record<string, string>>(() => {
    if (discoveryCall?.questionNotes) {
      try {
        return JSON.parse(discoveryCall.questionNotes);
      } catch {}
    }
    return {};
  });

  const [activePromptTab, setActivePromptTab] = useState<
    "prompts" | "story" | "scripts"
  >("prompts");
  const [expandedPromptId, setExpandedPromptId] = useState<number | null>(null);
  const [copiedScript, setCopiedScript] = useState<string | null>(null);

  // Scheduling controls
  const tomorrowDefault = new Date(Date.now() + 86400000);
  tomorrowDefault.setHours(10, 0, 0, 0);
  const [scheduleDate, setScheduleDate] = useState(
    tomorrowDefault.toISOString().slice(0, 10)
  );
  const [scheduleTime, setScheduleTime] = useState("10:00");
  const [scheduleNotes, setScheduleNotes] = useState("");
  const [showRescheduleForm, setShowRescheduleForm] = useState(false);

  // Complete Discovery Outcome modal/drawer state
  const [showCompletePanel, setShowCompletePanel] = useState(false);
  const [progressedToDecisionBanner, setProgressedToDecisionBanner] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<
    | "completed"
    | "no_answer"
    | "reschedule_needed"
    | "follow_up_later"
    | "cancelled"
    | "declined"
  >("completed");
  const [outcomeNote, setOutcomeNote] = useState("");
  const [nextActionLabel, setNextActionLabel] = useState("Retry the call tomorrow");
  const [nextActionDate, setNextActionDate] = useState(
    tomorrowDefault.toISOString().slice(0, 10)
  );
  const [rescheduleDate, setRescheduleDate] = useState(
    tomorrowDefault.toISOString().slice(0, 10)
  );
  const [rescheduleTime, setRescheduleTime] = useState("14:00");
  const [declineReason, setDeclineReason] = useState("");

  // Autosave draft persistence
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!discoveryCall) return;
    setTheirStoryNotes(discoveryCall.theirStoryNotes || "");
    setHowItWorksNotes(discoveryCall.howItWorksNotes || "");
    setAdditionalNotes(discoveryCall.additionalNotes || "");
    if (discoveryCall.questionNotes) {
      try {
        setQuestionNotes(JSON.parse(discoveryCall.questionNotes));
      } catch {}
    }
  }, [
    discoveryCall?.id,
    discoveryCall?.theirStoryNotes,
    discoveryCall?.howItWorksNotes,
    discoveryCall?.additionalNotes,
    discoveryCall?.questionNotes,
  ]);

  // Default first prompt expanded
  useEffect(() => {
    if (questions.length > 0 && expandedPromptId === null) {
      setExpandedPromptId(questions[0].id);
    }
  }, [questions.length]);

  const saveDraftMutation = trpc.discovery.save.useMutation({
    onSuccess: () => {
      setSavingDraft(false);
      setLastSavedAt(new Date());
      onRefresh();
    },
    onError: () => setSavingDraft(false),
  });

  const triggerDraftSave = useCallback(
    (overrides?: {
      story?: string;
      howItWorks?: string;
      additional?: string;
      qNotes?: Record<string, string>;
    }) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        setSavingDraft(true);
        saveDraftMutation.mutate({
          leadId: lead.id,
          theirStoryNotes: overrides?.story ?? theirStoryNotes,
          howItWorksNotes: overrides?.howItWorks ?? howItWorksNotes,
          additionalNotes: overrides?.additional ?? additionalNotes,
          questionNotes: JSON.stringify(overrides?.qNotes ?? questionNotes),
        });
      }, 650);
    },
    [lead.id, theirStoryNotes, howItWorksNotes, additionalNotes, questionNotes]
  );

  const scheduleDiscoveryMutation = trpc.leads.scheduleDiscovery.useMutation({
    onSuccess: () => {
      toast.success("Discovery appointment scheduled");
      setShowRescheduleForm(false);
      onRefresh();
    },
    onError: (err) => toast.error(err.message),
  });

  const startDiscoveryMutation = trpc.leads.startDiscoveryNow.useMutation({
    onSuccess: () => {
      onSetSessionMode(true);
      onRefresh();
    },
    onError: (err) => toast.error(err.message),
  });

  const completeDiscoveryMutation = trpc.leads.completeDiscovery.useMutation({
    onSuccess: (updatedWs, vars) => {
      setShowCompletePanel(false);
      onRefresh();
      if (vars.outcome === "completed") {
        toast.success("Discovery saved · Lead progressed to Decision");
        setProgressedToDecisionBanner(true);
        onSetSessionMode(false);
      } else if (vars.outcome === "declined") {
        toast.success("Lead marked Not proceeding");
        onSetSessionMode(false);
      } else {
        toast.success(
          `Recorded outcome: ${
            vars.outcome === "no_answer"
              ? "No answer"
              : vars.outcome === "reschedule_needed"
              ? "Reschedule needed"
              : vars.outcome === "follow_up_later"
              ? "Follow up later"
              : "Canceled"
          }`
        );
        onSetSessionMode(false);
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const handleProgressToDecisionDirect = () => {
    completeDiscoveryMutation.mutate({
      leadId: lead.id,
      outcome: "completed",
      note: "Discovery completed in Lead Center · Progressed to Decision.",
      theirStoryNotes,
      howItWorksNotes,
      additionalNotes,
      questionNotes,
    });
  };

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const startTime = new Date(`${scheduleDate}T${scheduleTime}:00`);
    if (isNaN(startTime.getTime())) {
      toast.error("Please select a valid date and time.");
      return;
    }
    scheduleDiscoveryMutation.mutate({
      leadId: lead.id,
      startTime,
      durationMinutes: 30,
      notes: scheduleNotes.trim() || undefined,
    });
  };

  const handleCompleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedOutcome === "declined" && !declineReason.trim()) {
      toast.error("Please enter or select a reason when the family explicitly declines.");
      return;
    }

    let rescheduleStartTime: Date | null = null;
    if (selectedOutcome === "reschedule_needed" && rescheduleDate && rescheduleTime) {
      const parsed = new Date(`${rescheduleDate}T${rescheduleTime}:00`);
      if (!isNaN(parsed.getTime())) {
        rescheduleStartTime = parsed;
      }
    }

    completeDiscoveryMutation.mutate({
      leadId: lead.id,
      outcome: selectedOutcome,
      note: outcomeNote.trim() || undefined,
      nextActionLabel:
        selectedOutcome === "no_answer" ||
        selectedOutcome === "follow_up_later" ||
        selectedOutcome === "cancelled"
          ? nextActionLabel
          : undefined,
      nextActionDate:
        (selectedOutcome === "no_answer" ||
          selectedOutcome === "follow_up_later" ||
          selectedOutcome === "cancelled") &&
        nextActionDate
          ? new Date(`${nextActionDate}T10:00:00`)
          : null,
      rescheduleStartTime,
      declineReason: selectedOutcome === "declined" ? declineReason.trim() : undefined,
      theirStoryNotes,
      howItWorksNotes,
      additionalNotes,
      questionNotes,
    });
  };

  const scheduledAt = discoveryCall?.scheduledAt || lead.discoveryCallDate;
  const upcomingApt =
    appointments.find((a: any) => a.status !== "Cancelled") || null;
  const dState = isSessionMode ? "in_progress" : journey.discoveryState;
  const callAttempts = journey.callAttempts || [];

  const personalizeScript = (raw: string) => {
    const pName = lead.parentName || "there";
    const sName =
      students.map((s: any) => s.firstName).filter(Boolean).join(" & ") ||
      lead.studentName ||
      "your child";
    return raw
      .replace(/\[Parent Name\]/gi, pName)
      .replace(/\[Student Name\]/gi, sName)
      .replace(/\[Your Name\]/gi, "Byron");
  };

  return (
    <div data-testid="lead-discovery-unit" className="space-y-5">
      {/* ── Top Task-Focused Status Bar ── */}
      {dState === "unscheduled" && !isSessionMode && (
        <div
          data-testid="discovery-state-unscheduled"
          className="rounded-xl border border-[#162952] bg-[#040D26] p-5 space-y-4 shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white">
                  {journey.discoveryOutcome !== "pending"
                    ? `Discovery · ${
                        journey.discoveryOutcome === "no_answer"
                          ? "No answer"
                          : journey.discoveryOutcome === "reschedule_needed"
                          ? "Reschedule needed"
                          : "Cancelled"
                      }`
                    : "Schedule Discovery Call"}
                </h2>
                <Badge className="bg-[#0D1E47] text-[#FFE394] border-[#D4AF37]/40 text-[11px]">
                  Next: {journey.nextActionLabel}
                </Badge>
              </div>
              <p className="text-xs text-slate-300">
                Book a discovery consultation on the calendar or start a live discovery session now.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Button
                type="button"
                variant="outline"
                data-testid="discovery-record-attempt-btn"
                onClick={() => {
                  setSelectedOutcome("no_answer");
                  setShowCompletePanel(true);
                }}
                className="h-9 border-[#243E73] bg-[#071333] text-slate-200 hover:bg-[#0D1E47] text-xs cursor-pointer"
              >
                Record Call Outcome
              </Button>
              <Button
                type="button"
                data-testid="discovery-start-live-btn"
                onClick={() => startDiscoveryMutation.mutate({ leadId: lead.id })}
                className="h-9 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] font-semibold hover:brightness-110 text-xs cursor-pointer"
              >
                <PhoneCall className="w-3.5 h-3.5 mr-1.5" />
                Start Discovery Now
              </Button>
            </div>
          </div>

          <form
            onSubmit={handleScheduleSubmit}
            className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-[#162952]"
          >
            <div>
              <label className="text-[11px] text-slate-300 mb-1 block">Date</label>
              <Input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="h-9 bg-[#02091A] border-[#162952] text-white text-xs"
                required
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-300 mb-1 block">Time</label>
              <Input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="h-9 bg-[#02091A] border-[#162952] text-white text-xs"
                required
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-300 mb-1 block">
                Note (Optional)
              </label>
              <Input
                value={scheduleNotes}
                onChange={(e) => setScheduleNotes(e.target.value)}
                placeholder="Preparation or contact note"
                className="h-9 bg-[#02091A] border-[#162952] text-white text-xs"
              />
            </div>
            <div className="flex items-end">
              <Button
                type="submit"
                data-testid="discovery-schedule-submit-btn"
                disabled={scheduleDiscoveryMutation.isPending}
                className="w-full h-9 bg-[#102347] border border-[#D4AF37]/50 text-[#FFE394] hover:bg-[#162F5E] text-xs font-semibold cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 mr-1.5" />
                Schedule Discovery
              </Button>
            </div>
          </form>
        </div>
      )}

      {dState === "scheduled" && !isSessionMode && (
        <div
          data-testid="discovery-state-scheduled"
          className="rounded-xl border border-[#1E3A6D] bg-[#040D26] p-5 space-y-4 shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge className="bg-[#102347] text-[#FFE394] border-[#D4AF37]/40 text-[11px]">
                  <Calendar className="w-3 h-3 mr-1" />
                  Scheduled
                </Badge>
                <h2 className="text-base font-semibold text-white">
                  Upcoming Discovery Appointment
                </h2>
              </div>
              <p className="text-sm text-slate-200 font-medium">
                {scheduledAt
                  ? new Date(scheduledAt).toLocaleString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "Appointment linked"}
                {upcomingApt?.assignedAdvocateName
                  ? ` · Advocate: ${upcomingApt.assignedAdvocateName}`
                  : ""}
              </p>
              <p className="text-xs text-slate-400">
                Contact: {lead.parentName} ({lead.parentPhone || lead.parentEmail || "No phone"})
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRescheduleForm((p) => !p)}
                className="h-9 border-[#243E73] bg-[#071333] text-slate-200 hover:bg-[#0D1E47] text-xs cursor-pointer"
              >
                Reschedule
              </Button>
              <Button
                type="button"
                variant="outline"
                data-testid="scheduled-record-outcome-btn"
                onClick={() => {
                  setSelectedOutcome("no_answer");
                  setShowCompletePanel(true);
                }}
                className="h-9 border-[#243E73] bg-[#071333] text-slate-200 hover:bg-[#0D1E47] text-xs cursor-pointer"
              >
                No Answer / Outcome
              </Button>
              <Button
                type="button"
                data-testid="start-scheduled-discovery-btn"
                onClick={() => startDiscoveryMutation.mutate({ leadId: lead.id })}
                className="h-9 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] font-semibold hover:brightness-110 text-xs cursor-pointer"
              >
                <PhoneCall className="w-3.5 h-3.5 mr-1.5" />
                Start Discovery
              </Button>
            </div>
          </div>

          {showRescheduleForm && (
            <form
              onSubmit={handleScheduleSubmit}
              className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-[#162952]"
            >
              <Input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="h-9 bg-[#02091A] border-[#162952] text-white text-xs"
                required
              />
              <Input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="h-9 bg-[#02091A] border-[#162952] text-white text-xs"
                required
              />
              <Input
                value={scheduleNotes}
                onChange={(e) => setScheduleNotes(e.target.value)}
                placeholder="Reason for reschedule"
                className="h-9 bg-[#02091A] border-[#162952] text-white text-xs"
              />
              <Button
                type="submit"
                className="h-9 bg-[#102347] border border-[#D4AF37]/50 text-[#FFE394] text-xs cursor-pointer"
              >
                Update Appointment
              </Button>
            </form>
          )}
        </div>
      )}

      {dState === "completed" && !isSessionMode && (
        <div
          data-testid="discovery-state-completed"
          className="rounded-xl border border-[#1E3A6D] bg-[#040D26] p-5 space-y-4 shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-400/30 text-[11px]">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Discovery Completed
                </Badge>
                <span className="text-xs text-slate-400">
                  Next: {journey.nextActionLabel}
                </span>
              </div>
              <h2 className="text-base font-semibold text-white">
                Discovery Call Summary
              </h2>
              <p className="text-xs text-slate-300 max-w-2xl">
                {theirStoryNotes ||
                  additionalNotes ||
                  journey.concerns ||
                  "Discovery call completed. Ready to manage the family's decision."}
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onSetSessionMode(true)}
                className="h-9 border-[#243E73] bg-[#071333] text-slate-200 hover:bg-[#0D1E47] text-xs cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 mr-1.5" />
                Review Session Notes
              </Button>
              <Button
                type="button"
                 data-testid="discovery-continue-to-decision-btn"
                onClick={() => onNavigateStage("decision", false)}
                className="h-9 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] font-semibold hover:brightness-110 text-xs cursor-pointer"
              >
                Open Decision →
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Complete Discovery Outcome Panel ── */}
      {showCompletePanel && (
        <form
          onSubmit={handleCompleteSubmit}
          data-testid="complete-discovery-outcome-panel"
          className="rounded-xl border border-[#D4AF37]/55 bg-[#06122E] p-5 space-y-4 shadow-[0_14px_34px_rgba(0,0,0,0.75)]"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Record Discovery Call Outcome
              </h3>
              <p className="text-xs text-slate-300">
                Choose the outcome of this call attempt. All attempts are preserved in history.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCompletePanel(false)}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
            {[
              { key: "completed", label: "Completed", desc: "Progress to Decision" },
              { key: "no_answer", label: "No answer", desc: "Stay in Discovery" },
              {
                key: "reschedule_needed",
                label: "Needs rescheduling",
                desc: "Stay in Discovery",
              },
              {
                key: "follow_up_later",
                label: "Follow up later",
                desc: "Stay in Discovery",
              },
              { key: "cancelled", label: "Canceled", desc: "Stay in Discovery" },
              {
                key: "declined",
                label: "Not proceeding",
                desc: "Close Lead",
              },
            ].map((opt) => (
              <button
                key={opt.key}
                type="button"
                data-testid={`discovery-outcome-option-${opt.key}`}
                onClick={() => {
                  setSelectedOutcome(opt.key as any);
                  if (opt.key === "follow_up_later") {
                    setNextActionLabel("Follow up with family on discovery");
                  } else if (opt.key === "no_answer") {
                    setNextActionLabel("Retry the call tomorrow");
                  }
                }}
                className={`rounded-lg border p-2.5 text-left transition-all cursor-pointer ${
                  selectedOutcome === opt.key
                    ? "bg-[#102347] border-[#D4AF37] text-white"
                    : "bg-[#02091A] border-[#162952] text-slate-300 hover:border-slate-600"
                }`}
              >
                <p className="text-xs font-semibold">{opt.label}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>

          {/* Contextual Outcome Controls */}
          {(selectedOutcome === "no_answer" ||
            selectedOutcome === "follow_up_later" ||
            selectedOutcome === "cancelled") && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] text-slate-300 mb-1 block">
                  Next Action
                </label>
                <Input
                  value={nextActionLabel}
                  onChange={(e) => setNextActionLabel(e.target.value)}
                  placeholder="e.g. Retry the call tomorrow"
                  className="h-9 bg-[#02091A] border-[#162952] text-white text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-300 mb-1 block">
                  Follow-up / Retry Date
                </label>
                <Input
                  type="date"
                  value={nextActionDate}
                  onChange={(e) => setNextActionDate(e.target.value)}
                  className="h-9 bg-[#02091A] border-[#162952] text-white text-xs"
                />
              </div>
            </div>
          )}

          {selectedOutcome === "reschedule_needed" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] text-slate-300 mb-1 block">
                  New Discovery Date (Optional if not yet chosen)
                </label>
                <Input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="h-9 bg-[#02091A] border-[#162952] text-white text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-300 mb-1 block">
                  New Discovery Time
                </label>
                <Input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="h-9 bg-[#02091A] border-[#162952] text-white text-xs"
                />
              </div>
            </div>
          )}

          {selectedOutcome === "declined" && (
            <div>
              <label className="text-[11px] text-slate-300 mb-1 block">
                Decline / Early Closure Reason *
              </label>
              <Input
                data-testid="discovery-decline-reason-input"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="e.g. Family resolved issue with district or declined services"
                className="h-9 bg-[#02091A] border-[#162952] text-white text-xs"
                required
              />
            </div>
          )}

          <div>
            <label className="text-[11px] text-slate-300 mb-1 block">
              Call Outcome Note (Optional)
            </label>
            <Textarea
              data-testid="discovery-outcome-note-input"
              value={outcomeNote}
              onChange={(e) => setOutcomeNote(e.target.value)}
              placeholder="Brief summary of the call or attempt..."
              rows={2}
              className="bg-[#02091A] border-[#162952] text-white text-xs resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCompletePanel(false)}
              className="h-8 text-xs border-[#1E3358] bg-[#040D26] text-slate-300 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-testid="confirm-discovery-outcome-btn"
              disabled={completeDiscoveryMutation.isPending}
              className="h-8 text-xs bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] font-semibold cursor-pointer"
            >
              {completeDiscoveryMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Saving Outcome...
                </>
              ) : selectedOutcome === "completed" ? (
                "Complete Discovery & Open Decision →"
              ) : selectedOutcome === "declined" ? (
                "Close Lead"
              ) : (
                "Save Call Attempt"
              )}
            </Button>
          </div>
        </form>
      )}

      {/* ── Live / Active Discovery Session Workspace (`PG-003-SES`) ── */}
      {(dState === "in_progress" || isSessionMode) && (
        <div
          data-testid="discovery-session-workspace"
          className="rounded-xl border border-[#162952] bg-[#040D26] p-5 space-y-5 shadow-[0_10px_28px_rgba(0,0,0,0.5)]"
        >
          {/* Session Top Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#162952] pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge className="bg-[#102347] text-[#FFE394] border-[#D4AF37]/40 text-[10px]">
                  Discovery Session · PG-003-SES
                </Badge>
                {savingDraft ? (
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Saving draft...
                  </span>
                ) : lastSavedAt ? (
                  <span className="text-[11px] text-emerald-400">
                    Draft saved {lastSavedAt.toLocaleTimeString()}
                  </span>
                ) : null}
              </div>
              <h3 className="text-sm font-semibold text-white">
                Conducting Discovery with {lead.parentName}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => triggerDraftSave()}
                className="h-8 border-[#243E73] bg-[#071333] text-slate-200 text-xs cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                Save Draft
              </Button>
              <Button
                type="button"
                size="sm"
                data-testid="open-complete-discovery-btn"
                onClick={() => {
                  setSelectedOutcome("completed");
                  setShowCompletePanel(true);
                }}
                className="h-8 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] font-semibold text-xs cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Complete Discovery
              </Button>
            </div>
          </div>

          {/* Readily Accessible Concerns & Desired Outcome Context Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg border border-[#162952] bg-[#02091A] p-3.5">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#FFE394] block">
                Main Concerns (From Inquiry)
              </span>
              <p className="text-xs text-slate-200 mt-0.5">
                {journey.concerns || "No initial concerns recorded."}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#FFE394] block">
                Desired Outcome
              </span>
              <p className="text-xs text-slate-200 mt-0.5">
                {journey.desiredOutcome || "Clarify goals during discovery."}
              </p>
            </div>
          </div>

          {/* Focused Workspace Sub-Navigation (Avoids a long wall of fields) */}
          <div className="flex items-center gap-2 border-b border-[#162952] pb-2">
            {[
              { id: "prompts", label: `Discovery Prompts (${questions.length})` },
              { id: "story", label: "Their Story & Session Notes" },
              { id: "scripts", label: "Opening & Voicemail Scripts" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActivePromptTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activePromptTab === tab.id
                    ? "bg-[#102347] text-[#FFE394] border border-[#D4AF37]/40"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Focused Discovery Prompts */}
          {activePromptTab === "prompts" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Left Prompt Selector List */}
              <div className="md:col-span-5 space-y-1.5">
                {questions.map((q: any, idx: number) => {
                  const hasNote = Boolean((questionNotes[q.id] || "").trim());
                  const isSelected = expandedPromptId === q.id;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setExpandedPromptId(q.id)}
                      className={`w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-[#0D1E47] border-[#D4AF37]/50 text-white"
                          : "bg-[#02091A] border-[#162952] text-slate-300 hover:bg-[#06122E]"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">
                          {idx + 1}. {q.label}
                        </p>
                        {q.subLabel && (
                          <p className="text-[11px] text-slate-400 truncate">
                            {q.subLabel}
                          </p>
                        )}
                      </div>
                      {hasNote && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Right Active Prompt Note Editor + Overall Summary */}
              <div className="md:col-span-7 space-y-4">
                {(() => {
                  const activeQ =
                    questions.find((q: any) => q.id === expandedPromptId) ||
                    questions[0];
                  if (!activeQ) return null;
                  return (
                    <div className="rounded-lg border border-[#162952] bg-[#02091A] p-4 space-y-2.5">
                      <div>
                        <h4 className="text-sm font-semibold text-white">
                          {activeQ.label}
                        </h4>
                        {activeQ.subLabel && (
                          <p className="text-xs text-slate-400">{activeQ.subLabel}</p>
                        )}
                      </div>
                      <Textarea
                        data-testid={`discovery-prompt-note-${activeQ.id}`}
                        value={questionNotes[activeQ.id] || ""}
                        onChange={(e) => {
                          const next = {
                            ...questionNotes,
                            [activeQ.id]: e.target.value,
                          };
                          setQuestionNotes(next);
                          triggerDraftSave({ qNotes: next });
                        }}
                        placeholder={`Capture notes for "${activeQ.label}"...`}
                        rows={5}
                        className="bg-[#040D26] border-[#162952] text-white text-xs leading-relaxed resize-none"
                      />
                    </div>
                  );
                })()}

                <div className="rounded-lg border border-[#162952] bg-[#02091A] p-4 space-y-2">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Key Discovery Summary & Takeaways
                  </label>
                  <Textarea
                    data-testid="discovery-story-notes-input"
                    value={theirStoryNotes}
                    onChange={(e) => {
                      setTheirStoryNotes(e.target.value);
                      triggerDraftSave({ story: e.target.value });
                    }}
                    placeholder="Capture overall discovery takeaways, family dynamics, and recommended advocacy approach..."
                    rows={3}
                    className="bg-[#040D26] border-[#162952] text-white text-xs leading-relaxed resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Story & How Waypoint Works Notes */}
          {activePromptTab === "story" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Their Story & Current School Context
                </label>
                <Textarea
                  value={theirStoryNotes}
                  onChange={(e) => {
                    setTheirStoryNotes(e.target.value);
                    triggerDraftSave({ story: e.target.value });
                  }}
                  rows={6}
                  placeholder="Detailed notes on the student's situation, evaluations, and IEP/504 status..."
                  className="bg-[#02091A] border-[#162952] text-white text-xs leading-relaxed resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  How Waypoint Works & Plan Discussion Notes
                </label>
                <Textarea
                  value={howItWorksNotes}
                  onChange={(e) => {
                    setHowItWorksNotes(e.target.value);
                    triggerDraftSave({ howItWorks: e.target.value });
                  }}
                  rows={6}
                  placeholder="Notes on plans discussed (Navigator, Anchor, Family) and questions answered..."
                  className="bg-[#02091A] border-[#162952] text-white text-xs leading-relaxed resize-none"
                />
              </div>
            </div>
          )}

          {/* Tab 3: Opening & Voicemail Scripts */}
          {activePromptTab === "scripts" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-[#162952] bg-[#02091A] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#FFE394]">
                    Opening Call Script
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        personalizeScript(
                          discoveryCall?.openingScript || DEFAULT_OPENING_SCRIPT
                        )
                      );
                      setCopiedScript("opening");
                      setTimeout(() => setCopiedScript(null), 2000);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-300 hover:text-white cursor-pointer"
                  >
                    {copiedScript === "opening" ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    Copy
                  </button>
                </div>
                <p className="text-xs text-slate-200 whitespace-pre-line leading-relaxed">
                  {personalizeScript(
                    discoveryCall?.openingScript || DEFAULT_OPENING_SCRIPT
                  )}
                </p>
              </div>

              <div className="rounded-lg border border-[#162952] bg-[#02091A] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#FFE394]">
                    Voicemail Script
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        personalizeScript(
                          discoveryCall?.voicemailScript || DEFAULT_VOICEMAIL_SCRIPT
                        )
                      );
                      setCopiedScript("voicemail");
                      setTimeout(() => setCopiedScript(null), 2000);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-300 hover:text-white cursor-pointer"
                  >
                    {copiedScript === "voicemail" ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    Copy
                  </button>
                </div>
                <p className="text-xs text-slate-200 whitespace-pre-line leading-relaxed">
                  {personalizeScript(
                    discoveryCall?.voicemailScript || DEFAULT_VOICEMAIL_SCRIPT
                  )}
                </p>
              </div>
            </div>
          )}

          {/* ── Bottom Action Bar inside Discovery Process: Progress to Decision + Follow-up Outcomes ── */}
          <div className="pt-4 border-t border-[#162952] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-slate-400 mr-1">
                Other call outcomes:
              </span>
              {[
                { key: "no_answer", label: "No answer" },
                { key: "reschedule_needed", label: "Needs rescheduling" },
                { key: "follow_up_later", label: "Follow up later" },
                { key: "declined", label: "Not proceeding" },
              ].map((o) => (
                <button
                  key={o.key}
                  type="button"
                  data-testid={`discovery-bottom-outcome-${o.key}`}
                  onClick={() => {
                    setSelectedOutcome(o.key as any);
                    if (o.key === "follow_up_later") {
                      setNextActionLabel("Follow up with family on discovery");
                    } else if (o.key === "no_answer") {
                      setNextActionLabel("Retry the call tomorrow");
                    }
                    setShowCompletePanel(true);
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-[#1E335C] bg-[#02091A] text-slate-300 hover:text-white hover:border-[#345494] transition-colors cursor-pointer"
                >
                  {o.label}
                </button>
              ))}
            </div>

            <Button
              type="button"
              data-testid="progress-to-decision-btn"
              disabled={completeDiscoveryMutation.isPending}
              onClick={handleProgressToDecisionDirect}
              className="h-9 px-5 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] font-semibold hover:brightness-110 text-xs cursor-pointer shadow-md"
            >
              {completeDiscoveryMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Saving & Progressing...
                </>
              ) : (
                <>
                  Progress to Decision
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation Banner when Progressed to Decision: Offers Open Decision immediately */}
      {progressedToDecisionBanner && (
        <div
          data-testid="progressed-to-decision-banner"
          className="rounded-xl border border-emerald-500/40 bg-[#061A2E] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-white">
                Discovery completed · Lead moved to Decision
              </p>
              <p className="text-xs text-slate-300">
                Discovery notes and call outcome have been saved, and radio stage counts have been updated.
              </p>
            </div>
          </div>
          <Button
            type="button"
            data-testid="open-decision-after-discovery-btn"
            onClick={() => onNavigateStage("decision", false)}
            className="h-9 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] font-semibold text-xs cursor-pointer shrink-0"
          >
            Open Decision →
          </Button>
        </div>
      )}

      {/* ── Call Attempt History (Always Preserved, Never Overwritten) ── */}
      {callAttempts.length > 0 && (
        <div
          data-testid="discovery-attempt-history"
          className="rounded-xl border border-[#162952] bg-[#040D26] p-4 space-y-2.5"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-[#FFE394]" />
              Call Attempt History ({callAttempts.length})
            </h4>
          </div>
          <div className="space-y-2">
            {callAttempts.map((att: any) => (
              <div
                key={att.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-[#162952] bg-[#02091A] px-3.5 py-2.5 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">
                      {att.outcomeLabel}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(att.timestamp).toLocaleString()}
                    </span>
                  </div>
                  {att.note && <p className="text-slate-300">{att.note}</p>}
                </div>
                {att.nextAction && (
                  <Badge className="bg-[#0D1E47] text-[#FFE394] border-[#D4AF37]/30 text-[10px] shrink-0">
                    Next: {att.nextAction}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
