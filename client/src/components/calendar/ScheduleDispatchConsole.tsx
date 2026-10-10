import React, { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
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
  X,
  User,
  Users,
  CheckCircle2,
  CalendarClock,
  Sparkles,
  Briefcase,
  BookOpen,
  FileText,
  PhoneCall,
  Ban,
  Building,
  Info,
  ArrowLeft,
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
import type { ScheduleActionType } from "./MasterScheduleModal";
import { broadcastPageId } from "@/lib/pageIdRegistry";

export interface ScheduleDispatchConsoleProps {
  initialDate?: Date;
  initialTime?: string;
  advocateList?: { id: string; name: string }[];
  defaultAction?: ScheduleActionType;
  onSuccess: () => void;
  onClose: () => void;
  isSubPage?: boolean;
}

const DEFAULT_ADVOCATES = [
  { id: "byron-honea", name: "Byron Honea" },
  { id: "wyatt-smith", name: "Wyatt Smith" },
  { id: "sarah-jenkins", name: "Sarah Jenkins" },
  { id: "abby-miller", name: "Abby Miller" },
  { id: "marcus-vance", name: "Marcus Vance" },
];

function BrassCornerBracket({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 60 60"
      className={`pointer-events-none ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="bracketGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#DFBE77" />
          <stop offset="50%" stopColor="#B38D45" />
          <stop offset="100%" stopColor="#6E5020" />
        </linearGradient>
      </defs>
      <path
        d="M 4 4 L 46 4 L 46 16 L 16 16 L 16 46 L 4 46 Z"
        fill="url(#bracketGrad)"
        stroke="#FFE394"
        strokeWidth="1.2"
        style={{ filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.75))" }}
      />
      <circle cx="10" cy="10" r="2.5" fill="#FFE394" stroke="#4A3410" strokeWidth="0.8" />
      <circle cx="32" cy="10" r="2" fill="#FFE394" stroke="#4A3410" strokeWidth="0.8" />
      <circle cx="10" cy="32" r="2" fill="#FFE394" stroke="#4A3410" strokeWidth="0.8" />
    </svg>
  );
}

function IvyCornerFoliage({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 140"
      className={`pointer-events-none ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="ivyLeaf1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#48A850" />
          <stop offset="50%" stopColor="#256B32" />
          <stop offset="100%" stopColor="#103816" />
        </linearGradient>
        <linearGradient id="ivyLeaf2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#66C66D" />
          <stop offset="50%" stopColor="#358C43" />
          <stop offset="100%" stopColor="#194E23" />
        </linearGradient>
        <linearGradient id="ivyLeaf3" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3A8A45" />
          <stop offset="100%" stopColor="#123B17" />
        </linearGradient>
      </defs>
      <path
        d="M 0 0 C 25 15, 45 40, 50 75 C 55 105, 75 125, 95 135"
        stroke="#3A2814"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M 30 10 C 60 15, 90 22, 140 18"
        stroke="#3A2814"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M 12 18 C 5 8, -5 22, 2 32 C 10 40, 24 35, 20 22 Z"
        fill="url(#ivyLeaf1)"
        filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
      />
      <path d="M 2 32 Q 10 24 18 20" stroke="#78C679" strokeWidth="0.8" opacity="0.7" />
      <path
        d="M 35 25 C 26 12, 14 18, 18 34 C 22 45, 40 46, 38 32 Z"
        fill="url(#ivyLeaf2)"
        filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
      />
      <path
        d="M 52 14 C 45 2, 60 -4, 72 4 C 82 12, 75 28, 60 22 Z"
        fill="url(#ivyLeaf1)"
        filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
      />
      <path
        d="M 46 52 C 32 45, 30 62, 38 72 C 48 82, 62 76, 56 60 Z"
        fill="url(#ivyLeaf2)"
        filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
      />
      <path
        d="M 88 16 C 85 4, 104 -2, 114 8 C 122 18, 112 32, 98 26 Z"
        fill="url(#ivyLeaf1)"
        filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
      />
      <path
        d="M 64 78 C 52 74, 52 92, 62 102 C 72 112, 88 104, 80 88 Z"
        fill="url(#ivyLeaf3)"
        filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
      />
      <path
        d="M 120 18 C 118 6, 138 4, 146 14 C 152 24, 140 36, 128 30 Z"
        fill="url(#ivyLeaf2)"
        filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
      />
      <path
        d="M 88 110 C 80 106, 78 122, 88 132 C 98 140, 110 132, 104 118 Z"
        fill="url(#ivyLeaf1)"
        filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
      />
    </svg>
  );
}

function GlowingBrassLantern({ className = "" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Radiant ambient warmth on the wood behind */}
      <div
        className="absolute -inset-10 pointer-events-none rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 55%, rgba(255, 195, 70, 0.55) 0%, rgba(230, 140, 25, 0.28) 40%, rgba(200, 100, 10, 0.1) 60%, transparent 80%)",
        }}
      />
      <svg
        viewBox="0 0 70 100"
        className="w-14 h-20 relative z-10"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: "drop-shadow(0 0 16px rgba(255,180,50,0.7))" }}
      >
        <defs>
          <linearGradient id="brassGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFE394" />
            <stop offset="35%" stopColor="#DFBE77" />
            <stop offset="70%" stopColor="#9E7D3B" />
            <stop offset="100%" stopColor="#5E4318" />
          </linearGradient>
          <linearGradient id="brassHighlight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFF4D4" />
            <stop offset="50%" stopColor="#C5A059" />
            <stop offset="100%" stopColor="#4A3410" />
          </linearGradient>
          <radialGradient id="flameGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="25%" stopColor="#FFE885" />
            <stop offset="60%" stopColor="#FF9E1B" />
            <stop offset="90%" stopColor="#E65100" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        {/* Top Ring / Loop */}
        <circle cx="35" cy="10" r="7" stroke="url(#brassGrad)" strokeWidth="3" fill="none" />
        <rect x="33" y="15" width="4" height="6" fill="url(#brassHighlight)" rx="1" />
        {/* Tiered Chimney & Cap */}
        <path d="M 27 21 L 43 21 L 40 25 L 30 25 Z" fill="url(#brassGrad)" />
        <path d="M 22 25 L 48 25 L 52 33 L 18 33 Z" fill="url(#brassHighlight)" stroke="#3A2810" strokeWidth="0.8" />
        {/* Glass Housing Background */}
        <path d="M 20 33 L 50 33 L 46 72 L 24 72 Z" fill="#1C1306" opacity="0.85" />
        {/* Amber Light Burst inside Glass */}
        <ellipse cx="35" cy="52" rx="13" ry="17" fill="url(#flameGlow)" opacity="0.95" />
        {/* Incandescent Flame Filament */}
        <path
          d="M 35 44 C 37 48, 38 53, 36 57 C 34 60, 32 58, 33 54 C 34 50, 33 46, 35 44 Z"
          fill="#FFFDF0"
          style={{ filter: "drop-shadow(0 0 6px #FFE885)" }}
        />
        {/* Glass Panes Outline & Vertical Brass Ribs */}
        <path d="M 20 33 L 50 33 L 46 72 L 24 72 Z" stroke="url(#brassGrad)" strokeWidth="1.5" fill="none" />
        <line x1="29" y1="33" x2="31" y2="72" stroke="url(#brassHighlight)" strokeWidth="1.2" />
        <line x1="41" y1="33" x2="39" y2="72" stroke="url(#brassHighlight)" strokeWidth="1.2" />
        {/* Horizontal Cage Ring */}
        <path d="M 22 52 Q 35 55 48 52" stroke="url(#brassGrad)" strokeWidth="1.2" fill="none" />
        {/* Brass Base */}
        <path d="M 22 72 L 48 72 L 52 80 L 18 80 Z" fill="url(#brassHighlight)" stroke="#3A2810" strokeWidth="0.8" />
        <rect x="25" y="80" width="20" height="4" fill="url(#brassGrad)" rx="1" />
        <circle cx="35" cy="85" r="2.5" fill="url(#brassHighlight)" />
      </svg>
    </div>
  );
}

