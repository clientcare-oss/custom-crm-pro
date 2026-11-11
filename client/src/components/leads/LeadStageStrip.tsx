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
    <div className="space-y-2">
      <nav
        aria-label="Lead Journey Stages"
        data-testid="lead-stage-navigation-strip"
        className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-xl border border-[#162952] bg-[#040D26]/95 p-1.5"
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
                  ? "bg-[#0D1E47] border-[#D4AF37]/60 text-white shadow-[0_4px_14px_rgba(0,0,0,0.45)]"
                  : isCompleted
                  ? "bg-[#06122E] border-[#162952] text-slate-200 hover:bg-[#09193D] hover:border-[#243E73]"
                  : isCurrentPersisted
                  ? "bg-[#081638] border-[#284782] text-white hover:bg-[#0D1E47]"
                  : "bg-[#030A1E]/70 border-transparent text-slate-400 hover:bg-[#06122E] hover:text-slate-200"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {isCompleted ? (
                  <CheckCircle2
                    className="w-4 h-4 text-emerald-400 shrink-0"
                    aria-hidden="true"
                  />
                ) : isCurrentPersisted ? (
                  <CircleDot
                    className="w-4 h-4 text-[#FFE394] shrink-0"
                    aria-hidden="true"
                  />
                ) : (
                  <Circle
                    className="w-4 h-4 text-slate-500 shrink-0"
                    aria-hidden="true"
                  />
                )}

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold tracking-tight truncate">
                      {idx + 1}. {step.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "text-[10px] font-medium",
                        isCompleted
                          ? "text-emerald-300/90"
                          : isCurrentPersisted
                          ? "text-[#FFE394]"
                          : "text-slate-400"
                      )}
                    >
                      {stateLabel}
                    </span>
                  </div>
                </div>
              </div>

              {isViewed && (
                <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-slate-200 shrink-0">
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
          className="flex items-center justify-between gap-3 rounded-lg border border-[#1E3358] bg-[#06122E] px-3.5 py-2 text-xs text-slate-300"
        >
          <span>
            Reviewing <strong className="text-white capitalize">{viewedStage}</strong> stage · Family’s active stage remains{" "}
            <strong className="text-[#FFE394] capitalize">
              {currentPersistedStage === "active" ? "Active Client" : activePersistedTab}
            </strong>{" "}
            (completed work is preserved).
          </span>
          <button
            type="button"
            onClick={() => onSelectStage(activePersistedTab)}
            className="inline-flex items-center gap-1 font-medium text-[#FFE394] hover:text-white shrink-0 cursor-pointer"
          >
            Return to {activePersistedTab}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
