import React from "react";
import { CheckCircle2, XCircle, HelpCircle, FileText, ChevronRight } from "lucide-react";
import type { DecodedDecisionItem, DecisionAction } from "./types";

interface PwnDecisionsSectionProps {
  decisions: DecodedDecisionItem[];
}

const ACTION_CONFIG: Record<
  DecisionAction,
  { label: string; icon: string; bg: string; text: string; border: string }
> = {
  PROPOSED: {
    label: "PROPOSED",
    icon: "🟢",
    bg: "bg-emerald-950/40",
    text: "text-emerald-300",
    border: "border-emerald-500/40",
  },
  REFUSED: {
    label: "REFUSED",
    icon: "🔴",
    bg: "bg-rose-950/40",
    text: "text-rose-300",
    border: "border-rose-500/40",
  },
  UNCLEAR: {
    label: "UNCLEAR",
    icon: "🟡",
    bg: "bg-amber-950/40",
    text: "text-amber-300",
    border: "border-amber-500/40",
  },
};

export const PwnDecisionsSection: React.FC<PwnDecisionsSectionProps> = ({ decisions }) => {
  return (
    <div id="section-decisions" className="w-full space-y-4">
      {/* Section Header */}
      <div className="border-b border-white/5 pb-3">
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <span>WHAT DID THE DISTRICT DECIDE?</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          One decision per card. Individual proposals, refusals, reasons, evidence, and alternatives documented by the district.
        </p>
      </div>

      {/* Decisions List - One Card Per Decision */}
      <div className="space-y-4">
        {decisions.map((dec, index) => {
          const actionConfig = ACTION_CONFIG[dec.action] || ACTION_CONFIG.UNCLEAR;

          return (
            <div
              key={dec.id || index}
              className="rounded-2xl border border-slate-800 bg-[#000820] p-5 space-y-4 shadow-lg hover:border-slate-700 transition-all"
            >
              {/* Decision Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-mono text-slate-300 font-bold">
                    {index + 1}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    {dec.decisionTitle}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border tracking-wider flex items-center gap-1.5 ${actionConfig.bg} ${actionConfig.border} ${actionConfig.text}`}
                  >
                    <span>{actionConfig.icon}</span>
                    <span>{actionConfig.label}</span>
                  </span>
                  {dec.documentLocation && (
                    <span className="text-[11px] text-slate-400 font-mono">
                      {dec.documentLocation}
                    </span>
                  )}
                </div>
              </div>

              {/* Grid of Key Stated Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* 1. What the PWN Says */}
                <div className="space-y-1.5 bg-slate-950/40 p-3.5 rounded-xl border border-white/5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    What the PWN Says:
                  </span>
                  <blockquote className="italic text-slate-200 border-l-2 border-amber-400/40 pl-2.5 py-0.5 leading-relaxed">
                    "{dec.pwnLanguage}"
                  </blockquote>
                </div>

                {/* 2. Plain Language Interpretation */}
                <div className="space-y-1.5 bg-slate-950/40 p-3.5 rounded-xl border border-white/5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 block">
                    Plain-Language Interpretation:
                  </span>
                  <p className="text-slate-200 leading-relaxed font-medium">
                    {dec.plainLanguage}
                  </p>
                </div>
              </div>

              {/* Stated Reasons & Evidence */}
              <div className="space-y-3 pt-1">
                {/* Why */}
                <div className="p-3.5 rounded-xl bg-slate-950/30 border border-white/5 space-y-1 text-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Why: District's Stated Reason
                  </span>
                  <p className="text-slate-200 leading-relaxed">
                    {dec.reason || (
                      <span className="text-rose-400 font-semibold">🔴 NOT LOCATED in PWN</span>
                    )}
                  </p>
                </div>

                {/* Evidence Relied Upon */}
                <div className="p-3.5 rounded-xl bg-slate-950/30 border border-white/5 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Evidence / Information Relied Upon:
                    </span>
                    {dec.evidenceIdentified && !dec.evidenceIdentified.toLowerCase().includes("not located") ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-semibold">
                        🟢 Identified
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950/60 border border-rose-500/30 text-rose-300 font-semibold">
                        🔴 NOT LOCATED
                      </span>
                    )}
                  </div>
                  <p className="text-slate-200 leading-relaxed">
                    {dec.evidenceIdentified || (
                      <span className="text-rose-400 font-semibold">
                        🔴 NOT LOCATED — No evaluation, assessment, or record identified as the basis.
                      </span>
                    )}
                  </p>
                </div>

                {/* Alternatives Considered & Stated Reason Rejected */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950/30 border border-white/5 space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Other Options Considered:
                    </span>
                    <p className="text-slate-300 leading-relaxed">
                      {dec.optionsConsidered || (
                        <span className="text-rose-400 font-semibold">🔴 NOT LOCATED</span>
                      )}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/30 border border-white/5 space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Why Alternatives Were Rejected:
                    </span>
                    <p className="text-slate-300 leading-relaxed">
                      {dec.rejectionReason || (
                        <span className="text-rose-400 font-semibold">🔴 NOT LOCATED</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Other Relevant Factors */}
                {dec.relevantFactors && (
                  <div className="p-3 rounded-xl bg-slate-950/20 border border-white/5 space-y-1 text-xs">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Other Relevant Factors Described:
                    </span>
                    <p className="text-slate-300 leading-relaxed">
                      {dec.relevantFactors}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
