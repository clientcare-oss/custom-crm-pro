import React, { useState, useEffect } from "react";
import {
  X,
  Star,
  Send,
  Clock,
  Ban,
  Calendar,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  Lock,
  ExternalLink,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface ReviewOpportunityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: number;
  studentId?: number;
  studentName?: string;
  parentName?: string;
  parentEmail?: string;
  milestoneTitle?: string;
  currentStatus?: string;
  initialMode?: "composer" | "remind" | "suppress" | "thankyou";
  onSuccess?: () => void;
}

export function ReviewOpportunityDrawer({
  isOpen,
  onClose,
  accountId,
  studentId,
  studentName = "Student",
  parentName = "Parent",
  parentEmail = "",
  milestoneTitle = "First Completed Advocacy Meeting",
  currentStatus = "eligible",
  initialMode = "composer",
  onSuccess,
}: ReviewOpportunityDrawerProps) {
  const [mode, setMode] = useState<"composer" | "remind" | "suppress" | "thankyou">(initialMode);

  // Sync mode when drawer opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);

  const utils = trpc.useUtils();

  // Review request composer state
  const parentFirstName = parentName.split(" ")[0] || "Parent";
  const defaultReviewUrl = "https://g.page/r/waypoint-advocates/review";
  const [recipientEmail, setRecipientEmail] = useState(parentEmail);
  const [subject, setSubject] = useState("Thank You for Allowing Waypoint to Support Your Family");
  const [messageBody, setMessageBody] = useState(
    `Hi ${parentFirstName},\n\nThank you for allowing Waypoint Advocates to be part of your family's educational journey.\n\nIf you feel comfortable sharing your experience, we would appreciate an honest review. Your feedback helps other families learn about the support available to them.\n\n${defaultReviewUrl}\n\nThank you for trusting Waypoint Advocates.\n\nWaypoint Advocates\nNavigate with Confidence.`
  );
  const [requestChannel, setRequestChannel] = useState<"email" | "sms" | "portal">("email");

  // Remind Me Later state
  const [remindPreset, setRemindPreset] = useState<"tomorrow" | "3days" | "7days" | "custom">("3days");
  const [customRemindDate, setCustomRemindDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split("T")[0];
  });
  const [remindNotes, setRemindNotes] = useState("");

  // Not Appropriate Right Now (Suppression) state
  const [suppressReason, setSuppressReason] = useState<string>("Meeting was difficult");
  const [suppressNotes, setSuppressNotes] = useState("");

  // Keep recipient email in sync when prop changes
  useEffect(() => {
    if (parentEmail) {
      setRecipientEmail(parentEmail);
    }
  }, [parentEmail]);

  // Mutations
  const requestMutation = trpc.reviewTracker.requestReview.useMutation({
    onSuccess: () => {
      toast.success("Review request recorded and dispatched!");
      utils.reviewTracker.getByAccount.invalidate({ accountId });
      if (studentId) {
        utils.reviewTracker.getByStudent.invalidate({ studentId });
      }
      utils.reviewTracker.listPendingOpportunities.invalidate();
      onSuccess?.();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const remindMutation = trpc.reviewTracker.remindLater.useMutation({
    onSuccess: () => {
      toast.success("Reminder saved. We'll surface this opportunity when due.");
      utils.reviewTracker.getByAccount.invalidate({ accountId });
      if (studentId) {
        utils.reviewTracker.getByStudent.invalidate({ studentId });
      }
      utils.reviewTracker.listPendingOpportunities.invalidate();
      onSuccess?.();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const suppressMutation = trpc.reviewTracker.suppressOpportunity.useMutation({
    onSuccess: () => {
      toast.success("Opportunity dismissed. You can reconsider at any time.");
      utils.reviewTracker.getByAccount.invalidate({ accountId });
      if (studentId) {
        utils.reviewTracker.getByStudent.invalidate({ studentId });
      }
      utils.reviewTracker.listPendingOpportunities.invalidate();
      onSuccess?.();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  if (!isOpen) return null;

  const handleSendRequest = () => {
    requestMutation.mutate({
      accountId,
      studentId,
      requestedBy: "Byron Honea",
      requestChannel,
      customSubject: subject,
      customBody: messageBody,
      reviewUrl: defaultReviewUrl,
      followUpDays: 14,
    });
  };

  const handleSaveReminder = () => {
    let targetDate = new Date();
    if (remindPreset === "tomorrow") {
      targetDate.setDate(targetDate.getDate() + 1);
    } else if (remindPreset === "3days") {
      targetDate.setDate(targetDate.getDate() + 3);
    } else if (remindPreset === "7days") {
      targetDate.setDate(targetDate.getDate() + 7);
    } else {
      targetDate = new Date(customRemindDate);
    }

    remindMutation.mutate({
      accountId,
      studentId,
      reminderDate: targetDate.toISOString(),
      notes: remindNotes || undefined,
      employee: "Byron Honea",
    });
  };

  const handleSuppress = () => {
    suppressMutation.mutate({
      accountId,
      studentId,
      reason: suppressReason,
      notes: suppressNotes || undefined,
      suppressedBy: "Byron Honea",
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div
          className="w-screen max-w-md md:max-w-lg bg-[#07162B] border-l border-[#3A2C18] text-[#FFF4D4] shadow-2xl flex flex-col justify-between"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at 50% 0%, #102B4E 0%, #07162B 65%, #030D1A 100%)",
          }}
        >
          {/* Header */}
          <div className="p-6 border-b border-[#3A2C18]/80 bg-[#05142B]/90 flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-500/15 border border-[#C5A059]/40 text-[#FFE394]">
                  <Star className="w-4 h-4 fill-[#FFE394] text-[#FFE394]" />
                </span>
                <h3
                  className="text-lg font-bold text-[#FFF4D4]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Review Opportunity
                </h3>
              </div>
              <p className="text-xs text-[#C6B697]">
                Milestone: <span className="text-[#FFE394] font-medium">{milestoneTitle}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border border-[#3A2C18] bg-[#020A17]/80 hover:bg-[#07162B] text-[#C6B697] hover:text-[#FFF4D4] transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="px-6 pt-4 pb-2 flex gap-2 border-b border-[#3A2C18]/40 bg-[#030D1A]/50">
            <button
              onClick={() => setMode("composer")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                mode === "composer"
                  ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-md font-bold"
                  : "bg-[#020A17]/80 border border-[#3A2C18] text-[#C6B697] hover:text-[#FFF4D4]"
              }`}
            >
              <Send className="w-3 h-3" />
              Prepare Request
            </button>
            <button
              onClick={() => setMode("remind")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                mode === "remind"
                  ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-md font-bold"
                  : "bg-[#020A17]/80 border border-[#3A2C18] text-[#C6B697] hover:text-[#FFF4D4]"
              }`}
            >
              <Clock className="w-3 h-3" />
              Remind Later
            </button>
            <button
              onClick={() => setMode("suppress")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                mode === "suppress"
                  ? "bg-rose-900/60 border border-rose-500/60 text-rose-100 shadow-md font-bold"
                  : "bg-[#020A17]/80 border border-[#3A2C18] text-[#C6B697] hover:text-[#FFF4D4]"
              }`}
            >
              <Ban className="w-3 h-3" />
              Not Right Now
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 flex-1 overflow-y-auto space-y-5">
            {/* Family Dossier Inset */}
            <div className="p-3.5 rounded-xl bg-[#020A17]/90 border border-[#3A2C18]/80 space-y-2">
              <div className="flex items-center justify-between text-xs text-[#C6B697]">
                <span>Client Family:</span>
                <span className="font-semibold text-[#FFF4D4]">{parentName}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#C6B697]">
                <span>Student Reference:</span>
                <span className="font-semibold text-[#FFE394]">{studentName}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#C6B697]">
                <span>Review Platform:</span>
                <span className="text-[#C5A059] flex items-center gap-1 font-medium">
                  Google Business Profile
                  <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </div>

            {/* ── Mode 1: Composer ── */}
            {mode === "composer" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#C6B697] uppercase tracking-wider">
                    Recipient Email
                  </label>
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="parent@example.com"
                    className="w-full px-3 py-2 rounded-lg bg-[#020A17] border border-[#3A2C18] text-sm text-[#FFF4D4] focus:outline-none focus:border-[#C5A059]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#C6B697] uppercase tracking-wider">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#020A17] border border-[#3A2C18] text-sm text-[#FFF4D4] focus:outline-none focus:border-[#C5A059]"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#C6B697] uppercase tracking-wider">
                      Message Body (Editable)
                    </label>
                    <span className="text-[10px] text-amber-400/80 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      FERPA Guardrail Enforced
                    </span>
                  </div>
                  <textarea
                    rows={8}
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    className="w-full p-3 rounded-lg bg-[#020A17] border border-[#3A2C18] text-xs leading-relaxed text-[#FFF4D4] focus:outline-none focus:border-[#C5A059] font-sans"
                  />
                </div>

                {/* Privacy & Guardrails Notice */}
                <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-900/40 text-[11px] text-blue-200/90 leading-relaxed flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-blue-100">Review Integrity Guarantee:</span>{" "}
                    We ask for honest, voluntary feedback only. Confidential student details, disability classifications, and dispute specifics are never included.
                  </div>
                </div>
              </div>
            )}

            {/* ── Mode 2: Remind Later ── */}
            {mode === "remind" && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-[#020A17]/70 border border-[#3A2C18] space-y-1">
                  <h4 className="text-xs font-semibold text-[#FFF4D4]">When should we remind you?</h4>
                  <p className="text-xs text-[#C6B697]">
                    The opportunity will be paused and reappear on your dashboard and student dossier when due.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setRemindPreset("tomorrow")}
                    className={`p-3 rounded-lg border text-xs font-semibold text-left transition-all ${
                      remindPreset === "tomorrow"
                        ? "bg-[#C5A059]/20 border-[#C5A059] text-[#FFE394]"
                        : "bg-[#020A17] border-[#3A2C18] text-[#C6B697] hover:border-[#C5A059]/50"
                    }`}
                  >
                    <span className="block font-bold">Tomorrow</span>
                    <span className="text-[10px] text-[#A69371]">In 24 hours</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemindPreset("3days")}
                    className={`p-3 rounded-lg border text-xs font-semibold text-left transition-all ${
                      remindPreset === "3days"
                        ? "bg-[#C5A059]/20 border-[#C5A059] text-[#FFE394]"
                        : "bg-[#020A17] border-[#3A2C18] text-[#C6B697] hover:border-[#C5A059]/50"
                    }`}
                  >
                    <span className="block font-bold">In 3 Days</span>
                    <span className="text-[10px] text-[#A69371]">Recommended buffer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemindPreset("7days")}
                    className={`p-3 rounded-lg border text-xs font-semibold text-left transition-all ${
                      remindPreset === "7days"
                        ? "bg-[#C5A059]/20 border-[#C5A059] text-[#FFE394]"
                        : "bg-[#020A17] border-[#3A2C18] text-[#C6B697] hover:border-[#C5A059]/50"
                    }`}
                  >
                    <span className="block font-bold">In 7 Days</span>
                    <span className="text-[10px] text-[#A69371]">Next week</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemindPreset("custom")}
                    className={`p-3 rounded-lg border text-xs font-semibold text-left transition-all ${
                      remindPreset === "custom"
                        ? "bg-[#C5A059]/20 border-[#C5A059] text-[#FFE394]"
                        : "bg-[#020A17] border-[#3A2C18] text-[#C6B697] hover:border-[#C5A059]/50"
                    }`}
                  >
                    <span className="block font-bold">Choose Date</span>
                    <span className="text-[10px] text-[#A69371]">Custom date</span>
                  </button>
                </div>

                {remindPreset === "custom" && (
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-semibold text-[#C6B697]">Select Reminder Date</label>
                    <input
                      type="date"
                      value={customRemindDate}
                      onChange={(e) => setCustomRemindDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#020A17] border border-[#3A2C18] text-sm text-[#FFF4D4]"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#C6B697]">
                    Staff Reminder Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={remindNotes}
                    onChange={(e) => setRemindNotes(e.target.value)}
                    placeholder="e.g. Wait for finalized IEP document signature first"
                    className="w-full px-3 py-2 rounded-lg bg-[#020A17] border border-[#3A2C18] text-xs text-[#FFF4D4]"
                  />
                </div>
              </div>
            )}

            {/* ── Mode 3: Not Appropriate Right Now ── */}
            {mode === "suppress" && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-900/50 space-y-1">
                  <h4 className="text-xs font-semibold text-rose-200">
                    Why is a review request not appropriate right now?
                  </h4>
                  <p className="text-xs text-rose-300/80 leading-relaxed">
                    This dismisses the opportunity quietly. It will never be treated as a negative judgment about the client, and you can reconsider later at any time.
                  </p>
                </div>

                <div className="space-y-2">
                  {[
                    "Meeting was difficult",
                    "Active unresolved concerns",
                    "Client experiencing significant stress",
                    "Relationship needs attention",
                    "Other",
                  ].map((r) => (
                    <label
                      key={r}
                      onClick={() => setSuppressReason(r)}
                      className={`flex items-center gap-3 p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                        suppressReason === r
                          ? "bg-rose-900/30 border-rose-500 text-rose-100 font-semibold"
                          : "bg-[#020A17] border-[#3A2C18] text-[#C6B697] hover:border-[#3A2C18]/90"
                      }`}
                    >
                      <input
                        type="radio"
                        name="suppressReason"
                        checked={suppressReason === r}
                        onChange={() => setSuppressReason(r)}
                        className="text-rose-600 focus:ring-rose-500"
                      />
                      <span>{r}</span>
                    </label>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#C6B697] flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-amber-400" />
                    Private Internal Note (Optional — Never visible to clients)
                  </label>
                  <textarea
                    rows={3}
                    value={suppressNotes}
                    onChange={(e) => setSuppressNotes(e.target.value)}
                    placeholder="Add context for the advocacy team..."
                    className="w-full p-2.5 rounded-lg bg-[#020A17] border border-[#3A2C18] text-xs text-[#FFF4D4] focus:outline-none focus:border-[#C5A059]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-[#3A2C18]/80 bg-[#05142B]/90 flex items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-[#3A2C18] bg-[#020A17] text-[#C6B697] hover:bg-[#07162B] hover:text-[#FFF4D4] text-xs"
            >
              Cancel
            </Button>

            {mode === "composer" && (
              <Button
                onClick={handleSendRequest}
                disabled={requestMutation.isPending || !recipientEmail}
                className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] hover:brightness-110 font-bold border border-[#FFE394]/50 shadow-md text-xs flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                {requestMutation.isPending ? "Recording & Sending..." : "Send Review Request"}
              </Button>
            )}

            {mode === "remind" && (
              <Button
                onClick={handleSaveReminder}
                disabled={remindMutation.isPending}
                className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] hover:brightness-110 font-bold border border-[#FFE394]/50 shadow-md text-xs flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" />
                {remindMutation.isPending ? "Saving..." : "Save Reminder"}
              </Button>
            )}

            {mode === "suppress" && (
              <Button
                onClick={handleSuppress}
                disabled={suppressMutation.isPending}
                className="bg-rose-700 hover:bg-rose-600 text-white font-bold border border-rose-500 shadow-md text-xs flex items-center gap-1.5"
              >
                <Ban className="w-3.5 h-3.5" />
                {suppressMutation.isPending ? "Dismissing..." : "Dismiss Opportunity"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
