/**
 * Crew Quarters — PG-038
 * Personalized Employee Home Base & Operational Hub
 * Authentic Waypoint dark navy design language with gold accents & subtle nautical textures.
 */

import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { ScopedErrorBoundary } from "@/components/ScopedErrorBoundary";
import PageIdBadge from "@/components/PageIdBadge";
import { resolveCrewQuartersTabId, broadcastPageId } from "@/lib/pageIdRegistry";
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
  CalendarCheck,
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
  LayoutDashboard,
  UserPlus,
  Mail,
  Palmtree,
  Timer,
  CreditCard,
  Laptop,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";
import CrewMessagesWorkspace from "@/components/crew-quarters/CrewMessagesWorkspace";
import CrewMessagesOverviewWidget from "@/components/crew-quarters/CrewMessagesOverviewWidget";
import EmployeeAvailabilityTab from "@/components/crew-quarters/EmployeeAvailabilityTab";
import EmployeeTimeOffTab from "@/components/crew-quarters/EmployeeTimeOffTab";
import EmployeeTimesheetTab from "@/components/crew-quarters/EmployeeTimesheetTab";
import EmployeeProfileTab from "@/components/crew-quarters/EmployeeProfileTab";
import EmployeePayrollTab from "@/components/crew-quarters/EmployeePayrollTab";
import EmployeeEquipmentTab from "@/components/crew-quarters/EmployeeEquipmentTab";
import NotesWorkspace from "@/components/braindump/NotesWorkspace";
import CrewQuartersAnimatedHeader from "@/components/crew-quarters/CrewQuartersAnimatedHeader";

interface TimeOffRequest {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  returnDate?: string;
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
    returnDate: "Oct 13, 2026",
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
    returnDate: "Nov 30, 2026",
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
    returnDate: "Dec 24, 2026",
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
  const { data: leads = [] } = trpc.leads.list.useQuery(undefined, { enabled: !!user });
  const { data: unreadMessages = [] } = trpc.messages.unread.useQuery(undefined, { enabled: !!user });
  const { data: crewStats } = trpc.crewMessages.getOverviewStats.useQuery(undefined, { enabled: !!user });
  const crewUnreadTotal = crewStats?.unreadTotal || 0;

