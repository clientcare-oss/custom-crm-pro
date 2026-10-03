import React, { useState, useEffect } from "react";
import { Settings2, Building, Phone, ShieldCheck, Laptop, Receipt, GitBranch, Palette, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import PageIdBadge from "@/components/PageIdBadge";
import { trpc } from "@/lib/trpc";
import { useTerminology } from "@/contexts/TerminologyContext";
import {
  SettingsCommandBoxes,
  type SettingsSectionKey,
} from "@/components/settings/SettingsCommandBoxes";
import { AdminCrmSettingsTab } from "@/components/settings/AdminCrmSettingsTab";
import { ClientPortalSettingsTab } from "@/components/settings/ClientPortalSettingsTab";
import { ColorPaletteTokensTab } from "@/components/settings/ColorPaletteTokensTab";
import BusinessOperationsSection from "@/components/settings/BusinessOperationsSection";
import { ReceiptSettingsTab } from "@/components/settings/ReceiptSettingsTab";
import { ArchivedPagesSettingsTab } from "@/components/settings/ArchivedPagesSettingsTab";
import Integrations from "./Integrations";
import AiConnections from "./AiConnections";

export default function Settings() {
  const { projectLabel } = useTerminology();
  const { data: phoneData, refetch: refetchPhone } = trpc.system.getBusinessPhone.useQuery();
  const { data: logoData } = trpc.system.getCompanyLogo.useQuery();

  const [livePhone, setLivePhone] = useState<string | null>(null);

  useEffect(() => {
    if (phoneData?.phone) {
      setLivePhone(phoneData.phone);
    }
  }, [phoneData?.phone]);

  const handlePhoneUpdated = (newPhone: string) => {
    setLivePhone(newPhone);
    refetchPhone();
  };

  const displayPhone = livePhone || phoneData?.phone || "Not Set";

  // Resolve initial section from URL query parameter
  const resolveInitialSection = (): SettingsSectionKey => {
    if (typeof window === "undefined") return "admin";
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("section") || params.get("tab");
    if (raw === "receipts" || raw === "receipt") return "receipts";
    if (raw === "portal" || raw === "client-portal") return "portal";
    if (raw === "operations" || raw === "workflows" || raw === "workflow-designer") return "operations";
    if (raw === "integrations" || raw === "integration" || raw === "quo") return "integrations";
    if (raw === "ai" || raw === "ai-connections" || raw === "llm") return "ai";
    if (raw === "colors" || raw === "palette" || raw === "tokens") return "colors";
    if (raw === "archived" || raw === "archived-pages" || raw === "legacy") return "archived";
    if (raw === "admin" || raw === "crm") return "admin";
    // Default to clean Admin CRM / Company Profile base rather than raw color dump
    return "admin";
  };

  const [activeSection, setActiveSection] = useState<SettingsSectionKey>(resolveInitialSection);

  // Sync tab change with browser history URL
  const handleSectionChange = (section: SettingsSectionKey) => {
    setActiveSection(section);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("section", section);
      url.searchParams.delete("tab");
      window.history.replaceState(null, "", url.toString());
    }
  };

  // Listen for browser popstate
  useEffect(() => {
    const handlePopState = () => {
      setActiveSection(resolveInitialSection());
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return (
    <div 
      className="min-h-screen w-full relative overflow-x-hidden bg-[#07162B] text-slate-100"
      style={{
        backgroundColor: "#07162B",
        backgroundImage: "radial-gradient(ellipse at 50% 0%, #102B4E 0%, #07162B 55%, #030D1A 100%)",
      }}
    >
      <div className="w-full px-4 sm:px-6 md:px-8 py-8 space-y-6 max-w-7xl mx-auto">
        {/* ── TOP HEADER & TELEMETRY ────────────────────────────────────────── */}
        <div className="space-y-4 border-b border-[#3A2C18]/80 pb-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3.5">
              <div className="rounded-xl bg-[#05142B] border border-[#3A2C18] p-3 text-[#FFE394] shadow-[0_4px_16px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.06)]">
                <Settings2 className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-serif font-black tracking-tight text-[#FFF4D4] flex items-center gap-2">
                  Company Settings Dashboard
                </h1>
                <p className="text-[#C6B697] text-xs md:text-sm mt-0.5 font-sans">
                  Executive command center for Waypoint Advocates. Configure billing receipts, client portal, CRM operations, and master tokens.
                </p>
              </div>
            </div>
            <PageIdBadge id="PG-024" name="Company Settings Hub" />
          </div>

          {/* Live Practice Telemetry Pill Bar */}
          <div className="rounded-xl border border-[#3A2C18] bg-[#05142B]/90 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-[#DFBE77]" />
                <span className="text-[#A69371]">Advocacy Practice:</span>
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
                <span className="text-[#A69371]">Primary Case Label:</span>
                <Badge variant="outline" className="text-[10px] font-bold bg-[#020A17] text-[#FFE394] border-[#3A2C18]">
                  {projectLabel}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 shadow-xs">
                ✓ Systems Operational
              </span>
            </div>
          </div>
        </div>

        {/* ── 8 EXECUTIVE COMMAND BOXES ACROSS THE TOP ──────────────────────── */}
        <SettingsCommandBoxes
          activeSection={activeSection}
          onSelectSection={handleSectionChange}
        />

      {/* ── ACTIVE SECTION WORKSPACE ──────────────────────────────────────── */}
      <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
        {/* SECTION 1: Payment Receipts (PG-024-REC) */}
        {activeSection === "receipts" && (
          <div className="space-y-4">
            <ReceiptSettingsTab onPhoneUpdated={handlePhoneUpdated} />
          </div>
        )}

        {/* SECTION 2: Client Portal (What Families See) */}
        {activeSection === "portal" && (
          <ClientPortalSettingsTab
            onOpenColorStudio={() => handleSectionChange("colors")}
          />
        )}

        {/* SECTION 3: Admin CRM (What Byron & Staff See) */}
        {activeSection === "admin" && (
          <AdminCrmSettingsTab onPhoneUpdated={handlePhoneUpdated} />
        )}

        {/* SECTION 4: Business Operations & Workflow Designer */}
        {activeSection === "operations" && (
          <BusinessOperationsSection />
        )}

        {/* SECTION 5: Integrations & External Services (PG-014) */}
        {activeSection === "integrations" && (
          <div className="space-y-4">
            <Integrations />
          </div>
        )}

        {/* SECTION 6: AI Connections & Directives (PG-032) */}
        {activeSection === "ai" && (
          <div className="space-y-4">
            <AiConnections />
          </div>
        )}

        {/* SECTION 7: Master Color Palette & Design Tokens */}
        {activeSection === "colors" && (
          <ColorPaletteTokensTab />
        )}

        {/* SECTION 8: Archived Pages & Reference Consoles (PG-030-ARC) */}
        {activeSection === "archived" && (
          <ArchivedPagesSettingsTab />
        )}
      </div>
    </div>
  </div>
);
}
