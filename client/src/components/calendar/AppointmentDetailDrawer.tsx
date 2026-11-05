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
  Trash2,
  Edit,
  ArrowRightLeft,
  ChevronDown,
  ChevronRight,
  Globe,
  ShieldAlert,
  CalendarClock,
  Sparkles,
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
  Eye,
  Lock,
  CheckCircle2,
} from "lucide-react";
import {
  DEFAULT_PENDING_LINK_MESSAGE,
  READY_LINK_HEADLINE,
  parseAppointmentDescription,
  serializeAppointmentDescription,
  resolveClientFacingMeetingView,
  normalizeMeetingLink,
} from "@shared/appointmentClientMessage";
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
  appointment: incomingAppointment,
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

  const [cachedAppointment, setCachedAppointment] = useState<AppointmentDrawerData | null>(incomingAppointment);
  const [isRendered, setIsRendered] = useState(false);
  const [isAnimatedOpen, setIsAnimatedOpen] = useState(false);

  useEffect(() => {
    if (incomingAppointment) {
      setCachedAppointment(incomingAppointment);
    }
  }, [incomingAppointment]);

  useEffect(() => {
    if (isOpen && (incomingAppointment || cachedAppointment)) {
      setIsRendered(true);
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          setIsAnimatedOpen(true);
        });
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    } else {
      setIsAnimatedOpen(false);
      const timer = setTimeout(() => {
        setIsRendered(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, !!incomingAppointment]);

  const appointment = incomingAppointment || cachedAppointment;

  // Mode states
  const [isEditing, setIsEditing] = useState(false);
  const [isTrashMenuOpen, setIsTrashMenuOpen] = useState(false);
  const [notifyParentOnCancel, setNotifyParentOnCancel] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  // Collapsible section states (closed by default per spec)
  const [isParticipantsExpanded, setIsParticipantsExpanded] = useState(false);
  const [isWorkspacesExpanded, setIsWorkspacesExpanded] = useState(false);

  // Inline Note Editor state (strictly for private internal notes)
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [quickNoteText, setQuickNoteText] = useState("");

  // Parent interaction dialogs
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [parentDetailsDrawerOpen, setParentDetailsDrawerOpen] = useState(false);

  // Parsed client-facing message vs private internal notes
  const parsedContent = useMemo(
    () => parseAppointmentDescription(appointment?.description),
    [appointment?.description]
  );

  // Edit form state
  const [editFormData, setEditFormData] = useState<{
    title: string;
    clientMessage: string;
    internalNotes: string;
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
      const parsed = parseAppointmentDescription(appointment.description);
      setEditFormData({
        title: appointment.title,
        clientMessage: parsed.customClientMessage || DEFAULT_PENDING_LINK_MESSAGE,
        internalNotes: parsed.internalNotes || "",
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
      setIsTrashMenuOpen(false);
      setIsParticipantsExpanded(false);
      setIsWorkspacesExpanded(false);
      setIsAddingNote(false);
      setQuickNoteText(parsed.internalNotes || "");
    }
  }, [appointment?.id, appointment?.description]);

  // Handle Escape key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        if (isEditing) {
          setIsEditing(false);
        } else if (isTrashMenuOpen) {
          setIsTrashMenuOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isEditing, isTrashMenuOpen, onClose]);

  // Copy Meeting Link Handler
  const handleCopyLink = (url: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success("Meeting link copied to clipboard");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Primary Virtual Meeting URL (validated & normalized)
  const meetingUrl = useMemo(() => {
    if (!appointment) return null;
    return normalizeMeetingLink(appointment.videoLink || appointment.clientMeetingLink);
  }, [appointment]);

  // Client-facing meeting view (used in View Mode & Client Preview)
  const clientFacingView = useMemo(() => {
    return resolveClientFacingMeetingView({
      videoLink: appointment?.videoLink,
      clientMeetingLink: appointment?.clientMeetingLink,
      location: appointment?.location,
      description: appointment?.description,
    });
  }, [appointment]);

  // Live Client Preview during Edit Mode
  const editModeClientPreview = useMemo(() => {
    if (!editFormData) return null;
    return resolveClientFacingMeetingView({
      videoLink: editFormData.videoLink,
      customClientMessageOverride: editFormData.clientMessage,
    });
  }, [editFormData?.videoLink, editFormData?.clientMessage]);

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
    const serializedDescription = serializeAppointmentDescription(
      editFormData.clientMessage,
      editFormData.internalNotes
    );
    const normalizedLink = normalizeMeetingLink(editFormData.videoLink);
    if (onSaveEdit) {
      await onSaveEdit({
        id: appointment.id,
        title: editFormData.title,
        description: serializedDescription || undefined,
        startTime: new Date(editFormData.startTime),
        endTime: new Date(editFormData.endTime),
        location: editFormData.location || undefined,
        videoLink: normalizedLink || "",
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

  // Save quick note (private internal advocate note only)
  const handleSaveQuickNote = async () => {
    if (!appointment) return;
    const serializedDescription = serializeAppointmentDescription(
      parsedContent.customClientMessage || DEFAULT_PENDING_LINK_MESSAGE,
      quickNoteText.trim()
    );
    if (onSaveEdit) {
      await onSaveEdit({
        id: appointment.id,
        title: appointment.title,
        description: serializedDescription || undefined,
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
      toast.success("Private advocate notes updated");
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

  if (!isRendered || !appointment) return null;

  return (
    <>
      {/* ── Semi-Transparent Backdrop (Click to Close) ── */}
      <div
        className={`fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px] transition-opacity duration-300 motion-reduce:transition-none ${
          isAnimatedOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ── Slide-Out Drawer Container ── */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Appointment Details: ${appointment.title}`}
        className={`fixed top-0 right-0 bottom-0 z-50 h-full w-full sm:w-[420px] md:w-[440px] max-w-full flex flex-col bg-[#000820] border-l border-[#3A2C18] shadow-[-16px_0_48px_rgba(0,0,0,0.85)] overflow-x-hidden transform transition-transform duration-300 ease-out motion-reduce:transition-none ${
          isAnimatedOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Status Top Accent Bar */}
        <div className={`h-1.5 w-full shrink-0 ${getStatusBarColor(appointment.status)}`} />

        {/* ── SECTION 1: FIXED APPOINTMENT HEADER & JOIN MEETING BUTTON (PINNED) ── */}
        <div className="shrink-0 p-3.5 sm:p-4 border-b border-[#3A2C18]/70 bg-gradient-to-b from-[#0E2749] to-[#081A35] space-y-2.5 relative shadow-md">
          {/* Top Row: Meeting Badge + Action Toolbar */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider border ${
                  appointment.meetingType === "IEP Meeting"
                    ? "bg-purple-950/60 text-purple-300 border-purple-500/40"
                    : appointment.meetingType === "Discovery Call"
                    ? "bg-[#FFE394]/15 text-[#FFE394] border-[#FFE394]/30"
                    : "bg-[#102A4C] text-[#FFE394] border-[#C5A059]/40"
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

            {/* Header Right Actions: Edit, Single Trash Action, and Close (X) */}
            <div className="flex items-center gap-1.5">
              {!isEditing && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTrashMenuOpen(false);
                      setIsEditing(true);
                    }}
                    className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] hover:brightness-110 active:scale-95 transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                    title="Edit appointment details"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  {/* Single Trash-Can Icon for Canceling or Deleting */}
                  <button
                    type="button"
                    onClick={() => setIsTrashMenuOpen((prev) => !prev)}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      isTrashMenuOpen
                        ? "bg-rose-950/70 text-rose-300 border border-rose-500/50"
                        : "text-[#C6B697] hover:text-rose-400 hover:bg-[#020A17]"
                    }`}
                    title="Cancel or delete appointment"
                    aria-label="Cancel or delete appointment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}

              {/* Close Drawer Button (Strictly closes drawer) */}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-[#C6B697] hover:text-[#FFF4D4] hover:bg-[#102A4C] transition-colors cursor-pointer ml-0.5"
                aria-label="Close appointment drawer"
                title="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Unified Trash Confirmation Panel (Cancel vs Delete with clear outcome & notification explanation) */}
          {isTrashMenuOpen && (
            <div className="p-3 rounded-xl bg-[#0A2040] border border-rose-500/40 space-y-2.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#FFF4D4]">
                  Cancel or Delete Appointment
                </span>
                <button
                  type="button"
                  onClick={() => setIsTrashMenuOpen(false)}
                  className="text-[11px] text-[#A69371] hover:text-[#FFF4D4] cursor-pointer"
                >
                  Keep Appointment
                </button>
              </div>

              {appointment.status !== "Cancelled" && (
                <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/40 space-y-2">
                  <div className="text-[11px] text-amber-100 leading-snug">
                    <strong className="text-amber-300">Cancel Appointment:</strong> Marks this session as{" "}
                    <span className="font-mono">Cancelled</span> while keeping the record in case history.
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-[11px] text-[#D8C7A5]">
                    <Checkbox
                      id="notifyParentCancelDrawer"
                      checked={notifyParentOnCancel}
                      onCheckedChange={(v) => setNotifyParentOnCancel(!!v)}
                    />
                    <span>
                      {notifyParentOnCancel
                        ? "Participants (parent/client) WILL be notified by email"
                        : "Participants will NOT be notified by email"}
                    </span>
                  </label>
                  <Button
                    size="sm"
                    onClick={async () => {
                      if (onCancelAppointment) {
                        await onCancelAppointment(appointment.id, notifyParentOnCancel);
                        setIsTrashMenuOpen(false);
                      }
                    }}
                    className="w-full h-7 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white cursor-pointer"
                  >
                    {notifyParentOnCancel
                      ? "Cancel Appointment & Notify Participants"
                      : "Cancel Appointment (Silent)"}
                  </Button>
                </div>
              )}

              <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-500/40 space-y-2">
                <div className="text-[11px] text-rose-100 leading-snug">
                  <strong className="text-rose-300">Permanently Delete:</strong> Removes this calendar entry completely. Participants will not be notified.
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={async () => {
                    if (onDeleteAppointment) {
                      await onDeleteAppointment(appointment.id);
                      setIsTrashMenuOpen(false);
                    }
                  }}
                  className="w-full h-7 text-xs font-bold bg-rose-700 hover:bg-rose-600 text-white cursor-pointer"
                >
                  Permanently Delete Entry
                </Button>
              </div>
            </div>
          )}

          {/* Prominent Appointment Title */}
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white leading-snug tracking-tight">
              {isEditing ? "Edit Appointment" : appointment.title}
            </h2>

            {/* Compact Timing Summary */}
            {dualTime && !isEditing && (
              <div className="flex items-center gap-2 text-xs text-blue-200/80 mt-1 flex-wrap">
                <Calendar className="w-3.5 h-3.5 text-[#F5B544] shrink-0" />
                <span className="font-semibold text-white">
                  {dualTime.waypointTime.dateFormatted}
                </span>
                <span>·</span>
                <Clock className="w-3.5 h-3.5 text-[#F5B544] shrink-0" />
                <span className="font-mono font-bold text-[#F5B544]">
                  {dualTime.waypointTime.timeRange}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#030C22] border border-blue-800/50 text-blue-200/85 font-mono">
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
                    className="flex-1 h-10 px-4 rounded-xl bg-[#F5B544] hover:bg-[#E5A534] text-[#07152B] font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_6px_18px_rgba(245,181,68,0.28)] transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                  >
                    <Video className="w-4 h-4 stroke-[2.2]" />
                    <span>Join {getMeetingPlatformLabel(meetingUrl)}</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </a>

                  {/* Copy Link Button */}
                  <button
                    type="button"
                    onClick={() => handleCopyLink(meetingUrl)}
                    className="h-10 px-3 rounded-xl bg-[#030C22] border border-blue-800/60 text-white hover:border-[#F5B544]/50 hover:text-[#F5B544] flex items-center gap-1.5 text-xs transition-colors cursor-pointer shrink-0 shadow-inner"
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
                        <Copy className="w-3.5 h-3.5 text-[#F5B544]" />
                        <span className="hidden sm:inline">Copy</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl border border-dashed border-blue-700/60 bg-[#030C22] flex items-center justify-between text-xs shadow-inner">
                  <span className="text-blue-200/75 italic flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-[#F5B544]" />
                    Virtual meeting link not attached
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="text-xs text-[#F5B544] hover:text-[#FFE394] font-bold hover:underline cursor-pointer"
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
                  <SelectTrigger className="mt-1 h-9 text-xs bg-[#102A4C] border-[#274E82] text-[#FFF4D4]">
                    <SelectValue placeholder="Pick a contact to auto-fill..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0B213F] border-[#274E82] text-[#FFF4D4] max-h-56">
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
                  className="mt-1 h-9 text-xs sm:text-sm bg-[#102A4C] border-[#274E82] text-[#FFF4D4] placeholder:text-blue-200/45"
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
                    className="mt-1 w-full h-9 text-xs rounded-md border border-[#274E82] bg-[#102A4C] text-[#FFF4D4] px-2 focus:outline-none focus:border-[#C5A059]"
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
                    className="mt-1 w-full h-9 text-xs rounded-md border border-[#274E82] bg-[#102A4C] text-[#FFF4D4] px-2 focus:outline-none focus:border-[#C5A059]"
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
                  <SelectTrigger className="mt-1 h-9 text-xs bg-[#102A4C] border-[#274E82] text-[#FFF4D4]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0B213F] border-[#274E82] text-[#FFF4D4]">
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
                  <SelectTrigger className="mt-1 h-9 text-xs bg-[#102A4C] border-[#274E82] text-[#FFF4D4]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0B213F] border-[#274E82] text-[#FFF4D4]">
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
                  <SelectTrigger className="mt-1 h-9 text-xs bg-[#102A4C] border-[#274E82] text-[#FFF4D4]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0B213F] border-[#274E82] text-[#FFF4D4]">
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
                  className="mt-1 h-9 text-xs sm:text-sm bg-[#102A4C] border-[#274E82] text-[#FFF4D4] placeholder:text-blue-200/45"
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
                  className="mt-1 h-9 text-xs sm:text-sm bg-[#102A4C] border-[#274E82] text-[#FFF4D4] placeholder:text-blue-200/45"
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
                    className="mt-1 h-9 text-xs sm:text-sm bg-[#102A4C] border-[#274E82] text-[#FFF4D4] placeholder:text-blue-200/45"
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
                    className="mt-1 h-9 text-xs sm:text-sm bg-[#102A4C] border-[#274E82] text-[#FFF4D4] placeholder:text-blue-200/45"
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
                  className="mt-1 h-9 text-xs sm:text-sm bg-[#102A4C] border-[#274E82] text-[#FFF4D4] placeholder:text-blue-200/45"
                />
              </div>

              {/* Client-Facing Directions & Message */}
              <div className="relative overflow-hidden p-3.5 rounded-2xl border border-[#F5B544]/35 bg-gradient-to-b from-[#0E2D63] via-[#091F45] to-[#061530] shadow-[0_12px_32px_rgba(0,0,0,0.75)] space-y-2.5">
                <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#F5B544]/70 to-transparent" />
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-[#F5B544]" />
                    <span>Client-Facing Directions & Message</span>
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setEditFormData((d) =>
                        d ? { ...d, clientMessage: DEFAULT_PENDING_LINK_MESSAGE } : d
                      )
                    }
                    className="text-[10px] font-semibold text-[#F5B544] hover:text-[#FFE394] hover:underline cursor-pointer"
                  >
                    Reset Default
                  </button>
                </div>
                <VoiceTextarea
                  value={editFormData.clientMessage}
                  onChange={(e) =>
                    setEditFormData((d) =>
                      d ? { ...d, clientMessage: e.target.value } : d
                    )
                  }
                  placeholder={DEFAULT_PENDING_LINK_MESSAGE}
                  rows={3}
                  className="text-xs bg-[#030C22] border-blue-700/70 text-white placeholder:text-blue-200/45 shadow-inner focus:border-[#F5B544]"
                />
                <p className="text-[10px] text-blue-200/80 leading-snug">
                  When a valid meeting link is saved above, status automatically updates to{" "}
                  <span className="text-emerald-300 font-semibold">
                    “{READY_LINK_HEADLINE}”
                  </span>{" "}
                  while preserving any custom directions you add here. If the link is removed, the pending status returns automatically.
                </p>

                {/* Live Client Preview inside Edit Form */}
                {editModeClientPreview && (
                  <div className="mt-2 pt-2.5 border-t border-white/15 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#F5B544] flex items-center gap-1">
                        <Eye className="w-3 h-3 text-[#F5B544]" />
                        Client Preview (Live)
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          editModeClientPreview.isLinkReady
                            ? "bg-emerald-950/70 border-emerald-400/50 text-emerald-300"
                            : "bg-[#F5B544]/15 border-[#F5B544]/40 text-[#F5B544]"
                        }`}
                      >
                        {editModeClientPreview.isLinkReady ? "Link Ready" : "Link Pending"}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#030C22] border border-blue-800/60 space-y-2 shadow-inner">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        {editModeClientPreview.isLinkReady ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Clock className="w-4 h-4 text-[#F5B544] shrink-0" />
                        )}
                        <span>{editModeClientPreview.headline}</span>
                      </div>

                      <p className="text-xs text-blue-100/85 leading-relaxed whitespace-pre-wrap break-words">
                        {editModeClientPreview.supportingMessage}
                      </p>

                      {editModeClientPreview.additionalDirections && (
                        <div className="p-2 rounded-lg bg-[#0A1F44] border border-blue-700/60 text-[11px] text-white leading-relaxed whitespace-pre-wrap break-words">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#F5B544] block mb-0.5">
                            Additional Directions
                          </span>
                          {editModeClientPreview.additionalDirections}
                        </div>
                      )}

                      {editModeClientPreview.isLinkReady && editModeClientPreview.normalizedLink ? (
                        <a
                          href={editModeClientPreview.normalizedLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full h-9 px-3 rounded-lg bg-[#F5B544] hover:bg-[#E5A534] text-[#07152B] font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                        >
                          <Video className="w-3.5 h-3.5 stroke-[2.2]" />
                          <span>Join Meeting</span>
                          <ExternalLink className="w-3 h-3 opacity-80" />
                        </a>
                      ) : (
                        <div className="w-full h-8 px-3 rounded-lg border border-dashed border-blue-700/60 bg-[#07152B] text-blue-200/70 text-[11px] flex items-center justify-center gap-1.5">
                          <Video className="w-3.5 h-3.5 text-[#F5B544]" />
                          <span>Join Meeting button activates when link is saved</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Internal Private Advocate Notes */}
              <div className="relative overflow-hidden p-3.5 rounded-2xl border border-[#F5B544]/35 bg-gradient-to-b from-[#0E2D63] via-[#091F45] to-[#061530] shadow-[0_12px_32px_rgba(0,0,0,0.75)] space-y-2">
                <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#F5B544]/70 to-transparent" />
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#F5B544]" />
                    <span>Internal Advocate Notes</span>
                  </label>
                  <span className="text-[9px] font-mono font-extrabold uppercase tracking-wider text-[#F5B544] bg-[#F5B544]/10 px-2 py-0.5 rounded-full border border-[#F5B544]/30">
                    PRIVATE · HIDDEN FROM CLIENT
                  </span>
                </div>
                <VoiceTextarea
                  value={editFormData.internalNotes}
                  onChange={(e) =>
                    setEditFormData((d) =>
                      d ? { ...d, internalNotes: e.target.value } : d
                    )
                  }
                  placeholder="Confidential advocate prep notes, strategy, or internal team context..."
                  rows={3}
                  className="mt-1 text-xs sm:text-sm bg-[#030C22] border-blue-700/70 text-white placeholder:text-blue-200/45 shadow-inner focus:border-[#F5B544]"
                />
              </div>

              {/* Form Action Buttons */}
              <div className="flex gap-2 pt-2 pb-4">
                <Button
                  size="sm"
                  onClick={handleSaveFullEdit}
                  disabled={isSaving}
                  className="flex-1 h-10 bg-[#F5B544] hover:bg-[#E5A534] text-[#07152B] font-extrabold shadow-md"
                >
                  <Save className="w-4 h-4 mr-1.5" />
                  <span>{isSaving ? "Saving..." : "Save Changes"}</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 h-10 border-blue-700/70 bg-[#030C22] text-white hover:bg-[#0E2D63]"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            /* ── VIEW MODE (DETAILS, PARTICIPANTS, CLIENT PREVIEW, NOTES) ── */
            <div className="space-y-3.5">
              {/* 1. COMPACT, COLLAPSIBLE STUDENT & PARTICIPANTS */}
              {(() => {
                const participantCount =
                  (appointment.assignedAdvocateName ? 1 : 1) +
                  (appointment.parentName ? 1 : 0) +
                  (appointment.studentName ? 1 : 0);

                return (
                  <div className="relative overflow-hidden p-3 sm:p-3.5 rounded-2xl border border-[#F5B544]/35 bg-gradient-to-b from-[#0E2D63] via-[#091F45] to-[#061530] shadow-[0_12px_32px_rgba(0,0,0,0.75)] hover:border-[#F5B544]/60 transition-all space-y-2.5">
                    <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#F5B544]/70 to-transparent" />
                    {/* Discreet Collapsible Header Row */}
                    <button
                      type="button"
                      onClick={() => setIsParticipantsExpanded((prev) => !prev)}
                      className="w-full flex items-center justify-between text-left group cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full border border-[#F5B544]/35 bg-[#030C22] text-[#F5B544] flex items-center justify-center shrink-0 shadow-inner">
                          {isParticipantsExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 stroke-[2.2]" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 stroke-[2.2]" />
                          )}
                        </div>
                        <span className="text-xs font-bold tracking-tight text-white group-hover:text-[#F5B544] transition-colors">
                          Student & Participants
                        </span>
                        <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-[#F5B544]/10 border border-[#F5B544]/30 text-[#F5B544]">
                          {participantCount}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-blue-200/75 group-hover:text-white">
                        {isParticipantsExpanded ? "Hide details" : "Show all"}
                      </span>
                    </button>

                    {/* Student Row — ALWAYS visible (even when collapsed) so user can click straight to Student Workspace */}
                    {appointment.studentName && (
                      <div className="flex items-center justify-between pt-2 border-t border-white/10">
                        <button
                          type="button"
                          onClick={handleOpenStudentWorkspace}
                          className="flex items-center gap-2.5 text-left group bg-[#030C22] hover:bg-[#071636] border border-blue-900/50 hover:border-[#F5B544]/50 px-2.5 py-2 rounded-xl transition-all cursor-pointer flex-1 min-w-0 shadow-inner"
                          title={`Open Student Workspace for ${appointment.studentName}`}
                        >
                          <div className="w-7 h-7 rounded-full bg-[#0E2D63] border border-[#F5B544]/40 flex items-center justify-center text-[#F5B544] font-bold text-xs shrink-0">
                            {appointment.studentName.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs sm:text-sm text-white font-bold group-hover:text-[#F5B544] flex items-center gap-1.5 transition-colors">
                              <span className="truncate">{appointment.studentName}</span>
                              <ArrowUpRight className="w-3.5 h-3.5 text-[#F5B544] shrink-0" />
                            </div>
                            <div className="text-[10px] text-blue-200/75 truncate">
                              Student · Click to open Student Workspace
                            </div>
                          </div>
                        </button>
                      </div>
                    )}

                    {/* Expanded Participants Details (Names, Emails, Roles, Attendance) */}
                    {isParticipantsExpanded && (
                      <div className="space-y-2 pt-2 border-t border-white/10 text-xs animate-in fade-in duration-150">
                        {/* Waypoint / Assigned Advocate (Owner) */}
                        <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[#030C22] border border-blue-900/50">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="relative shrink-0">
                              <div className="w-7 h-7 rounded-full bg-[#0E2D63] border border-cyan-400/50 flex items-center justify-center text-cyan-200 font-bold text-[10px]">
                                {(appointment.assignedAdvocateName || "WA")
                                  .split(" ")
                                  .map((p) => p[0])
                                  .join("")
                                  .slice(0, 2)}
                              </div>
                              <span
                                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-[#030C22]"
                                title="Confirmed · Organizer"
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="text-white font-bold truncate">
                                {appointment.assignedAdvocateName || "Waypoint Advocates"}
                              </div>
                              <div className="text-[10px] text-blue-200/75 truncate">
                                clientcare@waypointadvocates.com · Lead Special Education Advocate
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#F5B544]/10 border border-[#F5B544]/30 text-[#F5B544]">
                              OWNER
                            </span>
                            {onReassign && (
                              <button
                                type="button"
                                onClick={() => onReassign(appointment)}
                                className="text-[11px] font-semibold text-[#F5B544] hover:underline cursor-pointer"
                              >
                                Reassign
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Parent / Client */}
                        {appointment.parentName && (
                          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[#030C22] border border-blue-900/50">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="flex items-center gap-2 text-left group hover:opacity-95 rounded-lg transition-colors cursor-pointer select-none min-w-0 flex-1"
                                  title="Click for parent actions (Contact Client, View Details)"
                                >
                                  <div className="relative shrink-0">
                                    <div className="w-7 h-7 rounded-full bg-[#0E2D63] border border-[#F5B544]/40 flex items-center justify-center text-[#F5B544] font-bold text-[10px]">
                                      {appointment.parentName
                                        .split(" ")
                                        .map((p) => p[0])
                                        .join("")
                                        .slice(0, 2)}
                                    </div>
                                    <span
                                      className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-[#030C22]"
                                      title="Attendance Confirmed"
                                    />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-white font-bold group-hover:text-[#F5B544] flex items-center gap-1 transition-colors">
                                      <span className="truncate">{appointment.parentName}</span>
                                      <ChevronDown className="w-3 h-3 text-blue-200/75 shrink-0" />
                                    </div>
                                    <div className="text-[10px] text-blue-200/75 truncate">
                                      {clientEmail || "Parent / Client"}
                                      {clientPhone ? ` · ${clientPhone}` : ""}
                                    </div>
                                  </div>
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="start"
                                className="w-56 bg-[#071D40] border border-[#F5B544]/40 text-white shadow-[0_16px_40px_rgba(0,0,0,0.95)] z-50 p-1.5 rounded-xl"
                              >
                                <DropdownMenuItem
                                  onClick={handleContactClient}
                                  className="flex items-center gap-2.5 px-3 py-2 text-xs text-white hover:bg-[#0E2D63] hover:text-[#F5B544] rounded-lg cursor-pointer"
                                >
                                  <PhoneCall className="w-4 h-4 text-[#F5B544] shrink-0" />
                                  <div className="flex flex-col">
                                    <span className="font-bold text-[#F5B544]">
                                      Contact Client
                                    </span>
                                    <span className="text-[10px] text-blue-200/75">
                                      Call, email, or message
                                    </span>
                                  </div>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="my-1 bg-white/10" />
                                <DropdownMenuItem
                                  onClick={handleViewParentDetails}
                                  className="flex items-center gap-2.5 px-3 py-2 text-xs text-white hover:bg-[#0E2D63] hover:text-[#F5B544] rounded-lg cursor-pointer"
                                >
                                  <User className="w-4 h-4 text-[#F5B544] shrink-0" />
                                  <div className="flex flex-col">
                                    <span className="font-bold text-white">
                                      View Details
                                    </span>
                                    <span className="text-[10px] text-blue-200/75">
                                      Profile & contact history
                                    </span>
                                  </div>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>

                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-400/40 text-emerald-300 shrink-0">
                              ✓ Confirmed
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 2. SMALL, COLLAPSED WORKSPACE & MEETING SPACE LINKS */}
              <div className="relative overflow-hidden p-3 rounded-2xl border border-[#F5B544]/35 bg-gradient-to-b from-[#0E2D63] via-[#091F45] to-[#061530] shadow-[0_12px_32px_rgba(0,0,0,0.75)] hover:border-[#F5B544]/60 transition-all">
                <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#F5B544]/70 to-transparent" />
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setIsWorkspacesExpanded((prev) => !prev)}
                    className="flex items-center gap-2 text-left group cursor-pointer select-none min-w-0"
                  >
                    <div className="w-6 h-6 rounded-full border border-[#F5B544]/35 bg-[#030C22] text-[#F5B544] flex items-center justify-center shrink-0 shadow-inner">
                      {isWorkspacesExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 stroke-[2.2]" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 stroke-[2.2]" />
                      )}
                    </div>
                    <span className="text-xs font-bold tracking-tight text-white group-hover:text-[#F5B544] truncate">
                      Workspaces & Quick Links
                    </span>
                  </button>

                  {/* Compact Feature Highlight Chips (matching Portal Card style) */}
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    {(appointment.meetingType === "IEP Meeting" ||
                      appointment.meetingType === "504 Meeting") && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          if (resolvedRelationships.studentId) {
                            setLocation(
                              `/meeting-workspace/${resolvedRelationships.studentId}`
                            );
                          } else {
                            setLocation("/meeting-workspace");
                          }
                        }}
                        className="px-2.5 py-1 rounded-md bg-[#030C22] border border-blue-800/60 hover:border-[#F5B544]/60 text-white text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-all shadow-inner"
                        title="Open Meeting Space"
                      >
                        <span className="text-[#F5B544] font-bold">✓</span>
                        <span>Meeting Space</span>
                      </button>
                    )}

                    {(resolvedRelationships.studentId ||
                      appointment.studentName ||
                      appointment.clientId) && (
                      <button
                        type="button"
                        onClick={handleOpenStudentWorkspace}
                        className="px-2.5 py-1 rounded-md bg-[#030C22] border border-blue-800/60 hover:border-[#F5B544]/60 text-white text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-all shadow-inner"
                        title="Open Student Workspace"
                      >
                        <span className="text-[#F5B544] font-bold">✓</span>
                        <span>Workspace</span>
                      </button>
                    )}
                  </div>
                </div>

                {isWorkspacesExpanded && (
                  <div className="grid grid-cols-2 gap-2 pt-2.5 mt-2.5 border-t border-white/10 animate-in fade-in duration-150">
                    {resolvedRelationships.isDiscovery &&
                      resolvedRelationships.leadId && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            onClose();
                            setLocation(
                              `/leads/${resolvedRelationships.leadId}/discovery`
                            );
                          }}
                          className="h-8 text-[11px] font-semibold border-blue-800/60 bg-[#030C22] text-white hover:border-[#F5B544]/60 hover:bg-[#071636] justify-start gap-1.5 px-2.5"
                        >
                          <CalendarClock className="w-3.5 h-3.5 text-[#F5B544]" />
                          <span className="truncate">Discovery Call</span>
                        </Button>
                      )}

                    {(appointment.meetingType === "IEP Meeting" ||
                      appointment.meetingType === "504 Meeting") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onClose();
                          if (resolvedRelationships.studentId) {
                            setLocation(
                              `/meeting-workspace/${resolvedRelationships.studentId}`
                            );
                          } else {
                            setLocation("/meeting-workspace");
                          }
                        }}
                        className="h-8 text-[11px] font-semibold border-blue-800/60 bg-[#030C22] text-white hover:border-[#F5B544]/60 hover:bg-[#071636] justify-start gap-1.5 px-2.5"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#F5B544]" />
                        <span className="truncate">Meeting Space</span>
                      </Button>
                    )}

                    {(resolvedRelationships.studentId ||
                      appointment.studentName ||
                      appointment.clientId) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleOpenStudentWorkspace}
                        className="h-8 text-[11px] font-semibold border-blue-800/60 bg-[#030C22] text-white hover:border-[#F5B544]/60 hover:bg-[#071636] justify-start gap-1.5 px-2.5"
                      >
                        <User className="w-3.5 h-3.5 text-[#F5B544]" />
                        <span className="truncate">Student Workspace</span>
                      </Button>
                    )}

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
                        className="h-8 text-[11px] font-semibold border-blue-800/60 bg-[#030C22] text-white hover:border-[#F5B544]/60 hover:bg-[#071636] justify-start gap-1.5 px-2.5"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-[#F5B544]" />
                        <span className="truncate">Family Profile</span>
                      </Button>
                    )}

                    {onReschedule && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onReschedule(appointment)}
                        className="h-8 text-[11px] font-semibold border-blue-800/60 bg-[#030C22] text-white hover:border-[#F5B544]/60 hover:bg-[#071636] justify-start gap-1.5 px-2.5"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5 text-[#F5B544]" />
                        <span className="truncate">Reschedule</span>
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* 3. CLIENT PREVIEW & APPOINTMENT-SPECIFIC CLIENT MESSAGE */}
              <div className="relative overflow-hidden p-3.5 sm:p-4 rounded-2xl border border-[#F5B544]/40 bg-gradient-to-b from-[#0E2D63] via-[#091F45] to-[#061530] shadow-[0_12px_32px_rgba(0,0,0,0.75)] hover:border-[#F5B544]/65 transition-all space-y-3">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F5B544]/75 to-transparent" />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full border border-[#F5B544]/35 bg-[#030C22] text-[#F5B544] flex items-center justify-center shrink-0 shadow-inner">
                      <Eye className="w-3.5 h-3.5 stroke-[2]" />
                    </div>
                    <span className="text-xs sm:text-sm font-bold tracking-tight text-white">
                      Client Preview
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] font-mono font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                        clientFacingView.isLinkReady
                          ? "bg-emerald-950/70 border-emerald-400/50 text-emerald-300"
                          : "bg-[#F5B544]/10 border-[#F5B544]/30 text-[#F5B544]"
                      }`}
                    >
                      {clientFacingView.isLinkReady ? "LINK READY" : "AWAITING LINK"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="text-[11px] font-bold text-[#F5B544] hover:text-[#FFE394] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Edit className="w-3 h-3" />
                      <span>Customize</span>
                    </button>
                  </div>
                </div>

                {/* Exact Client-Facing Card Preview */}
                <div className="p-3.5 rounded-xl bg-[#030C22] border border-blue-900/60 space-y-2.5 shadow-inner">
                  <div className="flex items-center gap-2">
                    {clientFacingView.isLinkReady ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-[#F5B544] shrink-0" />
                    )}
                    <span
                      className={`text-xs sm:text-sm font-bold ${
                        clientFacingView.isLinkReady
                          ? "text-emerald-300"
                          : "text-white"
                      }`}
                    >
                      {clientFacingView.headline}
                    </span>
                  </div>

                  <p className="text-xs text-blue-100/85 leading-relaxed whitespace-pre-wrap break-words">
                    {clientFacingView.supportingMessage}
                  </p>

                  {clientFacingView.additionalDirections && (
                    <div className="p-2.5 rounded-lg bg-[#0A1F44] border border-blue-700/60 text-xs text-white leading-relaxed whitespace-pre-wrap break-words">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#F5B544] block mb-1">
                        Client Directions
                      </span>
                      {clientFacingView.additionalDirections}
                    </div>
                  )}

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-blue-200/70 flex items-center gap-1 font-mono">
                      <Video className="w-3 h-3 text-[#F5B544]" />
                      {clientFacingView.isLinkReady ? "Virtual Room Active" : "Link Status"}
                    </span>

                    {clientFacingView.isLinkReady && clientFacingView.normalizedLink ? (
                      <a
                        href={clientFacingView.normalizedLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-8 px-3.5 rounded-lg bg-[#F5B544] hover:bg-[#E5A534] text-[#07152B] font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        <span>Join Meeting</span>
                        <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                      </a>
                    ) : (
                      <span className="text-[10px] font-mono text-[#F5B544] bg-[#F5B544]/10 border border-[#F5B544]/25 px-2.5 py-1 rounded-md">
                        Activates once link saved
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 4. MULTI-ZONE SCHEDULE ALIGNMENT (Compact) */}
              {dualTime && dualTime.clientTime.isDifferent && (
                <div className="relative overflow-hidden rounded-2xl border border-[#F5B544]/35 bg-gradient-to-b from-[#0E2D63] via-[#091F45] to-[#061530] p-3.5 space-y-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.75)]">
                  <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#F5B544]/70 to-transparent" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-[#F5B544]" /> Multi-Zone Alignment
                    </span>
                    <span className="text-[10px] font-semibold text-rose-300 bg-rose-950/60 border border-rose-500/40 px-2 py-0.5 rounded-full">
                      {dualTime.clientTime.friendlyName} vs Eastern
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-rose-500/50 bg-[#030C22] p-2.5">
                      <div className="flex items-center justify-between text-[10px] text-rose-300 font-semibold">
                        <span>Client Time</span>
                        <span className="font-mono">{dualTime.clientTime.tzAbbr}</span>
                      </div>
                      <p className="text-xs font-bold text-rose-100 font-mono mt-0.5">
                        {dualTime.clientTime.timeRange}
                      </p>
                    </div>
                    <div className="rounded-xl border border-emerald-500/50 bg-[#030C22] p-2.5">
                      <div className="flex items-center justify-between text-[10px] text-emerald-300 font-semibold">
                        <span>Waypoint Time</span>
                        <span className="font-mono">{dualTime.waypointTime.tzAbbr}</span>
                      </div>
                      <p className="text-xs font-bold text-emerald-100 font-mono mt-0.5">
                        {dualTime.waypointTime.timeRange}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. PHYSICAL LOCATION */}
              {appointment.location && (
                <div className="relative overflow-hidden p-3 rounded-2xl border border-[#F5B544]/35 bg-gradient-to-b from-[#0E2D63] via-[#091F45] to-[#061530] flex items-center gap-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.75)]">
                  <div className="w-7 h-7 rounded-full border border-[#F5B544]/35 bg-[#030C22] text-[#F5B544] flex items-center justify-center shrink-0">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xs min-w-0">
                    <span className="text-blue-200/75 block text-[10px] uppercase font-mono">
                      Location
                    </span>
                    <span className="text-white font-bold break-words">
                      {appointment.location}
                    </span>
                  </div>
                </div>
              )}

              {/* 6. PRIVATE INTERNAL ADVOCATE NOTES & LOG */}
              <div className="relative overflow-hidden p-3.5 sm:p-4 rounded-2xl border border-[#F5B544]/35 bg-gradient-to-b from-[#0E2D63] via-[#091F45] to-[#061530] space-y-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.75)] hover:border-[#F5B544]/60 transition-all">
                <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#F5B544]/70 to-transparent" />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full border border-[#F5B544]/35 bg-[#030C22] text-[#F5B544] flex items-center justify-center shrink-0 shadow-inner">
                      <Lock className="w-3.5 h-3.5 stroke-[2]" />
                    </div>
                    <span className="text-xs sm:text-sm font-bold tracking-tight text-white truncate">
                      Internal Advocate Notes
                    </span>
                    <span className="text-[9px] font-mono font-extrabold uppercase tracking-wider text-[#F5B544] bg-[#F5B544]/10 px-2 py-0.5 rounded-full border border-[#F5B544]/30 shrink-0">
                      PRIVATE
                    </span>
                  </div>

                  {!isAddingNote && (
                    <button
                      type="button"
                      onClick={() => setIsAddingNote(true)}
                      className="text-xs font-bold text-[#F5B544] hover:text-[#FFE394] hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>
                        {parsedContent.internalNotes ? "Edit Notes" : "Add Note"}
                      </span>
                    </button>
                  )}
                </div>

                {isAddingNote ? (
                  <div className="space-y-2.5 pt-1 animate-in fade-in duration-150">
                    <VoiceTextarea
                      value={quickNoteText}
                      onChange={(e) => setQuickNoteText(e.target.value)}
                      placeholder="Add confidential internal advocate notes, prep items, or follow-up tasks (never visible to client)..."
                      rows={3}
                      className="text-xs bg-[#030C22] border-blue-700/70 text-white placeholder:text-blue-200/50 rounded-xl shadow-inner focus:border-[#F5B544]"
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={handleSaveQuickNote}
                        disabled={isSaving}
                        className="h-8 px-3.5 text-xs font-bold bg-[#F5B544] hover:bg-[#E5A534] text-[#07152B] rounded-lg"
                      >
                        <Save className="w-3.5 h-3.5 mr-1" />
                        <span>Save Private Note</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsAddingNote(false)}
                        className="h-8 text-xs border-blue-800/60 bg-[#030C22] text-white hover:bg-[#0E2D63] rounded-lg"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : parsedContent.internalNotes ? (
                  <div className="text-xs text-blue-100/90 bg-[#030C22] p-3 rounded-xl border border-blue-900/60 shadow-inner leading-relaxed whitespace-pre-wrap break-words">
                    {renderFormattedDescription(parsedContent.internalNotes)}
                  </div>
                ) : (
                  <div
                    onClick={() => setIsAddingNote(true)}
                    className="p-2.5 rounded-xl bg-[#030C22] border border-dashed border-blue-800/60 hover:border-[#F5B544]/50 text-xs text-blue-200/70 italic cursor-pointer transition-colors"
                  >
                    Click to add private internal advocate notes...
                  </div>
                )}
              </div>

              {/* 7. QUICK STATUS UPDATER */}
              <div className="relative overflow-hidden p-3 sm:p-3.5 rounded-2xl border border-[#F5B544]/35 bg-gradient-to-b from-[#0E2D63] via-[#091F45] to-[#061530] flex items-center justify-between gap-3 shadow-[0_12px_32px_rgba(0,0,0,0.75)]">
                <span className="text-xs font-bold text-white shrink-0">
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
                  <SelectTrigger className="h-8 text-xs max-w-[160px] bg-[#030C22] border-blue-800/70 text-white font-semibold shadow-inner">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#071D40] border-[#F5B544]/40 text-white">
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
