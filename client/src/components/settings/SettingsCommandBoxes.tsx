import {
  Receipt,
  Laptop,
  Briefcase,
  GitBranch,
  Palette,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  Plug,
  Archive,
  UploadCloud,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type SettingsSectionKey = "receipts" | "portal" | "admin" | "import" | "operations" | "integrations" | "ai" | "colors" | "archived";

interface SettingsBoxConfig {
  key: SettingsSectionKey;
  title: string;
  shortLabel: string;
  badge: string;
  badgeClass: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  borderActive: string;
  glowActive: string;
  description: string;
  highlights: string[];
}

export const SETTINGS_BOXES: SettingsBoxConfig[] = [
  {
    key: "receipts",
    title: "Payment Receipts",
    shortLabel: "Receipts & Billing",
    badge: "PG-024-REC",
    badgeClass: "bg-amber-500/15 text-amber-500 border-amber-500/30",
    icon: Receipt,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-500",
    borderActive: "border-amber-400 ring-2 ring-amber-400/20",
    glowActive: "shadow-[0_0_24px_rgba(245,158,11,0.22)]",
    description: "Branded client payment receipts, printable PDF engine, Stripe confirmation hooks, terms, and refund policies.",
    highlights: ["Interactive Receipt Web View", "Printable 8.5x11 PDF Layout", "Stripe & Enrollment Hook"],
  },
  {
    key: "portal",
    title: "Client Portal",
    shortLabel: "What Families See",
    badge: "PG-023 / PG-027",
    badgeClass: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    icon: Laptop,
    iconBg: "bg-sky-500/10",
    iconColor: "text-sky-400",
    borderActive: "border-sky-400 ring-2 ring-sky-400/20",
    glowActive: "shadow-[0_0_24px_rgba(56,189,248,0.22)]",
    description: "The nautical parent portal experience. Action Center, Document Vault, FERPA privacy badges, and onboarding journey.",
    highlights: ["14 Journey Stages Preview", "Live Portal Quick Simulator", "Dark & Light Nautical Themes"],
  },
  {
    key: "admin",
    title: "Admin CRM",
    shortLabel: "What Staff See",
    badge: "PG-024 Staff",
    badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    icon: Briefcase,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-400",
    borderActive: "border-emerald-400 ring-2 ring-emerald-400/20",
    glowActive: "shadow-[0_0_24px_rgba(16,185,129,0.22)]",
    description: "Configure practice terminology (Student / Case / Project), company business phone, logo asset, and client referral credits.",
    highlights: ["Custom Case Terminology", "Practice Phone & Logo Upload", "Referral Program ($25 Credit)"],
  },
  {
    key: "import",
    title: "Client CRM Import",
    shortLabel: "Import Clients",
    badge: "PG-024-IMP",
    badgeClass: "bg-amber-500/15 text-[#FFE394] border-[#FFE394]/30",
    icon: UploadCloud,
    iconBg: "bg-amber-500/10",
    iconColor: "text-[#FFE394]",
    borderActive: "border-[#FFE394] ring-2 ring-[#FFE394]/20",
    glowActive: "shadow-[0_0_24px_rgba(255,227,148,0.22)]",
    description: "Import existing client rosters and student records from external CRMs (HoneyBook, Dubsado, HubSpot, Clio, Practice Better, or CSV).",
    highlights: ["HoneyBook & Dubsado Presets", "Smart Auto-Column Mapping", "Duplicate Email & Phone Guard"],
  },
  {
    key: "operations",
    title: "Workflow Designer",
    shortLabel: "Business Operations",
    badge: "PG-015 Engine",
    badgeClass: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
    icon: GitBranch,
    iconBg: "bg-indigo-500/10",
    iconColor: "text-indigo-400",
    borderActive: "border-indigo-400 ring-2 ring-indigo-400/20",
    glowActive: "shadow-[0_0_24px_rgba(99,102,241,0.22)]",
    description: "Business operations hub. Design automated workflows, lifecycle stage gates, task triggers, and SOP checklists.",
    highlights: ["Visual Workflow Pipelines", "Automated Case Triggers", "Lifecycle SOP Checklists"],
  },
  {
    key: "integrations",
    title: "Integrations & APIs",
    shortLabel: "Phone & Services",
    badge: "PG-014",
    badgeClass: "bg-teal-500/15 text-teal-400 border-teal-500/30",
    icon: Plug,
    iconBg: "bg-teal-500/10",
    iconColor: "text-teal-400",
    borderActive: "border-teal-400 ring-2 ring-teal-400/20",
    glowActive: "shadow-[0_0_24px_rgba(20,184,166,0.22)]",
    description: "Connect external telephony (Quo), custom domain CNAME records, Gmail API, and future CRM hooks.",
    highlights: ["Quo Phone Telephony Webhook", "Custom Portal CNAME Domain", "Gmail & Email Sync"],
  },
  {
    key: "ai",
    title: "AI Connections",
    shortLabel: "AI Engines & Keys",
    badge: "PG-032",
    badgeClass: "bg-amber-400/15 text-amber-400 border-amber-400/30",
    icon: Sparkles,
    iconBg: "bg-amber-400/10",
    iconColor: "text-amber-400",
    borderActive: "border-amber-400 ring-2 ring-amber-400/20",
    glowActive: "shadow-[0_0_24px_rgba(245,181,68,0.22)]",
    description: "Manage LLM connections, Cloudflare Workers AI models, OpenAI fallbacks, and advocate prompt directives.",
    highlights: ["Cloudflare Workers AI", "First Mate Meeting Directives", "Custom Prompt Actions"],
  },
  {
    key: "colors",
    title: "Color Tokens & Palette",
    shortLabel: "Design Tokens",
    badge: "Master Tokens",
    badgeClass: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    icon: Palette,
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-400",
    borderActive: "border-purple-400 ring-2 ring-purple-400/20",
    glowActive: "shadow-[0_0_24px_rgba(168,85,247,0.22)]",
    description: "Master palette tokens, dark & light mode contrast rules, hex copy reference, and surface elevation dictionary.",
    highlights: ["Exact Hex Code Swatches", "Dark vs Light Mode Matrix", "Surface Contrast Hierarchy"],
  },
  {
    key: "archived",
    title: "Archived Pages",
    shortLabel: "Legacy Workspaces",
    badge: "PG-030-ARC",
    badgeClass: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    icon: Archive,
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-400",
    borderActive: "border-purple-400 ring-2 ring-purple-400/20",
    glowActive: "shadow-[0_0_24px_rgba(168,85,247,0.22)]",
    description: "Preserved legacy workspaces and reference consoles kept for feature parity while designing new versions.",
    highlights: ["PG-030: Legacy Student Workspace", "Full Case Telemetry & 11 Sub-Tabs", "Direct Interactive Reference"],
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
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#C6B697] flex items-center gap-2">
          <span>Company Settings Architecture</span>
          <span className="text-[#3A2C18]">•</span>
          <span className="text-[#DFBE77]">Click a command box to open configuration</span>
        </h2>
        <span className="text-[11px] text-[#A69371] font-mono px-2 py-0.5 rounded-md bg-[#020A17] border border-[#3A2C18]">
          9 Core Systems
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-9 gap-3">
        {SETTINGS_BOXES.map((box) => {
          const isActive = activeSection === box.key;
          const Icon = box.icon;

          return (
            <div
              key={box.key}
              onClick={() => onSelectSection(box.key)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden ${
                isActive
                  ? "bg-[#071E3D] border-2 border-[#FFE394] shadow-[0_0_24px_rgba(197,160,89,0.35),0_8px_24px_rgba(0,0,0,0.85)]"
                  : "bg-[#05142B]/90 border border-[#3A2C18] shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] hover:border-[#C5A059]/60 hover:bg-[#071A35]"
              }`}
            >
              {/* Active corner accent indicator */}
              {isActive && (
                <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none overflow-hidden">
                  <div className="absolute -top-6 -right-6 w-12 h-12 bg-gradient-to-br from-[#FFE394] to-[#C5A059] opacity-30 rotate-45" />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between gap-1 mb-2.5">
                  <div
                    className="w-9 h-9 rounded-xl bg-[#020A17] border border-[#3A2C18] flex items-center justify-center text-[#FFE394] transition-transform group-hover:scale-110 shadow-inner"
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#020A17] border border-[#3A2C18] text-[#FFE394]"
                  >
                    {box.badge}
                  </Badge>
                </div>

                <h3 className="text-sm font-serif font-bold text-[#FFF4D4] group-hover:text-[#FFE394] transition-colors flex items-center gap-1.5">
                  <span>{box.title}</span>
                </h3>
                <p className="text-[10px] font-semibold text-[#DFBE77] mt-0.5">
                  {box.shortLabel}
                </p>

                <p className="text-[11px] text-[#C6B697] mt-2 line-clamp-2 leading-relaxed">
                  {box.description}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#3A2C18]/60 flex items-center justify-between text-[10px]">
                <span className={isActive ? "font-bold text-[#FFE394] flex items-center gap-1" : "text-[#A69371] group-hover:text-[#C6B697]"}>
                  {isActive ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-[#FFE394]" />
                      Active View
                    </>
                  ) : (
                    "Open Section"
                  )}
                </span>
                <ChevronRight
                  className={`w-3.5 h-3.5 transition-transform ${
                    isActive ? "translate-x-0.5 text-[#FFE394]" : "text-[#A69371] group-hover:translate-x-1 group-hover:text-[#C6B697]"
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
