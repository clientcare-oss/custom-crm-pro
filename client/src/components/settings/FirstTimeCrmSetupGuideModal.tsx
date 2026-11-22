import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sparkles,
  CheckCircle2,
  Building2,
  ClipboardList,
  Calendar,
  Briefcase,
  Users,
  Laptop,
  UploadCloud,
  ArrowRight,
  Compass,
  HelpCircle,
  Check,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import type { SettingsSectionKey } from "./SettingsCommandBoxes";

interface FirstTimeCrmSetupGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasPracticePhone?: boolean;
  hasPracticeAddress?: boolean;
  onSelectSettingsSection?: (section: SettingsSectionKey) => void;
}

interface SetupStepItem {
  id: string;
  stepNumber: number;
  title: string;
  subtitle: string;
  helpWords: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  ctaLabel: string;
  actionType: "stay_business" | "settings_tab" | "route";
  targetSection?: SettingsSectionKey;
  targetRoute?: string;
}

const SETUP_STEPS: SetupStepItem[] = [
  {
    id: "practice-profile",
    stepNumber: 1,
    title: "1. Practice Profile, Phone & Official Address",
    subtitle: "Your headquarters name, phone number, email, and logo",
    helpWords:
      "Start here first. Whatever phone number, email, and mailing address you save on this Business Profile page automatically updates your client receipts, parent portal header, and public intake confirmation screen.",
    badge: "PG-024-BIZ",
    icon: Building2,
    ctaLabel: "Review Business Profile Below",
    actionType: "stay_business",
  },
  {
    id: "lead-intake-forms",
    stepNumber: 2,
    title: "2. Public Family Intake Form & Confirmation Screen",
    subtitle: "How new parents inquire and book their discovery call",
    helpWords:
      "Customize the questions parents answer when they reach out for IEP advocacy, preview your 'Thank You & Save Our Number' confirmation page, and grab your website link or embed code.",
    badge: "PG-012",
    icon: ClipboardList,
    ctaLabel: "Open Lead Forms Builder",
    actionType: "route",
    targetRoute: "/leads/forms",
  },
  {
    id: "calendar-session-types",
    stepNumber: 3,
    title: "3. Calendar, Working Hours & Session Types",
    subtitle: "Discovery Calls, 1:1 Advocate Sessions, and 3-Hr IEP Meetings",
    helpWords:
      "Set up the appointment types families can book with you and block out your working hours, holidays, or protected casework time so you never get double-booked.",
    badge: "PG-007 / PG-008",
    icon: Calendar,
    ctaLabel: "Configure Session Types & Calendar",
    actionType: "route",
    targetRoute: "/calendar?tab=session-types",
  },
  {
    id: "services-agreements",
    stepNumber: 4,
    title: "4. Advocacy Services, Pricing & Agreements",
    subtitle: "Your service packages, retainers, and e-sign contracts",
    helpWords:
      "Define your advocacy packages, hourly or flat-fee tiers, and legal service agreements so you can send a 1-click proposal and retainer checkout during or right after a Discovery Call.",
    badge: "PG-035 / PG-046",
    icon: Briefcase,
    ctaLabel: "Open Services Catalog",
    actionType: "route",
    targetRoute: "/services",
  },
  {
    id: "client-portal-receipts",
    stepNumber: 5,
    title: "5. Family Portal Experience & Payment Receipts",
    subtitle: "What parents see after they sign and pay",
    helpWords:
      "Preview the 14-step Parent Portal journey (document vault upload, Case Compass, and messaging) and verify how your official Waypoint payment receipts look when a family pays.",
    badge: "PG-023 / PG-024-REC",
    icon: Laptop,
    ctaLabel: "Configure Client Portal & Receipts",
    actionType: "settings_tab",
    targetSection: "portal",
  },
  {
    id: "team-and-import",
    stepNumber: 6,
    title: "6. Invite Advocates or Import Existing Families",
    subtitle: "Bring over your current caseload and staff roster",
    helpWords:
      "Already have active families in spreadsheets or another CRM? Use the Client CRM Import tool to bring them in, or visit Team Management to add fellow advocates and staff.",
    badge: "PG-024-IMP / PG-019",
    icon: UploadCloud,
    ctaLabel: "Open Client CRM Import",
    actionType: "settings_tab",
    targetSection: "import",
  },
];

const STORAGE_KEY = "waypoint_first_time_setup_completed_steps_v1";

