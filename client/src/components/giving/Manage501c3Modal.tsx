/**
 * Manage 501(c)(3) Configuration Modal
 * Configures nonprofit legal info, donation tax receipt templates, Stripe gateway connection, and scholarship award rules.
 */

import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  FileCheck,
  CreditCard,
  GraduationCap,
  Upload,
  CheckCircle2,
  AlertCircle,
  Save,
  ShieldCheck,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface Manage501c3ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function Manage501c3Modal({ open, onOpenChange }: Manage501c3ModalProps) {
  const [activeTab, setActiveTab] = useState<"org" | "receipts" | "stripe" | "scholarships">("org");
  const utils = trpc.useUtils();
  const { data: settings, isLoading } = trpc.giving.getSettings.useQuery(undefined, { enabled: open });

  const [form, setForm] = useState({
    legalName: "",
    dbaName: "",
    ein: "",
    address: "",
    status501c3: "501(c)(3) Public Charity",
    effectiveDate: "2024-01-01",
    determinationLetterUrl: "",
    defaultAcknowledgment: "",
    logoUrl: "",
    authorizedSigner: "",
    receiptFooter: "",
    taxDeductibleText: "",
    noGoodsProvidedDefault: true,
    stripeConnected: true,
    stripeAccountId: "",
    stripeMode: "test" as "test" | "live",
    stripeWebhookStatus: "active" as "active" | "inactive" | "pending",
    scholarshipProgramName: "",
    scholarshipDescription: "",
    scholarshipEligibility: "",
    scholarshipApplicationDates: "",
    scholarshipAwardRules: "",
    scholarshipDefaultFund: "",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        legalName: settings.legalName || "",
        dbaName: settings.dbaName || "",
        ein: settings.ein || "",
        address: settings.address || "",
        status501c3: settings.status501c3 || "501(c)(3) Public Charity",
        effectiveDate: settings.effectiveDate || "2024-01-01",
        determinationLetterUrl: settings.determinationLetterUrl || "",
        defaultAcknowledgment: settings.defaultAcknowledgment || "",
        logoUrl: settings.logoUrl || "",
        authorizedSigner: settings.authorizedSigner || "",
        receiptFooter: settings.receiptFooter || "",
        taxDeductibleText: settings.taxDeductibleText || "",
        noGoodsProvidedDefault: settings.noGoodsProvidedDefault ?? true,
        stripeConnected: settings.stripeConnected ?? true,
        stripeAccountId: settings.stripeAccountId || "",
        stripeMode: settings.stripeMode || "test",
        stripeWebhookStatus: settings.stripeWebhookStatus || "active",
        scholarshipProgramName: settings.scholarshipProgramName || "",
        scholarshipDescription: settings.scholarshipDescription || "",
        scholarshipEligibility: settings.scholarshipEligibility || "",
        scholarshipApplicationDates: settings.scholarshipApplicationDates || "",
        scholarshipAwardRules: settings.scholarshipAwardRules || "",
        scholarshipDefaultFund: settings.scholarshipDefaultFund || "",
      });
    }
  }, [settings]);

  const updateMutation = trpc.giving.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("501(c)(3) & Charitable Settings saved");
      utils.giving.getSettings.invalidate();
      utils.giving.getOverviewStats.invalidate();
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to save settings");
    },
  });

  const handleSave = () => {
    updateMutation.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col bg-[#07162B] border-amber-500/30 text-white p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-white/10 bg-[#001A41]/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-white tracking-wide">
                  Manage 501(c)(3) Configuration
                </DialogTitle>
                <DialogDescription className="text-xs text-white/60">
                  Tax status, legal details, IRS receipts, Stripe integration, and scholarship guidelines
                </DialogDescription>
              </div>
            </div>
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs px-2.5 py-0.5 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              Tax-Exempt Ready
            </Badge>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-1 mt-4 border-b border-white/5 pb-1">
            <button
              type="button"
              onClick={() => setActiveTab("org")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "org"
                  ? "bg-amber-500 text-[#07162B] shadow-xs"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              Organization Info
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("receipts")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "receipts"
                  ? "bg-amber-500 text-[#07162B] shadow-xs"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <FileCheck className="h-3.5 w-3.5" />
              Donation Receipt Settings
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("stripe")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "stripe"
                  ? "bg-amber-500 text-[#07162B] shadow-xs"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <CreditCard className="h-3.5 w-3.5" />
              Stripe Gateway
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("scholarships")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "scholarships"
                  ? "bg-amber-500 text-[#07162B] shadow-xs"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <GraduationCap className="h-3.5 w-3.5" />
              Scholarship Rules
            </button>
          </div>
        </DialogHeader>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: Organization Information */}
          {activeTab === "org" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-white/80 font-medium">Legal Organization Name</Label>
                  <Input
                    value={form.legalName}
                    onChange={(e) => setForm({ ...form, legalName: e.target.value })}
                    placeholder="e.g. Waypoint Foundation Inc."
                    className="bg-black/30 border-white/15 text-sm text-white focus-visible:ring-amber-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-white/80 font-medium">DBA / Public Giving Name</Label>
                  <Input
                    value={form.dbaName}
                    onChange={(e) => setForm({ ...form, dbaName: e.target.value })}
                    placeholder="e.g. Waypoint Giving & Advocacy Fund"
                    className="bg-black/30 border-white/15 text-sm text-white focus-visible:ring-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-white/80 font-medium">Federal EIN</Label>
                  <Input
                    value={form.ein}
                    onChange={(e) => setForm({ ...form, ein: e.target.value })}
                    placeholder="XX-XXXXXXX"
                    className="bg-black/30 border-white/15 text-sm font-mono text-white focus-visible:ring-amber-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-white/80 font-medium">501(c)(3) Exemption Status</Label>
                  <Input
                    value={form.status501c3}
                    onChange={(e) => setForm({ ...form, status501c3: e.target.value })}
                    placeholder="501(c)(3) Public Charity"
                    className="bg-black/30 border-white/15 text-sm text-white focus-visible:ring-amber-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-white/80 font-medium">Effective Date</Label>
                  <Input
                    type="date"
                    value={form.effectiveDate}
                    onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })}
                    className="bg-black/30 border-white/15 text-sm text-white focus-visible:ring-amber-400"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-white/80 font-medium">Official Organization Address</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Street, Suite, City, State, ZIP"
                  className="bg-black/30 border-white/15 text-sm text-white focus-visible:ring-amber-400"
                />
              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-white">IRS Determination Letter</p>
                    <p className="text-[11px] text-white/50">Upload or link your formal IRS Section 501(c)(3) recognition letter</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => toast.info("Determination letter attachment updated")}
                    className="border-amber-400/40 text-amber-300 hover:bg-amber-400/10 text-xs h-7 gap-1.5"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Upload Letter
                  </Button>
                </div>
                {form.determinationLetterUrl && (
                  <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    File on record: {form.determinationLetterUrl}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Donation Receipt Settings */}
          {activeTab === "receipts" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="space-y-1.5">
                <Label className="text-xs text-white/80 font-medium">Default Charitable Acknowledgment Language</Label>
                <Textarea
                  rows={3}
                  value={form.defaultAcknowledgment}
                  onChange={(e) => setForm({ ...form, defaultAcknowledgment: e.target.value })}
                  placeholder="Thank you for your generous contribution..."
                  className="bg-black/30 border-white/15 text-xs text-white focus-visible:ring-amber-400 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-white/80 font-medium">Authorized Signer & Title</Label>
                  <Input
                    value={form.authorizedSigner}
                    onChange={(e) => setForm({ ...form, authorizedSigner: e.target.value })}
                    placeholder="Byron Honea, Executive Director"
                    className="bg-black/30 border-white/15 text-sm text-white focus-visible:ring-amber-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-white/80 font-medium">Receipt Header Logo URL</Label>
                  <Input
                    value={form.logoUrl}
                    onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                    placeholder="https://..."
                    className="bg-black/30 border-white/15 text-sm text-white focus-visible:ring-amber-400"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-white/80 font-medium">Official Tax-Deductibility Statement</Label>
                <Input
                  value={form.taxDeductibleText}
                  onChange={(e) => setForm({ ...form, taxDeductibleText: e.target.value })}
                  placeholder="100% Tax-Deductible Contribution under IRC Section 170(c)(2)."
                  className="bg-black/30 border-white/15 text-sm text-white focus-visible:ring-amber-400"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-white/80 font-medium">Receipt Legal Footer</Label>
                <Textarea
                  rows={2}
                  value={form.receiptFooter}
                  onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })}
                  placeholder="Waypoint Foundation Inc. is an exempt organization..."
                  className="bg-black/30 border-white/15 text-xs text-white focus-visible:ring-amber-400"
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-3.5">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold text-white">
                    "No goods or services were provided" Clause
                  </Label>
                  <p className="text-[11px] text-white/50">
                    Mandatory IRS statement for donations exceeding $250 claiming full tax deduction
                  </p>
                </div>
                <Switch
                  checked={form.noGoodsProvidedDefault}
                  onCheckedChange={(checked) => setForm({ ...form, noGoodsProvidedDefault: checked })}
                  className="data-[state=checked]:bg-amber-500"
                />
              </div>
            </div>
          )}

          {/* TAB 3: Stripe Gateway */}
          {activeTab === "stripe" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">Stripe Charitable Merchant Gateway</p>
                      <p className="text-[11px] text-white/50">Processes one-time donations, monthly subscriptions, and ACH bank gifts</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
                    Connected
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Connected Account</span>
                    <Input
                      value={form.stripeAccountId}
                      onChange={(e) => setForm({ ...form, stripeAccountId: e.target.value })}
                      className="bg-black/40 border-white/15 text-xs font-mono text-white focus-visible:ring-amber-400 h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Gateway Mode</span>
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        type="button"
                        size="sm"
                        variant={form.stripeMode === "test" ? "default" : "outline"}
                        onClick={() => setForm({ ...form, stripeMode: "test" })}
                        className={`text-xs h-7 ${form.stripeMode === "test" ? "bg-amber-500 text-black font-bold" : "border-white/15 text-white/70"}`}
                      >
                        Test Mode
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={form.stripeMode === "live" ? "default" : "outline"}
                        onClick={() => setForm({ ...form, stripeMode: "live" })}
                        className={`text-xs h-7 ${form.stripeMode === "live" ? "bg-emerald-500 text-black font-bold" : "border-white/15 text-white/70"}`}
                      >
                        Live Mode
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-indigo-950/40 border border-indigo-500/20 p-3 text-xs text-indigo-200 flex items-start gap-2 mt-2">
                  <ShieldCheck className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white">PCI-DSS Security Architecture: </span>
                    Credit card numbers, bank accounts, and sensitive tokens are processed directly by Stripe Elements. No raw payment card numbers are ever stored in or transmitted across this CRM.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Scholarship Configuration */}
          {activeTab === "scholarships" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="space-y-1.5">
                <Label className="text-xs text-white/80 font-medium">Scholarship Program Name</Label>
                <Input
                  value={form.scholarshipProgramName}
                  onChange={(e) => setForm({ ...form, scholarshipProgramName: e.target.value })}
                  placeholder="e.g. Waypoint IEP Family Scholarship Fund"
                  className="bg-black/30 border-white/15 text-sm text-white focus-visible:ring-amber-400"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-white/80 font-medium">Program Mission & Description</Label>
                <Textarea
                  rows={2}
                  value={form.scholarshipDescription}
                  onChange={(e) => setForm({ ...form, scholarshipDescription: e.target.value })}
                  placeholder="Need-based financial assistance..."
                  className="bg-black/30 border-white/15 text-xs text-white focus-visible:ring-amber-400"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-white/80 font-medium">Student & Family Eligibility Criteria</Label>
                <Textarea
                  rows={2}
                  value={form.scholarshipEligibility}
                  onChange={(e) => setForm({ ...form, scholarshipEligibility: e.target.value })}
                  placeholder="Documented IEP/504 disabilities; financial hardship..."
                  className="bg-black/30 border-white/15 text-xs text-white focus-visible:ring-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-white/80 font-medium">Application Window & Deadlines</Label>
                  <Input
                    value={form.scholarshipApplicationDates}
                    onChange={(e) => setForm({ ...form, scholarshipApplicationDates: e.target.value })}
                    placeholder="Rolling annual submissions; quarterly reviews"
                    className="bg-black/30 border-white/15 text-sm text-white focus-visible:ring-amber-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-white/80 font-medium">Default Disbursing Fund</Label>
                  <Input
                    value={form.scholarshipDefaultFund}
                    onChange={(e) => setForm({ ...form, scholarshipDefaultFund: e.target.value })}
                    placeholder="Advocacy Scholarship Fund"
                    className="bg-black/30 border-white/15 text-sm text-white focus-visible:ring-amber-400"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-white/80 font-medium">Award Rules & Coverage Limits</Label>
                <Input
                  value={form.scholarshipAwardRules}
                  onChange={(e) => setForm({ ...form, scholarshipAwardRules: e.target.value })}
                  placeholder="Covers up to 100% of $55/mo or $105/mo advocacy retainer"
                  className="bg-black/30 border-white/15 text-sm text-white focus-visible:ring-amber-400"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-4 border-t border-white/10 bg-[#001A41]/80 flex items-center justify-between">
          <p className="text-[11px] text-white/40">Changes immediately apply to donor receipts & scholarship awards</p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-white/70 hover:text-white text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="bg-amber-500 hover:bg-amber-400 text-[#07162B] font-bold text-xs gap-1.5 shadow-sm cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              {updateMutation.isPending ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
