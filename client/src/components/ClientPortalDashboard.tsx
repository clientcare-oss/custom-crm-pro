import React from "react";
import {
  Compass, MessageSquare, Calendar, FileText, Upload, CheckSquare,
  Folder, ArrowRight, Shield, Clock, Users, BarChart2, Zap, Layout,
  Video, User, CheckCircle2, ChevronRight, MapPin, Sparkles, AlertCircle, Scale
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
import CaseCompassCard from "./CaseCompassCard";

interface ClientPortalDashboardProps {
  displayName: string;
  effectiveStudent?: any;
  studentAppointments?: any[];
  messages?: any[];
  studentTasks?: any[];
  studentFiles?: any[];
  studentCompass?: any;
  onNavigateTab: (tabId: string) => void;
  onOpenScheduler: () => void;
  onUploadClick: () => void;
  portalStudents?: any[];
  selectedStudentId?: number | null;
  onSelectStudent?: (id: number) => void;
  onOpenIepLinkDialog?: (studentId: number, studentName: string) => void;
  allMyAppointments?: any[];
}

// ── Detailed Gold Compass Rose SVG ──────────────────────────────────────────
function GoldCompassRose({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="compassGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#0B172A" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F5D77F" />
          <stop offset="50%" stopColor="#D4AF37" />
          <stop offset="100%" stopColor="#AA7C11" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="55" fill="url(#compassGlow)" />
      <circle cx="60" cy="60" r="48" stroke="url(#goldGrad)" strokeWidth="1.5" opacity="0.8" />
      <circle cx="60" cy="60" r="40" stroke="url(#goldGrad)" strokeWidth="0.75" strokeDasharray="3 3" opacity="0.5" />
      {/* Compass Points */}
      <polygon points="60,12 55,60 60,54 65,60" fill="url(#goldGrad)" />
      <polygon points="60,108 55,60 60,66 65,60" fill="url(#goldGrad)" opacity="0.6" />
      <polygon points="12,60 60,55 54,60 60,65" fill="url(#goldGrad)" opacity="0.6" />
      <polygon points="108,60 60,55 66,60 60,65" fill="url(#goldGrad)" opacity="0.9" />
      {/* Corner Points */}
      <polygon points="26,26 56,58 60,54" fill="url(#goldGrad)" opacity="0.4" />
      <polygon points="94,26 64,58 60,54" fill="url(#goldGrad)" opacity="0.4" />
      <polygon points="26,94 56,62 60,66" fill="url(#goldGrad)" opacity="0.4" />
      <polygon points="94,94 64,62 60,66" fill="url(#goldGrad)" opacity="0.4" />
      {/* Center Dial */}
      <circle cx="60" cy="60" r="8" stroke="url(#goldGrad)" strokeWidth="1.5" fill="#0B172A" />
      <circle cx="60" cy="60" r="3" fill="url(#goldGrad)" />
      {/* N/S/E/W Labels */}
      <text x="56.5" y="9" fontSize="9" fill="#F5D77F" fontFamily="serif" fontWeight="bold">N</text>
      <text x="56.5" y="117" fontSize="9" fill="#D4AF37" fontFamily="serif" fontWeight="bold" opacity="0.7">S</text>
      <text x="111" y="63" fontSize="9" fill="#D4AF37" fontFamily="serif" fontWeight="bold" opacity="0.8">E</text>
      <text x="2" y="63" fontSize="9" fill="#D4AF37" fontFamily="serif" fontWeight="bold" opacity="0.6">W</text>
    </svg>
  );
}

export default function ClientPortalDashboard({
  displayName,
  effectiveStudent,
  studentAppointments = [],
  messages = [],
  studentTasks = [],
  studentFiles = [],
  studentCompass,
  onNavigateTab,
  onOpenScheduler,
  onUploadClick,
  portalStudents = [],
  selectedStudentId,
  onSelectStudent,
  onOpenIepLinkDialog,
  allMyAppointments = [],
}: ClientPortalDashboardProps) {

  const { theme } = useTheme();
  const isLight = theme === "blue";

  const unreadCount = messages.filter((m: any) => !m.isRead).length;
  const recentMessage = messages[0];
  const latestFile = studentFiles[0];
  const pendingTask = studentTasks.find((t: any) => t.status !== "Done");
  const completedTask = studentTasks.find((t: any) => t.status === "Done");

  const currentFocus =
    studentCompass?.currentStatus ||
    studentCompass?.currentFocus ||
    "Preparing for the Annual IEP Meeting";

  // Journey steps
  const journeySteps = [
    { title: "Records Review", status: "completed", icon: CheckCircle2 },
    { title: "Evaluate & Analyze", status: "completed", icon: CheckCircle2 },
    { title: "Prepare for Meeting", status: "active", icon: Sparkles },
    { title: "Attend Meeting", status: "upcoming", icon: Users },
    { title: "Monitor & Follow Up", status: "upcoming", icon: BarChart2 },
  ];

  // Resolve students
  const placeholderStudent = {
    id: 120024,
    firstName: "Baaarbra",
    lastName: "Sheep",
    company: "Meadow View Elementary",
  };
  const student1 = portalStudents[0] || effectiveStudent || placeholderStudent;
  const student2 = portalStudents[1];

  const getStudentNextAppt = (student: any) => {
    if (!student) return null;
    const list = (allMyAppointments.length > 0 ? allMyAppointments : studentAppointments) || [];
    const studentAppts = list.filter((a: any) => a.clientId === student.id && a.status !== "Cancelled");
    if (studentAppts.length === 0) {
      if (student.firstName === "Baaarbra" || student.id === 120024) {
        return {
          title: "Annual IEP Meeting",
          startTime: new Date("2026-05-22T09:00:00").toISOString(),
          endTime: new Date("2026-05-22T10:00:00").toISOString(),
          location: "Lincoln Elementary",
          meetingType: "iep",
        };
      }
      return null;
    }
    const sorted = [...studentAppts].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    return sorted[0];
  };

  const getMeetingButtonText = (appt: any) => {
    if (!appt) return "Schedule Session";
    const type = (appt.meetingType || appt.title || "").toLowerCase();
    if (type.includes("iep")) {
      return "Join IEP Meeting";
    }
    if (type.includes("advocate") || type.includes("1:1") || type.includes("one-on-one")) {
      return "Join Advocate Session";
    }
    if (type.includes("discovery")) {
      return "Join Discovery Call";
    }
    return `Join ${appt.meetingType || "Session"}`;
  };

  const nextAppt = getStudentNextAppt(effectiveStudent) || {
    title: "Annual IEP Meeting",
    dateStr: "May 22, 2026 • 9:00 AM",
    location: "Lincoln Elementary",
  };

  const renderStudentCard = (student: any, isSelected: boolean, index: number) => {
    if (!student) return null;
    const appt = getStudentNextAppt(student);
    const joinLink = appt?.videoLink || appt?.clientMeetingLink;
    const btnText = getMeetingButtonText(appt);

    return (
      <div
        onClick={() => onSelectStudent && onSelectStudent(student.id)}
        className={`relative overflow-hidden border rounded-xl p-5 flex flex-col justify-between shadow-xl backdrop-blur-sm transition-all duration-[3000ms] ease-in-out cursor-pointer group min-h-[160px]
          ${isLight 
            ? isSelected
              ? "bg-white border-amber-500 shadow-md shadow-amber-500/5 ring-1 ring-amber-500/10"
              : "bg-white border-slate-200 hover:border-amber-400/40 hover:shadow-md"
            : isSelected 
              ? "bg-[#0A1628]/90 border-amber-400/90 shadow-lg shadow-amber-500/10 ring-1 ring-amber-400/20" 
              : "bg-[#0A1628]/90 border-slate-700/50 hover:border-amber-400/30"}`}
      >
        {isSelected && (
          <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl pointer-events-none ${
            isLight ? "bg-amber-500/5" : "bg-amber-400/5"
          }`} />
        )}

        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-full border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${
            isLight ? "bg-amber-500/5 border-amber-500/20" : "bg-amber-400/10 border-amber-400/30"
          }`}>
            <GoldCompassRose className="w-8 h-8" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className={`text-sm font-bold transition-colors ${
                isLight ? "text-slate-800" : "text-white"
              }`} style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}>
                {student.firstName} {student.lastName}
              </h3>
              {appt ? (
                joinLink ? (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold shrink-0 border ${
                    isLight 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                      : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  }`}>
                    <span className="h-1 w-1 rounded-full bg-emerald-500" />
                    Link Ready
                  </span>
                ) : (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold shrink-0 border ${
                    isLight 
                      ? "bg-amber-50 text-amber-700 border-amber-200" 
                      : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  }`}>
                    <span className="h-1 w-1 rounded-full bg-amber-500 animate-pulse" />
                    Awaiting Link
                  </span>
                )
              ) : null}
            </div>

            {appt ? (
              <div className="mt-2 space-y-0.5">
                <p className={`text-[10px] font-semibold uppercase tracking-wider ${isLight ? "text-slate-500" : "text-slate-400"}`}>Upcoming Meeting</p>
                <p className={`text-xs font-semibold ${isLight ? "text-slate-700" : "text-slate-200"}`}>
                  {new Date(appt.startTime).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} • {new Date(appt.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
                <p className={`text-[11px] truncate font-medium ${isLight ? "text-slate-500" : "text-slate-450"}`}>
                  {appt.title}
                </p>
              </div>
            ) : (
              <p className={`text-xs mt-2.5 italic ${isLight ? "text-slate-400" : "text-slate-400/80"}`}>
                No upcoming meetings scheduled
              </p>
            )}
          </div>
        </div>

        <div className={`mt-4 pt-3 border-t ${isLight ? "border-slate-100" : "border-slate-800/80"}`}>
          {appt ? (
            joinLink ? (
              <a
                href={joinLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 text-xs font-semibold transition-all shadow-md"
              >
                <Video className="w-3.5 h-3.5" />
                {btnText}
              </a>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenIepLinkDialog) onOpenIepLinkDialog(student.id, `${student.firstName} ${student.lastName}`);
                }}
                className={`flex items-center justify-center gap-1.5 w-full rounded-lg py-1.5 text-xs font-semibold transition-all border ${
                  isLight 
                    ? "bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/30 text-amber-700" 
                    : "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/40 text-amber-300"
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                Send Advocate My IEP Meeting Link
              </button>
            )
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenScheduler();
              }}
              className={`flex items-center justify-center gap-1.5 w-full rounded-lg py-1.5 text-xs font-semibold transition-all shadow-md ${
                isLight 
                  ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/10" 
                  : "bg-amber-500 hover:bg-amber-400 text-[#071422] shadow-amber-500/20"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Schedule Session
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderEmptyStudentCard = () => {
    return (
      <div
        onClick={() => {
          toast.info("Need to add another student? Contact your Waypoint Advocate to link another student contact to your portal account.");
        }}
        className={`border border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[160px] ${
          isLight 
            ? "border-slate-300 hover:border-amber-400 hover:bg-white" 
            : "border-slate-700/80 hover:border-slate-500 hover:bg-slate-900/20"
        }`}
      >
        <div className={`w-9 h-9 rounded-full border flex items-center justify-center mb-2 ${
          isLight ? "bg-slate-100 border-slate-200 text-slate-600" : "bg-slate-800 border-slate-700/60 text-slate-400"
        }`}>
          <span className="text-base font-bold">+</span>
        </div>
        <p className={`text-sm font-semibold ${isLight ? "text-slate-700" : "text-slate-300"}`}>Add another student?</p>
        <p className="text-[10px] text-slate-500 mt-1 max-w-[200px] leading-snug">
          Contact your advocate to link another child's case file to this dashboard.
        </p>
      </div>
    );
  };

  return (
    <div className={`p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-sans transition-colors duration-[3000ms] ease-in-out ${
      isLight ? "text-slate-800" : "text-slate-100"
    }`}>
      
      {/* ── ROW 1: AT A GLANCE (STUDENT SELECTOR CARDS) ────────────────────── */}
      <div className="space-y-3">
        <p className={`text-[11px] font-bold tracking-[0.2em] uppercase ${isLight ? "text-amber-600" : "text-amber-400/90"}`}>STUDENTS</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderStudentCard(student1, !selectedStudentId || selectedStudentId === student1?.id, 0)}
          {student2 ? (
            renderStudentCard(student2, selectedStudentId === student2.id, 1)
          ) : (
            renderEmptyStudentCard()
          )}
        </div>
      </div>

      {/* ── ROW 2: ADVOCACY JOURNEY & WHAT'S NEW ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left (8 Cols): YOUR ADVOCACY JOURNEY */}
        <div className="lg:col-span-8 space-y-6">
          <CaseCompassCard caseId={effectiveStudent?.caseId ?? undefined} />

          {/* Messages Block (repositioned below Case Compass Card) */}
          <div 
            onClick={() => onNavigateTab("communication")}
            className={`border rounded-xl p-5 flex items-center justify-between gap-4 shadow-xl backdrop-blur-sm transition-all duration-[3000ms] ease-in-out cursor-pointer group ${
              isLight 
                ? "bg-white border-slate-200 hover:border-amber-400/40 hover:shadow-md" 
                : "bg-[#0A1628]/90 border-slate-700/50 hover:border-amber-400/40"
            }`}
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${
                isLight ? "bg-blue-500/10 border border-blue-500/20" : "bg-blue-500/10 border border-blue-400/30"
              }`}>
                <MessageSquare className={`w-5 h-5 ${isLight ? "text-blue-600" : "text-blue-400"}`} />
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-bold ${isLight ? "text-slate-800" : "text-white"}`}>Unread Messages</p>
                <p className={`text-xs mt-0.5 ${isLight ? "text-slate-500" : "text-slate-300/80"}`}>
                  {unreadCount > 0 ? `${unreadCount} new message(s) from your advocate` : messages.length > 0 ? "All messages read" : "No messages yet"}
                </p>
              </div>
            </div>
            <button className={`flex items-center gap-1 text-xs font-semibold transition-colors duration-[3000ms] ease-in-out shrink-0 ${
              isLight ? "text-amber-600 hover:text-amber-700" : "text-amber-400 hover:text-amber-300"
            }`}>
              View Messages <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right (4 Cols): WHAT'S NEW */}
        <div className={`lg:col-span-4 border rounded-xl p-6 shadow-xl backdrop-blur-sm flex flex-col justify-between space-y-4 ${
          isLight ? "bg-white border-slate-200" : "bg-[#0A1628]/90 border-slate-700/50"
        }`}>
          
          <div className={`border-b pb-3 ${isLight ? "border-slate-100" : "border-slate-800/80"}`}>
            <p className={`text-[11px] font-bold tracking-[0.2em] uppercase ${isLight ? "text-amber-650" : "text-amber-400/90"}`}>WHAT'S NEW</p>
          </div>

          <div className="space-y-3 flex-1">
            
            {/* Update 1: File */}
            <div 
              onClick={() => onNavigateTab("files")}
              className={`flex gap-3 items-start p-2.5 rounded-lg transition-colors cursor-pointer ${
                isLight ? "hover:bg-slate-50" : "hover:bg-slate-800/40"
              }`}
            >
              <div className={`p-2 rounded-lg shrink-0 mt-0.5 border ${
                isLight ? "bg-blue-50 border-blue-200 text-blue-650" : "bg-blue-500/10 border border-blue-400/30 text-blue-400"
              }`}>
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className={`text-xs font-semibold truncate ${isLight ? "text-slate-800" : "text-slate-200"}`}>Document uploaded by school</p>
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title="Unread update" />
                </div>
                <p className={`text-xs font-medium truncate ${isLight ? "text-amber-700" : "text-amber-300/90"}`}>
                  {latestFile?.fileName || "Evaluation Report.pdf"}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {latestFile?.createdAt ? new Date(latestFile.createdAt).toLocaleDateString() : "Yesterday"}
                </p>
              </div>
            </div>

            {/* Update 2: Meeting */}
            <div 
              onClick={onOpenScheduler}
              className={`flex gap-3 items-start p-2.5 rounded-lg transition-colors cursor-pointer ${
                isLight ? "hover:bg-slate-50" : "hover:bg-slate-800/40"
              }`}
            >
              <div className={`p-2 rounded-lg shrink-0 mt-0.5 border ${
                isLight ? "bg-amber-50 border-amber-200 text-amber-650" : "bg-amber-500/10 border border-amber-400/30 text-amber-400"
              }`}>
                <Calendar className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-semibold truncate ${isLight ? "text-slate-800" : "text-slate-200"}`}>Meeting scheduled</p>
                <p className={`text-xs font-medium truncate ${isLight ? "text-slate-700" : "text-slate-350"}`}>{nextAppt.title || "Annual IEP Meeting"}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {nextAppt.startTime
                    ? `${new Date(nextAppt.startTime).toLocaleDateString(undefined, { month: "short", day: "numeric" })} • ${new Date(nextAppt.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                    : "May 22, 2026 • 9:00 AM"}
                </p>
              </div>
            </div>

            {/* Update 3: Message */}
            <div 
              onClick={() => onNavigateTab("communication")}
              className={`flex gap-3 items-start p-2.5 rounded-lg transition-colors cursor-pointer ${
                isLight ? "hover:bg-slate-50" : "hover:bg-slate-800/40"
              }`}
            >
              <div className={`p-2 rounded-lg shrink-0 mt-0.5 border ${
                isLight ? "bg-emerald-50 border-emerald-250 text-emerald-650" : "bg-emerald-500/10 border border-emerald-400/30 text-emerald-400"
              }`}>
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-semibold truncate ${isLight ? "text-slate-800" : "text-slate-200"}`}>New message from advocate</p>
                <p className={`text-xs truncate ${isLight ? "text-slate-600" : "text-slate-300/80"}`}>
                  {recentMessage?.content || "Meeting preparation update"}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {recentMessage?.createdAt ? new Date(recentMessage.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "2 hours ago"}
                </p>
              </div>
            </div>

          </div>

          <button 
            onClick={() => onNavigateTab("smart-docs")}
            className={`w-full flex items-center justify-center gap-1.5 text-xs font-semibold pt-2 transition-colors border-t ${
              isLight 
                ? "text-amber-600 hover:text-amber-700 border-slate-100" 
                : "text-amber-400 hover:text-amber-300 border-slate-800/80"
            }`}
          >
            View All Updates <ArrowRight className="w-3.5 h-3.5" />
          </button>

        </div>

      </div>

      {/* ── ROW 3: THREE COLUMNS (UPCOMING, LATEST ACTIVITY, QUICK ACTIONS) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Col 1: UPCOMING */}
        <div className={`border rounded-xl p-5 shadow-xl backdrop-blur-sm space-y-4 ${
          isLight ? "bg-white border-slate-200" : "bg-[#0A1628]/90 border-slate-700/50"
        }`}>
          <div className={`flex items-center gap-2 border-b pb-3 ${isLight ? "border-slate-100" : "border-slate-800/80"}`}>
            <Calendar className={`w-4 h-4 ${isLight ? "text-amber-600" : "text-amber-400"}`} />
            <p className={`text-[11px] font-bold tracking-[0.18em] uppercase ${isLight ? "text-amber-655" : "text-amber-400"}`}>UPCOMING</p>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-semibold text-slate-450 uppercase tracking-wider">NEXT MEETING</p>
              <p className={`text-xs font-medium mt-1 ${isLight ? "text-slate-750" : "text-slate-300"}`}>
                {nextAppt.startTime
                  ? `${new Date(nextAppt.startTime).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} • ${new Date(nextAppt.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                  : "May 22, 2026 • 9:00 AM"}
              </p>
              <button 
                onClick={onOpenScheduler}
                className={`mt-1 flex items-center justify-between w-full text-sm font-semibold transition-colors group ${
                  isLight ? "text-slate-800 hover:text-amber-700" : "text-white hover:text-amber-300"
                }`}
              >
                <span className="truncate">{nextAppt.title || "Annual IEP Meeting"}</span>
                <ChevronRight className={`w-4 h-4 group-hover:translate-x-1 transition-transform shrink-0 ${isLight ? "text-amber-605" : "text-amber-400"}`} />
              </button>
            </div>

            <div className={`pt-2 border-t ${isLight ? "border-slate-100" : "border-slate-800/60"}`}>
              <p className="text-[10px] font-semibold text-slate-450 uppercase tracking-wider">UPCOMING DEADLINES</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className={`text-xs font-medium truncate ${isLight ? "text-slate-800" : "text-slate-200"}`}>
                  {pendingTask?.title || "Upload Educational Evaluation"}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border ${
                  isLight 
                    ? "bg-amber-50 text-amber-700 border-amber-200" 
                    : "bg-amber-500/20 text-amber-300 border border-amber-400/40"
                }`}>
                  {pendingTask?.dueDate ? `Due ${new Date(pendingTask.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : "Due in 5 days"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Col 2: LATEST ACTIVITY */}
        <div className={`border rounded-xl p-5 shadow-xl backdrop-blur-sm space-y-4 flex flex-col justify-between ${
          isLight ? "bg-white border-slate-200" : "bg-[#0A1628]/90 border-slate-700/50"
        }`}>
          <div className={`flex items-center gap-2 border-b pb-3 ${isLight ? "border-slate-100" : "border-slate-800/80"}`}>
            <Sparkles className={`w-4 h-4 ${isLight ? "text-amber-600" : "text-amber-400"}`} />
            <p className={`text-[11px] font-bold tracking-[0.18em] uppercase ${isLight ? "text-amber-655" : "text-amber-400"}`}>LATEST ACTIVITY</p>
          </div>

          <div className="space-y-3 flex-1">
            <div className="flex items-start gap-2.5 text-xs">
              <FileText className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isLight ? "text-amber-605" : "text-amber-400"}`} />
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${isLight ? "text-slate-850" : "text-slate-200"}`}>Document uploaded</p>
                <p className="text-[10px] text-slate-405 truncate">
                  {latestFile?.fileName || "Evaluation Report.pdf"} • {latestFile?.createdAt ? new Date(latestFile.createdAt).toLocaleDateString() : "Yesterday"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 text-xs">
              <MessageSquare className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isLight ? "text-amber-605" : "text-amber-400"}`} />
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${isLight ? "text-slate-850" : "text-slate-200"}`}>New message from advocate</p>
                <p className="text-[10px] text-slate-405 truncate">
                  {recentMessage?.content ? recentMessage.content.slice(0, 30) + "..." : "Meeting preparation update • 2 hours ago"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-505 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${isLight ? "text-slate-855" : "text-slate-200"}`}>Task completed</p>
                <p className="text-[10px] text-slate-405 truncate">
                  {completedTask?.title || "Review Parent Concern Form"} • May 6, 2026
                </p>
              </div>
            </div>
          </div>

          <button 
            onClick={() => onNavigateTab("tasks")}
            className={`flex items-center gap-1 text-xs font-semibold pt-2 transition-colors border-t ${
              isLight 
                ? "text-amber-600 hover:text-amber-705 border-slate-100" 
                : "text-amber-400 hover:text-amber-300 border-slate-800/60"
            }`}
          >
            View All Activity <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Col 3: QUICK ACTIONS */}
        <div className={`border rounded-xl p-5 shadow-xl backdrop-blur-sm space-y-3 ${
          isLight ? "bg-white border-slate-200" : "bg-[#0A1628]/90 border-slate-700/50"
        }`}>
          <div className={`flex items-center gap-2 border-b pb-3 ${isLight ? "border-slate-100" : "border-slate-800/80"}`}>
            <Zap className={`w-4 h-4 ${isLight ? "text-amber-600" : "text-amber-400"}`} />
            <p className={`text-[11px] font-bold tracking-[0.18em] uppercase ${isLight ? "text-amber-655" : "text-amber-400"}`}>QUICK ACTIONS</p>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            
            <button 
              onClick={onUploadClick}
              className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all group ${
                isLight 
                  ? "border-slate-200 bg-slate-50 hover:bg-amber-500/10 hover:border-amber-500/30" 
                  : "border-slate-700/60 bg-slate-900/60 hover:bg-amber-400/10 hover:border-amber-400/40"
              }`}
            >
              <Upload className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform mb-1.5" />
              <span className={`text-[10px] font-semibold leading-tight group-hover:text-amber-700 ${
                isLight ? "text-slate-700" : "text-slate-200 group-hover:text-amber-300"
              }`}>Upload Document</span>
            </button>

            <button 
              onClick={() => onNavigateTab("communication")}
              className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all group ${
                isLight 
                  ? "border-slate-200 bg-slate-50 hover:bg-amber-500/10 hover:border-amber-500/30" 
                  : "border-slate-700/60 bg-slate-900/60 hover:bg-amber-400/10 hover:border-amber-400/40"
              }`}
            >
              <MessageSquare className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform mb-1.5" />
              <span className={`text-[10px] font-semibold leading-tight group-hover:text-amber-700 ${
                isLight ? "text-slate-700" : "text-slate-200 group-hover:text-amber-300"
              }`}>Send Message</span>
            </button>

            <button 
              onClick={onOpenScheduler}
              className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all group ${
                isLight 
                  ? "border-slate-200 bg-slate-50 hover:bg-amber-500/10 hover:border-amber-500/30" 
                  : "border-slate-700/60 bg-slate-900/60 hover:bg-amber-400/10 hover:border-amber-400/40"
              }`}
            >
              <Calendar className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform mb-1.5" />
              <span className={`text-[10px] font-semibold leading-tight group-hover:text-amber-700 ${
                isLight ? "text-slate-700" : "text-slate-200 group-hover:text-amber-300"
              }`}>Schedule Meeting</span>
            </button>

            <button 
              onClick={() => onNavigateTab("compass")}
              className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all group ${
                isLight 
                  ? "border-slate-200 bg-slate-50 hover:bg-amber-500/10 hover:border-amber-500/30" 
                  : "border-slate-700/60 bg-slate-900/60 hover:bg-amber-400/10 hover:border-amber-400/40"
              }`}
            >
              <Compass className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform mb-1.5" />
              <span className={`text-[10px] font-semibold leading-tight group-hover:text-amber-700 ${
                isLight ? "text-slate-700" : "text-slate-200 group-hover:text-amber-300"
              }`}>View Recs</span>
            </button>

            <button 
              onClick={() => onNavigateTab("tasks")}
              className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all group ${
                isLight 
                  ? "border-slate-200 bg-slate-50 hover:bg-amber-500/10 hover:border-amber-500/30" 
                  : "border-slate-700/60 bg-slate-900/60 hover:bg-amber-400/10 hover:border-amber-400/40"
              }`}
            >
              <CheckSquare className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform mb-1.5" />
              <span className={`text-[10px] font-semibold leading-tight group-hover:text-amber-700 ${
                isLight ? "text-slate-700" : "text-slate-200 group-hover:text-amber-300"
              }`}>Add Task</span>
            </button>

            <button 
              onClick={() => onNavigateTab("cases")}
              className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all group ${
                isLight 
                  ? "border-slate-200 bg-slate-50 hover:bg-amber-500/10 hover:border-amber-500/30" 
                  : "border-slate-700/60 bg-slate-900/60 hover:bg-amber-400/10 hover:border-amber-400/40"
              }`}
            >
              <Folder className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform mb-1.5" />
              <span className={`text-[10px] font-semibold leading-tight group-hover:text-amber-700 ${
                isLight ? "text-slate-700" : "text-slate-200 group-hover:text-amber-300"
              }`}>Case Details</span>
            </button>

          </div>
        </div>

      </div>

      {/* ── ROW 4: RESOURCE CENTER ────────────────────────────────────────── */}
      <div className={`border rounded-xl p-5 shadow-xl backdrop-blur-sm space-y-3 ${
        isLight ? "bg-white border-slate-200" : "bg-[#0A1628]/90 border-slate-700/50"
      }`}>
        <div className="flex items-center gap-3">
          <GoldCompassRose className="w-6 h-6 shrink-0" />
          <div>
            <p className={`text-[11px] font-bold tracking-[0.18em] uppercase ${isLight ? "text-amber-655" : "text-amber-400"}`}>RESOURCE CENTER</p>
            <p className={`text-xs ${isLight ? "text-slate-500" : "text-slate-300/80"}`}>Helpful tools and guides to support your advocacy journey.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button 
            onClick={() => onNavigateTab("tools")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-semibold transition-all ${
              isLight 
                ? "border-slate-200 bg-slate-50 hover:bg-amber-500/10 hover:border-amber-500/30 text-slate-700 hover:text-amber-700" 
                : "border-slate-700/70 bg-slate-900/60 hover:bg-amber-400/10 hover:border-amber-400/40 text-slate-200 hover:text-amber-300"
            }`}
          >
            <FileText className={`w-3.5 h-3.5 ${isLight ? "text-amber-600" : "text-amber-400"}`} />
            IEP Tools
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          </button>

          <button 
            onClick={() => onNavigateTab("tools")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-semibold transition-all ${
              isLight 
                ? "border-slate-200 bg-slate-50 hover:bg-amber-500/10 hover:border-amber-500/30 text-slate-700 hover:text-amber-700" 
                : "border-slate-700/70 bg-slate-900/60 hover:bg-amber-400/10 hover:border-amber-400/40 text-slate-200 hover:text-amber-300"
            }`}
          >
            <User className={`w-3.5 h-3.5 ${isLight ? "text-amber-600" : "text-amber-400"}`} />
            Parent Guides
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          </button>

          <button 
            onClick={() => onNavigateTab("tasks")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-semibold transition-all ${
              isLight 
                ? "border-slate-200 bg-slate-50 hover:bg-amber-500/10 hover:border-amber-500/30 text-slate-700 hover:text-amber-700" 
                : "border-slate-700/70 bg-slate-900/60 hover:bg-amber-400/10 hover:border-amber-400/40 text-slate-200 hover:text-amber-300"
            }`}
          >
            <CheckSquare className={`w-3.5 h-3.5 ${isLight ? "text-amber-600" : "text-amber-400"}`} />
            Checklists
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          </button>

          <button 
            onClick={() => onNavigateTab("smart-docs")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-semibold transition-all ${
              isLight 
                ? "border-slate-200 bg-slate-50 hover:bg-amber-500/10 hover:border-amber-500/30 text-slate-700 hover:text-amber-700" 
                : "border-slate-700/70 bg-slate-900/60 hover:bg-amber-400/10 hover:border-amber-400/40 text-slate-200 hover:text-amber-300"
            }`}
          >
            <Layout className={`w-3.5 h-3.5 ${isLight ? "text-amber-600" : "text-amber-400"}`} />
            Templates
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          </button>

          <button 
            onClick={() => onNavigateTab("tools")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-semibold transition-all ${
              isLight 
                ? "border-slate-200 bg-slate-50 hover:bg-amber-500/10 hover:border-amber-500/30 text-slate-700 hover:text-amber-700" 
                : "border-slate-700/70 bg-slate-900/60 hover:bg-amber-400/10 hover:border-amber-400/40 text-slate-200 hover:text-amber-300"
            }`}
          >
            <Video className={`w-3.5 h-3.5 ${isLight ? "text-amber-600" : "text-amber-400"}`} />
            Video Library
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>
      </div>

      {/* ── ROW 5: FOOTER ────────────────────────────────────────────────── */}
      <footer className={`pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
        isLight ? "border-slate-200 text-slate-500" : "border-slate-800/80 text-slate-400"
      }`}>
        <p className={`font-serif italic text-center sm:text-left ${isLight ? "text-amber-750" : "text-amber-400/90"}`}>
          Guided by Knowledge. Driven by Advocacy. Focused on Your Child.
        </p>
        <div className="flex items-center gap-4">
          <a href="#" className={`transition-colors ${isLight ? "hover:text-slate-800" : "hover:text-slate-200"}`}>Privacy Policy</a>
          <span>•</span>
          <a href="#" className={`transition-colors ${isLight ? "hover:text-slate-800" : "hover:text-slate-200"}`}>Terms of Service</a>
          <span>•</span>
          <span className={`flex items-center gap-1 font-medium ${isLight ? "text-slate-600" : "text-slate-300"}`}>
            <Shield className={`w-3.5 h-3.5 ${isLight ? "text-amber-600" : "text-amber-400"}`} /> Security
          </span>
        </div>
      </footer>

    </div>
  );
}
