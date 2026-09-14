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
import { Trash2, ShieldCheck, AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface PurgeTestTasksDialogProps {
  open: boolean;
  onClose: () => void;
  testTasksCount: number;
  realTasksCount: number;
  sampleTitles: string[];
  onPurged?: () => void;
}

export function PurgeTestTasksDialog({
  open,
  onClose,
  testTasksCount,
  realTasksCount,
  sampleTitles,
  onPurged,
}: PurgeTestTasksDialogProps) {
  const utils = trpc.useUtils();

  const purgeMutation = trpc.internalTasks.purgeTestTasks.useMutation({
    onSuccess: (data) => {
      toast.success(
        `Successfully deleted ${data.count} test task${data.count === 1 ? "" : "s"}! ${realTasksCount} real tasks preserved.`
      );
      utils.internalTasks.list.invalidate();
      utils.internalTasks.getTestTasksCount.invalidate();
      onPurged?.();
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to purge test tasks");
    },
  });

  const isPurging = purgeMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isPurging && !isOpen && onClose()}>
      <DialogContent className="max-w-md max-h-[82vh] flex flex-col p-0 overflow-hidden rounded-xl border border-border shadow-2xl">
        <DialogHeader className="shrink-0 px-5 pt-4 pb-3 border-b border-border/50 bg-background">
          <div className="flex items-center gap-2.5 text-rose-500">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Delete System Test Tasks
              </DialogTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Automated one-click cleanup routine for test general tasks
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-3.5 space-y-3 min-h-0 text-xs sm:text-sm">
          {/* Status summary pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="destructive" className="gap-1.5 px-2.5 py-1 text-xs font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
              <Trash2 className="h-3.5 w-3.5" />
              {testTasksCount} System Test Tasks to Delete
            </Badge>
            <Badge variant="outline" className="gap-1.5 px-2.5 py-1 text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
              <ShieldCheck className="h-3.5 w-3.5" />
              {realTasksCount} Real Tasks Untouched
            </Badge>
          </div>

          {/* Safety Guarantee Banner */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-emerald-900 dark:text-emerald-200">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <span className="font-semibold text-emerald-700 dark:text-emerald-300 block mb-0.5">
                  Human Operational Tasks 100% Protected
                </span>
                This cleanup routine targets only automated test task records created by background system tests (e.g. &ldquo;Test General Task&rdquo;). All client records, case tasks, student links, and tasks created by Byron and the team will remain completely in place.
              </div>
            </div>
          </div>

          {testTasksCount === 0 ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-900 dark:text-emerald-200 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-sm text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="h-4 w-4" />
                No System Test Tasks Found
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                All tasks currently in your database are active human operational or client case tasks ({realTasksCount} tasks). There are no automated test tasks requiring deletion.
              </p>
            </div>
          ) : (
            <>
              {/* Sample preview */}
              {sampleTitles.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    Matching test titles detected:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {sampleTitles.map((title, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-muted text-muted-foreground border border-border"
                      >
                        &ldquo;{title}&rdquo;
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Destructive Warning */}
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  This will permanently delete all {testTasksCount} test general tasks and their child steps.
                </span>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="shrink-0 px-5 py-3 border-t border-border/50 bg-muted/25 flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isPurging}
            className="text-xs h-8"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => purgeMutation.mutate()}
            disabled={isPurging || testTasksCount === 0}
            className="gap-2 text-xs h-8 font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
          >
            {isPurging ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Deleting {testTasksCount} Test Tasks...
              </>
            ) : testTasksCount === 0 ? (
              <>
                <ShieldCheck className="h-3.5 w-3.5" />
                No Test Tasks to Delete
              </>
            ) : (
              <>
                <Trash2 className="h-3.5 w-3.5" />
                Delete All {testTasksCount} at Once
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
