import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { AlertCircle, Clock, Calendar, ChevronRight, UserCheck, ShieldAlert, Sparkles, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface HoldsNeedingAttentionCardProps {
  onReviewMeeting: (proposedMeetingId: number) => void;
}

export default function HoldsNeedingAttentionCard({
  onReviewMeeting,
}: HoldsNeedingAttentionCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Fetch holds needing attention
  const { data: attentionItems, isLoading, refetch } = trpc.proposedMeetings.getHoldsNeedingAttention.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 60000,
  });

  if (isLoading && !attentionItems) {
    return (
      <div className="rounded-xl border border-[#3A2C18]/60 bg-[#05142B]/70 p-4 animate-pulse">
        <div className="h-5 w-48 bg-[#102B4E]/60 rounded mb-2" />
        <div className="h-4 w-72 bg-[#102B4E]/40 rounded" />
      </div>
    );
  }

  const items = attentionItems || [];
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-[#3A2C18]/60 bg-[#05142B]/60 p-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-emerald-950/60 border border-emerald-700/50 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-[#FFF4D4] font-serif">
              Calendar Holds Queue Clear
            </div>
            <div className="text-[11px] text-[#A69371]">
              All tentative meeting dates are actively managed. No candidate holds currently require follow-up.
            </div>
          </div>
        </div>
        <Badge variant="outline" className="border-emerald-800/60 bg-emerald-950/30 text-emerald-300 text-[10px] font-mono">
          0 PENDING ATTENTION
        </Badge>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#C5A059]/40 bg-gradient-to-b from-[#081B33] to-[#040E1C] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#3A2C18]/70">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-amber-950/70 border border-amber-600/60 flex items-center justify-center text-amber-300 shadow-sm animate-pulse">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-[#FFF4D4] text-sm tracking-tight">
                HOLDS NEEDING ATTENTION
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {items.length} {items.length === 1 ? "HOLD" : "HOLDS"} PENDING
              </span>
            </div>
            <p className="text-[11px] text-[#C6B697] mt-0.5">
              Work queue of proposed candidate dates awaiting school confirmation, parent preference, or overdue follow-up.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-[#A69371] hover:text-[#FFE394] font-medium transition-colors cursor-pointer"
        >
          {isExpanded ? "Collapse" : `Show (${items.length})`}
        </button>
      </div>

      {/* Queue items */}
      {isExpanded && (
        <div className="mt-3 space-y-2.5">
          {items.map(({ meeting, daysHeld, reasons }) => {
            const candidateCount = meeting.candidateSlots.length;
            const isParentPref = meeting.status === "PARENT_SELECTED" || Boolean(meeting.parentPreferredSlotId);

            return (
              <div
                key={meeting.id}
                className="group rounded-lg border border-[#3A2C18] bg-[#020A17]/85 hover:border-[#C5A059]/70 hover:bg-[#05142B] p-3 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner"
              >
                {/* Left: Info */}
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-serif font-bold text-[#FFF4D4] text-sm group-hover:text-[#FFE394] transition-colors">
                      {meeting.studentName}
                    </span>
                    <span className="text-[#3A2C18]">|</span>
                    <span className="text-xs text-[#D8C7A5] font-medium">
                      {meeting.meetingType}
                    </span>

                    {/* Sibling count badge */}
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#102B4E]/80 text-[#DFBE77] border border-[#3A2C18]">
                      {candidateCount} {candidateCount === 1 ? "DATE HELD" : "DATES HELD"}
                    </span>

                    {/* Waiting on badge */}
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#0B2545]/60 text-[#FFE394] border border-[#3A2C18]">
                      WAITING ON: {meeting.waitingOn.toUpperCase()}
                    </span>

                    {isParentPref && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-700/60 flex items-center gap-1">
                        <UserCheck className="w-3 h-3" />
                        PARENT PREFERRED
                      </span>
                    )}
                  </div>

                  {/* Reasons list */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {reasons.map((reason, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] text-amber-300/90 font-medium flex items-center gap-1 bg-amber-950/30 px-1.5 py-0.5 rounded border border-amber-900/40"
                      >
                        <Clock className="w-2.5 h-2.5" />
                        {reason}
                      </span>
                    ))}
                    <span className="text-[11px] text-[#A69371] font-mono ml-1">
                      (Assigned: {meeting.assignedAdvocateName?.split(" ")[0] || "Byron"})
                    </span>
                  </div>
                </div>

                {/* Right: Review Action */}
                <div className="shrink-0 flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onReviewMeeting(meeting.id)}
                    className="h-8 px-3.5 rounded-lg bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs hover:brightness-110 shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>REVIEW</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
