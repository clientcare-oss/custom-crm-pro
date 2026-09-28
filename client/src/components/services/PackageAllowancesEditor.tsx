/**
 * PG-035 Advocacy Services Catalog — Included Services & Allowances Editor
 * Provides master package allowance configuration for Advocacy Packages (Anchor, Navigator, Family, etc.).
 * Fully connected to Student Details Service Allowances & Usage tracker.
 * Supports Locking/Unlocking, 9 Standard Services, Custom Service Allowances, Advanced Tracking,
 * and safe migration choices (Future clients vs Currently active clients).
 */

import React, { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Info,
  Calendar,
  Clock,
  Hand,
  Link2,
  Scale,
  Users,
  FileText,
  Mail,
  ShieldCheck,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CatalogServiceItem } from "./serviceTypes";

export interface PackageAllowanceRow {
  serviceKey: string;
  serviceName: string;
  category: "meeting" | "advocacy" | "review" | "document";
  allowanceType: "limited" | "unlimited" | "not_included";
  baseAllowance: number;
  trackingMethod: "calendar" | "timeline" | "manual" | "connected_tool";
  reserveOnOpen: boolean;
  isCustom?: boolean;
}

interface PackageAllowancesEditorProps {
  planKey: string;
  planName: string;
  serviceId?: number;
  catalogServices?: CatalogServiceItem[];
  onAllowancesUpdated?: (allowances: PackageAllowanceRow[], isLocked: boolean) => void;
  // External ref or save trigger callback
  externalSaveRef?: React.MutableRefObject<(() => Promise<boolean>) | null>;
}

// 9 Standard Waypoint Service Definitions
const STANDARD_SERVICES: Array<{
  serviceKey: string;
  serviceName: string;
  icon: string;
  category: "meeting" | "advocacy" | "review" | "document";
  defaultTrackingMethod: "calendar" | "timeline" | "manual";
  defaultReserveOnOpen: boolean;
}> = [
  {
    serviceKey: "IEP_MEETING",
    serviceName: "IEP Meetings",
    icon: "🏫",
    category: "meeting",
    defaultTrackingMethod: "calendar",
    defaultReserveOnOpen: true,
  },
  {
    serviceKey: "504_MEETING",
    serviceName: "504 Meetings",
    icon: "📋",
    category: "meeting",
    defaultTrackingMethod: "calendar",
    defaultReserveOnOpen: true,
  },
  {
    serviceKey: "RECORDS_REVIEW",
    serviceName: "Records Reviews",
    icon: "🔎",
    category: "review",
    defaultTrackingMethod: "calendar",
    defaultReserveOnOpen: true,
  },
  {
    serviceKey: "EMAIL_ASSISTANCE",
    serviceName: "Email Assistance",
    icon: "✉️",
    category: "advocacy",
    defaultTrackingMethod: "timeline",
    defaultReserveOnOpen: false,
  },
  {
    serviceKey: "STATE_COMPLAINT",
    serviceName: "State Complaints",
    icon: "⚖️",
    category: "advocacy",
    defaultTrackingMethod: "timeline",
    defaultReserveOnOpen: true,
  },
  {
    serviceKey: "PWN_SUPPORT",
    serviceName: "PWN Review / Support",
    icon: "📝",
    category: "advocacy",
    defaultTrackingMethod: "timeline",
    defaultReserveOnOpen: false,
  },
  {
    serviceKey: "ADVOCATE_SESSION",
    serviceName: "Advocate Sessions",
    icon: "📞",
    category: "meeting",
    defaultTrackingMethod: "calendar",
    defaultReserveOnOpen: true,
  },
  {
    serviceKey: "DOCUMENT_REVIEW",
    serviceName: "Document Reviews",
    icon: "📄",
    category: "document",
    defaultTrackingMethod: "timeline",
    defaultReserveOnOpen: false,
  },
  {
    serviceKey: "PARENT_CONCERN_ASSISTANCE",
    serviceName: "Parent Concern Statement Assistance",
    icon: "📝",
    category: "advocacy",
    defaultTrackingMethod: "timeline",
    defaultReserveOnOpen: false,
  },
];

