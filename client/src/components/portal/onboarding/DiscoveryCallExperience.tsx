import React, { useState } from "react";
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
  Info,
  CalendarDays,
  ExternalLink,
  Shield
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

interface DiscoveryCallExperienceProps {
  displayName?: string;
  phoneNumber?: string;
  upcomingAppointment?: any;
  onNavigateTab?: (tabId: string) => void;
  onOpenScheduler?: () => void;
  onUpdatePhone?: (newPhone: string) => void;
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

export function DiscoveryCallExperience({
  displayName = "Sarah",
  phoneNumber,
  upcomingAppointment,
  onNavigateTab = () => {},
  onOpenScheduler = () => {},
  onUpdatePhone,
}: DiscoveryCallExperienceProps) {
  const initialPhone = phoneNumber || upcomingAppointment?.clientPhone || upcomingAppointment?.attendeePhone || upcomingAppointment?.phone || "(404) 555-0198";
  const [currentPhone, setCurrentPhone] = useState(initialPhone);
  const [phoneEditInput, setPhoneEditInput] = useState(initialPhone);
  const [phoneUpdateOpen, setPhoneUpdateOpen] = useState(false);
  const [addMeetingOpen, setAddMeetingOpen] = useState(false);

  const apptDate = upcomingAppointment?.startTime 
    ? new Date(upcomingAppointment.startTime).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : "Wednesday, May 28, 2025";

  const apptTime = upcomingAppointment?.startTime
    ? `${new Date(upcomingAppointment.startTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} (EST)`
    : "10:00 AM (EST)";

  const meetLink = upcomingAppointment?.location || "https://meet.google.com/waypoint-discovery";

  return (
    <div className="relative min-h-screen bg-[#040D1A] text-white overflow-hidden selection:bg-[#F5B544]/30 selection:text-white">
      {/* ── Background Panoramic Lighthouse Atmosphere (Full Width Left to Right) ── */}
      <div className="absolute top-0 left-0 right-0 w-full h-[380px] sm:h-[410px] lg:h-[430px] pointer-events-none z-0 overflow-hidden">
        <img
          src="/lighthouse-night-bg.png"
          alt="Lighthouse Beacon"
          className="w-full h-full object-cover object-right sm:object-[80%_top] lg:object-center opacity-95 filter brightness-105 contrast-105"
        />
        {/* Subtle bottom fade into midnight blue right at the bottom of the Discovery Call card */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#040D1A]/20 via-transparent to-[#040D1A]" />
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-[#040D1A]/50 to-transparent" />
      </div>

      {/* ── Main Container ─────────────────────────────────────────────────── */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 space-y-6">
        
        {/* ── Top Header Section ────────────────────────────────────────────── */}
        <div className="space-y-3 max-w-2xl pt-2">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-serif font-normal text-white tracking-tight leading-[1.15]">
              Your discovery call is scheduled!
            </h1>
            <div className="hidden sm:block">
              <PageIdBadge id="PG-027-S01" name="Discovery Inquiry" />
            </div>
          </div>

          <h2 className="text-lg sm:text-xl text-blue-100/90 font-normal tracking-normal">
            Here you can explore your client portal.
          </h2>

          {/* Yellow accent divider rule */}
          <div className="w-16 h-[2.5px] bg-[#F5B544] rounded-full my-2.5" />

          <p className="text-xs sm:text-sm text-blue-200/75 leading-relaxed">
            We're excited to partner with you and support your child's education journey every step of the way.
          </p>
        </div>

        {/* ── Card 1: Your Next Meeting Banner (Matching Border & Emerald Top Accent) ── */}
        <div className="w-full lg:max-w-[56%] rounded-2xl border border-[#18365D] bg-gradient-to-b from-[#0A1F3D]/90 via-[#07162C]/90 to-[#051122]/95 backdrop-blur-md shadow-2xl p-4 sm:p-5 transition-all hover:border-[#285590] space-y-3.5 relative overflow-hidden group">
          {/* Top Emerald Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400/80 to-transparent" />

          {/* Top Section: Calendar Badge & Full-width text running across the box */}
          <div className="flex items-start gap-3.5">
            {/* Circular Golden Calendar Badge aligned with top of text */}
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-[#F5B544]/40 bg-[#0C1F3D] flex items-center justify-center text-[#F5B544] shrink-0 shadow-inner mt-0.5">
              <CalendarDays className="h-5 w-5 stroke-[1.8]" />
            </div>

            <div className="space-y-0.5 flex-1 min-w-0">
              <span className="text-[10px] font-extrabold tracking-widest text-[#F5B544] uppercase block leading-tight">
                YOUR NEXT MEETING
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Discovery Call
              </h3>
              <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-xs text-blue-100/85 pt-0.5">
                <span className="flex items-center gap-1.5 font-medium">
                  <Calendar className="h-3.5 w-3.5 text-blue-300/80" />
                  {apptDate}
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Clock className="h-3.5 w-3.5 text-blue-300/80" />
                  {apptTime}
                </span>
                <span className="flex items-center gap-1.5 font-medium text-emerald-300">
                  <Phone className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  Waypoint will call you @ {currentPhone}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Row: Subtle non-overpowering buttons side-by-side across the bottom */}
          <div className="flex items-center gap-2 pt-2 border-t border-white/5">
            <Button
              size="sm"
              onClick={() => {
                setPhoneEditInput(currentPhone);
                setPhoneUpdateOpen(true);
              }}
              className="bg-[#F5B544] hover:bg-[#E5A534] text-[#07152B] font-semibold text-xs px-3.5 py-1.5 h-8 rounded-lg shadow-xs transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>Update Phone Number</span>
              <ChevronRight className="h-3.5 w-3.5 stroke-[2.5]" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onOpenScheduler}
              className="border-[#1E3E6B] bg-[#0A1D38]/60 hover:bg-white/10 text-white/85 text-xs font-normal px-3 py-1.5 h-8 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Calendar className="h-3.5 w-3.5 text-blue-300/80" />
              <span>Reschedule</span>
            </Button>
          </div>
        </div>

        {/* ── Middle Row: Two Action Cards (Compacted & Streamlined) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Card A: Schedule Time With My Advocate */}
          <div className="rounded-2xl border border-[#18365D] bg-gradient-to-b from-[#0A1F3D]/90 via-[#07162C]/90 to-[#051122]/95 backdrop-blur-md shadow-lg p-3.5 sm:p-4 flex flex-col justify-between hover:border-[#285590] transition-all relative overflow-hidden group space-y-2.5">
            {/* Top Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F5B544]/60 to-transparent" />

            <div className="space-y-2">
              {/* Header: Icon & Category Tag */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full border border-[#F5B544]/30 bg-[#0C1F3D] text-[#F5B544] flex items-center justify-center shrink-0 shadow-inner">
                    <User className="h-4 w-4 stroke-[1.8]" />
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-white tracking-tight">
                    Schedule Time With My Advocate
                  </h4>
                </div>
                <span className="text-[9px] font-extrabold tracking-wider text-[#F5B544] uppercase bg-[#F5B544]/10 border border-[#F5B544]/20 px-2 py-0.5 rounded-full shrink-0">
                  YOU & ADVOCATE ONLY
                </span>
              </div>

              {/* Description */}
              <p className="text-[11px] sm:text-xs text-blue-200/70 leading-relaxed pl-0.5">
                Need to ask questions or prep for a meeting? Book dedicated 1-on-1 strategy time with Byron.
              </p>

              {/* Feature Highlight Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-100/80 bg-white/[0.04] border border-white/10 px-2 py-0.5 rounded-md">
                  <span className="text-[#F5B544] font-bold text-[10px]">✓</span> Strategy Calls
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-100/80 bg-white/[0.04] border border-white/10 px-2 py-0.5 rounded-md">
                  <span className="text-[#F5B544] font-bold text-[10px]">✓</span> Case Prep
                </span>
              </div>
            </div>

            {/* Compact Footer */}
            <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
              <span className="text-[10px] text-blue-200/60 flex items-center gap-1">
                <Clock className="h-3 w-3 text-[#F5B544]" />
                Flexible Scheduling
              </span>

              <Button
                size="sm"
                onClick={onOpenScheduler}
                className="bg-[#F5B544] hover:bg-[#E5A534] text-[#07152B] font-semibold text-xs px-3 py-1 h-7 rounded-lg shadow-xs transition-all flex items-center gap-1 cursor-pointer"
              >
                <span>Choose a Time</span>
                <ChevronRight className="h-3 w-3 stroke-[2.5]" />
              </Button>
            </div>
          </div>

          {/* Card B: Add an IEP / 504 Meeting */}
          <div className="rounded-2xl border border-[#18365D] bg-gradient-to-b from-[#0A1F3D]/90 via-[#07162C]/90 to-[#051122]/95 backdrop-blur-md shadow-lg p-3.5 sm:p-4 flex flex-col justify-between hover:border-[#285590] transition-all relative overflow-hidden group space-y-2.5">
            {/* Top Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400/60 to-transparent" />

            <div className="space-y-2">
              {/* Header: Icon & Category Tag */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full border border-blue-400/30 bg-[#0E284E] text-blue-300 flex items-center justify-center shrink-0 shadow-inner">
                    <CalendarPlus className="h-4 w-4 stroke-[1.8]" />
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-white tracking-tight">
                    Add an IEP / 504 Meeting
                  </h4>
                </div>
                <span className="text-[9px] font-extrabold tracking-wider text-blue-300 uppercase bg-blue-400/10 border border-blue-400/20 px-2 py-0.5 rounded-full shrink-0">
                  SCHOOL & ADVOCATE
                </span>
              </div>

              {/* Description */}
              <p className="text-[11px] sm:text-xs text-blue-200/70 leading-relaxed pl-0.5">
                Have a date from your school? Add it so your advocate can review records and attend.
              </p>

              {/* Feature Highlight Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-100/80 bg-white/[0.04] border border-white/10 px-2 py-0.5 rounded-md">
                  <span className="text-blue-400 font-bold text-[10px]">✓</span> Annual IEPs
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-100/80 bg-white/[0.04] border border-white/10 px-2.5 py-0.5 rounded-md">
                  <span className="text-blue-400 font-bold text-[10px]">✓</span> 504 Conferences
                </span>
              </div>
            </div>

            {/* Compact Footer */}
            <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
              <span className="text-[10px] text-blue-200/60 flex items-center gap-1">
                <Shield className="h-3 w-3 text-blue-400" />
                Advocate Representation
              </span>

              <Button
                size="sm"
                onClick={() => setAddMeetingOpen(true)}
                className="bg-[#F5B544] hover:bg-[#E5A534] text-[#07152B] font-semibold text-xs px-3 py-1 h-7 rounded-lg shadow-xs transition-all flex items-center gap-1 cursor-pointer"
              >
                <span>Add School Meeting</span>
                <ChevronRight className="h-3 w-3 stroke-[2.5]" />
              </Button>
            </div>
          </div>
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
                Helpful Tools & Resources
              </h3>
              <p className="text-xs text-blue-200/60">
                Quick access to the tools and resources you may need along your journey.
              </p>
            </div>
          </div>

          {/* 4 Tool Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Tool 1: IEP Comparator */}
            <div 
              onClick={() => onNavigateTab("iep-comparator")}
              className="group rounded-2xl border border-[#173052] bg-[#07152B]/85 backdrop-blur-md p-4 flex flex-col justify-between hover:border-blue-400/50 hover:shadow-lg transition-all cursor-pointer"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-full border border-blue-400/30 bg-[#0E284E] text-blue-400 flex items-center justify-center shadow-inner">
                  <FileText className="h-5 w-5 stroke-[1.8]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                    IEP Comparator
                  </h4>
                  <p className="text-[11px] text-blue-200/65 mt-1.5 leading-relaxed">
                    Compare your child's current IEP with a previous version.
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
              className="group rounded-2xl border border-[#173052] bg-[#07152B]/85 backdrop-blur-md p-4 flex flex-col justify-between hover:border-purple-400/50 hover:shadow-lg transition-all cursor-pointer"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-full border border-purple-400/30 bg-[#1D143D] text-purple-300 flex items-center justify-center shadow-inner">
                  <FolderOpen className="h-5 w-5 stroke-[1.8]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-purple-200 transition-colors">
                    Document Vault
                  </h4>
                  <p className="text-[11px] text-blue-200/65 mt-1.5 leading-relaxed">
                    View, upload, and organize important documents.
                  </p>
                </div>
              </div>
              <div className="pt-4 flex items-center gap-1 text-xs font-semibold text-purple-400 group-hover:text-purple-300">
                <span>Go to Documents</span>
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
              </div>
            </div>

            {/* Tool 3: Meeting Prep Center */}
            <div 
              onClick={() => onNavigateTab("meeting-prep")}
              className="group rounded-2xl border border-[#173052] bg-[#07152B]/85 backdrop-blur-md p-4 flex flex-col justify-between hover:border-amber-400/50 hover:shadow-lg transition-all cursor-pointer"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-full border border-[#F5B544]/30 bg-[#2B1F08] text-[#F5B544] flex items-center justify-center shadow-inner">
                  <CheckSquare className="h-5 w-5 stroke-[1.8]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-[#F5B544] transition-colors">
                    Meeting Prep Center
                  </h4>
                  <p className="text-[11px] text-blue-200/65 mt-1.5 leading-relaxed">
                    Get checklists, guides, and resources to help you feel ready.
                  </p>
                </div>
              </div>
              <div className="pt-4 flex items-center gap-1 text-xs font-semibold text-[#F5B544] group-hover:text-amber-300">
                <span>Start Preparing</span>
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
              </div>
            </div>

            {/* Tool 4: Pathway Guide */}
            <div 
              onClick={() => onNavigateTab("compass")}
              className="group rounded-2xl border border-[#173052] bg-[#07152B]/85 backdrop-blur-md p-4 flex flex-col justify-between hover:border-cyan-400/50 hover:shadow-lg transition-all cursor-pointer"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-full border border-cyan-400/30 bg-[#0A263D] text-cyan-300 flex items-center justify-center shadow-inner">
                  <Compass className="h-5 w-5 stroke-[1.8]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-cyan-200 transition-colors">
                    Pathway Guide
                  </h4>
                  <p className="text-[11px] text-blue-200/65 mt-1.5 leading-relaxed">
                    See the recommended steps for your child's special education journey.
                  </p>
                </div>
              </div>
              <div className="pt-4 flex items-center gap-1 text-xs font-semibold text-cyan-400 group-hover:text-cyan-300">
                <span>View Pathway</span>
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom Banner: "You're not alone in this." ────────────────────── */}
        <div className="rounded-2xl border border-[#173052] bg-gradient-to-r from-[#07152B]/95 via-[#081832]/90 to-[#0A2244]/80 backdrop-blur-md p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden shadow-2xl">
          {/* Subtle wave vector lines in the background */}
          <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-25 pointer-events-none">
            <svg viewBox="0 0 400 100" className="w-full h-full" fill="none" preserveAspectRatio="none">
              <path d="M0,50 C100,20 200,80 300,40 C350,20 400,60 400,50" stroke="#38BDF8" strokeWidth="1.2" opacity="0.6" />
              <path d="M0,70 C120,40 220,90 320,60 C370,40 400,80 400,70" stroke="#F5B544" strokeWidth="1" opacity="0.5" />
            </svg>
          </div>

          {/* Left Side: Compass Rose & Reassurance */}
          <div className="flex items-center gap-3.5 z-10">
            <div className="w-12 h-12 rounded-full border border-[#F5B544]/30 bg-[#0C1F3D] flex items-center justify-center text-[#F5B544] shrink-0 shadow-inner">
              <WaypointCompassEmblem className="w-7 h-7" />
            </div>
            <div>
              <h4 className="font-serif font-bold text-sm sm:text-base text-[#F5B544] tracking-normal">
                You're not alone in this.
              </h4>
              <p className="text-xs text-blue-200/70 mt-0.5">
                We're here to guide you toward clarity, confidence, and results.
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
        <DialogContent className="bg-[#07152B] border-[#173052] text-white max-w-md shadow-2xl">
          <DialogHeader className="border-b border-white/10 pb-3">
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-white">
              <Phone className="h-5 w-5 text-[#F5B544]" />
              Update Your Phone Number
            </DialogTitle>
            <DialogDescription className="text-xs text-blue-200/70">
              Byron will call this number directly for your scheduled Discovery Call.
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
                className="w-full bg-[#040D1A] border border-[#173052] focus:border-[#F5B544] rounded-lg p-2.5 text-sm text-white outline-none transition-colors"
              />
              <p className="text-[11px] text-blue-200/60 mt-1.5 leading-relaxed">
                Byron will call you directly at this number on <strong className="text-white">{apptDate}</strong> at <strong className="text-white">{apptTime}</strong>.
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-white/10">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPhoneUpdateOpen(false)}
                className="text-xs border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-[#F5B544] hover:bg-[#E5A534] text-[#07152B] font-bold text-xs shadow-md"
              >
                Save Phone Number
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Add School Meeting Modal ───────────────────────────────── */}
      <Dialog open={addMeetingOpen} onOpenChange={setAddMeetingOpen}>
        <DialogContent className="bg-[#07152B] border-[#173052] text-white max-w-md">
          <DialogHeader className="border-b border-white/10 pb-3">
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-white">
              <CalendarPlus className="h-5 w-5 text-[#F5B544]" />
              Add an IEP / 504 Meeting Date
            </DialogTitle>
            <DialogDescription className="text-xs text-blue-200/70">
              Let your advocate know about upcoming school ARD/IEP/504 conference dates.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2 text-xs">
            <div>
              <label className="text-white/70 font-semibold block mb-1">Meeting Type</label>
              <select className="w-full bg-[#040D1A] border border-[#173052] rounded-lg p-2 text-xs text-white outline-none">
                <option>Annual IEP Review</option>
                <option>Initial Eligibility / Evaluation</option>
                <option>504 Plan Meeting</option>
                <option>Manifestation Determination Review (MDR)</option>
                <option>IEP Amendment / Progress Check</option>
              </select>
            </div>

            <div>
              <label className="text-white/70 font-semibold block mb-1">Date & Time</label>
              <input
                type="datetime-local"
                className="w-full bg-[#040D1A] border border-[#173052] rounded-lg p-2 text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="text-white/70 font-semibold block mb-1">School / Location / Notes</label>
              <textarea
                placeholder="e.g. Virtual via Zoom, or In-person at North Gwinnett High Room 104..."
                className="w-full bg-[#040D1A] border border-[#173052] rounded-lg p-2 text-xs text-white outline-none min-h-[60px]"
              />
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-white/10">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddMeetingOpen(false)}
                className="text-xs border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setAddMeetingOpen(false);
                }}
                className="bg-[#F5B544] hover:bg-[#E5A534] text-[#07152B] font-bold text-xs"
              >
                Submit Meeting Date
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
