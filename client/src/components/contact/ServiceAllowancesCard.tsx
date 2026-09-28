/**
 * Service Allowances & Usage Card — PG-030 Student Workspace (Details Tab)
 * Displays active service allowances, actual used/completed counts,
 * scheduled/open reservations, remaining credits, and tracking methods.
 * Integrated with existing Calendar/Appointments and Activity Timeline (Zero Double-Counting).
 */

import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileText,
  Mail,
  Scale,
  Users,
  Eye,
  History,
  Settings2,
  CalendarDays,
  Sparkles,
  Info,
  ExternalLink,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

interface ServiceAllowancesCardProps {
  contact: any;
  contactId: number;
  onNavigateToTimeline?: () => void;
}

// Icon helper for service keys
function getServiceIcon(serviceKey: string) {
  switch (serviceKey) {
    case "IEP_MEETING":
      return <Users className="h-4 w-4 text-sky-400" />;
    case "504_MEETING":
      return <Users className="h-4 w-4 text-indigo-400" />;
    case "RECORDS_REVIEW":
      return <FileText className="h-4 w-4 text-purple-400" />;
    case "EMAIL_ASSISTANCE":
      return <Mail className="h-4 w-4 text-emerald-400" />;
    case "STATE_COMPLAINT":
      return <Scale className="h-4 w-4 text-rose-400" />;
    case "PWN_SUPPORT":
      return <FileText className="h-4 w-4 text-amber-400" />;
    case "ADVOCATE_SESSION":
      return <Users className="h-4 w-4 text-teal-400" />;
    case "DOCUMENT_REVIEW":
      return <FileText className="h-4 w-4 text-blue-400" />;
    case "PARENT_CONCERN_ASSISTANCE":
      return <Mail className="h-4 w-4 text-violet-400" />;
    default:
      return <BarChart3 className="h-4 w-4 text-cyan-400" />;
  }
}

// Tracking method visual badge
function getTrackingMethodBadge(method: "calendar" | "timeline" | "manual") {
  switch (method) {
    case "calendar":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-sky-500/10 text-sky-300 border border-sky-500/20">
          <Calendar className="h-3 w-3 text-sky-400" />
          <span>Calendar</span>
        </span>
      );
    case "timeline":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
          <Clock className="h-3 w-3 text-emerald-400" />
          <span>Activity Timeline</span>
        </span>
      );
    case "manual":
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
          <span>✋</span>
          <span>Manual Tracking</span>
        </span>
      );
  }
}

// Status badge helper
function getRemainingBadge(item: any) {
  if (item.allowanceType === "not_included" && item.extraAllowance === 0) {
    return (
      <Badge className="bg-slate-500/15 text-slate-300 border-slate-500/30 font-medium">
        Not Included
      </Badge>
    );
  }

  if (item.allowanceType === "unlimited") {
    return (
      <Badge className="bg-sky-500/15 text-sky-300 border-sky-500/30 hover:bg-sky-500/20 font-mono font-medium">
        Unlimited / ∞
      </Badge>
    );
  }

  if (item.status === "over_limit") {
    return (
      <Badge className="bg-red-500/20 text-red-300 border-red-500/40 font-bold animate-pulse flex items-center gap-1">
        <AlertCircle className="h-3 w-3 text-red-400" />
        OVER LIMIT BY {item.overLimitBy}
      </Badge>
    );
  }

  if (item.status === "limit_reached" || item.remaining === 0) {
    return (
      <Badge className="bg-red-500/15 text-red-300 border-red-500/30 font-semibold flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-red-400" />0 Remaining
      </Badge>
    );
  }

  if (item.status === "almost_limit" || item.remaining === 1) {
    return (
      <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 font-medium flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />1 Remaining
      </Badge>
    );
  }

  return (
    <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 font-medium flex items-center gap-1">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      {item.remaining} Remaining
    </Badge>
  );
}

