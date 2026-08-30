import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  RefreshCw, 
  ShieldCheck, 
  Sparkles, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Award, 
  ArrowRight, 
  Check, 
  FileText, 
  Plus, 
  PhoneCall, 
  DollarSign, 
  CreditCard, 
  AlertCircle,
  GraduationCap,
  Scale,
  Users,
  Layers,
  ChevronRight,
  HelpCircle,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

interface RenewalListingExperienceProps {
  studentName?: string;
  studentGrade?: string;
  currentTierName?: string;
  expirationDate?: string;
  daysRemaining?: number;
  onRenewSuccess?: (renewalData: any) => void;
  onNavigateTab?: (tabId: string) => void;
}

interface RenewalPackage {
  id: string;
  name: string;
  tagline: string;
  badge?: string;
  isPopular?: boolean;
  annualPrice: number;
  monthlyPrice: number;
  description: string;
  features: string[];
  idealFor: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface RenewalAddon {
  id: string;
  name: string;
  price: number;
  description: string;
  recommendedFor?: string;
}

export function RenewalListingExperience({
  studentName = "Liam Jenkins",
  studentGrade = "5th Grade → 6th Grade (Middle School Transition)",
  currentTierName = "Full IEP Representation (2025–2026)",
  expirationDate = "September 15, 2026",
  daysRemaining = 16,
  onRenewSuccess,
  onNavigateTab,
}: RenewalListingExperienceProps) {
  const [selectedPackageId, setSelectedPackageId] = useState<string>("full-year");
  const [paymentFrequency, setPaymentFrequency] = useState<"annual" | "quarterly" | "monthly">("annual");
  const [selectedAddons, setSelectedAddons] = useState<string[]>(["bip-rider"]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRenewed, setIsRenewed] = useState(false);

  const packages: RenewalPackage[] = [
    {
      id: "full-year",
      name: "Full Academic Year Representation (2026–2027)",
      tagline: "Comprehensive, 365-day IEP defense & coaching for the upcoming school year",
      badge: "Most Popular Renewal",
      isPopular: true,
      annualPrice: 3450,
      monthlyPrice: 315,
      description: "End-to-end IEP coaching, direct coach attendance at all school meetings, ongoing progress tracking, and proactive dispute resolution.",
      features: [
        "Live advocate attendance at all IEP, 504 & Manifestation Determination (MDR) meetings",
        "Unlimited formal IEP draft revisions, prior written notice (PWN) audits, and amendments",
        "Quarterly IEP goal progress audit & independent measurement analysis",
        "Pre-meeting parent strategy agendas & talking point roadmaps delivered 48h prior",
        "Direct phone, SMS, and portal messaging priority line with Byron Honea"
      ],
      idealFor: "Families navigating active disputes, grade transitions, or heavy special education support needs.",
      icon: ShieldCheck
    },
    {
      id: "annual-goal-audit",
      name: "Annual IEP Goal Audit & Table Defense",
      tagline: "Precision draft analysis and live coach representation at the annual review",
      badge: "Essential Continuity",
      annualPrice: 1850,
      monthlyPrice: 175,
      description: "Targeted representation designed specifically around your student's annual ARD/IEP meeting date and testing review cycle.",
      features: [
        "Comprehensive audit of present levels of academic & functional performance (PLAAFP)",
        "Goal rewrite recommendations & accommodation crosswalk formulated before school table",
        "Live coach representation & co-chairing at 1 full annual IEP/504 meeting (up to 3 hrs)",
        "Post-meeting Prior Written Notice (PWN) accuracy audit & parent dissent filing if required",
        "30 days of post-meeting follow-up support"
      ],
      idealFor: "Students with stable placements needing strong annual IEP goal tightening and meeting presence.",
      icon: Scale
    },
    {
      id: "transition-prep",
      name: "Middle / High School Placement Transition",
      tagline: "Cross-campus IEP defense for major campus & feeder school transitions",
      badge: "Transition Special",
      annualPrice: 2450,
      monthlyPrice: 230,
      description: "Customized advocacy program focused on building-to-building transitions, new caseload teachers, and secondary IEP accommodations.",
      features: [
        "Campus transition accommodation translation (elementary to middle / high school)",
        "Pre-transfer staff conference representation & transition IEP defense",
        "Executive functioning & sensory accommodation environmental evaluation",
        "Attendance at transition IEP meeting + first-semester 60-day check-in meeting",
        "Direct teacher introductory dossier prepared for new faculty"
      ],
      idealFor: "Students moving to a new campus, entering middle school, or preparing for high school credits.",
      icon: GraduationCap
    },
    {
      id: "retainer-bucket",
      name: "Advocacy Retainer Block (15 Flexible Hours)",
      tagline: "Bank of dedicated hours for agile, as-needed special education counsel",
      badge: "Flexible Usage",
      annualPrice: 1950,
      monthlyPrice: 185,
      description: "Draw down on Byron Honea's master advocacy hours for unexpected school crises, emergency meetings, or formal record requests.",
      features: [
        "15 dedicated master advocacy hours valid for 12 months",
        "Use for emergency IEP meetings, mediation prep, or formal FERPA record requests",
        "Rollover of up to 3 unused hours into the following academic cycle",
        "Detailed time tracking with itemized minute-by-minute portal ledger",
        "Priority scheduling within 48 business hours"
      ],
      idealFor: "Families wanting an experienced advocate on retainer for emergency advisory and fast escalation.",
      icon: RefreshCw
    }
  ];

  const addons: RenewalAddon[] = [
    {
      id: "iee-rider",
      name: "Independent Educational Evaluation (IEE) Oversight Rider",
      price: 450,
      description: "Full oversight of district IEE funding criteria, evaluator vetting, and independent testing review.",
      recommendedFor: "If school evaluations failed to identify dyslexia, ADHD, or autism needs."
    },
    {
      id: "bip-rider",
      name: "Behavior Intervention Plan (BIP / FBA) Deep Dive",
      price: 350,
      description: "Functional Behavior Assessment review, sensory regulation accommodation crosswalk, and de-escalation plan audit.",
      recommendedFor: "Recommended for Liam based on 2025–2026 accommodation notes."
    },
    {
      id: "sibling-discount",
      name: "Sibling Continuity Plan Add-on (20% Off)",
      price: 850,
      description: "Extend advocacy representation and portal access to a second student in your household.",
      recommendedFor: "Households with multiple IEP/504 students."
    },
    {
      id: "rush-service",
      name: "24-Hour Expedited Document Review Guarantee",
      price: 250,
      description: "Guaranteed 24-business-hour turnaround on school document reviews and emergency letters.",
      recommendedFor: "Urgent dispute timelines."
    }
  ];

  const selectedPkg = packages.find((p) => p.id === selectedPackageId) || packages[0];

  const toggleAddon = (addonId: string) => {
    setSelectedAddons((prev) =>
      prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]
    );
  };

