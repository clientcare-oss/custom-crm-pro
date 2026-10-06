import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Trash2,
  AlertTriangle,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  User,
  Users,
  ShieldAlert,
  CheckCircle2,
  CalendarClock,
  Building,
  Building2,
  Sparkles,
  History,
  Plane,
  Coffee,
  Briefcase,
  AlertOctagon,
  GraduationCap,
} from "lucide-react";
import { PatternPreviewBlock } from "./CalendarPatternStyles";

export type ScheduleActionType =
  | "CONFIRMED_APPOINTMENT"
  | "PROPOSED_HOLDS"
  | "BLOCK_TIME"
  | "OFFICE_CLOSURE"
  | "INTERNAL_EVENT";

interface MasterScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialDate?: Date;
  initialTime?: string; // "10:00"
  advocateList?: { id: string; name: string }[];
  defaultAction?: ScheduleActionType;
}

const DEFAULT_ADVOCATES = [
  { id: "byron-honea", name: "Byron Honea" },
  { id: "wyatt-smith", name: "Wyatt Smith" },
  { id: "sarah-jenkins", name: "Sarah Jenkins" },
  { id: "abby-miller", name: "Abby Miller" },
  { id: "marcus-vance", name: "Marcus Vance" },
];

const BLOCK_TYPES = [
  { id: "PTO / Vacation", label: "PTO / Vacation", icon: Plane },
  { id: "Personal Day", label: "Personal Day", icon: User },
  { id: "Sick / Out", label: "Sick / Out", icon: AlertTriangle },
  { id: "Blackout", label: "Blackout", icon: AlertOctagon },
  { id: "Protected Work Time", label: "Protected Work Time", icon: Briefcase },
  { id: "Lunch / Break", label: "Lunch / Break", icon: Coffee },
  { id: "Travel / Transition", label: "Travel / Transition", icon: Clock },
  { id: "Buffer", label: "Buffer", icon: ShieldAlert },
  { id: "Other Unavailable", label: "Other Unavailable", icon: AlertOctagon },
];

const CLOSURE_TYPES = [
  "Office Closed",
  "Holiday",
  "Emergency Closure",
  "Weather Closure",
  "Company-Wide Closure",
  "Other Closure",
];

const INTERNAL_EVENT_TYPES = [
  "Team Meeting",
  "Staff Training",
  "Case Conference",
  "Supervision",
  "Operations Meeting",
  "Staff Development",
  "Company Event",
  "Other Internal Event",
];

const COMMON_CLIENT_MEETING_TYPES = [
  "Annual IEP Meeting",
  "Triennial Re-evaluation / MET",
  "Initial IEP / Eligibility Meeting",
  "IEP Amendment / Addendum",
  "Manifestation Determination (MDR)",
  "Section 504 Plan Meeting",
  "1:1 Advocate Strategy Session",
  "Parent Pre-Meeting Consultation",
  "Meeting Type Not Yet Determined",
];

const RECENT_STORAGE_KEY = "waypoint_recent_schedule_actions";

