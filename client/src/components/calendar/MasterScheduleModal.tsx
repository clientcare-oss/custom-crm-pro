import React, { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  X,
  User,
  Users,
  ShieldAlert,
  CheckCircle2,
  CalendarClock,
  Sparkles,
  Plane,
  Coffee,
  Briefcase,
  AlertOctagon,
  BookOpen,
  FileText,
  PhoneCall,
  Ban,
  Check,
  Building,
  Info,
  ChevronRight,
} from "lucide-react";
import {
  ScheduleMode,
  MeetingTypeOption,
  IEP_MEETINGS,
  SECTION_504_MEETINGS,
  OTHER_SCHOOL_MEETINGS,
  CLIENT_SESSION_OPTIONS,
  STANDARD_IEP_BLUEPRINT_MILESTONES,
  INTERNAL_EVENT_OPTIONS,
  BLOCK_REASONS,
  getMeetingOptionByName,
} from "./scheduleDispatchRegistry";

export type ScheduleActionType =
  | "MEETINGS"
  | "CLIENT_SESSIONS"
  | "HOLDS"
  | "BLOCKS"
  | "INTERNAL"
  | "BLUEPRINT"
  // Backward compatibility:
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
  initialTime?: string;
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

  // Map initial / default action to one of the 6 primary modes
  const resolveInitialMode = (action?: ScheduleActionType): ScheduleMode => {
    if (!action) return "MEETINGS";
    if (action === "CONFIRMED_APPOINTMENT") return "MEETINGS";
    if (action === "PROPOSED_HOLDS") return "HOLDS";
    if (action === "BLOCK_TIME" || action === "OFFICE_CLOSURE") return "BLOCKS";
    if (action === "INTERNAL_EVENT") return "INTERNAL";
    if (
      action === "MEETINGS" ||
      action === "CLIENT_SESSIONS" ||
      action === "HOLDS" ||
      action === "BLOCKS" ||
      action === "INTERNAL" ||
      action === "BLUEPRINT"
    ) {
      return action;
    }
    return "MEETINGS";
  };

  const [activeMode, setActiveMode] = useState<ScheduleMode>(() =>
    resolveInitialMode(defaultAction)
  );

  useEffect(() => {
    if (isOpen) {
      setActiveMode(resolveInitialMode(defaultAction));
    }
  }, [isOpen, defaultAction]);

  // Base Date string
  const baseDateStr = useMemo(() => {
    return initialDate
      ? new Date(initialDate).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);
  }, [initialDate]);

  // Load Contacts (Parents/Clients and Students)
  const { data: contactsData } = trpc.contacts.list.useQuery();
  const { data: leadsData } = trpc.leads.list.useQuery(undefined);

  const { parentsList, studentsList } = useMemo(() => {
    const contacts: any[] =
      (contactsData as any)?.contacts ||
      (Array.isArray(contactsData) ? contactsData : []);

    const isStudent = (c: any) => {
      if (!c) return false;
      const title = (c.jobTitle || "").toLowerCase().trim();
      if (title.includes("student")) return true;
      if (c.contactType === "student") return true;
      if (c.parentContactId != null && Number(c.parentContactId) > 0) return true;
      if (c.studentStatus || c.gradeLevel || c.schoolName || c.caseId) return true;
      if (c.planType && c.planType !== "") return true;
      return false;
    };

    const isParent = (c: any) => {
      if (!c) return false;
      const title = (c.jobTitle || "").toLowerCase().trim();
      if (title.includes("parent") || title.includes("client")) return true;
      if (c.contactType === "parent" || c.contactType === "client") return true;
      return !isStudent(c);
    };

    const rawStudents = contacts.filter(isStudent);
    const students = rawStudents.length > 0 ? rawStudents : contacts;

    const rawParents = contacts.filter(isParent);
    const parents = rawParents.length > 0 ? rawParents : contacts;

    return { parentsList: parents, studentsList: students };
  }, [contactsData]);

  // Notes Modal state (shared popover so form never scrolls)
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [activeNotesMode, setActiveNotesMode] = useState<"client" | "internal">("client");

  // ========================================================
  // MODE 1: SCHOOL MEETINGS STATE
  // ========================================================
  const [meetingType, setMeetingType] = useState<string>("Annual IEP Meeting");
  const [mParentId, setMParentId] = useState<string>("");
  const [mStudentId, setMStudentId] = useState<string>("");
  const [mAdvocate, setMAdvocate] = useState<string>("Byron Honea");
  const [mDate, setMDate] = useState<string>(baseDateStr);
  const [mStartTime, setMStartTime] = useState<string>(initialTime);
  const [mDuration, setMDuration] = useState<number>(60);
  const [mNotes, setMNotes] = useState<string>("");
  const [mInternalNotes, setMInternalNotes] = useState<string>("");

  // Sync duration when school meeting type changes
  const handleSelectMeetingType = (option: MeetingTypeOption) => {
    setMeetingType(option.name);
    setMDuration(option.defaultDurationMinutes);
  };

  // Filter students by parent
  const mFilteredStudents = useMemo(() => {
    if (!mParentId) return studentsList;
    const pid = Number(mParentId);
    const matching = studentsList.filter(
      (s: any) => Number(s.parentContactId) === pid || Number(s.parentId) === pid
    );
    return matching.length > 0 ? matching : studentsList;
  }, [studentsList, mParentId]);

  // ========================================================
  // MODE 2: CLIENT SESSIONS STATE
  // ========================================================
  const [clientSessionType, setClientSessionType] = useState<string>("Discovery Call");
  const [csParentId, setCsParentId] = useState<string>("");
  const [csStudentId, setCsStudentId] = useState<string>("");
  const [csAdvocate, setCsAdvocate] = useState<string>("Byron Honea");
  const [csDate, setCsDate] = useState<string>(baseDateStr);
  const [csStartTime, setCsStartTime] = useState<string>(initialTime);
  const [csDuration, setCsDuration] = useState<number>(30);
  const [csNotes, setCsNotes] = useState<string>("");

  const csFilteredStudents = useMemo(() => {
    if (!csParentId) return studentsList;
    const pid = Number(csParentId);
    const matching = studentsList.filter(
      (s: any) => Number(s.parentContactId) === pid || Number(s.parentId) === pid
    );
    return matching.length > 0 ? matching : studentsList;
  }, [studentsList, csParentId]);

  // ========================================================
  // MODE 3: TENTATIVE HOLDS STATE
  // ========================================================
  const [hParentId, setHParentId] = useState<string>("");
  const [hStudentId, setHStudentId] = useState<string>("");
  const [hMeetingType, setHMeetingType] = useState<string>("Annual IEP Meeting");
  const [hAdvocate, setHAdvocate] = useState<string>("Byron Honea");
  const [hWaitingOn, setHWaitingOn] = useState<"Parent / Client" | "School" | "Waypoint" | "Multiple Parties" | "Other">("School");
  const [hFollowUpBy, setHFollowUpBy] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [hCandidateSlots, setHCandidateSlots] = useState<
    Array<{ id: string; date: string; startTime: string; durationMinutes: number }>
  >([
    { id: "opt-1", date: baseDateStr, startTime: "10:00", durationMinutes: 60 },
    {
      id: "opt-2",
      date: (() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().slice(0, 10);
      })(),
      startTime: "13:00",
      durationMinutes: 60,
    },
    {
      id: "opt-3",
      date: (() => {
        const d = new Date();
        d.setDate(d.getDate() + 2);
        return d.toISOString().slice(0, 10);
      })(),
      startTime: "09:30",
      durationMinutes: 60,
    },
  ]);
  const [hNotes, setHNotes] = useState<string>("");

  const hFilteredStudents = useMemo(() => {
    if (!hParentId) return studentsList;
    const pid = Number(hParentId);
    const matching = studentsList.filter(
      (s: any) => Number(s.parentContactId) === pid || Number(s.parentId) === pid
    );
    return matching.length > 0 ? matching : studentsList;
  }, [studentsList, hParentId]);

  const addHoldOption = () => {
    if (hCandidateSlots.length >= 5) {
      toast.info("Maximum 5 candidate hold options per hold group.");
      return;
    }
    const last = hCandidateSlots[hCandidateSlots.length - 1];
    const nextDate = new Date(last?.date || baseDateStr);
    nextDate.setDate(nextDate.getDate() + 1);
    setHCandidateSlots((prev) => [
      ...prev,
      {
        id: `opt-${Date.now()}`,
        date: nextDate.toISOString().slice(0, 10),
        startTime: last?.startTime || "10:00",
        durationMinutes: last?.durationMinutes || 60,
      },
    ]);
  };

  const removeHoldOption = (id: string) => {
    if (hCandidateSlots.length <= 1) {
      toast.warning("Hold group must contain at least 1 candidate option.");
      return;
    }
    setHCandidateSlots((prev) => prev.filter((s) => s.id !== id));
  };

  // ========================================================
  // MODE 4: BLOCKS STATE
  // ========================================================
  const [blockCategory, setBlockCategory] = useState<
    "OFFICE_CLOSED" | "PERSONAL_BLACKOUT" | "AVAILABILITY_BLOCK" | "RECURRING_BLOCK"
  >("OFFICE_CLOSED");
  const [bSubReason, setBSubReason] = useState<string>("Holiday");
  const [bTitle, setBTitle] = useState<string>("Office Closed — Holiday");
  const [bStaff, setBStaff] = useState<string>("Byron Honea");
  const [bAllStaff, setBAllStaff] = useState<boolean>(true);
  const [bStartDate, setBStartDate] = useState<string>(baseDateStr);
  const [bEndDate, setBEndDate] = useState<string>(baseDateStr);
  const [bIsAllDay, setBIsAllDay] = useState<boolean>(true);
  const [bStartTime, setBStartTime] = useState<string>("09:00");
  const [bEndTime, setBEndTime] = useState<string>("17:00");
  const [bEnforcement, setBEnforcement] = useState<"HARD_BLOCK" | "SOFT_BLOCK" | "INFORMATIONAL">("HARD_BLOCK");
  const [bRecurrence, setBRecurrence] = useState<string>("Every Monday");
  const [bNotes, setBNotes] = useState<string>("");

  // ========================================================
  // MODE 5: INTERNAL EVENTS STATE
  // ========================================================
  const [ieType, setIeType] = useState<string>("Team Meeting");
  const [ieTitle, setIeTitle] = useState<string>("Weekly Advocacy Sync");
  const [ieAllStaff, setIeAllStaff] = useState<boolean>(true);
  const [ieSelectedStaff, setIeSelectedStaff] = useState<string>("Byron Honea");
  const [ieDate, setIeDate] = useState<string>(baseDateStr);
  const [ieStartTime, setIeStartTime] = useState<string>(initialTime);
  const [ieDuration, setIeDuration] = useState<number>(60);
  const [ieBlocksClientScheduling, setIeBlocksClientScheduling] = useState<boolean>(true);
  const [ieRecurrence, setIeRecurrence] = useState<string>("NONE");
  const [ieLocation, setIeLocation] = useState<string>("");
  const [ieNotes, setIeNotes] = useState<string>("");

  // ========================================================
  // MODE 6: BLUEPRINT STATE
  // ========================================================
  const [bpType, setBpType] = useState<string>("Annual IEP Blueprint");
  const [bpParentId, setBpParentId] = useState<string>("");
  const [bpStudentId, setBpStudentId] = useState<string>("");
  const [bpAdvocate, setBpAdvocate] = useState<string>("Byron Honea");
  const [bpMeetingDate, setBpMeetingDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14); // 2 weeks ahead default
    return d.toISOString().slice(0, 10);
  });
  const [bpStartTime, setBpStartTime] = useState<string>("12:30");
  const [bpMilestones, setBpMilestones] = useState(
    STANDARD_IEP_BLUEPRINT_MILESTONES.map((m) => ({ ...m, checked: m.defaultChecked }))
  );

  const bpFilteredStudents = useMemo(() => {
    if (!bpParentId) return studentsList;
    const pid = Number(bpParentId);
    const matching = studentsList.filter(
      (s: any) => Number(s.parentContactId) === pid || Number(s.parentId) === pid
    );
    return matching.length > 0 ? matching : studentsList;
  }, [studentsList, bpParentId]);

  // Calculate dynamic date for milestone offsets
  const getMilestoneCalculatedDate = (offset: number) => {
    const d = new Date(`${bpMeetingDate}T00:00:00`);
    d.setDate(d.getDate() + offset);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const toggleMilestone = (index: number) => {
    setBpMilestones((prev) =>
      prev.map((item, i) => (i === index ? { ...item, checked: !item.checked } : item))
    );
  };

  // ========================================================
  // MUTATIONS
  // ========================================================
  const createAppointmentMutation = trpc.appointments.create.useMutation({
    onSuccess: () => {
      utils.appointments.invalidate();
      utils.proposedMeetings.invalidate();
      onSuccess();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const createProposedMeetingMutation = trpc.proposedMeetings.create.useMutation({
    onSuccess: () => {
      toast.success("Hold group placed! Candidate dates held on calendar.");
      utils.proposedMeetings.invalidate();
      utils.appointments.invalidate();
      onSuccess();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const createOperationalBlockMutation = trpc.operationalBlocks.create.useMutation({
    onSuccess: () => {
      utils.operationalBlocks.list.invalidate();
      utils.appointments.invalidate();
      onSuccess();
      onClose();
      toast.success("Calendar block created successfully!");
    },
    onError: (err) => toast.error("Failed to save block: " + err.message),
  });

  // ========================================================
  // SUBMIT HANDLERS
  // ========================================================

  // Mode 1: Submit School Meeting
  const handleScheduleSchoolMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mStudentId) {
      toast.error("Please select a student for this school meeting.");
      return;
    }
    const student = studentsList.find((s: any) => String(s.id) === mStudentId);
    const parent = parentsList.find((p: any) => String(p.id) === mParentId);
    const studentName = student
      ? `${student.firstName} ${student.lastName}`.trim()
      : "Student";
    const parentName = parent
      ? `${parent.firstName} ${parent.lastName}`.trim()
      : undefined;

    const start = new Date(`${mDate}T${mStartTime}:00`);
    const end = new Date(start.getTime() + mDuration * 60000);

    createAppointmentMutation.mutate(
      {
        clientId: student?.id || 0,
        title: `${studentName} — ${meetingType}`,
        description: mNotes || undefined,
        startTime: start,
        endTime: end,
        meetingType,
        parentName,
        parentPhone: parent?.phone || undefined,
        studentName,
        clientTimeZone: student?.timezone || "America/New_York",
        assignedAdvocateName: mAdvocate,
      },
      {
        onSuccess: () => toast.success(`${meetingType} scheduled successfully!`),
      }
    );
  };

  // Mode 2: Submit Client Session
  const handleScheduleClientSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!csParentId && !csStudentId) {
      toast.error("Please select a client or student for this session.");
      return;
    }
    const student = studentsList.find((s: any) => String(s.id) === csStudentId);
    const parent = parentsList.find((p: any) => String(p.id) === csParentId);
    const studentName = student
      ? `${student.firstName} ${student.lastName}`.trim()
      : parent
      ? `${parent.firstName} ${parent.lastName}'s Student`
      : "Client";
    const parentName = parent
      ? `${parent.firstName} ${parent.lastName}`.trim()
      : undefined;

    const start = new Date(`${csDate}T${csStartTime}:00`);
    const end = new Date(start.getTime() + csDuration * 60000);

    createAppointmentMutation.mutate(
      {
        clientId: student?.id || parent?.id || 0,
        title: `${parentName || studentName} — ${clientSessionType}`,
        description: csNotes || undefined,
        startTime: start,
        endTime: end,
        meetingType: clientSessionType,
        parentName,
        parentPhone: parent?.phone || undefined,
        studentName,
        clientTimeZone: student?.timezone || "America/New_York",
        assignedAdvocateName: csAdvocate,
      },
      {
        onSuccess: () =>
          toast.success(`${clientSessionType} session scheduled!`),
      }
    );
  };

  // Mode 3: Submit Tentative Holds
  const handlePlaceHolds = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hStudentId) {
      toast.error("Please select a student for this hold group.");
      return;
    }
    const student = studentsList.find((s: any) => String(s.id) === hStudentId);
    const parent = parentsList.find((p: any) => String(p.id) === hParentId);
    const studentName = student
      ? `${student.firstName} ${student.lastName}`.trim()
      : "Student";
    const parentName = parent
      ? `${parent.firstName} ${parent.lastName}`.trim()
      : "";

    const formattedSlots = hCandidateSlots.map((s, idx) => {
      const start = new Date(`${s.date}T${s.startTime}:00`);
      const end = new Date(start.getTime() + s.durationMinutes * 60000);
      return {
        startTime: start,
        endTime: end,
        durationMinutes: s.durationMinutes,
        notes: `Option ${idx + 1}`,
      };
    });

    createProposedMeetingMutation.mutate({
      clientId: student?.id,
      parentContactId: parent?.id ? Number(parent.id) : undefined,
      studentName,
      parentName: parentName || undefined,
      parentEmail: parent?.email || undefined,
      parentPhone: parent?.phone || undefined,
      meetingType: hMeetingType,
      assignedAdvocateName: hAdvocate,
      waitingOn: hWaitingOn,
      finalDateProcess: "WAYPOINT_CONFIRMS",
      followUpBy: hFollowUpBy || undefined,
      candidateSlots: formattedSlots,
      notes: hNotes || undefined,
    });
  };

  // Mode 4: Submit Blocks
  const handleBlockTimeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isClosure = blockCategory === "OFFICE_CLOSED";
    const start = bIsAllDay
      ? new Date(`${bStartDate}T00:00:00`)
      : new Date(`${bStartDate}T${bStartTime}:00`);
    const end = bIsAllDay
      ? new Date(`${bEndDate || bStartDate}T23:59:59`)
      : new Date(`${bEndDate || bStartDate}T${bEndTime}:00`);

    const staffLabel = isClosure || bAllStaff ? "Entire Company" : bStaff;

    createOperationalBlockMutation.mutate({
      title: bTitle || `${bSubReason} — ${staffLabel}`,
      blockType: bSubReason,
      categoryFamily: isClosure ? "OPERATIONAL_BLOCK" : "OPERATIONAL_BLOCK",
      schedulingEffect: bEnforcement,
      scope: isClosure || bAllStaff ? "ENTIRE_COMPANY" : "ONE_EMPLOYEE",
      targetStaffNames: staffLabel,
      startTime: start,
      endTime: end,
      isAllDay: bIsAllDay,
      allDayDate: bStartDate,
      allDayEndDate: bEndDate || bStartDate,
      recurrenceRule: blockCategory === "RECURRING_BLOCK" ? "WEEKLY" : "NONE",
      reason: bNotes || undefined,
    });
  };

  // Mode 5: Submit Internal Event
  const handleInternalEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const start = new Date(`${ieDate}T${ieStartTime}:00`);
    const end = new Date(start.getTime() + ieDuration * 60000);
    const staffLabel = ieAllStaff ? "Entire Company" : ieSelectedStaff;

    createOperationalBlockMutation.mutate({
      title: ieTitle || ieType,
      blockType: ieType,
      categoryFamily: "INFORMATIONAL_EVENT",
      schedulingEffect: ieBlocksClientScheduling ? "HARD_BLOCK" : "SOFT_BLOCK",
      scope: ieAllStaff ? "ENTIRE_COMPANY" : "SELECTED_EMPLOYEES",
      targetStaffNames: staffLabel,
      startTime: start,
      endTime: end,
      isAllDay: false,
      location: ieLocation || undefined,
      notes: ieNotes || undefined,
      recurrenceRule:
        ieRecurrence !== "NONE"
          ? (ieRecurrence as "WEEKLY" | "DAILY" | "MONTHLY")
          : undefined,
    });
  };

  // Mode 6: Submit Blueprint
  const handleBlueprintSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bpStudentId) {
      toast.error("Please select a student for this advocacy blueprint.");
      return;
    }
    const student = studentsList.find((s: any) => String(s.id) === bpStudentId);
    const parent = parentsList.find((p: any) => String(p.id) === bpParentId);
    const studentName = student
      ? `${student.firstName} ${student.lastName}`.trim()
      : "Student";
    const parentName = parent
      ? `${parent.firstName} ${parent.lastName}`.trim()
      : undefined;

    const start = new Date(`${bpMeetingDate}T${bpStartTime}:00`);
    const end = new Date(start.getTime() + 90 * 60000);

    const activeMilestonesList = bpMilestones
      .filter((m) => m.checked)
      .map((m) => `• [${m.label} (${getMilestoneCalculatedDate(m.dayOffset)})] ${m.title}: ${m.description}`)
      .join("\n");

    const fullDescription = `BLUEPRINT TIMELINE:\n${activeMilestonesList}\n\nGenerated automatically via Waypoint Schedule Dispatch.`;

    createAppointmentMutation.mutate(
      {
        clientId: student?.id || 0,
        title: `${studentName} — ${bpType} (Day 0)`,
        description: fullDescription,
        startTime: start,
        endTime: end,
        meetingType: bpType,
        parentName,
        parentPhone: parent?.phone || undefined,
        studentName,
        clientTimeZone: student?.timezone || "America/New_York",
        assignedAdvocateName: bpAdvocate,
      },
      {
        onSuccess: () =>
          toast.success(
            `Blueprint created! Primary meeting scheduled with ${
              bpMilestones.filter((m) => m.checked).length
            } connected timeline milestones.`
          ),
      }
    );
  };

  // Resolve Contextual Info for Right Parchment Panel
  const activeContextualData = useMemo(() => {
    if (activeMode === "MEETINGS") {
      const opt = getMeetingOptionByName(meetingType);
      return {
        badgeHeader: "Meeting Details",
        title: opt?.name || meetingType,
        description:
          opt?.description ||
          "School-facing meeting attended by Waypoint to represent student rights.",
        typicalDuration: opt?.typicalDuration || "60–120 minutes",
        waypointRole:
          opt?.waypointRole ||
          "Advocate attends virtually, provides real-time strategy support, helps ensure parent concerns are addressed, and tracks decisions.",
        checklist: opt?.checklist || [
          "Request draft IEP (3 days prior)",
          "Review evaluations and data",
          "Prepare parent concerns",
          "Build meeting targets",
          "Confirm recording permission",
        ],
      };
    }

    if (activeMode === "CLIENT_SESSIONS") {
      const opt = CLIENT_SESSION_OPTIONS.find((c) => c.name === clientSessionType);
      return {
        badgeHeader: "Session Details",
        title: opt?.name || clientSessionType,
        description:
          opt?.description ||
          "Direct consultation, debriefing, or strategy alignment session with family.",
        typicalDuration: opt?.typicalDuration || "30–60 minutes",
        waypointRole:
          opt?.waypointRole ||
          "Advocate advises parents, analyzes educational records, and formulates advocacy goals.",
        checklist: opt?.checklist || [
          "Review intake questionnaire answers",
          "Assemble relevant case documents",
          "Prepare meeting strategy talking points",
          "Send video conference link to parents",
        ],
      };
    }

    if (activeMode === "HOLDS") {
      return {
        badgeHeader: "Hold Group Protocol",
        title: "Tentative Multi-Slot Hold",
        description:
          "Holds candidate dates on advocate calendars while the school and family confirm.",
        typicalDuration: "60 minutes per candidate slot",
        waypointRole:
          "When any candidate time is confirmed, selecting it converts that hold to a confirmed appointment and automatically releases all sibling holds.",
        checklist: [
          "Propose 2–3 options to school and family",
          "Verify advocate is available for all slots",
          "Set follow-up reminder deadline",
          "Check calendar for tentative conflicts",
        ],
      };
    }

    if (activeMode === "BLOCKS") {
      return {
        badgeHeader: "Calendar Block Rules",
        title:
          blockCategory === "OFFICE_CLOSED"
            ? "Office Closure Block"
            : blockCategory === "PERSONAL_BLACKOUT"
            ? "Personal Staff Blackout"
            : blockCategory === "AVAILABILITY_BLOCK"
            ? "Operational Availability Protection"
            : "Recurring Time Protection",
        description:
          "Protects team time, handles holiday closures, and prevents client self-scheduling during unavailable windows.",
        typicalDuration: bIsAllDay ? "All-Day Block" : `${bStartTime} – ${bEndTime}`,
        waypointRole:
          bEnforcement === "HARD_BLOCK"
            ? "Hard Block: Strictly prevents client portal bookings and triggers conflict warnings on advocate schedules."
            : "Soft Block: Displays informational availability note while permitting priority scheduling overrides.",
        checklist: [
          "Check existing client appointments in window",
          "Verify team coverage if applicable",
          "Confirm calendar notification recipients",
        ],
      };
    }

    if (activeMode === "INTERNAL") {
      return {
        badgeHeader: "Internal Dispatch",
        title: ieType,
        description:
          "Team synchronization, clinical supervision, case conferencing, or staff development.",
        typicalDuration: `${ieDuration} minutes`,
        waypointRole:
          ieBlocksClientScheduling
            ? "Blocks Client Scheduling: Protects advocate time from external client bookings."
            : "Informational: Internal event visible on staff calendar without blocking scheduling.",
        checklist: [
          "Set meeting agenda items",
          "Assemble case files for review",
          "Confirm team participant availability",
        ],
      };
    }

    // BLUEPRINT
    return {
      badgeHeader: "Blueprint Timeline",
      title: bpType,
      description:
        "Master IEP Coach® connected work timeline around an advocacy milestone.",
      typicalDuration: "Multi-week advocacy sequence",
      waypointRole:
        "Waypoint systematically executes statutory deadlines (-7d records, -3d draft IEP, Day 0 meeting, +1d follow-up, +3d amended review).",
      checklist: [
        "Request draft IEP 3 days prior",
        "Perform -5d comprehensive strategy review",
        "Conduct -2d parent prep consultation",
        "Issue written follow-up within 24h post-meeting",
      ],
    };
  }, [
    activeMode,
    meetingType,
    clientSessionType,
    blockCategory,
    bIsAllDay,
    bStartTime,
    bEndTime,
    bEnforcement,
    ieType,
    ieDuration,
    ieBlocksClientScheduling,
    bpType,
  ]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[1260px] w-[95vw] h-[720px] max-h-[calc(100vh-32px)] bg-[#000820] border border-[#1E3050] text-[#FFF4D4] shadow-[0_25px_80px_rgba(0,0,0,0.95)] p-0 rounded-2xl flex flex-col overflow-hidden select-none">
        {/* ======================================================== */}
        {/* 1. TOP HEADER                                            */}
        {/* ======================================================== */}
        <div className="px-6 pt-4 pb-3 flex items-center justify-between border-b border-[#142640]/80 bg-[#000820] shrink-0">
          <div>
            <h1 className="font-serif text-[#FFF4D4] text-2xl font-normal tracking-wide flex items-center gap-2.5">
              <span>Schedule Dispatch</span>
            </h1>
            <p className="text-xs text-[#C6B697] mt-0.5 font-sans">
              What are you putting on the calendar?
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#020A17] border border-[#3A2C18] text-[#C6B697] hover:text-[#FFF4D4] hover:bg-[#07162B] flex items-center justify-center transition-colors shadow-sm"
            title="Close Dispatch"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ======================================================== */}
        {/* 2. MODE NAVIGATION (6 HORIZONTAL MODES)                   */}
        {/* ======================================================== */}
        <div className="px-6 py-2 bg-[#010D25] border-b border-[#142640]/80 shrink-0">
          <div className="grid grid-cols-6 gap-2">
            {/* Mode 1: MEETINGS */}
            <button
              type="button"
              onClick={() => setActiveMode("MEETINGS")}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-all ${
                activeMode === "MEETINGS"
                  ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] border-[#FFE394] font-bold shadow-[0_2px_12px_rgba(197,160,89,0.35)]"
                  : "bg-[#030E22] text-[#DFD0B5] border-[#182C48] hover:border-[#C5A059]/50 hover:bg-[#061836]"
              }`}
            >
              <CalendarIcon
                className={`w-4 h-4 shrink-0 ${
                  activeMode === "MEETINGS" ? "text-[#000820]" : "text-[#C5A059]"
                }`}
              />
              <div className="min-w-0">
                <div
                  className={`text-xs uppercase tracking-wider font-semibold truncate ${
                    activeMode === "MEETINGS" ? "text-[#000820]" : "text-[#FFF4D4]"
                  }`}
                >
                  MEETINGS
                </div>
                <div
                  className={`text-[10px] truncate ${
                    activeMode === "MEETINGS" ? "text-[#1A1408]" : "text-[#8E9EB8]"
                  }`}
                >
                  School Meetings
                </div>
              </div>
            </button>

            {/* Mode 2: CLIENT SESSIONS */}
            <button
              type="button"
              onClick={() => setActiveMode("CLIENT_SESSIONS")}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-all ${
                activeMode === "CLIENT_SESSIONS"
                  ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] border-[#FFE394] font-bold shadow-[0_2px_12px_rgba(197,160,89,0.35)]"
                  : "bg-[#030E22] text-[#DFD0B5] border-[#182C48] hover:border-[#C5A059]/50 hover:bg-[#061836]"
              }`}
            >
              <PhoneCall
                className={`w-4 h-4 shrink-0 ${
                  activeMode === "CLIENT_SESSIONS" ? "text-[#000820]" : "text-[#C5A059]"
                }`}
              />
              <div className="min-w-0">
                <div
                  className={`text-xs uppercase tracking-wider font-semibold truncate ${
                    activeMode === "CLIENT_SESSIONS"
                      ? "text-[#000820]"
                      : "text-[#FFF4D4]"
                  }`}
                >
                  CLIENT SESSIONS
                </div>
                <div
                  className={`text-[10px] truncate ${
                    activeMode === "CLIENT_SESSIONS"
                      ? "text-[#1A1408]"
                      : "text-[#8E9EB8]"
                  }`}
                >
                  With Families
                </div>
              </div>
            </button>

            {/* Mode 3: HOLDS */}
            <button
              type="button"
              onClick={() => setActiveMode("HOLDS")}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-all ${
                activeMode === "HOLDS"
                  ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] border-[#FFE394] font-bold shadow-[0_2px_12px_rgba(197,160,89,0.35)]"
                  : "bg-[#030E22] text-[#DFD0B5] border-[#182C48] hover:border-[#C5A059]/50 hover:bg-[#061836]"
              }`}
            >
              <Clock
                className={`w-4 h-4 shrink-0 ${
                  activeMode === "HOLDS" ? "text-[#000820]" : "text-[#C5A059]"
                }`}
              />
              <div className="min-w-0">
                <div
                  className={`text-xs uppercase tracking-wider font-semibold truncate ${
                    activeMode === "HOLDS" ? "text-[#000820]" : "text-[#FFF4D4]"
                  }`}
                >
                  HOLDS
                </div>
                <div
                  className={`text-[10px] truncate ${
                    activeMode === "HOLDS" ? "text-[#1A1408]" : "text-[#8E9EB8]"
                  }`}
                >
                  Tentative Times
                </div>
              </div>
            </button>

            {/* Mode 4: BLOCKS */}
            <button
              type="button"
              onClick={() => setActiveMode("BLOCKS")}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-all ${
                activeMode === "BLOCKS"
                  ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] border-[#FFE394] font-bold shadow-[0_2px_12px_rgba(197,160,89,0.35)]"
                  : "bg-[#030E22] text-[#DFD0B5] border-[#182C48] hover:border-[#C5A059]/50 hover:bg-[#061836]"
              }`}
            >
              <Ban
                className={`w-4 h-4 shrink-0 ${
                  activeMode === "BLOCKS" ? "text-[#000820]" : "text-[#C5A059]"
                }`}
              />
              <div className="min-w-0">
                <div
                  className={`text-xs uppercase tracking-wider font-semibold truncate ${
                    activeMode === "BLOCKS" ? "text-[#000820]" : "text-[#FFF4D4]"
                  }`}
                >
                  BLOCKS
                </div>
                <div
                  className={`text-[10px] truncate ${
                    activeMode === "BLOCKS" ? "text-[#1A1408]" : "text-[#8E9EB8]"
                  }`}
                >
                  Unavailable Time
                </div>
              </div>
            </button>

            {/* Mode 5: INTERNAL */}
            <button
              type="button"
              onClick={() => setActiveMode("INTERNAL")}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-all ${
                activeMode === "INTERNAL"
                  ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] border-[#FFE394] font-bold shadow-[0_2px_12px_rgba(197,160,89,0.35)]"
                  : "bg-[#030E22] text-[#DFD0B5] border-[#182C48] hover:border-[#C5A059]/50 hover:bg-[#061836]"
              }`}
            >
              <Users
                className={`w-4 h-4 shrink-0 ${
                  activeMode === "INTERNAL" ? "text-[#000820]" : "text-[#C5A059]"
                }`}
              />
              <div className="min-w-0">
                <div
                  className={`text-xs uppercase tracking-wider font-semibold truncate ${
                    activeMode === "INTERNAL" ? "text-[#000820]" : "text-[#FFF4D4]"
                  }`}
                >
                  INTERNAL
                </div>
                <div
                  className={`text-[10px] truncate ${
                    activeMode === "INTERNAL" ? "text-[#1A1408]" : "text-[#8E9EB8]"
                  }`}
                >
                  Team Events
                </div>
              </div>
            </button>

            {/* Mode 6: BLUEPRINT */}
            <button
              type="button"
              onClick={() => setActiveMode("BLUEPRINT")}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-all ${
                activeMode === "BLUEPRINT"
                  ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] border-[#FFE394] font-bold shadow-[0_2px_12px_rgba(197,160,89,0.35)]"
                  : "bg-[#030E22] text-[#DFD0B5] border-[#182C48] hover:border-[#C5A059]/50 hover:bg-[#061836]"
              }`}
            >
              <CalendarClock
                className={`w-4 h-4 shrink-0 ${
                  activeMode === "BLUEPRINT" ? "text-[#000820]" : "text-[#C5A059]"
                }`}
              />
              <div className="min-w-0">
                <div
                  className={`text-xs uppercase tracking-wider font-semibold truncate ${
                    activeMode === "BLUEPRINT" ? "text-[#000820]" : "text-[#FFF4D4]"
                  }`}
                >
                  BLUEPRINT
                </div>
                <div
                  className={`text-[10px] truncate ${
                    activeMode === "BLUEPRINT" ? "text-[#1A1408]" : "text-[#8E9EB8]"
                  }`}
                >
                  Auto-Schedule Tasks
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. MAIN WORKSPACE (LEFT WORK AREA + RIGHT PARCHMENT CARD) */}
        {/* ======================================================== */}
        <div className="flex-1 min-h-0 p-4 flex gap-4 overflow-hidden">
          {/* ── LEFT: DISPATCH WORK AREA ── */}
          <div className="flex-1 min-w-0 flex flex-col justify-between bg-[#020A1A] border border-[#142640] rounded-xl p-4 relative overflow-hidden">
            {/* ──────────────────────────────────────────────────────── */}
            {/* MODE 1: MEETINGS (SCHOOL MEETINGS)                      */}
            {/* ──────────────────────────────────────────────────────── */}
            {activeMode === "MEETINGS" && (
              <form
                onSubmit={handleScheduleSchoolMeeting}
                className="h-full flex flex-col justify-between"
              >
                {/* Header row */}
                <div className="flex items-center justify-between pb-2 border-b border-[#142640]/60 shrink-0">
                  <div>
                    <h2 className="text-lg font-serif text-[#FFF4D4]">
                      Schedule a School Meeting
                    </h2>
                    <p className="text-xs text-[#8E9EB8]">
                      School-facing meeting attended by Waypoint.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#081B36] border border-[#1D3E6B] text-[11px] text-[#8EB8EE]">
                    <Info className="w-3.5 h-3.5 text-[#8EB8EE]" />
                    <span>Select the type of school meeting to show the right options.</span>
                  </div>
                </div>

                {/* 3 Columns of School Meeting choices */}
                <div className="grid grid-cols-3 gap-3 my-2 shrink-0">
                  {/* Column 1: IEP Meetings */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#DFBE77] uppercase tracking-wider px-1">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>IEP Meetings</span>
                    </div>
                    <div className="space-y-1">
                      {IEP_MEETINGS.map((option) => {
                        const isSelected = meetingType === option.name;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => handleSelectMeetingType(option)}
                            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-left text-xs transition-all ${
                              isSelected
                                ? "bg-gradient-to-r from-[#C5A059]/20 via-[#DFBE77]/25 to-[#C5A059]/10 border-[#DFBE77] text-[#FFF4D4] font-medium shadow-[0_0_10px_rgba(223,190,119,0.2)]"
                                : "bg-[#051630]/60 border-[#152B4E] text-[#B8C8DF] hover:border-[#2A4C7E] hover:bg-[#081F42]"
                            }`}
                          >
                            <span
                              className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? "border-[#DFBE77] bg-[#DFBE77]"
                                  : "border-[#3A5070] bg-[#020A17]"
                              }`}
                            >
                              {isSelected && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#000820]" />
                              )}
                            </span>
                            <span className="truncate">{option.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Column 2: 504 Meetings */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#DFBE77] uppercase tracking-wider px-1">
                      <FileText className="w-3.5 h-3.5" />
                      <span>504 Meetings</span>
                    </div>
                    <div className="space-y-1">
                      {SECTION_504_MEETINGS.map((option) => {
                        const isSelected = meetingType === option.name;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => handleSelectMeetingType(option)}
                            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-left text-xs transition-all ${
                              isSelected
                                ? "bg-gradient-to-r from-[#C5A059]/20 via-[#DFBE77]/25 to-[#C5A059]/10 border-[#DFBE77] text-[#FFF4D4] font-medium shadow-[0_0_10px_rgba(223,190,119,0.2)]"
                                : "bg-[#051630]/60 border-[#152B4E] text-[#B8C8DF] hover:border-[#2A4C7E] hover:bg-[#081F42]"
                            }`}
                          >
                            <span
                              className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? "border-[#DFBE77] bg-[#DFBE77]"
                                  : "border-[#3A5070] bg-[#020A17]"
                              }`}
                            >
                              {isSelected && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#000820]" />
                              )}
                            </span>
                            <span className="truncate">{option.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Column 3: Other School Meetings */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#DFBE77] uppercase tracking-wider px-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>Other School Meetings</span>
                    </div>
                    <div className="space-y-1">
                      {OTHER_SCHOOL_MEETINGS.map((option) => {
                        const isSelected = meetingType === option.name;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => handleSelectMeetingType(option)}
                            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-left text-xs transition-all ${
                              isSelected
                                ? "bg-gradient-to-r from-[#C5A059]/20 via-[#DFBE77]/25 to-[#C5A059]/10 border-[#DFBE77] text-[#FFF4D4] font-medium shadow-[0_0_10px_rgba(223,190,119,0.2)]"
                                : "bg-[#051630]/60 border-[#152B4E] text-[#B8C8DF] hover:border-[#2A4C7E] hover:bg-[#081F42]"
                            }`}
                          >
                            <span
                              className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? "border-[#DFBE77] bg-[#DFBE77]"
                                  : "border-[#3A5070] bg-[#020A17]"
                              }`}
                            >
                              {isSelected && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#000820]" />
                              )}
                            </span>
                            <span className="truncate">{option.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Scheduling Fields Row 1 (Client, Student, Advocate) */}
                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[#142640]/50 shrink-0">
                  <div>
                    <Label className="text-[11px] font-medium text-[#C6B697] uppercase tracking-wider">
                      Client / Family *
                    </Label>
                    <Select value={mParentId} onValueChange={setMParentId}>
                      <SelectTrigger className="h-9 mt-1 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs">
                        <SelectValue placeholder="Select Parent / Client..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#05142B] border-[#1D3557] text-[#FFF4D4]">
                        {parentsList.map((p: any) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.firstName} {p.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-[11px] font-medium text-[#C6B697] uppercase tracking-wider">
                      Student *
                    </Label>
                    <Select value={mStudentId} onValueChange={setMStudentId}>
                      <SelectTrigger className="h-9 mt-1 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs">
                        <SelectValue placeholder="Select Student..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#05142B] border-[#1D3557] text-[#FFF4D4]">
                        {mFilteredStudents.map((s: any) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.firstName} {s.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-[11px] font-medium text-[#C6B697] uppercase tracking-wider">
                      Assigned Advocate *
                    </Label>
                    <Select value={mAdvocate} onValueChange={setMAdvocate}>
                      <SelectTrigger className="h-9 mt-1 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs">
                        <SelectValue placeholder="Select Advocate..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#05142B] border-[#1D3557] text-[#FFF4D4]">
                        {advocateList.map((adv) => (
                          <SelectItem key={adv.id} value={adv.name}>
                            {adv.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Scheduling Fields Row 2 (Date, Start Time, Expected Duration) */}
                <div className="grid grid-cols-3 gap-3 my-2 shrink-0">
                  <div>
                    <Label className="text-[11px] font-medium text-[#C6B697] uppercase tracking-wider">
                      Date *
                    </Label>
                    <Input
                      type="date"
                      value={mDate}
                      onChange={(e) => setMDate(e.target.value)}
                      className="h-9 mt-1 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-medium text-[#C6B697] uppercase tracking-wider">
                      Start Time *
                    </Label>
                    <Input
                      type="time"
                      value={mStartTime}
                      onChange={(e) => setMStartTime(e.target.value)}
                      className="h-9 mt-1 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-medium text-[#C6B697] uppercase tracking-wider">
                      Expected Duration
                    </Label>
                    <Select
                      value={String(mDuration)}
                      onValueChange={(v) => setMDuration(Number(v))}
                    >
                      <SelectTrigger className="h-9 mt-1 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#05142B] border-[#1D3557] text-[#FFF4D4]">
                        <SelectItem value="30">30 mins (0.5 hr)</SelectItem>
                        <SelectItem value="45">45 mins</SelectItem>
                        <SelectItem value="60">60 mins (1 hr)</SelectItem>
                        <SelectItem value="90">90 mins (1.5 hrs)</SelectItem>
                        <SelectItem value="120">120 mins (2 hrs)</SelectItem>
                        <SelectItem value="180">180 mins (3 hrs)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Bottom Row (Notes Toggle + Schedule Meeting CTA) */}
                <div className="flex items-center justify-between pt-2 border-t border-[#142640]/60 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsNotesOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1D3557] bg-[#020A17] text-xs text-[#C6B697] hover:text-[#FFF4D4] hover:bg-[#07162B] transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#C5A059]" />
                    <span>
                      {mNotes ? "Edit Meeting Notes" : "+ Add Notes (Optional)"}
                    </span>
                    {mNotes && (
                      <span className="w-2 h-2 rounded-full bg-[#DFBE77] ml-1" />
                    )}
                  </button>

                  <Button
                    type="submit"
                    disabled={createAppointmentMutation.isPending}
                    className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] font-bold text-sm px-6 h-9 rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.6)] hover:brightness-110 active:scale-[0.98] transition-all flex items-center gap-2"
                  >
                    <CalendarIcon className="w-4 h-4 text-[#000820]" />
                    <span>
                      {createAppointmentMutation.isPending
                        ? "Scheduling..."
                        : "Schedule Meeting"}
                    </span>
                  </Button>
                </div>
              </form>
            )}

            {/* ──────────────────────────────────────────────────────── */}
            {/* MODE 2: CLIENT SESSIONS                                 */}
            {/* ──────────────────────────────────────────────────────── */}
            {activeMode === "CLIENT_SESSIONS" && (
              <form
                onSubmit={handleScheduleClientSession}
                className="h-full flex flex-col justify-between"
              >
                <div className="flex items-center justify-between pb-2 border-b border-[#142640]/60 shrink-0">
                  <div>
                    <h2 className="text-lg font-serif text-[#FFF4D4]">
                      Schedule a Client Session
                    </h2>
                    <p className="text-xs text-[#8E9EB8]">
                      Direct consultation, strategy, and debriefing sessions with families.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#081B36] border border-[#1D3E6B] text-[11px] text-[#8EB8EE]">
                    <Info className="w-3.5 h-3.5 text-[#8EB8EE]" />
                    <span>Select session type to load tailored strategy fields.</span>
                  </div>
                </div>

                {/* 6 Client Session Options */}
                <div className="grid grid-cols-3 gap-2.5 my-2 shrink-0">
                  {CLIENT_SESSION_OPTIONS.map((opt) => {
                    const isSelected = clientSessionType === opt.name;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setClientSessionType(opt.name);
                          setCsDuration(opt.defaultDurationMinutes);
                        }}
                        className={`flex flex-col p-2.5 rounded-lg border text-left transition-all ${
                          isSelected
                            ? "bg-gradient-to-r from-[#C5A059]/20 via-[#DFBE77]/25 to-[#C5A059]/10 border-[#DFBE77] text-[#FFF4D4] shadow-[0_0_10px_rgba(223,190,119,0.2)]"
                            : "bg-[#051630]/60 border-[#152B4E] text-[#B8C8DF] hover:border-[#2A4C7E] hover:bg-[#081F42]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs truncate">
                            {opt.name}
                          </span>
                          <span className="text-[10px] text-[#C5A059]">
                            {opt.typicalDuration}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#8E9EB8] mt-1 line-clamp-2">
                          {opt.description}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Fields Row 1 */}
                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[#142640]/50 shrink-0">
                  <div>
                    <Label className="text-[11px] font-medium text-[#C6B697] uppercase tracking-wider">
                      Client / Family *
                    </Label>
                    <Select value={csParentId} onValueChange={setCsParentId}>
                      <SelectTrigger className="h-9 mt-1 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs">
                        <SelectValue placeholder="Select Parent / Client..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#05142B] border-[#1D3557] text-[#FFF4D4]">
                        {parentsList.map((p: any) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.firstName} {p.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-[11px] font-medium text-[#C6B697] uppercase tracking-wider">
                      Student (If Applicable)
                    </Label>
                    <Select value={csStudentId} onValueChange={setCsStudentId}>
                      <SelectTrigger className="h-9 mt-1 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs">
                        <SelectValue placeholder="Select Student (Optional)..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#05142B] border-[#1D3557] text-[#FFF4D4]">
                        {csFilteredStudents.map((s: any) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.firstName} {s.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-[11px] font-medium text-[#C6B697] uppercase tracking-wider">
                      Assigned Team Member *
                    </Label>
                    <Select value={csAdvocate} onValueChange={setCsAdvocate}>
                      <SelectTrigger className="h-9 mt-1 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs">
                        <SelectValue placeholder="Select Team Member..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#05142B] border-[#1D3557] text-[#FFF4D4]">
                        {advocateList.map((adv) => (
                          <SelectItem key={adv.id} value={adv.name}>
                            {adv.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Fields Row 2 */}
                <div className="grid grid-cols-3 gap-3 my-2 shrink-0">
                  <div>
                    <Label className="text-[11px] font-medium text-[#C6B697] uppercase tracking-wider">
                      Date *
                    </Label>
                    <Input
                      type="date"
                      value={csDate}
                      onChange={(e) => setCsDate(e.target.value)}
                      className="h-9 mt-1 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-medium text-[#C6B697] uppercase tracking-wider">
                      Start Time *
                    </Label>
                    <Input
                      type="time"
                      value={csStartTime}
                      onChange={(e) => setCsStartTime(e.target.value)}
                      className="h-9 mt-1 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-medium text-[#C6B697] uppercase tracking-wider">
                      Expected Duration
                    </Label>
                    <Select
                      value={String(csDuration)}
                      onValueChange={(v) => setCsDuration(Number(v))}
                    >
                      <SelectTrigger className="h-9 mt-1 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#05142B] border-[#1D3557] text-[#FFF4D4]">
                        <SelectItem value="30">30 mins</SelectItem>
                        <SelectItem value="45">45 mins</SelectItem>
                        <SelectItem value="60">60 mins (1 hr)</SelectItem>
                        <SelectItem value="90">90 mins</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Bottom Row */}
                <div className="flex items-center justify-between pt-2 border-t border-[#142640]/60 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsNotesOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1D3557] bg-[#020A17] text-xs text-[#C6B697] hover:text-[#FFF4D4] hover:bg-[#07162B] transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#C5A059]" />
                    <span>{csNotes ? "Edit Notes" : "+ Add Notes (Optional)"}</span>
                    {csNotes && (
                      <span className="w-2 h-2 rounded-full bg-[#DFBE77] ml-1" />
                    )}
                  </button>

                  <Button
                    type="submit"
                    disabled={createAppointmentMutation.isPending}
                    className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] font-bold text-sm px-6 h-9 rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.6)] hover:brightness-110 active:scale-[0.98] transition-all flex items-center gap-2"
                  >
                    <PhoneCall className="w-4 h-4 text-[#000820]" />
                    <span>
                      {createAppointmentMutation.isPending
                        ? "Scheduling..."
                        : "Schedule Client Session"}
                    </span>
                  </Button>
                </div>
              </form>
            )}

            {/* ──────────────────────────────────────────────────────── */}
            {/* MODE 3: HOLDS (TENTATIVE TIMES)                         */}
            {/* ──────────────────────────────────────────────────────── */}
            {activeMode === "HOLDS" && (
              <form onSubmit={handlePlaceHolds} className="h-full flex flex-col justify-between">
                <div className="flex items-center justify-between pb-2 border-b border-[#142640]/60 shrink-0">
                  <div>
                    <h2 className="text-lg font-serif text-[#FFF4D4]">Tentative Holds</h2>
                    <p className="text-xs text-[#8E9EB8]">
                      Reserve possible meeting times while the family and school decide.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#081B36] border border-[#1D3E6B] text-[11px] text-[#8EB8EE]">
                    <Clock className="w-3.5 h-3.5 text-[#8EB8EE]" />
                    <span>Unified Hold Group: confirming one releases all sibling options.</span>
                  </div>
                </div>

                {/* Top Row Fields */}
                <div className="grid grid-cols-4 gap-2.5 my-2 shrink-0">
                  <div>
                    <Label className="text-[11px] font-medium text-[#C6B697] uppercase tracking-wider">
                      Client / Family *
                    </Label>
                    <Select value={hParentId} onValueChange={setHParentId}>
                      <SelectTrigger className="h-8 mt-1 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs">
                        <SelectValue placeholder="Select Parent..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#05142B] border-[#1D3557] text-[#FFF4D4]">
                        {parentsList.map((p: any) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.firstName} {p.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-[11px] font-medium text-[#C6B697] uppercase tracking-wider">
                      Student *
                    </Label>
                    <Select value={hStudentId} onValueChange={setHStudentId}>
                      <SelectTrigger className="h-8 mt-1 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs">
                        <SelectValue placeholder="Select Student..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#05142B] border-[#1D3557] text-[#FFF4D4]">
                        {hFilteredStudents.map((s: any) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.firstName} {s.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-[11px] font-medium text-[#C6B697] uppercase tracking-wider">
                      Meeting Type
                    </Label>
                    <Select value={hMeetingType} onValueChange={setHMeetingType}>
                      <SelectTrigger className="h-8 mt-1 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#05142B] border-[#1D3557] text-[#FFF4D4]">
                        <SelectItem value="Annual IEP Meeting">Annual IEP Meeting</SelectItem>
                        <SelectItem value="Triennial Re-evaluation / MET">Triennial Re-evaluation / MET</SelectItem>
                        <SelectItem value="Initial IEP / Eligibility">Initial IEP / Eligibility</SelectItem>
                        <SelectItem value="IEP Amendment / Addendum">IEP Amendment / Addendum</SelectItem>
                        <SelectItem value="504 Annual / Review">504 Annual / Review</SelectItem>
                        <SelectItem value="Manifestation Determination (MDR)">Manifestation Determination (MDR)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-[11px] font-medium text-[#C6B697] uppercase tracking-wider">
                      Assigned Advocate *
                    </Label>
                    <Select value={hAdvocate} onValueChange={setHAdvocate}>
                      <SelectTrigger className="h-8 mt-1 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#05142B] border-[#1D3557] text-[#FFF4D4]">
                        {advocateList.map((adv) => (
                          <SelectItem key={adv.id} value={adv.name}>
                            {adv.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Candidate Options in ONE HOLD GROUP */}
                <div className="bg-[#031126] border border-[#152B4E] rounded-lg p-3 my-1 flex-1 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-[#DFBE77] uppercase tracking-wider">
                      Proposed Candidate Time Slots ({hCandidateSlots.length})
                    </span>
                    <button
                      type="button"
                      onClick={addHoldOption}
                      className="flex items-center gap-1 text-xs text-[#FFE394] hover:text-[#FFF4D4] font-medium transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Another Option</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {hCandidateSlots.map((slot, index) => (
                      <div
                        key={slot.id}
                        className="flex items-center gap-3 bg-[#020A17] border border-[#1A3355] rounded-md px-3 py-2 text-xs"
                      >
                        <span className="w-16 font-bold text-[#C5A059] uppercase">
                          Option {index + 1}
                        </span>
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            type="date"
                            value={slot.date}
                            onChange={(e) => {
                              const val = e.target.value;
                              setHCandidateSlots((prev) =>
                                prev.map((s) => (s.id === slot.id ? { ...s, date: val } : s))
                              );
                            }}
                            className="h-7 bg-[#05142B] border-[#223E66] text-[#FFF4D4] text-xs"
                          />
                          <Input
                            type="time"
                            value={slot.startTime}
                            onChange={(e) => {
                              const val = e.target.value;
                              setHCandidateSlots((prev) =>
                                prev.map((s) => (s.id === slot.id ? { ...s, startTime: val } : s))
                              );
                            }}
                            className="h-7 w-28 bg-[#05142B] border-[#223E66] text-[#FFF4D4] text-xs"
                          />
                          <Select
                            value={String(slot.durationMinutes)}
                            onValueChange={(v) => {
                              const num = Number(v);
                              setHCandidateSlots((prev) =>
                                prev.map((s) =>
                                  s.id === slot.id ? { ...s, durationMinutes: num } : s
                                )
                              );
                            }}
                          >
                            <SelectTrigger className="h-7 w-28 bg-[#05142B] border-[#223E66] text-[#FFF4D4] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#05142B] border-[#223E66] text-[#FFF4D4]">
                              <SelectItem value="30">30 mins</SelectItem>
                              <SelectItem value="60">60 mins</SelectItem>
                              <SelectItem value="90">90 mins</SelectItem>
                              <SelectItem value="120">120 mins</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {hCandidateSlots.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeHoldOption(slot.id)}
                            className="text-[#E57373] hover:text-[#FF8A80] transition-colors p-1"
                            title="Remove option"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#8E9EB8] mt-2 pt-2 border-t border-[#152B4E]/60">
                    <div className="flex items-center gap-2">
                      <span>Waiting On:</span>
                      <Select
                        value={hWaitingOn}
                        onValueChange={(v: any) => setHWaitingOn(v)}
                      >
                        <SelectTrigger className="h-6 w-32 bg-[#020A17] border-[#1A3355] text-xs text-[#FFF4D4]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#05142B] border-[#1A3355] text-[#FFF4D4]">
                          <SelectItem value="School">School</SelectItem>
                          <SelectItem value="Parent / Client">Parent / Client</SelectItem>
                          <SelectItem value="Waypoint">Waypoint</SelectItem>
                          <SelectItem value="Multiple Parties">Multiple Parties</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span>Follow-up Deadline:</span>
                      <Input
                        type="date"
                        value={hFollowUpBy}
                        onChange={(e) => setHFollowUpBy(e.target.value)}
                        className="h-6 w-32 bg-[#020A17] border-[#1A3355] text-xs text-[#FFF4D4]"
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom Row */}
                <div className="flex items-center justify-between pt-2 border-t border-[#142640]/60 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsNotesOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1D3557] bg-[#020A17] text-xs text-[#C6B697] hover:text-[#FFF4D4] hover:bg-[#07162B] transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#C5A059]" />
                    <span>{hNotes ? "Edit Hold Notes" : "+ Add Notes (Optional)"}</span>
                    {hNotes && (
                      <span className="w-2 h-2 rounded-full bg-[#DFBE77] ml-1" />
                    )}
                  </button>

                  <Button
                    type="submit"
                    disabled={createProposedMeetingMutation.isPending}
                    className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] font-bold text-sm px-6 h-9 rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.6)] hover:brightness-110 active:scale-[0.98] transition-all flex items-center gap-2"
                  >
                    <Clock className="w-4 h-4 text-[#000820]" />
                    <span>
                      {createProposedMeetingMutation.isPending
                        ? "Placing Holds..."
                        : `Place Holds (${hCandidateSlots.length} Slots)`}
                    </span>
                  </Button>
                </div>
              </form>
            )}

            {/* ──────────────────────────────────────────────────────── */}
            {/* MODE 4: BLOCKS (UNAVAILABLE TIME)                       */}
            {/* ──────────────────────────────────────────────────────── */}
            {activeMode === "BLOCKS" && (
              <form onSubmit={handleBlockTimeSubmit} className="h-full flex flex-col justify-between">
                <div className="flex items-center justify-between pb-2 border-b border-[#142640]/60 shrink-0">
                  <div>
                    <h2 className="text-lg font-serif text-[#FFF4D4]">Block Calendar Time</h2>
                    <p className="text-xs text-[#8E9EB8]">Why is this time unavailable?</p>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#081B36] border border-[#1D3E6B] text-[11px] text-[#8EB8EE]">
                    <Ban className="w-3.5 h-3.5 text-[#8EB8EE]" />
                    <span>Protects staff schedules and enforces calendar availability.</span>
                  </div>
                </div>

                {/* 4 Block Category Buttons */}
                <div className="grid grid-cols-4 gap-2.5 my-2 shrink-0">
                  {[
                    {
                      id: "OFFICE_CLOSED",
                      title: "OFFICE CLOSED",
                      sub: "Everyone unavailable",
                      icon: Building,
                    },
                    {
                      id: "PERSONAL_BLACKOUT",
                      title: "PERSONAL BLACKOUT",
                      sub: "One team member unavailable",
                      icon: User,
                    },
                    {
                      id: "AVAILABILITY_BLOCK",
                      title: "AVAILABILITY BLOCK",
                      sub: "Protect scheduling time",
                      icon: Briefcase,
                    },
                    {
                      id: "RECURRING_BLOCK",
                      title: "RECURRING BLOCK",
                      sub: "Repeated unavailable time",
                      icon: CalendarClock,
                    },
                  ].map((cat) => {
                    const isSelected = blockCategory === cat.id;
                    const IconComp = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setBlockCategory(cat.id as any);
                          if (cat.id === "OFFICE_CLOSED") setBAllStaff(true);
                          else if (cat.id === "PERSONAL_BLACKOUT") setBAllStaff(false);
                        }}
                        className={`flex flex-col p-2.5 rounded-lg border text-left transition-all ${
                          isSelected
                            ? "bg-gradient-to-r from-[#C5A059]/20 via-[#DFBE77]/25 to-[#C5A059]/10 border-[#DFBE77] text-[#FFF4D4] shadow-[0_0_10px_rgba(223,190,119,0.2)]"
                            : "bg-[#051630]/60 border-[#152B4E] text-[#B8C8DF] hover:border-[#2A4C7E] hover:bg-[#081F42]"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <IconComp className="w-3.5 h-3.5 text-[#DFBE77]" />
                          <span className="truncate">{cat.title}</span>
                        </div>
                        <span className="text-[10px] text-[#8E9EB8] mt-0.5 truncate">
                          {cat.sub}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Sub-Form Container */}
                <div className="bg-[#031126] border border-[#152B4E] rounded-lg p-3 my-1 flex-1 flex flex-col justify-between">
                  {/* Category-specific fields */}
                  {blockCategory === "OFFICE_CLOSED" && (
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-[11px] font-medium text-[#C6B697] uppercase tracking-wider">
                          Closure Reason
                        </Label>
                        <Select value={bSubReason} onValueChange={(v) => {
                          setBSubReason(v);
                          setBTitle(`Office Closed — ${v}`);
                        }}>
                          <SelectTrigger className="h-8 mt-1 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#05142B] border-[#1D3557] text-[#FFF4D4]">
                            {BLOCK_REASONS.OFFICE_CLOSED.map((r) => (
                              <SelectItem key={r} value={r}>{r}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-2">
                        <Label className="text-[11px] font-medium text-[#C6B697] uppercase tracking-wider">
                          Display Title
                        </Label>
                        <Input
                          value={bTitle}
                          onChange={(e) => setBTitle(e.target.value)}
                          placeholder="e.g. Office Closed — Labor Day Holiday"
                          className="h-8 mt-1 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {blockCategory === "PERSONAL_BLACKOUT" && (
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-[11px] font-medium text-[#C6B697] uppercase tracking-wider">
                          Team Member *
                        </Label>
                        <Select value={bStaff} onValueChange={setBStaff}>
                          <SelectTrigger className="h-8 mt-1 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#05142B] border-[#1D3557] text-[#FFF4D4]">
                            {advocateList.map((adv) => (
                              <SelectItem key={adv.id} value={adv.name}>{adv.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-[11px] font-medium text-[#C6B697] uppercase tracking-wider">
                          Blackout Category
                        </Label>
                        <Select value={bSubReason} onValueChange={setBSubReason}>
                          <SelectTrigger className="h-8 mt-1 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#05142B] border-[#1D3557] text-[#FFF4D4]">
                            {BLOCK_REASONS.PERSONAL_BLACKOUT.map((r) => (
                              <SelectItem key={r} value={r}>{r}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-[11px] font-medium text-[#C6B697] uppercase tracking-wider">
                          Enforcement
                        </Label>
                        <Select value={bEnforcement} onValueChange={(v: any) => setBEnforcement(v)}>
                          <SelectTrigger className="h-8 mt-1 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#05142B] border-[#1D3557] text-[#FFF4D4]">
                            <SelectItem value="HARD_BLOCK">Hard Block (Prevent Booking)</SelectItem>
                            <SelectItem value="SOFT_BLOCK">Soft Block (Warning Only)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {blockCategory === "AVAILABILITY_BLOCK" && (
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-[11px] font-medium text-[#C6B697] uppercase tracking-wider">
                          Protection Type
                        </Label>
                        <Select value={bSubReason} onValueChange={setBSubReason}>
                          <SelectTrigger className="h-8 mt-1 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#05142B] border-[#1D3557] text-[#FFF4D4]">
                            {BLOCK_REASONS.AVAILABILITY_BLOCK.map((r) => (
                              <SelectItem key={r} value={r}>{r}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-[11px] font-medium text-[#C6B697] uppercase tracking-wider">
                          Assigned Staff
                        </Label>
                        <Select
                          value={bAllStaff ? "ALL" : bStaff}
                          onValueChange={(v) => {
                            if (v === "ALL") setBAllStaff(true);
                            else {
                              setBAllStaff(false);
                              setBStaff(v);
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 mt-1 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#05142B] border-[#1D3557] text-[#FFF4D4]">
                            <SelectItem value="ALL">Entire Company / All Staff</SelectItem>
                            {advocateList.map((adv) => (
                              <SelectItem key={adv.id} value={adv.name}>{adv.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-[11px] font-medium text-[#C6B697] uppercase tracking-wider">
                          Effect on Clients
                        </Label>
                        <div className="mt-2 text-xs text-[#8EB8EE] flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#DFBE77]" />
                          <span>Hides time slots on client booking portal</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {blockCategory === "RECURRING_BLOCK" && (
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-[11px] font-medium text-[#C6B697] uppercase tracking-wider">
                          Recurring Pattern
                        </Label>
                        <Select value={bRecurrence} onValueChange={setBRecurrence}>
                          <SelectTrigger className="h-8 mt-1 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#05142B] border-[#1D3557] text-[#FFF4D4]">
                            {BLOCK_REASONS.RECURRING_BLOCK.map((r) => (
                              <SelectItem key={r} value={r}>{r}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-[11px] font-medium text-[#C6B697] uppercase tracking-wider">
                          Staff Member
                        </Label>
                        <Select value={bStaff} onValueChange={setBStaff}>
                          <SelectTrigger className="h-8 mt-1 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#05142B] border-[#1D3557] text-[#FFF4D4]">
                            {advocateList.map((adv) => (
                              <SelectItem key={adv.id} value={adv.name}>{adv.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-[11px] font-medium text-[#C6B697] uppercase tracking-wider">
                          Recurrence Frequency
                        </Label>
                        <div className="mt-2 text-xs text-[#C6B697]">
                          Repeats Weekly on {new Date(bStartDate).toLocaleDateString("en-US", { weekday: "long" })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Dates & Times Row */}
                  <div className="grid grid-cols-4 gap-3 pt-3 border-t border-[#152B4E]/60 items-end">
                    <div>
                      <Label className="text-[11px] font-medium text-[#C6B697] uppercase tracking-wider">
                        Start Date *
                      </Label>
                      <Input
                        type="date"
                        value={bStartDate}
                        onChange={(e) => {
                          setBStartDate(e.target.value);
                          if (!bEndDate || e.target.value > bEndDate) {
                            setBEndDate(e.target.value);
                          }
                        }}
                        className="h-8 mt-1 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs"
                      />
                    </div>

                    <div>
                      <Label className="text-[11px] font-medium text-[#C6B697] uppercase tracking-wider">
                        End Date
                      </Label>
                      <Input
                        type="date"
                        value={bEndDate}
                        onChange={(e) => setBEndDate(e.target.value)}
                        className="h-8 mt-1 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-medium text-[#C6B697] uppercase tracking-wider">
                          All Day
                        </Label>
                        <Checkbox
                          checked={bIsAllDay}
                          onCheckedChange={(c) => setBIsAllDay(Boolean(c))}
                          className="border-[#DFBE77] data-[state=checked]:bg-[#DFBE77] data-[state=checked]:text-[#000820]"
                        />
                      </div>
                      <div className="text-[11px] text-[#8E9EB8] mt-1">
                        {bIsAllDay ? "Entire 24-hr day" : "Specific hours"}
                      </div>
                    </div>

                    {!bIsAllDay && (
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="time"
                          value={bStartTime}
                          onChange={(e) => setBStartTime(e.target.value)}
                          className="h-8 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs"
                        />
                        <span className="text-xs text-[#8E9EB8]">–</span>
                        <Input
                          type="time"
                          value={bEndTime}
                          onChange={(e) => setBEndTime(e.target.value)}
                          className="h-8 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Row */}
                <div className="flex items-center justify-between pt-2 border-t border-[#142640]/60 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsNotesOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1D3557] bg-[#020A17] text-xs text-[#C6B697] hover:text-[#FFF4D4] hover:bg-[#07162B] transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#C5A059]" />
                    <span>{bNotes ? "Edit Reason Notes" : "+ Add Reason Notes (Optional)"}</span>
                    {bNotes && (
                      <span className="w-2 h-2 rounded-full bg-[#DFBE77] ml-1" />
                    )}
                  </button>

                  <Button
                    type="submit"
                    disabled={createOperationalBlockMutation.isPending}
                    className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] font-bold text-sm px-6 h-9 rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.6)] hover:brightness-110 active:scale-[0.98] transition-all flex items-center gap-2"
                  >
                    <Ban className="w-4 h-4 text-[#000820]" />
                    <span>
                      {createOperationalBlockMutation.isPending
                        ? "Saving Block..."
                        : blockCategory === "OFFICE_CLOSED"
                        ? "Block Office Closed"
                        : blockCategory === "PERSONAL_BLACKOUT"
                        ? "Save Personal Blackout"
                        : blockCategory === "AVAILABILITY_BLOCK"
                        ? "Protect Calendar Time"
                        : "Create Recurring Block"}
                    </span>
                  </Button>
                </div>
              </form>
            )}

            {/* ──────────────────────────────────────────────────────── */}
            {/* MODE 5: INTERNAL (TEAM EVENTS)                          */}
            {/* ──────────────────────────────────────────────────────── */}
            {activeMode === "INTERNAL" && (
              <form onSubmit={handleInternalEventSubmit} className="h-full flex flex-col justify-between">
                <div className="flex items-center justify-between pb-2 border-b border-[#142640]/60 shrink-0">
                  <div>
                    <h2 className="text-lg font-serif text-[#FFF4D4]">Schedule Internal Event</h2>
                    <p className="text-xs text-[#8E9EB8]">
                      Internal team synchronization, supervision, and operations.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#081B36] border border-[#1D3E6B] text-[11px] text-[#8EB8EE]">
                    <Users className="w-3.5 h-3.5 text-[#8EB8EE]" />
                    <span>Internal event visible on staff calendars.</span>
                  </div>
                </div>

                {/* Event Type selector row */}
                <div className="grid grid-cols-7 gap-2 my-2 shrink-0">
                  {INTERNAL_EVENT_OPTIONS.map((t) => {
                    const isSelected = ieType === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setIeType(t);
                          setIeTitle(t);
                        }}
                        className={`px-2 py-1.5 rounded-lg border text-center text-xs transition-all ${
                          isSelected
                            ? "bg-gradient-to-r from-[#C5A059]/20 via-[#DFBE77]/25 to-[#C5A059]/10 border-[#DFBE77] text-[#FFF4D4] font-semibold shadow-[0_0_10px_rgba(223,190,119,0.2)]"
                            : "bg-[#051630]/60 border-[#152B4E] text-[#B8C8DF] hover:border-[#2A4C7E] hover:bg-[#081F42]"
                        }`}
                      >
                        <span className="truncate block">{t}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Fields Row 1 */}
                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[#142640]/50 shrink-0">
                  <div className="col-span-2">
                    <Label className="text-[11px] font-medium text-[#C6B697] uppercase tracking-wider">
                      Event Title *
                    </Label>
                    <Input
                      value={ieTitle}
                      onChange={(e) => setIeTitle(e.target.value)}
                      placeholder="e.g. Weekly Advocacy Sync"
                      className="h-9 mt-1 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-medium text-[#C6B697] uppercase tracking-wider">
                      Participants
                    </Label>
                    <Select
                      value={ieAllStaff ? "ALL" : ieSelectedStaff}
                      onValueChange={(v) => {
                        if (v === "ALL") setIeAllStaff(true);
                        else {
                          setIeAllStaff(false);
                          setIeSelectedStaff(v);
                        }
                      }}
                    >
                      <SelectTrigger className="h-9 mt-1 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#05142B] border-[#1D3557] text-[#FFF4D4]">
                        <SelectItem value="ALL">All Team Members (Entire Staff)</SelectItem>
                        {advocateList.map((adv) => (
                          <SelectItem key={adv.id} value={adv.name}>{adv.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Fields Row 2 */}
                <div className="grid grid-cols-4 gap-3 my-2 shrink-0">
                  <div>
                    <Label className="text-[11px] font-medium text-[#C6B697] uppercase tracking-wider">
                      Date *
                    </Label>
                    <Input
                      type="date"
                      value={ieDate}
                      onChange={(e) => setIeDate(e.target.value)}
                      className="h-9 mt-1 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-medium text-[#C6B697] uppercase tracking-wider">
                      Start Time *
                    </Label>
                    <Input
                      type="time"
                      value={ieStartTime}
                      onChange={(e) => setIeStartTime(e.target.value)}
                      className="h-9 mt-1 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-medium text-[#C6B697] uppercase tracking-wider">
                      Duration
                    </Label>
                    <Select
                      value={String(ieDuration)}
                      onValueChange={(v) => setIeDuration(Number(v))}
                    >
                      <SelectTrigger className="h-9 mt-1 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#05142B] border-[#1D3557] text-[#FFF4D4]">
                        <SelectItem value="30">30 mins</SelectItem>
                        <SelectItem value="45">45 mins</SelectItem>
                        <SelectItem value="60">60 mins (1 hr)</SelectItem>
                        <SelectItem value="90">90 mins</SelectItem>
                        <SelectItem value="120">120 mins (2 hrs)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-[11px] font-medium text-[#C6B697] uppercase tracking-wider">
                      Blocks Client Scheduling
                    </Label>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => setIeBlocksClientScheduling(true)}
                        className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                          ieBlocksClientScheduling
                            ? "bg-[#DFBE77] text-[#000820]"
                            : "bg-[#05142B] text-[#8E9EB8] border border-[#1D3557]"
                        }`}
                      >
                        YES
                      </button>
                      <button
                        type="button"
                        onClick={() => setIeBlocksClientScheduling(false)}
                        className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                          !ieBlocksClientScheduling
                            ? "bg-[#DFBE77] text-[#000820]"
                            : "bg-[#05142B] text-[#8E9EB8] border border-[#1D3557]"
                        }`}
                      >
                        NO
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bottom Row */}
                <div className="flex items-center justify-between pt-2 border-t border-[#142640]/60 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsNotesOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1D3557] bg-[#020A17] text-xs text-[#C6B697] hover:text-[#FFF4D4] hover:bg-[#07162B] transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#C5A059]" />
                    <span>{ieNotes ? "Edit Agenda Notes" : "+ Add Agenda Notes (Optional)"}</span>
                    {ieNotes && (
                      <span className="w-2 h-2 rounded-full bg-[#DFBE77] ml-1" />
                    )}
                  </button>

                  <Button
                    type="submit"
                    disabled={createOperationalBlockMutation.isPending}
                    className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] font-bold text-sm px-6 h-9 rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.6)] hover:brightness-110 active:scale-[0.98] transition-all flex items-center gap-2"
                  >
                    <Users className="w-4 h-4 text-[#000820]" />
                    <span>
                      {createOperationalBlockMutation.isPending
                        ? "Scheduling..."
                        : "Schedule Internal Event"}
                    </span>
                  </Button>
                </div>
              </form>
            )}

            {/* ──────────────────────────────────────────────────────── */}
            {/* MODE 6: BLUEPRINT (AUTO-SCHEDULE TASKS)                 */}
            {/* ──────────────────────────────────────────────────────── */}
            {activeMode === "BLUEPRINT" && (
              <form onSubmit={handleBlueprintSubmit} className="h-full flex flex-col justify-between">
                <div className="flex items-center justify-between pb-2 border-b border-[#142640]/60 shrink-0">
                  <div>
                    <h2 className="text-lg font-serif text-[#FFF4D4]">Scheduling Blueprint</h2>
                    <p className="text-xs text-[#8E9EB8]">
                      Build the work timeline around a major advocacy event.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#081B36] border border-[#1D3E6B] text-[11px] text-[#8EB8EE]">
                    <Sparkles className="w-3.5 h-3.5 text-[#DFBE77]" />
                    <span>Connected timeline around Primary Meeting date.</span>
                  </div>
                </div>

                {/* Blueprint Primary Event Setup */}
                <div className="grid grid-cols-4 gap-2.5 my-2 shrink-0">
                  <div>
                    <Label className="text-[11px] font-medium text-[#C6B697] uppercase tracking-wider">
                      Client / Family *
                    </Label>
                    <Select value={bpParentId} onValueChange={setBpParentId}>
                      <SelectTrigger className="h-8 mt-1 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs">
                        <SelectValue placeholder="Select Parent..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#05142B] border-[#1D3557] text-[#FFF4D4]">
                        {parentsList.map((p: any) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.firstName} {p.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-[11px] font-medium text-[#C6B697] uppercase tracking-wider">
                      Student *
                    </Label>
                    <Select value={bpStudentId} onValueChange={setBpStudentId}>
                      <SelectTrigger className="h-8 mt-1 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs">
                        <SelectValue placeholder="Select Student..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#05142B] border-[#1D3557] text-[#FFF4D4]">
                        {bpFilteredStudents.map((s: any) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.firstName} {s.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-[11px] font-medium text-[#C6B697] uppercase tracking-wider">
                      Primary Meeting Date *
                    </Label>
                    <Input
                      type="date"
                      value={bpMeetingDate}
                      onChange={(e) => setBpMeetingDate(e.target.value)}
                      className="h-8 mt-1 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-medium text-[#C6B697] uppercase tracking-wider">
                      Meeting Time *
                    </Label>
                    <Input
                      type="time"
                      value={bpStartTime}
                      onChange={(e) => setBpStartTime(e.target.value)}
                      className="h-8 mt-1 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs"
                    />
                  </div>
                </div>

                {/* Connected Timeline Preview */}
                <div className="bg-[#031126] border border-[#152B4E] rounded-lg p-2.5 my-1 flex-1 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-[#DFBE77] uppercase tracking-wider">
                      ANNUAL IEP BLUEPRINT TIMELINE PREVIEW
                    </span>
                    <span className="text-[11px] text-[#8E9EB8]">
                      Toggle items on/off before creating
                    </span>
                  </div>

                  <div className="grid grid-cols-7 gap-1.5">
                    {bpMilestones.map((m, idx) => (
                      <div
                        key={m.label}
                        onClick={() => toggleMilestone(idx)}
                        className={`cursor-pointer p-2 rounded border flex flex-col justify-between transition-all ${
                          m.checked
                            ? m.dayOffset === 0
                              ? "bg-gradient-to-b from-[#C5A059]/30 to-[#9E7D3B]/20 border-[#DFBE77] text-[#FFF4D4] shadow-sm ring-1 ring-[#DFBE77]"
                              : "bg-[#051630] border-[#1F3D6B] text-[#FFF4D4]"
                            : "bg-[#020A17]/60 border-[#152B4E]/60 text-[#5A6D88] opacity-60"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider ${
                              m.dayOffset === 0 ? "text-[#DFBE77]" : "text-[#C5A059]"
                            }`}
                          >
                            {m.label}
                          </span>
                          <Checkbox
                            checked={m.checked}
                            onCheckedChange={() => toggleMilestone(idx)}
                            className="w-3.5 h-3.5 border-[#C5A059] data-[state=checked]:bg-[#DFBE77] data-[state=checked]:text-[#000820]"
                          />
                        </div>
                        <div className="my-1">
                          <div className="font-semibold text-xs leading-tight line-clamp-1">
                            {m.title}
                          </div>
                          <div className="text-[10px] text-[#8E9EB8] mt-0.5">
                            {getMilestoneCalculatedDate(m.dayOffset)}
                          </div>
                        </div>
                        <p className="text-[9px] text-[#A69371] line-clamp-2 leading-tight">
                          {m.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Row */}
                <div className="flex items-center justify-between pt-2 border-t border-[#142640]/60 shrink-0">
                  <div className="text-xs text-[#8E9EB8]">
                    Creates Primary Meeting + {bpMilestones.filter((m) => m.checked).length} connected timeline tasks
                  </div>

                  <Button
                    type="submit"
                    disabled={createAppointmentMutation.isPending}
                    className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] font-bold text-sm px-6 h-9 rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.6)] hover:brightness-110 active:scale-[0.98] transition-all flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-[#000820]" />
                    <span>
                      {createAppointmentMutation.isPending
                        ? "Creating Blueprint..."
                        : "Create Blueprint"}
                    </span>
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* ── RIGHT: CONTEXTUAL DETAIL PARCHMENT PANEL ── */}
          <div className="w-[280px] lg:w-[310px] shrink-0 bg-[#F3E7C4] text-[#1E1A11] border border-[#4A3B22] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.6)] p-3.5 flex flex-col justify-between overflow-hidden relative">
            <div>
              {/* Header */}
              <div className="flex items-center gap-2 pb-2.5 border-b border-[#D6C498]">
                <CalendarIcon className="w-4 h-4 text-[#7A6129]" />
                <span className="font-serif font-bold text-sm text-[#382B14] tracking-wide">
                  {activeContextualData.badgeHeader}
                </span>
              </div>

              {/* Title & Description */}
              <div className="mt-3">
                <div className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#7A6129] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-xs text-[#221A0C] leading-snug">
                      {activeContextualData.title}
                    </h3>
                    <p className="text-[11px] text-[#5C4D31] mt-1 leading-relaxed">
                      {activeContextualData.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Typical Duration */}
              <div className="mt-3 pt-2.5 border-t border-[#D6C498]/70">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#382B14]">
                  <Clock className="w-3.5 h-3.5 text-[#7A6129]" />
                  <span>Typical Duration</span>
                </div>
                <p className="text-[11px] text-[#5C4D31] mt-0.5 ml-5">
                  {activeContextualData.typicalDuration}
                </p>
              </div>

              {/* Waypoint Role */}
              <div className="mt-3 pt-2.5 border-t border-[#D6C498]/70">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#382B14]">
                  <Users className="w-3.5 h-3.5 text-[#7A6129]" />
                  <span>Waypoint Role</span>
                </div>
                <p className="text-[11px] text-[#5C4D31] mt-0.5 ml-5 leading-relaxed">
                  {activeContextualData.waypointRole}
                </p>
              </div>

              {/* Checklist */}
              <div className="mt-3 pt-2.5 border-t border-[#D6C498]/70">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#382B14] mb-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#7A6129]" />
                  <span>Helpful Before the Meeting</span>
                </div>
                <div className="space-y-1 ml-1">
                  {activeContextualData.checklist.map((item, idx) => (
                    <label
                      key={idx}
                      className="flex items-start gap-2 text-[10px] text-[#473B25] leading-tight cursor-pointer hover:text-[#1E1A11]"
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 rounded border-[#8A713E] text-[#7A6129] focus:ring-0"
                      />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Subtle Brand Stamp Footer */}
            <div className="pt-2 border-t border-[#D6C498] text-[9px] uppercase tracking-widest text-[#8A713E] font-semibold text-center">
              Waypoint Master IEP Coach® Protocol
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 4. NOTES POPOVER MODAL (KEEPS MAIN FORM COMPACT)          */}
        {/* ======================================================== */}
        {isNotesOpen && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#05142B] border border-[#3A2C18] rounded-xl w-full max-w-lg p-5 text-[#FFF4D4] shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#142640] pb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#DFBE77]" />
                  <h3 className="font-serif text-base text-[#FFF4D4]">
                    Add Meeting & Advocacy Notes
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNotesOpen(false)}
                  className="text-[#C6B697] hover:text-[#FFF4D4]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <Label className="text-xs text-[#C6B697] uppercase tracking-wider">
                  Client & Family Notes (Visible on confirmations)
                </Label>
                <Textarea
                  value={
                    activeMode === "MEETINGS"
                      ? mNotes
                      : activeMode === "CLIENT_SESSIONS"
                      ? csNotes
                      : activeMode === "HOLDS"
                      ? hNotes
                      : activeMode === "BLOCKS"
                      ? bNotes
                      : ieNotes
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (activeMode === "MEETINGS") setMNotes(val);
                    else if (activeMode === "CLIENT_SESSIONS") setCsNotes(val);
                    else if (activeMode === "HOLDS") setHNotes(val);
                    else if (activeMode === "BLOCKS") setBNotes(val);
                    else setIeNotes(val);
                  }}
                  placeholder="Enter meeting objectives, prep requests, or meeting link..."
                  className="mt-1 h-24 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs resize-none"
                />
              </div>

              {activeMode === "MEETINGS" && (
                <div>
                  <Label className="text-xs text-[#DFBE77] uppercase tracking-wider">
                    Internal Strategy Notes (Private to Waypoint Advocates)
                  </Label>
                  <Textarea
                    value={mInternalNotes}
                    onChange={(e) => setMInternalNotes(e.target.value)}
                    placeholder="Enter confidential leverage points, target outcomes, and tactical notes..."
                    className="mt-1 h-20 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs resize-none"
                  />
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  onClick={() => setIsNotesOpen(false)}
                  className="bg-[#DFBE77] text-[#000820] font-bold text-xs px-4 h-8 hover:brightness-110"
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
