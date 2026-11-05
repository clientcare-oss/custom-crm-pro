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
  ChevronUp,
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
        <div className={`h-1 w-full shrink-0 ${getStatusBarColor(appointment.status)}`} />

        {/* ── SECTION 1: FIXED APPOINTMENT HEADER & JOIN MEETING BUTTON (PINNED) ── */}
        <div className="shrink-0 px-3.5 py-2.5 border-b border-[#F5B544]/25 bg-gradient-to-b from-[#0E2D63] via-[#091F45] to-[#061530] space-y-1.5 relative shadow-[0_6px_20px_rgba(0,0,0,0.65)]">
          {/* Top Accent Glow Line */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#F5B544]/65 to-transparent" />
          {/* Top Row: Meeting Badge + Status Select + Action Toolbar */}
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold uppercase tracking-wider border truncate ${
                  appointment.meetingType === "IEP Meeting"
                    ? "bg-purple-950/70 text-purple-200 border-purple-400/40"
                    : appointment.meetingType === "Discovery Call"
                    ? "bg-[#F5B544]/15 text-[#F5B544] border-[#F5B544]/35"
                    : "bg-[#F5B544]/10 text-[#F5B544] border-[#F5B544]/30"
                }`}
              >
                {appointment.meetingType || "Appointment"}
              </span>

              {/* Inline Compact Status Selector (replaces separate bottom card!) */}
              <Select
                value={appointment.status}
                onValueChange={(val) => {
                  if (onStatusChange) {
                    onStatusChange(appointment.id, val);
                  }
                }}
              >
                <SelectTrigger
                  className={`h-6 px-2 py-0 rounded-full text-[10px] font-semibold border w-auto gap-1 shadow-none ${
                    appointment.status === "Confirmed"
                      ? "bg-emerald-950/70 text-emerald-300 border-emerald-500/40"
                      : appointment.status === "Needs Coverage"
                      ? "bg-amber-950/70 text-amber-300 border-amber-500/40"
                      : appointment.status === "Cancelled"
                      ? "bg-rose-950/70 text-rose-300 border-rose-500/40"
                      : "bg-blue-950/70 text-blue-300 border-blue-500/40"
                  }`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#071D40] border-[#F5B544]/40 text-white z-[80]">
                  <SelectItem value="Scheduled">Scheduled</SelectItem>
                  <SelectItem value="Confirmed">Confirmed</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                  <SelectItem value="Needs Coverage">🚨 Needs Coverage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Header Right Actions: Edit, Single Trash Action, and Close (X) */}
            <div className="flex items-center gap-1 shrink-0">
              {!isEditing && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTrashMenuOpen(false);
                      setIsEditing(true);
                    }}
                    className="h-7 px-2.5 rounded-lg text-[11px] font-bold bg-[#F5B544] hover:bg-[#E5A534] text-[#07152B] active:scale-95 transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                    title="Edit appointment details"
                  >
                    <Edit className="w-3 h-3 stroke-[2.2]" />
                    <span>Edit</span>
                  </button>

                  {/* Single Trash-Can Icon for Canceling or Deleting */}
                  <button
                    type="button"
                    onClick={() => setIsTrashMenuOpen((prev) => !prev)}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      isTrashMenuOpen
                        ? "bg-rose-950/80 text-rose-300 border border-rose-500/50"
                        : "text-blue-200/75 hover:text-rose-400 hover:bg-[#030C22]"
                    }`}
                    title="Cancel or delete appointment"
                    aria-label="Cancel or delete appointment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              {/* Close Drawer Button (Strictly closes drawer) */}
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-blue-200/75 hover:text-white hover:bg-[#030C22] transition-colors cursor-pointer"
                aria-label="Close appointment drawer"
                title="Close drawer"
              >
                <X className="w-4 h-4" />
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
            <h2 className="text-base sm:text-lg font-bold text-white leading-tight tracking-tight">
              {isEditing ? "Edit Appointment" : appointment.title}
            </h2>

            {/* Compact Timing Summary + Different Time Zone Alert Pill */}
            {dualTime && !isEditing && (
              <div className="space-y-1 mt-0.5">
                <div className="flex items-center gap-1.5 text-[11px] text-blue-200/80 flex-wrap">
                  <Calendar className="w-3 h-3 text-[#F5B544] shrink-0" />
                  <span className="font-semibold text-white">
                    {dualTime.waypointTime.dateFormatted}
                  </span>
                  <span>·</span>
                  <Clock className="w-3 h-3 text-[#F5B544] shrink-0" />
                  <span className="font-mono font-bold text-[#F5B544]">
                    {dualTime.waypointTime.timeRange}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#030C22] border border-blue-800/50 text-blue-200/85 font-mono">
                    {dualTime.waypointTime.tzAbbr}
                  </span>
                </div>

                {dualTime.clientTime.isDifferent && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-rose-950/75 border border-rose-500/50 text-[10.5px] text-rose-200 font-semibold">
                    <Globe className="w-3 h-3 text-rose-400 shrink-0" />
                    <span>
                      Different Time Zone: Client is {dualTime.clientTime.timeRange} (
                      {dualTime.clientTime.tzAbbr})
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Needs Coverage Alert Banner if flagged */}
          {appointment.status === "Needs Coverage" && !isEditing && (
            <div className="p-2 rounded-xl bg-amber-950/40 border border-amber-500/50 flex items-start gap-2">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-[11px]">
                <span className="font-bold text-amber-200">Coverage Required: </span>
                <span className="text-amber-300/90">
                  Advocate is unavailable. Reassign to delegate.
                </span>
              </div>
            </div>
          )}

          {/* ── PRIORITY REQUIREMENT: PINNED JOIN MEETING BUTTON ── */}
          {!isEditing && (
            <div className="pt-0.5">
              {meetingUrl ? (
                <div className="flex items-center gap-1.5">
                  <a
                    href={meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 h-9 px-3 rounded-xl bg-[#F5B544] hover:bg-[#E5A534] text-[#07152B] font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-[0_4px_14px_rgba(245,181,68,0.28)] transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                  >
                    <Video className="w-3.5 h-3.5 stroke-[2.2]" />
                    <span>Join {getMeetingPlatformLabel(meetingUrl)}</span>
                    <ExternalLink className="w-3 h-3 opacity-80" />
                  </a>

                  {/* Copy Link Button */}
                  <button
                    type="button"
                    onClick={() => handleCopyLink(meetingUrl)}
                    className="h-9 px-2.5 rounded-xl bg-[#030C22] border border-blue-800/60 text-white hover:border-[#F5B544]/50 hover:text-[#F5B544] flex items-center gap-1 text-xs transition-colors cursor-pointer shrink-0 shadow-inner"
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
                <div className="px-2.5 py-1.5 rounded-xl border border-dashed border-blue-700/60 bg-[#030C22] flex items-center justify-between text-[11px] shadow-inner">
                  <span className="text-blue-200/75 italic flex items-center gap-1.5">
                    <LinkIcon className="w-3 h-3 text-[#F5B544]" />
                    Virtual meeting link not attached
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="text-[11px] text-[#F5B544] hover:text-[#FFE394] font-bold hover:underline cursor-pointer"
                  >
                    + Add Link
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── SECTION 2: EDGE-TO-EDGE DOSSIER LEATHER TEXTURE WITH DIRECT TEXT OVERLAY ── */}
        <div
          className="flex-1 overflow-y-auto overflow-x-hidden relative bg-[#081F42]"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at 50% 15%, rgba(56,189,248,0.12) 0%, transparent 70%), url('/decor/folio-leather-texture.png')",
            backgroundSize: "100% 100%, 360px 360px",
            backgroundRepeat: "no-repeat, repeat",
          }}
        >
          {/* ─── Direct Text Overlay Content Layer on Edge-to-Edge Leather Dossier ─── */}
          <div className="relative z-10 px-4 py-3.5">
              {isEditing && editFormData ? (
                /* ── FULL EDIT FORM (Overlaid on Dossier Texture) ── */
                <div className="space-y-3">
                  {/* Auto-fill from contact */}
                  <div>
                    <label className="text-[10px] font-bold text-[#FFE394] uppercase tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                      Auto-fill from Contact
                    </label>
                    <Select onValueChange={handleAutoFillFromContact}>
                      <SelectTrigger className="mt-1 h-8 text-xs bg-[#020A17]/80 border-[#D4AF37]/40 text-[#FFF4D4]">
                        <SelectValue placeholder="Pick a contact to auto-fill..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#07162B] border-[#D4AF37]/40 text-[#FFF4D4] max-h-56">
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
                    <label className="text-[10px] font-bold text-[#FFE394] uppercase tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                      Title *
                    </label>
                    <VoiceInput
                      value={editFormData.title}
                      onChange={(e) =>
                        setEditFormData((d) => (d ? { ...d, title: e.target.value } : d))
                      }
                      placeholder="Appointment title"
                      className="mt-1 h-8 text-xs bg-[#020A17]/80 border-[#D4AF37]/40 text-white placeholder:text-slate-400"
                    />
                  </div>

                  {/* Start & End Times */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-[#FFE394] uppercase tracking-wider">
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
                        className="mt-1 w-full h-8 text-xs rounded-md border border-[#D4AF37]/40 bg-[#020A17]/80 text-white px-2 focus:outline-none focus:border-[#F5B544]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#FFE394] uppercase tracking-wider">
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
                        className="mt-1 w-full h-8 text-xs rounded-md border border-[#D4AF37]/40 bg-[#020A17]/80 text-white px-2 focus:outline-none focus:border-[#F5B544]"
                      />
                    </div>
                  </div>

                  {/* Client Time Zone & Assigned Advocate */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-[#FFE394] uppercase tracking-wider flex items-center gap-1">
                        <Globe className="h-3 w-3 text-[#38BDF8]" /> Time Zone
                      </label>
                      <Select
                        value={editFormData.clientTimeZone}
                        onValueChange={(v) =>
                          setEditFormData((d) => (d ? { ...d, clientTimeZone: v } : d))
                        }
                      >
                        <SelectTrigger className="mt-1 h-8 text-xs bg-[#020A17]/80 border-[#D4AF37]/40 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#07162B] border-[#D4AF37]/40 text-white">
                          {SIX_CORE_ZONES.map((z) => (
                            <SelectItem key={z.id} value={z.id}>
                              {z.name} ({z.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-[#FFE394] uppercase tracking-wider flex items-center gap-1">
                        <User className="h-3 w-3 text-[#38BDF8]" /> Advocate
                      </label>
                      <Select
                        value={editFormData.assignedAdvocateName}
                        onValueChange={(v) =>
                          setEditFormData((d) =>
                            d ? { ...d, assignedAdvocateName: v } : d
                          )
                        }
                      >
                        <SelectTrigger className="mt-1 h-8 text-xs bg-[#020A17]/80 border-[#D4AF37]/40 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#07162B] border-[#D4AF37]/40 text-white">
                          {staffList.map((s) => (
                            <SelectItem key={s.id} value={s.name}>
                              {s.name} ({s.status})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="text-[10px] font-bold text-[#FFE394] uppercase tracking-wider">
                      Status
                    </label>
                    <Select
                      value={editFormData.status}
                      onValueChange={(v) =>
                        setEditFormData((d) => (d ? { ...d, status: v } : d))
                      }
                    >
                      <SelectTrigger className="mt-1 h-8 text-xs bg-[#020A17]/80 border-[#D4AF37]/40 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#07162B] border-[#D4AF37]/40 text-white">
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
                    <label className="text-[10px] font-bold text-[#FFE394] uppercase tracking-wider">
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
                      className="mt-1 h-8 text-xs bg-[#020A17]/80 border-[#D4AF37]/40 text-white placeholder:text-slate-400"
                    />
                  </div>

                  {/* Location */}
                  <div>
                    <label className="text-[10px] font-bold text-[#FFE394] uppercase tracking-wider">
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
                      className="mt-1 h-8 text-xs bg-[#020A17]/80 border-[#D4AF37]/40 text-white placeholder:text-slate-400"
                    />
                  </div>

                  {/* Parent & Student */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-[#FFE394] uppercase tracking-wider">
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
                        className="mt-1 h-8 text-xs bg-[#020A17]/80 border-[#D4AF37]/40 text-white placeholder:text-slate-400"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#FFE394] uppercase tracking-wider">
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
                        className="mt-1 h-8 text-xs bg-[#020A17]/80 border-[#D4AF37]/40 text-white placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[#FFE394] uppercase tracking-wider">
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
                      className="mt-1 h-8 text-xs bg-[#020A17]/80 border-[#D4AF37]/40 text-white placeholder:text-slate-400"
                    />
                  </div>

                  {/* Client-Facing Directions & Message (Dossier Overlay Style) */}
                  <div className="pt-3 border-t-2 border-[#D4AF37]/45 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[10px] font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Eye className="w-3 h-3 text-[#38BDF8]" />
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
                      className="text-xs bg-[#020A17]/80 border-[#D4AF37]/40 text-white placeholder:text-slate-400 focus:border-[#F5B544]"
                    />
                    <p className="text-[10px] text-slate-300/85 leading-snug">
                      When a valid meeting link is saved above, status automatically updates to{" "}
                      <span className="text-emerald-300 font-semibold">
                        “{READY_LINK_HEADLINE}”
                      </span>{" "}
                      while preserving any custom directions you add here.
                    </p>

                    {/* Live Client Preview inside Edit Form */}
                    {editModeClientPreview && (
                      <div className="pt-2 border-t-2 border-white/20 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#F5B544] flex items-center gap-1">
                            <Eye className="w-3 h-3 text-[#F5B544]" />
                            Client Preview (Live)
                          </span>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                              editModeClientPreview.isLinkReady
                                ? "bg-emerald-950/70 border-emerald-400/50 text-emerald-300"
                                : "bg-[#F5B544]/15 border-[#F5B544]/40 text-[#F5B544]"
                            }`}
                          >
                            {editModeClientPreview.isLinkReady ? "Link Ready" : "Link Pending"}
                          </span>
                        </div>

                        <div className="pl-3 border-l-[3px] border-[#F5B544] space-y-1.5 py-0.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                              {editModeClientPreview.isLinkReady ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              ) : (
                                <Clock className="w-3.5 h-3.5 text-[#F5B544] shrink-0" />
                              )}
                              <span>{editModeClientPreview.headline}</span>
                            </div>

                            {editModeClientPreview.isLinkReady && editModeClientPreview.normalizedLink && (
                              <a
                                href={editModeClientPreview.normalizedLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-6 px-2.5 rounded-md bg-[#F5B544] hover:bg-[#E5A534] text-[#07152B] font-extrabold text-[10px] flex items-center justify-center gap-1 shadow-xs transition-all shrink-0"
                              >
                                <span>Join Meeting</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>

                          <p className="text-[11px] text-slate-200 leading-snug whitespace-pre-wrap break-words">
                            {editModeClientPreview.supportingMessage}
                          </p>

                          {editModeClientPreview.additionalDirections && (
                            <div className="text-[11px] text-[#FFE394] leading-snug whitespace-pre-wrap break-words pt-0.5">
                              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-sky-300 mr-1.5">
                                Directions:
                              </span>
                              {editModeClientPreview.additionalDirections}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Internal Private Advocate Notes */}
                  <div className="pt-3 border-t-2 border-[#D4AF37]/45 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Lock className="w-3 h-3 text-[#38BDF8]" />
                        <span>Internal Advocate Notes</span>
                      </label>
                      <span className="text-[9px] font-mono font-extrabold uppercase tracking-wider text-[#F5B544] bg-[#F5B544]/10 px-2 py-0.2 rounded-full border border-[#F5B544]/30">
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
                      className="text-xs bg-[#020A17]/80 border-[#D4AF37]/40 text-white placeholder:text-slate-400 focus:border-[#F5B544]"
                    />
                  </div>

                  {/* Form Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={handleSaveFullEdit}
                      disabled={isSaving}
                      className="flex-1 h-9 bg-[#F5B544] hover:bg-[#E5A534] text-[#07152B] font-extrabold shadow-md"
                    >
                      <Save className="w-3.5 h-3.5 mr-1.5" />
                      <span>{isSaving ? "Saving..." : "Save Changes"}</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                      className="flex-1 h-9 border-[#D4AF37]/40 bg-[#020A17]/80 text-white hover:bg-white/10"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                /* ── VIEW MODE: CLEAN, SIMPLE EDGE-TO-EDGE DOSSIER OVERLAY (SINGLE DIVIDER BETWEEN SECTIONS) ── */
                <div className="space-y-4 bg-transparent text-xs">
                  {/* 1. PARTICIPANTS (Clean HoneyBook-style layout on leather) */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white tracking-tight">
                        Participants
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsParticipantsExpanded((prev) => !prev)}
                        className="text-[11px] font-semibold text-[#38BDF8] hover:text-[#FFE394] transition-colors cursor-pointer"
                      >
                        {isParticipantsExpanded ? "Show less" : "Show all"}
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {/* Student Row — Always Visible */}
                      {appointment.studentName && (
                        <button
                          type="button"
                          onClick={handleOpenStudentWorkspace}
                          className="w-full flex items-center justify-between gap-2.5 text-left group cursor-pointer"
                          title={`Open Student Workspace for ${appointment.studentName}`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full border border-[#D4AF37] bg-[#122847] flex items-center justify-center text-[#F4D068] font-bold text-xs shrink-0">
                              {appointment.studentName.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-white group-hover:text-[#FFE394] truncate transition-colors">
                                {appointment.studentName}
                              </div>
                              <div className="text-[11px] text-slate-300/80">
                                Student
                              </div>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-[#F5B544] group-hover:text-[#FFE394] flex items-center gap-0.5 shrink-0">
                            <span>Workspace</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </span>
                        </button>
                      )}

                      {/* Expanded or Always-Clean Organizer & Parent Rows */}
                      {isParticipantsExpanded && (
                        <div className="space-y-2.5 pt-1 animate-in fade-in duration-150">
                          {/* Waypoint / Assigned Advocate (Owner) */}
                          <div className="flex items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-[#122847] border border-sky-400/50 flex items-center justify-center text-sky-200 font-bold text-xs shrink-0">
                                {(appointment.assignedAdvocateName || "WA")
                                  .split(" ")
                                  .map((p) => p[0])
                                  .join("")
                                  .slice(0, 2)}
                              </div>
                              <div className="min-w-0">
                                <div className="text-white font-bold text-xs truncate">
                                  {appointment.assignedAdvocateName || "Waypoint Advocates"}
                                </div>
                                <div className="text-[11px] text-slate-300/80 truncate">
                                  clientcare@waypointadvocates.com
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[11px] text-slate-300/85">Owner</span>
                              {onReassign && (
                                <button
                                  type="button"
                                  onClick={() => onReassign(appointment)}
                                  className="text-[11px] font-semibold text-[#38BDF8] hover:text-[#FFE394] hover:underline cursor-pointer"
                                >
                                  Reassign
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Parent / Client */}
                          {appointment.parentName && (
                            <div className="flex items-center justify-between gap-2.5">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className="flex items-center gap-2.5 text-left group cursor-pointer select-none min-w-0 flex-1"
                                    title="Click for parent actions (Contact Client, View Details)"
                                  >
                                    <div className="relative shrink-0">
                                      <div className="w-8 h-8 rounded-full bg-[#122847] border border-[#D4AF37]/50 flex items-center justify-center text-[#FFE394] font-bold text-xs">
                                        {appointment.parentName
                                          .split(" ")
                                          .map((p) => p[0])
                                          .join("")
                                          .slice(0, 2)}
                                      </div>
                                      <span
                                        className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-[#02132d]"
                                        title="Attendance Confirmed"
                                      />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="text-white font-bold text-xs group-hover:text-[#FFE394] flex items-center gap-1 transition-colors">
                                        <span className="truncate">{appointment.parentName}</span>
                                        <ChevronDown className="w-3 h-3 text-slate-300 shrink-0" />
                                      </div>
                                      <div className="text-[11px] text-slate-300/80 truncate">
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
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Inline Quick Workspace Pills right under Participants (no extra divider) */}
                    <div className="flex items-center gap-2 flex-wrap pt-1">
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
                          className="px-2.5 py-1 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <span className="text-[#F5B544] font-bold">✓</span>
                          <span>Meeting Space</span>
                        </button>
                      )}

                      {(resolvedRelationships.parentId || appointment.clientId) && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            setLocation(
                              `/contacts/${
                                resolvedRelationships.parentId || appointment.clientId
                              }`
                            );
                          }}
                          className="px-2.5 py-1 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <span className="text-[#F5B544] font-bold">✓</span>
                          <span>Family Profile</span>
                        </button>
                      )}

                      {onReschedule && (
                        <button
                          type="button"
                          onClick={() => onReschedule(appointment)}
                          className="px-2.5 py-1 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <ArrowRightLeft className="w-3 h-3 text-[#F5B544]" />
                          <span>Reschedule</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ── SINGLE SECTION DIVIDER ── */}
                  <div className="-mx-4 h-[2px] bg-white/15" />

                  {/* 2. TIME ZONE ALERT & CALLING SAFETY (Simple, no sub-lines) */}
                  {dualTime && (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">
                            Time Zone & Calling Status
                          </span>
                          {dualTime.clientTime.isDifferent ? (
                            <span className="text-[10px] font-bold text-rose-200 bg-rose-950/75 border border-rose-400/50 px-2 py-0.5 rounded-full">
                              ⚠️ {dualTime.clientTime.friendlyName} vs Eastern
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-emerald-300">
                              ✓ Synchronized ({dualTime.waypointTime.tzAbbr})
                            </span>
                          )}
                        </div>

                        {dualTime.clientTime.isDifferent && (
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-[11px] text-rose-300 block">
                                Client Time ({dualTime.clientTime.tzAbbr})
                              </span>
                              <span className="font-bold text-white font-mono">
                                {dualTime.clientTime.timeRange}
                              </span>
                            </div>
                            <div>
                              <span className="text-[11px] text-emerald-300 block">
                                Waypoint Time ({dualTime.waypointTime.tzAbbr})
                              </span>
                              <span className="font-bold text-white font-mono">
                                {dualTime.waypointTime.timeRange}
                              </span>
                            </div>
                          </div>
                        )}

                        <ClientCallingSafetyBadge timeZone={appointment.clientTimeZone} />
                      </div>

                      {/* ── SINGLE SECTION DIVIDER ── */}
                      <div className="-mx-4 h-[2px] bg-white/15" />
                    </>
                  )}

                  {/* 3. DESCRIPTION / CLIENT PREVIEW (Clean like HoneyBook "Description") */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white">
                        Client Preview
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold ${
                            clientFacingView.isLinkReady
                              ? "text-emerald-300"
                              : "text-[#FFE394]"
                          }`}
                        >
                          {clientFacingView.isLinkReady ? "✓ Link Ready" : "• Awaiting Link"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsEditing(true)}
                          className="text-[11px] font-semibold text-[#38BDF8] hover:text-[#FFE394] cursor-pointer"
                        >
                          Customize
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-xs font-bold ${
                            clientFacingView.isLinkReady
                              ? "text-emerald-300"
                              : "text-[#FFE394]"
                          }`}
                        >
                          {clientFacingView.headline}
                        </span>

                        {clientFacingView.isLinkReady && clientFacingView.normalizedLink && (
                          <a
                            href={clientFacingView.normalizedLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-6 px-2.5 rounded-md bg-[#F5B544] hover:bg-[#E5A534] text-[#07152B] font-extrabold text-[10px] flex items-center justify-center gap-1 transition-all cursor-pointer shrink-0"
                          >
                            <span>Join Meeting</span>
                            <ChevronRight className="w-3 h-3 stroke-[2.5]" />
                          </a>
                        )}
                      </div>

                      <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
                        {clientFacingView.supportingMessage}
                      </p>

                      {clientFacingView.additionalDirections && (
                        <p className="text-xs text-[#FFE394] leading-relaxed whitespace-pre-wrap break-words pt-1">
                          {clientFacingView.additionalDirections}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* ── SINGLE SECTION DIVIDER ── */}
                  <div className="-mx-4 h-[2px] bg-white/15" />

                  {/* 4. NOTES (Clean like HoneyBook "Notes" section) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">
                          Notes
                        </span>
                        <span className="text-[9px] font-mono uppercase tracking-wider text-[#FFE394]/80">
                          Private
                        </span>
                      </div>

                      {!isAddingNote && (
                        <button
                          type="button"
                          onClick={() => setIsAddingNote(true)}
                          className="text-[11px] font-semibold text-[#38BDF8] hover:text-[#FFE394] cursor-pointer"
                        >
                          {parsedContent.internalNotes ? "Edit" : "+ Add note"}
                        </button>
                      )}
                    </div>

                    {isAddingNote ? (
                      <div className="space-y-2 pt-1 animate-in fade-in duration-150">
                        <VoiceTextarea
                          value={quickNoteText}
                          onChange={(e) => setQuickNoteText(e.target.value)}
                          placeholder="Add confidential internal advocate notes..."
                          rows={2}
                          className="text-xs bg-[#020A17]/85 border-[#D4AF37]/40 text-white placeholder:text-slate-400 rounded-lg focus:border-[#F5B544]"
                        />
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={handleSaveQuickNote}
                            disabled={isSaving}
                            className="h-7 px-3 text-xs font-bold bg-[#F5B544] hover:bg-[#E5A534] text-[#07152B] rounded-lg"
                          >
                            <Save className="w-3 h-3 mr-1" />
                            <span>Save Note</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsAddingNote(false)}
                            className="h-7 text-xs border-white/20 bg-transparent text-white hover:bg-white/10 rounded-lg"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : parsedContent.internalNotes ? (
                      <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
                        {renderFormattedDescription(parsedContent.internalNotes)}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsAddingNote(true)}
                        className="text-left text-xs text-slate-300/80 hover:text-[#FFE394] flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add note</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
          </div>
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
