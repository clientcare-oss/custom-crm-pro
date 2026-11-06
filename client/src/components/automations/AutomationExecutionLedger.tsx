import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  Clock,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  Mail,
  ShieldCheck,
  Ban,
  Send,
  SkipForward,
  Loader2,
  Layers,
  Info,
} from "lucide-react";

export function getRunStatusBadge(status: string) {
  const s = (status || "").toLowerCase();
  switch (s) {
    case "completed":
    case "submitted_to_provider":
    case "delivered":
      return {
        label:
          s === "submitted_to_provider"
            ? "Submitted to Provider"
            : s === "delivered"
              ? "Delivered"
              : "Completed",
        className: "bg-emerald-950/70 border-emerald-500/40 text-emerald-300",
      };
    case "queued":
      return {
        label: "Queued",
        className: "bg-sky-950/70 border-sky-500/40 text-sky-300",
      };
    case "running":
    case "processing":
      return {
        label: s === "processing" ? "Processing" : "Running",
        className: "bg-indigo-950/70 border-indigo-500/40 text-indigo-300",
      };
    case "held_overdue":
      return {
        label: "Held (Overdue — Confirm)",
        className: "bg-amber-950/80 border-amber-500/50 text-amber-300",
      };
    case "simulated":
      return {
        label: "Simulated (Dry Run)",
        className: "bg-purple-950/70 border-purple-500/40 text-purple-300",
      };
    case "skipped":
      return {
        label: "Skipped",
        className: "bg-slate-900 border-slate-600/40 text-slate-300",
      };
    case "canceled":
      return {
        label: "Canceled",
        className: "bg-slate-900 border-slate-500/40 text-slate-400",
      };
    case "failed":
    default:
      return {
        label: "Failed",
        className: "bg-rose-950/70 border-rose-500/40 text-rose-300",
      };
  }
}

interface AutomationStatsBannerProps {
  stats: any;
  onProcessDueJobs: () => void;
  isProcessingJobs: boolean;
}