  // Pricing calculations
  const calculateTotal = () => {
    let basePrice = selectedPkg.annualPrice;
    if (paymentFrequency === "monthly") {
      basePrice = selectedPkg.monthlyPrice * 12;
    } else if (paymentFrequency === "quarterly") {
      basePrice = Math.round(selectedPkg.annualPrice * 1.05);
    }

    const addonsTotal = selectedAddons.reduce((sum, id) => {
      const addon = addons.find((a) => a.id === id);
      return sum + (addon ? addon.price : 0);
    }, 0);

    const loyaltyDiscount = paymentFrequency === "annual" ? Math.round(basePrice * 0.1) : 0;
    const finalTotal = basePrice + addonsTotal - loyaltyDiscount;

    return {
      basePrice,
      addonsTotal,
      loyaltyDiscount,
      finalTotal,
      paymentAmount: 
        paymentFrequency === "annual" 
          ? finalTotal 
          : paymentFrequency === "quarterly" 
          ? Math.round(finalTotal / 4) 
          : Math.round(finalTotal / 12)
    };
  };

  const totals = calculateTotal();

  const handleConfirmRenewal = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsRenewed(true);
      toast.success(`Advocacy Plan Successfully Renewed for ${studentName}!`, {
        description: `Your representation is locked in through August 31, 2027.`
      });
      if (onRenewSuccess) {
        onRenewSuccess({
          packageId: selectedPackageId,
          packageName: selectedPkg.name,
          paymentFrequency,
          total: totals.finalTotal,
          addons: selectedAddons,
          extendedUntil: "2027-08-31"
        });
      }
    }, 1500);
  };

  if (isRenewed) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 animate-in fade-in zoom-in-95 duration-300">
        <Card className="border-2 border-emerald-500/40 bg-gradient-to-b from-emerald-500/10 via-background to-background shadow-2xl rounded-3xl overflow-hidden text-center p-8 sm:p-12 space-y-6">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="h-10 w-10 animate-bounce" />
          </div>

          <div className="space-y-2">
            <Badge className="bg-emerald-500 text-white font-bold text-xs uppercase px-3 py-1">
              Representation Confirmed & Active
            </Badge>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Advocacy Plan Renewed for {studentName}!
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Thank you for trusting Waypoint Advocates for the 2026–2027 school year. Your coverage has been extended through <strong className="text-foreground">August 31, 2027</strong>.
            </p>
          </div>

          <div className="bg-card border border-border/60 rounded-2xl p-6 max-w-lg mx-auto text-left space-y-3 text-xs sm:text-sm">
            <div className="flex justify-between py-1.5 border-b border-border/40">
              <span className="text-muted-foreground">Plan Selected:</span>
              <span className="font-bold text-foreground">{selectedPkg.name}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/40">
              <span className="text-muted-foreground">Billing Schedule:</span>
              <span className="font-semibold capitalize text-foreground">{paymentFrequency} Schedule</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/40">
              <span className="text-muted-foreground">Add-on Riders:</span>
              <span className="font-semibold text-foreground">{selectedAddons.length} Applied</span>
            </div>
            <div className="flex justify-between py-1.5 text-base font-bold text-emerald-600 dark:text-emerald-400">
              <span>Total Confirmed:</span>
              <span>${totals.finalTotal.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              onClick={() => onNavigateTab ? onNavigateTab("compass") : window.location.reload()}
              className="w-full sm:w-auto bg-primary text-primary-foreground font-semibold px-6 h-11"
            >
              Return to Case Compass
            </Button>
            <Button
              variant="outline"
              onClick={() => toast.info("Receipt sent to parent email on file.")}
              className="w-full sm:w-auto border-border/60 text-foreground"
            >
              <FileText className="h-4 w-4 mr-2" />
              Download Renewal Agreement Addendum
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* Top Banner: Status & Continuity Alert */}
      <div className="bg-gradient-to-r from-primary/15 via-amber-500/10 to-primary/5 p-6 rounded-3xl border border-primary/25 shadow-md relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-amber-500 text-white font-bold text-[10px] tracking-wider uppercase px-2.5 py-0.5">
                Annual School Year Rollover
              </Badge>
              <Badge variant="outline" className="text-xs font-mono border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/10">
                <Clock className="h-3 w-3 mr-1 inline" />
                {daysRemaining} Days Remaining on Current Plan
              </Badge>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2.5">
              <RefreshCw className="h-7 w-7 text-primary" />
              Advocacy Plan Renewal & Continuation Hub
            </h1>

            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Lock in Byron Honea's master advocacy coaching for <strong className="text-foreground">{studentName}</strong> ({studentGrade}). Current agreement expires on <strong className="text-foreground">{expirationDate}</strong>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="bg-card/90 backdrop-blur-sm border border-border/60 p-3.5 rounded-2xl text-center sm:text-right shadow-sm">
              <span className="text-[11px] text-muted-foreground font-medium block">Current Representation</span>
              <span className="text-sm font-bold text-foreground block">{currentTierName}</span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-0.5">
                ✓ 10% Loyalty Savings Eligible
              </span>
            </div>

            <Button
              variant="outline"
              onClick={() => toast.info("Connecting to Byron's calendar for a 15-min Renewal Alignment Call...")}
              className="gap-2 text-xs font-semibold h-11 border-border/60 hover:bg-muted"
            >
              <PhoneCall className="h-4 w-4 text-primary" />
              Request Alignment Call
            </Button>
          </div>
        </div>
      </div>

      {/* Payment Frequency Switcher */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/20 p-4 rounded-2xl border border-border/40">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            Select Billing Term & Payment Frequency
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Choose annual lump-sum for maximum loyalty savings, or flexible installment payments.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-background p-1 rounded-xl border border-border/60 shadow-sm">
          <Button
            size="sm"
            variant={paymentFrequency === "annual" ? "default" : "ghost"}
            onClick={() => setPaymentFrequency("annual")}
            className={`h-8 text-xs font-semibold rounded-lg px-3 transition-all ${
              paymentFrequency === "annual" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            Pay Annually
            <Badge className="ml-1.5 bg-emerald-500 text-white text-[9px] px-1 py-0 font-extrabold">Save 10%</Badge>
          </Button>

          <Button
            size="sm"
            variant={paymentFrequency === "quarterly" ? "default" : "ghost"}
            onClick={() => setPaymentFrequency("quarterly")}
            className={`h-8 text-xs font-semibold rounded-lg px-3 transition-all ${
              paymentFrequency === "quarterly" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            4x Quarterly
          </Button>

          <Button
            size="sm"
            variant={paymentFrequency === "monthly" ? "default" : "ghost"}
            onClick={() => setPaymentFrequency("monthly")}
            className={`h-8 text-xs font-semibold rounded-lg px-3 transition-all ${
              paymentFrequency === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            Monthly
          </Button>
        </div>
      </div>

      {/* Main 2-Column Section: Packages on Left, Addons & Summary on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Renewal Packages Grid (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              1. Choose Renewal Package for 2026–2027
            </h2>
            <span className="text-xs text-muted-foreground">4 Options Available</span>
          </div>

          <div className="space-y-4">
            {packages.map((pkg) => {
              const isSelected = selectedPackageId === pkg.id;
              const IconComp = pkg.icon;

              const displayPrice =
                paymentFrequency === "annual"
                  ? pkg.annualPrice
                  : paymentFrequency === "quarterly"
                  ? Math.round((pkg.annualPrice * 1.05) / 4)
                  : pkg.monthlyPrice;

              const priceSuffix =
                paymentFrequency === "annual"
                  ? "/academic year"
                  : paymentFrequency === "quarterly"
                  ? "/quarter"
                  : "/month";

              return (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedPackageId(pkg.id)}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-lg"
                      : "border-border/60 bg-card hover:border-border hover:bg-muted/10"
                  }`}
                >
                  {pkg.badge && (
                    <div className="absolute top-4 right-4">
                      <Badge
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 ${
                          pkg.isPopular
                            ? "bg-amber-500 text-white"
                            : "bg-primary/20 text-primary border border-primary/30"
                        }`}
                      >
                        {pkg.badge}
                      </Badge>
                    </div>
                  )}

                  <div className="flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <IconComp className="h-5 w-5" />
                    </div>

                    <div className="space-y-2 flex-1 pr-16">
                      <div>
                        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                          {pkg.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                          {pkg.tagline}
                        </p>
                      </div>

                      <div className="flex items-baseline gap-1.5 pt-1">
                        <span className="text-2xl font-extrabold text-foreground">
                          ${displayPrice.toLocaleString()}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">{priceSuffix}</span>
                        {paymentFrequency === "annual" && (
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold ml-2">
                            (Includes 10% Loyalty Discount)
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                        {pkg.description}
                      </p>

                      {/* Feature Bullet Points */}
                      <ul className="space-y-1.5 pt-2 text-xs text-foreground/90">
                        {pkg.features.map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            <span className="leading-tight">{feat}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="pt-2 text-[11px] text-muted-foreground bg-muted/30 p-2.5 rounded-lg border border-border/40 font-medium">
                        <strong>Best Suited For:</strong> {pkg.idealFor}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Add-ons & Live Checkout Card (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Add-ons & Riders */}
          <Card className="border-border/60 shadow-md rounded-2xl overflow-hidden">
            <CardHeader className="bg-muted/15 pb-3">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Plus className="h-4 w-4 text-primary" />
                  2. Optional Add-on Riders
                </span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {selectedAddons.length} Selected
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Enhance your continuity plan with targeted specialized evaluations.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              {addons.map((addon) => {
                const isSelected = selectedAddons.includes(addon.id);

                return (
                  <div
                    key={addon.id}
                    onClick={() => toggleAddon(addon.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? "border-primary/60 bg-primary/5"
                        : "border-border/50 bg-background hover:bg-muted/20"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-muted-foreground/40 bg-background"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-xs text-foreground truncate">
                          {addon.name}
                        </span>
                        <span className="font-bold text-xs text-foreground shrink-0">
                          +${addon.price}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                        {addon.description}
                      </p>
                      {addon.recommendedFor && (
                        <span className="inline-block text-[10px] font-medium text-amber-600 dark:text-amber-400 mt-1">
                          ✦ {addon.recommendedFor}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Live Checkout Summary Card */}
          <Card className="border-2 border-primary/40 bg-gradient-to-b from-primary/5 via-card to-card shadow-xl rounded-2xl overflow-hidden sticky top-6">
            <CardHeader className="bg-primary/10 border-b border-primary/20 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Renewal Order Summary
                </CardTitle>
                <Badge className="bg-primary text-primary-foreground font-bold text-[10px]">
                  2026–2027 Cycle
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Student: <strong className="text-foreground">{studentName}</strong> • Byron Honea, Advocate
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 space-y-4 text-xs sm:text-sm">
              <div className="space-y-2 pb-3 border-b border-border/50">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-muted-foreground">{selectedPkg.name}</span>
                  <span className="font-semibold text-foreground text-right shrink-0">
                    ${totals.basePrice.toLocaleString()}
                  </span>
                </div>

                {selectedAddons.map((addonId) => {
                  const addon = addons.find((a) => a.id === addonId);
                  if (!addon) return null;
                  return (
                    <div key={addonId} className="flex justify-between items-start gap-2 text-xs">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Plus className="h-3 w-3 text-primary shrink-0" />
                        {addon.name}
                      </span>
                      <span className="font-semibold text-foreground shrink-0">+${addon.price}</span>
                    </div>
                  );
                })}

                {totals.loyaltyDiscount > 0 && (
                  <div className="flex justify-between items-start gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                    <span>10% Loyalty Savings (Annual Term)</span>
                    <span>-${totals.loyaltyDiscount.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Total Row */}
              <div className="pt-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-bold text-foreground">
                    {paymentFrequency === "annual" ? "Annual Total:" : "Total Academic Investment:"}
                  </span>
                  <span className="text-2xl font-black text-primary">
                    ${totals.finalTotal.toLocaleString()}
                  </span>
                </div>
                {paymentFrequency !== "annual" && (
                  <div className="flex justify-between items-baseline mt-1 text-xs text-muted-foreground">
                    <span>Due Today ({paymentFrequency}):</span>
                    <span className="font-bold text-foreground">
                      ${totals.paymentAmount.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Terms Checkbox note */}
              <div className="p-3 rounded-xl bg-muted/30 border border-border/40 text-[11px] text-muted-foreground leading-relaxed flex gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  By confirming renewal, your Representation Agreement Addendum will be countersigned and filed to your R2 Document Vault.
                </span>
              </div>
            </CardContent>

            <CardFooter className="p-5 pt-0 flex flex-col gap-2.5">
              <Button
                onClick={handleConfirmRenewal}
                disabled={isProcessing}
                className="w-full h-12 text-sm font-bold bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Locking In 2026–2027 Representation...
                  </>
                ) : (
                  <>
                    Confirm & Renew Representation
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>

              <p className="text-[10px] text-center text-muted-foreground">
                🔒 256-Bit Encrypted Secure PCI-Compliant Checkout • Backed by Byron Honea
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
