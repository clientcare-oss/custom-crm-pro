import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { CheckCircle2, ChevronDown, ChevronRight, Loader2, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  formatDoNotServeTimestamp,
  normalizeEmailForMatch,
  normalizeFullNameForMatch,
  normalizePhoneForMatch,
  type DoNotServeScope,
} from "@shared/doNotServe";
import { CONNECTED_CHANNELS_SHORT, DNS_THEME } from "./doNotServeStyles";

interface AddRestrictedPersonDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (result: { entryId: number; displayName: string }) => void;
}

export function AddRestrictedPersonDrawer({
  open,
  onOpenChange,
  onSaved,
}: AddRestrictedPersonDrawerProps) {
  const utils = trpc.useUtils();
  const [displayName, setDisplayName] = useState("");
  const [primaryPhone, setPrimaryPhone] = useState("");
  const [primaryEmail, setPrimaryEmail] = useState("");
  const [reason, setReason] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [appliesTo, setAppliesTo] = useState<DoNotServeScope>("individual");
  const [showSecondary, setShowSecondary] = useState(false);
  const [aliasInput, setAliasInput] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const { data: contextInfo } = trpc.doNotServe.getContextInfo.useQuery(undefined, {
    enabled: open,
  });

  const createManualMutation = trpc.doNotServe.createManual.useMutation({
    onSuccess: async (res) => {
      setFormError(null);
      setDisplayName("");
      setPrimaryPhone("");
      setPrimaryEmail("");
      setReason("");
      setAdditionalNotes("");
      setAppliesTo("individual");
      setShowSecondary(false);
      setAliasInput("");
      setLinkLabel("");
      setLinkUrl("");
      await Promise.all([
        utils.doNotServe.list.invalidate(),
        utils.doNotServe.getActiveContactFlags.invalidate(),
      ]);
      onOpenChange(false);
      onSaved?.({
        entryId: res.entry?.id ?? res.entryId,
        displayName: res.entry?.displayName ?? displayName.trim(),
      });
    },
    onError: (err) => {
      // Preserve entered text on failure
      setFormError(err.message || "Unable to save restriction. Your entered text is preserved.");
    },
  });

  const crmTz = contextInfo?.crmTimeZone || "America/New_York";
  const stampName = contextInfo?.employeeStamp?.name || "Authenticated Staff";
  const stampPreviewTime = formatDoNotServeTimestamp(new Date().toISOString(), crmTz);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = displayName.trim();
    if (cleanName.length < 2) {
      setFormError("Please enter the person's name.");
      return;
    }

    const hasUsefulIdentifier = Boolean(
      normalizePhoneForMatch(primaryPhone) ||
        normalizeEmailForMatch(primaryEmail) ||
        normalizeFullNameForMatch(cleanName)
    );
    if (!hasUsefulIdentifier) {
      setFormError(
        "Provide at least one matching identifier: full first and last name, valid phone number, or email address."
      );
      return;
    }

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

    createManualMutation.mutate({
      displayName: cleanName,
      appliesTo,
      primaryPhone: primaryPhone.trim() || null,
      primaryEmail: primaryEmail.trim() || null,
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
        <SheetTitle className="sr-only">Add person to Do Not Serve</SheetTitle>
        <SheetDescription className="sr-only">
          Record a non-client person or household in the internal Do Not Serve register.
        </SheetDescription>

        {/* Header */}
        <div className="px-6 pt-6 pb-5 border-b border-[#192848] shrink-0">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] uppercase tracking-[0.16em] text-[#8EA2C8] font-medium">
                NON-CLIENT ENTRY
              </span>
              <span className="text-[10px] font-mono text-[#6E82A6] px-1.5 py-0.5 rounded bg-[#071430] border border-[#1B2D52]">
                PG-048-ADD
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
            Add person
          </h2>
          <p className="text-xs text-[#9FB0CF] mt-1.5 leading-relaxed">
            Records an unlinked entry for someone who has never been a client, without creating a CRM client profile.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="dns-add-name" className="block text-sm font-medium text-[#DCE5F5]">
                Full name <span className="text-[#DFC07C]">*</span>
              </label>
              <input
                id="dns-add-name"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Jordan Ellis"
                className={cn(DNS_THEME.input, "h-11 px-3.5 text-sm")}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="dns-add-phone" className="block text-sm font-medium text-[#DCE5F5]">
                  Phone number
                </label>
                <input
                  id="dns-add-phone"
                  type="tel"
                  value={primaryPhone}
                  onChange={(e) => setPrimaryPhone(e.target.value)}
                  placeholder="(202) 555-0142"
                  className={cn(DNS_THEME.input, "h-11 px-3.5 text-sm")}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="dns-add-email" className="block text-sm font-medium text-[#DCE5F5]">
                  Email address
                </label>
                <input
                  id="dns-add-email"
                  type="email"
                  value={primaryEmail}
                  onChange={(e) => setPrimaryEmail(e.target.value)}
                  placeholder="name@example.com"
                  className={cn(DNS_THEME.input, "h-11 px-3.5 text-sm")}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="dns-add-reason" className="block text-sm font-medium text-[#DCE5F5]">
                Reason for restriction <span className="text-[#DFC07C]">*</span>
              </label>
              <textarea
                id="dns-add-reason"
                rows={3}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Short summary reason for staff review…"
                className={cn(DNS_THEME.input, "px-3.5 py-2.5 text-sm leading-relaxed resize-y")}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="dns-add-notes" className="block text-sm font-medium text-[#DCE5F5]">
                  Additional notes
                </label>
                <span className="text-xs text-[#788CB0]">Optional</span>
              </div>
              <textarea
                id="dns-add-notes"
                rows={4}
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Full explanation, context, relevant dates, and additional reasoning…"
                className={cn(DNS_THEME.input, "px-3.5 py-2.5 text-sm leading-relaxed resize-y")}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="dns-add-scope" className="block text-sm font-medium text-[#DCE5F5]">
                Applies to
              </label>
              <select
                id="dns-add-scope"
                value={appliesTo}
                onChange={(e) => setAppliesTo(e.target.value as DoNotServeScope)}
                className={cn(DNS_THEME.input, "h-11 px-3.5 text-sm")}
              >
                <option value="individual">Individual</option>
                <option value="household">Household</option>
              </select>
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

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#192848] bg-[#030B21] shrink-0 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={createManualMutation.isPending}
              className={cn(DNS_THEME.secondaryBtn, "h-11 px-5 text-sm sm:flex-1")}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createManualMutation.isPending}
              className={cn(
                DNS_THEME.goldPrimaryBtn,
                "h-11 px-5 text-sm sm:flex-1 inline-flex items-center justify-center gap-2"
              )}
            >
              {createManualMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Save restriction</span>
            </button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
