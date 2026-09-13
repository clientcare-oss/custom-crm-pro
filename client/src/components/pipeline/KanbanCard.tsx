import React from "react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  ExternalLink,
  Mail,
  AlertTriangle,
  HelpCircle,
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
  onDragOver?: (e: React.DragEvent, card: PipelineCardItem) => void;
  onDrop?: (e: React.DragEvent, targetCard: PipelineCardItem) => void;
  onMoveStage?: (card: PipelineCardItem, newStage: string) => void;
  isDragging?: boolean;
}

export function KanbanCard({
  card,
  onDragStart,
  onDragOver,
  onDrop,
  onMoveStage,
  isDragging,
}: KanbanCardProps) {
  const [, setLocation] = useLocation();

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent navigation if clicking interactive controls
    if ((e.target as HTMLElement).closest("[data-prevent-card-click]")) {
      return;
    }
    setLocation(`/contacts/${card.id}`);
  };

  // Plan Tier pill style matching reference image
  const getPlanTierStyle = (tier: string) => {
    switch (tier) {
      case "$55":
        return "bg-[#0E3A66]/80 border-[#1B5799] text-[#7DD3FC]";
      case "$105":
        return "bg-[#281B5E]/80 border-[#4F399F] text-[#C4B5FD]";
      case "Scholarship":
        return "bg-[#4D2800]/80 border-[#A35900] text-[#FCD34D]";
      case "Pay Per Use":
        return "bg-[#482808]/80 border-[#9A5B15] text-[#FDBA74]";
      case "Tools Only":
      case "Vault":
        return "bg-[#1E293B]/90 border-[#334155] text-slate-300";
      case "Renewal":
        return "bg-[#064E3B]/80 border-[#059669] text-[#6EE7B7]";
      case "Nonpay":
        return "bg-[#58151C]/80 border-[#9F1239] text-[#FDA4AF]";
      default:
        return "bg-[#0A2954] border-[#0E3A73] text-sky-300";
    }
  };

  // Case Type tag style matching reference image
  const getCaseTypeStyle = (type: string) => {
    switch (type) {
      case "IEP":
        return "bg-[#102A4C]/80 border-[#1D4E89] text-[#93C5FD]";
      case "504":
        return "bg-[#083344]/80 border-[#0E7490] text-[#67E8F9]";
      case "Complaint":
      case "State Complaint":
        return "bg-[#4C0519]/80 border-[#881337] text-[#FDA4AF]";
      case "Records":
        return "bg-[#1E293B]/80 border-[#475569] text-slate-300";
      case "Meeting":
        return "bg-[#1E1B4B]/80 border-[#3730A3] text-[#A5B4FC]";
      case "Monitoring":
        return "bg-[#064E3B]/80 border-[#047857] text-[#6EE7B7]";
      case "Resolved":
        return "bg-[#064E3B]/80 border-[#047857] text-[#6EE7B7]";
      case "Vault":
        return "bg-[#1E293B]/80 border-[#334155] text-slate-300";
      case "Evaluation":
        return "bg-[#3B0764]/80 border-[#6B21A8] text-[#D8B4FE]";
      default:
        return "bg-[#1E293B]/70 border-[#334155] text-slate-300";
    }
  };

  // Icon renderer for task rows
  const renderTaskIcon = (iconType?: string, defaultIcon?: string) => {
    const chosen = iconType || defaultIcon;
    switch (chosen) {
      case "clock":
        return <Clock className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />;
      case "calendar":
        return <Calendar className="h-3 w-3 text-sky-400 shrink-0 mt-0.5" />;
      case "check":
        return <CheckCircle2 className="h-3 w-3 text-slate-400 shrink-0 mt-0.5" />;
      case "alert":
        return <AlertTriangle className="h-3 w-3 text-rose-400 shrink-0 mt-0.5" />;
      case "mail":
        return <Mail className="h-3 w-3 text-sky-300 shrink-0 mt-0.5" />;
      default:
        return <CheckCircle2 className="h-3 w-3 text-slate-400 shrink-0 mt-0.5" />;
    }
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, card)}
      onDragOver={(e) => onDragOver?.(e, card)}
      onDrop={(e) => onDrop?.(e, card)}
      onClick={handleCardClick}
      className={cn(
        "group relative rounded-2xl bg-[#091F3D]/95 hover:bg-[#0C274E] border border-[#113A6E] hover:border-[#F5B544]/70 p-3.5 transition-all duration-150 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-lg space-y-2.5 select-none",
        isDragging && "opacity-40 scale-95 border-dashed border-[#F5B544]",
        card.needsAttention && "border-rose-500/50 bg-[#0E1B33]"
      )}
    >
      {/* 1. Header: Student Name + School + Menu */}
      <div className="flex items-start justify-between gap-1.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="text-[13px] font-bold text-white group-hover:text-[#F5B544] transition-colors truncate">
              {card.fullName}
            </h4>
            {card.needsAttention && (
              <span
                className="w-2 h-2 rounded-full bg-rose-400 animate-pulse shrink-0"
                title={card.attentionReason || "Needs Attention"}
              />
            )}
          </div>
          <p className="text-[11px] text-slate-300 truncate mt-0.5">
            {card.schoolName}
          </p>
        </div>

        <div data-prevent-card-click="true">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="h-6 w-6 rounded-md hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer transition-colors"
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

      {/* 2. Badges Row: Plan Tier + Case Type */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span
          className={cn(
            "px-2.5 py-0.5 rounded-full text-[10px] font-bold border tracking-tight",
            getPlanTierStyle(card.planTier)
          )}
        >
          {card.planTier}
        </span>

        {card.planType && (
          <span
            className={cn(
              "px-2.5 py-0.5 rounded-full text-[10px] font-semibold border tracking-tight",
              getCaseTypeStyle(card.planType)
            )}
          >
            {card.planType}
          </span>
        )}

        {card.activeWorkstreams && card.activeWorkstreams.length > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-[#0E274D] text-sky-300 border border-[#18467D]">
            +{card.activeWorkstreams.length} stream{card.activeWorkstreams.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* 3. Task Activity Rows matching visual reference */}
      <div className="space-y-1 text-[11px] text-slate-200">
        {card.primaryTask && (
          <div className="flex items-start gap-1.5 leading-snug">
            {renderTaskIcon(card.primaryTaskIcon, "clock")}
            <span className="truncate">{card.primaryTask}</span>
          </div>
        )}

        {card.secondaryTask ? (
          <div className="flex items-start gap-1.5 text-slate-300 leading-snug">
            {renderTaskIcon(card.secondaryTaskIcon, "calendar")}
            <span className="truncate">{card.secondaryTask}</span>
          </div>
        ) : card.meetingDate ? (
          <div className="flex items-start gap-1.5 text-[#F5B544] font-medium leading-snug">
            <Calendar className="h-3 w-3 text-[#F5B544] shrink-0 mt-0.5" />
            <span className="truncate">{card.meetingDate}</span>
          </div>
        ) : card.nextDate && card.nextDate !== "In Progress" ? (
          <div className="flex items-start gap-1.5 text-slate-300 leading-snug">
            <Calendar className="h-3 w-3 text-sky-400 shrink-0 mt-0.5" />
            <span className="truncate">{card.nextDate}</span>
          </div>
        ) : null}
      </div>

      {/* 4. Advocate Footer Row */}
      <div className="flex items-center justify-between pt-2 border-t border-[#113A6E]/60 text-[11px]">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-5 h-5 rounded-full bg-[#0E2E59] border border-sky-400/50 flex items-center justify-center text-[9px] font-bold text-sky-200 shrink-0">
            {card.assignedAdvocateInitials || "BH"}
          </div>
          <span className="text-slate-300 font-medium truncate">
            {card.assignedAdvocateName}
          </span>
        </div>

        {card.accountStatus && card.accountStatus !== "Active" && (
          <span className="text-[10px] text-slate-400 shrink-0">
            {card.accountStatus}
          </span>
        )}
      </div>
    </div>
  );
}
