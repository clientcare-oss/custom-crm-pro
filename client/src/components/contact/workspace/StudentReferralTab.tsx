import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  Gift,
  Copy,
  Check,
  ExternalLink,
  Users,
  Star,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Pencil,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  FileText,
  User,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import PageIdBadge from "@/components/PageIdBadge";

interface StudentReferralTabProps {
  contactId: number;
  contactName?: string;
  isParent?: boolean;
}

export function StudentReferralTab({
  contactId,
  contactName = "Student",
  isParent = false,
}: StudentReferralTabProps) {
  const [, setLocation] = useLocation();
  const [copiedLink, setCopiedLink] = useState(false);

  // Manual Adjustment Modal state
  const [isAdjModalOpen, setIsAdjModalOpen] = useState(false);
  const [adjType, setAdjType] = useState<"add" | "deduct">("add");
  const [adjAmountString, setAdjAmountString] = useState("25.00");
  const [adjReason, setAdjReason] = useState("");

  // Reassign Attribution Modal state
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [selectedReferralId, setSelectedReferralId] = useState<number | null>(null);
  const [newReferrerSearchQuery, setNewReferrerSearchQuery] = useState("");
  const [selectedNewReferrerId, setSelectedNewReferrerId] = useState<number | null>(null);
  const [reassignReason, setReassignReason] = useState("");

  // Fetch workspace referral data
  const { data, isLoading, refetch } = trpc.referrals.getWorkspaceData.useQuery(
    { clientId: contactId },
    { staleTime: 1000 * 20 }
  );

  // Search potential referrers for reassigning
  const { data: searchResults } = trpc.referrals.searchReferrers.useQuery(
    { query: newReferrerSearchQuery },
    { enabled: newReferrerSearchQuery.trim().length >= 2 }
  );

  // Mutations
  const manualAdjustmentMutation = trpc.referrals.addManualAdjustment.useMutation({
    onSuccess: (res) => {
      toast.success(
        `Credit adjusted successfully! New balance: $${(res.newBalanceCents / 100).toFixed(2)}`
      );
      setIsAdjModalOpen(false);
      setAdjReason("");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to adjust credit");
    },
  });

  const updateAttributionMutation = trpc.referrals.updateAttribution.useMutation({
    onSuccess: () => {
      toast.success("Referral attribution updated and audit logged.");
      setIsReassignModalOpen(false);
      setReassignReason("");
      setSelectedNewReferrerId(null);
      setNewReferrerSearchQuery("");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update attribution");
    },
  });

  const qualifyRewardMutation = trpc.referrals.qualifyAndReward.useMutation({
    onSuccess: (res) => {
      toast.success(res.message || "Referral qualified and rewarded!");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to reward referral");
    },
  });

  const referralCode = data?.referralCode || "WP-WAYPT";
  const origin = typeof window !== "undefined" ? window.location.origin : "https://app.waypointadvocates.com";
  const referralUrl = `${origin}/get-started?ref=${referralCode}`;

  const stats = data?.stats || {
    referredCount: 0,
    convertedCount: 0,
    totalEarnedCents: 0,
    totalUsedCents: 0,
    availableCreditCents: 0,
    availableCreditFormatted: "$0.00",
  };

  const handleCopyLink = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(referralUrl);
      setCopiedLink(true);
      toast.success("Referral link copied!");
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleSaveAdjustment = () => {
    const amountVal = parseFloat(adjAmountString);
    if (isNaN(amountVal) || amountVal <= 0) {
      toast.error("Please enter a valid dollar amount");
      return;
    }
    if (!adjReason.trim()) {
      toast.error("A reason/note is required for all manual credit adjustments");
      return;
    }

    const signedCents = Math.round(amountVal * 100) * (adjType === "deduct" ? -1 : 1);
    manualAdjustmentMutation.mutate({
      clientId: contactId,
      amountCents: signedCents,
      reason: adjReason.trim(),
    });
  };

  const handleConfirmReassign = () => {
    if (!selectedReferralId) return;
    if (!selectedNewReferrerId) {
      toast.error("Please select a new referring client");
      return;
    }
    if (!reassignReason.trim()) {
      toast.error("Please provide a reason for reassigning this referral");
      return;
    }

    updateAttributionMutation.mutate({
      referralId: selectedReferralId,
      newReferrerClientId: selectedNewReferrerId,
      reason: reassignReason.trim(),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-sm">
            <Gift className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Referral & Waypoint Credit Console</span>
              <span className="text-xs font-mono font-bold bg-[#F5B544]/15 border border-[#F5B544]/40 text-[#F5B544] px-2.5 py-0.5 rounded-full">
                {referralCode}
              </span>
            </h2>
            <p className="text-xs text-blue-200/70">
              Track referrals made by this family, conversion status, and Waypoint Credit balance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={() => setIsAdjModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-8.5 px-3 text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-950/40 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Manual Adjustment</span>
          </Button>
          <PageIdBadge id="PG-030-REF" name="🎁 Student Referral Workspace" />
        </div>
      </div>

      {/* 15. REFERRAL OVERVIEW CARD */}
      <div className="rounded-2xl bg-gradient-to-br from-[#0B3767] via-[#0A254D] to-[#071C3C] border border-[#0D4B84] p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#0D4B84]/60 pb-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Permanent Referral Link
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs sm:text-sm text-white bg-[#030C22] px-3 py-1.5 rounded-xl border border-[#0D4B84] select-all truncate max-w-lg">
                {referralUrl}
              </span>
              <Button
                type="button"
                onClick={handleCopyLink}
                size="sm"
                className="bg-[#0A254D] hover:bg-[#0D4B84] border border-[#0D4B84] text-white rounded-xl h-8 px-3 text-xs gap-1.5 cursor-pointer shadow-sm"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? "Copied" : "Copy Link"}</span>
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-[#030C22]/80 border border-emerald-500/40 rounded-xl px-4 py-2 text-right">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                Available Credit
              </span>
              <p className="text-2xl font-extrabold text-emerald-300 font-mono">
                {stats.availableCreditFormatted}
              </p>
            </div>
          </div>
        </div>

        {/* 5 Compact Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-[#030C22]/60 border border-[#0D4B84]/60 rounded-xl p-3 text-center">
            <span className="text-[10px] uppercase font-bold text-blue-300/70 tracking-wider">Referred</span>
            <p className="text-xl font-mono font-bold text-white mt-0.5">{stats.referredCount}</p>
            <span className="text-[10px] text-blue-200/50">Families</span>
          </div>

          <div className="bg-[#030C22]/60 border border-[#0D4B84]/60 rounded-xl p-3 text-center">
            <span className="text-[10px] uppercase font-bold text-amber-300/70 tracking-wider">Converted</span>
            <p className="text-xl font-mono font-bold text-amber-300 mt-0.5">{stats.convertedCount}</p>
            <span className="text-[10px] text-amber-200/50">Became Clients</span>
          </div>

          <div className="bg-[#030C22]/60 border border-[#0D4B84]/60 rounded-xl p-3 text-center">
            <span className="text-[10px] uppercase font-bold text-blue-300/70 tracking-wider">Total Earned</span>
            <p className="text-xl font-mono font-bold text-white mt-0.5">${(stats.totalEarnedCents / 100).toFixed(2)}</p>
            <span className="text-[10px] text-blue-200/50">Rewards Issued</span>
          </div>

          <div className="bg-[#030C22]/60 border border-[#0D4B84]/60 rounded-xl p-3 text-center">
            <span className="text-[10px] uppercase font-bold text-blue-300/70 tracking-wider">Credit Used</span>
            <p className="text-xl font-mono font-bold text-slate-300 mt-0.5">${(stats.totalUsedCents / 100).toFixed(2)}</p>
            <span className="text-[10px] text-blue-200/50">Applied to Bills</span>
          </div>

          <div className="bg-[#030C22]/60 border border-emerald-500/30 rounded-xl p-3 text-center col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase font-bold text-emerald-400/80 tracking-wider">Available</span>
            <p className="text-xl font-mono font-bold text-emerald-300 mt-0.5">{stats.availableCreditFormatted}</p>
            <span className="text-[10px] text-emerald-200/50">Ready to Use</span>
          </div>
        </div>
      </div>

      {/* 16. INTERNAL REFERRAL HISTORY */}
      <div className="rounded-2xl bg-[#071C3C]/80 border border-[#0D4B84] p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Referrals Attributed to This Client
            </h3>
          </div>
          <span className="text-xs text-blue-300/70 font-mono">
            {data?.referrals?.length || 0} Records
          </span>
        </div>

        {isLoading ? (
          <div className="py-6 text-center text-xs text-blue-200/60">Loading referral records...</div>
        ) : !data?.referrals || data.referrals.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-[#0D4B84]/60 rounded-xl p-4 bg-[#030C22]/30 space-y-1">
            <p className="text-sm font-semibold text-white">No referrals recorded yet</p>
            <p className="text-xs text-blue-200/60">
              When someone submits a lead form with this client's code or mentions their name, the referral will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#0D4B84]/60 text-[11px] uppercase tracking-wider text-blue-300/70">
                  <th className="py-2.5 px-3">Referred Person / Record</th>
                  <th className="py-2.5 px-3">Referral Date</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Credit Issued</th>
                  <th className="py-2.5 px-3">Qualification Date</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0D4B84]/40">
                {data.referrals.map((ref: any) => {
                  return (
                    <tr key={ref.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-white flex items-center gap-2">
                          <span>{ref.referredName}</span>
                          {ref.referredClientId && (
                            <button
                              type="button"
                              onClick={() => setLocation(`/contacts/${ref.referredClientId}`)}
                              className="text-[10px] text-blue-300 hover:text-[#F5B544] inline-flex items-center gap-0.5 border border-blue-800/80 px-1.5 py-0.5 rounded bg-[#0A254D]/60"
                              title="Open Contact Record"
                            >
                              <span>Client #{ref.referredClientId}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          )}
                          {ref.referredLeadId && !ref.referredClientId && (
                            <span className="text-[10px] text-amber-300 border border-amber-800/80 px-1.5 py-0.5 rounded bg-amber-950/40">
                              Lead #{ref.referredLeadId}
                            </span>
                          )}
                        </div>
                        {ref.notes && (
                          <p className="text-[10px] text-blue-200/50 mt-0.5 max-w-sm truncate" title={ref.notes}>
                            {ref.notes}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-3 text-blue-200/80">
                        {ref.createdAt ? new Date(ref.createdAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-3 px-3">
                        {ref.status === "rewarded" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            <CheckCircle2 className="w-3 h-3" /> Rewarded
                          </span>
                        ) : ref.status === "qualified" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            <Star className="w-3 h-3" /> Qualified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/15 text-blue-300 border border-blue-400/30">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold">
                        {ref.status === "rewarded" ? (
                          <span className="text-emerald-300">+${(ref.creditAmount / 100).toFixed(2)}</span>
                        ) : (
                          <span className="text-slate-500">$0.00</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-blue-200/80">
                        {ref.qualifiedAt ? new Date(ref.qualifiedAt).toLocaleDateString() : "Pending Payment"}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {ref.status === "pending" && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => qualifyRewardMutation.mutate({ referralId: ref.id })}
                              disabled={qualifyRewardMutation.isPending}
                              className="text-[11px] h-7 px-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 border border-emerald-500/30 rounded-lg cursor-pointer"
                              title="Manually qualify and issue $25 credit (e.g. offline check payment)"
                            >
                              Qualify & Reward
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedReferralId(ref.id);
                              setIsReassignModalOpen(true);
                            }}
                            className="text-[11px] h-7 px-2 text-blue-300 hover:text-white hover:bg-[#0A254D] border border-[#0D4B84] rounded-lg cursor-pointer"
                            title="Reassign referrer if misattributed"
                          >
                            Reassign
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 17. INTERNAL WAYPOINT CREDIT HISTORY (LEDGER) */}
      <div className="rounded-2xl bg-[#071C3C]/80 border border-[#0D4B84] p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Waypoint Credit Ledger & Audit History
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1 rounded-xl">
              Available: {stats.availableCreditFormatted}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="py-6 text-center text-xs text-blue-200/60">Loading ledger transactions...</div>
        ) : !data?.ledger || data.ledger.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-[#0D4B84]/60 rounded-xl p-4 bg-[#030C22]/30 space-y-1">
            <p className="text-sm font-semibold text-white">No ledger transactions recorded</p>
            <p className="text-xs text-blue-200/60">
              When referral rewards are earned, applied to payments, or manually adjusted, full audit entries appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#0D4B84]/60 text-[11px] uppercase tracking-wider text-blue-300/70">
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Transaction Type</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Staff / Author</th>
                  <th className="py-2.5 px-3">Audit Note / Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0D4B84]/40 font-mono">
                {data.ledger.map((entry: any) => {
                  const isPositive = entry.amount > 0;
                  return (
                    <tr key={entry.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3 text-blue-200/80 whitespace-nowrap">
                        {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "—"}
                      </td>
                      <td className="py-3 px-3 font-sans font-medium">
                        {entry.transactionType === "referral_reward" ? (
                          <span className="text-emerald-300 inline-flex items-center gap-1 font-semibold">
                            <Sparkles className="w-3 h-3" /> Referral Reward
                          </span>
                        ) : entry.transactionType === "payment_redemption" ? (
                          <span className="text-amber-300 inline-flex items-center gap-1 font-semibold">
                            <TrendingDown className="w-3 h-3" /> Applied to Payment
                          </span>
                        ) : entry.transactionType === "reversal" ? (
                          <span className="text-rose-400 inline-flex items-center gap-1 font-semibold">
                            <AlertCircle className="w-3 h-3" /> Attribution Reversal
                          </span>
                        ) : (
                          <span className="text-blue-300 inline-flex items-center gap-1 font-semibold">
                            <Pencil className="w-3 h-3" /> Manual Adjustment
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-bold text-sm">
                        {isPositive ? (
                          <span className="text-emerald-300">+${(entry.amount / 100).toFixed(2)}</span>
                        ) : (
                          <span className="text-amber-400">-${(Math.abs(entry.amount) / 100).toFixed(2)}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-sans text-blue-200/80">
                        {entry.staffUserName || "System / Auto"}
                      </td>
                      <td className="py-3 px-3 font-sans text-blue-100/90 max-w-md truncate" title={entry.note}>
                        {entry.note || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Credit Adjustment Dialog */}
      <Dialog open={isAdjModalOpen} onOpenChange={setIsAdjModalOpen}>
        <DialogContent className="bg-[#071C3C] border border-[#0D4B84] text-white rounded-2xl max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Pencil className="w-4 h-4 text-emerald-400" />
              <span>Manual Credit Adjustment</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-blue-200/80">
              Create an audited ledger transaction to adjust {contactName}'s Waypoint Credit.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAdjType("add")}
                className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  adjType === "add"
                    ? "bg-emerald-600 border-emerald-400 text-white shadow-md shadow-emerald-950/40"
                    : "bg-[#030C22] border-[#0D4B84] text-blue-200 hover:text-white"
                }`}
              >
                + Add Credit
              </button>
              <button
                type="button"
                onClick={() => setAdjType("deduct")}
                className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  adjType === "deduct"
                    ? "bg-amber-600 border-amber-400 text-white shadow-md shadow-amber-950/40"
                    : "bg-[#030C22] border-[#0D4B84] text-blue-200 hover:text-white"
                }`}
              >
                - Deduct Credit
              </button>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-blue-100">Amount ($)</Label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-blue-300 font-bold">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={adjAmountString}
                  onChange={(e) => setAdjAmountString(e.target.value)}
                  className="bg-[#030C22] border-[#0D4B84] text-white pl-8 rounded-xl h-10 text-sm font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-blue-100">
                Reason / Internal Note <span className="text-amber-400 font-bold">*</span>
              </Label>
              <Textarea
                rows={3}
                value={adjReason}
                onChange={(e) => setAdjReason(e.target.value)}
                placeholder="Explain why this adjustment is being made (e.g. promotional credit, dispute courtesy, clerical correction)..."
                className="bg-[#030C22] border-[#0D4B84] text-white text-xs rounded-xl"
              />
            </div>

            <p className="text-[11px] text-blue-200/60 italic leading-relaxed">
              Waypoint Credit cannot be withdrawn or exchanged for cash. Balance cannot drop below $0.00.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAdjModalOpen(false)}
              className="border-[#0D4B84] text-blue-200 hover:bg-white/[0.05] rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveAdjustment}
              disabled={manualAdjustmentMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs px-5 shadow-lg shadow-emerald-950/50 cursor-pointer"
            >
              {manualAdjustmentMutation.isPending ? "Recording..." : "Record Adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassign Referrer Dialog */}
      <Dialog open={isReassignModalOpen} onOpenChange={setIsReassignModalOpen}>
        <DialogContent className="bg-[#071C3C] border border-[#0D4B84] text-white rounded-2xl max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <span>Reassign Referral Attribution</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-blue-200/80">
              Transfer this referral to a different referring client with an immutable audit log.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-blue-100">Search New Referrer</Label>
              <Input
                value={newReferrerSearchQuery}
                onChange={(e) => setNewReferrerSearchQuery(e.target.value)}
                placeholder="Type name, email, or code..."
                className="bg-[#030C22] border-[#0D4B84] text-white text-xs rounded-xl h-10"
              />
            </div>

            {searchResults && searchResults.length > 0 && (
              <div className="space-y-1 max-h-40 overflow-y-auto border border-[#0D4B84] rounded-xl p-1 bg-[#030C22]">
                {searchResults.map((res: any) => (
                  <button
                    key={res.id}
                    type="button"
                    onClick={() => setSelectedNewReferrerId(res.id)}
                    className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                      selectedNewReferrerId === res.id
                        ? "bg-amber-500/20 text-amber-300 font-bold border border-amber-400/40"
                        : "text-blue-100 hover:bg-white/[0.05]"
                    }`}
                  >
                    <span>{res.name} ({res.email})</span>
                    <span className="font-mono text-[10px] text-[#F5B544]">{res.referralCode}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-blue-100">
                Reason for Change <span className="text-amber-400 font-bold">*</span>
              </Label>
              <Textarea
                rows={2}
                value={reassignReason}
                onChange={(e) => setReassignReason(e.target.value)}
                placeholder="Why is attribution being reassigned? (required for audit)"
                className="bg-[#030C22] border-[#0D4B84] text-white text-xs rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsReassignModalOpen(false)}
              className="border-[#0D4B84] text-blue-200 hover:bg-white/[0.05] rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmReassign}
              disabled={updateAttributionMutation.isPending || !selectedNewReferrerId}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs px-5 shadow-lg shadow-amber-950/50 cursor-pointer"
            >
              {updateAttributionMutation.isPending ? "Reassigning..." : "Confirm Reassignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
