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
  CreditCard,
  Archive,
  Info,
  ExternalLink,
  RefreshCw,
  Settings,
  Bell,
  Eye,
  EyeOff
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
}

export type TransitionDirective = "vault-only" | "tools-suite" | "renew-55" | "renew-100" | "renew-full";

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

export function PlanTransitionExperience({
  displayName = "Parent Client",
  effectiveStudent,
  studentName: propStudentName,
  studentGrade = "5th Grade → 6th Grade",
  currentTierName = "Full IEP Representation (2025–2026)",
  studentId: propStudentId,
  daysRemaining = 45,
  expirationDate = "September 30, 2026",
  onNavigateTab,
}: PlanTransitionExperienceProps) {
  const studentName = propStudentName || (effectiveStudent 
    ? `${effectiveStudent.firstName || ""} ${effectiveStudent.lastName || ""}`.trim() 
    : "Liam Jenkins");
  const studentId = propStudentId || effectiveStudent?.id || 101;
  const storageKey = `waypoint_plan_transition_choice_${studentId}`;

  // Settings bar: show on sidebar switch
  const [showOnSidebar, setShowOnSidebar] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("waypoint_plan_transition_show_sidebar");
      if (stored !== null) return stored === "true";
    } catch (e) {
      console.error(e);
    }
    return true; // Always show on sidebar by default
  });

  const handleToggleSidebar = (checked: boolean) => {
    setShowOnSidebar(checked);
    try {
      localStorage.setItem("waypoint_plan_transition_show_sidebar", String(checked));
      window.dispatchEvent(new CustomEvent("waypoint:plan-transition-sidebar-toggle", { detail: { show: checked } }));
      if (checked) {
        toast.success("Sidebar Visibility Enabled", {
          description: "Plan Renewal is pinned and visible on the navigation sidebar."
        });
      } else {
        toast.info("Sidebar Visibility Setting Updated", {
          description: "Plan Renewal visibility preference saved."
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Saved choice in localStorage (default to $100/mo live representation)
  const [selectedDirective, setSelectedDirective] = useState<TransitionDirective>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === "vault-only" || saved === "tools-suite" || saved === "renew-55" || saved === "renew-100") {
        return saved;
      }
      if (saved === "renew-full") return "renew-100";
    } catch (e) {
      console.error(e);
    }
    return "renew-100";
  });

  const [isSaved, setIsSaved] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const transitionOptions: TransitionOption[] = [
    {
      id: "vault-only",
      title: "Keep Document Vault",
      subtitle: "Permanent Zero-Trust Storage & Infinite Downloads",
      badge: "Vault Continuity",
      badgeColor: "bg-amber-400/15 text-amber-300 border-amber-400/30",
      price: "$15.00",
      cadence: "/ month per student",
      icon: VaultSafeIcon,
      accentColor: "text-amber-400",
      borderGlow: "group-hover:border-amber-400/70 hover:shadow-[0_0_25px_rgba(245,181,68,0.15)]",
      highlights: [
        "Permanent Cloudflare R2 zero-trust encrypted storage for all historical IEPs, 504s, and evals",
        "Full download portability: export individual records or complete multi-year archive bundles anytime",
        "Continued parent upload capabilities for new report cards, letters, and therapy notes",
        "Byron Honea's verified provenance audit tags remain sealed and protected",
        "Removes monthly coaching retainer while keeping all student records secure and accessible"
      ],
      recommendedFor: "Families who have reached stable accommodations and want permanent encrypted records preservation."
    },
    {
      id: "tools-suite",
      title: "Advocacy Tools & AI",
      subtitle: "Self-Advocacy Intelligence with Proprietary IEP AI Utilities",
      badge: "Empowered Parent",
      badgeColor: "bg-cyan-400/15 text-cyan-300 border-cyan-400/30",
      price: "$35.00",
      cadence: "/ month per student",
      icon: Wrench,
      accentColor: "text-cyan-400",
      borderGlow: "group-hover:border-cyan-400/70 hover:shadow-[0_0_25px_rgba(34,211,238,0.15)]",
      highlights: [
        "Includes everything in Document Vault (all historical records and continuous parent upload storage)",
        "IEP Comparator: Side-by-side annual IEP draft diffing with dispute & reduction detection",
        "Case Compass™: Accommodation compliance tracker, goals mastery timelines, and student portfolio",
        "Worksheet Studio & State Complaint Builder: Formal legal filing generators and dispute forms",
        "First Mate AI Assistant: On-demand meeting guidance, question generation, and strategy prompts"
      ],
      recommendedFor: "Parents wanting self-directed advocacy backed by Waypoint's professional-grade software & AI intelligence."
    },
    {
      id: "renew-55",
      title: "Essential IEP Advisory",
      subtitle: "Ongoing Special Education Coaching & Document Review Checks",
      badge: "Continuous Advisory",
      badgeColor: "bg-blue-400/15 text-blue-300 border-blue-400/30",
      price: "$55.00",
      cadence: "/ month per student",
      icon: ShieldCheck,
      accentColor: "text-blue-400",
      borderGlow: "group-hover:border-blue-400/70 hover:shadow-[0_0_25px_rgba(96,165,250,0.15)]",
      highlights: [
        "Includes Document Vault and all Advocacy Tools & AI Utilities",
        "Unlimited IEP & 504 document audits, draft review checks, and amendment analyses",
        "Quarterly IEP goal progress audit & school compliance monitoring",
        "Pre-meeting parent strategy agendas & talking point roadmaps delivered 48h prior",
        "Direct priority messaging & strategic advisory with Master IEP Coach® Byron Honea"
      ],
      recommendedFor: "Families wanting continuous IEP oversight, draft reviews, and expert coaching between school meetings."
    },
    {
      id: "renew-100",
      title: "Full Meeting Representation",
      subtitle: "Live Advocate Attendance at All School Conferences & Dispute Defense",
      badge: "Comprehensive • $100/mo",
      badgeColor: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
      price: "$100.00",
      cadence: "/ month per student",
      icon: Scale,
      accentColor: "text-emerald-400",
      borderGlow: "group-hover:border-emerald-400/70 hover:shadow-[0_0_25px_rgba(52,211,153,0.25)]",
      highlights: [
        "Includes everything in Essential Continuity & Advisory ($55/mo tier), plus:",
        "Live advocate attendance & co-chairing at all IEP, 504 & MDR school meetings (virtual/in-person)",
        "Priority rapid document turnarounds (Prior Written Notices, evaluation requests, dissents)",
        "Dedicated 1-on-1 strategy prep & debrief session with Byron before and after every meeting",
        "Campus & grade transition defense and administrative dispute filing support"
      ],
      recommendedFor: "Families with active disputes, upcoming annual reviews, grade transitions, or complex clinical needs."
    }
  ];

  const handleSaveDirective = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      try {
        localStorage.setItem(storageKey, selectedDirective);
        setIsSaved(true);
        setShowConfirmModal(false);
        const chosen = transitionOptions.find((o) => o.id === selectedDirective);
        toast.success("Plan Transition Directive Saved!", {
          description: `Your preference for "${chosen?.title}" will take effect on ${expirationDate}.`
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
      description: "Generating encrypted bundle of all IEPs, evaluations, and meeting logs."
    });
  };

  const activeOption = transitionOptions.find((o) => o.id === selectedDirective) || transitionOptions[2];

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 text-white animate-in fade-in duration-300">
      
      {/* ── Breadcrumb & Navigation Back ── */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => onNavigateTab?.("financials")}
          className="inline-flex items-center gap-2 text-xs font-semibold text-blue-200/70 hover:text-amber-300 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Membership & Billing</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-400/10 text-amber-300 border border-amber-400/30">
            <Clock className="w-3 h-3 text-amber-400" />
            60-Day Renewal Window Active
          </span>
          <PageIdBadge id="PG-023-RNW" name="Plan Renewal" />
        </div>
      </div>

      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden rounded-3xl border border-blue-900/40 bg-gradient-to-br from-[#0B2553] via-[#071D40] to-[#04122C] p-6 sm:p-8 shadow-2xl">
        {/* Top Gold Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/70 to-transparent" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-amber-400 text-slate-950 font-bold text-[10px] tracking-wider uppercase px-2.5 py-0.5 shadow-sm font-mono">
                Plan Renewal & Transition
              </Badge>
              <Badge variant="outline" className="text-xs font-mono border-emerald-400/40 text-emerald-300 bg-emerald-400/10">
                <CheckCircle2 className="h-3 w-3 mr-1 inline text-emerald-400" />
                Zero Record Loss Guaranteed
              </Badge>
            </div>

            <h1 className="text-2xl sm:text-3xl font-serif font-normal text-white tracking-tight flex items-center gap-2.5">
              <RefreshCw className="h-7 w-7 text-amber-400" />
              Plan Renewal & Continuity Transition
            </h1>

            <p className="text-xs sm:text-sm text-blue-200/80 leading-relaxed">
              As your active advocacy plan term for <strong className="text-white font-semibold">{studentName}</strong> approaches its renewal date, choose what happens next. Retain your secure records, access self-advocacy AI tools, or continue direct representation ($55/mo or $100/mo) with Byron Honea.
            </p>
          </div>

          {/* 60-Day Countdown Card */}
          <div className="bg-[#030C22]/90 border border-amber-400/30 p-5 rounded-2xl text-center sm:text-right shadow-xl shrink-0 backdrop-blur-md space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-amber-400/90 font-mono font-bold block">
              Renewal Window Status
            </span>
            <div className="text-2xl sm:text-3xl font-black text-amber-300 font-mono block">
              {daysRemaining} Days <span className="text-xs text-white/60 font-normal font-sans">Remaining</span>
            </div>
            <span className="text-[11px] text-blue-200/70 block">
              Current Term Ends: <strong className="text-white font-semibold">{expirationDate}</strong>
            </span>
            <div className="pt-2 flex items-center justify-center sm:justify-end gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-400 font-semibold font-mono">Sidebar Visible 60d Prior</span>
            </div>
          </div>
        </div>

        {/* ── 60-Day Interactive Timeline Bar ── */}
        <div className="mt-6 pt-5 border-t border-white/10 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-blue-200/70">
            <span className="font-semibold text-white">60 Days Prior (Window Opens)</span>
            <span className="font-semibold text-amber-400 font-mono">Today ({daysRemaining} Days Left)</span>
            <span className="font-semibold text-white">Term End ({expirationDate})</span>
          </div>
          <div className="relative h-2 w-full bg-slate-900/90 rounded-full border border-white/10 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-amber-300 rounded-full shadow-[0_0_10px_rgba(245,181,68,0.5)] transition-all duration-700"
              style={{ width: `${Math.max(15, Math.min(100, ((60 - daysRemaining) / 60) * 100))}%` }}
            />
          </div>
          <p className="text-[10px] text-blue-200/60 leading-tight">
            * Regardless of choice, all uploaded evaluations, meeting recordings, and IEP draft notes remain permanently secured under FERPA zero-trust standards.
          </p>
        </div>
      </div>

      {/* ── Settings Bar & 60-Day Notification ── */}
      <div className="rounded-2xl border border-amber-400/40 bg-gradient-to-r from-[#071d40]/95 via-[#0B2553]/95 to-[#071d40]/95 p-4 sm:p-5 shadow-2xl backdrop-blur-md space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.2)]">
              <Settings className="w-4 h-4 text-amber-400 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Plan Renewal Settings & Sidebar Visibility
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                  Always Visible in Sidebar
                </span>
              </div>
              <p className="text-xs text-blue-200/70 mt-0.5">
                Toggle sidebar visibility and review access rules for {studentName}'s advocacy continuity.
              </p>
            </div>
          </div>

          {/* Show on Sidebar Switch */}
          <div className="flex items-center gap-3.5 bg-[#030C22]/85 px-4 py-2.5 rounded-xl border border-amber-400/30 shrink-0 self-start sm:self-auto shadow-inner">
            <div className="flex items-center gap-2">
              {showOnSidebar ? (
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <EyeOff className="w-3.5 h-3.5 text-white/40" />
              )}
              <span className="text-xs font-semibold text-white select-none">
                Show on Sidebar
              </span>
            </div>
            <Switch
              checked={showOnSidebar}
              onCheckedChange={handleToggleSidebar}
              className="data-[state=checked]:bg-amber-400 cursor-pointer"
            />
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
              showOnSidebar 
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
                : "bg-white/10 text-white/50 border border-white/10"
            }`}>
              {showOnSidebar ? "ACTIVE" : "OFF"}
            </span>
          </div>
        </div>

        {/* 60-Day Notification Callout */}
        <div className="flex items-start sm:items-center gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-400/30 text-xs text-amber-200">
          <Bell className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0 animate-bounce" />
          <div className="flex-1 leading-relaxed">
            <span className="font-bold text-white">Sidebar Activation Notification:</span>{" "}
            This page is configured to be visible on the sidebar <span className="font-semibold text-amber-300 underline decoration-amber-400/60 underline-offset-2">60 days before this client's plan ends</span> (currently <strong className="text-white font-mono">{daysRemaining} days remaining</strong> until {expirationDate}). It is permanently available under <strong>Plan Renewal</strong> in the sidebar so parents and advocates can plan ahead with zero disruption.
          </div>
        </div>
      </div>

      {/* ── The 4 Core Choices (Keep Vault, Tool Access, $55 Advisory, $100 Representation) ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-amber-400" />
              Select Your Plan Renewal & Transition Directive
            </h2>
            <p className="text-xs text-blue-200/60">
              Click any path below to preview benefits and lock in your continuity choice before the term closes.
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-mono border-blue-900/40 text-white/70 self-start sm:self-auto">
            4 Available Paths
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
          {transitionOptions.map((option) => {
            const isSelected = selectedDirective === option.id;
            const Icon = option.icon;

            return (
              <div
                key={option.id}
                onClick={() => setSelectedDirective(option.id)}
                className={`group relative rounded-3xl p-5 sm:p-6 transition-all duration-300 cursor-pointer flex flex-col justify-between border shadow-xl backdrop-blur-md overflow-hidden ${
                  isSelected
                    ? "bg-gradient-to-br from-[#0B2553] via-[#092248] to-[#04122C] border-amber-400 shadow-[0_0_30px_rgba(245,181,68,0.2)] -translate-y-1"
                    : `bg-[#06172F]/90 border-blue-900/40 hover:bg-[#081F42] ${option.borderGlow}`
                }`}
              >
                {/* Top Accent Line for Selected Card */}
                {isSelected && (
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500" />
                )}

                <div className="space-y-4">
                  {/* Top Header Row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className={`w-12 h-12 rounded-2xl bg-[#030C22] border border-white/10 flex items-center justify-center ${option.accentColor} shadow-inner group-hover:scale-105 transition-transform`}>
                      <Icon className="w-6 h-6" />
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border font-mono ${option.badgeColor}`}>
                        {option.badge}
                      </span>
                      {isSelected ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 font-mono">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> Selected
                        </span>
                      ) : (
                        <span className="text-[10px] text-white/40 font-mono">
                          Click to select
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Pricing */}
                  <div className="space-y-1">
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                      {option.title}
                    </h3>
                    <p className="text-[11px] text-blue-200/70 leading-relaxed line-clamp-2">
                      {option.subtitle}
                    </p>
                    <div className="pt-2">
                      <span className="text-2xl font-black text-amber-300 font-mono">{option.price}</span>
                      <span className="text-xs text-white/50 font-normal ml-1">{option.cadence}</span>
                    </div>
                  </div>

                  {/* Highlights List */}
                  <div className="space-y-2 pt-3 border-t border-white/10 text-xs">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400/90 font-mono block">
                      What is included:
                    </span>
                    <ul className="space-y-2">
                      {option.highlights.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-white/85 text-[11px] leading-relaxed">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Footer Recommendation */}
                <div className="mt-5 pt-3 border-t border-white/10 space-y-3">
                  <div className="p-2.5 rounded-xl bg-[#030C22]/80 border border-white/5 text-[10px] text-blue-200/70 leading-relaxed">
                    <strong className="text-white block mb-0.5">Ideal for:</strong>
                    {option.recommendedFor}
                  </div>

                  <Button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDirective(option.id);
                      setShowConfirmModal(true);
                    }}
                    className={`w-full font-bold text-xs h-10 rounded-xl transition-all cursor-pointer ${
                      isSelected
                        ? "bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-md shadow-amber-400/20"
                        : "bg-white/5 hover:bg-white/10 text-white border border-white/15"
                    }`}
                  >
                    {isSelected ? "Confirm This Directive" : "Choose This Path"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Active Selection Confirmation Banner ── */}
      <div className="rounded-3xl border border-amber-400/30 bg-gradient-to-r from-[#06172F] via-[#092248] to-[#06172F] p-5 sm:p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start gap-4 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
            <CheckCircle2 className="w-6 h-6 text-amber-400" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-white/50 uppercase font-mono tracking-wider">Current Selected Directive:</span>
              <span className="text-xs font-bold text-amber-300 font-mono px-2 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/20">
                {activeOption.title}
              </span>
            </div>
            <p className="text-xs text-blue-200/80 leading-relaxed">
              Scheduled to activate on <strong className="text-white">{expirationDate}</strong> upon conclusion of your current plan. Saved card on file (Visa •••• 4242) will be adjusted accordingly.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            onClick={handleDownloadFullArchive}
            className="border-blue-900/40 bg-[#030C22] hover:bg-white/10 text-white text-xs font-semibold h-10 px-4 rounded-xl gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Download Archive (ZIP)</span>
          </Button>

          <Button
            onClick={() => setShowConfirmModal(true)}
            className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs h-10 px-5 rounded-xl shadow-lg shadow-amber-400/25 cursor-pointer flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>Save Transition Choice</span>
          </Button>
        </div>
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
              Confirm Transition to: {activeOption.title}
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
              onClick={handleSaveDirective}
              disabled={isSubmitting}
              className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl gap-1.5"
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