export default function MasterScheduleModal({
  isOpen,
  onClose,
  onSuccess,
  initialDate,
  initialTime = "10:00",
  advocateList = DEFAULT_ADVOCATES,
  defaultAction,
}: MasterScheduleModalProps) {
  const utils = trpc.useUtils();

  // Active Screen: "CHOOSER" or one of the 5 specific sub-forms
  const [activeStep, setActiveStep] = useState<"CHOOSER" | ScheduleActionType>(
    defaultAction || "CHOOSER"
  );

  // When reopened, reset to defaultAction or CHOOSER
  useEffect(() => {
    if (isOpen) {
      setActiveStep(defaultAction || "CHOOSER");
    }
  }, [isOpen, defaultAction]);

  // Recently used actions
  const [recentActions, setRecentActions] = useState<ScheduleActionType[]>([
    "PROPOSED_HOLDS",
    "CONFIRMED_APPOINTMENT",
    "BLOCK_TIME",
  ]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_STORAGE_KEY);
      if (stored) {
        setRecentActions(JSON.parse(stored));
      }
    } catch {}
  }, []);

  const recordRecentAction = (action: ScheduleActionType) => {
    try {
      const updated = [action, ...recentActions.filter((a) => a !== action)].slice(0, 3);
      setRecentActions(updated);
      localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  };

  // Base Date string
  const baseDateStr = useMemo(() => {
    return initialDate
      ? new Date(initialDate).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);
  }, [initialDate]);

  // Load Contacts & Leads
  const { data: contactsData } = trpc.contacts.list.useQuery();
  const { data: leadsData } = trpc.leads.list.useQuery(undefined);

  const { parentsList, studentsList } = useMemo(() => {
    const contacts = (contactsData as any)?.contacts || (Array.isArray(contactsData) ? contactsData : []);
    const parents = contacts.filter((c: any) => c.contactType === "client" || c.contactType === "parent" || !c.contactType);
    const students = contacts.filter((c: any) => c.contactType === "student");
    return { parentsList: parents, studentsList: students };
  }, [contactsData]);

  // ==========================================
  // 1. CONFIRMED APPOINTMENT FORM STATE
  // ==========================================
  const [caParentId, setCaParentId] = useState<string>("");
  const [caStudentId, setCaStudentId] = useState<string>("");
  const [caMeetingType, setCaMeetingType] = useState<string>("Annual IEP Meeting");
  const [caAdvocate, setCaAdvocate] = useState<string>("Byron Honea");
  const [caDate, setCaDate] = useState<string>(baseDateStr);
  const [caStartTime, setCaStartTime] = useState<string>(initialTime);
  const [caDuration, setCaDuration] = useState<number>(60);
  const [caLocation, setCaLocation] = useState<string>("");
  const [caVideoLink, setCaVideoLink] = useState<string>("");
  const [caNotes, setCaNotes] = useState<string>("");
  const [caInternalNotes, setCaInternalNotes] = useState<string>("");
  const [caShowMore, setCaShowMore] = useState<boolean>(false);

  // Filter students for Confirmed Appointment
  const caFilteredStudents = useMemo(() => {
    if (!caParentId) return studentsList;
    const pid = Number(caParentId);
    return studentsList.filter((s: any) => s.parentContactId === pid || s.parentId === pid);
  }, [studentsList, caParentId]);

  // ==========================================
  // 2. PROPOSED MEETING FORM STATE
  // ==========================================
  const [pmSourceType, setPmSourceType] = useState<"CLIENT" | "LEAD">("CLIENT");
  const [pmParentId, setPmParentId] = useState<string>("");
  const [pmStudentId, setPmStudentId] = useState<string>("");
  const [pmLeadId, setPmLeadId] = useState<string>("");
  const [pmMeetingType, setPmMeetingType] = useState<string>("Annual IEP Meeting");
  const [pmAdvocate, setPmAdvocate] = useState<string>("Byron Honea");
  const [pmWaitingOn, setPmWaitingOn] = useState<"Parent / Client" | "School" | "Waypoint" | "Multiple Parties" | "Other">("School");
  const [pmWaitingOnOther, setPmWaitingOnOther] = useState<string>("");
  const [pmFinalProcess, setPmFinalProcess] = useState<"WAYPOINT_CONFIRMS" | "PARENT_CAN_CONFIRM" | "PARENT_PREFERENCE_THEN_WAYPOINT">("WAYPOINT_CONFIRMS");
  const [pmFollowUpBy, setPmFollowUpBy] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  });
  const [pmCandidateSlots, setPmCandidateSlots] = useState<
    Array<{ id: string; date: string; startTime: string; durationMinutes: number }>
  >([
    { id: "slot-1", date: baseDateStr, startTime: initialTime, durationMinutes: 60 },
  ]);

  const pmFilteredStudents = useMemo(() => {
    if (!pmParentId) return studentsList;
    const pid = Number(pmParentId);
    return studentsList.filter((s: any) => s.parentContactId === pid || s.parentId === pid);
  }, [studentsList, pmParentId]);

  // ==========================================
  // 3. BLOCK TIME FORM STATE
  // ==========================================
  const [blockType, setBlockType] = useState<string>("PTO / Vacation");
  const [blockStaff, setBlockStaff] = useState<string>("Byron Honea");
  const [blockAllStaff, setBlockAllStaff] = useState<boolean>(false);
  const [blockDate, setBlockDate] = useState<string>(baseDateStr);
  const [blockEndDate, setBlockEndDate] = useState<string>(baseDateStr);
  const [blockIsAllDay, setBlockIsAllDay] = useState<boolean>(true);
  const [blockStartTime, setBlockStartTime] = useState<string>("09:00");
  const [blockEndTime, setBlockEndTime] = useState<string>("17:00");
  const [blockEnforcement, setBlockEnforcement] = useState<"HARD_BLOCK" | "SOFT_BLOCK" | "INFORMATIONAL">("HARD_BLOCK");
  const [blockReason, setBlockReason] = useState<string>("");

  // ==========================================
  // 4. OFFICE CLOSURE FORM STATE
  // ==========================================
  const [closureType, setClosureType] = useState<string>("Office Closed");
  const [closureTitle, setClosureTitle] = useState<string>("Office Closed — Staff In-Service / Holiday");
  const [closureDate, setClosureDate] = useState<string>(baseDateStr);
  const [closureEndDate, setClosureEndDate] = useState<string>(baseDateStr);
  const [closureIsAllDay, setClosureIsAllDay] = useState<boolean>(true);
  const [closureStartTime, setClosureStartTime] = useState<string>("09:00");
  const [closureEndTime, setClosureEndTime] = useState<string>("17:00");
  const [closureIsAnnual, setClosureIsAnnual] = useState<boolean>(false);
  const [closureEnforcement, setClosureEnforcement] = useState<"HARD_BLOCK" | "INFORMATIONAL">("HARD_BLOCK");
  const [closureNotes, setClosureNotes] = useState<string>("");

  // ==========================================
  // 5. INTERNAL EVENT FORM STATE
  // ==========================================
  const [ieType, setIeType] = useState<string>("Team Meeting");
  const [ieTitle, setIeTitle] = useState<string>("Weekly Advocacy Sync");
  const [ieDate, setIeDate] = useState<string>(baseDateStr);
  const [ieStartTime, setIeStartTime] = useState<string>(initialTime);
  const [ieDuration, setIeDuration] = useState<number>(60);
  const [ieAllStaff, setIeAllStaff] = useState<boolean>(true);
  const [ieSelectedStaff, setIeSelectedStaff] = useState<string[]>(["Byron Honea"]);
  const [ieEnforcement, setIeEnforcement] = useState<"HARD_BLOCK" | "SOFT_BLOCK" | "INFORMATIONAL">("SOFT_BLOCK");
  const [ieLocation, setIeLocation] = useState<string>("");
  const [ieNotes, setIeNotes] = useState<string>("");

  // Mutations
  const createAppointmentMutation = trpc.appointments.create.useMutation({
    onSuccess: (res) => {
      utils.appointments.invalidate();
      utils.proposedMeetings.invalidate();
      onSuccess();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const createProposedMeetingMutation = trpc.proposedMeetings.create.useMutation({
    onSuccess: () => {
      toast.success("Proposed Meeting created! Candidate dates held on calendar.");
      utils.proposedMeetings.invalidate();
      utils.appointments.invalidate();
      onSuccess();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  // SUBMIT HANDLERS
  const handleSelectCategory = (action: ScheduleActionType) => {
    recordRecentAction(action);
    setActiveStep(action);
  };

  // Submit Confirmed Appointment
  const handleConfirmAppointmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caStudentId) {
      toast.error("Please select a student for this appointment.");
      return;
    }
    const student = studentsList.find((s: any) => String(s.id) === caStudentId);
    const parent = parentsList.find((p: any) => String(p.id) === caParentId);
    const studentName = student ? `${student.firstName} ${student.lastName}`.trim() : "Student";
    const parentName = parent ? `${parent.firstName} ${parent.lastName}`.trim() : undefined;

    const start = new Date(`${caDate}T${caStartTime}:00`);
    const end = new Date(start.getTime() + caDuration * 60000);

    createAppointmentMutation.mutate(
      {
        clientId: student?.id || 0,
        title: `${studentName} — ${caMeetingType}`,
        description: caNotes || undefined,
        startTime: start,
        endTime: end,
        location: caLocation || undefined,
        videoLink: caVideoLink || undefined,
        meetingType: caMeetingType,
        parentName,
        parentPhone: parent?.phone || undefined,
        studentName,
        clientTimeZone: student?.timezone || "America/New_York",
        assignedAdvocateName: caAdvocate,
      },
      {
        onSuccess: () => toast.success("Confirmed client appointment scheduled!"),
      }
    );
  };

  // Submit Proposed Meeting
  const handleProposedMeetingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let resolvedStudentName = "";
    let resolvedParentName = "";
    let resolvedParentEmail = "";
    let resolvedParentPhone = "";
    let resolvedClientId: number | undefined;
    let resolvedLeadId: number | undefined;

    if (pmSourceType === "CLIENT") {
      if (!pmStudentId) {
        toast.error("Please select a student.");
        return;
      }
      const student = studentsList.find((s: any) => String(s.id) === pmStudentId);
      resolvedStudentName = student ? `${student.firstName} ${student.lastName}`.trim() : "Student";
      resolvedClientId = student?.id;
      const parent = parentsList.find((p: any) => String(p.id) === pmParentId);
      resolvedParentName = parent ? `${parent.firstName} ${parent.lastName}`.trim() : "";
      resolvedParentEmail = parent?.email || "";
      resolvedParentPhone = parent?.phone || "";
    } else {
      if (!pmLeadId) {
        toast.error("Please select a lead.");
        return;
      }
      const lead = (leadsData as any[])?.find((l: any) => String(l.id) === pmLeadId);
      resolvedStudentName = lead?.studentName || "Prospect Student";
      resolvedParentName = lead?.parentName || lead?.contactName || "Parent";
      resolvedParentEmail = lead?.email || "";
      resolvedParentPhone = lead?.phone || "";
      resolvedLeadId = lead?.id;
    }

    const formattedSlots = pmCandidateSlots.map((s, idx) => {
      const start = new Date(`${s.date}T${s.startTime}:00`);
      const end = new Date(start.getTime() + s.durationMinutes * 60000);
      return {
        startTime: start,
        endTime: end,
        durationMinutes: s.durationMinutes,
        slotOrder: idx + 1,
      };
    });

    createProposedMeetingMutation.mutate({
      clientId: resolvedClientId,
      parentContactId: pmParentId ? Number(pmParentId) : undefined,
      leadId: resolvedLeadId,
      studentName: resolvedStudentName,
      parentName: resolvedParentName || undefined,
      parentEmail: resolvedParentEmail || undefined,
      parentPhone: resolvedParentPhone || undefined,
      meetingType: pmMeetingType,
      assignedAdvocateName: pmAdvocate,
      waitingOn: pmWaitingOn,
      waitingOnOtherExplanation: pmWaitingOn === "Other" ? pmWaitingOnOther : undefined,
      finalDateProcess: pmFinalProcess,
      followUpBy: pmFollowUpBy || undefined,
      candidateSlots: formattedSlots,
    });
  };

  // Submit Block Time
  const handleBlockTimeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const start = blockIsAllDay
      ? new Date(`${blockDate}T08:00:00`)
      : new Date(`${blockDate}T${blockStartTime}:00`);
    const end = blockIsAllDay
      ? new Date(`${blockEndDate || blockDate}T18:00:00`)
      : new Date(`${blockEndDate || blockDate}T${blockEndTime}:00`);

    const advocateLabel = blockAllStaff ? "All Staff" : blockStaff;

    createAppointmentMutation.mutate(
      {
        clientId: 0,
        title: `[${blockType.toUpperCase()}] ${advocateLabel}`,
        description: blockReason || `Scheduled block: ${blockType} (${blockEnforcement})`,
        startTime: start,
        endTime: end,
        meetingType: blockType,
        assignedAdvocateName: advocateLabel,
        studentName: advocateLabel,
        status: "Confirmed",
      },
      {
        onSuccess: () => toast.success(`Time blocked: ${blockType} for ${advocateLabel}`),
      }
    );
  };

  // Submit Office Closure
  const handleOfficeClosureSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const start = closureIsAllDay
      ? new Date(`${closureDate}T00:00:00`)
      : new Date(`${closureDate}T${closureStartTime}:00`);
    const end = closureIsAllDay
      ? new Date(`${closureEndDate || closureDate}T23:59:59`)
      : new Date(`${closureEndDate || closureDate}T${closureEndTime}:00`);

    createAppointmentMutation.mutate(
      {
        clientId: 0,
        title: `[OFFICE CLOSED] ${closureTitle}`,
        description: closureNotes || `Organization Closure: ${closureType} (${closureEnforcement})`,
        startTime: start,
        endTime: end,
        meetingType: closureType,
        assignedAdvocateName: "All Staff",
        studentName: "Waypoint Advocates (All Offices)",
        status: "Confirmed",
      },
      {
        onSuccess: () => toast.success(`Office Closure recorded: ${closureTitle}`),
      }
    );
  };

  // Submit Internal Event
  const handleInternalEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const start = new Date(`${ieDate}T${ieStartTime}:00`);
    const end = new Date(start.getTime() + ieDuration * 60000);
    const staffLabel = ieAllStaff ? "All Staff" : ieSelectedStaff.join(", ");

    createAppointmentMutation.mutate(
      {
        clientId: 0,
        title: `[INTERNAL] ${ieTitle}`,
        description: ieNotes || `Internal Event: ${ieType} (${ieEnforcement})`,
        startTime: start,
        endTime: end,
        meetingType: ieType,
        location: ieLocation || undefined,
        assignedAdvocateName: staffLabel,
        studentName: staffLabel,
        status: "Confirmed",
      },
      {
        onSuccess: () => toast.success(`Internal event scheduled: ${ieTitle}`),
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4] shadow-[0_20px_60px_rgba(0,0,0,0.95)] p-0 rounded-2xl">
        {/* ======================================================== */}
        {/* SCREEN 0: THE CLEAN FOCUSED CHOOSER (WHAT ARE YOU ADDING?) */}
        {/* ======================================================== */}
        {activeStep === "CHOOSER" && (
          <div>
            {/* Header */}
            <div className="p-6 border-b border-[#3A2C18]/80 bg-gradient-to-r from-[#07162B] via-[#091E38] to-[#07162B] rounded-t-2xl">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-mono font-bold tracking-widest text-[#C5A059] uppercase">
                  PG-007 · MASTER SCHEDULE DISPATCH
                </span>
              </div>
              <DialogTitle className="text-2xl font-serif font-bold text-[#FFF4D4] tracking-tight">
                {initialDate ? "What Are You Adding Here?" : "What Are You Adding?"}
              </DialogTitle>
              <p className="text-xs text-[#C6B697] mt-1">
                Select the purpose of this calendar entry. Every item in Waypoint has a defined operational workflow.
              </p>

              {/* RECENT AREA SHORTCUTS */}
              {recentActions.length > 0 && (
                <div className="mt-4 pt-3 border-t border-[#3A2C18]/60 flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono uppercase text-[#A69371] flex items-center gap-1">
                    <History className="w-3 h-3 text-[#C5A059]" /> Recently Used:
                  </span>
                  {recentActions.map((action) => {
                    const label =
                      action === "PROPOSED_HOLDS"
                        ? "+ Proposed Meeting / Hold Dates"
                        : action === "CONFIRMED_APPOINTMENT"
                        ? "+ Confirmed Appointment"
                        : action === "BLOCK_TIME"
                        ? "+ Block Time / PTO"
                        : action === "OFFICE_CLOSURE"
                        ? "+ Office Closure"
                        : "+ Internal Event";

                    return (
                      <button
                        key={action}
                        type="button"
                        onClick={() => handleSelectCategory(action)}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-[#020A17] border border-[#3A2C18] text-[#FFE394] hover:border-[#C5A059] hover:bg-[#102B4E] transition-all cursor-pointer font-medium"
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 5 Focused Strong Rows */}
            <div className="p-6 space-y-3">
              {/* Row 1: Confirmed Appointment */}
              <div
                onClick={() => handleSelectCategory("CONFIRMED_APPOINTMENT")}
                className="group p-4 rounded-xl border border-[#3A2C18] bg-[#020A17]/85 hover:border-[#C5A059] hover:bg-[#07162B] transition-all cursor-pointer flex items-center justify-between gap-4 shadow-sm"
              >
                <div className="flex items-center gap-3.5">
                  <div className="h-10 w-10 rounded-xl bg-emerald-950/70 border border-emerald-600/60 flex items-center justify-center text-emerald-300 group-hover:scale-105 transition-transform shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-serif font-bold text-sm text-[#FFF4D4] group-hover:text-[#FFE394] transition-colors">
                      Confirmed Appointment
                    </div>
                    <div className="text-xs text-[#C6B697] mt-0.5">
                      Meeting date is set · Client/student meeting with confirmed date & time
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-32 hidden sm:block">
                    <PatternPreviewBlock patternKey="confirmed" size="sm" />
                  </div>
                  <Badge variant="outline" className="border-[#3A2C18] text-[#A69371] text-[10px] font-mono group-hover:border-[#C5A059] group-hover:text-[#FFE394]">
                    CLIENT MEETING
                  </Badge>
                </div>
              </div>

              {/* Row 2: Proposed Meeting / Hold Dates */}
              <div
                onClick={() => handleSelectCategory("PROPOSED_HOLDS")}
                className="group p-4 rounded-xl border border-[#C5A059]/50 bg-gradient-to-r from-[#081B33] to-[#040E1C] hover:border-[#FFE394] hover:brightness-110 transition-all cursor-pointer flex items-center justify-between gap-4 shadow-md"
              >
                <div className="flex items-center gap-3.5">
                  <div className="h-10 w-10 rounded-xl bg-amber-950/70 border border-amber-600/70 flex items-center justify-center text-amber-300 group-hover:scale-105 transition-transform shrink-0">
                    <CalendarClock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-serif font-bold text-sm text-[#FFF4D4] group-hover:text-[#FFE394] transition-colors flex items-center gap-2">
                      <span>Proposed Meeting / Hold Dates</span>
                      <span className="text-[9px] font-bold font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        RECOMMENDED
                      </span>
                    </div>
                    <div className="text-xs text-[#C6B697] mt-0.5">
                      Protect possible client meeting times · Multiple linked candidate holds with auto-release
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-32 hidden sm:block">
                    <PatternPreviewBlock patternKey="proposed_hold" size="sm" />
                  </div>
                  <Badge variant="outline" className="border-amber-700/60 bg-amber-950/40 text-amber-300 text-[10px] font-mono">
                    MULTIPLE SLOTS
                  </Badge>
                </div>
              </div>

              {/* Row 3: Block Time */}
              <div
                onClick={() => handleSelectCategory("BLOCK_TIME")}
                className="group p-4 rounded-xl border border-[#3A2C18] bg-[#020A17]/85 hover:border-[#C5A059] hover:bg-[#07162B] transition-all cursor-pointer flex items-center justify-between gap-4 shadow-sm"
              >
                <div className="flex items-center gap-3.5">
                  <div className="h-10 w-10 rounded-xl bg-blue-950/70 border border-blue-600/60 flex items-center justify-center text-blue-300 group-hover:scale-105 transition-transform shrink-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-serif font-bold text-sm text-[#FFF4D4] group-hover:text-[#FFE394] transition-colors">
                      Block Time
                    </div>
                    <div className="text-xs text-[#C6B697] mt-0.5">
                      PTO, personal day, blackout, buffer, lunch, protected work time...
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-32 hidden sm:block">
                    <PatternPreviewBlock patternKey="block_time" size="sm" />
                  </div>
                  <Badge variant="outline" className="border-[#3A2C18] text-[#A69371] text-[10px] font-mono group-hover:border-[#C5A059] group-hover:text-[#FFE394]">
                    STAFF AVAILABILITY
                  </Badge>
                </div>
              </div>

              {/* Row 4: Office Closure / Holiday */}
              <div
                onClick={() => handleSelectCategory("OFFICE_CLOSURE")}
                className="group p-4 rounded-xl border border-[#3A2C18] bg-[#020A17]/85 hover:border-[#C5A059] hover:bg-[#07162B] transition-all cursor-pointer flex items-center justify-between gap-4 shadow-sm"
              >
                <div className="flex items-center gap-3.5">
                  <div className="h-10 w-10 rounded-xl bg-rose-950/70 border border-rose-600/60 flex items-center justify-center text-rose-300 group-hover:scale-105 transition-transform shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-serif font-bold text-sm text-[#FFF4D4] group-hover:text-[#FFE394] transition-colors">
                      Office Closure / Holiday
                    </div>
                    <div className="text-xs text-[#C6B697] mt-0.5">
                      Close or restrict organization-wide Waypoint scheduling
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-32 hidden sm:block">
                    <PatternPreviewBlock patternKey="office_closure" size="sm" />
                  </div>
                  <Badge variant="outline" className="border-[#3A2C18] text-[#A69371] text-[10px] font-mono group-hover:border-[#C5A059] group-hover:text-[#FFE394]">
                    ORGANIZATION
                  </Badge>
                </div>
              </div>

              {/* Row 5: Internal Event */}
              <div
                onClick={() => handleSelectCategory("INTERNAL_EVENT")}
                className="group p-4 rounded-xl border border-[#3A2C18] bg-[#020A17]/85 hover:border-[#C5A059] hover:bg-[#07162B] transition-all cursor-pointer flex items-center justify-between gap-4 shadow-sm"
              >
                <div className="flex items-center gap-3.5">
                  <div className="h-10 w-10 rounded-xl bg-purple-950/70 border border-purple-600/60 flex items-center justify-center text-purple-300 group-hover:scale-105 transition-transform shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-serif font-bold text-sm text-[#FFF4D4] group-hover:text-[#FFE394] transition-colors">
                      Internal Event
                    </div>
                    <div className="text-xs text-[#C6B697] mt-0.5">
                      Training, team meeting, case conference, supervision, operations...
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-32 hidden sm:block">
                    <PatternPreviewBlock patternKey="internal_event" size="sm" />
                  </div>
                  <Badge variant="outline" className="border-[#3A2C18] text-[#A69371] text-[10px] font-mono group-hover:border-[#C5A059] group-hover:text-[#FFE394]">
                    TEAM & OPERATIONS
                  </Badge>
                </div>
              </div>
            </div>

            <DialogFooter className="p-4 border-t border-[#3A2C18]/60 bg-[#020A17]/80 rounded-b-2xl flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="border-[#3A2C18] bg-[#020A17] text-[#C6B697] hover:text-[#FFF4D4] text-xs h-9 cursor-pointer"
              >
                Cancel
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ======================================================== */}
        {/* SUB-FORM 1: CONFIRMED APPOINTMENT */}
        {/* ======================================================== */}
        {activeStep === "CONFIRMED_APPOINTMENT" && (
          <form onSubmit={handleConfirmAppointmentSubmit}>
            <div className="p-6 border-b border-[#3A2C18]/80 bg-gradient-to-r from-[#07162B] via-[#091E38] to-[#07162B] rounded-t-2xl">
              <button
                type="button"
                onClick={() => setActiveStep("CHOOSER")}
                className="text-xs text-[#C5A059] hover:text-[#FFE394] flex items-center gap-1 mb-2 cursor-pointer font-medium"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Back to Chooser
              </button>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <DialogTitle className="text-xl font-serif font-bold text-[#FFF4D4]">
                    Schedule Confirmed Appointment
                  </DialogTitle>
                  <p className="text-xs text-[#C6B697] mt-1">
                    Client/student meeting with an already agreed date and time.
                  </p>
                </div>
                <div className="w-40 shrink-0">
                  <div className="text-[9px] font-mono text-[#A69371] uppercase mb-1">Calendar Block Pattern:</div>
                  <PatternPreviewBlock patternKey="confirmed" size="sm" />
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Client & Student Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl border border-[#3A2C18] bg-[#020A17]/60">
                <div>
                  <Label className="text-xs text-[#C6B697]">Client / Family</Label>
                  <Select value={caParentId} onValueChange={setCaParentId}>
                    <SelectTrigger className="mt-1 bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] text-xs h-9">
                      <SelectValue placeholder="Select Parent / Client..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] max-h-56">
                      {parentsList.map((p: any) => (
                        <SelectItem key={p.id} value={String(p.id)} className="text-xs focus:bg-[#102B4E]">
                          {p.firstName} {p.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-[#C6B697]">
                    Student <span className="text-rose-400">*</span>
                  </Label>
                  <Select value={caStudentId} onValueChange={setCaStudentId}>
                    <SelectTrigger className="mt-1 bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] text-xs h-9">
                      <SelectValue placeholder="Select Student..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] max-h-56">
                      {caFilteredStudents.map((s: any) => (
                        <SelectItem key={s.id} value={String(s.id)} className="text-xs focus:bg-[#102B4E]">
                          {s.firstName} {s.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Meeting Type & Advocate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-[#C6B697]">Appointment Type *</Label>
                  <Select value={caMeetingType} onValueChange={setCaMeetingType}>
                    <SelectTrigger className="mt-1 bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4]">
                      {COMMON_CLIENT_MEETING_TYPES.map((t) => (
                        <SelectItem key={t} value={t} className="text-xs focus:bg-[#102B4E]">
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-[#C6B697]">Assigned Team Member *</Label>
                  <Select value={caAdvocate} onValueChange={setCaAdvocate}>
                    <SelectTrigger className="mt-1 bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4]">
                      {advocateList.map((adv) => (
                        <SelectItem key={adv.id} value={adv.name} className="text-xs focus:bg-[#102B4E]">
                          {adv.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Date, Time, Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl border border-[#3A2C18] bg-[#020A17]/60">
                <div>
                  <Label className="text-xs text-[#C6B697]">Date *</Label>
                  <Input
                    type="date"
                    value={caDate}
                    onChange={(e) => setCaDate(e.target.value)}
                    className="mt-1 bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] text-xs h-9"
                  />
                </div>

                <div>
                  <Label className="text-xs text-[#C6B697]">Start Time *</Label>
                  <Input
                    type="time"
                    value={caStartTime}
                    onChange={(e) => setCaStartTime(e.target.value)}
                    className="mt-1 bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] text-xs h-9"
                  />
                </div>

                <div>
                  <Label className="text-xs text-[#C6B697]">Expected Duration</Label>
                  <Select
                    value={String(caDuration)}
                    onValueChange={(v) => setCaDuration(Number(v))}
                  >
                    <SelectTrigger className="mt-1 bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4]">
                      <SelectItem value="30">30 mins</SelectItem>
                      <SelectItem value="45">45 mins</SelectItem>
                      <SelectItem value="60">60 mins (1 hr)</SelectItem>
                      <SelectItem value="90">90 mins (1.5 hrs)</SelectItem>
                      <SelectItem value="120">120 mins (2 hrs)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* More Details Disclosure */}
              <div>
                <button
                  type="button"
                  onClick={() => setCaShowMore(!caShowMore)}
                  className="text-xs text-[#C5A059] hover:text-[#FFE394] font-medium flex items-center gap-1 cursor-pointer"
                >
                  <span>{caShowMore ? "Hide Details" : "+ More Details (Meeting Link, Location, Notes)"}</span>
                  {caShowMore ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {caShowMore && (
                  <div className="mt-3 space-y-3 p-3.5 rounded-xl border border-[#3A2C18] bg-[#020A17]/60">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-[#C6B697]">Virtual Meeting Link</Label>
                        <Input
                          type="text"
                          placeholder="Zoom or Google Meet link"
                          value={caVideoLink}
                          onChange={(e) => setCaVideoLink(e.target.value)}
                          className="mt-1 bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] text-xs h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-[#C6B697]">Physical Location / Room</Label>
                        <Input
                          type="text"
                          placeholder="e.g. Riverwood High Room 204"
                          value={caLocation}
                          onChange={(e) => setCaLocation(e.target.value)}
                          className="mt-1 bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] text-xs h-8"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-[#C6B697]">Notes</Label>
                      <Textarea
                        placeholder="Meeting preparation or parent notes..."
                        value={caNotes}
                        onChange={(e) => setCaNotes(e.target.value)}
                        className="mt-1 bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] text-xs h-16 resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="p-4 border-t border-[#3A2C18]/60 bg-[#020A17]/80 rounded-b-2xl flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveStep("CHOOSER")}
                className="border-[#3A2C18] bg-[#020A17] text-[#C6B697] text-xs h-9"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={createAppointmentMutation.isPending}
                className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-9 px-4"
              >
                {createAppointmentMutation.isPending ? "Scheduling..." : "Create Confirmed Appointment"}
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* ======================================================== */}
        {/* SUB-FORM 2: PROPOSED MEETING / HOLD DATES */}
        {/* ======================================================== */}
        {activeStep === "PROPOSED_HOLDS" && (
          <form onSubmit={handleProposedMeetingSubmit}>
            <div className="p-6 border-b border-[#3A2C18]/80 bg-gradient-to-r from-[#07162B] via-[#091E38] to-[#07162B] rounded-t-2xl">
              <button
                type="button"
                onClick={() => setActiveStep("CHOOSER")}
                className="text-xs text-[#C5A059] hover:text-[#FFE394] flex items-center gap-1 mb-2 cursor-pointer font-medium"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Back to Chooser
              </button>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <DialogTitle className="text-xl font-serif font-bold text-[#FFF4D4]">
                    Create Proposed Meeting (Hold Dates)
                  </DialogTitle>
                  <p className="text-xs text-[#C6B697] mt-1">
                    Protect multiple offered dates for ONE meeting. Confirming any date automatically releases all siblings.
                  </p>
                </div>
                <div className="w-40 shrink-0">
                  <div className="text-[9px] font-mono text-[#A69371] uppercase mb-1">Calendar Block Pattern:</div>
                  <PatternPreviewBlock patternKey="proposed_hold" size="sm" />
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Client / Student */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl border border-[#3A2C18] bg-[#020A17]/60">
                <div>
                  <Label className="text-xs text-[#C6B697]">Client / Family</Label>
                  <Select value={pmParentId} onValueChange={setPmParentId}>
                    <SelectTrigger className="mt-1 bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] text-xs h-9">
                      <SelectValue placeholder="Select Parent / Client..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] max-h-56">
                      {parentsList.map((p: any) => (
                        <SelectItem key={p.id} value={String(p.id)} className="text-xs focus:bg-[#102B4E]">
                          {p.firstName} {p.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-[#C6B697]">
                    Student <span className="text-rose-400">*</span>
                  </Label>
                  <Select value={pmStudentId} onValueChange={setPmStudentId}>
                    <SelectTrigger className="mt-1 bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] text-xs h-9">
                      <SelectValue placeholder="Select Student..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] max-h-56">
                      {pmFilteredStudents.map((s: any) => (
                        <SelectItem key={s.id} value={String(s.id)} className="text-xs focus:bg-[#102B4E]">
                          {s.firstName} {s.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Meeting Type & Advocate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-[#C6B697]">Meeting Type</Label>
                  <Select value={pmMeetingType} onValueChange={setPmMeetingType}>
                    <SelectTrigger className="mt-1 bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4]">
                      {COMMON_CLIENT_MEETING_TYPES.map((t) => (
                        <SelectItem key={t} value={t} className="text-xs">
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-[#C6B697]">Assigned Advocate</Label>
                  <Select value={pmAdvocate} onValueChange={setPmAdvocate}>
                    <SelectTrigger className="mt-1 bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4]">
                      {advocateList.map((adv) => (
                        <SelectItem key={adv.id} value={adv.name} className="text-xs">
                          {adv.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Waiting on & Follow Up By */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl border border-[#3A2C18] bg-[#020A17]/60">
                <div>
                  <Label className="text-xs text-[#C6B697]">Who are we waiting on?</Label>
                  <Select value={pmWaitingOn} onValueChange={(v: any) => setPmWaitingOn(v)}>
                    <SelectTrigger className="mt-1 bg-[#05142B] border-[#3A2C18] text-[#FFE394] text-xs h-9 font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4]">
                      <SelectItem value="School">School District</SelectItem>
                      <SelectItem value="Parent / Client">Parent / Client</SelectItem>
                      <SelectItem value="Waypoint">Waypoint Staff</SelectItem>
                      <SelectItem value="Multiple Parties">Multiple Parties</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {pmWaitingOn === "Other" && (
                    <Input
                      type="text"
                      placeholder="Explain who we are waiting on..."
                      value={pmWaitingOnOther}
                      onChange={(e) => setPmWaitingOnOther(e.target.value)}
                      className="mt-1 bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] text-xs h-8"
                    />
                  )}
                </div>

                <div>
                  <Label className="text-xs text-[#C6B697]">Follow Up By Date</Label>
                  <Input
                    type="date"
                    value={pmFollowUpBy}
                    onChange={(e) => setPmFollowUpBy(e.target.value)}
                    className="mt-1 bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] text-xs h-9"
                  />
                </div>
              </div>

              {/* Candidate Slots */}
              <div className="p-3.5 rounded-xl border border-[#3A2C18] bg-[#020A17]/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#C5A059] uppercase">
                    Candidate Date Options ({pmCandidateSlots.length} Held)
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      const nextNum = pmCandidateSlots.length + 1;
                      const last = pmCandidateSlots[pmCandidateSlots.length - 1];
                      let nextDate = last?.date || baseDateStr;
                      try {
                        const d = new Date(nextDate + "T12:00:00");
                        d.setDate(d.getDate() + 1);
                        nextDate = d.toISOString().slice(0, 10);
                      } catch {}
                      setPmCandidateSlots([
                        ...pmCandidateSlots,
                        { id: `slot-${Date.now()}-${nextNum}`, date: nextDate, startTime: "10:00", durationMinutes: 60 },
                      ]);
                    }}
                    className="h-7 px-2.5 rounded-lg bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Possible Date
                  </Button>
                </div>

                <div className="space-y-2">
                  {pmCandidateSlots.map((slot, idx) => (
                    <div
                      key={slot.id}
                      className="p-2.5 rounded-lg border border-[#3A2C18] bg-[#05142B] flex items-center gap-2"
                    >
                      <span className="font-mono text-xs text-[#FFE394] font-bold w-6 text-center">
                        #{idx + 1}
                      </span>
                      <Input
                        type="date"
                        value={slot.date}
                        onChange={(e) =>
                          setPmCandidateSlots(
                            pmCandidateSlots.map((s) => (s.id === slot.id ? { ...s, date: e.target.value } : s))
                          )
                        }
                        className="bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] text-xs h-8 flex-1"
                      />
                      <Input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) =>
                          setPmCandidateSlots(
                            pmCandidateSlots.map((s) => (s.id === slot.id ? { ...s, startTime: e.target.value } : s))
                          )
                        }
                        className="bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] text-xs h-8 w-28"
                      />
                      {pmCandidateSlots.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setPmCandidateSlots(pmCandidateSlots.filter((s) => s.id !== slot.id))}
                          className="text-[#A69371] hover:text-rose-400 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="p-4 border-t border-[#3A2C18]/60 bg-[#020A17]/80 rounded-b-2xl flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveStep("CHOOSER")}
                className="border-[#3A2C18] bg-[#020A17] text-[#C6B697] text-xs h-9"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={createProposedMeetingMutation.isPending}
                className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-9 px-4"
              >
                {createProposedMeetingMutation.isPending ? "Holding..." : `Hold ${pmCandidateSlots.length} Dates`}
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* ======================================================== */}
        {/* SUB-FORM 3: BLOCK TIME (PTO, PERSONAL, BLACKOUT, ETC.) */}
        {/* ======================================================== */}
        {activeStep === "BLOCK_TIME" && (
          <form onSubmit={handleBlockTimeSubmit}>
            <div className="p-6 border-b border-[#3A2C18]/80 bg-gradient-to-r from-[#07162B] via-[#091E38] to-[#07162B] rounded-t-2xl">
              <button
                type="button"
                onClick={() => setActiveStep("CHOOSER")}
                className="text-xs text-[#C5A059] hover:text-[#FFE394] flex items-center gap-1 mb-2 cursor-pointer font-medium"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Back to Chooser
              </button>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <DialogTitle className="text-xl font-serif font-bold text-[#FFF4D4]">
                    Block Time & Staff Availability
                  </DialogTitle>
                  <p className="text-xs text-[#C6B697] mt-1">
                    Make an employee or team unavailable or protected for PTO, personal days, focus, or blackout periods.
                  </p>
                </div>
                <div className="w-40 shrink-0">
                  <div className="text-[9px] font-mono text-[#A69371] uppercase mb-1">Calendar Block Pattern:</div>
                  <PatternPreviewBlock patternKey="block_time" size="sm" />
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Block Type Chooser */}
              <div>
                <Label className="text-xs text-[#C6B697]">Block Type *</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1.5">
                  {BLOCK_TYPES.map(({ id, label, icon: Icon }) => (
                    <div
                      key={id}
                      onClick={() => setBlockType(id)}
                      className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-center gap-2 ${
                        blockType === id
                          ? "bg-[#102B4E] border-[#C5A059] text-[#FFE394] font-bold"
                          : "bg-[#020A17] border-[#3A2C18] text-[#C6B697] hover:border-[#C5A059]/40"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
                      <span className="truncate">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Who does this apply to? */}
              <div className="p-3.5 rounded-xl border border-[#3A2C18] bg-[#020A17]/60 space-y-2">
                <Label className="text-xs text-[#C6B697]">Who does this apply to?</Label>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="blockAllStaff"
                      checked={blockAllStaff}
                      onCheckedChange={(checked) => setBlockAllStaff(Boolean(checked))}
                    />
                    <label htmlFor="blockAllStaff" className="text-xs text-[#FFF4D4] cursor-pointer">
                      All Advocates & Staff
                    </label>
                  </div>
                </div>

                {!blockAllStaff && (
                  <Select value={blockStaff} onValueChange={setBlockStaff}>
                    <SelectTrigger className="mt-1 bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4]">
                      {advocateList.map((adv) => (
                        <SelectItem key={adv.id} value={adv.name} className="text-xs">
                          {adv.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* When? (Date & Time) */}
              <div className="p-3.5 rounded-xl border border-[#3A2C18] bg-[#020A17]/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#C5A059] uppercase">Schedule Window</span>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="blockIsAllDay"
                      checked={blockIsAllDay}
                      onCheckedChange={(checked) => setBlockIsAllDay(Boolean(checked))}
                    />
                    <label htmlFor="blockIsAllDay" className="text-xs text-[#FFF4D4] cursor-pointer">
                      Full Day
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-[#C6B697]">Start Date</Label>
                    <Input
                      type="date"
                      value={blockDate}
                      onChange={(e) => setBlockDate(e.target.value)}
                      className="mt-1 bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] text-xs h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-[#C6B697]">End Date</Label>
                    <Input
                      type="date"
                      value={blockEndDate}
                      onChange={(e) => setBlockEndDate(e.target.value)}
                      className="mt-1 bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] text-xs h-9"
                    />
                  </div>
                </div>

                {!blockIsAllDay && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <Label className="text-xs text-[#C6B697]">Start Time</Label>
                      <Input
                        type="time"
                        value={blockStartTime}
                        onChange={(e) => setBlockStartTime(e.target.value)}
                        className="mt-1 bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] text-xs h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-[#C6B697]">End Time</Label>
                      <Input
                        type="time"
                        value={blockEndTime}
                        onChange={(e) => setBlockEndTime(e.target.value)}
                        className="mt-1 bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] text-xs h-9"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Enforcement Level */}
              <div className="p-3.5 rounded-xl border border-[#3A2C18] bg-[#020A17]/60">
                <Label className="text-xs text-[#C6B697]">Scheduling Impact</Label>
                <div className="grid grid-cols-3 gap-2 mt-1.5 text-center">
                  <div
                    onClick={() => setBlockEnforcement("HARD_BLOCK")}
                    className={`p-2 rounded-lg border text-xs cursor-pointer ${
                      blockEnforcement === "HARD_BLOCK"
                        ? "bg-rose-950/80 border-rose-500 text-rose-200 font-bold"
                        : "bg-[#05142B] border-[#3A2C18] text-[#A69371]"
                    }`}
                  >
                    Hard Block
                  </div>
                  <div
                    onClick={() => setBlockEnforcement("SOFT_BLOCK")}
                    className={`p-2 rounded-lg border text-xs cursor-pointer ${
                      blockEnforcement === "SOFT_BLOCK"
                        ? "bg-amber-950/80 border-amber-500 text-amber-200 font-bold"
                        : "bg-[#05142B] border-[#3A2C18] text-[#A69371]"
                    }`}
                  >
                    Soft Block (Warn)
                  </div>
                  <div
                    onClick={() => setBlockEnforcement("INFORMATIONAL")}
                    className={`p-2 rounded-lg border text-xs cursor-pointer ${
                      blockEnforcement === "INFORMATIONAL"
                        ? "bg-blue-950/80 border-blue-500 text-blue-200 font-bold"
                        : "bg-[#05142B] border-[#3A2C18] text-[#A69371]"
                    }`}
                  >
                    Informational
                  </div>
                </div>
              </div>

              {/* Notes / Reason */}
              <div>
                <Label className="text-xs text-[#C6B697]">Reason / Internal Note</Label>
                <Input
                  type="text"
                  placeholder="e.g. Approved vacation leave or focus time"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="mt-1 bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] text-xs h-9"
                />
              </div>
            </div>

            <DialogFooter className="p-4 border-t border-[#3A2C18]/60 bg-[#020A17]/80 rounded-b-2xl flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveStep("CHOOSER")}
                className="border-[#3A2C18] bg-[#020A17] text-[#C6B697] text-xs h-9"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={createAppointmentMutation.isPending}
                className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-9 px-4"
              >
                {createAppointmentMutation.isPending ? "Blocking..." : "Save Block Time"}
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* ======================================================== */}
        {/* SUB-FORM 4: OFFICE CLOSURE / HOLIDAY */}
        {/* ======================================================== */}
        {activeStep === "OFFICE_CLOSURE" && (
          <form onSubmit={handleOfficeClosureSubmit}>
            <div className="p-6 border-b border-[#3A2C18]/80 bg-gradient-to-r from-[#07162B] via-[#091E38] to-[#07162B] rounded-t-2xl">
              <button
                type="button"
                onClick={() => setActiveStep("CHOOSER")}
                className="text-xs text-[#C5A059] hover:text-[#FFE394] flex items-center gap-1 mb-2 cursor-pointer font-medium"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Back to Chooser
              </button>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <DialogTitle className="text-xl font-serif font-bold text-[#FFF4D4]">
                    Office Closure or Holiday
                  </DialogTitle>
                  <p className="text-xs text-[#C6B697] mt-1">
                    Create an organization-wide closure or holiday across Waypoint Advocates.
                  </p>
                </div>
                <div className="w-40 shrink-0">
                  <div className="text-[9px] font-mono text-[#A69371] uppercase mb-1">Calendar Block Pattern:</div>
                  <PatternPreviewBlock patternKey="office_closure" size="sm" />
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-[#C6B697]">Closure Type *</Label>
                  <Select value={closureType} onValueChange={setClosureType}>
                    <SelectTrigger className="mt-1 bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4]">
                      {CLOSURE_TYPES.map((c) => (
                        <SelectItem key={c} value={c} className="text-xs">
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-[#C6B697]">Closure Title *</Label>
                  <Input
                    type="text"
                    value={closureTitle}
                    onChange={(e) => setClosureTitle(e.target.value)}
                    className="mt-1 bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] text-xs h-9"
                  />
                </div>
              </div>

              {/* Date & Time */}
              <div className="p-3.5 rounded-xl border border-[#3A2C18] bg-[#020A17]/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#C5A059] uppercase">Duration & Dates</span>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <Checkbox
                        id="closureIsAllDay"
                        checked={closureIsAllDay}
                        onCheckedChange={(c) => setClosureIsAllDay(Boolean(c))}
                      />
                      <label htmlFor="closureIsAllDay" className="text-xs text-[#FFF4D4] cursor-pointer">
                        Full Day
                      </label>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Checkbox
                        id="closureIsAnnual"
                        checked={closureIsAnnual}
                        onCheckedChange={(c) => setClosureIsAnnual(Boolean(c))}
                      />
                      <label htmlFor="closureIsAnnual" className="text-xs text-[#FFF4D4] cursor-pointer">
                        Annual Recurring
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-[#C6B697]">Start Date</Label>
                    <Input
                      type="date"
                      value={closureDate}
                      onChange={(e) => setClosureDate(e.target.value)}
                      className="mt-1 bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] text-xs h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-[#C6B697]">End Date</Label>
                    <Input
                      type="date"
                      value={closureEndDate}
                      onChange={(e) => setClosureEndDate(e.target.value)}
                      className="mt-1 bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] text-xs h-9"
                    />
                  </div>
                </div>
              </div>

              {/* Does this prevent scheduling? */}
              <div className="p-3.5 rounded-xl border border-[#3A2C18] bg-[#020A17]/60">
                <Label className="text-xs text-[#C6B697]">Does this prevent client scheduling?</Label>
                <div className="grid grid-cols-2 gap-3 mt-1.5">
                  <div
                    onClick={() => setClosureEnforcement("HARD_BLOCK")}
                    className={`p-3 rounded-lg border text-xs cursor-pointer ${
                      closureEnforcement === "HARD_BLOCK"
                        ? "bg-rose-950/80 border-rose-500 text-rose-200 font-bold"
                        : "bg-[#05142B] border-[#3A2C18] text-[#A69371]"
                    }`}
                  >
                    <div className="font-bold text-rose-300">HARD BLOCK</div>
                    <div className="text-[10px] mt-0.5 opacity-80">
                      Disables all client appointments and booking slots across the company.
                    </div>
                  </div>

                  <div
                    onClick={() => setClosureEnforcement("INFORMATIONAL")}
                    className={`p-3 rounded-lg border text-xs cursor-pointer ${
                      closureEnforcement === "INFORMATIONAL"
                        ? "bg-blue-950/80 border-blue-500 text-blue-200 font-bold"
                        : "bg-[#05142B] border-[#3A2C18] text-[#A69371]"
                    }`}
                  >
                    <div className="font-bold text-blue-300">INFORMATIONAL ONLY</div>
                    <div className="text-[10px] mt-0.5 opacity-80">
                      Displays holiday banner on calendar; does not strictly block appointments.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="p-4 border-t border-[#3A2C18]/60 bg-[#020A17]/80 rounded-b-2xl flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveStep("CHOOSER")}
                className="border-[#3A2C18] bg-[#020A17] text-[#C6B697] text-xs h-9"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={createAppointmentMutation.isPending}
                className="bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs h-9 px-4"
              >
                {createAppointmentMutation.isPending ? "Saving..." : "Create Office Closure"}
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* ======================================================== */}
        {/* SUB-FORM 5: INTERNAL EVENT (TEAM MEETING, TRAINING, ETC.) */}
        {/* ======================================================== */}
        {activeStep === "INTERNAL_EVENT" && (
          <form onSubmit={handleInternalEventSubmit}>
            <div className="p-6 border-b border-[#3A2C18]/80 bg-gradient-to-r from-[#07162B] via-[#091E38] to-[#07162B] rounded-t-2xl">
              <button
                type="button"
                onClick={() => setActiveStep("CHOOSER")}
                className="text-xs text-[#C5A059] hover:text-[#FFE394] flex items-center gap-1 mb-2 cursor-pointer font-medium"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Back to Chooser
              </button>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <DialogTitle className="text-xl font-serif font-bold text-[#FFF4D4]">
                    Create Internal Event
                  </DialogTitle>
                  <p className="text-xs text-[#C6B697] mt-1">
                    Team meetings, trainings, case conferences, and company operations.
                  </p>
                </div>
                <div className="w-40 shrink-0">
                  <div className="text-[9px] font-mono text-[#A69371] uppercase mb-1">Calendar Block Pattern:</div>
                  <PatternPreviewBlock patternKey="internal_event" size="sm" />
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-[#C6B697]">Event Type</Label>
                  <Select value={ieType} onValueChange={setIeType}>
                    <SelectTrigger className="mt-1 bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4]">
                      {INTERNAL_EVENT_TYPES.map((t) => (
                        <SelectItem key={t} value={t} className="text-xs">
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-[#C6B697]">Event Title *</Label>
                  <Input
                    type="text"
                    value={ieTitle}
                    onChange={(e) => setIeTitle(e.target.value)}
                    className="mt-1 bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] text-xs h-9"
                  />
                </div>
              </div>

              {/* Date, Time, Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl border border-[#3A2C18] bg-[#020A17]/60">
                <div>
                  <Label className="text-xs text-[#C6B697]">Date</Label>
                  <Input
                    type="date"
                    value={ieDate}
                    onChange={(e) => setIeDate(e.target.value)}
                    className="mt-1 bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] text-xs h-9"
                  />
                </div>

                <div>
                  <Label className="text-xs text-[#C6B697]">Start Time</Label>
                  <Input
                    type="time"
                    value={ieStartTime}
                    onChange={(e) => setIeStartTime(e.target.value)}
                    className="mt-1 bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] text-xs h-9"
                  />
                </div>

                <div>
                  <Label className="text-xs text-[#C6B697]">Duration</Label>
                  <Select
                    value={String(ieDuration)}
                    onValueChange={(v) => setIeDuration(Number(v))}
                  >
                    <SelectTrigger className="mt-1 bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4]">
                      <SelectItem value="30">30 mins</SelectItem>
                      <SelectItem value="45">45 mins</SelectItem>
                      <SelectItem value="60">60 mins (1 hr)</SelectItem>
                      <SelectItem value="90">90 mins (1.5 hrs)</SelectItem>
                      <SelectItem value="120">120 mins (2 hrs)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Participating Employees */}
              <div className="p-3.5 rounded-xl border border-[#3A2C18] bg-[#020A17]/60 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-[#C6B697]">Participating Team Members</Label>
                  <div className="flex items-center gap-1.5">
                    <Checkbox
                      id="ieAllStaff"
                      checked={ieAllStaff}
                      onCheckedChange={(c) => setIeAllStaff(Boolean(c))}
                    />
                    <label htmlFor="ieAllStaff" className="text-xs text-[#FFF4D4] cursor-pointer">
                      All Staff
                    </label>
                  </div>
                </div>

                {!ieAllStaff && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {advocateList.map((adv) => {
                      const isSel = ieSelectedStaff.includes(adv.name);
                      return (
                        <button
                          key={adv.id}
                          type="button"
                          onClick={() => {
                            if (isSel) {
                              setIeSelectedStaff(ieSelectedStaff.filter((n) => n !== adv.name));
                            } else {
                              setIeSelectedStaff([...ieSelectedStaff, adv.name]);
                            }
                          }}
                          className={`text-xs px-2.5 py-1 rounded-lg border cursor-pointer transition-all ${
                            isSel
                              ? "bg-purple-950/80 border-purple-500 text-purple-200 font-bold"
                              : "bg-[#05142B] border-[#3A2C18] text-[#C6B697]"
                          }`}
                        >
                          {adv.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Scheduling Impact */}
              <div className="p-3.5 rounded-xl border border-[#3A2C18] bg-[#020A17]/60">
                <Label className="text-xs text-[#C6B697]">Scheduling Impact</Label>
                <div className="grid grid-cols-3 gap-2 mt-1.5 text-center">
                  <div
                    onClick={() => setIeEnforcement("HARD_BLOCK")}
                    className={`p-2 rounded-lg border text-xs cursor-pointer ${
                      ieEnforcement === "HARD_BLOCK"
                        ? "bg-rose-950/80 border-rose-500 text-rose-200 font-bold"
                        : "bg-[#05142B] border-[#3A2C18] text-[#A69371]"
                    }`}
                  >
                    Hard Blocks
                  </div>
                  <div
                    onClick={() => setIeEnforcement("SOFT_BLOCK")}
                    className={`p-2 rounded-lg border text-xs cursor-pointer ${
                      ieEnforcement === "SOFT_BLOCK"
                        ? "bg-amber-950/80 border-amber-500 text-amber-200 font-bold"
                        : "bg-[#05142B] border-[#3A2C18] text-[#A69371]"
                    }`}
                  >
                    Soft Blocks
                  </div>
                  <div
                    onClick={() => setIeEnforcement("INFORMATIONAL")}
                    className={`p-2 rounded-lg border text-xs cursor-pointer ${
                      ieEnforcement === "INFORMATIONAL"
                        ? "bg-blue-950/80 border-blue-500 text-blue-200 font-bold"
                        : "bg-[#05142B] border-[#3A2C18] text-[#A69371]"
                    }`}
                  >
                    Informational Only
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="p-4 border-t border-[#3A2C18]/60 bg-[#020A17]/80 rounded-b-2xl flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveStep("CHOOSER")}
                className="border-[#3A2C18] bg-[#020A17] text-[#C6B697] text-xs h-9"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={createAppointmentMutation.isPending}
                className="bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs h-9 px-4"
              >
                {createAppointmentMutation.isPending ? "Scheduling..." : "Schedule Internal Event"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
