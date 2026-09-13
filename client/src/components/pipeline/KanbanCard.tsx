import React from "react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  FileText,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import type { PipelineCardItem } from "./types";

interface KanbanCardProps {
  card: PipelineCardItem;
  onDragStart: (e: React.DragEvent, card: PipelineCardItem) => void;
  onMoveStage?: (card: PipelineCardItem, newStage: string) => void;
}

export function KanbanCard({ card, onDragStart, onMoveStage }: KanbanCardProps) {
  const [, setLocation] = useLocation();

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger if clicked on dropdown menu or action button
    if ((e.target as HTMLElement).closest("[data-prevent-card-click]")) {
      return;
    }
    setLocation(`/contacts/${card.id}`);
  };

  // Plan Tier pill style matching reference image
  const getPlanTierStyle = (tier: string) => {
    switch (tier) {
      case "$55":
        return "bg-emerald-950/70 border-emerald-500/50 text-emerald-300";
      case "$105":
        return "bg-indigo-950/70 border-indigo-500/50 text-indigo-300";
      case "Scholarship":
        return "bg-amber-950/70 border-amber-500/50 text-amber-300";
      case "Pay Per Use":
        return "bg-amber-900/60 border-amber-500/40 text-amber-200";
      case "Tools Only":
      case "Vault":
        return "bg-slate-800/80 border-slate-600/50 text-slate-300";
      case "Renewal":
        return "bg-emerald-900/60 border-emerald-400/50 text-emerald-200";
      case "Nonpay":
        return "bg-rose-950/80 border-rose-500/60 text-rose-300";
      default:
        return "bg-[#0A2954] border-[#0E3A73] text-sky-300";
    }
  };

  // Case Type tag style matching reference image
  const getCaseTypeStyle = (type: string) => {
    switch (type) {
      case "IEP":
        return "bg-blue-950/60 border-blue-500/40 text-blue-300";
      case "504":
        return "bg-cyan-950/60 border-cyan-500/40 text-cyan-300";
      case "Complaint":
      case "State Complaint":
        return "bg-rose-950/60 border-rose-500/50 text-rose-300";
      case "Resolved":
        return "bg-emerald-950/60 border-emerald-500/40 text-emerald-300";
      case "Evaluation":
        return "bg-purple-950/60 border-purple-500/40 text-purple-300";
      default:
        return "bg-slate-800/60 border-slate-700 text-slate-300";
    }
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, card)}
      onClick={handleCardClick}
      className={cn(
        "group relative rounded-2xl bg-[#081F42]/90 hover:bg-[#0A2754] border border-[#0D366B] hover:border-[#F5B544]/60 p-4 transition-all duration-150 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md space-y-3",
        card.needsAttention && "border-rose-500/40"
      )}
    >
      {/* Top row: Student Name + Three dots menu */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-white group-hover:text-[#F5B544] transition-colors truncate">
              {card.fullName}
            </h4>
            {card.needsAttention && (
              <span
                className="w-2 h-2 rounded-full bg-rose-400 shrink-0"
                title="Needs attention"
              />
            )}
          </div>
          <p className="text-xs text-slate-300 truncate mt-0.5">
            {card.schoolName}
          </p>
        </div>

        <div data-prevent-card-click="true">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="h-6 w-6 rounded-md hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#07162B] border-[#0E274D] text-slate-200 shadow-xl text-xs">
              <DropdownMenuItem onClick={() => setLocation(`/contacts/${card.id}`)} className="cursor-pointer gap-2">
                <ExternalLink className="h-3.5 w-3.5 text-[#F5B544]" />
                <span>Open Student Workspace</span>
              </DropdownMenuItem>
              {onMoveStage && (
                <>
                  <DropdownMenuItem onClick={() => onMoveStage(card, "Records Review")} className="cursor-pointer">
                    Move to Records Review
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onMoveStage(card, "Meeting Scheduled")} className="cursor-pointer">
                    Move to Meeting Scheduled
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onMoveStage(card, "State Complaint")} className="cursor-pointer">
                    Move to State Complaint
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onMoveStage(card, "Closed")} className="cursor-pointer text-slate-400">
                    Move to Closed
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Plan Tier Pill + Case Type Tag */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span
          className={cn(
            "px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border",
            getPlanTierStyle(card.planTier)
          )}
        >
          {card.planTier}
        </span>

        {card.planType && (
          <span
            className={cn(
              "px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold border",
              getCaseTypeStyle(card.planType)
            )}
          >
            {card.planType}
          </span>
        )}
      </div>

      {/* Primary Task / Activity */}
      {card.primaryTask && (
        <div className="flex items-start gap-1.5 text-xs text-slate-200">
          <CheckCircle2 className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
          <span className="line-clamp-2 leading-tight">{card.primaryTask}</span>
        </div>
      )}

      {/* Next Date / Meeting */}
      <div className="flex items-center gap-1.5 text-xs text-slate-300">
        <Calendar className="h-3.5 w-3.5 text-[#F5B544] shrink-0" />
        <span className="truncate">
          {card.meetingDate ? `Meeting: ${card.meetingDate}` : card.nextDate || "In Progress"}
        </span>
      </div>

      {/* Assigned Advocate Avatar + Name */}
      <div className="flex items-center gap-2 pt-1 border-t border-[#0D366B]/50">
        <div className="w-5 h-5 rounded-full bg-[#0D2F5E] border border-sky-400/40 flex items-center justify-center text-[9px] font-bold text-sky-200 shrink-0">
          {card.assignedAdvocateInitials || "BH"}
        </div>
        <span className="text-xs text-slate-300 font-medium truncate">
          {card.assignedAdvocateName}
        </span>
      </div>
    </div>
  );
}
