import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Heart, CreditCard, Link2, PhoneCall, ShieldCheck } from "lucide-react";
import {
  formatCents,
  parseCurrencyInputToCents,
  MIN_PAYMENT_CENTS,
  type PaymentStationMethod,
} from "@shared/paymentStation";

export interface DonationDraft {
  donorClientId: number | null;
  donorName: string;
  donorEmail: string;
  amountCents: number;
  note: string;
  method: PaymentStationMethod;
}

interface DonationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Array<{ id: number; name: string; email: string | null }>;
  defaultClient: { id: number; name: string; email: string | null } | null;
  preservedInvoiceLabel: string | null;
  savedCardsCount: number;
  configReady: {
    cardByPhoneReady: boolean;
    savedCardReady: boolean;
    paymentLinkReady: boolean;
  };
  onApplyDonationMode: (draft: DonationDraft) => void;
}

const QUICK_AMOUNTS = [2500, 5000, 10000, 25000];

export function DonationModal({
  open,
  onOpenChange,
  clients,
  defaultClient,
  preservedInvoiceLabel,
  savedCardsCount,
  configReady,
  onApplyDonationMode,
}: DonationModalProps) {
  const [donorSource, setDonorSource] = useState<"client" | "custom">(
    defaultClient ? "client" : "custom"
  );
  const [selectedClientId, setSelectedClientId] = useState<number | null>(
    defaultClient?.id ?? null
  );
  const [customName, setCustomName] = useState("");
  const [customEmail, setCustomEmail] = useState("");
  const [amountInput, setAmountInput] = useState("50.00");
  const [note, setNote] = useState("");
  const [method, setMethod] = useState<PaymentStationMethod>("card_by_phone");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      if (defaultClient) {
        setDonorSource("client");
        setSelectedClientId(defaultClient.id);
      } else {
        setDonorSource("custom");
        setSelectedClientId(null);
      }
    }
  }, [open, defaultClient]);

  const parsedCents = parseCurrencyInputToCents(amountInput);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let donorName = "";
    let donorEmail = "";
    let donorClientId: number | null = null;

    if (donorSource === "client") {
      const found = clients.find((c) => c.id === selectedClientId);
      if (!found) {
        setError("Please select a donor account or enter custom donor details.");
        return;
      }
      donorClientId = found.id;
      donorName = found.name;
      donorEmail = found.email || "";
    } else {
      donorName = customName.trim();
      donorEmail = customEmail.trim();
      if (!donorName) {
        setError("Please enter the donor's name.");
        return;
      }
    }

    if (parsedCents < MIN_PAYMENT_CENTS) {
      setError(`Donation amount must be at least ${formatCents(MIN_PAYMENT_CENTS)}.`);
      return;
    }

    onApplyDonationMode({
      donorClientId,
      donorName,
      donorEmail,
      amountCents: parsedCents,
      note: note.trim(),
      method,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#06132C] border border-[#C8A157]/60 text-[#EFF4FF] max-w-[480px] rounded-2xl p-6 shadow-[0_24px_64px_rgba(0,0,0,0.85)]">
        <DialogHeader>
          <DialogTitle
            className="text-[22px] text-[#FFF4D6] flex items-center gap-2.5"
            style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
          >
            <span className="h-8 w-8 rounded-full bg-[#13264F] border border-[#C8A157]/60 flex items-center justify-center">
              <Heart className="h-4 w-4 text-[#DFBE77]" />
            </span>
            <span>Collect a donation</span>
          </DialogTitle>
          <DialogDescription className="text-[12.5px] text-[#9FB3D7]">
            Recorded separately from client invoices.
            {preservedInvoiceLabel ? (
              <>
                {" "}
                Your selected invoice (
                <strong className="text-[#E6ECF8]">{preservedInvoiceLabel}</strong>) will stay
                preserved and untouched.
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Donor Selection Toggle */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#C6B697]">
              Donor
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-[#030B1D] border border-[#5D75A8]/35">
              <button
                type="button"
                onClick={() => setDonorSource("client")}
                className={`h-8 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  donorSource === "client"
                    ? "bg-[#4A45C6] text-white"
                    : "text-[#A7B9DC] hover:text-white"
                }`}
              >
                Existing client
              </button>
              <button
                type="button"
                onClick={() => setDonorSource("custom")}
                className={`h-8 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  donorSource === "custom"
                    ? "bg-[#4A45C6] text-white"
                    : "text-[#A7B9DC] hover:text-white"
                }`}
              >
                Other supporter
              </button>
            </div>

            {donorSource === "client" ? (
              <select
                aria-label="Select donor client"
                value={selectedClientId ?? ""}
                onChange={(e) => setSelectedClientId(Number(e.target.value) || null)}
                className="w-full h-10 rounded-lg bg-[#040D22] border border-[#748DC0]/45 px-3 text-sm text-white focus:outline-none focus:border-cyan-300"
              >
                <option value="">Choose a client account...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.email ? `(${c.email})` : ""}
                  </option>
                ))}
              </select>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Donor full name *"
                  aria-label="Donor full name"
                  className="h-10 rounded-lg bg-[#040D22] border border-[#748DC0]/45 px-3 text-sm text-white placeholder-[#6D81A8] focus:outline-none focus:border-cyan-300"
                />
                <input
                  type="email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  placeholder="Receipt email (optional)"
                  aria-label="Donor receipt email"
                  className="h-10 rounded-lg bg-[#040D22] border border-[#748DC0]/45 px-3 text-sm text-white placeholder-[#6D81A8] focus:outline-none focus:border-cyan-300"
                />
              </div>
            )}
          </div>

          {/* Custom Amount */}
          <div className="space-y-2">
            <label
              htmlFor="pos-donation-amount"
              className="block text-xs font-semibold uppercase tracking-wider text-[#C6B697]"
            >
              Donation amount (USD)
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#C8A157]">
                  $
                </span>
                <input
                  id="pos-donation-amount"
                  type="text"
                  inputMode="decimal"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="50.00"
                  className="w-full h-10 rounded-lg bg-[#040D22] border border-[#748DC0]/45 pl-7 pr-3 text-base font-semibold text-white focus:outline-none focus:border-cyan-300"
                />
              </div>
              <div className="flex gap-1">
                {QUICK_AMOUNTS.map((cents) => (
                  <button
                    key={cents}
                    type="button"
                    onClick={() => setAmountInput((cents / 100).toFixed(2))}
                    className={`h-10 px-2.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                      parsedCents === cents
                        ? "bg-[#DFBE77]/20 border-[#DFBE77] text-[#FFF1C4]"
                        : "bg-[#081736] border-[#5D75A8]/35 text-[#BFD0EE] hover:border-[#C8A157]/70"
                    }`}
                  >
                    ${cents / 100}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Optional Note */}
          <div className="space-y-1.5">
            <label
              htmlFor="pos-donation-note"
              className="block text-xs font-semibold uppercase tracking-wider text-[#C6B697]"
            >
              Optional note
            </label>
            <input
              id="pos-donation-note"
              type="text"
              maxLength={240}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Family support fund or general contribution"
              className="w-full h-10 rounded-lg bg-[#040D22] border border-[#748DC0]/45 px-3 text-sm text-white placeholder-[#6D81A8] focus:outline-none focus:border-cyan-300"
            />
          </div>

          {/* Supported Payment Method */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#C6B697]">
              Payment method
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  {
                    id: "card_by_phone",
                    label: "Card by phone",
                    icon: PhoneCall,
                    ready: configReady.cardByPhoneReady,
                    disabled: false,
                  },
                  {
                    id: "saved_card",
                    label: "Saved card",
                    icon: CreditCard,
                    ready: configReady.savedCardReady && savedCardsCount > 0,
                    disabled: donorSource === "custom",
                  },
                  {
                    id: "send_link",
                    label: "Send link",
                    icon: Link2,
                    ready: configReady.paymentLinkReady,
                    disabled: false,
                  },
                ] as const
              ).map((opt) => {
                const Icon = opt.icon;
                const active = method === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => setMethod(opt.id)}
                    className={`flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                      active
                        ? "bg-[#4A45C6]/35 border-[#8F8BFF] text-white"
                        : "bg-[#040D22] border-[#5D75A8]/35 text-[#B4C4E2] hover:border-[#C8A157]/60"
                    } ${opt.disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{opt.label}</span>
                    {!opt.ready && !opt.disabled && (
                      <span className="text-[9.5px] text-amber-300/90">Setup needed</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-[#040D22]/90 border border-[#4E6596]/35 px-3 py-2 text-[11.5px] text-[#9EB2D6]">
            <ShieldCheck className="h-4 w-4 text-cyan-300 shrink-0 mt-0.5" />
            <span>
              Loads Donation mode onto the register display and receipt so you can confirm the
              donation cleanly via Stripe. No tax-deductibility claim is added to the receipt.
            </span>
          </div>

          {error && <p className="text-xs text-rose-300">{error}</p>}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-10 px-4 rounded-lg border border-[#5D75A8]/45 bg-[#081633] text-sm text-[#CBD6EC] hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="pos-confirm-donation-mode-btn"
              className="pos-charge-gold h-10 px-5 rounded-lg text-sm font-bold cursor-pointer"
            >
              Collect donation {parsedCents > 0 ? formatCents(parsedCents) : ""}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
