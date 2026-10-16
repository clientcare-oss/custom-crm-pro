import React from "react";
import {
  Receipt,
  Laptop,
  Briefcase,
  Building2,
  GitBranch,
  Palette,
  ArrowDown,
  Sparkles,
  Plug,
  Archive,
  UploadCloud,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type SettingsSectionKey =
  | "business"
  | "admin"
  | "receipts"
  | "portal"
  | "import"
  | "operations"
  | "integrations"
  | "ai"
  | "colors"
  | "archived";

interface SettingsBoxConfig {
  key: SettingsSectionKey;
  title: string;
  shortLabel: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const SETTINGS_BOXES: SettingsBoxConfig[] = [
  {
    key: "business",
    title: "Business Settings",
    shortLabel: "Address, Email, Phone",
    badge: "PG-024-BIZ",
    icon: Building2,
  },
  {
    key: "admin",
    title: "Admin CRM",
    shortLabel: "What Staff See",
    badge: "PG-024 Staff",
    icon: Briefcase,
  },
  {
    key: "receipts",
    title: "Payment Receipts",
    shortLabel: "Receipts & Billing",
    badge: "PG-024-REC",
    icon: Receipt,
  },
  {
    key: "portal",
    title: "Client Portal",
    shortLabel: "What Families See",
    badge: "PG-023",
    icon: Laptop,
  },
  {
    key: "import",
    title: "CRM Import",
    shortLabel: "Import Clients",
    badge: "PG-024-IMP",
    icon: UploadCloud,
  },
  {
    key: "operations",
    title: "Workflow Designer",
    shortLabel: "Business Operations",
    badge: "PG-015",
    icon: GitBranch,
  },
  {
    key: "integrations",
    title: "Integrations & APIs",
    shortLabel: "Phone & Services",
    badge: "PG-014",
    icon: Plug,
  },
  {
    key: "ai",
    title: "AI Connections",
    shortLabel: "Workers AI & LLMs",
    badge: "PG-032",
    icon: Sparkles,
  },
  {
    key: "colors",
    title: "Color Tokens",
    shortLabel: "Design Tokens",
    badge: "Master Tokens",
    icon: Palette,
  },
  {
    key: "archived",
    title: "Archived Workspaces",
    shortLabel: "Legacy Reference",
    badge: "PG-030-ARC",
    icon: Archive,
  },
];

interface SettingsCommandBoxesProps {
  activeSection: SettingsSectionKey;
  onSelectSection: (section: SettingsSectionKey) => void;
}

export function SettingsCommandBoxes({
  activeSection,
  onSelectSection,
}: SettingsCommandBoxesProps) {
  const activeBox =
    SETTINGS_BOXES.find((b) => b.key === activeSection) || SETTINGS_BOXES[0];

  const handleBoxClick = (key: SettingsSectionKey) => {
    onSelectSection(key);
    // Smoothly scroll down so the user immediately sees the opened section below
    setTimeout(() => {
      const el = document.getElementById("settings-active-workspace");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 40);
  };

  return (
    <div className="w-full space-y-2.5">
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#C6B697] flex items-center gap-1.5 flex-wrap">
            <span>Settings Modules</span>
            <span className="text-[#3A2C18]">•</span>
            <span className="text-[#DFBE77] font-sans normal-case text-[11px] font-medium flex items-center gap-1">
              Click any tab to edit configuration below
              <ArrowDown className="w-3 h-3 text-[#FFE394] inline animate-bounce" />
            </span>
          </h2>
        </div>

        <span className="text-[11px] text-[#A69371] font-mono px-2 py-0.5 rounded-md bg-[#020A17] border border-[#3A2C18]">
          10 Systems
        </span>
      </div>

      {/* ── RESPONSIVE COMPACT TABS GRID (ZERO HORIZONTAL SCROLL) ─────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 w-full">
        {SETTINGS_BOXES.map((box) => {
          const isActive = activeSection === box.key;
          const Icon = box.icon;

          return (
            <button
              key={box.key}
              type="button"
              onClick={() => handleBoxClick(box.key)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between text-left group relative overflow-hidden ${
                isActive
                  ? "bg-[#071E3D] border-2 border-[#FFE394] shadow-[0_0_20px_rgba(255,227,148,0.3)] ring-1 ring-[#FFE394]/40"
                  : "bg-[#05142B]/90 border-[#3A2C18] shadow-sm hover:border-[#C5A059]/60 hover:bg-[#071A35]"
              }`}
            >
              <div className="w-full">
                <div className="flex items-center justify-between gap-1 mb-1.5 w-full">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105 shadow-inner ${
                      isActive
                        ? "bg-[#FFE394] text-[#07162B]"
                        : "bg-[#020A17] border border-[#3A2C18] text-[#FFE394]"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[8px] font-mono px-1 py-0 rounded ${
                      isActive
                        ? "bg-[#020A17] border border-[#FFE394]/50 text-[#FFE394]"
                        : "bg-[#020A17] border border-[#3A2C18] text-[#A69371]"
                    }`}
                  >
                    {box.badge}
                  </Badge>
                </div>

                <div className="text-xs font-serif font-bold text-[#FFF4D4] group-hover:text-[#FFE394] transition-colors truncate">
                  {box.title}
                </div>
                <div className="text-[9px] font-medium text-[#DFBE77] truncate mt-0.5">
                  {box.shortLabel}
                </div>
              </div>

              <div className="mt-2 pt-1.5 border-t border-[#3A2C18]/60 flex items-center justify-between text-[9px] w-full">
                {isActive ? (
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                    Open Below ↓
                  </span>
                ) : (
                  <span className="text-[#A69371] group-hover:text-[#FFE394]">
                    Configure
                  </span>
                )}
                <ArrowDown
                  className={`w-2.5 h-2.5 transition-transform ${
                    isActive
                      ? "text-emerald-400 animate-bounce"
                      : "text-[#A69371] group-hover:text-[#FFE394]"
                  }`}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* ── DIRECTIONAL WORKSPACE NOTICE BANNER ────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#020A17]/95 border border-[#FFE394]/30 shadow-[0_4px_16px_rgba(0,0,0,0.6)] text-xs flex-wrap gap-2 w-full">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="text-[#C6B697] text-[11px]">Active Module:</span>
          <span className="font-serif font-bold text-[#FFE394]">{activeBox.title}</span>
          <Badge
            variant="outline"
            className="text-[9px] font-mono bg-[#05142B] text-[#FFE394] border-[#FFE394]/40 px-1.5 py-0"
          >
            {activeBox.badge}
          </Badge>
          <span className="text-[#DFBE77] text-[11px] hidden sm:inline">
            — Form configuration is open directly below
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            const el = document.getElementById("settings-active-workspace");
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }}
          className="text-[#FFE394] hover:text-white font-bold flex items-center gap-1.5 cursor-pointer text-[11px] bg-[#071E3D] hover:bg-[#0A274E] px-2.5 py-1 rounded-lg border border-[#FFE394]/40 hover:border-[#FFE394] transition-all shadow-xs shrink-0 ml-auto sm:ml-0"
        >
          <span>Jump to Form</span>
          <ArrowDown className="w-3 h-3 text-[#FFE394] animate-bounce" />
        </button>
      </div>
    </div>
  );
}
