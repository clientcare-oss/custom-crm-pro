import React from "react";
import { Anchor, FileText, CalendarCheck2, CheckCircle2, Waves, Compass } from "lucide-react";
import { cn } from "@/lib/utils";

interface GuidedHorizonsProcessStripProps {
  currentStage?: "waiting" | "received" | "processing" | "advocate_review" | "complete";
  previousIepDate?: string;
  meetingDate?: string;
  updatedIepDate?: string;
}

export function GuidedHorizonsProcessStrip({
  currentStage = "advocate_review",
  previousIepDate = "Aug 14, 2026",
  meetingDate = "Sept 18, 2026",
  updatedIepDate = "Sept 25, 2026",
}: GuidedHorizonsProcessStripProps) {
  const steps = [
    {
      id: "prev_iep",
      icon: FileText,
      label: "Previous IEP",
      subLabel: "Found",
      date: previousIepDate,
      active: true,
      completed: true,
    },
    {
      id: "meeting_record",
      icon: CalendarCheck2,
      label: "Meeting Record",
      subLabel: "Found",
      date: meetingDate,
      active: true,
      completed: true,
    },
    {
      id: "portmaster",
      icon: Anchor,
      label: "Portmaster",
      subLabel: "Active Review",
      date: "Reconciling Decisions",
      isAnchor: true,
      active: true,
      completed: currentStage === "complete",
    },
    {
      id: "updated_iep",
      icon: FileText,
      label: "Updated IEP",
      subLabel: "Received",
      date: updatedIepDate,
      active: true,
      completed: true,
    },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#031326] via-[#051C38] to-[#020E1E] border border-[#0F3B6E] p-3 sm:p-4 shadow-xl">
      {/* Background nautical ocean horizon line & wave aura */}
      <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
        <svg
          className="absolute bottom-0 w-full h-12 text-teal-400"
          preserveAspectRatio="none"
          viewBox="0 0 1200 120"
        >
          <path
            d="M0,0 C150,90 350,-40 500,45 C650,130 900,10 1200,40 L1200,120 L0,120 Z"
            fill="currentColor"
            fillOpacity="0.15"
          />
          <path
            d="M0,30 C200,10 450,80 700,20 C950,-30 1100,60 1200,30 L1200,120 L0,120 Z"
            fill="currentColor"
            fillOpacity="0.25"
          />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
        {/* Left Nautical Anchor Brand Pill */}
        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
          <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500/20 to-blue-600/30 border border-teal-400/40 flex items-center justify-center text-teal-300 shadow-[0_0_12px_rgba(20,184,166,0.25)]">
            <Anchor className="h-4 w-4 text-teal-300" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold tracking-wider uppercase text-white font-mono">
                Portmaster
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-950/80 border border-teal-500/30 text-teal-300 font-semibold">
                3-Way Verification
              </span>
            </div>
            <p className="text-[11px] text-blue-200/70">
              Previous IEP · Meeting Record · Updated Draft
            </p>
          </div>
        </div>

        {/* Process Horizon Track with Little Sailboat */}
        <div className="flex-1 w-full max-w-3xl">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 relative">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isCurrent = step.isAnchor;

              return (
                <div
                  key={step.id}
                  className={cn(
                    "relative rounded-xl p-2 sm:p-2.5 border transition-all text-left flex items-start gap-2",
                    isCurrent
                      ? "bg-[#092B54]/90 border-teal-400/60 shadow-[0_0_15px_rgba(20,184,166,0.18)]"
                      : "bg-[#041528]/80 border-[#0E355E] text-slate-200"
                  )}
                >
                  {/* Subtle Glowing Boat marker on the current anchor step */}
                  {isCurrent && (
                    <div
                      className="absolute -top-3.5 right-2 text-xs flex items-center gap-1 bg-[#061B35] px-1.5 py-0.5 rounded-full border border-teal-400/50 shadow-md text-teal-300 animate-bounce"
                      title="Portmaster processing position on the Guided Horizons passage"
                    >
                      <span>⛵</span>
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider">Here</span>
                    </div>
                  )}

                  <div
                    className={cn(
                      "p-1.5 rounded-lg shrink-0 mt-0.5",
                      isCurrent
                        ? "bg-teal-500/20 text-teal-300 border border-teal-400/40"
                        : "bg-[#08203E] text-blue-300 border border-[#113B6B]"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11.5px] font-bold text-white truncate block">
                        {step.label}
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    </div>
                    <span className="text-[10px] text-teal-300 font-semibold block truncate">
                      {step.subLabel}
                    </span>
                    <span className="text-[10px] font-mono text-blue-200/60 block truncate">
                      {step.date}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
