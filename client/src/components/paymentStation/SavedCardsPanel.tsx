import React from "react";
import {
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
} from "@stripe/react-stripe-js";
import type { StripeElementStyle } from "@stripe/stripe-js";
import {
  CreditCard,
  RefreshCw,
  ArrowLeft,
  Plus,
  Lock,
  AlertCircle,
  Check,
} from "lucide-react";
import type { RegisterSavedMethod } from "./PaymentRegister";

export interface PreviewReplacementCardOption {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  label: string;
}

export const PREVIEW_REPLACEMENT_CARDS: PreviewReplacementCardOption[] = [
  {
    id: "pm_preview_visa_9910",
    brand: "visa",
    last4: "9910",
    expMonth: 12,
    expYear: 2030,
    label: "Visa •••• 9910 (12/30)",
  },
  {
    id: "pm_preview_mc_5521",
    brand: "mastercard",
    last4: "5521",
    expMonth: 9,
    expYear: 2029,
    label: "Mastercard •••• 5521 (09/29)",
  },
];

export interface SavedCardsPanelProps {
  savedMethods: RegisterSavedMethod[];
  selectedSavedMethodId: string | null;
  onSelectSavedMethod: (pmId: string) => void;
  savedCardAction: "list" | "update";
  updatingSavedMethodId: string | null;
  onStartUpdateSavedCard: (pmId: string | null) => void;
  onCancelUpdateSavedCard: () => void;
  setAsDefaultCard: boolean;
  onSetAsDefaultCardChange: (val: boolean) => void;
  cardholderName: string;
  onCardholderNameChange: (val: string) => void;
  postalCode: string;
  onPostalCodeChange: (val: string) => void;
  stripeElementsMounted: boolean;
  cardByPhoneReady: boolean;
  savedCardReady: boolean;
  stripeElementStyle: StripeElementStyle;
  onStripeFieldChange: (
    field: "number" | "expiry" | "cvc",
    complete: boolean,
    errorMessage?: string
  ) => void;
  cardElementError: string | null;
  onOpenSetupInfo: () => void;
  isPreviewMode: boolean;
  previewReplacementCardId: string;
  onSelectPreviewReplacementCard: (id: string) => void;
  compact?: boolean;
}

function isCardExpiringSoon(expMonth: number | null, expYear: number | null): boolean {
  if (!expMonth || !expYear) return false;
  const now = new Date();
  const currentYm = now.getFullYear() * 12 + (now.getMonth() + 1);
  const cardYm = expYear * 12 + expMonth;
  return cardYm <= currentYm + 2;
}

