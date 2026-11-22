import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Plus, Compass } from "lucide-react";
import PageIdBadge from "@/components/PageIdBadge";
import { InvoicesSummaryCards } from "@/components/invoices/InvoicesSummaryCards";
import { InvoicesTable } from "@/components/invoices/InvoicesTable";
import { CreateInvoiceModal } from "@/components/invoices/CreateInvoiceModal";
import { InvoicePreviewModal } from "@/components/invoices/InvoicePreviewModal";
import { InvoiceRefundModal } from "@/components/invoices/InvoiceRefundModal";

export default function Invoices() {
  const { user } = useAuth();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [previewInvoiceId, setPreviewInvoiceId] = useState<number | null>(null);
  const [refundInvoice, setRefundInvoice] = useState<any | null>(null);

  // Queries
  const { data: invoices = [], isLoading, refetch } = trpc.invoices.list.useQuery(undefined, {
    enabled: !!user,
  });

  return (
    <div className="min-h-screen bg-[#030D1A] text-white p-4 sm:p-6 md:p-8 space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-end">
        <PageIdBadge id="PG-005" name="Invoices & Billing" />
      </div>

      <div className="space-y-6">
        {/* ── Admiralty Hero Header: One-Time Invoicing ── */}
        <div className="relative rounded-3xl p-[1px] bg-gradient-to-b from-[#FFE394]/70 via-[#C5A059]/40 to-[#9E7D3B]/40 shadow-[0_20px_50px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.2)]">
          <div className="bg-gradient-to-b from-[#0B1E38] via-[#07162B] to-[#040D1A] p-6 sm:p-7 rounded-[23px] relative overflow-hidden">
            {/* 3D Specular Top Bevel Hairline */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FFE394] to-transparent shadow-[0_0_15px_rgba(255,227,148,0.8)]" />

            {/* Ambient Maritime Background Glow */}
            <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#C5A059]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
              <div className="space-y-2 max-w-2xl">
                {/* Eyebrow badge */}
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-mono font-extrabold uppercase tracking-widest bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07152B] shadow-md border border-[#FFE394]/60">
                    <Compass className="h-3.5 w-3.5" />
                    WAYPOINT ONE-TIME INVOICE SYSTEM
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-mono font-semibold bg-[#020A17]/85 border border-[#DFBE77]/40 text-[#C6B697]">
                    Stripe Integrated
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#FFF4D4] tracking-tight drop-shadow-md">
                  Invoices & Accounts Receivable
                </h1>
                <p className="text-xs sm:text-sm text-[#D8C7A5] font-normal leading-relaxed">
                  Create, issue, and manage one-time advocacy invoices with itemized services, automated discounts, and real-time Stripe checkout synchronization.
                </p>
              </div>

              {/* Primary Action Button */}
              <div className="shrink-0 self-start sm:self-auto">
                <Button
                  onClick={() => setCreateModalOpen(true)}
                  className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:brightness-110 text-[#07162B] font-extrabold text-xs h-11 px-5 rounded-xl border border-[#FFE394]/70 shadow-[0_6px_20px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.4)] cursor-pointer flex items-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Plus className="h-4 w-4 text-[#07162B]" />
                  <span>Create One-Time Invoice</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Summary Metric Cards ── */}
        <InvoicesSummaryCards invoices={invoices.map((i: any) => i.invoice || i)} />

        {/* ── Invoices Data Table ── */}
        <InvoicesTable
          invoices={invoices}
          isLoading={isLoading}
          onPreview={(id) => setPreviewInvoiceId(id)}
          onRefund={(inv) => setRefundInvoice(inv)}
          onRefresh={() => refetch()}
        />

        {/* ── Modals ── */}
        <CreateInvoiceModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          onSuccess={() => refetch()}
        />

        <InvoicePreviewModal
          invoiceId={previewInvoiceId}
          open={previewInvoiceId !== null}
          onOpenChange={(open) => !open && setPreviewInvoiceId(null)}
          onRefresh={() => refetch()}
        />

        <InvoiceRefundModal
          invoice={refundInvoice}
          open={refundInvoice !== null}
          onOpenChange={(open) => !open && setRefundInvoice(null)}
          onSuccess={() => refetch()}
        />
      </div>
    </div>
  );
}
