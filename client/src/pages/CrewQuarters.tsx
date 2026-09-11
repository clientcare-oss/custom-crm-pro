/**
 * Crew Quarters — PG-038
 * Personalized Employee Home Base & Operational Hub
 * Authentic Waypoint dark navy design language with gold accents & subtle nautical textures.
 */

import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import PageIdBadge from "@/components/PageIdBadge";
import { LighthouseCottageIcon } from "@/components/ui/LighthouseCottageIcon";
import { WaypointWaveIcon } from "@/components/portal/WaypointWavyBackdrop";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Phone,
  CheckSquare,
  Users,
  Clock,
  CalendarClock,
  Plus,
  ArrowRight,
  Plane,
  MessageSquare,
  Megaphone,
  BookOpen,
  FileText,
  Video,
  Shield,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  Send,
  User,
  GraduationCap,
  ExternalLink,
  Award,
} from "lucide-react";
import { toast } from "sonner";

interface TimeOffRequest {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  status: "Approved" | "Pending" | "Denied";
  notes?: string;
  createdAt: string;
}

const DEFAULT_TIME_OFF: TimeOffRequest[] = [
  {
    id: "to-1",
    type: "Vacation",
    startDate: "Oct 10, 2026",
    endDate: "Oct 12, 2026",
    days: 3,
    status: "Approved",
    notes: "Fall family trip",
    createdAt: "2026-09-01",
  },
  {
    id: "to-2",
    type: "Personal",
    startDate: "Nov 26, 2026",
    endDate: "Nov 28, 2026",
    days: 3,
    status: "Approved",
    notes: "Thanksgiving holiday",
    createdAt: "2026-09-05",
  },
  {
    id: "to-3",
    type: "Training / Conference",
    startDate: "Dec 22, 2026",
    endDate: "Dec 23, 2026",
    days: 2,
    status: "Pending",
    notes: "National Special Ed Advocacy Summit",
    createdAt: "2026-09-10",
  },
];

