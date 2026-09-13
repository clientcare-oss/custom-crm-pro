import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Calendar,
  RefreshCw,
  Clock,
  Plus,
  UserCheck,
  Upload,
  Layers,
  Scale,
  ExternalLink,
  BookOpen,
} from "lucide-react";

interface IepZoneCardProps {
  contact: any;
  compass?: any;
  onStart504: () => void;
  onRequestEvaluation: () => void;
  onUploadDocument: () => void;
  onCreateBlueprint: () => void;
  onCompareIeps: () => void;
  onOpenCurrentPlan: () => void;
}

export function IepZoneCard({
  contact,
  compass,
  onStart504,
  onRequestEvaluation,
  onUploadDocument,
  onCreateBlueprint,
  onCompareIeps,
  onOpenCurrentPlan,
}: IepZoneCardProps) {
  const planType = contact.planType || "No IEP/504 Yet";
  const hasPlan = planType === "IEP" || planType === "504";
  const isIep = planType === "IEP";
  const is504 = planType === "504";

  // Last updated date
  const lastUpdatedDate = compass?.updatedAt || contact.updatedAt || new Date().toISOString();
  const formattedLastUpdated = new Date(lastUpdatedDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#0A1A33] to-[#07162B] border border-[#0E274D] p-5 shadow-lg flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#0E274D] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[#F5B544]" />
            <h3 className="text-base font-bold text-white font-serif tracking-wide">
              IEP / 504 Zone
            </h3>
          </div>
          <span className="text-[11px] italic text-slate-400 font-serif hidden sm:inline">
            Plans create access. Advocacy creates opportunity.
          </span>
        </div>

        {/* 4 Metric Columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {/* Current Plan */}
          <div className="rounded-xl bg-[#07162B]/90 border border-[#0E274D] p-3 shadow-inner">
            <span className="text-[10.5px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">
              Current Plan
            </span>
            <div className="flex items-center gap-2 text-white font-semibold text-xs sm:text-sm">
              <FileText className="h-4 w-4 text-[#F5B544] shrink-0" />
              <span className="truncate">{planType === "No IEP/504 Yet" ? "None Yet" : planType}</span>
            </div>
          </div>

          {/* Annual Review */}
          <div className="rounded-xl bg-[#07162B]/90 border border-[#0E274D] p-3 shadow-inner">
            <span className="text-[10.5px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">
              Annual Review
            </span>
            <div className="flex items-center gap-2 text-white font-semibold text-xs sm:text-sm">
              <Calendar className="h-4 w-4 text-blue-400 shrink-0" />
              <span className="truncate">{contact.annualReviewDate ? new Date(contact.annualReviewDate).toLocaleDateString() : "Not scheduled"}</span>
            </div>
          </div>

          {/* Reevaluation */}
          <div className="rounded-xl bg-[#07162B]/90 border border-[#0E274D] p-3 shadow-inner">
            <span className="text-[10.5px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">
              Reevaluation
            </span>
            <div className="flex items-center gap-2 text-white font-semibold text-xs sm:text-sm">
              <RefreshCw className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="truncate">{contact.reevaluationDate ? new Date(contact.reevaluationDate).toLocaleDateString() : "N/A"}</span>
            </div>
          </div>

          {/* Last Updated */}
          <div className="rounded-xl bg-[#07162B]/90 border border-[#0E274D] p-3 shadow-inner">
            <span className="text-[10.5px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">
              Last Updated
            </span>
            <div className="flex items-start gap-2 text-white text-xs sm:text-sm">
              <Clock className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">{formattedLastUpdated}</span>
                <span className="text-[10px] text-slate-400">by Byron Honea</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 pt-2">
        {!hasPlan ? (
          <>
            <Button
              onClick={onStart504}
              className="h-10 bg-[#F5B544] text-[#07162B] hover:bg-[#F5B544]/90 font-bold text-xs gap-1.5 shadow-md cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Start 504 Path
            </Button>
            <Button
              variant="outline"
              onClick={onRequestEvaluation}
              className="h-10 border-[#0E274D] bg-[#0F2342] text-slate-200 hover:bg-[#153460] hover:text-white text-xs gap-1.5 cursor-pointer"
            >
              <UserCheck className="h-4 w-4 text-[#F5B544]" />
              Request Evaluation
            </Button>
            <Button
              variant="outline"
              onClick={onUploadDocument}
              className="h-10 border-[#0E274D] bg-[#0F2342] text-slate-200 hover:bg-[#153460] hover:text-white text-xs gap-1.5 cursor-pointer"
            >
              <Upload className="h-4 w-4 text-blue-400" />
              Upload Documents
            </Button>
            <Button
              variant="outline"
              onClick={onCreateBlueprint}
              className="h-10 border-[#0E274D] bg-[#0F2342] text-slate-200 hover:bg-[#153460] hover:text-white text-xs gap-1.5 cursor-pointer"
            >
              <Layers className="h-4 w-4 text-emerald-400" />
              Create IEP Blueprint
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={onOpenCurrentPlan}
              className="h-10 bg-[#F5B544] text-[#07162B] hover:bg-[#F5B544]/90 font-bold text-xs gap-1.5 shadow-md cursor-pointer"
            >
              <FileText className="h-4 w-4" />
              Open Current {planType}
            </Button>
            <Button
              variant="outline"
              onClick={onUploadDocument}
              className="h-10 border-[#0E274D] bg-[#0F2342] text-slate-200 hover:bg-[#153460] hover:text-white text-xs gap-1.5 cursor-pointer"
            >
              <Upload className="h-4 w-4 text-blue-400" />
              Upload New {planType}
            </Button>
            <Button
              variant="outline"
              onClick={onCompareIeps}
              className="h-10 border-[#0E274D] bg-[#0F2342] text-slate-200 hover:bg-[#153460] hover:text-white text-xs gap-1.5 cursor-pointer"
            >
              <Scale className="h-4 w-4 text-amber-400" />
              Compare Plans
            </Button>
            <Button
              variant="outline"
              onClick={onCreateBlueprint}
              className="h-10 border-[#0E274D] bg-[#0F2342] text-slate-200 hover:bg-[#153460] hover:text-white text-xs gap-1.5 cursor-pointer"
            >
              <Layers className="h-4 w-4 text-emerald-400" />
              {isIep ? "IEP Blueprint" : "504 Blueprint"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
