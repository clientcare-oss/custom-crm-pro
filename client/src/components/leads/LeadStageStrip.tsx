import React from "react";
import { CheckCircle2, CircleDot, Circle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type WorkspaceStageTab = "inquiry" | "discovery" | "decision" | "onboarding";

interface LeadStageStripProps {
  currentPersistedStage: "inquiry" | "discovery" | "decision" | "onboarding" | "active";
  viewedStage: WorkspaceStageTab;
  onSelectStage: (stage: WorkspaceStageTab) => void;
  isClosed?: boolean;
}

const STAGE_STEPS: Array<{
  key: WorkspaceStageTab;
  label: string;
  pageId: string;
  order: number;
}> = [
  { key: "inquiry", label: "New Leads", pageId: "PG-003-INQ", order: 0 },
  { key: "discovery", label: "Discovery", pageId: "PG-003-DSC", order: 1 },
  { key: "decision", label: "Decision", pageId: "PG-003-DEC", order: 2 },
  { key: "onboarding", label: "Onboarding", pageId: "PG-003-ONB", order: 3 },
];

const STAGE_ORDER_MAP: Record<string, number> = {
  inquiry: 0,
  discovery: 1,
  decision: 2,
  onboarding: 3,
  active: 4,
};

export function LeadStageStrip({
  currentPersistedStage,
  viewedStage,
  onSelectStage,
  isClosed = false,
}: LeadStageStripProps) {
  const persistedIndex = STAGE_ORDER_MAP[currentPersistedStage] ?? 0;
  const activePersistedTab: WorkspaceStageTab =
    currentPersistedStage === "active" ? "onboarding" : currentPersistedStage;
  const isViewingHistoricalOrOtherStage = viewedStage !== activePersistedTab;

  return (
    <div className="space-y-2.5">
      <nav
        aria-label="Lead Journey Stages"
        data-testid="lead-stage-navigation-strip"
        className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-xl border border-cyan-400/30 bg-[#040C1E]/95 p-1.5 shadow-inner"
      >
        {STAGE_STEPS.map((step, idx) => {
          const isCompleted = persistedIndex > step.order || currentPersistedStage === "active";
          const isCurrentPersisted =
            persistedIndex === step.order && currentPersistedStage !== "active";
          const isViewed = viewedStage === step.key;

          let stateLabel = "Upcoming";
          if (isCompleted) stateLabel = "Completed";
          else if (isCurrentPersisted) stateLabel = isClosed ? "Closed" : "Current";

          return (
            <button
              key={step.key}
              type="button"
              data-testid={`stage-tab-${step.key}`}
              onClick={() => onSelectStage(step.key)}
              aria-current={isViewed ? "step" : undefined}
              className={cn(
                "group relative flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition-all cursor-pointer border",
                isViewed
                  ? "bg-gradient-to-r from-[#0C2248] to-[#081733] border-cyan-400/80 text-white shadow-[0_0_16px_rgba(34,211,238,0.22),inset_0_1px_0_rgba(103,232,249,0.25)]"
                  : isCompleted
                  ? "bg-[#06132B] border-cyan-500/25 text-slate-200 hover:bg-[#0A1D3E] hover:border-cyan-400/50"
                  : isCurrentPersisted
                  ? "bg-[#081836] border-cyan-400/40 text-white hover:bg-[#0C2248]"
                  : "bg-[#030917]/85 border-[#142547] text-slate-400 hover:bg-[#07152E] hover:text-slate-200"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                {isCompleted ? (
                  <CheckCircle2
                    className="w-4 h-4 text-emerald-400 shrink-0"
                    aria-hidden="true"
                  />
                ) : isCurrentPersisted ? (
                  <CircleDot
                    className="w-4 h-4 text-cyan-300 shrink-0"
                    aria-hidden="true"
                  />
                ) : (
                  <Circle
                    className="w-4 h-4 text-slate-500 shrink-0"
                    aria-hidden="true"
                  />
                )}

                <span className="text-xs sm:text-sm font-bold tracking-tight truncate">
                  {idx + 1}. {step.label}
                </span>
                <span
                  className={cn(
                    "text-[11px] font-semibold hidden md:inline",
                    isCompleted
                      ? "text-emerald-300"
                      : isCurrentPersisted
                      ? "text-cyan-300"
                      : "text-slate-400"
                  )}
                >
                  · {stateLabel}
                </span>
              </div>

              {isViewed && (
                <span className="text-[9.5px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-400/15 border border-cyan-400/40 text-cyan-200 shrink-0">
                  Viewing
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Reviewing an earlier or other stage notice — confirms lead did NOT move backward */}
      {isViewingHistoricalOrOtherStage && (
        <div
          data-testid="stage-review-mode-banner"
          className="flex items-center justify-between gap-3 rounded-xl border border-cyan-400/40 bg-[#071630] px-4 py-2.5 text-xs sm:text-sm text-slate-200"
        >
          <span>
            Reviewing <strong className="text-white capitalize">{viewedStage}</strong> stage · Family’s active stage remains{" "}
            <strong className="text-cyan-300 capitalize">
              {currentPersistedStage === "active" ? "Active Client" : activePersistedTab}
            </strong>{" "}
            (completed work is preserved).
          </span>
          <button
            type="button"
            onClick={() => onSelectStage(activePersistedTab)}
            className="inline-flex items-center gap-1.5 font-bold text-cyan-300 hover:text-white shrink-0 cursor-pointer"
          >
            Return to {activePersistedTab}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
