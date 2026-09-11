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
            {/* Team Hub Pill & Page ID */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-800/60 text-blue-300 text-xs font-bold tracking-wider uppercase">
                <LighthouseCottageIcon className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Team Hub · Crew Quarters</span>
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

        {/* Card 5: Waypoint Motto Tile */}
        <div className="col-span-2 sm:col-span-2 lg:col-span-1 relative rounded-2xl border border-amber-400/40 bg-gradient-to-br from-[#0B254A] to-[#041122] p-4 flex flex-col justify-center items-center text-center overflow-hidden shadow-lg">
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: "radial-gradient(#F5B544 1px, transparent 1px)", backgroundSize: "12px 12px" }} />
          <WaypointWaveIcon className="w-12 h-3.5 text-amber-400/90 mb-1" />
          <div className="text-xs font-serif font-black tracking-widest text-amber-400 uppercase">
            Advocacy Changes Lives
          </div>
          <div className="w-8 h-0.5 bg-amber-400/60 rounded-full mt-1.5" />
        </div>
      </div>

      {/* ── 3-Column Core Operational Deck ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ══ COLUMN 1: Today's Schedule & Time Off ══ */}
        <div className="space-y-6">

          {/* Today's Schedule */}
          <Card className="rounded-3xl border border-blue-900/60 bg-[#061830] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-base">
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

            <div className="space-y-3 pt-1">
              {[
                { time: "9:00 AM", title: "Team Morning Check-In", subtitle: "Virtual Staff Standup", color: "bg-sky-400" },
                { time: "10:30 AM", title: "IEP Annual Review — Jackson R.", subtitle: "Riverside Middle School", color: "bg-amber-400" },
                { time: "1:00 PM", title: "Parent Callback (M. Carter)", subtitle: "Discuss Speech Assessment Results", color: "bg-emerald-400" },
                { time: "3:00 PM", title: "Records Review & Synthesis", subtitle: "Johnson Case Psychoeducational Eval", color: "bg-indigo-400" },
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-[#0A2244]/60 transition-colors border border-transparent hover:border-blue-800/40">
                  <div className="w-16 text-right shrink-0 pt-0.5">
                    <span className="text-xs font-mono font-bold text-blue-200">{item.time}</span>
                  </div>
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className={`w-2 h-2 rounded-full ${item.color} mt-1.5 shrink-0 shadow-sm`} />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{item.title}</div>
                      <div className="text-[11px] text-blue-300/70 truncate">{item.subtitle}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Time Off Center */}
          <Card className="rounded-3xl border border-blue-900/60 bg-[#061830] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Plane className="w-4 h-4 text-amber-400" />
                <span>Time Off</span>
              </div>
              <span className="text-[11px] text-blue-300/80 font-mono">2026 Balance: 14 Days</span>
            </div>

            {/* Request Time Off Action Button */}
            <Button
              onClick={() => setTimeOffModalOpen(true)}
              className="w-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-xl py-2.5 shadow-[0_0_20px_rgba(245,181,68,0.25)] flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Request Time Off</span>
            </Button>

            {/* Upcoming Time Off */}
            <div className="space-y-2 pt-2">
              <div className="text-[11px] uppercase tracking-wider text-blue-300 font-semibold">
                Upcoming Approved Leave
              </div>
              <div className="space-y-2">
                {timeOffRequests
                  .filter((r) => r.status === "Approved")
                  .map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-2.5 rounded-xl bg-blue-950/40 border border-blue-800/40 text-xs">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-white">{r.startDate} — {r.endDate}</div>
                        <div className="text-[10px] text-blue-300/80">{r.type} · {r.notes || "Approved Leave"}</div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                        Approved
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Pending Requests */}
            <div className="space-y-2 pt-2 border-t border-blue-900/40">
              <div className="text-[11px] uppercase tracking-wider text-blue-300 font-semibold">
                Pending Requests
              </div>
              <div className="space-y-2">
                {timeOffRequests
                  .filter((r) => r.status === "Pending")
                  .map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-2.5 rounded-xl bg-blue-950/40 border border-blue-800/40 text-xs">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-white">{r.startDate} — {r.endDate}</div>
                        <div className="text-[10px] text-blue-300/80">{r.type} · {r.notes || "Under Review"}</div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                        Pending
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </Card>

        </div>

        {/* ══ COLUMN 2: My Tasks & My Assigned Cases ══ */}
        <div className="space-y-6">

          {/* My Tasks */}
          <Card className="rounded-3xl border border-blue-900/60 bg-[#061830] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <CheckSquare className="w-4 h-4 text-emerald-400" />
                <span>My Tasks</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/tasks")}
                className="text-xs text-blue-300 hover:text-amber-300 hover:bg-blue-900/40 p-0 h-auto font-medium"
              >
                View All Tasks →
              </Button>
            </div>

            <div className="space-y-2.5 pt-1">
              {[
                { title: "Complete draft of Parent Concerns statement", tag: "High", tagColor: "bg-rose-500/20 text-rose-300 border-rose-500/40" },
                { title: "Follow up with District Speech Therapist on log", tag: "Today", tagColor: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
                { title: "Send meeting preparation agenda to parent", tag: "Today", tagColor: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
                { title: "Review comprehensive neuropsychological eval", tag: "Tomorrow", tagColor: "bg-sky-500/20 text-sky-300 border-sky-500/40" },
                { title: "Prepare for annual IEP review (Carter)", tag: "Tomorrow", tagColor: "bg-sky-500/20 text-sky-300 border-sky-500/40" },
              ].map((task, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-blue-950/40 border border-blue-800/40 text-xs hover:border-blue-700 transition-colors">
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

            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTaskModalOpen(true)}
                className="w-full border-blue-700/60 hover:bg-blue-900/40 text-blue-200 text-xs rounded-xl py-2 gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Task to Queue</span>
              </Button>
            </div>
          </Card>

          {/* My Assigned Cases Snapshot */}
          <Card className="rounded-3xl border border-blue-900/60 bg-[#061830] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Users className="w-4 h-4 text-indigo-400" />
                <span>My Assigned Cases</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/projects")}
                className="text-xs text-blue-300 hover:text-amber-300 hover:bg-blue-900/40 p-0 h-auto font-medium"
              >
                View All Cases →
              </Button>
            </div>

            <p className="text-[11px] text-blue-300/70 leading-snug">
              Snapshot of students under your direct stewardship. Full student directory remains fully accessible.
            </p>

            <div className="space-y-2 pt-1">
              {[
                { name: "Alex P.", initials: "AP", milestone: "IEP Annual Meeting 9/15", status: "Active" },
                { name: "Bella R.", initials: "BR", milestone: "Records Review & IEP Audit", status: "Active" },
                { name: "Chris T.", initials: "CT", milestone: "Parent Input Draft in Progress", status: "Active" },
                { name: "Jordan M.", initials: "JM", milestone: "Post-Evaluation Follow-Up", status: "Active" },
                { name: "Taylor S.", initials: "TS", milestone: "PWN Clarification Request", status: "Active" },
              ].map((c, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setLocation("/projects")}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-blue-950/40 border border-blue-800/40 text-xs hover:border-indigo-400/50 hover:bg-blue-900/30 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-indigo-950 border border-indigo-700/60 text-indigo-300 font-bold flex items-center justify-center text-[10px] shrink-0">
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
          </Card>

        </div>

        {/* ══ COLUMN 3: Quick Actions, Team Notices & Training ══ */}
        <div className="space-y-6">

          {/* Quick Actions Grid */}
          <Card className="rounded-3xl border border-blue-900/60 bg-[#061830] p-6 shadow-xl space-y-4">
            <div className="text-white font-bold text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Quick Actions</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <Button
                variant="outline"
                onClick={() => setTimeOffModalOpen(true)}
                className="h-auto flex-col py-3 px-2 border-blue-800/60 hover:border-amber-400/60 hover:bg-blue-900/40 text-left items-start rounded-xl gap-1 cursor-pointer"
              >
                <Plane className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white">Request Time Off</span>
                <span className="text-[10px] text-blue-300/70">Submit leave</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => setLocation("/calendar")}
                className="h-auto flex-col py-3 px-2 border-blue-800/60 hover:border-sky-400/60 hover:bg-blue-900/40 text-left items-start rounded-xl gap-1 cursor-pointer"
              >
                <CalendarClock className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold text-white">My Calendar</span>
                <span className="text-[10px] text-blue-300/70">View schedule</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => setTaskModalOpen(true)}
                className="h-auto flex-col py-3 px-2 border-blue-800/60 hover:border-emerald-400/60 hover:bg-blue-900/40 text-left items-start rounded-xl gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">Add Task</span>
                <span className="text-[10px] text-blue-300/70">New assignment</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => setLocation("/projects")}
                className="h-auto flex-col py-3 px-2 border-blue-800/60 hover:border-indigo-400/60 hover:bg-blue-900/40 text-left items-start rounded-xl gap-1 cursor-pointer"
              >
                <GraduationCap className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-white">My Cases</span>
                <span className="text-[10px] text-blue-300/70">Open student list</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => setLocation("/knowledge-base")}
                className="h-auto flex-col py-3 px-2 border-blue-800/60 hover:border-amber-400/60 hover:bg-blue-900/40 text-left items-start rounded-xl gap-1 cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white">Field Guide</span>
                <span className="text-[10px] text-blue-300/70">SOP & procedures</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => setLocation("/first-mate")}
                className="h-auto flex-col py-3 px-2 border-blue-800/60 hover:border-purple-400/60 hover:bg-blue-900/40 text-left items-start rounded-xl gap-1 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-white">First Mate</span>
                <span className="text-[10px] text-blue-300/70">Live copilot</span>
              </Button>
            </div>
          </Card>

          {/* Company Announcements */}
          <Card className="rounded-3xl border border-blue-900/60 bg-[#061830] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Megaphone className="w-4 h-4 text-amber-400" />
                <span>Company Announcements</span>
              </div>
              <span className="text-[11px] text-blue-300/70">Staff Bulletin</span>
            </div>

            <div className="space-y-3 pt-1">
              {[
                {
                  title: "Office Closed — Friday, Sept 20",
                  body: "In observance of our bi-annual staff professional advocacy training day.",
                  date: "Sept 9",
                  icon: Calendar,
                  iconColor: "text-amber-400 bg-amber-400/10",
                },
                {
                  title: "New Training Module Released",
                  body: "IEP Meeting Best Practices & Prior Written Notice (PWN) Strategies is now live.",
                  date: "Sept 8",
                  icon: BookOpen,
                  iconColor: "text-sky-400 bg-sky-400/10",
                },
                {
                  title: "Welcome to the Team!",
                  body: "Please join us in welcoming our newest advocate to the Waypoint family.",
                  date: "Sept 5",
                  icon: Award,
                  iconColor: "text-emerald-400 bg-emerald-400/10",
                },
              ].map((ann, idx) => (
                <div key={idx} className="flex items-start gap-3 p-2.5 rounded-xl bg-blue-950/40 border border-blue-800/40 text-xs">
                  <div className={`p-2 rounded-xl shrink-0 ${ann.iconColor}`}>
                    <ann.icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-white truncate pr-2">{ann.title}</div>
                      <span className="text-[10px] font-mono text-blue-300/60 shrink-0">{ann.date}</span>
                    </div>
                    <div className="text-[11px] text-blue-200/75 leading-relaxed">{ann.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Training & Internal Resources */}
          <Card className="rounded-3xl border border-blue-900/60 bg-[#061830] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <BookOpen className="w-4 h-4 text-sky-400" />
                <span>Training &amp; Resources</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/knowledge-base")}
                className="text-xs text-blue-300 hover:text-amber-300 hover:bg-blue-900/40 p-0 h-auto font-medium"
              >
                Browse All →
              </Button>
            </div>

            <div className="space-y-2 pt-1">
              {[
                { title: "Waypoint Field Guide", desc: "Your step-by-step master coaching handbook", path: "/knowledge-base" },
                { title: "Standard Operating Procedures (SOP)", desc: "Office processes, deadlines & intake rules", path: "/walkthroughs" },
                { title: "Phone Scripts & Family Outreach", desc: "Ready-to-use communication templates", path: "/templates" },
                { title: "Training Modules", desc: "Professional development & IDEA compliance", path: "/knowledge-base" },
              ].map((res, idx) => (
                <div
                  key={idx}
                  onClick={() => setLocation(res.path)}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-blue-950/40 border border-blue-800/40 hover:border-sky-400/50 hover:bg-blue-900/30 transition-all cursor-pointer text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-bold text-white truncate">{res.title}</div>
                    <div className="text-[10px] text-blue-300/70 truncate">{res.desc}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-blue-400/60 shrink-0" />
                </div>
              ))}
            </div>
          </Card>

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
