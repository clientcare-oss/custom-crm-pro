import React, { useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Compass,
  FileSearch,
  Calendar,
  Sparkles,
  FileText,
  Landmark,
  ArrowRight,
  Radio,
  ShieldCheck,
  Star,
  Clock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { GuideClientLiveModal } from "@/components/guidance/GuideClientLiveModal";
import type { FamilyLifecycleStage } from "./StudentCurrentFocusPanel";

interface StudentJourneyGuideButtonProps {
  student: any;
  parent?: any;
  stage: FamilyLifecycleStage;
  isDiscoveryCompleted?: boolean;
  hasComplaintDraft?: boolean;
  onNavigate: (path: string) => void;
  onSetActiveTab?: (tab: string) => void;
  onOpenScheduleModal?: () => void;
  onOpenApprovalModal?: () => void;
  className?: string;
}

interface JourneyPhaseItem {
  stepNumber: number;
  id: string;
  title: string;
  subtitle: string;
  description: string;
  status: "completed" | "current" | "upcoming";
  actionLabel: string;
  onAction: () => void;
  icon: React.ComponentType<{ className?: string }>;
}

export function StudentJourneyGuideButton({
  student,
  parent,
  stage,
  isDiscoveryCompleted = false,
  hasComplaintDraft = false,
  onNavigate,
  onSetActiveTab,
  onOpenScheduleModal,
  onOpenApprovalModal,
  className,
}: StudentJourneyGuideButtonProps) {
  const [guideOpen, setGuideOpen] = useState(false);
  const [liveCoBrowseOpen, setLiveCoBrowseOpen] = useState(false);

  const studentId = student?.id || 0;
  const studentName = student
    ? `${student.firstName || ""} ${student.lastName || ""}`.trim() || "Student"
    : "Student";

  const phases: JourneyPhaseItem[] = [
    {
      stepNumber: 1,
      id: "discovery",
      title: "Discovery & Intake Evaluation",
      subtitle: "Initial consultation, family priorities & eligibility intake",
      description:
        "Conduct the discovery call with the family, capture parent concerns, and determine the recommended advocacy plan.",
      status:
        stage === "DISCOVERY"
          ? "current"
          : "completed",
      actionLabel: isDiscoveryCompleted
        ? "Review Discovery Session"
        : "Open Discovery Console",
      onAction: () => {
        setGuideOpen(false);
        onNavigate(`/leads/1/discovery`);
      },
      icon: Compass,
    },
    {
      stepNumber: 2,
      id: "enrollment",
      title: "Family Enrollment & Service Agreement",
      subtitle: "Plan selection, e-signature & Stripe billing activation",
      description:
        "Approve the family for enrollment so the parent can select their plan in the portal, sign the advocacy agreement, and activate membership.",
      status:
        stage === "DISCOVERY"
          ? isDiscoveryCompleted
            ? "current"
            : "upcoming"
          : stage === "ENROLLMENT_PENDING"
          ? "current"
          : "completed",
      actionLabel:
        stage === "DISCOVERY"
          ? "Approve for Enrollment"
          : "Review Enrollment & Agreements",
      onAction: () => {
        setGuideOpen(false);
        if (stage === "DISCOVERY" && onOpenApprovalModal) {
          onOpenApprovalModal();
        } else {
          onNavigate(`/agreements`);
        }
      },
      icon: ShieldCheck,
    },
    {
      stepNumber: 3,
      id: "records_audit",
      title: "Records Vault & IEP Intelligence Audit",
      subtitle: "Step 1 Assemble · Upload IEP, evaluations & PWN documents",
      description:
        "Gather the student's prior IEPs, psychological evaluations, and progress reports in the Document Vault and run the IEP Intelligence review.",
      status:
        stage === "ACTIVE" || stage === "RENEWAL"
          ? "current"
          : "upcoming",
      actionLabel: "Open Step 1: Assemble & IEP Intel",
      onAction: () => {
        setGuideOpen(false);
        onNavigate(`/meeting-workspace/${studentId}?tab=assemble&step=iep_intel`);
      },
      icon: FileSearch,
    },
    {
      stepNumber: 4,
      id: "blueprint",
      title: "IEP Blueprint & Parent Strategy Session",
      subtitle: "Step 2 Blueprint · Draft measurable goals, accommodations & asks",
      description:
        "Collaborate with the parent to finalize target IEP goals, service minutes, placement asks, and parent agenda points before the school meeting.",
      status:
        stage === "ACTIVE" || stage === "RENEWAL"
          ? "upcoming"
          : "upcoming",
      actionLabel: "Open Step 2: IEP Blueprint",
      onAction: () => {
        setGuideOpen(false);
        onNavigate(`/meeting-workspace/${studentId}?tab=blueprint`);
      },
      icon: Sparkles,
    },
    {
      stepNumber: 5,
      id: "meeting_space",
      title: "Live IEP Meeting & First Mate Co-Pilot",
      subtitle: "Step 3 Meeting Space · Real-time advocacy guidance & recording",
      description:
        "Lead the live IEP meeting with First Mate active for instant IDEA statutory prompts, commitment tracking, and Voyage audio capture.",
      status: "upcoming",
      actionLabel: "Launch Step 3: Meeting Space",
      onAction: () => {
        setGuideOpen(false);
        onNavigate(`/meeting-workspace/${studentId}?tab=meeting-space`);
      },
      icon: Calendar,
    },
    {
      stepNumber: 6,
      id: "post_meeting",
      title: "Post-Meeting PWN Audit, Escalation & Review",
      subtitle: "Verify Prior Written Notice, State Complaint docket & family review",
      description:
        "Audit the district's Prior Written Notice against meeting commitments, escalate to the State Complaint Builder if needed, or request a family review.",
      status: stage === "RENEWAL" ? "current" : "upcoming",
      actionLabel: hasComplaintDraft
        ? "Open State Complaint Docket"
        : "Open Post-Meeting Review",
      onAction: () => {
        setGuideOpen(false);
        if (hasComplaintDraft) {
          onNavigate(`/state-complaint-builder?studentId=${studentId}`);
        } else {
          onNavigate(`/post-meeting-review/${studentId}`);
        }
      },
      icon: hasComplaintDraft ? Landmark : FileText,
    },
  ];

  const currentPhase =
    phases.find((p) => p.status === "current") || phases[2];

  return (
    <>
      {/* ── Tactile Navy & Brass "Student Journey / Guide Me" Plaque Button (Gold Outline, Brighter & 3D Depth) ── */}
      <button
        type="button"
        onClick={() => setGuideOpen(true)}
        data-testid="student-journey-guide-me-btn"
        title={`Open Guided Student Journey for ${studentName}`}
        className={cn(
          "group relative inline-flex items-center gap-3.5 px-4.5 py-2.5 rounded-[12px] select-none cursor-pointer transition-all duration-200 shrink-0",
          "bg-gradient-to-b from-[#143364] via-[#0B2144] to-[#061329]",
          "border border-[#D4AF37]/70 hover:border-[#FFE394]",
          "shadow-[0_10px_24px_rgba(0,0,0,0.88),0_2px_6px_rgba(0,0,0,0.7),inset_0_1px_0.5px_rgba(255,243,196,0.28),inset_0_-2px_3px_rgba(0,0,0,0.92)]",
          "hover:from-[#1A407C] hover:via-[#0F2A56] hover:to-[#081833] hover:shadow-[0_12px_28px_rgba(0,0,0,0.92),0_0_16px_rgba(229,193,104,0.32),inset_0_1px_1px_rgba(255,248,214,0.4)]",
          "active:translate-y-[0.5px]",
          className
        )}
      >
        {/* Subtle inner top specular reflection & brushed sheen */}
        <div
          className="absolute inset-0 rounded-[10px] pointer-events-none opacity-45"
          style={{
            background:
              "radial-gradient(ellipse at 35% 15%, rgba(147,197,253,0.24) 0%, transparent 68%)",
          }}
        />

        {/* Left Golden Open Book Icon */}
        <BookOpen
          className="relative z-10 w-7 h-7 text-[#F2CE74] group-hover:text-[#FFF0B8] stroke-[1.85] shrink-0 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] transition-transform duration-200 group-hover:scale-105"
        />

        {/* Right Stacked Two-Line Typography: "Student Journey" / "Guide Me" */}
        <div className="relative z-10 flex flex-col items-start text-left leading-none">
          <span
            className="text-[16px] sm:text-[17.5px] font-bold tracking-tight text-[#FFFDF7] group-hover:text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] whitespace-nowrap"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Student Journey
          </span>
          <span className="text-[12.5px] sm:text-[13.5px] italic font-normal text-[#C8D7EC] group-hover:text-[#E2EEFF] mt-1 tracking-wide whitespace-nowrap drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
            Guide Me
          </span>
        </div>
      </button>

      {/* ── Guided Student Journey Interactive Roadmap Modal ── */}
      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent className="max-w-2xl bg-gradient-to-b from-[#0C2242] via-[#07162B] to-[#040C1A] border-2 border-[#C5A059]/70 text-[#FFF4D4] rounded-2xl p-6 shadow-[0_25px_70px_rgba(0,0,0,0.95)] max-h-[88vh] flex flex-col overflow-hidden">
          <DialogHeader className="pb-4 border-b border-[#244373] shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-b from-[#173A6E] to-[#081833] border border-[#D4AF37]/75 flex items-center justify-center text-[#FFE394] shadow-md shrink-0">
                  <BookOpen className="w-5.5 h-5.5" />
                </div>
                <div>
                  <DialogTitle
                    className="text-xl sm:text-2xl font-bold text-[#FFF4D4]"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    Student Journey — Guide Me
                  </DialogTitle>
                  <DialogDescription className="text-xs text-[#93B4DB] mt-0.5">
                    Step-by-step advocacy roadmap & recommended next action for{" "}
                    <strong className="text-[#FFE394]">{studentName}</strong>
                  </DialogDescription>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setGuideOpen(false);
                  setLiveCoBrowseOpen(true);
                }}
                className="h-8 px-3 rounded-lg bg-[#0A1E3D] hover:bg-[#133260] border border-[#3B6CB7]/70 hover:border-[#78A9FF] text-[11px] font-semibold text-[#93C5FD] hover:text-white inline-flex items-center gap-1.5 transition-all cursor-pointer"
                title="Guide parent live inside their Client Portal"
              >
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Guide Family Live in Portal</span>
              </button>
            </div>
          </DialogHeader>

          {/* Recommended Next Step Spotlight Banner */}
          <div className="my-3 p-4 rounded-xl bg-gradient-to-r from-[#132F5C]/95 via-[#0D2347]/95 to-[#081730]/95 border border-[#FFE394]/60 shadow-[0_6px_20px_rgba(0,0,0,0.75)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-[#FFE394] text-[#07162B]">
                  Recommended Next Step
                </span>
                <span className="text-xs font-semibold text-[#93C5FD]">
                  Phase {currentPhase.stepNumber} of {phases.length}
                </span>
              </div>
              <h4
                className="text-base sm:text-lg font-bold text-white"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {currentPhase.title}
              </h4>
              <p className="text-xs text-[#C6B697] leading-relaxed">
                {currentPhase.description}
              </p>
            </div>

            <button
              type="button"
              onClick={currentPhase.onAction}
              className="h-10 px-4 rounded-xl bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:brightness-110 text-[#07162B] font-bold text-xs inline-flex items-center gap-1.5 border border-[#FFE394] shadow-md shrink-0 cursor-pointer"
            >
              <span>{currentPhase.actionLabel}</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* 6-Phase Student Advocacy Journey List */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {phases.map((phase) => {
              const Icon = phase.icon;
              const isCurrent = phase.status === "current";
              const isCompleted = phase.status === "completed";

              return (
                <div
                  key={phase.id}
                  className={cn(
                    "rounded-xl p-3.5 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                    isCurrent
                      ? "bg-[#0E274D]/95 border-[#D4AF37] shadow-[0_0_16px_rgba(212,175,55,0.2)]"
                      : isCompleted
                      ? "bg-[#051226]/85 border-emerald-500/35"
                      : "bg-[#040D1E]/75 border-[#1B355E] hover:border-[#3B6CB7]"
                  )}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs border mt-0.5",
                        isCompleted
                          ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-300"
                          : isCurrent
                          ? "bg-gradient-to-b from-[#F2CD80] to-[#C5A059] border-[#FFE394] text-[#07162B]"
                          : "bg-[#081A35] border-[#264778] text-[#93C5FD]"
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#8DA4C4]">
                          Step {phase.stepNumber}
                        </span>
                        <h5 className="text-sm font-bold text-[#FFF4D4] truncate">
                          {phase.title}
                        </h5>
                        {isCurrent && (
                          <span className="px-2 py-0.2 rounded-full text-[9.5px] font-bold uppercase bg-[#C5A059]/25 text-[#FFE394] border border-[#C5A059]/60">
                            Current Focus
                          </span>
                        )}
                        {isCompleted && (
                          <span className="px-2 py-0.2 rounded-full text-[9.5px] font-semibold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/35">
                            Complete
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#93B4DB] mt-0.5">
                        {phase.subtitle}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={phase.onAction}
                    className={cn(
                      "h-8 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 transition-all cursor-pointer border",
                      isCurrent
                        ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border-[#FFE394] font-bold"
                        : "bg-[#07162B] hover:bg-[#102A52] text-[#D8C7A5] hover:text-white border-[#294A7A]"
                    )}
                  >
                    <span>{phase.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Quick Dossier Shortcuts Footer */}
          <div className="pt-3 mt-2 border-t border-[#1E3B68] flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setGuideOpen(false);
                  onSetActiveTab?.("documents");
                }}
                className="px-2.5 py-1 rounded-lg bg-[#051226] hover:bg-[#0D2447] border border-[#244373] text-[#B9CDE3] hover:text-white cursor-pointer"
              >
                Document Vault
              </button>
              <button
                type="button"
                onClick={() => {
                  setGuideOpen(false);
                  onSetActiveTab?.("tasks");
                }}
                className="px-2.5 py-1 rounded-lg bg-[#051226] hover:bg-[#0D2447] border border-[#244373] text-[#B9CDE3] hover:text-white cursor-pointer"
              >
                Student Tasks
              </button>
              <button
                type="button"
                onClick={() => {
                  setGuideOpen(false);
                  onOpenScheduleModal?.();
                }}
                className="px-2.5 py-1 rounded-lg bg-[#051226] hover:bg-[#0D2447] border border-[#244373] text-[#B9CDE3] hover:text-white cursor-pointer"
              >
                Schedule Session
              </button>
            </div>

            <button
              type="button"
              onClick={() => setGuideOpen(false)}
              className="px-3 py-1 rounded-lg bg-[#081A35] hover:bg-[#122D59] border border-[#2C528C] text-[#FFE394] font-semibold cursor-pointer"
            >
              Close Guide
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Live Client Portal Co-Browse Modal */}
      {liveCoBrowseOpen && (
        <GuideClientLiveModal
          open={liveCoBrowseOpen}
          onOpenChange={setLiveCoBrowseOpen}
          contact={student}
          parentContact={parent}
        />
      )}
    </>
  );
}
