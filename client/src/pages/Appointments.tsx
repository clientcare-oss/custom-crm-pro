import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Calendar, Clock, ExternalLink, MapPin, Plus, Trash2, User, Video, X, Ban, Globe, AlertTriangle, ArrowRightLeft, UserCheck, ShieldAlert, CalendarClock, Layers, Eye, EyeOff, Filter } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import VoiceTextarea from "@/components/VoiceTextarea";
import VoiceInput from "@/components/VoiceInput";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import CalendarView, { CalendarViewMode, CalendarScope, CalendarLayerFilters } from "@/components/CalendarView";
import ReassignAppointmentModal from "@/components/calendar/ReassignAppointmentModal";
import StaffStatusManagerModal from "@/components/calendar/StaffStatusManagerModal";
import NationalCoverage from "./NationalCoverage";
import Scheduler from "./Scheduler";
import ClientCallingSafetyBadge from "@/components/callingSafety/ClientCallingSafetyBadge";
import HoldsNeedingAttentionCard from "@/components/calendar/HoldsNeedingAttentionCard";
import CreateProposedMeetingModal from "@/components/calendar/CreateProposedMeetingModal";
import ProposedMeetingDetailModal from "@/components/calendar/ProposedMeetingDetailModal";
import MasterScheduleModal, { ScheduleActionType } from "@/components/calendar/MasterScheduleModal";
import OperationalBlockDetailDrawer from "@/components/calendar/OperationalBlockDetailDrawer";
import { CalendarPatternLegendBar } from "@/components/calendar/CalendarPatternStyles";
import { ScopedErrorBoundary } from "@/components/ScopedErrorBoundary";
import PageIdBadge from "@/components/PageIdBadge";
import type { OperationalBlock } from "../../../drizzle/schema";
import { WaypointWaveIcon } from "@/components/portal/WaypointWavyBackdrop";
import { cn } from "@/lib/utils";
import {
  formatDualTimes,
  SIX_CORE_ZONES,
  getFriendlyTimeZoneName,
  detectTimeZoneFromLocation,
} from "@shared/timezones";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MEETING_TYPES = ["IEP Meeting", "1:1 with Advocate", "Progress Update", "Consultation", "Follow-up"];

function getServiceKeyForMeetingType(meetingType: string): string | null {
  const lower = (meetingType || "").toLowerCase();
  if (lower.includes("iep")) return "IEP_MEETING";
  if (lower.includes("504")) return "504_MEETING";
  if (lower.includes("record")) return "RECORDS_REVIEW";
  if (lower.includes("advocate") || lower.includes("1:1") || lower.includes("strategy")) return "ADVOCATE_SESSION";
  return null;
}

interface Appointment {
  id: number;
  clientId: number | null;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  location: string | null;
  videoLink?: string | null;
  clientMeetingLink?: string | null;
  meetingType?: string | null;
  parentName?: string | null;
  parentPhone?: string | null;
  studentName?: string | null;
  status: string;
  ownerId: number;
  clientTimeZone?: string | null;
  originalTimeZone?: string | null;
  schoolTimeZone?: string | null;
  assignedAdvocateName?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export default function Appointments() {
  const { user } = useAuth();
  
  // URL Query Parameters support for direct dashboard routing (e.g. /calendar?view=month&date=today&scope=my)
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const initialView =
    (searchParams.get("view") as CalendarViewMode) ||
    (typeof localStorage !== "undefined" && (localStorage.getItem("waypoint_calendar_view_mode") as CalendarViewMode)) ||
    "month";
  const initialScope = (searchParams.get("scope") as CalendarScope) || "my";
  const initialFilter = searchParams.get("advocate") || "all";
  const initialTab = searchParams.get("tab") === "coverage"
    ? "coverage"
    : searchParams.get("tab") === "session-types" || searchParams.get("tab") === "scheduler"
    ? "session-types"
    : "calendar";

  const [activeTab, setActiveTab] = useState<"calendar" | "session-types" | "coverage">(initialTab);

  const handleTabChange = (newTab: "calendar" | "session-types" | "coverage") => {
    setActiveTab(newTab);
    const url = new URL(window.location.href);
    if (newTab === "coverage") {
      url.searchParams.set("tab", "coverage");
    } else if (newTab === "session-types") {
      url.searchParams.set("tab", "session-types");
    } else {
      url.searchParams.delete("tab");
    }
    window.history.replaceState(null, "", url.toString());
  };

  const [viewMode, setViewMode] = useState<CalendarViewMode>(initialView);

  const handleViewModeChange = (mode: CalendarViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem("waypoint_calendar_view_mode", mode);
    } catch {}
  };
  const [scope, setScope] = useState<CalendarScope>(initialScope);
  const [selectedAdvocateFilter, setSelectedAdvocateFilter] = useState<string>(initialFilter);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [reassignApt, setReassignApt] = useState<any | null>(null);
  const [showStaffStatusModal, setShowStaffStatusModal] = useState<boolean>(false);

  const [showCreate, setShowCreate] = useState(false);
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [isEditingApt, setIsEditingApt] = useState(false);
  const [isDeletingApt, setIsDeletingApt] = useState(false);
  const [isCancellingApt, setIsCancellingApt] = useState(false);
  const [notifyParentOnCancel, setNotifyParentOnCancel] = useState(true);
  const [editAptData, setEditAptData] = useState<{
    title: string; description: string; startTime: string; endTime: string;
    location: string; videoLink: string; parentName: string; parentPhone: string;
    studentName: string; assignedAdvocateName: string; status: string; clientTimeZone: string;
  } | null>(null);

