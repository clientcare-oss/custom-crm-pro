import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";

export interface StripeSetupStatusProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config?: {
    mode: "test" | "live" | "unconfigured";
    secretKeyConfigured: boolean;
    publishableKeyConfigured: boolean;
    webhookSecretConfigured: boolean;
    emailDeliveryReady: boolean;
    emailProvider: string;
    modeMismatch: boolean;
    missingSetupItems: string[];
  };
}

export function StripeSetupDialog({
  open,
  onOpenChange,
  config,
}: StripeSetupStatusProps) {
  const rows = [
    {
      label: "Stripe Secret Key (STRIPE_SECRET_KEY)",
      ok: Boolean(config?.secretKeyConfigured),
      detail: "Required server-side for PaymentIntents, Saved Cards, and Hosted Payment Links.",
    },
    {
      label: "Stripe Publishable Key (VITE_STRIPE_PUBLISHABLE_KEY)",
      ok: Boolean(config?.publishableKeyConfigured),
      detail: "Required to mount secure Stripe Card Elements (Card Number, Expiry, CVC) for Card by phone.",
    },
    {
      label: "Stripe Webhook Secret (STRIPE_WEBHOOK_SECRET)",
      ok: Boolean(config?.webhookSecretConfigured),
      detail: "Verifies asynchronous Stripe confirmations for Payment Links and 3DS charges at /api/stripe/webhook.",
    },
    {
      label: "Email Receipt Delivery (Gmail SMTP)",
      ok: Boolean(config?.emailDeliveryReady),
      detail: "Configured in Integrations → Gmail (PG-014) or via GMAIL_USER & GMAIL_APP_PASSWORD.",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#06132C] border border-[#C8A157]/60 text-[#EFF4FF] max-w-[520px] rounded-2xl p-6 shadow-2xl">
        <DialogHeader>
          <DialogTitle
            className="text-[20px] text-[#FFF4D6] flex items-center gap-2"
            style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
          >
            <ShieldAlert className="h-5 w-5 text-[#DFBE77]" />
            <span>Stripe &amp; Delivery Configuration Status</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-[#9BB0D4]">
            Payment Station never simulates or fakes live transactions or receipt delivery. Unavailable actions remain disabled until their integration is configured.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5 mt-2">
          {rows.map((row) => (
            <div
              key={row.label}
              className="rounded-xl bg-[#040D22] border border-[#4D6495]/35 p-3 flex items-start gap-2.5"
            >
              {row.ok ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-300 shrink-0 mt-0.5" />
              )}
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white">{row.label}</div>
                <p className="text-[11.5px] text-[#95A8CE] mt-0.5 leading-relaxed">{row.detail}</p>
              </div>
            </div>
          ))}
        </div>

        {config?.modeMismatch && (
          <div className="rounded-lg bg-rose-950/70 border border-rose-400/45 p-3 text-xs text-rose-100">
            Mode mismatch detected: secret key and publishable key must both be Stripe Test keys or both be Live keys.
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 rounded-lg bg-[#162B57] hover:bg-[#1E386F] border border-[#DFBE77]/50 text-xs font-semibold text-white cursor-pointer"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
