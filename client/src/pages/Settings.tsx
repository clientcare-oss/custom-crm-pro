import { useState, useEffect } from "react";
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
  type LucideIcon 
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import PageIdBadge from "@/components/PageIdBadge";

const ICON_COMPONENT_MAP: Record<ProjectIconKey, LucideIcon> = {
  GraduationCap, Briefcase, FolderOpen, BookOpen, Users, Star, Heart, Target, Compass, ClipboardList, FileText, Layers,
};

interface ColorSwatch {
  name: string;
  hex: string;
  role: string;
  category: "portal" | "admin" | "accent";
  textColor?: string;
  borderColor?: string;
}

const PROGRAM_COLORS: ColorSwatch[] = [
  // Portal & Midnight Navy System
  {
    name: "Portal Sidebar BG",
    hex: "#06172F",
    role: "Client Portal persistent navigation sidebar background (PG-023, PG-027)",
    category: "portal",
    textColor: "#FFFFFF",
    borderColor: "#18365D",
  },
  {
    name: "Midnight Ocean (Portal BG)",
    hex: "#040D1A",
    role: "Primary page backdrop for the Client Portal & Onboarding Stages (PG-023, PG-027)",
    category: "portal",
    textColor: "#FFFFFF",
    borderColor: "#18365D",
  },
  {
    name: "Deep Navy (Portal Viewport)",
    hex: "#040C16",
    role: "Inner scrollable viewport canvas and stage simulator background",
    category: "portal",
    textColor: "#FFFFFF",
    borderColor: "#18365D",
  },
  {
    name: "Navy Glass Card (Surfaces)",
    hex: "#07152B",
    role: "Main interactive cards, meeting modules, and feature blocks",
    category: "portal",
    textColor: "#FFFFFF",
    borderColor: "#18365D",
  },
  {
    name: "Dark Navy Elevate",
    hex: "#0A1F3D",
    role: "Elevated card gradients, headers, and circular icon badge backgrounds",
    category: "portal",
    textColor: "#FFFFFF",
    borderColor: "#285590",
  },
  {
    name: "Slate Navy Border (Default)",
    hex: "#18365D",
    role: "Card borders, section dividers, and structural stroke outlines",
    category: "portal",
    textColor: "#FFFFFF",
    borderColor: "#285590",
  },
  {
    name: "Luminous Navy Border (Hover)",
    hex: "#285590",
    role: "Card hover border glow and active input focus rings",
    category: "portal",
    textColor: "#FFFFFF",
    borderColor: "#38BDF8",
  },

  // Brand & Semantic Accent Colors
  {
    name: "Golden Beacon (Brand Gold)",
    hex: "#F5B544",
    role: "Primary CTA buttons, lighthouse beacon glows, compass stars, and highlights",
    category: "accent",
    textColor: "#07152B",
    borderColor: "#E5A534",
  },
  {
    name: "Emerald Glow (Status / Success)",
    hex: "#10B981",
    role: "Confirmed meetings, phone consultation badges, active tags, and success states",
    category: "accent",
    textColor: "#FFFFFF",
    borderColor: "#059669",
  },
  {
    name: "Cyan Sky (District / Pathway)",
    hex: "#38BDF8",
    role: "School district badges, pathway compass guide, and subtle wave lines",
    category: "accent",
    textColor: "#07152B",
    borderColor: "#0284C7",
  },
  {
    name: "Royal Purple (Document Vault)",
    hex: "#A855F7",
    role: "Document vault folders, IEP records, and smart file badges",
    category: "accent",
    textColor: "#FFFFFF",
    borderColor: "#7E22CE",
  },

  // CRM Admin & Dashboard System Colors
  {
    name: "Admin Dark Sidebar",
    hex: "#0B132B",
    role: "Advocate CRM main navigation sidebar and dark header bar",
    category: "admin",
    textColor: "#FFFFFF",
    borderColor: "#1C2541",
  },
  {
    name: "Admin Light Canvas",
    hex: "#F8FAFC",
    role: "CRM admin pages background (Slate 50 light mode)",
    category: "admin",
    textColor: "#0F172A",
    borderColor: "#E2E8F0",
  },
  {
    name: "Admin Light Card",
    hex: "#FFFFFF",
    role: "CRM admin data cards, tables, and dialog surfaces (White)",
    category: "admin",
    textColor: "#0F172A",
    borderColor: "#E2E8F0",
  },
  {
    name: "Admin Slate Border",
    hex: "#E2E8F0",
    role: "Light mode cards, table borders, and divider rules (Slate 200)",
    category: "admin",
    textColor: "#0F172A",
    borderColor: "#CBD5E1",
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
  const [colorFilter, setColorFilter] = useState<"all" | "portal" | "accent" | "admin">("all");
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
    onError: () => {
      toast.error("Failed to save phone number");
    },
  });

  useEffect(() => {
    if (phoneData?.phone) {
      setPhoneValue(phoneData.phone);
    }
  }, [phoneData]);

  // Company logo state
  const [logoUrlValue, setLogoUrlValue] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const { data: logoData } = trpc.system.getCompanyLogo.useQuery();
  const setLogoMutation = trpc.system.setCompanyLogo.useMutation({
    onSuccess: () => {
      toast.success("Company logo saved");
    },
    onError: () => {
      toast.error("Failed to save logo");
    },
  });

  useEffect(() => {
    if (logoData?.logoUrl) {
      setLogoUrlValue(logoData.logoUrl);
    }
  }, [logoData]);

  const handleLogoSave = () => {
    setLogoMutation.mutate({ logoUrl: logoUrlValue.trim() || null });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are accepted.");
      return;
    }
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/images/upload", {
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

  const filteredColors = colorFilter === "all" 
    ? PROGRAM_COLORS 
    : PROGRAM_COLORS.filter(c => c.category === colorFilter);

  return (
    <div className="space-y-8 p-6 md:p-8 max-w-4xl">
      {/* Header with PG-024 Badge */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
              <Settings2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Settings & Practice Profile</h1>
          </div>
          <PageIdBadge id="PG-024" name="Settings" />
        </div>
        <p className="text-muted-foreground text-sm">
          Customize terminology, branding, practice contact information, and view program color palettes.
        </p>
      </div>

      {/* ── NEW: Program Background & Theme Colors Section ────────────────── */}
      <Card className="rounded-xl border border-border shadow-sm overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
                <Palette className="h-4.5 w-4.5" />
              </div>
              <div>
                <CardTitle className="text-lg">Program Background & Theme Colors</CardTitle>
                <CardDescription>
                  Visual palette and hex color codes used across the Client Portal, Advocate Workspace, and CRM.
                </CardDescription>
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border text-xs self-start sm:self-auto">
              <button
                onClick={() => setColorFilter("all")}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${colorFilter === "all" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
              >
                All ({PROGRAM_COLORS.length})
              </button>
              <button
                onClick={() => setColorFilter("portal")}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${colorFilter === "portal" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
              >
                Portal Navy
              </button>
              <button
                onClick={() => setColorFilter("accent")}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${colorFilter === "accent" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
              >
                Accents
              </button>
              <button
                onClick={() => setColorFilter("admin")}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${colorFilter === "admin" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
              >
                CRM Admin
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Quick Portal Simulator & Live Preview Launcher Banner */}
          <div className="bg-gradient-to-r from-blue-950/40 via-[#0A1F3D]/50 to-blue-900/20 border border-blue-500/20 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-inner">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-200">Looking to Preview or Test the Portal?</span>
                <span className="text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full">
                  PG-027
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Launch the 14-Stage Client Portal Simulator with Desktop/Tablet/Mobile devices or view the live Client Portal.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <a href="/portal-management">
                <Button size="sm" className="bg-[#F5B544] hover:bg-[#E5A534] text-[#07152B] font-semibold text-xs h-8">
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  Open Portal Simulator
                </Button>
              </a>
              <a href="/portal" target="_blank" rel="noreferrer">
                <Button size="sm" variant="outline" className="text-xs h-8">
                  Live Portal (PG-023)
                </Button>
              </a>
            </div>
          </div>

          {/* Swatches Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3.5">
            {filteredColors.map((swatch) => {
              const isCopied = copiedHex === swatch.hex;
              return (
                <div
                  key={swatch.hex + swatch.name}
                  onClick={() => copyToClipboard(swatch.hex, swatch.name)}
                  className="group rounded-xl border border-border/80 bg-card hover:border-primary/50 p-3.5 flex items-start gap-3.5 cursor-pointer transition-all hover:shadow-md relative"
                >
                  {/* Visual Color Block */}
                  <div
                    className="w-14 h-14 rounded-xl shrink-0 flex items-center justify-center shadow-inner relative overflow-hidden transition-transform group-hover:scale-105"
                    style={{ 
                      backgroundColor: swatch.hex,
                      border: `1px solid ${swatch.borderColor || "rgba(255,255,255,0.15)"}` 
                    }}
                  >
                    <span 
                      className="text-[10px] font-mono font-bold tracking-tight opacity-90"
                      style={{ color: swatch.textColor || "#FFFFFF" }}
                    >
                      {swatch.hex}
                    </span>
                  </div>

                  {/* Swatch Details */}
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <h4 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                        {swatch.name}
                      </h4>
                      <button
                        title="Copy Hex Code"
                        className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted transition-colors shrink-0"
                      >
                        {isCopied ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>

                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {swatch.role}
                    </p>

                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="font-mono text-[10px] text-primary font-semibold bg-primary/10 px-1.5 py-0.5 rounded">
                        {swatch.hex}
                      </span>
                      <span className="text-[10px] text-muted-foreground">Click to copy</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live Mini Preview Box */}
          <div className="rounded-xl border border-[#18365D] bg-[#040D1A] p-4 text-white space-y-3 relative overflow-hidden shadow-inner">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Sparkles className="h-3.5 w-3.5 text-[#F5B544]" />
                Live Program Contrast Preview (Midnight Navy Theme)
              </div>
              <span className="text-[10px] font-mono text-white/50">bg: #040D1A</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Sample Card Surface */}
              <div className="rounded-xl border border-[#18365D] bg-[#07152B] p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#F5B544] uppercase tracking-wider">#07152B Surface</span>
                  <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                </div>
                <p className="text-xs font-bold text-white">Interactive Card Header</p>
                <p className="text-[11px] text-blue-200/70">Subtext rendered on deep navy surface with high legibility.</p>
              </div>

              {/* Sample Accent Bar */}
              <div className="rounded-xl border border-[#285590] bg-[#0A1F3D] p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider">#0A1F3D Elevate</span>
                  <span className="text-[10px] font-bold text-[#F5B544]">#F5B544 Gold</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-6 px-2.5 rounded bg-[#F5B544] text-[#07152B] font-bold text-[11px] flex items-center justify-center">
                    Primary CTA
                  </div>
                  <div className="h-6 px-2.5 rounded border border-[#18365D] bg-[#040D1A] text-white text-[11px] flex items-center justify-center">
                    Secondary
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Information Section */}
      <Card className="rounded-xl border border-border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Business Information</CardTitle>
          <CardDescription>
            Set your business contact details. Your phone number is shown on lead form confirmation pages so families can save it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              Business Phone Number
            </label>
            <p className="text-xs text-muted-foreground">
              Supports toll-free numbers (e.g., 1-800-XXX-XXXX). Displayed on the form success screen so families can save your number.
            </p>
            <div className="flex gap-2">
              <VoiceInput
                value={phoneValue}
                onChange={(e) => setPhoneValue(e.target.value)}
                placeholder="e.g., 1-800-555-0100 or (555) 123-4567"
                className="flex-1"
                type="tel"
              />
              <Button
                onClick={handlePhoneSave}
                disabled={setPhoneMutation.isPending}
                className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {setPhoneMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
            {phoneData?.phone && (
              <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Currently saved: <span className="font-medium">{phoneData.phone}</span>
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Company Logo Section */}
      <Card className="rounded-xl border border-border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Company Logo</CardTitle>
          <CardDescription>
            Customize the logo image shown in the top-left corner of the sidebar and customer portal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold flex items-center gap-2">
              Logo URL
            </label>
            <div className="flex gap-2">
              <Input
                value={logoUrlValue}
                onChange={(e) => setLogoUrlValue(e.target.value)}
                placeholder="e.g. https://example.com/logo.png or upload below"
                className="flex-1"
              />
              <Button
                onClick={handleLogoSave}
                disabled={setLogoMutation.isPending}
                className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {setLogoMutation.isPending ? "Saving..." : "Save"}
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
                >
                  {uploadingLogo ? "Uploading..." : "Upload Logo Image"}
                </Button>
              </div>

              {logoUrlValue && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Preview:</span>
                  <div className="h-12 w-12 rounded-lg border border-border bg-[#071422] p-1 flex items-center justify-center">
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

      {/* Terminology Section */}
      <Card className="rounded-xl border border-border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Terminology</CardTitle>
          <CardDescription>
            Choose the label used throughout the CRM for what you call a "Project". This
            affects the sidebar, page titles, and all headings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-3 text-sm font-semibold text-foreground">
              Current label:{" "}
              <span className="text-primary font-bold">{projectLabel}</span>
            </p>

            {/* Preset options */}
            <div className="grid gap-2 sm:grid-cols-2">
              {presetOptions.map((option) => {
                const isActive = selected === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => handleSelect(option.value)}
                    className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm font-medium transition-all text-left ${
                      isActive
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    <span>{option.label}</span>
                    {isActive && <CheckCircle className="h-4 w-4 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom label */}
          <div className="space-y-2 pt-2 border-t border-border">
            <label className="text-sm font-semibold">Custom label</label>
            <p className="text-xs text-muted-foreground">
              Enter any word that fits your workflow (e.g., "Enrollment", "Engagement", "File").
            </p>
            <div className="flex gap-2">
              <VoiceInput
                value={customValue}
                onChange={(e) => {
                  setCustomValue(e.target.value);
                  setSelected("__custom__");
                }}
                placeholder="e.g., Enrollment"
                className="flex-1"
              />
              <Button
                onClick={handleCustomSave}
                className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Apply
              </Button>
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-lg bg-muted/50 border border-border p-4 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Preview
            </p>
            <p className="text-sm text-foreground">
              Sidebar: <span className="font-semibold">{projectLabel}s</span>
            </p>
            <p className="text-sm text-foreground">
              Page title: <span className="font-semibold">{projectLabel} Management</span>
            </p>
            <p className="text-sm text-foreground">
              Dashboard card: <span className="font-semibold">Active {projectLabel}s</span>
            </p>
            <p className="text-sm text-foreground">
              Button: <span className="font-semibold">New {projectLabel}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Icon Picker Section */}
      <Card className="rounded-xl border border-border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Sidebar Icon</CardTitle>
          <CardDescription>
            Choose the icon shown next to the {projectLabel}s label in the sidebar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
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
                  className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-xs font-medium transition-all ${
                    isActive
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  <IconComp className="h-5 w-5" />
                  <span className="truncate w-full text-center">{opt.label}</span>
                  {isActive && <CheckCircle className="h-3 w-3 text-primary" />}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