export function FirstTimeCrmSetupGuideModal({
  open,
  onOpenChange,
  hasPracticePhone = true,
  hasPracticeAddress = true,
  onSelectSettingsSection,
}: FirstTimeCrmSetupGuideModalProps) {
  const [, setLocation] = useLocation();
  const [completedIds, setCompletedIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return ["practice-profile"];
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return hasPracticePhone && hasPracticeAddress ? ["practice-profile"] : [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(completedIds));
    } catch {
      // ignore
    }
  }, [completedIds]);

  const toggleStepComplete = (id: string) => {
    setCompletedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const completedCount = completedIds.length;
  const totalCount = SETUP_STEPS.length;
  const progressPct = Math.round((completedCount / totalCount) * 100);

  const handleLaunchStep = (step: SetupStepItem) => {
    if (!completedIds.includes(step.id)) {
      setCompletedIds((prev) => [...prev, step.id]);
    }
    onOpenChange(false);

    if (step.actionType === "stay_business") {
      toast.info(
        "Step 1: Verify your Practice Phone, Email, Address, and Logo right below, then click 'Save Business Settings'."
      );
      return;
    }
    if (step.actionType === "settings_tab" && step.targetSection) {
      onSelectSettingsSection?.(step.targetSection);
      return;
    }
    if (step.actionType === "route" && step.targetRoute) {
      setLocation(step.targetRoute);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="first-time-crm-setup-modal"
        className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[#05142B] border-2 border-[#C5A059]/80 text-[#FFF4D4] rounded-2xl shadow-[0_24px_70px_rgba(0,0,0,0.95)] p-0"
      >
        {/* Top Brushed Gold Accent Bar */}
        <div
          className="h-2 w-full"
          style={{
            backgroundImage:
              "linear-gradient(90deg, #B58534 0%, #ECC97A 30%, #FFF7DC 50%, #EBC776 70%, #B0802F 100%)",
          }}
        />

        <div className="p-5 sm:p-6 space-y-5">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#020A17] border border-[#C5A059]/60 text-[#FFE394] text-xs font-semibold">
                <Compass className="w-3.5 h-3.5 text-[#FAD77B]" />
                <span>First-Time Setup & Practice Launch Guide</span>
              </div>
              <span className="text-xs font-mono text-emerald-300 bg-emerald-950/70 border border-emerald-500/40 px-2.5 py-1 rounded-full font-bold">
                {completedCount} of {totalCount} Steps Complete ({progressPct}%)
              </span>
            </div>

            <DialogTitle
              className="text-2xl sm:text-3xl font-serif font-bold text-[#FFF4D4]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Getting Your Waypoint CRM Going — Step-by-Step
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-[#C6B697] leading-relaxed">
              New to setting up your CRM? Follow these 6 plain-English steps in order. You can check off each step as you go and jump straight to the exact page you need.
            </DialogDescription>

            {/* Progress Bar */}
            <div className="w-full h-2.5 rounded-full bg-[#020A17] border border-[#3A2C18] overflow-hidden p-0.5 mt-2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-[#DFBE77] to-[#FFE394] transition-all duration-300"
                style={{ width: `${Math.max(8, progressPct)}%` }}
              />
            </div>
          </DialogHeader>

          {/* 6 Guided Setup Cards */}
          <div className="space-y-3">
            {SETUP_STEPS.map((step) => {
              const Icon = step.icon;
              const isDone = completedIds.includes(step.id);

              return (
                <div
                  key={step.id}
                  data-testid={`first-time-setup-step-${step.stepNumber}`}
                  className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isDone
                      ? "bg-[#041226]/90 border-emerald-500/45"
                      : "bg-[#020A17]/90 border-[#3A2C18] hover:border-[#C5A059]/75"
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    {/* Checkable Step Circle */}
                    <button
                      type="button"
                      onClick={() => toggleStepComplete(step.id)}
                      title={
                        isDone
                          ? "Completed — click to uncheck"
                          : "Click to mark this setup step complete"
                      }
                      className={`mt-0.5 w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                        isDone
                          ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                          : "bg-[#05142B] border-[#C5A059]/60 text-[#FFE394] hover:border-[#FFE394]"
                      }`}
                    >
                      {isDone ? (
                        <Check className="w-4 h-4 stroke-[3]" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </button>

                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4
                          className="text-sm sm:text-base font-serif font-bold text-[#FFF4D4]"
                          style={{
                            fontFamily: "'Playfair Display', Georgia, serif",
                          }}
                        >
                          {step.title}
                        </h4>
                        <span className="px-2 py-0.5 rounded bg-[#05142B] border border-[#3A2C18] text-[10px] font-mono text-[#FFE394]">
                          {step.badge}
                        </span>
                        {isDone && (
                          <span className="text-[10px] font-mono font-bold text-emerald-400">
                            ✓ Ready
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-[#FAD77B]">
                        {step.subtitle}
                      </p>
                      <p className="text-xs text-[#C6B697] leading-relaxed">
                        {step.helpWords}
                      </p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-end justify-end gap-2 shrink-0">
                    <button
                      type="button"
                      data-testid={`launch-setup-step-${step.stepNumber}-btn`}
                      onClick={() => handleLaunchStep(step)}
                      className="h-9 px-3.5 rounded-xl bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:brightness-110 text-[#07162B] font-serif font-bold text-xs inline-flex items-center gap-1.5 border border-[#FFE394]/70 shadow-md cursor-pointer whitespace-nowrap"
                      style={{
                        fontFamily: "'Playfair Display', Georgia, serif",
                      }}
                    >
                      <span>{step.ctaLabel}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Helpful Tip Box */}
          <div className="p-3.5 rounded-xl bg-[#020A17] border border-[#C5A059]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start sm:items-center gap-2.5 text-[#C6B697]">
              <HelpCircle className="w-4 h-4 text-[#FFE394] shrink-0 mt-0.5 sm:mt-0" />
              <span>
                <strong className="text-[#FFF4D4]">Want a guided tour?</strong>{" "}
                You can also open <strong className="text-[#FFE394]">Walkthroughs (PG-017)</strong> anytime for interactive screen-by-screen tutorials.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                setLocation("/walkthroughs");
              }}
              className="px-3 py-1.5 rounded-lg border border-[#3A2C18] bg-[#05142B] text-[#FFE394] hover:border-[#C5A059] font-semibold shrink-0 cursor-pointer"
            >
              Open Walkthroughs →
            </button>
          </div>

          <DialogFooter className="flex items-center justify-between gap-2 pt-2 border-t border-[#3A2C18]">
            <button
              type="button"
              onClick={() =>
                setCompletedIds(SETUP_STEPS.map((s) => s.id))
              }
              className="text-xs text-[#A69371] hover:text-[#FFE394] underline cursor-pointer"
            >
              Mark all 6 steps complete
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-9 px-5 rounded-xl border border-[#3A2C18] bg-[#020A17] text-xs font-bold text-[#FFF4D4] hover:border-[#C5A059] cursor-pointer"
            >
              Close Setup Guide
            </button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