export default function ScheduleDispatchConsole({
  initialDate,
  initialTime = "10:00",
  advocateList = DEFAULT_ADVOCATES,
  defaultAction,
  onSuccess,
  onClose,
  isSubPage = true,
}: ScheduleDispatchConsoleProps) {
  const utils = trpc.useUtils();

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
    if (defaultAction) {
      setActiveMode(resolveInitialMode(defaultAction));
    }
  }, [defaultAction]);

  // Broadcast PG-007-DSP to the bottom-right PageIdBadge micro-dock
  useEffect(() => {
    broadcastPageId({
      id: "PG-007-DSP",
      name: "Schedule Dispatch Sub-Page",
      category: "Schedule",
      description: "Expansive purpose-driven calendar dispatch command desk",
    });
    return () => {
      broadcastPageId({
        id: "PG-007",
        name: "Appointments & Calendar",
        category: "Schedule",
      });
    };
  }, []);

  const baseDateStr = useMemo(() => {
    return initialDate
      ? new Date(initialDate).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);
  }, [initialDate]);

  const { data: contactsData } = trpc.contacts.list.useQuery();

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

  // Notes Modal state
  const [isNotesOpen, setIsNotesOpen] = useState(false);

  // MODE 1: SCHOOL MEETINGS
  const [meetingType, setMeetingType] = useState<string>("Annual IEP Meeting");
  const [mParentId, setMParentId] = useState<string>("");
  const [mStudentId, setMStudentId] = useState<string>("");
  const [mAdvocate, setMAdvocate] = useState<string>("Byron Honea");
  const [mDate, setMDate] = useState<string>(baseDateStr);
  const [mStartTime, setMStartTime] = useState<string>(initialTime);
  const [mDuration, setMDuration] = useState<number>(60);
  const [mNotes, setMNotes] = useState<string>("");
  const [mInternalNotes, setMInternalNotes] = useState<string>("");

  const handleSelectMeetingType = (option: MeetingTypeOption) => {
    setMeetingType(option.name);
    setMDuration(option.defaultDurationMinutes);
  };

  const mFilteredStudents = useMemo(() => {
    if (!mParentId) return studentsList;
    const pid = Number(mParentId);
    const matching = studentsList.filter(
      (s: any) => Number(s.parentContactId) === pid || Number(s.parentId) === pid
    );
    return matching.length > 0 ? matching : studentsList;
  }, [studentsList, mParentId]);

  // MODE 2: CLIENT SESSIONS
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

  // MODE 3: HOLDS
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

  // MODE 4: BLOCKS
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

  // MODE 5: INTERNAL
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

  // MODE 6: BLUEPRINT
  const [bpType, setBpType] = useState<string>("Annual IEP Blueprint");
  const [bpParentId, setBpParentId] = useState<string>("");
  const [bpStudentId, setBpStudentId] = useState<string>("");
  const [bpAdvocate, setBpAdvocate] = useState<string>("Byron Honea");
  const [bpMeetingDate, setBpMeetingDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
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

  // MUTATIONS
  const createAppointmentMutation = trpc.appointments.create.useMutation({
    onSuccess: () => {
      utils.appointments.invalidate();
      utils.proposedMeetings.invalidate();
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const createProposedMeetingMutation = trpc.proposedMeetings.create.useMutation({
    onSuccess: () => {
      toast.success("Hold group placed! Candidate dates held on calendar.");
      utils.proposedMeetings.invalidate();
      utils.appointments.invalidate();
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const createOperationalBlockMutation = trpc.operationalBlocks.create.useMutation({
    onSuccess: () => {
      utils.operationalBlocks.list.invalidate();
      utils.appointments.invalidate();
      onSuccess();
      toast.success("Calendar block created successfully!");
    },
    onError: (err) => toast.error("Failed to save block: " + err.message),
  });

  // SUBMIT HANDLERS
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
        onSuccess: () => toast.success(`${clientSessionType} session scheduled!`),
      }
    );
  };

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
      .map(
        (m) =>
          `• [${m.label} (${getMilestoneCalculatedDate(m.dayOffset)})] ${
            m.title
          }: ${m.description}`
      )
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

  // Contextual info for right parchment card
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

    return {
      badgeHeader: "Blueprint Timeline",
      title: bpType,
      description:
        "Special education advocacy connected work timeline around an advocacy milestone.",
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
    <div
      className={`min-h-screen w-full bg-[#07162B] text-[#FFF4D4] relative flex flex-col justify-start items-center ${
        isSubPage ? "p-2 sm:p-4 lg:p-6" : "p-0"
      }`}
      style={{
        backgroundImage:
          "url('/images/calendar-wood-planks.png'), radial-gradient(ellipse at 88% 60px, rgba(255,190,80,0.35) 0%, rgba(10,35,70,0.4) 35%, rgba(0,8,32,0.95) 80%)",
        backgroundRepeat: "repeat-y, no-repeat",
        backgroundSize: "100% auto, cover",
      }}
    >
      <div className="w-full max-w-[1720px] rounded-2xl border-2 border-[#5C4524] bg-[#020A1A]/95 text-[#FFF4D4] shadow-[0_25px_80px_rgba(0,0,0,0.98)] overflow-hidden relative flex flex-col">
        {/* Brass corner brackets */}
        <BrassCornerBracket className="absolute top-0 left-0 w-16 h-16 z-20" />
        {/* Ivy corner foliage */}
        <IvyCornerFoliage className="absolute -top-1 -left-1 w-36 h-32 z-20 pointer-events-none" />

        {/* ── 1. HEADER WITH LANTERN & VIBRANT ADMIRALTY TITLE ── */}
        <div className="px-6 sm:px-8 pt-5 pb-4 flex items-center justify-between border-b border-[#223B60]/80 bg-[#020D22]/90 backdrop-blur-md relative z-10 pl-16 sm:pl-20">
          <div className="flex items-center gap-4">
            {isSubPage && (
              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[#5C4524] bg-[#020A17]/95 text-xs text-[#DFBE77] hover:text-[#FFF4D4] hover:bg-[#07162B] hover:border-[#FFE394]/70 transition-colors shadow-sm cursor-pointer"
                title="Return to Calendar View"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Calendar</span>
              </button>
            )}

            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#FFF4D4] tracking-wide drop-shadow-md">
                  Schedule Dispatch
                </h1>
                <span className="hidden sm:inline-block text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-[#122A4E] border border-[#234B7E] text-[#9CC4F5] uppercase tracking-wider">
                  PG-007 Dispatch Desk
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#D8C7A5] mt-1 font-serif italic">
                What are you putting on the calendar?
              </p>
            </div>
          </div>

          {/* Right: Glowing Brass Lantern and Close Button */}
          <div className="flex items-center gap-4 relative">
            <GlowingBrassLantern className="h-16 w-14 shrink-0" />

            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-lg bg-[#041122]/90 border border-[#8C6D37] text-[#DFBE77] hover:text-[#FFF4D4] hover:bg-[#071D3D] hover:border-[#DFBE77] flex items-center justify-center transition-all shadow-[0_4px_12px_rgba(0,0,0,0.8)] cursor-pointer"
              title="Close Dispatch"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

      {/* ── 2. MODE NAVIGATION (6 EXPANSIVE TABS ACROSS FULL WIDTH) ── */}
      <div className="px-6 sm:px-8 py-3 bg-[#010B1E]/95 border-b border-[#1A3358] relative z-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Tab 1: MEETINGS */}
          <button
            type="button"
            onClick={() => setActiveMode("MEETINGS")}
            className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
              activeMode === "MEETINGS"
                ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] border-[#FFE394] font-bold shadow-[0_4px_18px_rgba(197,160,89,0.4)] ring-1 ring-[#FFE394]/70 scale-[1.01]"
                : "bg-[#031126]/90 text-[#DFD0B5] border-[#182C48] hover:border-[#C5A059]/60 hover:bg-[#061836] shadow-sm"
            }`}
          >
            <CalendarIcon
              className={`w-5 h-5 shrink-0 ${
                activeMode === "MEETINGS" ? "text-[#000820]" : "text-[#C5A059]"
              }`}
            />
            <div className="min-w-0">
              <div
                className={`text-xs font-bold uppercase tracking-wider truncate ${
                  activeMode === "MEETINGS" ? "text-[#000820]" : "text-[#FFF4D4]"
                }`}
              >
                MEETINGS
              </div>
              <div
                className={`text-[11px] truncate ${
                  activeMode === "MEETINGS" ? "text-[#1A1408]" : "text-[#8E9EB8]"
                }`}
              >
                School Meetings
              </div>
            </div>
          </button>

          {/* Tab 2: CLIENT SESSIONS */}
          <button
            type="button"
            onClick={() => setActiveMode("CLIENT_SESSIONS")}
            className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
              activeMode === "CLIENT_SESSIONS"
                ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] border-[#FFE394] font-bold shadow-[0_4px_18px_rgba(197,160,89,0.4)] ring-1 ring-[#FFE394]/70 scale-[1.01]"
                : "bg-[#031126]/90 text-[#DFD0B5] border-[#182C48] hover:border-[#C5A059]/60 hover:bg-[#061836] shadow-sm"
            }`}
          >
            <PhoneCall
              className={`w-5 h-5 shrink-0 ${
                activeMode === "CLIENT_SESSIONS" ? "text-[#000820]" : "text-[#C5A059]"
              }`}
            />
            <div className="min-w-0">
              <div
                className={`text-xs font-bold uppercase tracking-wider truncate ${
                  activeMode === "CLIENT_SESSIONS"
                    ? "text-[#000820]"
                    : "text-[#FFF4D4]"
                }`}
              >
                CLIENT SESSIONS
              </div>
              <div
                className={`text-[11px] truncate ${
                  activeMode === "CLIENT_SESSIONS"
                    ? "text-[#1A1408]"
                    : "text-[#8E9EB8]"
                }`}
              >
                With Families
              </div>
            </div>
          </button>

          {/* Tab 3: HOLDS */}
          <button
            type="button"
            onClick={() => setActiveMode("HOLDS")}
            className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
              activeMode === "HOLDS"
                ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] border-[#FFE394] font-bold shadow-[0_4px_18px_rgba(197,160,89,0.4)] ring-1 ring-[#FFE394]/70 scale-[1.01]"
                : "bg-[#031126]/90 text-[#DFD0B5] border-[#182C48] hover:border-[#C5A059]/60 hover:bg-[#061836] shadow-sm"
            }`}
          >
            <Clock
              className={`w-5 h-5 shrink-0 ${
                activeMode === "HOLDS" ? "text-[#000820]" : "text-[#C5A059]"
              }`}
            />
            <div className="min-w-0">
              <div
                className={`text-xs font-bold uppercase tracking-wider truncate ${
                  activeMode === "HOLDS" ? "text-[#000820]" : "text-[#FFF4D4]"
                }`}
              >
                HOLDS
              </div>
              <div
                className={`text-[11px] truncate ${
                  activeMode === "HOLDS" ? "text-[#1A1408]" : "text-[#8E9EB8]"
                }`}
              >
                Tentative Times
              </div>
            </div>
          </button>

          {/* Tab 4: BLOCKS */}
          <button
            type="button"
            onClick={() => setActiveMode("BLOCKS")}
            className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
              activeMode === "BLOCKS"
                ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] border-[#FFE394] font-bold shadow-[0_4px_18px_rgba(197,160,89,0.4)] ring-1 ring-[#FFE394]/70 scale-[1.01]"
                : "bg-[#031126]/90 text-[#DFD0B5] border-[#182C48] hover:border-[#C5A059]/60 hover:bg-[#061836] shadow-sm"
            }`}
          >
            <Ban
              className={`w-5 h-5 shrink-0 ${
                activeMode === "BLOCKS" ? "text-[#000820]" : "text-[#C5A059]"
              }`}
            />
            <div className="min-w-0">
              <div
                className={`text-xs font-bold uppercase tracking-wider truncate ${
                  activeMode === "BLOCKS" ? "text-[#000820]" : "text-[#FFF4D4]"
                }`}
              >
                BLOCKS
              </div>
              <div
                className={`text-[11px] truncate ${
                  activeMode === "BLOCKS" ? "text-[#1A1408]" : "text-[#8E9EB8]"
                }`}
              >
                Unavailable Time
              </div>
            </div>
          </button>

          {/* Tab 5: INTERNAL */}
          <button
            type="button"
            onClick={() => setActiveMode("INTERNAL")}
            className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
              activeMode === "INTERNAL"
                ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] border-[#FFE394] font-bold shadow-[0_4px_18px_rgba(197,160,89,0.4)] ring-1 ring-[#FFE394]/70 scale-[1.01]"
                : "bg-[#031126]/90 text-[#DFD0B5] border-[#182C48] hover:border-[#C5A059]/60 hover:bg-[#061836] shadow-sm"
            }`}
          >
            <Users
              className={`w-5 h-5 shrink-0 ${
                activeMode === "INTERNAL" ? "text-[#000820]" : "text-[#C5A059]"
              }`}
            />
            <div className="min-w-0">
              <div
                className={`text-xs font-bold uppercase tracking-wider truncate ${
                  activeMode === "INTERNAL" ? "text-[#000820]" : "text-[#FFF4D4]"
                }`}
              >
                INTERNAL
              </div>
              <div
                className={`text-[11px] truncate ${
                  activeMode === "INTERNAL" ? "text-[#1A1408]" : "text-[#8E9EB8]"
                }`}
              >
                Team Events
              </div>
            </div>
          </button>

          {/* Tab 6: BLUEPRINT */}
          <button
            type="button"
            onClick={() => setActiveMode("BLUEPRINT")}
            className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
              activeMode === "BLUEPRINT"
                ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] border-[#FFE394] font-bold shadow-[0_4px_18px_rgba(197,160,89,0.4)] ring-1 ring-[#FFE394]/70 scale-[1.01]"
                : "bg-[#031126]/90 text-[#DFD0B5] border-[#182C48] hover:border-[#C5A059]/60 hover:bg-[#061836] shadow-sm"
            }`}
          >
            <CalendarClock
              className={`w-5 h-5 shrink-0 ${
                activeMode === "BLUEPRINT" ? "text-[#000820]" : "text-[#C5A059]"
              }`}
            />
            <div className="min-w-0">
              <div
                className={`text-xs font-bold uppercase tracking-wider truncate ${
                  activeMode === "BLUEPRINT" ? "text-[#000820]" : "text-[#FFF4D4]"
                }`}
              >
                BLUEPRINT
              </div>
              <div
                className={`text-[11px] truncate ${
                  activeMode === "BLUEPRINT" ? "text-[#1A1408]" : "text-[#8E9EB8]"
                }`}
              >
                Auto-Schedule Tasks
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* ── 3. MAIN WORKSPACE (LEFT FORM + RIGHT PARCHMENT CARD) ── */}
      <div className="p-6 sm:p-8 flex flex-col lg:flex-row gap-6 relative z-10">
        {/* ── LEFT: FORM PANEL (EXPANSIVE WIDTH) ── */}
        <div className="flex-1 min-w-0 bg-[#020A1A]/95 border border-[#162A48] rounded-2xl p-6 shadow-2xl flex flex-col justify-between">
          {/* ──────────────────────────────────────────────────────── */}
          {/* MODE 1: MEETINGS                                        */}
          {/* ──────────────────────────────────────────────────────── */}
          {activeMode === "MEETINGS" && (
            <form onSubmit={handleScheduleSchoolMeeting} className="space-y-6">
              {/* Header inside form */}
              <div className="flex items-center justify-between pb-3 border-b border-[#1A3358]">
                <div>
                  <h2 className="text-xl font-serif font-bold text-[#FFF4D4]">
                    Schedule a School Meeting
                  </h2>
                  <p className="text-xs sm:text-sm text-[#8E9EB8] mt-0.5">
                    School-facing meeting attended by Waypoint.
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[#081B36] border border-[#1D3E6B] text-xs text-[#8EB8EE]">
                  <Info className="w-3.5 h-3.5 text-[#8EB8EE]" />
                  <span>Select meeting type to view tailored options.</span>
                </div>
              </div>

              {/* 3 Columns of School Meeting options */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Column 1: IEP Meetings */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#DFBE77] uppercase tracking-wider px-1">
                    <BookOpen className="w-4 h-4" />
                    <span>IEP Meetings</span>
                  </div>
                  <div className="space-y-1.5">
                    {IEP_MEETINGS.map((option) => {
                      const isSelected = meetingType === option.name;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => handleSelectMeetingType(option)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left text-xs sm:text-sm transition-all cursor-pointer ${
                            isSelected
                              ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold border-[#FFE394] shadow-[0_3px_12px_rgba(197,160,89,0.4)]"
                              : "bg-[#061833]/70 border-[#193A60] text-[#D8C7A5] hover:border-[#8C6D37] hover:bg-[#0A244C] hover:text-[#FFF4D4]"
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              isSelected
                                ? "border-[#07162B] bg-[#07162B]"
                                : "border-[#3A5B86] bg-[#020A17]"
                            }`}
                          >
                            {isSelected && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#DFBE77]" />
                            )}
                          </span>
                          <span className="truncate">{option.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Column 2: 504 Meetings */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#DFBE77] uppercase tracking-wider px-1">
                    <FileText className="w-4 h-4" />
                    <span>504 Meetings</span>
                  </div>
                  <div className="space-y-1.5">
                    {SECTION_504_MEETINGS.map((option) => {
                      const isSelected = meetingType === option.name;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => handleSelectMeetingType(option)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left text-xs sm:text-sm transition-all cursor-pointer ${
                            isSelected
                              ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold border-[#FFE394] shadow-[0_3px_12px_rgba(197,160,89,0.4)]"
                              : "bg-[#061833]/70 border-[#193A60] text-[#D8C7A5] hover:border-[#8C6D37] hover:bg-[#0A244C] hover:text-[#FFF4D4]"
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              isSelected
                                ? "border-[#07162B] bg-[#07162B]"
                                : "border-[#3A5B86] bg-[#020A17]"
                            }`}
                          >
                            {isSelected && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#DFBE77]" />
                            )}
                          </span>
                          <span className="truncate">{option.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Column 3: Other School Meetings */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#DFBE77] uppercase tracking-wider px-1">
                    <Users className="w-4 h-4" />
                    <span>Other School Meetings</span>
                  </div>
                  <div className="space-y-1.5">
                    {OTHER_SCHOOL_MEETINGS.map((option) => {
                      const isSelected = meetingType === option.name;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => handleSelectMeetingType(option)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left text-xs sm:text-sm transition-all cursor-pointer ${
                            isSelected
                              ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold border-[#FFE394] shadow-[0_3px_12px_rgba(197,160,89,0.4)]"
                              : "bg-[#061833]/70 border-[#193A60] text-[#D8C7A5] hover:border-[#8C6D37] hover:bg-[#0A244C] hover:text-[#FFF4D4]"
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              isSelected
                                ? "border-[#07162B] bg-[#07162B]"
                                : "border-[#3A5B86] bg-[#020A17]"
                            }`}
                          >
                            {isSelected && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#DFBE77]" />
                            )}
                          </span>
                          <span className="truncate">{option.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Fields Row 1 (Client, Student, Advocate) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-[#1A3358]">
                <div>
                  <Label className="text-xs font-bold text-[#C6B697] uppercase tracking-wider">
                    Client / Family *
                  </Label>
                  <Select value={mParentId} onValueChange={setMParentId}>
                    <SelectTrigger className="h-10 mt-1.5 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs sm:text-sm rounded-xl">
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
                  <Label className="text-xs font-bold text-[#C6B697] uppercase tracking-wider">
                    Student *
                  </Label>
                  <Select value={mStudentId} onValueChange={setMStudentId}>
                    <SelectTrigger className="h-10 mt-1.5 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs sm:text-sm rounded-xl">
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
                  <Label className="text-xs font-bold text-[#C6B697] uppercase tracking-wider">
                    Assigned Advocate *
                  </Label>
                  <Select value={mAdvocate} onValueChange={setMAdvocate}>
                    <SelectTrigger className="h-10 mt-1.5 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs sm:text-sm rounded-xl">
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

              {/* Fields Row 2 (Date, Start Time, Expected Duration) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs font-bold text-[#C6B697] uppercase tracking-wider">
                    Date *
                  </Label>
                  <Input
                    type="date"
                    value={mDate}
                    onChange={(e) => setMDate(e.target.value)}
                    className="h-10 mt-1.5 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs sm:text-sm rounded-xl"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold text-[#C6B697] uppercase tracking-wider">
                    Start Time *
                  </Label>
                  <Input
                    type="time"
                    value={mStartTime}
                    onChange={(e) => setMStartTime(e.target.value)}
                    className="h-10 mt-1.5 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs sm:text-sm rounded-xl"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold text-[#C6B697] uppercase tracking-wider">
                    Expected Duration
                  </Label>
                  <Select
                    value={String(mDuration)}
                    onValueChange={(v) => setMDuration(Number(v))}
                  >
                    <SelectTrigger className="h-10 mt-1.5 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs sm:text-sm rounded-xl">
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

              {/* Bottom Row */}
              <div className="flex items-center justify-between pt-4 border-t border-[#1A3358]">
                <button
                  type="button"
                  onClick={() => setIsNotesOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#1D3557] bg-[#020A17] text-xs sm:text-sm text-[#C6B697] hover:text-[#FFF4D4] hover:bg-[#07162B] transition-colors"
                >
                  <FileText className="w-4 h-4 text-[#C5A059]" />
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
                  className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] font-bold text-sm sm:text-base px-8 h-11 rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.6)] hover:brightness-110 active:scale-[0.98] transition-all flex items-center gap-2.5"
                >
                  <CalendarIcon className="w-5 h-5 text-[#000820]" />
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
            <form onSubmit={handleScheduleClientSession} className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-[#1A3358]">
                <div>
                  <h2 className="text-xl font-serif font-bold text-[#FFF4D4]">
                    Schedule a Client Session
                  </h2>
                  <p className="text-xs sm:text-sm text-[#8E9EB8] mt-0.5">
                    Direct consultation, strategy, and debriefing sessions with families.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
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
                      className={`flex flex-col p-4 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "bg-gradient-to-r from-[#C5A059]/25 via-[#DFBE77]/30 to-[#C5A059]/15 border-[#DFBE77] text-[#FFF4D4] shadow-[0_0_12px_rgba(223,190,119,0.25)]"
                          : "bg-[#051630]/70 border-[#152B4E] text-[#B8C8DF] hover:border-[#2A4C7E] hover:bg-[#081F42]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs sm:text-sm truncate">
                          {opt.name}
                        </span>
                        <span className="text-[11px] font-mono text-[#C5A059]">
                          {opt.typicalDuration}
                        </span>
                      </div>
                      <p className="text-xs text-[#8E9EB8] mt-2 line-clamp-2 leading-relaxed">
                        {opt.description}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-[#1A3358]">
                <div>
                  <Label className="text-xs font-bold text-[#C6B697] uppercase tracking-wider">
                    Client / Family *
                  </Label>
                  <Select value={csParentId} onValueChange={setCsParentId}>
                    <SelectTrigger className="h-10 mt-1.5 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs sm:text-sm rounded-xl">
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
                  <Label className="text-xs font-bold text-[#C6B697] uppercase tracking-wider">
                    Student (If Applicable)
                  </Label>
                  <Select value={csStudentId} onValueChange={setCsStudentId}>
                    <SelectTrigger className="h-10 mt-1.5 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs sm:text-sm rounded-xl">
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
                  <Label className="text-xs font-bold text-[#C6B697] uppercase tracking-wider">
                    Assigned Team Member *
                  </Label>
                  <Select value={csAdvocate} onValueChange={setCsAdvocate}>
                    <SelectTrigger className="h-10 mt-1.5 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs sm:text-sm rounded-xl">
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs font-bold text-[#C6B697] uppercase tracking-wider">
                    Date *
                  </Label>
                  <Input
                    type="date"
                    value={csDate}
                    onChange={(e) => setCsDate(e.target.value)}
                    className="h-10 mt-1.5 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs sm:text-sm rounded-xl"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold text-[#C6B697] uppercase tracking-wider">
                    Start Time *
                  </Label>
                  <Input
                    type="time"
                    value={csStartTime}
                    onChange={(e) => setCsStartTime(e.target.value)}
                    className="h-10 mt-1.5 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs sm:text-sm rounded-xl"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold text-[#C6B697] uppercase tracking-wider">
                    Expected Duration
                  </Label>
                  <Select
                    value={String(csDuration)}
                    onValueChange={(v) => setCsDuration(Number(v))}
                  >
                    <SelectTrigger className="h-10 mt-1.5 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs sm:text-sm rounded-xl">
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

              <div className="flex items-center justify-between pt-4 border-t border-[#1A3358]">
                <button
                  type="button"
                  onClick={() => setIsNotesOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#1D3557] bg-[#020A17] text-xs sm:text-sm text-[#C6B697] hover:text-[#FFF4D4] hover:bg-[#07162B] transition-colors"
                >
                  <FileText className="w-4 h-4 text-[#C5A059]" />
                  <span>{csNotes ? "Edit Notes" : "+ Add Notes (Optional)"}</span>
                </button>

                <Button
                  type="submit"
                  disabled={createAppointmentMutation.isPending}
                  className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] font-bold text-sm sm:text-base px-8 h-11 rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.6)] hover:brightness-110 active:scale-[0.98] transition-all flex items-center gap-2.5"
                >
                  <PhoneCall className="w-5 h-5 text-[#000820]" />
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
          {/* MODE 3: HOLDS                                           */}
          {/* ──────────────────────────────────────────────────────── */}
          {activeMode === "HOLDS" && (
            <form onSubmit={handlePlaceHolds} className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-[#1A3358]">
                <div>
                  <h2 className="text-xl font-serif font-bold text-[#FFF4D4]">
                    Tentative Holds
                  </h2>
                  <p className="text-xs sm:text-sm text-[#8E9EB8] mt-0.5">
                    Reserve multiple proposed times while the family and school decide.
                  </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#081B36] border border-[#1D3E6B] text-xs text-[#8EB8EE]">
                  <Clock className="w-3.5 h-3.5 text-[#8EB8EE]" />
                  <span>One unified hold group: confirming one releases all siblings.</span>
                </div>
              </div>

              {/* Fields Row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs font-bold text-[#C6B697] uppercase tracking-wider">
                    Client / Family *
                  </Label>
                  <Select value={hParentId} onValueChange={setHParentId}>
                    <SelectTrigger className="h-10 mt-1.5 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs sm:text-sm rounded-xl">
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
                  <Label className="text-xs font-bold text-[#C6B697] uppercase tracking-wider">
                    Student *
                  </Label>
                  <Select value={hStudentId} onValueChange={setHStudentId}>
                    <SelectTrigger className="h-10 mt-1.5 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs sm:text-sm rounded-xl">
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
                  <Label className="text-xs font-bold text-[#C6B697] uppercase tracking-wider">
                    Meeting Type
                  </Label>
                  <Select value={hMeetingType} onValueChange={setHMeetingType}>
                    <SelectTrigger className="h-10 mt-1.5 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs sm:text-sm rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#05142B] border-[#1D3557] text-[#FFF4D4]">
                      <SelectItem value="Annual IEP Meeting">Annual IEP Meeting</SelectItem>
                      <SelectItem value="Triennial Re-evaluation / MET">Triennial Re-evaluation / MET</SelectItem>
                      <SelectItem value="Initial IEP / Eligibility">Initial IEP / Eligibility</SelectItem>
                      <SelectItem value="IEP Amendment / Addendum">IEP Amendment / Addendum</SelectItem>
                      <SelectItem value="504 Annual / Review">504 Annual / Review</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-bold text-[#C6B697] uppercase tracking-wider">
                    Assigned Advocate *
                  </Label>
                  <Select value={hAdvocate} onValueChange={setHAdvocate}>
                    <SelectTrigger className="h-10 mt-1.5 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs sm:text-sm rounded-xl">
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

              {/* Candidate Hold Slots */}
              <div className="bg-[#031126] border border-[#183152] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#DFBE77] uppercase tracking-wider">
                    Proposed Candidate Time Slots ({hCandidateSlots.length})
                  </span>
                  <button
                    type="button"
                    onClick={addHoldOption}
                    className="flex items-center gap-1.5 text-xs text-[#FFE394] hover:text-[#FFF4D4] font-semibold transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Another Option</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {hCandidateSlots.map((slot, index) => (
                    <div
                      key={slot.id}
                      className="flex flex-col sm:flex-row items-center gap-3 bg-[#020A17] border border-[#1F3C64] rounded-xl p-3"
                    >
                      <span className="w-24 font-bold text-xs text-[#C5A059] uppercase shrink-0">
                        Option {index + 1}
                      </span>
                      <div className="flex flex-1 items-center gap-3 w-full">
                        <Input
                          type="date"
                          value={slot.date}
                          onChange={(e) => {
                            const val = e.target.value;
                            setHCandidateSlots((prev) =>
                              prev.map((s) => (s.id === slot.id ? { ...s, date: val } : s))
                            );
                          }}
                          className="h-9 bg-[#05142B] border-[#223E66] text-[#FFF4D4] text-xs sm:text-sm rounded-lg"
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
                          className="h-9 w-32 bg-[#05142B] border-[#223E66] text-[#FFF4D4] text-xs sm:text-sm rounded-lg"
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
                          <SelectTrigger className="h-9 w-32 bg-[#05142B] border-[#223E66] text-[#FFF4D4] text-xs sm:text-sm rounded-lg">
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
                          className="text-[#E57373] hover:text-[#FF8A80] transition-colors p-1.5"
                          title="Remove option"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs text-[#8E9EB8] pt-3 border-t border-[#183152]">
                  <div className="flex items-center gap-2">
                    <span>Waiting On:</span>
                    <Select value={hWaitingOn} onValueChange={(v: any) => setHWaitingOn(v)}>
                      <SelectTrigger className="h-8 w-36 bg-[#020A17] border-[#1A3355] text-xs text-[#FFF4D4]">
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
                      className="h-8 w-36 bg-[#020A17] border-[#1A3355] text-xs text-[#FFF4D4]"
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Row */}
              <div className="flex items-center justify-between pt-4 border-t border-[#1A3358]">
                <button
                  type="button"
                  onClick={() => setIsNotesOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#1D3557] bg-[#020A17] text-xs sm:text-sm text-[#C6B697] hover:text-[#FFF4D4] hover:bg-[#07162B] transition-colors"
                >
                  <FileText className="w-4 h-4 text-[#C5A059]" />
                  <span>{hNotes ? "Edit Hold Notes" : "+ Add Notes (Optional)"}</span>
                </button>

                <Button
                  type="submit"
                  disabled={createProposedMeetingMutation.isPending}
                  className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] font-bold text-sm sm:text-base px-8 h-11 rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.6)] hover:brightness-110 active:scale-[0.98] transition-all flex items-center gap-2.5"
                >
                  <Clock className="w-5 h-5 text-[#000820]" />
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
          {/* MODE 4: BLOCKS                                          */}
          {/* ──────────────────────────────────────────────────────── */}
          {activeMode === "BLOCKS" && (
            <form onSubmit={handleBlockTimeSubmit} className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-[#1A3358]">
                <div>
                  <h2 className="text-xl font-serif font-bold text-[#FFF4D4]">
                    Block Calendar Time
                  </h2>
                  <p className="text-xs sm:text-sm text-[#8E9EB8] mt-0.5">
                    Why is this time unavailable?
                  </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#081B36] border border-[#1D3E6B] text-xs text-[#8EB8EE]">
                  <Ban className="w-3.5 h-3.5 text-[#8EB8EE]" />
                  <span>Enforces scheduling availability on client booking portals.</span>
                </div>
              </div>

              {/* 4 Choices */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
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
                      className={`flex flex-col p-4 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "bg-gradient-to-r from-[#C5A059]/25 via-[#DFBE77]/30 to-[#C5A059]/15 border-[#DFBE77] text-[#FFF4D4] shadow-[0_0_12px_rgba(223,190,119,0.25)]"
                          : "bg-[#051630]/70 border-[#152B4E] text-[#B8C8DF] hover:border-[#2A4C7E] hover:bg-[#081F42]"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
                        <IconComp className="w-4 h-4 text-[#DFBE77]" />
                        <span className="truncate">{cat.title}</span>
                      </div>
                      <span className="text-xs text-[#8E9EB8] mt-1 truncate">
                        {cat.sub}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Sub-Form Container */}
              <div className="bg-[#031126] border border-[#183152] rounded-2xl p-5 space-y-4">
                {blockCategory === "OFFICE_CLOSED" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs font-bold text-[#C6B697] uppercase tracking-wider">
                        Closure Reason
                      </Label>
                      <Select
                        value={bSubReason}
                        onValueChange={(v) => {
                          setBSubReason(v);
                          setBTitle(`Office Closed — ${v}`);
                        }}
                      >
                        <SelectTrigger className="h-10 mt-1.5 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs sm:text-sm rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#05142B] border-[#1D3557] text-[#FFF4D4]">
                          {BLOCK_REASONS.OFFICE_CLOSED.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="md:col-span-2">
                      <Label className="text-xs font-bold text-[#C6B697] uppercase tracking-wider">
                        Display Title
                      </Label>
                      <Input
                        value={bTitle}
                        onChange={(e) => setBTitle(e.target.value)}
                        placeholder="e.g. Office Closed — Labor Day Holiday"
                        className="h-10 mt-1.5 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs sm:text-sm rounded-xl"
                      />
                    </div>
                  </div>
                )}

                {blockCategory === "PERSONAL_BLACKOUT" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs font-bold text-[#C6B697] uppercase tracking-wider">
                        Team Member *
                      </Label>
                      <Select value={bStaff} onValueChange={setBStaff}>
                        <SelectTrigger className="h-10 mt-1.5 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs sm:text-sm rounded-xl">
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

                    <div>
                      <Label className="text-xs font-bold text-[#C6B697] uppercase tracking-wider">
                        Blackout Category
                      </Label>
                      <Select value={bSubReason} onValueChange={setBSubReason}>
                        <SelectTrigger className="h-10 mt-1.5 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs sm:text-sm rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#05142B] border-[#1D3557] text-[#FFF4D4]">
                          {BLOCK_REASONS.PERSONAL_BLACKOUT.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-[#C6B697] uppercase tracking-wider">
                        Enforcement
                      </Label>
                      <Select
                        value={bEnforcement}
                        onValueChange={(v: any) => setBEnforcement(v)}
                      >
                        <SelectTrigger className="h-10 mt-1.5 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs sm:text-sm rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#05142B] border-[#1D3557] text-[#FFF4D4]">
                          <SelectItem value="HARD_BLOCK">
                            Hard Block (Prevent Booking)
                          </SelectItem>
                          <SelectItem value="SOFT_BLOCK">
                            Soft Block (Warning Only)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {blockCategory === "AVAILABILITY_BLOCK" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs font-bold text-[#C6B697] uppercase tracking-wider">
                        Protection Type
                      </Label>
                      <Select value={bSubReason} onValueChange={setBSubReason}>
                        <SelectTrigger className="h-10 mt-1.5 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs sm:text-sm rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#05142B] border-[#1D3557] text-[#FFF4D4]">
                          {BLOCK_REASONS.AVAILABILITY_BLOCK.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-[#C6B697] uppercase tracking-wider">
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
                        <SelectTrigger className="h-10 mt-1.5 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs sm:text-sm rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#05142B] border-[#1D3557] text-[#FFF4D4]">
                          <SelectItem value="ALL">Entire Company / All Staff</SelectItem>
                          {advocateList.map((adv) => (
                            <SelectItem key={adv.id} value={adv.name}>
                              {adv.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-[#C6B697] uppercase tracking-wider">
                        Effect on Clients
                      </Label>
                      <div className="mt-3 text-xs text-[#8EB8EE] flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#DFBE77]" />
                        <span>Hides time slots on client booking portal</span>
                      </div>
                    </div>
                  </div>
                )}

                {blockCategory === "RECURRING_BLOCK" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs font-bold text-[#C6B697] uppercase tracking-wider">
                        Recurring Pattern
                      </Label>
                      <Select value={bRecurrence} onValueChange={setBRecurrence}>
                        <SelectTrigger className="h-10 mt-1.5 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs sm:text-sm rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#05142B] border-[#1D3557] text-[#FFF4D4]">
                          {BLOCK_REASONS.RECURRING_BLOCK.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-[#C6B697] uppercase tracking-wider">
                        Staff Member
                      </Label>
                      <Select value={bStaff} onValueChange={setBStaff}>
                        <SelectTrigger className="h-10 mt-1.5 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs sm:text-sm rounded-xl">
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

                    <div>
                      <Label className="text-xs font-bold text-[#C6B697] uppercase tracking-wider">
                        Recurrence Frequency
                      </Label>
                      <div className="mt-3 text-xs text-[#C6B697]">
                        Repeats Weekly on{" "}
                        {new Date(bStartDate).toLocaleDateString("en-US", {
                          weekday: "long",
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Dates & Times */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4 border-t border-[#183152] items-end">
                  <div>
                    <Label className="text-xs font-bold text-[#C6B697] uppercase tracking-wider">
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
                      className="h-10 mt-1.5 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs sm:text-sm rounded-xl"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-[#C6B697] uppercase tracking-wider">
                      End Date
                    </Label>
                    <Input
                      type="date"
                      value={bEndDate}
                      onChange={(e) => setBEndDate(e.target.value)}
                      className="h-10 mt-1.5 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs sm:text-sm rounded-xl"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-[#C6B697] uppercase tracking-wider">
                        All Day
                      </Label>
                      <Checkbox
                        checked={bIsAllDay}
                        onCheckedChange={(c) => setBIsAllDay(Boolean(c))}
                        className="border-[#DFBE77] data-[state=checked]:bg-[#DFBE77] data-[state=checked]:text-[#000820]"
                      />
                    </div>
                    <div className="text-xs text-[#8E9EB8] mt-1">
                      {bIsAllDay ? "Entire 24-hr day" : "Specific hours"}
                    </div>
                  </div>

                  {!bIsAllDay && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={bStartTime}
                        onChange={(e) => setBStartTime(e.target.value)}
                        className="h-10 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs rounded-xl"
                      />
                      <span className="text-xs text-[#8E9EB8]">–</span>
                      <Input
                        type="time"
                        value={bEndTime}
                        onChange={(e) => setBEndTime(e.target.value)}
                        className="h-10 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs rounded-xl"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Row */}
              <div className="flex items-center justify-between pt-4 border-t border-[#1A3358]">
                <button
                  type="button"
                  onClick={() => setIsNotesOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#1D3557] bg-[#020A17] text-xs sm:text-sm text-[#C6B697] hover:text-[#FFF4D4] hover:bg-[#07162B] transition-colors"
                >
                  <FileText className="w-4 h-4 text-[#C5A059]" />
                  <span>{bNotes ? "Edit Reason Notes" : "+ Add Reason Notes (Optional)"}</span>
                </button>

                <Button
                  type="submit"
                  disabled={createOperationalBlockMutation.isPending}
                  className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] font-bold text-sm sm:text-base px-8 h-11 rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.6)] hover:brightness-110 active:scale-[0.98] transition-all flex items-center gap-2.5"
                >
                  <Ban className="w-5 h-5 text-[#000820]" />
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
          {/* MODE 5: INTERNAL                                        */}
          {/* ──────────────────────────────────────────────────────── */}
          {activeMode === "INTERNAL" && (
            <form onSubmit={handleInternalEventSubmit} className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-[#1A3358]">
                <div>
                  <h2 className="text-xl font-serif font-bold text-[#FFF4D4]">
                    Schedule Internal Event
                  </h2>
                  <p className="text-xs sm:text-sm text-[#8E9EB8] mt-0.5">
                    Internal team synchronization, supervision, and operations.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
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
                      className={`px-3 py-2.5 rounded-xl border text-center text-xs sm:text-sm transition-all ${
                        isSelected
                          ? "bg-gradient-to-r from-[#C5A059]/25 via-[#DFBE77]/30 to-[#C5A059]/15 border-[#DFBE77] text-[#FFF4D4] font-bold shadow-[0_0_12px_rgba(223,190,119,0.25)]"
                          : "bg-[#051630]/70 border-[#152B4E] text-[#B8C8DF] hover:border-[#2A4C7E] hover:bg-[#081F42]"
                      }`}
                    >
                      <span className="truncate block">{t}</span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-[#1A3358]">
                <div className="md:col-span-2">
                  <Label className="text-xs font-bold text-[#C6B697] uppercase tracking-wider">
                    Event Title *
                  </Label>
                  <Input
                    value={ieTitle}
                    onChange={(e) => setIeTitle(e.target.value)}
                    placeholder="e.g. Weekly Advocacy Sync"
                    className="h-10 mt-1.5 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs sm:text-sm rounded-xl"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold text-[#C6B697] uppercase tracking-wider">
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
                    <SelectTrigger className="h-10 mt-1.5 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs sm:text-sm rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#05142B] border-[#1D3557] text-[#FFF4D4]">
                      <SelectItem value="ALL">All Team Members (Entire Staff)</SelectItem>
                      {advocateList.map((adv) => (
                        <SelectItem key={adv.id} value={adv.name}>
                          {adv.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs font-bold text-[#C6B697] uppercase tracking-wider">
                    Date *
                  </Label>
                  <Input
                    type="date"
                    value={ieDate}
                    onChange={(e) => setIeDate(e.target.value)}
                    className="h-10 mt-1.5 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs sm:text-sm rounded-xl"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold text-[#C6B697] uppercase tracking-wider">
                    Start Time *
                  </Label>
                  <Input
                    type="time"
                    value={ieStartTime}
                    onChange={(e) => setIeStartTime(e.target.value)}
                    className="h-10 mt-1.5 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs sm:text-sm rounded-xl"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold text-[#C6B697] uppercase tracking-wider">
                    Duration
                  </Label>
                  <Select
                    value={String(ieDuration)}
                    onValueChange={(v) => setIeDuration(Number(v))}
                  >
                    <SelectTrigger className="h-10 mt-1.5 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs sm:text-sm rounded-xl">
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
                  <Label className="text-xs font-bold text-[#C6B697] uppercase tracking-wider">
                    Blocks Client Scheduling
                  </Label>
                  <div className="flex items-center gap-3 mt-2.5">
                    <button
                      type="button"
                      onClick={() => setIeBlocksClientScheduling(true)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        ieBlocksClientScheduling
                          ? "bg-[#DFBE77] text-[#000820] shadow-sm"
                          : "bg-[#05142B] text-[#8E9EB8] border border-[#1D3557]"
                      }`}
                    >
                      YES
                    </button>
                    <button
                      type="button"
                      onClick={() => setIeBlocksClientScheduling(false)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        !ieBlocksClientScheduling
                          ? "bg-[#DFBE77] text-[#000820] shadow-sm"
                          : "bg-[#05142B] text-[#8E9EB8] border border-[#1D3557]"
                      }`}
                    >
                      NO
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[#1A3358]">
                <button
                  type="button"
                  onClick={() => setIsNotesOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#1D3557] bg-[#020A17] text-xs sm:text-sm text-[#C6B697] hover:text-[#FFF4D4] hover:bg-[#07162B] transition-colors"
                >
                  <FileText className="w-4 h-4 text-[#C5A059]" />
                  <span>{ieNotes ? "Edit Agenda Notes" : "+ Add Agenda Notes (Optional)"}</span>
                </button>

                <Button
                  type="submit"
                  disabled={createOperationalBlockMutation.isPending}
                  className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] font-bold text-sm sm:text-base px-8 h-11 rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.6)] hover:brightness-110 active:scale-[0.98] transition-all flex items-center gap-2.5"
                >
                  <Users className="w-5 h-5 text-[#000820]" />
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
          {/* MODE 6: BLUEPRINT                                       */}
          {/* ──────────────────────────────────────────────────────── */}
          {activeMode === "BLUEPRINT" && (
            <form onSubmit={handleBlueprintSubmit} className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-[#1A3358]">
                <div>
                  <h2 className="text-xl font-serif font-bold text-[#FFF4D4]">
                    Scheduling Blueprint
                  </h2>
                  <p className="text-xs sm:text-sm text-[#8E9EB8] mt-0.5">
                    Build the work timeline around a major advocacy milestone.
                  </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#081B36] border border-[#1D3E6B] text-xs text-[#8EB8EE]">
                  <Sparkles className="w-3.5 h-3.5 text-[#DFBE77]" />
                  <span>Connected workflow timeline around Primary Meeting date.</span>
                </div>
              </div>

              {/* Blueprint Setup */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs font-bold text-[#C6B697] uppercase tracking-wider">
                    Client / Family *
                  </Label>
                  <Select value={bpParentId} onValueChange={setBpParentId}>
                    <SelectTrigger className="h-10 mt-1.5 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs sm:text-sm rounded-xl">
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
                  <Label className="text-xs font-bold text-[#C6B697] uppercase tracking-wider">
                    Student *
                  </Label>
                  <Select value={bpStudentId} onValueChange={setBpStudentId}>
                    <SelectTrigger className="h-10 mt-1.5 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs sm:text-sm rounded-xl">
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
                  <Label className="text-xs font-bold text-[#C6B697] uppercase tracking-wider">
                    Primary Meeting Date *
                  </Label>
                  <Input
                    type="date"
                    value={bpMeetingDate}
                    onChange={(e) => setBpMeetingDate(e.target.value)}
                    className="h-10 mt-1.5 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs sm:text-sm rounded-xl"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold text-[#C6B697] uppercase tracking-wider">
                    Meeting Time *
                  </Label>
                  <Input
                    type="time"
                    value={bpStartTime}
                    onChange={(e) => setBpStartTime(e.target.value)}
                    className="h-10 mt-1.5 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs sm:text-sm rounded-xl"
                  />
                </div>
              </div>

              {/* Connected Timeline Preview */}
              <div className="bg-[#031126] border border-[#183152] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#DFBE77] uppercase tracking-wider">
                    ANNUAL IEP BLUEPRINT TIMELINE PREVIEW
                  </span>
                  <span className="text-xs text-[#8E9EB8]">
                    Toggle items on/off before creating
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                  {bpMilestones.map((m, idx) => (
                    <div
                      key={m.label}
                      onClick={() => toggleMilestone(idx)}
                      className={`cursor-pointer p-3 rounded-xl border flex flex-col justify-between transition-all ${
                        m.checked
                          ? m.dayOffset === 0
                            ? "bg-gradient-to-b from-[#C5A059]/35 to-[#9E7D3B]/25 border-[#DFBE77] text-[#FFF4D4] shadow-md ring-1 ring-[#DFBE77]"
                            : "bg-[#051630] border-[#1F3D6B] text-[#FFF4D4]"
                          : "bg-[#020A17]/60 border-[#152B4E]/60 text-[#5A6D88] opacity-60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[11px] font-bold uppercase tracking-wider ${
                            m.dayOffset === 0 ? "text-[#DFBE77]" : "text-[#C5A059]"
                          }`}
                        >
                          {m.label}
                        </span>
                        <Checkbox
                          checked={m.checked}
                          onCheckedChange={() => toggleMilestone(idx)}
                          className="w-4 h-4 border-[#C5A059] data-[state=checked]:bg-[#DFBE77] data-[state=checked]:text-[#000820]"
                        />
                      </div>
                      <div className="my-2">
                        <div className="font-bold text-xs sm:text-sm leading-tight line-clamp-1">
                          {m.title}
                        </div>
                        <div className="text-[11px] text-[#8E9EB8] mt-0.5 font-mono">
                          {getMilestoneCalculatedDate(m.dayOffset)}
                        </div>
                      </div>
                      <p className="text-[10px] text-[#A69371] line-clamp-2 leading-tight">
                        {m.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Row */}
              <div className="flex items-center justify-between pt-4 border-t border-[#1A3358]">
                <div className="text-xs sm:text-sm text-[#8E9EB8]">
                  Creates Primary Meeting +{" "}
                  {bpMilestones.filter((m) => m.checked).length} connected timeline tasks
                </div>

                <Button
                  type="submit"
                  disabled={createAppointmentMutation.isPending}
                  className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] font-bold text-sm sm:text-base px-8 h-11 rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.6)] hover:brightness-110 active:scale-[0.98] transition-all flex items-center gap-2.5"
                >
                  <Sparkles className="w-5 h-5 text-[#000820]" />
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

        {/* ── RIGHT: AUTHENTIC PARCHMENT CARD (MATCHES MOCKUP EXACTLY) ── */}
        <div className="w-full lg:w-[380px] xl:w-[420px] 2xl:w-[460px] shrink-0 rounded-2xl overflow-hidden shadow-2xl flex flex-col border-2 border-[#4A3B22]">
          {/* Header banner */}
          <div className="bg-[#061730] border-b border-[#3A2C18] px-4 py-2.5 text-[#FFE394] font-serif font-bold text-sm flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-[#DFBE77]" />
            <span className="tracking-wide">{activeContextualData.badgeHeader}</span>
          </div>

          <div
            className="flex-1 bg-[#F3E7C4] text-[#1E1A11] p-5 sm:p-6 flex flex-col justify-between overflow-hidden relative"
            style={{
              backgroundImage: "url('/decor/fine-parchment.jpg')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div>
              {/* Title & Description */}
              <div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-[#2C210E] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-serif font-bold text-sm sm:text-base text-[#1E170A] leading-snug">
                      {activeContextualData.title}
                    </h3>
                    <p className="text-xs text-[#4F4129] mt-1.5 leading-relaxed font-sans">
                      {activeContextualData.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Typical Duration */}
              <div className="mt-4 pt-3 border-t border-[#D6C498]/70">
                <div className="flex items-center gap-2 text-xs font-bold text-[#1E170A]">
                  <Clock className="w-4 h-4 text-[#2C210E]" />
                  <span>Typical Duration</span>
                </div>
                <p className="text-xs text-[#4F4129] mt-1 ml-6 font-semibold">
                  {activeContextualData.typicalDuration}
                </p>
              </div>

              {/* Waypoint Role */}
              <div className="mt-4 pt-3 border-t border-[#D6C498]/70">
                <div className="flex items-center gap-2 text-xs font-bold text-[#1E170A]">
                  <Users className="w-4 h-4 text-[#2C210E]" />
                  <span>Waypoint Role</span>
                </div>
                <p className="text-xs text-[#4F4129] mt-1 ml-6 leading-relaxed">
                  {activeContextualData.waypointRole}
                </p>
              </div>

              {/* Checklist */}
              <div className="mt-4 pt-3 border-t border-[#D6C498]/70">
                <div className="flex items-center gap-2 text-xs font-bold text-[#1E170A] mb-2">
                  <FileText className="w-4 h-4 text-[#2C210E]" />
                  <span>Helpful Before the Meeting</span>
                </div>
                <div className="space-y-1.5 ml-2">
                  {activeContextualData.checklist.map((item, idx) => (
                    <label
                      key={idx}
                      className="flex items-start gap-2.5 text-xs text-[#473B25] leading-snug cursor-pointer hover:text-[#1E1A11]"
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

            {/* Stamp footer */}
            <div className="pt-4 mt-6 border-t border-[#D6C498] text-[10px] uppercase tracking-widest text-[#8A713E] font-bold text-center">
              Waypoint Special Education Advocacy Protocol
            </div>
          </div>
        </div>
      </div>

      {/* ── NOTES MODAL POPOVER ── */}
      {isNotesOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#05142B] border border-[#3A2C18] rounded-2xl w-full max-w-lg p-6 text-[#FFF4D4] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#142640] pb-3">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-[#DFBE77]" />
                <h3 className="font-serif text-lg font-bold text-[#FFF4D4]">
                  Add Meeting & Advocacy Notes
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNotesOpen(false)}
                className="text-[#C6B697] hover:text-[#FFF4D4]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <Label className="text-xs text-[#C6B697] uppercase tracking-wider font-bold">
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
                className="mt-1.5 h-28 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs sm:text-sm rounded-xl resize-none"
              />
            </div>

            {activeMode === "MEETINGS" && (
              <div>
                <Label className="text-xs text-[#DFBE77] uppercase tracking-wider font-bold">
                  Internal Strategy Notes (Private to Waypoint Advocates)
                </Label>
                <Textarea
                  value={mInternalNotes}
                  onChange={(e) => setMInternalNotes(e.target.value)}
                  placeholder="Enter confidential leverage points, target outcomes, and tactical notes..."
                  className="mt-1.5 h-24 bg-[#020A17] border-[#1D3557] text-[#FFF4D4] text-xs sm:text-sm rounded-xl resize-none"
                />
              </div>
            )}

            <div className="flex justify-end pt-3">
              <Button
                type="button"
                onClick={() => setIsNotesOpen(false)}
                className="bg-[#DFBE77] text-[#000820] font-bold text-xs sm:text-sm px-6 h-9 rounded-xl hover:brightness-110"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
