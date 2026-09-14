import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";

export interface TaskPreviewItem {
  id: number;
  title: string;
  kind: "general" | "case";
}

interface ConfirmDeleteTasksDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
  totalSelected: number;
  taskPreviews: TaskPreviewItem[];
}

export function ConfirmDeleteTasksDialog({
  open,
  onClose,
  onConfirm,
  isDeleting,
  totalSelected,
  taskPreviews,
}: ConfirmDeleteTasksDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isDeleting && !isOpen && onClose()}>
      <DialogContent className="max-w-md max-h-[82vh] flex flex-col p-0 overflow-hidden rounded-xl border border-border shadow-2xl">
        {/* Pinned Header */}
        <DialogHeader className="shrink-0 px-5 pt-4 pb-3 border-b border-border/50 bg-background">
          <div className="flex items-center gap-2.5 text-destructive">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <DialogTitle className="text-base font-bold text-foreground truncate min-w-0">
              Delete {totalSelected} Selected Task{totalSelected === 1 ? "" : "s"}?
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3 min-h-0 text-xs sm:text-sm">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Permanently delete <span className="font-semibold text-foreground">{totalSelected}</span> selected task{totalSelected === 1 ? "" : "s"}? All related subtasks, checklists, and records will be removed.
          </p>

          <div className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-xs text-destructive font-medium flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>This action is permanent and cannot be undone.</span>
          </div>

          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <span>Selected Tasks ({taskPreviews.length}):</span>
              <span className="text-[11px] font-normal text-muted-foreground/80">Scroll to view</span>
            </div>
            <div className="max-h-36 overflow-y-auto rounded-lg border border-border/60 bg-muted/30 p-1 divide-y divide-border/30">
              {taskPreviews.map((t) => (
                <div
                  key={`${t.kind}-${t.id}`}
                  className="flex items-center justify-between gap-2.5 py-1.5 px-2 rounded hover:bg-muted/60 transition-colors min-w-0"
                >
                  <span
                    className="truncate min-w-0 flex-1 text-xs font-medium text-foreground"
                    title={t.title}
                  >
                    {t.title}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] shrink-0 font-medium px-1.5 py-0 ${
                      t.kind === "case"
                        ? "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300"
                        : "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300"
                    }`}
                  >
                    {t.kind === "case" ? "Case" : "General"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pinned Footer (Guaranteed On-Screen View) */}
        <DialogFooter className="shrink-0 px-5 py-3 border-t border-border/50 bg-muted/25 flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isDeleting}
            className="text-xs h-8"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onConfirm}
            disabled={isDeleting}
            className="gap-1.5 text-xs h-8 font-semibold shadow-xs"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Deleting {totalSelected}...
              </>
            ) : (
              <>
                <Trash2 className="h-3.5 w-3.5" />
                Yes, Delete {totalSelected} Task{totalSelected === 1 ? "" : "s"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
