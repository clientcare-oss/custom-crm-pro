import React, { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { DoNotServeMatchEvaluation } from "@shared/doNotServe";
import { DNS_THEME, hasUnresolvedMatch } from "./doNotServeStyles";
import { DoNotServeHeaderBadge, DoNotServeMatchModal } from "./DoNotServeAlertComponents";
import { DoNotServeDetailDrawer } from "./DoNotServeDetailDrawer";

/**
 * Reusable connected-channel guard that:
 * 1. Renders the calm persistent warning badge in record/conversation headers.
 * 2. Auto-opens the calm pop-up modal once per new eventKey when `shouldShowPopup` is true,
 *    preventing repetitive alert fatigue on re-renders.
 * 3. Supports explicit service override prompts when a staff action hits `DO_NOT_SERVE_REVIEW_REQUIRED`.
 */
export function DoNotServeChannelGuard({
  evaluation,
  channel,
  targetEntityType,
  targetEntityId,
  requireServiceOverride = false,
  forceOpenKey = 0,
  onAuthorizedOverride,
  onResolved,
  className,
}: {
  evaluation?: DoNotServeMatchEvaluation | null;
  channel: string;
  targetEntityType: string;
  targetEntityId: string;
  requireServiceOverride?: boolean;
  forceOpenKey?: number;
  onAuthorizedOverride?: (overrideReason: string) => void;
  onResolved?: () => void;
  className?: string;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [detailEntryId, setDetailEntryId] = useState<number | null>(null);
  const shownKeysRef = useRef<Set<string>>(new Set());

  const { data: ctxInfo } = trpc.doNotServe.getContextInfo.useQuery(undefined, {
    enabled: hasUnresolvedMatch(evaluation) || forceOpenKey > 0,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!hasUnresolvedMatch(evaluation)) return;
    if (evaluation.shouldShowPopup && !shownKeysRef.current.has(evaluation.eventKey)) {
      shownKeysRef.current.add(evaluation.eventKey);
      setModalOpen(true);
    }
  }, [evaluation]);

  useEffect(() => {
    if (forceOpenKey > 0 && hasUnresolvedMatch(evaluation)) {
      setModalOpen(true);
    }
  }, [forceOpenKey, evaluation]);

  if (!hasUnresolvedMatch(evaluation)) return null;

  return (
    <>
      <DoNotServeHeaderBadge
        evaluation={evaluation}
        onClick={() => setModalOpen(true)}
        className={className}
      />

      <DoNotServeMatchModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        evaluation={evaluation}
        channel={channel}
        targetEntityType={targetEntityType}
        targetEntityId={targetEntityId}
        onViewRestriction={(entryId) => setDetailEntryId(entryId)}
        requireServiceOverride={requireServiceOverride}
        canAuthorizeOverride={Boolean(ctxInfo?.permissions?.canLiftOrOverride)}
        onAuthorizedOverride={onAuthorizedOverride}
        onResolved={onResolved}
      />

      <DoNotServeDetailDrawer
        entryId={detailEntryId}
        open={Boolean(detailEntryId)}
        onOpenChange={(open) => {
          if (!open) setDetailEntryId(null);
        }}
      />
    </>
  );
}

/**
 * Calm post-save Undo banner for Archive blacklisting or manual additions.
 * Reverses an accidental save with actor/timestamp and "Added in error" while preserving audit history.
 */
export function DoNotServePostSaveUndoBanner({
  savedEntry,
  onDismiss,
  onOpenEntry,
  className,
}: {
  savedEntry: { entryId: number; displayName: string } | null;
  onDismiss: () => void;
  onOpenEntry?: (entryId: number) => void;
  className?: string;
}) {
  const utils = trpc.useUtils();
  const undoMutation = trpc.doNotServe.undoCreate.useMutation({
    onSuccess: async () => {
      onDismiss();
      await Promise.all([
        utils.doNotServe.list.invalidate(),
        utils.doNotServe.getActiveContactFlags.invalidate(),
        utils.doNotServe.inspectContactBeforeBlacklist.invalidate(),
      ]);
      toast.success("Restriction reversed (recorded as Added in error).");
    },
    onError: (err) => toast.error(err.message || "Unable to undo restriction."),
  });

  if (!savedEntry) return null;

  return (
    <div
      className={cn(
        "rounded-md bg-[#06122E] border border-[#243964] px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-sm",
        className
      )}
    >
      <span className="text-[#E9EFFA]">
        Added <strong className="font-medium text-white">{savedEntry.displayName}</strong> to Do Not Serve.
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => undoMutation.mutate({ id: savedEntry.entryId })}
          disabled={undoMutation.isPending}
          className={cn(
            DNS_THEME.secondaryBtn,
            "h-8 px-3 text-xs inline-flex items-center gap-1.5"
          )}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Undo</span>
        </button>
        {onOpenEntry && (
          <button
            type="button"
            onClick={() => onOpenEntry(savedEntry.entryId)}
            className="text-xs text-[#DFC07C] hover:underline px-2 py-1 cursor-pointer"
          >
            View
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs text-[#8EA2C8] hover:text-white px-1.5 py-1 cursor-pointer"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

