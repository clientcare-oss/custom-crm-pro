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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5 text-destructive">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle className="text-lg">
              Delete {totalSelected} Selected Task{totalSelected === 1 ? "" : "s"}?
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to permanently delete these{" "}
            <span className="font-semibold text-foreground">{totalSelected}</span> task
            {totalSelected === 1 ? "" : "s"}? This will permanently remove all related subtasks, checklists, and file associations.
          </p>

          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive font-medium">
            ⚠️ This action is permanent and cannot be undone.
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Selected Tasks to Delete ({taskPreviews.length}):
            </span>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-muted/40 p-2 divide-y divide-border/40">
              {taskPreviews.map((t) => (
                <div
                  key={`${t.kind}-${t.id}`}
                  className="flex items-center justify-between gap-2 py-1.5 px-1 hover:bg-muted/60 transition-colors"
                >
                  <span className="truncate text-xs font-medium text-foreground">
                    {t.title}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] shrink-0 font-medium ${
                      t.kind === "case"
                        ? "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300"
                        : "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300"
                    }`}
                  >
                    {t.kind === "case" ? "Case Task" : "General"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            className="gap-1.5 shadow-sm font-semibold"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting {totalSelected} Task{totalSelected === 1 ? "" : "s"}...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Yes, Delete {totalSelected} Task{totalSelected === 1 ? "" : "s"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