export function SavedCardsPanel({
  savedMethods,
  selectedSavedMethodId,
  onSelectSavedMethod,
  savedCardAction,
  updatingSavedMethodId,
  onStartUpdateSavedCard,
  onCancelUpdateSavedCard,
  setAsDefaultCard,
  onSetAsDefaultCardChange,
  cardholderName,
  onCardholderNameChange,
  postalCode,
  onPostalCodeChange,
  stripeElementsMounted,
  cardByPhoneReady,
  savedCardReady,
  stripeElementStyle,
  onStripeFieldChange,
  cardElementError,
  onOpenSetupInfo,
  isPreviewMode,
  previewReplacementCardId,
  onSelectPreviewReplacementCard,
  compact = false,
}: SavedCardsPanelProps) {
  const updatingCard =
    savedMethods.find((m) => m.stripePaymentMethodId === updatingSavedMethodId) || null;
  const inputH = compact ? "h-[27px]" : "h-[29px]";

  if (savedCardAction === "update") {
    return (
      <div
        role="tabpanel"
        aria-label="Update saved card"
        data-testid="pos-update-saved-card-panel"
        className="space-y-1.5"
      >
        {/* Top strip: Updating Visa •••• 4242 + Back to cards */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <RefreshCw className="h-3 w-3 text-[#DFBE77] shrink-0" />
            <span className="text-[11.5px] font-semibold text-[#FFF0C2] truncate capitalize">
              {updatingCard
                ? `Update ${updatingCard.brand} •••• ${updatingCard.last4}`
                : "Add new saved card"}
            </span>
            {isPreviewMode && (
              <span className="px-1.5 py-[1px] rounded bg-amber-400/15 border border-amber-300/35 text-[8.5px] font-semibold uppercase tracking-wider text-amber-200 shrink-0">
                MGR Preview
              </span>
            )}
          </div>
          <button
            type="button"
            data-testid="pos-cancel-update-card-btn"
            onClick={onCancelUpdateSavedCard}
            className="inline-flex items-center gap-1 text-[10.5px] text-[#9FB4DB] hover:text-white cursor-pointer shrink-0"
          >
            <ArrowLeft className="h-3 w-3" />
            <span>Saved cards</span>
          </button>
        </div>

        {/* Cardholder Name */}
        <div className={`pos-field-well rounded-[7px] ${inputH} px-2.5 flex items-center`}>
          <input
            type="text"
            aria-label="Cardholder name for updated card"
            value={cardholderName}
            onChange={(e) => onCardholderNameChange(e.target.value)}
            placeholder="Cardholder full name"
            className="w-full bg-transparent text-[12px] text-[#F4F7FF] placeholder-[#6C7FA6] focus:outline-none"
          />
        </div>

        {isPreviewMode && !(stripeElementsMounted && cardByPhoneReady) ? (
          /* PCI-Safe Manager Preview Replacement Picker (no raw PANs stored; lets user test Update & Charge live!) */
          <div
            data-testid="pos-preview-replacement-picker"
            className="rounded-[8px] border border-[#CFA657]/45 bg-[#061229]/90 p-2 space-y-1.5"
          >
            <div className="text-[10px] uppercase tracking-[0.08em] text-[#C6B697] font-semibold">
              Select replacement test card (preview)
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {PREVIEW_REPLACEMENT_CARDS.map((opt) => {
                const chosen = previewReplacementCardId === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    data-testid={`pos-preview-replacement-${opt.last4}`}
                    onClick={() => onSelectPreviewReplacementCard(opt.id)}
                    className={`h-[27px] px-2 rounded-[6px] border text-[10.5px] font-medium flex items-center justify-between gap-1 cursor-pointer transition-colors ${
                      chosen
                        ? "bg-[#192D5C] border-[#DFBE77] text-[#FFF4D6]"
                        : "bg-[#040D21] border-[#5B72A3]/40 text-[#C6D5F0] hover:border-[#CFA657]/70"
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {chosen && <Check className="h-3 w-3 text-[#DFBE77] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Live PCI-Safe Stripe Elements Replacement Inputs */
          <>
            <div className={`pos-field-well rounded-[7px] ${inputH} px-2.5 flex items-center`}>
              {stripeElementsMounted && cardByPhoneReady ? (
                <div className="w-full">
                  <CardNumberElement
                    options={{
                      style: stripeElementStyle,
                      placeholder: "New card number",
                      showIcon: false,
                    }}
                    onChange={(e) =>
                      onStripeFieldChange("number", e.complete, e.error?.message)
                    }
                  />
                </div>
              ) : (
                <div className="w-full flex items-center justify-between text-[12px] text-[#6E82AA]">
                  <span>New card number</span>
                  <button
                    type="button"
                    onClick={onOpenSetupInfo}
                    className="inline-flex items-center gap-1 text-[10px] text-amber-300 hover:text-amber-200 cursor-pointer"
                  >
                    <Lock className="h-2.5 w-2.5" />
                    <span>Stripe setup</span>
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-[1.1fr_0.9fr_1fr] gap-1.5">
              <div className={`pos-field-well rounded-[7px] ${inputH} px-2.5 flex items-center`}>
                {stripeElementsMounted && cardByPhoneReady ? (
                  <div className="w-full">
                    <CardExpiryElement
                      options={{ style: stripeElementStyle, placeholder: "MM/YY" }}
                      onChange={(e) =>
                        onStripeFieldChange("expiry", e.complete, e.error?.message)
                      }
                    />
                  </div>
                ) : (
                  <span className="text-[12px] text-[#6E82AA]">MM/YY</span>
                )}
              </div>
              <div className={`pos-field-well rounded-[7px] ${inputH} px-2.5 flex items-center`}>
                {stripeElementsMounted && cardByPhoneReady ? (
                  <div className="w-full">
                    <CardCvcElement
                      options={{ style: stripeElementStyle, placeholder: "CVC" }}
                      onChange={(e) =>
                        onStripeFieldChange("cvc", e.complete, e.error?.message)
                      }
                    />
                  </div>
                ) : (
                  <span className="text-[12px] text-[#6E82AA]">CVC</span>
                )}
              </div>
              <div className={`pos-field-well rounded-[7px] ${inputH} px-2.5 flex items-center`}>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={12}
                  value={postalCode}
                  onChange={(e) => onPostalCodeChange(e.target.value)}
                  placeholder="ZIP"
                  aria-label="Billing ZIP code"
                  className="w-full bg-transparent text-[12px] text-[#F4F7FF] placeholder-[#6E82AA] focus:outline-none"
                />
              </div>
            </div>
          </>
        )}

        {/* Set as Default Checkbox + Stripe Element Error */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <label className="inline-flex items-center gap-1.5 text-[10.5px] text-[#CFD9EE] cursor-pointer">
            <input
              type="checkbox"
              checked={setAsDefaultCard}
              onChange={(e) => onSetAsDefaultCardChange(e.target.checked)}
              className="rounded border-[#6D85B8] bg-[#040D21] accent-[#DFBE77]"
            />
            <span>Save &amp; set as default card on file</span>
          </label>
          {cardElementError && (
            <span className="text-[10px] text-rose-300 flex items-center gap-1 truncate">
              <AlertCircle className="h-3 w-3 shrink-0" />
              <span className="truncate">{cardElementError}</span>
            </span>
          )}
        </div>
      </div>
    );
  }

  // ── DEFAULT LIST VIEW: Client's Saved Cards + Inline Update Card Action ──
  return (
    <div
      role="tabpanel"
      aria-label="Saved card"
      data-testid="pos-saved-cards-list-panel"
      className="space-y-1.5"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[11.5px] font-medium text-[#D2DDF2] truncate">
            Saved cards on file
          </span>
          {isPreviewMode && (
            <span className="px-1.5 py-[1px] rounded bg-amber-400/15 border border-amber-300/35 text-[8.5px] font-semibold uppercase tracking-wider text-amber-200 shrink-0">
              MGR Preview
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!savedCardReady && !isPreviewMode && (
            <button
              type="button"
              onClick={onOpenSetupInfo}
              className="text-[10px] text-amber-300 hover:text-amber-200 underline cursor-pointer"
            >
              Stripe setup
            </button>
          )}
          <button
            type="button"
            data-testid="pos-header-update-card-btn"
            onClick={() =>
              onStartUpdateSavedCard(
                savedMethods.length > 0 ? selectedSavedMethodId : null
              )
            }
            className="h-[22px] px-2 rounded-[6px] bg-[#13264D] hover:bg-[#1C376E] border border-[#CFA657]/65 text-[10.5px] font-semibold text-[#FCE6A6] inline-flex items-center gap-1 cursor-pointer transition-colors"
          >
            {savedMethods.length > 0 ? (
              <>
                <RefreshCw className="h-2.5 w-2.5" />
                <span>Update card</span>
              </>
            ) : (
              <>
                <Plus className="h-3 w-3" />
                <span>Add card</span>
              </>
            )}
          </button>
        </div>
      </div>

      {savedMethods.length === 0 ? (
        <div className="pos-field-well rounded-[9px] px-4 py-3 text-center space-y-1.5">
          <CreditCard className="h-4 w-4 text-[#7F94BE] mx-auto" />
          <p className="text-[12.5px] text-[#DDE6F7] font-medium">No saved cards on file</p>
          <p className="text-[11px] text-[#8DA2CB] leading-snug">
            {savedCardReady
              ? "Add a card on file to update & charge this client directly."
              : "Add Stripe keys (or open Manager Key → Saved Cards to preview)."}
          </p>
          <button
            type="button"
            data-testid="pos-empty-add-card-btn"
            onClick={() => onStartUpdateSavedCard(null)}
            className="mt-1 h-[26px] px-3 rounded-[7px] bg-[#142952] hover:bg-[#1E3B72] border border-[#CFA657]/65 text-[11px] font-semibold text-[#FFF0C2] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-3 w-3" />
            <span>Add &amp; charge card</span>
          </button>
        </div>
      ) : (
        <div
          className={`space-y-1.5 ${compact ? "max-h-[88px]" : isPreviewMode ? "max-h-[104px]" : "max-h-[126px]"} overflow-y-auto pr-0.5`}
        >
          {savedMethods.map((pm) => {
            const selected = selectedSavedMethodId === pm.stripePaymentMethodId;
            const expiring = isCardExpiringSoon(pm.expMonth, pm.expYear);
            return (
              <div
                key={pm.stripePaymentMethodId}
                role="option"
                aria-selected={selected}
                tabIndex={0}
                data-testid={`pos-saved-card-row-${pm.last4}`}
                onClick={() => onSelectSavedMethod(pm.stripePaymentMethodId)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectSavedMethod(pm.stripePaymentMethodId);
                  }
                }}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-[8px] border text-left transition-all cursor-pointer ${
                  selected
                    ? "bg-[#192D5C]/90 border-[#DFBE77] shadow-[inset_0_1px_1px_rgba(255,244,206,0.16)]"
                    : "bg-[#051026]/85 border-[#5B72A3]/35 hover:border-[#9EB2DC]/60"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                      selected ? "border-[#DFBE77] bg-[#DFBE77]" : "border-[#7A91BF]"
                    }`}
                  >
                    {selected && <span className="h-1.5 w-1.5 rounded-full bg-[#06122A]" />}
                  </span>
                  <CreditCard className="h-3.5 w-3.5 text-[#DFBE77] shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-semibold text-white capitalize flex items-center gap-1.5 leading-tight">
                      <span className="truncate">
                        {pm.brand} •••• {pm.last4}
                      </span>
                      {pm.isDefault && (
                        <span className="text-[8.5px] uppercase px-1.5 py-[1px] rounded bg-cyan-400/15 text-cyan-200 border border-cyan-300/30 shrink-0">
                          Default
                        </span>
                      )}
                      {expiring && (
                        <span className="text-[8.5px] uppercase px-1.5 py-[1px] rounded bg-amber-400/15 text-amber-200 border border-amber-300/35 shrink-0">
                          Expiring
                        </span>
                      )}
                    </div>
                    <div className="text-[10.5px] text-[#95A8CE] leading-tight mt-0.5">
                      {pm.expMonth && pm.expYear
                        ? `Exp ${String(pm.expMonth).padStart(2, "0")}/${pm.expYear}`
                        : "Saved card"}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  data-testid={`pos-update-card-btn-${pm.last4}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectSavedMethod(pm.stripePaymentMethodId);
                    onStartUpdateSavedCard(pm.stripePaymentMethodId);
                  }}
                  title={`Update ${pm.brand} ending in ${pm.last4}`}
                  className="h-[22px] px-2 rounded-[5.5px] bg-[#0B1B3B] hover:bg-[#183266] border border-[#CFA657]/50 text-[10px] font-medium text-[#F7DF9D] inline-flex items-center gap-1 shrink-0 cursor-pointer transition-colors"
                >
                  <RefreshCw className="h-2.5 w-2.5" />
                  <span>Update</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
