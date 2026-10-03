import PageIdBadge from "@/components/PageIdBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Laptop,
  Monitor,
  Headphones,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#05142B]/95 border border-[#3A2C18] rounded-2xl p-5 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#020A17] border border-[#3A2C18] flex items-center justify-center text-[#C5A059]">
              <Laptop className="w-4.5 h-4.5" />
            </div>
            <h2 className="font-serif text-xl font-bold text-[#FFF4D4] tracking-wide">My Equipment &amp; Tech Assets</h2>
            <PageIdBadge id="PG-038-EQP" name="Equipment & Tech" inline />
          </div>
          <p className="text-xs text-[#C6B697]">
            Track company-issued hardware, secure authentication keys, and digital practice licenses.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => toast.info("IT Support ticket created. Byron or admin will review shortly.")}
          className="border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] font-semibold text-xs rounded-xl py-2 px-4 gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
        >
          <HelpCircle className="w-4 h-4 text-[#C5A059]" />
          <span>Request IT Support</span>
        </Button>
      </div>

      {/* Grid: Hardware Assets + Digital Software Accounts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hardware Assets */}
        <Card className="rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 p-5 sm:p-6 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#3A2C18]/60">
            <h3 className="font-serif text-base font-bold text-[#FFF4D4] flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#C5A059]" />
              <span>Assigned Hardware &amp; Peripherals</span>
            </h3>
            <span className="text-xs font-mono text-[#FFE394]">4 Items</span>
          </div>

          <div className="space-y-3">
            {hardware.map((item, i) => (
              <div
                key={i}
                className="p-3.5 rounded-xl bg-[#020A17]/85 border border-[#3A2C18] flex items-start gap-3.5 text-xs hover:border-[#C5A059]/50 transition-colors"
              >
                <div className="p-2.5 rounded-xl bg-[#07162B] text-[#C5A059] border border-[#3A2C18] shrink-0 mt-0.5">
                  <item.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-[#FFF4D4] text-sm truncate">{item.title}</span>
                    <span className="text-[10px] font-mono text-[#FFE394] font-bold">{item.tag}</span>
                  </div>
                  <div className="text-[#C6B697] mt-0.5">{item.condition}</div>
                  <div className="text-[10px] text-[#8C7A58] mt-1">{item.date}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Software & Communications Accounts */}
        <Card className="rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 p-5 sm:p-6 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#3A2C18]/60">
            <h3 className="font-serif text-base font-bold text-[#FFF4D4] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#C5A059]" />
              <span>Software Accounts &amp; Telephony</span>
            </h3>
            <span className="text-xs font-mono text-emerald-400 font-bold">Encrypted</span>
          </div>

          <div className="space-y-3">
            {software.map((s, i) => (
              <div
                key={i}
                className="p-3.5 rounded-xl bg-[#020A17]/85 border border-[#3A2C18] flex items-center justify-between gap-3 text-xs hover:border-[#C5A059]/50 transition-colors"
              >
                <div>
                  <div className="font-serif font-bold text-[#FFF4D4] text-sm">{s.name}</div>
                  <div className="text-[#C6B697] text-[11px] mt-0.5">{s.role}</div>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-500/30">
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
