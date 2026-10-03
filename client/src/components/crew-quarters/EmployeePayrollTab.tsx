import PageIdBadge from "@/components/PageIdBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  DollarSign,
  Calendar,
  Lock,
  Download,
  CheckCircle2,
  FileText,
  Building,
} from "lucide-react";
import { toast } from "sonner";

export default function EmployeePayrollTab() {
  const payStubs = [
    { period: "Sep 15, 2026 – Sep 30, 2026", payDate: "Sep 30, 2026", gross: "$4,250.00", net: "$3,380.40", status: "Processed" },
    { period: "Sep 01, 2026 – Sep 14, 2026", payDate: "Sep 15, 2026", gross: "$4,250.00", net: "$3,380.40", status: "Paid" },
    { period: "Aug 15, 2026 – Aug 31, 2026", payDate: "Aug 31, 2026", gross: "$4,250.00", net: "$3,380.40", status: "Paid" },
    { period: "Aug 01, 2026 – Aug 14, 2026", payDate: "Aug 15, 2026", gross: "$4,250.00", net: "$3,380.40", status: "Paid" },
  ];

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#05142B]/95 border border-[#3A2C18] rounded-2xl p-5 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#020A17] border border-[#3A2C18] flex items-center justify-center text-[#C5A059]">
              <CreditCard className="w-4.5 h-4.5" />
            </div>
            <h2 className="font-serif text-xl font-bold text-[#FFF4D4] tracking-wide">Payroll &amp; Direct Deposit</h2>
            <PageIdBadge id="PG-038-PAY" name="Payroll" inline />
          </div>
          <p className="text-xs text-[#C6B697]">
            View pay stubs, payment disbursement schedules, and verified banking details.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => toast.info("Direct deposit settings are locked. Contact Byron to update banking info.")}
          className="border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] text-xs rounded-xl transition-colors cursor-pointer"
        >
          <Lock className="w-3.5 h-3.5 mr-1 text-[#C5A059]" />
          <span>Update Banking Info</span>
        </Button>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 p-5 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[#C6B697]">
            <span>Next Scheduled Payday</span>
            <Calendar className="w-4 h-4 text-[#C5A059]" />
          </div>
          <div className="font-serif text-2xl font-bold text-[#FFF4D4]">
            Oct 15, 2026
          </div>
          <div className="text-[11px] text-[#A69371]">Semi-monthly direct deposit</div>
        </Card>

        <Card className="rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 p-5 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[#C6B697]">
            <span>Direct Deposit Status</span>
            <Building className="w-4 h-4 text-[#C5A059]" />
          </div>
          <div className="text-lg font-bold text-emerald-300 font-serif flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Active &amp; Verified</span>
          </div>
          <div className="text-[11px] text-[#A69371]">Bank of America ···· 4821 (Checking)</div>
        </Card>

        <Card className="rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 p-5 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[#C6B697]">
            <span>Tax Documentation</span>
            <FileText className="w-4 h-4 text-[#C5A059]" />
          </div>
          <div className="font-serif text-lg font-bold text-[#FFF4D4]">
            W-2 / 1099 On File
          </div>
          <div className="text-[11px] text-[#A69371]">2026 Federal &amp; GA State W-4</div>
        </Card>
      </div>

      {/* Pay Stubs Table */}
      <Card className="rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 p-5 sm:p-6 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#3A2C18]/60">
          <h3 className="font-serif text-base font-bold text-[#FFF4D4] flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#C5A059]" />
            <span>Disbursement History &amp; Pay Statements</span>
          </h3>
          <span className="text-xs font-mono text-[#FFE394]">Last 4 Pay Periods</span>
        </div>

        <div className="divide-y divide-[#3A2C18]/60">
          {payStubs.map((stub, i) => (
            <div key={i} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <div className="font-serif font-bold text-[#FFF4D4] text-sm">{stub.payDate}</div>
                <div className="text-[#A69371] font-mono text-[11px]">Pay Period: {stub.period}</div>
              </div>

              <div className="flex items-center gap-6">
                <div>
                  <span className="text-[10px] text-[#A69371] uppercase tracking-wider block">Gross</span>
                  <span className="font-mono text-[#D8C7A5] font-bold">{stub.gross}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#A69371] uppercase tracking-wider block">Net Direct Deposit</span>
                  <span className="font-mono text-emerald-300 font-bold text-sm">{stub.net}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  {stub.status}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toast.success(`Downloaded pay statement for ${stub.payDate}`)}
                  className="h-8 px-2 text-[#C5A059] hover:text-[#FFF4D4] hover:bg-[#07162B] cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
