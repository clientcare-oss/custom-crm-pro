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

  // Plan Tier pill style matching Admiralty navy & brass palette
  const getPlanTierStyle = (tier: string) => {
    switch (tier) {
      case "$55":
        return "bg-[#072448]/90 border-[#1B5799] text-[#93C5FD]";
      case "$105":
        return "bg-[#1E124A]/90 border-[#4F399F] text-[#D8B4FE]";
      case "Scholarship":
        return "bg-[#2D1B00]/90 border-[#A35900] text-[#FDE047]";
      case "Pay Per Use":
        return "bg-[#331800]/90 border-[#9A5B15] text-[#FDBA74]";
      case "Tools Only":
      case "Vault":
        return "bg-[#020A17] border-[#3A2C18] text-[#C6B697]";
      case "Renewal":
        return "bg-[#04241B]/90 border-[#059669] text-[#6EE7B7]";
      case "Nonpay":
        return "bg-[#33090F]/90 border-[#9F1239] text-[#FDA4AF]";
      default:
        return "bg-[#072448]/90 border-[#1B5799] text-[#93C5FD]";
    }
  };

  // Case Type tag style matching Admiralty palette
  const getCaseTypeStyle = (type: string) => {
    switch (type) {
      case "IEP":
        return "bg-[#0B2545]/90 border-[#1D4E89] text-[#93C5FD]";
      case "504":
        return "bg-[#042B38]/90 border-[#0E7490] text-[#67E8F9]";
      case "Complaint":
      case "State Complaint":
        return "bg-[#3A0B18]/90 border-[#881337] text-[#FDA4AF]";
      case "Records":
        return "bg-[#020A17] border-[#3A2C18] text-[#C6B697]";
      case "Meeting":
        return "bg-[#16133B]/90 border-[#3730A3] text-[#A5B4FC]";
      case "Monitoring":
      case "Resolved":
        return "bg-[#04241B]/90 border-[#047857] text-[#6EE7B7]";
      case "Vault":
        return "bg-[#020A17] border-[#3A2C18] text-[#C6B697]";
      case "Evaluation":
        return "bg-[#260B44]/90 border-[#6B21A8] text-[#D8B4FE]";
      default:
        return "bg-[#020A17] border-[#3A2C18] text-[#C6B697]";
    }
  };

  // Icon renderer for task rows
  const renderTaskIcon = (iconType?: string, defaultIcon?: string) => {
    const chosen = iconType || defaultIcon;
    switch (chosen) {
      case "clock":
        return <Clock className="h-3 w-3 text-[#F5B544] shrink-0 mt-0.5" />;
      case "calendar":
        return <Calendar className="h-3 w-3 text-[#C5A059] shrink-0 mt-0.5" />;
      case "check":
        return <CheckCircle2 className="h-3 w-3 text-[#A69371] shrink-0 mt-0.5" />;
      case "alert":
        return <AlertTriangle className="h-3 w-3 text-rose-400 shrink-0 mt-0.5" />;
      case "mail":
        return <Mail className="h-3 w-3 text-[#FFE394] shrink-0 mt-0.5" />;
      default:
        return <CheckCircle2 className="h-3 w-3 text-[#A69371] shrink-0 mt-0.5" />;
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
        "group relative rounded-xl bg-[#020A17]/95 hover:bg-[#05142B] border border-[#3A2C18] hover:border-[#C5A059]/80 p-3.5 transition-all duration-150 cursor-grab active:cursor-grabbing shadow-[0_4px_16px_rgba(0,0,0,0.7)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.85)] space-y-2.5 select-none",
        isDragging && "opacity-40 scale-95 border-dashed border-[#C5A059]",
        card.needsAttention && "border-rose-600/60 bg-[#16080B]/90"
      )}
    >
      {/* 1. Header: Student Name + School + Menu */}
      <div className="flex items-start justify-between gap-1.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="text-[13px] font-serif font-bold text-[#FFF4D4] group-hover:text-[#FFE394] transition-colors truncate">
              {card.fullName}
            </h4>
            {card.needsAttention && (
              <span
                className="w-2 h-2 rounded-full bg-rose-400 animate-pulse shrink-0 shadow-[0_0_8px_rgba(244,63,94,0.8)]"
                title={card.attentionReason || "Needs Attention"}
              />
            )}
          </div>
          <p className="text-[11px] text-[#C6B697] truncate mt-0.5">
            {card.schoolName}
          </p>
        </div>

        <div data-prevent-card-click="true">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="h-6 w-6 rounded-md hover:bg-[#07162B] flex items-center justify-center text-[#A69371] hover:text-[#FFF4D4] cursor-pointer transition-colors"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] shadow-2xl text-xs">
              <DropdownMenuItem onClick={() => setLocation(`/contacts/${card.id}`)} className="cursor-pointer gap-2">
                <ExternalLink className="h-3.5 w-3.5 text-[#C5A059]" />
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
                  <DropdownMenuItem onClick={() => onMoveStage(card, "Closed")} className="cursor-pointer text-[#A69371]">
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
            "px-2.5 py-0.5 rounded-full text-[10px] font-bold border tracking-tight shadow-xs",
            getPlanTierStyle(card.planTier)
          )}
        >
          {card.planTier}
        </span>

        {card.planType && (
          <span
            className={cn(
              "px-2.5 py-0.5 rounded-full text-[10px] font-semibold border tracking-tight shadow-xs",
              getCaseTypeStyle(card.planType)
            )}
          >
            {card.planType}
          </span>
        )}

        {card.activeWorkstreams && card.activeWorkstreams.length > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-[#05142B] text-[#FFE394] border border-[#3A2C18]">
            +{card.activeWorkstreams.length} stream{card.activeWorkstreams.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* 3. Task Activity Rows within a recessed plate */}
      {(card.primaryTask || card.secondaryTask || card.meetingDate || card.nextDate) && (
        <div className="bg-[#000814]/70 border border-[#3A2C18]/60 rounded-lg p-2 space-y-1 text-[11px] text-[#C6B697]">
          {card.primaryTask && (
            <div className="flex items-start gap-1.5 leading-snug">
              {renderTaskIcon(card.primaryTaskIcon, "clock")}
              <span className="truncate">{card.primaryTask}</span>
            </div>
          )}

          {card.secondaryTask ? (
            <div className="flex items-start gap-1.5 text-[#A69371] leading-snug">
              {renderTaskIcon(card.secondaryTaskIcon, "calendar")}
              <span className="truncate">{card.secondaryTask}</span>
            </div>
          ) : card.meetingDate ? (
            <div className="flex items-start gap-1.5 text-[#FFE394] font-medium leading-snug">
              <Calendar className="h-3 w-3 text-[#C5A059] shrink-0 mt-0.5" />
              <span className="truncate">{card.meetingDate}</span>
            </div>
          ) : card.nextDate && card.nextDate !== "In Progress" ? (
            <div className="flex items-start gap-1.5 text-[#A69371] leading-snug">
              <Calendar className="h-3 w-3 text-[#C5A059] shrink-0 mt-0.5" />
              <span className="truncate">{card.nextDate}</span>
            </div>
          ) : null}
        </div>
      )}

      {/* 4. Advocate Footer Row */}
      <div className="flex items-center justify-between pt-2 border-t border-[#3A2C18]/60 text-[11px]">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] border border-[#FFE394]/60 flex items-center justify-center text-[9px] font-bold text-[#07162B] shrink-0 shadow-xs">
            {card.assignedAdvocateInitials || "BH"}
          </div>
          <span className="text-[#C6B697] font-medium truncate">
            {card.assignedAdvocateName}
          </span>
        </div>

        {card.accountStatus && card.accountStatus !== "Active" && (
          <span className="text-[10px] text-[#A69371] shrink-0 font-medium">
            {card.accountStatus}
          </span>
        )}
      </div>
    </div>
  );
}
