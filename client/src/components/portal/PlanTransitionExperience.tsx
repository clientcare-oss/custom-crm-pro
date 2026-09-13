import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  Check, 
  FileText, 
  Lock, 
  AlertCircle,
  Download,
  Calendar,
  Layers,
  ChevronRight,
  ArrowLeft,
  Wrench,
  Scale,
  Folder,
  BarChart3,
  Flag,
  Star,
  Ban,
  XCircle,
  Info,
  ExternalLink,
  RefreshCw
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import PageIdBadge from "@/components/PageIdBadge";
import VaultSafeIcon from "@/components/ui/VaultSafeIcon";

interface PlanTransitionExperienceProps {
  displayName?: string;
  effectiveStudent?: any;
  studentName?: string;
  studentGrade?: string;
  currentTierName?: string;
  studentId?: string;
  daysRemaining?: number;
  expirationDate?: string;
  onNavigateTab?: (tabId: string) => void;
  pageId?: string;
  pageName?: string;
}

export type TransitionDirective = "vault-only" | "tools-suite" | "renew-55" | "renew-100" | "no-plan";

interface TransitionOption {
  id: TransitionDirective;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  price: string;
  cadence: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  borderGlow: string;
  highlights: string[];
  recommendedFor: string;
}

/** Authentic 8-pointed golden Waypoint Compass Rose icon */
export function WaypointCompassRose({ className = "w-6 h-6 text-amber-400" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor">
      {/* 4 primary directional points */}
      <polygon points="12,2 14,10 12,12 10,10" fill="currentColor" fillOpacity="0.9" />
      <polygon points="12,22 14,14 12,12 10,14" fill="currentColor" fillOpacity="0.9" />
      <polygon points="22,12 14,14 12,12 14,10" fill="currentColor" fillOpacity="0.9" />
      <polygon points="2,12 10,14 12,12 10,10" fill="currentColor" fillOpacity="0.9" />
      {/* 4 secondary ordinal points */}
      <polygon points="18.5,5.5 13.5,10.5 12,12 13.5,13.5" fill="currentColor" fillOpacity="0.5" />
      <polygon points="5.5,18.5 10.5,13.5 12,12 10.5,10.5" fill="currentColor" fillOpacity="0.5" />
      <polygon points="18.5,18.5 13.5,13.5 12,12 10.5,13.5" fill="currentColor" fillOpacity="0.5" />
      <polygon points="5.5,5.5 10.5,10.5 12,12 13.5,10.5" fill="currentColor" fillOpacity="0.5" />
      {/* Subtle outer dashed compass ring and center hub */}
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="0.75" strokeDasharray="1.2 1.5" />
      <circle cx="12" cy="12" r="1.5" fill="#041126" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

export function PlanTransitionExperience({
  displayName = "Parent Client",
  effectiveStudent,
  studentName: propStudentName,
  studentGrade = "5th Grade → 6th Grade",
  currentTierName = "Full IEP Representation (2025–2026)",
  studentId: propStudentId,
  daysRemaining = 48,
  expirationDate = "October 31, 2026",
  onNavigateTab,
  pageId = "PG-023-RNW",
  pageName = "Plan Renewal",
}: PlanTransitionExperienceProps) {
  const studentName = propStudentName || (effectiveStudent 
    ? `${effectiveStudent.firstName || ""} ${effectiveStudent.lastName || ""}`.trim() 
    : "Liam Jenkins");
  const studentId = propStudentId || effectiveStudent?.id || 101;
  const storageKey = `waypoint_plan_transition_choice_${studentId}`;

  // Active chosen plan directive
  const [selectedDirective, setSelectedDirective] = useState<TransitionDirective>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === "vault-only" || saved === "tools-suite" || saved === "renew-55" || saved === "renew-100" || saved === "no-plan") {
        return saved as TransitionDirective;
      }
    } catch (e) {
      console.error(e);
    }
    return "renew-100";
  });

  const [advocacySubTier, setAdvocacySubTier] = useState<"renew-100" | "renew-55">("renew-100");
  const [toolsSubTier, setToolsSubTier] = useState<"tools-suite" | "vault-only">("tools-suite");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const transitionOptions: Record<string, TransitionOption> = {
    "renew-100": {
      id: "renew-100",
      title: "Full Meeting Representation",
      subtitle: "Live Advocate Attendance at All School Conferences & Dispute Defense",
      badge: "Comprehensive • $100/mo",
      badgeColor: "bg-amber-400/20 text-amber-300 border-amber-400/40",
      price: "$100.00",
      cadence: "/ month per student",
      icon: Scale,
      accentColor: "text-amber-400",
      borderGlow: "border-amber-400 shadow-[0_0_30px_rgba(245,181,68,0.2)]",
      highlights: [
        "Full access to all Waypoint tools & Case Compass™ portfolio",
        "Live advocate attendance & co-chairing at all IEP, 504 & MDR school conferences",
        "Direct priority messaging & strategic advisory with Master IEP Coach® Byron Honea",
        "Pre-meeting parent strategy agendas & talking point roadmaps delivered 48h prior",
        "Priority rapid document turnarounds (PWNs, evaluation requests, dissents)",
        "Uninterrupted advocacy continuity (no gap in student defense)"
      ],
      recommendedFor: "Families with active disputes, upcoming annual reviews, grade transitions, or complex clinical needs."
    },
    "renew-55": {
      id: "renew-55",
      title: "Essential IEP Advisory",
      subtitle: "Ongoing Special Education Coaching & Document Review Checks",
      badge: "Advisory Coaching • $55/mo",
      badgeColor: "bg-blue-400/20 text-blue-300 border-blue-400/40",
      price: "$55.00",
      cadence: "/ month per student",
      icon: ShieldCheck,
      accentColor: "text-blue-400",
      borderGlow: "border-blue-400/70 shadow-[0_0_25px_rgba(96,165,250,0.2)]",
      highlights: [
        "Full access to Document Vault and all Advocacy Tools & AI Utilities",
        "Advocate meeting attendance & special education coaching included",
        "Unlimited IEP & 504 document audits, draft review checks, and amendment analyses",
        "Quarterly IEP goal progress audit & school compliance monitoring",
        "Direct strategic advisory with Master IEP Coach® Byron Honea",
        "Parent meeting prep briefs and customized strategy roadmaps"
      ],
      recommendedFor: "Families wanting expert coaching, draft audits, and goal monitoring between school meetings."
    },
    "tools-suite": {
      id: "tools-suite",
      title: "Tools & AI Suite",
      subtitle: "Full Access to Document Vault & All Self-Service AI Utilities",
      badge: "Empowered Parent • $35/mo",
      badgeColor: "bg-cyan-400/20 text-cyan-300 border-cyan-400/40",
      price: "$35.00",
      cadence: "/ month per student",
      icon: Wrench,
      accentColor: "text-cyan-400",
      borderGlow: "border-cyan-400/70 shadow-[0_0_25px_rgba(34,211,238,0.2)]",
      highlights: [
        "Document Vault (all your existing historical records preserved)",
        "Upload new records, report cards, and provider evaluations anytime",
        "Scan documents directly from phone or device camera",
        "Past reports and verified audit trail retention",
        "Instant downloads & encrypted complete ZIP archive exports",
        "Selected self-service tools (IEP Comparator, Worksheet Studio, First Mate AI)"
      ],
      recommendedFor: "Parents wanting self-directed advocacy backed by Waypoint's professional software & AI tools."
    },
    "vault-only": {
      id: "vault-only",
      title: "Document Vault Only",
      subtitle: "Permanent Zero-Trust Storage & Infinite Downloads",
      badge: "Vault Continuity • $15/mo",
      badgeColor: "bg-amber-400/15 text-amber-300 border-amber-400/30",
      price: "$15.00",
      cadence: "/ month per student",
      icon: VaultSafeIcon,
      accentColor: "text-amber-400",
      borderGlow: "border-amber-400/50 shadow-[0_0_20px_rgba(245,181,68,0.15)]",
      highlights: [
        "Permanent Cloudflare R2 zero-trust encrypted storage for all student records",
        "Continued parent upload capabilities for new school documents",
        "Full download portability & export anytime without limits",
        "Byron Honea's verified provenance audit tags remain sealed and protected",
        "Preserves your family's records without monthly coaching retainer"
      ],
      recommendedFor: "Families who have reached stable accommodations and want permanent encrypted records preservation."
    },
    "no-plan": {
      id: "no-plan",
      title: "No Plan Selected",
      subtitle: "If you do nothing, access will conclude on the term date.",
      badge: "Access Expires",
      badgeColor: "bg-rose-950/60 text-rose-300 border-rose-800/40",
      price: "$0.00",
      cadence: "access ends",
      icon: Ban,
      accentColor: "text-slate-400",
      borderGlow: "border-slate-700/60",
      highlights: [
        `Advocacy services end on ${expirationDate}`,
        "Access to your Document Vault and tools may expire",
        "You may not be able to view, download, or upload new records",
        "To keep your records and tools, choose a continuation option before your plan ends"
      ],
      recommendedFor: "Clients voluntarily discontinuing all special education services and records storage."
    }
  };

  const handleSelectDirective = (directive: TransitionDirective) => {
    setSelectedDirective(directive);
    if (directive === "renew-100" || directive === "renew-55") {
      setAdvocacySubTier(directive);
    } else if (directive === "tools-suite" || directive === "vault-only") {
      setToolsSubTier(directive);
    }
    setShowConfirmModal(true);
  };

  const handleConfirmDirective = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      try {
        localStorage.setItem(storageKey, selectedDirective);
        setShowConfirmModal(false);
        const chosen = transitionOptions[selectedDirective] || transitionOptions["renew-100"];
        toast.success("Plan Transition Directive Saved!", {
          description: `Your preference for "${chosen.title}" will take effect on ${expirationDate}.`
        });
      } catch (e) {
        console.error(e);
      } finally {
        setIsSubmitting(false);
      }
    }, 600);
  };

  const handleDownloadFullArchive = () => {
    toast.success(`Preparing ${studentName}'s Complete Archive...`, {
      description: "Generating encrypted bundle of 47 IEPs, evaluations, and progress reports."
    });
  };

  const activeOption = transitionOptions[selectedDirective] || transitionOptions["renew-100"];

  return (
    <div className="max-w-7xl mx-auto space-y-7 text-white animate-in fade-in duration-300 pb-12">
      
      {/* ── Top Bar: Back Nav & Page Identification ── */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => onNavigateTab?.("financials")}
          className="inline-flex items-center gap-2 text-xs font-semibold text-sky-200/70 hover:text-amber-300 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Membership & Billing</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-400/10 text-amber-300 border border-amber-400/30">
            <Clock className="w-3 h-3 text-amber-400" />
            {daysRemaining} Days Until Transition
          </span>
          <PageIdBadge id={pageId} name={pageName} />
        </div>
      </div>

      {/* ── Top Header Row (Title + Center Wine Banner + Clean Vertically Stacked Buttons) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center pt-1 pb-1">
        {/* Left: Serif Headline (4 cols) */}
        <div className="lg:col-span-4 space-y-1 text-center lg:text-left">
          <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-serif font-normal text-white tracking-tight leading-tight">
            Plan Transition
          </h1>
          <p className="text-xs sm:text-sm text-slate-300/80 font-normal">
            Your tools. Your records. What's next — you choose.
          </p>
        </div>

        {/* Center: Burgundy/Wine End Date Banner Pill (5 cols) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center text-center px-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#390d19]/90 border border-rose-500/40 text-rose-200 shadow-lg shadow-rose-950/40">
            <Calendar className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold tracking-wide">
              Your advocacy plan ends {expirationDate}.
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-300/80 mt-2 leading-relaxed text-center max-w-sm">
            To keep using your Document Vault and Waypoint tools after your advocacy plan ends, choose a continuation option.
          </p>
        </div>

        {/* Right: Quick Action Buttons STACKED ON TOP OF EACH OTHER (3 cols) */}
        <div className="lg:col-span-3 flex flex-col items-center lg:items-end gap-1.5 shrink-0">
          <div className="flex flex-col gap-2 w-full max-w-[240px]">
            {/* Top Button: Renew Full Advocacy */}
            <button
              onClick={() => handleSelectDirective(advocacySubTier)}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs sm:text-sm shadow-md shadow-amber-400/20 cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
            >
              <RefreshCw className="w-4 h-4 text-slate-950" />
              <span>Renew Full Advocacy →</span>
            </button>

            {/* Bottom Button: Keep Vault + Tools */}
            <button
              onClick={() => handleSelectDirective(toolsSubTier)}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#071d40] hover:bg-[#0c2a5c] text-white border border-sky-500/40 font-semibold text-xs sm:text-sm shadow-md cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
            >
              <Folder className="w-4 h-4 text-sky-400" />
              <span>Keep Vault + Tools →</span>
            </button>
          </div>

          <span className="text-[9px] font-mono tracking-widest text-slate-400 uppercase text-center lg:text-right block pt-0.5">
            SAME SUPPORT. YOUR CHOICE. A BRIGHTER PATH AHEAD.
          </span>
        </div>
      </div>

      {/* ── Split Hero Section: Left Hero Card (Lighthouse) + Right Access Card ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* Left Hero Card (8 Cols): Lighthouse strictly segregated on right, text on left */}
        <div className="lg:col-span-8 relative overflow-hidden rounded-3xl border border-sky-500/30 bg-gradient-to-br from-[#061937] via-[#04132b] to-[#020b1a] shadow-2xl min-h-[380px] flex flex-col justify-between">
          
          {/* Lighthouse Twilight Background Artwork (Cleanly confined to right 44% so it never collides with text) */}
          <div className="absolute right-0 top-0 bottom-0 w-full sm:w-[46%] lg:w-[44%] overflow-hidden pointer-events-none select-none">
            <img
              src="/plan-transition-lighthouse.jpg"
              alt="Waypoint Lighthouse in twilight"
              className="w-full h-full object-cover object-[center_25%] opacity-95"
            />
            {/* Seamless blended gradients on the left edge */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#04132b] via-[#04132b]/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#020b1a] via-transparent to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#061937]/40 via-transparent to-transparent" />

            {/* Script Cursive Overlay: "Your journey continues here." */}
            <div className="absolute top-8 left-3 sm:left-6 z-10">
              <p className="font-serif italic text-amber-200/95 text-base sm:text-lg lg:text-xl tracking-wide select-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                Your journey continues here.
              </p>
              <div className="w-8 h-[2px] bg-amber-400/90 mt-1 shadow-sm" />
            </div>
          </div>

          {/* Left Text & Stat Content (Strictly width-capped so text never runs over the lighthouse artwork) */}
          <div className="relative z-10 p-6 sm:p-8 lg:p-9 space-y-3.5 w-full sm:max-w-[58%] lg:max-w-[56%]">
            {/* Accent Gold Label */}
            <div className="flex items-center gap-2">
              <div className="w-5 h-[2px] bg-amber-400" />
              <span className="text-[10px] sm:text-[11px] font-mono font-bold tracking-widest text-amber-400 uppercase">
                Your Records Matter
              </span>
            </div>

            {/* Display Serif Title */}
            <h2 className="text-2xl sm:text-3xl font-serif font-normal text-white tracking-tight leading-snug">
              Keep your Document Vault and essential tools.
            </h2>

            {/* Descriptive Body */}
            <p className="text-xs sm:text-sm text-sky-100/80 leading-relaxed font-normal">
              You currently have records stored in your Document Vault for <strong className="text-white font-semibold">{studentName}</strong>. You can continue using the Vault and selected Waypoint tools after your advocacy plan ends — only if you choose a Tools Access plan or renew full advocacy.
            </p>

            {/* Inset Stat Card: 47 Records in Vault */}
            <div className="rounded-2xl bg-[#020a17]/95 border border-sky-500/35 p-3.5 sm:p-4 backdrop-blur-md flex items-center gap-3.5 shadow-xl">
              <div className="w-11 h-11 rounded-xl bg-sky-950/90 border border-sky-500/40 flex items-center justify-center text-sky-300 shrink-0 shadow-inner">
                <FileText className="w-5 h-5 text-sky-400" />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-bold text-white tracking-tight">
                  You have <span className="text-amber-300 font-mono font-black">47 records</span> in your Document Vault
                </div>
                <div className="text-[10px] sm:text-[11px] text-blue-200/75 mt-0.5 flex flex-wrap items-center gap-1.5">
                  <span>6 IEPs</span>
                  <span className="text-white/40">•</span>
                  <span>3 Evaluations</span>
                  <span className="text-white/40">•</span>
                  <span>12 Progress Reports</span>
                  <span className="text-white/40">•</span>
                  <span>26 Other Records</span>
                </div>
              </div>
            </div>

            {/* Note below stat box */}
            <p className="text-[10px] sm:text-[11px] text-sky-200/65 leading-relaxed pt-0.5">
              These records can remain organized and available if you keep Tools Access active. Don't lose access to your important documents.
            </p>
          </div>
        </div>

        {/* Right Side Card (4 Cols): "Your Current Access" */}
        <div className="lg:col-span-4 rounded-3xl border border-sky-800/40 bg-gradient-to-b from-[#051630] via-[#041126] to-[#020b18] p-6 sm:p-7 shadow-xl flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center gap-2.5 text-white font-bold text-base sm:text-lg border-b border-white/10 pb-3.5">
              <BarChart3 className="w-5 h-5 text-sky-400" />
              <span className="tracking-tight">Your Current Access</span>
            </div>

            {/* Metric Row 1: Current Plan Ends */}
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#020a17] border border-sky-800/60 flex items-center justify-center text-sky-400 shrink-0 shadow-inner">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] text-slate-400 block font-medium">Current plan ends</span>
                <span className="text-sm font-bold text-white block font-mono">{expirationDate}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Your advocacy services will end on this date.</span>
              </div>
            </div>

            {/* Metric Row 2: 47 Stored Records */}
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#020a17] border border-sky-800/60 flex items-center justify-center text-sky-400 shrink-0 shadow-inner">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-bold text-white block">47 stored records</span>
                <span className="text-[11px] text-slate-400 block">In your Document Vault</span>
              </div>
            </div>

            {/* Metric Row 3: Next Step */}
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#020a17] border border-sky-800/60 flex items-center justify-center text-sky-400 shrink-0 shadow-inner">
                <Flag className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-bold text-white block">Next step</span>
                <span className="text-[11px] text-slate-400 block leading-tight">
                  Choose a continuation option to keep your access.
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Compass Rose & Quote */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
            <WaypointCompassRose className="w-8 h-8 text-amber-400/90 shrink-0" />
            <p className="text-xs font-serif italic text-amber-200/80 text-right leading-relaxed">
              “Same foundation. Brighter tomorrows.”
            </p>
          </div>
        </div>
      </div>

      {/* ── The 3 Main Decision Cards (Renew Full Advocacy, Tools Access, No Plan) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch pt-2">
        
        {/* ── CARD 1: RENEW FULL ADVOCACY (Recommended) ── */}
        <div className="rounded-3xl border-2 border-amber-400 bg-gradient-to-b from-[#081f44] via-[#051630] to-[#030d1e] p-6 sm:p-7 shadow-[0_0_35px_rgba(245,181,68,0.18)] flex flex-col justify-between relative overflow-hidden">
          {/* Top Gold Ambient Glow Bar */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500" />

          <div className="space-y-4">
            {/* Header Row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-amber-400">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="font-mono font-bold text-xs sm:text-sm tracking-wider uppercase">
                  Renew Full Advocacy
                </span>
              </div>
              <Badge className="bg-amber-400 text-slate-950 font-bold font-mono text-[10px] px-2.5 py-0.5 rounded-md uppercase tracking-wider shadow-sm">
                Recommended
              </Badge>
            </div>

            {/* Subtitle */}
            <p className="text-xs sm:text-sm text-blue-200/85">
              Continue your partnership. Keep moving forward.
            </p>

            {/* Tier Selector Pills: $100/mo vs $55/mo */}
            <div className="p-1 rounded-xl bg-[#020a17] border border-amber-400/30 grid grid-cols-2 gap-1 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => setAdvocacySubTier("renew-100")}
                className={`py-1.5 px-2 rounded-lg font-bold transition-all cursor-pointer text-center ${
                  advocacySubTier === "renew-100"
                    ? "bg-amber-400 text-slate-950 shadow-sm"
                    : "text-amber-300/80 hover:text-white hover:bg-white/5"
                }`}
              >
                $100 / mo • Full Representation
              </button>
              <button
                type="button"
                onClick={() => setAdvocacySubTier("renew-55")}
                className={`py-1.5 px-2 rounded-lg font-bold transition-all cursor-pointer text-center ${
                  advocacySubTier === "renew-55"
                    ? "bg-amber-400 text-slate-950 shadow-sm"
                    : "text-amber-300/80 hover:text-white hover:bg-white/5"
                }`}
              >
                $55 / mo • Advisory Coaching
              </button>
            </div>

            {/* Checklist */}
            <ul className="space-y-3 pt-2 text-xs text-white/90">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>Full access to all Waypoint tools</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>Ongoing advocate support</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>Meeting attendance (Advocate included in both plans)</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>Strategy help</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>Case tools & compliance monitoring</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>Uninterrupted advocacy (no gap in support)</span>
              </li>
            </ul>
          </div>

          {/* Action Button */}
          <div className="pt-6">
            <button
              onClick={() => handleSelectDirective(advocacySubTier)}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-400/20 cursor-pointer flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <RefreshCw className="w-4 h-4 text-slate-950" />
              <span>Renew Full Advocacy →</span>
            </button>
          </div>
        </div>

        {/* ── CARD 2: TOOLS ACCESS ── */}
        <div className="rounded-3xl border border-sky-500/40 bg-gradient-to-b from-[#061938] via-[#041228] to-[#020b18] p-6 sm:p-7 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            {/* Header Row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sky-400">
                <Folder className="w-4 h-4 text-sky-400" />
                <span className="font-mono font-bold text-xs sm:text-sm tracking-wider uppercase">
                  Tools Access
                </span>
              </div>
            </div>

            {/* Subtitle */}
            <p className="text-xs sm:text-sm text-blue-200/80">
              Keep your Document Vault and selected tools.
            </p>

            {/* Tier Selector Pills: $35/mo Tools & AI vs $15/mo Vault */}
            <div className="p-1 rounded-xl bg-[#020a17] border border-sky-600/30 grid grid-cols-2 gap-1 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => setToolsSubTier("tools-suite")}
                className={`py-1.5 px-2 rounded-lg font-bold transition-all cursor-pointer text-center ${
                  toolsSubTier === "tools-suite"
                    ? "bg-sky-500 text-slate-950 shadow-sm"
                    : "text-sky-300/80 hover:text-white hover:bg-white/5"
                }`}
              >
                $35 / mo • Tools & AI
              </button>
              <button
                type="button"
                onClick={() => setToolsSubTier("vault-only")}
                className={`py-1.5 px-2 rounded-lg font-bold transition-all cursor-pointer text-center ${
                  toolsSubTier === "vault-only"
                    ? "bg-sky-500 text-slate-950 shadow-sm"
                    : "text-sky-300/80 hover:text-white hover:bg-white/5"
                }`}
              >
                $15 / mo • Vault Only
              </button>
            </div>

            {/* Checklist */}
            <ul className="space-y-3 pt-2 text-xs text-white/90">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <span>Document Vault (all your existing records)</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <span>Upload new records</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <span>Scan documents</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <span>Past reports & historical versions</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <span>Downloads (individual or ZIP bundles)</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <span>Selected self-service tools & AI guides</span>
              </li>
            </ul>
          </div>

          {/* Action Button */}
          <div className="pt-6">
            <button
              onClick={() => handleSelectDirective(toolsSubTier)}
              className="w-full h-11 rounded-xl bg-[#092246] hover:bg-[#0d2e5e] text-white border border-sky-400/50 font-semibold text-xs sm:text-sm cursor-pointer flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-md"
            >
              <Folder className="w-4 h-4 text-sky-400" />
              <span>Choose Tools Access →</span>
            </button>
          </div>
        </div>

        {/* ── CARD 3: NO PLAN SELECTED ── */}
        <div className="rounded-3xl border border-slate-700/60 bg-gradient-to-b from-[#051122] via-[#030c18] to-[#020811] p-6 sm:p-7 shadow-lg flex flex-col justify-between opacity-95">
          <div className="space-y-4">
            {/* Header Row */}
            <div className="flex items-center gap-2 text-slate-300">
              <Ban className="w-4 h-4 text-slate-400" />
              <span className="font-mono font-bold text-xs sm:text-sm tracking-wider uppercase text-slate-300">
                No Plan Selected
              </span>
            </div>

            {/* Subtitle */}
            <p className="text-xs sm:text-sm text-slate-400">
              If you do nothing, access will end.
            </p>

            {/* Spacing placeholder matching height of tier pills */}
            <div className="py-1.5 px-3 rounded-xl bg-[#020a17]/50 border border-white/5 text-[11px] font-mono text-slate-500 text-center">
              Term concludes on {expirationDate}
            </div>

            {/* Checklist with Gray/Red X Circles */}
            <ul className="space-y-3 pt-2 text-xs text-slate-400">
              <li className="flex items-start gap-2.5">
                <XCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <span>Advocacy services end on {expirationDate}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <XCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <span>Access to your Document Vault and tools may expire</span>
              </li>
              <li className="flex items-start gap-2.5">
                <XCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <span>You may not be able to view, download, or upload your records</span>
              </li>
              <li className="flex items-start gap-2.5">
                <XCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <span>To keep your records and tools, choose a continuation option before your plan ends</span>
              </li>
            </ul>
          </div>

          {/* Action note / button */}
          <div className="pt-6">
            <button
              onClick={() => handleSelectDirective("no-plan")}
              className="w-full h-11 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 border border-white/10 text-xs font-semibold cursor-pointer transition-colors"
            >
              Conclude Without Renewal
            </button>
          </div>
        </div>
      </div>

      {/* ── Reassurance Banner: Need Advocacy Later? ── */}
      <div className="rounded-2xl border border-sky-900/50 bg-[#041126]/90 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <WaypointCompassRose className="w-6 h-6 text-amber-400 shrink-0" />
          <p className="text-xs sm:text-sm text-slate-200">
            <strong className="text-white font-semibold mr-1.5">Need advocacy later?</strong>
            <span className="text-slate-400">Renew anytime and pick back up without starting over.</span>
          </p>
        </div>
        
        <div className="flex items-center gap-2.5 self-end md:self-auto text-xs font-serif italic text-amber-200/80">
          <span>Your records. Your progress. Always within reach.</span>
          <div className="w-6 h-[2px] bg-amber-400/90" />
        </div>
      </div>

      {/* ── Branded Portal Footer ── */}
      <div className="pt-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 border-t border-white/5 gap-2">
        <div className="flex items-center gap-2">
          <span className="font-serif font-bold text-slate-400 text-xs">Waypoint Advocates</span>
          <span className="font-mono tracking-widest text-[9px] uppercase text-slate-500">
            Guidance today. Brighter tomorrows.
          </span>
        </div>
        <span className="font-mono tracking-wider text-[9px] uppercase text-slate-500">
          Children thrive further with the right support.
        </span>
      </div>

      {/* ── Confirmation Modal ── */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="max-w-lg bg-[#06172F] border-amber-400/40 text-white rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-amber-400 text-slate-950 font-bold text-[10px] font-mono uppercase">
                Confirm Plan Directive
              </Badge>
            </div>
            <DialogTitle className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-amber-400" />
              Confirm: {activeOption.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-blue-200/70 mt-1 leading-relaxed">
              Please review your continuity choice for {studentName}. You can update or amend this preference anytime before {expirationDate}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 my-3 text-xs">
            <div className="p-4 rounded-2xl bg-[#030C22] border border-blue-900/40 space-y-2">
              <div className="flex justify-between items-center text-white/70">
                <span>Selected Path:</span>
                <span className="font-bold text-amber-300">{activeOption.title}</span>
              </div>
              <div className="flex justify-between items-center text-white/70">
                <span>Investment:</span>
                <span className="font-mono font-bold text-white">{activeOption.price} {activeOption.cadence}</span>
              </div>
              <div className="flex justify-between items-center text-white/70">
                <span>Effective Date:</span>
                <span className="font-mono font-bold text-white">{expirationDate}</span>
              </div>
              <div className="flex justify-between items-center text-white/70">
                <span>Records Preservation:</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 100% Zero-Trust Encrypted
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-900/40 flex items-start gap-2.5 text-blue-200/80 leading-relaxed">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Byron Honea will be notified of your directive. If you ever need to re-engage live advocacy or meeting representation in the future, you can upgrade in 1 click from your portal.
              </span>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
              className="border-blue-900/40 text-white hover:bg-white/10 text-xs rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDirective}
              disabled={isSubmitting}
              className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl gap-1.5 cursor-pointer"
            >
              {isSubmitting ? "Saving Directive..." : "Confirm & Save Directive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default PlanTransitionExperience;
