import React, { useState, useMemo } from "react";
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
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Info,
  CreditCard,
  Clock,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import PageIdBadge from "@/components/PageIdBadge";

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
  const [applyAmountString, setApplyAmountString] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);

  // Fetch portal referral details and credit stats
  const { data: portalData, isLoading, refetch } = trpc.referrals.getPortalData.useQuery(undefined, {
    staleTime: 1000 * 30,
  });

  // Fetch open/unpaid invoices for this student if any, so user can choose where to apply credit
  const { data: billingData } = trpc.portal.getStudentBilling.useQuery(
    { studentContactId: studentContactId! },
    { enabled: !!studentContactId }
  );

  const applyCreditMutation = trpc.referrals.applyPortalCredit.useMutation({
    onSuccess: (res) => {
      toast.success(
        `Applied $${(res.appliedCents / 100).toFixed(2)} Waypoint Credit to your payment!`
      );
      setIsApplyModalOpen(false);
      setApplyAmountString("");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to apply credit");
    },
  });

  // Find eligible unpaid invoices
  const eligibleInvoices = useMemo(() => {
    if (!billingData?.invoices) return [];
    return billingData.invoices.filter(
      (inv: any) => inv.status !== "Paid" && inv.status !== "Cancelled"
    );
  }, [billingData?.invoices]);

  const referralCode = portalData?.referralCode || "WP-WAYPT";

  // Build the complete referral URL
  const origin = typeof window !== "undefined" ? window.location.origin : "https://app.waypointadvocates.com";
  const referralUrl = `${origin}/get-started?ref=${referralCode}`;

  const stats = portalData?.stats || {
    referredCount: 0,
    convertedCount: 0,
    availableCreditCents: 0,
    availableCreditFormatted: "$0.00",
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

  const handleOpenApplyModal = () => {
    if (stats.availableCreditCents <= 0) {
      toast.info("You do not currently have available Waypoint Credit.");
      return;
    }

    if (eligibleInvoices.length > 0) {
      setSelectedInvoiceId(eligibleInvoices[0].id);
      const invoiceDue = Math.round(parseFloat(eligibleInvoices[0].total || "0") * 100);
      const maxApplicable = Math.min(stats.availableCreditCents, invoiceDue);
      setApplyAmountString((maxApplicable / 100).toFixed(2));
    } else {
      setApplyAmountString((stats.availableCreditCents / 100).toFixed(2));
    }

    setIsApplyModalOpen(true);
  };

  const handleConfirmApply = () => {
    const amountVal = parseFloat(applyAmountString);
    if (isNaN(amountVal) || amountVal <= 0) {
      toast.error("Please enter a valid dollar amount greater than $0");
      return;
    }

    const amountCents = Math.round(amountVal * 100);
    if (amountCents > stats.availableCreditCents) {
      toast.error(`Amount exceeds your available Waypoint Credit (${stats.availableCreditFormatted})`);
      return;
    }

    if (!selectedInvoiceId && eligibleInvoices.length > 0) {
      setSelectedInvoiceId(eligibleInvoices[0].id);
    }

    const targetInvoice = eligibleInvoices.find((i: any) => i.id === selectedInvoiceId) || eligibleInvoices[0];
    if (!targetInvoice) {
      toast.info(
        "No eligible upcoming invoices found. Your Waypoint Credit remains securely saved in your account for your next payment or renewal."
      );
      setIsApplyModalOpen(false);
      return;
    }

    const invoiceDue = Math.round(parseFloat(targetInvoice.total || "0") * 100);
    if (amountCents > invoiceDue) {
      toast.error(`Cannot apply more than the invoice balance due ($${(invoiceDue / 100).toFixed(2)})`);
      return;
    }

    applyCreditMutation.mutate({
      invoiceId: targetInvoice.id,
      amountCents,
    });
  };

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
              <strong className="text-[#F5B544] font-semibold">$25 in Waypoint Credit</strong>.
            </p>
          </div>

          {/* Quick Credit Capsule */}
          <div className="bg-[#030C22]/80 border border-[#0D4B84] rounded-2xl p-4 sm:p-5 text-center min-w-[200px] shadow-inner">
            <p className="text-[11px] uppercase tracking-wider text-blue-300/80 font-bold mb-1">
              Available Credit
            </p>
            <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-mono text-[#F5B544]">
              {stats.availableCreditFormatted}
            </div>
            <p className="text-[11px] text-blue-200/60 mt-1 font-medium">Waypoint Credit</p>
          </div>
        </div>
      </div>

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

      {/* Client Referral Stats (ADHD-friendly 3 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Card 1: Referred */}
        <div className="rounded-2xl bg-[#071C3C]/80 border border-[#0D4B84] p-5 space-y-1 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase font-bold text-blue-300/80 tracking-wider">Referred</p>
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white font-mono">{stats.referredCount}</p>
          <p className="text-xs text-blue-200/60">Families invited</p>
        </div>

        {/* Card 2: Became Clients */}
        <div className="rounded-2xl bg-[#071C3C]/80 border border-[#0D4B84] p-5 space-y-1 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase font-bold text-amber-300/80 tracking-wider">Became Clients</p>
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Star className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white font-mono text-amber-300">{stats.convertedCount}</p>
          <p className="text-xs text-blue-200/60">Completed eligible payment</p>
        </div>

        {/* Card 3: Waypoint Credit */}
        <div className="rounded-2xl bg-[#071C3C]/80 border border-emerald-500/40 p-5 space-y-1 shadow-lg relative overflow-hidden bg-gradient-to-br from-[#071C3C] to-emerald-950/20">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase font-bold text-emerald-300/80 tracking-wider">Waypoint Credit</p>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-emerald-300 font-mono">{stats.availableCreditFormatted}</p>
          <p className="text-xs text-emerald-200/70">Available for upcoming charges</p>
        </div>
      </div>

      {/* Waypoint Credit Action & Balance Card */}
      <div className="rounded-2xl bg-gradient-to-br from-[#0A254D] via-[#071C3C] to-[#030C22] border border-[#0D4B84] p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">💰</span>
              <h3 className="text-lg font-bold text-white tracking-tight">Waypoint Credit</h3>
              <span className="text-xs font-mono font-bold text-[#F5B544] bg-[#F5B544]/15 border border-[#F5B544]/40 px-2 py-0.5 rounded-full">
                {stats.availableCreditFormatted} Available
              </span>
            </div>
            <p className="text-xs sm:text-sm text-blue-200/80 max-w-xl">
              Use your Waypoint Credit toward an eligible upcoming Waypoint payment, retainer, or service package.
            </p>
          </div>

          <Button
            type="button"
            onClick={handleOpenApplyModal}
            disabled={stats.availableCreditCents <= 0}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl h-10 px-5 text-xs font-bold shadow-lg shadow-emerald-950/50 flex items-center gap-2 cursor-pointer transition-all self-start sm:self-center"
          >
            <CreditCard className="w-4 h-4" />
            <span>Apply Credit</span>
          </Button>
        </div>

        {/* Mandatory No Cash Value Disclaimer */}
        <div className="pt-3 border-t border-[#0D4B84]/60 flex items-start gap-2 text-[11px] text-blue-200/70 leading-relaxed">
          <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p>
            <strong className="text-amber-300 font-semibold">Important Notice:</strong> Waypoint Credit has no cash value and cannot be withdrawn, transferred, or redeemed for cash. It may only be applied toward eligible Waypoint services.
          </p>
        </div>
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

        {isLoading ? (
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
                        +$25.00 Waypoint Credit
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

      {/* Apply Credit Modal */}
      <Dialog open={isApplyModalOpen} onOpenChange={setIsApplyModalOpen}>
        <DialogContent className="bg-[#071C3C] border border-[#0D4B84] text-white rounded-2xl max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <span>💰</span> Apply Waypoint Credit
            </DialogTitle>
            <DialogDescription className="text-xs text-blue-200/80">
              Apply your available Waypoint Credit toward an upcoming eligible charge.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-[#030C22] p-3.5 rounded-xl border border-[#0D4B84] space-y-1">
              <span className="text-[10px] uppercase font-bold text-blue-300/70 tracking-wider">
                Available Waypoint Credit
              </span>
              <p className="text-2xl font-mono font-bold text-[#F5B544]">
                {stats.availableCreditFormatted}
              </p>
            </div>

            {eligibleInvoices.length > 0 ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-blue-100">Select Invoice / Payment</Label>
                <select
                  value={selectedInvoiceId || eligibleInvoices[0]?.id}
                  onChange={(e) => setSelectedInvoiceId(Number(e.target.value))}
                  className="w-full bg-[#030C22] border border-[#0D4B84] rounded-xl h-10 px-3 text-xs text-white focus:outline-none focus:border-[#F5B544]"
                >
                  {eligibleInvoices.map((inv: any) => (
                    <option key={inv.id} value={inv.id} className="bg-[#071C3C] text-white">
                      Invoice #{inv.invoiceNumber || inv.id} — Total: ${inv.total} ({inv.status})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-200">
                <p>
                  No open unpaid invoices are currently found for this student. If you have an upcoming monthly renewal or package payment, Waypoint staff can also apply this credit directly to your next invoice.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-blue-100">Amount to Apply ($)</Label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-blue-300 font-bold">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={(stats.availableCreditCents / 100).toFixed(2)}
                  value={applyAmountString}
                  onChange={(e) => setApplyAmountString(e.target.value)}
                  placeholder="25.00"
                  className="bg-[#030C22] border-[#0D4B84] text-white pl-8 rounded-xl h-11 text-sm font-mono focus:border-[#F5B544]"
                />
              </div>
            </div>

            <p className="text-[11px] text-blue-200/60 leading-relaxed italic">
              Waypoint Credit cannot exceed the balance due or your available credit.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsApplyModalOpen(false)}
              className="border-[#0D4B84] text-blue-200 hover:bg-white/[0.05] rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmApply}
              disabled={applyCreditMutation.isPending || stats.availableCreditCents <= 0}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs px-5 shadow-lg shadow-emerald-950/50 cursor-pointer"
            >
              {applyCreditMutation.isPending ? "Applying..." : "Apply to Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
