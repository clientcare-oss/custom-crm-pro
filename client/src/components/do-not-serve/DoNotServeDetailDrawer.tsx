import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  Lock,
  Pencil,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  formatDoNotServeTimestamp,
  type DoNotServeScope,
  type DoNotServeSupportingLink,
} from "@shared/doNotServe";
import { DNS_THEME, formatPhoneDisplay } from "./doNotServeStyles";
import { DoNotServeNotesAndHistorySection } from "./DoNotServeNotesAndHistorySection";

interface DoNotServeDetailDrawerProps {
  entryId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenOffboarding?: (contactId: number) => void;
}

export function DoNotServeDetailDrawer({
  entryId,
  open,
  onOpenChange,
  onOpenOffboarding,
}: DoNotServeDetailDrawerProps) {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const [editingSummary, setEditingSummary] = useState(false);
  const [editReasonText, setEditReasonText] = useState("");
  const [editScope, setEditScope] = useState<DoNotServeScope>("individual");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const [actionMode, setActionMode] = useState<"none" | "lift" | "reactivate">("none");
  const [statusReason, setStatusReason] = useState("");

  useEffect(() => {
    setActionMode("none");
    setStatusReason("");
    setEditingSummary(false);
  }, [entryId]);

  const { data: detail, isLoading, error, refetch } = trpc.doNotServe.getDetail.useQuery(
    { id: entryId ?? 0 },
    { enabled: open && Boolean(entryId && entryId > 0) }
  );

  const invalidateAll = async () => {
    await Promise.all([
      refetch(),
      utils.doNotServe.list.invalidate(),
      utils.doNotServe.getActiveContactFlags.invalidate(),
    ]);
  };

  const updateEntryMutation = trpc.doNotServe.updateEntry.useMutation({
    onSuccess: async () => {
      setEditingSummary(false);
      await invalidateAll();
      toast.success("Restriction details updated.");
    },
    onError: (err) => toast.error(err.message || "Unable to update restriction."),
  });

  const liftMutation = trpc.doNotServe.lift.useMutation({
    onSuccess: async () => {
      setActionMode("none");
      setStatusReason("");
      await invalidateAll();
      toast.success("Restriction lifted. History and notes remain preserved.");
    },
    onError: (err) => toast.error(err.message || "Unable to lift restriction."),
  });

  const reactivateMutation = trpc.doNotServe.reactivate.useMutation({
    onSuccess: async () => {
      setActionMode("none");
      setStatusReason("");
      await invalidateAll();
      toast.success("Restriction reactivated.");
    },
    onError: (err) => toast.error(err.message || "Unable to reactivate restriction."),
  });

  const entry = detail?.entry;
  const perms = detail?.permissions;
  const crmTz = detail?.crmTimeZone || "America/New_York";
  const staffStampName = detail?.employeeStamp?.name || "Authenticated Staff";
  const notes = detail?.notes || [];
  const links: DoNotServeSupportingLink[] = entry?.supportingLinks || [];

  const startEditSummary = () => {
    if (!entry) return;
    setEditReasonText(entry.reasonSummary);
    setEditScope(entry.appliesTo);
    setEditPhone(entry.primaryPhone || "");
    setEditEmail(entry.primaryEmail || "");
    setEditingSummary(true);
  };

  const handleSaveSummaryEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entry || !editReasonText.trim()) return;
    updateEntryMutation.mutate({
      id: entry.id,
      expectedVersion: entry.version,
      reasonSummary: editReasonText.trim(),
      appliesTo: editScope,
      primaryPhone: editPhone.trim() || null,
      primaryEmail: editEmail.trim() || null,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          "w-full sm:max-w-[520px] p-0 flex flex-col gap-0 overflow-hidden [&>button]:hidden",
          DNS_THEME.drawerContent
        )}
      >
        <SheetTitle className="sr-only">
          {entry ? `Do Not Serve · ${entry.displayName}` : "Restriction detail"}
        </SheetTitle>
        <SheetDescription className="sr-only">
          Internal staff restriction record, notes, stamps, and audit history.
        </SheetDescription>

        {/* Top Header */}
        <div className="px-6 pt-6 pb-5 border-b border-[#192848] shrink-0">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-[#8EA2C8] font-medium">
                <Lock className="w-3 h-3 text-[#DFC07C]" />
                {entry?.linkedContactId ? "LINKED CLIENT RECORD" : "NON-CLIENT ENTRY"}
              </span>
              <span className="text-[10px] font-mono text-[#6E82A6] px-1.5 py-0.5 rounded bg-[#071430] border border-[#1B2D52]">
                PG-048-DTL
              </span>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="p-1.5 rounded-md text-[#8EA2C8] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {isLoading ? (
            <div className="py-4 flex items-center gap-2 text-sm text-[#9FB0CF]">
              <Loader2 className="w-4 h-4 animate-spin text-[#DFC07C]" />
              <span>Loading restriction record…</span>
            </div>
          ) : error || !entry ? (
            <p className="text-sm text-[#9FB0CF]">
              {error?.message || "Restriction record could not be loaded."}
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <h2 className="font-serif text-[26px] leading-tight text-[#F5F8FD] break-words">
                  {entry.displayName}
                </h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={
                      entry.status === "active"
                        ? DNS_THEME.quietGoldPill
                        : DNS_THEME.quietNeutralPill
                    }
                  >
                    {entry.status === "active" ? "Active restriction" : "Lifted"}
                  </span>
                  <span className={DNS_THEME.quietNeutralPill}>
                    {entry.appliesTo === "household" ? "Household" : "Individual"}
                  </span>
                  {entry.status === "active" && (
                    <span className={DNS_THEME.quietNeutralPill}>
                      Marketing emails suppressed
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#9FB0CF]">
                <span>{formatPhoneDisplay(entry.primaryPhone)}</span>
                {entry.primaryEmail && <span className="break-all">{entry.primaryEmail}</span>}
                {entry.linkedContactId && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenChange(false);
                      setLocation(`/contacts/${entry.linkedContactId}`);
                    }}
                    className="inline-flex items-center gap-1 text-xs text-[#DFC07C] hover:underline cursor-pointer"
                  >
                    <span>Open client record</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Body */}
        {entry && (
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {detail?.activeServices?.hasActiveServices && (
              <div className="rounded-md bg-[#071430] border border-[#243964] p-3.5 space-y-1.5">
                <p className="text-xs text-[#C7D4EC] leading-relaxed">
                  Active services remain on the linked client profile. Do Not Serve status and client offboarding are separate actions.
                </p>
                {entry.linkedContactId && onOpenOffboarding && (
                  <button
                    type="button"
                    onClick={() => onOpenOffboarding(entry.linkedContactId!)}
                    className="text-xs font-medium text-[#DFC07C] hover:underline cursor-pointer"
                  >
                    Review offboarding workflow →
                  </button>
                )}
              </div>
            )}

            {/* Summary Reason & Scope */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs uppercase tracking-[0.14em] text-[#8EA2C8] font-medium">
                  Reason for restriction
                </h3>
                {perms?.canEdit && perms?.canViewSensitiveDetails && !editingSummary && (
                  <button
                    type="button"
                    onClick={startEditSummary}
                    className="inline-flex items-center gap-1 text-xs text-[#9FB0CF] hover:text-white cursor-pointer"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                )}
              </div>

              {editingSummary ? (
                <form
                  onSubmit={handleSaveSummaryEdit}
                  className="space-y-3 rounded-md bg-[#06122E] border border-[#1E3158] p-3.5"
                >
                  <div className="space-y-1">
                    <label className="block text-xs text-[#9FB0CF]">Summary reason *</label>
                    <textarea
                      rows={3}
                      required
                      value={editReasonText}
                      onChange={(e) => setEditReasonText(e.target.value)}
                      className={cn(DNS_THEME.input, "px-3 py-2 text-sm")}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="block text-xs text-[#9FB0CF]">Applies to</label>
                      <select
                        value={editScope}
                        onChange={(e) => setEditScope(e.target.value as DoNotServeScope)}
                        className={cn(DNS_THEME.input, "h-9 px-2.5 text-xs")}
                      >
                        <option value="individual">Individual</option>
                        <option value="household">Household</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs text-[#9FB0CF]">Primary phone</label>
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className={cn(DNS_THEME.input, "h-9 px-2.5 text-xs")}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs text-[#9FB0CF]">Primary email</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className={cn(DNS_THEME.input, "h-9 px-2.5 text-xs")}
                    />
                  </div>
                  <p className="text-[11px] text-[#7E92B8]">
                    Original reason and employee stamp remain permanently preserved in history.
                  </p>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingSummary(false)}
                      className={cn(DNS_THEME.secondaryBtn, "h-8 px-3 text-xs")}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updateEntryMutation.isPending}
                      className={cn(DNS_THEME.goldPrimaryBtn, "h-8 px-3.5 text-xs")}
                    >
                      Save changes
                    </button>
                  </div>
                </form>
              ) : (
                <div className="rounded-md bg-[#051029] border border-[#192848] p-3.5 space-y-2">
                  <p className="text-sm text-[#EEF3FA] whitespace-pre-wrap leading-relaxed break-words">
                    {entry.reasonSummary}
                  </p>
                  {perms?.canViewSensitiveDetails &&
                    entry.originalReasonSummary &&
                    entry.originalReasonSummary !== entry.reasonSummary && (
                      <p className="text-xs text-[#7E92B8] pt-2 border-t border-[#152340]">
                        Original reason preserved: {entry.originalReasonSummary}
                      </p>
                    )}
                </div>
              )}
            </section>

            {/* Employee Stamp */}
            <section className="pt-1 pb-4 border-b border-[#192848] space-y-2.5">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-[#DFC07C] mt-0.5 shrink-0" />
                <div className="min-w-0 space-y-0.5">
                  <p className="text-xs text-[#8EA2C8]">Created · Automatic employee stamp</p>
                  <p className="font-serif text-sm text-[#F5F8FD]">{entry.createdByName}</p>
                  <p className="text-xs text-[#7E92B8]">
                    {formatDoNotServeTimestamp(entry.createdAt, crmTz)}
                  </p>
                </div>
              </div>

              {entry.status === "lifted" && entry.liftedAt && (
                <div className="pl-7 pt-2 border-t border-[#14223E] space-y-0.5">
                  <p className="text-xs text-[#8EA2C8]">
                    Lifted by {entry.liftedByName || "Authorized Staff"} ·{" "}
                    {formatDoNotServeTimestamp(entry.liftedAt, crmTz)}
                  </p>
                  {entry.liftedReason && (
                    <p className="text-xs text-[#C7D4EC] whitespace-pre-wrap break-words">
                      Reversal reason: {entry.liftedReason}
                    </p>
                  )}
                </div>
              )}

              {entry.status === "active" && entry.reactivatedAt && (
                <div className="pl-7 pt-2 border-t border-[#14223E] space-y-0.5">
                  <p className="text-xs text-[#8EA2C8]">
                    Reactivated by {entry.reactivatedByName || "Authorized Staff"} ·{" "}
                    {formatDoNotServeTimestamp(entry.reactivatedAt, crmTz)}
                  </p>
                  {entry.reactivatedReason && (
                    <p className="text-xs text-[#C7D4EC] whitespace-pre-wrap break-words">
                      Reactivation reason: {entry.reactivatedReason}
                    </p>
                  )}
                </div>
              )}
            </section>

            {perms?.canViewSensitiveDetails && (
              <DoNotServeNotesAndHistorySection
                entryId={entry.id}
                entryVersion={entry.version}
                canEdit={Boolean(perms.canEdit)}
                crmTz={crmTz}
                staffStampName={staffStampName}
                notes={notes}
                links={links}
                auditLog={detail?.auditLog || []}
                onInvalidated={invalidateAll}
              />
            )}

            {/* Lift / Reactivate Confirmation Panel */}
            {perms?.canLiftOrOverride && actionMode !== "none" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!statusReason.trim()) return;
                  if (actionMode === "lift") {
                    liftMutation.mutate({
                      id: entry.id,
                      expectedVersion: entry.version,
                      reason: statusReason.trim(),
                    });
                  } else {
                    reactivateMutation.mutate({
                      id: entry.id,
                      expectedVersion: entry.version,
                      reason: statusReason.trim(),
                    });
                  }
                }}
                className="rounded-md bg-[#071430] border border-[#243964] p-4 space-y-3"
              >
                <p className="text-sm font-medium text-[#F5F8FD]">
                  {actionMode === "lift" ? "Lift restriction" : "Reactivate restriction"}
                </p>
                <p className="text-xs text-[#9FB0CF] leading-relaxed">
                  {actionMode === "lift"
                    ? "Changes status to Lifted and stops future alerts and automated holds from this entry. Original reason, notes, and history are preserved. Does not automatically restart services, billing, or previously held messages."
                    : "Restores Active restriction status and matching alerts with a new employee stamp while retaining full history."}
                </p>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[#DCE5F5]">
                    {actionMode === "lift" ? "Reason for lifting *" : "Reason for reactivation *"}
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    placeholder="Required explanation recorded in audit history…"
                    className={cn(DNS_THEME.input, "px-3 py-2 text-sm")}
                  />
                </div>
                <p className="text-[11px] text-[#7E92B8]">
                  Employee stamp: {staffStampName} · Automatic ({crmTz})
                </p>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActionMode("none");
                      setStatusReason("");
                    }}
                    className={cn(DNS_THEME.secondaryBtn, "h-9 px-3.5 text-xs")}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      !statusReason.trim() ||
                      liftMutation.isPending ||
                      reactivateMutation.isPending
                    }
                    className={cn(DNS_THEME.goldPrimaryBtn, "h-9 px-4 text-xs")}
                  >
                    {actionMode === "lift" ? "Confirm lift" : "Confirm reactivate"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Footer Actions */}
        {entry && (
          <div className="px-6 py-4 border-t border-[#192848] bg-[#030B21] shrink-0 flex flex-wrap items-center justify-between gap-3">
            {perms?.canLiftOrOverride && actionMode === "none" ? (
              entry.status === "active" ? (
                <button
                  type="button"
                  onClick={() => setActionMode("lift")}
                  className={cn(DNS_THEME.secondaryBtn, "h-10 px-4 text-sm")}
                >
                  Lift restriction
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActionMode("reactivate")}
                  className={cn(DNS_THEME.goldPrimaryBtn, "h-10 px-4 text-sm")}
                >
                  Reactivate restriction
                </button>
              )
            ) : (
              <span className="text-xs text-[#6E82A6]">Internal staff record</span>
            )}

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className={cn(DNS_THEME.secondaryBtn, "h-10 px-5 text-sm ml-auto")}
            >
              Close
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
