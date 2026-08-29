import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ShieldCheck, 
  Users, 
  CreditCard, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  Lock, 
  FileText, 
  Award,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

interface ChooseSupportExperienceProps {
  onPaymentSuccess: () => void;
  onNavigateTab: (tabId: string) => void;
}

export function ChooseSupportExperience({
  onPaymentSuccess,
  onNavigateTab,
}: ChooseSupportExperienceProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [studentCount, setStudentCount] = useState<number>(1);
  const [studentNames, setStudentNames] = useState<string[]>([""]);
  const [selectedTier, setSelectedTier] = useState<string>("full");
  const [paymentPlan, setPaymentPlan] = useState<"full" | "installments">("full");
  const [isProcessing, setIsProcessing] = useState(false);

  const tiers = [
    {
      id: "full",
      name: "Full IEP Representation",
      badge: "Most Popular",
      priceSingle: 1850,
      priceMulti: 2650,
      description: "End-to-end IEP coaching, record analysis, strategy agendas, and live advocate attendance at all school meetings.",
      features: [
        "Complete historical IEP & eval audit",
        "Pre-meeting strategy agenda & talking points",
        "Live advocate attendance at IEP / 504 table",
        "Post-meeting debrief & Prior Written Notice review",
        "Direct message access to Byron Honea"
      ]
    },
    {
      id: "review",
      name: "Document Review & Strategy Session",
      badge: "Targeted Help",
      priceSingle: 750,
      priceMulti: 1150,
      description: "In-depth review of your child's draft IEP with written amendment recommendations and a 60-min prep call.",
      features: [
        "Comprehensive IEP document audit",
        "Written SMART goal edit rubric",
        "60-minute pre-meeting strategy call",
        "Parent meeting prep checklist"
      ]
    },
    {
      id: "retainer",
      name: "Annual Advocacy Retainer",
      badge: "Ongoing Partnership",
      priceSingle: 3200,
      priceMulti: 4500,
      description: "Year-round advocacy coverage for multiple meetings, manifestation determinations, and quarterly checkups.",
      features: [
        "Unlimited annual IEP & 504 representation",
        "Quarterly progress monitoring audits",
        "Priority emergency meeting scheduling",
        "Permanent Cloudflare R2 vault access"
      ]
    }
  ];

  const currentTierObj = tiers.find((t) => t.id === selectedTier) || tiers[0];
  const basePrice = studentCount > 1 ? currentTierObj.priceMulti : currentTierObj.priceSingle;
  const totalPrice = basePrice;
  const installmentPrice = Math.round(totalPrice / 2);

  const handleStudentCountChange = (count: number) => {
    setStudentCount(count);
    const newNames = Array(count).fill("").map((_, i) => studentNames[i] || "");
    setStudentNames(newNames);
  };

  const handleSimulatePayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      toast.success("Payment authorized! Welcome to Waypoint.");
      onPaymentSuccess();
    }, 1500);
  };

  return (
    <div className="p-6 md:p-8 lg:p-10 space-y-8 max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="border-b border-white/10 pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 text-amber-300 text-xs font-semibold mb-3 border border-amber-400/20">
          <ShieldCheck className="h-3.5 w-3.5" />
          Enrollment & Support Selection
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white">
          Ready for the Next Step? Choose Your Advocacy Support
        </h1>
        <p className="text-sm text-white/70 mt-1.5 leading-relaxed">
          Select your representation tier and billing options to begin progressive onboarding.
        </p>

        {/* Wizard Step Progress */}
        <div className="flex items-center gap-2 mt-6">
          {[
            { num: 1, label: "Students" },
            { num: 2, label: "Support Tier" },
            { num: 3, label: "Review" },
            { num: 4, label: "Checkout" }
          ].map((s) => (
            <div key={s.num} className="flex items-center gap-2 flex-1">
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === s.num
                    ? "bg-amber-400 text-[#071422] ring-2 ring-amber-400/30 font-extrabold"
                    : step > s.num
                    ? "bg-emerald-500 text-white"
                    : "bg-white/10 text-white/40"
                }`}
              >
                {step > s.num ? "✓" : s.num}
              </div>
              <span className={`text-xs font-semibold hidden sm:inline ${step === s.num ? "text-amber-300" : "text-white/40"}`}>
                {s.label}
              </span>
              {s.num < 4 && <div className="h-0.5 flex-1 bg-white/10 mx-1" />}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Number of Students */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white">How many students will receive advocacy representation?</h2>
            <p className="text-xs text-white/60 mt-0.5">Sibling discount applied automatically for multi-student households.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { count: 1, label: "1 Student", desc: "Single student representation" },
              { count: 2, label: "2 Students", desc: "Two sibling representation" },
              { count: 3, label: "3+ Students", desc: "Family / Multi-sibling plan" }
            ].map((opt) => (
              <Card
                key={opt.count}
                onClick={() => handleStudentCountChange(opt.count)}
                className={`p-5 rounded-xl border cursor-pointer transition-all ${
                  studentCount === opt.count
                    ? "border-amber-400 bg-amber-400/10 ring-1 ring-amber-400/30"
                    : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-white text-base">{opt.label}</span>
                  {studentCount === opt.count && <CheckCircle2 className="h-4 w-4 text-amber-400" />}
                </div>
                <p className="text-xs text-white/60">{opt.desc}</p>
              </Card>
            ))}
          </div>

          <div className="space-y-3 pt-2">
            <label className="text-xs font-semibold text-white/80">Student Name(s)</label>
            {studentNames.map((name, i) => (
              <Input
                key={i}
                value={name}
                onChange={(e) => {
                  const updated = [...studentNames];
                  updated[i] = e.target.value;
                  setStudentNames(updated);
                }}
                placeholder={`Student ${i + 1} First and Last Name...`}
                className="bg-white/[0.04] border-white/15 text-white text-xs"
              />
            ))}
          </div>

          <div className="flex justify-end pt-4">
            <Button
              onClick={() => setStep(2)}
              className="gap-2 bg-amber-400 hover:bg-amber-500 text-[#071422] font-bold text-xs px-6"
            >
              Continue to Support Level
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Select Support Level */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white">Select Your Representation Tier</h2>
            <p className="text-xs text-white/60 mt-0.5">Pricing shown for {studentCount} student{studentCount > 1 ? "s" : ""}.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tiers.map((t) => {
              const price = studentCount > 1 ? t.priceMulti : t.priceSingle;
              const isSelected = selectedTier === t.id;
              return (
                <Card
                  key={t.id}
                  onClick={() => setSelectedTier(t.id)}
                  className={`p-5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                    isSelected
                      ? "border-amber-400 bg-amber-400/10 ring-1 ring-amber-400/30"
                      : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-1">
                      <Badge variant="outline" className="text-[10px] text-amber-300 border-amber-400/30">
                        {t.badge}
                      </Badge>
                      {isSelected && <CheckCircle2 className="h-4 w-4 text-amber-400" />}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-white text-base leading-snug">{t.name}</h3>
                      <div className="text-2xl font-black text-amber-300 mt-2">${price}</div>
                    </div>
                    <p className="text-xs text-white/70 leading-relaxed">{t.description}</p>
                    <ul className="space-y-1.5 pt-2 border-t border-white/10 text-[11px] text-white/80">
                      {t.features.map((f, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4">
            <Button variant="outline" size="sm" onClick={() => setStep(1)} className="text-xs border-white/20 text-white">
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button
              onClick={() => setStep(3)}
              className="gap-2 bg-amber-400 hover:bg-amber-500 text-[#071422] font-bold text-xs px-6"
            >
              Review & Payment Plan
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Review Order & Billing Frequency */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white">Review Your Advocacy Selection</h2>
            <p className="text-xs text-white/60 mt-0.5">Confirm student details and choose your payment schedule.</p>
          </div>

          <Card className="border-white/10 bg-white/[0.02] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="font-bold text-white text-base">{currentTierObj.name}</p>
                <p className="text-xs text-white/60">{studentCount} Student{studentCount > 1 ? "s" : ""} ({studentNames.filter(Boolean).join(", ") || "Student Profile"})</p>
              </div>
              <div className="text-xl font-bold text-amber-300">${totalPrice}</div>
            </div>

            {/* Payment Schedule Options */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-semibold text-white/80">Choose Billing Schedule</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setPaymentPlan("full")}
                  className={`p-4 rounded-xl border cursor-pointer ${
                    paymentPlan === "full" ? "border-amber-400 bg-amber-400/10" : "border-white/10 bg-white/[0.02]"
                  }`}
                >
                  <p className="font-bold text-white text-sm">Pay in Full (${totalPrice})</p>
                  <p className="text-xs text-white/60 mt-0.5">One-time payment for full coverage</p>
                </div>

                <div
                  onClick={() => setPaymentPlan("installments")}
                  className={`p-4 rounded-xl border cursor-pointer ${
                    paymentPlan === "installments" ? "border-amber-400 bg-amber-400/10" : "border-white/10 bg-white/[0.02]"
                  }`}
                >
                  <p className="font-bold text-white text-sm">2 Installments (${installmentPrice} today)</p>
                  <p className="text-xs text-white/60 mt-0.5">2nd payment auto-charged in 30 days</p>
                </div>
              </div>
            </div>
          </Card>

          <div className="flex items-center justify-between pt-4">
            <Button variant="outline" size="sm" onClick={() => setStep(2)} className="text-xs border-white/20 text-white">
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button
              onClick={() => setStep(4)}
              className="gap-2 bg-amber-400 hover:bg-amber-500 text-[#071422] font-bold text-xs px-6"
            >
              Proceed to Checkout
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Checkout */}
      {step === 4 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white">Authorize Advocacy Retainer Payment</h2>
            <p className="text-xs text-white/60 mt-0.5">Encrypted, PCI-compliant Stripe billing portal.</p>
          </div>

          <Card className="border-amber-400/30 bg-gradient-to-br from-amber-400/5 to-white/[0.02] p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 text-xs">
              <span className="text-white/70">Due Today</span>
              <span className="text-xl font-bold text-amber-300">
                ${paymentPlan === "full" ? totalPrice : installmentPrice}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <label className="text-xs font-semibold text-white/80">Card Information</label>
              <Input
                placeholder="Card Number: 4242 •••• •••• 4242"
                defaultValue="4242 •••• •••• 4242"
                className="bg-white/[0.04] border-white/15 text-white text-xs font-mono"
              />
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="MM / YY" defaultValue="09 / 28" className="bg-white/[0.04] border-white/15 text-white text-xs font-mono" />
                <Input placeholder="CVC" defaultValue="888" className="bg-white/[0.04] border-white/15 text-white text-xs font-mono" />
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-white/60 pt-2">
              <Lock className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Payment immediately unlocks Progressive Onboarding (Agreements, Student Setup, Records Upload).</span>
            </div>

            <Button
              onClick={handleSimulatePayment}
              disabled={isProcessing}
              className="w-full h-11 bg-amber-400 hover:bg-amber-500 text-[#071422] font-bold text-sm gap-2 shadow-lg shadow-amber-400/10"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              {isProcessing ? "Authorizing Payment..." : `Authorize & Pay $${paymentPlan === "full" ? totalPrice : installmentPrice}`}
            </Button>
          </Card>

          <div className="flex items-center justify-start pt-2">
            <Button variant="outline" size="sm" onClick={() => setStep(3)} className="text-xs border-white/20 text-white">
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
