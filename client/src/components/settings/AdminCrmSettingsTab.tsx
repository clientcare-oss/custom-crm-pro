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
    <Card className="rounded-2xl border border-border shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Gift className="h-5 w-5 text-amber-500" />
              Waypoint Referral & Credit Settings
            </CardTitle>
            <CardDescription className="text-xs">
              Configure the default client referral program (&quot;Give $25. Get $25.&quot;) and Waypoint Credit rules.
            </CardDescription>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/30">
            No Cash Value Enforced
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading referral program settings...</p>
        ) : (
          <>
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/40">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-foreground">Referral Program Active</div>
                <div className="text-[11px] text-muted-foreground">
                  When enabled, existing clients can generate referral links and earn Waypoint Credit.
                </div>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  New Client Discount ($)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-bold">$</span>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={newClientDiscount}
                    onChange={(e) => setNewClientDiscount(e.target.value)}
                    className="pl-7 text-xs font-mono"
                    placeholder="25"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Deducted automatically from the new client&apos;s first eligible payment.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Referring Client Credit ($)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-bold">$</span>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={referrerCredit}
                    onChange={(e) => setReferrerCredit(e.target.value)}
                    className="pl-7 text-xs font-mono"
                    placeholder="25"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Issued to the referring client as Waypoint Credit upon successful qualification.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-xl border border-border bg-background space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Qualification Trigger
                </span>
                <p className="text-xs font-bold text-foreground">First Eligible Payment</p>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Credit is only issued when referred client successfully completes their first payment.
                </p>
              </div>

              <div className="p-3 rounded-xl border border-border bg-background space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Credit Type
                </span>
                <p className="text-xs font-bold text-foreground">Waypoint Credit</p>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Functions like store credit applied against invoices. Cannot reduce balances below $0.
                </p>
              </div>

              <div className="p-3 rounded-xl border border-border bg-background space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Cash Value
                </span>
                <p className="text-xs font-bold text-amber-500">NONE</p>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Cannot be cashed out, withdrawn, or transferred between clients.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <p className="text-[11px] text-muted-foreground italic">
                Default offer: &quot;Give ${newClientDiscount || "25"}. Get ${referrerCredit || "25"}.&quot;
              </p>
              <Button
                onClick={handleSave}
                disabled={updateSettingsMutation.isPending}
                className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs px-5 h-8 shadow-xs cursor-pointer"
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
}

export function AdminCrmSettingsTab({ onPhoneUpdated }: AdminCrmSettingsTabProps = {}) {
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
      <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/30 via-slate-900/60 to-emerald-900/20 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Advocate CRM Environment</span>
            <Badge variant="outline" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px]">
              Admin Core
            </Badge>
          </div>
          <h3 className="text-base font-bold text-foreground">
            Settings that shape Byron & staff workspace
          </h3>
          <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
            Configure your practice terminology (e.g. &quot;Students&quot;, &quot;Clients&quot;, or &quot;Projects&quot;), practice business phone, sidebar icon badges, and company brand logo.
          </p>
        </div>
        <a href="/contacts">
          <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs h-8 shrink-0 cursor-pointer">
            <Users className="h-3.5 w-3.5 mr-1.5" />
            Go to Contacts (PG-002)
          </Button>
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Practice Phone Number Section */}
        <Card className="rounded-2xl border border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Phone className="h-5 w-5 text-emerald-500" />
              Practice Business Phone Number
            </CardTitle>
            <CardDescription className="text-xs">
              Displayed on client confirmation receipts, call summaries, and the parent portal.
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
                  placeholder="e.g. (404) 555-0199 or 1-800-555-0100"
                  className="flex-1 text-xs md:text-sm"
                  type="tel"
                />
                <Button
                  onClick={handlePhoneSave}
                  disabled={setPhoneMutation.isPending}
                  className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold px-5 cursor-pointer"
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
            <CardTitle className="text-base flex items-center gap-2">
              <Building className="h-5 w-5 text-emerald-500" />
              Company Brand & Logo Asset
            </CardTitle>
            <CardDescription className="text-xs">
              Displayed in the CRM header, sidebar, and client payment receipt experience.
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
                  className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold px-5 cursor-pointer"
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
                    className="text-xs font-semibold cursor-pointer"
                  >
                    {uploadingLogo ? "Uploading..." : "Upload Logo File"}
                  </Button>
                </div>

                {logoUrlValue && (
                  <div className="flex items-center gap-3 p-2 rounded-xl bg-muted border border-border">
                    <span className="text-xs text-muted-foreground font-semibold">Preview:</span>
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
      </div>

      {/* Practice Terminology Section */}
      <Card className="rounded-2xl border border-border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Practice Case Terminology
          </CardTitle>
          <CardDescription className="text-xs">
            Choose what Byron&apos;s CRM calls an individual client record (e.g. &quot;Student&quot;, &quot;Case&quot;, &quot;Project&quot;).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active Terminology: <span className="text-primary font-bold text-sm normal-case">{projectLabel}</span>
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
                placeholder="e.g. Advocacy File, IEP Case"
                className="flex-1 text-xs"
              />
              <Button
                onClick={handleCustomSave}
                className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold cursor-pointer"
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

      {/* Referral & Credit Program Settings */}
      <ReferralProgramSettingsCard />
    </div>
  );
}
