import React from "react";
import {
  Star,
  ArrowRight,
  MoreHorizontal,
  Zap as ConvertIcon,
  Trash2,
  Pin,
  PinOff,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BrainItem } from "./types";
import { PriorityDot, CategoryPill, SmallThumbnailStrip } from "./BrainDumpBadges";

export default function BrainDumpKanbanCard({
  item,
  onEdit,
  onDelete,
  onTogglePin,
  onConvertToTask,
}: {
  item: BrainItem;
  onEdit: (item: BrainItem) => void;
  onDelete: (id: number) => void;
  onTogglePin: (item: BrainItem) => void;
  onConvertToTask: (item: BrainItem) => void;
}) {
  return (
    <div
      className={`group p-3 rounded-lg border bg-card hover:shadow-md transition-all cursor-pointer ${
        item.pinned
          ? "border-amber-400/60 bg-amber-500/[0.02]"
          : "border-border hover:border-border/80"
      }`}
      onClick={() => onEdit(item)}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h4
          className={`text-sm font-semibold leading-snug flex-1 break-words ${
            item.status === "done" ? "line-through text-muted-foreground" : "text-foreground"
          }`}
        >
          {item.pinned && (
            <Star className="inline h-3.5 w-3.5 text-amber-500 fill-amber-500 mr-1 align-text-top" />
          )}
          {item.title}
        </h4>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <button className="p-1 rounded opacity-60 group-hover:opacity-100 hover:bg-muted transition-all">
              <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-xs min-w-[130px]">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin(item);
              }}
            >
              {item.pinned ? (
                <>
                  <PinOff className="h-3.5 w-3.5 mr-2" /> Unpin
                </>
              ) : (
                <>
                  <Pin className="h-3.5 w-3.5 mr-2" /> Pin
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onConvertToTask(item);
              }}
            >
              <ConvertIcon className="h-3.5 w-3.5 mr-2 text-emerald-500" /> Convert to Task
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item.id);
              }}
              className="text-rose-600 focus:text-rose-600"
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {item.body && (
        <p className="text-xs text-muted-foreground line-clamp-3 mb-2 leading-relaxed">
          {item.body}
        </p>
      )}

      <div className="flex items-center gap-1.5 flex-wrap">
        <CategoryPill category={item.category} />
        <PriorityDot priority={item.priority} />
      </div>

      {item.nextStep && (
        <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1 bg-muted/40 px-1.5 py-0.5 rounded border border-border/40">
          <ArrowRight className="h-3 w-3 flex-shrink-0 text-amber-500" />
          <span className="break-words">{item.nextStep}</span>
        </p>
      )}

      <SmallThumbnailStrip itemId={item.id} />

      <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-2 pt-1.5 border-t border-border/30">
        <span>#{item.id}</span>
        <span>
          {new Date(item.createdAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>
    </div>
  );
}