export function ServiceAllowancesCard({
  contact,
  contactId,
  onNavigateToTimeline,
}: ServiceAllowancesCardProps) {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const staffName = user?.name || "Byron Honea";
  const studentName = contact?.name || (contact as any)?.studentName || "student";

  // Dialog states
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isExtraModalOpen, setIsExtraModalOpen] = useState(false);
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [auditItem, setAuditItem] = useState<any | null>(null);
  const [configService, setConfigService] = useState<any | null>(null);

  // Form states
  const [logForm, setLogForm] = useState({
    serviceKey: "EMAIL_ASSISTANCE",
    eventDate: new Date().toISOString().split("T")[0],
    quantity: 1,
    note: "",
    staffMember: staffName,
  });

  const [extraForm, setExtraForm] = useState({
    serviceKey: "RECORDS_REVIEW",
    additionalAmount: 1,
    reason: "",
    authorizedBy: staffName,
    date: new Date().toISOString().split("T")[0],
  });

  const [customPeriod, setCustomPeriod] = useState<{ start?: string; end?: string }>({});
  const [periodForm, setPeriodForm] = useState({
    start: "",
    end: "",
  });

  const [configForm, setConfigForm] = useState({
    baseAllowance: 0,
    allowanceType: "limited" as "limited" | "unlimited" | "not_included",
    trackingMethod: "calendar" as "calendar" | "timeline" | "manual",
    reserveOnOpen: true,
  });

  // Master Plan Matrix State & Mutations
  const [isPlanMatrixModalOpen, setIsPlanMatrixModalOpen] = useState(false);
  const [selectedMatrixPlanKey, setSelectedMatrixPlanKey] = useState("anchor");
  const [isConfirmApplyOpen, setIsConfirmApplyOpen] = useState(false);
  const [matrixEditValues, setMatrixEditValues] = useState<Record<string, {
    allowanceType: "limited" | "unlimited" | "not_included";
    baseAllowance: number;
    trackingMethod: "calendar" | "timeline" | "manual";
    reserveOnOpen: boolean;
  }>>({});

  const { data: matrixEntries, isLoading: isMatrixLoading, refetch: refetchMatrix } =
    trpc.serviceAllowances.getPlanMatrix.useQuery(
      { planKey: selectedMatrixPlanKey },
      { enabled: isPlanMatrixModalOpen }
    );

  const { data: packageConfigStatus } = trpc.serviceAllowances.checkPackageConfiguration.useQuery(
    { planKey: selectedMatrixPlanKey },
    { enabled: isConfirmApplyOpen || isPlanMatrixModalOpen }
  );

  // Synchronize local edit values when matrixEntries loads or plan changes
  React.useEffect(() => {
    if (matrixEntries) {
      const initialMap: Record<string, any> = {};
      for (const entry of matrixEntries) {
        initialMap[entry.serviceKey] = {
          allowanceType: entry.allowanceType,
          baseAllowance: entry.baseAllowance,
          trackingMethod: entry.trackingMethod,
          reserveOnOpen: entry.reserveOnOpen,
        };
      }
      setMatrixEditValues(initialMap);
    }
  }, [matrixEntries, selectedMatrixPlanKey]);

  const updatePlanMatrixMutation = trpc.serviceAllowances.updatePlanMatrixEntry.useMutation({
    onSuccess: () => {
      toast.success("Master plan defaults updated");
      refetchMatrix();
    },
    onError: (err) => {
      toast.error("Failed to update plan matrix: " + err.message);
    },
  });

  const applyPlanMutation = trpc.serviceAllowances.applyPlanToStudent.useMutation({
    onSuccess: () => {
      toast.success(`Plan applied to ${studentName || "student"}. Base allowances updated.`);
      utils.serviceAllowances.getUsageSummary.invalidate();
      utils.serviceAllowances.getAllowances.invalidate();
      setIsConfirmApplyOpen(false);
      setIsPlanMatrixModalOpen(false);
    },
    onError: (err) => {
      toast.error("Failed to apply plan: " + err.message);
    },
  });

  // Query usage summary from backend
  const { data: summary, isLoading, refetch } = trpc.serviceAllowances.getUsageSummary.useQuery(
    {
      studentContactId: contactId,
      customPeriod: customPeriod.start && customPeriod.end ? customPeriod : undefined,
    },
    { enabled: !!contactId }
  );

  // Mutations
  const logUsageMutation = trpc.serviceAllowances.logUsage.useMutation({
    onSuccess: () => {
      toast.success("Service usage recorded to case history");
      utils.serviceAllowances.getUsageSummary.invalidate();
      utils.caseActivity.list.invalidate();
      setIsLogModalOpen(false);
      setLogForm({
        serviceKey: "EMAIL_ASSISTANCE",
        eventDate: new Date().toISOString().split("T")[0],
        quantity: 1,
        note: "",
        staffMember: staffName,
      });
    },
    onError: (err) => {
      toast.error("Failed to log service: " + err.message);
    },
  });

  const addExtraMutation = trpc.serviceAllowances.addExtraAllowance.useMutation({
    onSuccess: () => {
      toast.success("Extra allowance added and logged to timeline");
      utils.serviceAllowances.getUsageSummary.invalidate();
      utils.caseActivity.list.invalidate();
      setIsExtraModalOpen(false);
      setExtraForm({
        serviceKey: "RECORDS_REVIEW",
        additionalAmount: 1,
        reason: "",
        authorizedBy: staffName,
        date: new Date().toISOString().split("T")[0],
      });
    },
    onError: (err) => {
      toast.error("Failed to add extra allowance: " + err.message);
    },
  });

  const updateConfigMutation = trpc.serviceAllowances.updateAllowanceConfig.useMutation({
    onSuccess: () => {
      toast.success("Service configuration updated");
      utils.serviceAllowances.getUsageSummary.invalidate();
      setIsConfigModalOpen(false);
    },
    onError: (err) => {
      toast.error("Failed to update config: " + err.message);
    },
  });

  // Pre-fill period form once summary is loaded
  React.useEffect(() => {
    if (summary) {
      setPeriodForm({
        start: summary.planPeriodStart,
        end: summary.planPeriodEnd,
      });
    }
  }, [summary]);

  const servicesList = summary?.services || [];

  const handleOpenConfig = (item: any) => {
    setConfigService(item);
    setConfigForm({
      baseAllowance: item.baseAllowance,
      allowanceType: item.allowanceType,
      trackingMethod: item.trackingMethod,
      reserveOnOpen: item.reserveOnOpen,
    });
    setIsConfigModalOpen(true);
  };

  const handleSaveConfig = () => {
    if (!configService) return;
    updateConfigMutation.mutate({
      studentContactId: contactId,
      serviceKey: configService.serviceKey,
      baseAllowance: Number(configForm.baseAllowance),
      allowanceType: configForm.allowanceType,
      trackingMethod: configForm.trackingMethod,
      reserveOnOpen: configForm.reserveOnOpen,
    });
  };

  const handleApplyCustomPeriod = () => {
    if (periodForm.start && periodForm.end) {
      setCustomPeriod({ start: periodForm.start, end: periodForm.end });
      setIsPeriodModalOpen(false);
      toast.success(`Service period updated: ${periodForm.start} to ${periodForm.end}`);
    }
  };

  return (
    <Card className="rounded-xl border border-border/80 bg-[#000820] text-foreground p-5 sm:p-6 shadow-xl relative overflow-hidden">
      {/* Background radial accent glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      {/* ── Top Header Section ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="h-8 w-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <BarChart3 className="h-4 w-4" />
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              📊 Service Allowances & Usage
            </h3>
            <Badge
              variant="outline"
              className="text-xs bg-white/5 border-white/10 text-muted-foreground"
            >
              {contact?.planType || "Monthly Advocacy"}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-0.5">
            <CalendarDays className="h-3.5 w-3.5 text-cyan-400" />
            <span>
              Current Service Period:{" "}
              <strong className="text-white font-medium">
                {summary?.planPeriodLabel || "Sep 1, 2026 – Aug 31, 2027"}
              </strong>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPeriodModalOpen(true)}
              className="h-5 px-1.5 text-[11px] text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded"
              title="Change plan period dates"
            >
              Edit Period
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={() => setIsLogModalOpen(true)}
            className="h-8 text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Log Service Usage
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsExtraModalOpen(true)}
            className="h-8 text-xs font-medium border-emerald-500/40 text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 hover:text-emerald-200 flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Extra Allowance
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsPlanMatrixModalOpen(true)}
            className="h-8 text-xs font-medium border-cyan-500/40 text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 hover:text-cyan-200 flex items-center gap-1.5"
            title="Configure central plan matrix and master service defaults"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Plan Matrix
          </Button>
        </div>
      </div>

      {/* ── Top Summary Status Row (Section 17) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 py-3.5">
        <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20" />
            <span className="text-xs font-medium text-emerald-200">Available</span>
          </div>
          <span className="text-sm font-bold text-white font-mono">
            {summary?.availableCount ?? 0}
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400 ring-2 ring-amber-400/20" />
            <span className="text-xs font-medium text-amber-200">Nearing Limit</span>
          </div>
          <span className="text-sm font-bold text-white font-mono">
            {summary?.almostLimitCount ?? 0}
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-rose-400 ring-2 ring-rose-400/20" />
            <span className="text-xs font-medium text-rose-200">Limits Reached</span>
          </div>
          <span className="text-sm font-bold text-white font-mono">
            {summary?.limitReachedCount ?? 0}
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3 text-sky-400" />
            <span className="text-xs font-medium text-sky-200">Scheduled / Open</span>
          </div>
          <span className="text-sm font-bold text-white font-mono">
            {summary?.scheduledOpenCount ?? 0}
          </span>
        </div>
      </div>

      {/* ── Main Service Allowances Table ── */}
      <div className="mt-2 overflow-x-auto rounded-lg border border-white/10 bg-[#010c29]/70">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02] text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-3.5">Service</th>
              <th className="py-3 px-3">Plan Allowance</th>
              <th className="py-3 px-3 text-center">Used / Completed</th>
              <th className="py-3 px-3 text-center">Scheduled / Open</th>
              <th className="py-3 px-3">Remaining</th>
              <th className="py-3 px-3">Tracking Method</th>
              <th className="py-3 px-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="h-4 w-4 animate-spin text-cyan-400" />
                    <span>Calculating service usage and allowances...</span>
                  </div>
                </td>
              </tr>
            ) : servicesList.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-muted-foreground">
                  No service allowances configured yet.
                </td>
              </tr>
            ) : (
              servicesList.map((item) => {
                const hasExtra = item.extraAllowance > 0;
                const isOver = item.status === "over_limit";
                const isAtLimit = item.status === "limit_reached";

                return (
                  <tr
                    key={item.serviceKey}
                    className={`transition-colors hover:bg-white/[0.03] ${
                      isOver
                        ? "bg-rose-500/[0.04]"
                        : isAtLimit
                        ? "bg-amber-500/[0.02]"
                        : ""
                    }`}
                  >
                    {/* Service Name & Category */}
                    <td className="py-2.5 px-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-6 w-6 rounded flex items-center justify-center bg-white/5 border border-white/10 shrink-0">
                          {getServiceIcon(item.serviceKey)}
                        </div>
                        <div>
                          <div className="font-semibold text-white text-xs flex items-center gap-1.5">
                            {item.serviceName}
                            {hasExtra && (
                              <span
                                className="text-[10px] font-bold text-emerald-400 px-1 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/30"
                                title={`${item.extraAllowance} extra authorized`}
                              >
                                +{item.extraAllowance} Extra
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground capitalize">
                            {item.category}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Plan Allowance */}
                    <td className="py-2.5 px-3">
                      {item.allowanceType === "not_included" && !hasExtra ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-500/10 text-slate-300 border border-slate-500/20">
                          Not Included
                        </span>
                      ) : item.allowanceType === "unlimited" ? (
                        <span className="font-medium text-sky-300 font-mono text-xs">
                          Unlimited / ∞
                        </span>
                      ) : (
                        <div className="text-xs">
                          <span className="font-bold text-white font-mono">
                            {item.baseAllowance + item.extraAllowance}
                          </span>
                          <span className="text-muted-foreground text-[10px]"> / period</span>
                          {hasExtra && (
                            <span className="block text-[10px] text-emerald-400/90">
                              (Base: {item.allowanceType === "not_included" ? "Not Included" : item.baseAllowance} + {item.extraAllowance})
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Used / Completed */}
                    <td className="py-2.5 px-3 text-center">
                      {item.used > 0 ? (
                        <button
                          type="button"
                          onClick={() => setAuditItem(item)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono font-bold text-xs bg-white/10 text-white hover:bg-cyan-500/20 hover:text-cyan-300 transition-colors border border-white/15"
                          title="Click to view underlying records audit"
                        >
                          {item.used}
                          <Eye className="h-3 w-3 text-cyan-400 opacity-60" />
                        </button>
                      ) : (
                        <span className="font-mono text-xs text-muted-foreground/60">0</span>
                      )}
                    </td>

                    {/* Scheduled / Open */}
                    <td className="py-2.5 px-3 text-center">
                      {item.scheduledOpen > 0 ? (
                        <button
                          type="button"
                          onClick={() => setAuditItem(item)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono font-bold text-xs bg-sky-500/15 text-sky-300 border border-sky-500/30 hover:bg-sky-500/25 transition-colors"
                          title="Click to view open reservations"
                        >
                          {item.scheduledOpen} Open
                        </button>
                      ) : (
                        <span className="font-mono text-xs text-muted-foreground/60">0</span>
                      )}
                    </td>

                    {/* Remaining */}
                    <td className="py-2.5 px-3">{getRemainingBadge(item)}</td>

                    {/* Tracking Method */}
                    <td className="py-2.5 px-3">
                      {getTrackingMethodBadge(item.trackingMethod)}
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAuditItem(item)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-white hover:bg-white/10 rounded"
                          title="Audit Source History"
                        >
                          <History className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenConfig(item)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-cyan-400 hover:bg-cyan-500/10 rounded"
                          title="Configure Allowance"
                        >
                          <Settings2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Footer Guidance Note ── */}
      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground px-1">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
          <span>
            Connected to Live CRM Calendar & Student Activity Timeline. Zero double-counting enforced.
          </span>
        </div>
        {onNavigateToTimeline && (
          <button
            type="button"
            onClick={onNavigateToTimeline}
            className="text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 font-medium"
          >
            <span>View Complete Case History</span>
            <ExternalLink className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. LOG SERVICE USAGE MODAL (+ Log Service Usage)             */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog open={isLogModalOpen} onOpenChange={setIsLogModalOpen}>
        <DialogContent className="max-w-md bg-[#000d2b] border border-cyan-500/30 text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white text-base">
              <span className="p-1 rounded bg-cyan-500/20 text-cyan-400">
                <Plus className="h-4 w-4" />
              </span>
              Log Service Usage
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Directly records delivered service into this student's case history. The usage
              dashboard immediately reflects the update.
            </p>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Service Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-white">Service Type *</Label>
              <Select
                value={logForm.serviceKey}
                onValueChange={(val) => setLogForm({ ...logForm, serviceKey: val })}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs h-9">
                  <SelectValue placeholder="Select Service" />
                </SelectTrigger>
                <SelectContent className="bg-[#000d2b] border-white/10 text-white text-xs">
                  {servicesList.map((s) => (
                    <SelectItem key={s.serviceKey} value={s.serviceKey}>
                      {s.serviceName} ({s.remaining === "Unlimited" ? "∞" : `${s.remaining} left`})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date & Quantity */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-white">Date *</Label>
                <Input
                  type="date"
                  value={logForm.eventDate}
                  onChange={(e) => setLogForm({ ...logForm, eventDate: e.target.value })}
                  className="bg-white/5 border-white/10 text-white text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-white">Quantity</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={logForm.quantity}
                  onChange={(e) =>
                    setLogForm({ ...logForm, quantity: Math.max(1, parseInt(e.target.value) || 1) })
                  }
                  className="bg-white/5 border-white/10 text-white text-xs h-9 font-mono"
                />
              </div>
            </div>

            {/* Note / Explanation */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-white">Note (Optional)</Label>
              <Textarea
                placeholder="E.g., Reviewed and drafted response to teacher regarding IEP accommodations."
                value={logForm.note}
                onChange={(e) => setLogForm({ ...logForm, note: e.target.value })}
                className="bg-white/5 border-white/10 text-white text-xs min-h-[75px] resize-none"
              />
            </div>

            {/* Staff Member */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-white">Staff Member *</Label>
              <Input
                value={logForm.staffMember}
                onChange={(e) => setLogForm({ ...logForm, staffMember: e.target.value })}
                className="bg-white/5 border-white/10 text-white text-xs h-9"
                placeholder="Byron Honea"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsLogModalOpen(false)}
              className="text-xs text-muted-foreground hover:text-white"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                const matched = servicesList.find((s) => s.serviceKey === logForm.serviceKey);
                logUsageMutation.mutate({
                  studentContactId: contactId,
                  caseId: contact?.caseId,
                  serviceKey: logForm.serviceKey,
                  serviceName: matched?.serviceName || logForm.serviceKey,
                  eventDate: logForm.eventDate,
                  quantity: logForm.quantity,
                  note: logForm.note,
                  staffMember: logForm.staffMember,
                });
              }}
              disabled={logUsageMutation.isPending}
              className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
            >
              {logUsageMutation.isPending ? "Saving..." : "Save Usage"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. ADD EXTRA ALLOWANCE MODAL (+ Add Extra Allowance)          */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog open={isExtraModalOpen} onOpenChange={setIsExtraModalOpen}>
        <DialogContent className="max-w-md bg-[#000d2b] border border-emerald-500/30 text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white text-base">
              <span className="p-1 rounded bg-emerald-500/20 text-emerald-400">
                <Plus className="h-4 w-4" />
              </span>
              Add Extra Allowance
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Authorizes additional service credits for this student. Updates the available limit
              and records an audited adjustment in case history.
            </p>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Service Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-white">Service Type *</Label>
              <Select
                value={extraForm.serviceKey}
                onValueChange={(val) => setExtraForm({ ...extraForm, serviceKey: val })}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs h-9">
                  <SelectValue placeholder="Select Service" />
                </SelectTrigger>
                <SelectContent className="bg-[#000d2b] border-white/10 text-white text-xs">
                  {servicesList.map((s) => (
                    <SelectItem key={s.serviceKey} value={s.serviceKey}>
                      {s.serviceName} (Current:{" "}
                      {s.allowanceType === "unlimited"
                        ? "Unlimited"
                        : `${s.baseAllowance + s.extraAllowance}`}
                      )
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Additional Amount & Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-white">Additional Amount *</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={extraForm.additionalAmount}
                  onChange={(e) =>
                    setExtraForm({
                      ...extraForm,
                      additionalAmount: Math.max(1, parseInt(e.target.value) || 1),
                    })
                  }
                  className="bg-white/5 border-white/10 text-white text-xs h-9 font-mono"
                  placeholder="+1"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-white">Authorization Date *</Label>
                <Input
                  type="date"
                  value={extraForm.date}
                  onChange={(e) => setExtraForm({ ...extraForm, date: e.target.value })}
                  className="bg-white/5 border-white/10 text-white text-xs h-9"
                />
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-white">Reason (Optional)</Label>
              <Textarea
                placeholder="E.g., Authorized extra Records Review due to unexpected IEP meeting call by district."
                value={extraForm.reason}
                onChange={(e) => setExtraForm({ ...extraForm, reason: e.target.value })}
                className="bg-white/5 border-white/10 text-white text-xs min-h-[75px] resize-none"
              />
            </div>

            {/* Authorized By */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-white">Authorized By *</Label>
              <Input
                value={extraForm.authorizedBy}
                onChange={(e) => setExtraForm({ ...extraForm, authorizedBy: e.target.value })}
                className="bg-white/5 border-white/10 text-white text-xs h-9"
                placeholder="Byron Honea"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExtraModalOpen(false)}
              className="text-xs text-muted-foreground hover:text-white"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                const matched = servicesList.find((s) => s.serviceKey === extraForm.serviceKey);
                addExtraMutation.mutate({
                  studentContactId: contactId,
                  caseId: contact?.caseId,
                  serviceKey: extraForm.serviceKey,
                  serviceName: matched?.serviceName || extraForm.serviceKey,
                  additionalAmount: extraForm.additionalAmount,
                  reason: extraForm.reason,
                  authorizedBy: extraForm.authorizedBy,
                  date: extraForm.date,
                });
              }}
              disabled={addExtraMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
            >
              {addExtraMutation.isPending ? "Authorizing..." : "Add Allowance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. AUDIT TRAIL MODAL (Where the usage count came from)       */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog open={!!auditItem} onOpenChange={(open) => !open && setAuditItem(null)}>
        <DialogContent className="max-w-md bg-[#000d2b] border border-white/20 text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white text-base">
              <History className="h-4 w-4 text-cyan-400" />
              <span>{auditItem?.serviceName} — Usage Audit</span>
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Exact underlying records contributing to this service's count in the current period.
            </p>
          </DialogHeader>

          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
            {/* Allowance Summary Card */}
            <div className="p-3 rounded-lg bg-white/5 border border-white/10 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <span className="text-[10px] text-muted-foreground block">Allowed</span>
                <span className="font-bold font-mono text-white text-sm">
                  {auditItem?.totalAllowance}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">Used</span>
                <span className="font-bold font-mono text-cyan-400 text-sm">
                  {auditItem?.used}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">Remaining</span>
                <span className="font-bold font-mono text-emerald-400 text-sm">
                  {auditItem?.remaining}
                </span>
              </div>
            </div>

            {/* List of underlying events */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Contributing Records ({auditItem?.sourcesAudit?.length || 0})
              </h4>

              {(!auditItem?.sourcesAudit || auditItem.sourcesAudit.length === 0) ? (
                <div className="py-6 text-center text-xs text-muted-foreground bg-white/[0.02] rounded-lg border border-dashed border-white/10">
                  No records logged or scheduled for this service yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {auditItem.sourcesAudit.map((src: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-white/[0.03] border border-white/10 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-medium text-white flex items-center gap-1.5">
                          {src.sourceType === "calendar" ? (
                            <Calendar className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                          ) : (
                            <Clock className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          )}
                          <span>{src.title}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {src.date} • {src.sourceType === "calendar" ? "Calendar Appointment" : "Case Activity Timeline"}
                        </div>
                      </div>

                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-mono ${
                          src.status === "Completed"
                            ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                            : "bg-sky-500/10 text-sky-300 border-sky-500/30"
                        }`}
                      >
                        {src.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              size="sm"
              onClick={() => setAuditItem(null)}
              className="bg-white/10 hover:bg-white/20 text-white text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. EDIT SERVICE PERIOD MODAL                                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog open={isPeriodModalOpen} onOpenChange={setIsPeriodModalOpen}>
        <DialogContent className="max-w-sm bg-[#000d2b] border border-white/20 text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white text-base">
              <CalendarDays className="h-4 w-4 text-cyan-400" />
              Current Service Period
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Usage counts are bounded to this period. Set custom boundaries if this student is on a
              non-standard contract cycle.
            </p>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-white">Period Start Date</Label>
              <Input
                type="date"
                value={periodForm.start}
                onChange={(e) => setPeriodForm({ ...periodForm, start: e.target.value })}
                className="bg-white/5 border-white/10 text-white text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-white">Period End Date</Label>
              <Input
                type="date"
                value={periodForm.end}
                onChange={(e) => setPeriodForm({ ...periodForm, end: e.target.value })}
                className="bg-white/5 border-white/10 text-white text-xs h-9"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPeriodModalOpen(false)}
              className="text-xs text-muted-foreground hover:text-white"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleApplyCustomPeriod}
              className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
            >
              Apply Period
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. CONFIGURE SERVICE MODAL (Admin Edit)                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog open={isConfigModalOpen} onOpenChange={setIsConfigModalOpen}>
        <DialogContent className="max-w-md bg-[#000d2b] border border-white/20 text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white text-base">
              <Settings2 className="h-4 w-4 text-cyan-400" />
              Configure Service: {configService?.serviceName}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Adjust baseline allowance, tracking method, or unlimited setting for this student.
            </p>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Allowance Type */}
            <div className="space-y-1.5">
              <Label className="text-xs text-white">Allowance Mode</Label>
              <Select
                value={configForm.allowanceType}
                onValueChange={(val: any) => setConfigForm({ ...configForm, allowanceType: val })}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#000d2b] border-white/10 text-white text-xs">
                  <SelectItem value="limited">Limited (Set count per period)</SelectItem>
                  <SelectItem value="unlimited">Unlimited (∞ No limit)</SelectItem>
                  <SelectItem value="not_included">Not Included (Service not included in plan)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Base Allowance if limited */}
            {configForm.allowanceType === "limited" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-white">Base Allowance per Period</Label>
                <Input
                  type="number"
                  min={0}
                  max={200}
                  value={configForm.baseAllowance}
                  onChange={(e) =>
                    setConfigForm({
                      ...configForm,
                      baseAllowance: Math.max(0, parseInt(e.target.value) || 0),
                    })
                  }
                  className="bg-white/5 border-white/10 text-white text-xs h-9 font-mono"
                />
              </div>
            )}

            {/* Tracking Method */}
            <div className="space-y-1.5">
              <Label className="text-xs text-white">Tracking Method</Label>
              <Select
                value={configForm.trackingMethod}
                onValueChange={(val: any) => setConfigForm({ ...configForm, trackingMethod: val })}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#000d2b] border-white/10 text-white text-xs">
                  <SelectItem value="calendar">🗓️ Calendar Appointments</SelectItem>
                  <SelectItem value="timeline">🕒 Student Activity Timeline</SelectItem>
                  <SelectItem value="manual">✋ Manual Tracking</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reserve on Open */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/10">
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-white block">
                  Reserve on Scheduled / Open
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  When enabled, open services and future appointments hold an allowance slot.
                </span>
              </div>
              <input
                type="checkbox"
                checked={configForm.reserveOnOpen}
                onChange={(e) => setConfigForm({ ...configForm, reserveOnOpen: e.target.checked })}
                className="h-4 w-4 rounded border-white/20 bg-white/10 text-cyan-500 focus:ring-0"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsConfigModalOpen(false)}
              className="text-xs text-muted-foreground hover:text-white"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveConfig}
              disabled={updateConfigMutation.isPending}
              className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
            >
              {updateConfigMutation.isPending ? "Saving..." : "Save Configuration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 6. MASTER PLAN SERVICE MATRIX MODAL (Central Plan Config)    */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog open={isPlanMatrixModalOpen} onOpenChange={setIsPlanMatrixModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[#000d2b] border border-cyan-500/30 text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white text-lg">
              <Settings2 className="h-5 w-5 text-cyan-400" />
              Central Plan Service Matrix
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Define master default service allowances and inclusions for each Waypoint plan.
              Adjust defaults below or apply a plan template directly to {studentName || "this student"}.
            </p>
          </DialogHeader>

          {/* Plan Selection Pills */}
          <div className="flex items-center gap-2 flex-wrap py-2 border-b border-white/10">
            {[
              { key: "anchor", label: "Anchor (Executive)", desc: "Unlimited IEP & 504" },
              { key: "navigator", label: "Navigator", desc: "Guided Core Meeting" },
              { key: "family", label: "Family", desc: "Full Family IEP" },
              { key: "monthly_advocacy", label: "Monthly Advocacy ($55)", desc: "Standard Tier" },
              { key: "pay_per_use", label: "Pay Per Use", desc: "Ad-hoc Services" },
            ].map((p) => {
              const isSelected = selectedMatrixPlanKey === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setSelectedMatrixPlanKey(p.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-left border ${
                    isSelected
                      ? "bg-cyan-600/30 border-cyan-400 text-white shadow-sm ring-1 ring-cyan-400/50"
                      : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <div className="font-semibold">{p.label}</div>
                  <div className="text-[10px] opacity-70">{p.desc}</div>
                </button>
              );
            })}
          </div>

          {/* Matrix Services Table */}
          <div className="overflow-x-auto rounded-lg border border-white/10 mt-2 bg-white/[0.01]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-muted-foreground uppercase tracking-wider text-[10px] font-semibold">
                  <th className="py-2.5 px-3">Service</th>
                  <th className="py-2.5 px-3">Inclusion / Allowance Mode</th>
                  <th className="py-2.5 px-3 text-center">Base Allowance</th>
                  <th className="py-2.5 px-3">Tracking Method</th>
                  <th className="py-2.5 px-3 text-center">Reserve on Open</th>
                  <th className="py-2.5 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isMatrixLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Clock className="h-4 w-4 animate-spin text-cyan-400" />
                        <span>Loading plan matrix...</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  (matrixEntries || []).map((entry) => {
                    const local = matrixEditValues[entry.serviceKey] || {
                      allowanceType: entry.allowanceType,
                      baseAllowance: entry.baseAllowance,
                      trackingMethod: entry.trackingMethod,
                      reserveOnOpen: entry.reserveOnOpen,
                    };

                    const handleRowChange = (field: string, val: any) => {
                      setMatrixEditValues((prev) => ({
                        ...prev,
                        [entry.serviceKey]: {
                          ...local,
                          [field]: val,
                        },
                      }));
                    };

                    const handleSaveRow = () => {
                      updatePlanMatrixMutation.mutate({
                        planKey: selectedMatrixPlanKey,
                        serviceKey: entry.serviceKey,
                        allowanceType: local.allowanceType,
                        baseAllowance: Number(local.baseAllowance) || 0,
                        trackingMethod: local.trackingMethod,
                        reserveOnOpen: local.reserveOnOpen,
                      });
                    };

                    return (
                      <tr key={entry.serviceKey} className="hover:bg-white/[0.02] transition-colors">
                        {/* Service Name & Icon */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded flex items-center justify-center bg-white/5 border border-white/10 shrink-0">
                              {getServiceIcon(entry.serviceKey)}
                            </div>
                            <div>
                              <div className="font-semibold text-white">{entry.serviceName}</div>
                              <div className="text-[10px] text-muted-foreground capitalize">
                                {entry.category}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Allowance Mode */}
                        <td className="py-2.5 px-3">
                          <select
                            value={local.allowanceType}
                            onChange={(e) => handleRowChange("allowanceType", e.target.value)}
                            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-400"
                          >
                            <option value="limited" className="bg-[#000d2b] text-white">
                              Limited (Numbered allowance)
                            </option>
                            <option value="unlimited" className="bg-[#000d2b] text-white">
                              Unlimited / ∞
                            </option>
                            <option value="not_included" className="bg-[#000d2b] text-white">
                              Not Included
                            </option>
                          </select>
                        </td>

                        {/* Base Allowance */}
                        <td className="py-2.5 px-3 text-center">
                          {local.allowanceType === "limited" ? (
                            <Input
                              type="number"
                              min={0}
                              max={200}
                              value={local.baseAllowance}
                              onChange={(e) =>
                                handleRowChange("baseAllowance", Math.max(0, parseInt(e.target.value) || 0))
                              }
                              className="h-7 w-16 mx-auto text-center font-mono text-xs bg-white/5 border-white/10 text-white"
                            />
                          ) : (
                            <span className="text-muted-foreground text-[11px] font-mono">
                              {local.allowanceType === "unlimited" ? "∞" : "—"}
                            </span>
                          )}
                        </td>

                        {/* Tracking Method */}
                        <td className="py-2.5 px-3">
                          <select
                            value={local.trackingMethod}
                            onChange={(e) => handleRowChange("trackingMethod", e.target.value)}
                            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-400"
                          >
                            <option value="calendar" className="bg-[#000d2b] text-white">
                              🗓️ Calendar
                            </option>
                            <option value="timeline" className="bg-[#000d2b] text-white">
                              🕒 Activity Timeline
                            </option>
                            <option value="manual" className="bg-[#000d2b] text-white">
                              ✋ Manual Tracking
                            </option>
                          </select>
                        </td>

                        {/* Reserve on Open */}
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={local.reserveOnOpen}
                            onChange={(e) => handleRowChange("reserveOnOpen", e.target.checked)}
                            className="h-4 w-4 rounded border-white/20 bg-white/10 text-cyan-500 focus:ring-0"
                          />
                        </td>

                        {/* Save Button */}
                        <td className="py-2.5 px-2 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSaveRow}
                            disabled={updatePlanMatrixMutation.isPending}
                            className="h-7 px-2 text-[11px] text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded"
                          >
                            Save
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between pt-3 border-t border-white/10">
            <Button
              type="button"
              onClick={() => setIsConfirmApplyOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Apply {selectedMatrixPlanKey.toUpperCase()} Plan to {studentName || "Student"}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPlanMatrixModalOpen(false)}
              className="text-xs text-muted-foreground hover:text-white"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 7. CONFIRM APPLY PLAN MATRIX MODAL (Safe Plan Change)       */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog open={isConfirmApplyOpen} onOpenChange={setIsConfirmApplyOpen}>
        <DialogContent className="max-w-md bg-[#000d2b] border border-emerald-500/40 text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-300 text-base">
              <Sparkles className="h-5 w-5 text-emerald-400" />
              Apply Plan Matrix to Student
            </DialogTitle>
            <p className="text-xs text-muted-foreground pt-1">
              You are applying the{" "}
              <strong className="text-white capitalize">{selectedMatrixPlanKey.replace(/_/g, " ")}</strong>{" "}
              matrix defaults to <strong className="text-white">{studentName || "this student"}</strong>.
            </p>
          </DialogHeader>

          {packageConfigStatus && !packageConfigStatus.isConfigured ? (
            <div className="py-3 px-3.5 space-y-2.5 rounded-lg bg-amber-950/50 border border-amber-500/50 text-amber-200 text-xs">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                <span>⚠️ PACKAGE ALLOWANCES NOT CONFIGURED</span>
              </div>
              <p className="text-[11.5px] text-amber-200/90 leading-relaxed">
                This Advocacy Package does not have Service Allowances configured yet. Configure allowances before activation.
              </p>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  window.location.href = "/services";
                }}
                className="h-7 text-xs bg-amber-600 hover:bg-amber-500 text-white font-medium"
              >
                Configure Package
              </Button>
            </div>
          ) : (
            <div className="py-2 space-y-2 text-xs text-muted-foreground bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg">
              <p className="text-white font-medium">Safe Plan Migration Guarantees:</p>
              <ul className="list-disc list-inside space-y-1 text-[11px]">
                <li><strong>Base Allowances:</strong> Updated to the new plan defaults.</li>
                <li><strong>Extra Allowances:</strong> Any student-specific authorized extra sessions are strictly PRESERVED.</li>
                <li><strong>Case History:</strong> Existing appointments, case notes, and Activity Timeline entries remain untouched.</li>
                <li><strong>Zero Double-Counting:</strong> Existing completed and scheduled counts carry forward safely.</li>
              </ul>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsConfirmApplyOpen(false)}
              className="text-xs text-muted-foreground hover:text-white"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() =>
                applyPlanMutation.mutate({
                  studentContactId: contactId,
                  planKey: selectedMatrixPlanKey,
                })
              }
              disabled={applyPlanMutation.isPending || (packageConfigStatus !== undefined && !packageConfigStatus.isConfigured)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {applyPlanMutation.isPending ? "Applying..." : "Confirm & Apply Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
