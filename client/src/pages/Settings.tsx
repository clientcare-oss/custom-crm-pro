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

export default function Settings() {
  const { projectLabel } = useTerminology();
  const { data: phoneData } = trpc.system.getBusinessPhone.useQuery();
  const { data: logoData } = trpc.system.getCompanyLogo.useQuery();

  // Resolve initial section from URL query parameter
  const resolveInitialSection = (): SettingsSectionKey => {
    if (typeof window === "undefined") return "admin";
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("section") || params.get("tab");
    if (raw === "receipts" || raw === "receipt") return "receipts";
    if (raw === "portal" || raw === "client-portal") return "portal";
    if (raw === "operations" || raw === "workflows" || raw === "workflow-designer") return "operations";
    if (raw === "colors" || raw === "palette" || raw === "tokens") return "colors";
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
    <div className="space-y-6 p-6 md:p-8 max-w-6xl mx-auto font-sans">
      {/* ── TOP HEADER & TELEMETRY ────────────────────────────────────────── */}
      <div className="space-y-3 border-b border-border pb-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-400/10 border border-amber-400/25 p-2.5 text-amber-500">
              <Settings2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
                Company Settings Dashboard
              </h1>
              <p className="text-muted-foreground text-xs md:text-sm mt-0.5">
                Executive command center for Waypoint Advocates. Configure billing receipts, client portal, CRM operations, and master tokens.
              </p>
            </div>
          </div>
          <PageIdBadge id="PG-024" name="Company Settings Hub" />
        </div>

        {/* Live Practice Telemetry Pill Bar */}
        <div className="rounded-xl border border-border/80 bg-card/60 p-3 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-primary" />
              <span className="text-muted-foreground">Firm:</span>
              <span className="font-bold text-foreground">Waypoint Advocates</span>
            </div>

            <span className="text-slate-600 hidden sm:inline">•</span>

            <div className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-muted-foreground">Phone:</span>
              <span className="font-bold text-foreground">{phoneData?.phone || "(404) 555-0199"}</span>
            </div>

            <span className="text-slate-600 hidden sm:inline">•</span>

            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Primary Case Label:</span>
              <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/25">
                {projectLabel}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              ✓ Systems Operational
            </span>
          </div>
        </div>
      </div>

      {/* ── 5 EXECUTIVE COMMAND BOXES ACROSS THE TOP ──────────────────────── */}
      <SettingsCommandBoxes
        activeSection={activeSection}
        onSelectSection={handleSectionChange}
      />

      {/* ── ACTIVE SECTION WORKSPACE ──────────────────────────────────────── */}
      <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
        {/* SECTION 1: Payment Receipts (PG-024-REC) */}
        {activeSection === "receipts" && (
          <div className="space-y-4">
            <ReceiptSettingsTab />
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
          <AdminCrmSettingsTab />
        )}

        {/* SECTION 4: Business Operations & Workflow Designer */}
        {activeSection === "operations" && (
          <BusinessOperationsSection />
        )}

        {/* SECTION 5: Master Color Palette & Design Tokens */}
        {activeSection === "colors" && (
          <ColorPaletteTokensTab />
        )}
      </div>
    </div>
  );
}
