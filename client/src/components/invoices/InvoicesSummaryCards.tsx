import React from "react";
import { DollarSign, CheckCircle2, Clock, AlertTriangle, FileText, Sparkles } from "lucide-react";

interface InvoicesSummaryCardsProps {
  invoices: any[];
}

export function InvoicesSummaryCards({ invoices }: InvoicesSummaryCardsProps) {
  // Calculations
  const totalInvoiced = invoices.reduce(
    (sum, inv) => sum + (Number(inv.total) || Number(inv.amount) || 0),
    0
  );

  const totalPaid = invoices
    .filter((inv) => inv.status === "Paid")
    .reduce((sum, inv) => sum + (Number(inv.total) || Number(inv.amount) || 0), 0);

  const totalOutstanding = invoices
    .filter((inv) => inv.status === "Sent" || inv.status === "Overdue")
    .reduce((sum, inv) => sum + (Number(inv.total) || Number(inv.amount) || 0), 0);

  const countDrafts = invoices.filter((inv) => inv.status === "Draft").length;
  const countOverdue = invoices.filter((inv) => inv.status === "Overdue").length;

  const cards = [
    {
      title: "Total Invoiced",
      value: `$${totalInvoiced.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: `${invoices.length} total invoice${invoices.length === 1 ? "" : "s"} generated`,
      icon: DollarSign,
      iconColor: "text-[#FAD77B]",
      glowColor: "from-[#FFE394]/20 via-[#DFBE77]/5 to-transparent",
    },
    {
      title: "Collected Revenue",
      value: `$${totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: "Paid in full via Stripe",
      icon: CheckCircle2,
      iconColor: "text-emerald-400",
      glowColor: "from-emerald-500/20 via-emerald-500/5 to-transparent",
    },
    {
      title: "Outstanding Balance",
      value: `$${totalOutstanding.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: "Active sent invoices awaiting client payment",
      icon: Clock,
      iconColor: "text-blue-400",
      glowColor: "from-blue-500/20 via-blue-500/5 to-transparent",
    },
    {
      title: "Action Items",
      value: `${countDrafts} Drafts · ${countOverdue} Overdue`,
      subtitle: countOverdue > 0 ? "Requires advocate follow-up" : "All active invoices in good standing",
      icon: countOverdue > 0 ? AlertTriangle : FileText,
      iconColor: countOverdue > 0 ? "text-amber-400" : "text-[#DFBE77]",
      glowColor: "from-amber-500/20 via-amber-500/5 to-transparent",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;

        return (
          <div
            key={idx}
            className="relative rounded-2xl p-[1px] bg-gradient-to-b from-[#FFE394]/50 via-[#C5A059]/30 to-[#9E7D3B]/20 shadow-[0_12px_28px_rgba(0,0,0,0.85)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(0,0,0,0.9),0_0_20px_rgba(197,160,89,0.18)]"
          >
            <div className="bg-gradient-to-br from-[#0B1E38]/95 via-[#07162B]/95 to-[#040D1A]/95 rounded-[15px] p-5 relative overflow-hidden h-full flex flex-col justify-between">
              
              {/* Top Specular Hairline */}
              <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#FFE394]/50 to-transparent" />

              {/* Ambient Glow */}
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${card.glowColor} rounded-full blur-2xl pointer-events-none opacity-40`} />

              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#C5A059] font-bold">
                    {card.title}
                  </span>
                  
                  {/* Jewel Icon Box */}
                  <div className="w-8 h-8 rounded-lg p-[1px] bg-gradient-to-b from-[#FFE394]/70 via-[#C5A059]/40 to-[#9E7D3B]/20 shadow-md shrink-0">
                    <div className="w-full h-full rounded-[7px] bg-gradient-to-b from-[#14233D] to-[#040A15] flex items-center justify-center border border-[#FFE394]/20 shadow-inner">
                      <Icon className={`w-4 h-4 ${card.iconColor}`} />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xl sm:text-2xl font-serif font-black text-[#FFF4D4] tracking-tight drop-shadow-sm">
                    {card.value}
                  </div>
                  <p className="text-[11px] text-[#A69371] leading-relaxed pt-1">
                    {card.subtitle}
                  </p>
                </div>
              </div>

            </div>
          </div>
        );
      })}
    </div>
  );
}