  const toLocalDateTimeInput = (dt: Date | string) => {
    const d = new Date(dt);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const openEditMode = (apt: Appointment) => {
    setEditAptData({
      title: apt.title,
      description: apt.description || '',
      startTime: toLocalDateTimeInput(apt.startTime),
      endTime: toLocalDateTimeInput(apt.endTime),
      location: apt.location || '',
      videoLink: apt.videoLink || '',
      parentName: apt.parentName || '',
      parentPhone: apt.parentPhone || '',
      studentName: apt.studentName || '',
      assignedAdvocateName: apt.assignedAdvocateName || 'Byron Honea',
      status: apt.status,
      clientTimeZone: apt.clientTimeZone || 'America/New_York',
    });
    setIsEditingApt(true);
  };

  // Auto-fill parent/student info and time zone from selected contact
  const autoFillFromContact = (contactId: string, setter: (fn: (prev: any) => any) => void) => {
    const id = parseInt(contactId);
    const contact = (contacts as any[]).find((c: any) => c.id === id);
    if (!contact) return;
    const isStudent = contact.jobTitle === 'Student';
    const detectedTz = contact.confirmedTimeZone || contact.timezone || (contact.state ? detectTimeZoneFromLocation(contact.city || "", contact.state).timeZone : "America/New_York");
    if (isStudent) {
      // Student selected: fill student name, then find parent for parent fields
      const parent = contact.parentContactId
        ? (contacts as any[]).find((c: any) => c.id === contact.parentContactId)
        : null;
      setter((prev: any) => ({
        ...prev,
        studentName: `${contact.firstName} ${contact.lastName}`,
        parentName: parent ? `${parent.firstName} ${parent.lastName}` : prev.parentName,
        parentPhone: parent ? (parent.phone || '') : prev.parentPhone,
        clientTimeZone: detectedTz || prev.clientTimeZone || "America/New_York",
      }));
    } else {
      // Parent/contact selected: fill parent fields
      setter((prev: any) => ({
        ...prev,
        parentName: `${contact.firstName} ${contact.lastName}`,
        parentPhone: contact.phone || '',
        clientTimeZone: detectedTz || prev.clientTimeZone || "America/New_York",
      }));
    }
  };

  const handleSaveEdit = () => {
    if (!selectedApt || !editAptData) return;
    if (!editAptData.title || !editAptData.startTime || !editAptData.endTime) {
      toast.error('Title, start time, and end time are required');
      return;
    }
    updateMutation.mutate({
      id: selectedApt.id,
      title: editAptData.title,
      description: editAptData.description || undefined,
      startTime: new Date(editAptData.startTime),
      endTime: new Date(editAptData.endTime),
      location: editAptData.location || undefined,
      videoLink: editAptData.videoLink || undefined,
      parentName: editAptData.parentName || undefined,
      parentPhone: editAptData.parentPhone || undefined,
      studentName: editAptData.studentName || undefined,
      assignedAdvocateName: editAptData.assignedAdvocateName,
      status: editAptData.status as any,
      clientTimeZone: editAptData.clientTimeZone || undefined,
    }, {
      onSuccess: () => {
        setIsEditingApt(false);
        setSelectedApt(prev => prev ? {
          ...prev,
          title: editAptData.title,
          description: editAptData.description || null,
          startTime: new Date(editAptData.startTime),
          endTime: new Date(editAptData.endTime),
          location: editAptData.location || null,
          videoLink: editAptData.videoLink || null,
          parentName: editAptData.parentName || null,
          parentPhone: editAptData.parentPhone || null,
          studentName: editAptData.studentName || null,
          assignedAdvocateName: editAptData.assignedAdvocateName,
          status: editAptData.status,
          clientTimeZone: editAptData.clientTimeZone,
        } : null);
      }
    });
  };
  const [formData, setFormData] = useState({
    clientId: "",
    title: "",
    description: "",
    meetingType: "",
    startTime: "",
    endTime: "",
    location: "",
    videoLink: "",
    parentName: "",
    studentName: "",
    clientTimeZone: "America/New_York",
    assignedAdvocateName: user?.name || "Byron Honea",
  });

  const [activeProposedMeetingId, setActiveProposedMeetingId] = useState<number | null>(null);
  const [showMasterSchedule, setShowMasterSchedule] = useState<boolean>(false);
  const [scheduleModalDate, setScheduleModalDate] = useState<Date | undefined>(undefined);
  const [scheduleModalTime, setScheduleModalTime] = useState<string>("10:00");
  const [scheduleModalAction, setScheduleModalAction] = useState<ScheduleActionType | undefined>(undefined);

  const handleOpenSchedule = (date?: Date, time?: string, action?: ScheduleActionType) => {
    setScheduleModalDate(date || selectedDate);
    if (time) setScheduleModalTime(time);
    setScheduleModalAction(action);
    setShowMasterSchedule(true);
  };

  const { data: appointments = [], refetch } = trpc.appointments.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 60000,
  });
  const { data: operationalBlocks = [], refetch: refetchOperationalBlocks } = trpc.operationalBlocks.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 60000,
  });
  const { data: unifiedData, refetch: refetchUnified } = trpc.proposedMeetings.getUnifiedCalendarEvents.useQuery(
    { includeReleasedHolds: false },
    {
      refetchOnWindowFocus: false,
      staleTime: 60000,
    }
  );
  const { data: contacts = [] } = trpc.contacts.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 300000,
  });
  const { data: availability = [], refetch: refetchAvailability } = trpc.availability.get.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 60000,
  });
  const staffRosterQuery = trpc.appointments.getStaffRoster.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 300000,
  });
  const staffList = staffRosterQuery.data || [];

  const [activeOperationalBlock, setActiveOperationalBlock] = useState<OperationalBlock | null>(null);
  const [layerFilters, setLayerFilters] = useState<CalendarLayerFilters>({
    showAppointments: true,
    showProposedHolds: true,
    showClosures: true,
    showHolidays: true,
    showPto: true,
    showBlackouts: true,
    showInternalEvents: true,
    showProtectedWork: true,
  });

  // Live availability check during scheduling
  const schedulingAvailabilityQuery = trpc.appointments.checkAvailability.useQuery(
    {
      startTime: formData.startTime ? new Date(formData.startTime) : new Date(),
      endTime: formData.endTime ? new Date(formData.endTime) : new Date(),
    },
    {
      enabled: showCreate && !!formData.startTime && !!formData.endTime && new Date(formData.endTime) > new Date(formData.startTime),
      refetchOnWindowFocus: false,
    }
  );

  const createMutation = trpc.appointments.create.useMutation({
    onSuccess: () => {
      toast.success("Appointment created!");
      setShowCreate(false);
      setFormData({
        clientId: "",
        title: "",
        description: "",
        meetingType: "",
        startTime: "",
        endTime: "",
        location: "",
        videoLink: "",
        parentName: "",
        studentName: "",
        clientTimeZone: "America/New_York",
        assignedAdvocateName: user?.name || "Byron Honea",
      });
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const cancelWithNotifyMutation = trpc.appointments.cancelWithNotify.useMutation({
    onSuccess: () => {
      toast.success("Appointment cancelled" + (notifyParentOnCancel ? " — parent notified by email" : ""));
      setSelectedApt(prev => prev ? { ...prev, status: "Cancelled" } : null);
      setIsCancellingApt(false);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message);
      setIsCancellingApt(false);
    },
  });

  const deleteMutation = trpc.appointments.delete.useMutation({
    onSuccess: () => {
      toast.success("Appointment deleted");
      setSelectedApt(null);
      setIsDeletingApt(false);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message);
      setIsDeletingApt(false);
    },
  });

  const updateMutation = trpc.appointments.update.useMutation({
    onSuccess: () => {
      toast.success("Appointment updated!");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateAvailabilityMutation = trpc.availability.update.useMutation({
    onSuccess: () => {
      toast.success("Availability updated!");
      refetchAvailability();
    },
    onError: (err) => toast.error(err.message),
  });

  const utils = trpc.useUtils();
  const logActivityMutation = trpc.caseActivity.create.useMutation();
  const addExtraAllowanceMutation = trpc.serviceAllowances.addExtraAllowance.useMutation();

  const [serviceLimitWarning, setServiceLimitWarning] = useState<{
    serviceKey: string;
    serviceName: string;
    remaining: number | string;
    totalAllowance: number | string;
    used: number;
    isNotIncluded?: boolean;
  } | null>(null);

  const executeCreate = (isOverride = false) => {
    createMutation.mutate({
      clientId: parseInt(formData.clientId),
      title: formData.title,
      description: formData.description || undefined,
      startTime: new Date(formData.startTime),
      endTime: new Date(formData.endTime),
      location: formData.location || undefined,
      videoLink: formData.videoLink || undefined,
      meetingType: formData.meetingType || undefined,
      parentName: formData.parentName || undefined,
      studentName: formData.studentName || undefined,
      clientTimeZone: formData.clientTimeZone || undefined,
      originalTimeZone: "America/New_York",
      assignedAdvocateName: formData.assignedAdvocateName || user?.name || "Byron Honea",
      status: "Confirmed",
    });

    if (isOverride && serviceLimitWarning) {
      logActivityMutation.mutate({
        studentContactId: parseInt(formData.clientId),
        eventType: "service_limit_override",
        title: `⚠️ Service Limit Override: Scheduled ${serviceLimitWarning.serviceName}`,
        description: `Staff scheduled ${serviceLimitWarning.serviceName} exceeding included plan allowance (${serviceLimitWarning.used} of ${serviceLimitWarning.totalAllowance} already consumed). Authorized override.`,
        ownerName: user?.name || "Byron Honea",
        ownerRole: "Advocate",
        isCompleted: true,
        categoryColor: "amber",
      });
      toast.info("Override recorded in student Activity Timeline.");
    }
    setServiceLimitWarning(null);
  };

  const handleCreate = async () => {
    if (!formData.clientId || !formData.title || !formData.startTime || !formData.endTime) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (new Date(formData.endTime) <= new Date(formData.startTime)) {
      toast.error("End time must be after start time");
      return;
    }

    // Check service allowance for student (Section 10 Scheduler Connection)
    const studentId = parseInt(formData.clientId);
    const serviceKey = getServiceKeyForMeetingType(formData.meetingType || "");
    if (studentId && serviceKey) {
      try {
        const check = await utils.serviceAllowances.checkServiceAvailability.fetch({
          studentContactId: studentId,
          serviceKey,
        });
        if (check.isAtLimit) {
          setServiceLimitWarning({
            serviceKey: check.serviceKey || serviceKey,
            serviceName: check.serviceName || "Service",
            remaining: check.remaining ?? 0,
            totalAllowance: check.totalAllowance ?? 0,
            used: check.used ?? 0,
            isNotIncluded: check.isNotIncluded ?? false,
          });
          return;
        }
      } catch {
        // Fallback to normal scheduling if check fails
      }
    }

    executeCreate(false);
  };

  const handleAddAllowanceAndSchedule = async () => {
    if (!serviceLimitWarning || !formData.clientId) return;
    try {
      await addExtraAllowanceMutation.mutateAsync({
        studentContactId: parseInt(formData.clientId),
        serviceKey: serviceLimitWarning.serviceKey,
        serviceName: serviceLimitWarning.serviceName,
        additionalAmount: 1,
        reason: `Authorized during appointment scheduling (${formData.title})`,
        authorizedBy: user?.name || "Byron Honea",
        date: new Date().toISOString().split("T")[0],
      });
      toast.success(`+1 Extra ${serviceLimitWarning.serviceName} authorized.`);
      executeCreate(false);
    } catch (err: any) {
      toast.error("Failed to add allowance: " + err.message);
    }
  };

  const handleStatusChange = (id: number, status: string) => {
    updateMutation.mutate({ id, status: status as "Scheduled" | "Confirmed" | "Completed" | "Cancelled" });
    if (selectedApt?.id === id) {
      setSelectedApt((prev) => prev ? { ...prev, status } : null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Scheduled": return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300";
      case "Confirmed": return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
      case "Completed": return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
      case "Cancelled": return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusBarColor = (status: string) => {
    switch (status) {
      case "Confirmed": return "bg-green-500";
      case "Cancelled": return "bg-red-500";
      case "Completed": return "bg-gray-400";
      default: return "bg-blue-500";
    }
  };

  const sortedAppointments = [...appointments].sort(
    (a: Appointment, b: Appointment) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  const upcomingAppointments = sortedAppointments.filter(
    (a: Appointment) => new Date(a.startTime) >= new Date() && a.status !== "Cancelled"
  );

  const pastAppointments = sortedAppointments.filter(
    (a: Appointment) => new Date(a.startTime) < new Date() || a.status === "Cancelled"
  );

  const fmt = (dt: Date | string) => {
    const d = new Date(dt);
    return {
      date: d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
      time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
  };

  // Ensure the 4 authentic showcase appointments exist for today if none exist in DB
  const todayDateStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const mergedAppointments = useMemo(() => {
    const rawList = appointments as any[];
    const hasTodayApts = rawList.some((a) => {
      const d = new Date(a.startTime).toISOString().split("T")[0];
      return d === todayDateStr && a.status !== "Cancelled";
    });

    const holdList: any[] = (unifiedData?.holdEvents || []).map((h: any) => ({
      id: h.id,
      originalId: h.originalId,
      clientId: h.clientId || null,
      title: h.title,
      studentName: h.studentName,
      parentName: h.parentName,
      parentPhone: h.parentPhone,
      meetingType: h.meetingType,
      assignedAdvocateName: h.assignedAdvocateName,
      status: h.status,
      startTime: new Date(h.startTime),
      endTime: new Date(h.endTime),
      location: h.location,
      videoLink: h.videoLink,
      clientTimeZone: h.clientTimeZone,
      originalTimeZone: "America/New_York",
      isHold: true,
      proposedMeetingId: h.proposedMeetingId,
      candidateSlotId: h.candidateSlotId,
      siblingLabel: h.siblingLabel,
      totalSiblingSlots: h.totalSiblingSlots,
      slotOrder: h.slotOrder,
      waitingOn: h.waitingOn,
      parentPreferred: h.parentPreferred,
      meetingStatus: h.meetingStatus,
    }));

    if (hasTodayApts) {
      return [...rawList, ...holdList];
    }

    const baseDate = new Date();
    const y = baseDate.getFullYear();
    const m = baseDate.getMonth();
    const d = baseDate.getDate();

    const sampleApts: any[] = [
      {
        id: 9901,
        title: "IEP Meeting",
        studentName: "Emma Carter",
        parentName: "Emma Carter",
        meetingType: "IEP Meeting",
        assignedAdvocateName: "Byron Honea",
        status: "Confirmed",
        startTime: new Date(y, m, d, 9, 0, 0),
        endTime: new Date(y, m, d, 10, 0, 0),
        clientTimeZone: "America/New_York",
        originalTimeZone: "America/New_York",
      },
      {
        id: 9902,
        title: "Records Review",
        studentName: "Liam Brooks",
        parentName: "Liam Brooks",
        meetingType: "Records Review",
        assignedAdvocateName: "Wyatt Smith",
        status: "Confirmed",
        startTime: new Date(y, m, d, 11, 30, 0),
        endTime: new Date(y, m, d, 12, 30, 0),
        clientTimeZone: "America/New_York",
        originalTimeZone: "America/New_York",
      },
      {
        id: 9903,
        title: "504 Meeting",
        studentName: "Ava Mitchell",
        parentName: "Ava Mitchell",
        meetingType: "504 Meeting",
        assignedAdvocateName: "Sarah Jenkins",
        status: "Needs Coverage",
        startTime: new Date(y, m, d, 13, 0, 0),
        endTime: new Date(y, m, d, 14, 0, 0),
        clientTimeZone: "America/New_York",
        originalTimeZone: "America/New_York",
      },
      {
        id: 9904,
        title: "IEP Meeting",
        studentName: "Noah Davis",
        parentName: "Noah Davis",
        meetingType: "IEP Meeting",
        assignedAdvocateName: "Byron Honea",
        status: "Confirmed",
        startTime: new Date(y, m, d, 14, 30, 0),
        endTime: new Date(y, m, d, 15, 30, 0),
        clientTimeZone: "America/New_York",
        originalTimeZone: "America/New_York",
      },
    ];

    return [...sampleApts, ...rawList, ...holdList];
  }, [appointments, unifiedData, todayDateStr]);

  return (
    <ScopedErrorBoundary moduleName="Appointments & Calendar">
      <div className="min-h-screen bg-[#07162B] [background:radial-gradient(ellipse_at_50%_0%,_#102B4E_0%,_#07162B_55%,_#030D1A_100%)] text-[#FFF4D4] p-4 sm:p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto">
        {/* ── Admiralty Top Header Console ── */}
        <div className="relative overflow-hidden rounded-2xl bg-[#05142B]/90 border border-[#3A2C18] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]">
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#102B4E]/30 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#020A17] border border-[#3A2C18] text-[#FFE394] text-xs font-bold tracking-wider uppercase font-mono">
                  <Calendar className="w-4 h-4 text-[#C5A059] shrink-0" />
                  <span>Operations Deck</span>
                </div>
                <PageIdBadge
                  id={activeTab === "coverage" ? "PG-041" : activeTab === "session-types" ? "PG-008" : "PG-007"}
                  name={activeTab === "coverage" ? "National Coverage" : activeTab === "session-types" ? "Session Types" : "Appointments & Calendar"}
                  inline
                />
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Dual-Zone Sync Active</span>
                </div>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-serif text-[#FFF4D4] font-normal tracking-wide">
                  Appointments & <span className="font-serif italic font-bold text-[#FFE394]">Calendar Console</span>
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <WaypointWaveIcon className="w-8 h-2 text-[#C5A059] shrink-0" />
                  <p className="text-xs sm:text-sm text-[#C6B697] font-medium">
                    Master scheduling, dual-zone advocacy alignment, and team coverage dispatch.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Button
                onClick={() => handleOpenSchedule()}
                className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs sm:text-sm shadow-[0_3px_10px_rgba(0,0,0,0.8)] border border-[#FFE394]/50 hover:brightness-110 transition-all gap-2 tracking-wide cursor-pointer px-4 sm:px-5 py-2"
              >
                <Plus className="w-4 h-4 text-[#07162B]" />
                + SCHEDULE
              </Button>
            </div>
          </div>
        </div>

        {/* ── Event Detail Popup ── */}
        {selectedApt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedApt(null)}
        >
          <div
            className="bg-[#05142B] text-[#FFF4D4] rounded-xl shadow-[0_16px_40px_rgba(0,0,0,0.95)] border border-[#3A2C18] w-full max-w-sm mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`h-1.5 w-full ${getStatusBarColor(selectedApt.status)}`} />
            <div className="p-5 space-y-4">
              {/* Title + close */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-serif font-bold text-[#FFF4D4] leading-tight">{isEditingApt ? 'Edit Appointment' : selectedApt.title}</h2>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!isEditingApt && (
                    <>
                      <button
                        onClick={() => openEditMode(selectedApt)}
                        className="text-xs px-2.5 py-1 rounded-md bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold hover:brightness-110 transition-colors shadow-sm"
                      >
                        Edit
                      </button>
                      {/* Cancel Meeting button */}
                      {selectedApt.status !== "Cancelled" && !isCancellingApt && !isDeletingApt && (
                        <button
                          onClick={() => setIsCancellingApt(true)}
                          className="text-[#C6B697] hover:text-orange-400 transition-colors"
                          title="Cancel meeting"
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                      )}
                      {isCancellingApt && (
                        <div className="flex flex-col gap-1.5 items-end">
                          <div className="flex items-center gap-1.5">
                            <Checkbox
                              id="notifyParent"
                              checked={notifyParentOnCancel}
                              onCheckedChange={(v) => setNotifyParentOnCancel(!!v)}
                            />
                            <label htmlFor="notifyParent" className="text-xs text-[#C6B697] cursor-pointer whitespace-nowrap">Notify parent</label>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => cancelWithNotifyMutation.mutate({ id: selectedApt.id, notifyParent: notifyParentOnCancel })}
                              disabled={cancelWithNotifyMutation.isPending}
                              className="text-xs px-2 py-0.5 rounded bg-orange-600 text-white hover:bg-orange-700 transition-colors font-medium disabled:opacity-50"
                            >
                              {cancelWithNotifyMutation.isPending ? '...' : 'Cancel Mtg'}
                            </button>
                            <button
                              onClick={() => setIsCancellingApt(false)}
                              className="text-xs px-2 py-0.5 rounded border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] transition-colors"
                            >
                              No
                            </button>
                          </div>
                        </div>
                      )}
                      {!isDeletingApt && !isCancellingApt ? (
                        <button
                          onClick={() => setIsDeletingApt(true)}
                          className="text-[#C6B697] hover:text-rose-400 transition-colors"
                          title="Delete appointment"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : !isCancellingApt ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-rose-400 font-medium">Delete?</span>
                          <button
                            onClick={() => deleteMutation.mutate({ id: selectedApt.id })}
                            disabled={deleteMutation.isPending}
                            className="text-xs px-2 py-0.5 rounded bg-rose-700 text-white hover:bg-rose-600 transition-colors font-medium disabled:opacity-50"
                          >
                            {deleteMutation.isPending ? '...' : 'Yes'}
                          </button>
                          <button
                            onClick={() => setIsDeletingApt(false)}
                            className="text-xs px-2 py-0.5 rounded border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : null}
                    </>
                  )}
                  <button
                    onClick={() => { setSelectedApt(null); setIsEditingApt(false); }}
                    className="text-[#C6B697] hover:text-[#FFF4D4] transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {isEditingApt && editAptData ? (
                /* ── Edit Form ── */
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                  <div>
                    <label className="text-xs font-semibold text-[#FFE394] uppercase tracking-wider">Auto-fill from Contact</label>
                    <Select onValueChange={(v) => autoFillFromContact(v, setEditAptData)}>
                      <SelectTrigger className="mt-1 h-8 text-xs bg-[#020A17] border-[#3A2C18] text-[#FFF4D4]">
                        <SelectValue placeholder="Pick a contact to auto-fill parent/student…" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4]">
                        {(contacts as any[]).map((c: any) => (
                          <SelectItem key={c.id} value={c.id.toString()}>
                            {c.firstName} {c.lastName}{c.jobTitle === 'Student' ? ' (Student)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#FFE394] uppercase tracking-wider">Title *</label>
                    <VoiceInput
                      value={editAptData.title}
                      onChange={(e) => setEditAptData(d => d ? { ...d, title: e.target.value } : d)}
                      placeholder="Appointment title"
                      className="mt-1 h-8 text-sm bg-[#020A17] border-[#3A2C18] text-[#FFF4D4]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-semibold text-[#FFE394] uppercase tracking-wider">Start *</label>
                      <input
                        type="datetime-local"
                        value={editAptData.startTime}
                        onChange={(e) => setEditAptData(d => d ? { ...d, startTime: e.target.value } : d)}
                        className="mt-1 w-full h-8 text-xs rounded-md border border-[#3A2C18] bg-[#020A17] text-[#FFF4D4] px-2 focus:outline-none focus:border-[#C5A059]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#FFE394] uppercase tracking-wider">End *</label>
                      <input
                        type="datetime-local"
                        value={editAptData.endTime}
                        onChange={(e) => setEditAptData(d => d ? { ...d, endTime: e.target.value } : d)}
                        className="mt-1 w-full h-8 text-xs rounded-md border border-[#3A2C18] bg-[#020A17] text-[#FFF4D4] px-2 focus:outline-none focus:border-[#C5A059]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#FFE394] uppercase tracking-wider flex items-center gap-1">
                      <Globe className="h-3 w-3 text-[#C5A059]" /> Client Time Zone
                    </label>
                    <Select
                      value={editAptData.clientTimeZone}
                      onValueChange={(v) => setEditAptData(d => d ? { ...d, clientTimeZone: v } : d)}
                    >
                      <SelectTrigger className="mt-1 h-8 text-xs bg-[#020A17] border-[#3A2C18] text-[#FFF4D4]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4]">
                        {SIX_CORE_ZONES.map((z) => (
                          <SelectItem key={z.id} value={z.id}>
                            {z.name} ({z.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#FFE394] uppercase tracking-wider flex items-center gap-1">
                      <User className="h-3 w-3 text-cyan-400" /> Assigned Advocate
                    </label>
                    <Select
                      value={editAptData.assignedAdvocateName}
                      onValueChange={(v) => setEditAptData(d => d ? { ...d, assignedAdvocateName: v } : d)}
                    >
                      <SelectTrigger className="mt-1 h-8 text-xs bg-[#020A17] border-[#3A2C18] text-[#FFF4D4]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4]">
                        {staffList.map((s) => (
                          <SelectItem key={s.id} value={s.name}>
                            {s.name} ({s.status})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#FFE394] uppercase tracking-wider">Status</label>
                    <Select
                      value={editAptData.status}
                      onValueChange={(v) => setEditAptData(d => d ? { ...d, status: v } : d)}
                    >
                      <SelectTrigger className="mt-1 h-8 text-xs bg-[#020A17] border-[#3A2C18] text-[#FFF4D4]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4]">
                        <SelectItem value="Scheduled">Scheduled</SelectItem>
                        <SelectItem value="Confirmed">Confirmed</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                        <SelectItem value="Needs Coverage">🚨 Needs Coverage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#FFE394] uppercase tracking-wider">Video / Meeting Link</label>
                    <VoiceInput
                      value={editAptData.videoLink}
                      onChange={(e) => setEditAptData(d => d ? { ...d, videoLink: e.target.value } : d)}
                      placeholder="https://..."
                      className="mt-1 h-8 text-sm bg-[#020A17] border-[#3A2C18] text-[#FFF4D4]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#FFE394] uppercase tracking-wider">Location</label>
                    <VoiceInput
                      value={editAptData.location}
                      onChange={(e) => setEditAptData(d => d ? { ...d, location: e.target.value } : d)}
                      placeholder="Location"
                      className="mt-1 h-8 text-sm bg-[#020A17] border-[#3A2C18] text-[#FFF4D4]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#FFE394] uppercase tracking-wider">Parent Name</label>
                    <VoiceInput
                      value={editAptData.parentName}
                      onChange={(e) => setEditAptData(d => d ? { ...d, parentName: e.target.value } : d)}
                      placeholder="Parent name"
                      className="mt-1 h-8 text-sm bg-[#020A17] border-[#3A2C18] text-[#FFF4D4]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#FFE394] uppercase tracking-wider">Parent Phone</label>
                    <VoiceInput
                      value={editAptData.parentPhone}
                      onChange={(e) => setEditAptData(d => d ? { ...d, parentPhone: e.target.value } : d)}
                      placeholder="(xxx) xxx-xxxx"
                      className="mt-1 h-8 text-sm bg-[#020A17] border-[#3A2C18] text-[#FFF4D4]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#FFE394] uppercase tracking-wider">Student Name</label>
                    <VoiceInput
                      value={editAptData.studentName}
                      onChange={(e) => setEditAptData(d => d ? { ...d, studentName: e.target.value } : d)}
                      placeholder="Student name"
                      className="mt-1 h-8 text-sm bg-[#020A17] border-[#3A2C18] text-[#FFF4D4]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#FFE394] uppercase tracking-wider">Description</label>
                    <VoiceTextarea
                      value={editAptData.description}
                      onChange={(e) => setEditAptData(d => d ? { ...d, description: e.target.value } : d)}
                      placeholder="Notes about this appointment..."
                      rows={3}
                      className="mt-1 text-sm bg-[#020A17] border-[#3A2C18] text-[#FFF4D4]"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={handleSaveEdit}
                      disabled={updateMutation.isPending}
                      className="flex-1 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold hover:brightness-110"
                    >
                      {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditingApt(false)}
                      className="flex-1 border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B]"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                /* ── View Mode ── */
                <>
              {/* Meeting Type + Participants */}
              <div className="space-y-1.5">
                {selectedApt.meetingType && (
                  <div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                      {selectedApt.meetingType}
                    </span>
                  </div>
                )}
                {(selectedApt.parentName || selectedApt.parentPhone || selectedApt.studentName) && (
                  <div className="text-sm space-y-0.5 pt-1 text-[#FFF4D4]">
                    {selectedApt.parentName && (
                      <p>
                        <span className="font-medium text-[#C6B697]">Parent:</span>{" "}
                        {selectedApt.parentName}
                        {selectedApt.parentPhone && (
                          <> · <a href={`tel:${selectedApt.parentPhone}`} className="text-[#FFE394] hover:underline">{selectedApt.parentPhone}</a></>
                        )}
                      </p>
                    )}
                    {selectedApt.studentName && (
                      <p>
                        <span className="font-medium text-[#C6B697]">Student:</span>{" "}
                        {selectedApt.studentName}
                      </p>
                    )}
                  </div>
                )}

                {/* Contextual Calling Safety */}
                <div className="mt-2.5 p-2.5 rounded-lg border border-[#3A2C18] bg-[#020A17]/80">
                  <ClientCallingSafetyBadge
                    timeZone={selectedApt.clientTimeZone}
                  />
                </div>
              </div>

              {/* Multi-Zone Schedule Alignment (Red for Client, Green for Waypoint Advocate) */}
              {(() => {
                const dualTime = formatDualTimes(
                  selectedApt.startTime,
                  selectedApt.endTime,
                  selectedApt.clientTimeZone,
                  selectedApt.originalTimeZone || "America/New_York"
                );
                return (
                  <div className="rounded-xl border border-[#3A2C18] bg-[#020A17]/80 p-3.5 space-y-3 shadow-md">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#C6B697] flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-[#C5A059]" /> Multi-Zone Alignment
                      </span>
                      {dualTime.clientTime.isDifferent ? (
                        <span className="text-[11px] font-semibold text-rose-300 bg-rose-950/60 border border-rose-500/40 px-2 py-0.5 rounded-full">
                          {dualTime.clientTime.friendlyName} vs Eastern
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-emerald-300 bg-emerald-950/50 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                          Synchronized
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* 🔴 CLIENT'S SCHEDULED TIME (RED) */}
                      <div className="rounded-lg border-2 border-rose-500/70 bg-rose-950/40 p-3 flex flex-col justify-between shadow-sm">
                        <div className="flex items-center justify-between text-xs text-rose-300 font-semibold mb-1">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse inline-block" />
                            Client Time
                          </span>
                          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-200 border border-rose-500/40">
                            {dualTime.clientTime.tzAbbr}
                          </span>
                        </div>
                        <p className="text-base sm:text-lg font-bold text-rose-100 font-mono tracking-tight">
                          {dualTime.clientTime.timeRange}
                        </p>
                        <p className="text-[11px] text-rose-300/90 mt-1">
                          {dualTime.clientTime.dateFormatted} · {dualTime.clientTime.friendlyName}
                        </p>
                      </div>

                      {/* 🟢 WAYPOINT / ADVOCATE TIME (GREEN) */}
                      <div className="rounded-lg border-2 border-emerald-500/70 bg-emerald-950/40 p-3 flex flex-col justify-between shadow-sm">
                        <div className="flex items-center justify-between text-xs text-emerald-300 font-semibold mb-1">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                            Waypoint Time
                          </span>
                          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-200 border border-emerald-500/40">
                            {dualTime.waypointTime.tzAbbr}
                          </span>
                        </div>
                        <p className="text-base sm:text-lg font-bold text-emerald-100 font-mono tracking-tight">
                          {dualTime.waypointTime.timeRange}
                        </p>
                        <p className="text-[11px] text-emerald-300/90 mt-1">
                          {dualTime.waypointTime.dateFormatted} · Atlanta (EDT)
                        </p>
                      </div>
                    </div>

                    {dualTime.clientTime.isDifferent && (
                      <div className="text-xs text-[#C6B697] bg-[#05142B] rounded-md p-2.5 border border-[#3A2C18] flex items-center gap-2">
                        <Clock className="h-4 w-4 text-[#C5A059] shrink-0" />
                        <span>{dualTime.explanation}</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Assigned Advocate */}
              {selectedApt.assignedAdvocateName && (
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-[#3A2C18] bg-[#020A17]/80">
                  <span className="text-xs text-[#C6B697] flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-cyan-400" />
                    Assigned Advocate:
                  </span>
                  <span className="text-xs font-semibold text-[#FFF4D4]">
                    {selectedApt.assignedAdvocateName}
                  </span>
                </div>
              )}

              {/* Needs Coverage Alert Banner if flagged */}
              {selectedApt.status === "Needs Coverage" && (
                <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/60 flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-rose-300">Coverage Required</p>
                    <p className="text-[11px] text-rose-300/80">
                      Assigned advocate is unavailable. Use Reassign to delegate to another team advocate.
                    </p>
                  </div>
                </div>
              )}

              {/* Join Meeting */}
              {selectedApt.videoLink && (
                <a
                  href={selectedApt.videoLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 w-full justify-center px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-md"
                >
                  <Video className="h-4 w-4" />
                  Join Meeting
                  <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                </a>
              )}

              {/* IEP Meeting Link status */}
              {selectedApt.meetingType === 'IEP Meeting' && (
                <div className="rounded-lg border border-[#3A2C18] bg-[#020A17]/60 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#C6B697]">IEP Meeting Link</span>
                    {selectedApt.clientMeetingLink ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
                        Link Received
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400/80 border border-red-500/20">
                        Link Not Received
                      </span>
                    )}
                  </div>
                  {selectedApt.clientMeetingLink && (
                    <>
                      <p className="text-xs text-[#C6B697] break-all">{selectedApt.clientMeetingLink}</p>
                      <a
                        href={selectedApt.clientMeetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 w-full justify-center px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Go to Meeting
                      </a>
                    </>
                  )}
                </div>
              )}

              {/* Location */}
              {selectedApt.location && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-[#C5A059] shrink-0" />
                  <p className="text-sm text-[#FFF4D4]">{selectedApt.location}</p>
                </div>
              )}

              {/* Description */}
              {selectedApt.description && (
                <p className="text-sm text-[#C6B697] border-t border-[#3A2C18] pt-3">{selectedApt.description}</p>
              )}

              {/* Status change */}
              <div className="flex items-center gap-2 border-t border-[#3A2C18] pt-3">
                <span className="text-xs text-[#C6B697] shrink-0">Status:</span>
                <Select
                  value={selectedApt.status}
                  onValueChange={(v) => handleStatusChange(selectedApt.id, v)}
                >
                  <SelectTrigger className="h-8 text-xs flex-1 bg-[#020A17] border-[#3A2C18] text-[#FFF4D4]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4]">
                    <SelectItem value="Scheduled">Scheduled</SelectItem>
                    <SelectItem value="Confirmed">Confirmed</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Deprecated Schedule Dialog (superseded by MasterScheduleModal + SCHEDULE workflow) ── */}
      <Dialog open={false} onOpenChange={setShowCreate}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4] shadow-[0_16px_40px_rgba(0,0,0,0.95)]">
            <DialogHeader>
              <DialogTitle className="font-serif text-[#FFF4D4] text-xl font-normal">Schedule Appointment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-xs font-semibold text-[#FFE394] uppercase tracking-wider">Client *</label>
                <Select value={formData.clientId} onValueChange={(v) => {
                  setFormData(prev => ({ ...prev, clientId: v }));
                  autoFillFromContact(v, setFormData);
                }}>
                  <SelectTrigger className="mt-1 bg-[#020A17] border-[#3A2C18] text-[#FFF4D4]">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4]">
                    {/* Students first */}
                    {(contacts as any[]).filter((c: any) => c.jobTitle === 'Student').length > 0 && (
                      <>
                        <div className="px-2 py-1 text-[10px] uppercase tracking-widest text-[#C5A059] font-bold font-mono">Students</div>
                        {(contacts as any[]).filter((c: any) => c.jobTitle === 'Student').map((c: any) => {
                          const parent = (contacts as any[]).find((p: any) => p.id === c.parentContactId);
                          return (
                            <SelectItem key={c.id} value={c.id.toString()}>
                              {c.firstName} {c.lastName}{parent ? ` (${parent.firstName} ${parent.lastName})` : ''}
                            </SelectItem>
                          );
                        })}
                        <div className="px-2 py-1 text-[10px] uppercase tracking-widest text-[#C5A059] font-bold font-mono mt-1">All Contacts</div>
                      </>
                    )}
                    {(contacts as any[]).filter((c: any) => c.jobTitle !== 'Student').map((c: any) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.firstName} {c.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#FFE394] uppercase tracking-wider">Title *</label>
                <VoiceInput
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full mt-1 rounded-md border border-[#3A2C18] bg-[#020A17] px-3 py-2 text-sm text-[#FFF4D4] placeholder:text-[#A69371]/60 focus:border-[#C5A059]"
                  placeholder="Meeting title"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#FFE394] uppercase tracking-wider">Meeting Type</label>
                <Select value={formData.meetingType} onValueChange={(v) => setFormData({ ...formData, meetingType: v })}>
                  <SelectTrigger className="mt-1 bg-[#020A17] border-[#3A2C18] text-[#FFF4D4]">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4]">
                    {MEETING_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Assigned Advocate Selector with Live Availability Check */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#FFE394] uppercase tracking-wider flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-cyan-400" /> Assigned Advocate *
                  </label>
                  {schedulingAvailabilityQuery.data && (
                    <span className="text-[11px] text-cyan-400 font-mono">
                      Available: {schedulingAvailabilityQuery.data.availableCount}
                    </span>
                  )}
                </div>
                <Select
                  value={formData.assignedAdvocateName}
                  onValueChange={(v) => setFormData({ ...formData, assignedAdvocateName: v })}
                >
                  <SelectTrigger className="mt-1 bg-[#020A17] border-[#3A2C18] text-[#FFF4D4]">
                    <SelectValue placeholder="Select advocate" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4]">
                    {staffList.map((s) => (
                      <SelectItem key={s.id} value={s.name}>
                        {s.name} ({s.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Schedule conflict warning if applicable */}
              {(() => {
                const selectedCheck = schedulingAvailabilityQuery.data?.advocates.find(
                  (a) => a.name === formData.assignedAdvocateName
                );
                if (selectedCheck && !selectedCheck.isAvailable) {
                  return (
                    <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-600/70 text-amber-200 text-xs flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-amber-300">Schedule Conflict: </span>
                        <span>{selectedCheck.conflicts.join(", ")}. Admins may override when necessary.</span>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Client Time Zone */}
              <div>
                <label className="text-xs font-semibold text-[#FFE394] uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-[#C5A059]" /> Client Time Zone *
                </label>
                <Select
                  value={formData.clientTimeZone}
                  onValueChange={(v) => setFormData({ ...formData, clientTimeZone: v })}
                >
                  <SelectTrigger className="mt-1 bg-[#020A17] border-[#3A2C18] text-[#FFF4D4]">
                    <SelectValue placeholder="Select client time zone" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4]">
                    {SIX_CORE_ZONES.map((z) => (
                      <SelectItem key={z.id} value={z.id}>
                        {z.name} ({z.code}) — {z.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-[#C6B697] mt-1">
                  Advocate operates in Eastern Time (Atlanta, GA). Client calendar will reflect their local zone.
                </p>
                <div className="mt-2 p-2 rounded-md bg-[#020A17] border border-[#3A2C18]">
                  <ClientCallingSafetyBadge
                    timeZone={formData.clientTimeZone}
                    compact
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#FFE394] uppercase tracking-wider">Start Time *</label>
                  <input
                    type="datetime-local"
                    value={formData.startTime}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      let newEnd = formData.endTime;
                      if (newStart) {
                        const startDate = new Date(newStart);
                        const startDateStr = newStart.split("T")[0];
                        const endDateStr = formData.endTime ? formData.endTime.split("T")[0] : "";
                        if (!formData.endTime || endDateStr !== startDateStr) {
                          const autoEnd = new Date(startDate.getTime() + 60 * 60 * 1000);
                          newEnd = autoEnd.toISOString().slice(0, 16);
                        }
                      }
                      setFormData({ ...formData, startTime: newStart, endTime: newEnd });
                    }}
                    className="w-full mt-1 rounded-md border border-[#3A2C18] bg-[#020A17] px-3 py-2 text-sm text-[#FFF4D4] focus:border-[#C5A059]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#FFE394] uppercase tracking-wider">End Time *</label>
                  <input
                    type="datetime-local"
                    value={formData.endTime}
                    min={formData.startTime || undefined}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full mt-1 rounded-md border border-[#3A2C18] bg-[#020A17] px-3 py-2 text-sm text-[#FFF4D4] focus:border-[#C5A059]"
                  />
                </div>
              </div>

              {/* Live Dual Time Zone Preview */}
              {formData.startTime && formData.endTime && (
                <div className="rounded-lg border border-[#3A2C18] bg-[#020A17]/80 p-3 space-y-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#C6B697] flex items-center gap-1">
                    <Clock className="h-3 w-3 text-[#C5A059]" /> Live Time Alignment Preview
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {/* 🔴 RED: Client time */}
                    <div className="p-2.5 rounded-md bg-rose-950/40 border border-rose-500/50 text-rose-300">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400 mb-0.5 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-rose-500" /> Client Time ({getFriendlyTimeZoneName(formData.clientTimeZone)})
                      </div>
                      <div className="font-mono font-semibold text-rose-100">
                        {formatDualTimes(new Date(formData.startTime), new Date(formData.endTime), formData.clientTimeZone).clientTime.timeRange}
                      </div>
                    </div>
                    {/* 🟢 GREEN: Waypoint time */}
                    <div className="p-2.5 rounded-md bg-emerald-950/40 border border-emerald-500/50 text-emerald-300">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-0.5 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" /> Waypoint Time (Eastern)
                      </div>
                      <div className="font-mono font-semibold text-emerald-100">
                        {formatDualTimes(new Date(formData.startTime), new Date(formData.endTime), formData.clientTimeZone).waypointTime.timeRange}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-[#FFE394] uppercase tracking-wider">Location</label>
                <VoiceInput
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full mt-1 rounded-md border border-[#3A2C18] bg-[#020A17] px-3 py-2 text-sm text-[#FFF4D4] placeholder:text-[#A69371]/60 focus:border-[#C5A059]"
                  placeholder="e.g., Zoom, Office, Phone"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#FFE394] uppercase tracking-wider flex items-center gap-1.5">
                  <Video className="h-3.5 w-3.5 text-[#C5A059]" /> Video / Meeting Link
                </label>
                <VoiceInput
                  type="text"
                  value={formData.videoLink}
                  onChange={(e) => setFormData({ ...formData, videoLink: e.target.value })}
                  className="w-full mt-1 rounded-md border border-[#3A2C18] bg-[#020A17] px-3 py-2 text-sm text-[#FFF4D4] placeholder:text-[#A69371]/60 focus:border-[#C5A059]"
                  placeholder="https://teams.microsoft.com/... or Zoom link"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#FFE394] uppercase tracking-wider">Parent Name</label>
                  <VoiceInput
                    type="text"
                    value={formData.parentName}
                    onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                    className="w-full mt-1 rounded-md border border-[#3A2C18] bg-[#020A17] px-3 py-2 text-sm text-[#FFF4D4] placeholder:text-[#A69371]/60 focus:border-[#C5A059]"
                    placeholder="Parent name"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#FFE394] uppercase tracking-wider">Student Name</label>
                  <VoiceInput
                    type="text"
                    value={formData.studentName}
                    onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                    className="w-full mt-1 rounded-md border border-[#3A2C18] bg-[#020A17] px-3 py-2 text-sm text-[#FFF4D4] placeholder:text-[#A69371]/60 focus:border-[#C5A059]"
                    placeholder="Student name"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#FFE394] uppercase tracking-wider">Description</label>
                <VoiceTextarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full mt-1 rounded-md border border-[#3A2C18] bg-[#020A17] px-3 py-2 text-sm text-[#FFF4D4] placeholder:text-[#A69371]/60 focus:border-[#C5A059] min-h-[80px]"
                  placeholder="Notes about this meeting..."
                />
              </div>
              <Button
                onClick={handleCreate}
                className="w-full bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-sm shadow-[0_3px_10px_rgba(0,0,0,0.8)] border border-[#FFE394]/50 hover:brightness-110 transition-all py-2.5"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Scheduling..." : "Schedule Appointment"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      {/* ── Navigation Switcher (Admiralty Brass/Navy Tabs) ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-[#3A2C18]/60">
        <div className="flex items-center gap-1.5 p-1 bg-[#020A17]/90 rounded-xl border border-[#3A2C18] shadow-inner">
          <button
            type="button"
            onClick={() => handleTabChange("calendar")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer",
              activeTab === "calendar"
                ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shadow-md border border-[#FFE394]/50"
                : "text-[#C6B697] hover:text-[#FFF4D4] hover:bg-[#07162B]"
            )}
          >
            <Calendar className={cn("w-4 h-4", activeTab === "calendar" ? "text-[#07162B]" : "text-[#C5A059]")} />
            Calendar
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("session-types")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer",
              activeTab === "session-types"
                ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shadow-md border border-[#FFE394]/50"
                : "text-[#C6B697] hover:text-[#FFF4D4] hover:bg-[#07162B]"
            )}
          >
            <CalendarClock className={cn("w-4 h-4", activeTab === "session-types" ? "text-[#07162B]" : "text-[#C5A059]")} />
            Session Types
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("coverage")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer",
              activeTab === "coverage"
                ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shadow-md border border-[#FFE394]/50"
                : "text-[#C6B697] hover:text-[#FFF4D4] hover:bg-[#07162B]"
            )}
          >
            <Globe className={cn("w-4 h-4", activeTab === "coverage" ? "text-[#07162B]" : "text-[#C5A059]")} />
            National Coverage
          </button>
        </div>

        {activeTab === "coverage" ? (
          <div className="text-xs text-[#C6B697] flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Interactive US Coverage Map, Clocks & Safe Calling Guidance</span>
          </div>
        ) : activeTab === "session-types" ? (
          <div className="text-xs text-[#C6B697] hidden sm:flex items-center gap-2">
            <CalendarClock className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>Session Configuration & Client Portal Booking Settings</span>
          </div>
        ) : (
          <div className="text-xs text-[#C6B697] hidden sm:flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>Dual-Zone Schedule Alignment Active</span>
          </div>
        )}
      </div>

      {activeTab === "coverage" ? (
        <div className="-mx-6 -mb-6">
          <NationalCoverage />
        </div>
      ) : activeTab === "session-types" ? (
        <div className="-mx-6 -mb-6">
          <Scheduler />
        </div>
      ) : (
        <>
      {/* ── Holds Needing Attention Work Queue ── */}
      <div className="mb-4">
        <HoldsNeedingAttentionCard
          onReviewMeeting={(id) => setActiveProposedMeetingId(id)}
        />
      </div>

      {/* ── Visual Pattern Key & Small Block Legend ── */}
      <div className="mb-4">
        <CalendarPatternLegendBar
          onSelectPattern={(key) => {
            const action: ScheduleActionType =
              key === "confirmed"
                ? "CONFIRMED_APPOINTMENT"
                : key === "proposed_hold"
                ? "PROPOSED_HOLDS"
                : key === "block_time"
                ? "BLOCK_TIME"
                : key === "office_closure"
                ? "OFFICE_CLOSURE"
                : "INTERNAL_EVENT";
            handleOpenSchedule(selectedDate, undefined, action);
          }}
        />
      </div>

      {/* ── Visual Layer Filtering Bar (Visual only, does not alter real scheduling engine rules) ── */}
      <div className="mb-4 p-3 rounded-[5px] border border-[#3A2C18] bg-[#05142B]/90 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <Layers className="w-4 h-4 text-[#C5A059]" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#FFE394]">
            Layer Visibility
          </span>
          <span className="text-[10px] text-[#A69371] font-mono hidden xl:inline">
            (Visual toggles only — hidden items still strictly govern real scheduling availability)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { id: "showAppointments", label: "Appointments", active: layerFilters.showAppointments },
            { id: "showProposedHolds", label: "Holds", active: layerFilters.showProposedHolds },
            { id: "showClosures", label: "Closures", active: layerFilters.showClosures },
            { id: "showHolidays", label: "Holidays", active: layerFilters.showHolidays },
            { id: "showPto", label: "PTO / Sick", active: layerFilters.showPto },
            { id: "showBlackouts", label: "Blackouts", active: layerFilters.showBlackouts },
            { id: "showInternalEvents", label: "Internal", active: layerFilters.showInternalEvents },
            { id: "showProtectedWork", label: "Protected", active: layerFilters.showProtectedWork },
          ].map((layer) => (
            <button
              key={layer.id}
              type="button"
              onClick={() =>
                setLayerFilters((prev) => ({
                  ...prev,
                  [layer.id]: !prev[layer.id as keyof CalendarLayerFilters],
                }))
              }
              className={`px-2.5 py-1 rounded-[5px] border text-[11px] font-mono font-medium transition-all cursor-pointer flex items-center gap-1 ${
                layer.active
                  ? "bg-[#102B4E]/80 border-[#C5A059]/60 text-[#FFE394] shadow-sm"
                  : "bg-[#020A17] border-[#3A2C18] text-[#A69371]/60 hover:text-[#C6B697]"
              }`}
            >
              {layer.active ? <Eye className="w-3 h-3 text-[#C5A059]" /> : <EyeOff className="w-3 h-3 text-[#A69371]" />}
              <span>{layer.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Calendar View ── */}
      <CalendarView
        appointments={mergedAppointments as any}
        operationalBlocks={operationalBlocks}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        scope={scope}
        onScopeChange={setScope}
        selectedAdvocateFilter={selectedAdvocateFilter}
        onAdvocateFilterChange={setSelectedAdvocateFilter}
        currentDate={selectedDate}
        onDateChange={setSelectedDate}
        onDateClick={(d) => handleOpenSchedule(d)}
        onSlotClick={(date, time) => handleOpenSchedule(date, time)}
        onEventClick={(apt) => {
          if ((apt as any).isHold || (apt as any).proposedMeetingId) {
            setActiveProposedMeetingId((apt as any).proposedMeetingId);
          } else {
            setSelectedApt(apt as Appointment);
          }
        }}
        onOperationalBlockClick={(block) => setActiveOperationalBlock(block)}
        onReassignClick={(apt) => setReassignApt(apt as any)}
        onScheduleClick={() => handleOpenSchedule()}
        onManageStaffClick={() => setShowStaffStatusModal(true)}
        loggedInAdvocateName={user?.name || "Byron Honea"}
        staffList={staffList}
        layerFilters={layerFilters}
      />

      {/* ── Operational Block Detail Drawer ── */}
      <OperationalBlockDetailDrawer
        block={activeOperationalBlock}
        isOpen={Boolean(activeOperationalBlock)}
        onClose={() => setActiveOperationalBlock(null)}
        onSuccess={() => {
          refetchOperationalBlocks();
          refetch();
        }}
        staffList={staffList}
      />

      {/* ── Modals for Reassignment & Staff Status ── */}
      <ReassignAppointmentModal
        open={!!reassignApt}
        onOpenChange={(open) => !open && setReassignApt(null)}
        appointment={reassignApt}
        onSuccess={() => refetch()}
        isAdmin={user?.role === "admin"}
      />
      <StaffStatusManagerModal
        open={showStaffStatusModal}
        onOpenChange={setShowStaffStatusModal}
        onStatusUpdated={() => refetch()}
      />

      {/* ── PG-007 Proposed Meeting & Master Schedule Modals ── */}
      <ProposedMeetingDetailModal
        proposedMeetingId={activeProposedMeetingId}
        isOpen={Boolean(activeProposedMeetingId)}
        onClose={() => setActiveProposedMeetingId(null)}
        onSuccess={() => {
          refetch();
          refetchUnified();
        }}
      />

      <MasterScheduleModal
        isOpen={showMasterSchedule}
        onClose={() => {
          setShowMasterSchedule(false);
          setScheduleModalAction(undefined);
        }}
        onSuccess={() => {
          refetch();
          refetchUnified();
        }}
        initialDate={scheduleModalDate}
        initialTime={scheduleModalTime}
        advocateList={staffList}
        defaultAction={scheduleModalAction}
      />

      {/* ── Upcoming Appointments ── */}
      <Card className="bg-[#05142B]/90 border border-[#3A2C18] shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] rounded-[5px]">
        <CardHeader className="border-b border-[#3A2C18]/60 pb-4">
          <CardTitle className="font-serif text-[#FFF4D4] text-xl font-normal">Upcoming Appointments</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {upcomingAppointments.length === 0 ? (
            <p className="text-center text-[#A69371] py-8">No upcoming appointments</p>
          ) : (
            <div className="space-y-3">
              {upcomingAppointments.map((apt: Appointment) => {
                const dual = formatDualTimes(
                  apt.startTime,
                  apt.endTime,
                  apt.clientTimeZone,
                  apt.originalTimeZone || "America/New_York"
                );
                return (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-[#3A2C18]/80 bg-[#020A17]/80 hover:border-[#C5A059]/60 hover:bg-[#07162B]/80 transition-all cursor-pointer"
                    onClick={() => setSelectedApt(apt)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg bg-[#07162B] border border-[#3A2C18] flex flex-col items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-[#C5A059] uppercase tracking-wider">
                          {new Date(apt.startTime).toLocaleDateString([], { month: "short" })}
                        </span>
                        <span className="text-lg font-serif font-bold text-[#FFF4D4] leading-none">
                          {new Date(apt.startTime).getDate()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm text-[#FFF4D4]">{apt.title}</p>
                          {apt.meetingType && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#07162B] text-[#FFE394] border border-[#3A2C18]">
                              {apt.meetingType}
                            </span>
                          )}
                          {apt.videoLink && <Video className="h-3.5 w-3.5 text-blue-400" aria-label="Video meeting" />}
                        </div>

                        {/* Dual-Time Display (Red for Client, Green for Waypoint) */}
                        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                          {/* 🔴 RED BADGE: CLIENT SCHEDULED TIME */}
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-950/70 text-rose-300 border border-rose-500/50 shadow-sm"
                            title={`Client's local scheduled time in ${dual.clientTime.friendlyName} Time`}
                          >
                            <span className="w-2 h-2 rounded-full bg-rose-500" />
                            <span className="font-medium text-[10px] text-rose-400 uppercase tracking-wide">Client ({dual.clientTime.tzAbbr}):</span>
                            <span className="font-mono">{dual.clientTime.startTime}</span>
                          </span>

                          {/* 🟢 GREEN BADGE: WAYPOINT ADVOCATE TIME */}
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-950/70 text-emerald-300 border border-emerald-500/50 shadow-sm"
                            title="Waypoint Advocate's time in Atlanta, GA (Eastern)"
                          >
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="font-medium text-[10px] text-emerald-400 uppercase tracking-wide">Waypoint ({dual.waypointTime.tzAbbr}):</span>
                            <span className="font-mono">{dual.waypointTime.startTime}</span>
                          </span>
                        </div>

                        {dual.clientTime.isDifferent && (
                          <p className="text-[11px] text-[#C6B697] italic mt-1 flex items-center gap-1">
                            <span>{dual.explanation}</span>
                          </p>
                        )}

                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {apt.parentName && (
                            <span className="text-xs text-[#C6B697] flex items-center gap-1">
                              <User className="h-3 w-3 text-[#C5A059]" />{apt.parentName}
                            </span>
                          )}
                          {apt.studentName && (
                            <span className="text-xs text-[#C6B697] flex items-center gap-1">
                              <span className="text-[#3A2C18]">·</span>{apt.studentName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(apt.status)}`}>
                        {apt.status}
                      </span>
                      <Select
                        value={apt.status}
                        onValueChange={(v) => handleStatusChange(apt.id, v)}
                      >
                        <SelectTrigger className="w-[130px] h-8 text-xs bg-[#020A17] border-[#3A2C18] text-[#FFF4D4]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4]">
                          <SelectItem value="Scheduled">Scheduled</SelectItem>
                          <SelectItem value="Confirmed">Confirmed</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                          <SelectItem value="Cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Availability Management ── */}
      <Card className="bg-[#05142B]/90 border border-[#3A2C18] shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] rounded-xl">
        <CardHeader className="border-b border-[#3A2C18]/60 pb-4">
          <CardTitle className="font-serif text-[#FFF4D4] text-xl font-normal">Your Availability</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-sm text-[#C6B697] mb-4">Set your available hours for client bookings</p>
          <div className="space-y-3">
            {DAYS.map((day, index) => {
              const dayAvail = (availability as any[]).find((a: any) => a.dayOfWeek === index);
              const isAvailable = dayAvail?.isAvailable ?? (index >= 1 && index <= 5);
              const startTime = dayAvail?.startTime ?? "09:00";
              const endTime = dayAvail?.endTime ?? "17:00";
              return (
                <div key={day} className="flex items-center gap-4 p-3 rounded-lg border border-[#3A2C18]/70 bg-[#020A17]/80">
                  <div className="w-28">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isAvailable}
                        onChange={(e) => {
                          const updated = DAYS.map((_, i) => {
                            const existing = (availability as any[]).find((a: any) => a.dayOfWeek === i);
                            if (i === index) {
                              return { dayOfWeek: i, startTime: existing?.startTime ?? "09:00", endTime: existing?.endTime ?? "17:00", isAvailable: e.target.checked };
                            }
                            return { dayOfWeek: i, startTime: existing?.startTime ?? "09:00", endTime: existing?.endTime ?? "17:00", isAvailable: existing?.isAvailable ?? (i >= 1 && i <= 5) };
                          });
                          updateAvailabilityMutation.mutate(updated);
                        }}
                        className="rounded border-[#3A2C18] bg-[#07162B] text-[#C5A059] focus:ring-[#C5A059]"
                      />
                      <span className="text-sm font-medium text-[#FFF4D4]">{day}</span>
                    </label>
                  </div>
                  {isAvailable && (
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        defaultValue={startTime}
                        onBlur={(e) => {
                          const updated = DAYS.map((_, i) => {
                            const existing = (availability as any[]).find((a: any) => a.dayOfWeek === i);
                            if (i === index) {
                              return { dayOfWeek: i, startTime: e.target.value, endTime: existing?.endTime ?? "17:00", isAvailable: true };
                            }
                            return { dayOfWeek: i, startTime: existing?.startTime ?? "09:00", endTime: existing?.endTime ?? "17:00", isAvailable: existing?.isAvailable ?? (i >= 1 && i <= 5) };
                          });
                          updateAvailabilityMutation.mutate(updated);
                        }}
                        className="rounded-md border border-[#3A2C18] bg-[#07162B] px-2 py-1 text-sm text-[#FFF4D4] focus:border-[#C5A059]"
                      />
                      <span className="text-sm text-[#C6B697]">to</span>
                      <input
                        type="time"
                        defaultValue={endTime}
                        onBlur={(e) => {
                          const updated = DAYS.map((_, i) => {
                            const existing = (availability as any[]).find((a: any) => a.dayOfWeek === i);
                            if (i === index) {
                              return { dayOfWeek: i, startTime: existing?.startTime ?? "09:00", endTime: e.target.value, isAvailable: true };
                            }
                            return { dayOfWeek: i, startTime: existing?.startTime ?? "09:00", endTime: existing?.endTime ?? "17:00", isAvailable: existing?.isAvailable ?? (i >= 1 && i <= 5) };
                          });
                          updateAvailabilityMutation.mutate(updated);
                        }}
                        className="rounded-md border border-[#3A2C18] bg-[#07162B] px-2 py-1 text-sm text-[#FFF4D4] focus:border-[#C5A059]"
                      />
                    </div>
                  )}
                  {!isAvailable && (
                    <span className="text-sm text-[#A69371] italic">Unavailable</span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Past Appointments ── */}
      {pastAppointments.length > 0 && (
        <Card className="bg-[#05142B]/90 border border-[#3A2C18] shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] rounded-xl">
          <CardHeader className="border-b border-[#3A2C18]/60 pb-3">
            <CardTitle className="font-serif text-[#A69371] text-lg font-normal">Past & Cancelled</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="space-y-2">
              {pastAppointments.slice(0, 10).map((apt: Appointment) => (
                <div
                  key={apt.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-[#3A2C18]/60 bg-[#020A17]/60 opacity-80 cursor-pointer hover:opacity-100 hover:border-[#C5A059]/50 hover:bg-[#07162B]/60 transition-all"
                  onClick={() => setSelectedApt(apt)}
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-medium text-sm text-[#FFF4D4]">{apt.title}</p>
                        {apt.meetingType && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#05142B] text-[#C6B697] border border-[#3A2C18]">
                            {apt.meetingType}
                          </span>
                        )}
                        {apt.videoLink && <Video className="h-3 w-3 text-blue-400" />}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs text-[#A69371]">
                          {new Date(apt.startTime).toLocaleDateString()}
                        </p>
                        {apt.parentName && <span className="text-xs text-[#A69371]">{apt.parentName}</span>}
                        {apt.studentName && <span className="text-xs text-[#A69371]">· {apt.studentName}</span>}
                      </div>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(apt.status)}`}>
                    {apt.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
        </>
      )}

      {/* ⚠️ SERVICE LIMIT WARNING DIALOG (Section 10) */}
      <Dialog open={!!serviceLimitWarning} onOpenChange={(open) => !open && setServiceLimitWarning(null)}>
        <DialogContent className="max-w-md bg-[#05142B] border border-amber-500/50 text-[#FFF4D4] shadow-[0_16px_40px_rgba(0,0,0,0.95)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-serif text-amber-300 text-lg font-normal">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              {serviceLimitWarning?.isNotIncluded
                ? "⚠️ SERVICE NOT INCLUDED IN CURRENT PLAN"
                : "⚠️ SERVICE LIMIT REACHED"}
            </DialogTitle>
            <p className="text-xs text-[#C6B697] pt-1">
              {serviceLimitWarning?.isNotIncluded ? (
                <>
                  <strong className="text-[#FFF4D4]">{serviceLimitWarning?.serviceName}</strong> is not included in the client's current plan.
                </>
              ) : (
                <>
                  This client has used or scheduled all included{" "}
                  <strong className="text-[#FFF4D4]">{serviceLimitWarning?.serviceName}</strong> for the
                  current service period ({serviceLimitWarning?.used} of{" "}
                  {serviceLimitWarning?.totalAllowance} already consumed).
                </>
              )}
            </p>
          </DialogHeader>

          <div className="py-2 space-y-2 text-xs text-[#C6B697] bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg">
            <p className="text-[#FFF4D4] font-medium">How would you like to proceed?</p>
            <ul className="list-disc list-inside space-y-1 text-[11px]">
              <li><strong>Add Extra Allowance:</strong> Authorizes +1 session and schedules immediately.</li>
              <li><strong>Override & Schedule:</strong> Schedules appointment and records an audited override note in the Activity Timeline.</li>
              <li><strong>Cancel:</strong> Aborts scheduling without changing allowances.</li>
            </ul>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setServiceLimitWarning(null)}
              className="text-xs text-[#C6B697] hover:text-[#FFF4D4] hover:bg-[#07162B]"
            >
              Cancel
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddAllowanceAndSchedule}
                disabled={addExtraAllowanceMutation.isPending}
                className="text-xs border-emerald-500/50 text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/50"
              >
                + Add Extra Allowance & Schedule
              </Button>
              <Button
                size="sm"
                onClick={() => executeCreate(true)}
                className="text-xs bg-gradient-to-r from-amber-600 to-amber-700 hover:brightness-110 text-white font-bold border border-amber-400/50 shadow-sm"
              >
                Override & Schedule
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </ScopedErrorBoundary>
  );
}

