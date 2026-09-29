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
  ShieldCheck,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#000d2b]/90 border border-blue-900/60 rounded-2xl p-5 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-bold text-white tracking-wide">Payroll &amp; Direct Deposit</h2>
            <PageIdBadge id="PG-038-PAY" name="Payroll" inline />
          </div>
          <p className="text-xs text-blue-200/70">
            View pay stubs, payment disbursement schedules, and verified banking details.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => toast.info("Direct deposit settings are locked. Contact Byron to update banking info.")}
          className="border-blue-700/60 text-blue-200 hover:text-white hover:bg-blue-900/40 text-xs rounded-xl"
        >
          <Lock className="w-3.5 h-3.5 mr-1 text-slate-400" />
          <span>Update Banking Info</span>
        </Button>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-2xl border border-blue-900/60 bg-[#000821] p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Next Scheduled Payday</span>
            <Calendar className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            Oct 15, 2026
          </div>
          <div className="text-[11px] text-blue-300/70">Semi-monthly direct deposit</div>
        </Card>

        <Card className="rounded-2xl border border-blue-900/60 bg-[#000821] p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Direct Deposit Status</span>
            <Building className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg font-black text-emerald-300 font-mono flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Active &amp; Verified</span>
          </div>
          <div className="text-[11px] text-slate-400">Bank of America ···· 4821 (Checking)</div>
        </Card>

        <Card className="rounded-2xl border border-blue-900/60 bg-[#000821] p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Tax Documentation</span>
            <FileText className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-lg font-black text-white">
            W-2 / 1099 On File
          </div>
          <div className="text-[11px] text-slate-400">2026 Federal &amp; GA State W-4</div>
        </Card>
      </div>

      {/* Pay Stubs Table */}
      <Card className="rounded-2xl border border-blue-900/60 bg-[#000821] p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-blue-900/40">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span>Disbursement History &amp; Pay Statements</span>
          </h3>
          <span className="text-xs font-mono text-slate-400">Last 4 Pay Periods</span>
        </div>

        <div className="divide-y divide-blue-950/80">
          {payStubs.map((stub, i) => (
            <div key={i} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <div className="font-bold text-white text-sm">{stub.payDate}</div>
                <div className="text-slate-400 font-mono text-[11px]">Pay Period: {stub.period}</div>
              </div>

              <div className="flex items-center gap-6">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Gross</span>
                  <span className="font-mono text-slate-300 font-bold">{stub.gross}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Net Direct Deposit</span>
                  <span className="font-mono text-emerald-400 font-bold text-sm">{stub.net}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {stub.status}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toast.success(`Downloaded pay statement for ${stub.payDate}`)}
                  className="h-8 px-2 text-sky-400 hover:text-white hover:bg-sky-500/20"
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
