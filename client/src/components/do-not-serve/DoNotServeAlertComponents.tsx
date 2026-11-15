import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileBox, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { DoNotServeMatchEvaluation } from "@shared/doNotServe";
import { DNS_THEME, hasUnresolvedMatch } from "./doNotServeStyles";

interface DoNotServeMatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evaluation: DoNotServeMatchEvaluation | null | undefined;
  channel: string;
  targetEntityType: string;
  targetEntityId: string;
  onViewRestriction: (entryId: number) => void;
  /** Optional callback when an authorized owner/admin submits an explicit service override reason */
  requireServiceOverride?: boolean;
  canAuthorizeOverride?: boolean;
  onAuthorizedOverride?: (overrideReason: string) => void;
  onResolved?: () => void;
}

/**
 * Calm, compact pop-up alert (PG-048-ALT).
 * Never exposes the full private restriction reason inside the general pop-up.
 */
export function DoNotServeMatchModal({
  open,
  onOpenChange,
  evaluation,
  channel,
  targetEntityType,
  targetEntityId,
  onViewRestriction,
  requireServiceOverride = false,
  canAuthorizeOverride = false,
  onAuthorizedOverride,
  onResolved,
}: DoNotServeMatchModalProps) {
  const utils = trpc.useUtils();
  const [mode, setMode] = useState<"default" | "different_person" | "override">("default");
  const [resolutionReason, setResolutionReason] = useState("");

  const acknowledgeMutation = trpc.doNotServe.acknowledgeAlert.useMutation({
    onSuccess: () => {
      onOpenChange(false);
      onResolved?.();
    },
    onError: () => {
      onOpenChange(false);
    },
  });

  const differentPersonMutation = trpc.doNotServe.resolveDifferentPerson.useMutation({
    onSuccess: async () => {
      setMode("default");
      setResolutionReason("");
      await Promise.all([
        utils.leads.invalidate(),
        utils.callLogs.invalidate(),
        utils.messages.invalidate(),
        utils.contacts.invalidate(),
      ]).catch(() => undefined);
      toast.success("Recorded as different person for this inquiry.");
      onOpenChange(false);
      onResolved?.();
    },
    onError: (err) => toast.error(err.message || "Unable to record resolution."),
  });

  if (!hasUnresolvedMatch(evaluation)) return null;

  const primaryMatch = evaluation.matches[0];
  const isHardMatch = evaluation.highestTier === "hard_match";
  const title = isHardMatch ? "Do Not Serve match" : "Possible restricted match";
  const message = isHardMatch
    ? "This contact information matches a restricted record. Review before proceeding."
    : "This name matches a restricted record. Verify the contact details before proceeding.";

  const handleAcknowledge = () => {
    acknowledgeMutation.mutate({
      eventKey: evaluation.eventKey,
      entryIds: evaluation.matches.map((m) => m.entryId),
      identifierFingerprint: evaluation.identifierFingerprint,
      channel,
      targetEntityType,
      targetEntityId,
    });
  };

  const handleSubmitDifferentPerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionReason.trim()) return;
    differentPersonMutation.mutate({
      entryIds: evaluation.matches.map((m) => m.entryId),
      eventKey: evaluation.eventKey,
      targetEntityType,
      targetEntityId,
      identifierFingerprint: evaluation.identifierFingerprint,
      reason: resolutionReason.trim(),
      channel,
    });
  };

  const handleSubmitOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionReason.trim()) return;
    const cleanReason = resolutionReason.trim();
    setMode("default");
    setResolutionReason("");
    onOpenChange(false);
    onAuthorizedOverride?.(cleanReason);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setMode("default");
        onOpenChange(next);
      }}
    >
      <DialogContent className={cn("sm:max-w-[440px] p-6 gap-4", DNS_THEME.modalContent)}>
        <DialogHeader className="space-y-2 text-left">
          <div className="flex items-center justify-between gap-2">
            <span className={DNS_THEME.quietGoldPill}>
              <FileBox className="w-3.5 h-3.5" />
              <span>{isHardMatch ? "Contact-detail match" : "Name candidate"}</span>
            </span>
            <span className="text-[10px] font-mono text-[#6E82A6]">PG-048-ALT</span>
          </div>
          <DialogTitle className="font-serif text-xl font-normal text-[#F5F8FD]">
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm text-[#C7D4EC] leading-relaxed">
            {message}
          </DialogDescription>
        </DialogHeader>

        {/* Concise Identity & Matched Identifier Summary (No private reason leaked) */}
        <div className="rounded-md bg-[#06122E] border border-[#1B2D52] p-3.5 space-y-1.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-serif text-base text-[#F5F8FD] break-words">
              {primaryMatch.displayName}
            </span>
            <span className="text-xs text-[#8EA2C8]">
              {primaryMatch.appliesTo === "household" ? "Household scope" : "Individual scope"}
            </span>
          </div>
          <p className="text-xs text-[#9FB0CF] break-words">
            Matched on:{" "}
            {primaryMatch.matchedOn
              .map((m) => `${m.label} (${m.matchedValue})`)
              .join(" · ")}
          </p>
          {evaluation.matches.length > 1 && (
            <p className="text-[11px] text-[#7E92B8]">
              +{evaluation.matches.length - 1} additional restricted entry matched
            </p>
          )}
        </div>

        {mode === "different_person" ? (
          <form onSubmit={handleSubmitDifferentPerson} className="space-y-3">
            <p className="text-xs text-[#9FB0CF] leading-relaxed">
              Confirm this inquiry belongs to a different person (for example, a shared or reassigned phone/email or common name). The original restriction remains active.
            </p>
            <textarea
              rows={2}
              required
              value={resolutionReason}
              onChange={(e) => setResolutionReason(e.target.value)}
              placeholder="How did you verify this is a different person? *"
              className={cn(DNS_THEME.input, "px-3 py-2 text-sm")}
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setMode("default")}
                className={cn(DNS_THEME.secondaryBtn, "h-9 px-3.5 text-xs")}
              >
                Back
              </button>
              <button
                type="submit"
                disabled={!resolutionReason.trim() || differentPersonMutation.isPending}
                className={cn(DNS_THEME.goldPrimaryBtn, "h-9 px-4 text-xs inline-flex items-center gap-1.5")}
              >
                {differentPersonMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save verification</span>
              </button>
            </div>
          </form>
        ) : mode === "override" ? (
          <form onSubmit={handleSubmitOverride} className="space-y-3">
            <p className="text-xs text-[#9FB0CF] leading-relaxed">
              Enter an explicit authorization reason to proceed with this service workflow. Your employee stamp and reason will be recorded in the audit log.
            </p>
            <textarea
              rows={2}
              required
              value={resolutionReason}
              onChange={(e) => setResolutionReason(e.target.value)}
              placeholder="Authorized override reason *"
              className={cn(DNS_THEME.input, "px-3 py-2 text-sm")}
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setMode("default")}
                className={cn(DNS_THEME.secondaryBtn, "h-9 px-3.5 text-xs")}
              >
                Back
              </button>
              <button
                type="submit"
                disabled={!resolutionReason.trim()}
                className={cn(DNS_THEME.goldPrimaryBtn, "h-9 px-4 text-xs")}
              >
                Authorize &amp; proceed
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3 pt-1">
            {isHardMatch ? (
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleAcknowledge}
                  disabled={acknowledgeMutation.isPending}
                  className={cn(DNS_THEME.secondaryBtn, "h-10 px-4 text-sm sm:flex-1")}
                >
                  Acknowledge
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    onViewRestriction(primaryMatch.entryId);
                  }}
                  className={cn(DNS_THEME.goldPrimaryBtn, "h-10 px-4 text-sm sm:flex-1")}
                >
                  View restriction
                </button>
              </div>
            ) : (
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setMode("different_person")}
                  className={cn(DNS_THEME.secondaryBtn, "h-10 px-4 text-sm sm:flex-1")}
                >
                  Different person
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    onViewRestriction(primaryMatch.entryId);
                  }}
                  className={cn(DNS_THEME.goldPrimaryBtn, "h-10 px-4 text-sm sm:flex-1")}
                >
                  Review match
                </button>
              </div>
            )}

            {/* Quiet secondary links for shared/reused phone resolution or authorized service override */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-[#8EA2C8]">
              {isHardMatch && (
                <button
                  type="button"
                  onClick={() => setMode("different_person")}
                  className="hover:text-white underline-offset-2 hover:underline cursor-pointer"
                >
                  Shared/reused contact? Mark different person
                </button>
              )}
              {requireServiceOverride && canAuthorizeOverride && onAuthorizedOverride && (
                <button
                  type="button"
                  onClick={() => setMode("override")}
                  className="text-[#DFC07C] hover:underline cursor-pointer ml-auto"
                >
                  Authorized override →
                </button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Small, calm persistent warning pill retained in record/conversation headers
 * after dismissal so staff can reopen the restriction alert at any time.
 */
export function DoNotServeHeaderBadge({
  evaluation,
  onClick,
  className,
}: {
  evaluation?: DoNotServeMatchEvaluation | null;
  onClick: () => void;
  className?: string;
}) {
  if (!hasUnresolvedMatch(evaluation)) return null;
  const isHard = evaluation.highestTier === "hard_match";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer shrink-0",
        "bg-[#0B1938] hover:bg-[#10234D] text-[#DFC07C] border border-[#DFC07C]/45",
        className
      )}
      title="Click to review Do Not Serve match"
    >
      <FileBox className="w-3.5 h-3.5 text-[#DFC07C] shrink-0" />
      <span>{isHard ? "Do Not Serve match" : "Possible restricted match"}</span>
    </button>
  );
}

export interface BulkFlaggedRowItem {
  rowIndex?: number;
  contactId?: number | null;
  name: string;
  highestTier: "hard_match" | "possible_name_match";
  matches: Array<{ entryId: number; displayName: string }>;
}

/**
 * Single concise review summary dialog for bulk imports (replaces stacked per-row pop-ups).
 */
export function DoNotServeImportSummaryDialog({
  open,
  onOpenChange,
  flaggedRows,
  onViewRestriction,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flaggedRows: BulkFlaggedRowItem[];
  onViewRestriction?: (entryId: number) => void;
}) {
  if (!flaggedRows.length) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("sm:max-w-[500px] p-6 gap-4", DNS_THEME.modalContent)}>
        <DialogHeader className="space-y-1.5 text-left">
          <DialogTitle className="font-serif text-xl font-normal text-[#F5F8FD]">
            Import review · Do Not Serve matches ({flaggedRows.length})
          </DialogTitle>
          <DialogDescription className="text-sm text-[#9FB0CF] leading-relaxed">
            The following imported rows matched records in Do Not Serve. Automated welcome and marketing sends are held for contact-detail matches pending review.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[260px] overflow-y-auto divide-y divide-[#192848] rounded-md border border-[#1B2D52] bg-[#051029]">
          {flaggedRows.map((row, idx) => {
            const firstEntry = row.matches[0];
            return (
              <div
                key={`${row.contactId || idx}-${row.name}`}
                className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="text-[#EEF3FA] font-medium truncate">{row.name}</p>
                  <p className="text-xs text-[#8EA2C8]">
                    {row.highestTier === "hard_match"
                      ? "Do Not Serve match (contact details)"
                      : "Possible restricted match (name candidate)"}
                  </p>
                </div>
                {firstEntry && onViewRestriction && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenChange(false);
                      onViewRestriction(firstEntry.entryId);
                    }}
                    className="text-xs text-[#DFC07C] hover:underline shrink-0 cursor-pointer"
                  >
                    Review
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className={cn(DNS_THEME.goldPrimaryBtn, "h-10 px-5 text-sm")}
          >
            Done
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
