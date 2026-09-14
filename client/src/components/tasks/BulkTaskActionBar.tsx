import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListChecks, Trash2, X, CheckSquare } from "lucide-react";

interface BulkTaskActionBarProps {
  totalSelected: number;
  totalVisible: number;
  allSelected: boolean;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onOpenDeleteDialog: () => void;
  onExitSelectMode: () => void;
  isDeleting?: boolean;
}

export function BulkTaskActionBar({
  totalSelected,
  totalVisible,
  allSelected,
  onSelectAll,
  onDeselectAll,
  onOpenDeleteDialog,
  onExitSelectMode,
  isDeleting = false,
}: BulkTaskActionBarProps) {
  return (
    <div className="sticky top-4 z-30 mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-card/95 p-3.5 shadow-xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary shadow-sm">
          <ListChecks className="h-5 w-5" />
        </span>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">
              {totalSelected} task{totalSelected === 1 ? "" : "s"} selected
            </span>
            <Badge variant="outline" className="text-xs bg-muted/60 font-normal">
              {totalVisible} total on page
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Check or uncheck individual items to include in bulk deletion.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={allSelected ? onDeselectAll : onSelectAll}
          className="text-xs h-8 gap-1.5"
        >
          <CheckSquare className="h-3.5 w-3.5" />
          {allSelected ? "Deselect All" : `Select All (${totalVisible})`}
        </Button>

        {totalSelected > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDeselectAll}
            className="text-xs h-8 text-muted-foreground hover:text-foreground"
          >
            Clear Selection
          </Button>
        )}

        <Button
          variant="destructive"
          size="sm"
          disabled={totalSelected === 0 || isDeleting}
          onClick={onOpenDeleteDialog}
          className="text-xs h-8 gap-1.5 shadow-sm font-semibold"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete Selected ({totalSelected})
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onExitSelectMode}
          className="text-xs h-8 gap-1"
        >
          <X className="h-3.5 w-3.5" />
          Done
        </Button>
      </div>
    </div>
  );
}
