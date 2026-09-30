import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import VoiceInput from "@/components/VoiceInput";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Edit2, Loader2, Zap, UserCircle, Phone, PhoneCall, User, GraduationCap, Calendar, Clock, ClipboardList, CalendarClock, Globe } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import QuickSetupModal from "@/components/QuickSetupModal";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  getTimeInZone,
  getCallingStatus,
  detectTimeZoneFromLocation,
  getTimeDifferenceHours,
  formatTimeDifferenceText,
  getFriendlyTimeZoneName,
} from "@shared/timezones";

const AREA_CODE_TIMEZONE_MAP: Record<string, string> = {
  // Hawaii (HST)
  "808": "Pacific/Honolulu",
  // Alaska (AKST/AKDT)
  "907": "America/Anchorage",
  // Pacific (PST/PDT)
  "206": "America/Los_Angeles", "209": "America/Los_Angeles", "213": "America/Los_Angeles",
  "253": "America/Los_Angeles", "310": "America/Los_Angeles", "323": "America/Los_Angeles",
  "360": "America/Los_Angeles", "408": "America/Los_Angeles", "415": "America/Los_Angeles",
  "425": "America/Los_Angeles", "442": "America/Los_Angeles", "503": "America/Los_Angeles",
  "509": "America/Los_Angeles", "510": "America/Los_Angeles", "530": "America/Los_Angeles",
  "541": "America/Los_Angeles", "559": "America/Los_Angeles", "562": "America/Los_Angeles",
  "619": "America/Los_Angeles", "626": "America/Los_Angeles", "628": "America/Los_Angeles",
  "650": "America/Los_Angeles", "657": "America/Los_Angeles", "661": "America/Los_Angeles",
  "669": "America/Los_Angeles", "702": "America/Los_Angeles", "707": "America/Los_Angeles",
  "714": "America/Los_Angeles", "725": "America/Los_Angeles", "747": "America/Los_Angeles",
  "760": "America/Los_Angeles", "775": "America/Los_Angeles", "805": "America/Los_Angeles",
  "818": "America/Los_Angeles", "820": "America/Los_Angeles", "831": "America/Los_Angeles",
  "858": "America/Los_Angeles", "909": "America/Los_Angeles", "916": "America/Los_Angeles",
  "925": "America/Los_Angeles", "949": "America/Los_Angeles", "951": "America/Los_Angeles",
  "971": "America/Los_Angeles",
  // Mountain (MST/MDT & Arizona)
  "303": "America/Denver", "307": "America/Denver", "385": "America/Denver",
  "406": "America/Denver", "435": "America/Denver", "480": "America/Phoenix",
  "505": "America/Denver", "520": "America/Phoenix", "575": "America/Denver",
  "602": "America/Phoenix", "623": "America/Phoenix", "719": "America/Denver",
  "720": "America/Denver", "801": "America/Denver", "928": "America/Phoenix",
  "970": "America/Denver",
  // Central (CST/CDT)
  "205": "America/Chicago", "214": "America/Chicago", "217": "America/Chicago",
  "218": "America/Chicago", "224": "America/Chicago", "225": "America/Chicago",
  "228": "America/Chicago", "251": "America/Chicago", "254": "America/Chicago",
  "256": "America/Chicago", "260": "America/Chicago", "262": "America/Chicago",
  "269": "America/Chicago", "281": "America/Chicago", "309": "America/Chicago",
  "312": "America/Chicago", "314": "America/Chicago", "316": "America/Chicago",
  "318": "America/Chicago", "319": "America/Chicago", "320": "America/Chicago",
  "325": "America/Chicago", "331": "America/Chicago", "334": "America/Chicago",
  "337": "America/Chicago", "361": "America/Chicago", "402": "America/Chicago",
  "405": "America/Chicago", "409": "America/Chicago", "414": "America/Chicago",
  "417": "America/Chicago", "423": "America/Chicago", "469": "America/Chicago",
  "479": "America/Chicago", "501": "America/Chicago", "502": "America/Chicago",
  "504": "America/Chicago", "507": "America/Chicago", "512": "America/Chicago",
  "515": "America/Chicago", "531": "America/Chicago", "563": "America/Chicago",
  "573": "America/Chicago", "580": "America/Chicago", "601": "America/Chicago",
  "605": "America/Chicago", "608": "America/Chicago", "612": "America/Chicago",
  "615": "America/Chicago", "618": "America/Chicago", "620": "America/Chicago",
  "630": "America/Chicago", "636": "America/Chicago", "641": "America/Chicago",
  "651": "America/Chicago", "660": "America/Chicago", "662": "America/Chicago",
  "701": "America/Chicago", "708": "America/Chicago", "712": "America/Chicago",
  "713": "America/Chicago", "715": "America/Chicago", "731": "America/Chicago",
  "763": "America/Chicago", "769": "America/Chicago", "773": "America/Chicago",
  "779": "America/Chicago", "815": "America/Chicago", "816": "America/Chicago",
  "817": "America/Chicago", "830": "America/Chicago", "832": "America/Chicago",
  "847": "America/Chicago", "870": "America/Chicago", "901": "America/Chicago",
  "903": "America/Chicago", "913": "America/Chicago", "918": "America/Chicago",
  "920": "America/Chicago", "931": "America/Chicago", "936": "America/Chicago",
  "940": "America/Chicago", "952": "America/Chicago", "956": "America/Chicago",
  "972": "America/Chicago", "979": "America/Chicago",
  // Eastern (EST/EDT)
  "201": "America/New_York", "202": "America/New_York", "203": "America/New_York",
  "207": "America/New_York", "212": "America/New_York", "215": "America/New_York",
  "216": "America/New_York", "239": "America/New_York", "240": "America/New_York",
  "267": "America/New_York", "301": "America/New_York", "302": "America/New_York",
  "305": "America/New_York", "315": "America/New_York", "321": "America/New_York",
  "330": "America/New_York", "336": "America/New_York", "347": "America/New_York",
  "351": "America/New_York", "352": "America/New_York", "386": "America/New_York",
  "401": "America/New_York", "404": "America/New_York", "407": "America/New_York",
  "410": "America/New_York", "412": "America/New_York", "413": "America/New_York",
  "434": "America/New_York", "443": "America/New_York", "470": "America/New_York",
  "475": "America/New_York", "484": "America/New_York", "508": "America/New_York",
  "516": "America/New_York", "518": "America/New_York", "540": "America/New_York",
  "561": "America/New_York", "570": "America/New_York", "585": "America/New_York",
  "603": "America/New_York", "609": "America/New_York", "610": "America/New_York",
  "614": "America/New_York", "617": "America/New_York", "631": "America/New_York",
  "646": "America/New_York", "678": "America/New_York", "703": "America/New_York",
  "704": "America/New_York", "716": "America/New_York", "717": "America/New_York",
  "718": "America/New_York", "724": "America/New_York", "727": "America/New_York",
  "732": "America/New_York", "754": "America/New_York", "757": "America/New_York",
  "770": "America/New_York", "772": "America/New_York", "774": "America/New_York",
  "781": "America/New_York", "786": "America/New_York", "802": "America/New_York",
  "803": "America/New_York", "804": "America/New_York", "813": "America/New_York",
  "814": "America/New_York", "828": "America/New_York", "843": "America/New_York",
  "845": "America/New_York", "848": "America/New_York", "856": "America/New_York",
  "857": "America/New_York", "860": "America/New_York", "862": "America/New_York",
  "864": "America/New_York", "865": "America/New_York", "908": "America/New_York",
  "910": "America/New_York", "912": "America/New_York", "914": "America/New_York",
  "917": "America/New_York", "919": "America/New_York", "929": "America/New_York",
  "941": "America/New_York", "954": "America/New_York", "973": "America/New_York",
  "978": "America/New_York", "980": "America/New_York"
};

