import React from "react";
import {
  Star,
  ArrowRight,
  Pin,
  PinOff,
  Edit3,
  Trash2,
  Zap as ConvertIcon,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { BrainItem, Status, PRIORITY_CONFIG, STATUS_CONFIG } from "./types";
import { StatusBadge, PriorityDot, CategoryPill, SmallThumbnailStrip } from "./BrainDumpBadges";

export default function BrainDumpListRow({
  item,
  onEdit,
  onDelete,
  onTogglePin,
  onStatusChange,
  onConvertToTask,
}: {
  item: BrainItem;
  onEdit: (item: BrainItem) => void;
  onDelete: (id: number) => void;
  onTogglePin: (item: BrainItem) => void;
  onStatusChange: (id: number, status: Status) => void;
  onConvertToTask: (item: BrainItem) => void;
}) {
  return (
    <div
      className={`group flex items-center gap-3 px-4 py-2.5 border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer w-full ${
        item.pinned ? "bg-amber-500/5 dark:bg-amber-500/10" : ""
      }`}
    >
      {/* Priority accent bar */}
      <div
        className={`w-1 self-stretch rounded-full flex-shrink-0 min-h-[26px] ${
          PRIORITY_CONFIG[item.priority]?.bar || "bg-muted-foreground/30"
        }`}
      />

      {/* Main Title — Expands across the horizontal space */}
      <div className="flex-1 min-w-0 flex items-center gap-2.5 overflow-hidden" onClick={() => onEdit(item)}>
        {item.pinned && (
          <Star className="h-4 w-4 text-amber-500 fill-amber-500 flex-shrink-0" />
        )}
        
        {/* Title text */}
        <span
          className={`text-base font-semibold tracking-tight text-foreground group-hover:text-violet-600 dark:group-hover:text-violet-400 truncate flex-1 min-w-0 ${
            item.status === "done" ? "line-through text-muted-foreground" : ""
          }`}
          title={item.title}
        >
          {item.title}
        </span>

        {/* Small thumbnail preview */}
        <div className="hidden 2xl:flex items-center flex-shrink-0">
          <SmallThumbnailStrip itemId={item.id} />
        </div>
      </div>

      {/* ── Perfectly Aligned Trailing Columns ── */}

      {/* Category — Centered under Category column */}
      <div className="hidden sm:flex flex-shrink-0 w-28 justify-center items-center">
        <CategoryPill category={item.category} />
      </div>

      {/* Status — Centered under Status column */}
      <div className="flex flex-shrink-0 w-28 justify-center items-center" onClick={(e) => e.stopPropagation()}>
        <Select value={item.status} onValueChange={(v) => onStatusChange(item.id, v as Status)}>
          <SelectTrigger className="h-7 text-xs border-none bg-transparent hover:bg-muted/50 p-1 focus:ring-0 w-auto justify-center gap-1">
            <StatusBadge status={item.status} />
          </SelectTrigger>
          <SelectContent align="center">
            {(["not_started", "in_progress", "done", "archived"] as Status[]).map((s) => (
              <SelectItem key={s} value={s} className="text-xs">
                {STATUS_CONFIG[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Priority — Centered under Priority column */}
      <div className="hidden lg:flex flex-shrink-0 w-20 justify-center items-center">
        <PriorityDot priority={item.priority} />
      </div>

      {/* Date — Centered under Date column */}
      <div className="hidden md:flex flex-shrink-0 w-24 justify-center items-center text-xs text-muted-foreground">
        {new Date(item.createdAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })}
      </div>

      {/* Actions — Right aligned */}
      <div
        className="flex-shrink-0 w-24 flex justify-end items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity pr-1"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => onTogglePin(item)}
          className={`p-1.5 rounded-md hover:bg-muted transition-colors ${
            item.pinned ? "text-amber-500" : "text-muted-foreground hover:text-amber-500"
          }`}
          title={item.pinned ? "Unpin idea" : "Pin idea"}
        >
          {item.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={() => onEdit(item)}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Edit idea"
        >
          <Edit3 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onConvertToTask(item)}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          title="Convert to Task"
        >
          <ConvertIcon className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
          title="Delete idea"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
