import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  MoreVertical,
  Plus,
  GripVertical,
  Pencil,
  Archive,
  Trash2,
  Sparkles,
  Briefcase,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { KanbanCard } from "./KanbanCard";
import type { PipelineStageItem, PipelineCardItem } from "./types";

interface KanbanColumnProps {
  stage: PipelineStageItem;
  allStages?: PipelineStageItem[];
  cards: PipelineCardItem[];
  onCardDragStart: (e: React.DragEvent, card: PipelineCardItem) => void;
  onCardDrop: (e: React.DragEvent, targetStageName: string) => void;
  onMoveCard?: (cardId: number, targetStageName: string) => void;
  onAssignAdvocate?: (cardId: number, advocateName: string) => void;
  onCardReorder?: (draggedCardId: number, targetCardId: number, stageName: string) => void;
  onStageDragStart?: (e: React.DragEvent, stage: PipelineStageItem) => void;
  onStageDragOver?: (e: React.DragEvent, stage: PipelineStageItem) => void;
  onStageDrop?: (e: React.DragEvent, targetStage: PipelineStageItem) => void;
  onAddCard: (stageName: string) => void;
  onEditStage?: (stage: PipelineStageItem) => void;
  onArchiveStage?: (stage: PipelineStageItem) => void;
  onDeleteStage?: (stage: PipelineStageItem) => void;
  draggedCardId?: number | null;
  draggedStageId?: number | null;
}

