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
  ChevronDown,
  ChevronUp,
  User,
  Users,
  ShieldAlert,
  CheckCircle2,
  CalendarClock,
  Building,
} from "lucide-react";
import { SIX_CORE_ZONES } from "@shared/timezones";

interface CandidateSlotState {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  durationMinutes: number;
  notes?: string;
  conflictWarning?: string | null;
}

interface CreateProposedMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialDate?: Date;
  advocateList?: { id: string; name: string }[];
}

const DEFAULT_ADVOCATES = [
  { id: "byron-honea", name: "Byron Honea" },
  { id: "wyatt-smith", name: "Wyatt Smith" },
  { id: "sarah-jenkins", name: "Sarah Jenkins" },
  { id: "abby-miller", name: "Abby Miller" },
  { id: "marcus-vance", name: "Marcus Vance" },
];

const COMMON_MEETING_TYPES = [
  "Annual IEP Meeting",
  "Triennial Re-evaluation / MET",
  "Initial IEP / Eligibility Meeting",
  "IEP Amendment / Addendum",
  "Manifestation Determination (MDR)",
  "Section 504 Plan Meeting",
  "1:1 Advocate Strategy Session",
  "Parent Pre-Meeting Consultation",
  "School District Resolution Session",
  "Meeting Type Not Yet Determined",
];

