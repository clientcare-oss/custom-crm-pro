import React from "react";
import { CheckCircle2, Circle, FileText, Sparkles, Plus, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface DocumentAvailabilityData {
  hasCurrentIep: boolean;
  currentIepDate: string | null;
  hasCurrent504: boolean;
  current504Date: string | null;
  hasEvaluation: boolean;
  latestEvaluationDate: string | null;
  hasPwn: boolean;
  hasProgressReport: boolean;
  hasBip: boolean;
  totalFiles: number;
}

interface DocumentAvailabilityCardProps {
  studentName: string;
  data: DocumentAvailabilityData;
  isRelationshipActive: boolean;
  onUploadClick: () => void;
  isLight?: boolean;
}

export function DocumentAvailabilityCard({
  studentName,
  data,
  isRelationshipActive,
  onUploadClick,
  isLight = false,
}: DocumentAvailabilityCardProps) {
  // Major records checklist
  const items = [
    {
      label: "Current IEP",
      available: data.hasCurrentIep,
      date: data.currentIepDate,
      hint: "Most recent annual IEP or amendment",
    },
    {
      label: "Current 504 Plan",
      available: data.hasCurrent504,
      date: data.current504Date,
      hint: "Section 504 accommodation plan",
    },
    {
      label: "Latest Evaluation",
      available: data.hasEvaluation,
      date: data.latestEvaluationDate,
      hint: "Psycho-ed, Speech, OT, or medical eval",
    },
    {
      label: "Recent Progress Report",
      available: data.hasProgressReport,
      hint: "IEP goal progress or report cards",
    },
    {
      label: "Latest Prior Written Notice (PWN)",
      available: data.hasPwn,
      hint: "District decision notice & PWN letters",
    },
    {
      label: "Behavior Plan (FBA / BIP)",
      available: data.hasBip,
      hint: "Functional behavior assessment or intervention plan",
    },
  ];

  const hasAnyPlan = data.hasCurrentIep || data.hasCurrent504;

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 transition-all shadow-sm ${
        isLight
          ? "bg-white border-slate-200/90 shadow-slate-100"
          : "bg-[#06172F]/80 border-blue-900/40 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,8,33,0.5)]"
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3.5 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <h3 className={`text-sm sm:text-base font-bold tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
              {studentName}&apos;s File
            </h3>
            <Badge
              variant="outline"
              className={`text-[10px] font-semibold ${
                isLight
                  ? "bg-slate-100 text-slate-700 border-slate-300"
                  : "bg-blue-500/10 text-blue-300 border-blue-400/30"
              }`}
            >
              Document Status
            </Badge>
          </div>
          <p className={`text-xs mt-0.5 ${isLight ? "text-slate-500" : "text-blue-200/70"}`}>
            Quiet overview of core records currently identified in the vault. These are informational indicators to keep you informed.
          </p>
        </div>

        {/* Smart Start Here or Status Callout */}
        {!hasAnyPlan ? (
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="leading-snug">
              <span className="font-bold">⭐ Start here:</span> Upload your child&apos;s current IEP or 504 Plan first.
            </div>
            <Button
              size="sm"
              onClick={onUploadClick}
              className="h-7 px-2.5 text-[11px] font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg ml-auto shrink-0 cursor-pointer"
            >
              Upload Plan
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="font-semibold">
              {data.hasCurrentIep
                ? `Current IEP on file${data.currentIepDate ? ` (${data.currentIepDate})` : ""}`
                : `Current 504 Plan on file${data.current504Date ? ` (${data.current504Date})` : ""}`}
            </span>
          </div>
        )}
      </div>

      {/* Grid of indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-3.5">
        {items.map((item) => (
          <div
            key={item.label}
            className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
              item.available
                ? isLight
                  ? "bg-emerald-50/60 border-emerald-200 text-slate-900"
                  : "bg-emerald-950/20 border-emerald-500/30 text-white"
                : isLight
                ? "bg-slate-50 border-slate-200/60 text-slate-500"
                : "bg-white/[0.02] border-white/5 text-blue-200/50"
            }`}
          >
            <div className="flex items-start justify-between gap-1.5 mb-1.5">
              <span className="text-[11px] font-bold leading-tight line-clamp-2">
                {item.label}
              </span>
              {item.available ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 mt-0.5" />
              )}
            </div>

            <div className="text-[10px] leading-tight">
              {item.available ? (
                <span className="text-emerald-500 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  ✓ Available
                  {item.date && <span className="opacity-80 font-normal">({item.date})</span>}
                </span>
              ) : (
                <span className="opacity-70">○ Not identified</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Legend & Note */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-1 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <strong className="text-foreground/80 font-medium">✓ = Available in Vault</strong>
          </span>
          <span className="flex items-center gap-1">
            <Circle className="w-3 h-3 opacity-40" />
            <strong className="text-foreground/80 font-medium">○ = Not currently identified</strong>
          </span>
        </div>
        <span className="text-[10px] opacity-75">
          Informational indicators — not mandatory requirements.
        </span>
      </div>
    </div>
  );
}
