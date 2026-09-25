import React, { useState } from "react";
import {
  Anchor,
  CheckCircle2,
  AlertCircle,
  Copy,
  Mail,
  Compass,
  ArrowRight,
  Shield,
  FileCheck2,
  Calendar,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { FollowUpActionType, PortmasterFinding } from "./types";

interface ReviewCompletionSummaryProps {
  studentName: string;
  totalAnalyzed: number;
  findings: PortmasterFinding[];
  onUpdateFindingAction: (findingId: string, action: FollowUpActionType) => void;
  onFinalComplete: () => void;
  onReturnToQueue: () => void;
}

export function ReviewCompletionSummary({
  studentName,
  totalAnalyzed,
  findings,
  onUpdateFindingAction,
  onFinalComplete,
  onReturnToQueue,
}: ReviewCompletionSummaryProps) {
  const confirmedFindings = findings.filter((f) => f.decision === "confirmed");
  const dismissedFindings = findings.filter((f) => f.decision === "not_a_concern");
  const heldFindings = findings.filter((f) => f.decision === "hold");

  const hasFollowUp = confirmedFindings.length > 0;

  // Calm client-facing summary text
  const defaultClientSummary = hasFollowUp
    ? `Hello,\n\nWaypoint has completed our Portmaster review of ${studentName}'s updated IEP against the commitments made during our recent meeting. We identified ${confirmedFindings.length} item${
        confirmedFindings.length > 1 ? "s" : ""
      } we would like to clarify and follow up on with the school team to ensure all agreed supports are fully reflected.\n\nYour advocate will coordinate the appropriate next steps with the district and keep you informed.`
    : `Hello,\n\nWaypoint has completed our Portmaster review of ${studentName}'s updated IEP against the commitments made during our recent meeting. All agreed modifications and accommodations were correctly incorporated, and we did not identify anything that currently requires your attention.`;

  const [clientSummary, setClientSummary] = useState(defaultClientSummary);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopySummary = () => {
    navigator.clipboard.writeText(clientSummary);
    setIsCopied(true);
    toast.success("Client summary copied to clipboard!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Top Completion Header */}
      <div className="rounded-2xl bg-gradient-to-br from-[#061E3B] via-[#092B54] to-[#04162B] border border-teal-500/50 p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap border-b border-[#0F3B6E] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400 text-teal-300 flex items-center justify-center shadow-lg">
              <Anchor className="h-5 w-5 text-teal-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <span>Portmaster Review Complete</span>
                <Badge variant="outline" className="border-teal-400/40 text-teal-300 bg-teal-950/60 font-mono text-[10px]">
                  Verified
                </Badge>
              </h2>
              <p className="text-xs text-blue-200/80">
                {totalAnalyzed} items checked · {findings.length} elevated for review · {confirmedFindings.length} confirmed for follow-up
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReturnToQueue}
            className="text-xs text-blue-300 hover:text-white hover:bg-white/10"
          >
            ← Back to Review Queue
          </Button>
        </div>

        {/* 3 Metric Summary Blocks */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="rounded-xl bg-[#041221] border border-[#0E355E] p-3 space-y-1">
            <span className="text-[10.5px] font-mono text-blue-300/70 uppercase">Total Analyzed</span>
            <div className="text-xl font-bold font-mono text-white">{totalAnalyzed}</div>
            <p className="text-[10.5px] text-emerald-400/80">
              37 cleared automatically behind the scenes
            </p>
          </div>

          <div className="rounded-xl bg-[#041221] border border-slate-700/60 p-3 space-y-1">
            <span className="text-[10.5px] font-mono text-slate-400 uppercase">Dismissed (Non-Issues)</span>
            <div className="text-xl font-bold font-mono text-slate-300">{dismissedFindings.length}</div>
            <p className="text-[10.5px] text-slate-400">
              Reviewed and determined safe
            </p>
          </div>

          <div className="rounded-xl bg-[#041221] border border-amber-500/40 p-3 space-y-1">
            <span className="text-[10.5px] font-mono text-amber-300 uppercase">Confirmed Follow-Up</span>
            <div className="text-xl font-bold font-mono text-[#F5B544]">{confirmedFindings.length}</div>
            <p className="text-[10.5px] text-amber-200/80">
              Discrepancies flagged for advocate action
            </p>
          </div>
        </div>
      </div>

      {/* Confirmed Follow-Up Items with Action Selectors */}
      {hasFollowUp && (
        <div className="rounded-xl bg-[#06182D] border border-[#113C6E] p-4 sm:p-5 space-y-3 shadow-md">
          <div className="flex items-center gap-2 border-b border-[#0F355E] pb-2">
            <span className="p-1 rounded bg-amber-500/20 text-[#F5B544]">
              <AlertCircle className="h-4 w-4" />
            </span>
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-mono">
              Confirmed Follow-Up Action Plan ({confirmedFindings.length})
            </h3>
          </div>

          <div className="space-y-2.5">
            {confirmedFindings.map((finding, idx) => (
              <div
                key={finding.id}
                className="rounded-lg bg-[#041120] border border-[#0E3259] p-3 flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[#F5B544]">{idx + 1}.</span>
                    <h4 className="text-xs font-bold text-white truncate">{finding.title}</h4>
                    <span className="text-[10px] font-mono px-1.5 rounded bg-rose-950/70 border border-rose-500/40 text-rose-300">
                      {finding.category}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-blue-200/75 leading-relaxed">
                    {finding.oneLineExplanation}
                  </p>
                </div>

                {/* Follow-up Action selector */}
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={finding.selectedAction || "add_case_compass"}
                    onChange={(e) =>
                      onUpdateFindingAction(finding.id, e.target.value as FollowUpActionType)
                    }
                    className="h-8 text-xs bg-[#061D38] border border-[#144E8A] text-white rounded-md px-2 focus:ring-1 focus:ring-teal-400 font-medium"
                  >
                    <option value="add_case_compass">Add to Case Compass</option>
                    <option value="draft_school_email">Draft School Email</option>
                    <option value="request_pwn">Request PWN Clarification</option>
                    <option value="create_meeting_target">Create Future Meeting Target</option>
                    <option value="create_task">Create Advocate Task</option>
                    <option value="no_action">No Action Needed</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calm Client-Facing Summary Generator */}
      <div className="rounded-xl bg-[#06182D] border border-teal-500/40 p-4 sm:p-5 space-y-3 shadow-md">
        <div className="flex items-center justify-between gap-2 border-b border-[#0F355E] pb-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-teal-500/20 text-teal-300">
              <Shield className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-mono">
                Client Summary (Advocate-Vetted)
              </h3>
              <p className="text-[11px] text-blue-200/70">
                Calm, professional communication to the family. Raw AI findings and alarmist language are filtered out.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopySummary}
            className="h-7 text-xs font-semibold bg-[#0A2649] border-[#164882] text-teal-300 hover:text-white cursor-pointer inline-flex items-center gap-1.5"
          >
            <Copy className="h-3 w-3" />
            <span>{isCopied ? "Copied!" : "Copy Summary Text"}</span>
          </Button>
        </div>

        <Textarea
          value={clientSummary}
          onChange={(e) => setClientSummary(e.target.value)}
          rows={4}
          className="text-xs bg-[#030E1A] border-[#103A66] text-blue-100/90 leading-relaxed font-sans resize-none"
        />
      </div>

      {/* Final Action Controls */}
      <div className="rounded-xl bg-[#030F1F] border border-[#103D6D] p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="space-y-0.5">
          <span className="text-xs font-bold text-white font-mono uppercase">
            Complete Post-Meeting Review
          </span>
          <p className="text-[11px] text-blue-200/60">
            Updates Case Compass to "Updated IEP Reviewed" and generates verified action items.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReturnToQueue}
            className="text-xs text-blue-300 hover:text-white cursor-pointer"
          >
            Back to Queue
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onFinalComplete}
            className="h-8.5 px-4 text-xs font-bold bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 cursor-pointer inline-flex items-center gap-1.5 shadow-md border border-teal-400/40"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Complete Post-Meeting Review</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
