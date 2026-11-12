import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calendar,
  PhoneCall,
  AlertCircle,
  CheckCircle2,
  Plus,
  Save,
  Loader2,
  GraduationCap,
  User,
  Link2,
  MoreHorizontal,
  ArrowRight,
  Globe,
  UserCheck,
  MessageSquarePlus,
  ClipboardCheck,
  Sparkles,
  FileCheck2,
  Compass,
} from "lucide-react";
import { toast } from "sonner";

interface LeadInquiryUnitProps {
  workspace: any;
  onRefresh: () => void;
  onNavigateStage: (
    stage: "inquiry" | "discovery" | "decision" | "onboarding",
    sessionMode?: boolean
  ) => void;
}

export function LeadInquiryUnit({
  workspace,
  onRefresh,
  onNavigateStage,
}: LeadInquiryUnitProps) {
  const { lead, parentContact, students = [], journey } = workspace;

  const [concerns, setConcerns] = useState(journey.concerns || "");
  const [desiredOutcome, setDesiredOutcome] = useState(
    journey.desiredOutcome || ""
  );
  const [preferredContactMethod, setPreferredContactMethod] = useState(
    journey.preferredContactMethod || "Phone"
  );
  const [availability, setAvailability] = useState(journey.availability || "");
  const [timeZone, setTimeZone] = useState(journey.timeZone || "Eastern");
  const [assignedAdvocate, setAssignedAdvocate] = useState(
    journey.assignedAdvocate || "Byron Honea"
  );
  const [parentPhone, setParentPhone] = useState(lead.parentPhone || "");
  const [parentEmail, setParentEmail] = useState(lead.parentEmail || "");

  const [studentList, setStudentList] = useState<any[]>(
    students.length > 0
      ? students
      : [
          {
            firstName: lead.studentName?.split(" ")[0] || "",
            lastName: lead.studentName?.split(" ").slice(1).join(" ") || "",
            gradeLevel: lead.studentGrade || "",
            schoolName: "",
            iepOr504: "IEP",
          },
        ]
  );

  // Schedule Discovery panel is open by default so staff immediately see how to progress the lead
  const [showScheduler, setShowScheduler] = useState(true);
  const tomorrowDefault = new Date(Date.now() + 86400000);
  tomorrowDefault.setHours(10, 0, 0, 0);
  const [scheduleDate, setScheduleDate] = useState(
    tomorrowDefault.toISOString().slice(0, 10)
  );
  const [scheduleTime, setScheduleTime] = useState("10:00");
  const [scheduleNotes, setScheduleNotes] = useState("");

  // Contact attempt & direct-to-decision inline drawers
  const [showAttemptBox, setShowAttemptBox] = useState(false);
  const [attemptNote, setAttemptNote] = useState("");
  const [showDirectDecisionBox, setShowDirectDecisionBox] = useState(false);
  const [directDecisionNote, setDirectDecisionNote] = useState("");

  useEffect(() => {
    setConcerns(journey.concerns || "");
    setDesiredOutcome(journey.desiredOutcome || "");
    setPreferredContactMethod(journey.preferredContactMethod || "Phone");
    setAvailability(journey.availability || "");
    setTimeZone(journey.timeZone || "Eastern");
    setAssignedAdvocate(journey.assignedAdvocate || "Byron Honea");
    setParentPhone(lead.parentPhone || "");
    setParentEmail(lead.parentEmail || "");
    if (students.length > 0) {
      setStudentList(students);
    }
  }, [
    lead.id,
    journey.concerns,
    journey.desiredOutcome,
    journey.timeZone,
    journey.assignedAdvocate,
    students.length,
  ]);

  const updateInquiryMutation = trpc.leads.updateInquiry.useMutation({
    onSuccess: (updated, vars) => {
      onRefresh();
      if (vars.sendSchedulingLink) {
        toast.success(
          "Scheduling link sent · Lead stays in New Leads while awaiting booking"
        );
      } else if (vars.recordContactAttempt) {
        toast.success("Contact attempt recorded");
        setAttemptNote("");
        setShowAttemptBox(false);
      } else if (vars.progressDirectlyToDecision) {
        toast.success("Progressed directly to Decision");
        setShowDirectDecisionBox(false);
        onNavigateStage("decision", false);
      } else {
        toast.success("Client account & intake details saved");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const scheduleDiscoveryMutation = trpc.leads.scheduleDiscovery.useMutation({
    onSuccess: () => {
      toast.success("Discovery call scheduled · Moved to Stage 2: Discovery");
      onRefresh();
      onNavigateStage("discovery", false);
    },
    onError: (err) => toast.error(err.message),
  });

  const startDiscoveryNowMutation = trpc.leads.startDiscoveryNow.useMutation({
    onSuccess: () => {
      toast.success("Live discovery session started");
      onRefresh();
      onNavigateStage("discovery", true);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSaveInquiry = () => {
    updateInquiryMutation.mutate({
      leadId: lead.id,
      parent: {
        phone: parentPhone,
        email: parentEmail,
        preferredContactMethod,
        availability,
      },
      students: studentList.filter((s) => s.firstName?.trim()),
      concerns,
      desiredOutcome,
      timeZone,
      assignedAdvocate,
    });
  };

  const handleSendSchedulingLink = () => {
    if (!parentEmail.trim() && !parentPhone.trim()) {
      toast.error(
        "Please enter an email address or phone number before sending a scheduling link."
      );
      return;
    }
    updateInquiryMutation.mutate({
      leadId: lead.id,
      parent: {
        phone: parentPhone,
        email: parentEmail,
        preferredContactMethod,
        availability,
      },
      timeZone,
      assignedAdvocate,
      sendSchedulingLink: true,
    });
  };

  const handleRecordAttempt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!attemptNote.trim()) {
      toast.error("Please enter a note for this contact attempt.");
      return;
    }
    updateInquiryMutation.mutate({
      leadId: lead.id,
      recordContactAttempt: attemptNote.trim(),
    });
  };

  const handleProgressDirectlyToDecision = (e: React.FormEvent) => {
    e.preventDefault();
    updateInquiryMutation.mutate({
      leadId: lead.id,
      progressDirectlyToDecision: true,
      directToDecisionNote:
        directDecisionNote.trim() ||
        "Discovery call unnecessary; progressed directly to Decision.",
    });
  };

  const handleScheduleDiscovery = (e: React.FormEvent) => {
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
      assignedAdvocateName: assignedAdvocate || "Byron Honea",
      notes: scheduleNotes.trim() || undefined,
    });
  };

  const hasParentContact = Boolean(
    lead.parentName &&
      lead.parentName !== "Unknown Parent" &&
      (parentPhone.trim() || parentEmail.trim())
  );
  const validStudents = studentList.filter((s) => s.firstName?.trim());
  const hasStudentProfile = validStudents.length > 0;
  const hasConcernsAndOutcome = Boolean(concerns.trim());

  const blockingIssues: string[] = [];
  if (!lead.parentName || lead.parentName === "Unknown Parent") {
    blockingIssues.push("Parent or guardian name is missing.");
  }
  if (!parentPhone.trim() && !parentEmail.trim()) {
    blockingIssues.push(
      "A phone number or email address is required to reach the family."
    );
  }
  if (!hasStudentProfile) {
    blockingIssues.push("At least one student name is required.");
  }
  if (!hasConcernsAndOutcome) {
    blockingIssues.push("Main concerns are needed to prepare for discovery.");
  }

  const isPreFilledReady = blockingIssues.length === 0;

  return (
    <div data-testid="lead-inquiry-unit" className="space-y-4">
      {/* ─── 1. STAFF GUIDE & CLIENT ACCOUNT SETUP STATUS BANNER ─── */}
      <div className="rounded-2xl border border-cyan-400/30 bg-gradient-to-r from-[#07152E] via-[#061126] to-[#040C1C] p-4 sm:p-5 shadow-[0_10px_28px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(103,232,249,0.12)] space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-3 border-b border-cyan-400/20">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#081A38] border border-cyan-400/45 text-xs font-mono font-bold uppercase tracking-wider text-cyan-200">
                <Compass className="w-3.5 h-3.5 text-cyan-300" />
                Stage 1 of 4 · Client Account & Intake Setup
              </span>

              {journey.schedulingLinkSent && (
                <Badge
                  data-testid="scheduling-link-sent-badge"
                  className="bg-cyan-500/15 text-cyan-200 border-cyan-400/35 text-xs"
                >
                  <Link2 className="w-3.5 h-3.5 mr-1" />
                  Scheduling link sent
                </Badge>
              )}

              {isPreFilledReady ? (
                <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-400/35 text-xs">
                  <FileCheck2 className="w-3.5 h-3.5 mr-1" />
                  Account Pre-Filled from Lead Intake · Ready for Discovery
                </Badge>
              ) : (
                <Badge className="bg-amber-500/15 text-amber-300 border-amber-400/35 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 mr-1" />
                  {blockingIssues.length} Setup Item(s) Needed Below
                </Badge>
              )}
            </div>

            <h2
              className="text-lg sm:text-xl font-serif font-bold text-white"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Setting Up {lead.parentName || "Client"}’s Family Account & Discovery Readiness
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              {isPreFilledReady
                ? "This family's lead form is already filled out below. Verify their account details on the left, then use Step 3 on the right to schedule or launch their Discovery Call."
                : "Complete the missing family and student account details on the left, then schedule their Discovery Call on the right to advance them to Stage 2."}
            </p>
          </div>

          {/* Quick Top Action Triggers */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              data-testid="send-scheduling-link-btn"
              disabled={updateInquiryMutation.isPending}
              onClick={handleSendSchedulingLink}
              className="h-9 border-cyan-500/35 bg-[#050E22] text-slate-200 hover:bg-[#0A1D3D] hover:border-cyan-400/70 hover:text-white text-xs font-semibold cursor-pointer"
            >
              <Link2 className="w-3.5 h-3.5 mr-1.5 text-cyan-300" />
              {journey.schedulingLinkSent ? "Resend Link" : "Send Scheduling Link"}
            </Button>

            <Button
              type="button"
              variant="outline"
              data-testid="record-contact-attempt-btn"
              onClick={() => setShowAttemptBox((prev) => !prev)}
              className="h-9 border-cyan-500/35 bg-[#050E22] text-slate-200 hover:bg-[#0A1D3D] hover:border-cyan-400/70 hover:text-white text-xs font-semibold cursor-pointer"
            >
              <MessageSquarePlus className="w-3.5 h-3.5 mr-1.5 text-cyan-300" />
              Record Contact Attempt
            </Button>

            <Button
              type="button"
              data-testid="schedule-discovery-primary-btn"
              onClick={() => {
                setShowScheduler(true);
                const el = document.getElementById("schedule-discovery-date-input");
                if (el) el.focus();
              }}
              className="h-9 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] font-bold hover:brightness-110 text-xs cursor-pointer shadow-md"
            >
              <Calendar className="w-3.5 h-3.5 mr-1.5" />
              Schedule Discovery
            </Button>

            {/* Contextual Secondary Actions Menu */}
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  data-testid="new-lead-contextual-menu-btn"
                  className="h-9 w-9 p-0 border-cyan-500/35 bg-[#050E22] text-slate-200 hover:bg-[#0A1D3D] hover:border-cyan-400/70 cursor-pointer"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-60 bg-[#050E22] border border-cyan-400/45 text-white"
              >
                <DropdownMenuItem
                  data-testid="start-discovery-now-btn"
                  onClick={() => startDiscoveryNowMutation.mutate({ leadId: lead.id })}
                  className="text-xs cursor-pointer focus:bg-[#0C2248] focus:text-white gap-2"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Start Discovery Now (Live Call)</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-cyan-500/20" />
                <DropdownMenuItem
                  data-testid="progress-directly-to-decision-menu-item"
                  onClick={() => setShowDirectDecisionBox(true)}
                  className="text-xs cursor-pointer focus:bg-[#0C2248] focus:text-white gap-2"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Progress directly to Decision</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* 3-Step Employee Playbook Strip: Tells Staff Exactly What To Do On This Page */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-cyan-500/25 bg-[#040B1A]/90 p-3.5 flex items-start gap-3">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                hasParentContact && hasStudentProfile
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/45"
                  : "bg-amber-500/20 text-amber-300 border border-amber-400/45"
              }`}
            >
              {hasParentContact && hasStudentProfile ? "✓" : "1"}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white">
                  Step 1 · Verify Client & Student Account
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                {hasParentContact && hasStudentProfile
                  ? `Pre-filled for ${lead.parentName} & ${validStudents.map((s) => s.firstName).join(", ")}. Confirm time zone (${timeZone}) & advocate.`
                  : "Enter parent contact info, time zone, and student name/grade below."}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-cyan-500/25 bg-[#040B1A]/90 p-3.5 flex items-start gap-3">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                hasConcernsAndOutcome
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/45"
                  : "bg-amber-500/20 text-amber-300 border border-amber-400/45"
              }`}
            >
              {hasConcernsAndOutcome ? "✓" : "2"}
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-white block">
                Step 2 · Review Intake Story & Goals
              </span>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                {hasConcernsAndOutcome
                  ? "Main school concerns and desired outcome are recorded. Edit or add notes below if needed."
                  : "Summarize the family's school/IEP concerns and desired outcome below."}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-cyan-400/50 bg-[#081A38] p-3.5 flex items-start gap-3 shadow-[0_0_16px_rgba(34,211,238,0.12)]">
            <div className="w-6 h-6 rounded-full bg-gradient-to-b from-cyan-300 to-cyan-500 text-[#030917] flex items-center justify-center text-xs font-extrabold shrink-0 mt-0.5">
              3
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-cyan-200 block">
                Step 3 · Progress to Stage 2 (Discovery)
              </span>
              <p className="text-[11px] text-slate-200 mt-0.5 leading-snug">
                Book the Discovery Call in the right-hand panel (or click{" "}
                <strong className="text-[#FFE394]">Start Live Call</strong>) to advance this family to Discovery.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Record Contact Attempt Inline Box */}
      {showAttemptBox && (
        <form
          onSubmit={handleRecordAttempt}
          data-testid="record-contact-attempt-panel"
          className="rounded-xl border border-cyan-400/40 bg-[#061126] p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white">
              Record Contact Attempt (Keeps lead in New Leads)
            </span>
            <button
              type="button"
              onClick={() => setShowAttemptBox(false)}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              data-testid="contact-attempt-note-input"
              value={attemptNote}
              onChange={(e) => setAttemptNote(e.target.value)}
              placeholder="e.g. Left voicemail and texted intake link; family will reply this evening."
              className="h-9 bg-[#030917] border-[#1A325E] text-white text-xs flex-1"
            />
            <Button
              type="submit"
              data-testid="save-contact-attempt-btn"
              disabled={updateInquiryMutation.isPending}
              className="h-9 bg-[#0A1E40] border border-cyan-400/50 text-cyan-200 text-xs font-bold cursor-pointer"
            >
              Save Attempt
            </Button>
          </div>
        </form>
      )}

      {/* Contextual Option: Progress Directly to Decision */}
      {showDirectDecisionBox && (
        <form
          onSubmit={handleProgressDirectlyToDecision}
          data-testid="direct-to-decision-panel"
          className="rounded-xl border border-cyan-400/45 bg-[#061126] p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-white block">
                Progress Directly to Decision
              </span>
              <span className="text-[11px] text-slate-300">
                Use when discovery is unnecessary (e.g. returning family or prior consultation completed).
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowDirectDecisionBox(false)}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              data-testid="direct-to-decision-note-input"
              value={directDecisionNote}
              onChange={(e) => setDirectDecisionNote(e.target.value)}
              placeholder="Optional note explaining why discovery is bypassed..."
              className="h-9 bg-[#030917] border-[#1A325E] text-white text-xs flex-1"
            />
            <Button
              type="submit"
              data-testid="confirm-direct-to-decision-btn"
              disabled={updateInquiryMutation.isPending}
              className="h-9 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] font-semibold text-xs cursor-pointer"
            >
              Move to Decision →
            </Button>
          </div>
        </form>
      )}

      {/* Missing Blocking Information Alert */}
      {blockingIssues.length > 0 && (
        <div
          data-testid="inquiry-blocking-issues"
          className="rounded-xl border border-[#D4AF37]/45 bg-[#07142C] p-4 space-y-2"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-[#FFE394]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Missing information blocking next action</span>
          </div>
          <ul className="list-disc list-inside text-xs text-slate-200 space-y-1">
            {blockingIssues.map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ─── 2. TWO-COLUMN CLIENT ACCOUNT SETUP & STAGE PROGRESSION WORKSPACE ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT 7 COLUMNS: Client Account Setup & Pre-Filled Lead Form Dossier */}
        <div className="lg:col-span-7 space-y-4">
          {/* Card A: Parent / Guardian Account & Time Zone */}
          <div className="rounded-xl border border-cyan-500/25 bg-[#061126] p-5 space-y-4 shadow-[0_8px_24px_rgba(0,0,0,0.55)]">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2.5">
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-cyan-200 flex items-center gap-2">
                <User className="w-4 h-4 text-cyan-300" />
                1. Parent / Guardian Account & Assignment
              </h3>
              <span className="text-xs text-emerald-300 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {lead.source || "Lead Intake Record"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Parent / Guardian Phone *
                </label>
                <Input
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  placeholder="(404) 555-0100"
                  className="h-9 bg-[#030917] border-[#1A325E] text-white text-xs"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Parent / Guardian Email *
                </label>
                <Input
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  placeholder="parent@example.com"
                  className="h-9 bg-[#030917] border-[#1A325E] text-white text-xs"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Preferred Contact Method
                </label>
                <select
                  value={preferredContactMethod}
                  onChange={(e) => setPreferredContactMethod(e.target.value)}
                  className="w-full h-9 rounded-md bg-[#030917] border border-[#1A325E] px-2.5 text-xs text-white"
                >
                  <option value="Phone">Phone</option>
                  <option value="Email">Email</option>
                  <option value="Text / SMS">Text / SMS</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Best Time / Availability
                </label>
                <Input
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  placeholder="e.g. Weekday mornings"
                  className="h-9 bg-[#030917] border-[#1A325E] text-white text-xs"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 font-semibold flex items-center gap-1 mb-1">
                  <Globe className="w-3.5 h-3.5 text-cyan-300" />
                  Family Time Zone
                </label>
                <select
                  data-testid="inquiry-timezone-select"
                  value={timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                  className="w-full h-9 rounded-md bg-[#030917] border border-[#1A325E] px-2.5 text-xs text-white"
                >
                  <option value="Eastern">Eastern Time (ET)</option>
                  <option value="Central">Central Time (CT)</option>
                  <option value="Mountain">Mountain Time (MT)</option>
                  <option value="Pacific">Pacific Time (PT)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-300 font-semibold flex items-center gap-1 mb-1">
                  <UserCheck className="w-3.5 h-3.5 text-cyan-300" />
                  Assigned Lead Advocate
                </label>
                <Input
                  data-testid="inquiry-advocate-input"
                  value={assignedAdvocate}
                  onChange={(e) => setAssignedAdvocate(e.target.value)}
                  placeholder="Byron Honea"
                  className="h-9 bg-[#030917] border-[#1A325E] text-white text-xs"
                />
              </div>
            </div>

            {/* Students Sub-Section */}
            <div className="pt-3 border-t border-cyan-500/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-cyan-200 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-cyan-300" />
                  Student Profile(s) ({studentList.length})
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setStudentList((prev) => [
                      ...prev,
                      {
                        firstName: "",
                        lastName: parentContact?.lastName || "",
                        gradeLevel: "",
                        schoolName: "",
                        iepOr504: "IEP",
                      },
                    ])
                  }
                  className="inline-flex items-center gap-1 text-xs font-bold text-cyan-300 hover:text-white cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Another Student
                </button>
              </div>

              {studentList.map((stu, idx) => (
                <div
                  key={stu.id || idx}
                  className="rounded-lg border border-cyan-500/25 bg-[#040B1A] p-3 space-y-2.5"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] text-slate-300 font-medium block mb-0.5">
                        Student First Name *
                      </label>
                      <Input
                        value={stu.firstName || ""}
                        onChange={(e) =>
                          setStudentList((prev) =>
                            prev.map((s, i) =>
                              i === idx ? { ...s, firstName: e.target.value } : s
                            )
                          )
                        }
                        placeholder="First Name"
                        className="h-8 bg-[#030814] border-[#1A325E] text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-300 font-medium block mb-0.5">
                        Student Last Name
                      </label>
                      <Input
                        value={stu.lastName || ""}
                        onChange={(e) =>
                          setStudentList((prev) =>
                            prev.map((s, i) =>
                              i === idx ? { ...s, lastName: e.target.value } : s
                            )
                          )
                        }
                        placeholder="Last Name"
                        className="h-8 bg-[#030814] border-[#1A325E] text-white text-xs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-[11px] text-slate-300 font-medium block mb-0.5">
                        Grade Level
                      </label>
                      <Input
                        value={stu.gradeLevel || ""}
                        onChange={(e) =>
                          setStudentList((prev) =>
                            prev.map((s, i) =>
                              i === idx ? { ...s, gradeLevel: e.target.value } : s
                            )
                          )
                        }
                        placeholder="e.g. 4th Grade"
                        className="h-8 bg-[#030814] border-[#1A325E] text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-300 font-medium block mb-0.5">
                        School Name
                      </label>
                      <Input
                        value={stu.schoolName || ""}
                        onChange={(e) =>
                          setStudentList((prev) =>
                            prev.map((s, i) =>
                              i === idx ? { ...s, schoolName: e.target.value } : s
                            )
                          )
                        }
                        placeholder="School or District"
                        className="h-8 bg-[#030814] border-[#1A325E] text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-300 font-medium block mb-0.5">
                        Current Plan Status
                      </label>
                      <select
                        value={stu.iepOr504 || "IEP"}
                        onChange={(e) =>
                          setStudentList((prev) =>
                            prev.map((s, i) =>
                              i === idx ? { ...s, iepOr504: e.target.value } : s
                            )
                          )
                        }
                        className="w-full h-8 rounded-md bg-[#030814] border border-[#1A325E] px-2 text-xs text-white"
                      >
                        <option value="IEP">IEP</option>
                        <option value="504">504 Plan</option>
                        <option value="504 Plan">504 Plan</option>
                        <option value="Evaluation Needed">Seeking Evaluation</option>
                        <option value="General">General</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card B: Pre-Filled Intake Story — Main Concerns & Desired Outcome */}
          <div className="rounded-xl border border-cyan-500/25 bg-[#061126] p-5 space-y-4 shadow-[0_8px_24px_rgba(0,0,0,0.55)]">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2.5">
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-cyan-200 flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-cyan-300" />
                2. Family Intake Summary (Concerns & Desired Outcome)
              </h3>
              <span className="text-xs text-slate-400">
                Carries forward into Discovery & Decision
              </span>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-white block mb-1">
                  Main School / IEP / 504 Concerns *
                </label>
                <Textarea
                  data-testid="inquiry-concerns-input"
                  value={concerns}
                  onChange={(e) => setConcerns(e.target.value)}
                  placeholder="Summarize the family's primary school, IEP/504, evaluation, or placement concerns..."
                  rows={3}
                  className="bg-[#030917] border-[#1A325E] text-white text-xs leading-relaxed resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-white block mb-1">
                  Desired Advocacy Outcome
                </label>
                <Textarea
                  data-testid="inquiry-desired-outcome-input"
                  value={desiredOutcome}
                  onChange={(e) => setDesiredOutcome(e.target.value)}
                  placeholder="What is the family hoping to achieve with Waypoint Advocates?"
                  rows={3}
                  className="bg-[#030917] border-[#1A325E] text-white text-xs leading-relaxed resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-cyan-500/20">
              <span className="text-xs text-slate-300">
                Save any updates to the family’s account or intake details before progressing.
              </span>
              <Button
                type="button"
                size="sm"
                data-testid="save-inquiry-details-btn"
                disabled={updateInquiryMutation.isPending}
                onClick={handleSaveInquiry}
                className="h-9 bg-[#091D3E] border border-cyan-400/50 text-cyan-200 hover:bg-[#0E2B5C] hover:text-white text-xs font-bold cursor-pointer"
              >
                {updateInquiryMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                )}
                Save Account & Intake Details
              </Button>
            </div>
          </div>
        </div>

        {/* RIGHT 5 COLUMNS: Step 3 — Progress This Client to Stage 2 (Discovery) */}
        <div className="lg:col-span-5 space-y-4">
          {showScheduler && (
            <form
              onSubmit={handleScheduleDiscovery}
              data-testid="inquiry-schedule-discovery-panel"
              className="rounded-xl border border-cyan-400/50 bg-gradient-to-b from-[#081A38] to-[#050F24] p-5 space-y-4 shadow-[0_14px_34px_rgba(0,0,0,0.75),0_0_20px_rgba(34,211,238,0.1)]"
            >
              <div className="space-y-1 border-b border-cyan-400/25 pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-cyan-200 bg-[#041024] px-2.5 py-0.5 rounded border border-cyan-400/45">
                    Step 3 · Primary Next Action
                  </span>
                  <span className="text-xs text-emerald-300 font-bold">
                    Moves to Stage 2 →
                  </span>
                </div>
                <h3
                  className="text-base sm:text-lg font-serif font-bold text-white pt-1"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Schedule Discovery Call
                </h3>
                <p className="text-xs text-slate-300">
                  Books the consultation on the Waypoint Calendar and automatically moves{" "}
                  <strong className="text-white">{lead.parentName}</strong> from{" "}
                  <strong className="text-cyan-300">New Leads → Discovery</strong>.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-200 font-semibold mb-1 block">
                    Consultation Date *
                  </label>
                  <Input
                    id="schedule-discovery-date-input"
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="h-9 bg-[#030917] border-[#1A325E] text-white text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-200 font-semibold mb-1 block">
                    Time ({timeZone}) *
                  </label>
                  <Input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="h-9 bg-[#030917] border-[#1A325E] text-white text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-200 font-semibold mb-1 block">
                    Responsible Advocate
                  </label>
                  <Input
                    value={assignedAdvocate}
                    onChange={(e) => setAssignedAdvocate(e.target.value)}
                    className="h-9 bg-[#030917] border-[#1A325E] text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-200 font-semibold mb-1 block">
                    Meeting Prep Note
                  </label>
                  <Input
                    value={scheduleNotes}
                    onChange={(e) => setScheduleNotes(e.target.value)}
                    placeholder="e.g. Phone or Zoom preference"
                    className="h-9 bg-[#030917] border-[#1A325E] text-white text-xs"
                  />
                </div>
              </div>

              <Button
                type="submit"
                data-testid="confirm-schedule-discovery-btn"
                disabled={scheduleDiscoveryMutation.isPending}
                className="w-full h-11 text-sm bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] font-extrabold hover:brightness-110 cursor-pointer shadow-[0_4px_14px_rgba(197,160,89,0.5)]"
              >
                {scheduleDiscoveryMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Scheduling & Moving to Discovery...
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4 mr-1.5" />
                    Confirm & Schedule Discovery →
                  </>
                )}
              </Button>
            </form>
          )}

          {/* Other Ways to Progress or Follow Up with This Family */}
          <div className="rounded-xl border border-cyan-500/25 bg-[#061126] p-4 space-y-3">
            <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-cyan-200 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-cyan-300" />
              Other Actions for This Family
            </h4>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => startDiscoveryNowMutation.mutate({ leadId: lead.id })}
                disabled={startDiscoveryNowMutation.isPending}
                className="w-full p-3.5 rounded-xl border border-cyan-400/40 bg-[#081A38] hover:bg-[#0D2652] hover:border-cyan-300 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer"
              >
                <div>
                  <span className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                    <PhoneCall className="w-4 h-4 text-emerald-300" />
                    Family is on the Phone Now · Start Live Discovery
                  </span>
                  <span className="text-xs text-slate-300 block mt-0.5">
                    Skips calendar booking and opens the live Discovery Session script immediately.
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-cyan-300 shrink-0" />
              </button>

              <button
                type="button"
                onClick={handleSendSchedulingLink}
                disabled={updateInquiryMutation.isPending}
                className="w-full p-3.5 rounded-xl border border-cyan-500/25 bg-[#040B1A] hover:bg-[#081A38] hover:border-cyan-400/50 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer"
              >
                <div>
                  <span className="text-xs sm:text-sm font-semibold text-white flex items-center gap-1.5">
                    <Link2 className="w-4 h-4 text-cyan-300" />
                    Send Self-Scheduling Link to Family
                  </span>
                  <span className="text-xs text-slate-300 block mt-0.5">
                    Marks status as “Scheduling link sent” and keeps family in New Leads until they book.
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => setShowDirectDecisionBox(true)}
                className="w-full p-3.5 rounded-xl border border-cyan-500/25 bg-[#040B1A] hover:bg-[#081A38] hover:border-cyan-400/50 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer"
              >
                <div>
                  <span className="text-xs sm:text-sm font-semibold text-white flex items-center gap-1.5">
                    <ArrowRight className="w-4 h-4 text-cyan-300" />
                    Bypass Discovery · Move Directly to Decision
                  </span>
                  <span className="text-xs text-slate-300 block mt-0.5">
                    For returning families or cases where discovery is already complete.
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
