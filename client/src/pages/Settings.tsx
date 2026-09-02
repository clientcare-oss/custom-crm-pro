import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import VoiceInput from "@/components/VoiceInput";
import { useTerminology, ICON_OPTIONS, type ProjectIconKey } from "@/contexts/TerminologyContext";
import { 
  CheckCircle, 
  Settings2, 
  GraduationCap, 
  Briefcase, 
  FolderOpen, 
  BookOpen, 
  Users, 
  Star, 
  Heart, 
  Target, 
  Compass, 
  ClipboardList, 
  FileText, 
  Layers, 
  Phone, 
  Palette, 
  Copy, 
  Check, 
  Sun, 
  Moon, 
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Building,
  UserCheck,
  Eye,
  Info,
  Laptop,
  CheckCircle2,
  Lock,
  ArrowRight,
  type LucideIcon 
} from "lucide-react";
import { ActionCenterIcon } from "@/components/ui/ActionCenterIcon";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import PageIdBadge from "@/components/PageIdBadge";

const ICON_COMPONENT_MAP: Record<ProjectIconKey, LucideIcon> = {
  GraduationCap, Briefcase, FolderOpen, BookOpen, Users, Star, Heart, Target, Compass, ClipboardList, FileText, Layers,
};

interface ColorGuideItem {
  name: string;
  hex: string;
  humanRole: string;
  exactUsage: string;
  scope: "portal" | "admin" | "accent";
  mode: "dark" | "light" | "both";
  textColor?: string;
  borderColor?: string;
}

const COLOR_GUIDE: ColorGuideItem[] = [
  // ── CLIENT PORTAL DARK MODE ──────────────────────────────────────────
  {
    name: "Portal Background (Dark)",
    hex: "#0D1117",
    humanRole: "This color is the main background across all Client Portal pages.",
    exactUsage: "Full viewport canvas, scrollable content area, and stage simulator background",
    scope: "portal",
    mode: "dark",
    textColor: "#FFFFFF",
    borderColor: "#30363D",
  },
  {
    name: "Portal Cards & Boxes (Dark)",
    hex: "#161B22",
    humanRole: "This color is used for every card, workspace folder, container, and item box in the portal.",
    exactUsage: "Document Vault summary strips, Action Center cards, task cards, chat thread boxes, and modals",
    scope: "portal",
    mode: "dark",
    textColor: "#FFFFFF",
    borderColor: "#30363D",
  },
  {
    name: "Portal Sidebar & Header (Dark)",
    hex: "#06172F",
    humanRole: "This color is the persistent navigation sidebar and top header background.",
    exactUsage: "Left sidebar menu, sextant header background panel, and mobile navigation bar",
    scope: "portal",
    mode: "dark",
    textColor: "#FFFFFF",
    borderColor: "#18365D",
  },
  {
    name: "Elevated Active Surface (Dark)",
    hex: "#21262D",
    humanRole: "This color is used for highlighted items, active task cards, and inner dialog sections.",
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
    humanRole: "This color is the main background when families switch the Client Portal to Light Mode.",
    exactUsage: "Full portal viewport background when Light Mode is selected",
    scope: "portal",
    mode: "light",
    textColor: "#0F172A",
    borderColor: "#CBD5E1",
  },
  {
    name: "Portal Cards & Boxes (Light)",
    hex: "#FFFFFF",
    humanRole: "This pure white color is used for all cards, containers, and boxes in Light Mode.",
    exactUsage: "White surface cards with subtle slate shadows and borders",
    scope: "portal",
    mode: "light",
    textColor: "#0F172A",
    borderColor: "#E2E8F0",
  },
  {
    name: "Portal Sidebar & Header (Light)",
    hex: "#FFFFFF",
    humanRole: "This clean white surface is used for the sidebar and header in Light Mode.",
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
    humanRole: "This gold color is used for primary buttons, call-to-actions, and important highlights.",
    exactUsage: "Start Action buttons, scheduled call countdowns, star badges, and compass needle",
    scope: "accent",
    mode: "both",
    textColor: "#00102F",
    borderColor: "#D97706",
  },
  {
    name: "Emerald Status (Safe & FERPA)",
    hex: "#10B981",
    humanRole: "This green color is used for FERPA compliant badges, completed milestones, and success tags.",
    exactUsage: "100% Safe & Encrypted badge, completed onboarding checkmarks, and active status tags",
    scope: "accent",
    mode: "both",
    textColor: "#FFFFFF",
    borderColor: "#059669",
  },
  {
    name: "Sky Blue (Info & Transcripts)",
    hex: "#38BDF8",
    humanRole: "This blue color is used for in-progress workflows, meeting transcripts, and info tags.",
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
    humanRole: "This color is the main background for Byron's CRM admin dashboard, tables, and views.",
    exactUsage: "Background for /contacts, /leads, /invoices, /tasks, and /scheduler in Light Mode",
    scope: "admin",
    mode: "light",
    textColor: "#0F172A",
    borderColor: "#E2E8F0",
  },
  {
    name: "CRM Admin Canvas (Dark)",
    hex: "#000821",
    humanRole: "This color (#000821) is the background for Byron's CRM admin dashboard when in Dark Mode.",
    exactUsage: "Dark canvas background for CRM admin pages (PG-001 through PG-024)",
    scope: "admin",
    mode: "dark",
    textColor: "#FFFFFF",
    borderColor: "#18365D",
  },
  {
    name: "CRM Admin Cards (Light)",
    hex: "#FFFFFF",
    humanRole: "This white color is used for CRM tables, lead cards, and management widgets.",
    exactUsage: "Contact cards, lead pipeline columns, billing tables, and task boards",
    scope: "admin",
    mode: "light",
    textColor: "#0F172A",
    borderColor: "#E2E8F0",
  },
  {
    name: "CRM Admin Cards (Dark)",
    hex: "#161B22",
    humanRole: "This dark slate color (#161B22) is used for CRM tables and cards when Admin Dark Mode is on.",
    exactUsage: "Admin data tables, advocate note cards, and task management panels",
    scope: "admin",
    mode: "dark",
    textColor: "#FFFFFF",
    borderColor: "#30363D",
  },
  {
    name: "CRM Admin Sidebar",
    hex: "#06172F",
    humanRole: "This color (#06172F) is the persistent left navigation sidebar for Byron's CRM admin workspace.",
    exactUsage: "Advocate CRM main left navigation sidebar",
    scope: "admin",
    mode: "both",
    textColor: "#FFFFFF",
    borderColor: "#18365D",
  },
];

