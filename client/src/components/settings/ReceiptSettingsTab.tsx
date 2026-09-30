import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Settings2,
  Printer,
  FileText,
  Mail,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Smartphone,
  Monitor,
  Send,
  Eye,
  CreditCard,
  Hash,
  Building,
  ShieldAlert,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { WaypointReceiptExperience, TransactionReceiptData } from "../receipts/WaypointReceiptExperience";
import { WaypointPrintableReceipt, PrintableReceiptData } from "../receipts/WaypointPrintableReceipt";

type PreviewScenario = "enrollment" | "recurring" | "standalone" | "partial_refund" | "full_refund";

const SAMPLE_SCENARIOS: Record<PreviewScenario, TransactionReceiptData> = {
  enrollment: {
    receiptNumber: "WP-001284",
    serviceName: "Anchor Advocacy",
    planName: "12-Month Advocacy Plan",
    transactionType: "enrollment",
    amountCents: 10500,
    currency: "usd",
    status: "PAID",
    paymentMethodBrand: "Visa",
    paymentMethodLast4: "2986",
    paidAt: new Date("2026-09-29T11:24:00"),
    nextPaymentDate: new Date("2026-10-29T11:24:00"),
    nextPaymentAmountCents: 10500,
    clientName: "Jane Smith",
    clientEmail: "jane.smith@example.com",
    studentName: "Leo Smith",
    caseId: "CASE-2026-042",
    stripePaymentIntentId: "pi_3N9sample81001",
  },
  recurring: {
    receiptNumber: "WP-001285",
    serviceName: "Monthly Case Retainer",
    planName: "Comprehensive Representation Retainer",
    transactionType: "recurring",
    amountCents: 10500,
    currency: "usd",
    status: "PAID",
    paymentMethodBrand: "Mastercard",
    paymentMethodLast4: "4412",
    paidAt: new Date(),
    nextPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    nextPaymentAmountCents: 10500,
    clientName: "Marcus Johnson",
    clientEmail: "marcus.j@example.com",
    studentName: "Maya Johnson",
    caseId: "CASE-2026-019",
    stripePaymentIntentId: "pi_3N9sample81002",
  },
  standalone: {
    receiptNumber: "WP-001286",
    serviceName: "Comprehensive IEP Document Review",
    planName: "Special Education Independent Evaluation Review",
    transactionType: "standalone",
    amountCents: 25000,
    currency: "usd",
    status: "PAID",
    paymentMethodBrand: "Amex",
    paymentMethodLast4: "1004",
    paidAt: new Date(),
    nextPaymentDate: null,
    nextPaymentAmountCents: null,
    clientName: "Sarah Davis",
    clientEmail: "sarah.davis@example.com",
    studentName: "Eli Davis",
    caseId: "CASE-2026-077",
    stripePaymentIntentId: "pi_3N9sample81003",
  },
  partial_refund: {
    receiptNumber: "WP-001287",
    serviceName: "Anchor Advocacy",
    planName: "12-Month Advocacy Plan",
    transactionType: "enrollment",
    amountCents: 10500,
    currency: "usd",
    status: "PARTIALLY_REFUNDED",
    paymentMethodBrand: "Visa",
    paymentMethodLast4: "2986",
    paidAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    refundAmountCents: 3500,
    refundReason: "Resolution conference adjustment",
    nextPaymentDate: new Date(Date.now() + 27 * 24 * 60 * 60 * 1000),
    nextPaymentAmountCents: 10500,
    clientName: "Jane Smith",
    clientEmail: "jane.smith@example.com",
    studentName: "Leo Smith",
    caseId: "CASE-2026-042",
    stripePaymentIntentId: "pi_3N9sample81004",
  },
  full_refund: {
    receiptNumber: "WP-001288",
    serviceName: "Anchor Advocacy",
    planName: "12-Month Advocacy Plan",
    transactionType: "enrollment",
    amountCents: 10500,
    currency: "usd",
    status: "REFUNDED",
    paymentMethodBrand: "Visa",
    paymentMethodLast4: "2986",
    paidAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    refundAmountCents: 10500,
    refundReason: "Full refund within satisfaction guarantee",
    nextPaymentDate: null,
    nextPaymentAmountCents: null,
    clientName: "Jane Smith",
    clientEmail: "jane.smith@example.com",
    studentName: "Leo Smith",
    caseId: "CASE-2026-042",
    stripePaymentIntentId: "pi_3N9sample81005",
  },
};