function getServiceIconBadge(serviceKey: string, fallbackIcon: string = "briefcase") {
  const std = STANDARD_SERVICES.find((s) => s.serviceKey === serviceKey);
  if (std) {
    return <span className="text-base select-none">{std.icon}</span>;
  }
  switch (fallbackIcon) {
    case "scale":
      return <Scale className="w-4 h-4 text-purple-400" />;
    case "users":
      return <Users className="w-4 h-4 text-blue-400" />;
    case "file-text":
      return <FileText className="w-4 h-4 text-teal-400" />;
    case "mail":
      return <Mail className="w-4 h-4 text-emerald-400" />;
    default:
      return <Sparkles className="w-4 h-4 text-amber-400" />;
  }
}

export const PackageAllowancesEditor: React.FC<PackageAllowancesEditorProps> = ({
  planKey,
  planName,
  serviceId,
  catalogServices = [],
  onAllowancesUpdated,
  externalSaveRef,
}) => {
  const utils = trpc.useContext();

  // Query package allowances and lock state from backend
  const { data: packageData, isLoading: loadingData, refetch } = trpc.services.getPackageAllowances.useQuery(
    {
      serviceId,
      planKey: planKey || "custom",
      planName: planName || "Advocacy Package",
    },
    { enabled: Boolean(planKey) }
  );

  // Form state
  const [allowances, setAllowances] = useState<PackageAllowanceRow[]>([]);
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [expandedAdvanced, setExpandedAdvanced] = useState<Record<string, boolean>>({});

  // Modals state
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [addServiceModalOpen, setAddServiceModalOpen] = useState(false);
  const [pendingApplyChoice, setPendingApplyChoice] = useState<"future_only" | "active_clients">("future_only");

  // Add Service Form
  const [newServiceKey, setNewServiceKey] = useState("");
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceCategory, setNewServiceCategory] = useState<"meeting" | "advocacy" | "review" | "document">("advocacy");

  // Sync state from query
  useEffect(() => {
    if (packageData) {
      setAllowances(
        packageData.allowances.map((a: any) => ({
          serviceKey: a.serviceKey,
          serviceName: a.serviceName,
          category: a.category || "advocacy",
          allowanceType: a.allowanceType || "limited",
          baseAllowance: a.baseAllowance ?? (a.allowanceType === "limited" ? 1 : 0),
          trackingMethod: a.trackingMethod || "calendar",
          reserveOnOpen: a.reserveOnOpen ?? true,
          isCustom: !STANDARD_SERVICES.some((s) => s.serviceKey === a.serviceKey),
        }))
      );
      setIsLocked(packageData.isLocked !== false);
    }
  }, [packageData]);

  // Save mutation
  const updatePackageAllowancesMutation = trpc.services.updatePackageAllowances.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      refetch();
      utils.services.list.invalidate();
      setApplyModalOpen(false);
      onAllowancesUpdated?.(allowances, isLocked);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update package allowances");
    },
  });

  // Execute Save
  const executeSave = async (applyToActiveClients: boolean) => {
    return await updatePackageAllowancesMutation.mutateAsync({
      serviceId,
      planKey,
      planName,
      isLocked,
      applyToActiveClients,
      allowances: allowances.map((a) => ({
        serviceKey: a.serviceKey,
        serviceName: a.serviceName,
        category: a.category,
        allowanceType: a.allowanceType,
        baseAllowance: a.allowanceType === "limited" ? Number(a.baseAllowance) || 0 : 0,
        trackingMethod: a.trackingMethod,
        reserveOnOpen: a.reserveOnOpen,
      })),
    });
  };

  // Expose save function to parent sheet if needed
  useEffect(() => {
    if (externalSaveRef) {
      externalSaveRef.current = async () => {
        setApplyModalOpen(true);
        return true;
      };
    }
  }, [externalSaveRef, allowances, isLocked, planKey, planName]);

  // Allowance Row handlers
  const handleAllowanceTypeChange = (serviceKey: string, type: "limited" | "unlimited" | "not_included") => {
    if (isLocked) return;
    setAllowances((prev) =>
      prev.map((item) => {
        if (item.serviceKey !== serviceKey) return item;
        let newBase = item.baseAllowance;
        if (type === "limited" && newBase <= 0) {
          newBase = 2; // Default friendly quantity
        } else if (type === "not_included" || type === "unlimited") {
          newBase = 0;
        }
        return {
          ...item,
          allowanceType: type,
          baseAllowance: newBase,
        };
      })
    );
  };

  const handleQuantityChange = (serviceKey: string, val: string) => {
    if (isLocked) return;
    const parsed = parseInt(val, 10);
    const safeQty = isNaN(parsed) || parsed < 0 ? 0 : parsed;
    setAllowances((prev) =>
      prev.map((item) => (item.serviceKey === serviceKey ? { ...item, baseAllowance: safeQty } : item))
    );
  };

  const handleTrackingMethodChange = (serviceKey: string, method: "calendar" | "timeline" | "manual" | "connected_tool") => {
    if (isLocked) return;
    setAllowances((prev) =>
      prev.map((item) => (item.serviceKey === serviceKey ? { ...item, trackingMethod: method } : item))
    );
  };

  const handleReserveOnOpenChange = (serviceKey: string, reserve: boolean) => {
    if (isLocked) return;
    setAllowances((prev) =>
      prev.map((item) => (item.serviceKey === serviceKey ? { ...item, reserveOnOpen: reserve } : item))
    );
  };

  const toggleAdvanced = (serviceKey: string) => {
    setExpandedAdvanced((prev) => ({
      ...prev,
      [serviceKey]: !prev[serviceKey],
    }));
  };

  // Add custom service allowance
  const handleAddCustomService = () => {
    if (!newServiceName.trim()) {
      toast.error("Please provide a service title");
      return;
    }

    const key =
      newServiceKey.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_") ||
      newServiceName.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");

    // Check duplicate
    if (allowances.some((a) => a.serviceKey === key)) {
      toast.error(`Service with key "${key}" already exists in this package`);
      return;
    }

    const newRow: PackageAllowanceRow = {
      serviceKey: key,
      serviceName: newServiceName.trim(),
      category: newServiceCategory,
      allowanceType: "limited",
      baseAllowance: 1,
      trackingMethod: "calendar",
      reserveOnOpen: true,
      isCustom: true,
    };

    setAllowances([...allowances, newRow]);
    setNewServiceKey("");
    setNewServiceName("");
    setAddServiceModalOpen(false);
    toast.success(`Added ${newRow.serviceName} to package allowances`);
  };

  const handleRemoveCustomService = (serviceKey: string) => {
    if (isLocked) return;
    setAllowances(allowances.filter((a) => a.serviceKey !== serviceKey));
    toast.success("Removed custom service allowance");
  };

  // Candidate services from catalog not yet added
  const availableCatalogChoices = useMemo(() => {
    const existingKeys = new Set(allowances.map((a) => a.serviceKey.toLowerCase()));
    return catalogServices.filter((s) => {
      const code = (s.serviceCode || "").toLowerCase();
      const title = (s.clientFacingTitle || s.name || "").toLowerCase();
      return !existingKeys.has(code) && !existingKeys.has(title.replace(/[^a-z0-9_]/g, "_"));
    });
  }, [catalogServices, allowances]);

  const activeClientsCount = packageData?.activeClientsCount ?? 0;
  const includedCount = allowances.filter((a) => a.allowanceType !== "not_included").length;

  if (loadingData && allowances.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-3 bg-[#001035] rounded-xl border border-blue-900/40">
        <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-sky-200">Loading Advocacy Package allowances...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* SECTION HEADER & DESCRIPTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#001238] border border-blue-900/60 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
              <span>📊 Included Services & Allowances</span>
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-sky-950/70 border border-sky-500/30 text-sky-300">
              {includedCount} Included
            </span>
          </div>
          <p className="text-xs text-blue-200/80 mt-1 max-w-xl leading-relaxed">
            Set the services included with this advocacy package and how many the client may use during their service
            period. These limits automatically connect to the student's{" "}
            <span className="font-semibold text-sky-300">Service Allowances & Usage</span> tracker.
          </p>
        </div>

        {/* LOCK / UNLOCK ACTION BUTTON */}
        <div className="flex items-center gap-2 shrink-0">
          {isLocked ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-950/80 border border-sky-500/40 text-sky-300 shadow-xs">
                <Lock className="w-3.5 h-3.5 text-sky-400" />
                <span>🔒 Allowances Locked</span>
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setUnlockModalOpen(true)}
                className="border border-sky-500/30 bg-[#082043] hover:bg-[#0D3A68] text-white text-xs h-7.5 px-2.5 rounded-lg cursor-pointer"
              >
                <Unlock className="w-3 h-3 text-amber-400 mr-1" />
                Unlock to Edit
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-950/70 border border-amber-600/40 text-amber-300 shadow-xs">
                <Unlock className="w-3.5 h-3.5 text-amber-400" />
                <span>Unlocked (Editing)</span>
              </span>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setIsLocked(true);
                  toast.info("Allowances locked. Click Save to record changes.");
                }}
                className="bg-blue-700 hover:bg-blue-600 text-white text-xs h-7.5 px-2.5 rounded-lg cursor-pointer"
              >
                <Lock className="w-3 h-3 mr-1" />
                Lock Allowances
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* UNLOCKED WARNING BANNER */}
      {!isLocked && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 text-xs text-amber-200/90 leading-snug">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold text-amber-100">Package Allowances are Unlocked:</span> You can adjust
            which services are included, choose between Limited or Unlimited, and set quantities. When saving, you can
            choose whether changes apply to future clients only or also update active clients.
          </div>
        </div>
      )}

      {/* ALLOWANCES TABLE / GRID */}
      <div className="rounded-xl border border-blue-900/60 bg-[#000e2e] shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[550px]">
            <thead>
              <tr className="border-b border-sky-500/20 bg-[#001744] text-[11px] font-semibold text-sky-200/80 uppercase tracking-wider">
                <th className="py-2.5 px-3 w-[36%]">Service</th>
                <th className="py-2.5 px-3 w-[38%]">Included & Allowance Type</th>
                <th className="py-2.5 px-3 w-[16%] text-center">Quantity</th>
                <th className="py-2.5 px-3 w-[10%] text-right">Settings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-900/40 text-xs">
              {allowances.map((item) => {
                const isCustom = item.isCustom;
                const isAdvancedOpen = Boolean(expandedAdvanced[item.serviceKey]);

                return (
                  <React.Fragment key={item.serviceKey}>
                    <tr
                      className={`transition-colors ${
                        item.allowanceType === "not_included"
                          ? "bg-[#000a24]/50 opacity-75 hover:opacity-100 hover:bg-[#00123a]"
                          : "hover:bg-[#001648]"
                      }`}
                    >
                      {/* Column 1: Service Label & Key */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-start gap-2">
                          <div className="w-7 h-7 rounded-lg bg-[#000821] border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                            {getServiceIconBadge(item.serviceKey)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-white text-xs sm:text-sm truncate">
                              {item.serviceName}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[9.5px] text-sky-400/70 tracking-tight">
                                {item.serviceKey}
                              </span>
                              {isCustom && (
                                <span className="px-1 py-0.2 rounded text-[9px] bg-purple-950/80 text-purple-300 border border-purple-800/40 font-medium">
                                  Custom
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Allowance Type Selector */}
                      <td className="py-2.5 px-3">
                        <div className="inline-flex rounded-lg border border-blue-900/60 bg-[#000821] p-0.5 shadow-inner">
                          {/* Not Included */}
                          <button
                            type="button"
                            disabled={isLocked}
                            onClick={() => handleAllowanceTypeChange(item.serviceKey, "not_included")}
                            className={`px-2 py-1 text-[11px] font-medium rounded-md transition-all cursor-pointer disabled:cursor-not-allowed ${
                              item.allowanceType === "not_included"
                                ? "bg-slate-700 text-slate-100 shadow-xs"
                                : "text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            Not Included
                          </button>

                          {/* Limited */}
                          <button
                            type="button"
                            disabled={isLocked}
                            onClick={() => handleAllowanceTypeChange(item.serviceKey, "limited")}
                            className={`px-2 py-1 text-[11px] font-medium rounded-md transition-all cursor-pointer disabled:cursor-not-allowed ${
                              item.allowanceType === "limited"
                                ? "bg-blue-600 text-white font-semibold shadow-xs"
                                : "text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            Limited
                          </button>

                          {/* Unlimited */}
                          <button
                            type="button"
                            disabled={isLocked}
                            onClick={() => handleAllowanceTypeChange(item.serviceKey, "unlimited")}
                            className={`px-2 py-1 text-[11px] font-medium rounded-md transition-all cursor-pointer disabled:cursor-not-allowed ${
                              item.allowanceType === "unlimited"
                                ? "bg-sky-600 text-white font-semibold shadow-xs"
                                : "text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            Unlimited (∞)
                          </button>
                        </div>
                      </td>

                      {/* Column 3: Quantity Input */}
                      <td className="py-2.5 px-3 text-center">
                        {item.allowanceType === "limited" ? (
                          <div className="inline-flex items-center justify-center">
                            <Input
                              type="number"
                              min={1}
                              step={1}
                              disabled={isLocked}
                              value={item.baseAllowance || ""}
                              onChange={(e) => handleQuantityChange(item.serviceKey, e.target.value)}
                              placeholder="Qty"
                              className="w-16 h-7.5 text-center font-mono font-bold text-xs bg-[#000821] border border-blue-500/40 text-sky-200 rounded-lg focus:border-sky-400 disabled:opacity-75 disabled:cursor-not-allowed"
                            />
                          </div>
                        ) : item.allowanceType === "unlimited" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-bold text-sky-300 bg-sky-950/60 border border-sky-800/40">
                            ∞ Unlimited
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs select-none">—</span>
                        )}
                      </td>

                      {/* Column 4: Advanced Toggle & Custom Delete */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleAdvanced(item.serviceKey)}
                            title="Tracking and Reservation Settings"
                            className="h-7 px-2 text-[11px] text-blue-300 hover:text-white hover:bg-[#082043] rounded-md cursor-pointer"
                          >
                            <span className="hidden sm:inline mr-1">Advanced</span>
                            {isAdvancedOpen ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </Button>

                          {isCustom && !isLocked && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveCustomService(item.serviceKey)}
                              className="h-7 w-7 text-rose-400 hover:text-rose-200 hover:bg-rose-950/50 rounded-md cursor-pointer"
                              title="Remove custom service allowance"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* EXPANDABLE ADVANCED SETTINGS ROW */}
                    {isAdvancedOpen && (
                      <tr className="bg-[#000821]/80 border-b border-blue-900/30">
                        <td colSpan={4} className="py-2.5 px-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs p-3 rounded-lg bg-[#001035] border border-blue-900/50">
                            {/* Tracking Method */}
                            <div className="space-y-1.5">
                              <Label className="text-[11px] text-slate-300 font-semibold flex items-center gap-1">
                                <span>Tracking Method</span>
                                <HelpCircle className="w-3 h-3 text-slate-400" />
                              </Label>
                              <Select
                                disabled={isLocked}
                                value={item.trackingMethod}
                                onValueChange={(val: any) => handleTrackingMethodChange(item.serviceKey, val)}
                              >
                                <SelectTrigger className="h-7.5 bg-[#000821] border border-blue-800/60 text-xs text-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#001035] border-blue-900/60 text-white text-xs">
                                  <SelectItem value="calendar">
                                    <div className="flex items-center gap-1.5">
                                      <Calendar className="w-3.5 h-3.5 text-sky-400" />
                                      <span>🗓 Calendar / Appointments</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="timeline">
                                    <div className="flex items-center gap-1.5">
                                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                                      <span>🕒 Activity Timeline</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="manual">
                                    <div className="flex items-center gap-1.5">
                                      <Hand className="w-3.5 h-3.5 text-amber-400" />
                                      <span>✋ Manual Tracking</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="connected_tool">
                                    <div className="flex items-center gap-1.5">
                                      <Link2 className="w-3.5 h-3.5 text-purple-400" />
                                      <span>🔗 Connected Tool</span>
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Reserve Allowance When Scheduled/Open */}
                            <div className="space-y-1.5">
                              <Label className="text-[11px] text-slate-300 font-semibold flex items-center gap-1">
                                <span>Reserve allowance when Scheduled/Open</span>
                              </Label>
                              <div className="flex items-center justify-between p-2 rounded-lg bg-[#000821] border border-blue-800/60">
                                <span className="text-[11px] text-slate-300">
                                  {item.reserveOnOpen
                                    ? "Yes — Deduct from remaining while appointment is open"
                                    : "No — Deduct only when completed / logged"}
                                </span>
                                <Switch
                                  disabled={isLocked}
                                  checked={item.reserveOnOpen}
                                  onCheckedChange={(checked) => handleReserveOnOpenChange(item.serviceKey, checked)}
                                />
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-[#00143f] border-t border-blue-900/60">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLocked}
            onClick={() => setAddServiceModalOpen(true)}
            className="border border-sky-500/30 bg-[#000821] hover:bg-[#001a50] text-sky-200 text-xs h-8 rounded-lg cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            + Add Service Allowance
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => setApplyModalOpen(true)}
              disabled={updatePackageAllowancesMutation.isPending}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs h-8 px-4 rounded-lg shadow-md cursor-pointer"
            >
              {updatePackageAllowancesMutation.isPending ? "Saving..." : "Save Package Allowances"}
            </Button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 1: UNLOCK ALLOWANCES CONFIRMATION DIALOG
      ───────────────────────────────────────────────────────────── */}
      <Dialog open={unlockModalOpen} onOpenChange={setUnlockModalOpen}>
        <DialogContent className="max-w-md bg-[#001035] border border-blue-900/80 text-white shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-950/60 border border-amber-500/30 text-amber-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <DialogTitle className="text-base font-bold text-white">
                Unlock Package Allowances
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-blue-200/80 pt-2 leading-relaxed">
              You're about to edit the service allowances for this Advocacy Package. Changes may affect future clients
              assigned to this package.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3.5 rounded-xl bg-[#000821] border border-blue-900/60 space-y-1.5 text-xs text-slate-300">
            <div className="flex items-center gap-2 text-sky-300 font-semibold">
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              <span>Safe Editing Protection</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              When saving after unlock, you can choose whether the new defaults apply only to future clients, or also
              update active clients while preserving their existing usage history.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setUnlockModalOpen(false)}
              className="border border-sky-500/25 bg-[#082043] text-blue-100 hover:bg-[#0D3A68] text-xs rounded-lg"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setIsLocked(false);
                setUnlockModalOpen(false);
                toast.success("Allowances unlocked for editing.");
              }}
              className="bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs rounded-lg cursor-pointer"
            >
              Unlock Allowances
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 2: APPLY CHANGES DIALOG (FUTURE ONLY vs ACTIVE CLIENTS)
      ───────────────────────────────────────────────────────────── */}
      <Dialog open={applyModalOpen} onOpenChange={setApplyModalOpen}>
        <DialogContent className="max-w-lg bg-[#001035] border border-blue-900/80 text-white shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-950/60 border border-blue-500/30 text-sky-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <DialogTitle className="text-base font-bold text-white">
                Apply Package Changes
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-blue-200/80 pt-1 leading-relaxed">
              Choose how you want to apply these updated service allowances for{" "}
              <span className="font-semibold text-white">{planName}</span>:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {/* Option 1: Future clients only (Recommended Default) */}
            <label
              className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                pendingApplyChoice === "future_only"
                  ? "bg-[#001a50] border-sky-400 shadow-md"
                  : "bg-[#000821] border-blue-900/50 hover:bg-[#00123a]"
              }`}
            >
              <input
                type="radio"
                name="applyChoice"
                value="future_only"
                checked={pendingApplyChoice === "future_only"}
                onChange={() => setPendingApplyChoice("future_only")}
                className="mt-1 text-sky-500 focus:ring-sky-400"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-white">
                  <span>Future clients/service periods only</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/40">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-blue-200/70 mt-0.5 leading-relaxed">
                  Saves these settings as the master template defaults for any new client or subscription renewal
                  starting after today. Existing clients retain their current service-period records.
                </p>
              </div>
            </label>

            {/* Option 2: Apply to active clients */}
            <label
              className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                pendingApplyChoice === "active_clients"
                  ? "bg-[#001a50] border-sky-400 shadow-md"
                  : "bg-[#000821] border-blue-900/50 hover:bg-[#00123a]"
              }`}
            >
              <input
                type="radio"
                name="applyChoice"
                value="active_clients"
                checked={pendingApplyChoice === "active_clients"}
                onChange={() => setPendingApplyChoice("active_clients")}
                className="mt-1 text-sky-500 focus:ring-sky-400"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-white">
                  <span>Apply updated base allowances to currently active clients on this package</span>
                </div>
                <div className="text-xs text-sky-300 font-semibold mt-0.5">
                  Affects {activeClientsCount} currently active client{activeClientsCount === 1 ? "" : "s"}.
                </div>
                <p className="text-xs text-blue-200/70 mt-1 leading-relaxed">
                  Updates only the base allowance for active clients. Strictly preserves all existing used counts,
                  scheduled appointments, extra allowances, manual adjustments, Activity Timeline logs, and overrides.
                  Historical usage is never reset or deleted.
                </p>
              </div>
            </label>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setApplyModalOpen(false)}
              className="border border-sky-500/25 bg-[#082043] text-blue-100 hover:bg-[#0D3A68] text-xs rounded-lg"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={updatePackageAllowancesMutation.isPending}
              onClick={() => executeSave(pendingApplyChoice === "active_clients")}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg cursor-pointer"
            >
              {updatePackageAllowancesMutation.isPending ? "Applying..." : "Confirm & Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 3: + ADD SERVICE ALLOWANCE DIALOG
      ───────────────────────────────────────────────────────────── */}
      <Dialog open={addServiceModalOpen} onOpenChange={setAddServiceModalOpen}>
        <DialogContent className="max-w-md bg-[#001035] border border-blue-900/80 text-white shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-sky-400" />
              <DialogTitle className="text-base font-bold text-white">
                Add Service Allowance
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-blue-200/80 pt-1">
              Add another trackable service allowance to this Advocacy Package.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Quick Pick from Catalog Services */}
            {availableCatalogChoices.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Pick From Existing Catalog</Label>
                <Select
                  onValueChange={(val) => {
                    const picked = availableCatalogChoices.find((s) => s.serviceCode === val || s.id.toString() === val);
                    if (picked) {
                      setNewServiceName(picked.clientFacingTitle || picked.name);
                      setNewServiceKey((picked.serviceCode || picked.name).toUpperCase().replace(/[^A-Z0-9_]/g, "_"));
                    }
                  }}
                >
                  <SelectTrigger className="bg-[#000821] border border-blue-800/60 text-xs text-white">
                    <SelectValue placeholder="Select existing service..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#001035] border-blue-900/60 text-white text-xs max-h-56">
                    {availableCatalogChoices.map((s) => (
                      <SelectItem key={s.id} value={s.serviceCode || s.id.toString()}>
                        {s.clientFacingTitle || s.name} ({s.serviceCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Service Title */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Service Title *</Label>
              <Input
                placeholder="e.g. Virtual IEP Meeting Attendance"
                value={newServiceName}
                onChange={(e) => {
                  setNewServiceName(e.target.value);
                  if (!newServiceKey) {
                    setNewServiceKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_"));
                  }
                }}
                className="bg-[#000821] border-blue-800/60 text-xs text-white"
              />
            </div>

            {/* Internal Service Key */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Internal Service Key *</Label>
              <Input
                placeholder="e.g. VIRTUAL_IEP_ATTENDANCE"
                value={newServiceKey}
                onChange={(e) => setNewServiceKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_"))}
                className="bg-[#000821] border-blue-800/60 text-xs text-white font-mono"
              />
              <p className="text-[10.5px] text-slate-400">
                Unique identifier matching appointment & timeline routines
              </p>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Category</Label>
              <Select
                value={newServiceCategory}
                onValueChange={(val: any) => setNewServiceCategory(val)}
              >
                <SelectTrigger className="bg-[#000821] border border-blue-800/60 text-xs text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#001035] border-blue-900/60 text-white text-xs">
                  <SelectItem value="meeting">Meeting Support</SelectItem>
                  <SelectItem value="advocacy">Direct Advocacy</SelectItem>
                  <SelectItem value="review">Records / Case Review</SelectItem>
                  <SelectItem value="document">Document Drafting</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAddServiceModalOpen(false)}
              className="border border-sky-500/25 bg-[#082043] text-blue-100 hover:bg-[#0D3A68] text-xs rounded-lg"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAddCustomService}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg cursor-pointer"
            >
              Add to Package
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
