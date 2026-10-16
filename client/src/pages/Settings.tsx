import React, { useState, useEffect } from "react";
import { Settings2, Building, Phone, ShieldCheck, Laptop, Receipt, GitBranch, Palette, ArrowRight, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import PageIdBadge from "@/components/PageIdBadge";
import { SETTINGS_SECTION_IDS, broadcastPageId, type PageIdInfo } from "@/lib/pageIdRegistry";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useTerminology } from "@/contexts/TerminologyContext";
import {
  SettingsCommandBoxes,
  type SettingsSectionKey,
} from "@/components/settings/SettingsCommandBoxes";
import { BusinessSettingsTab } from "@/components/settings/BusinessSettingsTab";
import { AdminCrmSettingsTab } from "@/components/settings/AdminCrmSettingsTab";
import { ClientPortalSettingsTab } from "@/components/settings/ClientPortalSettingsTab";
import { ColorPaletteTokensTab } from "@/components/settings/ColorPaletteTokensTab";
import BusinessOperationsSection from "@/components/settings/BusinessOperationsSection";
import { ReceiptSettingsTab } from "@/components/settings/ReceiptSettingsTab";
import { ArchivedPagesSettingsTab } from "@/components/settings/ArchivedPagesSettingsTab";
import { ClientCrmImportTab } from "@/components/settings/ClientCrmImportTab";
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

  // Resolve initial section from URL path or query parameter
  const resolveInitialSection = (): SettingsSectionKey => {
    if (typeof window === "undefined") return "business";
    const pathname = (window.location.pathname || "").toLowerCase();
    if (pathname.includes("/settings/business")) return "business";
    if (pathname.includes("/settings/receipts") || pathname.includes("/settings/receipt")) return "receipts";
    if (pathname.includes("/settings/portal")) return "portal";
    if (pathname.includes("/settings/admin") || pathname.includes("/settings/crm")) return "admin";
    if (pathname.includes("/settings/import")) return "import";
    if (pathname.includes("/settings/operations") || pathname.includes("/settings/workflows")) return "operations";
    if (pathname.includes("/settings/integrations") || pathname.includes("/settings/quo")) return "integrations";
    if (pathname.includes("/settings/ai")) return "ai";
    if (pathname.includes("/settings/colors") || pathname.includes("/settings/tokens")) return "colors";
    if (pathname.includes("/settings/archived") || pathname.includes("/settings/legacy")) return "archived";

    const params = new URLSearchParams(window.location.search);
    const raw = (params.get("section") || params.get("tab") || "").toLowerCase();
    if (raw === "business" || raw === "business-settings" || raw === "company" || raw === "profile" || raw === "contact") return "business";
    if (raw === "receipts" || raw === "receipt") return "receipts";
    if (raw === "portal" || raw === "client-portal") return "portal";
    if (raw === "operations" || raw === "workflows" || raw === "workflow-designer") return "operations";
    if (raw === "integrations" || raw === "integration" || raw === "quo") return "integrations";
    if (raw === "ai" || raw === "ai-connections" || raw === "llm") return "ai";
    if (raw === "colors" || raw === "palette" || raw === "tokens") return "colors";
    if (raw === "archived" || raw === "archived-pages" || raw === "legacy") return "archived";
    if (raw === "import" || raw === "crm-import" || raw === "clients-import" || raw === "import-clients") return "import";
    if (raw === "admin" || raw === "crm") return "admin";
    return "business";
  };

  const [activeSection, setActiveSection] = useState<SettingsSectionKey>(resolveInitialSection);

  // Derive active PageIdInfo (PG-024-BIZ for business, PG-024-REC for receipts, etc.)
  const currentBadgeInfo: PageIdInfo = SETTINGS_SECTION_IDS[activeSection] || {
    id: "PG-024",
    name: "Company Settings Hub",
    category: "Settings",
  };

  // Broadcast page ID update on section change so global floating corner dock reflects it
  useEffect(() => {
    broadcastPageId(currentBadgeInfo);
  }, [activeSection, currentBadgeInfo]);

  // Sync tab change with browser history URL and broadcast
  const handleSectionChange = (section: SettingsSectionKey) => {
    setActiveSection(section);
    const info = SETTINGS_SECTION_IDS[section] || { id: "PG-024", name: "Company Settings" };
    broadcastPageId(info);

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.pathname = "/settings";
      url.searchParams.set("section", section);
      url.searchParams.delete("tab");
      window.history.pushState(null, "", url.toString());

      // Smoothly scroll to the active workspace container so the opened tab is immediately in view
      const el = document.getElementById("settings-active-workspace");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  // Listen for browser popstate
  useEffect(() => {
    const handlePopState = () => {
      const resolved = resolveInitialSection();
      setActiveSection(resolved);
      const info = SETTINGS_SECTION_IDS[resolved] || { id: "PG-024", name: "Company Settings" };
      broadcastPageId(info);
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
                  Executive command center for Waypoint Advocates. Configure business profile, billing receipts, client portal, CRM operations, and master tokens.
                </p>
              </div>
            </div>

            {/* Dynamic Active Page ID Badge with 1-Click Copy and Tab Identification */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(currentBadgeInfo.id);
                  toast.success(`Copied ${currentBadgeInfo.id} (${currentBadgeInfo.name}) to clipboard`);
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#020A17] border border-[#FFE394]/50 text-[#FFE394] font-mono text-xs font-bold hover:bg-[#071E3D] hover:border-[#FFE394] transition-all cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.6)] group"
                title={`Active Page ID: ${currentBadgeInfo.id} — Click to copy`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="tracking-wide">{currentBadgeInfo.id}</span>
                <span className="text-[11px] text-[#C6B697] font-sans font-medium border-l border-[#3A2C18] pl-2 ml-1 hidden sm:inline group-hover:text-[#FFE394] transition-colors">
                  {currentBadgeInfo.name}
                </span>
                <Copy className="w-3.5 h-3.5 text-[#A69371] group-hover:text-[#FFE394] ml-1 transition-colors" />
              </button>
              <PageIdBadge id={currentBadgeInfo.id} name={currentBadgeInfo.name} />
            </div>
          </div>

          {/* Live Practice Telemetry Pill Bar */}
          <div className="rounded-xl border border-[#3A2C18] bg-[#05142B]/90 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]">
            <div className="flex items-center gap-4 flex-wrap">
              <button
                onClick={() => handleSectionChange("business")}
                className="flex items-center gap-1.5 hover:text-[#FFE394] transition-colors cursor-pointer text-left"
                title="Manage practice profile in Business Settings"
              >
                <Building className="w-3.5 h-3.5 text-[#DFBE77]" />
                <span className="text-[#A69371]">Advocacy Practice:</span>
                <span className="font-bold text-[#FFF4D4] hover:underline">Waypoint Advocates</span>
              </button>

              <span className="text-[#3A2C18] hidden sm:inline">•</span>

              <button
                onClick={() => handleSectionChange("business")}
                className="flex items-center gap-1.5 hover:text-[#FFE394] transition-colors cursor-pointer text-left"
                title="Manage consolidated business phone in Business Settings"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[#A69371]">Phone:</span>
                <span className="font-bold text-[#FFF4D4] font-mono hover:underline">{displayPhone}</span>
              </button>

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

        {/* ── EXECUTIVE COMMAND BOXES ACROSS THE TOP ──────────────────────── */}
        <SettingsCommandBoxes
          activeSection={activeSection}
          onSelectSection={handleSectionChange}
        />

      {/* ── ACTIVE SECTION WORKSPACE ──────────────────────────────────────── */}
      <div
        id="settings-active-workspace"
        className="pt-1 scroll-mt-6 animate-in fade-in slide-in-from-top-2 duration-200"
      >
        {/* SECTION: Business Settings (PG-024-BIZ) */}
        {activeSection === "business" && (
          <div className="space-y-4">
            <BusinessSettingsTab
              onPhoneUpdated={handlePhoneUpdated}
              onOpenReceipts={() => handleSectionChange("receipts")}
              onOpenPortal={() => handleSectionChange("portal")}
            />
          </div>
        )}

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
          <AdminCrmSettingsTab
            onPhoneUpdated={handlePhoneUpdated}
            onOpenImport={() => handleSectionChange("import")}
            onOpenBusinessSettings={() => handleSectionChange("business")}
          />
        )}

        {/* SECTION 4: Client CRM Import (PG-024-IMP) */}
        {activeSection === "import" && (
          <div className="space-y-4">
            <ClientCrmImportTab />
          </div>
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