export interface ReceiptSettingsTabProps {
  onPhoneUpdated?: (phone: string) => void;
}

export const ReceiptSettingsTab: React.FC<ReceiptSettingsTabProps> = ({ onPhoneUpdated }) => {
  const utils = trpc.useUtils();
  // Query server settings
  const { data: serverSettings, refetch } = trpc.receipts.getSettings.useQuery();
  const { data: systemTests, refetch: refetchTests } = trpc.receipts.runSystemTest.useQuery();
  const { data: recentTransactions } = trpc.receipts.listRecent.useQuery({ limit: 5 });

  const updateMutation = trpc.receipts.updateSettings.useMutation({
    onSuccess: (_, variables) => {
      toast.success("✓ Receipt settings saved successfully");
      refetch();
      refetchTests();
      if (variables.businessPhone !== undefined) {
        utils.system.getBusinessPhone.setData(undefined, { phone: variables.businessPhone || null });
        utils.system.getBusinessPhone.invalidate();
        onPhoneUpdated?.(variables.businessPhone || "");
      }
    },
    onError: (err) => {
      toast.error(err.message || "Failed to save receipt settings");
    },
  });

  const testPaymentMutation = trpc.receipts.testStripePayment.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      refetch();
      refetchTests();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to simulate Stripe test payment");
    },
  });

  const sendTestEmailMutation = trpc.receipts.sendTestEmail.useMutation({
    onSuccess: (res) => {
      setShowTestEmailModal(false);
      toast.success(res.message);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to send test email");
    },
  });

  // Local form state
  const [form, setForm] = useState({
    receiptExperienceEnabled: 1,
    paymentSuccessAnimation: 1,
    receiptPrinterAnimation: 1,
    completionHeadline: "You're officially aboard.",
    completionSupportingMessage: "Your Waypoint advocacy plan is active.",
    completionButtonText: "Continue to Onboarding →",
    completionButtonUrl: "/portal",
    companyName: "Waypoint Advocates",
    receiptDisplayName: "WAYPOINT ADVOCATES",
    businessEmail: "billing@waypointadvocates.com",
    businessPhone: "(404) 555-0100",
    businessAddress: "Atlanta, GA",
    website: "https://waypointadvocates.com",
    receiptFooterMessage: "Thank you for trusting Waypoint Advocates with your child's educational journey.",
    supportContactInfo: "Questions? Reach out to support@waypointadvocates.com",
    showPaymentMethod: 1,
    showNextPaymentDate: 1,
    showPlanServiceName: 1,
    showReceiptNumber: 1,
    showBusinessAddress: 0,
    showInternalTxRef: 0,
    receiptPrefix: "WP-",
    nextReceiptSequence: 1285,
    autoSendEmail: 1,
    senderDisplayName: "Waypoint Advocates",
    replyToEmail: "billing@waypointadvocates.com",
    attachPdfReceipt: 1,
    includeViewReceiptButton: 1,
    stripeReceiptEmailEnabled: 0,
  });

  // Sync from server
  useEffect(() => {
    if (serverSettings) {
      setForm((prev) => ({
        ...prev,
        ...serverSettings,
      }));
    }
  }, [serverSettings]);

  // Preview interactive controls
  const [scenario, setScenario] = useState<PreviewScenario>("enrollment");
  const [deviceView, setDeviceView] = useState<"desktop" | "mobile">("desktop");
  const [testAnimStep, setTestAnimStep] = useState<"completed" | "processing">("completed");

  // Output preview modals
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showTestEmailModal, setShowTestEmailModal] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState(form.businessEmail);

  const activeSampleTx = SAMPLE_SCENARIOS[scenario];

  const handleSave = () => {
    updateMutation.mutate(form);
  };

  const handleRunExperienceTest = () => {
    setTestAnimStep("processing");
    toast.info("▶ Launching full visual payment sequence in TEST MODE...");
  };

  const handleResetPreview = () => {
    setTestAnimStep("completed");
    setScenario("enrollment");
    toast.info("Preview reset to standard enrollment");
  };

  return (
    <div className="space-y-10">
      {/* ── HEADER BANNER ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-[#06172F] via-[#000820] to-[#0a2347] p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Administrative Control Center
            </span>
            <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
              PG-024-REC
            </span>
          </div>
          <h2 className="text-2xl font-serif font-bold text-white tracking-wide">
            Waypoint Payment Receipt Experience
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Configure, preview, and test the nautical Waypoint payment confirmation terminal. Controls client portal receipts, PDF generation, email delivery, and Stripe transaction linkage.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleRunExperienceTest}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold shadow-lg shadow-amber-500/20 gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            Test Experience
          </Button>

          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 cursor-pointer"
          >
            {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Save Changes
          </Button>
        </div>
      </div>

      {/* ── 2-COLUMN LAYOUT: SETTINGS TABS (LEFT) & LIVE INTERACTIVE PREVIEW (RIGHT) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* ── LEFT COLUMN: ADMINISTRATIVE CONTROLS (7 COLS) ────────────────── */}
        <div className="xl:col-span-6 space-y-6">
          {/* 1. RECEIPT EXPERIENCE SETTINGS */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-base text-foreground">1. Receipt Experience</h3>
              </div>
              <span className="text-xs text-muted-foreground font-medium">Visual Presentation</span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-foreground">Receipt Experience</div>
                  <div className="text-xs text-muted-foreground">Display the custom Waypoint receipt terminal instead of generic confirmations</div>
                </div>
                <Switch
                  checked={form.receiptExperienceEnabled === 1}
                  onCheckedChange={(val) => setForm({ ...form, receiptExperienceEnabled: val ? 1 : 0 })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-foreground">Payment Success Animation</div>
                  <div className="text-xs text-muted-foreground">Show "Payment Approved ✓" confirmation flash before receipt feeds</div>
                </div>
                <Switch
                  checked={form.paymentSuccessAnimation === 1}
                  onCheckedChange={(val) => setForm({ ...form, paymentSuccessAnimation: val ? 1 : 0 })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-foreground">Receipt Printer Animation</div>
                  <div className="text-xs text-muted-foreground">Smooth physical paper feeding animation downward from the terminal slit</div>
                </div>
                <Switch
                  checked={form.receiptPrinterAnimation === 1}
                  onCheckedChange={(val) => setForm({ ...form, receiptPrinterAnimation: val ? 1 : 0 })}
                />
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold text-foreground">Advocacy Enrollment Headline</label>
                <Input
                  value={form.completionHeadline}
                  onChange={(e) => setForm({ ...form, completionHeadline: e.target.value })}
                  placeholder="You're officially aboard."
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Supporting Message</label>
                <Input
                  value={form.completionSupportingMessage}
                  onChange={(e) => setForm({ ...form, completionSupportingMessage: e.target.value })}
                  placeholder="Your Waypoint advocacy plan is active."
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Continue Button Text</label>
                  <Input
                    value={form.completionButtonText}
                    onChange={(e) => setForm({ ...form, completionButtonText: e.target.value })}
                    placeholder="Continue to Onboarding →"
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Button Destination URL</label>
                  <Input
                    value={form.completionButtonUrl}
                    onChange={(e) => setForm({ ...form, completionButtonUrl: e.target.value })}
                    placeholder="/portal"
                    className="text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. RECEIPT INFORMATION & VISIBILITY TOGGLES */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-500" />
                <h3 className="font-bold text-base text-foreground">2. Customer-Facing Business Info</h3>
              </div>
              <span className="text-xs text-muted-foreground font-medium">Letterhead & Contact</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Company Name</label>
                <Input
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Receipt Display Name</label>
                <Input
                  value={form.receiptDisplayName}
                  onChange={(e) => setForm({ ...form, receiptDisplayName: e.target.value })}
                  className="text-xs uppercase"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Business Billing Email</label>
                <Input
                  value={form.businessEmail}
                  onChange={(e) => setForm({ ...form, businessEmail: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Business Phone</label>
                <Input
                  value={form.businessPhone}
                  onChange={(e) => setForm({ ...form, businessPhone: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="font-semibold text-foreground">Business Address (Optional)</label>
                <Input
                  value={form.businessAddress || ""}
                  onChange={(e) => setForm({ ...form, businessAddress: e.target.value })}
                  placeholder="e.g. Atlanta, GA"
                  className="text-xs"
                />
              </div>
            </div>

            {/* Field Visibility Checkboxes */}
            <div className="border-t border-border pt-3 space-y-2">
              <span className="text-xs font-bold text-foreground block mb-2">Display Preferences on Receipt:</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                  <input
                    type="checkbox"
                    checked={form.showPaymentMethod === 1}
                    onChange={(e) => setForm({ ...form, showPaymentMethod: e.target.checked ? 1 : 0 })}
                    className="rounded border-slate-300 text-blue-600"
                  />
                  <span>Show payment method</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                  <input
                    type="checkbox"
                    checked={form.showNextPaymentDate === 1}
                    onChange={(e) => setForm({ ...form, showNextPaymentDate: e.target.checked ? 1 : 0 })}
                    className="rounded border-slate-300 text-blue-600"
                  />
                  <span>Show next payment date</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                  <input
                    type="checkbox"
                    checked={form.showPlanServiceName === 1}
                    onChange={(e) => setForm({ ...form, showPlanServiceName: e.target.checked ? 1 : 0 })}
                    className="rounded border-slate-300 text-blue-600"
                  />
                  <span>Show plan/service name</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                  <input
                    type="checkbox"
                    checked={form.showReceiptNumber === 1}
                    onChange={(e) => setForm({ ...form, showReceiptNumber: e.target.checked ? 1 : 0 })}
                    className="rounded border-slate-300 text-blue-600"
                  />
                  <span>Show receipt number</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                  <input
                    type="checkbox"
                    checked={form.showBusinessAddress === 1}
                    onChange={(e) => setForm({ ...form, showBusinessAddress: e.target.checked ? 1 : 0 })}
                    className="rounded border-slate-300 text-blue-600"
                  />
                  <span>Show business address</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                  <input
                    type="checkbox"
                    checked={form.showInternalTxRef === 1}
                    onChange={(e) => setForm({ ...form, showInternalTxRef: e.target.checked ? 1 : 0 })}
                    className="rounded border-slate-300 text-blue-600"
                  />
                  <span>Show Stripe reference ID</span>
                </label>
              </div>
            </div>
          </div>

          {/* 3. RECEIPT NUMBER SETTINGS */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Hash className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-base text-foreground">3. Receipt Number Settings</h3>
              </div>
              <span className="text-xs text-muted-foreground font-medium">Incremental Sequence</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Prefix</label>
                <Input
                  value={form.receiptPrefix}
                  onChange={(e) => setForm({ ...form, receiptPrefix: e.target.value })}
                  placeholder="WP-"
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Next Sequence #</label>
                <Input
                  type="number"
                  value={form.nextReceiptSequence}
                  onChange={(e) => setForm({ ...form, nextReceiptSequence: parseInt(e.target.value) || 1 })}
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Live Number Preview</label>
                <div className="h-9 px-3 bg-muted rounded-md border border-input flex items-center font-mono font-bold text-xs text-primary">
                  {form.receiptPrefix}
                  {String(form.nextReceiptSequence).padStart(6, "0")}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Receipt numbers already issued are immutable and stored with each transaction record. Modifying the prefix or sequence only applies to future incoming payments.
            </p>
          </div>

          {/* 4. CUSTOMER DELIVERY & DUPLICATE CHECK */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-purple-500" />
                <h3 className="font-bold text-base text-foreground">4. Customer Receipt Delivery</h3>
              </div>
              <span className="text-xs text-muted-foreground font-medium">Automated Email</span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-foreground">Automatically Send Receipt After Payment</div>
                  <div className="text-xs text-muted-foreground">Dispatches branded Waypoint receipt email when Stripe confirms payment</div>
                </div>
                <Switch
                  checked={form.autoSendEmail === 1}
                  onCheckedChange={(val) => setForm({ ...form, autoSendEmail: val ? 1 : 0 })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Sender Display Name</label>
                  <Input
                    value={form.senderDisplayName}
                    onChange={(e) => setForm({ ...form, senderDisplayName: e.target.value })}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Reply-To Address</label>
                  <Input
                    value={form.replyToEmail}
                    onChange={(e) => setForm({ ...form, replyToEmail: e.target.value })}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Stripe Duplicate Receipt Warning */}
              <div className="border border-border rounded-lg p-3 bg-muted/30 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                    Stripe Customer Receipt Emails Also Enabled?
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Check if you also have customer emails enabled inside your Stripe Dashboard settings
                  </div>
                </div>
                <Switch
                  checked={form.stripeReceiptEmailEnabled === 1}
                  onCheckedChange={(val) => setForm({ ...form, stripeReceiptEmailEnabled: val ? 1 : 0 })}
                />
              </div>

              {form.autoSendEmail === 1 && form.stripeReceiptEmailEnabled === 1 && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 flex items-start gap-2.5 text-xs text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">⚠ Customers may receive duplicate payment receipts!</strong>
                    Both Waypoint receipt emails and Stripe dashboard customer emails are currently enabled. Disable Stripe receipt emails in your Stripe Dashboard to avoid sending two receipts for the same transaction.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: LIVE INTERACTIVE PREVIEW & TOOLBAR (6 COLS) ────── */}
        <div className="xl:col-span-6 space-y-6">
          {/* PREVIEW TOOLBAR & DEVICE SELECTOR */}
          <div className="bg-[#000820] border border-[#18365D] rounded-xl p-4 shadow-xl text-white space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  Live Client Receipt Preview
                </span>
                <p className="text-[11px] text-slate-400">
                  Simulates exact family experience in the client portal
                </p>
              </div>

              {/* Desktop vs Mobile Toggle */}
              <div className="flex items-center gap-1 bg-[#06172f] border border-[#1b3a60] p-1 rounded-lg">
                <button
                  onClick={() => setDeviceView("desktop")}
                  className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                    deviceView === "desktop"
                      ? "bg-blue-600 text-white shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  Desktop
                </button>
                <button
                  onClick={() => setDeviceView("mobile")}
                  className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                    deviceView === "mobile"
                      ? "bg-blue-600 text-white shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  Mobile
                </button>
              </div>
            </div>

            {/* Scenario Selector Pills */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-[#18365D]">
              <span className="text-[11px] text-slate-400 font-semibold mr-1">Scenario:</span>
              <button
                onClick={() => {
                  setScenario("enrollment");
                  setTestAnimStep("completed");
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-all ${
                  scenario === "enrollment"
                    ? "bg-[#d4af37] text-slate-950 font-bold"
                    : "bg-[#06172f] text-slate-300 hover:text-white border border-[#1b3a60]"
                }`}
              >
                ⚓ Enrollment
              </button>

              <button
                onClick={() => {
                  setScenario("recurring");
                  setTestAnimStep("completed");
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-all ${
                  scenario === "recurring"
                    ? "bg-[#d4af37] text-slate-950 font-bold"
                    : "bg-[#06172f] text-slate-300 hover:text-white border border-[#1b3a60]"
                }`}
              >
                🔄 Recurring Retainer
              </button>

              <button
                onClick={() => {
                  setScenario("standalone");
                  setTestAnimStep("completed");
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-all ${
                  scenario === "standalone"
                    ? "bg-[#d4af37] text-slate-950 font-bold"
                    : "bg-[#06172f] text-slate-300 hover:text-white border border-[#1b3a60]"
                }`}
              >
                📄 Standalone
              </button>

              <button
                onClick={() => {
                  setScenario("partial_refund");
                  setTestAnimStep("completed");
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-all ${
                  scenario === "partial_refund"
                    ? "bg-amber-400 text-slate-950 font-bold"
                    : "bg-[#06172f] text-slate-300 hover:text-white border border-[#1b3a60]"
                }`}
              >
                ⚖️ Partial Refund
              </button>

              <button
                onClick={() => {
                  setScenario("full_refund");
                  setTestAnimStep("completed");
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-all ${
                  scenario === "full_refund"
                    ? "bg-rose-500 text-white font-bold"
                    : "bg-[#06172f] text-slate-300 hover:text-white border border-[#1b3a60]"
                }`}
              >
                ↩️ Full Refund
              </button>
            </div>

            {/* Output Inspect Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-[#18365D] flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPrintModal(true)}
                className="gap-1.5 text-xs bg-[#06172f] border-[#1b3a60] text-slate-200 hover:bg-[#0a264e] hover:text-white"
              >
                <Printer className="w-3.5 h-3.5 text-blue-400" />
                Preview Printable
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEmailModal(true)}
                className="gap-1.5 text-xs bg-[#06172f] border-[#1b3a60] text-slate-200 hover:bg-[#0a264e] hover:text-white"
              >
                <Mail className="w-3.5 h-3.5 text-purple-400" />
                Preview Email
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTestEmailModal(true)}
                className="gap-1.5 text-xs bg-[#06172f] border-[#1b3a60] text-amber-300 hover:bg-[#0a264e]"
              >
                <Send className="w-3.5 h-3.5" />
                Send Test Email
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetPreview}
                className="gap-1.5 text-xs text-slate-400 hover:text-white ml-auto"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </Button>
            </div>
          </div>

          {/* ── THE LIVE PREVIEW CONTAINER (Desktop or Mobile Shell) ────────── */}
          <div
            className={`transition-all duration-300 mx-auto rounded-3xl overflow-hidden border border-[#18365D] shadow-2xl ${
              deviceView === "mobile"
                ? "max-w-[390px] border-8 border-slate-800 rounded-[44px]"
                : "w-full"
            }`}
          >
            <WaypointReceiptExperience
              transaction={activeSampleTx}
              settings={form}
              isTestMode={true}
              initialStep={testAnimStep}
              onContinue={() => toast.success("Test: Client proceeds to Onboarding")}
              onPrint={() => setShowPrintModal(true)}
              onDownloadPdf={() => setShowPrintModal(true)}
              onEmailReceipt={(email) => {
                toast.success(`Test receipt dispatched to ${email}`);
              }}
            />
          </div>

          {/* STRIPE TEST PAYMENT TRIGGER CARD */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-500" />
                <h4 className="font-bold text-sm text-foreground">Stripe Test Mode Simulator</h4>
                <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  SAFE • NO REAL CHARGES
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Simulates real Stripe webhook confirmation, generates a transaction record, creates PDF, and fires automation timeline.
              </p>
            </div>

            <Button
              onClick={() => testPaymentMutation.mutate({ scenario, amountCents: activeSampleTx.amountCents })}
              disabled={testPaymentMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shrink-0 text-xs gap-2 cursor-pointer"
            >
              {testPaymentMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              Test Stripe Payment
            </Button>
          </div>
        </div>
      </div>

      {/* ── TECHNICAL HEALTH & INTEGRATION STATUS ─────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-blue-500" />
              Receipt System Health & Integration Status
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live verification of Stripe connections, webhooks, PDF generation, and email dispatchers.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchTests()}
            className="text-xs gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Run System Test
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {systemTests?.tests.map((test) => (
            <div
              key={test.id}
              className="border border-border rounded-lg p-3.5 bg-muted/20 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-foreground">{test.name}</span>
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    test.status === "green"
                      ? "bg-emerald-500 shadow-[0_0_8px_#10b981]"
                      : test.status === "yellow"
                      ? "bg-amber-500 shadow-[0_0_8px_#f59e0b]"
                      : "bg-rose-500 shadow-[0_0_8px_#f43f5e]"
                  }`}
                />
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {test.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── RECENT RECEIPT TRANSACTIONS STRIP ──────────────────────────────── */}
      {recentTransactions && recentTransactions.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="font-bold text-base text-foreground">Recent Receipt Activity</h3>
              <p className="text-xs text-muted-foreground">Latest transactions confirmed through the Waypoint receipt engine</p>
            </div>
            <a
              href="/invoices"
              className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
            >
              View All Invoices & Billing →
            </a>
          </div>

          <div className="divide-y divide-border text-xs">
            {recentTransactions.map((tx: any) => (
              <div key={tx.id} className="py-2.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-foreground">{tx.receiptNumber}</span>
                  <span className="text-muted-foreground">{tx.serviceName}</span>
                  <span className="text-slate-400">({tx.clientName})</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-foreground">${(tx.amountCents / 100).toFixed(2)}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {tx.status}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(tx.paidAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MODAL 1: PRINTABLE RECEIPT PREVIEW ───────────────────────────────── */}
      <Dialog open={showPrintModal} onOpenChange={setShowPrintModal}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 bg-slate-100 border-none">
          <WaypointPrintableReceipt
            data={{
              ...activeSampleTx,
              companyName: form.companyName,
              businessEmail: form.businessEmail,
              businessPhone: form.businessPhone,
              businessAddress: form.businessAddress,
              website: form.website,
              footerMessage: form.receiptFooterMessage,
            }}
            onClose={() => setShowPrintModal(false)}
            onDownloadPdf={() => window.print()}
          />
        </DialogContent>
      </Dialog>

      {/* ── MODAL 2: RECEIPT EMAIL PREVIEW ──────────────────────────────────── */}
      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent className="max-w-xl bg-[#000820] border border-[#18365D] text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Mail className="w-5 h-5 text-purple-400" />
              Customer Receipt Email Preview
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="bg-[#06172F] p-4 rounded-xl border border-[#18365D] text-xs space-y-1 text-slate-300">
              <div><strong>From:</strong> {form.senderDisplayName} &lt;{form.businessEmail}&gt;</div>
              <div><strong>Reply-To:</strong> {form.replyToEmail}</div>
              <div><strong>Subject:</strong> {form.companyName} Receipt: {activeSampleTx.receiptNumber} (${(activeSampleTx.amountCents / 100).toFixed(2)})</div>
            </div>

            {/* Email Canvas Preview */}
            <div className="bg-[#FAF8F5] text-slate-900 p-6 rounded-xl border border-slate-300 text-xs shadow-inner space-y-3">
              <div className="text-center border-b border-dashed border-slate-300 pb-3">
                <div className="font-bold text-sm font-serif text-[#06172F]">{form.receiptDisplayName}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Payment Receipt • Proof of Transaction</div>
              </div>

              <div className="flex justify-between py-2 border-b border-dashed border-slate-200">
                <div>
                  <div className="font-bold text-slate-800 text-sm">{activeSampleTx.serviceName}</div>
                  <div className="text-slate-500 text-[11px]">{activeSampleTx.planName}</div>
                </div>
                <div className="font-bold text-slate-900 text-sm">${(activeSampleTx.amountCents / 100).toFixed(2)}</div>
              </div>

              <div className="text-[11px] text-slate-600 space-y-1">
                <div><strong>Receipt #:</strong> {activeSampleTx.receiptNumber}</div>
                <div><strong>Status:</strong> <span className="text-emerald-700 font-bold">{activeSampleTx.status}</span></div>
                <div><strong>Payment Method:</strong> {activeSampleTx.paymentMethodBrand} ending in {activeSampleTx.paymentMethodLast4}</div>
                <div><strong>Date:</strong> {new Date(activeSampleTx.paidAt).toLocaleDateString()}</div>
              </div>

              <div className="text-center pt-3">
                <span className="inline-block bg-[#06172F] text-[#D4AF37] px-4 py-2 rounded-full font-bold text-xs">
                  View Full Printable Receipt →
                </span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 3: SEND TEST EMAIL DIALOG ─────────────────────────────────── */}
      <Dialog open={showTestEmailModal} onOpenChange={setShowTestEmailModal}>
        <DialogContent className="max-w-md bg-[#06172f] border border-[#1b3a60] text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Send className="w-5 h-5 text-amber-400" />
              Send Test Receipt Email
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <p className="text-xs text-slate-300">
              Send a test receipt email to verify your email delivery pipeline. The message will be clearly marked:
              <strong className="block text-amber-300 mt-1">TEST RECEIPT • NO PAYMENT PROCESSED</strong>
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Send To Email Address</label>
              <Input
                type="email"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                placeholder="admin@waypointadvocates.com"
                className="bg-[#030c1a] border-[#1b3a60] text-white text-xs"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <Button
                variant="ghost"
                onClick={() => setShowTestEmailModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!testEmailAddress) {
                    toast.error("Please enter a destination email address");
                    return;
                  }
                  sendTestEmailMutation.mutate({ recipientEmail: testEmailAddress });
                }}
                disabled={sendTestEmailMutation.isPending}
                className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs cursor-pointer"
              >
                {sendTestEmailMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
                Send Test Receipt
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