export default function Settings() {
  const { projectLabel, setProjectLabel, presetOptions, projectIconKey, setProjectIconKey } = useTerminology();
  const [customValue, setCustomValue] = useState(
    presetOptions.some((o) => o.value === projectLabel) ? "" : projectLabel
  );
  const [selected, setSelected] = useState(
    presetOptions.some((o) => o.value === projectLabel) ? projectLabel : "__custom__"
  );

  // Settings view section tab: "all" | "portal" | "admin" | "colors"
  const [activeSection, setActiveSection] = useState<"portal" | "admin" | "colors">("portal");
  
  // Theme comparison filter: "all" | "dark" | "light"
  const [themeModeFilter, setThemeModeFilter] = useState<"all" | "dark" | "light">("dark");
  const [previewThemeMode, setPreviewThemeMode] = useState<"dark" | "light">("dark");
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  const copyToClipboard = (hex: string, name: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    toast.success(`Copied ${hex} (${name}) to clipboard`);
    setTimeout(() => setCopiedHex(null), 2000);
  };

  // Business phone state
  const [phoneValue, setPhoneValue] = useState("");
  const { data: phoneData } = trpc.system.getBusinessPhone.useQuery();
  const setPhoneMutation = trpc.system.setBusinessPhone.useMutation({
    onSuccess: () => {
      toast.success("Business phone number saved");
    },
    onError: () => toast.error("Failed to save phone number"),
  });

  // Company logo state
  const [logoUrlValue, setLogoUrlValue] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const { data: logoData } = trpc.system.getCompanyLogo.useQuery();
  const setLogoMutation = trpc.system.setCompanyLogo.useMutation({
    onSuccess: () => {
      toast.success("Company logo updated");
    },
    onError: () => toast.error("Failed to update logo"),
  });

  // Populate initial values
  useState(() => {
    if (phoneData?.phone) setPhoneValue(phoneData.phone);
    if (logoData?.logoUrl) setLogoUrlValue(logoData.logoUrl);
  });

  const handleLogoSave = () => {
    setLogoMutation.mutate({ logoUrl: logoUrlValue.trim() });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload-logo", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      if (data.url) {
        setLogoUrlValue(data.url);
        toast.success("Logo uploaded. Click 'Save' to apply changes.");
      }
    } catch (error) {
      toast.error("Failed to upload logo image");
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  };

  const handleSelect = (value: string) => {
    setSelected(value);
    if (value !== "__custom__") {
      setProjectLabel(value);
      toast.success(`Label updated to "${value}"`);
    }
  };

  const handleCustomSave = () => {
    const trimmed = customValue.trim();
    if (!trimmed) {
      toast.error("Custom label cannot be empty");
      return;
    }
    setProjectLabel(trimmed);
    setSelected("__custom__");
    toast.success(`Label updated to "${trimmed}"`);
  };

  const handlePhoneSave = () => {
    const trimmed = phoneValue.trim();
    setPhoneMutation.mutate({ phone: trimmed });
  };

  // Filter color guide based on current tab & mode filter
  const filteredColors = COLOR_GUIDE.filter((c) => {
    const matchesScope = activeSection === "colors" 
      ? true 
      : activeSection === "portal" 
        ? (c.scope === "portal" || c.scope === "accent")
        : (c.scope === "admin" || c.scope === "accent");

    const matchesMode = themeModeFilter === "all" 
      ? true 
      : (c.mode === themeModeFilter || c.mode === "both");

    return matchesScope && matchesMode;
  });

  return (
    <div className="space-y-8 p-6 md:p-8 max-w-5xl mx-auto font-sans">
      
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="space-y-3 border-b border-border pb-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-400/10 border border-amber-400/25 p-2.5 text-amber-500">
              <Settings2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Settings & Practice Profile
              </h1>
              <p className="text-muted-foreground text-xs md:text-sm mt-0.5">
                Clear configuration of what families experience in the Client Portal vs. what Byron & staff see in the CRM.
              </p>
            </div>
          </div>
          <PageIdBadge id="PG-024" name="Settings & Profile" />
        </div>

        {/* ── CURRENT PAGE BACKGROUND CALLOUT (100% EXPLICIT CLARITY) ── */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0">
              <Info className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-bold text-foreground">Current Page Background for PG-024:</span>{" "}
              <span className="text-muted-foreground">
                In <strong>Dark Mode</strong>, this Settings page sits on <code className="font-mono font-bold text-primary">#000821</code> with <code className="font-mono font-bold text-primary">#161B22</code> cards. In <strong>Light Mode</strong>, it sits on <code className="font-mono font-bold text-primary">#F8FAFC</code> with <code className="font-mono font-bold text-primary">#FFFFFF</code> cards.
              </span>
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0 self-start sm:self-auto">
            Admin CRM Scope
          </span>
        </div>

        {/* ── PRIMARY SCOPE SWITCHER (CLIENT PORTAL vs. ADMIN CRM vs. COLOR SYSTEM) ── */}
        <div className="flex items-center gap-2 pt-3 flex-wrap">
          <button
            onClick={() => setActiveSection("portal")}
            className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSection === "portal"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
            }`}
          >
            <Laptop className="w-4 h-4" />
            Client Portal (What Families See)
          </button>

          <button
            onClick={() => setActiveSection("admin")}
            className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSection === "admin"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Admin CRM (What Byron & Staff See)
          </button>

          <button
            onClick={() => setActiveSection("colors")}
            className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSection === "colors"
                ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
                : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
            }`}
          >
            <Palette className="w-4 h-4" />
            Complete Color Palette & Tokens
          </button>
        </div>
      </div>

      {/* ── SECTION 1: CLIENT PORTAL CONFIGURATION & COLOR GUIDE ──────────── */}
      {activeSection === "portal" && (
        <div className="space-y-6">
          {/* Quick Notice Card */}
          <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-950/40 via-[#00102F]/60 to-blue-900/20 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">Client Portal Environment</span>
                <span className="text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded-full">
                  PG-023 / PG-027
                </span>
              </div>
              <h3 className="text-base font-bold text-white">
                How colors & layouts work in your families' portal
              </h3>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                Families see a distraction-free, high-contrast interface. All cards and items use your exact midnight blue (<code className="text-amber-300 font-mono">#00102F</code>) against the deep nautical page backdrop (<code className="text-amber-300 font-mono">#030914</code>).
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <a href="/portal-management">
                <Button size="sm" className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs h-8">
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  Test in Simulator (PG-027)
                </Button>
              </a>
              <a href="/portal" target="_blank" rel="noreferrer">
                <Button size="sm" variant="outline" className="text-xs h-8 text-white border-white/20 hover:bg-white/10">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Live Portal
                </Button>
              </a>
            </div>
          </div>

          {/* Dark vs Light Mode Comparison for Client Portal */}
          <Card className="rounded-2xl border border-border shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Palette className="w-5 h-5 text-amber-500" />
                    Client Portal Color Dictionary
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Clear explanation of every color and background used throughout the Client Portal.
                  </CardDescription>
                </div>

                {/* Dark vs Light Toggle Filter */}
                <div className="flex items-center p-1 rounded-xl bg-muted border border-border text-xs">
                  <button
                    onClick={() => setThemeModeFilter("dark")}
                    className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                      themeModeFilter === "dark" ? "bg-slate-900 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5 text-amber-400" />
                    🌙 Dark Mode (Default)
                  </button>
                  <button
                    onClick={() => setThemeModeFilter("light")}
                    className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                      themeModeFilter === "light" ? "bg-white text-slate-950 shadow-xs border border-slate-200" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    ☀️ Light Mode
                  </button>
                  <button
                    onClick={() => setThemeModeFilter("all")}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      themeModeFilter === "all" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredColors.map((color) => (
                  <div
                    key={color.hex + color.name}
                    onClick={() => copyToClipboard(color.hex, color.name)}
                    className="group rounded-xl border border-border/80 bg-card hover:border-amber-400/50 p-4 flex items-start gap-3.5 cursor-pointer transition-all hover:shadow-md relative"
                  >
                    {/* Visual Color Swatch */}
                    <div
                      className="w-14 h-14 rounded-xl shrink-0 flex items-center justify-center shadow-inner relative overflow-hidden transition-transform group-hover:scale-105"
                      style={{ 
                        backgroundColor: color.hex,
                        border: `1.5px solid ${color.borderColor || "rgba(255,255,255,0.2)"}` 
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
                        <h4 className="text-xs font-bold text-foreground truncate group-hover:text-amber-500 transition-colors">
                          {color.name}
                        </h4>
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {color.mode === "both" ? "Dark & Light" : color.mode}
                        </span>
                      </div>

                      <p className="text-xs font-semibold text-amber-600 dark:text-amber-400/90 leading-tight">
                        {color.humanRole}
                      </p>

                      <p className="text-[11px] text-muted-foreground leading-snug">
                        {color.exactUsage}
                      </p>

                      <div className="flex items-center gap-2 pt-1">
                        <span className="font-mono text-[10px] text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded">
                          {color.hex}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Copy className="w-2.5 h-2.5" /> Click to copy hex
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Live Interactive Portal Sample Card */}
              <div className="mt-6 rounded-2xl border border-white/10 bg-[#0D1117] p-5 text-white space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white">Live Client Portal Preview</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/30">
                      Exact Colors Rendered
                    </span>
                  </div>
                  <span className="text-xs text-white/50">Page Background: #0D1117</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Sample Card 1 */}
                  <div className="rounded-xl border border-white/10 bg-[#161B22] p-4 space-y-2.5 shadow-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Document Vault Box</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                        100% Safe & Encrypted
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white">2026 Psycho-Educational Evaluation.pdf</h4>
                    <p className="text-xs text-white/60">
                      Card Surface Color: <code className="text-amber-300 font-mono">#161B22</code>
                    </p>
                    <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                      <span className="text-[10px] text-white/40">Updated Today</span>
                      <Button size="sm" className="bg-amber-400 hover:bg-amber-500 text-[#161B22] font-bold text-xs h-7 px-3 rounded-lg">
                        View File
                      </Button>
                    </div>
                  </div>

                  {/* Sample Card 2 */}
                  <div className="rounded-xl border border-amber-400/40 bg-gradient-to-b from-[#21262D] to-[#161B22] p-4 space-y-2.5 shadow-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">Action Center Item</span>
                      <span className="text-[10px] bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full font-bold">
                        Needs Your Review
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white">Parent Concerns & Priorities Statement</h4>
                    <p className="text-xs text-white/70">
                      Elevated Review Gradient: <code className="text-amber-300 font-mono">#21262D → #161B22</code>
                    </p>
                    <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                      <span className="text-[10px] text-white/40">Due in 3 days</span>
                      <Button size="sm" className="bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold text-xs h-7 px-3 rounded-lg">
                        Review Now →
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── SECTION 2: ADMIN CRM SIDE (BYRON'S WORKSPACE) ─────────────────── */}
      {activeSection === "admin" && (
        <div className="space-y-6">
          {/* Quick Admin Scope Banner */}
          <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/30 via-slate-900/60 to-amber-900/20 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Advocate CRM Environment</span>
                <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full">
                  Admin Master View
                </span>
              </div>
              <h3 className="text-base font-bold text-foreground">
                Settings that affect Byron & staff operations
              </h3>
              <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
                Configure your practice terminology (e.g., whether you manage "Students", "Clients", or "Projects"), practice phone number, and sidebar icons.
              </p>
            </div>
            <a href="/contacts">
              <Button size="sm" className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs h-8 shrink-0">
                <Users className="h-3.5 w-3.5 mr-1.5" />
                Go to Contacts (PG-002)
              </Button>
            </a>
          </div>

          {/* Practice Phone Number Section */}
          <Card className="rounded-2xl border border-border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                Practice Business Phone Number
              </CardTitle>
              <CardDescription className="text-xs">
                Displayed to families on the Discovery Call confirmation screen and inside the client portal so they can reach your office.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Phone Number
                </label>
                <div className="flex gap-2">
                  <VoiceInput
                    value={phoneValue}
                    onChange={(e) => setPhoneValue(e.target.value)}
                    placeholder="e.g., (404) 555-0199 or 1-800-555-0100"
                    className="flex-1 text-xs md:text-sm"
                    type="tel"
                  />
                  <Button
                    onClick={handlePhoneSave}
                    disabled={setPhoneMutation.isPending}
                    className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold px-5"
                  >
                    {setPhoneMutation.isPending ? "Saving..." : "Save Phone"}
                  </Button>
                </div>
                {phoneData?.phone && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium pt-1">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Currently active: <span className="font-bold">{phoneData.phone}</span>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Company Logo Section */}
          <Card className="rounded-2xl border border-border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building className="h-5 w-5 text-primary" />
                Company Brand & Logo
              </CardTitle>
              <CardDescription className="text-xs">
                Customize the logo image displayed in the CRM header, sidebar, and client portal login screens.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Logo Image URL
                </label>
                <div className="flex gap-2">
                  <Input
                    value={logoUrlValue}
                    onChange={(e) => setLogoUrlValue(e.target.value)}
                    placeholder="e.g. https://example.com/logo.png or upload below"
                    className="flex-1 text-xs md:text-sm"
                  />
                  <Button
                    onClick={handleLogoSave}
                    disabled={setLogoMutation.isPending}
                    className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold px-5"
                  >
                    {setLogoMutation.isPending ? "Saving..." : "Save Logo"}
                  </Button>
                </div>
                
                <div className="flex items-center gap-4 pt-2">
                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload-input"
                      disabled={uploadingLogo}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={uploadingLogo}
                      onClick={() => document.getElementById("logo-upload-input")?.click()}
                      className="text-xs font-semibold"
                    >
                      {uploadingLogo ? "Uploading..." : "Upload Logo File"}
                    </Button>
                  </div>

                  {logoUrlValue && (
                    <div className="flex items-center gap-3 p-2 rounded-xl bg-muted border border-border">
                      <span className="text-xs text-muted-foreground font-semibold">Active Preview:</span>
                      <div className="h-10 w-10 rounded-lg border border-border bg-[#00102F] p-1 flex items-center justify-center">
                        <img
                          src={logoUrlValue}
                          alt="Logo Preview"
                          className="h-full w-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Practice Terminology Section */}
          <Card className="rounded-2xl border border-border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Practice Case Terminology
              </CardTitle>
              <CardDescription className="text-xs">
                Choose the label used throughout Byron's CRM for what you call a client record (e.g. "Student", "Case", "Project").
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Active Label: <span className="text-primary font-bold text-sm normal-case">{projectLabel}</span>
                </p>

                {/* Preset options */}
                <div className="grid gap-2 sm:grid-cols-2">
                  {presetOptions.map((option) => {
                    const isActive = selected === option.value;
                    return (
                      <button
                        key={option.value}
                        onClick={() => handleSelect(option.value)}
                        className={`flex items-center justify-between rounded-xl border px-4 py-3 text-xs font-bold transition-all text-left cursor-pointer ${
                          isActive
                            ? "border-primary bg-primary/10 text-primary shadow-xs"
                            : "border-border bg-background text-foreground hover:bg-muted"
                        }`}
                      >
                        <span>{option.label}</span>
                        {isActive && <CheckCircle className="h-4 w-4 shrink-0 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom label input */}
              <div className="space-y-2 pt-3 border-t border-border">
                <label className="text-xs font-bold text-foreground">Custom Terminology</label>
                <div className="flex gap-2">
                  <VoiceInput
                    value={customValue}
                    onChange={(e) => {
                      setCustomValue(e.target.value);
                      setSelected("__custom__");
                    }}
                    placeholder="e.g., Advocacy File, IEP Case"
                    className="flex-1 text-xs"
                  />
                  <Button
                    onClick={handleCustomSave}
                    className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold"
                  >
                    Apply Custom
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Icon Picker Section */}
          <Card className="rounded-2xl border border-border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Compass className="h-5 w-5 text-primary" />
                Sidebar Case Icon
              </CardTitle>
              <CardDescription className="text-xs">
                Choose the icon shown next to the {projectLabel}s navigation tab in the CRM sidebar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {ICON_OPTIONS.map((opt) => {
                  const IconComp = ICON_COMPONENT_MAP[opt.key];
                  const isActive = projectIconKey === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => {
                        setProjectIconKey(opt.key);
                        toast.success(`Icon updated to ${opt.label}`);
                      }}
                      title={opt.label}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-all cursor-pointer ${
                        isActive
                          ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                          : "border-border bg-background text-foreground hover:bg-muted"
                      }`}
                    >
                      <IconComp className="h-5 w-5" />
                      <span className="truncate w-full text-center text-[11px]">{opt.label}</span>
                      {isActive && <CheckCircle className="h-3.5 w-3.5 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── SECTION 3: COMPLETE COLOR SYSTEM & TOKENS ─────────────────────── */}
      {activeSection === "colors" && (
        <div className="space-y-6">
          <Card className="rounded-2xl border border-border shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Palette className="w-5 h-5 text-purple-500" />
                    Complete Master Color System & Design Tokens
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Full registry of colors used across Client Portal (Dark/Light) and CRM Admin Workspace.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-1 bg-muted p-1 rounded-xl border border-border text-xs">
                  <button
                    onClick={() => setThemeModeFilter("all")}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      themeModeFilter === "all" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All Modes
                  </button>
                  <button
                    onClick={() => setThemeModeFilter("dark")}
                    className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                      themeModeFilter === "dark" ? "bg-slate-900 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Moon className="w-3 h-3 text-amber-400" /> Dark
                  </button>
                  <button
                    onClick={() => setThemeModeFilter("light")}
                    className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                      themeModeFilter === "light" ? "bg-white text-slate-950 shadow-xs border border-slate-200" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Sun className="w-3 h-3 text-amber-500" /> Light
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredColors.map((color) => (
                  <div
                    key={color.hex + color.name}
                    onClick={() => copyToClipboard(color.hex, color.name)}
                    className="group rounded-xl border border-border/80 bg-card hover:border-purple-400/50 p-4 flex items-start gap-3.5 cursor-pointer transition-all hover:shadow-md relative"
                  >
                    <div
                      className="w-14 h-14 rounded-xl shrink-0 flex items-center justify-center shadow-inner relative overflow-hidden transition-transform group-hover:scale-105"
                      style={{ 
                        backgroundColor: color.hex,
                        border: `1.5px solid ${color.borderColor || "rgba(255,255,255,0.2)"}` 
                      }}
                    >
                      <span 
                        className="text-[10px] font-mono font-bold tracking-tight"
                        style={{ color: color.textColor || "#FFFFFF" }}
                      >
                        {color.hex}
                      </span>
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <h4 className="text-xs font-bold text-foreground truncate group-hover:text-purple-500 transition-colors">
                          {color.name}
                        </h4>
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {color.scope} • {color.mode}
                        </span>
                      </div>

                      <p className="text-xs font-semibold text-foreground/90 leading-tight">
                        {color.humanRole}
                      </p>

                      <p className="text-[11px] text-muted-foreground leading-snug">
                        {color.exactUsage}
                      </p>

                      <div className="flex items-center gap-2 pt-1">
                        <span className="font-mono text-[10px] text-purple-600 dark:text-purple-400 font-bold bg-purple-500/10 px-1.5 py-0.5 rounded">
                          {color.hex}
                        </span>
                        <span className="text-[10px] text-muted-foreground">Click to copy</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}
