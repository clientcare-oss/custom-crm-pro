import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Gift,
  Copy,
  Check,
  Share2,
  Users,
  Star,
  DollarSign,
  ShieldCheck,
  Sparkles,
  Clock,
  History,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import PageIdBadge from "@/components/PageIdBadge";
import { NextPaymentCreditCard } from "./NextPaymentCreditCard";
import { ApplyReferralCreditModal } from "./ApplyReferralCreditModal";

interface PortalReferralsTabProps {
  studentContactId?: number;
  effectiveStudent?: any;
  onNavigateTab?: (tabId: string) => void;
  isAdminView?: boolean;
}

export function PortalReferralsTab({
  studentContactId,
  effectiveStudent,
  onNavigateTab,
  isAdminView = false,
}: PortalReferralsTabProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

  // Fetch portal referral details and credit stats
  const {
    data: portalData,
    isLoading: isPortalLoading,
    refetch: refetchPortal,
  } = trpc.referrals.getPortalData.useQuery(undefined, {
    staleTime: 1000 * 15,
  });

  // Fetch upcoming scheduled payment and dynamic 5-day cutoff status
  const {
    data: upcomingPaymentData,
    isLoading: isUpcomingLoading,
    refetch: refetchUpcoming,
  } = trpc.referrals.getUpcomingPayment.useQuery(undefined, {
    staleTime: 1000 * 15,
  });

  const refetchAll = () => {
    refetchPortal();
    refetchUpcoming();
  };

  // Mutation to apply credit to upcoming payment (Client-Controlled)
  const applyCreditMutation = trpc.referrals.applyToNextPayment.useMutation({
    onSuccess: (res) => {
      toast.success(
        `Successfully applied $${(res.appliedCents / 100).toFixed(2)} referral credit to your upcoming payment!`
      );
      setIsApplyModalOpen(false);
      refetchAll();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to apply referral credit");
    },
  });

  // Mutation to cancel / reverse pending credit application
  const cancelCreditMutation = trpc.referrals.cancelCreditApplication.useMutation({
    onSuccess: () => {
      toast.success("Referral credit application cancelled. Credit returned to your available balance.");
      refetchAll();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to cancel credit application");
    },
  });

  const referralCode = portalData?.referralCode || "WP-WAYPT";

  // Build the complete referral URL
  const origin = typeof window !== "undefined" ? window.location.origin : "https://app.waypointadvocates.com";
  const referralUrl = `${origin}/get-started?ref=${referralCode}`;

  const stats = portalData?.stats || {
    referredCount: 0,
    convertedCount: 0,
    availableCreditCents: 0,
    availableCreditFormatted: "$0.00",
    pendingCreditCents: 0,
    pendingCreditFormatted: "$0.00",
    totalEarnedCents: 0,
    totalUsedCents: 0,
  };

  const handleCopyLink = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(referralUrl);
      setCopiedLink(true);
      toast.success("Referral link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: "Waypoint Advocates — Special Referral Invitation",
      text: "Join Waypoint Advocates for special education & IEP advocacy. Use my referral link to get $25 off your first advocacy plan!",
      url: referralUrl,
    };

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
        toast.success("Shared successfully!");
      } catch (err: any) {
        if (err.name !== "AbortError") {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleConfirmApply = async (amountCents: number, invoiceId?: number) => {
    await applyCreditMutation.mutateAsync({
      amountCents,
      invoiceId,
    });
  };

  const handleCancelCredit = (invoiceId: number) => {
    cancelCreditMutation.mutate({ invoiceId });
  };

  // Prefer upcoming payment data from dedicated endpoint, fallback to portal bundle
  const upcomingPayment = upcomingPaymentData || (portalData as any)?.upcomingPayment;

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-1 sm:px-2 md:px-4 py-2">
      {/* Page Identification Badge */}
      <div className="flex items-center justify-between">
        <PageIdBadge id="PG-023-REF" name="🎁 Client Portal Referrals" />
        <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-1 rounded-full flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          Give $25. Get $25.
        </span>
      </div>

      {/* Hero Header Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B3767] via-[#0A254D] to-[#071C3C] border border-[#0D4B84] p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-amber-500/10 via-emerald-500/10 to-transparent blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F5B544]/15 border border-[#F5B544]/40 text-[#F5B544] text-xs font-bold tracking-wide">
              <span>🎁</span>
              <span>SPECIAL REFERRAL OFFER</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Give $25. Get $25.
            </h1>
            <p className="text-blue-100/90 text-sm sm:text-base leading-relaxed">
              Share Waypoint with another family. When they sign up for an eligible advocacy service using your referral, they receive{" "}
              <strong className="text-white font-semibold">$25 off</strong> and you receive{" "}
              <strong className="text-[#F5B544] font-semibold">$25 in Referral Credit</strong>.
            </p>
          </div>

          {/* Quick Credit Capsule (Section 1: Available Referral Credit) */}
          <div className="bg-[#030C22]/80 border border-[#0D4B84] rounded-2xl p-4 sm:p-5 text-center min-w-[210px] shadow-inner">
            <p className="text-[11px] uppercase tracking-wider text-blue-300/80 font-bold mb-1 flex items-center justify-center gap-1">
              <span>🎁</span>
              <span>Available Credit</span>
            </p>
            <div className="text-3xl sm:text-4xl font-extrabold text-[#F5B544] tracking-tight font-mono">
              {stats.availableCreditFormatted}
            </div>
            <p className="text-[11px] text-blue-200/60 mt-1 font-medium">Available to Apply</p>
          </div>
        </div>
      </div>

      {/* Section 2, 4, 11, 12: Next Scheduled Payment Card (Client-Controlled Application) */}
      <NextPaymentCreditCard
        upcomingPayment={upcomingPayment}
        availableCreditCents={stats.availableCreditCents}
        availableCreditFormatted={stats.availableCreditFormatted}
        onOpenApplyModal={() => setIsApplyModalOpen(true)}
        onCancelCredit={handleCancelCredit}
        isCancelling={cancelCreditMutation.isPending}
      />

      {/* Your Referral Link Card */}
      <div className="rounded-2xl bg-[#071C3C]/80 border border-[#0D4B84] p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-400/40 flex items-center justify-center text-blue-400">
              <Share2 className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Your Referral Link
            </h2>
          </div>
          <span className="text-xs font-mono text-blue-300/90 bg-[#0A254D] border border-[#0D4B84] px-3 py-1 rounded-lg">
            Code: <strong className="text-[#F5B544] font-bold">{referralCode}</strong>
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="flex-1 min-w-0 bg-[#030C22] border border-[#0D4B84]/80 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono text-blue-200 select-all truncate">
            {referralUrl}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              onClick={handleCopyLink}
              className="flex-1 sm:flex-initial bg-[#0B3767] hover:bg-[#0D4B84] text-white border border-[#0D4B84] rounded-xl h-10 px-4 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? "Copied!" : "Copy Link"}</span>
            </Button>
            <Button
              type="button"
              onClick={handleShare}
              className="flex-1 sm:flex-initial bg-gradient-to-r from-amber-500 to-[#F5B544] hover:from-amber-600 hover:to-[#EAA428] text-slate-950 rounded-xl h-10 px-4 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </Button>
          </div>
        </div>
        <p className="text-xs text-blue-200/70">
          Families who click your link automatically save <strong className="text-white font-medium">$25</strong> on their first eligible advocacy package.
        </p>
      </div>

      {/* Section 1: Referral Metrics Grid (Total, Converted, Earned, Available, Used) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Card 1: Total Referrals */}
        <div className="rounded-2xl bg-[#071C3C]/80 border border-[#0D4B84] p-4 space-y-1 shadow-lg">
          <p className="text-[10px] uppercase font-bold text-blue-300/80 tracking-wider">Total Referrals</p>
          <p className="text-2xl font-extrabold text-white font-mono">{stats.referredCount}</p>
          <p className="text-[11px] text-blue-200/60">Families invited</p>
        </div>

        {/* Card 2: Converted */}
        <div className="rounded-2xl bg-[#071C3C]/80 border border-[#0D4B84] p-4 space-y-1 shadow-lg">
          <p className="text-[10px] uppercase font-bold text-amber-300/80 tracking-wider">Converted</p>
          <p className="text-2xl font-extrabold text-amber-300 font-mono">{stats.convertedCount}</p>
          <p className="text-[11px] text-blue-200/60">Became clients</p>
        </div>

        {/* Card 3: Total Earned */}
        <div className="rounded-2xl bg-[#071C3C]/80 border border-[#0D4B84] p-4 space-y-1 shadow-lg">
          <p className="text-[10px] uppercase font-bold text-blue-300/80 tracking-wider">Total Earned</p>
          <p className="text-2xl font-extrabold text-blue-200 font-mono">
            ${((stats.totalEarnedCents || 0) / 100).toFixed(2)}
          </p>
          <p className="text-[11px] text-blue-200/60">All-time rewards</p>
        </div>

        {/* Card 4: Available Credit */}
        <div className="rounded-2xl bg-gradient-to-br from-[#071C3C] to-emerald-950/30 border border-emerald-500/50 p-4 space-y-1 shadow-lg">
          <p className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider">Available Credit</p>
          <p className="text-2xl font-extrabold text-emerald-300 font-mono">{stats.availableCreditFormatted}</p>
          <p className="text-[11px] text-emerald-200/70">Ready to apply</p>
        </div>

        {/* Card 5: Credit Used */}
        <div className="rounded-2xl bg-[#071C3C]/80 border border-[#0D4B84] p-4 space-y-1 shadow-lg col-span-2 sm:col-span-1">
          <p className="text-[10px] uppercase font-bold text-blue-300/80 tracking-wider">Credit Used</p>
          <p className="text-2xl font-extrabold text-white font-mono">
            ${((stats.totalUsedCents || 0) / 100).toFixed(2)}
          </p>
          <p className="text-[11px] text-blue-200/60">
            {stats.pendingCreditCents > 0
              ? `+$${(stats.pendingCreditCents / 100).toFixed(2)} pending`
              : "Applied to invoices"}
          </p>
        </div>
      </div>

      {/* Section 9: Referral Credit Activity & Transaction History */}
      <div className="rounded-2xl bg-[#071C3C]/80 border border-[#0D4B84] p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#F5B544]" />
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Referral Credit Activity
            </h3>
          </div>
          <span className="text-xs text-blue-300/70">
            {portalData?.history?.length || 0} Entries
          </span>
        </div>

        {!portalData?.history || portalData.history.length === 0 ? (
          <div className="py-8 text-center text-xs text-blue-200/60 border border-dashed border-[#0D4B84]/60 rounded-xl bg-[#030C22]/30">
            No credit activity recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-[#0D4B84]/50">
            {portalData.history.map((tx: any) => {
              const isPositive = tx.amountCents > 0;
              const isPending = tx.status === "pending_application";
              return (
                <div key={tx.id} className="py-3 flex items-center justify-between flex-wrap gap-2 text-xs first:pt-0 last:pb-0">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-white">{tx.note}</p>
                    <div className="flex items-center gap-2 text-[11px] text-blue-300/70">
                      <span>{new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      <span>•</span>
                      <span className="capitalize">{tx.status?.replace("_", " ")}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isPending && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        Pending Application
                      </span>
                    )}
                    <span
                      className={`font-mono font-bold text-sm px-2.5 py-0.5 rounded-lg ${
                        isPositive
                          ? "text-emerald-300 bg-emerald-950/60 border border-emerald-500/40"
                          : "text-amber-300 bg-amber-950/60 border border-amber-500/40"
                      }`}
                    >
                      {tx.amountFormatted}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Your Referrals History (Privacy-Protected) */}
      <div className="rounded-2xl bg-[#071C3C]/80 border border-[#0D4B84] p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">Your Referrals</h3>
          </div>
          <span className="text-xs text-blue-300/70">
            {portalData?.referrals?.length || 0} Total Recorded
          </span>
        </div>

        {isPortalLoading ? (
          <div className="py-8 text-center text-xs text-blue-300/60">Loading referral records...</div>
        ) : !portalData?.referrals || portalData.referrals.length === 0 ? (
          <div className="py-10 text-center space-y-2 border border-dashed border-[#0D4B84]/60 rounded-xl p-6 bg-[#030C22]/40">
            <span className="text-3xl">🎁</span>
            <p className="text-sm font-semibold text-white">No referrals yet</p>
            <p className="text-xs text-blue-200/70 max-w-sm mx-auto">
              Share your personal link above with friends, parent support groups, or other families navigating the special education process.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#0D4B84]/50">
            {portalData.referrals.map((ref) => {
              const isQualifiedOrRewarded = ref.status === "rewarded" || ref.status === "qualified";
              return (
                <div key={ref.id} className="py-3.5 flex items-center justify-between flex-wrap gap-3 first:pt-0 last:pb-0">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-white tracking-wide">{ref.displayName}</p>
                    <div className="flex items-center gap-2 text-xs">
                      {isQualifiedOrRewarded ? (
                        <span className="inline-flex items-center gap-1 text-amber-300 font-semibold text-[11px]">
                          <span>⭐</span>
                          <span>Became a Client</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-blue-300/70 text-[11px]">
                          <Clock className="w-3 h-3 text-blue-400" />
                          <span>Pending First Payment</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {ref.status === "rewarded" ? (
                      <span className="px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold text-xs font-mono">
                        +$25.00 Referral Credit
                      </span>
                    ) : ref.status === "qualified" ? (
                      <span className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold text-xs">
                        Qualified
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-xl bg-blue-500/15 border border-blue-400/30 text-blue-300 text-xs">
                        ⏳ Pending
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2 & 3: Application Modal */}
      <ApplyReferralCreditModal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        upcomingPayment={upcomingPayment}
        availableCreditCents={stats.availableCreditCents}
        availableCreditFormatted={stats.availableCreditFormatted}
        onConfirm={handleConfirmApply}
        isApplying={applyCreditMutation.isPending}
      />
    </div>
  );
}
