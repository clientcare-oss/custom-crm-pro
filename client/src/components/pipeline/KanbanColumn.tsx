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
  onAddCard: (stageName: string) => void;
  onEditStage?: (stage: PipelineStageItem) => void;
  onArchiveStage?: (stage: PipelineStageItem) => void;
  onDeleteStage?: (stage: PipelineStageItem) => void;
}

const STAGE_ICON_MAP: Record<string, any> = {
  Compass,
  FileText,
  FileSearch,
  School,
  Calendar,
  Scale,
  Activity,
  CheckCircle2,
};

export function KanbanColumn({
  stage,
  cards,
  onCardDragStart,
  onCardDrop,
  onAddCard,
  onEditStage,
  onArchiveStage,
  onDeleteStage,
}: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only reset if leaving the column container entirely
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    onCardDrop(e, stage.name);
  };

  const StageIcon = STAGE_ICON_MAP[stage.iconName] || Compass;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "w-72 sm:w-80 shrink-0 rounded-2xl bg-[#061833]/90 border flex flex-col max-h-[calc(100vh-250px)] transition-all duration-150 relative overflow-hidden",
        isDragOver
          ? "border-[#F5B544] bg-[#082042] shadow-[0_0_20px_rgba(245,181,68,0.15)] ring-1 ring-[#F5B544]/50"
          : "border-[#0D366B]/80"
      )}
    >
      {/* Top Accent Color Strip matching reference image */}
      <div
        className="h-1.5 w-full shrink-0"
        style={{ backgroundColor: stage.accentColor || "#38BDF8" }}
      />

      {/* Column Header */}
      <div className="p-3.5 pb-2.5 border-b border-[#0D366B]/60 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <GripVertical className="h-4 w-4 text-slate-400 shrink-0 cursor-grab" />
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider truncate">
              {stage.name}
            </h3>
            <p className="text-[11px] text-slate-300 font-medium">
              {cards.length} {cards.length === 1 ? "client" : "clients"}
            </p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="h-7 w-7 rounded-md hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
            >
              <MoreVertical className="h-4 w-4" />
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

      {/* Cards List (Scrollable vertically) */}
      <div className="p-3 space-y-3 overflow-y-auto flex-1 min-h-[140px]">
        {cards.map((card) => (
          <KanbanCard
            key={card.id}
            card={card}
            onDragStart={onCardDragStart}
            onMoveStage={(c, nextStage) => onCardDrop({} as any, nextStage)}
          />
        ))}

        {cards.length === 0 && (
          <div className="h-28 rounded-xl border border-dashed border-[#0E3A73]/70 flex flex-col items-center justify-center text-slate-400 text-xs text-center p-3">
            <span>No clients in this stage</span>
            <span className="text-[10.5px] text-slate-400 mt-1">Drag a client card here</span>
          </div>
        )}
      </div>

      {/* Bottom "+ Add a card" Button */}
      <div className="p-2.5 pt-1.5 border-t border-[#0D366B]/50 shrink-0">
        <button
          type="button"
          onClick={() => onAddCard(stage.name)}
          className="w-full py-1.5 px-3 rounded-xl bg-transparent hover:bg-white/[0.06] text-xs font-semibold text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-transparent hover:border-[#0E3A73]"
        >
          <Plus className="h-3.5 w-3.5 text-[#F5B544]" />
          <span>Add a card</span>
        </button>
      </div>
    </div>
  );
}
