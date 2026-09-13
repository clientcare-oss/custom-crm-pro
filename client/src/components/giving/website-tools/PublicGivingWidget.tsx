/**
 * Public Giving Widget — Core renderer for all 6 Waypoint Website Tools
 * 1. Donation Form
 * 2. Donate Button
 * 3. Floating Donate Button
 * 4. Fundraising Goal / Progress Bar
 * 5. Campaign Page
 * 6. Supporter Signup Form
 */

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Heart,
  Gift,
  Shield,
  Sparkles,
  Users,
  CheckCircle2,
  DollarSign,
  Calendar,
  Lock,
  ArrowRight,
  Landmark,
  Share2,
  QrCode,
  GraduationCap,
  FileCheck2,
  Receipt,
  ExternalLink,
} from "lucide-react";

interface PublicGivingWidgetProps {
  tool: any;
  isEmbed?: boolean;
  onOpenModal?: () => void;
}

export default function PublicGivingWidget({ tool, isEmbed = false }: PublicGivingWidgetProps) {
  if (!tool) return null;

  switch (tool.type) {
    case "donate_button":
      return <DonateButtonWidget tool={tool} isEmbed={isEmbed} />;
    case "floating_button":
      return <FloatingButtonWidget tool={tool} isEmbed={isEmbed} />;
    case "progress_bar":
      return <ProgressBarWidget tool={tool} isEmbed={isEmbed} />;
    case "campaign_page":
      return <CampaignPageWidget tool={tool} isEmbed={isEmbed} />;
    case "supporter_signup":
      return <SupporterSignupWidget tool={tool} isEmbed={isEmbed} />;
    case "donation_form":
    default:
      return <DonationFormWidget tool={tool} isEmbed={isEmbed} />;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. DONATION FORM WIDGET
// ─────────────────────────────────────────────────────────────────────────────
export function DonationFormWidget({
  tool,
  isEmbed,
  onDonationSuccess,
}: {
  tool: any;
  isEmbed?: boolean;
  onDonationSuccess?: (receipt: any) => void;
}) {
  const settings = tool.settings || {};
  const suggestedAmounts = settings.suggestedAmounts || [2500, 5000, 10000, 25000]; // cents
  const defaultAmount = suggestedAmounts[1] || 5000;

  const [frequency, setFrequency] = useState<"one_time" | "monthly">("one_time");
  const [selectedAmountCents, setSelectedAmountCents] = useState<number>(defaultAmount);
  const [customAmountStr, setCustomAmountStr] = useState("");
  const [isCustom, setIsCustom] = useState(false);

  // Donor fields
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  const [donorAddress, setDonorAddress] = useState("");
  const [donorOrg, setDonorOrg] = useState("");
  const [notes, setNotes] = useState("");
  const [coverFees, setCoverFees] = useState(settings.allowCoverFees ?? true);
  const [anonymous, setAnonymous] = useState(false);

  // Success state
  const [completedReceipt, setCompletedReceipt] = useState<any>(null);

  const submitDonationMutation = trpc.giving.submitPublicDonation.useMutation({
    onSuccess: (data) => {
      toast.success("Thank you for your generous gift!");
      setCompletedReceipt(data);
      if (onDonationSuccess) onDonationSuccess(data);
    },
    onError: (err) => {
      toast.error(err.message || "Could not process donation. Please check fields.");
    },
  });

  const effectiveAmountCents = isCustom
    ? Math.round((parseFloat(customAmountStr) || 0) * 100)
    : selectedAmountCents;

  // Processing fee: 2.9% + $0.30
  const feeCents = Math.round(effectiveAmountCents * 0.029 + 30);
  const totalChargeCents = coverFees ? effectiveAmountCents + feeCents : effectiveAmountCents;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!donorName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!donorEmail.trim() || !donorEmail.includes("@")) {
      toast.error("Please enter a valid email for your 501(c)(3) tax receipt");
      return;
    }
    if (effectiveAmountCents < 100) {
      toast.error("Minimum donation is $1.00");
      return;
    }

    submitDonationMutation.mutate({
      toolId: tool.id,
      fundId: tool.fundId,
      amountCents: effectiveAmountCents,
      frequency,
      coverFees,
      anonymous,
      donorName,
      donorEmail,
      donorPhone: donorPhone || undefined,
      donorAddress: donorAddress || undefined,
      donorOrganization: donorOrg || undefined,
      notes: notes || undefined,
      paymentMethod: "Stripe (Card)",
    });
  };

  if (completedReceipt) {
    return (
      <Card className="p-6 md:p-8 bg-[#001A41]/90 border border-emerald-500/40 text-white rounded-2xl shadow-2xl backdrop-blur-md">
        <div className="text-center space-y-4">
          <div className="h-16 w-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h3 className="text-2xl font-bold text-white tracking-tight">
            Thank You, {anonymous ? "Generous Friend" : donorName}!
          </h3>
          <p className="text-sm text-white/70 max-w-md mx-auto">
            {settings.thankYouMessage ||
              "Your tax-deductible contribution directly empowers families navigating complex special education IEP dispute resolution and evaluations."}
          </p>

          <div className="p-4 rounded-xl bg-black/30 border border-white/10 text-left space-y-2 text-xs text-white/80 max-w-md mx-auto">
            <div className="flex justify-between border-b border-white/10 pb-1.5 font-semibold text-white">
              <span>Receipt Number</span>
              <span className="font-mono text-[#D4AF37]">{completedReceipt.receiptNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Fund Designation</span>
              <span className="text-white font-medium">{completedReceipt.fundName}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Gift</span>
              <span className="text-emerald-400 font-bold">
                ${((completedReceipt.donation?.amountCents || effectiveAmountCents) / 100).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Tax Status</span>
              <span className="text-white/60">501(c)(3) Tax-Deductible</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => {
                setCompletedReceipt(null);
                setCustomAmountStr("");
                setIsCustom(false);
              }}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              Make Another Gift
            </Button>
            <Button
              onClick={() => window.print()}
              className="bg-[#D4AF37] hover:bg-[#F59E0B] text-black font-semibold"
            >
              <Receipt className="h-4 w-4 mr-1.5" />
              Print Official Receipt
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border border-[#D4AF37]/30 bg-[#001A41]/95 text-white rounded-2xl shadow-2xl backdrop-blur-md">
      {/* Header Banner */}
      <div className="p-5 md:p-6 bg-gradient-to-b from-[#07162B] to-transparent border-b border-white/10 space-y-1">
        <div className="flex items-center gap-2">
          <Badge className="bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] text-[10px] font-semibold tracking-wide uppercase">
            501(c)(3) Charitable Contribution
          </Badge>
          <span className="text-xs text-white/50 flex items-center gap-1">
            <Lock className="h-3 w-3" /> Secure Stripe Gateway
          </span>
        </div>
        <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white pt-1">
          {tool.headline || "Support Special Education IEP Advocacy"}
        </h2>
        {tool.description && <p className="text-xs md:text-sm text-white/70">{tool.description}</p>}
      </div>

      <form onSubmit={handleSubmit} className="p-5 md:p-6 space-y-5">
        {/* Frequency Toggles (if multiple allowed) */}
        {settings.frequencies && settings.frequencies.length > 1 && (
          <div className="grid grid-cols-2 p-1 bg-black/30 rounded-xl border border-white/10 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFrequency("one_time")}
              className={`py-2 rounded-lg transition-all ${
                frequency === "one_time"
                  ? "bg-[#D4AF37] text-black font-bold shadow"
                  : "text-white/60 hover:text-white"
              }`}
            >
              One-Time Gift
            </button>
            <button
              type="button"
              onClick={() => setFrequency("monthly")}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                frequency === "monthly"
                  ? "bg-[#D4AF37] text-black font-bold shadow"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />
              Monthly Sustainer
            </button>
          </div>
        )}

        {/* Suggested Amounts */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-white/80">Select Gift Amount</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {suggestedAmounts.map((cents: number) => {
              const selected = !isCustom && selectedAmountCents === cents;
              return (
                <button
                  key={cents}
                  type="button"
                  onClick={() => {
                    setIsCustom(false);
                    setSelectedAmountCents(cents);
                  }}
                  className={`py-3 px-2 rounded-xl text-center font-bold text-sm transition-all border ${
                    selected
                      ? "bg-[#D4AF37] text-black border-[#D4AF37] shadow-lg shadow-[#D4AF37]/20 scale-[1.02]"
                      : "bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/25"
                  }`}
                >
                  ${(cents / 100).toFixed(0)}
                  {frequency === "monthly" && <span className="text-[10px] block opacity-80">/mo</span>}
                </button>
              );
            })}
          </div>

          {/* Custom Amount Option */}
          {settings.allowCustomAmount !== false && (
            <div className="pt-1">
              <div
                onClick={() => setIsCustom(true)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                  isCustom
                    ? "bg-[#07162B] border-[#D4AF37] ring-1 ring-[#D4AF37]"
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                }`}
              >
                <DollarSign className="h-4 w-4 text-[#D4AF37]" />
                <Input
                  type="number"
                  placeholder="Other Custom Amount (USD)"
                  value={customAmountStr}
                  onFocus={() => setIsCustom(true)}
                  onChange={(e) => {
                    setIsCustom(true);
                    setCustomAmountStr(e.target.value);
                  }}
                  className="bg-transparent border-none text-white focus-visible:ring-0 text-sm h-8 p-0"
                />
              </div>
            </div>
          )}
        </div>

        {/* Connected Fund Transparency */}
        <div className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white/70">
          <span className="flex items-center gap-1.5">
            <Landmark className="h-3.5 w-3.5 text-[#D4AF37]" />
            Designated Fund:
          </span>
          <span className="font-semibold text-white">{tool.fundName || "Advocacy Scholarship Fund"}</span>
        </div>

        {/* Donor Contact Details */}
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-white/80">
                Full Name <span className="text-[#D4AF37]">*</span>
              </Label>
              <Input
                required
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                placeholder="Jane Doe"
                className="bg-white/5 border-white/15 text-white text-xs h-9 rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-white/80">
                Email (for 501(c)(3) tax receipt) <span className="text-[#D4AF37]">*</span>
              </Label>
              <Input
                type="email"
                required
                value={donorEmail}
                onChange={(e) => setDonorEmail(e.target.value)}
                placeholder="jane@example.com"
                className="bg-white/5 border-white/15 text-white text-xs h-9 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-white/60">Phone (Optional)</Label>
              <Input
                value={donorPhone}
                onChange={(e) => setDonorPhone(e.target.value)}
                placeholder="(404) 555-0199"
                className="bg-white/5 border-white/15 text-white text-xs h-9 rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-white/60">Organization / Sponsor Name</Label>
              <Input
                value={donorOrg}
                onChange={(e) => setDonorOrg(e.target.value)}
                placeholder="Company / Family Trust"
                className="bg-white/5 border-white/15 text-white text-xs h-9 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Checkbox Options */}
        <div className="space-y-2 pt-1 border-t border-white/10 text-xs">
          {settings.allowCoverFees !== false && (
            <label className="flex items-start gap-2.5 cursor-pointer text-white/80 hover:text-white">
              <Checkbox
                checked={coverFees}
                onCheckedChange={(checked) => setCoverFees(!!checked)}
                className="mt-0.5 border-white/30 data-[state=checked]:bg-[#D4AF37] data-[state=checked]:text-black"
              />
              <span>
                Add <strong>${(feeCents / 100).toFixed(2)}</strong> to cover transaction processing fees so 100% of my
                gift supports IEP advocacy.
              </span>
            </label>
          )}

          {settings.allowAnonymous !== false && (
            <label className="flex items-start gap-2.5 cursor-pointer text-white/80 hover:text-white">
              <Checkbox
                checked={anonymous}
                onCheckedChange={(checked) => setAnonymous(!!checked)}
                className="mt-0.5 border-white/30 data-[state=checked]:bg-[#D4AF37] data-[state=checked]:text-black"
              />
              <span>Keep my donation anonymous from public supporter feeds.</span>
            </label>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <Button
            type="submit"
            disabled={submitDonationMutation.isPending}
            className="w-full h-11 bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] text-black font-bold text-sm rounded-xl shadow-lg shadow-[#D4AF37]/20 hover:brightness-105 transition-all"
          >
            {submitDonationMutation.isPending ? (
              "Processing Tax-Deductible Gift..."
            ) : (
              <span className="flex items-center justify-center gap-2">
                Donate ${(totalChargeCents / 100).toFixed(2)} {frequency === "monthly" ? "Monthly" : "Now"}
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>

          <p className="text-[11px] text-center text-white/45 mt-2.5">
            Contributions are tax-deductible under Section 501(c)(3). You will receive an immediate IRS written
            acknowledgment.
          </p>
        </div>
      </form>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. DONATE BUTTON WIDGET
// ─────────────────────────────────────────────────────────────────────────────
export function DonateButtonWidget({ tool, isEmbed }: { tool: any; isEmbed?: boolean }) {
  const [modalOpen, setModalOpen] = useState(false);
  const settings = tool.settings || {};

  const sizeClasses =
    settings.buttonSize === "sm"
      ? "px-3.5 py-1.5 text-xs h-8"
      : settings.buttonSize === "lg"
      ? "px-6 py-3 text-base h-12"
      : "px-5 py-2.5 text-sm h-10";

  const styleClasses =
    settings.buttonStyle === "navy_outline"
      ? "bg-transparent border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10"
      : settings.buttonStyle === "minimal"
      ? "bg-white/10 hover:bg-white/20 text-white border border-white/20"
      : "bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] text-black font-bold hover:brightness-105 shadow-md shadow-[#D4AF37]/20";

  return (
    <>
      <div className={`inline-block ${settings.fullWidth ? "w-full" : ""}`}>
        <Button
          onClick={() => setModalOpen(true)}
          className={`${sizeClasses} ${styleClasses} ${settings.fullWidth ? "w-full" : ""} rounded-xl font-bold transition-all`}
        >
          {settings.buttonIcon === "heart" && <Heart className="h-4 w-4 mr-2 text-rose-500 fill-rose-500" />}
          {settings.buttonIcon === "gift" && <Gift className="h-4 w-4 mr-2" />}
          {settings.buttonIcon === "shield" && <Shield className="h-4 w-4 mr-2" />}
          {settings.buttonIcon === "sparkles" && <Sparkles className="h-4 w-4 mr-2" />}
          {settings.buttonText || "Donate Now"}
        </Button>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md p-0 border-none bg-transparent">
          <DonationFormWidget
            tool={tool}
            onDonationSuccess={() => {
              setTimeout(() => setModalOpen(false), 4000);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. FLOATING DONATE BUTTON WIDGET
// ─────────────────────────────────────────────────────────────────────────────
export function FloatingButtonWidget({ tool, isEmbed }: { tool: any; isEmbed?: boolean }) {
  const [modalOpen, setModalOpen] = useState(false);
  const settings = tool.settings || {};

  return (
    <div className="relative min-h-[160px] p-6 rounded-2xl bg-black/30 border border-white/10 flex items-center justify-center">
      <div className="text-center space-y-3">
        <p className="text-xs text-white/60">Floating Button Live Preview (Position: {settings.screenPosition || "Bottom Right"})</p>
        <Button
          onClick={() => setModalOpen(true)}
          className="bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] text-black font-bold rounded-full shadow-2xl shadow-[#D4AF37]/40 px-5 py-3 flex items-center gap-2 hover:scale-105 transition-all"
        >
          <Gift className="h-4 w-4 text-black" />
          <span>{settings.buttonText || "Support Our Mission"}</span>
        </Button>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md p-0 border-none bg-transparent">
          <DonationFormWidget tool={tool} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. FUNDRAISING GOAL / PROGRESS BAR WIDGET
// ─────────────────────────────────────────────────────────────────────────────
export function ProgressBarWidget({ tool, isEmbed }: { tool: any; isEmbed?: boolean }) {
  const settings = tool.settings || {};
  const goalCents = settings.goalAmountCents || 5000000;
  const raisedCents = tool.amountRaisedCents || 2475000;
  const percent = Math.min(100, Math.round((raisedCents / (goalCents || 1)) * 100));

  return (
    <Card className="p-5 md:p-6 bg-[#001A41]/95 border border-[#D4AF37]/30 text-white rounded-2xl shadow-xl backdrop-blur-md space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Badge className="bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] text-[10px] font-semibold tracking-wide uppercase mb-1">
            {tool.fundName || "Advocacy Fund"}
          </Badge>
          <h3 className="text-lg md:text-xl font-bold tracking-tight text-white">{tool.headline || tool.name}</h3>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-[#D4AF37]">{percent}%</span>
          <span className="block text-[10px] text-white/50 uppercase tracking-wider">Funded</span>
        </div>
      </div>

      {settings.shortMessage && <p className="text-xs text-white/70">{settings.shortMessage}</p>}

      {/* Progress Bar with Gold Gradient */}
      <div className="space-y-1.5">
        <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/10">
          <div
            className="h-full bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] rounded-full transition-all duration-700 shadow-sm"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-xs text-white/80 font-medium pt-1">
          <span>
            <strong className="text-white font-bold">${(raisedCents / 100).toLocaleString()}</strong> raised
          </span>
          <span className="text-white/50">Goal: ${(goalCents / 100).toLocaleString()}</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs pt-2 border-t border-white/10 text-white/60">
        <span className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-[#D4AF37]" />
          {tool.donationsGeneratedCount || 18} Generous Supporters
        </span>
        <span className="flex items-center gap-1 text-emerald-400 font-medium">
          <Shield className="h-3.5 w-3.5" /> 100% Direct Impact
        </span>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. CAMPAIGN PAGE WIDGET
// ─────────────────────────────────────────────────────────────────────────────
export function CampaignPageWidget({ tool, isEmbed }: { tool: any; isEmbed?: boolean }) {
  const settings = tool.settings || {};
  const goalCents = settings.goalAmountCents || 5000000;
  const raisedCents = tool.amountRaisedCents || 2475000;
  const percent = Math.min(100, Math.round((raisedCents / (goalCents || 1)) * 100));

  return (
    <div className="space-y-8 text-white max-w-5xl mx-auto">
      {/* Campaign Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-[#D4AF37]/30 bg-gradient-to-b from-[#07162B] to-[#001A41] p-6 md:p-10 shadow-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center gap-2">
              <Badge className="bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-semibold uppercase tracking-wider">
                Waypoint 501(c)(3) Campaign
              </Badge>
              <Badge variant="outline" className="text-white/60 border-white/20 text-xs">
                {tool.fundName || "Advocacy Scholarship Fund"}
              </Badge>
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              {tool.headline || "Rise & Thrive Scholarship Campaign"}
            </h1>
            <p className="text-sm md:text-base text-white/75 leading-relaxed">
              {tool.description ||
                "Funding Master IEP Coach® advocacy retainers, psychoeducational evaluations, and dispute resolution for underserved Georgia families."}
            </p>

            {/* Campaign Progress Inline */}
            <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-2">
              <div className="flex justify-between text-sm">
                <span>
                  <strong className="text-2xl font-black text-[#D4AF37]">${(raisedCents / 100).toLocaleString()}</strong>{" "}
                  <span className="text-white/60 text-xs">raised of ${(goalCents / 100).toLocaleString()}</span>
                </span>
                <span className="text-lg font-bold text-white">{percent}%</span>
              </div>
              <Progress value={percent} className="h-2.5 bg-white/10" />
              <div className="flex justify-between text-xs text-white/50 pt-1">
                <span>{tool.donationsGeneratedCount || 34} Donors</span>
                <span>Tax-deductible under IRC § 170</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            {settings.heroImageUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-white/15 shadow-xl aspect-video lg:aspect-square">
                <img
                  src={settings.heroImageUrl}
                  alt="Campaign Hero"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-4">
                  <span className="text-xs text-white font-medium flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4 text-[#D4AF37]" /> Waypoint Student Advocacy
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-black/20 aspect-video flex items-center justify-center text-white/40">
                Campaign Visual
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content & Giving Form Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Story & Impact Metrics (Left 7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Impact Stats */}
          {settings.impactMetrics && settings.impactMetrics.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {settings.impactMetrics.map((m: any, idx: number) => (
                <div key={idx} className="p-4 rounded-xl bg-[#001A41]/80 border border-white/10 text-center space-y-1">
                  <div className="text-xl md:text-2xl font-extrabold text-[#D4AF37]">{m.value}</div>
                  <div className="text-xs font-semibold text-white">{m.label}</div>
                  {m.description && <div className="text-[10px] text-white/50 leading-tight">{m.description}</div>}
                </div>
              ))}
            </div>
          )}

          {/* Story Content */}
          <Card className="p-6 md:p-8 bg-[#001A41]/70 border border-white/10 rounded-2xl text-white space-y-4">
            <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Heart className="h-5 w-5 text-[#D4AF37]" /> Why Your Support Matters
            </h3>
            <div className="text-sm text-white/80 leading-relaxed space-y-3 whitespace-pre-line">
              {settings.storyContent ||
                "In Georgia, navigating special education rights can be an overwhelming challenge for families without the resources for private legal representation. When schools refuse necessary accommodations or reduce speech and occupational therapies, low-income students are left behind.\n\nYour gift funds professional IEP advocacy directly in the meeting room, ensuring every child receives the individualized education and dignity they legally deserve."}
            </div>
          </Card>
        </div>

        {/* Embedded Donation Form (Right 5 cols) */}
        <div className="lg:col-span-5">
          <DonationFormWidget tool={tool} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. SUPPORTER SIGNUP WIDGET
// ─────────────────────────────────────────────────────────────────────────────
export function SupporterSignupWidget({ tool, isEmbed }: { tool: any; isEmbed?: boolean }) {
  const settings = tool.settings || {};
  const interestOptions = settings.interestOptions || [
    "Advocacy Scholarship Support",
    "Corporate Sponsorship",
    "Volunteer & Mentor",
    "Host an IEP Rights Workshop",
    "General Updates & Newsletter",
  ];

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [organization, setOrganization] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const signupMutation = trpc.giving.submitSupporterSignup.useMutation({
    onSuccess: () => {
      toast.success("Welcome! You are now connected with Waypoint Advocates.");
      setSubmitted(true);
    },
    onError: (err) => {
      toast.error(err.message || "Could not complete signup. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !email.includes("@")) {
      toast.error("Please enter your name and valid email");
      return;
    }

    signupMutation.mutate({
      name,
      email,
      phone: phone || undefined,
      organization: organization || undefined,
      areasOfInterest: selectedInterests,
    });
  };

  if (submitted) {
    return (
      <Card className="p-6 md:p-8 bg-[#001A41]/95 border border-emerald-500/40 text-white rounded-2xl shadow-xl text-center space-y-4">
        <div className="h-14 w-14 mx-auto rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h3 className="text-xl font-bold text-white">Thank You for Connecting!</h3>
        <p className="text-xs md:text-sm text-white/70 max-w-sm mx-auto">
          {settings.thankYouMessage ||
            "Welcome to the Waypoint community! We will keep you informed of advocacy initiatives, upcoming IEP workshops, and scholarship opportunities."}
        </p>
        <Button
          onClick={() => {
            setSubmitted(false);
            setName("");
            setEmail("");
            setSelectedInterests([]);
          }}
          variant="outline"
          className="border-white/20 text-white hover:bg-white/10 text-xs"
        >
          Submit Another Response
        </Button>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border border-[#D4AF37]/30 bg-[#001A41]/95 text-white rounded-2xl shadow-2xl backdrop-blur-md">
      <div className="p-5 md:p-6 bg-gradient-to-b from-[#07162B] to-transparent border-b border-white/10 space-y-1">
        <Badge className="bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] text-[10px] font-semibold tracking-wide uppercase">
          Community Supporters & Allies
        </Badge>
        <h2 className="text-xl font-bold tracking-tight text-white pt-1">
          {tool.headline || "Join Waypoint Community Supporters"}
        </h2>
        {tool.description && <p className="text-xs text-white/70">{tool.description}</p>}
      </div>

      <form onSubmit={handleSubmit} className="p-5 md:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-white/80">Full Name *</Label>
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Marcus Bennett"
              className="bg-white/5 border-white/15 text-white text-xs h-9 rounded-lg"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-white/80">Email Address *</Label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="marcus@example.com"
              className="bg-white/5 border-white/15 text-white text-xs h-9 rounded-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-white/60">Phone (Optional)</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(404) 555-0182"
              className="bg-white/5 border-white/15 text-white text-xs h-9 rounded-lg"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-white/60">Company / Organization</Label>
            <Input
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="Community Partner LLC"
              className="bg-white/5 border-white/15 text-white text-xs h-9 rounded-lg"
            />
          </div>
        </div>

        {/* Interests */}
        <div className="space-y-2 pt-2 border-t border-white/10">
          <Label className="text-xs font-semibold text-white/80">Areas of Interest</Label>
          <div className="space-y-2">
            {interestOptions.map((opt: string) => {
              const checked = selectedInterests.includes(opt);
              return (
                <label key={opt} className="flex items-center gap-2.5 cursor-pointer text-xs text-white/80 hover:text-white">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(c) => {
                      if (c) {
                        setSelectedInterests([...selectedInterests, opt]);
                      } else {
                        setSelectedInterests(selectedInterests.filter((i) => i !== opt));
                      }
                    }}
                    className="border-white/30 data-[state=checked]:bg-[#D4AF37] data-[state=checked]:text-black"
                  />
                  <span>{opt}</span>
                </label>
              );
            })}
          </div>
        </div>

        <Button
          type="submit"
          disabled={signupMutation.isPending}
          className="w-full h-10 bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] text-black font-bold text-xs rounded-xl shadow-lg hover:brightness-105 transition-all mt-2"
        >
          {signupMutation.isPending ? "Connecting..." : "Join Community Supporters"}
        </Button>
      </form>
    </Card>
  );
}