function getTimeZoneFromPhone(phone?: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  const clean = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (clean.length < 3) return null;
  const areaCode = clean.slice(0, 3);
  return AREA_CODE_TIMEZONE_MAP[areaCode] || null;
}

function resolveDiscoveryCallLocation(
  contact: any | undefined,
  phone?: string,
  notes?: string
): { timeZone: string; city?: string; state?: string; friendlyTz: string } {
  let timeZone: string | undefined = undefined;
  let city: string | undefined = undefined;
  let state: string | undefined = undefined;

  if (contact) {
    city = contact.city || undefined;
    state = contact.state || undefined;
    if (contact.confirmedTimeZone || contact.timezone) {
      timeZone = contact.confirmedTimeZone || contact.timezone;
    } else if (state) {
      timeZone = detectTimeZoneFromLocation(city, state, contact.zipCode || undefined).timeZone;
    }
  }

  // If not resolved from contact, check phone area code
  if (!timeZone && phone) {
    const fromPhone = getTimeZoneFromPhone(phone);
    if (fromPhone) timeZone = fromPhone;
  }

  // If still not resolved, check notes for state or city
  if (!timeZone && notes) {
    const stateMatch = notes.match(/\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\b/i);
    if (stateMatch) {
      state = stateMatch[1].toUpperCase();
      timeZone = detectTimeZoneFromLocation(undefined, state).timeZone;
    }
  }

  const resolvedTz = timeZone || "America/New_York";
  return {
    timeZone: resolvedTz,
    city,
    state,
    friendlyTz: getFriendlyTimeZoneName(resolvedTz),
  };
}

const LEAD_STATUSES = ["New", "14 Day Follow-up", "30 Day Follow-up", "60 Day Follow-up", "90 Day Follow-up", "Ready for Archive", "Won", "Lost"] as const;
type LeadStatus = (typeof LEAD_STATUSES)[number];

function format12Hour(timeStr: string): string {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 || 12;
  const displayM = isNaN(m) ? "00" : String(m).padStart(2, "0");
  return `${displayH}:${displayM} ${ampm}`;
}

function parseDiscoveryDateTime(raw: string | Date | null | undefined): {
  dateObj: Date;
  hasSpecificTime: boolean;
  timeDisplay: string;
  dateDisplay: string;
  isToday: boolean;
  isoDateStr: string;
  timeStr: string;
} {
  if (!raw) {
    const fallback = new Date();
    return {
      dateObj: fallback,
      hasSpecificTime: false,
      timeDisplay: "Time TBD",
      dateDisplay: "",
      isToday: false,
      isoDateStr: "",
      timeStr: "",
    };
  }

  const d = new Date(raw);
  if (isNaN(d.getTime())) {
    const fallback = new Date();
    return {
      dateObj: fallback,
      hasSpecificTime: false,
      timeDisplay: "Time TBD",
      dateDisplay: "",
      isToday: false,
      isoDateStr: "",
      timeStr: "",
    };
  }

  const now = new Date();
  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth();
  const todayDate = now.getDate();

  // Detect pure UTC midnight (which happens when type="date" string was parsed in UTC)
  const isPureUtcMidnight =
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0 &&
    d.getUTCMilliseconds() === 0;

  let localDate: Date;
  let hasSpecificTime: boolean;

  if (isPureUtcMidnight) {
    // When saved without time, preserve calendar year/month/date locally at default 10:00 AM
    localDate = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 10, 0, 0, 0);
    hasSpecificTime = false;
  } else {
    localDate = d;
    hasSpecificTime = !(localDate.getHours() === 0 && localDate.getMinutes() === 0);
  }

  const isToday =
    localDate.getFullYear() === todayYear &&
    localDate.getMonth() === todayMonth &&
    localDate.getDate() === todayDate;

  const hours = String(localDate.getHours()).padStart(2, "0");
  const minutes = String(localDate.getMinutes()).padStart(2, "0");
  const timeStr = hasSpecificTime ? `${hours}:${minutes}` : "";

  const yearStr = String(localDate.getFullYear());
  const monthStr = String(localDate.getMonth() + 1).padStart(2, "0");
  const dayStr = String(localDate.getDate()).padStart(2, "0");
  const isoDateStr = `${yearStr}-${monthStr}-${dayStr}`;

  const timeDisplay = hasSpecificTime
    ? localDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : "Time TBD";

  const dateDisplay = localDate.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return {
    dateObj: localDate,
    hasSpecificTime,
    timeDisplay,
    dateDisplay,
    isToday,
    isoDateStr,
    timeStr,
  };
}

const emptyForm = {
  source: "",
  value: "",
  status: "New" as LeadStatus,
  notes: "",
  parentName: "",
  parentPhone: "",
  studentName: "",
  studentAge: "",
  studentGrade: "",
  discoveryCallDate: "",
  discoveryCallTime: "",
};

