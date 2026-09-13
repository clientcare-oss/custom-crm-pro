import React, { useState, useEffect } from "react";
import { 
  User, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Folder, 
  Target, 
  CheckSquare, 
  ArrowRight, 
  ChevronRight, 
  Zap, 
  Mail, 
  Phone, 
  Info, 
  Sparkles, 
  Compass, 
  GraduationCap, 
  School, 
  Share2, 
  Upload, 
  Car, 
  BookOpen, 
  ShieldCheck,
  Building,
  RefreshCw,
  Plus
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { WaypointCompassRose } from "@/components/portal/PlanTransitionExperience";

interface PortalStudentDetailsTabProps {
  effectiveStudent?: any;
  studentDetail?: any;
  portalUser?: any;
  user?: any;
  portalStudents?: any[];
  selectedStudentId?: number | null;
  onSelectStudent?: (studentId: number) => void;
  appointments?: any[];
  files?: any[];
  tasks?: any[];
  onNavigateTab: (tabId: string) => void;
  onOpenScheduler?: () => void;
  onOpenUploadModal?: () => void;
  onOpenScanModal?: () => void;
}

export function PortalStudentDetailsTab({
  effectiveStudent,
  studentDetail,
  portalUser,
  user,
  portalStudents = [],
  selectedStudentId,
  onSelectStudent,
  appointments = [],
  files = [],
  tasks: initialTasks = [],
  onNavigateTab,
  onOpenScheduler,
  onOpenUploadModal,
  onOpenScanModal,
}: PortalStudentDetailsTabProps) {
  // ── DYNAMIC RECORD FILE DATA BINDINGS (Never hardcoded over record file) ──
  const studentFirstName = 
    effectiveStudent?.firstName || 
    studentDetail?.contact?.firstName || 
    "Student";

  const studentLastName = 
    effectiveStudent?.lastName ?? 
    studentDetail?.contact?.lastName ?? 
    "";

  const studentFullName = `${studentFirstName} ${studentLastName}`.trim();
  
  // Resolve parent info from parent contact on file, or default to Jennifer Jenkins if none in record
  const parentContact = studentDetail?.parentContact;
  const parentFirstName = 
    parentContact?.firstName || 
    effectiveStudent?.parentFirstName ||
    (effectiveStudent?.parentName ? effectiveStudent.parentName.split(" ")[0] : null) ||
    (portalUser?.role === "client" && portalUser?.name ? portalUser.name.split(" ")[0] : null) ||
    "Jennifer";

  const parentFullName = parentContact 
    ? `${parentContact.firstName} ${parentContact.lastName}`.trim() 
    : (effectiveStudent?.parentName || (portalUser?.role === "client" && portalUser?.name ? portalUser.name : "Jennifer Jenkins"));

  // Initials from actual record name
  const studentInitials = (
    (studentFirstName.charAt(0) || "S") + 
    (studentLastName.charAt(0) || "")
  ).toUpperCase() || "S";

  const studentGrade = 
    effectiveStudent?.gradeLevel || 
    studentDetail?.contact?.gradeLevel || 
    "9th Grade";

  const studentSchool = 
    effectiveStudent?.schoolName || 
    effectiveStudent?.company || 
    studentDetail?.contact?.schoolName || 
    studentDetail?.contact?.company || 
    "Bentonville High School";

  const transferSchool = 
    effectiveStudent?.previousSchool || 
    studentDetail?.contact?.previousSchool || 
    "The Lovett School";

  const planType = 
    effectiveStudent?.planType || 
    studentDetail?.contact?.planType || 
    "504 Plan";

  const caseType = 
    effectiveStudent?.jobTitle === "Student" 
      ? "Student Support" 
      : (effectiveStudent?.caseType || "Student Support");

  // Dynamic age calculation from dateOfBirth if available in record file
  const studentAge = (() => {
    const dobString = effectiveStudent?.dateOfBirth || studentDetail?.contact?.dateOfBirth;
    if (dobString) {
      const birthDate = new Date(dobString);
      if (!isNaN(birthDate.getTime())) {
        const today = new Date();
        let calculated = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          calculated--;
        }
        if (calculated > 0 && calculated < 100) return String(calculated);
      }
    }
    return effectiveStudent?.age || "14";
  })();

  // GTID / Case Identifier from record file
  const studentGtid = 
    effectiveStudent?.caseId || 
    studentDetail?.contact?.caseId || 
    (effectiveStudent?.id ? `•••• ${String(effectiveStudent.id).padStart(4, "0").slice(-4)}` : "•••• 4821");

  // Greeting based on time of day
  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  })();

  // ── Interactive Tasks with Live State ──
  const [tasks, setTasks] = useState(() => [
    { id: 1, title: "Upload latest evaluation", completed: false },
    { id: 2, title: "Complete Parent Concerns", completed: false },
    { id: 3, title: "Review IEP Blueprint", completed: false },
  ]);

  const toggleTask = (id: number) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const next = !t.completed;
        if (next) toast.success(`Task completed: "${t.title}"`);
        return { ...t, completed: next };
      }
      return t;
    }));
  };

  const openTasksCount = tasks.filter(t => !t.completed).length;

  // ── PARK IT Sticky Note State (Persisted per student record) ──
  const parkItStorageKey = `waypoint_park_it_note_${effectiveStudent?.id || 101}`;
  const [parkItText, setParkItText] = useState(() => {
    try {
      const saved = localStorage.getItem(parkItStorageKey);
      if (saved !== null) return saved;
    } catch (e) {
      console.error(e);
    }
    return "Ask about reading accommodations before the next meeting.";
  });

  // Re-load note whenever active student changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(parkItStorageKey);
      if (saved !== null) {
        setParkItText(saved);
      } else {
        setParkItText("Ask about reading accommodations before the next meeting.");
      }
    } catch (e) {
      console.error(e);
    }
  }, [parkItStorageKey]);

  const handleParkItSave = () => {
    try {
      localStorage.setItem(parkItStorageKey, parkItText);
      toast.success("Note Parked Successfully!", {
        description: `Your sticky note has been saved to ${studentFirstName}'s case workspace.`
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Top 3 documents from record files or clean fallbacks matching screenshot
  const displayDocuments = files && files.length > 0
    ? files.slice(0, 3).map((f: any, idx: number) => ({
        id: f.id || idx,
        title: f.title || f.filename || `Document_${idx + 1}.pdf`,
        date: f.createdAt ? new Date(f.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Jan 12, 2025"
      }))
    : [
        { id: 1, title: "Draft 504 Plan.pdf", date: "Jan 12, 2025" },
        { id: 2, title: "Evaluation Report.pdf", date: "Aug 28, 2024" },
        { id: 3, title: "Parent Concerns Form.pdf", date: "Aug 14, 2024" },
      ];

  const totalDocumentsCount = files && files.length > 0 ? files.length : 24;

  // Top 3 appointments from record or screenshot defaults
  const displayAppointments = appointments && appointments.length > 0
    ? appointments.slice(0, 3).map((a: any, idx: number) => ({
        id: a.id || idx,
        title: a.title || "Advocacy Session",
        date: a.scheduledAt ? new Date(a.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Sept. 14",
        time: a.scheduledAt ? new Date(a.scheduledAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "2:30 PM"
      }))
    : [
        { id: 1, title: "Records Review Call", date: "Sept. 14", time: "2:30 PM" },
        { id: 2, title: "504 Strategy Session", date: "Sept. 16", time: "4:00 PM" },
        { id: 3, title: "School Meeting", date: "Sept. 17", time: "10:00 AM" },
      ];

  const nextMeetingDisplay = displayAppointments[2] 
    ? `${displayAppointments[2].date} · ${displayAppointments[2].time}`
    : "Sept. 17 · 10:00 AM";

  return (
    <div className="max-w-7xl mx-auto space-y-5 text-white animate-in fade-in duration-300 pb-16">


      {/* ── SIBLING / MULTI-STUDENT SWITCHER (If parent has multiple students on record) ── */}
      {portalStudents.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs text-sky-300/70 font-serif italic shrink-0">
            Switch Student:
          </span>
          <div className="flex items-center gap-2">
            {portalStudents.map((st: any) => {
              const isActive = (selectedStudentId ? st.id === selectedStudentId : st.id === effectiveStudent?.id);
              return (
                <button
                  key={st.id}
                  onClick={() => onSelectStudent?.(st.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 ${
                    isActive
                      ? "bg-amber-400 text-slate-950 font-bold shadow-sm"
                      : "bg-[#061833] text-sky-200 border border-sky-700/40 hover:bg-[#0c2a5c]"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-slate-950" : "bg-sky-400"}`} />
                  <span>{st.firstName} {st.lastName || ""}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── HERO GREETING BANNER WITH TWILIGHT LIGHTHOUSE ── */}
      <div className="relative overflow-hidden rounded-2xl border border-sky-600/35 bg-gradient-to-r from-[#031124] via-[#041735] to-[#020b18] p-6 sm:p-7 shadow-2xl min-h-[140px] flex items-center justify-between">
        
        {/* Right Twilight Lighthouse Artwork (Pure Background Layer) */}
        <div 
          className="absolute right-0 top-0 bottom-0 w-full sm:w-[58%] lg:w-[50%] overflow-hidden pointer-events-none select-none z-0"
          style={{
            maskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.3) 25%, black 65%)",
            WebkitMaskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.3) 25%, black 65%)",
          }}
        >
          <img
            src="/plan-transition-lighthouse.jpg"
            alt="Waypoint Lighthouse in twilight"
            className="w-full h-full object-cover opacity-95"
            style={{ objectPosition: "82% 0%" }}
          />
          {/* Subtle bottom grounding gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#020b18]/90 via-transparent to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#031124]/30 via-transparent to-transparent pointer-events-none" />
        </div>

        {/* Center-Right Cursive Accent: Different Learners. Brighter Futures. */}
        <div className="hidden sm:block absolute left-[45%] md:left-[48%] lg:left-[51%] top-5 lg:top-6 z-20 pointer-events-none select-none -rotate-2">
          <p className="font-serif italic font-normal text-sky-200 text-sm sm:text-base lg:text-[17px] leading-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
            Different<br />
            Learners.<br />
            <span className="text-sky-100 font-medium">Brighter Futures.</span>
          </p>
        </div>

        {/* Far-Right Tagline: MORE THAN ADVOCACY. */}
        <div className="hidden md:block absolute right-6 sm:right-7 top-5 sm:top-6 z-20 text-right pointer-events-none select-none">
          <span className="text-[8.5px] font-mono tracking-widest text-sky-200/90 uppercase block leading-snug drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
            MORE THAN ADVOCACY.<br />A BRIGHTER PATH FOR WHAT'S AHEAD.
          </span>
        </div>

        {/* Left Greeting Content */}
        <div className="relative z-20 space-y-1 max-w-md lg:max-w-lg">
          <h1 className="text-2xl sm:text-3xl lg:text-[34px] font-serif font-normal text-white tracking-tight leading-snug">
            {greeting}, <span className="text-amber-300 font-semibold">{parentFirstName}</span>.
          </h1>
          <p className="text-sm sm:text-base font-serif text-sky-100/90 leading-relaxed">
            Here's where things stand with <span className="text-white font-medium">{studentFullName}</span>.
          </p>
          <span className="inline-block text-xs font-serif italic text-sky-300/80 pt-0.5">
            Parent Portal
          </span>
        </div>
      </div>

      {/* ── MASTER STUDENT PROFILE CARD (Dual Split Panel) ── */}
      <div className="rounded-2xl border border-sky-600/35 bg-gradient-to-br from-[#061833] via-[#041126] to-[#020b18] p-5 sm:p-6 shadow-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Left Panel (6 Cols): Avatar, Identity & Support Badge */}
          <div className="lg:col-span-6 flex flex-col sm:flex-row items-center sm:items-start gap-5 lg:pr-6 lg:border-r border-sky-900/50">
            {/* Avatar & Student Name */}
            <div className="flex items-center gap-4 text-center sm:text-left">
              {/* Gold Ring Circular Avatar */}
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full border-2 border-amber-400 p-1 shrink-0 shadow-lg shadow-amber-400/10">
                <div className="w-full h-full rounded-full bg-gradient-to-b from-[#0a2347] to-[#030d1d] flex items-center justify-center text-white font-serif font-bold text-2xl tracking-wider shadow-inner">
                  {studentInitials}
                </div>
              </div>

              {/* Name & Badge */}
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-white tracking-tight leading-tight">
                  {studentFullName}
                </h2>
                <p className="text-xs sm:text-sm text-sky-200/80 font-medium">
                  {parentFullName}
                </p>
                <div className="pt-0.5">
                  <Badge className="bg-amber-400 text-slate-950 font-bold font-mono text-[10.5px] px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                    {planType}
                  </Badge>
                </div>
                <p className="text-xs text-slate-300 font-normal pt-0.5">
                  {studentGrade} · {studentSchool}
                </p>
                <p className="text-[11px] font-serif italic text-sky-300/80">
                  Student page is already connected to your case.
                </p>
              </div>
            </div>
          </div>

          {/* Right Panel (6 Cols): Educational Details Grid & Inspiration Quote */}
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
            {/* Left side: 2-column info grid (7 cols) */}
            <div className="sm:col-span-7 grid grid-cols-1 gap-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-sky-900/40">
                <span className="text-sky-300/70 flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-sky-400" /> Age:
                </span>
                <span className="font-semibold text-white">{studentAge}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-sky-900/40">
                <span className="text-sky-300/70 flex items-center gap-2">
                  <GraduationCap className="w-3.5 h-3.5 text-sky-400" /> Grade:
                </span>
                <span className="font-semibold text-white">{studentGrade.replace(/[^0-9]/g, "") || studentGrade}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-sky-900/40">
                <span className="text-sky-300/70 flex items-center gap-2">
                  <School className="w-3.5 h-3.5 text-sky-400" /> School:
                </span>
                <span className="font-semibold text-white truncate max-w-[140px] text-right" title={studentSchool}>
                  {studentSchool}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-sky-900/40">
                <span className="text-sky-300/70 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 text-sky-400" /> Transfer School:
                </span>
                <span className="font-semibold text-white truncate max-w-[140px] text-right" title={transferSchool}>
                  {transferSchool}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-sky-900/40">
                <span className="text-sky-300/70 flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-400" /> GTID:
                </span>
                <span className="font-mono font-semibold text-white">{studentGtid}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sky-300/70 flex items-center gap-2">
                  <Folder className="w-3.5 h-3.5 text-sky-400" /> Case Type:
                </span>
                <span className="font-semibold text-white">{caseType}</span>
              </div>
            </div>

            {/* Right side: Inspiration Quote (5 cols) */}
            <div className="sm:col-span-5 sm:border-l border-sky-900/50 sm:pl-5 flex flex-col justify-center text-center sm:text-left space-y-2">
              <p className="font-serif italic text-amber-200 text-sm sm:text-base leading-snug">
                “Advocacy turns potential into possibility.”
              </p>
              <div className="w-12 h-[2px] bg-amber-400 mx-auto sm:mx-0 shadow-sm" />
            </div>
          </div>

        </div>
      </div>

      {/* ── MIDDLE 4-COLUMN ACTION & STATUS CARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        
        {/* CARD 1: CURRENT FOCUS */}
        <div className="rounded-2xl border border-sky-600/35 bg-gradient-to-b from-[#061938] via-[#041228] to-[#020b18] p-4 sm:p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-white">
                <Target className="w-4 h-4 text-sky-400" />
                <h3 className="font-serif font-bold text-sm text-white">Current Focus</h3>
              </div>
              <button
                onClick={() => onNavigateTab("tasks")}
                className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-950 text-sky-300 border border-sky-700/50 hover:bg-sky-900/60 cursor-pointer transition-colors"
              >
                Tasks →
              </button>
            </div>

            {/* Focus Headline & Body */}
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-white leading-snug">
                Preparing for {studentFirstName}'s initial {planType} meeting
              </h4>
              <p className="text-xs text-slate-300/80 mt-1 leading-relaxed">
                Waypoint is reviewing records and identifying needed supports.
              </p>
            </div>
          </div>

          {/* Footer Metadata */}
          <div className="pt-3 border-t border-sky-900/40 space-y-1 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>Next meeting: <strong className="text-white font-medium">{nextMeetingDisplay}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-400/20 text-emerald-400 flex items-center justify-center text-[9px] font-bold shrink-0">●</span>
              <span>Current stage: <strong className="text-white font-medium">Records Review</strong></span>
            </div>
          </div>
        </div>

        {/* CARD 2: YOUR TASKS */}
        <div className="rounded-2xl border border-sky-600/35 bg-gradient-to-b from-[#061938] via-[#041228] to-[#020b18] p-4 sm:p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-amber-400" />
                <h3 className="font-serif font-bold text-sm text-white">Your Tasks</h3>
              </div>
              <span className="font-mono text-[10.5px] text-slate-400">
                {openTasksCount} open tasks
              </span>
            </div>

            {/* Task Checklist Items */}
            <div className="space-y-2 pt-0.5">
              {tasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className="flex items-center gap-2.5 text-xs text-white/90 cursor-pointer group hover:text-white select-none transition-colors"
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                    task.completed 
                      ? "bg-amber-400 border-amber-400 text-slate-950" 
                      : "border-sky-500/50 bg-[#020a17] group-hover:border-amber-400"
                  }`}>
                    {task.completed && <CheckCircle2 className="w-3 h-3 text-slate-950 stroke-[3]" />}
                  </div>
                  <span className={task.completed ? "line-through text-slate-500" : "text-slate-200"}>
                    {task.title}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Button: View All Tasks */}
          <div className="pt-2">
            <button
              onClick={() => onNavigateTab("tasks")}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-400/20 cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-1.5"
            >
              <span>View All Tasks →</span>
            </button>
          </div>
        </div>

        {/* CARD 3: UPCOMING */}
        <div className="rounded-2xl border border-sky-600/35 bg-gradient-to-b from-[#061938] via-[#041228] to-[#020b18] p-4 sm:p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-white">
                <Calendar className="w-4 h-4 text-sky-400" />
                <h3 className="font-serif font-bold text-sm text-white">Upcoming</h3>
              </div>
              <button
                onClick={() => onNavigateTab("appointments")}
                className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-sky-950 text-sky-300 border border-sky-700/50 hover:bg-sky-900/60 cursor-pointer transition-colors"
              >
                View All
              </button>
            </div>

            {/* Upcoming Appointment Rows */}
            <div className="space-y-2 text-xs">
              {displayAppointments.map(appt => (
                <div 
                  key={appt.id}
                  onClick={() => onNavigateTab("appointments")}
                  className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors group"
                >
                  <span className="font-medium text-slate-200 group-hover:text-amber-300 transition-colors truncate pr-2">
                    {appt.title}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
                    <span>{appt.date} · {appt.time}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Button: View Appointments */}
          <div className="pt-2">
            <button
              onClick={() => onNavigateTab("appointments")}
              className="w-full py-2.5 rounded-xl bg-[#071d40] hover:bg-[#0c2a5c] text-white border border-sky-500/40 text-xs font-semibold shadow-md cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-1.5"
            >
              <span>View Appointments →</span>
            </button>
          </div>
        </div>

        {/* CARD 4: CURRENT PLAN */}
        <div className="rounded-2xl border border-sky-600/35 bg-gradient-to-b from-[#061938] via-[#041228] to-[#020b18] p-4 sm:p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              <h3 className="font-serif font-bold text-sm text-white">Current Plan</h3>
            </div>

            {/* Plan Info */}
            <div className="space-y-1">
              <span className="text-xs font-bold text-white block">
                Current Support Type: {planType}
              </span>
              <p className="text-xs text-slate-300/80 leading-relaxed">
                Reviewing accommodations and classroom supports.
              </p>
            </div>
          </div>

          {/* Action Buttons: View Current Plan & IEP Blueprint */}
          <div className="space-y-2 pt-2">
            <button
              onClick={() => onNavigateTab("cases")}
              className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-400/20 cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-1.5"
            >
              <span>View Current Plan →</span>
            </button>
            <button
              onClick={() => onNavigateTab("tools")}
              className="w-full py-2 rounded-xl bg-[#06162d] hover:bg-[#0a2040] text-sky-200 border border-sky-600/40 text-xs font-semibold shadow-md cursor-pointer transition-all duration-200 flex items-center justify-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5 text-sky-400" />
              <span>IEP Blueprint</span>
            </button>
          </div>
        </div>

      </div>

      {/* ── LOWER 3-COLUMN MODULES: CASE COMPASS + DOCUMENT VAULT + PARK IT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        
        {/* COLUMN 1 (5 COLS): CASE COMPASS */}
        <div className="lg:col-span-5 rounded-2xl border border-sky-600/35 bg-gradient-to-br from-[#061833] via-[#041126] to-[#020b18] p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-sky-900/40">
              <div className="flex items-center gap-2">
                <WaypointCompassRose className="w-5 h-5 text-amber-400" />
                <h3 className="font-serif font-bold text-sm text-white">Case Compass</h3>
              </div>
              <span className="font-serif italic text-xs text-sky-200/80">
                Real Insight. Forward Motion.
              </span>
            </div>

            {/* 2-Column Split: What we see vs What we're working toward */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3.5 text-xs">
              {/* Left: What we see */}
              <div className="space-y-2">
                <span className="font-bold text-amber-300 block font-serif tracking-wide">
                  What we see
                </span>
                <ul className="space-y-1.5 text-slate-300">
                  <li className="flex items-start gap-1.5">
                    <span className="text-amber-400 shrink-0 leading-tight">•</span>
                    <span>Reading needs need clearer support</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-amber-400 shrink-0 leading-tight">•</span>
                    <span>Attention concerns need better documentation</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-amber-400 shrink-0 leading-tight">•</span>
                    <span>Current school supports may need revision</span>
                  </li>
                </ul>
              </div>

              {/* Right: What we're working toward */}
              <div className="space-y-2">
                <span className="font-bold text-amber-300 block font-serif tracking-wide">
                  What we're working toward
                </span>
                <ul className="space-y-1.5 text-slate-300">
                  <li className="flex items-start gap-1.5">
                    <span className="text-amber-400 shrink-0 leading-tight">•</span>
                    <span>Stronger accommodations</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-amber-400 shrink-0 leading-tight">•</span>
                    <span>Better baseline data</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-amber-400 shrink-0 leading-tight">•</span>
                    <span>Clear next-step planning</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => onNavigateTab("compass")}
              className="text-xs font-semibold text-sky-300 hover:text-amber-300 transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Explore Case Compass Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* COLUMN 2 (4 COLS): DOCUMENT VAULT */}
        <div className="lg:col-span-4 rounded-2xl border border-sky-600/35 bg-gradient-to-br from-[#061833] via-[#041126] to-[#020b18] p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-sky-900/40">
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4 text-sky-400" />
                <h3 className="font-serif font-bold text-sm text-white">Document Vault</h3>
              </div>
              <span className="font-mono text-xs text-slate-400">
                {totalDocumentsCount} documents
              </span>
            </div>

            {/* Document Files List */}
            <div className="space-y-2 pt-3 text-xs">
              {displayDocuments.map(doc => (
                <div 
                  key={doc.id}
                  onClick={() => onNavigateTab("smart-docs")}
                  className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="font-medium text-slate-200 group-hover:text-amber-300 truncate">
                      {doc.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
                    <span>{doc.date}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dual Action Buttons: Open Document Vault & Scan / Upload */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={() => onNavigateTab("smart-docs")}
              className="py-2 px-2.5 rounded-xl bg-[#071d40] hover:bg-[#0c2a5c] text-sky-200 border border-sky-500/40 text-xs font-semibold shadow-sm cursor-pointer transition-all text-center truncate"
            >
              Open Document Vault
            </button>
            <button
              onClick={() => {
                if (onOpenUploadModal) onOpenUploadModal();
                else onNavigateTab("smart-docs");
              }}
              className="py-2 px-2.5 rounded-xl bg-[#071d40] hover:bg-[#0c2a5c] text-white border border-sky-500/40 text-xs font-semibold shadow-sm cursor-pointer transition-all flex items-center justify-center gap-1 truncate"
            >
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              <span>Scan / Upload Document</span>
            </button>
          </div>
        </div>

        {/* COLUMN 3 (3 COLS): PARK IT */}
        <div className="lg:col-span-3 rounded-2xl border border-sky-600/35 bg-gradient-to-br from-[#061833] via-[#041126] to-[#020b18] p-5 shadow-xl flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            {/* Header with Car Icon and Info */}
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-sky-900/40">
              <div className="flex items-center gap-2 text-white">
                <Car className="w-4 h-4 text-sky-400" />
                <h3 className="font-serif font-bold text-sm text-white tracking-wider uppercase">
                  Park It
                </h3>
              </div>
              <span title="Shared sticky note for your case">
                <Info className="w-4 h-4 text-slate-400 hover:text-white cursor-pointer" />
              </span>
            </div>

            {/* Helper Note */}
            <p className="text-[11px] text-slate-300/80 leading-snug">
              Think of this as a shared sticky note for your case, not a message to your advocate.
            </p>

            {/* Interactive Note Box */}
            <div className="relative pt-1">
              <textarea
                value={parkItText}
                onChange={(e) => setParkItText(e.target.value.slice(0, 500))}
                rows={3}
                placeholder="Jot down a quick note or topic..."
                className="w-full rounded-xl bg-[#030d1d] border border-sky-500/30 p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 resize-none leading-relaxed shadow-inner"
              />
              <div className="text-[10px] font-mono text-slate-400 text-right pr-1 pt-0.5">
                {parkItText.length}/500
              </div>
            </div>
          </div>

          {/* Action Button: Park It */}
          <div>
            <button
              onClick={handleParkItSave}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-400/20 cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
            >
              Park It
            </button>
          </div>
        </div>

      </div>

      {/* ── BOTTOM QUICK ACTIONS DOCK ── */}
      <div className="rounded-2xl border border-sky-700/40 bg-gradient-to-r from-[#031124] via-[#051733] to-[#031124] p-3 sm:p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left Label */}
        <div className="flex items-center gap-2 text-white shrink-0 self-start md:self-auto pl-1">
          <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
          <span className="font-serif font-bold text-sm tracking-wide">Quick Actions</span>
        </div>

        {/* Buttons Row */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-start md:justify-end text-xs">
          <button
            onClick={() => {
              if (onOpenScheduler) onOpenScheduler();
              else onNavigateTab("appointments");
            }}
            className="px-3 py-2 rounded-xl bg-[#071d40] hover:bg-[#0c2a5c] text-white border border-sky-500/40 font-semibold cursor-pointer transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Calendar className="w-3.5 h-3.5 text-sky-400" />
            <span>Request Meeting</span>
          </button>

          <button
            onClick={() => onNavigateTab("cases")}
            className="px-3 py-2 rounded-xl bg-[#071d40] hover:bg-[#0c2a5c] text-white border border-sky-500/40 font-semibold cursor-pointer transition-all flex items-center gap-1.5 shadow-sm"
          >
            <FileText className="w-3.5 h-3.5 text-sky-400" />
            <span>Parent Concerns</span>
          </button>

          <button
            onClick={() => onNavigateTab("smart-docs")}
            className="px-3 py-2 rounded-xl bg-[#071d40] hover:bg-[#0c2a5c] text-white border border-sky-500/40 font-semibold cursor-pointer transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Folder className="w-3.5 h-3.5 text-sky-400" />
            <span>Records Request</span>
          </button>

          <button
            onClick={() => onNavigateTab("communication")}
            className="px-3 py-2 rounded-xl bg-[#071d40] hover:bg-[#0c2a5c] text-white border border-sky-500/40 font-semibold cursor-pointer transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Mail className="w-3.5 h-3.5 text-sky-400" />
            <span>Contact Waypoint</span>
          </button>

          <button
            onClick={() => onNavigateTab("tasks")}
            className="px-3 py-2 rounded-xl bg-[#071d40] hover:bg-[#0c2a5c] text-white border border-sky-500/40 font-semibold cursor-pointer transition-all flex items-center gap-1.5 shadow-sm"
          >
            <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
            <span>Open Tasks</span>
          </button>

          <button
            onClick={() => onNavigateTab("smart-docs")}
            className="px-3 py-2 rounded-xl bg-[#071d40] hover:bg-[#0c2a5c] text-white border border-sky-500/40 font-semibold cursor-pointer transition-all flex items-center gap-1.5 shadow-sm"
          >
            <FileText className="w-3.5 h-3.5 text-sky-400" />
            <span>Open Document Vault</span>
          </button>
        </div>
      </div>

      {/* ── BRANDED PORTAL FOOTER ── */}
      <div className="pt-3 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 border-t border-white/5 gap-2">
        <div className="flex items-center gap-2">
          <span className="font-serif font-bold text-slate-400 text-xs">Waypoint Advocates</span>
          <span className="text-slate-600">|</span>
          <span className="font-serif italic text-slate-400 text-xs">
            Different Learners. Brighter Futures. ®
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-500 font-mono text-[9.5px] uppercase tracking-wider">
          <WaypointCompassRose className="w-3.5 h-3.5 text-amber-400/80" />
          <span>Parents Today. Brighter Tomorrows.</span>
        </div>
      </div>

    </div>
  );
}

export default PortalStudentDetailsTab;
