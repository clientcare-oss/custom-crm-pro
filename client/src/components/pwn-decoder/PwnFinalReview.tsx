import React, { useState } from "react";
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";
import type { DecodedConcernItem, DecodedRequirementItem } from "./types";

interface PwnFinalReviewProps {
  concerns: DecodedConcernItem[];
  requirements: DecodedRequirementItem[];
}

export const PwnFinalReview: React.FC<PwnFinalReviewProps> = ({ concerns, requirements }) => {
  // Collapsed by default for DOCUMENTED items as instructed
  const [isDocumentedOpen, setIsDocumentedOpen] = useState(false);

  // Group concerns by severity
  const needsAttentionItems = concerns.filter((c) => c.severity === "needs_attention");
  const reviewItems = concerns.filter((c) => c.severity === "review");
  const documentedReqs = requirements.filter((r) => r.status === "PRESENT");

  return (
    <div id="section-final-review" className="w-full space-y-4">
      {/* Header */}
      <div className="border-b border-white/5 pb-2.5">
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <span>FINAL REVIEW</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Triage queue organized by priority. Attention is directed first to critical documentation gaps.
        </p>
      </div>

      {/* 1. 🔴 NEEDS ATTENTION */}
      <div className="rounded-xl border border-rose-500/40 bg-[#000820] p-4 space-y-3 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base leading-none">🔴</span>
            <h3 className="text-sm font-bold text-rose-300 uppercase tracking-wider">
              NEEDS ATTENTION ({needsAttentionItems.length})
            </h3>
          </div>
          <span className="text-[11px] text-rose-400/90 font-medium">
            Strong potential documentation & compliance concerns
          </span>
        </div>

        {needsAttentionItems.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-1">
            No critical documentation defects flagged under this tier.
          </p>
        ) : (
          <div className="space-y-2">
            {needsAttentionItems.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-lg bg-slate-950/60 border border-rose-500/20 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <span className="font-bold text-slate-100">{item.title}</span>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Decision: <strong className="text-rose-300">{item.relatedDecision}</strong> • {item.source}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30">
                    {item.advocateStatus === "CONFIRMED"
                      ? "✓ Confirmed"
                      : item.advocateStatus === "DISMISSED"
                      ? "Dismissed"
                      : "Unreviewed"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. 🟡 REVIEW */}
      <div className="rounded-xl border border-amber-500/40 bg-[#000820] p-4 space-y-3 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base leading-none">🟡</span>
            <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider">
              REVIEW ({reviewItems.length})
            </h3>
          </div>
          <span className="text-[11px] text-amber-400/90 font-medium">
            Weak, unclear, partial, or generic documentation
          </span>
        </div>

        {reviewItems.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-1">
            No secondary review items flagged.
          </p>
        ) : (
          <div className="space-y-2">
            {reviewItems.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-lg bg-slate-950/60 border border-amber-500/20 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <span className="font-bold text-slate-100">{item.title}</span>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Decision: <strong className="text-amber-300">{item.relatedDecision}</strong> • {item.source}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                    {item.advocateStatus === "CONFIRMED"
                      ? "✓ Confirmed"
                      : item.advocateStatus === "DISMISSED"
                      ? "Dismissed"
                      : "Unreviewed"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. 🟢 DOCUMENTED (Collapsed by default) */}
      <div className="rounded-xl border border-emerald-500/30 bg-[#000820] overflow-hidden shadow-md">
        <button
          type="button"
          onClick={() => setIsDocumentedOpen(!isDocumentedOpen)}
          className="w-full p-4 text-left flex items-center justify-between hover:bg-slate-900/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-base leading-none">🟢</span>
            <h3 className="text-sm font-bold text-emerald-300 uppercase tracking-wider">
              DOCUMENTED ({documentedReqs.length} Requirements Located)
            </h3>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              (Collapsed by default)
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <span>{isDocumentedOpen ? "Collapse" : "Expand"}</span>
            {isDocumentedOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </button>

        {isDocumentedOpen && (
          <div className="p-4 pt-0 border-t border-white/5 space-y-2 text-xs bg-slate-950/30">
            {documentedReqs.map((req) => (
              <div
                key={req.requirementKey}
                className="p-2.5 rounded-lg bg-[#000820] border border-emerald-500/20 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-slate-200 font-medium">{req.requirementTitle}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {req.source}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
