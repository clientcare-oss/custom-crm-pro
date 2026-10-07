import React from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Clock,
  Phone,
  CheckSquare,
  Sparkles,
  Shield,
  Building2,
  Globe,
  Briefcase,
  Layers,
  Target,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface CalendarConsoleHeaderProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  activeNavTab: "calendar" | "requests" | "availability" | "closures" | "session-types" | "coverage";
  onNavTabChange: (tab: "calendar" | "requests" | "availability" | "closures" | "session-types" | "coverage") => void;
  stats: {
    appointmentsCount: number;
    holdsCount: number;
    callbacksCount: number;
    tasksCount: number;
    pendingRequestsCount?: number;
  };
  onScheduleClick: () => void;
  onProposeHoldsClick: () => void;
  onOpenClosuresClick?: () => void;
  onOpenAvailabilityClick?: () => void;
}

export default function CalendarConsoleHeader({
  currentDate,
  onDateChange,
  activeNavTab,
  onNavTabChange,
  stats,
  onScheduleClick,
  onProposeHoldsClick,
  onOpenClosuresClick,
  onOpenAvailabilityClick,
}: CalendarConsoleHeaderProps) {
  // Format current date display
  const dateFormatted = currentDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const handlePrevDay = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() - 1);
    onDateChange(next);
  };

  const handleNextDay = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 1);
    onDateChange(next);
  };

  return (
    <div className="relative w-full space-y-4 select-none">
      {/* ── TOP ADMIRALTY CARVED MARITIME BANNER ── */}
      <div className="relative overflow-hidden rounded-[5px] border-2 border-[#5B4323] bg-gradient-to-b from-[#0a1a33] via-[#05142B] to-[#020B18] px-6 py-6 shadow-[0_16px_40px_rgba(0,0,0,0.95),inset_0_1px_3px_rgba(255,230,150,0.25)]">
        {/* Subtle Lantern & Vignette Glows */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#E5B558]/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#E5B558]/10 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(21,57,98,0.5)_0%,transparent_75%)]" />

        <div className="relative flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          {/* Left Decorative Maritime Anchor / Compass glint */}
          <div className="hidden lg:flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[5px] border border-[#8C6D37] bg-[#020A17]/80 shadow-[0_4px_12px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.1)]">
              <Compass className="h-6 w-6 text-[#E5B558] animate-pulse" />
            </div>
          </div>

          {/* Central Carved Title & Subtitle */}
          <div className="flex-1 px-2">
            <div className="inline-flex items-center gap-2 mb-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#C5A059]" />
              <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#C5A059] font-bold">
                Waypoint Advocates · Master Operations
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#C5A059]" />
            </div>
            <h1 className="font-serif text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#FFF4D4] drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
              Appointments & Calendar Console
            </h1>
            <p className="mt-1 text-xs md:text-sm font-medium text-[#C6B697] tracking-wide">
              Schedule smarter. Keep cases moving. Protect your time.
            </p>
          </div>

          {/* Top Right Quick Schedule Dropdown Button */}
          <div className="shrink-0 flex items-center gap-2">
            <button
              type="button"
              onClick={onScheduleClick}
              className="inline-flex items-center gap-2 rounded-[5px] border border-[#FFE394]/70 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] px-4 py-2.5 text-xs font-bold text-[#07162B] shadow-[0_4px_16px_rgba(0,0,0,0.7),inset_0_1px_2px_rgba(255,255,255,0.5)] transition-all hover:brightness-110 active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span>Schedule</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-80" />
            </button>
          </div>
        </div>
      </div>

      {/* ── SECONDARY HORIZONTAL NAVIGATION TABS ── */}
      <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => onNavTabChange("calendar")}
          className={`flex items-center gap-2 rounded-[5px] border px-3.5 py-2 text-xs font-serif font-bold transition-all cursor-pointer ${
            activeNavTab === "calendar"
              ? "border-[#FFE394]/70 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-[0_3px_10px_rgba(0,0,0,0.8)]"
              : "border-[#3A2C18] bg-[#05142B]/90 text-[#D8C7A5] hover:border-[#C5A059] hover:text-[#FFF4D4]"
          }`}
        >
          <CalendarIcon className="h-3.5 w-3.5" />
          <span>Calendar</span>
        </button>

        <button
          type="button"
          onClick={() => onNavTabChange("requests")}
          className={`flex items-center gap-2 rounded-[5px] border px-3.5 py-2 text-xs font-serif font-bold transition-all cursor-pointer ${
            activeNavTab === "requests"
              ? "border-[#FFE394]/70 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-[0_3px_10px_rgba(0,0,0,0.8)]"
              : "border-[#3A2C18] bg-[#05142B]/90 text-[#D8C7A5] hover:border-[#C5A059] hover:text-[#FFF4D4]"
          }`}
        >
          <Briefcase className="h-3.5 w-3.5" />
          <span>Scheduling Requests</span>
          <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-mono font-extrabold text-white shadow-sm">
            {stats.pendingRequestsCount || 3}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            onNavTabChange("availability");
            onOpenAvailabilityClick?.();
          }}
          className={`flex items-center gap-2 rounded-[5px] border px-3.5 py-2 text-xs font-serif font-bold transition-all cursor-pointer ${
            activeNavTab === "availability"
              ? "border-[#FFE394]/70 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-[0_3px_10px_rgba(0,0,0,0.8)]"
              : "border-[#3A2C18] bg-[#05142B]/90 text-[#D8C7A5] hover:border-[#C5A059] hover:text-[#FFF4D4]"
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>Availability</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onNavTabChange("closures");
            onOpenClosuresClick?.();
          }}
          className={`flex items-center gap-2 rounded-[5px] border px-3.5 py-2 text-xs font-serif font-bold transition-all cursor-pointer ${
            activeNavTab === "closures"
              ? "border-[#FFE394]/70 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-[0_3px_10px_rgba(0,0,0,0.8)]"
              : "border-[#3A2C18] bg-[#05142B]/90 text-[#D8C7A5] hover:border-[#C5A059] hover:text-[#FFF4D4]"
          }`}
        >
          <Building2 className="h-3.5 w-3.5" />
          <span>Office & Holidays</span>
        </button>

        <button
          type="button"
          onClick={() => onNavTabChange("session-types")}
          className={`flex items-center gap-2 rounded-[5px] border px-3.5 py-2 text-xs font-serif font-bold transition-all cursor-pointer ${
            activeNavTab === "session-types"
              ? "border-[#FFE394]/70 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-[0_3px_10px_rgba(0,0,0,0.8)]"
              : "border-[#3A2C18] bg-[#05142B]/90 text-[#D8C7A5] hover:border-[#C5A059] hover:text-[#FFF4D4]"
          }`}
        >
          <Shield className="h-3.5 w-3.5" />
          <span>Session Types</span>
        </button>

        <button
          type="button"
          onClick={() => onNavTabChange("coverage")}
          className={`flex items-center gap-2 rounded-[5px] border px-3.5 py-2 text-xs font-serif font-bold transition-all cursor-pointer ${
            activeNavTab === "coverage"
              ? "border-[#FFE394]/70 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-[0_3px_10px_rgba(0,0,0,0.8)]"
              : "border-[#3A2C18] bg-[#05142B]/90 text-[#D8C7A5] hover:border-[#C5A059] hover:text-[#FFF4D4]"
          }`}
        >
          <Globe className="h-3.5 w-3.5" />
          <span>National Coverage</span>
        </button>
      </div>

      {/* ── TOP STATS & QUICK KPI STRIP ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
        {/* Card 1: Today Navigator */}
        <div className="rounded-[5px] border border-[#3A2C18] bg-[#05142B]/90 p-3 shadow-[0_6px_16px_rgba(0,0,0,0.85)] flex items-center justify-between gap-2 col-span-2 sm:col-span-1 md:col-span-1">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-[#FFF4D4]">
              <CalendarIcon className="h-3.5 w-3.5 text-[#C5A059] shrink-0" />
              <span>Today</span>
            </div>
            <div className="truncate text-[10px] text-[#A69371] font-mono mt-0.5">
              {dateFormatted}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handlePrevDay}
              className="flex h-6 w-6 items-center justify-center rounded-[5px] border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:border-[#C5A059] hover:text-[#FFF4D4] cursor-pointer"
            >
              <ChevronLeft className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={handleNextDay}
              className="flex h-6 w-6 items-center justify-center rounded-[5px] border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:border-[#C5A059] hover:text-[#FFF4D4] cursor-pointer"
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Card 2: Appointments */}
        <div className="rounded-[5px] border border-[#3A2C18] bg-[#05142B]/90 p-3 shadow-[0_6px_16px_rgba(0,0,0,0.85)] flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[5px] border border-[#3A2C18] bg-[#020A17] text-[#FFE394]">
            <CalendarIcon className="h-4 w-4 text-[#C5A059]" />
          </div>
          <div>
            <div className="font-serif text-lg font-bold leading-none text-[#FFF4D4]">
              {stats.appointmentsCount}
            </div>
            <div className="text-[10px] font-mono text-[#A69371] uppercase tracking-wider mt-0.5">
              Appointments
            </div>
          </div>
        </div>

        {/* Card 3: Tentative Holds */}
        <div className="rounded-[5px] border border-[#3A2C18] bg-[#05142B]/90 p-3 shadow-[0_6px_16px_rgba(0,0,0,0.85)] flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[5px] border border-[#3A2C18] bg-[#020A17] text-amber-400">
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <div className="font-serif text-lg font-bold leading-none text-amber-300">
              {stats.holdsCount}
            </div>
            <div className="text-[10px] font-mono text-[#A69371] uppercase tracking-wider mt-0.5">
              Tentative Holds
            </div>
          </div>
        </div>

        {/* Card 4: Callback */}
        <div className="rounded-[5px] border border-[#3A2C18] bg-[#05142B]/90 p-3 shadow-[0_6px_16px_rgba(0,0,0,0.85)] flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[5px] border border-[#3A2C18] bg-[#020A17] text-sky-400">
            <Phone className="h-4 w-4 text-sky-400" />
          </div>
          <div>
            <div className="font-serif text-lg font-bold leading-none text-sky-300">
              {stats.callbacksCount}
            </div>
            <div className="text-[10px] font-mono text-[#A69371] uppercase tracking-wider mt-0.5">
              Callback
            </div>
          </div>
        </div>

        {/* Card 5: Tasks Due */}
        <div className="rounded-[5px] border border-[#3A2C18] bg-[#05142B]/90 p-3 shadow-[0_6px_16px_rgba(0,0,0,0.85)] flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[5px] border border-[#3A2C18] bg-[#020A17] text-purple-400">
            <CheckSquare className="h-4 w-4 text-purple-400" />
          </div>
          <div>
            <div className="font-serif text-lg font-bold leading-none text-purple-300">
              {stats.tasksCount}
            </div>
            <div className="text-[10px] font-mono text-[#A69371] uppercase tracking-wider mt-0.5">
              Tasks Due
            </div>
          </div>
        </div>

        {/* Card 6: Schedule CTAs */}
        <div className="rounded-[5px] border border-[#3A2C18] bg-[#020A17] p-2 shadow-[0_6px_16px_rgba(0,0,0,0.85)] flex flex-col justify-center gap-1.5 col-span-2 sm:col-span-2 md:col-span-1">
          <button
            type="button"
            onClick={onScheduleClick}
            className="flex items-center justify-center gap-1 rounded-[5px] border border-[#FFE394]/70 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] px-2 py-1.5 text-[11px] font-bold text-[#07162B] shadow-sm hover:brightness-110 active:scale-95 cursor-pointer"
          >
            <Plus className="h-3 w-3 stroke-[3]" />
            <span>Schedule Appointment</span>
          </button>
          <button
            type="button"
            onClick={onProposeHoldsClick}
            className="flex items-center justify-center gap-1 text-[10px] font-mono text-[#FFE394] hover:text-white hover:underline transition-colors cursor-pointer"
          >
            <Target className="h-3 w-3 text-[#C5A059]" />
            <span>Propose 3 Options</span>
          </button>
        </div>
      </div>
    </div>
  );
}
