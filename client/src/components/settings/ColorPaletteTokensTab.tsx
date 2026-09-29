import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Palette, Copy, Sun, Moon, Sparkles, Check, Info } from "lucide-react";
import { toast } from "sonner";

export interface ColorGuideItem {
  name: string;
  hex: string;
  humanRole: string;
  exactUsage: string;
  scope: "portal" | "admin" | "accent";
  mode: "dark" | "light" | "both";
  textColor?: string;
  borderColor?: string;
}

export const COLOR_GUIDE: ColorGuideItem[] = [
  // ── CLIENT PORTAL DARK MODE ──────────────────────────────────────────
  {
    name: "Portal Background (Dark)",
    hex: "#0D1117",
    humanRole: "Main background across all Client Portal views.",
    exactUsage: "Full viewport canvas, scrollable content area, and stage simulator background",
    scope: "portal",
    mode: "dark",
    textColor: "#FFFFFF",
    borderColor: "#30363D",
  },
  {
    name: "Portal Cards & Boxes (Dark)",
    hex: "#161B22",
    humanRole: "Surface for every card, folder, container, and item box in the portal.",
    exactUsage: "Document Vault summary strips, Action Center cards, task cards, chat thread boxes, and modals",
    scope: "portal",
    mode: "dark",
    textColor: "#FFFFFF",
    borderColor: "#30363D",
  },
  {
    name: "Portal Sidebar & Header (Dark)",
    hex: "#06172F",
    humanRole: "Persistent navigation sidebar and top header background.",
    exactUsage: "Left sidebar menu, sextant header background panel, and mobile navigation bar",
    scope: "portal",
    mode: "dark",
    textColor: "#FFFFFF",
    borderColor: "#18365D",
  },
  {
    name: "Elevated Active Surface (Dark)",
    hex: "#21262D",
    humanRole: "Surface for highlighted items, active task cards, and inner dialog sections.",
    exactUsage: "Needs-Review action cards, active voyage recording player, and focused form panels",
    scope: "portal",
    mode: "dark",
    textColor: "#FFFFFF",
    borderColor: "#F5B544",
  },

  // ── CLIENT PORTAL LIGHT MODE ─────────────────────────────────────────
  {
    name: "Portal Background (Light)",
    hex: "#F0F4F8",
    humanRole: "Main background when families switch the Client Portal to Light Mode.",
    exactUsage: "Full portal viewport background when Light Mode is selected",
    scope: "portal",
    mode: "light",
    textColor: "#0F172A",
    borderColor: "#CBD5E1",
  },
  {
    name: "Portal Cards & Boxes (Light)",
    hex: "#FFFFFF",
    humanRole: "Pure white surface used for all cards, containers, and boxes in Light Mode.",
    exactUsage: "White surface cards with subtle slate shadows and borders",
    scope: "portal",
    mode: "light",
    textColor: "#0F172A",
    borderColor: "#E2E8F0",
  },
  {
    name: "Portal Sidebar & Header (Light)",
    hex: "#FFFFFF",
    humanRole: "Clean white surface used for the sidebar and header in Light Mode.",
    exactUsage: "Sidebar navigation panel and top sextant header in Light Mode",
    scope: "portal",
    mode: "light",
    textColor: "#0F172A",
    borderColor: "#E2E8F0",
  },

  // ── BRAND ACCENT & HIGHLIGHT COLORS ──────────────────────────────────
  {
    name: "Waypoint Gold (Action Accent)",
    hex: "#F5B544",
    humanRole: "Used for primary buttons, call-to-actions, and important highlights.",
    exactUsage: "Start Action buttons, scheduled call countdowns, star badges, and compass needle",
    scope: "accent",
    mode: "both",
    textColor: "#00102F",
    borderColor: "#D97706",
  },
  {
    name: "Emerald Status (Safe & FERPA)",
    hex: "#10B981",
    humanRole: "Used for FERPA compliant badges, completed milestones, and success tags.",
    exactUsage: "100% Safe & Encrypted badge, completed onboarding checkmarks, and active status tags",
    scope: "accent",
    mode: "both",
    textColor: "#FFFFFF",
    borderColor: "#059669",
  },
  {
    name: "Sky Blue (Info & Transcripts)",
    hex: "#38BDF8",
    humanRole: "Used for in-progress workflows, meeting transcripts, and info tags.",
    exactUsage: "In-progress workflow indicators, school district badges, and audio scrubbers",
    scope: "accent",
    mode: "both",
    textColor: "#00102F",
    borderColor: "#0284C7",
  },

  // ── CRM ADMIN SIDE (BYRON'S WORKSPACE) ────────────────────────────────
  {
    name: "CRM Admin Canvas (Light)",
    hex: "#F8FAFC",
    humanRole: "Main background for Byron's CRM admin dashboard, tables, and views.",
    exactUsage: "Background for /contacts, /leads, /invoices, /tasks, and /scheduler in Light Mode",
    scope: "admin",
    mode: "light",
    textColor: "#0F172A",
    borderColor: "#E2E8F0",
  },
  {
    name: "CRM Admin Canvas (Dark)",
    hex: "#000821",
    humanRole: "Background for Byron's CRM admin dashboard when in Dark Mode.",
    exactUsage: "Dark canvas background for CRM admin pages (PG-001 through PG-046)",
    scope: "admin",
    mode: "dark",
    textColor: "#FFFFFF",
    borderColor: "#18365D",
  },
  {
    name: "CRM Admin Cards (Light)",
    hex: "#FFFFFF",
    humanRole: "Clean white surface used for CRM tables, lead cards, and management widgets.",
    exactUsage: "Contact cards, lead pipeline columns, billing tables, and task boards",
    scope: "admin",
    mode: "light",
    textColor: "#0F172A",
    borderColor: "#E2E8F0",
  },
  {
    name: "CRM Admin Cards (Dark)",
    hex: "#161B22",
    humanRole: "Dark slate color used for CRM tables and cards when Admin Dark Mode is on.",
    exactUsage: "Admin data tables, advocate note cards, and task management panels",
    scope: "admin",
    mode: "dark",
    textColor: "#FFFFFF",
    borderColor: "#30363D",
  },
  {
    name: "CRM Admin Sidebar",
    hex: "#06172F",
    humanRole: "Persistent left navigation sidebar for Byron's CRM admin workspace.",
    exactUsage: "Advocate CRM main left navigation sidebar",
    scope: "admin",
    mode: "both",
    textColor: "#FFFFFF",
    borderColor: "#18365D",
  },
];

