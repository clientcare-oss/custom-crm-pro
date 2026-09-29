import PageIdBadge from "@/components/PageIdBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Laptop,
  Monitor,
  Headphones,
  Phone,
  Key,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  Cpu,
} from "lucide-react";
import { toast } from "sonner";

export default function EmployeeEquipmentTab() {
  const hardware = [
    { title: "Apple MacBook Pro 14\" M3", tag: "WP-MBP-2024-04", icon: Laptop, condition: "Assigned · Great Condition", date: "Issued Jan 15, 2024" },
    { title: "Dual Dell 27\" UltraSharp 4K Displays", tag: "WP-MON-012/013", icon: Monitor, condition: "Assigned · Office Workstation", date: "Issued Jan 15, 2024" },
    { title: "Jabra Evolve2 65 Wireless Headset", tag: "WP-AUD-009", icon: Headphones, condition: "Noise Cancelling · IEP Meetings", date: "Issued Jan 20, 2024" },
    { title: "YubiKey 5C NFC Security Key", tag: "WP-SEC-044", icon: Key, condition: "Hardware 2FA Key on File", date: "Issued Jan 15, 2024" },
  ];

  const software = [
    { name: "Waypoint Custom CRM Pro", role: "Advocate & Staff Admin", access: "Full Access" },
    { name: "Waypoint VoIP Telephony", role: "Ext 104 · (404) 555-0192", access: "Inbound & Outbound" },
    { name: "Cloudflare Zero Trust SSO", role: "Hardware-enforced 2FA", access: "Protected" },
    { name: "Special Education Law Library", role: "LRP / Special Ed Connection", access: "Research Tier" },
  ];

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#000d2b]/90 border border-blue-900/60 rounded-2xl p-5 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Laptop className="w-5 h-5 text-sky-400" />
            <h2 className="text-xl font-bold text-white tracking-wide">My Equipment &amp; Tech Assets</h2>
            <PageIdBadge id="PG-038-EQP" name="Equipment & Tech" inline />
          </div>
          <p className="text-xs text-blue-200/70">
            Track company-issued hardware, secure authentication keys, and digital practice licenses.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => toast.info("IT Support ticket created. Byron or admin will review shortly.")}
          className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl py-2 px-4 gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
        >
          <HelpCircle className="w-4 h-4" />
          <span>Request IT Support</span>
        </Button>
      </div>

      {/* Grid: Hardware Assets + Digital Software Accounts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hardware Assets */}
        <Card className="rounded-2xl border border-blue-900/60 bg-[#000821] p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-blue-900/40">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-sky-400" />
              <span>Assigned Hardware &amp; Peripherals</span>
            </h3>
            <span className="text-xs font-mono text-slate-400">4 Items</span>
          </div>

          <div className="space-y-3">
            {hardware.map((item, i) => (
              <div
                key={i}
                className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-900/50 flex items-start gap-3.5 text-xs"
              >
                <div className="p-2.5 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30 shrink-0 mt-0.5">
                  <item.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm truncate">{item.title}</span>
                    <span className="text-[10px] font-mono text-amber-300/90 font-bold">{item.tag}</span>
                  </div>
                  <div className="text-slate-300 mt-0.5">{item.condition}</div>
                  <div className="text-[10px] text-slate-500 mt-1">{item.date}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Software & Communications Accounts */}
        <Card className="rounded-2xl border border-blue-900/60 bg-[#000821] p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-blue-900/40">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Software Accounts &amp; Telephony</span>
            </h3>
            <span className="text-xs font-mono text-emerald-400 font-bold">Encrypted</span>
          </div>

          <div className="space-y-3">
            {software.map((s, i) => (
              <div
                key={i}
                className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-900/50 flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-bold text-white text-sm">{s.name}</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">{s.role}</div>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  {s.access}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
