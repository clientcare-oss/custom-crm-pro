import React from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { WaypointReceiptExperience } from "@/components/receipts/WaypointReceiptExperience";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageIdBadge from "@/components/PageIdBadge";

export default function ReceiptView() {
  const [, params] = useRoute("/receipt/:id");
  const [, portalParams] = useRoute("/portal/receipt/:id");
  const [, setLocation] = useLocation();

  const idParam = params?.id || portalParams?.id;
  const isNumericId = idParam && !isNaN(Number(idParam));
  const receiptNumberParam = idParam && isNaN(Number(idParam)) ? idParam : undefined;

  const { data: transaction, isLoading, error } = trpc.receipts.getTransaction.useQuery(
    {
      id: isNumericId ? Number(idParam) : undefined,
      receiptNumber: receiptNumberParam,
    },
    {
      enabled: Boolean(idParam),
      retry: false,
    }
  );

  const { data: settings } = trpc.receipts.getSettings.useQuery();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#000820] flex flex-col items-center justify-center text-white space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-amber-400" />
        <p className="text-sm font-serif tracking-widest uppercase text-slate-300">
          Loading Official Receipt...
        </p>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="min-h-screen bg-[#000820] flex flex-col items-center justify-center text-white p-6">
        <div className="max-w-md w-full bg-[#06172F] border border-rose-500/40 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold font-serif text-white">Receipt Not Found</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            {error?.message || "The requested payment receipt record could not be found or you do not have permission to view it."}
          </p>
          <Button
            onClick={() => setLocation("/invoices")}
            className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return to Billing
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000820] flex flex-col items-center justify-center relative">
      <div className="absolute top-4 right-4 z-20">
        <PageIdBadge id="PG-047" name="Payment Receipt" />
      </div>

      <WaypointReceiptExperience
        transaction={transaction}
        settings={settings}
        initialStep="completed"
        onContinue={() => setLocation("/portal")}
      />
    </div>
  );
}