export default function Leads() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [quickSetupOpen, setQuickSetupOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const { data: leads, isLoading, refetch } = trpc.leads.list.useQuery(
    undefined,
    {
      enabled: user?.role === "admin",
    }
  );

  const { data: appointments = [] } = trpc.appointments.list.useQuery(
    undefined,
    {
      enabled: user?.role === "admin",
    }
  );

  const { data: contacts = [] } = trpc.contacts.list.useQuery(
    undefined,
    {
      enabled: user?.role === "admin",
    }
  );

  const createMutation = trpc.leads.create.useMutation({
    onSuccess: () => {
      toast.success("Lead created successfully");
      refetch();
      setOpen(false);
      setFormData(emptyForm);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create lead");
    },
  });

  const updateMutation = trpc.leads.update.useMutation({
    onSuccess: () => {
      toast.success("Lead updated successfully");
      refetch();
      setOpen(false);
      setEditingId(null);
      setFormData(emptyForm);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update lead");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let finalDiscoveryDate: Date | undefined = undefined;
    if (formData.discoveryCallDate) {
      const [yearStr, monthStr, dayStr] = formData.discoveryCallDate.split("-");
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10) - 1;
      const day = parseInt(dayStr, 10);

      let hours = 10;
      let minutes = 0;
      if (formData.discoveryCallTime) {
        const [hStr, mStr] = formData.discoveryCallTime.split(":");
        hours = parseInt(hStr, 10) || 0;
        minutes = parseInt(mStr, 10) || 0;
      }
      finalDiscoveryDate = new Date(year, month, day, hours, minutes, 0, 0);
    }

    const editingLead = editingId ? (leads || []).find((l: any) => l.id === editingId) : null;
    const payload = {
      contactId: editingLead?.contactId,
      source: formData.source || undefined,
      value: formData.value || undefined,
      status: formData.status,
      notes: formData.notes || undefined,
      parentName: formData.parentName || undefined,
      parentPhone: formData.parentPhone || undefined,
      studentName: formData.studentName || undefined,
      studentAge: formData.studentAge ? parseInt(formData.studentAge) : undefined,
      studentGrade: formData.studentGrade || undefined,
      discoveryCallDate: finalDiscoveryDate,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (lead: any) => {
    setEditingId(lead.id);

    let dateStr = "";
    let timeStr = "";

    if (lead.discoveryCallDate) {
      const parsed = parseDiscoveryDateTime(lead.discoveryCallDate);
      dateStr = parsed.isoDateStr;
      timeStr = parsed.timeStr;

      // If time isn't explicitly set on lead.discoveryCallDate, check if there's a matching appointment with a start time
      if (!timeStr) {
        const matchingApt = (appointments as any[]).find((apt) => {
          if (!apt.startTime) return false;
          const aptD = new Date(apt.startTime);
          const isSameDay =
            aptD.getFullYear() === parsed.dateObj.getFullYear() &&
            aptD.getMonth() === parsed.dateObj.getMonth() &&
            aptD.getDate() === parsed.dateObj.getDate();
          const matchesContact = lead.contactId && apt.clientId === lead.contactId;
          const matchesParent =
            lead.parentName &&
            apt.parentName &&
            apt.parentName.toLowerCase().includes(lead.parentName.toLowerCase());
          const matchesStudent =
            lead.studentName &&
            apt.studentName &&
            apt.studentName.toLowerCase().includes(lead.studentName.toLowerCase());
          return isSameDay && (matchesContact || matchesParent || matchesStudent);
        });

        if (matchingApt?.startTime) {
          const aptD = new Date(matchingApt.startTime);
          timeStr = `${String(aptD.getHours()).padStart(2, "0")}:${String(aptD.getMinutes()).padStart(2, "0")}`;
        }
      }
    }

    // Hydrate missing fields from contacts if lead was linked to a contact
    let parentName = lead.parentName || "";
    let parentPhone = lead.parentPhone || "";
    let studentName = lead.studentName || "";
    let studentAge = lead.studentAge?.toString() || "";
    let studentGrade = lead.studentGrade || "";

    if (lead.contactId && contacts) {
      const contact = (contacts as any[]).find((c: any) => c.id === lead.contactId);
      if (contact) {
        if (!parentName) {
          parentName = `${contact.firstName || ""} ${contact.lastName || ""}`.trim();
        }
        if (!parentPhone) {
          parentPhone = contact.phone || "";
        }
      }
      const studentContact = (contacts as any[]).find(
        (c: any) => c.parentContactId === lead.contactId || (c.id === lead.contactId && c.parentContactId)
      );
      if (studentContact) {
        if (!studentName) {
          studentName = `${studentContact.firstName || ""} ${studentContact.lastName || ""}`.trim();
        }
        if (!studentGrade) {
          studentGrade = studentContact.gradeLevel || "";
        }
      }
    }

    if (!studentName && lead.notes) {
      const match = lead.notes.match(/Student:\s*([^.\n,]+)/i);
      if (match && match[1]) {
        studentName = match[1].trim();
      }
    }

    setFormData({
      source: lead.source || "",
      value: (lead.value || 0).toString(),
      status: lead.status,
      notes: lead.notes || "",
      parentName,
      parentPhone,
      studentName,
      studentAge,
      studentGrade,
      discoveryCallDate: dateStr,
      discoveryCallTime: timeStr,
    });
    setOpen(true);
  };

  const handleDelete = (id: number) => {
    toast.info("Delete functionality coming soon");
  };

  // Group leads by status
  const leadsByStatus = LEAD_STATUSES.reduce(
    (acc, status) => {
      acc[status] = leads?.filter((l) => l.status === status) || [];
      return acc;
    },
    {} as Record<LeadStatus, any[]>
  );

  const getStatusColor = (status: LeadStatus) => {
    const colors: Record<LeadStatus, string> = {
      New: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      "14 Day Follow-up":
        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      "30 Day Follow-up":
        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      "60 Day Follow-up":
        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      "90 Day Follow-up":
        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      "Ready for Archive":
        "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
      Won: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      Lost: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    };
    return colors[status];
  };

  // Unified Discovery Calls Processing
  const allDiscoveryCalls = useMemo(() => {
    const list: Array<{
      id: string;
      leadId?: number;
      lead?: any;
      parentName: string;
      parentPhone?: string;
      studentName?: string;
      studentAge?: number;
      studentGrade?: string;
      inquiryReason?: string;
      date: Date;
      timeDisplay: string;
      dateDisplay: string;
      timeZone: string;
      city?: string;
      state?: string;
      friendlyTz: string;
      clientTimeInfo: ReturnType<typeof getTimeInZone>;
      callingStatus: ReturnType<typeof getCallingStatus>;
      diffHours: number;
      diffText: string;
    }> = [];

    const seenLeadIds = new Set<number>();
    const now = new Date();

    // 1. Process Leads with discoveryCallDate
    (leads || []).forEach((lead) => {
      if (lead.discoveryCallDate) {
        const parsed = parseDiscoveryDateTime(lead.discoveryCallDate);
        if (!isNaN(parsed.dateObj.getTime())) {
          seenLeadIds.add(lead.id);

          // Check if there is an appointment on the same day for this lead
          const matchingApt = (appointments as any[]).find((apt) => {
            if (!apt.startTime) return false;
            const aptD = new Date(apt.startTime);
            const isSameDay =
              aptD.getFullYear() === parsed.dateObj.getFullYear() &&
              aptD.getMonth() === parsed.dateObj.getMonth() &&
              aptD.getDate() === parsed.dateObj.getDate();
            const matchesContact = lead.contactId && apt.clientId === lead.contactId;
            const matchesParent =
              lead.parentName &&
              apt.parentName &&
              apt.parentName.toLowerCase().includes(lead.parentName.toLowerCase());
            const matchesStudent =
              lead.studentName &&
              apt.studentName &&
              apt.studentName.toLowerCase().includes(lead.studentName.toLowerCase());
            return isSameDay && (matchesContact || matchesParent || matchesStudent);
          });

          const effectiveDate = matchingApt?.startTime ? new Date(matchingApt.startTime) : parsed.dateObj;
          const hasSpecificTime =
            matchingApt?.startTime ||
            parsed.hasSpecificTime;

          const timeDisplay = hasSpecificTime
            ? effectiveDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
            : "Time TBD";

          const dateDisplay = effectiveDate.toLocaleDateString([], {
            weekday: "short",
            month: "short",
            day: "numeric",
          });

          // Resolve parent and student name with fallbacks from contacts and notes
          let resolvedParent = lead.parentName;
          let resolvedPhone = lead.parentPhone;
          let resolvedStudent = lead.studentName;
          let resolvedAge = lead.studentAge;
          let resolvedGrade = lead.studentGrade;
          let matchedContact: any = null;

          if (lead.contactId && contacts) {
            matchedContact = (contacts as any[]).find((x: any) => x.id === lead.contactId);
            if (matchedContact) {
              if (!resolvedParent) {
                resolvedParent = `${matchedContact.firstName || ""} ${matchedContact.lastName || ""}`.trim() || undefined;
              }
              resolvedPhone = resolvedPhone || matchedContact.phone || undefined;
            }
          }
          if (!resolvedStudent && lead.contactId && contacts) {
            const sc = (contacts as any[]).find(
              (x: any) => x.parentContactId === lead.contactId || (x.id === lead.contactId && x.parentContactId)
            );
            if (sc) {
              resolvedStudent = `${sc.firstName || ""} ${sc.lastName || ""}`.trim() || undefined;
              resolvedGrade = resolvedGrade || sc.gradeLevel || undefined;
            }
          }
          if (!resolvedStudent && lead.notes) {
            const match = lead.notes.match(/Student:\s*([^.\n,]+)/i);
            if (match && match[1]) {
              resolvedStudent = match[1].trim();
            }
          }

          // Resolve National Time & Calling Appropriateness
          const loc = resolveDiscoveryCallLocation(matchedContact, resolvedPhone, lead.notes);
          const clientTimeInfo = getTimeInZone(loc.timeZone, now);
          const callingStatus = getCallingStatus(loc.timeZone, {}, now);
          const diffHours = getTimeDifferenceHours(loc.timeZone, "America/New_York", now);
          const diffText = formatTimeDifferenceText(diffHours);

          list.push({
            id: `lead-${lead.id}`,
            leadId: lead.id,
            lead,
            parentName: resolvedParent || "Prospective Family",
            parentPhone: resolvedPhone,
            studentName: resolvedStudent,
            studentAge: resolvedAge,
            studentGrade: resolvedGrade,
            inquiryReason: lead.notes || (lead.source ? `Source: ${lead.source}` : undefined),
            date: effectiveDate,
            timeDisplay,
            dateDisplay,
            timeZone: loc.timeZone,
            city: loc.city,
            state: loc.state,
            friendlyTz: loc.friendlyTz,
            clientTimeInfo,
            callingStatus,
            diffHours,
            diffText,
          });
        }
      }
    });

    // 2. Process Appointments marked as Discovery Call that aren't already included
    (appointments as any[]).forEach((apt) => {
      const isDiscovery =
        apt.title?.toLowerCase().includes("discovery") ||
        apt.meetingType?.toLowerCase().includes("discovery");

      if (isDiscovery && apt.startTime) {
        const aptD = new Date(apt.startTime);
        if (!isNaN(aptD.getTime())) {
          const matchingLead = (leads || []).find((l) => {
            const matchesId = l.contactId && apt.clientId === l.contactId;
            const matchesParent =
              l.parentName &&
              apt.parentName &&
              apt.parentName.toLowerCase().includes(l.parentName.toLowerCase());
            const matchesStudent =
              l.studentName &&
              apt.studentName &&
              apt.studentName.toLowerCase().includes(l.studentName.toLowerCase());
            return matchesId || matchesParent || matchesStudent;
          });

          if (matchingLead && seenLeadIds.has(matchingLead.id)) {
            return;
          }

          if (matchingLead) {
            seenLeadIds.add(matchingLead.id);
          }

          const timeDisplay = aptD.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
          const dateDisplay = aptD.toLocaleDateString([], {
            weekday: "short",
            month: "short",
            day: "numeric",
          });

          let matchedContact: any = null;
          if (apt.clientId && contacts) {
            matchedContact = (contacts as any[]).find((c: any) => c.id === apt.clientId);
          } else if (matchingLead?.contactId && contacts) {
            matchedContact = (contacts as any[]).find((c: any) => c.id === matchingLead.contactId);
          }

          const resolvedPhone = apt.parentPhone || matchingLead?.parentPhone;
          const loc = resolveDiscoveryCallLocation(matchedContact, resolvedPhone, apt.description || matchingLead?.notes);
          const clientTimeInfo = getTimeInZone(loc.timeZone, now);
          const callingStatus = getCallingStatus(loc.timeZone, {}, now);
          const diffHours = getTimeDifferenceHours(loc.timeZone, "America/New_York", now);
          const diffText = formatTimeDifferenceText(diffHours);

          list.push({
            id: `apt-${apt.id}`,
            leadId: matchingLead?.id,
            lead: matchingLead || null,
            parentName: apt.parentName || matchingLead?.parentName || "Prospective Family",
            parentPhone: resolvedPhone,
            studentName: apt.studentName || matchingLead?.studentName,
            studentAge: matchingLead?.studentAge,
            studentGrade: matchingLead?.studentGrade,
            inquiryReason:
              apt.description || matchingLead?.notes || (apt.title ? `Title: ${apt.title}` : undefined),
            date: aptD,
            timeDisplay,
            dateDisplay,
            timeZone: loc.timeZone,
            city: loc.city,
            state: loc.state,
            friendlyTz: loc.friendlyTz,
            clientTimeInfo,
            callingStatus,
            diffHours,
            diffText,
          });
        }
      }
    });

    return list;
  }, [leads, appointments, contacts]);

  const { todaysCalls, upcomingCalls } = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const todayList = allDiscoveryCalls
      .filter((c) => c.date >= todayStart && c.date <= todayEnd)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const upcomingList = allDiscoveryCalls
      .filter((c) => c.date > todayEnd)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    return { todaysCalls: todayList, upcomingCalls: upcomingList };
  }, [allDiscoveryCalls]);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Lead Center</h1>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              PG-003
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Track families through your discovery process
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => setLocation("/leads/forms")}
            variant="outline"
            className="gap-2 border-border/80 text-foreground hover:bg-accent/10"
          >
            <ClipboardList className="size-4 shrink-0 text-sky-500" />
            <span>Manage Lead Forms</span>
          </Button>
          <Button
            onClick={() => setLocation("/leads/0/discovery")}
            variant="outline"
            className="gap-2 border-amber-500/40 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
          >
            <PhoneCall className="size-4 shrink-0" />
            <span>View Discovery Call Process</span>
          </Button>
          <Button
            onClick={() => setQuickSetupOpen(true)}
            className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md"
          >
            <Zap className="size-4 shrink-0" />
            <span>Quick Setup</span>
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingId(null);
                  setFormData(emptyForm);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 font-semibold text-accent-foreground shadow-sm transition-all hover:shadow-md"
              >
                <Plus className="h-4 w-4" />
                Add Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Edit Lead" : "Add New Lead"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Parent Info */}
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Parent / Guardian</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold">Parent Name</label>
                    <VoiceInput
                      value={formData.parentName}
                      onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                      placeholder="e.g. Maria Gonzalez"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold">Parent Phone</label>
                    <VoiceInput
                      value={formData.parentPhone}
                      onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                      placeholder="(555) 000-0000"
                    />
                  </div>
                </div>

                {/* Student Info */}
                <div className="space-y-1 pt-1">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Student</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-3 space-y-2">
                    <label className="block text-sm font-semibold">Student Name</label>
                    <VoiceInput
                      value={formData.studentName}
                      onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                      placeholder="e.g. Diego Gonzalez"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold">Age</label>
                    <Input
                      type="number"
                      value={formData.studentAge}
                      onChange={(e) => setFormData({ ...formData, studentAge: e.target.value })}
                      placeholder="10"
                      min={1}
                      max={25}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="block text-sm font-semibold">Grade</label>
                    <VoiceInput
                      value={formData.studentGrade}
                      onChange={(e) => setFormData({ ...formData, studentGrade: e.target.value })}
                      placeholder="4th Grade"
                    />
                  </div>
                </div>

                {/* Discovery Call */}
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-500" />
                      <span>Discovery Call Schedule</span>
                    </p>
                    {formData.discoveryCallDate && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, discoveryCallDate: "", discoveryCallTime: "" })}
                        className="text-[11px] text-muted-foreground hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        Clear Schedule
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold">Call Date</label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const today = new Date();
                              const y = today.getFullYear();
                              const m = String(today.getMonth() + 1).padStart(2, "0");
                              const d = String(today.getDate()).padStart(2, "0");
                              setFormData({ ...formData, discoveryCallDate: `${y}-${m}-${d}` });
                            }}
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/20 cursor-pointer"
                          >
                            Today
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const tmrw = new Date();
                              tmrw.setDate(tmrw.getDate() + 1);
                              const y = tmrw.getFullYear();
                              const m = String(tmrw.getMonth() + 1).padStart(2, "0");
                              const d = String(tmrw.getDate()).padStart(2, "0");
                              setFormData({ ...formData, discoveryCallDate: `${y}-${m}-${d}` });
                            }}
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground border border-border/40 cursor-pointer"
                          >
                            Tomorrow
                          </button>
                        </div>
                      </div>
                      <Input
                        type="date"
                        value={formData.discoveryCallDate}
                        onChange={(e) => setFormData({ ...formData, discoveryCallDate: e.target.value })}
                        className="h-9 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold">Call Time</label>
                        <span className="text-[10px] text-muted-foreground">Local Time</span>
                      </div>
                      <Input
                        type="time"
                        value={formData.discoveryCallTime}
                        onChange={(e) => setFormData({ ...formData, discoveryCallTime: e.target.value })}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  {/* Quick Time Presets */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[10px] text-muted-foreground font-medium mr-1">Time presets:</span>
                    {[
                      { label: "9:00 AM", value: "09:00" },
                      { label: "10:00 AM", value: "10:00" },
                      { label: "11:30 AM", value: "11:30" },
                      { label: "1:00 PM", value: "13:00" },
                      { label: "2:00 PM", value: "14:00" },
                      { label: "3:30 PM", value: "15:30" },
                      { label: "4:30 PM", value: "16:30" },
                    ].map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => {
                          let dateVal = formData.discoveryCallDate;
                          if (!dateVal) {
                            const today = new Date();
                            const y = today.getFullYear();
                            const m = String(today.getMonth() + 1).padStart(2, "0");
                            const d = String(today.getDate()).padStart(2, "0");
                            dateVal = `${y}-${m}-${d}`;
                          }
                          setFormData({ ...formData, discoveryCallDate: dateVal, discoveryCallTime: preset.value });
                        }}
                        className={cn(
                          "px-2 py-0.5 text-[10px] font-medium rounded-md border transition-all cursor-pointer",
                          formData.discoveryCallTime === preset.value
                            ? "bg-blue-600 text-white border-blue-500 shadow-xs"
                            : "bg-muted/40 hover:bg-muted text-muted-foreground border-border/50"
                        )}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {/* Live scheduling feedback banner */}
                  {formData.discoveryCallDate && (() => {
                    const today = new Date();
                    const y = today.getFullYear();
                    const m = String(today.getMonth() + 1).padStart(2, "0");
                    const d = String(today.getDate()).padStart(2, "0");
                    const isTodayDate = formData.discoveryCallDate === `${y}-${m}-${d}`;

                    return isTodayDate ? (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/25 text-xs text-blue-600 dark:text-blue-400 font-medium">
                        <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-ping" />
                        <span>
                          Will appear in <strong>Today’s Discovery Calls</strong>
                          {formData.discoveryCallTime ? ` at ${format12Hour(formData.discoveryCallTime)}` : " (Time TBD)"}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/40 border border-border/50 text-xs text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground/70" />
                        <span>
                          Will appear in <strong>Upcoming Discovery Calls</strong>: {formData.discoveryCallDate}
                          {formData.discoveryCallTime ? ` at ${format12Hour(formData.discoveryCallTime)}` : ""}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* Lead Details */}
                <div className="space-y-1 pt-1">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Lead Details</p>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold">Source</label>
                  <VoiceInput
                    value={formData.source}
                    onChange={(e) =>
                      setFormData({ ...formData, source: e.target.value })
                    }
                    placeholder="e.g., Referral, Website, Cold Call"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold">
                    Deal Value ($)
                  </label>
                  <VoiceInput
                    type="number"
                    value={formData.value}
                    onChange={(e) =>
                      setFormData({ ...formData, value: e.target.value })
                    }
                    placeholder="10000"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold">Status</label>
                  <Select
                    value={String(formData.status) || "New"}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        status: value as LeadStatus,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold">Notes</label>
                  <VoiceInput
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Add any notes about this lead..."
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    type="submit"
                    disabled={
                      createMutation.isPending || updateMutation.isPending
                    }
                    className="flex-1 rounded-lg bg-accent px-4 py-2 font-semibold text-accent-foreground shadow-sm transition-all hover:shadow-md disabled:opacity-50"
                  >
                    {createMutation.isPending || updateMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : editingId ? (
                      "Update Lead"
                    ) : (
                      "Create Lead"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Section 1: Today's Discovery Calls ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <span className="p-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <CalendarClock className="w-4 h-4 sm:w-5 sm:h-5" />
            </span>
            <span>Today’s Discovery Calls</span>
            {todaysCalls.length > 0 && (
              <span className="rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 px-2 py-0.5 text-xs font-semibold">
                {todaysCalls.length}
              </span>
            )}
          </h2>
        </div>

        {todaysCalls.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {todaysCalls.map((call) => (
              <Card
                key={call.id}
                className="rounded-xl border border-border/80 bg-card/70 dark:bg-[#071933]/70 p-3.5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20 px-2 py-0.5 rounded-md">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>{call.timeDisplay}</span>
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      Today
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-semibold text-sm text-foreground truncate">
                        {call.parentName}
                      </h4>
                      {call.parentPhone && (
                        <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-muted-foreground/70" />
                          {call.parentPhone}
                        </span>
                      )}
                    </div>
                    {call.studentName && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <GraduationCap className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" />
                        <span className="truncate">
                          Student: <span className="font-medium text-foreground">{call.studentName}</span>
                          {(call.studentAge || call.studentGrade) && (
                            <span className="text-muted-foreground/80">
                              {" "}({[call.studentAge ? `Age ${call.studentAge}` : null, call.studentGrade].filter(Boolean).join(" · ")})
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* ── National Time & Calling Appropriateness Indicator ── */}
                  <div className="rounded-lg bg-slate-100/90 dark:bg-[#031024] border border-border/70 p-2.5 space-y-1.5 shadow-inner">
                    <div className="flex items-center justify-between gap-1.5 text-xs flex-wrap">
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <Globe className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                        <span className="text-muted-foreground text-[11px]">Local:</span>
                        <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                          {call.clientTimeInfo.timeString}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-semibold">
                          ({call.callingStatus.tzAbbr} · {call.friendlyTz})
                        </span>
                      </div>

                      <span className="text-[10px] text-muted-foreground font-medium">
                        {call.diffHours === 0 ? "Same time as Eastern HQ" : call.diffText}
                      </span>
                    </div>

                    {/* Calling Appropriateness status badge */}
                    <div className="flex items-center justify-between gap-2 pt-0.5 flex-wrap">
                      {call.callingStatus.status === "green" ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>✓ Appropriate calling time</span>
                        </span>
                      ) : call.callingStatus.status === "yellow" ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <span>⚠ Use discretion ({call.callingStatus.recommendation})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          <span>⚠ {call.callingStatus.label === "Too early" ? "Too early to call" : "Too late to call"}</span>
                        </span>
                      )}

                      {(call.city || call.state) && (
                        <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[120px]" title={[call.city, call.state].filter(Boolean).join(", ")}>
                          {[call.city, call.state].filter(Boolean).join(", ")}
                        </span>
                      )}
                    </div>
                  </div>

                  {call.inquiryReason && (
                    <div className="text-xs text-muted-foreground bg-muted/40 dark:bg-muted/20 rounded-md p-2 border border-border/50 line-clamp-2">
                      <span className="font-medium text-foreground/80">Inquiry: </span>
                      {call.inquiryReason}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-border/60">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (call.lead) {
                        handleEdit(call.lead);
                      } else {
                        const matched = (leads || []).find((l: any) =>
                          (call.leadId && l.id === call.leadId) ||
                          (call.studentName && l.studentName && l.studentName.toLowerCase().includes(call.studentName.toLowerCase())) ||
                          (call.parentName && l.parentName && l.parentName.toLowerCase().includes(call.parentName.toLowerCase()))
                        );
                        if (matched) {
                          handleEdit(matched);
                        } else {
                          setEditingId(null);
                          setFormData({
                            ...emptyForm,
                            parentName: call.parentName && !call.parentName.includes("Prospective") ? call.parentName : "",
                            parentPhone: call.parentPhone || "",
                            studentName: call.studentName || "",
                            studentAge: call.studentAge ? String(call.studentAge) : "",
                            studentGrade: call.studentGrade || "",
                            discoveryCallDate: call.date ? `${call.date.getFullYear()}-${String(call.date.getMonth() + 1).padStart(2, "0")}-${String(call.date.getDate()).padStart(2, "0")}` : "",
                            discoveryCallTime: call.date ? `${String(call.date.getHours()).padStart(2, "0")}:${String(call.date.getMinutes()).padStart(2, "0")}` : "",
                          });
                          setOpen(true);
                        }
                      }
                    }}
                    className="flex-1 text-xs font-semibold h-8 gap-1.5"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Open Lead Record</span>
                  </Button>
                  {call.leadId ? (
                    <Button
                      size="sm"
                      onClick={() => setLocation(`/call-center?type=discovery&leadId=${call.leadId}`)}
                      className="text-xs font-semibold h-8 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 px-3 cursor-pointer shadow-sm"
                    >
                      <PhoneCall className="w-3 h-3" />
                      <span>Start Call</span>
                    </Button>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-4 sm:p-5 text-center">
            <p className="text-sm text-muted-foreground">
              No discovery calls scheduled today.
            </p>
          </div>
        )}
      </div>

      {/* ── Section 2: Upcoming Discovery Calls ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <span className="p-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            </span>
            <span>Upcoming Discovery Calls</span>
            {upcomingCalls.length > 0 && (
              <span className="rounded-full bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30 px-2 py-0.5 text-xs font-semibold">
                {upcomingCalls.length}
              </span>
            )}
          </h2>
        </div>

        {upcomingCalls.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {upcomingCalls.map((call) => (
              <Card
                key={call.id}
                className="rounded-xl border border-border/80 bg-card/70 dark:bg-[#071933]/70 p-3.5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20 px-2 py-0.5 rounded-md">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>{call.timeDisplay}</span>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-muted-foreground/70" />
                      <span>{call.dateDisplay}</span>
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-semibold text-sm text-foreground truncate">
                        {call.parentName}
                      </h4>
                      {call.parentPhone && (
                        <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-muted-foreground/70" />
                          {call.parentPhone}
                        </span>
                      )}
                    </div>
                    {call.studentName && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <GraduationCap className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" />
                        <span className="truncate">
                          Student: <span className="font-medium text-foreground">{call.studentName}</span>
                          {(call.studentAge || call.studentGrade) && (
                            <span className="text-muted-foreground/80">
                              {" "}({[call.studentAge ? `Age ${call.studentAge}` : null, call.studentGrade].filter(Boolean).join(" · ")})
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* ── National Time & Calling Appropriateness Indicator ── */}
                  <div className="rounded-lg bg-slate-100/90 dark:bg-[#031024] border border-border/70 p-2.5 space-y-1.5 shadow-inner">
                    <div className="flex items-center justify-between gap-1.5 text-xs flex-wrap">
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <Globe className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                        <span className="text-muted-foreground text-[11px]">Local:</span>
                        <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                          {call.clientTimeInfo.timeString}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-semibold">
                          ({call.callingStatus.tzAbbr} · {call.friendlyTz})
                        </span>
                      </div>

                      <span className="text-[10px] text-muted-foreground font-medium">
                        {call.diffHours === 0 ? "Same time as Eastern HQ" : call.diffText}
                      </span>
                    </div>

                    {/* Calling Appropriateness status badge */}
                    <div className="flex items-center justify-between gap-2 pt-0.5 flex-wrap">
                      {call.callingStatus.status === "green" ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>✓ Appropriate calling time</span>
                        </span>
                      ) : call.callingStatus.status === "yellow" ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <span>⚠ Use discretion ({call.callingStatus.recommendation})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          <span>⚠ {call.callingStatus.label === "Too early" ? "Too early to call" : "Too late to call"}</span>
                        </span>
                      )}

                      {(call.city || call.state) && (
                        <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[120px]" title={[call.city, call.state].filter(Boolean).join(", ")}>
                          {[call.city, call.state].filter(Boolean).join(", ")}
                        </span>
                      )}
                    </div>
                  </div>

                  {call.inquiryReason && (
                    <div className="text-xs text-muted-foreground bg-muted/40 dark:bg-muted/20 rounded-md p-2 border border-border/50 line-clamp-2">
                      <span className="font-medium text-foreground/80">Inquiry: </span>
                      {call.inquiryReason}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-border/60">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (call.lead) {
                        handleEdit(call.lead);
                      } else {
                        const matched = (leads || []).find((l: any) =>
                          (call.leadId && l.id === call.leadId) ||
                          (call.studentName && l.studentName && l.studentName.toLowerCase().includes(call.studentName.toLowerCase())) ||
                          (call.parentName && l.parentName && l.parentName.toLowerCase().includes(call.parentName.toLowerCase()))
                        );
                        if (matched) {
                          handleEdit(matched);
                        } else {
                          setEditingId(null);
                          setFormData({
                            ...emptyForm,
                            parentName: call.parentName && !call.parentName.includes("Prospective") ? call.parentName : "",
                            parentPhone: call.parentPhone || "",
                            studentName: call.studentName || "",
                            studentAge: call.studentAge ? String(call.studentAge) : "",
                            studentGrade: call.studentGrade || "",
                            discoveryCallDate: call.date ? `${call.date.getFullYear()}-${String(call.date.getMonth() + 1).padStart(2, "0")}-${String(call.date.getDate()).padStart(2, "0")}` : "",
                            discoveryCallTime: call.date ? `${String(call.date.getHours()).padStart(2, "0")}:${String(call.date.getMinutes()).padStart(2, "0")}` : "",
                          });
                          setOpen(true);
                        }
                      }
                    }}
                    className="flex-1 text-xs font-semibold h-8 gap-1.5"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Open Lead Record</span>
                  </Button>
                  {call.leadId ? (
                    <Button
                      size="sm"
                      onClick={() => setLocation(`/call-center?type=discovery&leadId=${call.leadId}`)}
                      className="text-xs font-semibold h-8 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 px-3 cursor-pointer shadow-sm"
                    >
                      <PhoneCall className="w-3 h-3" />
                      <span>Start Call</span>
                    </Button>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-4 sm:p-5 text-center">
            <p className="text-sm text-muted-foreground">
              No upcoming discovery calls scheduled.
            </p>
          </div>
        )}
      </div>

      {/* ── Clear Visual Divider ── */}
      <div className="border-t border-border/80 my-2" />

      {/* ── Section 3: Discovery Pipeline (Preserved Unchanged) ── */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Discovery Pipeline
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Track families through your discovery process
          </p>
        </div>

        {/* Pipeline Columns */}
      {isLoading ? (
        <div className="flex items-center justify-center rounded-lg border border-border bg-muted/50 p-12">
          <Loader2 className="size-6 animate-spin text-accent" />
        </div>
      ) : (
        <div className="flex items-start gap-4 overflow-x-auto pb-6 pt-1 select-none min-h-[calc(100vh-220px)] scrollbar-thin">
          {LEAD_STATUSES.map((status) => (
            <div
              key={status}
              className="w-[280px] shrink-0 flex flex-col rounded-xl bg-card/60 dark:bg-[#071933]/70 border border-border/80 shadow-sm p-3.5 space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-foreground text-sm truncate" title={status}>
                    {status}
                  </h3>
                  <span className="rounded-full bg-muted/80 px-2 py-0.5 text-xs font-semibold text-muted-foreground shrink-0 border border-border/40">
                    {leadsByStatus[status].length}
                  </span>
                </div>
                {status.includes("Follow-up") && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <Zap className="size-3 text-amber-500 shrink-0" />
                    <Select>
                      <SelectTrigger className="h-7 text-xs bg-background/80 border-border/60 w-full min-w-0">
                        <SelectValue placeholder="Select email template" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="template1">Template 1</SelectItem>
                        <SelectItem value="template2">Template 2</SelectItem>
                        <SelectItem value="template3">Template 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="space-y-2.5 overflow-y-auto max-h-[calc(100vh-320px)] pr-0.5 scrollbar-thin">
                {leadsByStatus[status].length > 0 ? (
                  leadsByStatus[status].map((lead) => (
                    <Card
                      key={lead.id}
                      className="rounded-lg border border-border bg-card p-3.5 shadow-sm transition-all hover:shadow-md overflow-hidden"
                    >
                      <div className="space-y-2.5">
                        {/* Student name as card title */}
                        <div className="min-w-0">
                          <h4 className="font-semibold text-foreground text-sm leading-snug break-words">
                            {lead.studentName || lead.source || "Untitled Lead"}
                          </h4>
                          {lead.studentName && lead.source && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate" title={`via ${lead.source}`}>
                              via {lead.source}
                            </p>
                          )}
                        </div>

                        {/* Parent info */}
                        {(lead.parentName || lead.parentPhone) && (
                          <div className="space-y-1">
                            {lead.parentName && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
                                <User className="size-3.5 shrink-0 text-muted-foreground/70" />
                                <span className="truncate">{lead.parentName}</span>
                              </div>
                            )}
                            {lead.parentPhone && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
                                <Phone className="size-3.5 shrink-0 text-muted-foreground/70" />
                                <span className="truncate">{lead.parentPhone}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Student details */}
                        {(lead.studentAge || lead.studentGrade) && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
                            <GraduationCap className="size-3.5 shrink-0 text-muted-foreground/70" />
                            <span className="truncate">
                              {[
                                lead.studentAge ? `Age ${lead.studentAge}` : null,
                                lead.studentGrade || null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </div>
                        )}

                        {/* Discovery call date & time */}
                        {lead.discoveryCallDate && (() => {
                          const parsed = parseDiscoveryDateTime(lead.discoveryCallDate);
                          return (
                            <div className="flex items-center justify-between gap-1.5 text-xs min-w-0">
                              <div className="flex items-center gap-1.5 min-w-0 truncate">
                                <Calendar className={cn("size-3.5 shrink-0", parsed.isToday ? "text-blue-500 dark:text-blue-400" : "text-muted-foreground/70")} />
                                <span className={cn("truncate", parsed.isToday ? "font-semibold text-blue-600 dark:text-blue-400" : "text-muted-foreground")}>
                                  Discovery: {parsed.dateDisplay}{parsed.hasSpecificTime ? ` · ${parsed.timeDisplay}` : ""}
                                </span>
                              </div>
                              {parsed.isToday && (
                                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 shrink-0">
                                  Today
                                </span>
                              )}
                            </div>
                          );
                        })()}

                        {/* Value */}
                        {lead.value && (
                          <div className="text-sm font-semibold text-accent">
                            ${parseFloat(lead.value).toLocaleString()}
                          </div>
                        )}

                        {/* Status badge */}
                        <div>
                          <div
                            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold max-w-full truncate ${getStatusColor(
                              status
                            )}`}
                          >
                            {status === "New" ? "Discovery Call" : status}
                          </div>
                        </div>

                        {/* Notes */}
                        {lead.notes && (
                          <p className="text-xs text-muted-foreground line-clamp-2 break-words" title={lead.notes}>
                            {lead.notes}
                          </p>
                        )}

                        {/* Action buttons */}
                        <div className="flex flex-col gap-1.5 pt-1">
                          {/* Begin Discovery Call — shown on New leads */}
                          {status === "New" && (
                            <Button
                              onClick={() => setLocation(`/call-center?type=discovery&leadId=${lead.id}`)}
                              size="sm"
                              className="w-full min-w-0 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 px-3 py-1.5 shadow-sm justify-center cursor-pointer"
                            >
                              <PhoneCall className="size-3.5 shrink-0" />
                              <span className="truncate">Begin Discovery Call</span>
                            </Button>
                          )}
                          <div className="flex items-center gap-1.5">
                            <Button
                              onClick={() => handleEdit(lead)}
                              variant="outline"
                              size="sm"
                              title="Edit Lead"
                              aria-label="Edit Lead"
                              className={cn(
                                "rounded-md border border-border bg-background text-foreground shadow-sm transition-all hover:bg-muted text-xs font-semibold gap-1.5",
                                (lead as any).contactId ? "h-8 w-8 p-0 shrink-0 justify-center" : "flex-1 min-w-0 py-1 px-2.5 justify-center"
                              )}
                            >
                              <Edit2 className="size-3.5 shrink-0" />
                              {!(lead as any).contactId && <span className="truncate">Edit Lead</span>}
                            </Button>
                            {(lead as any).contactId ? (
                              <Button
                                onClick={() => setLocation(`/contacts/${(lead as any).contactId}`)}
                                variant="outline"
                                size="sm"
                                className="flex-1 min-w-0 rounded-md border border-accent/40 bg-accent/5 px-2.5 py-1 text-xs font-semibold text-accent shadow-sm transition-all hover:bg-accent/10 gap-1.5 justify-center"
                              >
                                <UserCircle className="size-3.5 shrink-0" />
                                <span className="truncate">View Contact</span>
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center">
                    <p className="text-xs text-muted-foreground">
                      No leads yet
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      </div>

      <QuickSetupModal open={quickSetupOpen} onClose={() => setQuickSetupOpen(false)} />
    </div>
  );
}
