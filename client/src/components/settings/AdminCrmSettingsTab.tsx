import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import VoiceInput from "@/components/VoiceInput";
import { useTerminology, ICON_OPTIONS, type ProjectIconKey } from "@/contexts/TerminologyContext";
import {
  Phone,
  Building,
  Target,
  Compass,
  CheckCircle,
  Gift,
  Users,
  GraduationCap,
  Briefcase,
  FolderOpen,
  BookOpen,
  Star,
  Heart,
  ClipboardList,
  FileText,
  Layers,
  Sparkles,
  UploadCloud,
  FileSpreadsheet,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const ICON_COMPONENT_MAP: Record<ProjectIconKey, LucideIcon> = {
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
};

function ReferralProgramSettingsCard() {
  const { data: settings, isLoading, refetch } = trpc.referrals.getSettings.useQuery();
  const updateSettingsMutation = trpc.referrals.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("Referral program settings saved");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update settings");
    },
  });

  const [enabled, setEnabled] = useState(true);
  const [newClientDiscount, setNewClientDiscount] = useState("25");
  const [referrerCredit, setReferrerCredit] = useState("25");
  const [qualificationTrigger, setQualificationTrigger] = useState("First successful eligible payment");

  useEffect(() => {
    if (settings) {
      setEnabled(settings.programEnabled ?? true);
      setNewClientDiscount(String((settings.newClientDiscountCents ?? 2500) / 100));
      setReferrerCredit(String((settings.referrerCreditCents ?? 2500) / 100));
      setQualificationTrigger(settings.qualificationTrigger || "First successful eligible payment");
    }
  }, [settings]);

  const handleSave = () => {
    const discountNum = parseFloat(newClientDiscount);
    const creditNum = parseFloat(referrerCredit);
    if (isNaN(discountNum) || discountNum < 0) {
      toast.error("Please enter a valid positive discount amount");
      return;
    }
    if (isNaN(creditNum) || creditNum < 0) {
      toast.error("Please enter a valid positive credit amount");
      return;
    }

    updateSettingsMutation.mutate({
      programEnabled: enabled,
      newClientDiscountCents: Math.round(discountNum * 100),
      referrerCreditCents: Math.round(creditNum * 100),
      qualificationTrigger,
    });
  };

  return (
    <Card className="rounded-xl border border-[#3A2C18] bg-[#05142B]/90 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]">
      <CardHeader className="pb-4 border-b border-[#3A2C18]/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-serif font-bold text-[#FFF4D4] flex items-center gap-2">
              <Gift className="h-5 w-5 text-[#FFE394]" />
              Waypoint Referral & Credit Settings
            </CardTitle>
            <CardDescription className="text-xs text-[#C6B697] mt-0.5">
              Configure the default client referral program (&quot;Give $25. Get $25.&quot;) and Waypoint Credit rules.
            </CardDescription>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#020A17] text-[#FFE394] border border-[#3A2C18]">
            No Cash Value Enforced
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        {isLoading ? (
          <p className="text-xs text-[#A69371]">Loading referral program settings...</p>
        ) : (
          <>
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#3A2C18] bg-[#020A17]/80">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-[#FFF4D4]">Referral Program Active</div>
                <div className="text-[11px] text-[#C6B697]">
                  When enabled, existing clients can generate referral links and earn Waypoint Credit.
                </div>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#A69371]">
                  New Client Discount ($)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-[#DFBE77] font-bold">$</span>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={newClientDiscount}
                    onChange={(e) => setNewClientDiscount(e.target.value)}
                    className="pl-7 text-xs font-mono bg-[#020A17] border border-[#3A2C18] text-[#FFF4D4] focus:border-[#C5A059]"
                    placeholder="25"
                  />
                </div>
                <p className="text-[10px] text-[#C6B697]">
                  Deducted automatically from the new client&apos;s first eligible payment.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#A69371]">
                  Referring Client Credit ($)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-[#DFBE77] font-bold">$</span>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={referrerCredit}
                    onChange={(e) => setReferrerCredit(e.target.value)}
                    className="pl-7 text-xs font-mono bg-[#020A17] border border-[#3A2C18] text-[#FFF4D4] focus:border-[#C5A059]"
                    placeholder="25"
                  />
                </div>
                <p className="text-[10px] text-[#C6B697]">
                  Issued to the referring client as Waypoint Credit upon successful qualification.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-lg border border-[#3A2C18]/80 bg-[#020A17]/80 space-y-1">
                <span className="text-[10px] font-bold text-[#A69371] uppercase tracking-wider">
                  Qualification Trigger
                </span>
                <p className="text-xs font-serif font-bold text-[#FFF4D4]">First Eligible Payment</p>
                <p className="text-[10px] text-[#C6B697] leading-tight">
                  Credit is only issued when referred client successfully completes their first payment.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-[#3A2C18]/80 bg-[#020A17]/80 space-y-1">
                <span className="text-[10px] font-bold text-[#A69371] uppercase tracking-wider">
                  Credit Type
                </span>
                <p className="text-xs font-serif font-bold text-[#FFF4D4]">Waypoint Credit</p>
                <p className="text-[10px] text-[#C6B697] leading-tight">
                  Functions like store credit applied against invoices. Cannot reduce balances below $0.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-[#3A2C18]/80 bg-[#020A17]/80 space-y-1">
                <span className="text-[10px] font-bold text-[#A69371] uppercase tracking-wider">
                  Cash Value
                </span>
                <p className="text-xs font-serif font-bold text-[#FFE394]">NONE</p>
                <p className="text-[10px] text-[#C6B697] leading-tight">
                  Cannot be cashed out, withdrawn, or transferred between clients.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#3A2C18]/60">
              <p className="text-[11px] text-[#C6B697] italic">
                Default offer: &quot;Give ${newClientDiscount || "25"}. Get ${referrerCredit || "25"}.&quot;
              </p>
              <Button
                onClick={handleSave}
                disabled={updateSettingsMutation.isPending}
                className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs px-5 h-8 shadow-[0_3px_10px_rgba(0,0,0,0.8)] border border-[#FFE394]/50 hover:brightness-105 cursor-pointer"
              >
                {updateSettingsMutation.isPending ? "Saving..." : "Save Referral Settings"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export interface AdminCrmSettingsTabProps {
  onPhoneUpdated?: (phone: string) => void;
  onOpenImport?: () => void;
}

export function AdminCrmSettingsTab({ onPhoneUpdated, onOpenImport }: AdminCrmSettingsTabProps = {}) {
  const { projectLabel, setProjectLabel, presetOptions, projectIconKey, setProjectIconKey } = useTerminology();
  const [customValue, setCustomValue] = useState(
    presetOptions.some((o) => o.value === projectLabel) ? "" : projectLabel
  );
  const [selected, setSelected] = useState(
    presetOptions.some((o) => o.value === projectLabel) ? projectLabel : "__custom__"
  );

  const utils = trpc.useUtils();

  // Business phone state
  const [phoneValue, setPhoneValue] = useState("");
  const { data: phoneData } = trpc.system.getBusinessPhone.useQuery();
  const setPhoneMutation = trpc.system.setBusinessPhone.useMutation({
    onSuccess: (data, variables) => {
      const saved = variables.phone || data?.phone || "";
      setPhoneValue(saved);
      utils.system.getBusinessPhone.setData(undefined, { phone: saved || null });
      utils.system.getBusinessPhone.invalidate();
      onPhoneUpdated?.(saved);
      toast.success("Business phone number saved");
    },
    onError: () => toast.error("Failed to save phone number"),
  });

  // Company logo state
  const [logoUrlValue, setLogoUrlValue] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const { data: logoData } = trpc.system.getCompanyLogo.useQuery();
  const setLogoMutation = trpc.system.setCompanyLogo.useMutation({
    onSuccess: (_, variables) => {
      utils.system.getCompanyLogo.setData(undefined, { logoUrl: variables.logoUrl || null });
      utils.system.getCompanyLogo.invalidate();
      toast.success("Company logo updated");
    },
    onError: () => toast.error("Failed to update logo"),
  });

  useEffect(() => {
    if (phoneData?.phone) setPhoneValue(phoneData.phone);
    if (logoData?.logoUrl) setLogoUrlValue(logoData.logoUrl);
  }, [phoneData, logoData]);

  const handlePhoneSave = () => {
    const trimmed = phoneValue.trim();
    setPhoneMutation.mutate({ phone: trimmed });
  };

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
        toast.success("Logo uploaded. Click 'Save Logo' to apply changes.");
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

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-xl border border-[#3A2C18] bg-[#05142B]/90 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#DFBE77] uppercase tracking-wider">Advocate CRM Environment</span>
            <Badge variant="outline" className="bg-[#020A17] text-[#FFE394] border border-[#3A2C18] text-[10px]">
              Admin Core
            </Badge>
          </div>
          <h3 className="text-base font-serif font-bold text-[#FFF4D4]">
            Settings that shape Byron & staff workspace
          </h3>
          <p className="text-xs text-[#C6B697] max-w-2xl leading-relaxed">
            Configure your practice terminology (e.g. &quot;Students&quot;, &quot;Clients&quot;, or &quot;Projects&quot;), practice business phone, sidebar icon badges, and company brand logo.
          </p>
        </div>
        <a href="/contacts">
          <Button size="sm" className="border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] font-bold text-xs h-8 shrink-0 cursor-pointer shadow-sm">
            <Users className="h-3.5 w-3.5 mr-1.5 text-[#DFBE77]" />
            Go to Contacts (PG-002)
          </Button>
        </a>
      </div>

      {/* ── CLIENT CRM IMPORT FEATURE CARD (PG-024-IMP) ────────────────── */}
      <Card className="rounded-xl border-2 border-[#C5A059]/40 bg-gradient-to-r from-[#05142B] via-[#071E3D] to-[#05142B] shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] overflow-hidden">
        <div className="p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="bg-[#020A17] text-[#FFE394] border-[#3A2C18] text-[10px] font-bold">
                PG-024-IMP
              </Badge>
              <span className="text-[10px] uppercase font-bold text-[#DFBE77] tracking-wider">
                Practice Rosters & Migration Engine
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-400 font-bold">
                Universal Parser Ready
              </span>
            </div>
            <h3 className="text-base md:text-lg font-serif font-bold text-[#FFF4D4] flex items-center gap-2">
              <UploadCloud className="h-5 w-5 text-[#FFE394]" />
              Import Existing Clients from Other CRM
            </h3>
            <p className="text-xs text-[#C6B697] leading-relaxed">
              Transitioning from HoneyBook, Dubsado, HubSpot, Clio, Practice Better, or a spreadsheet? Use Waypoint&apos;s intelligent CSV import engine to migrate parent contacts, student profiles, diagnostic histories, and case notes with automated geocoding and duplicate protection.
            </p>
            <div className="flex items-center gap-2 pt-1 flex-wrap text-[11px] text-[#A69371]">
              <span className="font-semibold text-[#DFBE77]">Supported Formats:</span>
              <Badge variant="outline" className="text-[10px] bg-[#020A17] text-[#FFF4D4] border-[#3A2C18]">HoneyBook</Badge>
              <Badge variant="outline" className="text-[10px] bg-[#020A17] text-[#FFF4D4] border-[#3A2C18]">Dubsado</Badge>
              <Badge variant="outline" className="text-[10px] bg-[#020A17] text-[#FFF4D4] border-[#3A2C18]">HubSpot</Badge>
              <Badge variant="outline" className="text-[10px] bg-[#020A17] text-[#FFF4D4] border-[#3A2C18]">Clio</Badge>
              <Badge variant="outline" className="text-[10px] bg-[#020A17] text-[#FFE394] border-[#3A2C18]">Universal CSV / Excel</Badge>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 w-full md:w-auto shrink-0">
            <Button
              onClick={() => {
                if (onOpenImport) {
                  onOpenImport();
                } else if (typeof window !== "undefined") {
                  const url = new URL(window.location.href);
                  url.searchParams.set("section", "import");
                  window.history.pushState(null, "", url.toString());
                  window.dispatchEvent(new PopStateEvent("popstate"));
                }
              }}
              className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-10 px-6 shadow-[0_4px_16px_rgba(0,0,0,0.8)] border border-[#FFE394]/60 hover:brightness-105 cursor-pointer whitespace-nowrap"
            >
              <UploadCloud className="h-4 w-4 mr-2" />
              Launch Client CRM Importer
              <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
            <button
              onClick={() => {
                if (onOpenImport) {
                  onOpenImport();
                } else if (typeof window !== "undefined") {
                  const url = new URL(window.location.href);
                  url.searchParams.set("section", "import");
                  window.history.pushState(null, "", url.toString());
                  window.dispatchEvent(new PopStateEvent("popstate"));
                }
              }}
              className="text-center text-[11px] text-[#C6B697] hover:text-[#FFE394] underline decoration-[#3A2C18] cursor-pointer"
            >
              Open Dedicated Import Workspace (PG-024-IMP)
            </button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Practice Phone Number Section */}
        <Card className="rounded-xl border border-[#3A2C18] bg-[#05142B]/90 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]">
          <CardHeader className="pb-4 border-b border-[#3A2C18]/60">
            <CardTitle className="text-base font-serif font-bold text-[#FFF4D4] flex items-center gap-2">
              <Phone className="h-5 w-5 text-[#FFE394]" />
              Practice Business Phone Number
            </CardTitle>
            <CardDescription className="text-xs text-[#C6B697] mt-0.5">
              Displayed on client confirmation receipts, call summaries, and the parent portal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#A69371]">
                Phone Number
              </label>
              <div className="flex gap-2">
                <VoiceInput
                  value={phoneValue}
                  onChange={(e) => setPhoneValue(e.target.value)}
                  placeholder="e.g. (404) 555-0199 or 1-800-555-0100"
                  className="flex-1 text-xs md:text-sm bg-[#020A17] border border-[#3A2C18] text-[#FFF4D4] focus:border-[#C5A059]"
                  type="tel"
                />
                <Button
                  onClick={handlePhoneSave}
                  disabled={setPhoneMutation.isPending}
                  className="shrink-0 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs px-5 h-9 shadow-[0_3px_10px_rgba(0,0,0,0.8)] border border-[#FFE394]/50 hover:brightness-105 cursor-pointer"
                >
                  {setPhoneMutation.isPending ? "Saving..." : "Save Phone"}
                </Button>
              </div>
              {phoneData?.phone && (
                <div className="text-xs text-emerald-400 bg-[#020A17] border border-emerald-500/30 p-2.5 rounded-lg flex items-center gap-1.5 font-medium mt-2">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Currently active: <span className="font-bold text-[#FFF4D4] font-mono">{phoneData.phone}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Company Logo Section */}
        <Card className="rounded-xl border border-[#3A2C18] bg-[#05142B]/90 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]">
          <CardHeader className="pb-4 border-b border-[#3A2C18]/60">
            <CardTitle className="text-base font-serif font-bold text-[#FFF4D4] flex items-center gap-2">
              <Building className="h-5 w-5 text-[#FFE394]" />
              Company Brand & Logo Asset
            </CardTitle>
            <CardDescription className="text-xs text-[#C6B697] mt-0.5">
              Displayed in the CRM header, sidebar, and client payment receipt experience.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#A69371]">
                Logo Image URL
              </label>
              <div className="flex gap-2">
                <Input
                  value={logoUrlValue}
                  onChange={(e) => setLogoUrlValue(e.target.value)}
                  placeholder="e.g. https://example.com/logo.png or upload below"
                  className="flex-1 text-xs md:text-sm bg-[#020A17] border border-[#3A2C18] text-[#FFF4D4] focus:border-[#C5A059]"
                />
                <Button
                  onClick={handleLogoSave}
                  disabled={setLogoMutation.isPending}
                  className="shrink-0 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs px-5 h-9 shadow-[0_3px_10px_rgba(0,0,0,0.8)] border border-[#FFE394]/50 hover:brightness-105 cursor-pointer"
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
                    className="border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] text-xs font-semibold cursor-pointer"
                  >
                    {uploadingLogo ? "Uploading..." : "Upload Logo File"}
                  </Button>
                </div>

                {logoUrlValue && (
                  <div className="flex items-center gap-3 p-2 rounded-xl bg-[#020A17] border border-[#3A2C18]">
                    <span className="text-xs text-[#A69371] font-semibold">Preview:</span>
                    <div className="h-10 w-10 rounded-lg border border-[#3A2C18] bg-[#00102F] p-1 flex items-center justify-center">
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
      </div>

      {/* Practice Terminology Section */}
      <Card className="rounded-xl border border-[#3A2C18] bg-[#05142B]/90 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]">
        <CardHeader className="pb-4 border-b border-[#3A2C18]/60">
          <CardTitle className="text-lg font-serif font-bold text-[#FFF4D4] flex items-center gap-2">
            <Target className="h-5 w-5 text-[#FFE394]" />
            Practice Case Terminology
          </CardTitle>
          <CardDescription className="text-xs text-[#C6B697] mt-0.5">
            Choose what Byron&apos;s CRM calls an individual client record (e.g. &quot;Student&quot;, &quot;Case&quot;, &quot;Project&quot;).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <div>
            <p className="mb-3 text-xs font-semibold text-[#A69371] uppercase tracking-wider">
              Active Terminology: <span className="text-[#FFE394] font-serif font-bold text-sm normal-case">{projectLabel}</span>
            </p>

            {/* Preset options */}
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
              {presetOptions.map((option) => {
                const isActive = selected === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => handleSelect(option.value)}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 text-xs font-bold transition-all text-left cursor-pointer ${
                      isActive
                        ? "border-2 border-[#FFE394] bg-[#071E3D] text-[#FFF4D4] shadow-[0_0_15px_rgba(197,160,89,0.3)]"
                        : "border border-[#3A2C18] bg-[#020A17] text-[#C6B697] hover:border-[#C5A059]/60 hover:text-[#FFF4D4]"
                    }`}
                  >
                    <span>{option.label}</span>
                    {isActive && <CheckCircle className="h-4 w-4 shrink-0 text-[#FFE394]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom label input */}
          <div className="space-y-2 pt-3 border-t border-[#3A2C18]/60">
            <label className="text-xs font-bold text-[#FFF4D4]">Custom Terminology</label>
            <div className="flex gap-2">
              <VoiceInput
                value={customValue}
                onChange={(e) => {
                  setCustomValue(e.target.value);
                  setSelected("__custom__");
                }}
                placeholder="e.g. Advocacy File, IEP Case"
                className="flex-1 text-xs bg-[#020A17] border border-[#3A2C18] text-[#FFF4D4] focus:border-[#C5A059]"
              />
              <Button
                onClick={handleCustomSave}
                className="shrink-0 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs px-5 shadow-[0_3px_10px_rgba(0,0,0,0.8)] border border-[#FFE394]/50 hover:brightness-105 cursor-pointer"
              >
                Apply Custom
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Icon Picker Section */}
      <Card className="rounded-xl border border-[#3A2C18] bg-[#05142B]/90 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]">
        <CardHeader className="pb-4 border-b border-[#3A2C18]/60">
          <CardTitle className="text-lg font-serif font-bold text-[#FFF4D4] flex items-center gap-2">
            <Compass className="h-5 w-5 text-[#FFE394]" />
            Sidebar Case Icon
          </CardTitle>
          <CardDescription className="text-xs text-[#C6B697] mt-0.5">
            Choose the icon shown next to the {projectLabel}s navigation tab in the CRM sidebar.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
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
                      ? "border-2 border-[#FFE394] bg-[#071E3D] text-[#FFF4D4] font-bold shadow-[0_0_12px_rgba(197,160,89,0.25)]"
                      : "border border-[#3A2C18] bg-[#020A17] text-[#C6B697] hover:border-[#C5A059]/60 hover:text-[#FFF4D4]"
                  }`}
                >
                  <IconComp className="h-5 w-5" />
                  <span className="truncate w-full text-center text-[11px]">{opt.label}</span>
                  {isActive && <CheckCircle className="h-3.5 w-3.5 text-[#FFE394]" />}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Referral & Credit Program Settings */}
      <ReferralProgramSettingsCard />
    </div>
  );
}