export function ColorPaletteTokensTab() {
  const [themeModeFilter, setThemeModeFilter] = useState<"all" | "dark" | "light">("all");
  const [scopeFilter, setScopeFilter] = useState<"all" | "portal" | "admin" | "accent">("all");
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  const copyToClipboard = (hex: string, name: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    toast.success(`Copied ${hex} (${name}) to clipboard`);
    setTimeout(() => setCopiedHex(null), 2000);
  };

  const filteredColors = COLOR_GUIDE.filter((c) => {
    const matchesScope = scopeFilter === "all" ? true : c.scope === scopeFilter;
    const matchesMode =
      themeModeFilter === "all" ? true : c.mode === themeModeFilter || c.mode === "both";
    return matchesScope && matchesMode;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-slate-900/70 to-purple-900/20 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
              Design System & Master Tokens
            </span>
            <Badge variant="outline" className="bg-purple-500/20 text-purple-300 border-purple-500/40 text-[10px]">
              Complete Palette
            </Badge>
          </div>
          <h3 className="text-base font-bold text-foreground">
            Complete design tokens for Client Portal and CRM Admin
          </h3>
          <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
            All exact colors, contrast rules, and surface roles compiled into one reference studio. Click any color card to copy the hex code.
          </p>
        </div>

        {/* Quick Scope Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(["all", "portal", "admin", "accent"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScopeFilter(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                scopeFilter === s
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "all" ? "All Scopes" : s === "portal" ? "Portal" : s === "admin" ? "Admin CRM" : "Accents"}
            </button>
          ))}
        </div>
      </div>

      {/* Main Color Tokens Matrix */}
      <Card className="rounded-2xl border border-border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Palette className="w-5 h-5 text-purple-500" />
                Color Token Registry ({filteredColors.length} Tokens)
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Click any swatch to copy its exact hex code.
              </CardDescription>
            </div>

            {/* Mode Filter */}
            <div className="flex items-center gap-1 bg-muted p-1 rounded-xl border border-border text-xs">
              <button
                type="button"
                onClick={() => setThemeModeFilter("all")}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  themeModeFilter === "all" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Modes
              </button>
              <button
                type="button"
                onClick={() => setThemeModeFilter("dark")}
                className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  themeModeFilter === "dark" ? "bg-slate-900 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Moon className="w-3 h-3 text-amber-400" /> Dark
              </button>
              <button
                type="button"
                onClick={() => setThemeModeFilter("light")}
                className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  themeModeFilter === "light" ? "bg-white text-slate-950 shadow-xs border border-slate-200" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sun className="w-3 h-3 text-amber-500" /> Light
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredColors.map((color) => {
              const isCopied = copiedHex === color.hex;

              return (
                <div
                  key={color.hex + color.name}
                  onClick={() => copyToClipboard(color.hex, color.name)}
                  className="group rounded-xl border border-border/80 bg-card hover:border-purple-400/50 p-4 flex items-start gap-3.5 cursor-pointer transition-all hover:shadow-md relative"
                >
                  {/* Visual Color Swatch */}
                  <div
                    className="w-14 h-14 rounded-xl shrink-0 flex items-center justify-center shadow-inner relative overflow-hidden transition-transform group-hover:scale-105"
                    style={{
                      backgroundColor: color.hex,
                      border: `1.5px solid ${color.borderColor || "rgba(255,255,255,0.2)"}`,
                    }}
                  >
                    <span
                      className="text-[10px] font-mono font-bold tracking-tight"
                      style={{ color: color.textColor || "#FFFFFF" }}
                    >
                      {color.hex}
                    </span>
                  </div>

                  {/* Description with Human Clear Language */}
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <h4 className="text-xs font-bold text-foreground truncate group-hover:text-purple-400 transition-colors">
                        {color.name}
                      </h4>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                        {color.scope} • {color.mode}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-foreground/90 leading-tight">
                      {color.humanRole}
                    </p>

                    <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                      {color.exactUsage}
                    </p>

                    <div className="flex items-center gap-2 pt-1">
                      <span className="font-mono text-[10px] text-purple-600 dark:text-purple-400 font-bold bg-purple-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                        {color.hex}
                        {isCopied && <Check className="w-2.5 h-2.5 text-emerald-400" />}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Copy className="w-2.5 h-2.5" /> {isCopied ? "Copied!" : "Copy Hex"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
