import React, { useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { KanbanColumn } from "./KanbanColumn";
import type { PipelineStageItem, PipelineCardItem } from "./types";

interface KanbanBoardProps {
  stages: PipelineStageItem[];
  cards: PipelineCardItem[];
  onMoveCard: (cardId: number, targetStageName: string) => void;
  onAddCard: (stageName: string) => void;
  onAddCustomStage: () => void;
  onEditStage?: (stage: PipelineStageItem) => void;
  onArchiveStage?: (stage: PipelineStageItem) => void;
  onDeleteStage?: (stage: PipelineStageItem) => void;
}

export function KanbanBoard({
  stages,
  cards,
  onMoveCard,
  onAddCard,
  onAddCustomStage,
  onEditStage,
  onArchiveStage,
  onDeleteStage,
}: KanbanBoardProps) {
  const [draggedCard, setDraggedCard] = useState<PipelineCardItem | null>(null);

  const handleCardDragStart = (e: React.DragEvent, card: PipelineCardItem) => {
    setDraggedCard(card);
    e.dataTransfer.setData("text/plain", String(card.id));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleCardDrop = (e: React.DragEvent, targetStageName: string) => {
    if (!draggedCard) return;
    if (draggedCard.pipelineStage !== targetStageName) {
      onMoveCard(draggedCard.id, targetStageName);
    }
    setDraggedCard(null);
  };

  return (
    <div className="flex items-start gap-4 overflow-x-auto pb-6 pt-2 select-none min-h-[calc(100vh-280px)]">
      {/* Dynamic Pipeline Stage Columns */}
      {stages
        .filter((s) => !s.isArchived)
        .map((stage) => {
          const stageCards = cards.filter(
            (c) => c.pipelineStage.toLowerCase() === stage.name.toLowerCase()
          );

          return (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              cards={stageCards}
              onCardDragStart={handleCardDragStart}
              onCardDrop={handleCardDrop}
              onAddCard={onAddCard}
              onEditStage={onEditStage}
              onArchiveStage={onArchiveStage}
              onDeleteStage={onDeleteStage}
            />
          );
        })}

      {/* Trailing "+ Add Custom Stage" Column matching reference image */}
      <div className="w-72 sm:w-80 shrink-0 rounded-2xl border-2 border-dashed border-[#0E3A73]/70 hover:border-[#F5B544]/60 bg-[#061833]/40 hover:bg-[#071F42]/60 p-6 flex flex-col items-center justify-center text-center transition-all duration-150 cursor-pointer min-h-[380px] group space-y-3">
        <button
          type="button"
          onClick={onAddCustomStage}
          className="w-full h-full flex flex-col items-center justify-center space-y-3 cursor-pointer"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#0F284F] group-hover:bg-[#F5B544]/20 border border-[#174885] group-hover:border-[#F5B544]/40 flex items-center justify-center text-sky-400 group-hover:text-[#F5B544] transition-all">
            <Plus className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white group-hover:text-[#F5B544] transition-colors">
              + Add Custom Stage
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-[200px] leading-relaxed">
              Create a stage to fit your workflow.
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
