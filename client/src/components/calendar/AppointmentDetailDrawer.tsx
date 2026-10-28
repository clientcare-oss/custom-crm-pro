import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import {
  X,
  Video,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  Clock,
  User,
  UserCheck,
  MapPin,
  FileText,
  Ban,
  Trash2,
  Edit,
  ArrowRightLeft,
  ChevronDown,
  Globe,
  ShieldAlert,
  CalendarClock,
  Sparkles,
  Layers,
  MessageSquare,
  Plus,
  Save,
  Link as LinkIcon,
  PhoneCall,
  Phone,
  Mail,
  Headset,
  ArrowRight,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ParentContactHistoryDrawer } from "@/components/contact/ParentContactHistoryDrawer";
import { trpc } from "@/lib/trpc";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import VoiceInput from "@/components/VoiceInput";
import VoiceTextarea from "@/components/VoiceTextarea";
import ClientCallingSafetyBadge from "@/components/callingSafety/ClientCallingSafetyBadge";
import {
  formatDualTimes,
  SIX_CORE_ZONES,
  detectTimeZoneFromLocation,
} from "@shared/timezones";

export interface AppointmentDrawerData {
  id: number;
  clientId: number | null;
  parentContactId?: number | null;
  leadId?: number | null;
  discoveryCallId?: number | null;
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
  parentEmail?: string | null;
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

interface AppointmentDetailDrawerProps {
  appointment: AppointmentDrawerData | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveEdit?: (data: {
    id: number;
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    location?: string;
    videoLink?: string;
    parentName?: string;
    parentPhone?: string;
    studentName?: string;
    assignedAdvocateName?: string;
    status: string;
    clientTimeZone?: string;
  }) => Promise<void> | void;
  onCancelAppointment?: (id: number, notifyParent: boolean) => Promise<void> | void;
  onDeleteAppointment?: (id: number) => Promise<void> | void;
  onStatusChange?: (id: number, status: string) => Promise<void> | void;
  onReschedule?: (apt: AppointmentDrawerData) => void;
  onReassign?: (apt: AppointmentDrawerData) => void;
  contacts?: any[];
  leads?: any[];
  staffList?: { id: string; name: string; status: string }[];
  isSaving?: boolean;
}

export function getStatusBarColor(status: string): string {
  switch (status) {
    case "Confirmed":
      return "bg-emerald-500";
    case "Scheduled":
      return "bg-sky-500";
    case "Completed":
      return "bg-slate-500";
    case "Cancelled":
      return "bg-rose-500";
    case "Needs Coverage":
      return "bg-amber-500";
    default:
      return "bg-[#C5A059]";
  }
}

export function getMeetingPlatformLabel(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes("meet.google.com")) return "Google Meet";
  if (lower.includes("zoom.us") || lower.includes("zoom.com")) return "Zoom Meeting";
  if (lower.includes("teams.microsoft.com")) return "Microsoft Teams";
  if (lower.includes("webex.com")) return "Webex";
  return "Virtual Meeting";
}

/**
 * Format datetime for HTML datetime-local input
 */
