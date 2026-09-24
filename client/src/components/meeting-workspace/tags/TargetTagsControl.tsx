import React, { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Plus, Tag, Check, X, Wrench, Star, Ban, FastForward, Edit2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { MeetingTarget, TargetTagType, TargetRepairDetails } from "../types";
import { TargetRepairModal } from "./TargetRepairModal";
import { cn } from "@/lib/utils";

interface TargetTagsControlProps {
  target: MeetingTarget;
  onUpdateTarget: (targetId: string, updates: Partial<MeetingTarget>) => void;
  className?: string;
}

export const TARGET_TAG_DEFINITIONS: {
  type: TargetTagType;
  label: string;
  shortLabel: string;
  pillStyle: string;
  icon: string;
}[] = [
  {
    type: "ADVOCATE_REPAIR",
    label: "🚩 Advocate Repair 🛠️",
    shortLabel: "🚩 Advocate Repair 🛠️",
    pillStyle: "bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30",
    icon: "🚩",
  },
  {
    type: "IMPORTANT",
    label: "⭐ Important",
    shortLabel: "⭐ Important",
    pillStyle: "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30",
    icon: "⭐",
  },
  {
    type: "PARENT_DOESNT_WANT",
    label: "🚫 Parent Doesn't Want",
    shortLabel: "🚫 Parent Doesn't Want",
    pillStyle: "bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30",
    icon: "🚫",
  },
  {
    type: "SKIP",
    label: "⏭️ Skip",
    shortLabel: "⏭️ Skip",
    pillStyle: "bg-slate-500/25 text-slate-300 border-slate-500/40 hover:bg-slate-500/35",
    icon: "⏭️",
  },
];

export function isTargetStruckThrough(target: MeetingTarget): boolean {
  if (!target.tags || target.tags.length === 0) return false;
  return target.tags.includes("PARENT_DOESNT_WANT") || target.tags.includes("SKIP");
}

export function TargetTagsControl({
  target,
  onUpdateTarget,
  className,
}: TargetTagsControlProps) {
  const [isRepairModalOpen, setIsRepairModalOpen] = useState(false);
  const activeTags = target.tags || [];

  const handleToggleTag = (tagType: TargetTagType) => {
    const isCurrentlyActive = activeTags.includes(tagType);
    let nextTags: TargetTagType[];

    if (isCurrentlyActive) {
      nextTags = activeTags.filter((t) => t !== tagType);
    } else {
      nextTags = [...activeTags, tagType];
    }

    onUpdateTarget(target.id, { tags: nextTags });

    // If activating ADVOCATE_REPAIR, open the feedback dialog
    if (!isCurrentlyActive && tagType === "ADVOCATE_REPAIR") {
      setIsRepairModalOpen(true);
    }
  };

  const handleRemoveTag = (e: React.MouseEvent, tagType: TargetTagType) => {
    e.stopPropagation();
    const nextTags = activeTags.filter((t) => t !== tagType);
    onUpdateTarget(target.id, { tags: nextTags });
  };

  const handleSaveRepair = (
    targetId: string,
    repairDetails: TargetRepairDetails | undefined,
    removeTag?: boolean
  ) => {
    if (removeTag) {
      const nextTags = activeTags.filter((t) => t !== "ADVOCATE_REPAIR");
      onUpdateTarget(targetId, { tags: nextTags, repairDetails: undefined });
    } else {
      onUpdateTarget(targetId, { repairDetails });
    }
  };

  return (
    <div className={cn("inline-flex items-center gap-1.5 flex-wrap", className)}>
      {/* ── Tag Icon Trigger (Placed directly next to Title edit pencil) ─── */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "text-blue-400/70 hover:text-[#F5B544] p-1 rounded hover:bg-[#0E3560] transition-colors cursor-pointer inline-flex items-center gap-0.5",
              activeTags.length > 0 && "text-[#F5B544]"
            )}
            title="Add or toggle Target tags (Advocate Repair, Important, Parent Doesn't Want, Skip)"
          >
            <Tag className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-60 bg-[#07182E] border border-[#184576] text-slate-100 shadow-2xl p-1.5 z-50">
          <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
            🏷️ Target Tags
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-[#143960]" />

          {TARGET_TAG_DEFINITIONS.map((def) => {
            const isChecked = activeTags.includes(def.type);
            return (
              <DropdownMenuItem
                key={def.type}
                onClick={() => handleToggleTag(def.type)}
                className={cn(
                  "flex items-center justify-between text-xs px-2.5 py-2 rounded-lg cursor-pointer transition-colors",
                  isChecked
                    ? "bg-[#0E3560] text-white font-semibold"
                    : "text-slate-200 hover:bg-[#0B2544] hover:text-[#F5B544]"
                )}
              >
                <span className="font-medium">{def.label}</span>
                {isChecked && <Check className="w-3.5 h-3.5 text-[#F5B544]" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* ── Active Tag Colored Pill Boxes (Directly after title) ─────────── */}
      {activeTags.map((tagType) => {
        const def = TARGET_TAG_DEFINITIONS.find((d) => d.type === tagType);
        if (!def) return null;

        const isRepair = tagType === "ADVOCATE_REPAIR";
        const repairCount = target.repairDetails?.reasons?.length || 0;

        return (
          <span
            key={tagType}
            onClick={() => {
              if (isRepair) setIsRepairModalOpen(true);
            }}
            className={cn(
              "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-all shadow-sm shrink-0",
              def.pillStyle,
              isRepair && "cursor-pointer hover:ring-1 hover:ring-rose-400"
            )}
            title={
              isRepair
                ? target.repairDetails?.note ||
                  (repairCount > 0
                    ? `${repairCount} repair items flagged. Click to edit.`
                    : "Click to add repair details")
                : `Tag: ${def.label}`
            }
          >
            <span>{def.label}</span>
            {isRepair && repairCount > 0 && (
              <span className="bg-rose-950/90 px-1.5 py-0.2 rounded text-[9.5px] text-rose-200 border border-rose-500/50 font-bold">
                {repairCount}
              </span>
            )}
            <button
              type="button"
              onClick={(e) => handleRemoveTag(e, tagType)}
              className="p-0.5 hover:bg-black/30 rounded-full transition-colors cursor-pointer ml-0.5 text-current opacity-70 hover:opacity-100"
              title="Remove tag"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        );
      })}

      {/* ── Advocate Repair Feedback Modal ─────────────────────────────────── */}
      <TargetRepairModal
        isOpen={isRepairModalOpen}
        onClose={() => setIsRepairModalOpen(false)}
        target={target}
        onSaveRepair={handleSaveRepair}
      />
    </div>
  );
}