  // Internal navigation tabs (Overview · Crew Messages · My Tasks · Team Schedule · Resources)
  const getInitialTab = () => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("tab") || "overview";
    }
    return "overview";
  };

  const getInitialConvId = () => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const c = params.get("conversationId");
      return c ? Number(c) : null;
    }
    return null;
  };

  const [currentTab, setCurrentTab] = useState<string>(getInitialTab);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(getInitialConvId);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setCurrentTab(params.get("tab") || "overview");
      const c = params.get("conversationId");
      setSelectedConversationId(c ? Number(c) : null);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleTabChange = (tab: string, convId?: number | null) => {
    setCurrentTab(tab);
    if (convId !== undefined) {
      setSelectedConversationId(convId);
    }

    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);
    if (convId) {
      params.set("conversationId", String(convId));
    } else {
      params.delete("conversationId");
    }
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState(null, "", newUrl);
  };

  // Broadcast specific sub-page ID whenever the tab switches (e.g. PG-038-MSG, PG-038-TSK)
  useEffect(() => {
    const tabInfo = resolveCrewQuartersTabId(currentTab);
    if (tabInfo) {
      broadcastPageId(tabInfo);
    } else {
      broadcastPageId({ id: "PG-038", name: "Crew Quarters" });
    }
  }, [currentTab]);

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
    returnDate: "",
    notes: "",
  });

  // Task Quick Add Modal
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"high" | "medium" | "low">("medium");
  const [taskFilter, setTaskFilter] = useState<"all" | "pending" | "completed">("all");

  const createTaskMutation = trpc.internalTasks.create.useMutation({
    onSuccess: () => {
      toast.success("Task added to your queue!");
      utils.internalTasks.list.invalidate();
      setTaskModalOpen(false);
      setNewTaskTitle("");
    },
    onError: (err) => toast.error("Failed to add task: " + err.message),
  });

  const updateTaskMutation = trpc.internalTasks.update.useMutation({
    onSuccess: () => {
      utils.internalTasks.list.invalidate();
    },
    onError: (err) => toast.error("Failed to update task: " + err.message),
  });

  const handleSaveTimeOff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!timeOffForm.startDate || !timeOffForm.endDate) {
      toast.error("Please provide both start and end dates.");
      return;
    }
    if (!timeOffForm.returnDate) {
      toast.error("Please specify when will be your first day back on the job after leave.");
      return;
    }

    const newReq: TimeOffRequest = {
      id: `to-${Date.now()}`,
      type: timeOffForm.type,
      startDate: timeOffForm.startDate,
      endDate: timeOffForm.endDate,
      returnDate: timeOffForm.returnDate,
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
    setTimeOffForm({ type: "Vacation", startDate: "", endDate: "", returnDate: "", notes: "" });
  };

  // Derive employee details
  const employeeName = user?.name || "Wyatt Smith";
  const firstName = employeeName.split(" ")[0] || "Advocate";
  const employeeRole = user?.role === "admin" ? "Lead Advocate / Practice Owner" : "Senior IEP Advocate";
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
  const newLeadsCount = (leads as any[]).filter((l) => l.status === "New").length;
  const dbUnreadCount = Array.isArray(unreadMessages) ? (unreadMessages as any[]).length : 0;
  const clientMessagesCount = dbUnreadCount;
  const newMessagesCount = dbUnreadCount > 0 ? dbUnreadCount : 1;

  return (
    <ScopedErrorBoundary moduleName="Crew Quarters">
      <div className="min-h-screen bg-[#07162B] [background:radial-gradient(ellipse_at_50%_0%,_#102B4E_0%,_#07162B_55%,_#030D1A_100%)] text-[#FFF4D4] pb-12 flex flex-col">
        {/* ── Top Header Panoramic Observation Window (Animated & Interactive) ── */}
        <CrewQuartersAnimatedHeader />

        {/* ── Main UI Deck (All UI Below the Header Window) ── */}
        <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto w-full flex-1">
          {/* ── Top Header & Personalized Welcome Banner ── */}
          <div className="relative overflow-hidden rounded-3xl border border-[#3A2C18] bg-[#05142B]/90 shadow-[0_15px_45px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] p-6 sm:p-8">
          {/* Subtle bathymetric wave texture */}
          <div
            className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-20 mix-blend-screen"
            style={{ backgroundImage: `url('/waypoint-wave-bg.jpg')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#05142B] via-[#071F3D]/85 to-[#05142B]/90 pointer-events-none" />
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#C5A059]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-[#0F2D54]/30 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3">
              {/* Crew Quarters Pill & Page ID */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#020A17] border border-[#3A2C18] text-[#FFE394] text-xs font-bold tracking-wider uppercase font-mono">
                  <LighthouseCottageIcon className="w-4 h-4 text-[#C5A059] shrink-0" />
                  <span>Crew Quarters</span>
                </div>
                <PageIdBadge
                  id={resolveCrewQuartersTabId(currentTab)?.id || "PG-038"}
                  name={resolveCrewQuartersTabId(currentTab)?.name || "Crew Quarters"}
                  inline
                />
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>On Duty</span>
                </div>
              </div>

              {/* Personalized Welcome Headline */}
              <div>
                <h1 className="text-2xl sm:text-4xl font-serif text-[#FFF4D4] font-normal tracking-wide">
                  Good morning, <span className="font-serif italic font-bold text-[#FFE394]">{firstName}!</span>
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <WaypointWaveIcon className="w-9 h-2.5 text-[#C5A059] shrink-0" />
                  <p className="text-xs sm:text-sm text-[#C6B697] font-medium">
                    Same Mission. Stronger Together. Here's what's on deck today.
                  </p>
                </div>
              </div>
            </div>

            {/* Employee Identity & Inspirational Motto Ribbon */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Mission Quote */}
              <div className="hidden xl:flex flex-col text-right border-r border-[#3A2C18]/60 pr-5">
                <span className="text-xs italic text-[#C6B697] font-serif">
                  &ldquo;Different abilities. Brighter futures.&rdquo;
                </span>
                <span className="text-[10px] text-[#C5A059] font-semibold tracking-wider uppercase mt-0.5 font-mono">
                  Waypoint Core Creed
                </span>
              </div>

              {/* Date & Day Badge */}
              <div className="flex items-center gap-3 bg-[#020A17]/85 backdrop-blur-md border border-[#3A2C18] rounded-2xl p-3 shadow-lg">
                <div className="p-2.5 rounded-xl bg-[#07162B] text-[#C5A059] border border-[#3A2C18] shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-2.5 pr-2">
                  <span className="text-2xl sm:text-3xl font-black text-[#FFF4D4] font-mono leading-none">
                    {new Date().getDate()}
                  </span>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-[#FFF4D4] leading-tight font-serif">
                      {new Date().toLocaleDateString(undefined, { weekday: "long" })}
                    </span>
                    <span className="text-[11px] font-medium text-[#C6B697] leading-tight">
                      {new Date().toLocaleDateString(undefined, { month: "short" })}
                    </span>
                  </div>
                </div>

                {/* Employee Name */}
                <div className="pl-3.5 border-l border-[#3A2C18]/60 flex items-center">
                  <span className="text-sm font-serif font-bold text-[#FFF4D4] tracking-wide whitespace-nowrap">
                    {employeeName}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Top Operational Metric Blocks (6 Metric Cards) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
          
          {/* Card 1: New Leads */}
          <div 
            onClick={() => setLocation("/leads")}
            className="group cursor-pointer relative overflow-hidden rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 hover:border-[#C5A059]/80 px-2 sm:px-2.5 py-3.5 sm:py-4 transition-all duration-300 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] hover:shadow-[0_10px_35px_rgba(197,160,89,0.25)] flex flex-col justify-between min-h-[125px] sm:min-h-[135px]"
          >
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#C5A059]/10 rounded-full blur-2xl pointer-events-none group-hover:bg-[#C5A059]/20 transition-all duration-300" />
            
            {/* Top Left Tiny Icon */}
            <div className="relative z-10 flex items-center justify-between w-full">
              <div className="p-1 sm:p-1.5 rounded-lg bg-[#020A17] text-[#C5A059] border border-[#3A2C18] shrink-0 group-hover:scale-105 transition-transform">
                <UserPlus className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Centered Huge Number */}
            <div className="flex-1 flex items-center justify-center my-1 relative z-10">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-serif font-black text-[#FFF4D4] leading-none tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
                {newLeadsCount}
              </div>
            </div>

            {/* Full Text at Bottom */}
            <div className="relative z-10 text-center text-[11px] sm:text-xs xl:text-[13px] font-semibold text-[#C6B697] group-hover:text-[#FFF4D4] transition-colors tracking-tight whitespace-nowrap">
              New Leads
            </div>
          </div>

          {/* Card 2: Meetings Today */}
          <div 
            onClick={() => setLocation("/calendar?view=day&date=today&scope=my")}
            className="group cursor-pointer relative overflow-hidden rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 hover:border-[#C5A059]/80 px-2 sm:px-2.5 py-3.5 sm:py-4 transition-all duration-300 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] hover:shadow-[0_10px_35px_rgba(197,160,89,0.25)] flex flex-col justify-between min-h-[125px] sm:min-h-[135px]"
          >
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#C5A059]/10 rounded-full blur-2xl pointer-events-none group-hover:bg-[#C5A059]/20 transition-all duration-300" />
            
            {/* Top Left Tiny Icon */}
            <div className="relative z-10 flex items-center justify-between w-full">
              <div className="p-1 sm:p-1.5 rounded-lg bg-[#020A17] text-[#C5A059] border border-[#3A2C18] shrink-0 group-hover:scale-105 transition-transform">
                <Calendar className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Centered Huge Number */}
            <div className="flex-1 flex items-center justify-center my-1 relative z-10">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-serif font-black text-[#FFF4D4] leading-none tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
                {todayAppointments.length || 2}
              </div>
            </div>

            {/* Full Text at Bottom */}
            <div className="relative z-10 text-center text-[11px] sm:text-xs xl:text-[13px] font-semibold text-[#C6B697] group-hover:text-[#FFF4D4] transition-colors tracking-tight whitespace-nowrap">
              Meetings Today
            </div>
          </div>

          {/* Card 3: Client Emails */}
          <div 
            onClick={() => setLocation("/messages")}
            className="group cursor-pointer relative overflow-hidden rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 hover:border-[#C5A059]/80 px-2 sm:px-2.5 py-3.5 sm:py-4 transition-all duration-300 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] hover:shadow-[0_10px_35px_rgba(197,160,89,0.25)] flex flex-col justify-between min-h-[125px] sm:min-h-[135px]"
          >
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#C5A059]/10 rounded-full blur-2xl pointer-events-none group-hover:bg-[#C5A059]/20 transition-all duration-300" />
            
            {/* Top Left Tiny Icon */}
            <div className="relative z-10 flex items-center justify-between w-full">
              <div className="p-1 sm:p-1.5 rounded-lg bg-[#020A17] text-[#C5A059] border border-[#3A2C18] shrink-0 group-hover:scale-105 transition-transform">
                <Mail className="w-3.5 h-3.5" />
              </div>
              {clientMessagesCount > 0 && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C5A059] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FFE394]" />
                </span>
              )}
            </div>

            {/* Centered Huge Number */}
            <div className="flex-1 flex items-center justify-center my-1 relative z-10">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-serif font-black text-[#FFF4D4] leading-none tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
                {clientMessagesCount}
              </div>
            </div>

            {/* Full Text at Bottom */}
            <div className="relative z-10 text-center text-[11px] sm:text-xs xl:text-[13px] font-semibold text-[#C6B697] group-hover:text-[#FFF4D4] transition-colors tracking-tight whitespace-nowrap">
              Client Emails
            </div>
          </div>

          {/* Card 4: Tasks Due */}
          <div 
            onClick={() => handleTabChange("tasks")}
            className="group cursor-pointer relative overflow-hidden rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 hover:border-[#C5A059]/80 px-2 sm:px-2.5 py-3.5 sm:py-4 transition-all duration-300 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] hover:shadow-[0_10px_35px_rgba(197,160,89,0.25)] flex flex-col justify-between min-h-[125px] sm:min-h-[135px]"
          >
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#C5A059]/10 rounded-full blur-2xl pointer-events-none group-hover:bg-[#C5A059]/20 transition-all duration-300" />
            
            {/* Top Left Tiny Icon */}
            <div className="relative z-10 flex items-center justify-between w-full">
              <div className="p-1 sm:p-1.5 rounded-lg bg-[#020A17] text-[#C5A059] border border-[#3A2C18] shrink-0 group-hover:scale-105 transition-transform">
                <CheckSquare className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Centered Huge Number */}
            <div className="flex-1 flex items-center justify-center my-1 relative z-10">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-serif font-black text-[#FFF4D4] leading-none tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
                {openTasks.length || 4}
              </div>
            </div>

            {/* Full Text at Bottom */}
            <div className="relative z-10 text-center text-[11px] sm:text-xs xl:text-[13px] font-semibold text-[#C6B697] group-hover:text-[#FFF4D4] transition-colors tracking-tight whitespace-nowrap">
              Tasks Due
            </div>
          </div>

          {/* Card 5: Crew Messages */}
          <div 
            onClick={() => handleTabChange("messages")}
            className="group cursor-pointer relative overflow-hidden rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 hover:border-[#C5A059]/80 px-2 sm:px-2.5 py-3.5 sm:py-4 transition-all duration-300 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] hover:shadow-[0_10px_35px_rgba(197,160,89,0.25)] flex flex-col justify-between min-h-[125px] sm:min-h-[135px]"
          >
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#C5A059]/10 rounded-full blur-2xl pointer-events-none group-hover:bg-[#C5A059]/20 transition-all duration-300" />
            
            {/* Top Left Tiny Icon */}
            <div className="relative z-10 flex items-center justify-between w-full">
              <div className="p-1 sm:p-1.5 rounded-lg bg-[#020A17] text-[#C5A059] border border-[#3A2C18] shrink-0 group-hover:scale-105 transition-transform">
                <MessageSquare className="w-3.5 h-3.5" />
              </div>
              {crewUnreadTotal > 0 && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C5A059] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FFE394]" />
                </span>
              )}
            </div>

            {/* Centered Huge Number */}
            <div className="flex-1 flex items-center justify-center my-1 relative z-10">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-serif font-black text-[#FFF4D4] leading-none tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
                {crewUnreadTotal > 0 ? crewUnreadTotal : (newMessagesCount || 0)}
              </div>
            </div>

            {/* Full Text at Bottom */}
            <div className="relative z-10 text-center text-[11px] sm:text-xs xl:text-[13px] font-semibold text-[#C6B697] group-hover:text-[#FFF4D4] transition-colors tracking-tight whitespace-nowrap">
              Crew Messages
            </div>
          </div>

          {/* Card 6: Waypoint Motto Tile — Admiralty Bathymetric Chart & Gold Typography */}
          <div className="col-span-1 relative rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 p-4 sm:p-5 flex items-center justify-between overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] group hover:border-[#C5A059]/80 transition-all duration-300 min-h-[125px] sm:min-h-[135px]">
            {/* Bathymetric Contours in Aged Brass */}
            <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden opacity-30">
              <svg viewBox="0 0 300 120" fill="none" className="absolute inset-0 w-full h-full object-cover" preserveAspectRatio="none">
                <path d="M-10 125 C 20 120, 35 105, 55 98 C 80 90, 105 106, 140 100 C 180 94, 220 106, 310 98" stroke="#C5A059" strokeWidth="0.75" />
                <path d="M-10 110 C 24 104, 42 90, 65 83 C 92 75, 120 92, 158 85 C 200 78, 240 93, 310 84" stroke="#DFBE77" strokeWidth="0.85" />
                <path d="M-10 94 C 28 86, 50 74, 76 66 C 106 58, 136 76, 178 69 C 220 62, 260 79, 310 70" stroke="#FFE394" strokeWidth="0.95" />
                <path d="M-10 77 C 32 68, 58 56, 88 48 C 121 40, 154 60, 198 53 C 240 46, 280 65, 310 56" stroke="#C5A059" strokeWidth="0.85" />
                <path d="M-10 59 C 36 49, 66 38, 100 30 C 136 22, 171 43, 218 36 C 260 29, 295 48, 310 42" stroke="#3A2C18" strokeWidth="0.65" />
              </svg>
            </div>

            {/* Right-Aligned Stacked Gold Typography + Accent Bar */}
            <div className="relative z-10 ml-auto flex flex-col items-end text-right select-none pl-4">
              <div className="text-[13px] sm:text-[14px] font-serif font-black tracking-[0.2em] text-[#FFF4D4] leading-[1.35] drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
                <div>ADVOCACY</div>
                <div>CHANGES</div>
                <div>LIVES</div>
              </div>
              <div className="w-9 h-[2.5px] bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] rounded-full mt-2 shadow-[0_0_10px_rgba(197,160,89,0.8)]" />
            </div>
          </div>
        </div>

      {/* ── Internal Tab Navigation Bar: Double Bar (Team Operations + Employee Self-Service) ── */}
      <div className="w-full flex flex-col p-1.5 sm:p-2 bg-[#05142B]/95 border border-[#3A2C18] rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] gap-1.5 mb-6 relative overflow-hidden">
        {/* Top subtle golden accent shimmer line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#C5A059]/60 to-transparent pointer-events-none" />

        {/* Row 1: Team & Daily Operations */}
        <div className="flex items-center justify-between gap-1 sm:gap-1.5 w-full relative z-10 overflow-x-auto pb-0.5">
          <div className="flex items-center gap-1 sm:gap-1.5 flex-1 min-w-0">
            <span className="hidden xl:inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest text-[#C5A059] bg-[#020A17] border border-[#3A2C18] shrink-0 mr-1 select-none font-mono">
              Team Ops
            </span>
            {[
              { id: "overview", label: "Overview", icon: LayoutDashboard },
              { id: "messages", label: "Crew Messages", icon: MessageSquare, badge: crewUnreadTotal },
              { id: "tasks", label: "My Tasks", icon: CheckSquare, badge: openTasks.length },
              { id: "schedule", label: "Team Schedule", icon: Calendar },
              { id: "resources", label: "Resources", icon: BookOpen },
            ].map((tab) => {
              const isActive = currentTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex-1 min-w-0 h-8 sm:h-9 px-2 sm:px-3 py-1 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 sm:gap-2 transition-all duration-150 cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-[0_3px_10px_rgba(0,0,0,0.8)] border border-[#FFE394]/50 font-bold"
                      : "text-[#D8C7A5] hover:text-[#FFF4D4] hover:bg-[#07162B] border border-transparent"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-[#07162B]" : "text-[#C5A059]"}`} />
                  <span className="truncate">{tab.label}</span>
                  {Boolean(tab.badge && tab.badge > 0) && (
                    <span
                      className={`ml-0.5 text-[10px] font-black px-1.5 py-0.2 rounded-full leading-tight shrink-0 ${
                        isActive
                          ? "bg-[#07162B] text-[#FFE394] border border-[#3A2C18]"
                          : "bg-[#020A17] text-[#FFE394] border border-[#3A2C18]"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {currentTab === "overview" && (
            <Button
              size="sm"
              onClick={() => handleTabChange("messages")}
              className="hidden lg:flex items-center gap-1.5 border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] text-xs font-semibold rounded-xl px-3 py-1.5 h-8 cursor-pointer shadow-sm transition-all shrink-0 ml-1"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
              <span>Messages</span>
              <ArrowRight className="w-3 h-3 shrink-0" />
            </Button>
          )}
        </div>

        {/* Row 2: Employee Self-Service & Personal Management */}
        <div className="flex items-center justify-between gap-1 sm:gap-1.5 w-full pt-1.5 border-t border-[#3A2C18]/60 relative z-10 overflow-x-auto">
          <div className="flex items-center gap-1 sm:gap-1.5 w-full">
            <span className="hidden xl:inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest text-[#FFE394] bg-[#020A17] border border-[#3A2C18] shrink-0 mr-1 select-none font-mono">
              Employee Hub
            </span>
            {[
              { id: "notes", label: "My Notes", icon: Lightbulb },
              { id: "availability", label: "My Availability", icon: Clock },
              { id: "time-off", label: "Time Off & PTO", icon: Palmtree },
              { id: "timesheet", label: "My Timesheet", icon: Timer },
              { id: "profile", label: "Profile & Credentials", icon: Award },
              { id: "payroll", label: "Payroll & Direct Deposit", icon: CreditCard },
              { id: "equipment", label: "Equipment & Tech", icon: Laptop },
            ].map((tab) => {
              const isActive = currentTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex-1 min-w-0 h-8 sm:h-9 px-2 sm:px-3 py-1 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 sm:gap-2 transition-all duration-150 cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-[0_3px_10px_rgba(0,0,0,0.8)] border border-[#FFE394]/50 font-bold"
                      : "text-[#D8C7A5] hover:text-[#FFF4D4] hover:bg-[#07162B] border border-transparent"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-[#07162B]" : "text-[#C5A059]"}`} />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── TAB CONTENT 1: CREW MESSAGES WORKSPACE ── */}
      {currentTab === "messages" && (
        <div className="space-y-4">
          <CrewMessagesWorkspace initialConversationId={selectedConversationId} />
        </div>
      )}

      {/* ── TAB CONTENT 2: OVERVIEW DASHBOARD ── */}
      {currentTab === "overview" && (
        <div className="space-y-8">

      {/* ── ROW 2: Today's Schedule · My Tasks · Quick Actions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">

        {/* Card 2A: Today's Schedule */}
        <Card className="rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 p-5 sm:p-6 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] flex flex-col justify-between h-full space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#3A2C18]/60">
              <div className="flex items-center gap-2 text-[#FFF4D4] font-serif font-bold text-sm sm:text-base">
                <Calendar className="w-4 h-4 text-[#C5A059]" />
                <span>Today's Schedule</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/calendar")}
                className="text-xs text-[#C6B697] hover:text-[#FFF4D4] hover:bg-[#07162B] p-0 h-auto font-medium"
              >
                View Calendar →
              </Button>
            </div>

            <div className="space-y-2.5 pt-3">
              {[
                { time: "9:00 AM", title: "Team Check-In", subtitle: "Virtual Meeting", dot: "bg-[#C5A059]" },
                { time: "10:30 AM", title: "IEP Meeting — Jackson R.", subtitle: "Riverside School", dot: "bg-[#FFE394]" },
                { time: "1:00 PM", title: "Callback — Parent (M. Carter)", subtitle: "Discuss assessment results", dot: "bg-emerald-400" },
                { time: "3:00 PM", title: "Records Review", subtitle: "Johnson Case", dot: "bg-[#DFBE77]" },
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-2.5 rounded-xl bg-[#020A17]/85 hover:bg-[#07162B] transition-colors border border-[#3A2C18] hover:border-[#C5A059]/60">
                  <div className="w-16 text-right shrink-0 pt-0.5">
                    <span className="text-xs font-mono font-bold text-[#FFE394]">{item.time}</span>
                  </div>
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className={`w-2 h-2 rounded-full ${item.dot} mt-1.5 shrink-0 shadow-sm`} />
                    <div className="min-w-0">
                      <div className="text-xs font-serif font-bold text-[#FFF4D4] truncate">{item.title}</div>
                      <div className="text-[11px] text-[#C6B697] truncate">{item.subtitle}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-[#3A2C18]/60 flex items-center justify-between text-[11px] text-[#C6B697]">
            <span>4 events scheduled</span>
            <span className="text-[#FFE394] font-mono">Next: 10:30 AM</span>
          </div>
        </Card>

        {/* Card 2B: My Tasks */}
        <Card className="rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 p-5 sm:p-6 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] flex flex-col justify-between h-full space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#3A2C18]/60">
              <div className="flex items-center gap-2 text-[#FFF4D4] font-serif font-bold text-sm sm:text-base">
                <CheckSquare className="w-4 h-4 text-[#C5A059]" />
                <span>My Tasks</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/tasks")}
                className="text-xs text-[#C6B697] hover:text-[#FFF4D4] hover:bg-[#07162B] p-0 h-auto font-medium"
              >
                View All →
              </Button>
            </div>

            <div className="space-y-2 pt-3">
              {[
                { title: "Complete draft of Parent Concerns", tag: "High", tagColor: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
                { title: "Follow up with SLP", tag: "Today", tagColor: "bg-[#C5A059]/20 text-[#FFE394] border-[#C5A059]/40" },
                { title: "Send meeting summary to parent", tag: "Today", tagColor: "bg-[#C5A059]/20 text-[#FFE394] border-[#C5A059]/40" },
                { title: "Review evaluation documents", tag: "Tomorrow", tagColor: "bg-[#020A17] text-[#D8C7A5] border-[#3A2C18]" },
                { title: "Prepare for IEP meeting", tag: "Tomorrow", tagColor: "bg-[#020A17] text-[#D8C7A5] border-[#3A2C18]" },
              ].map((task, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-[#020A17]/85 border border-[#3A2C18] text-xs hover:border-[#C5A059]/50 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <input type="checkbox" className="rounded border-[#3A2C18] bg-[#020A17] text-[#C5A059] focus:ring-[#C5A059] h-3.5 w-3.5" />
                    <span className="text-[#FFF4D4] truncate font-medium">{task.title}</span>
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
              className="w-full border border-[#3A2C18] bg-[#020A17] hover:bg-[#07162B] text-[#D8C7A5] hover:text-[#FFF4D4] text-xs rounded-xl py-2 gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Add Task</span>
            </Button>
          </div>
        </Card>

        {/* Card 2C: Quick Actions Grid */}
        <Card className="rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 p-5 sm:p-6 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] flex flex-col justify-between h-full space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#3A2C18]/60">
              <div className="flex items-center gap-2 text-[#FFF4D4] font-serif font-bold text-sm sm:text-base">
                <Sparkles className="w-4 h-4 text-[#C5A059]" />
                <span>Quick Actions</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3">
              <Button
                variant="outline"
                onClick={() => setTimeOffModalOpen(true)}
                className="h-[84px] flex-col py-3 px-2 border-[#3A2C18] bg-[#020A17]/85 hover:border-[#C5A059]/60 hover:bg-[#07162B] text-center items-center justify-center rounded-xl gap-1.5 cursor-pointer transition-all"
              >
                <Calendar className="w-5 h-5 text-[#C5A059]" />
                <span className="text-xs font-serif font-bold text-[#FFF4D4] leading-tight">Request<br />Time Off</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => setLocation("/calendar")}
                className="h-[84px] flex-col py-3 px-2 border-[#3A2C18] bg-[#020A17]/85 hover:border-[#C5A059]/60 hover:bg-[#07162B] text-center items-center justify-center rounded-xl gap-1.5 cursor-pointer transition-all"
              >
                <CalendarClock className="w-5 h-5 text-[#C5A059]" />
                <span className="text-xs font-serif font-bold text-[#FFF4D4] leading-tight">View<br />My Calendar</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => setTaskModalOpen(true)}
                className="h-[84px] flex-col py-3 px-2 border-[#3A2C18] bg-[#020A17]/85 hover:border-[#C5A059]/60 hover:bg-[#07162B] text-center items-center justify-center rounded-xl gap-1.5 cursor-pointer transition-all"
              >
                <CheckSquare className="w-5 h-5 text-[#C5A059]" />
                <span className="text-xs font-serif font-bold text-[#FFF4D4] leading-tight">Add Task</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => setLocation("/projects")}
                className="h-[84px] flex-col py-3 px-2 border-[#3A2C18] bg-[#020A17]/85 hover:border-[#C5A059]/60 hover:bg-[#07162B] text-center items-center justify-center rounded-xl gap-1.5 cursor-pointer transition-all"
              >
                <Users className="w-5 h-5 text-[#C5A059]" />
                <span className="text-xs font-serif font-bold text-[#FFF4D4] leading-tight">My Cases</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => toast.info("Team Messaging Console is active")}
                className="h-[84px] flex-col py-3 px-2 border-[#3A2C18] bg-[#020A17]/85 hover:border-[#C5A059]/60 hover:bg-[#07162B] text-center items-center justify-center rounded-xl gap-1.5 cursor-pointer transition-all"
              >
                <MessageSquare className="w-5 h-5 text-[#C5A059]" />
                <span className="text-xs font-serif font-bold text-[#FFF4D4] leading-tight">Team<br />Messages</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => setLocation("/knowledge-base")}
                className="h-[84px] flex-col py-3 px-2 border-[#3A2C18] bg-[#020A17]/85 hover:border-[#C5A059]/60 hover:bg-[#07162B] text-center items-center justify-center rounded-xl gap-1.5 cursor-pointer transition-all"
              >
                <BookOpen className="w-5 h-5 text-[#C5A059]" />
                <span className="text-xs font-serif font-bold text-[#FFF4D4] leading-tight">Training &amp;<br />Resources</span>
              </Button>
            </div>
          </div>

          <div className="pt-2 text-center text-[11px] text-[#A69371]">
            Quick employee utilities
          </div>
        </Card>

      </div>

      {/* ── ROW 3: Time Off · My Cases · Team Messages ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">

        {/* Card 3A: Time Off Center */}
        <Card className="rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 p-5 sm:p-6 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] flex flex-col justify-between h-full space-y-4 hover:border-[#C5A059]/60 transition-all">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#3A2C18]/60">
              <div className="flex items-center gap-2 text-[#FFF4D4] font-serif font-bold text-sm sm:text-base">
                <Plane className="w-4 h-4 text-[#C5A059]" />
                <span>Time Off</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTimeOffModalOpen(true)}
                className="text-xs text-[#C6B697] hover:text-[#FFE394] hover:bg-[#07162B] p-0 h-auto font-medium"
              >
                View All →
              </Button>
            </div>

            {/* Request Time Off Action Button */}
            <div className="pt-3 pb-2">
              <Button
                onClick={() => setTimeOffModalOpen(true)}
                className="w-full bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:from-[#FFE394] hover:to-[#DFBE77] text-[#07162B] font-bold text-xs rounded-xl py-2.5 shadow-[0_3px_10px_rgba(0,0,0,0.8)] border border-[#FFE394]/50 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Request Time Off</span>
              </Button>
            </div>

            {/* Upcoming Time Off */}
            <div className="space-y-2 pt-1">
              <div className="text-[11px] font-mono font-semibold text-[#A69371] uppercase tracking-wider">
                Upcoming Time Off
              </div>
              <div className="space-y-2">
                {timeOffRequests.filter((r) => r.status === "Approved").length === 0 ? (
                  <div className="p-2.5 rounded-xl bg-[#020A17]/80 border border-[#3A2C18]/60 text-xs text-[#A69371] text-center">
                    No approved upcoming leave scheduled.
                  </div>
                ) : (
                  timeOffRequests.filter((r) => r.status === "Approved").slice(0, 2).map((r) => (
                    <div key={r.id} className="p-2.5 rounded-xl bg-[#020A17]/80 border border-[#3A2C18]/60 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#FFF4D4]">
                          {r.startDate}{r.endDate && r.endDate !== r.startDate ? ` – ${r.endDate}` : ""}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                          Approved
                        </span>
                      </div>
                      {r.returnDate && (
                        <div className="text-[10px] text-[#FFE394]/90 mt-1 flex items-center gap-1 font-mono">
                          <CalendarCheck className="w-3 h-3 text-[#C5A059] shrink-0" />
                          <span>First day back: <strong className="text-[#FFF4D4]">{r.returnDate}</strong></span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Pending Requests */}
            <div className="space-y-2 pt-3">
              <div className="text-[11px] font-mono font-semibold text-[#A69371] uppercase tracking-wider">
                Pending Requests
              </div>
              {timeOffRequests.filter((r) => r.status === "Pending").length === 0 ? (
                <div className="p-2.5 rounded-xl bg-[#020A17]/80 border border-[#3A2C18]/60 text-xs text-[#A69371] text-center">
                  No requests currently pending review.
                </div>
              ) : (
                timeOffRequests.filter((r) => r.status === "Pending").slice(0, 2).map((r) => (
                  <div key={r.id} className="p-2.5 rounded-xl bg-[#020A17]/80 border border-[#3A2C18]/60 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#FFF4D4]">
                        {r.startDate}{r.endDate && r.endDate !== r.startDate ? ` – ${r.endDate}` : ""}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#C5A059]/20 text-[#FFE394] border border-[#C5A059]/40 text-[10px] font-bold">
                        Pending
                      </span>
                    </div>
                    {r.returnDate && (
                      <div className="text-[10px] text-[#FFE394]/90 mt-1 flex items-center gap-1 font-mono">
                        <CalendarCheck className="w-3 h-3 text-[#C5A059] shrink-0" />
                        <span>First day back: <strong className="text-[#FFF4D4]">{r.returnDate}</strong></span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-[#3A2C18]/50 flex items-center justify-between text-[11px] text-[#A69371]">
            <span>Annual Allowance: 15 Days</span>
            <span className="text-emerald-400 font-mono font-semibold">11 Days Remaining</span>
          </div>
        </Card>

        {/* Card 3B: My Cases */}
        <Card className="rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 p-5 sm:p-6 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] flex flex-col justify-between h-full space-y-4 hover:border-[#C5A059]/60 transition-all">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#3A2C18]/60">
              <div className="flex items-center gap-2 text-[#FFF4D4] font-serif font-bold text-sm sm:text-base">
                <Users className="w-4 h-4 text-[#C5A059]" />
                <span>My Cases</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/projects")}
                className="text-xs text-[#C6B697] hover:text-[#FFE394] hover:bg-[#07162B] p-0 h-auto font-medium"
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
                  className="flex items-center justify-between p-2 rounded-xl bg-[#020A17]/80 border border-[#3A2C18]/60 text-xs hover:border-[#C5A059]/60 hover:bg-[#07162B] transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-[#05142B] border border-[#3A2C18] text-[#FFE394] font-bold flex items-center justify-center text-[10px] shrink-0 font-serif">
                      {c.initials}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-[#FFF4D4] truncate font-serif">{c.name}</div>
                      <div className="text-[10px] text-[#A69371] truncate">{c.milestone}</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold font-mono">
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 text-center text-[11px] text-[#A69371]">
            Primary caseload snapshot · All CRM students remain accessible
          </div>
        </Card>

        {/* Card 3C: Live Crew Messages Widget */}
        <CrewMessagesOverviewWidget
          onOpenCrewMessages={(convId) => handleTabChange("messages", convId)}
        />

      </div>

      {/* ── ROW 4: Company Announcements · Training & Resources · Waypoint Inspiration Card ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">

        {/* Card 4A: Company Announcements */}
        <Card className="rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 p-5 sm:p-6 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] flex flex-col justify-between h-full space-y-4 hover:border-[#C5A059]/60 transition-all">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#3A2C18]/60">
              <div className="flex items-center gap-2 text-[#FFF4D4] font-serif font-bold text-sm sm:text-base">
                <Megaphone className="w-4 h-4 text-[#C5A059]" />
                <span>Company Announcements</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toast.info("Viewing all announcements")}
                className="text-xs text-[#C6B697] hover:text-[#FFE394] hover:bg-[#07162B] p-0 h-auto font-medium"
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
                  iconColor: "text-[#FFE394] bg-[#020A17] border border-[#3A2C18]",
                },
                {
                  title: "New Training Module",
                  desc: "IEP Meeting Best Practices is now available.",
                  date: "Sept 8",
                  icon: BookOpen,
                  iconColor: "text-[#C5A059] bg-[#020A17] border border-[#3A2C18]",
                },
                {
                  title: "Welcome to the Team!",
                  desc: "Please join us in welcoming our newest advocate!",
                  date: "Sept 5",
                  icon: Megaphone,
                  iconColor: "text-emerald-400 bg-[#020A17] border border-[#3A2C18]",
                },
              ].map((ann, idx) => (
                <div key={idx} className="flex items-start gap-3 p-2.5 rounded-xl bg-[#020A17]/80 border border-[#3A2C18]/60 text-xs">
                  <div className={`p-2 rounded-xl shrink-0 ${ann.iconColor}`}>
                    <ann.icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 space-y-0.5 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-[#FFF4D4] truncate pr-2 font-serif">{ann.title}</div>
                      <span className="text-[10px] font-mono text-[#A69371] shrink-0">{ann.date}</span>
                    </div>
                    <div className="text-[11px] text-[#C6B697] leading-relaxed">{ann.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 text-center text-[11px] text-[#A69371]">
            Waypoint Practice News &amp; Updates
          </div>
        </Card>

        {/* Card 4B: Training & Resources */}
        <Card className="rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 p-5 sm:p-6 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] flex flex-col justify-between h-full space-y-4 hover:border-[#C5A059]/60 transition-all">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#3A2C18]/60">
              <div className="flex items-center gap-2 text-[#FFF4D4] font-serif font-bold text-sm sm:text-base">
                <BookOpen className="w-4 h-4 text-[#C5A059]" />
                <span>Training &amp; Resources</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/knowledge-base")}
                className="text-xs text-[#C6B697] hover:text-[#FFE394] hover:bg-[#07162B] p-0 h-auto font-medium"
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
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#020A17]/80 border border-[#3A2C18]/60 hover:border-[#C5A059]/60 hover:bg-[#07162B] transition-all cursor-pointer text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <res.icon className="w-4 h-4 text-[#C5A059] shrink-0" />
                    <div className="min-w-0">
                      <div className="font-bold text-[#FFF4D4] truncate font-serif">{res.title}</div>
                      <div className="text-[10px] text-[#A69371] truncate">{res.desc}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#A69371] shrink-0" />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 text-center text-[11px] text-[#A69371]">
            Waypoint Advocates internal library
          </div>
        </Card>

        {/* Card 4C: Waypoint Inspiration Poster Tile — Vibrant Cinematic Lighthouse Theme */}
        <div className="rounded-2xl border border-[#3A2C18] bg-[#05142B] p-6 shadow-[0_12px_36px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.06)] hover:border-[#C5A059]/80 flex flex-col items-center justify-between text-center relative overflow-hidden h-full group min-h-[340px] transition-all">
          {/* Vibrant Cinematic Lighthouse Night Ocean Backdrop (Bright & Rich) */}
          <div
            className="absolute inset-0 bg-cover bg-[position:72%_center] brightness-[1.1] contrast-[1.08] saturate-[1.15] group-hover:scale-105 transition-transform duration-700 pointer-events-none"
            style={{ backgroundImage: "url('/lighthouse-night-bg.png')" }}
          />
          {/* Gentle, Transparent Edge Scrims (Preserves Picture Brightness) */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#05142B]/50 via-transparent to-[#020A17]/90 pointer-events-none" />

          {/* Upper Section: Elegant Script Typography */}
          <div className="relative z-10 pt-2 flex flex-col items-center">
            <h3 className="font-serif italic text-2xl sm:text-3xl text-[#FFF4D4] tracking-wide leading-snug drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
              The work<br />you do matters.
            </h3>
            <div className="w-12 h-[2.5px] bg-[#C5A059] rounded-full my-2.5 shadow-[0_0_12px_rgba(197,160,89,0.9)]" />
          </div>

          {/* Lower Section: Waypoint Lighthouse Emblem & Brand Wordmark */}
          <div className="relative z-10 pb-2 flex flex-col items-center">
            {/* Custom Golden Lighthouse Emblem (Replacing Mountains) */}
            <svg
              viewBox="0 0 70 55"
              className="w-14 h-11 text-[#C5A059] mb-1 drop-shadow-[0_0_12px_rgba(197,160,89,0.5)]"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="posterGoldRayLeft" x1="100%" y1="50%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#FFE394" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#C5A059" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="posterGoldRayRight" x1="0%" y1="50%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#FFE394" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#C5A059" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="posterTowerGold" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#DFBE77" />
                  <stop offset="45%" stopColor="#FFF4D4" />
                  <stop offset="100%" stopColor="#9E7D3B" />
                </linearGradient>
                <linearGradient id="posterBaseGold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#C5A059" />
                  <stop offset="100%" stopColor="#3A2C18" />
                </linearGradient>
              </defs>

              {/* Radiant Beacon Light Beams */}
              <path d="M28 15 L2 8 L5 21 Z" fill="url(#posterGoldRayLeft)" />
              <path d="M42 15 L68 8 L65 21 Z" fill="url(#posterGoldRayRight)" />

              {/* Lighthouse Cap & Spire */}
              <circle cx="35" cy="3.5" r="1.2" fill="#FFE394" />
              <rect x="34.4" y="3.5" width="1.2" height="3.5" fill="#C5A059" />
              <path d="M30.5 9 C30.5 6.5 39.5 6.5 39.5 9 L40.5 11 L29.5 11 Z" fill="#C5A059" />

              {/* Illuminated Lantern Room */}
              <rect x="29" y="11" width="12" height="7" rx="1" fill="#FFE394" />
              <rect x="31" y="11" width="1.2" height="7" fill="#3A2C18" />
              <rect x="37.8" y="11" width="1.2" height="7" fill="#3A2C18" />
              <line x1="27" y1="18" x2="43" y2="18" stroke="#9E7D3B" strokeWidth="1.6" strokeLinecap="round" />

              {/* Tapered Lighthouse Tower */}
              <polygon points="30,18 40,18 43,41 27,41" fill="url(#posterTowerGold)" />
              {/* Slit Windows */}
              <rect x="33.5" y="23" width="3" height="4" rx="1" fill="#020A17" />
              <rect x="33.5" y="32" width="3" height="4" rx="1" fill="#020A17" />

              {/* Stone Foundation Base & Coastline Rocks */}
              <polygon points="25,41 45,41 48,46 22,46" fill="url(#posterBaseGold)" />
              <path d="M12 50 C18 46 25 48 31 46 C38 44 45 47 58 49 C48 53 24 53 12 50 Z" fill="#C5A059" opacity="0.9" />
            </svg>

            {/* Typography */}
            <div className="text-sm font-serif font-black tracking-[0.25em] text-[#FFF4D4] uppercase drop-shadow-md">
              WAYPOINT
            </div>
            <div className="text-[9px] font-mono font-bold tracking-[0.22em] text-[#FFE394] uppercase mt-0.5">
              ADVOCACY · EDUCATION · RESULTS
            </div>
          </div>
        </div>

      </div>
        </div>
      )}

      {/* ── TAB CONTENT 3: MY TASKS ── */}
      {currentTab === "tasks" && (
        <div className="space-y-6">
          {/* Tasks Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#05142B]/90 border border-[#3A2C18] rounded-2xl p-5 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-[#C5A059]" />
                <h2 className="text-xl font-serif font-bold text-[#FFF4D4] tracking-wide">My Personal Task Queue</h2>
                <PageIdBadge id="PG-038-TSK" name="Crew Task Queue" inline />
              </div>
              <p className="text-xs text-[#C6B697]">
                Track personal advocacy milestones, IEP reviews, and action items across your caseload.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => setTaskModalOpen(true)}
                className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:from-[#FFE394] hover:to-[#DFBE77] text-[#07162B] font-bold text-xs rounded-xl py-2 px-3.5 gap-1.5 shadow-[0_3px_10px_rgba(0,0,0,0.8)] border border-[#FFE394]/50 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Task</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLocation("/tasks")}
                className="border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] text-xs rounded-xl py-2 px-3 cursor-pointer"
              >
                <span>Full Tasks Board →</span>
              </Button>
            </div>
          </div>

          {/* Task Filter Pills */}
          <div className="flex items-center gap-2">
            {[
              { id: "all", label: "All Tasks" },
              { id: "pending", label: "Pending" },
              { id: "completed", label: "Completed" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setTaskFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  taskFilter === f.id
                    ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold border-[#FFE394]/50 shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                    : "bg-[#020A17] border-[#3A2C18] text-[#C6B697] hover:text-[#FFF4D4] hover:bg-[#05142B]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Tasks List */}
          <div className="rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 p-5 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-3">
            {tasks.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <CheckSquare className="w-8 h-8 text-[#C5A059]/40 mx-auto" />
                <p className="text-sm font-serif font-semibold text-[#FFF4D4]">No tasks found</p>
                <p className="text-xs text-[#A69371]">Your task queue is clear! Click "Add Task" to record an action item.</p>
              </div>
            ) : (
              (tasks as any[])
                .filter((t) => {
                  if (taskFilter === "pending") return t.status !== "complete";
                  if (taskFilter === "completed") return t.status === "complete";
                  return true;
                })
                .map((task) => {
                  const isDone = task.status === "complete";
                  return (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#020A17]/80 border border-[#3A2C18]/60 hover:border-[#C5A059]/60 hover:bg-[#07162B] transition-all text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-3">
                        <input
                          type="checkbox"
                          checked={isDone}
                          onChange={(e) => {
                            updateTaskMutation.mutate({
                              id: task.id,
                              status: e.target.checked ? "complete" : "not_started",
                            });
                          }}
                          className="rounded border-[#3A2C18] bg-[#05142B] text-[#C5A059] focus:ring-[#C5A059] h-4 w-4 cursor-pointer accent-[#C5A059]"
                        />
                        <div className="min-w-0">
                          <span
                            className={`font-semibold text-sm ${
                              isDone ? "line-through text-[#A69371]/60" : "font-serif text-[#FFF4D4]"
                            }`}
                          >
                            {task.title}
                          </span>
                          {task.description && (
                            <p className="text-xs text-[#C6B697] truncate mt-0.5">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {task.priority && (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border font-mono ${
                              task.priority === "high"
                                ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                                : task.priority === "medium"
                                ? "bg-[#C5A059]/20 text-[#FFE394] border-[#C5A059]/40"
                                : "bg-[#0F2D54]/50 text-[#C6B697] border-[#3A2C18]"
                            }`}
                          >
                            {task.priority.toUpperCase()}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                            isDone
                              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                              : "bg-[#05142B] text-[#FFE394] border border-[#3A2C18]"
                          }`}
                        >
                          {isDone ? "Completed" : "In Progress"}
                        </span>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* ── TAB CONTENT 4: TEAM SCHEDULE & TIME OFF ── */}
      {currentTab === "schedule" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#05142B]/90 border border-[#3A2C18] rounded-2xl p-5 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#C5A059]" />
                <h2 className="text-xl font-serif font-bold text-[#FFF4D4] tracking-wide">Team Schedule &amp; Coverage</h2>
                <PageIdBadge id="PG-038-SCH" name="Team Schedule & Time Off" inline />
              </div>
              <p className="text-xs text-[#C6B697]">
                View upcoming meetings, IEP appointments, and staff availability.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => setTimeOffModalOpen(true)}
                className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:from-[#FFE394] hover:to-[#DFBE77] text-[#07162B] font-bold text-xs rounded-xl py-2 px-3.5 gap-1.5 shadow-[0_3px_10px_rgba(0,0,0,0.8)] border border-[#FFE394]/50 cursor-pointer"
              >
                <Plane className="w-4 h-4" />
                <span>Request Time Off</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLocation("/calendar")}
                className="border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] text-xs rounded-xl py-2 px-3 cursor-pointer"
              >
                <span>Full Calendar →</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Today's Schedule Card */}
            <Card className="rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 p-5 sm:p-6 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-4 hover:border-[#C5A059]/60 transition-all">
              <div className="flex items-center justify-between pb-3 border-b border-[#3A2C18]/60">
                <div className="flex items-center gap-2 text-[#FFF4D4] font-serif font-bold text-base">
                  <Clock className="w-4 h-4 text-[#C5A059]" />
                  <span>Today's Sessions &amp; Meetings</span>
                </div>
                <span className="text-xs font-mono text-[#FFE394] font-semibold">
                  {new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                </span>
              </div>

              <div className="space-y-2.5">
                {[
                  { time: "9:00 AM", title: "Team Check-In", subtitle: "Virtual Meeting · Room A", dot: "bg-sky-400" },
                  { time: "10:30 AM", title: "IEP Meeting — Jackson R.", subtitle: "Riverside School · Byron Honea", dot: "bg-[#C5A059]" },
                  { time: "1:00 PM", title: "Callback — Parent (M. Carter)", subtitle: "Discuss assessment results", dot: "bg-emerald-400" },
                  { time: "3:00 PM", title: "Records Review", subtitle: "Johnson Case Workspace", dot: "bg-[#8A9EB5]" },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-2.5 rounded-xl bg-[#020A17]/80 border border-[#3A2C18]/60 hover:border-[#C5A059]/60 hover:bg-[#07162B] transition-all">
                    <div className="w-20 text-right shrink-0 pt-0.5">
                      <span className="text-xs font-mono font-bold text-[#FFE394]">{item.time}</span>
                    </div>
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className={`w-2.5 h-2.5 rounded-full ${item.dot} mt-1.5 shrink-0 shadow-sm`} />
                      <div className="min-w-0">
                        <div className="text-xs font-serif font-bold text-[#FFF4D4] truncate">{item.title}</div>
                        <div className="text-[11px] text-[#C6B697] truncate">{item.subtitle}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Time Off Center Card */}
            <Card className="rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 p-5 sm:p-6 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-4 hover:border-[#C5A059]/60 transition-all">
              <div className="flex items-center justify-between pb-3 border-b border-[#3A2C18]/60">
                <div className="flex items-center gap-2 text-[#FFF4D4] font-serif font-bold text-base">
                  <Plane className="w-4 h-4 text-[#C5A059]" />
                  <span>Time Off &amp; Availability</span>
                </div>
                <span className="text-xs font-mono text-emerald-400 font-semibold">11 Days Remaining</span>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-mono font-semibold text-[#A69371] uppercase tracking-wider">
                  Upcoming Approved Leave
                </div>
                {timeOffRequests.filter((r) => r.status === "Approved").map((r) => (
                  <div key={r.id} className="p-3 rounded-xl bg-[#020A17]/80 border border-[#3A2C18]/60 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-serif font-bold text-[#FFF4D4]">{r.type}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold font-mono">
                        Approved
                      </span>
                    </div>
                    <div className="text-[#C6B697]">{r.startDate} – {r.endDate}</div>
                    {r.returnDate && (
                      <div className="text-[10px] text-[#FFE394]/90 flex items-center gap-1 font-mono">
                        <CalendarCheck className="w-3 h-3 text-[#C5A059]" />
                        <span>First day back: <strong className="text-[#FFF4D4]">{r.returnDate}</strong></span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── TAB CONTENT 5: RESOURCES & KNOWLEDGE BASE ── */}
      {currentTab === "resources" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#05142B]/90 border border-[#3A2C18] rounded-2xl p-5 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#C5A059]" />
                <h2 className="text-xl font-serif font-bold text-[#FFF4D4] tracking-wide">Waypoint Knowledge &amp; Resources</h2>
                <PageIdBadge id="PG-038-RES" name="Employee Resources" inline />
              </div>
              <p className="text-xs text-[#C6B697]">
                Waypoint Advocates internal field guides, standard operating procedures, and professional training.
              </p>
            </div>

            <Button
              size="sm"
              onClick={() => setLocation("/knowledge-base")}
              className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:from-[#FFE394] hover:to-[#DFBE77] text-[#07162B] font-bold text-xs rounded-xl py-2 px-3.5 gap-1.5 shadow-[0_3px_10px_rgba(0,0,0,0.8)] border border-[#FFE394]/50 cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>Full Knowledge Base</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "Waypoint Field Guide", desc: "Step-by-step guidance for client representation and meeting preparation.", path: "/knowledge-base", icon: FileText },
              { title: "Standard Operating Procedures", desc: "Official office processes, filing guidelines, and privacy workflows.", path: "/walkthroughs", icon: Shield },
              { title: "Phone Scripts & Email Templates", desc: "Ready-to-use communication templates for schools and parents.", path: "/templates", icon: Phone },
              { title: "IEP Meeting Best Practices", desc: "Video modules on dispute prevention and active team collaboration.", path: "/knowledge-base", icon: Video },
              { title: "State Complaint Builder", desc: "Guided generator for formal state complaint filings.", path: "/tools/state-complaint-builder", icon: FileText },
              { title: "IEP Goal Comparator", desc: "Compare previous vs proposed IEP accommodations and goals.", path: "/tools/iep-comparator", icon: Sparkles },
            ].map((res, idx) => (
              <div
                key={idx}
                onClick={() => setLocation(res.path)}
                className="p-5 rounded-2xl bg-[#05142B]/90 border border-[#3A2C18] hover:border-[#C5A059]/80 transition-all cursor-pointer space-y-3 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] group"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-[#020A17] text-[#FFE394] border border-[#3A2C18] group-hover:scale-105 transition-transform">
                    <res.icon className="w-5 h-5" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#A69371] group-hover:text-[#FFE394] group-hover:translate-x-1 transition-all" />
                </div>
                <div>
                  <h4 className="text-sm font-serif font-bold text-[#FFF4D4] group-hover:text-[#FFE394] transition-colors">
                    {res.title}
                  </h4>
                  <p className="text-xs text-[#C6B697] leading-relaxed mt-1">
                    {res.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB CONTENT 6: MY AVAILABILITY ── */}
      {currentTab === "availability" && (
        <EmployeeAvailabilityTab onViewTeamSchedule={() => handleTabChange("schedule")} />
      )}

      {/* ── TAB CONTENT 7: TIME OFF & PTO ── */}
      {currentTab === "time-off" && (
        <EmployeeTimeOffTab />
      )}

      {/* ── TAB CONTENT 8: MY TIMESHEET & HOURS ── */}
      {currentTab === "timesheet" && (
        <EmployeeTimesheetTab />
      )}

      {/* ── TAB CONTENT 9: PROFILE & CREDENTIALS ── */}
      {currentTab === "profile" && (
        <EmployeeProfileTab />
      )}

      {/* ── TAB CONTENT 10: PAYROLL & DIRECT DEPOSIT ── */}
      {currentTab === "payroll" && (
        <EmployeePayrollTab />
      )}

      {/* ── TAB CONTENT 11: EQUIPMENT & TECH ASSETS ── */}
      {currentTab === "equipment" && (
        <EmployeeEquipmentTab />
      )}

      {/* ── TAB CONTENT 12: MY NOTES (PG-038-NOT) ── */}
      {currentTab === "notes" && (
        <NotesWorkspace
          scope="employee"
          targetEmployeeId="emp-byron-honea"
          targetEmployeeName="Byron Honea"
          isCeoOrAdmin={true}
          companyName="Waypoint Advocates"
        />
      )}
        </div>

      {/* ── Time Off Request Modal ── */}
      <Dialog open={timeOffModalOpen} onOpenChange={setTimeOffModalOpen}>
        <DialogContent className="sm:max-w-md bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4] shadow-[0_15px_45px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.06)] rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[#020A17] text-[#FFE394] border border-[#3A2C18]">
                <Plane className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-lg font-serif font-bold text-[#FFF4D4]">
                  Request Time Off
                </DialogTitle>
                <DialogDescription className="text-xs text-[#C6B697]">
                  Submit planned PTO, sick leave, or conference travel for management review.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSaveTimeOff} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-[#FFE394] font-semibold">Leave Category</Label>
              <Select
                value={timeOffForm.type}
                onValueChange={(val) => setTimeOffForm({ ...timeOffForm, type: val })}
              >
                <SelectTrigger className="bg-[#020A17] border border-[#3A2C18] text-[#FFF4D4] rounded-xl text-xs focus:ring-[#C5A059]">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4]">
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
                <Label className="text-xs text-[#FFE394] font-semibold">Start Date</Label>
                <Input
                  type="date"
                  value={timeOffForm.startDate}
                  onChange={(e) => setTimeOffForm({ ...timeOffForm, startDate: e.target.value })}
                  className="bg-[#020A17] border border-[#3A2C18] text-[#FFF4D4] rounded-xl text-xs focus:border-[#C5A059]"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-[#FFE394] font-semibold">End Date</Label>
                <Input
                  type="date"
                  value={timeOffForm.endDate}
                  onChange={(e) => setTimeOffForm({ ...timeOffForm, endDate: e.target.value })}
                  className="bg-[#020A17] border border-[#3A2C18] text-[#FFF4D4] rounded-xl text-xs focus:border-[#C5A059]"
                  required
                />
              </div>
            </div>

            {/* Explicit First Day Back Question */}
            <div className="space-y-2 rounded-xl border border-[#C5A059]/40 bg-[#020A17] p-3">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-[#C5A059] shrink-0" />
                <Label htmlFor="returnDateInput" className="text-xs text-[#FFE394] font-semibold leading-snug">
                  When will be your first day back on job after leave?
                </Label>
              </div>
              <Input
                id="returnDateInput"
                type="date"
                value={timeOffForm.returnDate}
                onChange={(e) => setTimeOffForm({ ...timeOffForm, returnDate: e.target.value })}
                className="bg-[#05142B] border border-[#C5A059]/50 text-[#FFF4D4] rounded-xl text-xs focus-visible:ring-[#C5A059]/50"
                required
              />
              <p className="text-[11px] text-[#C6B697]">
                Confirms the exact morning you will resume caseload duties and client communications.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-[#FFE394] font-semibold">Coverage Notes &amp; Details</Label>
              <Textarea
                placeholder="Mention any ongoing IEP cases or upcoming deadlines requiring team coverage..."
                value={timeOffForm.notes}
                onChange={(e) => setTimeOffForm({ ...timeOffForm, notes: e.target.value })}
                className="bg-[#020A17] border border-[#3A2C18] text-[#FFF4D4] rounded-xl text-xs min-h-[80px] focus:border-[#C5A059]"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTimeOffModalOpen(false)}
                className="border border-[#3A2C18] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:from-[#FFE394] hover:to-[#DFBE77] text-[#07162B] font-bold rounded-xl text-xs shadow-[0_3px_10px_rgba(0,0,0,0.8)] border border-[#FFE394]/50"
              >
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Quick Add Task Modal ── */}
      <Dialog open={taskModalOpen} onOpenChange={setTaskModalOpen}>
        <DialogContent className="sm:max-w-md bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4] shadow-[0_15px_45px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.06)] rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[#020A17] text-[#FFE394] border border-[#3A2C18]">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-lg font-serif font-bold text-[#FFF4D4]">
                  Add Task to Queue
                </DialogTitle>
                <DialogDescription className="text-xs text-[#C6B697]">
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
              <Label className="text-xs text-[#FFE394] font-semibold">Task Title</Label>
              <Input
                placeholder="e.g. Review OT service hours log for Johnson case..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="bg-[#020A17] border border-[#3A2C18] text-[#FFF4D4] rounded-xl text-xs focus:border-[#C5A059]"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-[#FFE394] font-semibold">Priority Level</Label>
              <Select
                value={newTaskPriority}
                onValueChange={(val: any) => setNewTaskPriority(val)}
              >
                <SelectTrigger className="bg-[#020A17] border border-[#3A2C18] text-[#FFF4D4] rounded-xl text-xs">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent className="bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4]">
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
                className="border border-[#3A2C18] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTaskMutation.isPending}
                className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:from-[#FFE394] hover:to-[#DFBE77] text-[#07162B] font-bold rounded-xl text-xs shadow-[0_3px_10px_rgba(0,0,0,0.8)] border border-[#FFE394]/50"
              >
                {createTaskMutation.isPending ? "Adding..." : "Add Task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      </div>
    </ScopedErrorBoundary>
  );
}
