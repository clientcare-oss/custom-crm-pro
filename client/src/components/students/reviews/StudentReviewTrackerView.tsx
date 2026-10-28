import React, { useState } from "react";
import {
  Star,
  Clock,
  CheckCircle2,
  Mail,
  MessageSquare,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Send,
  User,
  Calendar,
  Sparkles,
  ArrowLeft,
  FileText,
  History,
  RotateCcw,
  Edit3,
  Users,
  Check,
  Ban,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import PageIdBadge from "@/components/PageIdBadge";
import { ReviewOpportunityDrawer } from "./ReviewOpportunityDrawer";

interface StudentReviewTrackerViewProps {
  studentId: number | string;
  studentName?: string;
  parentContactId?: number;
  parentName?: string;
  parentEmail?: string;
  parentPhone?: string;
  onBackToMore?: () => void;
}

export function StudentReviewTrackerView({
  studentId,
  studentName = "Student",
  parentContactId,
  parentName = "Parent on File",
  parentEmail,
  parentPhone,
  onBackToMore,
}: StudentReviewTrackerViewProps) {
  const numStudentId = Number(studentId);

  // tRPC query to load account-level review tracker
  const reviewQuery = trpc.reviewTracker.getByStudent.useQuery(
    { studentId: numStudentId },
    { enabled: !isNaN(numStudentId) && numStudentId > 0 }
  );

  const utils = trpc.useUtils();

  // Mutations
  const requestMutation = trpc.reviewTracker.requestReview.useMutation({
    onSuccess: () => {
      toast.success("Review request recorded and dispatched!");
      utils.reviewTracker.getByStudent.invalidate({ studentId: numStudentId });
      setShowRequestModal(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const followUpMutation = trpc.reviewTracker.sendFollowUp.useMutation({
    onSuccess: () => {
      toast.success("Follow-up reminder recorded!");
      utils.reviewTracker.getByStudent.invalidate({ studentId: numStudentId });
    },
    onError: (err) => toast.error(err.message),
  });

  const detectReviewMutation = trpc.reviewTracker.detectGoogleReview.useMutation({
    onSuccess: () => {
      toast.success("Google review matched and recorded!");
      utils.reviewTracker.getByStudent.invalidate({ studentId: numStudentId });
      setShowDetectModal(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const verifyMutation = trpc.reviewTracker.verifyReview.useMutation({
    onSuccess: () => {
      toast.success("Review verified! Future reminders stopped. Thank-you draft prepared.");
      utils.reviewTracker.getByStudent.invalidate({ studentId: numStudentId });
      setShowVerifyModal(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateDraftMutation = trpc.reviewTracker.updateThankYouDraft.useMutation({
    onSuccess: () => {
      toast.success("Thank-you draft updated!");
      utils.reviewTracker.getByStudent.invalidate({ studentId: numStudentId });
      setIsEditingDraft(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const sendThankYouMutation = trpc.reviewTracker.sendThankYou.useMutation({
    onSuccess: () => {
      toast.success("Personalized thank-you approved and recorded!");
      utils.reviewTracker.getByStudent.invalidate({ studentId: numStudentId });
      setShowThankYouModal(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateNotesMutation = trpc.reviewTracker.updateInternalNotes.useMutation({
    onSuccess: () => {
      toast.success("Internal notes saved!");
      utils.reviewTracker.getByStudent.invalidate({ studentId: numStudentId });
    },
    onError: (err) => toast.error(err.message),
  });

  const reconsiderMutation = trpc.reviewTracker.reconsiderSuppression.useMutation({
    onSuccess: () => {
      toast.success("Review opportunity re-opened!");
      utils.reviewTracker.getByStudent.invalidate({ studentId: numStudentId });
    },
    onError: (err) => toast.error(err.message),
  });

  const confirmClientMutation = trpc.reviewTracker.confirmClientReview.useMutation({
    onSuccess: () => {
      toast.success("Review confirmed by client! Reminders stopped.");
      utils.reviewTracker.getByStudent.invalidate({ studentId: numStudentId });
    },
    onError: (err) => toast.error(err.message),
  });

  const createOpportunityMutation = trpc.reviewTracker.createOpportunity.useMutation({
    onSuccess: () => {
      toast.success("Review opportunity created!");
      utils.reviewTracker.getByStudent.invalidate({ studentId: numStudentId });
      setShowMilestoneModal(false);
    },
    onError: (err) => toast.error(err.message),
  });

  // Local state for Opportunity Drawer & Modals
  const [showOpportunityDrawer, setShowOpportunityDrawer] = useState(false);
  const [opportunityDrawerMode, setOpportunityDrawerMode] = useState<"composer" | "remind" | "suppress">("composer");
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [customMilestoneTitle, setCustomMilestoneTitle] = useState("Significant IEP Issue Resolved");
  const [customMilestoneNotes, setCustomMilestoneNotes] = useState("");

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestChannel, setRequestChannel] = useState<"email" | "sms" | "portal">("email");
  const [requestNotes, setRequestNotes] = useState("");

  const [showDetectModal, setShowDetectModal] = useState(false);
  const [detectedAuthor, setDetectedAuthor] = useState(parentName);
  const [detectedSnippet, setDetectedSnippet] = useState(
    `Byron Honea and the Waypoint team have been incredible advocates for ${studentName}. Their guidance through our IEP meeting changed everything for our family.`
  );
  const [detectedRating, setDetectedRating] = useState(5);

  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifiedBy, setVerifiedBy] = useState("Byron Honea");
  const [verificationNotes, setVerificationNotes] = useState(
    "Confirmed on Google Business Profile. Matched client name and student advocacy timeline."
  );

  const [showThankYouModal, setShowThankYouModal] = useState(false);
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [draftSubject, setDraftSubject] = useState("");
  const [draftBody, setDraftBody] = useState("");

  const [internalNotesText, setInternalNotesText] = useState("");
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  const data = reviewQuery.data;
  const tracker = data?.tracker;
  const status = data?.status || "none";
  const effectiveAccountId = data?.effectiveAccountId || parentContactId || numStudentId;

  // Initialize draft when tracker changes
  React.useEffect(() => {
    if (tracker?.thankYouSubject) {
      setDraftSubject(tracker.thankYouSubject);
    }
    if (tracker?.thankYouBody) {
      setDraftBody(tracker.thankYouBody);
    }
    if (tracker?.internalNotes !== undefined) {
      setInternalNotesText(tracker.internalNotes || "");
    }
  }, [tracker]);

  // Parse audit trail safely
  const auditList = React.useMemo(() => {
    if (!tracker?.auditTrail) return [];
    try {
      return JSON.parse(tracker.auditTrail) as Array<{
        id: string;
        timestamp: string;
        action: string;
        employee: string;
        details: string;
      }>;
    } catch {
      return [];
    }
  }, [tracker?.auditTrail]);

  const googleReviewUrl =
    tracker?.googleReviewUrl || "https://g.page/r/waypoint-advocates/review";

  return (
    <div className="w-full min-h-[540px] p-4 sm:p-6 md:p-8 space-y-6 text-[#FFF4D4]">
      {/* ─── Page ID Displayer Hook ─── */}
      <PageIdBadge id="PG-030-REV" name="Student Dossier → Reviews" />

      {/* ─── Top Header Navigation ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#3A2C18]/80">
        <div className="flex items-center gap-3">
          {onBackToMore && (
            <button
              type="button"
              onClick={onBackToMore}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#3A2C18] bg-[#020A17]/80 hover:bg-[#07162B] text-xs font-semibold text-[#C6B697] hover:text-[#FFF4D4] transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to More</span>
            </button>
          )}

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2
                className="text-xl sm:text-2xl font-bold tracking-tight text-[#FFF4D4]"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Review Management
              </h2>
              {/* Account Level Badge */}
              <Badge className="bg-[#102B4E]/80 border border-[#C5A059]/40 text-[#FFE394] text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5">
                Account Level
              </Badge>
              {/* Sub-Page ID Pill */}
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-[#C5A059]/15 text-[#FFE394] border border-[#C5A059]/40 shadow-sm">
                PG-030-REV
              </span>
            </div>
            <p className="text-xs text-[#C6B697] mt-0.5">
              Google review requests, verification audit trail, and thank-you correspondence.
            </p>
          </div>
        </div>

        {/* Status Display Pill */}
        <div className="flex items-center gap-2 flex-wrap">
          {status === "eligible" && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/25 to-yellow-500/15 border border-[#F1CB6C]/80 text-[#FFE394] text-xs font-bold shadow-[0_0_15px_rgba(241,203,108,0.3)] animate-pulse">
              <Star className="w-3.5 h-3.5 fill-[#F1CB6C] text-[#F1CB6C]" />
              <span>⭐ Review Opportunity</span>
            </div>
          )}
          {status === "verified" && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-[#F1CB6C]/60 text-[#FFE394] text-xs font-semibold shadow-[0_0_12px_rgba(241,203,108,0.25)]">
              <Star className="w-3.5 h-3.5 fill-[#F1CB6C] text-[#F1CB6C]" />
              <span>⭐ Review Verified</span>
            </div>
          )}
          {status === "review_confirmed" && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-200 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>⭐ Review Confirmed</span>
            </div>
          )}
          {status === "requested" && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-500/15 border border-sky-400/40 text-sky-200 text-xs font-semibold">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>⭐ Request Sent</span>
            </div>
          )}
          {status === "scheduled" && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/50 text-indigo-200 text-xs font-semibold">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>⭐ Reminder Scheduled</span>
            </div>
          )}
          {status === "suppressed" && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs font-medium">
              <Ban className="w-3.5 h-3.5 text-rose-400" />
              <span>Suppressed by Staff</span>
            </div>
          )}
          {status === "followup_due" && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-200 text-xs font-semibold animate-pulse">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>⭐ Follow-Up Due</span>
            </div>
          )}
          {status === "none" && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/60 border border-slate-700 text-slate-300 text-xs font-medium">
              <span>No Review Requested</span>
            </div>
          )}

          {/* Quick Trigger Milestone Button (Trigger B) */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowMilestoneModal(true)}
            className="border-[#3A2C18] bg-[#020A17] text-[#FFE394] hover:bg-[#07162B] text-xs h-8 ml-1"
          >
            <Sparkles className="w-3 h-3 mr-1 text-[#C5A059]" />
            New Milestone
          </Button>
        </div>
      </div>

      {/* ─── Account Identity Banner (Shared Across All Students in Family) ─── */}
      <div className="rounded-xl border border-[#3A2C18] bg-[#05142B]/80 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#020A17] border border-[#C5A059]/40 flex items-center justify-center text-[#FFE394] shrink-0 font-bold font-serif">
            {parentName.charAt(0) || "P"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#FFF4D4]">{parentName}</span>
              <span className="text-[11px] text-[#C6B697]">(Client Account #{effectiveAccountId})</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#C6B697] mt-0.5">
              {parentEmail && <span>{parentEmail}</span>}
              {parentPhone && <span>{parentPhone}</span>}
            </div>
          </div>
        </div>

        {/* Linked Sibling Students */}
        {data?.students && data.students.length > 0 && (
          <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-[#3A2C18]/60">
            <span className="text-xs text-[#C6B697] flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Family Students:</span>
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {data.students.map((st) => (
                <span
                  key={st.id}
                  className={`text-[11px] px-2 py-0.5 rounded-md border font-medium ${
                    st.id === numStudentId
                      ? "bg-[#C5A059]/20 border-[#C5A059]/60 text-[#FFE394] font-bold"
                      : "bg-[#020A17] border-[#3A2C18] text-[#C6B697]"
                  }`}
                >
                  {st.firstName} {st.lastName}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── Active Review Opportunity Banner (Section 4 Staff Notification Experience) ─── */}
      {(status === "eligible" || data?.hasActiveOpportunity) && (
        <div className="rounded-xl border border-[#C5A059]/80 bg-gradient-to-r from-[#102B4E]/95 via-[#0A1F3A]/95 to-[#07162B]/95 p-5 shadow-[0_4px_24px_rgba(197,160,89,0.2)] flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-amber-500/20 text-[#FFE394]">
                <Star className="w-4 h-4 fill-[#FFE394]" />
              </span>
              <h3
                className="text-base font-bold text-[#FFF4D4]"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                ⭐ A Good Moment to Request a Review?
              </h3>
              <Badge className="bg-[#C5A059]/20 text-[#FFE394] border-[#C5A059]/50 text-[10px] uppercase font-bold tracking-wider">
                Actionable Milestone
              </Badge>
            </div>
            <p className="text-xs text-[#D8C7A5] leading-relaxed">
              This family has reached milestone:{" "}
              <strong className="text-[#FFE394]">{data?.opportunityMilestone || "First advocacy meeting with Waypoint"}</strong>.
              Would you like to request an honest review of their experience?
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Button
              onClick={() => {
                setOpportunityDrawerMode("composer");
                setShowOpportunityDrawer(true);
              }}
              className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold border border-[#FFE394]/50 shadow-md text-xs hover:brightness-110"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Prepare Review Request
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setOpportunityDrawerMode("remind");
                setShowOpportunityDrawer(true);
              }}
              className="border-[#3A2C18] bg-[#020A17] text-[#C6B697] hover:text-[#FFF4D4] text-xs"
            >
              <Clock className="w-3.5 h-3.5 mr-1.5" />
              Remind Me Later
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setOpportunityDrawerMode("suppress");
                setShowOpportunityDrawer(true);
              }}
              className="border-rose-900/60 bg-rose-950/20 text-rose-200 hover:bg-rose-950/40 text-xs"
            >
              <Ban className="w-3.5 h-3.5 mr-1.5" />
              Not Appropriate Right Now
            </Button>
          </div>
        </div>
      )}

      {/* ─── Suppressed Opportunity Inset ─── */}
      {status === "suppressed" && (
        <div className="rounded-xl border border-rose-900/50 bg-rose-950/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="font-semibold text-rose-200 flex items-center gap-1.5">
              <Ban className="w-3.5 h-3.5 text-rose-400" />
              Review Opportunity Dismissed: {data?.suppressionReason || "Not appropriate right now"}
            </span>
            {data?.suppressionNotes && (
              <p className="text-rose-300/80 italic text-[11px]">
                Private note: "{data.suppressionNotes}"
              </p>
            )}
            <p className="text-[#C6B697] text-[10px]">
              Dismissals are non-judgmental and can be reconsidered whenever client conditions improve.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              reconsiderMutation.mutate({
                accountId: effectiveAccountId,
                studentId: numStudentId,
              })
            }
            disabled={reconsiderMutation.isPending}
            className="border-[#3A2C18] bg-[#020A17] text-[#FFE394] hover:text-[#FFF4D4] text-xs shrink-0 self-start sm:self-auto"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            {reconsiderMutation.isPending ? "Reopening..." : "Reconsider Opportunity"}
          </Button>
        </div>
      )}

      {/* ─── Scheduled Reminder Inset ─── */}
      {status === "scheduled" && tracker?.reminderDate && (
        <div className="rounded-xl border border-indigo-900/50 bg-indigo-950/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="font-semibold text-indigo-200 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              Review Reminder Scheduled for:{" "}
              {new Date(tracker.reminderDate).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <p className="text-indigo-300/80 text-[11px]">
              The opportunity will reappear as actionable when the scheduled date arrives.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setOpportunityDrawerMode("composer");
              setShowOpportunityDrawer(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shrink-0 self-start sm:self-auto"
          >
            <Send className="w-3 h-3 mr-1" />
            Prepare Request Now
          </Button>
        </div>
      )}

      {/* ─── Review Confirmed By Client Inset ─── */}
      {status === "review_confirmed" && (
        <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="font-semibold text-emerald-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Parent Confirmed Posting a Review
            </span>
            <p className="text-emerald-300/80 text-[11px]">
              Review reminders have been stopped. A personalized thank-you message is prepared for staff approval.
            </p>
          </div>
          {tracker?.thankYouStatus !== "sent" && (
            <Button
              size="sm"
              onClick={() => setShowThankYouModal(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shrink-0 self-start sm:self-auto"
            >
              <Send className="w-3 h-3 mr-1" />
              Review & Send Thank-You
            </Button>
          )}
        </div>
      )}

      {/* ─── Main Grid: Review Workflow & Status Panels ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Request Actions & Detection (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Card 1: Review Request & Follow-Up Lifecycle */}
          <div className="rounded-xl border border-[#3A2C18] bg-[#05142B]/90 p-5 space-y-4 shadow-[0_8px_24px_rgba(0,0,0,0.7)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#C5A059]" />
                <h3 className="text-sm font-serif font-bold text-[#FFF4D4]">
                  Review Request Pipeline
                </h3>
              </div>
              {tracker?.requestedAt && (
                <span className="text-[11px] text-[#C6B697]">
                  Sent {new Date(tracker.requestedAt).toLocaleDateString()}
                </span>
              )}
            </div>

            <div className="p-3 rounded-lg border border-[#3A2C18]/70 bg-[#020A17]/80 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[#C6B697]">Status:</span>
                <span className="font-semibold text-[#FFF4D4] capitalize">
                  {status.replace("_", " ")}
                </span>
              </div>
              {tracker?.requestedBy && (
                <div className="flex items-center justify-between">
                  <span className="text-[#C6B697]">Requested By:</span>
                  <span className="font-semibold text-[#FFE394]">
                    {tracker.requestedBy}
                  </span>
                </div>
              )}
              {tracker?.requestChannel && (
                <div className="flex items-center justify-between">
                  <span className="text-[#C6B697]">Channel:</span>
                  <span className="font-semibold text-[#FFF4D4] uppercase">
                    {tracker.requestChannel}
                  </span>
                </div>
              )}
              {status !== "verified" && tracker?.followUpDueAt && (
                <div className="flex items-center justify-between">
                  <span className="text-[#C6B697]">Next Follow-Up Due:</span>
                  <span
                    className={`font-semibold ${
                      new Date(tracker.followUpDueAt) <= new Date()
                        ? "text-amber-400 font-bold"
                        : "text-[#FFF4D4]"
                    }`}
                  >
                    {new Date(tracker.followUpDueAt).toLocaleDateString()}
                  </span>
                </div>
              )}
              {tracker?.followUpCount !== undefined && tracker.followUpCount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[#C6B697]">Follow-Ups Sent:</span>
                  <span className="font-semibold text-[#FFF4D4]">
                    {tracker.followUpCount}
                  </span>
                </div>
              )}
            </div>

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {status === "none" && (
                <Button
                  onClick={() => setShowRequestModal(true)}
                  className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-8 px-3.5 shadow-sm hover:brightness-110 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Send Review Request
                </Button>
              )}

              {(status === "requested" || status === "followup_due") && (
                <>
                  <Button
                    onClick={() =>
                      followUpMutation.mutate({
                        accountId: effectiveAccountId,
                        studentId: numStudentId,
                        sentBy: "Byron Honea",
                      })
                    }
                    disabled={followUpMutation.isPending}
                    className="bg-[#102B4E] hover:bg-[#153866] border border-sky-400/40 text-sky-200 font-semibold text-xs h-8 px-3 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                    {followUpMutation.isPending ? "Recording..." : "Send Follow-Up Reminder"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowRequestModal(true)}
                    className="border-[#3A2C18] bg-[#020A17] text-[#C6B697] hover:text-[#FFF4D4] text-xs h-8 px-3 cursor-pointer"
                  >
                    Resend Request
                  </Button>
                </>
              )}

              {status === "verified" && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Review confirmed. Future reminder emails stopped.</span>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Google Review Detection & Matching */}
          <div className="rounded-xl border border-[#3A2C18] bg-[#05142B]/90 p-5 space-y-4 shadow-[0_8px_24px_rgba(0,0,0,0.7)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-[#F1CB6C]" />
                <h3 className="text-sm font-serif font-bold text-[#FFF4D4]">
                  Google Review Detection & Matching
                </h3>
              </div>
              <a
                href={googleReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-[#C5A059] hover:text-[#FFE394] flex items-center gap-1 transition-colors"
              >
                <span>Google Profile Link</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {tracker?.googleReviewDetected ? (
              <div className="p-4 rounded-xl border border-[#C5A059]/40 bg-[#020A17]/90 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[#F1CB6C]">
                    {Array.from({ length: tracker.googleReviewRating || 5 }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-[#F1CB6C] text-[#F1CB6C]" />
                    ))}
                  </div>
                  <span className="text-[11px] text-[#C6B697]">
                    {tracker.googleReviewDate || "Recent"}
                  </span>
                </div>

                <div className="text-xs">
                  <p className="font-bold text-[#FFF4D4]">
                    {tracker.googleReviewAuthor || parentName}
                  </p>
                  <p className="text-slate-300 italic mt-1 leading-relaxed">
                    "{tracker.googleReviewSnippet || "Wonderful advocacy service!"}"
                  </p>
                </div>

                {/* Verification Action */}
                {status !== "verified" ? (
                  <div className="pt-2 border-t border-[#3A2C18] flex items-center justify-between">
                    <span className="text-xs text-amber-300 font-medium">
                      ⚠️ Mandatory Employee Verification Pending
                    </span>
                    <Button
                      onClick={() => setShowVerifyModal(true)}
                      className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-8 px-3.5 shadow-sm hover:brightness-110 cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                      Verify Review
                    </Button>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-[#3A2C18] flex items-center justify-between text-xs">
                    <span className="text-emerald-300 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Verified by {tracker.verifiedBy || "Staff"} on{" "}
                      {tracker.verifiedAt
                        ? new Date(tracker.verifiedAt).toLocaleDateString()
                        : "Record"}
                    </span>
                    {tracker.verificationNotes && (
                      <span className="text-[11px] text-[#C6B697] truncate max-w-[200px]" title={tracker.verificationNotes}>
                        {tracker.verificationNotes}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-[#3A2C18] bg-[#020A17]/40 text-center space-y-3">
                <p className="text-xs text-[#C6B697]">
                  No Google review has been matched to this family yet. You can manually detect or simulate an incoming review for verification.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowDetectModal(true)}
                    className="border-[#3A2C18] bg-[#020A17] text-[#FFE394] hover:text-[#FFF4D4] hover:bg-[#07162B] text-xs h-8 px-3 cursor-pointer"
                  >
                    <Star className="w-3.5 h-3.5 mr-1.5 text-[#F1CB6C]" />
                    Match Google Review
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Card 3: Thank-You Workflow (Requirement 4) */}
          <div className="rounded-xl border border-[#3A2C18] bg-[#05142B]/90 p-5 space-y-4 shadow-[0_8px_24px_rgba(0,0,0,0.7)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#F1CB6C]" />
                <h3 className="text-sm font-serif font-bold text-[#FFF4D4]">
                  Thank-You Correspondence Workflow
                </h3>
              </div>
              <Badge
                className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 ${
                  tracker?.thankYouStatus === "sent"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    : tracker?.thankYouStatus === "pending_approval"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                    : "bg-slate-800 text-slate-400 border-slate-700"
                }`}
              >
                {tracker?.thankYouStatus === "sent"
                  ? "Thank-You Sent"
                  : tracker?.thankYouStatus === "pending_approval"
                  ? "Pending Staff Approval"
                  : "Not Prepared"}
              </Badge>
            </div>

            {status !== "verified" ? (
              <p className="text-xs text-[#C6B697]">
                Personalized thank-you email draft will be automatically generated upon employee verification of the Google review.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="p-3.5 rounded-lg border border-[#3A2C18] bg-[#020A17]/90 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#C6B697]">Recipient:</span>
                    <span className="font-semibold text-[#FFF4D4]">{parentName} &lt;{parentEmail || "on file"}&gt;</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#C6B697]">Subject:</span>
                    <span className="font-semibold text-[#FFE394] truncate max-w-[280px]">
                      {tracker?.thankYouSubject || draftSubject}
                    </span>
                  </div>
                </div>

                {tracker?.thankYouStatus === "sent" ? (
                  <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/40 text-xs text-emerald-200 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-400" />
                      Dispatched on {tracker.thankYouSentAt ? new Date(tracker.thankYouSentAt).toLocaleDateString() : "Record"} by {tracker.thankYouSentBy || "Staff"}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowThankYouModal(true)}
                      className="text-emerald-300 hover:text-white h-7 text-xs"
                    >
                      View Sent Email
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      onClick={() => setShowThankYouModal(true)}
                      className="bg-[#102B4E] hover:bg-[#153866] border border-sky-400/40 text-sky-200 text-xs font-semibold h-8 px-3 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                      Review & Approve Email
                    </Button>
                    <span className="text-[11px] text-[#C6B697]">
                      Staff approval required prior to sending.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Internal Notes & Audit Trail (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Card: Internal Confidential Notes */}
          <div className="rounded-xl border border-[#3A2C18] bg-[#05142B]/90 p-5 space-y-3 shadow-[0_8px_24px_rgba(0,0,0,0.7)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#C5A059]" />
                <h3 className="text-sm font-serif font-bold text-[#FFF4D4]">
                  Internal Notes
                </h3>
              </div>
              {!isEditingNotes ? (
                <button
                  type="button"
                  onClick={() => setIsEditingNotes(true)}
                  className="text-xs text-[#C5A059] hover:text-[#FFE394] font-medium cursor-pointer"
                >
                  Edit
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    updateNotesMutation.mutate({
                      accountId: effectiveAccountId,
                      internalNotes: internalNotesText,
                    });
                    setIsEditingNotes(false);
                  }}
                  disabled={updateNotesMutation.isPending}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer"
                >
                  Save
                </button>
              )}
            </div>

            {isEditingNotes ? (
              <textarea
                value={internalNotesText}
                onChange={(e) => setInternalNotesText(e.target.value)}
                placeholder="Confidential advocate notes regarding review requests, family sentiments, or follow-up timing..."
                rows={4}
                className="w-full text-xs rounded-lg border border-[#3A2C18] bg-[#020A17] p-2.5 text-[#FFF4D4] focus:outline-none focus:border-[#C5A059]"
              />
            ) : (
              <div className="p-3 rounded-lg border border-[#3A2C18]/60 bg-[#020A17]/80 min-h-[80px] text-xs text-[#C6B697]">
                {internalNotesText || "No confidential internal notes recorded yet."}
              </div>
            )}
          </div>

          {/* Card: Audit Trail */}
          <div className="rounded-xl border border-[#3A2C18] bg-[#05142B]/90 p-5 space-y-3 shadow-[0_8px_24px_rgba(0,0,0,0.7)]">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#C5A059]" />
              <h3 className="text-sm font-serif font-bold text-[#FFF4D4]">
                Audit Trail & History
              </h3>
            </div>

            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
              {auditList.length === 0 ? (
                <p className="text-xs text-[#C6B697] text-center py-4">
                  No activity recorded yet.
                </p>
              ) : (
                auditList.slice().reverse().map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-2.5 rounded-lg border border-[#3A2C18]/60 bg-[#020A17]/80 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-[#FFE394]">
                        {item.action.replace(/_/g, " ")}
                      </span>
                      <span className="text-[#C6B697]">
                        {new Date(item.timestamp).toLocaleDateString()} ·{" "}
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-300 leading-snug">{item.details}</p>
                    <p className="text-[10px] text-[#C6B697]/80 font-mono">
                      By: {item.employee}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Modal 1: Send Review Request ─── */}
      <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
        <DialogContent className="bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4] max-w-md shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg font-bold text-[#FFE394]">
              Send Google Review Request
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div>
              <label className="text-[11px] font-semibold text-[#FFE394] uppercase tracking-wider">
                Recipient
              </label>
              <p className="font-bold text-[#FFF4D4] mt-0.5">
                {parentName} &lt;{parentEmail || "Parent on File"}&gt;
              </p>
              <p className="text-[11px] text-[#C6B697] mt-0.5">
                Account applies to all children in this family.
              </p>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#FFE394] uppercase tracking-wider">
                Dispatch Channel
              </label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {(["email", "sms", "portal"] as const).map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setRequestChannel(ch)}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold capitalize cursor-pointer transition-all ${
                      requestChannel === ch
                        ? "bg-[#C5A059]/20 border-[#C5A059] text-[#FFE394]"
                        : "bg-[#020A17] border-[#3A2C18] text-[#C6B697] hover:text-[#FFF4D4]"
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#FFE394] uppercase tracking-wider">
                Google Review Link
              </label>
              <input
                type="text"
                readOnly
                value={googleReviewUrl}
                className="w-full mt-1 px-3 py-2 rounded-md border border-[#3A2C18] bg-[#020A17] text-slate-300 font-mono text-[11px]"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#FFE394] uppercase tracking-wider">
                Custom Advocate Notes (Optional)
              </label>
              <textarea
                value={requestNotes}
                onChange={(e) => setRequestNotes(e.target.value)}
                placeholder="Mention specific milestone (e.g. successful IEP meeting outcome)..."
                rows={3}
                className="w-full mt-1 p-2.5 rounded-md border border-[#3A2C18] bg-[#020A17] text-[#FFF4D4] focus:outline-none focus:border-[#C5A059]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowRequestModal(false)}
              className="border-[#3A2C18] bg-[#020A17] text-[#C6B697] hover:text-[#FFF4D4]"
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                requestMutation.mutate({
                  accountId: effectiveAccountId,
                  studentId: numStudentId,
                  requestedBy: "Byron Honea",
                  requestChannel,
                  customNotes: requestNotes,
                })
              }
              disabled={requestMutation.isPending}
              className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold"
            >
              {requestMutation.isPending ? "Sending..." : "Dispatch Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Modal 2: Match Google Review ─── */}
      <Dialog open={showDetectModal} onOpenChange={setShowDetectModal}>
        <DialogContent className="bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4] max-w-md shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg font-bold text-[#FFE394]">
              Match Google Review
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="text-[11px] font-semibold text-[#FFE394] uppercase tracking-wider">
                Reviewer / Author Name
              </label>
              <input
                type="text"
                value={detectedAuthor}
                onChange={(e) => setDetectedAuthor(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-md border border-[#3A2C18] bg-[#020A17] text-[#FFF4D4] focus:outline-none focus:border-[#C5A059]"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#FFE394] uppercase tracking-wider">
                Rating
              </label>
              <div className="flex items-center gap-1 mt-1 text-[#F1CB6C]">
                {[1, 2, 3, 4, 5].map((stars) => (
                  <button
                    key={stars}
                    type="button"
                    onClick={() => setDetectedRating(stars)}
                    className="p-1 cursor-pointer"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        stars <= detectedRating
                          ? "fill-[#F1CB6C] text-[#F1CB6C]"
                          : "text-slate-600"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#FFE394] uppercase tracking-wider">
                Review Text / Snippet
              </label>
              <textarea
                value={detectedSnippet}
                onChange={(e) => setDetectedSnippet(e.target.value)}
                rows={3}
                className="w-full mt-1 p-2.5 rounded-md border border-[#3A2C18] bg-[#020A17] text-[#FFF4D4] focus:outline-none focus:border-[#C5A059]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDetectModal(false)}
              className="border-[#3A2C18] bg-[#020A17] text-[#C6B697] hover:text-[#FFF4D4]"
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                detectReviewMutation.mutate({
                  accountId: effectiveAccountId,
                  authorName: detectedAuthor,
                  rating: detectedRating,
                  snippet: detectedSnippet,
                  reviewUrl: googleReviewUrl,
                })
              }
              disabled={detectReviewMutation.isPending}
              className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold"
            >
              {detectReviewMutation.isPending ? "Matching..." : "Save Matched Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Modal 3: Mandatory Employee Verification ─── */}
      <Dialog open={showVerifyModal} onOpenChange={setShowVerifyModal}>
        <DialogContent className="bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4] max-w-md shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg font-bold text-[#FFE394] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Employee Review Verification
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200">
              <p className="font-bold text-amber-300">Mandatory Verification Guardrail</p>
              <p className="mt-1 leading-snug">
                By verifying this review, you confirm that you have viewed it on Google Business Profile and matched it to {parentName}'s account. Future automated reminders will be stopped immediately.
              </p>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#FFE394] uppercase tracking-wider">
                Verifying Staff Member *
              </label>
              <input
                type="text"
                value={verifiedBy}
                onChange={(e) => setVerifiedBy(e.target.value)}
                placeholder="Employee full name"
                className="w-full mt-1 px-3 py-2 rounded-md border border-[#3A2C18] bg-[#020A17] text-[#FFF4D4] focus:outline-none focus:border-[#C5A059]"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#FFE394] uppercase tracking-wider">
                Verification Notes
              </label>
              <textarea
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                rows={3}
                placeholder="Audit notes..."
                className="w-full mt-1 p-2.5 rounded-md border border-[#3A2C18] bg-[#020A17] text-[#FFF4D4] focus:outline-none focus:border-[#C5A059]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowVerifyModal(false)}
              className="border-[#3A2C18] bg-[#020A17] text-[#C6B697] hover:text-[#FFF4D4]"
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                verifyMutation.mutate({
                  accountId: effectiveAccountId,
                  verifiedBy,
                  notes: verificationNotes,
                  studentId: numStudentId,
                })
              }
              disabled={verifyMutation.isPending || !verifiedBy.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {verifyMutation.isPending ? "Verifying..." : "Confirm & Mark Verified"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Modal 4: Thank-You Approval & Dispatch (Requirement 4) ─── */}
      <Dialog open={showThankYouModal} onOpenChange={setShowThankYouModal}>
        <DialogContent className="bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4] max-w-lg shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg font-bold text-[#FFE394] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#F1CB6C]" />
              Staff Approval: Thank-You Email
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-md bg-[#020A17] border border-[#3A2C18]">
              <span className="text-[#C6B697]">Recipient:</span>
              <span className="font-bold text-[#FFF4D4]">
                {parentName} ({parentEmail || "Email on File"})
              </span>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#FFE394] uppercase tracking-wider">
                Email Subject
              </label>
              <input
                type="text"
                value={draftSubject}
                onChange={(e) => setDraftSubject(e.target.value)}
                readOnly={tracker?.thankYouStatus === "sent"}
                className="w-full mt-1 px-3 py-2 rounded-md border border-[#3A2C18] bg-[#020A17] text-[#FFF4D4] focus:outline-none focus:border-[#C5A059]"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#FFE394] uppercase tracking-wider">
                Message Body
              </label>
              <textarea
                value={draftBody}
                onChange={(e) => setDraftBody(e.target.value)}
                rows={10}
                readOnly={tracker?.thankYouStatus === "sent"}
                className="w-full mt-1 p-3 rounded-md border border-[#3A2C18] bg-[#020A17] text-slate-100 font-sans leading-relaxed focus:outline-none focus:border-[#C5A059]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowThankYouModal(false)}
              className="border-[#3A2C18] bg-[#020A17] text-[#C6B697] hover:text-[#FFF4D4]"
            >
              Close
            </Button>
            {tracker?.thankYouStatus !== "sent" && (
              <>
                <Button
                  variant="outline"
                  onClick={() =>
                    updateDraftMutation.mutate({
                      accountId: effectiveAccountId,
                      subject: draftSubject,
                      body: draftBody,
                    })
                  }
                  disabled={updateDraftMutation.isPending}
                  className="border-[#3A2C18] bg-[#020A17] text-[#FFE394] hover:text-[#FFF4D4]"
                >
                  Save Draft Changes
                </Button>
                <Button
                  onClick={() =>
                    sendThankYouMutation.mutate({
                      accountId: effectiveAccountId,
                      sentBy: "Byron Honea",
                      studentId: numStudentId,
                    })
                  }
                  disabled={sendThankYouMutation.isPending}
                  className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold"
                >
                  {sendThankYouMutation.isPending ? "Sending..." : "Approve & Send"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Intelligent Review Opportunity Drawer (Slide-Over Panel) ─── */}
      <ReviewOpportunityDrawer
        isOpen={showOpportunityDrawer}
        onClose={() => setShowOpportunityDrawer(false)}
        accountId={effectiveAccountId}
        studentId={numStudentId}
        studentName={studentName}
        parentName={parentName}
        parentEmail={parentEmail}
        milestoneTitle={data?.opportunityMilestone || "First Advocacy Meeting Completed"}
        currentStatus={status}
        initialMode={opportunityDrawerMode}
        onSuccess={() => {
          utils.reviewTracker.getByStudent.invalidate({ studentId: numStudentId });
        }}
      />

      {/* ─── Trigger B: Successful Advocacy Milestone Modal (Staff Initiated) ─── */}
      <Dialog open={showMilestoneModal} onOpenChange={setShowMilestoneModal}>
        <DialogContent className="max-w-md bg-[#07162B] border border-[#3A2C18] text-[#FFF4D4]">
          <DialogHeader>
            <DialogTitle
              className="text-lg font-bold text-[#FFF4D4] flex items-center gap-2"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              <Sparkles className="w-5 h-5 text-[#FFE394]" />
              Trigger Milestone Review Opportunity
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-xs text-[#C6B697] py-2">
            <p>
              Initiate a review opportunity following meaningful progress for{" "}
              <strong className="text-[#FFF4D4]">{studentName}</strong>.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#FFE394] uppercase tracking-wider">
                Select Milestone Type
              </label>
              <select
                value={customMilestoneTitle}
                onChange={(e) => setCustomMilestoneTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-[#3A2C18] bg-[#020A17] text-[#FFF4D4] text-xs focus:outline-none focus:border-[#C5A059]"
              >
                <option value="Important Accommodation Approved">Important Accommodation Approved</option>
                <option value="Significant IEP Issue Resolved">Significant IEP Issue Resolved</option>
                <option value="Successful Advocacy Outcome">Successful Advocacy Outcome</option>
                <option value="Parent Expressed High Satisfaction">Parent Expressed High Satisfaction</option>
                <option value="Custom Advocacy Milestone">Custom Advocacy Milestone</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#FFE394] uppercase tracking-wider">
                Internal Context Notes (Optional)
              </label>
              <textarea
                rows={3}
                value={customMilestoneNotes}
                onChange={(e) => setCustomMilestoneNotes(e.target.value)}
                placeholder="Brief notes on what was accomplished..."
                className="w-full p-2.5 rounded-md border border-[#3A2C18] bg-[#020A17] text-[#FFF4D4] text-xs focus:outline-none focus:border-[#C5A059]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowMilestoneModal(false)}
              className="border-[#3A2C18] bg-[#020A17] text-[#C6B697] hover:text-[#FFF4D4]"
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                createOpportunityMutation.mutate({
                  studentId: numStudentId,
                  milestoneTitle: customMilestoneTitle,
                  notes: customMilestoneNotes || undefined,
                })
              }
              disabled={createOpportunityMutation.isPending}
              className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold"
            >
              {createOpportunityMutation.isPending ? "Evaluating..." : "Create Opportunity"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
