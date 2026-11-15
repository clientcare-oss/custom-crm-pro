import React, { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { CheckCircle2, ChevronDown, ChevronRight, Loader2, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDoNotServeTimestamp, type DoNotServeScope } from "@shared/doNotServe";
import {
  CONNECTED_CHANNELS_SHORT,
  DNS_THEME,
  formatPhoneDisplay,
} from "./doNotServeStyles";

export interface BlacklistClientTarget {
  contactId: number;
  name: string;
  phone?: string | null;
  email?: string | null;
}

interface BlacklistClientDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: BlacklistClientTarget | null;
  onSaved?: (result: { entryId: number; displayName: string }) => void;
  onOpenExistingEntry?: (entryId: number) => void;
  onOpenOffboarding?: (contactId: number) => void;
}

export function BlacklistClientDrawer({
  open,
  onOpenChange,
  target,
  onSaved,
  onOpenExistingEntry,
  onOpenOffboarding,
}: BlacklistClientDrawerProps) {
  const utils = trpc.useUtils();
  const [reason, setReason] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [appliesTo, setAppliesTo] = useState<DoNotServeScope>("individual");
  const [showSecondary, setShowSecondary] = useState(false);
  const [aliasInput, setAliasInput] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Reset form ONLY when target changes so failed saves never lose entered text
  useEffect(() => {
    if (target?.contactId) {
      setReason("");
      setAdditionalNotes("");
      setAppliesTo("individual");
      setShowSecondary(false);
      setAliasInput("");
      setLinkLabel("");
      setLinkUrl("");
      setFormError(null);
    }
  }, [target?.contactId]);

  const { data: contextInfo } = trpc.doNotServe.getContextInfo.useQuery(undefined, {
    enabled: open,
  });

  const { data: inspection, isLoading: inspecting } =
    trpc.doNotServe.inspectContactBeforeBlacklist.useQuery(
      { contactId: target?.contactId ?? 0, appliesTo },
      { enabled: open && Boolean(target?.contactId) }
    );

  const createMutation = trpc.doNotServe.createFromArchive.useMutation({
    onSuccess: async (res) => {
      setFormError(null);
      await Promise.all([
        utils.doNotServe.list.invalidate(),
        utils.doNotServe.getActiveContactFlags.invalidate(),
        utils.doNotServe.inspectContactBeforeBlacklist.invalidate(),
      ]);
      onOpenChange(false);
      onSaved?.({
        entryId: res.entry?.id ?? res.entryId,
        displayName: res.entry?.displayName ?? (target?.name || "Client"),
      });
    },
    onError: (err) => {
      // Preserve entered text on failure
      setFormError(err.message || "Unable to save restriction. Your text has been preserved.");
    },
  });

  if (!target) return null;

  const resolvedName = inspection?.displayName || target.name || "Client";
  const resolvedPhone = inspection?.primaryPhone || target.phone || null;
  const resolvedEmail = inspection?.primaryEmail || target.email || null;
  const crmTz = contextInfo?.crmTimeZone || "America/New_York";
  const stampName = contextInfo?.employeeStamp?.name || "Authenticated Staff";
  const stampPreviewTime = formatDoNotServeTimestamp(new Date().toISOString(), crmTz);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!reason.trim()) {
      setFormError("Please enter a short reason for this restriction.");
      return;
    }

    const manualAliases = aliasInput
      .split(/\n|,/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((val) => ({
        identifierType: val.includes("@")
          ? ("email" as const)
          : /\d{7,}/.test(val.replace(/\D/g, ""))
          ? ("phone" as const)
          : ("alias_name" as const),
        rawValue: val,
      }));

    const supportingLinks =
      linkLabel.trim() && linkUrl.trim()
        ? [{ label: linkLabel.trim(), url: linkUrl.trim(), addedAt: new Date().toISOString() }]
        : undefined;

    createMutation.mutate({
      contactId: target.contactId,
      appliesTo,
      reasonSummary: reason.trim(),
      additionalNotes: additionalNotes.trim() || undefined,
      manualAliases: manualAliases.length > 0 ? manualAliases : undefined,
      supportingLinks,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          "w-full sm:max-w-[480px] p-0 flex flex-col gap-0 overflow-hidden [&>button]:hidden",
          DNS_THEME.drawerContent
        )}
      >
        <SheetTitle className="sr-only">Blacklist client</SheetTitle>
        <SheetDescription className="sr-only">
          Add {resolvedName} to the internal Do Not Serve register and enable matching alerts.
        </SheetDescription>

        {/* Top Header */}
        <div className="px-6 pt-6 pb-5 border-b border-[#192848] shrink-0">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-[0.16em] text-[#8EA2C8] font-medium">
                FROM ARCHIVE
              </span>
              <span className="text-[10px] font-mono text-[#6E82A6] px-1.5 py-0.5 rounded bg-[#071430] border border-[#1B2D52]">
                PG-048-BLK
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

          <h2 className="font-serif text-[28px] leading-tight font-normal text-[#F5F8FD] tracking-tight">
            Blacklist client
          </h2>

          <div className="mt-4 space-y-0.5 min-w-0">
            <p className="font-serif text-lg text-[#F2F6FC] break-words">{resolvedName}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#9FB0CF]">
              {resolvedPhone && <span>{formatPhoneDisplay(resolvedPhone)}</span>}
              {resolvedEmail && <span className="break-all">{resolvedEmail}</span>}
              {!resolvedPhone && !resolvedEmail && (
                <span className="text-xs text-[#7387AC]">Linked record #{target.contactId}</span>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {inspecting && (
              <div className="flex items-center gap-2 text-xs text-[#8EA2C8]">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#DFC07C]" />
                <span>Checking linked account details…</span>
              </div>
            )}

            {/* Duplicate Active Restriction Guard */}
            {inspection?.existingActiveEntry && (
              <div className="rounded-md bg-[#081634] border border-[#DFC07C]/35 p-3.5 space-y-2">
                <p className="text-sm text-[#EEF3FA] font-medium">
                  An active Do Not Serve restriction already exists for{" "}
                  {inspection.existingActiveEntry.displayName} ({inspection.existingActiveEntry.appliesTo} scope).
                </p>
                {onOpenExistingEntry && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenChange(false);
                      onOpenExistingEntry(inspection.existingActiveEntry!.id);
                    }}
                    className="text-xs font-medium text-[#DFC07C] hover:underline cursor-pointer"
                  >
                    Open existing restriction →
                  </button>
                )}
              </div>
            )}

            {/* Active Services Notice — Offboarding remains separate */}
            {inspection?.activeServices?.hasActiveServices && (
              <div className="rounded-md bg-[#071430] border border-[#243964] p-3.5 space-y-2">
                <p className="text-xs text-[#C7D4EC] leading-relaxed">
                  Active account items remain on file (
                  {[
                    inspection.activeServices.upcomingAppointmentsCount > 0
                      ? `${inspection.activeServices.upcomingAppointmentsCount} upcoming session(s)`
                      : null,
                    inspection.activeServices.activeAgreementsCount > 0
                      ? `${inspection.activeServices.activeAgreementsCount} active agreement(s)`
                      : null,
                    inspection.activeServices.portalAccessEnabled ? "Parent Portal enabled" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  ). Saving a restriction will not silently cancel existing billing, sessions, or portal access.
                </p>
                {onOpenOffboarding && (
                  <button
                    type="button"
                    onClick={() => onOpenOffboarding(target.contactId)}
                    className="text-xs font-medium text-[#DFC07C] hover:underline cursor-pointer"
                  >
                    Review offboarding workflow separately →
                  </button>
                )}
              </div>
            )}

            {/* Required Short Reason */}
            <div className="space-y-2">
              <label
                htmlFor="dns-archive-reason"
                className="block text-sm font-medium text-[#DCE5F5]"
              >
                Reason for restriction <span className="text-[#DFC07C]">*</span>
              </label>
              <textarea
                id="dns-archive-reason"
                rows={3}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Short summary reason for staff review (e.g., Owner decision. Refer future service requests to management for review.)"
                className={cn(DNS_THEME.input, "px-3.5 py-2.5 text-sm leading-relaxed resize-y")}
              />
            </div>

            {/* Optional Additional Notes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="dns-archive-notes"
                  className="block text-sm font-medium text-[#DCE5F5]"
                >
                  Additional notes
                </label>
                <span className="text-xs text-[#788CB0]">Optional</span>
              </div>
              <textarea
                id="dns-archive-notes"
                rows={4}
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Full explanation, context, relevant dates, and additional reasoning…"
                className={cn(DNS_THEME.input, "px-3.5 py-2.5 text-sm leading-relaxed resize-y")}
              />
            </div>

            {/* Scope Selector */}
            <div className="space-y-2">
              <label
                htmlFor="dns-archive-scope"
                className="block text-sm font-medium text-[#DCE5F5]"
              >
                Applies to
              </label>
              <select
                id="dns-archive-scope"
                value={appliesTo}
                onChange={(e) => setAppliesTo(e.target.value as DoNotServeScope)}
                className={cn(DNS_THEME.input, "h-11 px-3.5 text-sm")}
              >
                <option value="individual">Individual</option>
                <option value="household">Household (explicit — includes linked household contacts)</option>
              </select>
              {appliesTo === "household" && (inspection?.householdMemberCount ?? 0) > 0 && (
                <p className="text-xs text-[#9FB0CF] leading-relaxed">
                  Household scope will also match {inspection?.householdMemberCount} linked family record(s) and secondary parent contact details on this account.
                </p>
              )}
            </div>

            {/* Collapsed Secondary Details */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowSecondary((v) => !v)}
                className="inline-flex items-center gap-1.5 text-xs text-[#8EA2C8] hover:text-[#DCE5F5] transition-colors cursor-pointer"
              >
                {showSecondary ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
                <span>Optional aliases or internal reference links</span>
              </button>

              {showSecondary && (
                <div className="mt-3 space-y-3 pl-3 border-l border-[#1C2E54]">
                  <div className="space-y-1.5">
                    <label className="block text-xs text-[#9FB0CF]">
                      Known alternate names, phones, or emails (comma or line separated)
                    </label>
                    <textarea
                      rows={2}
                      value={aliasInput}
                      onChange={(e) => setAliasInput(e.target.value)}
                      placeholder="e.g. (202) 555-0190, alternate@example.com"
                      className={cn(DNS_THEME.input, "px-3 py-2 text-xs")}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={linkLabel}
                      onChange={(e) => setLinkLabel(e.target.value)}
                      placeholder="Internal reference label"
                      className={cn(DNS_THEME.input, "h-9 px-3 text-xs")}
                    />
                    <input
                      type="url"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://… (internal only)"
                      className={cn(DNS_THEME.input, "h-9 px-3 text-xs")}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Automatic Employee Stamp */}
            <div className="pt-3 pb-3 border-t border-b border-[#192848] flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-[#DFC07C] mt-0.5 shrink-0" />
              <div className="min-w-0 space-y-0.5">
                <p className="text-xs text-[#9FB0CF]">Employee stamp · Automatic</p>
                <p className="font-serif text-base text-[#F5F8FD] break-words">{stampName}</p>
                <p className="text-xs text-[#7E92B8]">{stampPreviewTime} (recorded on save)</p>
              </div>
            </div>

            {/* Consequence Statement */}
            <div className="space-y-1">
              <p className="text-sm text-[#DCE5F5]">
                Adds to Do Not Serve and enables matching alerts.
              </p>
              <p className="text-xs text-[#7E92B8] leading-relaxed">{CONNECTED_CHANNELS_SHORT}</p>
            </div>

            {formError && (
              <div
                role="alert"
                className="rounded-md bg-[#131F3E] border border-[#DFC07C]/45 px-3.5 py-2.5 text-xs text-[#F2F6FC] leading-relaxed"
              >
                {formError}
              </div>
            )}
          </div>

          {/* Pinned Footer Actions */}
          <div className="px-6 py-4 border-t border-[#192848] bg-[#030B21] shrink-0 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
              className={cn(DNS_THEME.secondaryBtn, "h-11 px-5 text-sm sm:flex-1")}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                createMutation.isPending || Boolean(inspection?.existingActiveEntry)
              }
              className={cn(
                DNS_THEME.goldPrimaryBtn,
                "h-11 px-5 text-sm sm:flex-1 inline-flex items-center justify-center gap-2"
              )}
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Save restriction</span>
            </button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
