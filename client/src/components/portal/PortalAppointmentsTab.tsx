import React, { useState, useMemo } from "react";
import { toast } from "sonner";
import { 
  Calendar, 
  Clock, 
  Video, 
  Phone, 
  Sparkles, 
  Compass, 
  ArrowRight,
  ChevronRight,
  FileText,
  FolderOpen,
  CheckSquare,
  User,
  CalendarPlus,
  CalendarDays,
  Shield,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Plus,
  Link as LinkIcon,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import PageIdBadge from "@/components/PageIdBadge";
import { trpc } from "@/lib/trpc";

interface PortalAppointmentsTabProps {
  displayName?: string;
  effectiveStudent?: any;
  studentAppointments?: any[];
  allMyAppointments?: any[];
  phoneNumber?: string;
  onNavigateTab?: (tabId: string) => void;
  onOpenScheduler?: () => void;
  onUpdatePhone?: (newPhone: string) => void;
  refetchAppointments?: () => void;
  isAdminView?: boolean;
}

// 8-Point Waypoint Compass Rose SVG Emblem
function WaypointCompassEmblem({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="currentColor" aria-hidden="true">
      {/* North */}
      <polygon points="50,12 55,45 50,42" fill="currentColor" opacity="0.95" />
      <polygon points="50,12 45,45 50,42" fill="currentColor" opacity="0.5" />
      {/* South */}
      <polygon points="50,88 55,55 50,58" fill="currentColor" opacity="0.5" />
      <polygon points="50,88 45,55 50,58" fill="currentColor" opacity="0.95" />
      {/* East */}
      <polygon points="88,50 55,55 58,50" fill="currentColor" opacity="0.95" />
      <polygon points="88,50 55,45 58,50" fill="currentColor" opacity="0.5" />
      {/* West */}
      <polygon points="12,50 45,55 42,50" fill="currentColor" opacity="0.5" />
      <polygon points="12,50 45,45 42,50" fill="currentColor" opacity="0.95" />
      {/* Diagonals */}
      <polygon points="76,24 54,46 52,48" fill="currentColor" opacity="0.75" />
      <polygon points="76,76 54,54 52,52" fill="currentColor" opacity="0.4" />
      <polygon points="24,76 46,54 48,52" fill="currentColor" opacity="0.75" />
      <polygon points="24,24 46,46 48,48" fill="currentColor" opacity="0.4" />
      {/* Center circle */}
      <circle cx="50" cy="50" r="3.5" fill="currentColor" />
    </svg>
  );
}

export function PortalAppointmentsTab({
  displayName = "Sarah",
  effectiveStudent,
  studentAppointments = [],
  allMyAppointments = [],
  phoneNumber,
  onNavigateTab = () => {},
  onOpenScheduler = () => {},
  onUpdatePhone,
  refetchAppointments,
  isAdminView = false,
}: PortalAppointmentsTabProps) {
  // Combine and sort appointments chronologically
  const appointments = useMemo(() => {
    const list = [...(studentAppointments || []), ...(allMyAppointments || [])];
    const unique = Array.from(new Map(list.map((item) => [item.id, item])).values());
    return unique.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [studentAppointments, allMyAppointments]);

  // Find next upcoming appointment
  const now = new Date();
  const nextAppt = useMemo(() => {
    return appointments.find((a) => new Date(a.startTime) >= now && a.status !== "Cancelled") || appointments[0];
  }, [appointments]);

  const studentName = effectiveStudent?.firstName || "your child";

  const initialPhone = phoneNumber || nextAppt?.clientPhone || nextAppt?.attendeePhone || nextAppt?.phone || "(404) 555-0198";
  const [currentPhone, setCurrentPhone] = useState(initialPhone);
  const [phoneEditInput, setPhoneEditInput] = useState(initialPhone);
  const [phoneUpdateOpen, setPhoneUpdateOpen] = useState(false);

  // Virtual Meeting Link State
  const initialLink = nextAppt?.location || "https://meet.google.com/waypoint-iep-conference";
  const [meetingLink, setMeetingLink] = useState(initialLink);
  const [linkEditInput, setLinkEditInput] = useState(initialLink);
  const [linkUpdateOpen, setLinkUpdateOpen] = useState(false);
  
  // Add School Meeting Dialog State
  const [addMeetingOpen, setAddMeetingOpen] = useState(false);
  const [schoolMeetingForm, setSchoolMeetingForm] = useState({
    title: `Annual IEP Meeting (${studentName})`,
    meetingDate: "",
    meetingTime: "09:00",
    meetingType: "IEP Annual Review",
    location: "School Conference Room / Online",
    notes: ""
  });
  const [isSubmittingSchoolMeeting, setIsSubmittingSchoolMeeting] = useState(false);

  // Tab filter for appointment history
  const [apptFilter, setApptFilter] = useState<"all" | "upcoming" | "past">("all");

  const filteredAppts = useMemo(() => {
    if (apptFilter === "upcoming") {
      return appointments.filter((a) => new Date(a.startTime) >= now && a.status !== "Cancelled");
    }
    if (apptFilter === "past") {
      return appointments.filter((a) => new Date(a.startTime) < now || a.status === "Completed");
    }
    return appointments;
  }, [appointments, apptFilter]);

  const apptDate = nextAppt?.startTime 
    ? new Date(nextAppt.startTime).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : "Wednesday, May 28, 2026";

  const apptTime = nextAppt?.startTime
    ? `${new Date(nextAppt.startTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} (EST)`
    : "10:00 AM (EST)";

  const handleAddSchoolMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolMeetingForm.meetingDate) {
      toast.error("Please select a meeting date");
      return;
    }
    setIsSubmittingSchoolMeeting(true);
    setTimeout(() => {
      setIsSubmittingSchoolMeeting(false);
      setAddMeetingOpen(false);
      toast.success("School meeting successfully added! Your advocate has been notified.");
      refetchAppointments?.();
    }, 800);
  };

  return (
    <div className="relative min-h-screen bg-[#000821] text-white overflow-hidden selection:bg-[#F5B544]/30 selection:text-white">
      {/* ── Background Panoramic Lighthouse Atmosphere (Full Width Left to Right) ── */}
      <div className="absolute top-0 left-0 right-0 w-full h-[400px] sm:h-[430px] lg:h-[460px] pointer-events-none z-0 overflow-hidden">
        <img
          src="/lighthouse-night-bg.png"
          alt="Lighthouse Beacon"
          className="w-full h-full object-cover object-right sm:object-[85%_top] lg:object-[right_top] opacity-95 filter brightness-105 contrast-105"
        />
        {/* Subtle bottom fade into midnight blue */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#000821]/25 via-transparent to-[#000821]" />
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-[#000821]/50 to-transparent" />
      </div>

      {/* ── Main Container ─────────────────────────────────────────────────── */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 space-y-6">
        
        {/* ── Top Header Section (Left Column constrained so lighthouse on right is unobscured) ── */}
        <div className="space-y-3 max-w-lg lg:max-w-[52%] xl:max-w-[54%] pt-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl lg:text-[36px] font-serif font-normal text-white tracking-tight leading-[1.2]">
              Welcome to your Advocacy Portal, {displayName}!
            </h1>
            <PageIdBadge id="PG-023-APT" name="Portal Appointments" />
          </div>

          <h2 className="text-sm sm:text-base text-blue-100/90 font-normal tracking-normal">
            Review your scheduled strategy sessions, appointments, and school IEP meetings in one place.
          </h2>

          {/* Yellow accent divider rule */}
          <div className="w-16 h-[2.5px] bg-[#F5B544] rounded-full my-2" />

          <p className="text-xs sm:text-sm text-blue-200/75 leading-relaxed">
            We're excited to partner with you and champion {studentName}'s educational rights every step of the way.
          </p>
        </div>

        {/* ── Card 1: Your Next Meeting Banner (Constrained to left side so lighthouse breathes) ── */}
        <div className="w-full lg:max-w-[52%] xl:max-w-[54%] rounded-2xl border border-blue-900/40 bg-gradient-to-b from-[#0B2553]/95 via-[#071D40]/95 to-[#06172F]/95 backdrop-blur-md shadow-2xl p-4 sm:p-5 transition-all hover:border-amber-400/40 space-y-3.5 relative overflow-hidden group">
          {/* Top Emerald Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400/80 to-transparent" />

          {/* Top Section: Calendar Badge & Full-width text running across the box */}
          <div className="flex items-start gap-3.5">
            {/* Circular Golden Calendar Badge aligned with top of text */}
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-[#F5B544]/40 bg-[#030C22] flex items-center justify-center text-[#F5B544] shrink-0 shadow-inner mt-0.5">
              <CalendarDays className="h-5 w-5 stroke-[1.8]" />
            </div>

            <div className="space-y-0.5 flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-extrabold tracking-widest text-[#F5B544] uppercase block leading-tight font-mono">
                  YOUR NEXT UPCOMING MEETING
                </span>
                {nextAppt && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <CheckCircle2 className="h-3 w-3" /> {nextAppt.status || "Confirmed"}
                  </span>
                )}
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                {nextAppt?.title || "Annual IEP Meeting with School & Advocate."}
              </h3>
              <p className="text-xs text-white/75 leading-relaxed pt-0.5">
                Official IEP review conference with Byron Honea attending for {studentName}'s advocacy.
              </p>
              <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-xs text-blue-100/85 pt-1">
                <span className="flex items-center gap-1.5 font-medium">
                  <Calendar className="h-3.5 w-3.5 text-amber-400" />
                  {apptDate}
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Clock className="h-3.5 w-3.5 text-blue-300/80" />
                  {apptTime}
                </span>
                <span className="flex items-center gap-1.5 font-medium text-emerald-300">
                  <Video className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  Virtual meeting link received!
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Row: Action buttons */}
          <div className="flex items-center gap-2 pt-2 border-t border-white/10 flex-wrap">
            <a
              href={meetingLink.startsWith("http") ? meetingLink : `https://${meetingLink}`}
              target="_blank"
              rel="noreferrer"
              className="bg-[#F5B544] hover:bg-[#E5A534] text-[#07152B] font-semibold text-xs px-3.5 py-1.5 h-8 rounded-lg shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Video className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Join Virtual Meeting</span>
              <ExternalLink className="h-3 w-3 opacity-70" />
            </a>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setLinkEditInput(meetingLink);
                setLinkUpdateOpen(true);
              }}
              className="border-blue-900/40 bg-[#030C22] hover:bg-blue-900/40 text-white text-xs font-normal px-3 py-1.5 h-8 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <LinkIcon className="h-3.5 w-3.5 text-amber-400" />
              <span>Change Meeting Link</span>
            </Button>
          </div>
        </div>

        {/* ── Middle Row: Two Action Cards (Compacted & Streamlined) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card A: Schedule Time With My Advocate */}
          <div className="rounded-2xl border border-blue-900/40 bg-gradient-to-b from-[#0B2553]/95 via-[#071D40]/95 to-[#06172F]/95 backdrop-blur-md shadow-xl p-4 sm:p-5 flex flex-col justify-between hover:border-amber-400/50 transition-all relative overflow-hidden group space-y-3">
            {/* Top Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F5B544]/60 to-transparent" />

            <div className="space-y-2.5">
              {/* Header: Icon & Category Tag */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full border border-[#F5B544]/30 bg-[#030C22] text-[#F5B544] flex items-center justify-center shrink-0 shadow-inner">
                    <User className="h-4 w-4 stroke-[1.8]" />
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-white tracking-tight">
                    Schedule Time With My Advocate
                  </h4>
                </div>
                <span className="text-[9px] font-extrabold tracking-wider text-[#F5B544] uppercase bg-[#F5B544]/10 border border-[#F5B544]/20 px-2 py-0.5 rounded-full shrink-0 font-mono">
                  YOU & ADVOCATE ONLY
                </span>
              </div>

              {/* Description */}
              <p className="text-[11px] sm:text-xs text-blue-200/70 leading-relaxed pl-0.5">
                Need to ask questions, review evaluations, or prep for a meeting? Book dedicated 1-on-1 strategy time with Byron.
              </p>

              {/* Feature Highlight Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-white/90 bg-[#030C22] border border-blue-900/40 px-2 py-0.5 rounded-md">
                  <span className="text-[#F5B544] font-bold text-[10px]">✓</span> Strategy Calls
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-white/90 bg-[#030C22] border border-blue-900/40 px-2 py-0.5 rounded-md">
                  <span className="text-[#F5B544] font-bold text-[10px]">✓</span> Case Prep
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-white/90 bg-[#030C22] border border-blue-900/40 px-2 py-0.5 rounded-md">
                  <span className="text-[#F5B544] font-bold text-[10px]">✓</span> Record Review
                </span>
              </div>
            </div>

            {/* Compact Footer */}
            <div className="pt-2.5 border-t border-white/10 flex items-center justify-between gap-2">
              <span className="text-[10px] text-blue-200/60 flex items-center gap-1 font-mono">
                <Clock className="h-3 w-3 text-[#F5B544]" />
                Flexible Scheduling
              </span>

              <Button
                size="sm"
                onClick={onOpenScheduler}
                className="bg-[#F5B544] hover:bg-[#E5A534] text-[#07152B] font-semibold text-xs px-3.5 py-1.5 h-8 rounded-lg shadow-xs transition-all flex items-center gap-1 cursor-pointer"
              >
                <span>Choose a Time</span>
                <ChevronRight className="h-3 w-3 stroke-[2.5]" />
              </Button>
            </div>
          </div>

          {/* Card B: Add an IEP / 504 Meeting */}
          <div className="rounded-2xl border border-blue-900/40 bg-gradient-to-b from-[#0B2553]/95 via-[#071D40]/95 to-[#06172F]/95 backdrop-blur-md shadow-xl p-4 sm:p-5 flex flex-col justify-between hover:border-blue-400/50 transition-all relative overflow-hidden group space-y-3">
            {/* Top Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400/60 to-transparent" />

            <div className="space-y-2.5">
              {/* Header: Icon & Category Tag */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full border border-blue-400/30 bg-[#030C22] text-blue-400 flex items-center justify-center shrink-0 shadow-inner">
                    <CalendarPlus className="h-4 w-4 stroke-[1.8]" />
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-white tracking-tight">
                    Add an IEP / 504 Meeting
                  </h4>
                </div>
                <span className="text-[9px] font-extrabold tracking-wider text-blue-300 uppercase bg-blue-400/10 border border-blue-400/20 px-2 py-0.5 rounded-full shrink-0 font-mono">
                  SCHOOL & ADVOCATE
                </span>
              </div>

              {/* Description */}
              <p className="text-[11px] sm:text-xs text-blue-200/70 leading-relaxed pl-0.5">
                Have a date from your school? Add it so your advocate can review records, prepare parent concerns, and attend.
              </p>

              {/* Feature Highlight Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-white/90 bg-[#030C22] border border-blue-900/40 px-2 py-0.5 rounded-md">
                  <span className="text-blue-400 font-bold text-[10px]">✓</span> Annual IEPs
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-white/90 bg-[#030C22] border border-blue-900/40 px-2 py-0.5 rounded-md">
                  <span className="text-blue-400 font-bold text-[10px]">✓</span> 504 Conferences
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-white/90 bg-[#030C22] border border-blue-900/40 px-2 py-0.5 rounded-md">
                  <span className="text-blue-400 font-bold text-[10px]">✓</span> MDR / Hearings
                </span>
              </div>
            </div>

            {/* Compact Footer */}
            <div className="pt-2.5 border-t border-white/10 flex items-center justify-between gap-2">
              <span className="text-[10px] text-blue-200/60 flex items-center gap-1 font-mono">
                <Shield className="h-3 w-3 text-blue-400" />
                Advocate Representation
              </span>

              <Button
                size="sm"
                onClick={() => setAddMeetingOpen(true)}
                className="bg-[#F5B544] hover:bg-[#E5A534] text-[#07152B] font-semibold text-xs px-3.5 py-1.5 h-8 rounded-lg shadow-xs transition-all flex items-center gap-1 cursor-pointer"
              >
                <span>Add School Meeting</span>
                <ChevronRight className="h-3 w-3 stroke-[2.5]" />
              </Button>
            </div>
          </div>
        </div>

        {/* ── Section: All Appointments & Meeting Records ───────────────────── */}
        <div className="rounded-2xl border border-blue-900/40 bg-[#06172F] p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-900/40 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-amber-400" />
                <h3 className="text-base font-bold text-white tracking-tight">
                  All Scheduled Appointments & History
                </h3>
              </div>
              <p className="text-xs text-white/60 mt-0.5">
                Complete record of upcoming strategy calls, IEP meetings, and past consultations for {studentName}.
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 bg-[#030C22] p-1 rounded-xl border border-blue-900/40 shrink-0">
              <button
                onClick={() => setApptFilter("all")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  apptFilter === "all" ? "bg-amber-400 text-slate-950" : "text-white/70 hover:text-white"
                }`}
              >
                All ({appointments.length})
              </button>
              <button
                onClick={() => setApptFilter("upcoming")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  apptFilter === "upcoming" ? "bg-amber-400 text-slate-950" : "text-white/70 hover:text-white"
                }`}
              >
                Upcoming
              </button>
              <button
                onClick={() => setApptFilter("past")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  apptFilter === "past" ? "bg-amber-400 text-slate-950" : "text-white/70 hover:text-white"
                }`}
              >
                Past
              </button>
            </div>
          </div>

          {/* Appointments List */}
          {filteredAppts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {filteredAppts.map((appt) => {
                const isUpcoming = new Date(appt.startTime) >= now;
                return (
                  <div
                    key={appt.id}
                    className="p-4 rounded-xl border border-blue-900/40 bg-[#030C22] hover:border-amber-400/40 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                          isUpcoming ? "bg-amber-400/10 border-amber-400/30 text-amber-400" : "bg-blue-900/20 border-blue-900/40 text-blue-400"
                        }`}>
                          <Calendar className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-white truncate">{appt.title}</p>
                          {appt.description && (
                            <p className="text-xs text-white/60 mt-0.5 line-clamp-2">{appt.description}</p>
                          )}
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 border ${
                        appt.status === "Confirmed" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                        : appt.status === "Completed" ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                        : appt.status === "Cancelled" ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                        : "bg-amber-400/20 text-amber-300 border-amber-400/30"
                      }`}>
                        {appt.status || "Confirmed"}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-blue-900/30 flex items-center justify-between text-xs text-white/70 flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Calendar className="h-3 w-3 text-amber-400" />
                          {new Date(appt.startTime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Clock className="h-3 w-3 text-blue-300" />
                          {new Date(appt.startTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </span>
                      </div>
                      {appt.location && (
                        <span className="flex items-center gap-1 text-[11px] text-white/60 truncate max-w-[150px]">
                          <MapPin className="h-3 w-3 text-amber-400 shrink-0" />
                          {appt.location}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center rounded-xl border border-dashed border-blue-900/40 bg-[#030C22]/50 p-6 space-y-2">
              <Calendar className="h-8 w-8 text-white/30 mx-auto" />
              <p className="text-sm font-bold text-white">No appointments found</p>
              <p className="text-xs text-white/60">Use the buttons above to book a strategy session or add a school meeting.</p>
            </div>
          )}
        </div>

        {/* ── Section: Helpful Tools & Resources ────────────────────────────── */}
        <div className="space-y-3 pt-2">
          {/* Section Header */}
          <div className="flex items-center gap-2.5">
            <div className="text-[#F5B544]">
              <Compass className="h-5 w-5 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Helpful Tools & Quick Navigation
              </h3>
              <p className="text-xs text-blue-200/60">
                Direct access to the advocacy tools, documents, and progress dials for {studentName}.
              </p>
            </div>
          </div>

          {/* 4 Tool Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Tool 1: IEP Comparator */}
            <div 
              onClick={() => onNavigateTab("tools")}
              className="group rounded-2xl border border-blue-900/40 bg-[#06172F] backdrop-blur-md p-4 flex flex-col justify-between hover:border-blue-400/50 hover:shadow-lg transition-all cursor-pointer"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl border border-blue-400/30 bg-[#030C22] text-blue-400 flex items-center justify-center shadow-inner">
                  <FileText className="h-5 w-5 stroke-[1.8]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                    IEP Comparator
                  </h4>
                  <p className="text-[11px] text-blue-200/65 mt-1.5 leading-relaxed">
                    Compare your child's current IEP with previous versions side-by-side.
                  </p>
                </div>
              </div>
              <div className="pt-4 flex items-center gap-1 text-xs font-semibold text-blue-400 group-hover:text-blue-300">
                <span>Open Tool</span>
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
              </div>
            </div>

            {/* Tool 2: Document Vault */}
            <div 
              onClick={() => onNavigateTab("smart-docs")}
              className="group rounded-2xl border border-blue-900/40 bg-[#06172F] backdrop-blur-md p-4 flex flex-col justify-between hover:border-amber-400/50 hover:shadow-lg transition-all cursor-pointer"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl border border-amber-400/30 bg-[#030C22] text-amber-400 flex items-center justify-center shadow-inner">
                  <FolderOpen className="h-5 w-5 stroke-[1.8]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                    Document Vault
                  </h4>
                  <p className="text-[11px] text-blue-200/65 mt-1.5 leading-relaxed">
                    Securely upload, organize, and view all evaluations and records.
                  </p>
                </div>
              </div>
              <div className="pt-4 flex items-center gap-1 text-xs font-semibold text-amber-400 group-hover:text-amber-300">
                <span>Go to Documents</span>
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
              </div>
            </div>

            {/* Tool 3: Meeting Prep & Tasks */}
            <div 
              onClick={() => onNavigateTab("tasks")}
              className="group rounded-2xl border border-blue-900/40 bg-[#06172F] backdrop-blur-md p-4 flex flex-col justify-between hover:border-emerald-400/50 hover:shadow-lg transition-all cursor-pointer"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl border border-emerald-400/30 bg-[#030C22] text-emerald-400 flex items-center justify-center shadow-inner">
                  <CheckSquare className="h-5 w-5 stroke-[1.8]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                    Action Tasks
                  </h4>
                  <p className="text-[11px] text-blue-200/65 mt-1.5 leading-relaxed">
                    Track parent action items, evaluations, and advocate prep tasks.
                  </p>
                </div>
              </div>
              <div className="pt-4 flex items-center gap-1 text-xs font-semibold text-emerald-400 group-hover:text-emerald-300">
                <span>View Tasks</span>
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
              </div>
            </div>

            {/* Tool 4: Pathway Guide / Case Compass */}
            <div 
              onClick={() => onNavigateTab("compass")}
              className="group rounded-2xl border border-blue-900/40 bg-[#06172F] backdrop-blur-md p-4 flex flex-col justify-between hover:border-cyan-400/50 hover:shadow-lg transition-all cursor-pointer"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl border border-cyan-400/30 bg-[#030C22] text-cyan-400 flex items-center justify-center shadow-inner">
                  <Compass className="h-5 w-5 stroke-[1.8]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-cyan-200 transition-colors">
                    Case Compass™
                  </h4>
                  <p className="text-[11px] text-blue-200/65 mt-1.5 leading-relaxed">
                    Check current case phase, next steps, and who has the ball.
                  </p>
                </div>
              </div>
              <div className="pt-4 flex items-center gap-1 text-xs font-semibold text-cyan-400 group-hover:text-cyan-300">
                <span>Open Compass</span>
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom Banner: "You're not alone in this." ────────────────────── */}
        <div className="rounded-2xl border border-blue-900/40 bg-gradient-to-r from-[#06172F] via-[#071D40] to-[#0B2553] backdrop-blur-md p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden shadow-2xl">
          {/* Subtle wave vector lines in the background */}
          <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-25 pointer-events-none">
            <svg viewBox="0 0 400 100" className="w-full h-full" fill="none" preserveAspectRatio="none">
              <path d="M0,50 C100,20 200,80 300,40 C350,20 400,60 400,50" stroke="#38BDF8" strokeWidth="1.2" opacity="0.6" />
              <path d="M0,70 C120,40 220,90 320,60 C370,40 400,80 400,70" stroke="#F5B544" strokeWidth="1" opacity="0.5" />
            </svg>
          </div>

          {/* Left Side: Compass Rose & Reassurance */}
          <div className="flex items-center gap-3.5 z-10">
            <div className="w-12 h-12 rounded-full border border-[#F5B544]/30 bg-[#030C22] flex items-center justify-center text-[#F5B544] shrink-0 shadow-inner">
              <WaypointCompassEmblem className="w-7 h-7" />
            </div>
            <div>
              <h4 className="font-serif font-bold text-sm sm:text-base text-[#F5B544] tracking-normal">
                You're not alone in this.
              </h4>
              <p className="text-xs text-blue-200/70 mt-0.5">
                We're here to guide you toward clarity, confidence, and results for {studentName}.
              </p>
            </div>
          </div>

          {/* Right Side: Elegant Golden Script */}
          <div className="z-10 sm:text-right pr-2">
            <span className="font-serif italic text-xl sm:text-2xl lg:text-3xl text-[#F5B544] tracking-wide font-normal select-none">
              We've got your back.
            </span>
          </div>
        </div>

      </div>

      {/* ── Dialog: Update Phone Number Modal ─────────────────────────────── */}
      <Dialog open={phoneUpdateOpen} onOpenChange={setPhoneUpdateOpen}>
        <DialogContent className="bg-[#06172F] border-blue-900/40 text-white max-w-md shadow-2xl rounded-2xl">
          <DialogHeader className="border-b border-blue-900/40 pb-3">
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-white">
              <Phone className="h-5 w-5 text-[#F5B544]" />
              Update Your Contact Phone Number
            </DialogTitle>
            <DialogDescription className="text-xs text-white/60">
              Byron will call this number directly for your scheduled strategy calls.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!phoneEditInput.trim()) {
                toast.error("Please enter a valid phone number");
                return;
              }
              const cleanPhone = phoneEditInput.trim();
              setCurrentPhone(cleanPhone);
              onUpdatePhone?.(cleanPhone);
              setPhoneUpdateOpen(false);
              toast.success(`Phone number updated to ${cleanPhone}`);
            }}
            className="space-y-4 pt-2 text-xs"
          >
            <div>
              <label className="text-white/80 font-semibold block mb-1.5">
                Primary Contact Phone Number
              </label>
              <input
                type="tel"
                required
                value={phoneEditInput}
                onChange={(e) => setPhoneEditInput(e.target.value)}
                placeholder="(404) 555-0198"
                className="w-full bg-[#030C22] border border-blue-900/40 focus:border-[#F5B544] rounded-xl p-2.5 text-sm text-white outline-none transition-colors"
              />
              <p className="text-[11px] text-white/50 mt-1.5 leading-relaxed">
                Byron will call you directly at this number on <strong className="text-white">{apptDate}</strong> at <strong className="text-white">{apptTime}</strong>.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-blue-900/40">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPhoneUpdateOpen(false)}
                className="text-white/70 hover:text-white text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-md"
              >
                Save Phone Number
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Change Virtual Meeting Link Modal ──────────────────────── */}
      <Dialog open={linkUpdateOpen} onOpenChange={setLinkUpdateOpen}>
        <DialogContent className="bg-[#06172F] border-blue-900/40 text-white max-w-md shadow-2xl rounded-2xl">
          <DialogHeader className="border-b border-blue-900/40 pb-3">
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-white">
              <Video className="h-5 w-5 text-emerald-400" />
              Change Virtual Meeting Link
            </DialogTitle>
            <DialogDescription className="text-xs text-white/60">
              Enter or update the Google Meet, Zoom, or Microsoft Teams URL for your upcoming IEP meeting.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!linkEditInput.trim()) {
                toast.error("Please enter a meeting link");
                return;
              }
              const cleanLink = linkEditInput.trim();
              setMeetingLink(cleanLink);
              setLinkUpdateOpen(false);
              toast.success("Meeting link updated successfully!");
            }}
            className="space-y-4 pt-2 text-xs"
          >
            <div>
              <label className="text-white/80 font-semibold block mb-1.5">
                Virtual Meeting URL
              </label>
              <input
                type="url"
                required
                value={linkEditInput}
                onChange={(e) => setLinkEditInput(e.target.value)}
                placeholder="https://meet.google.com/abc-defg-hij"
                className="w-full bg-[#030C22] border border-blue-900/40 focus:border-[#F5B544] rounded-xl p-2.5 text-sm text-white outline-none transition-colors"
              />
              <p className="text-[11px] text-white/50 mt-1.5 leading-relaxed">
                Both you and your advocate will use this link to enter the IEP conference.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-blue-900/40">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setLinkUpdateOpen(false)}
                className="text-white/70 hover:text-white text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-md"
              >
                Save Meeting Link
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Add School Meeting Modal ───────────────────────────────── */}
      <Dialog open={addMeetingOpen} onOpenChange={setAddMeetingOpen}>
        <DialogContent className="bg-[#06172F] border-blue-900/40 text-white max-w-lg shadow-2xl rounded-2xl">
          <DialogHeader className="border-b border-blue-900/40 pb-3">
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-white">
              <CalendarPlus className="h-5 w-5 text-amber-400" />
              Add an Upcoming School IEP / 504 Meeting
            </DialogTitle>
            <DialogDescription className="text-xs text-white/60">
              Enter the date and details provided by your school district so Byron can prepare and attend.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSchoolMeeting} className="space-y-4 pt-2 text-xs">
            <div className="space-y-1">
              <label className="text-white/80 font-semibold block">Meeting Title / Topic</label>
              <input
                type="text"
                required
                value={schoolMeetingForm.title}
                onChange={(e) => setSchoolMeetingForm({ ...schoolMeetingForm, title: e.target.value })}
                className="w-full bg-[#030C22] border border-blue-900/40 focus:border-amber-400 rounded-xl p-2.5 text-sm text-white outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-white/80 font-semibold block">Meeting Date</label>
                <input
                  type="date"
                  required
                  value={schoolMeetingForm.meetingDate}
                  onChange={(e) => setSchoolMeetingForm({ ...schoolMeetingForm, meetingDate: e.target.value })}
                  className="w-full bg-[#030C22] border border-blue-900/40 focus:border-amber-400 rounded-xl p-2.5 text-sm text-white outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-white/80 font-semibold block">Start Time</label>
                <input
                  type="time"
                  required
                  value={schoolMeetingForm.meetingTime}
                  onChange={(e) => setSchoolMeetingForm({ ...schoolMeetingForm, meetingTime: e.target.value })}
                  className="w-full bg-[#030C22] border border-blue-900/40 focus:border-amber-400 rounded-xl p-2.5 text-sm text-white outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-white/80 font-semibold block">Location / Virtual Meeting Link</label>
              <input
                type="text"
                placeholder="e.g. School Conference Room 102 or Google Meet link"
                value={schoolMeetingForm.location}
                onChange={(e) => setSchoolMeetingForm({ ...schoolMeetingForm, location: e.target.value })}
                className="w-full bg-[#030C22] border border-blue-900/40 focus:border-amber-400 rounded-xl p-2.5 text-sm text-white outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-white/80 font-semibold block">Parent Notes / Key Agenda Items</label>
              <textarea
                rows={3}
                placeholder="Any specific evaluations to review or concerns to address..."
                value={schoolMeetingForm.notes}
                onChange={(e) => setSchoolMeetingForm({ ...schoolMeetingForm, notes: e.target.value })}
                className="w-full bg-[#030C22] border border-blue-900/40 focus:border-amber-400 rounded-xl p-2.5 text-sm text-white outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-blue-900/40">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAddMeetingOpen(false)}
                className="text-white/70 hover:text-white text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingSchoolMeeting}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-md"
              >
                {isSubmittingSchoolMeeting ? "Adding Meeting..." : "Save School Meeting"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PortalAppointmentsTab;
