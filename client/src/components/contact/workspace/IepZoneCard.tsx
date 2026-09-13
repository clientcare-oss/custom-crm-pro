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
    <div className="rounded-3xl bg-[#061833] border border-[#0D366B] p-6 sm:p-7 shadow-2xl space-y-6 relative overflow-hidden">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-transparent flex items-center justify-center shrink-0">
            <FileText className="h-8 w-8 text-[#F5B544]" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold font-serif text-white tracking-tight">
              {planTitle}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Your child's current plan, all in one place.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <span className="text-sm italic text-slate-300 font-serif">
            Plans create access. Advocacy creates opportunity.
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-slate-400 hover:text-white transition-colors cursor-pointer">
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
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch pt-1">
        {/* Column 1: Current IEP (4 cols) */}
        <div className="md:col-span-4 flex flex-col justify-between space-y-4">
          <div>
            <span className="text-xs font-medium text-slate-300 block mb-3">
              Current {planLabel}
            </span>

            <div className="flex items-center gap-4">
              {/* PDF Icon Badge */}
              <div className="w-14 h-14 rounded-2xl bg-[#07244D] border border-[#0E3E7A] flex items-center justify-center text-white shrink-0 shadow-inner">
                <span className="text-xs font-black tracking-wider text-white">PDF</span>
              </div>

              {/* Title & Effective Date */}
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-white tracking-tight truncate" title={docTitle}>
                  {docTitle}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Effective: {effectiveDateStr}
                </p>
              </div>
            </div>
          </div>

          {/* Open IEP Button */}
          <div className="pt-1">
            <Button
              onClick={onOpenCurrentPlan}
              className="h-9 px-5 rounded-full bg-[#F5B544] text-[#07162B] hover:bg-[#F5B544]/90 font-bold text-xs inline-flex items-center gap-2 shadow-md cursor-pointer transition-all"
            >
              <Eye className="h-4 w-4" />
              <span>Open {planLabel}</span>
            </Button>
          </div>
        </div>

        {/* Column 2: Latest Version Received (4 cols) */}
        <div className="md:col-span-4 flex flex-col justify-between space-y-4">
          <div>
            <span className="text-xs font-medium text-slate-300 block mb-3">
              Latest Version Received
            </span>

            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5 text-white font-bold text-xl sm:text-2xl tracking-tight">
                <Calendar className="h-5 w-5 text-slate-200 shrink-0" />
                <span>{receivedDateStr}</span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#05281E] border border-emerald-500/50 text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Up to date</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            This is the most recent {planLabel} we have on file.
          </p>
        </div>

        {/* Column 3: Use IEP Comparator (4 cols enclosed in rounded navy container) */}
        <div className="md:col-span-4 rounded-2xl bg-[#071F42]/80 border border-[#0E3A73] p-5 flex flex-col justify-between shadow-md">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <ArrowLeftRight className="h-5 w-5 text-slate-200" />
              <span>Use {planLabel} Comparator</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Compare your new amendment with the previous {planLabel} and quickly see what changed.
            </p>
          </div>

          <div className="pt-3 text-right">
            <Button
              onClick={onCompareIeps}
              className="h-9 px-4 bg-[#0A2E60] hover:bg-[#0E3D7D] border border-[#144D96] text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all"
            >
              Open {planLabel} Comparator
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom 3-Action Tile Deck */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        {/* Action 1: Upload New IEP (Highlighted Gold Button) */}
        <button
          type="button"
          onClick={onUploadDocument}
          className="rounded-2xl p-4 bg-gradient-to-r from-[#F5B544] via-[#F5B544] to-[#F59E0B] text-[#07162B] flex items-center gap-3.5 shadow-lg hover:opacity-95 transition-all text-left cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
            <Upload className="h-5 w-5 text-[#07162B]" />
          </div>
          <div>
            <div className="text-sm font-bold text-[#07162B]">
              Upload New {planLabel}
            </div>
            <div className="text-xs text-[#07162B]/85 font-medium">
              Add the latest {planLabel} or amendment.
            </div>
          </div>
        </button>

        {/* Action 2: Request Latest IEP From School */}
        <button
          type="button"
          onClick={onRequestEvaluation}
          className="rounded-2xl p-4 bg-[#071F42] hover:bg-[#0A2954] border border-[#0E3A73] hover:border-[#F5B544]/50 text-white flex items-center gap-3.5 shadow-md transition-all text-left cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
            <Mail className="h-5 w-5 text-sky-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-white group-hover:text-[#F5B544] transition-colors">
              Request Latest {planLabel} From School
            </div>
            <div className="text-xs text-slate-300">
              Need help getting the updated {planLabel}?
            </div>
          </div>
        </button>

        {/* Action 3: View Past IEPs */}
        <button
          type="button"
          onClick={onOpenCurrentPlan}
          className="rounded-2xl p-4 bg-[#071F42] hover:bg-[#0A2954] border border-[#0E3A73] hover:border-[#F5B544]/50 text-white flex items-center gap-3.5 shadow-md transition-all text-left cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
            <Files className="h-5 w-5 text-sky-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-white group-hover:text-[#F5B544] transition-colors">
              View Past {planLabel}s
            </div>
            <div className="text-xs text-slate-300">
              See previous versions.
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