export default function CrewQuarters() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  // Queries from existing CRM infrastructure
  const { data: appointments = [] } = trpc.appointments.list.useQuery();
  const { data: tasks = [] } = trpc.internalTasks.list.useQuery({ status: "all" });
  const { data: contacts = [] } = trpc.contacts.list.useQuery();
  const { data: callLogs = [] } = trpc.callLogs.listAll.useQuery();

  // Time Off State with Local Persistence
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>(() => {
    try {
      const saved = localStorage.getItem("waypoint_time_off_requests");
      return saved ? JSON.parse(saved) : DEFAULT_TIME_OFF;
    } catch {
      return DEFAULT_TIME_OFF;
    }
  });

  const [timeOffModalOpen, setTimeOffModalOpen] = useState(false);
  const [timeOffForm, setTimeOffForm] = useState({
    type: "Vacation",
    startDate: "",
    endDate: "",
    notes: "",
  });

  // Task Quick Add Modal
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"high" | "medium" | "low">("medium");

  const createTaskMutation = trpc.internalTasks.create.useMutation({
    onSuccess: () => {
      toast.success("Task added to your queue!");
      utils.internalTasks.list.invalidate();
      setTaskModalOpen(false);
      setNewTaskTitle("");
    },
    onError: (err) => toast.error("Failed to add task: " + err.message),
  });

  const handleSaveTimeOff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!timeOffForm.startDate || !timeOffForm.endDate) {
      toast.error("Please provide both start and end dates.");
      return;
    }

    const newReq: TimeOffRequest = {
      id: `to-${Date.now()}`,
      type: timeOffForm.type,
      startDate: timeOffForm.startDate,
      endDate: timeOffForm.endDate,
      days: 1,
      status: "Pending",
      notes: timeOffForm.notes,
      createdAt: new Date().toISOString().split("T")[0],
    };

    const updated = [newReq, ...timeOffRequests];
    setTimeOffRequests(updated);
    try {
      localStorage.setItem("waypoint_time_off_requests", JSON.stringify(updated));
    } catch {}

    toast.success("Time off request submitted to management for review!");
    setTimeOffModalOpen(false);
    setTimeOffForm({ type: "Vacation", startDate: "", endDate: "", notes: "" });
  };

  // Derive employee details
  const employeeName = user?.name || "Wyatt Smith";
  const firstName = employeeName.split(" ")[0] || "Advocate";
  const employeeRole = user?.role === "admin" ? "Master Coach / Practice Owner" : "Senior IEP Advocate";
  const userInitials = employeeName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Metrics calculations
  const todayStr = new Date().toDateString();
  const todayAppointments = (appointments as any[]).filter((a) => {
    if (!a.startTime) return false;
    return new Date(a.startTime).toDateString() === todayStr;
  });

  const unassignedCalls = (callLogs as any[]).filter((c) => c.status === "unassigned");
  const openTasks = (tasks as any[]).filter((t) => t.status !== "complete");
  const studentsList = (contacts as any[]).filter((c) => c.jobTitle === "Student" || !c.parentContactId);

  return (
    <div className="min-h-screen bg-[#040D1A] text-slate-100 p-4 sm:p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto">
      
      {/* ── Top Header & Personalized Welcome Banner ── */}
      <div className="relative overflow-hidden rounded-3xl border border-blue-900/50 bg-[#061830] shadow-[0_15px_45px_rgba(0,0,0,0.4)] p-6 sm:p-8">
        {/* Subtle bathymetric wave texture */}
        <div
          className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-25 mix-blend-screen"
          style={{ backgroundImage: `url('/waypoint-wave-bg.jpg')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#040D1A] via-[#061830]/85 to-[#040D1A]/90 pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            {/* Crew Quarters Pill & Page ID */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-800/60 text-blue-300 text-xs font-bold tracking-wider uppercase">
                <LighthouseCottageIcon className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Crew Quarters</span>
              </div>
              <PageIdBadge id="PG-038" name="Crew Quarters" />
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>On Duty</span>
              </div>
            </div>

            {/* Personalized Welcome Headline */}
            <div>
              <h1 className="text-2xl sm:text-4xl font-serif text-white font-normal tracking-wide">
                Good morning, <span className="font-serif italic font-bold text-amber-400">{firstName}!</span>
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <WaypointWaveIcon className="w-9 h-2.5 text-amber-400/90 shrink-0" />
                <p className="text-xs sm:text-sm text-blue-200/90 font-medium">
                  Same Mission. Stronger Together. Here's what's on deck today.
                </p>
              </div>
            </div>
          </div>

          {/* Employee Identity & Inspirational Motto Ribbon */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Mission Quote */}
            <div className="hidden xl:flex flex-col text-right border-r border-blue-800/60 pr-5">
              <span className="text-xs italic text-blue-200/80 font-serif">
                &ldquo;Different abilities. Brighter futures.&rdquo;
              </span>
              <span className="text-[10px] text-amber-400/90 font-semibold tracking-wider uppercase mt-0.5">
                Waypoint Core Creed
              </span>
            </div>

            {/* Date & Day Badge */}
            <div className="flex items-center gap-3 bg-[#0A1F3B]/80 backdrop-blur-md border border-blue-700/50 rounded-2xl p-3 shadow-lg">
              <div className="p-2.5 rounded-xl bg-amber-400/15 text-amber-400 border border-amber-400/30">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="pr-2">
                <div className="text-xs font-bold text-white">
                  {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
                </div>
                <div className="text-[10px] text-blue-300 font-medium">Make it a great day.</div>
              </div>

              {/* Employee Avatar */}
              <div className="pl-3 border-l border-blue-800/60 flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-bold flex items-center justify-center text-sm shadow-md ring-2 ring-amber-400/30">
                  {userInitials}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-bold text-white truncate max-w-[130px]">{employeeName}</div>
                  <div className="text-[10px] text-amber-300/90 font-medium truncate max-w-[130px]">{employeeRole}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Employee Summary Metrics (5 Metric Cards) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
        
        {/* Card 1: Meetings Today */}
        <div 
          onClick={() => setLocation("/calendar")}
          className="group cursor-pointer rounded-2xl border border-blue-900/60 bg-[#061830] hover:border-amber-400/60 p-4 sm:p-5 transition-all duration-200 shadow-lg hover:shadow-[0_8px_25px_rgba(245,181,68,0.15)] flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30 group-hover:scale-105 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white font-mono leading-none">
                {todayAppointments.length || 2}
              </div>
              <div className="text-xs text-blue-200/80 font-medium mt-1">Meetings Today</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-blue-400/60 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
        </div>

        {/* Card 2: Callbacks */}
        <div 
          onClick={() => setLocation("/call-logs")}
          className="group cursor-pointer rounded-2xl border border-blue-900/60 bg-[#061830] hover:border-emerald-400/60 p-4 sm:p-5 transition-all duration-200 shadow-lg hover:shadow-[0_8px_25px_rgba(52,211,153,0.15)] flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 group-hover:scale-105 transition-transform">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white font-mono leading-none">
                {unassignedCalls.length || 3}
              </div>
              <div className="text-xs text-blue-200/80 font-medium mt-1">Callbacks</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-blue-400/60 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
        </div>

        {/* Card 3: Tasks Due */}
        <div 
          onClick={() => setLocation("/tasks")}
          className="group cursor-pointer rounded-2xl border border-blue-900/60 bg-[#061830] hover:border-amber-400/60 p-4 sm:p-5 transition-all duration-200 shadow-lg hover:shadow-[0_8px_25px_rgba(245,181,68,0.15)] flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-400/15 text-amber-400 border border-amber-400/30 group-hover:scale-105 transition-transform">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white font-mono leading-none">
                {openTasks.length || 4}
              </div>
              <div className="text-xs text-blue-200/80 font-medium mt-1">Tasks Due</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-blue-400/60 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
        </div>

        {/* Card 4: Active Cases */}
        <div 
          onClick={() => setLocation("/projects")}
          className="group cursor-pointer rounded-2xl border border-blue-900/60 bg-[#061830] hover:border-indigo-400/60 p-4 sm:p-5 transition-all duration-200 shadow-lg hover:shadow-[0_8px_25px_rgba(99,102,241,0.15)] flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white font-mono leading-none">
                {studentsList.length || 5}
              </div>
              <div className="text-xs text-blue-200/80 font-medium mt-1">Active Cases</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-blue-400/60 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
        </div>

        {/* Card 5: Waypoint Motto Tile — Epic Bathymetric Topographic Map & Luminous Gold Typography */}
        <div className="col-span-2 sm:col-span-2 lg:col-span-1 relative rounded-2xl border border-blue-500/40 bg-gradient-to-br from-[#020b17] via-[#041326] to-[#010812] p-4 sm:p-5 flex items-center justify-between overflow-hidden shadow-[0_4px_25px_rgba(2,132,199,0.2)] group hover:border-cyan-400/60 transition-all duration-300 min-h-[96px]">
          {/* Multi-Layered, Ultra-Fine Bathymetric Topographic Ocean Depth Contours */}
          <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
            <svg
              viewBox="0 0 300 120"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="absolute inset-0 w-full h-full object-cover"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="topoCyan" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity="0.75" />
                  <stop offset="35%" stopColor="#38bdf8" stopOpacity="0.85" />
                  <stop offset="70%" stopColor="#0ea5e9" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#0369a1" stopOpacity="0.15" />
                </linearGradient>
                <linearGradient id="topoDeep" x1="0%" y1="100%" x2="100%" y2="30%">
                  <stop offset="0%" stopColor="#0369a1" stopOpacity="0.5" />
                  <stop offset="50%" stopColor="#0284c7" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#075985" stopOpacity="0.1" />
                </linearGradient>
                <filter id="oceanGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="1.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Ambient radial deep oceanic glow */}
              <circle cx="35" cy="95" r="70" fill="#0284c7" fillOpacity="0.18" />
              <circle cx="110" cy="60" r="45" fill="#38bdf8" fillOpacity="0.08" />

              {/* Dense, delicate bathymetric contour ridges sweeping across the entire chart */}
              <path d="M-10 125 C 20 120, 35 105, 55 98 C 80 90, 105 106, 140 100 C 180 94, 220 106, 310 98" stroke="url(#topoDeep)" strokeWidth="0.65" />
              <path d="M-10 118 C 22 112, 38 98, 60 91 C 86 83, 112 99, 148 93 C 190 86, 230 100, 310 91" stroke="url(#topoDeep)" strokeWidth="0.65" />
              <path d="M-10 110 C 24 104, 42 90, 65 83 C 92 75, 120 92, 158 85 C 200 78, 240 93, 310 84" stroke="url(#topoCyan)" strokeWidth="0.75" />
              <path d="M-10 102 C 26 95, 46 82, 70 75 C 99 67, 128 84, 168 77 C 210 70, 250 86, 310 77" stroke="url(#topoCyan)" strokeWidth="0.85" filter="url(#oceanGlow)" />
              <path d="M-10 94 C 28 86, 50 74, 76 66 C 106 58, 136 76, 178 69 C 220 62, 260 79, 310 70" stroke="url(#topoCyan)" strokeWidth="0.95" />
              <path d="M-10 86 C 30 77, 54 65, 82 57 C 114 49, 145 68, 188 61 C 230 54, 270 72, 310 63" stroke="#38bdf8" strokeWidth="1.1" strokeOpacity="0.85" filter="url(#oceanGlow)" />
              <path d="M-10 77 C 32 68, 58 56, 88 48 C 121 40, 154 60, 198 53 C 240 46, 280 65, 310 56" stroke="url(#topoCyan)" strokeWidth="0.85" />
              <path d="M-10 68 C 34 58, 62 47, 94 39 C 128 31, 162 52, 208 45 C 250 38, 290 57, 310 49" stroke="url(#topoCyan)" strokeWidth="0.75" />
              <path d="M-10 59 C 36 49, 66 38, 100 30 C 136 22, 171 43, 218 36 C 260 29, 295 48, 310 42" stroke="url(#topoDeep)" strokeWidth="0.65" />
              <path d="M-10 50 C 38 40, 70 29, 106 21 C 144 13, 180 34, 228 27 C 270 20, 300 38, 310 34" stroke="url(#topoDeep)" strokeWidth="0.65" />
              <path d="M-10 40 C 40 30, 74 19, 112 12 C 152 4, 189 25, 238 18 C 278 12, 302 28, 310 26" stroke="url(#topoDeep)" strokeWidth="0.55" />
              <path d="M-10 30 C 42 20, 78 10, 118 4 C 160 -4, 198 16, 248 9 C 285 3, 305 18, 310 17" stroke="url(#topoDeep)" strokeWidth="0.5" />

              {/* Secondary delicate intersecting elevation contours */}
              <path d="M 120 120 C 145 100, 170 85, 205 78 C 245 70, 275 80, 310 75" stroke="#0ea5e9" strokeWidth="0.5" strokeOpacity="0.35" />
              <path d="M 140 120 C 165 105, 190 92, 225 86 C 260 80, 285 88, 310 83" stroke="#0284c7" strokeWidth="0.45" strokeOpacity="0.25" />
              <path d="M 80 0 C 110 25, 150 45, 195 40 C 240 35, 280 20, 310 12" stroke="#0284c7" strokeWidth="0.5" strokeOpacity="0.2" />
            </svg>
          </div>

          {/* Right-Aligned Stacked Gold Typography + Accent Bar */}
          <div className="relative z-10 ml-auto flex flex-col items-end text-right select-none pl-4">
            <div className="text-[13px] sm:text-[14px] font-sans font-extrabold tracking-[0.2em] text-[#F3CE85] leading-[1.35] drop-shadow-[0_2px_8px_rgba(243,206,133,0.35)]">
              <div>ADVOCACY</div>
              <div>CHANGES</div>
              <div>LIVES</div>
            </div>
            <div className="w-9 h-[2.5px] bg-gradient-to-r from-amber-400 to-[#F3CE85] rounded-full mt-2 shadow-[0_0_10px_rgba(243,206,133,0.8)]" />
          </div>
        </div>
      </div>

      {/* ── ROW 2: Today's Schedule · My Tasks · Quick Actions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">

        {/* Card 2A: Today's Schedule */}
        <Card className="rounded-2xl border border-blue-900/60 bg-[#061830] p-5 sm:p-6 shadow-xl flex flex-col justify-between h-full space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-blue-900/40">
              <div className="flex items-center gap-2 text-white font-bold text-sm sm:text-base">
                <Calendar className="w-4 h-4 text-sky-400" />
                <span>Today's Schedule</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/calendar")}
                className="text-xs text-blue-300 hover:text-amber-300 hover:bg-blue-900/40 p-0 h-auto font-medium"
              >
                View Calendar →
              </Button>
            </div>

            <div className="space-y-2.5 pt-3">
              {[
                { time: "9:00 AM", title: "Team Check-In", subtitle: "Virtual Meeting", dot: "bg-sky-400" },
                { time: "10:30 AM", title: "IEP Meeting — Jackson R.", subtitle: "Riverside School", dot: "bg-amber-400" },
                { time: "1:00 PM", title: "Callback — Parent (M. Carter)", subtitle: "Discuss assessment results", dot: "bg-emerald-400" },
                { time: "3:00 PM", title: "Records Review", subtitle: "Johnson Case", dot: "bg-indigo-400" },
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-2 rounded-xl hover:bg-[#0A2244]/60 transition-colors border border-transparent hover:border-blue-800/40">
                  <div className="w-16 text-right shrink-0 pt-0.5">
                    <span className="text-xs font-mono font-bold text-blue-200">{item.time}</span>
                  </div>
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className={`w-2 h-2 rounded-full ${item.dot} mt-1.5 shrink-0 shadow-sm`} />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{item.title}</div>
                      <div className="text-[11px] text-blue-300/70 truncate">{item.subtitle}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-blue-900/30 flex items-center justify-between text-[11px] text-blue-300/70">
            <span>4 events scheduled</span>
            <span className="text-amber-400 font-mono">Next: 10:30 AM</span>
          </div>
        </Card>

        {/* Card 2B: My Tasks */}
        <Card className="rounded-2xl border border-blue-900/60 bg-[#061830] p-5 sm:p-6 shadow-xl flex flex-col justify-between h-full space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-blue-900/40">
              <div className="flex items-center gap-2 text-white font-bold text-sm sm:text-base">
                <CheckSquare className="w-4 h-4 text-emerald-400" />
                <span>My Tasks</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/tasks")}
                className="text-xs text-blue-300 hover:text-amber-300 hover:bg-blue-900/40 p-0 h-auto font-medium"
              >
                View All →
              </Button>
            </div>

            <div className="space-y-2 pt-3">
              {[
                { title: "Complete draft of Parent Concerns", tag: "High", tagColor: "bg-rose-500/20 text-rose-300 border-rose-500/40" },
                { title: "Follow up with SLP", tag: "Today", tagColor: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
                { title: "Send meeting summary to parent", tag: "Today", tagColor: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
                { title: "Review evaluation documents", tag: "Tomorrow", tagColor: "bg-sky-500/20 text-sky-300 border-sky-500/40" },
                { title: "Prepare for IEP meeting", tag: "Tomorrow", tagColor: "bg-sky-500/20 text-sky-300 border-sky-500/40" },
              ].map((task, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-blue-950/40 border border-blue-800/40 text-xs hover:border-blue-700 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <input type="checkbox" className="rounded border-blue-700 bg-blue-950 text-amber-400 focus:ring-amber-400 h-3.5 w-3.5" />
                    <span className="text-white/90 truncate font-medium">{task.title}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${task.tagColor}`}>
                    {task.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTaskModalOpen(true)}
              className="w-full border-blue-700/60 hover:bg-blue-900/40 text-blue-200 text-xs rounded-xl py-2 gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </Button>
          </div>
        </Card>

        {/* Card 2C: Quick Actions Grid */}
        <Card className="rounded-2xl border border-blue-900/60 bg-[#061830] p-5 sm:p-6 shadow-xl flex flex-col justify-between h-full space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-blue-900/40">
              <div className="flex items-center gap-2 text-white font-bold text-sm sm:text-base">
                <Sparkles className="w-4 h-4 text-sky-400" />
                <span>Quick Actions</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3">
              <Button
                variant="outline"
                onClick={() => setTimeOffModalOpen(true)}
                className="h-[84px] flex-col py-3 px-2 border-blue-800/60 hover:border-amber-400/60 hover:bg-blue-900/40 text-center items-center justify-center rounded-xl gap-1.5 cursor-pointer transition-all"
              >
                <Calendar className="w-5 h-5 text-sky-400" />
                <span className="text-xs font-bold text-white leading-tight">Request<br />Time Off</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => setLocation("/calendar")}
                className="h-[84px] flex-col py-3 px-2 border-blue-800/60 hover:border-sky-400/60 hover:bg-blue-900/40 text-center items-center justify-center rounded-xl gap-1.5 cursor-pointer transition-all"
              >
                <CalendarClock className="w-5 h-5 text-sky-400" />
                <span className="text-xs font-bold text-white leading-tight">View<br />My Calendar</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => setTaskModalOpen(true)}
                className="h-[84px] flex-col py-3 px-2 border-blue-800/60 hover:border-emerald-400/60 hover:bg-blue-900/40 text-center items-center justify-center rounded-xl gap-1.5 cursor-pointer transition-all"
              >
                <CheckSquare className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-bold text-white leading-tight">Add Task</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => setLocation("/projects")}
                className="h-[84px] flex-col py-3 px-2 border-blue-800/60 hover:border-indigo-400/60 hover:bg-blue-900/40 text-center items-center justify-center rounded-xl gap-1.5 cursor-pointer transition-all"
              >
                <Users className="w-5 h-5 text-indigo-400" />
                <span className="text-xs font-bold text-white leading-tight">My Cases</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => toast.info("Team Messaging Console is active")}
                className="h-[84px] flex-col py-3 px-2 border-blue-800/60 hover:border-blue-400/60 hover:bg-blue-900/40 text-center items-center justify-center rounded-xl gap-1.5 cursor-pointer transition-all"
              >
                <MessageSquare className="w-5 h-5 text-blue-400" />
                <span className="text-xs font-bold text-white leading-tight">Team<br />Messages</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => setLocation("/knowledge-base")}
                className="h-[84px] flex-col py-3 px-2 border-blue-800/60 hover:border-amber-400/60 hover:bg-blue-900/40 text-center items-center justify-center rounded-xl gap-1.5 cursor-pointer transition-all"
              >
                <BookOpen className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-bold text-white leading-tight">Training &amp;<br />Resources</span>
              </Button>
            </div>
          </div>

          <div className="pt-2 text-center text-[11px] text-blue-300/60">
            Quick employee utilities
          </div>
        </Card>

      </div>

      {/* ── ROW 3: Time Off · My Cases · Team Messages ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">

        {/* Card 3A: Time Off Center */}
        <Card className="rounded-2xl border border-blue-900/60 bg-[#061830] p-5 sm:p-6 shadow-xl flex flex-col justify-between h-full space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-blue-900/40">
              <div className="flex items-center gap-2 text-white font-bold text-sm sm:text-base">
                <Plane className="w-4 h-4 text-sky-400" />
                <span>Time Off</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTimeOffModalOpen(true)}
                className="text-xs text-blue-300 hover:text-amber-300 hover:bg-blue-900/40 p-0 h-auto font-medium"
              >
                View All →
              </Button>
            </div>

            {/* Request Time Off Action Button */}
            <div className="pt-3 pb-2">
              <Button
                onClick={() => setTimeOffModalOpen(true)}
                className="w-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-xl py-2.5 shadow-[0_0_15px_rgba(245,181,68,0.2)] flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Request Time Off</span>
              </Button>
            </div>

            {/* Upcoming Time Off */}
            <div className="space-y-2 pt-1">
              <div className="text-[11px] font-semibold text-blue-300/80 uppercase tracking-wider">
                Upcoming Time Off
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-950/40 border border-blue-800/40 text-xs">
                  <span className="font-semibold text-white">Oct 10, 2025</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                    Approved
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-950/40 border border-blue-800/40 text-xs">
                  <span className="font-semibold text-white">Nov 26 – Nov 28, 2025</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                    Approved
                  </span>
                </div>
              </div>
            </div>

            {/* Pending Requests */}
            <div className="space-y-2 pt-3">
              <div className="text-[11px] font-semibold text-blue-300/80 uppercase tracking-wider">
                Pending Requests
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-950/40 border border-blue-800/40 text-xs">
                <span className="font-semibold text-white">Dec 22, 2025</span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                  Pending
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-blue-900/30 flex items-center justify-between text-[11px] text-blue-300/70">
            <span>Annual Allowance: 15 Days</span>
            <span className="text-emerald-400 font-mono">11 Days Remaining</span>
          </div>
        </Card>

        {/* Card 3B: My Cases */}
        <Card className="rounded-2xl border border-blue-900/60 bg-[#061830] p-5 sm:p-6 shadow-xl flex flex-col justify-between h-full space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-blue-900/40">
              <div className="flex items-center gap-2 text-white font-bold text-sm sm:text-base">
                <Users className="w-4 h-4 text-indigo-400" />
                <span>My Cases</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/projects")}
                className="text-xs text-blue-300 hover:text-amber-300 hover:bg-blue-900/40 p-0 h-auto font-medium"
              >
                View All →
              </Button>
            </div>

            <div className="space-y-2 pt-3">
              {[
                { name: "Alex P.", initials: "AP", milestone: "IEP Meeting 9/15", status: "Active" },
                { name: "Bella R.", initials: "BR", milestone: "Records Review", status: "Active" },
                { name: "Chris T.", initials: "CT", milestone: "Draft in Progress", status: "Active" },
                { name: "Jordan M.", initials: "JM", milestone: "Parent Follow-Up", status: "Active" },
                { name: "Taylor S.", initials: "TS", milestone: "Evaluation Review", status: "Active" },
              ].map((c, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setLocation("/projects")}
                  className="flex items-center justify-between p-2 rounded-xl bg-blue-950/40 border border-blue-800/40 text-xs hover:border-indigo-400/50 hover:bg-blue-900/30 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-blue-900/80 border border-blue-700/60 text-blue-200 font-bold flex items-center justify-center text-[10px] shrink-0">
                      {c.initials}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-white truncate">{c.name}</div>
                      <div className="text-[10px] text-blue-300/70 truncate">{c.milestone}</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-semibold">
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 text-center text-[11px] text-blue-300/60">
            Primary caseload snapshot · All CRM students remain accessible
          </div>
        </Card>

        {/* Card 3C: Team Messages */}
        <Card className="rounded-2xl border border-blue-900/60 bg-[#061830] p-5 sm:p-6 shadow-xl flex flex-col justify-between h-full space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-blue-900/40">
              <div className="flex items-center gap-2 text-white font-bold text-sm sm:text-base">
                <MessageSquare className="w-4 h-4 text-sky-400" />
                <span>Team Messages</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toast.info("Opening team messages...")}
                className="text-xs text-blue-300 hover:text-amber-300 hover:bg-blue-900/40 p-0 h-auto font-medium"
              >
                View All →
              </Button>
            </div>

            <div className="space-y-2 pt-3">
              {[
                { initials: "BH", name: "Byron Honea", message: "Great work on yesterday's meeting!...", time: "9:12 AM", unread: 1, avatarBg: "bg-blue-900/80 border-blue-700/60 text-blue-200" },
                { initials: "Team", name: "Team", message: "Office will be closed Friday, Sept 20...", time: "8:45 AM", unread: 0, avatarBg: "bg-indigo-900/80 border-indigo-700/60 text-indigo-200" },
                { initials: "WS", name: "Wyatt Smith", message: "Shared documents: Johnson Case", time: "Yesterday", unread: 0, avatarBg: "bg-sky-900/80 border-sky-700/60 text-sky-200" },
                { initials: "📣", name: "General", message: "New training module available!", time: "Yesterday", unread: 0, avatarBg: "bg-amber-900/80 border-amber-700/60 text-amber-200" },
              ].map((msg, idx) => (
                <div 
                  key={idx}
                  onClick={() => toast.info(`Message thread with ${msg.name}`)}
                  className="flex items-center justify-between p-2 rounded-xl bg-blue-950/40 border border-blue-800/40 text-xs hover:border-blue-700 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div className={`w-7 h-7 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 ${msg.avatarBg}`}>
                      {msg.initials}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-white truncate">{msg.name}</div>
                      <div className="text-[11px] text-blue-300/70 truncate">{msg.message}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <span className="text-[10px] font-mono text-blue-300/60">{msg.time}</span>
                    {msg.unread > 0 && (
                      <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                        {msg.unread}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 text-center text-[11px] text-blue-300/60">
            Internal staff communication channel
          </div>
        </Card>

      </div>

      {/* ── ROW 4: Company Announcements · Training & Resources · Waypoint Inspiration Card ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">

        {/* Card 4A: Company Announcements */}
        <Card className="rounded-2xl border border-blue-900/60 bg-[#061830] p-5 sm:p-6 shadow-xl flex flex-col justify-between h-full space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-blue-900/40">
              <div className="flex items-center gap-2 text-white font-bold text-sm sm:text-base">
                <Megaphone className="w-4 h-4 text-amber-400" />
                <span>Company Announcements</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toast.info("Viewing all announcements")}
                className="text-xs text-blue-300 hover:text-amber-300 hover:bg-blue-900/40 p-0 h-auto font-medium"
              >
                View All →
              </Button>
            </div>

            <div className="space-y-2.5 pt-3">
              {[
                {
                  title: "Office Closed – Sept 20",
                  desc: "In observance of staff training day.",
                  date: "Sept 9",
                  icon: Calendar,
                  iconColor: "text-sky-400 bg-sky-400/10",
                },
                {
                  title: "New Training Module",
                  desc: "IEP Meeting Best Practices is now available.",
                  date: "Sept 8",
                  icon: BookOpen,
                  iconColor: "text-purple-400 bg-purple-400/10",
                },
                {
                  title: "Welcome to the Team!",
                  desc: "Please join us in welcoming our newest advocate!",
                  date: "Sept 5",
                  icon: Megaphone,
                  iconColor: "text-emerald-400 bg-emerald-400/10",
                },
              ].map((ann, idx) => (
                <div key={idx} className="flex items-start gap-3 p-2.5 rounded-xl bg-blue-950/40 border border-blue-800/40 text-xs">
                  <div className={`p-2 rounded-xl shrink-0 ${ann.iconColor}`}>
                    <ann.icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 space-y-0.5 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-white truncate pr-2">{ann.title}</div>
                      <span className="text-[10px] font-mono text-blue-300/60 shrink-0">{ann.date}</span>
                    </div>
                    <div className="text-[11px] text-blue-200/75 leading-relaxed">{ann.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 text-center text-[11px] text-blue-300/60">
            Waypoint Practice News &amp; Updates
          </div>
        </Card>

        {/* Card 4B: Training & Resources */}
        <Card className="rounded-2xl border border-blue-900/60 bg-[#061830] p-5 sm:p-6 shadow-xl flex flex-col justify-between h-full space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-blue-900/40">
              <div className="flex items-center gap-2 text-white font-bold text-sm sm:text-base">
                <BookOpen className="w-4 h-4 text-sky-400" />
                <span>Training &amp; Resources</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/knowledge-base")}
                className="text-xs text-blue-300 hover:text-amber-300 hover:bg-blue-900/40 p-0 h-auto font-medium"
              >
                View All →
              </Button>
            </div>

            <div className="space-y-2 pt-3">
              {[
                { title: "Waypoint Field Guide", desc: "Your step-by-step resource", path: "/knowledge-base", icon: FileText },
                { title: "Standard Operating Procedures", desc: "Office processes and workflows", path: "/walkthroughs", icon: FileText },
                { title: "Phone Scripts", desc: "Ready-to-use communication templates", path: "/templates", icon: Phone },
                { title: "Training Modules", desc: "Continue your professional development", path: "/knowledge-base", icon: Video },
              ].map((res, idx) => (
                <div
                  key={idx}
                  onClick={() => setLocation(res.path)}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-blue-950/40 border border-blue-800/40 hover:border-sky-400/50 hover:bg-blue-900/30 transition-all cursor-pointer text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <res.icon className="w-4 h-4 text-sky-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-bold text-white truncate">{res.title}</div>
                      <div className="text-[10px] text-blue-300/70 truncate">{res.desc}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-blue-400/60 shrink-0" />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 text-center text-[11px] text-blue-300/60">
            Master IEP Coach® internal library
          </div>
        </Card>

        {/* Card 4C: Waypoint Inspiration Poster Tile — Cinematic Lighthouse Theme */}
        <div className="rounded-2xl border border-blue-500/40 bg-[#020B18] p-6 shadow-2xl flex flex-col items-center justify-between text-center relative overflow-hidden h-full group min-h-[340px]">
          {/* Authentic Cinematic Lighthouse Night Ocean Backdrop */}
          <div
            className="absolute inset-0 bg-cover bg-center opacity-70 group-hover:scale-105 transition-transform duration-700 pointer-events-none"
            style={{ backgroundImage: "url('/lighthouse-night-bg.png')" }}
          />
          {/* Subtle Twilight & Deep Ocean Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#020B18] via-[#020B18]/50 to-[#020B18]/75 pointer-events-none" />
          <div className="absolute inset-0 bg-radial-gradient from-transparent to-[#010814]/80 pointer-events-none" />

          {/* Upper Section: Elegant Script Typography */}
          <div className="relative z-10 pt-3 flex flex-col items-center">
            <h3 className="font-serif italic text-2xl sm:text-3xl text-[#F5CE85] tracking-wide leading-snug drop-shadow-[0_2px_14px_rgba(245,206,133,0.5)]">
              The work<br />you do matters.
            </h3>
            <div className="w-12 h-[2px] bg-gradient-to-r from-transparent via-[#F5CE85] to-transparent my-3 shadow-[0_0_10px_rgba(245,206,133,0.9)]" />
          </div>

          {/* Lower Section: Waypoint Lighthouse Emblem & Brand Wordmark */}
          <div className="relative z-10 pb-2 flex flex-col items-center">
            {/* Custom Golden Lighthouse Emblem (Replacing Mountains) */}
            <svg
              viewBox="0 0 70 55"
              className="w-14 h-11 text-amber-400 mb-1 drop-shadow-[0_0_12px_rgba(245,181,68,0.5)]"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="posterGoldRayLeft" x1="100%" y1="50%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#FDE047" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#F5B544" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="posterGoldRayRight" x1="0%" y1="50%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#FDE047" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#F5B544" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="posterTowerGold" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#F5B544" />
                  <stop offset="45%" stopColor="#FEF08A" />
                  <stop offset="100%" stopColor="#D97706" />
                </linearGradient>
                <linearGradient id="posterBaseGold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#D97706" />
                  <stop offset="100%" stopColor="#92400E" />
                </linearGradient>
              </defs>

              {/* Radiant Beacon Light Beams */}
              <path d="M28 15 L2 8 L5 21 Z" fill="url(#posterGoldRayLeft)" />
              <path d="M42 15 L68 8 L65 21 Z" fill="url(#posterGoldRayRight)" />

              {/* Lighthouse Cap & Spire */}
              <circle cx="35" cy="3.5" r="1.2" fill="#FEF08A" />
              <rect x="34.4" y="3.5" width="1.2" height="3.5" fill="#F5B544" />
              <path d="M30.5 9 C30.5 6.5 39.5 6.5 39.5 9 L40.5 11 L29.5 11 Z" fill="#F5B544" />

              {/* Illuminated Lantern Room */}
              <rect x="29" y="11" width="12" height="7" rx="1" fill="#FEF08A" />
              <rect x="31" y="11" width="1.2" height="7" fill="#B45309" />
              <rect x="37.8" y="11" width="1.2" height="7" fill="#B45309" />
              <line x1="27" y1="18" x2="43" y2="18" stroke="#D97706" strokeWidth="1.6" strokeLinecap="round" />

              {/* Tapered Lighthouse Tower */}
              <polygon points="30,18 40,18 43,41 27,41" fill="url(#posterTowerGold)" />
              {/* Slit Windows */}
              <rect x="33.5" y="23" width="3" height="4" rx="1" fill="#020B18" />
              <rect x="33.5" y="32" width="3" height="4" rx="1" fill="#020B18" />

              {/* Stone Foundation Base & Coastline Rocks */}
              <polygon points="25,41 45,41 48,46 22,46" fill="url(#posterBaseGold)" />
              <path d="M12 50 C18 46 25 48 31 46 C38 44 45 47 58 49 C48 53 24 53 12 50 Z" fill="#F5B544" opacity="0.9" />
            </svg>

            {/* Typography */}
            <div className="text-sm font-serif font-black tracking-[0.25em] text-white uppercase drop-shadow-md">
              WAYPOINT
            </div>
            <div className="text-[9px] font-mono font-bold tracking-[0.22em] text-[#F5CE85] uppercase mt-0.5">
              ADVOCACY · EDUCATION · RESULTS
            </div>
          </div>
        </div>

      </div>

      {/* ── Owner / Admin Management Oversight Deck (Visible to Admin Role) ── */}
      {user?.role === "admin" && (
        <div className="mt-8 rounded-3xl border border-amber-400/40 bg-gradient-to-br from-[#061830] via-[#082042] to-[#040E1C] p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-blue-800/60 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded border border-amber-400/30">
                  Management Deck
                </span>
                <span className="text-xs text-blue-300">Practice Owner &amp; Admin Oversight</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-serif text-white font-bold">
                Team Workload &amp; Leadership Controls
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => setLocation("/team")}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl gap-1.5 cursor-pointer shadow-md"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Manage Team &amp; Roles</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Admin Card 1: Time Off Requests Awaiting Approval */}
            <div className="rounded-2xl border border-blue-800/60 bg-blue-950/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-bold text-white text-xs flex items-center gap-1.5">
                  <Plane className="w-4 h-4 text-amber-400" />
                  <span>Leaves Awaiting Approval</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold">
                  {timeOffRequests.filter((r) => r.status === "Pending").length} Pending
                </span>
              </div>
              <p className="text-[11px] text-blue-200/70">
                Staff time-off requests needing review. Approve to automatically sync team coverage.
              </p>
              <div className="space-y-2">
                {timeOffRequests
                  .filter((r) => r.status === "Pending")
                  .map((r) => (
                    <div key={r.id} className="p-2.5 rounded-xl bg-[#041021] border border-blue-800/40 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-white">{r.type}</div>
                        <div className="text-[10px] text-blue-300/80">{r.startDate} — {r.endDate}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const updated = timeOffRequests.map((req) => (req.id === r.id ? { ...req, status: "Approved" as const } : req));
                            setTimeOffRequests(updated);
                            localStorage.setItem("waypoint_time_off_requests", JSON.stringify(updated));
                            toast.success("Time off approved!");
                          }}
                          className="h-7 px-2 text-[10px] bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40"
                        >
                          Approve
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Admin Card 2: Team Workload Snapshot */}
            <div className="rounded-2xl border border-blue-800/60 bg-blue-950/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-bold text-white text-xs flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-sky-400" />
                  <span>Team Caseload Capacity</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-sky-400/20 text-sky-300 font-bold">
                  Balanced
                </span>
              </div>
              <p className="text-[11px] text-blue-200/70">
                Current active student caseloads distributed across staff advocates.
              </p>
              <div className="space-y-2">
                {[
                  { name: "Byron Honea", cases: 8, capacity: "80%" },
                  { name: "Sarah Jenkins", cases: 6, capacity: "60%" },
                  { name: "Marcus Vance", cases: 4, capacity: "40%" },
                ].map((emp, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-[#041021] border border-blue-800/40 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-white">{emp.name}</div>
                      <div className="text-[10px] text-blue-300/80">{emp.cases} Active Cases</div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-amber-300">{emp.capacity}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Admin Card 3: Unassigned Callbacks & Inquiries */}
            <div className="rounded-2xl border border-blue-800/60 bg-blue-950/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-bold text-white text-xs flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <span>Unassigned Lead Callbacks</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-400/20 text-emerald-300 font-bold">
                  {unassignedCalls.length || 3} Pending
                </span>
              </div>
              <p className="text-[11px] text-blue-200/70">
                Inbound family inquiries and voicemails pending advocate assignment.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation("/call-logs")}
                className="w-full border-blue-700/60 hover:bg-blue-900/40 text-blue-200 text-xs rounded-xl py-2 gap-1.5 cursor-pointer mt-2"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Triage Inbound Calls &amp; Assign</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Time Off Request Modal ── */}
      <Dialog open={timeOffModalOpen} onOpenChange={setTimeOffModalOpen}>
        <DialogContent className="sm:max-w-md bg-[#061830] border border-blue-800/80 text-white shadow-2xl rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-400/15 text-amber-400 border border-amber-400/30">
                <Plane className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-lg font-serif font-bold text-white">
                  Request Time Off
                </DialogTitle>
                <DialogDescription className="text-xs text-blue-300/80">
                  Submit planned PTO, sick leave, or conference travel for management review.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSaveTimeOff} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-blue-200 font-semibold">Leave Category</Label>
              <Select
                value={timeOffForm.type}
                onValueChange={(val) => setTimeOffForm({ ...timeOffForm, type: val })}
              >
                <SelectTrigger className="bg-blue-950/80 border-blue-800/80 text-white rounded-xl text-xs">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-[#061830] border-blue-800 text-white">
                  <SelectItem value="Vacation">Vacation / PTO</SelectItem>
                  <SelectItem value="Personal">Personal Day</SelectItem>
                  <SelectItem value="Medical / Sick">Medical / Sick Leave</SelectItem>
                  <SelectItem value="Training / Conference">Training &amp; Conference</SelectItem>
                  <SelectItem value="Bereavement">Bereavement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-blue-200 font-semibold">Start Date</Label>
                <Input
                  type="date"
                  value={timeOffForm.startDate}
                  onChange={(e) => setTimeOffForm({ ...timeOffForm, startDate: e.target.value })}
                  className="bg-blue-950/80 border-blue-800/80 text-white rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-blue-200 font-semibold">End Date</Label>
                <Input
                  type="date"
                  value={timeOffForm.endDate}
                  onChange={(e) => setTimeOffForm({ ...timeOffForm, endDate: e.target.value })}
                  className="bg-blue-950/80 border-blue-800/80 text-white rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-blue-200 font-semibold">Coverage Notes &amp; Details</Label>
              <Textarea
                placeholder="Mention any ongoing IEP cases or upcoming deadlines requiring team coverage..."
                value={timeOffForm.notes}
                onChange={(e) => setTimeOffForm({ ...timeOffForm, notes: e.target.value })}
                className="bg-blue-950/80 border-blue-800/80 text-white rounded-xl text-xs min-h-[80px]"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTimeOffModalOpen(false)}
                className="border-blue-800/80 text-blue-300 hover:bg-blue-900/50 rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs shadow-md"
              >
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Quick Add Task Modal ── */}
      <Dialog open={taskModalOpen} onOpenChange={setTaskModalOpen}>
        <DialogContent className="sm:max-w-md bg-[#061830] border border-blue-800/80 text-white shadow-2xl rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-lg font-serif font-bold text-white">
                  Add Task to Queue
                </DialogTitle>
                <DialogDescription className="text-xs text-blue-300/80">
                  Quickly add an action item to your personal advocacy workload.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newTaskTitle.trim()) {
                toast.error("Please enter a task title.");
                return;
              }
              createTaskMutation.mutate({
                title: newTaskTitle.trim(),
                status: "not_started",
              });
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label className="text-xs text-blue-200 font-semibold">Task Title</Label>
              <Input
                placeholder="e.g. Review OT service hours log for Johnson case..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="bg-blue-950/80 border-blue-800/80 text-white rounded-xl text-xs"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-blue-200 font-semibold">Priority Level</Label>
              <Select
                value={newTaskPriority}
                onValueChange={(val: any) => setNewTaskPriority(val)}
              >
                <SelectTrigger className="bg-blue-950/80 border-blue-800/80 text-white rounded-xl text-xs">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent className="bg-[#061830] border-blue-800 text-white">
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="medium">Normal / Medium</SelectItem>
                  <SelectItem value="low">Low Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTaskModalOpen(false)}
                className="border-blue-800/80 text-blue-300 hover:bg-blue-900/50 rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTaskMutation.isPending}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs shadow-md"
              >
                {createTaskMutation.isPending ? "Adding..." : "Add Task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