export function KanbanColumn({
  stage,
  allStages = [],
  cards,
  onCardDragStart,
  onCardDrop,
  onMoveCard,
  onAssignAdvocate,
  onCardReorder,
  onStageDragStart,
  onStageDrop,
  onAddCard,
  onEditStage,
  onArchiveStage,
  onDeleteStage,
  draggedCardId,
  draggedStageId,
}: KanbanColumnProps) {
  const [isCardDragOver, setIsCardDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!isCardDragOver) setIsCardDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsCardDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsCardDragOver(false);

    const stageData = e.dataTransfer.getData("application/waypoint-stage");
    if (stageData && onStageDrop) {
      onStageDrop(e, stage);
      return;
    }

    onCardDrop(e, stage.name);
  };

  const handleCardOverCard = (e: React.DragEvent, _targetCard: PipelineCardItem) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleCardDropOnCard = (e: React.DragEvent, targetCard: PipelineCardItem) => {
    e.preventDefault();
    e.stopPropagation();
    setIsCardDragOver(false);

    const cardIdStr = e.dataTransfer.getData("text/plain");
    const draggedId = Number(cardIdStr);

    if (draggedId && onCardReorder) {
      onCardReorder(draggedId, targetCard.id, stage.name);
    } else {
      onCardDrop(e, stage.name);
    }
  };

  const isStageBeingDragged = draggedStageId === stage.id;
  const isOpportunityStage = stage.pipelineGroup === "opportunity";

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "w-full rounded-2xl bg-[#05142B]/90 border flex flex-col max-h-[540px] transition-all duration-150 relative overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]",
        isCardDragOver
          ? "border-[#C5A059] bg-[#07162B] shadow-[0_0_24px_rgba(197,160,89,0.25)] ring-1 ring-[#FFE394]/60"
          : "border-[#3A2C18]",
        isStageBeingDragged && "opacity-40 border-dashed border-[#C5A059]"
      )}
    >
      {/* Top Stage Accent Strip */}
      <div
        className="h-1.5 w-full shrink-0"
        style={{
          backgroundColor:
            stage.accentColor || (isOpportunityStage ? "#A855F7" : "#C5A059"),
        }}
      />

      {/* Stage Header — Draggable for column reordering */}
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("application/waypoint-stage", String(stage.id));
          onStageDragStart?.(e, stage);
        }}
        className="px-3.5 py-2.5 border-b border-[#3A2C18] flex items-center justify-between gap-1.5 shrink-0 cursor-grab active:cursor-grabbing hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <GripVertical className="h-3.5 w-3.5 text-[#A69371] shrink-0 hover:text-[#FFF4D4] transition-colors" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-serif font-bold text-[#FFF4D4] tracking-wider truncate">
                {stage.name}
              </h3>
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-bold shrink-0",
                  cards.length > 0
                    ? "bg-[#FFE394]/20 text-[#FFE394] border border-[#C5A059]/40"
                    : "bg-[#020A17] text-[#A69371] border border-[#3A2C18]"
                )}
              >
                {cards.length}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              {isOpportunityStage ? (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold uppercase tracking-wider text-purple-300">
                  <Sparkles className="h-2.5 w-2.5" />
                  <span>Opportunity</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-300">
                  <Briefcase className="h-2.5 w-2.5" />
                  <span>Active Advocacy</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="h-6 w-6 rounded-md hover:bg-[#020A17] flex items-center justify-center text-[#A69371] hover:text-[#FFF4D4] cursor-pointer transition-colors"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] shadow-2xl text-xs"
          >
            <DropdownMenuItem
              onClick={() => onAddCard(stage.name)}
              className="cursor-pointer gap-2"
            >
              <Plus className="h-3.5 w-3.5 text-[#C5A059]" />
              <span>Add Client to {stage.name}</span>
            </DropdownMenuItem>
            {onEditStage && (
              <DropdownMenuItem
                onClick={() => onEditStage(stage)}
                className="cursor-pointer gap-2"
              >
                <Pencil className="h-3.5 w-3.5 text-[#FFE394]" />
                <span>Edit Stage Details</span>
              </DropdownMenuItem>
            )}
            {onArchiveStage && (
              <DropdownMenuItem
                onClick={() => onArchiveStage(stage)}
                className="cursor-pointer gap-2 text-[#C6B697]"
              >
                <Archive className="h-3.5 w-3.5" />
                <span>Archive Stage</span>
              </DropdownMenuItem>
            )}
            {onDeleteStage && !stage.isDefault && (
              <DropdownMenuItem
                onClick={() => onDeleteStage(stage)}
                className="cursor-pointer gap-2 text-rose-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Stage</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Cards List Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[110px] focus:outline-hidden no-scrollbar">
        {cards.map((card) => (
          <KanbanCard
            key={card.id}
            card={card}
            allStages={allStages}
            isDragging={draggedCardId === card.id}
            onDragStart={onCardDragStart}
            onDragOver={handleCardOverCard}
            onDrop={handleCardDropOnCard}
            onMoveStage={(c, nextStage) => {
              if (onMoveCard) {
                onMoveCard(c.id, nextStage);
              } else {
                onCardDrop({} as any, nextStage);
              }
            }}
            onAssignAdvocate={onAssignAdvocate}
          />
        ))}

        {cards.length === 0 && (
          <div className="h-20 rounded-xl border border-dashed border-[#3A2C18] bg-[#020A17]/40 flex flex-col items-center justify-center text-[#A69371] text-[11px] text-center p-2">
            <p>No records in {stage.name}</p>
            <span className="text-[10px] text-[#A69371]/80 mt-0.5">
              Drag a student card here
            </span>
          </div>
        )}
      </div>

      {/* Column Footer: "+ Add a card" button */}
      <div className="p-1.5 border-t border-[#3A2C18] shrink-0 bg-[#020A17]/80">
        <button
          type="button"
          onClick={() => onAddCard(stage.name)}
          className="w-full py-1 px-2.5 rounded-lg text-[11px] font-semibold text-[#C6B697] hover:text-[#FFF4D4] hover:bg-[#07162B] border border-[#3A2C18]/60 hover:border-[#C5A059]/60 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus className="h-3 w-3 text-[#C5A059]" />
          <span>Add to {stage.name}</span>
        </button>
      </div>
    </div>
  );
}
