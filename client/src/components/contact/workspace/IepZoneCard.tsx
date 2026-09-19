import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Calendar,
  Eye,
  Upload,
  Mail,
  Files,
  ArrowLeftRight,
  Info,
  CheckCircle2,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface IepZoneCardProps {
  contact: any;
  compass?: any;
  latestFile?: any;
  onStart504?: () => void;
  onRequestEvaluation: () => void;
  onUploadDocument: () => void;
  onCreateBlueprint?: () => void;
  onCompareIeps: () => void;
  onOpenCurrentPlan: () => void;
}

export function IepZoneCard({
  contact,
  compass,
  latestFile,
  onStart504,
  onRequestEvaluation,
  onUploadDocument,
  onCreateBlueprint,
  onCompareIeps,
  onOpenCurrentPlan,
}: IepZoneCardProps) {
  const planType = contact.planType || "IEP";
  const is504 = planType === "504";
  const planTitle = is504 ? "504 Zone" : "IEP Zone";
  const planLabel = is504 ? "504" : "IEP";

  // Dynamic received and effective dates
  const receivedDateStr = latestFile?.createdAt
    ? new Date(latestFile.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Sep 13, 2026";

  const effectiveDateStr = contact.annualReviewDate
    ? new Date(contact.annualReviewDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Sep 8, 2026";

  const docTitle = latestFile?.fileName || latestFile?.name || `September 2026 ${planLabel}`;

  return (
    <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#0B3767] via-[#0A254D] to-[#071C3C] border border-[#0D4B84] p-4 sm:p-5 shadow-2xl space-y-3.5 relative overflow-hidden">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#0E3E75]/80 pb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#F5B544]/15 border border-[#F5B544]/30 flex items-center justify-center shrink-0">
            <FileText className="h-4 w-4 text-[#F5B544]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold font-serif text-white tracking-tight">
                {planTitle}
              </h2>
              <span className="text-[11.5px] text-slate-300 hidden md:inline">
                · Your child's current plan, all in one place.
              </span>
            </div>
            <p className="text-[11px] text-slate-300 md:hidden">
              Your child's current plan, all in one place.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1">
                <Info className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="bg-[#07162B] border-[#0E274D] text-slate-200 text-xs max-w-xs">
              This console tracks the active {planLabel} plan of record, latest version timestamps, and comparison workflows.
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Middle 3-Column Plan Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
        {/* Column 1: Current IEP (4 cols) */}
        <div className="md:col-span-4 flex flex-col justify-between space-y-2">
          <div>
            <span className="text-[11px] font-medium text-slate-400 block mb-1">
              Current {planLabel}
            </span>

            <div className="flex items-center gap-3">
              {/* PDF Icon Badge */}
              <div className="w-10 h-10 rounded-xl bg-[#07244D] border border-[#0E3E7A] flex items-center justify-center text-white shrink-0 shadow-inner">
                <span className="text-[10.5px] font-black tracking-wider text-white">PDF</span>
              </div>

              {/* Title & Effective Date */}
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight truncate" title={docTitle}>
                  {docTitle}
                </h3>
                <p className="text-[11px] text-slate-300">
                  Effective: {effectiveDateStr}
                </p>
              </div>
            </div>
          </div>

          {/* Open IEP Button */}
          <div className="pt-0.5">
            <Button
              size="sm"
              onClick={onOpenCurrentPlan}
              className="h-7 px-3.5 rounded-full bg-[#F5B544] text-[#07162B] hover:bg-[#F5B544]/90 font-bold text-[11px] inline-flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Open {planLabel}</span>
            </Button>
          </div>
        </div>

        {/* Column 2: Latest Version Received (4 cols) */}
        <div className="md:col-span-4 flex flex-col justify-between space-y-2 md:border-l md:border-[#0D366B]/80 md:pl-5">
          <div>
            <span className="text-[11px] font-medium text-slate-400 block mb-1">
              Latest Version Received
            </span>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-white font-bold text-base sm:text-lg tracking-tight">
                <Calendar className="h-4 w-4 text-slate-300 shrink-0" />
                <span>{receivedDateStr}</span>
              </div>

              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#05281E] border border-emerald-500/50 text-emerald-400 text-[10.5px] font-bold">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                <span>Up to date</span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            This is the most recent {planLabel} we have on file.
          </p>
        </div>

        {/* Column 3: Use IEP Comparator (4 cols enclosed in rounded navy container) */}
        <div className="md:col-span-4 rounded-xl bg-[#071F42]/80 border border-[#0E3A73] p-3 flex flex-col justify-between shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-white font-bold text-xs sm:text-sm">
              <ArrowLeftRight className="h-3.5 w-3.5 text-slate-200" />
              <span>Use {planLabel} Comparator</span>
            </div>
            <p className="text-[10.5px] sm:text-[11px] text-slate-300 leading-snug">
              Compare your new amendment with the previous {planLabel} and quickly see what changed.
            </p>
          </div>

          <div className="pt-2 text-right">
            <Button
              size="sm"
              onClick={onCompareIeps}
              className="h-7 px-3 bg-[#0A2E60] hover:bg-[#0E3D7D] border border-[#144D96] text-white font-bold text-[11px] rounded-lg shadow-xs cursor-pointer transition-all"
            >
              Open {planLabel} Comparator
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom 3-Action Tile Deck */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 border-t border-[#0D366B]/80">
        {/* Action 1: Upload New IEP (Highlighted Gold Button) */}
        <button
          type="button"
          onClick={onUploadDocument}
          className="rounded-xl px-3.5 py-2.5 bg-gradient-to-r from-[#F5B544] via-[#F5B544] to-[#F59E0B] text-[#07162B] flex items-center gap-3 shadow-md hover:opacity-95 transition-all text-left cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-lg bg-[#07162B]/10 flex items-center justify-center shrink-0">
            <Upload className="h-4 w-4 text-[#07162B]" />
          </div>
          <div className="min-w-0">
            <div className="text-xs sm:text-[12.5px] font-bold text-[#07162B] group-hover:underline truncate">
              Upload New {planLabel}
            </div>
            <div className="text-[10px] sm:text-[10.5px] text-[#07162B]/85 font-medium truncate">
              Add latest {planLabel} or amendment.
            </div>
          </div>
        </button>

        {/* Action 2: Request Latest IEP From School */}
        <button
          type="button"
          onClick={onRequestEvaluation}
          className="rounded-xl px-3.5 py-2.5 bg-[#071F42] hover:bg-[#0A2954] border border-[#0E3A73] hover:border-[#F5B544]/50 text-white flex items-center gap-3 shadow-xs transition-all text-left cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-lg bg-[#0F284F] flex items-center justify-center shrink-0">
            <Mail className="h-4 w-4 text-sky-400" />
          </div>
          <div className="min-w-0">
            <div className="text-xs sm:text-[12.5px] font-bold text-white group-hover:text-[#F5B544] transition-colors truncate">
              Request Latest {planLabel} From School
            </div>
            <div className="text-[10px] sm:text-[10.5px] text-slate-300 truncate">
              Need help getting the updated {planLabel}?
            </div>
          </div>
        </button>

        {/* Action 3: View Past IEPs */}
        <button
          type="button"
          onClick={onOpenCurrentPlan}
          className="rounded-xl px-3.5 py-2.5 bg-[#071F42] hover:bg-[#0A2954] border border-[#0E3A73] hover:border-[#F5B544]/50 text-white flex items-center gap-3 shadow-xs transition-all text-left cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-lg bg-[#0F284F] flex items-center justify-center shrink-0">
            <Files className="h-4 w-4 text-sky-400" />
          </div>
          <div className="min-w-0">
            <div className="text-xs sm:text-[12.5px] font-bold text-white group-hover:text-[#F5B544] transition-colors truncate">
              View Past {planLabel}s
            </div>
            <div className="text-[10px] sm:text-[10.5px] text-slate-300 truncate">
              See previous versions.
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
