import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  MoreVertical,
  Plus,
  GripVertical,
  Pencil,
  Archive,
  Trash2,
  CheckCircle2,
  Calendar,
  Scale,
  FileSearch,
  FileText,
  School,
  Compass,
  Activity,
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
  cards: PipelineCardItem[];
  onCardDragStart: (e: React.DragEvent, card: PipelineCardItem) => void;
  onCardDrop: (e: React.DragEvent, targetStageName: string) => void;
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
  cards,
  onCardDragStart,
  onCardDrop,
  onCardReorder,
  onStageDragStart,
  onStageDragOver,
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

    // Check if dragging a stage column vs a client card
    const stageData = e.dataTransfer.getData("application/waypoint-stage");
    if (stageData && onStageDrop) {
      onStageDrop(e, stage);
      return;
    }

    onCardDrop(e, stage.name);
  };

  const handleCardOverCard = (e: React.DragEvent, targetCard: PipelineCardItem) => {
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

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "w-[260px] shrink-0 rounded-2xl bg-[#061833]/90 border flex flex-col max-h-[calc(100vh-175px)] transition-all duration-150 relative overflow-hidden",
        isCardDragOver
          ? "border-[#F5B544] bg-[#082042] shadow-[0_0_20px_rgba(245,181,68,0.18)] ring-1 ring-[#F5B544]/60"
          : "border-[#0D366B]/80",
        isStageBeingDragged && "opacity-40 border-dashed border-[#F5B544]"
      )}
    >
      {/* Top Stage Accent Strip */}
      <div
        className="h-1.5 w-full shrink-0"
        style={{ backgroundColor: stage.accentColor || "#38BDF8" }}
      />

      {/* Stage Header — Draggable for column reordering */}
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("application/waypoint-stage", String(stage.id));
          onStageDragStart?.(e, stage);
        }}
        className="px-3 py-2 border-b border-[#0D366B]/60 flex items-center justify-between gap-1.5 shrink-0 cursor-grab active:cursor-grabbing hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <GripVertical className="h-3.5 w-3.5 text-slate-400 shrink-0 hover:text-white transition-colors" />
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-white tracking-wider truncate">
              {stage.name}
            </h3>
            <p className="text-[10px] text-slate-400 font-medium">
              {cards.length} {cards.length === 1 ? "client" : "clients"}
            </p>
          </div>
        </div>

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
            <DropdownMenuItem onClick={() => onAddCard(stage.name)} className="cursor-pointer gap-2">
              <Plus className="h-3.5 w-3.5 text-[#F5B544]" />
              <span>Add Client to {stage.name}</span>
            </DropdownMenuItem>
            {onEditStage && (
              <DropdownMenuItem onClick={() => onEditStage(stage)} className="cursor-pointer gap-2">
                <Pencil className="h-3.5 w-3.5 text-sky-400" />
                <span>Edit Stage Details</span>
              </DropdownMenuItem>
            )}
            {onArchiveStage && (
              <DropdownMenuItem onClick={() => onArchiveStage(stage)} className="cursor-pointer gap-2 text-slate-300">
                <Archive className="h-3.5 w-3.5" />
                <span>Archive Stage</span>
              </DropdownMenuItem>
            )}
            {onDeleteStage && !stage.isDefault && (
              <DropdownMenuItem onClick={() => onDeleteStage(stage)} className="cursor-pointer gap-2 text-rose-400">
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Stage</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Cards List Area with clean subtle scroll */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[120px] focus:outline-hidden no-scrollbar">
        {cards.map((card) => (
          <KanbanCard
            key={card.id}
            card={card}
            isDragging={draggedCardId === card.id}
            onDragStart={onCardDragStart}
            onDragOver={handleCardOverCard}
            onDrop={handleCardDropOnCard}
            onMoveStage={(c, nextStage) => onCardDrop({} as any, nextStage)}
          />
        ))}

        {cards.length === 0 && (
          <div className="h-24 rounded-xl border border-dashed border-[#0E3A73]/60 flex flex-col items-center justify-center text-slate-400 text-[11px] text-center p-2">
            <p>No clients in this stage</p>
            <span className="text-[10px] text-slate-400 mt-0.5">Drag cards here</span>
          </div>
        )}
      </div>

      {/* Column Footer: "+ Add a card" button */}
      <div className="p-1.5 border-t border-[#0D366B]/50 shrink-0 bg-[#061833]/80">
        <button
          type="button"
          onClick={() => onAddCard(stage.name)}
          className="w-full py-1 px-2.5 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-[#0E3A73] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus className="h-3 w-3" />
          <span>Add a card</span>
        </button>
      </div>
    </div>
  );
}
