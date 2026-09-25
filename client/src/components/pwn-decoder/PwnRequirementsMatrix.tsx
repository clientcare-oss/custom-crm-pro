import React, { useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, ChevronDown, ChevronUp, BookOpen, MapPin } from "lucide-react";
import type { DecodedRequirementItem, RequirementStatus } from "./types";

interface PwnRequirementsMatrixProps {
  requirements: DecodedRequirementItem[];
}

const STATUS_BADGE: Record<
  RequirementStatus,
  { label: string; icon: string; bg: string; text: string; border: string }
> = {
  PRESENT: {
    label: "PRESENT",
    icon: "🟢",
    bg: "bg-emerald-950/40",
    text: "text-emerald-300",
    border: "border-emerald-500/30",
  },
  WEAK_UNCLEAR: {
    label: "WEAK / UNCLEAR",
    icon: "🟡",
    bg: "bg-amber-950/40",
    text: "text-amber-300",
    border: "border-amber-500/30",
  },
  NOT_LOCATED: {
    label: "NOT LOCATED",
    icon: "🔴",
    bg: "bg-rose-950/40",
    text: "text-rose-300",
    border: "border-rose-500/30",
  },
  UNABLE_TO_DETERMINE: {
    label: "UNABLE TO DETERMINE",
    icon: "⚪",
    bg: "bg-slate-900",
    text: "text-slate-300",
    border: "border-slate-700",
  },
};

export const PwnRequirementsMatrix: React.FC<PwnRequirementsMatrixProps> = ({ requirements }) => {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const toggleExpand = (key: string) => {
    setExpandedKey(expandedKey === key ? null : key);
  };

  return (
    <div id="section-requirements" className="w-full space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <span>REQUIRED PWN ELEMENTS</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Federal Prior Written Notice framework under IDEA (34 C.F.R. §300.503)
          </p>
        </div>

        {/* State Overlay Note */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#000820] border border-white/10 text-xs self-start sm:self-auto">
          <span className="text-slate-400">State Overlay:</span>
          <span className="text-amber-300 font-semibold">Not Configured</span>
        </div>
      </div>

      {/* Stacked Rows / Cards */}
      <div className="space-y-2.5">
        {requirements.map((req) => {
          const badge = STATUS_BADGE[req.status] || STATUS_BADGE.UNABLE_TO_DETERMINE;
          const isExpanded = expandedKey === req.requirementKey;

          return (
            <div
              key={req.requirementKey}
              className="rounded-xl border border-slate-800 bg-[#000820] overflow-hidden transition-all hover:border-slate-700"
            >
              {/* Row Header Button */}
              <button
                type="button"
                onClick={() => toggleExpand(req.requirementKey)}
                className="w-full p-3.5 sm:p-4 text-left flex items-center justify-between gap-3 focus:outline-none"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-base leading-none flex-shrink-0">{badge.icon}</span>
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-white truncate block">
                      {req.requirementTitle}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{req.source || "34 C.F.R. §300.503"}</span>
                      {req.documentLocation && (
                        <span>• {req.documentLocation}</span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold border tracking-wider flex items-center gap-1 ${badge.bg} ${badge.border} ${badge.text}`}
                  >
                    <span>{badge.icon}</span>
                    <span>{badge.label}</span>
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Expandable Explanation Details */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-white/5 space-y-3 bg-slate-950/40 text-xs">
                  {/* Why Flagged / Explanation */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Why this was flagged:
                    </span>
                    <p className="text-slate-200 leading-relaxed bg-[#000820] p-3 rounded-lg border border-slate-800">
                      {req.explanation}
                    </p>
                  </div>

                  {/* Quoted PWN Language if located */}
                  {req.relevantLanguage && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        What the PWN Says:
                      </span>
                      <blockquote className="italic text-amber-200/90 border-l-2 border-amber-400/50 pl-3 py-1 bg-amber-950/20 rounded-r-lg">
                        "{req.relevantLanguage}"
                      </blockquote>
                    </div>
                  )}

                  {/* Stronger Documentation Would Identify */}
                  {req.strongerDocumentationTip && (
                    <div className="p-3 rounded-lg border border-amber-500/25 bg-amber-950/20 space-y-1">
                      <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">
                        What Stronger Documentation Would Identify:
                      </span>
                      <p className="text-slate-300 leading-relaxed">
                        {req.strongerDocumentationTip}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>Source: {req.source}</span>
                    {req.documentLocation && <span>Location: {req.documentLocation}</span>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
