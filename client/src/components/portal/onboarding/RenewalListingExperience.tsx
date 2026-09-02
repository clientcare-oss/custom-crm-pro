import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  RefreshCw, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  Check, 
  FileText, 
  PhoneCall, 
  Scale, 
  Loader2,
  Lock
} from "lucide-react";
import { toast } from "sonner";
import PageIdBadge from "@/components/PageIdBadge";

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
  monthlyPrice: number;
  description: string;
  features: string[];
  idealFor: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function RenewalListingExperience({
  studentName = "Liam Jenkins",
  studentGrade = "5th Grade → 6th Grade",
  currentTierName = "Active Advocacy Coverage (2025–2026)",
  expirationDate = "September 15, 2026",
  daysRemaining = 14,
  onRenewSuccess,
  onNavigateTab,
}: RenewalListingExperienceProps) {
  const [selectedPackageId, setSelectedPackageId] = useState<string>("comprehensive-105");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRenewed, setIsRenewed] = useState(false);

  // Exactly the 2 requested plans ($55/mo and $105/mo per student)
  const packages: RenewalPackage[] = [
    {
      id: "essential-55",
      name: "Essential Continuity & IEP Advisory",
      tagline: "Ongoing special education coaching, document review checks, and strategic parent guidance",
      badge: "Continuous Advisory",
      isPopular: false,
      monthlyPrice: 55,
      description: "Continuous advocacy support designed to keep your child's IEP on track with document audits, goal progress checks, and on-demand coach guidance.",
      features: [
        "Unlimited IEP & 504 document audits, draft review checks, and amendment analyses",
        "Quarterly IEP goal progress audit & school compliance monitoring",
        "Pre-meeting parent strategy agendas & talking point roadmaps delivered 48h prior",
        "Direct priority portal messaging & strategic advisory with Master IEP Coach® Byron Honea",
        "Full access to Document Vault, IEP Comparator, and Case Compass™"
      ],
      idealFor: "Families wanting continuous IEP oversight, draft reviews, and expert coaching between school meetings.",
      icon: ShieldCheck
    },
    {
      id: "comprehensive-105",
      name: "Comprehensive Direct Advocacy & Meeting Representation",
      tagline: "Full-spectrum active representation with live advocate attendance at all school IEP/504 conferences",
      badge: "Most Popular Renewal",
      isPopular: true,
      monthlyPrice: 105,
      description: "End-to-end direct advocacy coaching with live coach representation at every school conference table and active dispute defense.",
      features: [
        "Includes everything in the Essential Continuity Plan, plus:",
        "Live advocate attendance & co-chairing at all IEP, 504 & MDR school meetings (virtual or in-person)",
        "Priority rapid document turnarounds (Prior Written Notices, evaluation requests, dissent filings)",
        "Dedicated 1-on-1 strategy prep & debrief session with Byron before and after every meeting",
        "Campus & grade transition defense (elementary to middle/high school, secondary placement reviews)",
        "Formal dispute guidance & administrative complaint drafting support if district non-compliance arises"
      ],
      idealFor: "Families with active disputes, upcoming annual IEP reviews, grade transitions, or complex accommodation needs.",
      icon: Scale
    }
  ];

  const selectedPkg = packages.find((p) => p.id === selectedPackageId) || packages[1];
  const monthlyTotal = selectedPkg.monthlyPrice;

  const handleConfirmRenewal = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsRenewed(true);
      toast.success(`Advocacy Plan Successfully Renewed for ${studentName}!`, {
        description: `$${monthlyTotal}/month per student coverage is active.`
      });
      if (onRenewSuccess) {
        onRenewSuccess({
          packageId: selectedPackageId,
          packageName: selectedPkg.name,
          monthlyRate: monthlyTotal,
          studentName
        });
      }
    }, 1200);
  };

  if (isRenewed) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 animate-in fade-in zoom-in-95 duration-300">
        <Card className="border border-blue-900/40 bg-[#06172F] shadow-2xl rounded-3xl overflow-hidden text-center p-8 sm:p-12 space-y-6 text-white">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="h-10 w-10 animate-bounce" />
          </div>

          <div className="space-y-2">
            <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-xs uppercase px-3 py-1">
              Representation Confirmed & Active
            </Badge>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Advocacy Plan Renewed for {studentName}!
            </h1>
            <p className="text-sm sm:text-base text-blue-200/70 max-w-xl mx-auto leading-relaxed">
              Thank you for trusting Waypoint Advocates. Byron Honea's master coaching coverage is active for <strong className="text-amber-300">{studentName}</strong> at <strong className="text-white">${monthlyTotal}/month</strong>.
            </p>
          </div>

          <div className="bg-[#030C22] border border-blue-900/40 rounded-2xl p-6 max-w-lg mx-auto text-left space-y-3 text-xs sm:text-sm shadow-xl">
            <div className="flex justify-between py-1.5 border-b border-blue-900/30">
              <span className="text-white/60">Student:</span>
              <span className="font-bold text-white">{studentName}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-blue-900/30">
              <span className="text-white/60">Selected Plan:</span>
              <span className="font-bold text-white">{selectedPkg.name}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-blue-900/30">
              <span className="text-white/60">Monthly Investment:</span>
              <span className="font-semibold text-white">
                ${selectedPkg.monthlyPrice} / month per student
              </span>
            </div>
            <div className="flex justify-between py-1.5 text-base font-bold text-emerald-400">
              <span>Monthly Recurring:</span>
              <span className="text-amber-300 font-mono font-black">
                ${monthlyTotal}/month
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              onClick={() => onNavigateTab ? onNavigateTab("compass") : window.location.reload()}
              className="w-full sm:w-auto bg-[#F5B544] hover:bg-[#E5A534] text-[#07152B] font-bold px-6 h-11 rounded-xl shadow-md cursor-pointer"
            >
              Return to Case Compass™
            </Button>
            <Button
              variant="outline"
              onClick={() => toast.info("Receipt sent to parent email on file.")}
              className="w-full sm:w-auto border-blue-900/40 bg-[#030C22] hover:bg-blue-900/40 text-white rounded-xl cursor-pointer"
            >
              <FileText className="h-4 w-4 mr-2 text-amber-400" />
              Download Renewal Addendum
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* ── Top Header Banner: Plan Renewal ── */}
      <div className="bg-gradient-to-br from-[#0B2553] via-[#071D40] to-[#04122C] p-6 sm:p-7 rounded-3xl border border-blue-900/40 shadow-2xl relative overflow-hidden text-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-[#F5B544] text-slate-950 font-bold text-[10px] tracking-wider uppercase px-2.5 py-0.5 shadow-sm">
                Advocacy Continuity
              </Badge>
              <Badge variant="outline" className="text-xs font-mono border-amber-400/50 text-amber-300 bg-amber-400/10">
                <Clock className="h-3 w-3 mr-1 inline text-amber-400" />
                {daysRemaining} Days Remaining on Current Plan
              </Badge>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-serif font-normal text-white tracking-tight flex items-center gap-2.5">
                <RefreshCw className="h-7 w-7 text-[#F5B544]" />
                Advocacy Plan Renewal & Continuation Hub
              </h1>
              <PageIdBadge id="PG-023-RNW" name="Plan Renewal" />
            </div>

            <p className="text-xs sm:text-sm text-blue-200/75 max-w-2xl leading-relaxed">
              Maintain uninterrupted representation for <strong className="text-white font-semibold">{studentName}</strong> ({studentGrade}). Current agreement active through <strong className="text-amber-300 font-semibold">{expirationDate}</strong>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="bg-[#030C22] border border-blue-900/40 p-3.5 rounded-2xl text-center sm:text-right shadow-xl">
              <span className="text-[11px] text-white/50 font-medium block">Active Coverage</span>
              <span className="text-sm font-bold text-white block">{currentTierName}</span>
              <span className="text-[11px] text-emerald-400 font-semibold block mt-0.5">
                ✓ Continuous Student Protection
              </span>
            </div>

            <Button
              variant="outline"
              onClick={() => toast.info("Connecting to Byron's calendar for a 15-min Renewal Alignment Call...")}
              className="gap-2 text-xs font-semibold h-11 border-blue-900/40 bg-[#030C22] hover:bg-blue-900/40 text-white rounded-xl cursor-pointer"
            >
              <PhoneCall className="h-4 w-4 text-[#F5B544]" />
              Request Alignment Call
            </Button>
          </div>
        </div>
      </div>

      {/* ── Main Section: 2 Plan Cards ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#F5B544]" />
            Select Advocacy Plan for {studentName}
          </h2>
          <span className="text-xs text-blue-200/60 font-mono">Billed Monthly Per Student</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {packages.map((pkg) => {
            const isSelected = selectedPackageId === pkg.id;
            const IconComp = pkg.icon;

            return (
              <div
                key={pkg.id}
                onClick={() => setSelectedPackageId(pkg.id)}
                className={`p-6 sm:p-7 rounded-3xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between shadow-2xl ${
                  isSelected
                    ? "border-amber-400/80 bg-gradient-to-br from-[#0B2553] via-[#071D40] to-[#04122C] text-white shadow-[0_4px_30px_rgba(11,37,83,0.45)] ring-1 ring-amber-400/40"
                    : "border-blue-900/40 bg-[#06172F] text-white/80 hover:border-blue-700/60 hover:bg-[#071D40]/70"
                }`}
              >
                {/* Top Accent Line */}
                <div className={`absolute top-0 left-0 right-0 h-[2.5px] ${
                  isSelected 
                    ? "bg-gradient-to-r from-transparent via-[#F5B544] to-transparent" 
                    : "bg-transparent"
                }`} />

                {pkg.badge && (
                  <div className="absolute top-5 right-5">
                    <Badge
                      className={`text-[10px] font-bold uppercase px-2.5 py-0.5 ${
                        pkg.isPopular
                          ? "bg-[#F5B544] text-[#07152B] shadow-md"
                          : "bg-[#030C22] text-amber-300 border border-amber-400/40"
                      }`}
                    >
                      {pkg.badge}
                    </Badge>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
                        isSelected
                          ? "bg-[#F5B544] text-[#07152B] shadow-md"
                          : "bg-[#030C22] text-amber-300 border border-blue-900/40"
                      }`}
                    >
                      <IconComp className="h-6 w-6" />
                    </div>

                    <div className="pr-16">
                      <h3 className="text-lg sm:text-xl font-bold text-white leading-tight">
                        {pkg.name}
                      </h3>
                      <p className="text-xs text-blue-200/65 mt-1 leading-snug">
                        {pkg.tagline}
                      </p>
                    </div>
                  </div>

                  {/* Pricing Display */}
                  <div className="p-4 rounded-2xl bg-[#030C22] border border-blue-900/40 flex items-center justify-between">
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-4xl font-extrabold text-white font-mono tracking-tight">
                          ${pkg.monthlyPrice}
                        </span>
                        <span className="text-xs text-blue-200/70 font-medium">/month per student</span>
                      </div>
                      <span className="text-[11px] text-emerald-400 font-medium block mt-0.5">
                        ✓ Continuous monthly coverage • Cancel/pause anytime
                      </span>
                    </div>

                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected ? "border-[#F5B544] bg-[#F5B544] text-[#07152B]" : "border-white/30"
                    }`}>
                      {isSelected && <Check className="h-4 w-4 stroke-[3]" />}
                    </div>
                  </div>

                  <p className="text-xs text-white/80 leading-relaxed">
                    {pkg.description}
                  </p>

                  {/* Features list */}
                  <div className="space-y-2.5 pt-2 border-t border-white/10">
                    <span className="text-[11px] font-bold text-[#F5B544] uppercase tracking-wider block font-mono">
                      What's Included:
                    </span>
                    <ul className="space-y-2.5 text-xs text-white/90">
                      {pkg.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span className="leading-tight">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Best suited for block */}
                <div className="pt-4 mt-4 text-[11px] text-blue-200/60 bg-[#030C22] p-3 rounded-xl border border-blue-900/40">
                  <strong className="text-amber-300 font-semibold">Best Suited For:</strong> {pkg.idealFor}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Summary & Single Confirm Action Card ── */}
      <Card className="border border-amber-400/60 bg-gradient-to-br from-[#0B2553] via-[#071D40] to-[#04122C] shadow-2xl rounded-3xl overflow-hidden text-white">
        <CardHeader className="bg-[#030C22]/60 border-b border-blue-900/40 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-extrabold text-white flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#F5B544]" />
                Renewal Summary for {studentName}
              </CardTitle>
              <CardDescription className="text-xs text-blue-200/70 mt-0.5">
                Master IEP Coach® Byron Honea Representation Coverage
              </CardDescription>
            </div>
            <Badge className="bg-[#F5B544] text-[#07152B] font-bold text-xs px-3 py-1 self-start sm:self-auto">
              ${monthlyTotal} / month per student
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-[#030C22] border border-blue-900/40 text-xs">
              <span className="text-white/50 block font-medium">Student</span>
              <span className="font-bold text-white text-sm block mt-0.5">{studentName}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#030C22] border border-blue-900/40 text-xs">
              <span className="text-white/50 block font-medium">Selected Plan</span>
              <span className="font-bold text-white text-sm block mt-0.5 truncate">{selectedPkg.name}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#030C22] border border-blue-900/40 text-xs">
              <span className="text-white/50 block font-medium">Billing Term</span>
              <span className="font-bold text-amber-300 text-sm block mt-0.5 font-mono">${monthlyTotal}/month recurring</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#030C22] border border-blue-900/40 text-xs text-blue-200/70 leading-relaxed flex items-start gap-2.5">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              By confirming renewal, your advocacy representation will automatically continue uninterrupted. You can adjust or pause representation anytime with 30 days notice.
            </span>
          </div>
        </CardContent>

        <CardFooter className="p-5 sm:p-6 pt-0 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-white/50 flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-amber-400" />
            <span>256-Bit Encrypted Secure Checkout • Backed by Byron Honea</span>
          </div>

          <Button
            onClick={handleConfirmRenewal}
            disabled={isProcessing}
            className="w-full sm:w-auto h-12 px-8 text-sm font-bold bg-[#F5B544] hover:bg-[#E5A534] text-[#07152B] shadow-md transition-all gap-2 rounded-xl cursor-pointer"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Confirming Coverage...
              </>
            ) : (
              <>
                Confirm & Renew Coverage (${monthlyTotal}/mo)
                <ArrowRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default RenewalListingExperience;
