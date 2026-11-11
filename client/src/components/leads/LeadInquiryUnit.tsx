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

  // Schedule Discovery inline drawer
  const [showScheduler, setShowScheduler] = useState(false);
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
        toast.success("New Lead details saved");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const scheduleDiscoveryMutation = trpc.leads.scheduleDiscovery.useMutation({
    onSuccess: () => {
      toast.success("Discovery call scheduled · Moved to Discovery");
      setShowScheduler(false);
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

  const blockingIssues: string[] = [];
  if (!lead.parentName || lead.parentName === "Unknown Parent") {
    blockingIssues.push("Parent or guardian name is missing.");
  }
  if (!parentPhone.trim() && !parentEmail.trim()) {
    blockingIssues.push(
      "A phone number or email address is required to reach the family."
    );
  }
  if (studentList.filter((s) => s.firstName?.trim()).length === 0) {
    blockingIssues.push("At least one student name is required.");
  }
  if (!concerns.trim()) {
    blockingIssues.push("Main concerns are needed to prepare for discovery.");
  }

  return (
    <div data-testid="lead-inquiry-unit" className="space-y-5">
      {/* Top Action & Readiness Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[#162952] bg-[#040D26] p-5 shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-white">
              New Lead · Prepare for Discovery
            </h2>
            {journey.schedulingLinkSent ? (
              <Badge
                data-testid="scheduling-link-sent-badge"
                className="bg-sky-500/15 text-sky-300 border-sky-400/30 text-[11px]"
              >
                <Link2 className="w-3 h-3 mr-1" />
                Scheduling link sent
              </Badge>
            ) : blockingIssues.length === 0 ? (
              <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-400/30 text-[11px]">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Ready for discovery
              </Badge>
            ) : (
              <Badge className="bg-blue-950/80 text-[#FFE394] border-[#D4AF37]/40 text-[11px]">
                {blockingIssues.length} item(s) needed
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-300">
            Review the inquiry and desired outcome, confirm contact details & time zone, assign the advocate, and schedule discovery.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            data-testid="send-scheduling-link-btn"
            disabled={updateInquiryMutation.isPending}
            onClick={handleSendSchedulingLink}
            className="h-9 border-[#243E73] bg-[#071333] text-slate-100 hover:bg-[#0D1E47] hover:text-white text-xs cursor-pointer"
          >
            <Link2 className="w-3.5 h-3.5 mr-1.5 text-[#FFE394]" />
            {journey.schedulingLinkSent ? "Resend Link" : "Send Scheduling Link"}
          </Button>

          <Button
            type="button"
            variant="outline"
            data-testid="record-contact-attempt-btn"
            onClick={() => setShowAttemptBox((prev) => !prev)}
            className="h-9 border-[#243E73] bg-[#071333] text-slate-100 hover:bg-[#0D1E47] hover:text-white text-xs cursor-pointer"
          >
            <MessageSquarePlus className="w-3.5 h-3.5 mr-1.5 text-[#FFE394]" />
            Record Contact Attempt
          </Button>

          {/* Primary Action: Schedule Discovery */}
          <Button
            type="button"
            data-testid="schedule-discovery-primary-btn"
            onClick={() => setShowScheduler((prev) => !prev)}
            className="h-9 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] font-semibold hover:brightness-110 text-xs cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 mr-1.5" />
            Schedule Discovery
          </Button>

          {/* Contextual Secondary Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                data-testid="new-lead-contextual-menu-btn"
                className="h-9 w-9 p-0 border-[#243E73] bg-[#071333] text-slate-200 hover:bg-[#0D1E47] cursor-pointer"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-60 bg-[#05102B] border border-[#1E335C] text-white"
            >
              <DropdownMenuItem
                data-testid="start-discovery-now-btn"
                onClick={() => startDiscoveryNowMutation.mutate({ leadId: lead.id })}
                className="text-xs cursor-pointer focus:bg-[#102452] focus:text-white gap-2"
              >
                <PhoneCall className="w-3.5 h-3.5 text-[#D8B979]" />
                <span>Start Discovery Now (Live Call)</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[#16284C]" />
              <DropdownMenuItem
                data-testid="progress-directly-to-decision-menu-item"
                onClick={() => setShowDirectDecisionBox(true)}
                className="text-xs cursor-pointer focus:bg-[#102452] focus:text-white gap-2"
              >
                <ArrowRight className="w-3.5 h-3.5 text-[#D8B979]" />
                <span>Progress directly to Decision</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Record Contact Attempt Inline Box */}
      {showAttemptBox && (
        <form
          onSubmit={handleRecordAttempt}
          data-testid="record-contact-attempt-panel"
          className="rounded-xl border border-[#243E73] bg-[#06122E] p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white">
              Record Contact Attempt (Keeps lead in New Leads)
            </span>
            <button
              type="button"
              onClick={() => setShowAttemptBox(false)}
              className="text-xs text-slate-400 hover:text-white"
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
              className="h-9 bg-[#02091A] border-[#162952] text-white text-xs flex-1"
            />
            <Button
              type="submit"
              data-testid="save-contact-attempt-btn"
              disabled={updateInquiryMutation.isPending}
              className="h-9 bg-[#102347] border border-[#D4AF37]/50 text-[#FFE394] text-xs cursor-pointer"
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
          className="rounded-xl border border-[#D4AF37]/50 bg-[#06122E] p-4 space-y-3"
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
              className="text-xs text-slate-400 hover:text-white"
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
              className="h-9 bg-[#02091A] border-[#162952] text-white text-xs flex-1"
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
          className="rounded-xl border border-[#D4AF37]/45 bg-[#081533] p-4 space-y-2"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-[#FFE394]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Missing information blocking next action</span>
          </div>
          <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
            {blockingIssues.map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Inline Calendar / Appointment Scheduler */}
      {showScheduler && (
        <form
          onSubmit={handleScheduleDiscovery}
          data-testid="inquiry-schedule-discovery-panel"
          className="rounded-xl border border-[#D4AF37]/50 bg-[#06122E] p-5 space-y-4 shadow-[0_12px_28px_rgba(0,0,0,0.65)]"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Schedule Discovery Consultation
              </h3>
              <p className="text-xs text-slate-300">
                Creates a linked appointment on the Waypoint Calendar, moves this lead to Discovery, and updates radio counts.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] text-slate-300 mb-1 block">
                Date *
              </label>
              <Input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="h-9 bg-[#02091A] border-[#162952] text-white text-xs"
                required
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-300 mb-1 block">
                Time ({timeZone}) *
              </label>
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
                Responsible Advocate
              </label>
              <Input
                value={assignedAdvocate}
                onChange={(e) => setAssignedAdvocate(e.target.value)}
                className="h-9 bg-[#02091A] border-[#162952] text-white text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-300 mb-1 block">
                Preparation Note (Optional)
              </label>
              <Input
                value={scheduleNotes}
                onChange={(e) => setScheduleNotes(e.target.value)}
                placeholder="e.g. Confirm Zoom vs Phone"
                className="h-9 bg-[#02091A] border-[#162952] text-white text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowScheduler(false)}
              className="h-8 text-xs border-[#1E3358] bg-[#040D26] text-slate-300 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-testid="confirm-schedule-discovery-btn"
              disabled={scheduleDiscoveryMutation.isPending}
              className="h-8 text-xs bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] font-semibold cursor-pointer"
            >
              {scheduleDiscoveryMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Scheduling...
                </>
              ) : (
                "Confirm & Schedule Discovery"
              )}
            </Button>
          </div>
        </form>
      )}

      {/* Main Working Grid: Family & Students + Concerns & Desired Outcome */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Parent, Time Zone, Advocate & Student Names */}
        <div className="lg:col-span-5 rounded-xl border border-[#162952] bg-[#040D26] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#FFE394]" />
              Contact, Time Zone & Assignment
            </h3>
          </div>

          <div className="rounded-lg border border-[#162952] bg-[#02091A] p-3.5 space-y-2.5">
            <p className="text-sm font-semibold text-white">
              {lead.parentName || "Unknown Parent"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">
                  Phone
                </label>
                <Input
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  placeholder="Phone number"
                  className="h-8 bg-[#040D26] border-[#162952] text-white text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">
                  Email
                </label>
                <Input
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  placeholder="Email address"
                  className="h-8 bg-[#040D26] border-[#162952] text-white text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">
                  Preferred Method
                </label>
                <select
                  value={preferredContactMethod}
                  onChange={(e) => setPreferredContactMethod(e.target.value)}
                  className="w-full h-8 rounded-md bg-[#040D26] border border-[#162952] px-2 text-xs text-white"
                >
                  <option value="Phone">Phone</option>
                  <option value="Email">Email</option>
                  <option value="Text / SMS">Text / SMS</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">
                  Availability
                </label>
                <Input
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  placeholder="Best time to reach"
                  className="h-8 bg-[#040D26] border-[#162952] text-white text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <div>
                <label className="text-[10px] text-slate-400 flex items-center gap-1 mb-0.5">
                  <Globe className="w-3 h-3 text-[#FFE394]" />
                  Time Zone
                </label>
                <select
                  data-testid="inquiry-timezone-select"
                  value={timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                  className="w-full h-8 rounded-md bg-[#040D26] border border-[#162952] px-2 text-xs text-white"
                >
                  <option value="Eastern">Eastern Time (ET)</option>
                  <option value="Central">Central Time (CT)</option>
                  <option value="Mountain">Mountain Time (MT)</option>
                  <option value="Pacific">Pacific Time (PT)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 flex items-center gap-1 mb-0.5">
                  <UserCheck className="w-3 h-3 text-[#FFE394]" />
                  Responsible Advocate
                </label>
                <Input
                  data-testid="inquiry-advocate-input"
                  value={assignedAdvocate}
                  onChange={(e) => setAssignedAdvocate(e.target.value)}
                  placeholder="Byron Honea"
                  className="h-8 bg-[#040D26] border-[#162952] text-white text-xs"
                />
              </div>
            </div>
          </div>

          {/* Students List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-[#FFE394]" />
                Students ({studentList.length})
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
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[#FFE394] hover:text-white cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                Add Student
              </button>
            </div>

            {studentList.map((stu, idx) => (
              <div
                key={stu.id || idx}
                className="rounded-lg border border-[#162952] bg-[#02091A] p-3 space-y-2"
              >
                <div className="grid grid-cols-2 gap-2">
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
                    className="h-8 bg-[#040D26] border-[#162952] text-white text-xs"
                  />
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
                    className="h-8 bg-[#040D26] border-[#162952] text-white text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={stu.gradeLevel || ""}
                    onChange={(e) =>
                      setStudentList((prev) =>
                        prev.map((s, i) =>
                          i === idx ? { ...s, gradeLevel: e.target.value } : s
                        )
                      )
                    }
                    placeholder="Grade (e.g. Grade 6)"
                    className="h-8 bg-[#040D26] border-[#162952] text-white text-xs"
                  />
                  <select
                    value={stu.iepOr504 || "IEP"}
                    onChange={(e) =>
                      setStudentList((prev) =>
                        prev.map((s, i) =>
                          i === idx ? { ...s, iepOr504: e.target.value } : s
                        )
                      )
                    }
                    className="h-8 rounded-md bg-[#040D26] border border-[#162952] px-2 text-xs text-white"
                  >
                    <option value="IEP">IEP</option>
                    <option value="504 Plan">504 Plan</option>
                    <option value="Evaluation Needed">Seeking Evaluation</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Main Concerns & Desired Outcome */}
        <div className="lg:col-span-7 rounded-xl border border-[#162952] bg-[#040D26] p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1.5">
                Main Concerns
              </label>
              <Textarea
                data-testid="inquiry-concerns-input"
                value={concerns}
                onChange={(e) => setConcerns(e.target.value)}
                placeholder="Summarize the family's primary school, IEP/504, evaluation, or placement concerns..."
                rows={4}
                className="bg-[#02091A] border-[#162952] text-white text-xs leading-relaxed resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1.5">
                Desired Outcome
              </label>
              <Textarea
                data-testid="inquiry-desired-outcome-input"
                value={desiredOutcome}
                onChange={(e) => setDesiredOutcome(e.target.value)}
                placeholder="What is the family hoping to achieve with Waypoint Advocates?"
                rows={4}
                className="bg-[#02091A] border-[#162952] text-white text-xs leading-relaxed resize-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#162952]">
            <span className="text-[11px] text-slate-400">
              Information saved here stays visible during Discovery, Decision, and Onboarding.
            </span>
            <Button
              type="button"
              size="sm"
              data-testid="save-inquiry-details-btn"
              disabled={updateInquiryMutation.isPending}
              onClick={handleSaveInquiry}
              className="h-8 bg-[#102347] border border-[#D4AF37]/50 text-[#FFE394] hover:bg-[#162F5E] text-xs cursor-pointer"
            >
              {updateInquiryMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 mr-1.5" />
              )}
              Save Inquiry Details
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
