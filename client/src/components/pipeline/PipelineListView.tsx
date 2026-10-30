import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  ExternalLink,
  Users,
  ArrowRight,
  PanelRightOpen,
  X,
} from "lucide-react";
import {
  ADVOCATE_ROSTER,
  resolveCaseActionStatus,
} from "./pipelineDefaults";
import type {
  PipelineCardItem,
  PipelineStageItem,
  PipelineSortField,
  PipelineSortDirection,
} from "./types";

interface PipelineListViewProps {
  cards: PipelineCardItem[];
  stages: PipelineStageItem[];
  selectedStageName?: string | null;
  onClearStageFilter?: () => void;
  sortField: PipelineSortField;
  sortDirection: PipelineSortDirection;
  onSortChange: (field: PipelineSortField) => void;
  onMoveCard: (cardId: number, targetStageName: string) => void;
  onAssignAdvocate?: (cardId: number, advocateName: string) => void;
  onSelectCase?: (card: PipelineCardItem) => void;
}

export function PipelineListView({
  cards,
  stages,
  selectedStageName,
  onClearStageFilter,
  sortField,
  sortDirection,
  onSortChange,
  onMoveCard,
  onAssignAdvocate,
  onSelectCase,
}: PipelineListViewProps) {
  const [, setLocation] = useLocation();
  const [pendingMove, setPendingMove] = useState<{
    card: PipelineCardItem;
    targetStage: string;
  } | null>(null);

  const activeStages = stages.filter((s) => !s.isArchived);

  const renderSortIcon = (field: PipelineSortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 text-[#64748B]" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3 w-3 text-[#C5A059]" />
    ) : (
      <ArrowDown className="h-3 w-3 text-[#C5A059]" />
    );
  };

  return (
    <div className="rounded-xl bg-[#051022] border border-[#1A2942] overflow-hidden w-full">
      {/* Compact Selected Stage Context Strip (Only when a specific stage is focused) */}
      {selectedStageName && (
        <div className="px-4 py-2 bg-[#07162C] border-b border-[#1A2942] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#94A3B8]">Stage:</span>
            <span className="font-semibold text-[#FFF4D4]">
              {selectedStageName}
            </span>
            <span className="text-[11px] text-[#64748B]">
              ({cards.length} {cards.length === 1 ? "case" : "cases"})
            </span>
          </div>
          {onClearStageFilter && (
            <button
              type="button"
              onClick={onClearStageFilter}
              className="text-[11px] font-medium text-[#94A3B8] hover:text-[#FFF4D4] inline-flex items-center gap-1 cursor-pointer transition-colors"
            >
              <X className="h-3 w-3" />
              <span>Show All Stages</span>
            </button>
          )}
        </div>
      )}

      {/* Inline Stage Transition Confirmation Bar */}
      {pendingMove && (
        <div className="px-4 py-2 bg-[#0D2142] border-b border-[#C5A059]/60 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-[#FFF4D4]">
            <span>
              Move <strong>{pendingMove.card.fullName}</strong> from{" "}
              <span className="text-[#CBD5E1]">
                {pendingMove.card.pipelineStage}
              </span>{" "}
              <ArrowRight className="inline h-3 w-3 mx-0.5 text-[#C5A059]" />{" "}
              <span className="text-[#FFE394] font-semibold">
                {pendingMove.targetStage}
              </span>
              ?
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPendingMove(null)}
              className="h-6 px-2.5 rounded-md bg-[#051022] border border-[#233554] text-[#94A3B8] hover:text-[#FFF4D4] text-[11px] font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onMoveCard(pendingMove.card.id, pendingMove.targetStage);
                setPendingMove(null);
              }}
              className="h-6 px-2.5 rounded-md bg-[#C5A059] text-[#07162B] text-[11px] font-bold cursor-pointer"
            >
              Confirm Move
            </button>
          </div>
        </div>
      )}

      {/* Column Headers */}
      <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-[#071326] border-b border-[#1A2942] text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
        <button
          type="button"
          onClick={() => onSortChange("name")}
          className="col-span-3 flex items-center gap-1.5 text-left hover:text-[#FFF4D4] transition-colors cursor-pointer"
        >
          <span>Client & Student</span>
          {renderSortIcon("name")}
        </button>

        <button
          type="button"
          onClick={() => onSortChange("stage")}
          className="col-span-2 flex items-center gap-1.5 text-left hover:text-[#FFF4D4] transition-colors cursor-pointer"
        >
          <span>Stage</span>
          {renderSortIcon("stage")}
        </button>

        <div className="col-span-3 flex items-center">Next Required Action</div>

        <div className="col-span-2 flex items-center">Assigned Employee</div>

        <button
          type="button"
          onClick={() => onSortChange("nextDate")}
          className="col-span-2 flex items-center gap-1.5 text-left hover:text-[#FFF4D4] transition-colors cursor-pointer"
        >
          <span>Due Date & Status</span>
          {renderSortIcon("nextDate")}
        </button>
      </div>

      {/* Case Rows */}
      <div className="divide-y divide-[#142238]">
        {cards.length === 0 ? (
          <div className="py-10 text-center text-xs text-[#94A3B8]">
            No cases in{" "}
            <strong className="text-[#FFF4D4]">
              {selectedStageName || "this view"}
            </strong>
            .
          </div>
        ) : (
          cards.map((card) => {
            const actionMeta = resolveCaseActionStatus(card);

            return (
              <div
                key={card.id}
                onClick={(e) => {
                  if (
                    (e.target as HTMLElement).closest("[data-prevent-row-click]")
                  ) {
                    return;
                  }
                  if (onSelectCase) {
                    onSelectCase(card);
                  } else {
                    setLocation(`/students/${card.id}`);
                  }
                }}
                className={cn(
                  "grid grid-cols-12 gap-2 px-4 py-2.5 items-center hover:bg-[#0A192F] transition-colors cursor-pointer text-xs group",
                  actionMeta.isOverdue && "bg-rose-950/15 hover:bg-rose-950/25"
                )}
              >
                {/* 1. Client & Student Name */}
                <div className="col-span-3 min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-[#FFF4D4] group-hover:text-[#FFE394] truncate">
                      {card.fullName}
                    </span>
                    {card.siblingCount && card.siblingCount > 1 && (
                      <span
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-medium bg-[#0D2142] text-[#93C5FD]"
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
                  <p className="text-[11px] text-[#94A3B8] truncate">
                    {card.parentName || `${card.lastName} Family`} ·{" "}
                    {card.servicePlanLabel || card.planTier}
                  </p>
                </div>

                {/* 2. Current Stage */}
                <div
                  className="col-span-2 min-w-0 pr-2"
                  data-prevent-row-click="true"
                >
                  <select
                    value={card.pipelineStage}
                    onChange={(e) => {
                      const nextStage = e.target.value;
                      if (
                        nextStage.toLowerCase() !==
                        card.pipelineStage.toLowerCase()
                      ) {
                        setPendingMove({ card, targetStage: nextStage });
                      }
                    }}
                    className="w-full h-7 rounded-md bg-[#071326] border border-[#1E2E48] hover:border-[#334155] focus:border-[#C5A059] text-[#E2E8F0] text-[11px] px-2 focus:outline-hidden cursor-pointer"
                  >
                    {activeStages.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Next Required Action */}
                <div className="col-span-3 min-w-0 pr-2">
                  <p className="text-[11px] text-[#E2E8F0] truncate">
                    {card.primaryTask || "Review current stage milestone"}
                  </p>
                  {card.schoolName && (
                    <p className="text-[10px] text-[#64748B] truncate">
                      {card.schoolName}
                      {card.countyDistrict ? ` · ${card.countyDistrict}` : ""}
                    </p>
                  )}
                </div>

                {/* 4. Assigned Employee */}
                <div
                  className="col-span-2 min-w-0 pr-2"
                  data-prevent-row-click="true"
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-[#102B4E] border border-[#233554] flex items-center justify-center text-[9px] font-bold text-[#FFE394] shrink-0">
                      {card.assignedAdvocateInitials || "BH"}
                    </div>
                    {onAssignAdvocate ? (
                      <select
                        value={card.assignedAdvocateName}
                        onChange={(e) =>
                          onAssignAdvocate(card.id, e.target.value)
                        }
                        className="h-7 rounded-md bg-transparent hover:bg-[#071326] border border-transparent hover:border-[#1E2E48] text-[#CBD5E1] text-[11px] px-1.5 focus:outline-hidden cursor-pointer max-w-[135px] truncate"
                      >
                        {ADVOCATE_ROSTER.map((adv) => (
                          <option
                            key={adv.name}
                            value={adv.name}
                            className="bg-[#071326] text-[#FFF4D4]"
                          >
                            {adv.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-[#CBD5E1] text-[11px] truncate">
                        {card.assignedAdvocateName}
                      </span>
                    )}
                  </div>
                </div>

                {/* 5. Due Date & Status + Quick Actions */}
                <div className="col-span-2 min-w-0 flex items-center justify-between gap-1.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full shrink-0",
                          actionMeta.dotClass
                        )}
                      />
                      <span
                        className={cn(
                          "text-[11px] font-medium truncate",
                          actionMeta.isOverdue
                            ? "text-rose-300"
                            : "text-[#CBD5E1]"
                        )}
                      >
                        {actionMeta.label}
                      </span>
                    </div>
                    {(card.meetingDate || card.nextDate) && (
                      <div className="flex items-center gap-1 text-[10px] text-[#64748B] truncate mt-0.5">
                        <Calendar className="h-2.5 w-2.5 shrink-0" />
                        <span className="truncate">
                          {card.meetingDate || card.nextDate}
                        </span>
                      </div>
                    )}
                  </div>

                  <div
                    className="flex items-center gap-1 shrink-0 opacity-75 group-hover:opacity-100 transition-opacity"
                    data-prevent-row-click="true"
                  >
                    {onSelectCase && (
                      <button
                        type="button"
                        onClick={() => onSelectCase(card)}
                        className="h-6 w-6 rounded-md hover:bg-[#102B4E] text-[#94A3B8] hover:text-[#FFE394] inline-flex items-center justify-center transition-colors cursor-pointer"
                        title="Case Details"
                      >
                        <PanelRightOpen className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setLocation(`/students/${card.id}`)}
                      className="h-6 w-6 rounded-md hover:bg-[#102B4E] text-[#94A3B8] hover:text-[#FFF4D4] inline-flex items-center justify-center transition-colors cursor-pointer"
                      title="Open Student Workspace"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