export function AutomationStatsBanner({
  stats,
  onProcessDueJobs,
  isProcessingJobs,
}: AutomationStatsBannerProps) {
  const emailProvider = stats?.emailProvider;
  const isEmailConfigured = Boolean(emailProvider?.configured);

  return (
    <div className="space-y-4">
      {/* Top KPI Grid: Accurate Run & Queue Counts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-left">
        <div className="bg-[#05142B]/90 border border-[#3A2C18] rounded-xl p-3.5 shadow-[0_6px_18px_rgba(0,0,0,0.65)]">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#A69371] block">
            Active Automations
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="font-serif text-xl font-bold text-[#FFF4D4]">
              {stats?.activeAutomations ?? 0}
            </span>
            <span className="text-[10px] font-mono text-[#8CA4C4]">
              {stats?.draftAutomations ?? 0} Draft
            </span>
          </div>
        </div>

        <div className="bg-[#05142B]/90 border border-[#3A2C18] rounded-xl p-3.5 shadow-[0_6px_18px_rgba(0,0,0,0.65)]">
          <span className="text-[10px] font-mono uppercase tracking-wider text-sky-300 block">
            Queued Runs
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="font-serif text-xl font-bold text-sky-300">
              {stats?.queuedRuns ?? 0}
            </span>
            <span className="text-[10px] font-mono text-[#8CA4C4]">
              {stats?.queuedJobs ?? 0} steps due
            </span>
          </div>
        </div>

        <div className="bg-[#05142B]/90 border border-[#3A2C18] rounded-xl p-3.5 shadow-[0_6px_18px_rgba(0,0,0,0.65)]">
          <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-300 block">
            Running Now
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="font-serif text-xl font-bold text-indigo-300">
              {stats?.runningRuns ?? 0}
            </span>
            <span className="text-[10px] font-mono text-[#8CA4C4]">
              {stats?.processingJobs ?? 0} active
            </span>
          </div>
        </div>

        <div className="bg-[#05142B]/90 border border-[#3A2C18] rounded-xl p-3.5 shadow-[0_6px_18px_rgba(0,0,0,0.65)]">
          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-300 block">
            Completed Runs
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="font-serif text-xl font-bold text-emerald-300">
              {stats?.completedRuns ?? 0}
            </span>
            <span className="text-[10px] font-mono text-[#8CA4C4]">
              {stats?.skippedRuns ?? 0} skipped
            </span>
          </div>
        </div>

        <div className="bg-[#05142B]/90 border border-[#3A2C18] rounded-xl p-3.5 shadow-[0_6px_18px_rgba(0,0,0,0.65)]">
          <span className="text-[10px] font-mono uppercase tracking-wider text-rose-300 block">
            Failed Runs
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="font-serif text-xl font-bold text-rose-300">
              {stats?.failedRuns ?? 0}
            </span>
            <span className="text-[10px] font-mono text-[#8CA4C4]">
              {stats?.canceledRuns ?? 0} canceled
            </span>
          </div>
        </div>

        <div className="bg-[#05142B]/90 border border-[#3A2C18] rounded-xl p-3.5 shadow-[0_6px_18px_rgba(0,0,0,0.65)]">
          <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 block">
            Held Overdue
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="font-serif text-xl font-bold text-amber-300">
              {stats?.heldOverdueJobs ?? 0}
            </span>
            <span className="text-[10px] font-mono text-[#8CA4C4]">
              {stats?.simulatedRuns ?? 0} dry-runs
            </span>
          </div>
        </div>
      </div>

      {/* Outbound Email & Background Scheduler Status Bar */}
      <div className="bg-[#020A17]/90 border border-[#3A2C18] rounded-xl p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-left">
        <div className="flex flex-wrap items-center gap-3">
          {isEmailConfigured ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Outbound Email Ready ({emailProvider?.senderEmail || "Gmail SMTP"})
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-amber-950/80 border border-amber-500/40 text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5" />
              Outbound Email Unconfigured ({(emailProvider?.missingConfig || ["GMAIL_USER", "GMAIL_APP_PASSWORD"]).join(", ")})
            </span>
          )}

          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-lg bg-[#05142B] border border-[#3A2C18] text-[#FFE394]">
            <Clock className="h-3.5 w-3.5 text-[#C5A059]" />
            TZ: {stats?.businessTimeZone || "America/New_York"} (DST-Aware)
          </span>

          {!isEmailConfigured && (
            <span className="text-[11px] text-[#C6B697]">
              Email steps will report <strong className="text-rose-300">Failed (Provider Unconfigured)</strong> instead of faking &ldquo;Sent&rdquo; until credentials are set in{" "}
              <Link href="/integrations" className="text-[#FFE394] underline hover:text-white">
                PG-014 · Integrations
              </Link>
              .
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={isProcessingJobs}
            onClick={onProcessDueJobs}
            className="border border-[#3A2C18] bg-[#05142B] text-[#FFE394] hover:bg-[#07162B] font-serif text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isProcessingJobs ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#C5A059]" />
            ) : (
              <Play className="h-3.5 w-3.5 text-[#C5A059]" />
            )}
            <span>Process Due Queue Now</span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface AutomationExecutionLedgerProps {
  automationRuns: any[];
  automationJobs: any[];
  onRefresh: () => void;
  onRetryRun: (runId: number) => void;
  onCancelRun: (runId: number) => void;
  onCancelJob: (jobId: number) => void;
  onResolveHeldJob: (jobId: number, action: "send_now" | "skip") => void;
  isBusy: boolean;
}

export function AutomationExecutionLedger({
  automationRuns,
  automationJobs,
  onRefresh,
  onRetryRun,
  onCancelRun,
  onCancelJob,
  onResolveHeldJob,
  isBusy,
}: AutomationExecutionLedgerProps) {
  const pendingOrHeldJobs = (automationJobs || []).filter((j: any) =>
    ["queued", "processing", "held_overdue", "failed"].includes(j.status)
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
      {/* Left 6 Cols: Durable Scheduled Step Queue & Held Jobs */}
      <div className="lg:col-span-6 bg-[#05142B]/90 border border-[#3A2C18] rounded-xl p-5 space-y-4 shadow-[0_8px_24px_rgba(0,0,0,0.85)]">
        <div className="flex items-center justify-between border-b border-[#3A2C18]/70 pb-3">
          <div>
            <h3 className="font-serif font-bold text-base text-[#FFF4D4] flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#C5A059]" />
              Durable Step Queue &amp; Held Actions ({pendingOrHeldJobs.length})
            </h3>
            <p className="text-xs text-[#C6B697]">
              Scheduled background steps, appointment-linked jobs, and paused/resumed overdue emails awaiting confirmation.
            </p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:text-[#FFF4D4] text-xs font-serif px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <RefreshCw className="h-3 w-3 text-[#C5A059]" /> Refresh
          </button>
        </div>

        {!automationJobs || automationJobs.length === 0 ? (
          <div className="text-xs text-[#A69371] py-8 text-center font-serif">
            No scheduled or held step jobs in the durable queue. Delayed steps and before/after session jobs appear here.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {automationJobs.slice(0, 30).map((job: any) => {
              const badge = getRunStatusBadge(job.status);
              return (
                <div
                  key={job.id}
                  className="bg-[#020A17]/80 border border-[#3A2C18]/60 rounded-lg p-3 flex flex-col gap-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-serif font-bold text-xs text-[#FFF4D4]">
                        Step #{Number(job.stepIndex ?? 0) + 1}: {job.stepTitle}
                      </span>
                      <span className="text-[10px] font-mono uppercase text-[#8CA4C4] bg-[#05142B] border border-[#3A2C18] px-1.5 py-0.5 rounded">
                        {job.stepType}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#FFE394] font-mono">
                      Due: {job.scheduledFor ? new Date(job.scheduledFor).toLocaleString() : "Immediate"}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#C6B697]">
                    <span>
                      {job.automationName || `Workflow #${job.automationId}`} ·{" "}
                      <strong className="text-[#FFF4D4]">{job.contactName || `Student #${job.contactId}`}</strong>
                      {job.providerMessageId && (
                        <span className="ml-2 font-mono text-[10px] text-emerald-300">
                          MsgID: {job.providerMessageId}
                        </span>
                      )}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {job.status === "held_overdue" && (
                        <>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => onResolveHeldJob(job.id, "send_now")}
                            className="bg-emerald-900/70 hover:bg-emerald-800 text-emerald-200 border border-emerald-500/40 text-[10px] font-mono font-bold px-2.5 py-1 rounded flex items-center gap-1 cursor-pointer"
                          >
                            <Send className="h-3 w-3" /> Send Now
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => onResolveHeldJob(job.id, "skip")}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-500/40 text-[10px] font-mono font-bold px-2.5 py-1 rounded flex items-center gap-1 cursor-pointer"
                          >
                            <SkipForward className="h-3 w-3" /> Skip Overdue
                          </button>
                        </>
                      )}
                      {(job.status === "queued" || job.status === "held_overdue") && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => onCancelJob(job.id)}
                          className="bg-rose-950/70 hover:bg-rose-900/80 text-rose-300 border border-rose-500/40 text-[10px] font-mono font-bold px-2.5 py-1 rounded flex items-center gap-1 cursor-pointer"
                        >
                          <Ban className="h-3 w-3" /> Cancel Step
                        </button>
                      )}
                    </div>
                  </div>

                  {job.lastError && (
                    <p className="text-[11px] text-rose-400 font-mono">
                      Info: {job.lastError}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right 6 Cols: Execution Run Audit Ledger */}
      <div className="lg:col-span-6 bg-[#05142B]/90 border border-[#3A2C18] rounded-xl p-5 space-y-4 shadow-[0_8px_24px_rgba(0,0,0,0.85)]">
        <div className="flex items-center justify-between border-b border-[#3A2C18]/70 pb-3">
          <div>
            <h3 className="font-serif font-bold text-base text-[#FFF4D4] flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#C5A059]" />
              Execution Run History ({automationRuns?.length ?? 0})
            </h3>
            <p className="text-xs text-[#C6B697]">
              Full audit log of Completed, Queued, Running, Simulated, Skipped, Canceled, and Failed runs.
            </p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:text-[#FFF4D4] text-xs font-serif px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <RefreshCw className="h-3 w-3 text-[#C5A059]" /> Refresh
          </button>
        </div>

        {!automationRuns || automationRuns.length === 0 ? (
          <div className="text-xs text-[#A69371] py-8 text-center font-serif">
            No automation runs recorded yet. Real CRM events and executed workflows will appear here automatically.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {automationRuns.map((run: any) => {
              const badge = getRunStatusBadge(run.status);
              return (
                <div
                  key={run.id}
                  className="bg-[#020A17]/80 border border-[#3A2C18]/60 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-serif font-bold text-xs text-[#FFF4D4]">
                        {run.automationName || `Workflow #${run.automationId}`}
                      </span>
                      <span className="text-[10px] font-mono text-[#FFE394] bg-[#05142B] border border-[#3A2C18] px-2 py-0.5 rounded">
                        {run.contactName || `Student #${run.contactId}`}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                      {run.retryCount > 0 && (
                        <span className="text-[10px] font-mono text-[#C6B697]">
                          (Retried {run.retryCount}x)
                        </span>
                      )}
                    </div>
                    {run.errorMessage && (
                      <p className="text-[11px] text-rose-400 font-mono">
                        Error: {run.errorMessage}
                      </p>
                    )}
                    <p className="text-[11px] text-[#A69371] font-mono line-clamp-3 whitespace-pre-line">
                      {run.logText}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <span className="text-[10px] text-[#8CA4C4] font-mono">
                      {run.createdAt ? new Date(run.createdAt).toLocaleString() : ""}
                    </span>
                    {(run.status === "queued" || run.status === "running") && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => onCancelRun(run.id)}
                        className="bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/40 font-mono font-bold text-[10px] px-2.5 py-1 rounded-lg cursor-pointer flex items-center gap-1"
                      >
                        <Ban className="h-3 w-3" /> Cancel Run
                      </button>
                    )}
                    {run.status === "failed" && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => onRetryRun(run.id)}
                        className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-serif font-bold text-[11px] px-3 py-1 rounded-lg border border-[#FFE394]/50 cursor-pointer flex items-center gap-1"
                        title="Retries only failed/uncompleted steps without repeating already-completed steps"
                      >
                        <RefreshCw className="h-3 w-3" /> Retry Failed Steps
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

