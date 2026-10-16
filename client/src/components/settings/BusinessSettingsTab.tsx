import React, { useState, useEffect } from "react";
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  Globe,
  UploadCloud,
  CheckCircle,
  Copy,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Info,
  RefreshCw,
  FileText,
  Laptop,
  Receipt,
  Scale,
  Send,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import VoiceInput from "@/components/VoiceInput";
import PageIdBadge from "@/components/PageIdBadge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export interface BusinessSettingsTabProps {
  onPhoneUpdated?: (phone: string) => void;
  onOpenReceipts?: () => void;
  onOpenPortal?: () => void;
}

export function BusinessSettingsTab({
  onPhoneUpdated,
  onOpenReceipts,
  onOpenPortal,
}: BusinessSettingsTabProps) {
  const utils = trpc.useUtils();

  // Queries
  const {
    data: profile,
    isLoading,
    refetch: refetchProfile,
  } = trpc.system.getBusinessProfile.useQuery();

  // Local Form State
  const [companyName, setCompanyName] = useState("Waypoint Advocates");
  const [receiptDisplayName, setReceiptDisplayName] = useState("WAYPOINT ADVOCATES");
  const [phone, setPhone] = useState("(404) 919-8664");
  const [email, setEmail] = useState("clientcare@waypointadvocates.com");
  const [replyToEmail, setReplyToEmail] = useState("billing@waypointadvocates.com");
  const [street, setStreet] = useState("PO Box 724944");
  const [city, setCity] = useState("Atlanta");
  const [stateVal, setStateVal] = useState("GA");
  const [zip, setZip] = useState("31139");
  const [country, setCountry] = useState("United States");
  const [website, setWebsite] = useState("https://waypointadvocates.com");
  const [supportContactInfo, setSupportContactInfo] = useState(
    "Questions? Reach out to clientcare@waypointadvocates.com or call (404) 919-8664"
  );
  const [showBusinessAddress, setShowBusinessAddress] = useState(true);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync initial query state
  useEffect(() => {
    if (profile) {
      if (profile.companyName) setCompanyName(profile.companyName);
      if (profile.receiptDisplayName) setReceiptDisplayName(profile.receiptDisplayName);
      if (profile.phone) setPhone(profile.phone);
      if (profile.email) setEmail(profile.email);
      if (profile.replyToEmail) setReplyToEmail(profile.replyToEmail);
      if (profile.street) setStreet(profile.street);
      if (profile.city) setCity(profile.city);
      if (profile.state) setStateVal(profile.state);
      if (profile.zip) setZip(profile.zip);
      if (profile.country) setCountry(profile.country);
      if (profile.website) setWebsite(profile.website);
      if (profile.supportContactInfo) setSupportContactInfo(profile.supportContactInfo);
      if (profile.showBusinessAddress !== undefined) setShowBusinessAddress(profile.showBusinessAddress);
      if (profile.logoUrl !== undefined) setLogoUrl(profile.logoUrl);
      setHasChanges(false);
    }
  }, [profile]);

  // Assembled full address preview
  const assembledAddress = [
    street.trim(),
    city.trim(),
    [stateVal.trim(), zip.trim()].filter(Boolean).join(" "),
    country.trim() && country.trim() !== "United States" ? country.trim() : null,
  ]
    .filter(Boolean)
    .join(", ");

  // Mutation
  const updateMutation = trpc.system.updateBusinessProfile.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "✓ Business settings updated and consolidated");
      refetchProfile();
      utils.system.getBusinessPhone.invalidate();
      utils.system.getCompanyLogo.invalidate();
      utils.receipts.getSettings.invalidate();
      if (phone) {
        onPhoneUpdated?.(phone);
      }
      setHasChanges(false);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to save business settings");
    },
  });

  const handleFieldChange = (setter: React.Dispatch<React.SetStateAction<any>>, val: any) => {
    setter(val);
    setHasChanges(true);
  };

  const handleSave = () => {
    updateMutation.mutate({
      companyName,
      receiptDisplayName,
      phone,
      email,
      replyToEmail,
      street,
      city,
      state: stateVal,
      zip,
      country,
      address: assembledAddress,
      website,
      supportContactInfo,
      showBusinessAddress,
      logoUrl,
    });
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
        setLogoUrl(data.url);
        setHasChanges(true);
        toast.success("Logo uploaded. Click 'Save Business Settings' to apply practice-wide.");
      }
    } catch {
      toast.error("Failed to upload logo image");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard`);
  };

  return (
    <div className="space-y-6">
      {/* ── HEADER BANNER & IDENTITY SUMMARY ──────────────────────────────── */}
      <div className="rounded-xl border border-[#3A2C18] bg-[#05142B]/95 p-5 md:p-6 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-[#020A17] border border-[#3A2C18] p-3.5 text-[#FFE394] shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
              <Building2 className="h-7 w-7 text-[#DFBE77]" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl md:text-2xl font-serif font-black text-[#FFF4D4]">
                  Business Settings & Practice Profile
                </h2>
                <Badge className="bg-[#DFBE77]/15 text-[#FFE394] border-[#FFE394]/30 text-[10px] font-bold">
                  Consolidated Headquarters
                </Badge>
                <PageIdBadge id="PG-024-BIZ" name="Business Profile & Contact Settings" />
              </div>
              <p className="text-xs md:text-sm text-[#C6B697] max-w-2xl font-sans">
                Authoritative headquarters records for Waypoint Advocates. Address, phone, email, and branding saved here automatically consolidate and synchronize across payment receipts, client intake forms, parent portals, and state complaint documents.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center shrink-0">
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending || !hasChanges}
              className={`font-bold text-xs h-10 px-6 shadow-[0_4px_16px_rgba(0,0,0,0.8)] border cursor-pointer transition-all ${
                hasChanges
                  ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border-[#FFE394] hover:brightness-105 animate-pulse"
                  : "bg-[#020A17] text-[#C6B697] border-[#3A2C18] hover:bg-[#05142B] hover:text-[#FFF4D4]"
              }`}
            >
              {updateMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : hasChanges ? (
                <>
                  <Sparkles className="h-4 w-4 mr-2 text-[#07162B]" />
                  Save Business Settings
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2 text-emerald-400" />
                  All Settings Synced
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Live Quick Status Bar */}
        <div className="mt-4 pt-4 border-t border-[#3A2C18]/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="bg-[#020A17]/80 border border-[#3A2C18]/60 rounded-lg p-2.5 flex items-center gap-2.5">
            <Phone className="h-4 w-4 text-emerald-400 shrink-0" />
            <div className="truncate">
              <div className="text-[10px] text-[#A69371] uppercase font-bold tracking-wider">Practice Phone</div>
              <div className="font-mono font-bold text-[#FFF4D4] truncate">{phone || "Not configured"}</div>
            </div>
          </div>

          <div className="bg-[#020A17]/80 border border-[#3A2C18]/60 rounded-lg p-2.5 flex items-center gap-2.5">
            <Mail className="h-4 w-4 text-sky-400 shrink-0" />
            <div className="truncate">
              <div className="text-[10px] text-[#A69371] uppercase font-bold tracking-wider">Client Care Email</div>
              <div className="font-medium text-[#FFF4D4] truncate">{email || "Not configured"}</div>
            </div>
          </div>

          <div className="bg-[#020A17]/80 border border-[#3A2C18]/60 rounded-lg p-2.5 flex items-center gap-2.5">
            <MapPin className="h-4 w-4 text-amber-400 shrink-0" />
            <div className="truncate">
              <div className="text-[10px] text-[#A69371] uppercase font-bold tracking-wider">Official Address</div>
              <div className="font-medium text-[#FFF4D4] truncate">{assembledAddress || "Atlanta, GA"}</div>
            </div>
          </div>

          <div className="bg-[#020A17]/80 border border-[#3A2C18]/60 rounded-lg p-2.5 flex items-center gap-2.5">
            <Globe className="h-4 w-4 text-[#DFBE77] shrink-0" />
            <div className="truncate">
              <div className="text-[10px] text-[#A69371] uppercase font-bold tracking-wider">Practice Website</div>
              <div className="font-medium text-[#FFF4D4] truncate">{website || "Not configured"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2-COLUMN MAIN CONTENT WORKSPACE ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* COLUMN 1: Contact Channels & Physical Address */}
        <div className="space-y-6">
          {/* Card 1: Consolidated Contact Channels */}
          <Card className="rounded-xl border border-[#3A2C18] bg-[#05142B]/90 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]">
            <CardHeader className="pb-4 border-b border-[#3A2C18]/60">
              <CardTitle className="text-base font-serif font-bold text-[#FFF4D4] flex items-center gap-2">
                <Phone className="h-5 w-5 text-emerald-400" />
                Consolidated Contact Channels
              </CardTitle>
              <CardDescription className="text-xs text-[#C6B697] mt-0.5">
                Centralized telephone and email contact points. Updating here instantly aligns all forms, receipts, and portal touchpoints.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              {/* Practice Business Phone */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#A69371] flex items-center gap-1.5">
                    Primary Business Phone Number
                    <Badge variant="outline" className="text-[9px] bg-emerald-950/60 text-emerald-400 border-emerald-500/30">
                      Authoritative
                    </Badge>
                  </label>
                  {phone && (
                    <button
                      onClick={() => handleCopy(phone, "phone number")}
                      className="text-[11px] text-[#C6B697] hover:text-[#FFE394] flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="h-3 w-3" />
                      Copy
                    </button>
                  )}
                </div>
                <VoiceInput
                  value={phone}
                  onChange={(e) => handleFieldChange(setPhone, e.target.value)}
                  placeholder="e.g. (404) 919-8664 or (404) 555-0100"
                  className="text-xs md:text-sm bg-[#020A17] border border-[#3A2C18] text-[#FFF4D4] focus:border-[#C5A059]"
                  type="tel"
                />
                <p className="text-[11px] text-[#A69371]">
                  Synchronized with the <strong className="text-[#FFE394]">Save Our Number</strong> public banner, client receipts, parent portal header, and Quo telephony.
                </p>
              </div>

              {/* Primary Business / Client Care Email */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#A69371]">
                    Primary Client Care Email
                  </label>
                  {email && (
                    <button
                      onClick={() => handleCopy(email, "client care email")}
                      className="text-[11px] text-[#C6B697] hover:text-[#FFE394] flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="h-3 w-3" />
                      Copy
                    </button>
                  )}
                </div>
                <Input
                  value={email}
                  onChange={(e) => handleFieldChange(setEmail, e.target.value)}
                  placeholder="clientcare@waypointadvocates.com"
                  className="text-xs md:text-sm bg-[#020A17] border border-[#3A2C18] text-[#FFF4D4] focus:border-[#C5A059]"
                  type="email"
                />
                <p className="text-[11px] text-[#A69371]">
                  Official correspondence email for families, IEP document submissions, and general practice inquiries.
                </p>
              </div>

              {/* Billing & Reply-To Email */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#A69371]">
                  Billing & Receipt Reply-To Email
                </label>
                <Input
                  value={replyToEmail}
                  onChange={(e) => handleFieldChange(setReplyToEmail, e.target.value)}
                  placeholder="billing@waypointadvocates.com"
                  className="text-xs md:text-sm bg-[#020A17] border border-[#3A2C18] text-[#FFF4D4] focus:border-[#C5A059]"
                  type="email"
                />
                <p className="text-[11px] text-[#A69371]">
                  Destination for client replies to automated payment confirmations and invoice emails.
                </p>
              </div>

              {/* Support & Contact Instructions Note */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#A69371]">
                  Public Support & Contact Footer Notice
                </label>
                <Input
                  value={supportContactInfo}
                  onChange={(e) => handleFieldChange(setSupportContactInfo, e.target.value)}
                  placeholder="Questions? Reach out to clientcare@waypointadvocates.com or call (404) 919-8664"
                  className="text-xs md:text-sm bg-[#020A17] border border-[#3A2C18] text-[#FFF4D4] focus:border-[#C5A059]"
                />
                <p className="text-[11px] text-[#A69371]">
                  Appears at the bottom of public intake forms and printable PDF receipts.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Physical & Mailing Address */}
          <Card className="rounded-xl border border-[#3A2C18] bg-[#05142B]/90 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]">
            <CardHeader className="pb-4 border-b border-[#3A2C18]/60">
              <CardTitle className="text-base font-serif font-bold text-[#FFF4D4] flex items-center gap-2">
                <MapPin className="h-5 w-5 text-amber-400" />
                Practice Physical & Mailing Address
              </CardTitle>
              <CardDescription className="text-xs text-[#C6B697] mt-0.5">
                Official practice location and P.O. Box used for legal notices, formal state complaints, and receipts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              {/* Street / P.O. Box */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#A69371]">
                  Street Address or P.O. Box
                </label>
                <Input
                  value={street}
                  onChange={(e) => handleFieldChange(setStreet, e.target.value)}
                  placeholder="PO Box 724944"
                  className="text-xs md:text-sm bg-[#020A17] border border-[#3A2C18] text-[#FFF4D4] focus:border-[#C5A059]"
                />
              </div>

              {/* City, State, ZIP in 3 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#A69371]">
                    City
                  </label>
                  <Input
                    value={city}
                    onChange={(e) => handleFieldChange(setCity, e.target.value)}
                    placeholder="Atlanta"
                    className="text-xs bg-[#020A17] border border-[#3A2C18] text-[#FFF4D4] focus:border-[#C5A059]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#A69371]">
                    State / Province
                  </label>
                  <Input
                    value={stateVal}
                    onChange={(e) => handleFieldChange(setStateVal, e.target.value)}
                    placeholder="GA"
                    className="text-xs bg-[#020A17] border border-[#3A2C18] text-[#FFF4D4] focus:border-[#C5A059]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#A69371]">
                    Postal / ZIP Code
                  </label>
                  <Input
                    value={zip}
                    onChange={(e) => handleFieldChange(setZip, e.target.value)}
                    placeholder="31139"
                    className="text-xs bg-[#020A17] border border-[#3A2C18] text-[#FFF4D4] focus:border-[#C5A059]"
                  />
                </div>
              </div>

              {/* Country */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold uppercase tracking-wider text-[#A69371]">
                  Country
                </label>
                <Input
                  value={country}
                  onChange={(e) => handleFieldChange(setCountry, e.target.value)}
                  placeholder="United States"
                  className="text-xs bg-[#020A17] border border-[#3A2C18] text-[#FFF4D4] focus:border-[#C5A059]"
                />
              </div>

              {/* Formatted Address Preview Box */}
              <div className="mt-3 bg-[#020A17] border border-[#3A2C18] rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#DFBE77] flex items-center gap-1.5">
                    <CheckCircle className="h-3 w-3 text-emerald-400" />
                    Consolidated Single-Line Format
                  </span>
                  {assembledAddress && (
                    <button
                      onClick={() => handleCopy(assembledAddress, "formatted address")}
                      className="text-[11px] text-[#C6B697] hover:text-[#FFE394] flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="h-3 w-3" />
                      Copy Address
                    </button>
                  )}
                </div>
                <div className="text-xs font-mono font-medium text-[#FFF4D4] bg-[#05142B]/90 p-2.5 rounded-lg border border-[#3A2C18]/60">
                  {assembledAddress || "No address entered yet"}
                </div>
                <p className="text-[11px] text-[#A69371]">
                  This exact format is automatically pre-filled into State Formal Complaints (GaDOE), cover sheets, and certified mail headers.
                </p>
              </div>

              {/* Toggle: Show Address on Receipts */}
              <div className="flex items-center justify-between pt-2 border-t border-[#3A2C18]/60">
                <div className="space-y-0.5 pr-4">
                  <div className="text-xs font-bold text-[#FFF4D4]">Display Address on Receipts & Invoices</div>
                  <div className="text-[11px] text-[#A69371]">
                    When enabled, prints the official business address in the payment receipt header block.
                  </div>
                </div>
                <Switch
                  checked={showBusinessAddress}
                  onCheckedChange={(val) => handleFieldChange(setShowBusinessAddress, val)}
                  className="data-[state=checked]:bg-[#DFBE77]"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* COLUMN 2: Legal Entity, Digital Presence, Logo & Propagation Matrix */}
        <div className="space-y-6">
          {/* Card 3: Legal & Brand Identity */}
          <Card className="rounded-xl border border-[#3A2C18] bg-[#05142B]/90 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]">
            <CardHeader className="pb-4 border-b border-[#3A2C18]/60">
              <CardTitle className="text-base font-serif font-bold text-[#FFF4D4] flex items-center gap-2">
                <Scale className="h-5 w-5 text-[#DFBE77]" />
                Practice Entity & Digital Presence
              </CardTitle>
              <CardDescription className="text-xs text-[#C6B697] mt-0.5">
                Official entity naming, website link, and lead advocate designation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#A69371]">
                    Legal Practice Name
                  </label>
                  <Input
                    value={companyName}
                    onChange={(e) => handleFieldChange(setCompanyName, e.target.value)}
                    placeholder="Waypoint Advocates"
                    className="text-xs md:text-sm bg-[#020A17] border border-[#3A2C18] text-[#FFF4D4] focus:border-[#C5A059]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#A69371]">
                    Display / Header Name
                  </label>
                  <Input
                    value={receiptDisplayName}
                    onChange={(e) => handleFieldChange(setReceiptDisplayName, e.target.value)}
                    placeholder="WAYPOINT ADVOCATES"
                    className="text-xs md:text-sm bg-[#020A17] border border-[#3A2C18] text-[#FFF4D4] focus:border-[#C5A059]"
                  />
                </div>
              </div>

              {/* Official Practice Website */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#A69371]">
                    Official Practice Website
                  </label>
                  {website && (
                    <a
                      href={website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-[#DFBE77] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      Visit Site <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <Input
                  value={website}
                  onChange={(e) => handleFieldChange(setWebsite, e.target.value)}
                  placeholder="https://waypointadvocates.com"
                  className="text-xs md:text-sm bg-[#020A17] border border-[#3A2C18] text-[#FFF4D4] focus:border-[#C5A059]"
                />
              </div>

              {/* Lead Special Education Advocate Designation */}
              <div className="bg-[#020A17]/80 border border-[#3A2C18]/60 rounded-xl p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#DFBE77]">
                    Lead Advocate & Practice Owner
                  </span>
                  <Badge variant="outline" className="text-[9px] bg-emerald-950/60 text-emerald-400 border-emerald-500/30">
                    Compliant (Rule F)
                  </Badge>
                </div>
                <div className="font-serif font-bold text-sm text-[#FFF4D4]">
                  Byron Honea
                </div>
                <p className="text-[11px] text-[#C6B697]">
                  Lead Special Education Advocate & Practice Owner (Atlanta, GA). State complaint forms strictly enforce legal first and last name in complainant fields.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Company Logo & Visual Assets */}
          <Card className="rounded-xl border border-[#3A2C18] bg-[#05142B]/90 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]">
            <CardHeader className="pb-4 border-b border-[#3A2C18]/60">
              <CardTitle className="text-base font-serif font-bold text-[#FFF4D4] flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-[#FFE394]" />
                Company Logo & Visual Assets
              </CardTitle>
              <CardDescription className="text-xs text-[#C6B697] mt-0.5">
                Used in receipts, email headers, state complaint cover sheets, and client portal navigation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Logo Preview Tile */}
                <div className="w-24 h-24 rounded-xl bg-[#020A17] border border-[#3A2C18] flex items-center justify-center p-2 overflow-hidden shadow-inner shrink-0">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Waypoint Advocates Logo"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <div className="text-center text-[#A69371] text-[11px] flex flex-col items-center">
                      <Building2 className="h-6 w-6 text-[#3A2C18] mb-1" />
                      <span>No Logo</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 flex-1 w-full">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#A69371]">
                    Logo Image URL
                  </label>
                  <Input
                    value={logoUrl || ""}
                    onChange={(e) => handleFieldChange(setLogoUrl, e.target.value)}
                    placeholder="https://... or upload below"
                    className="text-xs bg-[#020A17] border border-[#3A2C18] text-[#FFF4D4] focus:border-[#C5A059]"
                  />
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#020A17] border border-[#3A2C18] text-xs text-[#FFF4D4] hover:bg-[#07162B] hover:border-[#DFBE77] transition-all">
                      <UploadCloud className="h-3.5 w-3.5 text-[#DFBE77]" />
                      <span>{uploadingLogo ? "Uploading..." : "Upload New Image"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo}
                        className="hidden"
                      />
                    </label>
                    {logoUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFieldChange(setLogoUrl, null)}
                        className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 h-8 px-2"
                      >
                        Remove Logo
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 5: Consolidation & Propagation Matrix */}
          <Card className="rounded-xl border border-[#3A2C18] bg-[#05142B]/90 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]">
            <CardHeader className="pb-3 border-b border-[#3A2C18]/60">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#DFBE77] flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                Live Consolidation Matrix
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-4 text-xs text-[#C6B697]">
              <p className="text-[11px] leading-relaxed">
                Changes saved in this tab automatically consolidate across all Waypoint engines:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <div className="bg-[#020A17]/80 border border-[#3A2C18]/60 rounded-lg p-2.5 flex items-start gap-2">
                  <Receipt className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#FFF4D4] block font-sans">Payment Receipts (PG-024-REC)</strong>
                    <span className="text-[11px] text-[#A69371]">Address, phone, email & PDF receipt header</span>
                  </div>
                </div>

                <div className="bg-[#020A17]/80 border border-[#3A2C18]/60 rounded-lg p-2.5 flex items-start gap-2">
                  <FileText className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#FFF4D4] block font-sans">Lead Forms & Intake (PG-012)</strong>
                    <span className="text-[11px] text-[#A69371]">"Save Our Number" banner & support email</span>
                  </div>
                </div>

                <div className="bg-[#020A17]/80 border border-[#3A2C18]/60 rounded-lg p-2.5 flex items-start gap-2">
                  <Scale className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#FFF4D4] block font-sans">State Complaints (PG-020)</strong>
                    <span className="text-[11px] text-[#A69371]">Complainant address, phone & certified delivery</span>
                  </div>
                </div>

                <div className="bg-[#020A17]/80 border border-[#3A2C18]/60 rounded-lg p-2.5 flex items-start gap-2">
                  <Laptop className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#FFF4D4] block font-sans">Client Portal (PG-023)</strong>
                    <span className="text-[11px] text-[#A69371]">Contact bar, help links, and practice phone</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── FLOATING / BOTTOM STICKY SAVE BAR ─────────────────────────────── */}
      {hasChanges && (
        <div className="sticky bottom-4 z-40 bg-[#05142B]/95 border border-[#DFBE77] rounded-xl p-4 shadow-[0_12px_32px_rgba(0,0,0,0.9)] flex items-center justify-between gap-4 animate-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#DFBE77]/20 text-[#FFE394]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#FFF4D4]">You have unsaved business settings changes</div>
              <div className="text-xs text-[#C6B697]">
                Saving will consolidate address, email, and phone across all CRM modules.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (profile) {
                  setCompanyName(profile.companyName || "Waypoint Advocates");
                  setReceiptDisplayName(profile.receiptDisplayName || "WAYPOINT ADVOCATES");
                  setPhone(profile.phone || "(404) 919-8664");
                  setEmail(profile.email || "clientcare@waypointadvocates.com");
                  setReplyToEmail(profile.replyToEmail || "billing@waypointadvocates.com");
                  setStreet(profile.street || "PO Box 724944");
                  setCity(profile.city || "Atlanta");
                  setStateVal(profile.state || "GA");
                  setZip(profile.zip || "31139");
                  setCountry(profile.country || "United States");
                  setWebsite(profile.website || "https://waypointadvocates.com");
                  setSupportContactInfo(profile.supportContactInfo || "");
                  setShowBusinessAddress(profile.showBusinessAddress !== undefined ? profile.showBusinessAddress : true);
                  setLogoUrl(profile.logoUrl || null);
                  setHasChanges(false);
                  toast.info("Changes reverted to saved profile");
                }
              }}
              className="text-xs border-[#3A2C18] text-[#C6B697] hover:text-[#FFF4D4] hover:bg-[#020A17]"
            >
              Discard Changes
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-9 px-5 shadow-[0_4px_16px_rgba(0,0,0,0.8)] border border-[#FFE394] hover:brightness-105 cursor-pointer"
            >
              {updateMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
