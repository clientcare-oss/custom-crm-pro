import React from "react";
import {
  Compass, MessageSquare, Calendar, FileText, Upload, CheckSquare,
  Folder, ArrowRight, Shield, Clock, Users, BarChart2, Zap, Layout,
  Video, User, CheckCircle2, ChevronRight, MapPin, Sparkles, AlertCircle
} from "lucide-react";

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
}: ClientPortalDashboardProps) {

  const nextAppt = studentAppointments.find((a: any) => a.status !== "Cancelled") || {
    title: "Annual IEP Meeting",
    dateStr: "May 22, 2026 • 9:00 AM",
    location: "Lincoln Elementary",
  };

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

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto text-slate-100 font-sans">
      
      {/* ── ROW 1: AT A GLANCE ────────────────────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-[11px] font-bold tracking-[0.2em] text-amber-400/90 uppercase">AT A GLANCE</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Card 1: Upcoming Meeting */}
          <div className="relative overflow-hidden bg-[#0A1628]/90 border border-slate-700/50 hover:border-amber-400/30 rounded-xl p-5 flex items-center gap-4 shadow-xl backdrop-blur-sm transition-all group">
            <div className="w-14 h-14 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <GoldCompassRose className="w-10 h-10" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-amber-300/90 tracking-wide uppercase">Upcoming Meeting</p>
                {nextAppt.videoLink || nextAppt.clientMeetingLink ? (
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Link Sent to Advocate
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Send Video Link to Advocate
                  </span>
                )}
              </div>
              <p className="text-sm font-bold text-white mt-0.5">
                {nextAppt.startTime
                  ? `${new Date(nextAppt.startTime).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} • ${new Date(nextAppt.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                  : nextAppt.dateStr || "May 22, 2026 • 9:00 AM"}
              </p>
              <p className="text-xs text-slate-300/80 mt-1 truncate font-medium">
                {nextAppt.title || "Annual IEP Meeting"}
              </p>
            </div>
          </div>

          {/* Card 2: Unread Messages */}
          <div 
            onClick={() => onNavigateTab("communication")}
            className="relative overflow-hidden bg-[#0A1628]/90 border border-slate-700/50 hover:border-amber-400/40 rounded-xl p-5 flex items-center justify-between gap-4 shadow-xl backdrop-blur-sm transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-400/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <MessageSquare className="w-5 h-5 text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white">Unread Messages</p>
                <p className="text-xs text-slate-300/80 mt-0.5">
                  {unreadCount > 0 ? `${unreadCount} new message from your advocate` : messages.length > 0 ? "All messages read" : "1 new message from your advocate"}
                </p>
              </div>
            </div>
            <button className="flex items-center gap-1 text-xs font-semibold text-amber-400 group-hover:text-amber-300 transition-colors shrink-0">
              View Messages <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>

      {/* ── ROW 2: ADVOCACY JOURNEY & WHAT'S NEW ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left (8 Cols): YOUR ADVOCACY JOURNEY */}
        <div className="lg:col-span-8 bg-[#0A1628]/90 border border-slate-700/50 rounded-xl p-6 shadow-xl backdrop-blur-sm flex flex-col justify-between space-y-6">
          
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <p className="text-[11px] font-bold tracking-[0.2em] text-amber-400/90 uppercase">YOUR ADVOCACY JOURNEY</p>
            <button 
              onClick={() => onNavigateTab("cases")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-400/30 bg-amber-400/5 hover:bg-amber-400/15 text-amber-300 text-xs font-semibold transition-all"
            >
              <Compass className="w-3.5 h-3.5" /> View Journey Map
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            
            {/* Large Compass Graphic */}
            <div className="md:col-span-4 flex items-center justify-center p-2">
              <GoldCompassRose className="w-36 h-36 drop-shadow-[0_0_15px_rgba(212,175,55,0.25)]" />
            </div>

            {/* Current Focus & Step Bar */}
            <div className="md:col-span-8 space-y-4">
              <div>
                <p className="text-[10px] font-bold tracking-[0.18em] text-amber-400 uppercase">CURRENT FOCUS</p>
                <h3 className="text-xl font-serif font-bold text-white mt-1">
                  {currentFocus}
                </h3>
              </div>

              {/* 5-Step Pipeline */}
              <div className="pt-2">
                <div className="flex items-center justify-between relative">
                  {/* Connecting Line */}
                  <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-0.5 bg-slate-700/80 z-0" />
                  
                  {journeySteps.map((step, idx) => {
                    const isDone = step.status === "completed";
                    const isActive = step.status === "active";
                    const IconComp = step.icon;
                    return (
                      <div key={idx} className="relative z-10 flex flex-col items-center group cursor-pointer">
                        <div 
                          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                            isDone 
                              ? "bg-amber-500 text-slate-950 border border-amber-400 shadow-md shadow-amber-500/20"
                              : isActive
                              ? "bg-amber-400 text-slate-950 border-2 border-amber-300 shadow-lg shadow-amber-400/40 ring-4 ring-amber-400/20 scale-110"
                              : "bg-[#0d1e36] text-slate-400 border border-slate-700"
                          }`}
                        >
                          <IconComp className="w-4 h-4" />
                        </div>
                        <span className={`text-[10px] font-medium mt-2 text-center max-w-[65px] leading-tight ${
                          isActive ? "text-amber-300 font-bold" : isDone ? "text-slate-200" : "text-slate-500"
                        }`}>
                          {step.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* Right (4 Cols): WHAT'S NEW */}
        <div className="lg:col-span-4 bg-[#0A1628]/90 border border-slate-700/50 rounded-xl p-6 shadow-xl backdrop-blur-sm flex flex-col justify-between space-y-4">
          
          <div className="border-b border-slate-800/80 pb-3">
            <p className="text-[11px] font-bold tracking-[0.2em] text-amber-400/90 uppercase">WHAT'S NEW</p>
          </div>

          <div className="space-y-3 flex-1">
            
            {/* Update 1: File */}
            <div 
              onClick={() => onNavigateTab("files")}
              className="flex gap-3 items-start p-2.5 rounded-lg hover:bg-slate-800/40 transition-colors cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-400/30 text-blue-400 shrink-0 mt-0.5">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs font-semibold text-slate-200 truncate">Document uploaded by school</p>
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title="Unread update" />
                </div>
                <p className="text-xs text-amber-300/90 font-medium truncate">
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
              className="flex gap-3 items-start p-2.5 rounded-lg hover:bg-slate-800/40 transition-colors cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-400/30 text-amber-400 shrink-0 mt-0.5">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-200 truncate">Meeting scheduled</p>
                <p className="text-xs text-slate-300 font-medium truncate">{nextAppt.title || "Annual IEP Meeting"}</p>
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
              className="flex gap-3 items-start p-2.5 rounded-lg hover:bg-slate-800/40 transition-colors cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-400/30 text-emerald-400 shrink-0 mt-0.5">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-200 truncate">New message from advocate</p>
                <p className="text-xs text-slate-300/80 truncate">
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
            className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 pt-2 transition-colors border-t border-slate-800/80"
          >
            View All Updates <ArrowRight className="w-3.5 h-3.5" />
          </button>

        </div>

      </div>

      {/* ── ROW 3: THREE COLUMNS (UPCOMING, LATEST ACTIVITY, QUICK ACTIONS) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Col 1: UPCOMING */}
        <div className="bg-[#0A1628]/90 border border-slate-700/50 rounded-xl p-5 shadow-xl backdrop-blur-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
            <Calendar className="w-4 h-4 text-amber-400" />
            <p className="text-[11px] font-bold tracking-[0.18em] text-amber-400 uppercase">UPCOMING</p>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">NEXT MEETING</p>
              <p className="text-xs text-slate-300 font-medium mt-1">
                {nextAppt.startTime
                  ? `${new Date(nextAppt.startTime).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} • ${new Date(nextAppt.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                  : "May 22, 2026 • 9:00 AM"}
              </p>
              <button 
                onClick={onOpenScheduler}
                className="mt-1 flex items-center justify-between w-full text-sm font-semibold text-white hover:text-amber-300 transition-colors group"
              >
                <span className="truncate">{nextAppt.title || "Annual IEP Meeting"}</span>
                <ChevronRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform shrink-0" />
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800/60">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">UPCOMING DEADLINES</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-xs text-slate-200 font-medium truncate">
                  {pendingTask?.title || "Upload Educational Evaluation"}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 shrink-0">
                  {pendingTask?.dueDate ? `Due ${new Date(pendingTask.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : "Due in 5 days"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Col 2: LATEST ACTIVITY */}
        <div className="bg-[#0A1628]/90 border border-slate-700/50 rounded-xl p-5 shadow-xl backdrop-blur-sm space-y-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <p className="text-[11px] font-bold tracking-[0.18em] text-amber-400 uppercase">LATEST ACTIVITY</p>
          </div>

          <div className="space-y-3 flex-1">
            <div className="flex items-start gap-2.5 text-xs">
              <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-slate-200 font-medium truncate">Document uploaded</p>
                <p className="text-[10px] text-slate-400 truncate">
                  {latestFile?.fileName || "Evaluation Report.pdf"} • {latestFile?.createdAt ? new Date(latestFile.createdAt).toLocaleDateString() : "Yesterday"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 text-xs">
              <MessageSquare className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-slate-200 font-medium truncate">New message from advocate</p>
                <p className="text-[10px] text-slate-400 truncate">
                  {recentMessage?.content ? recentMessage.content.slice(0, 30) + "..." : "Meeting preparation update • 2 hours ago"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-slate-200 font-medium truncate">Task completed</p>
                <p className="text-[10px] text-slate-400 truncate">
                  {completedTask?.title || "Review Parent Concern Form"} • May 6, 2026
                </p>
              </div>
            </div>
          </div>

          <button 
            onClick={() => onNavigateTab("tasks")}
            className="flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300 pt-2 transition-colors border-t border-slate-800/60"
          >
            View All Activity <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Col 3: QUICK ACTIONS */}
        <div className="bg-[#0A1628]/90 border border-slate-700/50 rounded-xl p-5 shadow-xl backdrop-blur-sm space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
            <Zap className="w-4 h-4 text-amber-400" />
            <p className="text-[11px] font-bold tracking-[0.18em] text-amber-400 uppercase">QUICK ACTIONS</p>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            
            <button 
              onClick={onUploadClick}
              className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-700/60 bg-slate-900/60 hover:bg-amber-400/10 hover:border-amber-400/40 text-center transition-all group"
            >
              <Upload className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform mb-1.5" />
              <span className="text-[10px] font-semibold text-slate-200 group-hover:text-amber-300 leading-tight">Upload Document</span>
            </button>

            <button 
              onClick={() => onNavigateTab("communication")}
              className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-700/60 bg-slate-900/60 hover:bg-amber-400/10 hover:border-amber-400/40 text-center transition-all group"
            >
              <MessageSquare className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform mb-1.5" />
              <span className="text-[10px] font-semibold text-slate-200 group-hover:text-amber-300 leading-tight">Send Message</span>
            </button>

            <button 
              onClick={onOpenScheduler}
              className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-700/60 bg-slate-900/60 hover:bg-amber-400/10 hover:border-amber-400/40 text-center transition-all group"
            >
              <Calendar className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform mb-1.5" />
              <span className="text-[10px] font-semibold text-slate-200 group-hover:text-amber-300 leading-tight">Schedule Meeting</span>
            </button>

            <button 
              onClick={() => onNavigateTab("compass")}
              className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-700/60 bg-slate-900/60 hover:bg-amber-400/10 hover:border-amber-400/40 text-center transition-all group"
            >
              <Compass className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform mb-1.5" />
              <span className="text-[10px] font-semibold text-slate-200 group-hover:text-amber-300 leading-tight">View Recs</span>
            </button>

            <button 
              onClick={() => onNavigateTab("tasks")}
              className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-700/60 bg-slate-900/60 hover:bg-amber-400/10 hover:border-amber-400/40 text-center transition-all group"
            >
              <CheckSquare className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform mb-1.5" />
              <span className="text-[10px] font-semibold text-slate-200 group-hover:text-amber-300 leading-tight">Add Task</span>
            </button>

            <button 
              onClick={() => onNavigateTab("cases")}
              className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-700/60 bg-slate-900/60 hover:bg-amber-400/10 hover:border-amber-400/40 text-center transition-all group"
            >
              <Folder className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform mb-1.5" />
              <span className="text-[10px] font-semibold text-slate-200 group-hover:text-amber-300 leading-tight">Case Details</span>
            </button>

          </div>
        </div>

      </div>

      {/* ── ROW 4: RESOURCE CENTER ────────────────────────────────────────── */}
      <div className="bg-[#0A1628]/90 border border-slate-700/50 rounded-xl p-5 shadow-xl backdrop-blur-sm space-y-3">
        <div className="flex items-center gap-3">
          <GoldCompassRose className="w-6 h-6 shrink-0" />
          <div>
            <p className="text-[11px] font-bold tracking-[0.18em] text-amber-400 uppercase">RESOURCE CENTER</p>
            <p className="text-xs text-slate-300/80">Helpful tools and guides to support your advocacy journey.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button 
            onClick={() => onNavigateTab("tools")}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-700/70 bg-slate-900/60 hover:bg-amber-400/10 hover:border-amber-400/40 text-xs font-semibold text-slate-200 hover:text-amber-300 transition-all"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            IEP Tools
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          </button>

          <button 
            onClick={() => onNavigateTab("tools")}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-700/70 bg-slate-900/60 hover:bg-amber-400/10 hover:border-amber-400/40 text-xs font-semibold text-slate-200 hover:text-amber-300 transition-all"
          >
            <User className="w-3.5 h-3.5 text-amber-400" />
            Parent Guides
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          </button>

          <button 
            onClick={() => onNavigateTab("tasks")}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-700/70 bg-slate-900/60 hover:bg-amber-400/10 hover:border-amber-400/40 text-xs font-semibold text-slate-200 hover:text-amber-300 transition-all"
          >
            <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
            Checklists
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          </button>

          <button 
            onClick={() => onNavigateTab("smart-docs")}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-700/70 bg-slate-900/60 hover:bg-amber-400/10 hover:border-amber-400/40 text-xs font-semibold text-slate-200 hover:text-amber-300 transition-all"
          >
            <Layout className="w-3.5 h-3.5 text-amber-400" />
            Templates
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          </button>

          <button 
            onClick={() => onNavigateTab("tools")}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-700/70 bg-slate-900/60 hover:bg-amber-400/10 hover:border-amber-400/40 text-xs font-semibold text-slate-200 hover:text-amber-300 transition-all"
          >
            <Video className="w-3.5 h-3.5 text-amber-400" />
            Video Library
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>
      </div>

      {/* ── ROW 5: FOOTER ────────────────────────────────────────────────── */}
      <footer className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <p className="font-serif italic text-amber-400/90 text-center sm:text-left">
          Guided by Knowledge. Driven by Advocacy. Focused on Your Child.
        </p>
        <div className="flex items-center gap-4 text-slate-400">
          <a href="#" className="hover:text-slate-200 transition-colors">Privacy Policy</a>
          <span>•</span>
          <a href="#" className="hover:text-slate-200 transition-colors">Terms of Service</a>
          <span>•</span>
          <span className="flex items-center gap-1 text-slate-300 font-medium">
            <Shield className="w-3.5 h-3.5 text-amber-400" /> Security
          </span>
        </div>
      </footer>

    </div>
  );
}