export default function CreateProposedMeetingModal({
  isOpen,
  onClose,
  onSuccess,
  initialDate,
  advocateList = DEFAULT_ADVOCATES,
}: CreateProposedMeetingModalProps) {
  // Primary Choice: Confirmed Appointment vs Proposed Meeting / Hold Dates
  const [modalMode, setModalMode] = useState<"PROPOSED_HOLDS" | "CONFIRMED_APPOINTMENT">("PROPOSED_HOLDS");

  // Client / Student Connection State
  const [sourceType, setSourceType] = useState<"CLIENT" | "LEAD">("CLIENT");
  const [selectedParentContactId, setSelectedParentContactId] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");

  // Meeting Details
  const [meetingType, setMeetingType] = useState<string>("Annual IEP Meeting");
  const [customMeetingType, setCustomMeetingType] = useState<string>("");
  const [assignedAdvocateName, setAssignedAdvocateName] = useState<string>("Byron Honea");
  const [clientTimeZone, setClientTimeZone] = useState<string>("America/New_York");

  // Proposed Meeting Specific Fields
  const [waitingOn, setWaitingOn] = useState<"Parent / Client" | "School" | "Waypoint" | "Multiple Parties" | "Other">("School");
  const [waitingOnOtherExplanation, setWaitingOnOtherExplanation] = useState<string>("");
  const [finalDateProcess, setFinalDateProcess] = useState<"WAYPOINT_CONFIRMS" | "PARENT_CAN_CONFIRM" | "PARENT_PREFERENCE_THEN_WAYPOINT">("WAYPOINT_CONFIRMS");
  
  // Follow Up By default 2 business days out
  const defaultFollowUp = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  }, []);
  const [followUpBy, setFollowUpBy] = useState<string>(defaultFollowUp);

  // Progressive disclosure
  const [showMoreDetails, setShowMoreDetails] = useState<boolean>(false);
  const [schoolDistrict, setSchoolDistrict] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [virtualMeetingLink, setVirtualMeetingLink] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [internalNotes, setInternalNotes] = useState<string>("");

  // Candidate Slots
  const initialDateStr = initialDate ? new Date(initialDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  const [candidateSlots, setCandidateSlots] = useState<CandidateSlotState[]>([
    {
      id: "slot-1",
      date: initialDateStr,
      startTime: "10:00",
      durationMinutes: 60,
    },
  ]);

  // Confirmed Appointment Single Slot State
  const [confirmedDate, setConfirmedDate] = useState<string>(initialDateStr);
  const [confirmedStartTime, setConfirmedStartTime] = useState<string>("10:00");
  const [confirmedDuration, setConfirmedDuration] = useState<number>(60);

  // Load Contacts & Leads for selectors
  const { data: contactsData } = trpc.contacts.list.useQuery();
  const { data: leadsData } = trpc.leads.list.useQuery(undefined, { enabled: sourceType === "LEAD" });

  // Separate parent contacts and student contacts
  const { parentsList, studentsList } = useMemo(() => {
    const contacts = (contactsData as any)?.contacts || (Array.isArray(contactsData) ? contactsData : []);
    const parents = contacts.filter((c: any) => c.contactType === "client" || c.contactType === "parent" || !c.contactType);
    const students = contacts.filter((c: any) => c.contactType === "student");
    return { parentsList: parents, studentsList: students };
  }, [contactsData]);

  // Filter students if parent is selected (or show all students)
  const filteredStudents = useMemo(() => {
    if (!selectedParentContactId) return studentsList;
    const parentIdNum = Number(selectedParentContactId);
    return studentsList.filter((s: any) => s.parentContactId === parentIdNum || s.parentId === parentIdNum);
  }, [studentsList, selectedParentContactId]);

  // Handle Parent Selection
  const handleParentSelect = (parentIdStr: string) => {
    setSelectedParentContactId(parentIdStr);
    const parent = parentsList.find((p: any) => String(p.id) === parentIdStr);
    if (parent?.timeZone) {
      setClientTimeZone(parent.timeZone);
    }
    // Auto-select student if only one student belongs to this parent
    const matches = studentsList.filter((s: any) => s.parentContactId === Number(parentIdStr) || s.parentId === Number(parentIdStr));
    if (matches.length === 1) {
      setSelectedStudentId(String(matches[0].id));
      if (matches[0].schoolDistrict) setSchoolDistrict(matches[0].schoolDistrict);
    } else {
      setSelectedStudentId("");
    }
  };

  // Handle Student Selection
  const handleStudentSelect = (studentIdStr: string) => {
    setSelectedStudentId(studentIdStr);
    const student = studentsList.find((s: any) => String(s.id) === studentIdStr);
    if (student) {
      if (student.schoolDistrict) setSchoolDistrict(student.schoolDistrict);
      if (student.parentContactId && !selectedParentContactId) {
        setSelectedParentContactId(String(student.parentContactId));
      }
    }
  };

  // Add Candidate Slot
  const handleAddCandidateSlot = () => {
    const nextSlotNum = candidateSlots.length + 1;
    // Default next slot to following day or different time
    const lastSlot = candidateSlots[candidateSlots.length - 1];
    let nextDate = lastSlot?.date || initialDateStr;
    try {
      const d = new Date(nextDate + "T12:00:00");
      d.setDate(d.getDate() + 1);
      nextDate = d.toISOString().slice(0, 10);
    } catch {}

    setCandidateSlots([
      ...candidateSlots,
      {
        id: `slot-${Date.now()}-${nextSlotNum}`,
        date: nextDate,
        startTime: lastSlot?.startTime || "10:00",
        durationMinutes: lastSlot?.durationMinutes || 60,
      },
    ]);
  };

  // Remove Candidate Slot
  const handleRemoveCandidateSlot = (slotId: string) => {
    if (candidateSlots.length <= 1) {
      toast.error("A proposed meeting must contain at least one candidate time slot.");
      return;
    }
    setCandidateSlots(candidateSlots.filter((s) => s.id !== slotId));
  };

  // Update Candidate Slot
  const handleUpdateSlot = (slotId: string, field: keyof CandidateSlotState, value: any) => {
    setCandidateSlots((slots) =>
      slots.map((s) => (s.id === slotId ? { ...s, [field]: value } : s))
    );
  };

  // Mutations
  const utils = trpc.useUtils();
  const createProposedMeetingMutation = trpc.proposedMeetings.create.useMutation({
    onSuccess: () => {
      toast.success("Proposed meeting created! Candidate slots are held on the calendar.");
      utils.proposedMeetings.invalidate();
      utils.appointments.invalidate();
      onSuccess();
      onClose();
    },
    onError: (err) => {
      toast.error(`Failed to create proposed meeting: ${err.message}`);
    },
  });

  const createAppointmentMutation = trpc.appointments.create.useMutation({
    onSuccess: () => {
      toast.success("Confirmed appointment scheduled!");
      utils.appointments.invalidate();
      utils.proposedMeetings.invalidate();
      onSuccess();
      onClose();
    },
    onError: (err) => {
      toast.error(`Failed to create appointment: ${err.message}`);
    },
  });

  // Submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Resolve student and parent names
    let resolvedStudentName = "";
    let resolvedParentName = "";
    let resolvedParentEmail = "";
    let resolvedParentPhone = "";
    let resolvedClientId: number | undefined;
    let resolvedLeadId: number | undefined;

    if (sourceType === "CLIENT") {
      if (!selectedStudentId && studentsList.length > 0) {
        toast.error("Please select a student for this meeting.");
        return;
      }
      const student = studentsList.find((s: any) => String(s.id) === selectedStudentId);
      resolvedStudentName = student ? `${student.firstName} ${student.lastName}`.trim() : "Student";
      resolvedClientId = student?.id;

      const parent = parentsList.find((p: any) => String(p.id) === selectedParentContactId);
      resolvedParentName = parent ? `${parent.firstName} ${parent.lastName}`.trim() : "";
      resolvedParentEmail = parent?.email || "";
      resolvedParentPhone = parent?.phone || "";
    } else {
      // Lead mode
      if (!selectedLeadId) {
        toast.error("Please select a lead/prospect.");
        return;
      }
      const lead = (leadsData as any[])?.find((l: any) => String(l.id) === selectedLeadId);
      resolvedStudentName = lead?.studentName || "Prospect Student";
      resolvedParentName = lead?.parentName || lead?.contactName || "Parent";
      resolvedParentEmail = lead?.email || "";
      resolvedParentPhone = lead?.phone || "";
      resolvedLeadId = lead?.id;
    }

    const effectiveMeetingType = meetingType === "Other" ? customMeetingType : meetingType;
    if (!effectiveMeetingType) {
      toast.error("Please specify a meeting type.");
      return;
    }

    if (modalMode === "PROPOSED_HOLDS") {
      // Validate candidate slots
      if (candidateSlots.length === 0) {
        toast.error("Please add at least one candidate date slot.");
        return;
      }

      const formattedSlots = candidateSlots.map((s, idx) => {
        const start = new Date(`${s.date}T${s.startTime}:00`);
        const end = new Date(start.getTime() + s.durationMinutes * 60000);
        return {
          startTime: start,
          endTime: end,
          durationMinutes: s.durationMinutes,
          slotOrder: idx + 1,
          notes: s.notes,
        };
      });

      createProposedMeetingMutation.mutate({
        clientId: resolvedClientId,
        parentContactId: selectedParentContactId ? Number(selectedParentContactId) : undefined,
        leadId: resolvedLeadId,
        studentName: resolvedStudentName,
        parentName: resolvedParentName || undefined,
        parentEmail: resolvedParentEmail || undefined,
        parentPhone: resolvedParentPhone || undefined,
        meetingType: effectiveMeetingType,
        assignedAdvocateName,
        waitingOn,
        waitingOnOtherExplanation: waitingOn === "Other" ? waitingOnOtherExplanation : undefined,
        finalDateProcess,
        followUpBy: followUpBy || undefined,
        schoolDistrict: schoolDistrict || undefined,
        location: location || undefined,
        virtualMeetingLink: virtualMeetingLink || undefined,
        notes: notes || undefined,
        internalNotes: internalNotes || undefined,
        clientTimeZone,
        candidateSlots: formattedSlots,
      });
    } else {
      // Confirmed Appointment Mode
      const start = new Date(`${confirmedDate}T${confirmedStartTime}:00`);
      const end = new Date(start.getTime() + confirmedDuration * 60000);

      createAppointmentMutation.mutate({
        clientId: resolvedClientId || 0,
        title: `${resolvedStudentName} — ${effectiveMeetingType}`,
        description: notes || undefined,
        startTime: start,
        endTime: end,
        location: location || undefined,
        videoLink: virtualMeetingLink || undefined,
        meetingType: effectiveMeetingType,
        parentName: resolvedParentName || undefined,
        parentPhone: resolvedParentPhone || undefined,
        studentName: resolvedStudentName,
        clientTimeZone,
        assignedAdvocateName,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4] shadow-[0_16px_40px_rgba(0,0,0,0.95)] p-0 rounded-2xl">
        {/* Header */}
        <div className="p-6 border-b border-[#3A2C18]/80 bg-gradient-to-r from-[#07162B] via-[#091E38] to-[#07162B] rounded-t-2xl">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-bold tracking-widest text-[#C5A059] uppercase">
              PG-007 · CALENDAR SCHEDULING SYSTEM
            </span>
          </div>
          <DialogTitle className="text-xl font-serif font-bold text-[#FFF4D4] tracking-tight">
            Schedule Client Meeting
          </DialogTitle>
          <p className="text-xs text-[#C6B697] mt-1">
            Choose whether to place a confirmed appointment or temporarily protect multiple proposed meeting dates.
          </p>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-2 mt-4 p-1 rounded-xl bg-[#020A17]/90 border border-[#3A2C18]">
            <button
              type="button"
              onClick={() => setModalMode("PROPOSED_HOLDS")}
              className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                modalMode === "PROPOSED_HOLDS"
                  ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shadow-md"
                  : "text-[#C6B697] hover:text-[#FFF4D4] hover:bg-[#102B4E]/40"
              }`}
            >
              <CalendarClock className="w-3.5 h-3.5" />
              <span>PROPOSED MEETING / HOLD DATES</span>
            </button>

            <button
              type="button"
              onClick={() => setModalMode("CONFIRMED_APPOINTMENT")}
              className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                modalMode === "CONFIRMED_APPOINTMENT"
                  ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shadow-md"
                  : "text-[#C6B697] hover:text-[#FFF4D4] hover:bg-[#102B4E]/40"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>CONFIRMED APPOINTMENT</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Mode Explanation Banner */}
          {modalMode === "PROPOSED_HOLDS" ? (
            <div className="p-3 rounded-xl bg-[#081B33]/80 border border-[#C5A059]/40 flex items-start gap-3 text-xs text-[#D8C7A5]">
              <div className="h-6 w-6 rounded-md bg-[#102B4E] border border-[#C5A059]/50 flex items-center justify-center text-[#FFE394] shrink-0 mt-0.5">
                <CalendarClock className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-0.5">
                <span className="font-semibold text-[#FFF4D4]">One Proposed Meeting · Multiple Candidate Slots</span>
                <p className="text-[11px] text-[#C6B697]">
                  All candidate dates will temporarily protect your calendar. When any date is confirmed later, all sibling holds will release automatically.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-700/50 flex items-start gap-3 text-xs text-emerald-200">
              <div className="h-6 w-6 rounded-md bg-emerald-900 border border-emerald-500/50 flex items-center justify-center text-emerald-300 shrink-0 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-0.5">
                <span className="font-semibold text-emerald-100">Confirmed Client Appointment</span>
                <p className="text-[11px] text-emerald-300/80">
                  Use this when the meeting time has already been finalized with the family and school district.
                </p>
              </div>
            </div>
          )}

          {/* SECTION 1: CLIENT & STUDENT CONNECTION */}
          <div className="space-y-3 p-4 rounded-xl border border-[#3A2C18] bg-[#020A17]/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#C5A059] tracking-wider uppercase">
                1. CLIENT / STUDENT CONNECTION
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSourceType("CLIENT")}
                  className={`text-[11px] px-2 py-0.5 rounded cursor-pointer ${
                    sourceType === "CLIENT" ? "bg-[#102B4E] text-[#FFF4D4] font-semibold" : "text-[#A69371]"
                  }`}
                >
                  Active Client
                </button>
                <button
                  type="button"
                  onClick={() => setSourceType("LEAD")}
                  className={`text-[11px] px-2 py-0.5 rounded cursor-pointer ${
                    sourceType === "LEAD" ? "bg-[#102B4E] text-[#FFF4D4] font-semibold" : "text-[#A69371]"
                  }`}
                >
                  Lead / Prospect
                </button>
              </div>
            </div>

            {sourceType === "CLIENT" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Family / Parent Selector */}
                <div>
                  <Label className="text-xs text-[#C6B697]">Family / Parent Contact</Label>
                  <Select value={selectedParentContactId} onValueChange={handleParentSelect}>
                    <SelectTrigger className="mt-1 bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] text-xs h-9">
                      <SelectValue placeholder="Select Parent / Family..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] max-h-56">
                      {parentsList.map((p: any) => (
                        <SelectItem key={p.id} value={String(p.id)} className="text-xs focus:bg-[#102B4E]">
                          {p.firstName} {p.lastName} {p.company ? `(${p.company})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Student Selector */}
                <div>
                  <Label className="text-xs text-[#C6B697]">
                    Student <span className="text-rose-400">*</span>
                  </Label>
                  <Select value={selectedStudentId} onValueChange={handleStudentSelect}>
                    <SelectTrigger className="mt-1 bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] text-xs h-9">
                      <SelectValue placeholder="Select Student..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] max-h-56">
                      {filteredStudents.map((s: any) => (
                        <SelectItem key={s.id} value={String(s.id)} className="text-xs focus:bg-[#102B4E]">
                          {s.firstName} {s.lastName} {s.grade ? `· Grade ${s.grade}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div>
                <Label className="text-xs text-[#C6B697]">Lead / Prospect</Label>
                <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
                  <SelectTrigger className="mt-1 bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] text-xs h-9">
                    <SelectValue placeholder="Select Intake Lead / Prospect..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] max-h-56">
                    {((leadsData as any[]) || []).map((l: any) => (
                      <SelectItem key={l.id} value={String(l.id)} className="text-xs focus:bg-[#102B4E]">
                        {l.studentName || l.contactName} ({l.parentName || "Parent"}) — {l.status || "Lead"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* SECTION 2: MEETING TYPE & TEAM ASSIGNMENT */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-[#C6B697]">Meeting Type</Label>
              <Select value={meetingType} onValueChange={setMeetingType}>
                <SelectTrigger className="mt-1 bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] text-xs h-9">
                  <SelectValue placeholder="Select meeting type..." />
                </SelectTrigger>
                <SelectContent className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] max-h-56">
                  {COMMON_MEETING_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="text-xs focus:bg-[#102B4E]">
                      {t}
                    </SelectItem>
                  ))}
                  <SelectItem value="Other" className="text-xs focus:bg-[#102B4E]">
                    Other / Custom Type...
                  </SelectItem>
                </SelectContent>
              </Select>
              {meetingType === "Other" && (
                <Input
                  type="text"
                  placeholder="Enter meeting type..."
                  value={customMeetingType}
                  onChange={(e) => setCustomMeetingType(e.target.value)}
                  className="mt-1.5 bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] text-xs h-8"
                />
              )}
            </div>

            <div>
              <Label className="text-xs text-[#C6B697]">Assigned Waypoint Team Member</Label>
              <Select value={assignedAdvocateName} onValueChange={setAssignedAdvocateName}>
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

          {/* SECTION 3: PROPOSED MEETING GOVERNANCE (Only in Proposed Mode) */}
          {modalMode === "PROPOSED_HOLDS" && (
            <div className="p-4 rounded-xl border border-[#3A2C18] bg-[#020A17]/60 space-y-4">
              <span className="text-xs font-mono font-bold text-[#C5A059] tracking-wider uppercase">
                2. PROPOSED MEETING WORKFLOW GOVERNANCE
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Who are we waiting on? */}
                <div>
                  <Label className="text-xs text-[#C6B697]">Who are we waiting on?</Label>
                  <Select value={waitingOn} onValueChange={(v: any) => setWaitingOn(v)}>
                    <SelectTrigger className="mt-1 bg-[#05142B] border-[#3A2C18] text-[#FFE394] text-xs h-9 font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4]">
                      <SelectItem value="School" className="text-xs focus:bg-[#102B4E]">School District</SelectItem>
                      <SelectItem value="Parent / Client" className="text-xs focus:bg-[#102B4E]">Parent / Client</SelectItem>
                      <SelectItem value="Waypoint" className="text-xs focus:bg-[#102B4E]">Waypoint Staff</SelectItem>
                      <SelectItem value="Multiple Parties" className="text-xs focus:bg-[#102B4E]">Multiple Parties</SelectItem>
                      <SelectItem value="Other" className="text-xs focus:bg-[#102B4E]">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {waitingOn === "Other" && (
                    <Input
                      type="text"
                      placeholder="Explain who we are waiting on..."
                      value={waitingOnOtherExplanation}
                      onChange={(e) => setWaitingOnOtherExplanation(e.target.value)}
                      className="mt-1.5 bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] text-xs h-8"
                    />
                  )}
                </div>

                {/* Follow Up By Date */}
                <div>
                  <Label className="text-xs text-[#C6B697]">Follow Up By Date</Label>
                  <Input
                    type="date"
                    value={followUpBy}
                    onChange={(e) => setFollowUpBy(e.target.value)}
                    className="mt-1 bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] text-xs h-9"
                  />
                  <span className="text-[10px] text-[#A69371] mt-0.5 block">
                    Surfaces in Holds Needing Attention work queue if not finalized by this date.
                  </span>
                </div>
              </div>

              {/* How will the final date be determined? */}
              <div>
                <Label className="text-xs text-[#C6B697]">Final Date Determination Process</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1.5">
                  <div
                    onClick={() => setFinalDateProcess("WAYPOINT_CONFIRMS")}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                      finalDateProcess === "WAYPOINT_CONFIRMS"
                        ? "bg-[#102B4E] border-[#C5A059] text-[#FFF4D4]"
                        : "bg-[#05142B] border-[#3A2C18] text-[#C6B697] hover:border-[#C5A059]/40"
                    }`}
                  >
                    <div className="font-bold text-xs text-[#FFE394]">Waypoint Confirms</div>
                    <div className="text-[10px] text-[#A69371] mt-0.5">
                      Staff receives confirmation from school/parent and clicks Confirm This Date.
                    </div>
                  </div>

                  <div
                    onClick={() => setFinalDateProcess("PARENT_PREFERENCE_THEN_WAYPOINT")}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                      finalDateProcess === "PARENT_PREFERENCE_THEN_WAYPOINT"
                        ? "bg-[#102B4E] border-[#C5A059] text-[#FFF4D4]"
                        : "bg-[#05142B] border-[#3A2C18] text-[#C6B697] hover:border-[#C5A059]/40"
                    }`}
                  >
                    <div className="font-bold text-xs text-[#FFE394]">Parent Selects Preference</div>
                    <div className="text-[10px] text-[#A69371] mt-0.5">
                      Parent marks "Works For Me" in portal; hold stays protected until Waypoint confirms.
                    </div>
                  </div>

                  <div
                    onClick={() => setFinalDateProcess("PARENT_CAN_CONFIRM")}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                      finalDateProcess === "PARENT_CAN_CONFIRM"
                        ? "bg-[#102B4E] border-[#C5A059] text-[#FFF4D4]"
                        : "bg-[#05142B] border-[#3A2C18] text-[#C6B697] hover:border-[#C5A059]/40"
                    }`}
                  >
                    <div className="font-bold text-xs text-[#FFE394]">Parent Can Confirm</div>
                    <div className="text-[10px] text-[#A69371] mt-0.5">
                      Parent is authorized to lock the final slot directly from the Parent Portal.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: CANDIDATE DATES / TIME SLOTS */}
          {modalMode === "PROPOSED_HOLDS" ? (
            <div className="space-y-3 p-4 rounded-xl border border-[#3A2C18] bg-[#020A17]/60">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-[#C5A059] tracking-wider uppercase">
                    3. CANDIDATE TIME SLOTS ({candidateSlots.length} HELD)
                  </span>
                  <p className="text-[11px] text-[#A69371]">
                    Add every date offered by the school or parent. All slots remain linked to this Proposed Meeting.
                  </p>
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddCandidateSlot}
                  className="h-8 px-3 rounded-lg bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs hover:brightness-110 cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ADD POSSIBLE DATE</span>
                </Button>
              </div>

              {/* Slot list */}
              <div className="space-y-2.5 pt-1">
                {candidateSlots.map((slot, idx) => (
                  <div
                    key={slot.id}
                    className="p-3 rounded-lg border border-[#3A2C18] bg-[#05142B] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-6 w-6 rounded bg-[#102B4E] border border-[#3A2C18] text-[#FFE394] font-mono text-xs font-bold flex items-center justify-center shrink-0">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span className="text-xs font-mono text-[#C6B697] uppercase font-semibold">
                        POSSIBLE DATE {idx + 1}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
                      {/* Date */}
                      <div>
                        <Input
                          type="date"
                          value={slot.date}
                          onChange={(e) => handleUpdateSlot(slot.id, "date", e.target.value)}
                          className="bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] text-xs h-8"
                        />
                      </div>

                      {/* Time */}
                      <div>
                        <Input
                          type="time"
                          value={slot.startTime}
                          onChange={(e) => handleUpdateSlot(slot.id, "startTime", e.target.value)}
                          className="bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] text-xs h-8"
                        />
                      </div>

                      {/* Duration */}
                      <div>
                        <Select
                          value={String(slot.durationMinutes)}
                          onValueChange={(v) => handleUpdateSlot(slot.id, "durationMinutes", Number(v))}
                        >
                          <SelectTrigger className="bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] text-xs h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4]">
                            <SelectItem value="30" className="text-xs">30 mins</SelectItem>
                            <SelectItem value="45" className="text-xs">45 mins</SelectItem>
                            <SelectItem value="60" className="text-xs">60 mins (1 hr)</SelectItem>
                            <SelectItem value="90" className="text-xs">90 mins (1.5 hrs)</SelectItem>
                            <SelectItem value="120" className="text-xs">120 mins (2 hrs)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {candidateSlots.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCandidateSlot(slot.id)}
                        className="h-8 w-8 rounded text-[#A69371] hover:text-rose-400 hover:bg-rose-950/40 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Confirmed Appointment Single Date/Time */
            <div className="space-y-3 p-4 rounded-xl border border-[#3A2C18] bg-[#020A17]/60">
              <span className="text-xs font-mono font-bold text-[#C5A059] tracking-wider uppercase">
                3. APPOINTMENT DATE & TIME
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-[#C6B697]">Date</Label>
                  <Input
                    type="date"
                    value={confirmedDate}
                    onChange={(e) => setConfirmedDate(e.target.value)}
                    className="mt-1 bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] text-xs h-9"
                  />
                </div>

                <div>
                  <Label className="text-xs text-[#C6B697]">Start Time</Label>
                  <Input
                    type="time"
                    value={confirmedStartTime}
                    onChange={(e) => setConfirmedStartTime(e.target.value)}
                    className="mt-1 bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] text-xs h-9"
                  />
                </div>

                <div>
                  <Label className="text-xs text-[#C6B697]">Expected Duration</Label>
                  <Select
                    value={String(confirmedDuration)}
                    onValueChange={(v) => setConfirmedDuration(Number(v))}
                  >
                    <SelectTrigger className="mt-1 bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4]">
                      <SelectItem value="30" className="text-xs">30 mins</SelectItem>
                      <SelectItem value="45" className="text-xs">45 mins</SelectItem>
                      <SelectItem value="60" className="text-xs">60 mins (1 hr)</SelectItem>
                      <SelectItem value="90" className="text-xs">90 mins (1.5 hrs)</SelectItem>
                      <SelectItem value="120" className="text-xs">120 mins (2 hrs)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* PROGRESSIVE DISCLOSURE: MORE DETAILS */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowMoreDetails(!showMoreDetails)}
              className="text-xs text-[#C5A059] hover:text-[#FFE394] font-medium flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>{showMoreDetails ? "Hide Additional Details" : "+ More Details (School, Video Link, Notes)"}</span>
              {showMoreDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showMoreDetails && (
              <div className="mt-3 p-4 rounded-xl border border-[#3A2C18] bg-[#020A17]/60 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-[#C6B697]">School / District</Label>
                    <Input
                      type="text"
                      placeholder="e.g. Fulton County Schools"
                      value={schoolDistrict}
                      onChange={(e) => setSchoolDistrict(e.target.value)}
                      className="mt-1 bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] text-xs h-9"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-[#C6B697]">Virtual Meeting Link</Label>
                    <Input
                      type="text"
                      placeholder="Google Meet, Zoom, or Teams link"
                      value={virtualMeetingLink}
                      onChange={(e) => setVirtualMeetingLink(e.target.value)}
                      className="mt-1 bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] text-xs h-9"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-[#C6B697]">Physical Location / Room (Optional)</Label>
                  <Input
                    type="text"
                    placeholder="e.g. Riverwood High School, Conference Room B"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="mt-1 bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] text-xs h-9"
                  />
                </div>

                <div>
                  <Label className="text-xs text-[#C6B697]">Client Notes (Visible in Portal)</Label>
                  <Textarea
                    placeholder="Preparation notes or documents to bring..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-1 bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] text-xs h-18 resize-none"
                  />
                </div>

                <div>
                  <Label className="text-xs text-[#C6B697]">Internal Staff Notes</Label>
                  <Textarea
                    placeholder="Private advocate strategy or coordinator notes..."
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    className="mt-1 bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] text-xs h-16 resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <DialogFooter className="pt-4 border-t border-[#3A2C18]/80 flex items-center justify-between sm:justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-[#3A2C18] bg-[#020A17] text-[#C6B697] hover:bg-[#07162B] hover:text-[#FFF4D4] text-xs h-9 cursor-pointer"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={createProposedMeetingMutation.isPending || createAppointmentMutation.isPending}
              className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-9 px-5 shadow-lg hover:brightness-110 cursor-pointer"
            >
              {modalMode === "PROPOSED_HOLDS" ? (
                createProposedMeetingMutation.isPending ? "Holding Dates..." : `Hold ${candidateSlots.length} Candidate ${candidateSlots.length === 1 ? "Date" : "Dates"}`
              ) : (
                createAppointmentMutation.isPending ? "Confirming..." : "Confirm Appointment"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
