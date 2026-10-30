import React from "react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  CheckSquare,
  ExternalLink,
  Sparkles,
  Briefcase,
  Users,
  ShieldAlert,
  Activity,
} from "lucide-react";
import { ADVOCATE_ROSTER } from "./pipelineDefaults";
import type {
  PipelineCardItem,
  PipelineStageItem,
  PipelineSortField,
  PipelineSortDirection,
} from "./types";

interface PipelineListViewProps {
  cards: PipelineCardItem[];
  stages: PipelineStageItem[];
  sortField: PipelineSortField;
  sortDirection: PipelineSortDirection;
  onSortChange: (field: PipelineSortField) => void;
  onMoveCard: (cardId: number, targetStageName: string) => void;
  onAssignAdvocate?: (cardId: number, advocateName: string) => void;
}

export function PipelineListView({
  cards,
  stages,
  sortField,
  sortDirection,
  onSortChange,
  onMoveCard,
  onAssignAdvocate,
}: PipelineListViewProps) {
  const [, setLocation] = useLocation();
  const activeStages = stages.filter((s) => !s.isArchived);

  const renderSortIcon = (field: PipelineSortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 text-[#A69371]/60" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3 w-3 text-[#FFE394]" />
    ) : (
      <ArrowDown className="h-3 w-3 text-[#FFE394]" />
    );
  };

  const getPlanBadgeStyle = (tier: string) => {
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
    if (t.includes("nonpay") || t.includes("failed")) {
      return "bg-[#33090F]/90 border-[#9F1239] text-[#FDA4AF]";
    }
    return "bg-[#020A17] border-[#3A2C18] text-[#C6B697]";
  };

  const getCompassBadgeStyle = (risk?: string | null) => {
    const r = (risk || "").toLowerCase();
    if (r === "critical" || r === "high") {
      return "bg-rose-950/80 border-rose-500/50 text-rose-300";
    }
    if (r === "medium" || r === "elevated") {
      return "bg-amber-950/80 border-amber-500/50 text-amber-300";
    }
    return "bg-emerald-950/80 border-emerald-500/40 text-emerald-300";
  };

  return (
    <div className="rounded-2xl bg-[#05142B]/90 border border-[#3A2C18] shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] overflow-hidden w-full">
      {/* Header Row */}
      <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-[#020A17]/90 border-b border-[#3A2C18] text-[10px] font-bold uppercase tracking-wider text-[#C6B697]">
        <button
          type="button"
          onClick={() => onSortChange("name")}
          className="col-span-3 flex items-center gap-1.5 text-left hover:text-[#FFE394] transition-colors cursor-pointer"
        >
          <span>Student & Family</span>
          {renderSortIcon("name")}
        </button>

        <button
          type="button"
          onClick={() => onSortChange("stage")}
          className="col-span-2 flex items-center gap-1.5 text-left hover:text-[#FFE394] transition-colors cursor-pointer"
        >
          <span>Pipeline Stage</span>
          {renderSortIcon("stage")}
        </button>

        <div className="col-span-2 flex items-center">Plan & Case Type</div>

        <div className="col-span-2 flex items-center">Assigned Advocate</div>

        <button
          type="button"
          onClick={() => onSortChange("nextDate")}
          className="col-span-2 flex items-center gap-1.5 text-left hover:text-[#FFE394] transition-colors cursor-pointer"
        >
          <span>Next Action & Activity</span>
          {renderSortIcon("nextDate")}
        </button>

        <div className="col-span-1 flex items-center justify-end">Workspace</div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-[#3A2C18]/60">
        {cards.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#C6B697]">
            No students or families match the active pipeline view and filter rules.
          </div>
        ) : (
          cards.map((card) => {
            const isOpp =
              card.pipelineGroup === "opportunity" || card.isOpportunity;

            return (
              <div
                key={card.id}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("[data-prevent-row-click]")) {
                    return;
                  }
                  setLocation(`/students/${card.id}`);
                }}
                className={cn(
                  "grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-[#07162B]/90 transition-colors cursor-pointer text-xs",
                  card.needsAttention && "bg-[#16080B]/60"
                )}
              >
                {/* 1. Student & Family */}
                <div className="col-span-3 min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-serif font-bold text-[#FFF4D4] hover:text-[#FFE394] truncate">
                      {card.fullName}
                    </span>
                    {card.needsAttention && (
                      <span
                        className="w-2 h-2 rounded-full bg-rose-400 animate-pulse shrink-0"
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
                  <p className="text-[11px] text-[#C6B697] truncate mt-0.5">
                    {card.parentName ? `Family: ${card.parentName}` : card.schoolName}
                  </p>
                  <p className="text-[10px] text-[#A69371] truncate">
                    {card.schoolName}
                    {card.countyDistrict ? ` · ${card.countyDistrict}` : ""}
                  </p>
                </div>

                {/* 2. Stage & Group */}
                <div className="col-span-2 min-w-0 space-y-1" data-prevent-row-click="true">
                  <div className="flex items-center gap-1">
                    {isOpp ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-purple-950/80 text-purple-300 border border-purple-500/40">
                        <Sparkles className="h-2.5 w-2.5" />
                        <span>Opportunity</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                        <Briefcase className="h-2.5 w-2.5" />
                        <span>Active Advocacy</span>
                      </span>
                    )}
                  </div>
                  <select
                    value={card.pipelineStage}
                    onChange={(e) => onMoveCard(card.id, e.target.value)}
                    className="w-full h-7 rounded-lg bg-[#020A17] border border-[#3A2C18] text-[#FFF4D4] text-[11px] px-2 focus:outline-hidden focus:border-[#C5A059] cursor-pointer"
                  >
                    {activeStages.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Service Plan & Case Type */}
                <div className="col-span-2 min-w-0 space-y-1">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                        getPlanBadgeStyle(card.servicePlanLabel || card.planTier)
                      )}
                    >
                      {card.servicePlanLabel || card.planTier}
                    </span>
                    {card.planType && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#020A17] border border-[#3A2C18] text-[#C6B697]">
                        {card.planType}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#A69371]">
                    <span>{card.accountStatus}</span>
                    {card.compassRiskLevel && (
                      <span
                        className={cn(
                          "inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-semibold border",
                          getCompassBadgeStyle(card.compassRiskLevel)
                        )}
                      >
                        <ShieldAlert className="h-2.5 w-2.5" />
                        <span>{card.compassRiskLevel}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* 4. Assigned Advocate */}
                <div className="col-span-2 min-w-0" data-prevent-row-click="true">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] border border-[#FFE394]/60 flex items-center justify-center text-[10px] font-bold text-[#07162B] shrink-0">
                      {card.assignedAdvocateInitials || "BH"}
                    </div>
                    {onAssignAdvocate ? (
                      <select
                        value={card.assignedAdvocateName}
                        onChange={(e) => onAssignAdvocate(card.id, e.target.value)}
                        className="h-7 rounded-lg bg-[#020A17] border border-[#3A2C18] text-[#FFF4D4] text-[11px] px-2 focus:outline-hidden focus:border-[#C5A059] cursor-pointer max-w-[140px] truncate"
                      >
                        {ADVOCATE_ROSTER.map((adv) => (
                          <option key={adv.name} value={adv.name}>
                            {adv.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-[#C6B697] font-medium truncate">
                        {card.assignedAdvocateName}
                      </span>
                    )}
                  </div>
                </div>

                {/* 5. Next Action, Tasks & Last Activity */}
                <div className="col-span-2 min-w-0 space-y-0.5">
                  {card.meetingDate || card.primaryTask ? (
                    <div className="flex items-center gap-1 text-[11px] text-[#FFE394] truncate">
                      <Calendar className="h-3 w-3 text-[#C5A059] shrink-0" />
                      <span className="truncate">
                        {card.meetingDate || card.primaryTask}
                      </span>
                    </div>
                  ) : null}

                  <div className="flex items-center gap-2 text-[10px] text-[#A69371] truncate">
                    {typeof card.openTaskCount === "number" && card.openTaskCount > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[#D8C7A5]">
                        <CheckSquare className="h-2.5 w-2.5 text-[#C5A059]" />
                        <span>{card.openTaskCount} task{card.openTaskCount > 1 ? "s" : ""}</span>
                      </span>
                    )}
                    {card.lastActivityText && (
                      <span className="inline-flex items-center gap-0.5 truncate">
                        <Activity className="h-2.5 w-2.5 text-[#A69371] shrink-0" />
                        <span className="truncate">{card.lastActivityText}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* 6. Action */}
                <div className="col-span-1 flex items-center justify-end" data-prevent-row-click="true">
                  <button
                    type="button"
                    onClick={() => setLocation(`/students/${card.id}`)}
                    className="h-7 px-2.5 rounded-lg bg-[#020A17] hover:bg-[#07162B] border border-[#3A2C18] hover:border-[#C5A059] text-[#FFE394] text-[11px] font-semibold inline-flex items-center gap-1 transition-all cursor-pointer"
                    title="Open Student Workspace"
                  >
                    <span>Open</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

