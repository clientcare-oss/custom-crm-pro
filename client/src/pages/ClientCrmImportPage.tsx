import React from "react";
import { Link } from "wouter";
import { ArrowLeft, Settings2, Users, Building, Phone, UploadCloud } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import PageIdBadge from "@/components/PageIdBadge";
import { ClientCrmImportTab } from "@/components/settings/ClientCrmImportTab";
import { trpc } from "@/lib/trpc";
import { useTerminology } from "@/contexts/TerminologyContext";

export default function ClientCrmImportPage() {
  const { projectLabel } = useTerminology();
  const { data: phoneData } = trpc.system.getBusinessPhone.useQuery();

  const displayPhone = phoneData?.phone || "(404) 555-0199";

  return (
    <div
      className="min-h-screen w-full relative overflow-x-hidden bg-[#07162B] text-slate-100"
      style={{
        backgroundColor: "#07162B",
        backgroundImage: "radial-gradient(ellipse at 50% 0%, #102B4E 0%, #07162B 55%, #030D1A 100%)",
      }}
    >
      <div className="w-full px-4 sm:px-6 md:px-8 py-8 space-y-6 max-w-7xl mx-auto">
        {/* ── TOP BREADCRUMB & CONTEXT HEADER ─────────────────────────────────── */}
        <div className="space-y-4 border-b border-[#3A2C18]/80 pb-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <Link
                href="/settings"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C6B697] hover:text-[#FFE394] transition-colors p-2 rounded-lg bg-[#020A17] border border-[#3A2C18]"
              >
                <ArrowLeft className="w-4 h-4 text-[#DFBE77]" />
                <span>Back to Settings Hub (PG-024)</span>
              </Link>
              <span className="text-[#3A2C18]">•</span>
              <span className="text-xs text-[#A69371] font-mono">Dedicated Subpage Console</span>
            </div>

            <PageIdBadge id="PG-024-IMP" name="Settings → Client CRM Import" />
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3.5">
              <div className="rounded-xl bg-[#05142B] border border-[#3A2C18] p-3 text-[#FFE394] shadow-[0_4px_16px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.06)]">
                <UploadCloud className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-serif font-black tracking-tight text-[#FFF4D4] flex items-center gap-2">
                  Client CRM Migration Subpage
                </h1>
                <p className="text-[#C6B697] text-xs md:text-sm mt-0.5 font-sans">
                  Direct subpage entry to import client rosters, student profiles, and historical case records from external CRMs.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/settings?section=admin">
                <Button
                  size="sm"
                  variant="outline"
                  className="border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] text-xs h-8 cursor-pointer font-semibold"
                >
                  <Settings2 className="w-3.5 h-3.5 mr-1.5 text-[#DFBE77]" />
                  Practice Profile (PG-024)
                </Button>
              </Link>
              <Link href="/contacts">
                <Button
                  size="sm"
                  variant="outline"
                  className="border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] text-xs h-8 cursor-pointer font-semibold"
                >
                  <Users className="w-3.5 h-3.5 mr-1.5 text-[#FFE394]" />
                  Contacts Ledger (PG-002)
                </Button>
              </Link>
            </div>
          </div>

          {/* Live Practice Telemetry Pill Bar */}
          <div className="rounded-xl border border-[#3A2C18] bg-[#05142B]/90 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-[#DFBE77]" />
                <span className="text-[#A69371]">Practice:</span>
                <span className="font-bold text-[#FFF4D4]">Waypoint Advocates</span>
              </div>

              <span className="text-[#3A2C18] hidden sm:inline">•</span>

              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[#A69371]">Phone:</span>
                <span className="font-bold text-[#FFF4D4] font-mono">{displayPhone}</span>
              </div>

              <span className="text-[#3A2C18] hidden sm:inline">•</span>

              <div className="flex items-center gap-1.5">
                <span className="text-[#A69371]">Case Term:</span>
                <Badge variant="outline" className="text-[10px] font-bold bg-[#020A17] text-[#FFE394] border-[#3A2C18]">
                  {projectLabel}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                ✓ D1 Ingestion Active
              </span>
            </div>
          </div>
        </div>

        {/* ── SUBPAGE WORKSPACE ────────────────────────────────────────────── */}
        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
          <ClientCrmImportTab />
        </div>
      </div>
    </div>
  );
}
