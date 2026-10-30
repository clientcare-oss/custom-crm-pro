import React from "react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import {
  Calendar,
  Clock,
  CheckCircle2,
  MoreVertical,
  ExternalLink,
  Mail,
  AlertTriangle,
  Users,
  CheckSquare,
  ShieldAlert,
  Activity,
  UserCheck,
  ArrowRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ADVOCATE_ROSTER } from "./pipelineDefaults";
import type { PipelineCardItem, PipelineStageItem } from "./types";

interface KanbanCardProps {
  card: PipelineCardItem;
  allStages?: PipelineStageItem[];
  onDragStart: (e: React.DragEvent, card: PipelineCardItem) => void;
  onDragOver?: (e: React.DragEvent, card: PipelineCardItem) => void;
  onDrop?: (e: React.DragEvent, targetCard: PipelineCardItem) => void;
  onMoveStage?: (card: PipelineCardItem, newStage: string) => void;
  onAssignAdvocate?: (cardId: number, advocateName: string) => void;
  isDragging?: boolean;
}

export function KanbanCard({
  card,
  allStages = [],
  onDragStart,
  onDragOver,
  onDrop,
  onMoveStage,
  onAssignAdvocate,
  isDragging,
}: KanbanCardProps) {
  const [, setLocation] = useLocation();

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-prevent-card-click]")) {
      return;
    }
    setLocation(`/students/${card.id}`);
  };

  const getPlanTierStyle = (tier: string) => {
    const t = (tier || "").toLowerCase();
    if (t.includes("55") || t.includes("navigator")) {
      return "bg-[#072448]/90 border-[#1B5799] text-[#93C5FD]";
    }
    if (t.includes("105") || t.includes("anchor")) {
      return "bg-[#1E124A]/90 border-[#4F399F] text-[#D8B4FE]";
    }
    if (t.includes("family")) {
      return "bg-[#04241B]/90 border-[#059669] text-[#6EE7B7]";
    }
    if (t.includes("scholarship")) {
      return "bg-[#2D1B00]/90 border-[#A35900] text-[#FDE047]";
    }
    if (t.includes("pay per use")) {
      return "bg-[#331800]/90 border-[#9A5B15] text-[#FDBA74]";
    }
    if (t.includes("renewal")) {
      return "bg-[#04241B]/90 border-[#059669] text-[#6EE7B7]";
    }
    if (t.includes("nonpay") || t.includes("failed")) {
      return "bg-[#33090F]/90 border-[#9F1239] text-[#FDA4AF]";
    }
    return "bg-[#020A17] border-[#3A2C18] text-[#C6B697]";
  };

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
      case "Evaluation":
        return "bg-[#260B44]/90 border-[#6B21A8] text-[#D8B4FE]";
      default:
        return "bg-[#020A17] border-[#3A2C18] text-[#C6B697]";
    }
  };

  const getCompassRiskBadge = (risk?: string | null) => {
    if (!risk) return null;
    const r = risk.toLowerCase();
    const style =
      r === "critical" || r === "high"
        ? "bg-rose-950/90 border-rose-500/50 text-rose-300"
        : r === "medium" || r === "elevated"
        ? "bg-amber-950/90 border-amber-500/50 text-amber-300"
        : "bg-emerald-950/80 border-emerald-500/40 text-emerald-300";

    return (
      <span
        className={cn(
          "inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold border",
          style
        )}
        title={`Case Compass Risk: ${risk}`}
      >
        <ShieldAlert className="h-2.5 w-2.5" />
        <span>{risk}</span>
      </span>
    );
  };

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

  const fallbackStages = [
    "Discovery",
    "Free Session",
    "Proposal (14-Day Exp)",
    "Intake / Onboarding",
    "Billing & Authorization",
    "Client Upload Tasks",
    "Records Review",
    "School Contact",
    "Meeting Scheduled",
    "State Complaint",
    "Monitoring",
    "Closed",
  ];

  const moveOptions =
    allStages.length > 0
      ? allStages.filter((s) => !s.isArchived).map((s) => s.name)
      : fallbackStages;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, card)}
      onDragOver={(e) => onDragOver?.(e, card)}
      onDrop={(e) => onDrop?.(e, card)}
      onClick={handleCardClick}
      className={cn(
        "group relative rounded-xl bg-[#020A17]/95 hover:bg-[#05142B] border border-[#3A2C18] hover:border-[#C5A059]/80 p-3 transition-all duration-150 cursor-grab active:cursor-grabbing shadow-[0_4px_16px_rgba(0,0,0,0.7)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.85)] space-y-2 select-none",
        isDragging && "opacity-40 scale-95 border-dashed border-[#C5A059]",
        card.needsAttention && "border-rose-600/60 bg-[#16080B]/90"
      )}
    >
      {/* 1. Header: Student Name + Family/Parent Name + Sibling Badge + Menu */}
      <div className="flex items-start justify-between gap-1.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="text-[13px] font-serif font-bold text-[#FFF4D4] group-hover:text-[#FFE394] transition-colors truncate">
              {card.fullName}
            </h4>
            {card.needsAttention && (
              <span
                className="w-2 h-2 rounded-full bg-rose-400 animate-pulse shrink-0 shadow-[0_0_8px_rgba(244,63,94,0.8)]"
                title={card.attentionReason || "Needs Attention"}
              />
            )}
            {card.siblingCount && card.siblingCount > 1 && (
              <span
                className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-[#072448] border border-[#1B5799] text-[#93C5FD]"
                title={
                  card.siblingNames?.length
                    ? `Siblings: ${card.siblingNames.join(", ")}`
                    : `${card.siblingCount} students in family`
                }
              >
                <Users className="h-2.5 w-2.5" />
                <span>{card.siblingCount}</span>
              </span>
            )}
          </div>

          {card.parentName && (
            <p className="text-[11px] text-[#FFE394]/90 font-medium truncate mt-0.5">
              Family: {card.parentName}
            </p>
          )}
          <p className="text-[10px] text-[#C6B697] truncate">
            {card.schoolName}
            {card.countyDistrict ? ` · ${card.countyDistrict}` : ""}
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
            <DropdownMenuContent
              align="end"
              className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] shadow-2xl text-xs w-56 max-h-80 overflow-y-auto"
            >
              <DropdownMenuItem
                onClick={() => setLocation(`/students/${card.id}`)}
                className="cursor-pointer gap-2 font-semibold text-[#FFE394]"
              >
                <ExternalLink className="h-3.5 w-3.5 text-[#C5A059]" />
                <span>Open Student Workspace</span>
              </DropdownMenuItem>

              {onAssignAdvocate && (
                <>
                  <DropdownMenuSeparator className="bg-[#3A2C18]" />
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-[#C6B697] py-1">
                    Assign Advocate
                  </DropdownMenuLabel>
                  {ADVOCATE_ROSTER.map((adv) => (
                    <DropdownMenuItem
                      key={adv.name}
                      onClick={() => onAssignAdvocate(card.id, adv.name)}
                      className="cursor-pointer gap-2 text-[11px]"
                    >
                      <UserCheck className="h-3 w-3 text-[#C5A059]" />
                      <span>{adv.name}</span>
                    </DropdownMenuItem>
                  ))}
                </>
              )}

              {onMoveStage && (
                <>
                  <DropdownMenuSeparator className="bg-[#3A2C18]" />
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-[#C6B697] py-1">
                    Move to Stage
                  </DropdownMenuLabel>
                  {moveOptions
                    .filter(
                      (s) => s.toLowerCase() !== card.pipelineStage.toLowerCase()
                    )
                    .map((stageName) => (
                      <DropdownMenuItem
                        key={stageName}
                        onClick={() => onMoveStage(card, stageName)}
                        className="cursor-pointer gap-1.5 text-[11px]"
                      >
                        <ArrowRight className="h-3 w-3 text-[#A69371]" />
                        <span className="truncate">{stageName}</span>
                      </DropdownMenuItem>
                    ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 2. Badges Row: Service Plan + Case Type + Case Compass Risk + Open Tasks */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span
          className={cn(
            "px-2 py-0.5 rounded-full text-[10px] font-bold border tracking-tight shadow-xs",
            getPlanTierStyle(card.servicePlanLabel || card.planTier)
          )}
        >
          {card.servicePlanLabel || card.planTier}
        </span>

        {card.planType && (
          <span
            className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-semibold border tracking-tight shadow-xs",
              getCaseTypeStyle(card.planType)
            )}
          >
            {card.planType}
          </span>
        )}

        {getCompassRiskBadge(card.compassRiskLevel)}

        {typeof card.openTaskCount === "number" && card.openTaskCount > 0 && (
          <span
            className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-[#05142B] text-[#FFE394] border border-[#3A2C18]"
            title={`${card.openTaskCount} outstanding task(s)`}
          >
            <CheckSquare className="h-2.5 w-2.5 text-[#C5A059]" />
            <span>{card.openTaskCount}</span>
          </span>
        )}
      </div>

      {/* 3. Next Action / Task / Activity Plate */}
      {(card.primaryTask ||
        card.secondaryTask ||
        card.meetingDate ||
        card.nextDate ||
        card.lastActivityText) && (
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

          {card.lastActivityText && (
            <div className="flex items-center gap-1 text-[10px] text-[#A69371] pt-0.5 border-t border-[#3A2C18]/40 truncate">
              <Activity className="h-2.5 w-2.5 text-[#C5A059] shrink-0" />
              <span className="truncate">{card.lastActivityText}</span>
            </div>
          )}
        </div>
      )}

      {/* 4. Advocate Footer Row */}
      <div className="flex items-center justify-between pt-1.5 border-t border-[#3A2C18]/60 text-[11px]">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] border border-[#FFE394]/60 flex items-center justify-center text-[9px] font-bold text-[#07162B] shrink-0 shadow-xs">
            {card.assignedAdvocateInitials || "BH"}
          </div>
          <span className="text-[#C6B697] font-medium truncate">
            {card.assignedAdvocateName}
          </span>
        </div>

        <span
          className={cn(
            "text-[10px] shrink-0 font-medium px-1.5 py-0.2 rounded",
            card.accountStatus === "Renewal Needed"
              ? "text-emerald-300 bg-emerald-950/60"
              : card.accountStatus === "On Hold"
              ? "text-amber-300 bg-amber-950/60"
              : "text-[#A69371]"
          )}
        >
          {card.accountStatus || "Active"}
        </span>
      </div>
    </div>
  );
}
