import React from "react";
import {
  Star,
  ArrowRight,
  Pin,
  PinOff,
  Trash2,
  Zap as ConvertIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { BrainItem, Status, Priority, PRIORITY_CONFIG } from "./types";
import { StatusBadge, PriorityDot, CategoryPill, SmallThumbnailStrip } from "./BrainDumpBadges";

export default function BrainDumpGridCard({
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
  const priorityBorder: Record<Priority, string> = {
    low: "border-l-muted-foreground/40",
    medium: "border-l-blue-400",
    high: "border-l-amber-500",
    urgent: "border-l-rose-500",
  };

  return (
    <Card
      className={`group p-4 rounded-xl border-l-4 ${
        priorityBorder[item.priority] || "border-l-muted-foreground/30"
      } hover:shadow-md hover:border-border transition-all cursor-pointer bg-card flex flex-col justify-between ${
        item.pinned ? "ring-1 ring-amber-400/50 bg-amber-500/[0.02]" : ""
      }`}
      onClick={() => onEdit(item)}
    >
      <div>
        {/* Header with Title & Action shortcuts */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3
              className={`text-sm sm:text-base font-semibold leading-snug tracking-tight break-words ${
                item.status === "done"
                  ? "line-through text-muted-foreground"
                  : "text-foreground group-hover:text-violet-600 dark:group-hover:text-violet-400"
              }`}
            >
              {item.pinned && (
                <Star className="inline h-4 w-4 text-amber-500 fill-amber-500 mr-1.5 align-text-top" />
              )}
              {item.title}
            </h3>
          </div>

          <div
            className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => onTogglePin(item)}
              className={`p-1 rounded hover:bg-muted transition-colors ${
                item.pinned ? "text-amber-500" : "text-muted-foreground hover:text-amber-500"
              }`}
              title={item.pinned ? "Unpin" : "Pin"}
            >
              {item.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={() => onConvertToTask(item)}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-emerald-500 transition-colors"
              title="Convert to Task"
            >
              <ConvertIcon className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onDelete(item.id)}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-rose-500 transition-colors"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Body context */}
        {item.body && (
          <p className="text-xs text-muted-foreground line-clamp-3 mb-2.5 leading-relaxed">
            {item.body}
          </p>
        )}

        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          <CategoryPill category={item.category} />
          <StatusBadge status={item.status} />
        </div>

        {/* Next step */}
        {item.nextStep && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium bg-muted/40 px-2 py-1 rounded border border-border/40 mb-2">
            <ArrowRight className="h-3 w-3 flex-shrink-0 text-amber-500" />
            <span className="break-words">{item.nextStep}</span>
          </p>
        )}

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex items-center gap-1 mb-2 flex-wrap">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] bg-muted/70 text-muted-foreground px-1.5 py-0.5 rounded border border-border/40"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Thumbnails */}
        <SmallThumbnailStrip itemId={item.id} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/40 text-xs">
        <PriorityDot priority={item.priority} />
        <span className="text-muted-foreground">
          {new Date(item.createdAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>
    </Card>
  );
}
