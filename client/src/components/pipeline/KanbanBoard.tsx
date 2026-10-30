import React, { useState } from "react";
import { Plus } from "lucide-react";
import { KanbanColumn } from "./KanbanColumn";
import type { PipelineStageItem, PipelineCardItem } from "./types";

interface KanbanBoardProps {
  stages: PipelineStageItem[];
  allStages?: PipelineStageItem[];
  cards: PipelineCardItem[];
  onMoveCard: (cardId: number, targetStageName: string) => void;
  onAssignAdvocate?: (cardId: number, advocateName: string) => void;
  onReorderCards?: (draggedCardId: number, targetCardId: number, stageName: string) => void;
  onReorderStages?: (draggedStageId: number, targetStageId: number) => void;
  onAddCard: (stageName: string) => void;
  onAddCustomStage: () => void;
  onEditStage?: (stage: PipelineStageItem) => void;
  onArchiveStage?: (stage: PipelineStageItem) => void;
  onDeleteStage?: (stage: PipelineStageItem) => void;
}

export function KanbanBoard({
  stages,
  allStages,
  cards,
  onMoveCard,
  onAssignAdvocate,
  onReorderCards,
  onReorderStages,
  onAddCard,
  onAddCustomStage,
  onEditStage,
  onArchiveStage,
  onDeleteStage,
}: KanbanBoardProps) {
  const [draggedCard, setDraggedCard] = useState<PipelineCardItem | null>(null);
  const [draggedStage, setDraggedStage] = useState<PipelineStageItem | null>(null);

  const visibleStages = stages.filter((s) => !s.isArchived);
  const stageMenuOptions = (allStages || stages).filter((s) => !s.isArchived);

  const handleCardDragStart = (e: React.DragEvent, card: PipelineCardItem) => {
    setDraggedCard(card);
    e.dataTransfer.setData("text/plain", String(card.id));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleCardDrop = (e: React.DragEvent, targetStageName: string) => {
    const fallbackId = Number(e?.dataTransfer?.getData?.("text/plain") || 0);
    const cardId = draggedCard?.id || fallbackId;
    if (!cardId) return;

    if (
      !draggedCard ||
      draggedCard.pipelineStage.toLowerCase() !== targetStageName.toLowerCase()
    ) {
      onMoveCard(cardId, targetStageName);
    }
    setDraggedCard(null);
  };

  const handleStageDragStart = (e: React.DragEvent, stage: PipelineStageItem) => {
    setDraggedStage(stage);
    e.dataTransfer.setData("application/waypoint-stage", String(stage.id));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleStageDrop = (e: React.DragEvent, targetStage: PipelineStageItem) => {
    if (!draggedStage || draggedStage.id === targetStage.id) {
      setDraggedStage(null);
      return;
    }
    if (onReorderStages) {
      onReorderStages(draggedStage.id, targetStage.id);
    }
    setDraggedStage(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 w-full pb-6 pt-0.5 select-none">
      {visibleStages.map((stage) => {
        const stageCards = cards.filter(
          (c) => c.pipelineStage.toLowerCase() === stage.name.toLowerCase()
        );

        return (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            allStages={stageMenuOptions}
            cards={stageCards}
            draggedCardId={draggedCard?.id}
            draggedStageId={draggedStage?.id}
            onCardDragStart={handleCardDragStart}
            onCardDrop={handleCardDrop}
            onMoveCard={onMoveCard}
            onAssignAdvocate={onAssignAdvocate}
            onCardReorder={onReorderCards}
            onStageDragStart={handleStageDragStart}
            onStageDrop={handleStageDrop}
            onAddCard={onAddCard}
            onEditStage={onEditStage}
            onArchiveStage={onArchiveStage}
            onDeleteStage={onDeleteStage}
          />
        );
      })}

      {/* Trailing "+ Add Custom Stage" Card inside the responsive grid */}
      <div className="w-full rounded-2xl border-2 border-dashed border-[#3A2C18] hover:border-[#C5A059]/80 bg-[#05142B]/40 hover:bg-[#05142B]/80 p-4 flex flex-col items-center justify-center text-center transition-all duration-150 cursor-pointer min-h-[240px] group space-y-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
        <button
          type="button"
          onClick={onAddCustomStage}
          className="w-full h-full flex flex-col items-center justify-center space-y-2.5 cursor-pointer focus:outline-hidden"
        >
          <div className="w-10 h-10 rounded-xl bg-[#020A17] group-hover:bg-[#07162B] border border-[#3A2C18] group-hover:border-[#C5A059]/60 flex items-center justify-center text-[#C5A059] group-hover:text-[#FFE394] transition-all shadow-xs">
            <Plus className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-serif font-bold text-[#FFF4D4] group-hover:text-[#FFE394] transition-colors">
              + Add Custom Stage
            </h4>
            <p className="text-[11px] text-[#C6B697] mt-0.5 max-w-[190px] leading-relaxed">
              Add an Opportunity or Active Advocacy stage to fit your workflow.
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