export function toLocalDateTimeInput(dt: Date | string): string {
  const d = new Date(dt);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function AppointmentDetailDrawer({
  appointment,
  isOpen,
  onClose,
  onSaveEdit,
  onCancelAppointment,
  onDeleteAppointment,
  onStatusChange,
  onReschedule,
  onReassign,
  contacts = [],
  leads = [],
  staffList = [],
  isSaving = false,
}: AppointmentDetailDrawerProps) {
  const [, setLocation] = useLocation();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Mode states
  const [isEditing, setIsEditing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notifyParentOnCancel, setNotifyParentOnCancel] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  // Inline Note Editor state
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [quickNoteText, setQuickNoteText] = useState("");

  // Parent interaction dialogs
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [parentDetailsDrawerOpen, setParentDetailsDrawerOpen] = useState(false);

  // Edit form state
  const [editFormData, setEditFormData] = useState<{
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    location: string;
    videoLink: string;
    parentName: string;
    parentPhone: string;
    studentName: string;
    assignedAdvocateName: string;
    status: string;
    clientTimeZone: string;
  } | null>(null);

  // Sync edit form data when appointment changes or editing is opened
  useEffect(() => {
    if (appointment) {
      setEditFormData({
        title: appointment.title,
        description: appointment.description || "",
        startTime: toLocalDateTimeInput(appointment.startTime),
        endTime: toLocalDateTimeInput(appointment.endTime),
        location: appointment.location || "",
        videoLink: appointment.videoLink || appointment.clientMeetingLink || "",
        parentName: appointment.parentName || "",
        parentPhone: appointment.parentPhone || "",
        studentName: appointment.studentName || "",
        assignedAdvocateName: appointment.assignedAdvocateName || "Byron Honea",
        status: appointment.status,
        clientTimeZone: appointment.clientTimeZone || "America/New_York",
      });
      setIsEditing(false);
      setIsCancelling(false);
      setIsDeleting(false);
      setIsAddingNote(false);
      setQuickNoteText(appointment.description || "");
    }
  }, [appointment?.id]);

  // Handle Escape key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        if (isEditing) {
          setIsEditing(false);
        } else if (isCancelling) {
          setIsCancelling(false);
        } else if (isDeleting) {
          setIsDeleting(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isEditing, isCancelling, isDeleting, onClose]);

  // Copy Meeting Link Handler
  const handleCopyLink = (url: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success("Meeting link copied to clipboard");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Primary Virtual Meeting URL
  const meetingUrl = useMemo(() => {
    if (!appointment) return null;
    return appointment.videoLink || appointment.clientMeetingLink || null;
  }, [appointment]);

  // Auto-fill from contact selection
  const handleAutoFillFromContact = (contactIdStr: string) => {
    const cId = parseInt(contactIdStr);
    const contact = contacts.find((c: any) => c.id === cId);
    if (!contact) return;
    const isStudent = contact.jobTitle === "Student";
    const detectedTz =
      contact.confirmedTimeZone ||
      contact.timezone ||
      (contact.state
        ? detectTimeZoneFromLocation(contact.city || "", contact.state).timeZone
        : "America/New_York");

    if (isStudent) {
      const parent = contact.parentContactId
        ? contacts.find((c: any) => c.id === contact.parentContactId)
        : null;
      setEditFormData((prev) =>
        prev
          ? {
              ...prev,
              studentName: `${contact.firstName} ${contact.lastName}`,
              parentName: parent
                ? `${parent.firstName} ${parent.lastName}`
                : prev.parentName,
              parentPhone: parent ? parent.phone || "" : prev.parentPhone,
              clientTimeZone: detectedTz || prev.clientTimeZone,
            }
          : prev
      );
    } else {
      setEditFormData((prev) =>
        prev
          ? {
              ...prev,
              parentName: `${contact.firstName} ${contact.lastName}`,
              parentPhone: contact.phone || "",
              clientTimeZone: detectedTz || prev.clientTimeZone,
            }
          : prev
      );
    }
  };

  // Save full edit
  const handleSaveFullEdit = async () => {
    if (!appointment || !editFormData) return;
    if (!editFormData.title || !editFormData.startTime || !editFormData.endTime) {
      toast.error("Title, start time, and end time are required");
      return;
    }
    if (onSaveEdit) {
      await onSaveEdit({
        id: appointment.id,
        title: editFormData.title,
        description: editFormData.description || undefined,
        startTime: new Date(editFormData.startTime),
        endTime: new Date(editFormData.endTime),
        location: editFormData.location || undefined,
        videoLink: editFormData.videoLink || undefined,
        parentName: editFormData.parentName || undefined,
        parentPhone: editFormData.parentPhone || undefined,
        studentName: editFormData.studentName || undefined,
        assignedAdvocateName: editFormData.assignedAdvocateName,
        status: editFormData.status,
        clientTimeZone: editFormData.clientTimeZone || undefined,
      });
      setIsEditing(false);
    }
  };

  // Save quick note
  const handleSaveQuickNote = async () => {
    if (!appointment) return;
    if (onSaveEdit) {
      await onSaveEdit({
        id: appointment.id,
        title: appointment.title,
        description: quickNoteText.trim() || undefined,
        startTime: new Date(appointment.startTime),
        endTime: new Date(appointment.endTime),
        location: appointment.location || undefined,
        videoLink: appointment.videoLink || undefined,
        parentName: appointment.parentName || undefined,
        parentPhone: appointment.parentPhone || undefined,
        studentName: appointment.studentName || undefined,
        assignedAdvocateName: appointment.assignedAdvocateName || undefined,
        status: appointment.status,
        clientTimeZone: appointment.clientTimeZone || undefined,
      });
      setIsAddingNote(false);
      toast.success("Appointment notes updated");
    }
  };

  // Render clickable links inside descriptions
  const renderFormattedDescription = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, idx) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={idx}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#C5A059] underline hover:text-[#FFE394] break-all inline-flex items-center gap-1"
          >
            <span>{part}</span>
            <ExternalLink className="w-3 h-3 inline-block shrink-0" />
          </a>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  // Query contacts from server if props not populated
  const { data: serverContacts } = trpc.contacts.list.useQuery(undefined, {
    enabled: isOpen,
  });

  const allContacts = useMemo(() => {
    if (contacts && contacts.length > 0) return contacts;
    return serverContacts || [];
  }, [contacts, serverContacts]);

  // Student contact detector helper
  const isStudent = (c: any) => {
    if (!c) return false;
    const title = (c.jobTitle || "").toLowerCase().trim();
    if (title.includes("student")) return true;
    if (c.parentContactId != null && c.parentContactId > 0) return true;
    if (c.studentStatus || c.gradeLevel || c.schoolName || c.caseId) return true;
    return false;
  };

  // Resolved relationship links (family contact, student contact, lead)
  const resolvedRelationships = useMemo(() => {
    if (!appointment) return { parentId: null, studentId: null, leadId: null, isDiscovery: false };

    let parentId = appointment.parentContactId || null;
    let studentId: number | null = null;

    // 1. Direct match by clientId
    if (appointment.clientId) {
      const c = allContacts.find((x: any) => x.id === appointment.clientId);
      if (c && isStudent(c)) {
        studentId = c.id;
        if (!parentId && c.parentContactId) parentId = c.parentContactId;
      } else if (c) {
        parentId = c.id;
      }
    }

    // 2. Try finding student by studentName in contacts
    if (!studentId && appointment.studentName) {
      const targetStudentName = appointment.studentName.trim().toLowerCase();
      const match = allContacts.find((x: any) => {
        const full = `${x.firstName || ""} ${x.lastName || ""}`.trim().toLowerCase();
        return isStudent(x) && full === targetStudentName;
      });
      if (match) {
        studentId = match.id;
        if (!parentId && match.parentContactId) parentId = match.parentContactId;
      }
    }

    // 3. Try finding parent by parentName
    if (!parentId && appointment.parentName) {
      const targetParentName = appointment.parentName.trim().toLowerCase();
      const match = allContacts.find((x: any) => {
        const full = `${x.firstName || ""} ${x.lastName || ""}`.trim().toLowerCase();
        return !isStudent(x) && full === targetParentName;
      });
      if (match) {
        parentId = match.id;
      }
    }

    // 4. Try finding parent by parentPhone
    if (!parentId && appointment.parentPhone) {
      const normPhone = appointment.parentPhone.replace(/\D/g, "");
      if (normPhone) {
        const c = allContacts.find(
          (x: any) =>
            (x.phone || "").replace(/\D/g, "") === normPhone && !isStudent(x)
        );
        if (c) parentId = c.id;
      }
    }

    // 5. If parentId known, find student among linked children
    if (!studentId && parentId) {
      const child = allContacts.find((x: any) => x.parentContactId === parentId);
      if (child) {
        studentId = child.id;
      }
    }

    // 6. Fallback studentId to clientId
    if (!studentId && appointment.clientId) {
      studentId = appointment.clientId;
    }

    let leadId = appointment.leadId || null;
    if (!leadId && parentId) {
      const l = leads.find((x: any) => x.contactId === parentId);
      if (l) leadId = l.id;
    }
    if (!leadId && appointment.parentPhone) {
      const normPhone = appointment.parentPhone.replace(/\D/g, "");
      const l = leads.find((x: any) => (x.parentPhone || "").replace(/\D/g, "") === normPhone);
      if (l) leadId = l.id;
    }

    const isDiscovery =
      appointment.meetingType === "Discovery Call" ||
      appointment.title?.toLowerCase().includes("discovery") ||
      !!leadId;

    return { parentId, studentId, leadId, isDiscovery };
  }, [appointment, allContacts, leads]);

  // Resolved phone and email for parent
  const clientPhone = useMemo(() => {
    if (appointment?.parentPhone) return appointment.parentPhone;
    if (resolvedRelationships.parentId) {
      const p = allContacts.find((c: any) => c.id === resolvedRelationships.parentId);
      if (p?.phone) return p.phone;
    }
    return null;
  }, [appointment?.parentPhone, resolvedRelationships.parentId, allContacts]);

  const clientEmail = useMemo(() => {
    if (appointment?.parentEmail) return appointment.parentEmail;
    if (resolvedRelationships.parentId) {
      const p = allContacts.find((c: any) => c.id === resolvedRelationships.parentId);
      if (p?.email) return p.email;
    }
    return null;
  }, [appointment?.parentEmail, resolvedRelationships.parentId, allContacts]);

  // Direct action handlers
  const handleContactClient = () => {
    setContactModalOpen(true);
  };

  const handleViewParentDetails = () => {
    if (resolvedRelationships.parentId) {
      setParentDetailsDrawerOpen(true);
    } else {
      onClose();
      setLocation(`/contacts?search=${encodeURIComponent(appointment?.parentName || "")}`);
    }
  };

  const handleOpenStudentWorkspace = () => {
    const targetStudentId =
      resolvedRelationships.studentId ||
      appointment?.clientId;

    if (targetStudentId) {
      onClose();
      setLocation(`/contacts/${targetStudentId}`);
    } else if (appointment?.studentName) {
      const targetName = appointment.studentName.trim().toLowerCase();
      const match = allContacts.find((c: any) => {
        const full = `${c.firstName || ""} ${c.lastName || ""}`.trim().toLowerCase();
        return full === targetName;
      });
      if (match?.id) {
        onClose();
        setLocation(`/contacts/${match.id}`);
      } else {
        onClose();
        setLocation(`/students?search=${encodeURIComponent(appointment.studentName)}`);
      }
    } else {
      onClose();
      setLocation("/students");
    }
  };

  // Dual time zone calculation
  const dualTime = useMemo(() => {
    if (!appointment) return null;
    return formatDualTimes(
      appointment.startTime,
      appointment.endTime,
      appointment.clientTimeZone,
      appointment.originalTimeZone || "America/New_York"
    );
  }, [appointment]);

  if (!appointment) return null;

  return (
    <>
      {/* ── Semi-Transparent Backdrop (Click to Close) ── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px] transition-opacity duration-300 motion-reduce:transition-none"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* ── Slide-Out Drawer Container ── */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Appointment Details: ${appointment.title}`}
        className={`fixed top-0 right-0 bottom-0 z-50 h-full w-full sm:w-[420px] md:w-[440px] max-w-full flex flex-col bg-[#05142B] border-l border-[#3A2C18] shadow-[-16px_0_48px_rgba(0,0,0,0.85)] transform transition-transform duration-300 ease-out motion-reduce:transition-none ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Status Top Accent Bar */}
        <div className={`h-1.5 w-full shrink-0 ${getStatusBarColor(appointment.status)}`} />

        {/* ── SECTION 1: FIXED APPOINTMENT HEADER & JOIN MEETING BUTTON (PINNED) ── */}
        <div className="shrink-0 p-4 sm:p-5 border-b border-[#3A2C18]/60 bg-[#07162B] space-y-3.5 relative">
          {/* Top Row: Meeting Badge + Action Toolbar */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider border ${
                  appointment.meetingType === "IEP Meeting"
                    ? "bg-purple-950/60 text-purple-300 border-purple-500/40"
                    : appointment.meetingType === "Discovery Call"
                    ? "bg-[#FFE394]/15 text-[#FFE394] border-[#FFE394]/30"
                    : "bg-[#020A17] text-[#C5A059] border-[#3A2C18]"
                }`}
              >
                {appointment.meetingType || "Appointment"}
              </span>

              {/* Status Indicator Pill */}
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                  appointment.status === "Confirmed"
                    ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/40"
                    : appointment.status === "Needs Coverage"
                    ? "bg-amber-950/60 text-amber-300 border-amber-500/40"
                    : appointment.status === "Cancelled"
                    ? "bg-rose-950/60 text-rose-300 border-rose-500/40"
                    : "bg-blue-950/60 text-blue-300 border-blue-500/40"
                }`}
              >
                {appointment.status}
              </span>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-1.5">
              {!isEditing && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] hover:brightness-110 active:scale-95 transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                    title="Edit appointment details"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  {/* Cancel Button / Toggle */}
                  {appointment.status !== "Cancelled" && !isCancelling && !isDeleting && (
                    <button
                      type="button"
                      onClick={() => setIsCancelling(true)}
                      className="p-1.5 rounded-lg text-[#C6B697] hover:text-amber-400 hover:bg-[#020A17] transition-colors cursor-pointer"
                      title="Cancel appointment"
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  )}

                  {/* Delete Button / Toggle */}
                  {!isDeleting && !isCancelling && (
                    <button
                      type="button"
                      onClick={() => setIsDeleting(true)}
                      className="p-1.5 rounded-lg text-[#C6B697] hover:text-rose-400 hover:bg-[#020A17] transition-colors cursor-pointer"
                      title="Delete appointment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}

              {/* Close Drawer Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-[#C6B697] hover:text-[#FFF4D4] hover:bg-[#020A17] transition-colors cursor-pointer ml-1"
                aria-label="Close appointment drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Cancellation Confirmation Bar */}
          {isCancelling && (
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs text-amber-200">
                <span className="font-semibold">Cancel this appointment?</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox
                    id="notifyParentCancelDrawer"
                    checked={notifyParentOnCancel}
                    onCheckedChange={(v) => setNotifyParentOnCancel(!!v)}
                  />
                  <span className="text-[11px] text-[#C6B697]">Notify parent</span>
                </label>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={async () => {
                    if (onCancelAppointment) {
                      await onCancelAppointment(appointment.id, notifyParentOnCancel);
                      setIsCancelling(false);
                    }
                  }}
                  className="flex-1 h-8 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Confirm Cancellation
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsCancelling(false)}
                  className="h-8 text-xs border-[#3A2C18] bg-[#020A17] text-[#D8C7A5]"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          )}

          {/* Deletion Confirmation Bar */}
          {isDeleting && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 space-y-2 animate-in fade-in duration-200">
              <span className="text-xs text-rose-200 font-semibold block">
                Permanently delete this calendar entry?
              </span>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={async () => {
                    if (onDeleteAppointment) {
                      await onDeleteAppointment(appointment.id);
                      setIsDeleting(false);
                    }
                  }}
                  className="flex-1 h-8 text-xs font-bold bg-rose-700 hover:bg-rose-800 text-white"
                >
                  Delete Entry
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsDeleting(false)}
                  className="h-8 text-xs border-[#3A2C18] bg-[#020A17] text-[#D8C7A5]"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Prominent Appointment Title */}
          <div>
            <h2 className="text-lg sm:text-xl font-serif font-bold text-[#FFF4D4] leading-snug tracking-wide">
              {isEditing ? "Edit Appointment" : appointment.title}
            </h2>

            {/* Compact Timing Summary */}
            {dualTime && !isEditing && (
              <div className="flex items-center gap-2 text-xs text-[#C6B697] mt-1 flex-wrap">
                <Calendar className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
                <span className="font-medium text-[#FFF4D4]">
                  {dualTime.waypointTime.dateFormatted}
                </span>
                <span>·</span>
                <Clock className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
                <span className="font-mono text-[#FFE394]">
                  {dualTime.waypointTime.timeRange}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#020A17] border border-[#3A2C18] text-[#A69371] font-mono">
                  {dualTime.waypointTime.tzAbbr}
                </span>
              </div>
            )}
          </div>

          {/* Needs Coverage Alert Banner if flagged */}
          {appointment.status === "Needs Coverage" && !isEditing && (
            <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/50 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-amber-200">Coverage Required: </span>
                <span className="text-amber-300/90">
                  Advocate is unavailable. Reassign to delegate.
                </span>
              </div>
            </div>
          )}

          {/* ── PRIORITY REQUIREMENT: PINNED JOIN MEETING BUTTON ── */}
          {!isEditing && (
            <div className="pt-1">
              {meetingUrl ? (
                <div className="flex items-center gap-2">
                  <a
                    href={meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 h-11 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(37,99,235,0.4)] transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                  >
                    <Video className="w-4 h-4" />
                    <span>Join {getMeetingPlatformLabel(meetingUrl)}</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </a>

                  {/* Copy Link Button */}
                  <button
                    type="button"
                    onClick={() => handleCopyLink(meetingUrl)}
                    className="h-11 px-3 rounded-xl bg-[#020A17] border border-[#3A2C18] text-[#D8C7A5] hover:text-[#FFF4D4] hover:bg-[#07162B] flex items-center gap-1.5 text-xs transition-colors cursor-pointer shrink-0"
                    title="Copy meeting URL"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-semibold hidden sm:inline">
                          Copied
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#C5A059]" />
                        <span className="hidden sm:inline">Copy</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl border border-dashed border-[#3A2C18] bg-[#020A17]/60 flex items-center justify-between text-xs">
                  <span className="text-[#A69371] italic flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-[#A69371]" />
                    Virtual meeting link not attached
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="text-xs text-[#C5A059] hover:text-[#FFE394] font-semibold hover:underline"
                  >
                    + Add Link
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── SECTION 2: INDEPENDENTLY SCROLLABLE APPOINTMENT DETAILS ── */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5 space-y-4">
          {isEditing && editFormData ? (
            /* ── FULL EDIT FORM ── */
            <div className="space-y-3.5">
              {/* Auto-fill from contact */}
              <div>
                <label className="text-xs font-semibold text-[#FFE394] uppercase tracking-wider">
                  Auto-fill from Contact
                </label>
                <Select onValueChange={handleAutoFillFromContact}>
                  <SelectTrigger className="mt-1 h-9 text-xs bg-[#020A17] border-[#3A2C18] text-[#FFF4D4]">
                    <SelectValue placeholder="Pick a contact to auto-fill..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] max-h-56">
                    {contacts.map((c: any) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.firstName} {c.lastName}
                        {c.jobTitle === "Student" ? " (Student)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-semibold text-[#FFE394] uppercase tracking-wider">
                  Title *
                </label>
                <VoiceInput
                  value={editFormData.title}
                  onChange={(e) =>
                    setEditFormData((d) => (d ? { ...d, title: e.target.value } : d))
                  }
                  placeholder="Appointment title"
                  className="mt-1 h-9 text-xs sm:text-sm bg-[#020A17] border-[#3A2C18] text-[#FFF4D4]"
                />
              </div>

              {/* Start & End Times */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-[#FFE394] uppercase tracking-wider">
                    Start *
                  </label>
                  <input
                    type="datetime-local"
                    value={editFormData.startTime}
                    onChange={(e) =>
                      setEditFormData((d) =>
                        d ? { ...d, startTime: e.target.value } : d
                      )
                    }
                    className="mt-1 w-full h-9 text-xs rounded-md border border-[#3A2C18] bg-[#020A17] text-[#FFF4D4] px-2 focus:outline-none focus:border-[#C5A059]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#FFE394] uppercase tracking-wider">
                    End *
                  </label>
                  <input
                    type="datetime-local"
                    value={editFormData.endTime}
                    onChange={(e) =>
                      setEditFormData((d) =>
                        d ? { ...d, endTime: e.target.value } : d
                      )
                    }
                    className="mt-1 w-full h-9 text-xs rounded-md border border-[#3A2C18] bg-[#020A17] text-[#FFF4D4] px-2 focus:outline-none focus:border-[#C5A059]"
                  />
                </div>
              </div>

              {/* Client Time Zone */}
              <div>
                <label className="text-xs font-semibold text-[#FFE394] uppercase tracking-wider flex items-center gap-1">
                  <Globe className="h-3 w-3 text-[#C5A059]" /> Client Time Zone
                </label>
                <Select
                  value={editFormData.clientTimeZone}
                  onValueChange={(v) =>
                    setEditFormData((d) => (d ? { ...d, clientTimeZone: v } : d))
                  }
                >
                  <SelectTrigger className="mt-1 h-9 text-xs bg-[#020A17] border-[#3A2C18] text-[#FFF4D4]">
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

              {/* Assigned Advocate */}
              <div>
                <label className="text-xs font-semibold text-[#FFE394] uppercase tracking-wider flex items-center gap-1">
                  <User className="h-3 w-3 text-cyan-400" /> Assigned Advocate
                </label>
                <Select
                  value={editFormData.assignedAdvocateName}
                  onValueChange={(v) =>
                    setEditFormData((d) =>
                      d ? { ...d, assignedAdvocateName: v } : d
                    )
                  }
                >
                  <SelectTrigger className="mt-1 h-9 text-xs bg-[#020A17] border-[#3A2C18] text-[#FFF4D4]">
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

              {/* Status */}
              <div>
                <label className="text-xs font-semibold text-[#FFE394] uppercase tracking-wider">
                  Status
                </label>
                <Select
                  value={editFormData.status}
                  onValueChange={(v) =>
                    setEditFormData((d) => (d ? { ...d, status: v } : d))
                  }
                >
                  <SelectTrigger className="mt-1 h-9 text-xs bg-[#020A17] border-[#3A2C18] text-[#FFF4D4]">
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

              {/* Virtual Meeting Link */}
              <div>
                <label className="text-xs font-semibold text-[#FFE394] uppercase tracking-wider">
                  Video / Meeting Link
                </label>
                <VoiceInput
                  value={editFormData.videoLink}
                  onChange={(e) =>
                    setEditFormData((d) =>
                      d ? { ...d, videoLink: e.target.value } : d
                    )
                  }
                  placeholder="https://meet.google.com/..."
                  className="mt-1 h-9 text-xs sm:text-sm bg-[#020A17] border-[#3A2C18] text-[#FFF4D4]"
                />
              </div>

              {/* Location */}
              <div>
                <label className="text-xs font-semibold text-[#FFE394] uppercase tracking-wider">
                  Location (Physical or Virtual)
                </label>
                <VoiceInput
                  value={editFormData.location}
                  onChange={(e) =>
                    setEditFormData((d) =>
                      d ? { ...d, location: e.target.value } : d
                    )
                  }
                  placeholder="School District Office / Google Meet"
                  className="mt-1 h-9 text-xs sm:text-sm bg-[#020A17] border-[#3A2C18] text-[#FFF4D4]"
                />
              </div>

              {/* Parent & Student */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-[#FFE394] uppercase tracking-wider">
                    Parent Name
                  </label>
                  <VoiceInput
                    value={editFormData.parentName}
                    onChange={(e) =>
                      setEditFormData((d) =>
                        d ? { ...d, parentName: e.target.value } : d
                      )
                    }
                    placeholder="Parent name"
                    className="mt-1 h-9 text-xs sm:text-sm bg-[#020A17] border-[#3A2C18] text-[#FFF4D4]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#FFE394] uppercase tracking-wider">
                    Parent Phone
                  </label>
                  <VoiceInput
                    value={editFormData.parentPhone}
                    onChange={(e) =>
                      setEditFormData((d) =>
                        d ? { ...d, parentPhone: e.target.value } : d
                      )
                    }
                    placeholder="(xxx) xxx-xxxx"
                    className="mt-1 h-9 text-xs sm:text-sm bg-[#020A17] border-[#3A2C18] text-[#FFF4D4]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#FFE394] uppercase tracking-wider">
                  Student Name
                </label>
                <VoiceInput
                  value={editFormData.studentName}
                  onChange={(e) =>
                    setEditFormData((d) =>
                      d ? { ...d, studentName: e.target.value } : d
                    )
                  }
                  placeholder="Student name"
                  className="mt-1 h-9 text-xs sm:text-sm bg-[#020A17] border-[#3A2C18] text-[#FFF4D4]"
                />
              </div>

              {/* Description / Notes */}
              <div>
                <label className="text-xs font-semibold text-[#FFE394] uppercase tracking-wider">
                  Description / Notes
                </label>
                <VoiceTextarea
                  value={editFormData.description}
                  onChange={(e) =>
                    setEditFormData((d) =>
                      d ? { ...d, description: e.target.value } : d
                    )
                  }
                  placeholder="Notes about this appointment..."
                  rows={4}
                  className="mt-1 text-xs sm:text-sm bg-[#020A17] border-[#3A2C18] text-[#FFF4D4]"
                />
              </div>

              {/* Form Action Buttons */}
              <div className="flex gap-2 pt-2 pb-4">
                <Button
                  size="sm"
                  onClick={handleSaveFullEdit}
                  disabled={isSaving}
                  className="flex-1 h-10 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold hover:brightness-110"
                >
                  <Save className="w-4 h-4 mr-1.5" />
                  <span>{isSaving ? "Saving..." : "Save Changes"}</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 h-10 border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B]"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            /* ── VIEW MODE (DETAILS, PARTICIPANTS, NOTES, CONTEXTUAL ACTIONS) ── */
            <div className="space-y-4">
              {/* 1. PARTICIPANTS CARD */}
              <div className="p-3.5 rounded-xl border border-[#3A2C18] bg-[#020A17]/80 space-y-2.5">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#C5A059] block">
                  Meeting Participants
                </span>

                <div className="space-y-2 text-xs">
                  {/* Assigned Advocate */}
                  {appointment.assignedAdvocateName && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-bold text-[10px]">
                          {appointment.assignedAdvocateName.charAt(0)}
                        </div>
                        <div>
                          <div className="text-[#FFF4D4] font-medium">
                            {appointment.assignedAdvocateName}
                          </div>
                          <div className="text-[10px] text-[#A69371]">
                            Lead Special Education Advocate
                          </div>
                        </div>
                      </div>
                      {onReassign && (
                        <button
                          type="button"
                          onClick={() => onReassign(appointment)}
                          className="text-[11px] text-[#C5A059] hover:underline"
                        >
                          Reassign
                        </button>
                      )}
                    </div>
                  )}

                  {/* Parent / Client (Click name to show Contact Client or View Details) */}
                  {appointment.parentName && (
                    <div className="flex items-center justify-between pt-1.5 border-t border-[#3A2C18]/60">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="flex items-center gap-2 text-left group hover:bg-[#102B4E]/50 px-2 py-1 -ml-2 rounded-lg transition-colors cursor-pointer select-none"
                            title="Click for parent actions (Contact Client, View Details)"
                          >
                            <div className="w-6 h-6 rounded-full bg-[#102B4E] border border-[#3A2C18] flex items-center justify-center text-[#FFE394] font-bold text-[10px] group-hover:border-[#C5A059] group-hover:shadow-[0_0_8px_rgba(197,160,89,0.3)] transition-all">
                              {appointment.parentName.charAt(0)}
                            </div>
                            <div>
                              <div className="text-[#FFF4D4] font-medium group-hover:text-[#FFE394] flex items-center gap-1.5 transition-colors">
                                <span>{appointment.parentName}</span>
                                <ChevronDown className="w-3.5 h-3.5 text-[#A69371] group-hover:text-[#FFE394] transition-colors" />
                              </div>
                              <div className="text-[10px] text-[#A69371] group-hover:text-[#C6B697] transition-colors">
                                Parent / Client • Click for choices
                              </div>
                            </div>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="start"
                          className="w-56 bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4] shadow-[0_16px_40px_rgba(0,0,0,0.95)] z-50 p-1.5 rounded-xl animate-in fade-in zoom-in-95"
                        >
                          <DropdownMenuItem
                            onClick={handleContactClient}
                            className="flex items-center gap-2.5 px-3 py-2 text-xs text-[#FFF4D4] hover:bg-[#102B4E] hover:text-[#FFE394] rounded-lg cursor-pointer transition-colors"
                          >
                            <PhoneCall className="w-4 h-4 text-[#C5A059] shrink-0" />
                            <div className="flex flex-col">
                              <span className="font-semibold text-[#FFE394]">Contact Client</span>
                              <span className="text-[10px] text-[#A69371]">Call, email, or message</span>
                            </div>
                          </DropdownMenuItem>

                          <DropdownMenuSeparator className="my-1 bg-[#3A2C18]/60" />

                          <DropdownMenuItem
                            onClick={handleViewParentDetails}
                            className="flex items-center gap-2.5 px-3 py-2 text-xs text-[#FFF4D4] hover:bg-[#102B4E] hover:text-[#FFE394] rounded-lg cursor-pointer transition-colors"
                          >
                            <User className="w-4 h-4 text-[#C5A059] shrink-0" />
                            <div className="flex flex-col">
                              <span className="font-semibold text-[#FFF4D4]">View Details</span>
                              <span className="text-[10px] text-[#A69371]">Profile & contact history</span>
                            </div>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {clientPhone && (
                        <a
                          href={`tel:${clientPhone}`}
                          className="text-xs text-[#FFE394] hover:underline font-mono"
                          title="Call parent phone"
                        >
                          {clientPhone}
                        </a>
                      )}
                    </div>
                  )}

                  {/* Student (Click to navigate to Student Workspace) */}
                  {appointment.studentName && (
                    <div className="flex items-center justify-between pt-1.5 border-t border-[#3A2C18]/60">
                      <button
                        type="button"
                        onClick={handleOpenStudentWorkspace}
                        className="flex items-center gap-2 text-left group hover:bg-[#102B4E]/50 px-2 py-1.5 -ml-2 rounded-lg transition-colors cursor-pointer flex-1"
                        title={`Open Student Workspace for ${appointment.studentName}`}
                      >
                        <div className="w-6 h-6 rounded-full bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-bold text-[10px] group-hover:border-indigo-400 group-hover:bg-indigo-900 group-hover:shadow-[0_0_8px_rgba(99,102,241,0.35)] transition-all">
                          {appointment.studentName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[#FFF4D4] font-medium group-hover:text-indigo-200 flex items-center gap-1.5 transition-colors">
                            <span className="truncate">{appointment.studentName}</span>
                            <ArrowUpRight className="w-3.5 h-3.5 text-[#C5A059] opacity-75 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
                          </div>
                          <div className="text-[10px] text-[#A69371] group-hover:text-[#C6B697] transition-colors">
                            Student • Click to open Workspace
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenStudentWorkspace}
                        className="text-[11px] text-[#C5A059] hover:text-[#FFE394] hover:underline flex items-center gap-1 shrink-0 ml-2"
                        title={`Open Student Workspace for ${appointment.studentName}`}
                      >
                        <span>Workspace</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. WAYPOINT CONTEXTUAL ACTIONS */}
              <div className="p-3.5 rounded-xl border border-[#3A2C18] bg-[#020A17]/80 space-y-2.5">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#C5A059] block">
                  Advocate Workspaces & Actions
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Open Discovery Call */}
                  {resolvedRelationships.isDiscovery && resolvedRelationships.leadId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onClose();
                        setLocation(`/leads/${resolvedRelationships.leadId}/discovery`);
                      }}
                      className="w-full text-xs font-semibold border-[#C5A059]/60 bg-[#07162B] text-[#FFE394] hover:bg-[#102B4E] hover:text-white transition-all justify-start gap-1.5"
                    >
                      <CalendarClock className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>Open Discovery Call</span>
                    </Button>
                  )}

                  {/* Open Meeting Workspace (for IEP meetings) */}
                  {(appointment.meetingType === "IEP Meeting" ||
                    appointment.meetingType === "504 Meeting") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onClose();
                        if (resolvedRelationships.studentId) {
                          setLocation(`/meeting-workspace/${resolvedRelationships.studentId}`);
                        } else {
                          setLocation("/meeting-workspace");
                        }
                      }}
                      className="w-full text-xs font-semibold border-purple-500/40 bg-purple-950/40 text-purple-200 hover:bg-purple-900/60 transition-all justify-start gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>Open Meeting Workspace</span>
                    </Button>
                  )}

                  {/* Open Student Workspace */}
                  {(resolvedRelationships.studentId || appointment.studentName || appointment.clientId) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOpenStudentWorkspace}
                      className="w-full text-xs font-semibold border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] transition-all justify-start gap-1.5"
                    >
                      <User className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>Student Workspace</span>
                    </Button>
                  )}

                  {/* View Connected Family Profile */}
                  {(resolvedRelationships.parentId || appointment.clientId) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onClose();
                        setLocation(
                          `/contacts/${
                            resolvedRelationships.parentId || appointment.clientId
                          }`
                        );
                      }}
                      className="w-full text-xs font-semibold border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] transition-all justify-start gap-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>Family Profile</span>
                    </Button>
                  )}

                  {/* Reschedule action */}
                  {onReschedule && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onReschedule(appointment)}
                      className="w-full text-xs font-semibold border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] transition-all justify-start gap-1.5"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>Reschedule</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* 3. MULTI-ZONE SCHEDULE ALIGNMENT */}
              {dualTime && (
                <div className="rounded-xl border border-[#3A2C18] bg-[#020A17]/80 p-3.5 space-y-3 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#C5A059] flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-[#C5A059]" /> Multi-Zone Alignment
                    </span>
                    {dualTime.clientTime.isDifferent ? (
                      <span className="text-[10px] font-semibold text-rose-300 bg-rose-950/60 border border-rose-500/40 px-2 py-0.5 rounded-full">
                        {dualTime.clientTime.friendlyName} vs Eastern
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-emerald-300 bg-emerald-950/50 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                        Synchronized
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Client Scheduled Time */}
                    <div className="rounded-lg border-2 border-rose-500/70 bg-rose-950/30 p-2.5 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-xs text-rose-300 font-semibold mb-1">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                          Client Time
                        </span>
                        <span className="text-[10px] font-mono font-bold bg-rose-500/20 px-1.5 py-0.5 rounded border border-rose-500/40">
                          {dualTime.clientTime.tzAbbr}
                        </span>
                      </div>
                      <p className="text-sm sm:text-base font-bold text-rose-100 font-mono">
                        {dualTime.clientTime.timeRange}
                      </p>
                      <p className="text-[10px] text-rose-300/80 mt-1 truncate">
                        {dualTime.clientTime.dateFormatted}
                      </p>
                    </div>

                    {/* Waypoint Advocate Time */}
                    <div className="rounded-lg border-2 border-emerald-500/70 bg-emerald-950/30 p-2.5 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-xs text-emerald-300 font-semibold mb-1">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                          Waypoint Time
                        </span>
                        <span className="text-[10px] font-mono font-bold bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/40">
                          {dualTime.waypointTime.tzAbbr}
                        </span>
                      </div>
                      <p className="text-sm sm:text-base font-bold text-emerald-100 font-mono">
                        {dualTime.waypointTime.timeRange}
                      </p>
                      <p className="text-[10px] text-emerald-300/80 mt-1 truncate">
                        {dualTime.waypointTime.dateFormatted} · Atlanta
                      </p>
                    </div>
                  </div>

                  {dualTime.clientTime.isDifferent && (
                    <div className="text-[11px] text-[#C6B697] bg-[#05142B] rounded-lg p-2 border border-[#3A2C18] flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-[#C5A059] shrink-0" />
                      <span>{dualTime.explanation}</span>
                    </div>
                  )}

                  {/* Calling Safety Badge */}
                  <div className="pt-1">
                    <ClientCallingSafetyBadge timeZone={appointment.clientTimeZone} />
                  </div>
                </div>
              )}

              {/* 4. PHYSICAL LOCATION */}
              {appointment.location && (
                <div className="p-3 rounded-xl border border-[#3A2C18] bg-[#020A17]/80 flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-[#C5A059] shrink-0" />
                  <div className="text-xs">
                    <span className="text-[#A69371] block text-[10px] uppercase font-mono">
                      Location
                    </span>
                    <span className="text-[#FFF4D4] font-medium">
                      {appointment.location}
                    </span>
                  </div>
                </div>
              )}

              {/* 5. DESCRIPTION */}
              {appointment.description && (
                <div className="p-3.5 rounded-xl border border-[#3A2C18] bg-[#020A17]/80 space-y-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#C5A059] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#C5A059]" />
                    Appointment Description
                  </span>
                  <div className="text-xs text-[#D8C7A5] leading-relaxed whitespace-pre-wrap">
                    {renderFormattedDescription(appointment.description)}
                  </div>
                </div>
              )}

              {/* 6. APPOINTMENT NOTES & LOG */}
              <div className="p-3.5 rounded-xl border border-[#3A2C18] bg-[#020A17]/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#C5A059] flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[#C5A059]" />
                    Advocate Notes & Log
                  </span>

                  {!isAddingNote && (
                    <button
                      type="button"
                      onClick={() => setIsAddingNote(true)}
                      className="text-xs text-[#FFE394] hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{appointment.description ? "Edit Notes" : "Add Note"}</span>
                    </button>
                  )}
                </div>

                {isAddingNote ? (
                  <div className="space-y-2 pt-1 animate-in fade-in duration-150">
                    <VoiceTextarea
                      value={quickNoteText}
                      onChange={(e) => setQuickNoteText(e.target.value)}
                      placeholder="Add confidential advocate notes, agenda items, or follow-up tasks..."
                      rows={3}
                      className="text-xs bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] rounded-lg"
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={handleSaveQuickNote}
                        disabled={isSaving}
                        className="h-8 text-xs font-bold bg-[#C5A059] text-[#07162B] hover:brightness-110"
                      >
                        <Save className="w-3.5 h-3.5 mr-1" />
                        <span>Save Note</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsAddingNote(false)}
                        className="h-8 text-xs border-[#3A2C18] bg-[#05142B] text-[#D8C7A5]"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : appointment.description ? (
                  <div className="text-xs text-[#C6B697] bg-[#05142B]/80 p-2.5 rounded-lg border border-[#3A2C18]/60 leading-relaxed whitespace-pre-wrap">
                    {renderFormattedDescription(appointment.description)}
                  </div>
                ) : (
                  <p className="text-xs text-[#A69371] italic">
                    No confidential advocate notes recorded yet.
                  </p>
                )}
              </div>

              {/* 7. QUICK STATUS UPDATER */}
              <div className="p-3.5 rounded-xl border border-[#3A2C18] bg-[#020A17]/80 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-[#C6B697] shrink-0">
                  Appointment Status:
                </span>
                <Select
                  value={appointment.status}
                  onValueChange={(val) => {
                    if (onStatusChange) {
                      onStatusChange(appointment.id, val);
                    }
                  }}
                >
                  <SelectTrigger className="h-8 text-xs max-w-[160px] bg-[#05142B] border-[#3A2C18] text-[#FFF4D4]">
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
            </div>
          )}
        </div>
      </div>

      {/* ── CONTACT CLIENT MODAL (Triggered from Parent Name > Contact Client) ── */}
      <Dialog open={contactModalOpen} onOpenChange={setContactModalOpen}>
        <DialogContent className="max-w-md bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4] shadow-[0_20px_50px_rgba(0,0,0,0.95)] z-[90]">
          <DialogHeader>
            <DialogTitle className="font-serif text-[#FFF4D4] text-lg flex items-center gap-2">
              <PhoneCall className="w-5 h-5 text-[#C5A059]" />
              <span>Contact Client</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-[#A69371]">
              Direct outreach channels for {appointment.parentName || "Client"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            {/* Phone Outreach */}
            <div className="p-3 rounded-xl bg-[#020A17] border border-[#3A2C18] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-[#FFE394] font-medium">
                  <Phone className="w-4 h-4 text-[#C5A059]" />
                  <span>Phone Call</span>
                </div>
                {clientPhone && (
                  <span className="text-xs font-mono text-[#D8C7A5]">{clientPhone}</span>
                )}
              </div>
              {clientPhone ? (
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={() => window.open(`tel:${clientPhone}`)}
                    className="flex-1 h-8 text-xs font-bold bg-[#C5A059] hover:bg-[#FFE394] text-[#07162B] gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Now</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(clientPhone);
                      toast.success("Phone number copied to clipboard");
                    }}
                    className="h-8 text-xs border-[#3A2C18] bg-[#07162B] text-[#D8C7A5] hover:bg-[#102B4E]"
                    title="Copy phone number"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setContactModalOpen(false);
                      onClose();
                      setLocation(
                        `/call-center${
                          resolvedRelationships.parentId ? `?contactId=${resolvedRelationships.parentId}` : ""
                        }`
                      );
                    }}
                    className="h-8 text-xs border-[#3A2C18] bg-[#07162B] text-[#D8C7A5] hover:bg-[#102B4E] gap-1"
                    title="Open in Call Center"
                  >
                    <Headset className="w-3.5 h-3.5 text-[#C5A059]" />
                    <span>Dialer</span>
                  </Button>
                </div>
              ) : (
                <p className="text-[11px] text-[#A69371] italic">
                  No phone number on file for this client.
                </p>
              )}
            </div>

            {/* Email Outreach */}
            <div className="p-3 rounded-xl bg-[#020A17] border border-[#3A2C18] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-[#FFE394] font-medium">
                  <Mail className="w-4 h-4 text-[#C5A059]" />
                  <span>Email Outreach</span>
                </div>
                {clientEmail && (
                  <span className="text-xs text-[#D8C7A5] truncate max-w-[200px]">{clientEmail}</span>
                )}
              </div>
              {clientEmail ? (
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={() =>
                      window.open(
                        `mailto:${clientEmail}?subject=Waypoint Advocates: Follow-up regarding ${
                          appointment.studentName || "your student"
                        }`
                      )
                    }
                    className="flex-1 h-8 text-xs font-bold bg-[#102B4E] hover:bg-[#1A3D6E] text-[#FFE394] border border-[#3A2C18] gap-1.5"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#C5A059]" />
                    <span>Compose Email</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(clientEmail);
                      toast.success("Email address copied to clipboard");
                    }}
                    className="h-8 text-xs border-[#3A2C18] bg-[#07162B] text-[#D8C7A5] hover:bg-[#102B4E]"
                    title="Copy email address"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <p className="text-[11px] text-[#A69371] italic">
                  No email address on file for this client.
                </p>
              )}
            </div>

            {/* CRM Client Messages */}
            <div className="p-3 rounded-xl bg-[#020A17] border border-[#3A2C18] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#C5A059]" />
                <div>
                  <div className="text-xs font-medium text-[#FFF4D4]">Client Messages</div>
                  <div className="text-[10px] text-[#A69371]">Send secure in-portal message</div>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setContactModalOpen(false);
                  onClose();
                  setLocation(
                    `/messages${
                      resolvedRelationships.parentId ? `?client=${resolvedRelationships.parentId}` : ""
                    }`
                  );
                }}
                className="h-8 text-xs border-[#3A2C18] bg-[#07162B] text-[#FFE394] hover:bg-[#102B4E] gap-1"
              >
                <span>Open Messages</span>
                <ArrowRight className="w-3 h-3 text-[#C5A059]" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── PARENT PROFILE & CONTACT HISTORY DRAWER (Triggered from Parent Name > View Details) ── */}
      <ParentContactHistoryDrawer
        isOpen={parentDetailsDrawerOpen}
        onClose={() => setParentDetailsDrawerOpen(false)}
        parentContactId={resolvedRelationships.parentId || undefined}
        parentName={appointment.parentName || undefined}
        onOpenStudentWorkspace={(stId) => {
          setParentDetailsDrawerOpen(false);
          onClose();
          setLocation(`/students/${stId}`);
        }}
      />
    </>
  );
}
