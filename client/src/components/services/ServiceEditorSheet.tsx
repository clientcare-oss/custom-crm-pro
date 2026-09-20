import React, { useState, useEffect } from "react";
import {
  X,
  Save,
  Briefcase,
  DollarSign,
  Layers,
  Eye,
  Clock,
  CheckCircle2,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Sparkles,
  ShieldAlert,
  Archive,
  RotateCcw,
  Check,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  CatalogServiceItem,
  CatalogFolderItem,
  ServiceDeliverableItem,
  PlanEligibilityMap,
  PlanEligibilityStatus,
} from "./serviceTypes";

interface ServiceEditorSheetProps {
  open: boolean;
  onClose: () => void;
  service?: CatalogServiceItem | null;
  folders: CatalogFolderItem[];
  onSave: (data: Partial<CatalogServiceItem>) => Promise<void>;
  saving: boolean;
}

export const ServiceEditorSheet: React.FC<ServiceEditorSheetProps> = ({
  open,
  onClose,
  service,
  folders,
  onSave,
  saving,
}) => {
  const [activeTab, setActiveTab] = useState<
    "basic" | "pricing" | "plans" | "visibility" | "delivery" | "deliverables" | "priority" | "status"
  >("basic");

  // Form State
  const [internalName, setInternalName] = useState("");
  const [clientFacingTitle, setClientFacingTitle] = useState("");
  const [serviceCode, setServiceCode] = useState("");
  const [folderId, setFolderId] = useState<number | null>(null);
  const [icon, setIcon] = useState("briefcase");
  const [accentColor, setAccentColor] = useState("blue");
  const [shortDescription, setShortDescription] = useState("");
  const [fullDescription, setFullDescription] = useState("");
  const [internalInstructions, setInternalInstructions] = useState("");

  // Pricing
  const [standardPriceDollars, setStandardPriceDollars] = useState("0");
  const [billingType, setBillingType] = useState<string>("one_time");
  const [billingInterval, setBillingInterval] = useState<string>("monthly");
  const [customPriceAllowed, setCustomPriceAllowed] = useState(true);

  // Plan Eligibility
  const [planEligibility, setPlanEligibility] = useState<PlanEligibilityMap>({
    plan_55: "available_as_addon",
    plan_105: "available_as_addon",
    scholarship: "available_as_addon",
    pay_per_use: "available_as_addon",
    standalone: "available_as_addon",
  });

  // Where It Appears
  const [availableInDiscoveryCall, setAvailableInDiscoveryCall] = useState(true);
  const [availableInParentPortal, setAvailableInParentPortal] = useState(true);
  const [availableInSupportOfferPanel, setAvailableInSupportOfferPanel] = useState(true);
  const [availableAsStandalone, setAvailableAsStandalone] = useState(true);
  const [availableAsAddOn, setAvailableAsAddOn] = useState(true);

  // Delivery & Requirements
  const [deliveryTimeValue, setDeliveryTimeValue] = useState<string>("3");
  const [deliveryTimeUnit, setDeliveryTimeUnit] = useState("business_days");
  const [deliveryTimeLabel, setDeliveryTimeLabel] = useState("3 business days");
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState("");
  const [allowDocumentUpload, setAllowDocumentUpload] = useState(true);
  const [requireDocumentUpload, setRequireDocumentUpload] = useState(false);
  const [requireQuestionnaire, setRequireQuestionnaire] = useState(false);
  const [requireAgreement, setRequireAgreement] = useState(false);
  const [requirePayment, setRequirePayment] = useState(true);

  // Included Items (Deliverables)
  const [includedItems, setIncludedItems] = useState<ServiceDeliverableItem[]>([]);
  const [newDeliverableText, setNewDeliverableText] = useState("");

  // Priority Option
  const [priorityEnabled, setPriorityEnabled] = useState(false);
  const [priorityPriceDollars, setPriorityPriceDollars] = useState("");
  const [priorityDeliveryTimeLabel, setPriorityDeliveryTimeLabel] = useState("24 hours expedited");
  const [priorityDescription, setPriorityDescription] = useState("");

  // Status
  const [isActive, setIsActive] = useState(true);
  const [isArchived, setIsArchived] = useState(false);

  // Initialize or reset form when modal opens
  useEffect(() => {
    if (open) {
      if (service) {
        setInternalName(service.internalName || service.name || "");
        setClientFacingTitle(service.clientFacingTitle || service.name || "");
        setServiceCode(service.serviceCode || "");
        setFolderId(service.folderId ?? null);
        setIcon(service.icon || "briefcase");
        setAccentColor(service.accentColor || "blue");
        setShortDescription(service.shortDescription || service.description || "");
        setFullDescription(service.fullDescription || "");
        setInternalInstructions(service.internalInstructions || "");

        setStandardPriceDollars((service.standardPrice / 100).toString());
        setBillingType(service.billingType || "one_time");
        setBillingInterval(service.billingInterval || "monthly");
        setCustomPriceAllowed(service.customPriceAllowed !== false);

        // Parse plan eligibility
        try {
          if (typeof service.planEligibility === "object" && service.planEligibility !== null) {
            setPlanEligibility(service.planEligibility as PlanEligibilityMap);
          } else if (typeof service.planEligibility === "string") {
            setPlanEligibility(JSON.parse(service.planEligibility));
          }
        } catch {
          setPlanEligibility({
            plan_55: "available_as_addon",
            plan_105: "available_as_addon",
            scholarship: "available_as_addon",
            pay_per_use: "available_as_addon",
            standalone: "available_as_addon",
          });
        }

        setAvailableInDiscoveryCall(service.availableInDiscoveryCall !== false);
        setAvailableInParentPortal(service.availableInParentPortal !== false);
        setAvailableInSupportOfferPanel(service.availableInSupportOfferPanel !== false);
        setAvailableAsStandalone(service.availableAsStandalone !== false);
        setAvailableAsAddOn(service.availableAsAddOn !== false);

        setDeliveryTimeValue(service.deliveryTimeValue?.toString() || "3");
        setDeliveryTimeUnit(service.deliveryTimeUnit || "business_days");
        setDeliveryTimeLabel(service.deliveryTimeLabel || "3 business days");
        setSessionDurationMinutes(service.sessionDurationMinutes?.toString() || "");
        setAllowDocumentUpload(service.allowDocumentUpload !== false);
        setRequireDocumentUpload(service.requireDocumentUpload === true);
        setRequireQuestionnaire(service.requireQuestionnaire === true);
        setRequireAgreement(service.requireAgreement === true);
        setRequirePayment(service.requirePayment !== false);

        // Parse included items
        try {
          if (Array.isArray(service.includedItems)) {
            setIncludedItems(service.includedItems);
          } else if (typeof service.includedItems === "string") {
            setIncludedItems(JSON.parse(service.includedItems));
          } else {
            setIncludedItems([]);
          }
        } catch {
          setIncludedItems([]);
        }

        setPriorityEnabled(service.priorityEnabled === true);
        setPriorityPriceDollars(service.priorityPrice ? (service.priorityPrice / 100).toString() : "");
        setPriorityDeliveryTimeLabel(service.priorityDeliveryTimeLabel || "24 hours expedited");
        setPriorityDescription(service.priorityDescription || "");

        setIsActive(service.isActive !== false);
        setIsArchived(service.isArchived === true);
      } else {
        // Defaults for new service
        setInternalName("");
        setClientFacingTitle("");
        setServiceCode("");
        setFolderId(null);
        setIcon("briefcase");
        setAccentColor("blue");
        setShortDescription("");
        setFullDescription("");
        setInternalInstructions("");

        setStandardPriceDollars("200");
        setBillingType("one_time");
        setBillingInterval("monthly");
        setCustomPriceAllowed(true);

        setPlanEligibility({
          plan_55: "available_as_addon",
          plan_105: "available_as_addon",
          scholarship: "available_as_addon",
          pay_per_use: "available_as_addon",
          standalone: "available_as_addon",
        });

        setAvailableInDiscoveryCall(true);
        setAvailableInParentPortal(true);
        setAvailableInSupportOfferPanel(true);
        setAvailableAsStandalone(true);
        setAvailableAsAddOn(true);

        setDeliveryTimeValue("3");
        setDeliveryTimeUnit("business_days");
        setDeliveryTimeLabel("3 business days");
        setSessionDurationMinutes("");
        setAllowDocumentUpload(true);
        setRequireDocumentUpload(false);
        setRequireQuestionnaire(false);
        setRequireAgreement(false);
        setRequirePayment(true);

        setIncludedItems([
          { id: "item-1", text: "Comprehensive case review & records audit", sortOrder: 1, isActive: true },
          { id: "item-2", text: "Written findings & actionable strategy recommendations", sortOrder: 2, isActive: true },
        ]);

        setPriorityEnabled(false);
        setPriorityPriceDollars("");
        setPriorityDeliveryTimeLabel("24 hours expedited");
        setPriorityDescription("");

        setIsActive(true);
        setIsArchived(false);
      }
      setActiveTab("basic");
    }
  }, [open, service]);

  if (!open) return null;

  // Add Deliverable
  const handleAddDeliverable = () => {
    if (!newDeliverableText.trim()) return;
    const newItem: ServiceDeliverableItem = {
      id: `item-${Date.now()}`,
      text: newDeliverableText.trim(),
      sortOrder: includedItems.length + 1,
      isActive: true,
    };
    setIncludedItems([...includedItems, newItem]);
    setNewDeliverableText("");
  };

  const handleRemoveDeliverable = (id: string) => {
    setIncludedItems(includedItems.filter((item) => item.id !== id));
  };

  const handleToggleDeliverable = (id: string) => {
    setIncludedItems(
      includedItems.map((item) =>
        item.id === id ? { ...item, isActive: !item.isActive } : item
      )
    );
  };

  const handleMoveDeliverable = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= includedItems.length) return;
    const updated = [...includedItems];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setIncludedItems(updated.map((it, idx) => ({ ...it, sortOrder: idx + 1 })));
  };

  const handlePlanEligibilityChange = (planKey: keyof PlanEligibilityMap, status: PlanEligibilityStatus) => {
    setPlanEligibility({
      ...planEligibility,
      [planKey]: status,
    });
  };

  const handleSave = async () => {
    const priceCents = Math.round(parseFloat(standardPriceDollars || "0") * 100);
    const priorityPriceCents = priorityPriceDollars
      ? Math.round(parseFloat(priorityPriceDollars) * 100)
      : null;

    const payload: Partial<CatalogServiceItem> = {
      id: service?.id,
      internalName: internalName.trim() || clientFacingTitle.trim(),
      clientFacingTitle: clientFacingTitle.trim() || internalName.trim() || "Untitled Service",
      name: clientFacingTitle.trim() || internalName.trim(),
      serviceCode: serviceCode.trim() || undefined,
      folderId: folderId,
      icon,
      accentColor,
      shortDescription: shortDescription.trim() || null,
      fullDescription: fullDescription.trim() || null,
      internalInstructions: internalInstructions.trim() || null,
      standardPrice: priceCents,
      price: priceCents,
      currency: "usd",
      billingType,
      billingInterval: billingType === "recurring" ? billingInterval : null,
      customPriceAllowed,
      deliveryTimeValue: deliveryTimeValue ? parseInt(deliveryTimeValue, 10) : null,
      deliveryTimeUnit,
      deliveryTimeLabel: deliveryTimeLabel.trim() || `${deliveryTimeValue} ${deliveryTimeUnit}`,
      sessionDurationMinutes: sessionDurationMinutes ? parseInt(sessionDurationMinutes, 10) : null,
      duration: sessionDurationMinutes ? parseInt(sessionDurationMinutes, 10) : null,
      availableInDiscoveryCall,
      availableInParentPortal,
      availableInSupportOfferPanel,
      availableAsStandalone,
      availableAsAddOn,
      planEligibility,
      includedItems,
      allowDocumentUpload,
      requireDocumentUpload,
      requireQuestionnaire,
      requireAgreement,
      requirePayment,
      priorityEnabled,
      priorityPrice: priorityPriceCents,
      priorityDeliveryTimeLabel: priorityDeliveryTimeLabel.trim() || null,
      priorityDescription: priorityDescription.trim() || null,
      isActive,
      isArchived,
    };

    await onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-3xl h-full bg-[#001035] border-l border-blue-900/60 shadow-2xl flex flex-col">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-blue-900/40 bg-[#082043]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#000821] border border-blue-500/30 text-sky-400">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                {service ? "Edit Master Service" : "Add New Master Service"}
              </h2>
              <p className="text-xs text-blue-200/70">
                Authoritative Waypoint catalog library offering
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={saving}
              className="border border-sky-500/25 bg-[#082043] hover:bg-[#0D3A68] text-blue-100 text-xs rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold gap-1.5 rounded-xl shadow-md cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Service"}
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 py-2.5 bg-[#0A1A30] border-b border-blue-900/30 overflow-x-auto">
          {[
            { key: "basic", label: "Basic Info" },
            { key: "pricing", label: "Pricing" },
            { key: "plans", label: "Plan Availability" },
            { key: "visibility", label: "Where It Appears" },
            { key: "delivery", label: "Delivery & Reqs" },
            { key: "deliverables", label: "Deliverables" },
            { key: "priority", label: "Priority Option" },
            { key: "status", label: "Status & Preview" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === tab.key
                  ? "bg-blue-600 text-white font-semibold shadow-xs"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#102744]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. BASIC INFO */}
          {activeTab === "basic" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Client-Facing Title *</Label>
                  <Input
                    placeholder="e.g. State Complaint Support"
                    value={clientFacingTitle}
                    onChange={(e) => setClientFacingTitle(e.target.value)}
                    className="bg-[#082043] border-blue-900/40 text-slate-100"
                  />
                  <p className="text-[11px] text-slate-400">Displayed in Parent Portal and invoices</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Internal Name</Label>
                  <Input
                    placeholder="e.g. State Complaint Support (Internal)"
                    value={internalName}
                    onChange={(e) => setInternalName(e.target.value)}
                    className="bg-[#082043] border-blue-900/40 text-slate-100"
                  />
                  <p className="text-[11px] text-slate-400">Advocate & employee reference label</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Stable Service Code *</Label>
                  <Input
                    placeholder="e.g. state_complaint_support"
                    value={serviceCode}
                    onChange={(e) => setServiceCode(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    className="bg-[#082043] border-blue-900/40 text-slate-100 font-mono text-xs"
                  />
                  <p className="text-[11px] text-slate-400">
                    Immutable identifier used by code routines (never changes with title)
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Category / Folder</Label>
                  <Select
                    value={folderId?.toString() ?? "none"}
                    onValueChange={(val) => setFolderId(val === "none" ? null : parseInt(val, 10))}
                  >
                    <SelectTrigger className="bg-[#082043] border-blue-900/40 text-slate-100">
                      <SelectValue placeholder="Unfiled" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#082043] border-blue-900/60 text-slate-200">
                      <SelectItem value="none">Unfiled</SelectItem>
                      {folders
                        .filter((f) => !f.isArchived)
                        .map((f) => (
                          <SelectItem key={f.id} value={f.id.toString()}>
                            {f.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Short Description (Client-Facing)</Label>
                <Input
                  placeholder="Brief 1-2 sentence overview for cards and discovery summaries"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  className="bg-[#082043] border-blue-900/40 text-slate-100"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Full Description</Label>
                <Textarea
                  placeholder="Comprehensive service description, legal boundaries, and scope of assistance..."
                  rows={4}
                  value={fullDescription}
                  onChange={(e) => setFullDescription(e.target.value)}
                  className="bg-[#082043] border-blue-900/40 text-slate-100 text-sm"
                />
              </div>

              <div className="space-y-1.5 p-4 rounded-xl bg-amber-950/20 border border-amber-900/40">
                <Label className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Internal Advocate Instructions (Confidential)
                </Label>
                <Textarea
                  placeholder="Confidential notes, required intake steps, Case Compass triggers (never shown to parents)..."
                  rows={2}
                  value={internalInstructions}
                  onChange={(e) => setInternalInstructions(e.target.value)}
                  className="bg-[#000821] border border-amber-500/30 text-amber-100 text-xs"
                />
              </div>
            </div>
          )}

          {/* 2. PRICING */}
          {activeTab === "pricing" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Billing Type</Label>
                  <Select value={billingType} onValueChange={(val) => setBillingType(val)}>
                    <SelectTrigger className="bg-[#082043] border-blue-900/40 text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#082043] border-blue-900/60 text-slate-200">
                      <SelectItem value="one_time">One-Time Service</SelectItem>
                      <SelectItem value="recurring">Recurring Membership</SelectItem>
                      <SelectItem value="included">Included in Plan</SelectItem>
                      <SelectItem value="free">Free / Pro Bono</SelectItem>
                      <SelectItem value="custom">Custom Pricing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {billingType === "recurring" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">Recurring Frequency</Label>
                    <Select value={billingInterval} onValueChange={(val) => setBillingInterval(val)}>
                      <SelectTrigger className="bg-[#082043] border-blue-900/40 text-slate-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#082043] border-blue-900/60 text-slate-200">
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Standard Price ($ USD) *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <Input
                      type="number"
                      step="1"
                      placeholder="200"
                      value={standardPriceDollars}
                      onChange={(e) => setStandardPriceDollars(e.target.value)}
                      className="pl-8 bg-[#082043] border-blue-900/40 text-slate-100 font-bold text-lg"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Master catalog base price (e.g. $200 for State Complaint Support)
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-[#082043] border border-blue-900/40 self-center">
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Allow Custom Price in Offers</div>
                    <div className="text-[11px] text-slate-400">Advocates can adjust price on client-specific offers</div>
                  </div>
                  <Switch checked={customPriceAllowed} onCheckedChange={setCustomPriceAllowed} />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-900/50">
                <div className="text-xs font-semibold text-blue-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  Stripe Sync Status
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Status: <span className="font-semibold text-white">{service?.stripeSyncStatus || "Not Connected"}</span>
                </p>
                {service?.stripePriceId && (
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">Price ID: {service.stripePriceId}</p>
                )}
              </div>
            </div>
          )}

          {/* 3. PLAN AVAILABILITY */}
          {activeTab === "plans" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                Specify whether this service is included, available as an add-on, or unavailable for each membership tier:
              </p>

              {[
                { key: "plan_55" as const, label: "$55 Advocacy Only Plan" },
                { key: "plan_105" as const, label: "$105 Advocacy + State Complaints Plan" },
                { key: "scholarship" as const, label: "Scholarship Families" },
                { key: "pay_per_use" as const, label: "Pay-Per-Use Clients" },
                { key: "standalone" as const, label: "Standalone Families" },
              ].map((tier) => (
                <div
                  key={tier.key}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-[#082043] border border-sky-500/25"
                >
                  <span className="text-sm font-semibold text-white">{tier.label}</span>
                  <Select
                    value={planEligibility[tier.key] || "available_as_addon"}
                    onValueChange={(val: PlanEligibilityStatus) => handlePlanEligibilityChange(tier.key, val)}
                  >
                    <SelectTrigger className="w-44 bg-[#000821] border border-sky-500/30 text-white text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#001035] border border-sky-500/30 text-blue-100 text-xs shadow-2xl">
                      <SelectItem value="included">Included</SelectItem>
                      <SelectItem value="available_as_addon">Available as Add-On</SelectItem>
                      <SelectItem value="unavailable">Unavailable</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}

          {/* 4. WHERE IT APPEARS */}
          {activeTab === "visibility" && (
            <div className="space-y-3">
              {[
                {
                  label: "Discovery Call Console (PG-003-DC)",
                  desc: "Visible in live discovery call recommendations and package selections",
                  checked: availableInDiscoveryCall,
                  setter: setAvailableInDiscoveryCall,
                },
                {
                  label: "Parent Portal (PG-023)",
                  desc: "Visible to client parents in their dashboard self-serve support catalog",
                  checked: availableInParentPortal,
                  setter: setAvailableInParentPortal,
                },
                {
                  label: "Student Workspace Offer Panel (PG-030)",
                  desc: "Available for advocates to select and customize in the Client Journey drawer",
                  checked: availableInSupportOfferPanel,
                  setter: setAvailableInSupportOfferPanel,
                },
                {
                  label: "Standalone Purchase",
                  desc: "Available to purchase without an active monthly advocacy membership",
                  checked: availableAsStandalone,
                  setter: setAvailableAsStandalone,
                },
                {
                  label: "Available as Add-On",
                  desc: "Display under Add-On services filter and client upgrade suggestions",
                  checked: availableAsAddOn,
                  setter: setAvailableAsAddOn,
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 rounded-xl bg-[#082043] border border-blue-900/40"
                >
                  <div className="pr-4">
                    <div className="text-sm font-semibold text-slate-100">{item.label}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{item.desc}</div>
                  </div>
                  <Switch checked={item.checked} onCheckedChange={item.setter} />
                </div>
              ))}
            </div>
          )}

          {/* 5. DELIVERY & REQUIREMENTS */}
          {activeTab === "delivery" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Turnaround Time Label</Label>
                  <Input
                    placeholder="e.g. 5 business days"
                    value={deliveryTimeLabel}
                    onChange={(e) => setDeliveryTimeLabel(e.target.value)}
                    className="bg-[#082043] border-blue-900/40 text-slate-100 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Meeting / Session Duration (Minutes)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 60 or 120 (leave blank for document services)"
                    value={sessionDurationMinutes}
                    onChange={(e) => setSessionDurationMinutes(e.target.value)}
                    className="bg-[#082043] border-blue-900/40 text-slate-100 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#082043] border border-blue-900/40">
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Allow Document Upload</div>
                    <div className="text-[11px] text-slate-400">Parents can upload IEP, evaluations, and school records</div>
                  </div>
                  <Switch checked={allowDocumentUpload} onCheckedChange={setAllowDocumentUpload} />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#082043] border border-blue-900/40">
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Require Document Upload</div>
                    <div className="text-[11px] text-slate-400">Parent must upload documents before advocacy begins</div>
                  </div>
                  <Switch checked={requireDocumentUpload} onCheckedChange={setRequireDocumentUpload} />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#082043] border border-blue-900/40">
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Require Payment</div>
                    <div className="text-[11px] text-slate-400">Invoice or Stripe card checkout required prior to delivery</div>
                  </div>
                  <Switch checked={requirePayment} onCheckedChange={setRequirePayment} />
                </div>
              </div>
            </div>
          )}

          {/* 6. WHAT IS INCLUDED (DELIVERABLES) */}
          {activeTab === "deliverables" && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add an included deliverable (e.g. Drafting of formal state complaint)..."
                  value={newDeliverableText}
                  onChange={(e) => setNewDeliverableText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddDeliverable();
                    }
                  }}
                  className="bg-[#082043] border-blue-900/40 text-slate-100 text-sm"
                />
                <Button
                  type="button"
                  onClick={handleAddDeliverable}
                  className="bg-blue-600 hover:bg-blue-500 text-white shrink-0 rounded-xl"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>

              <div className="space-y-2">
                {includedItems.map((item, index) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      item.isActive
                        ? "bg-[#082043] border-sky-500/25 text-blue-100"
                        : "bg-[#000821] border-blue-900/40 text-blue-400/50 line-through"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-3">
                      <button
                        type="button"
                        onClick={() => handleToggleDeliverable(item.id)}
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors cursor-pointer ${
                          item.isActive
                            ? "bg-blue-600 border-blue-500 text-white"
                            : "border-slate-700 bg-slate-900 text-transparent"
                        }`}
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <span className="text-xs sm:text-sm truncate">{item.text}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveDeliverable(index, "up")}
                        disabled={index === 0}
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                        title="Move up"
                      >
                        <MoveUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveDeliverable(index, "down")}
                        disabled={index === includedItems.length - 1}
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                        title="Move down"
                      >
                        <MoveDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveDeliverable(item.id)}
                        className="p-1 text-rose-400 hover:text-rose-300 cursor-pointer ml-1"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {includedItems.length === 0 && (
                  <div className="text-center py-8 border border-dashed border-blue-900/40 rounded-xl text-slate-500 text-xs">
                    No deliverables defined yet. Add the specific services and items included for families.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 7. PRIORITY OPTION */}
          {activeTab === "priority" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-[#082043] border border-blue-900/40">
                <div>
                  <div className="text-sm font-semibold text-slate-100">Enable Expedited Priority Service</div>
                  <div className="text-xs text-slate-400">Offer families urgent turnaround for an additional fee</div>
                </div>
                <Switch checked={priorityEnabled} onCheckedChange={setPriorityEnabled} />
              </div>

              {priorityEnabled && (
                <div className="space-y-4 p-4 rounded-xl bg-amber-950/20 border border-amber-900/40 animate-in fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-amber-300">Priority Fee ($ USD)</Label>
                      <Input
                        type="number"
                        placeholder="e.g. 100"
                        value={priorityPriceDollars}
                        onChange={(e) => setPriorityPriceDollars(e.target.value)}
                        className="bg-[#000821] border border-amber-500/30 text-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-amber-300">Expedited Turnaround Label</Label>
                      <Input
                        placeholder="e.g. 24 hours expedited"
                        value={priorityDeliveryTimeLabel}
                        onChange={(e) => setPriorityDeliveryTimeLabel(e.target.value)}
                        className="bg-[#000821] border border-amber-500/30 text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-amber-300">Priority Scope Description</Label>
                    <Input
                      placeholder="e.g. Immediate priority queueing and direct review within 24 hours"
                      value={priorityDescription}
                      onChange={(e) => setPriorityDescription(e.target.value)}
                      className="bg-[#000821] border border-amber-500/30 text-white"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 8. STATUS & LIVE CLIENT PREVIEW */}
          {activeTab === "status" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-xl bg-[#082043] border border-blue-900/40">
                <div>
                  <div className="text-sm font-semibold text-slate-100">Service Active Status</div>
                  <div className="text-xs text-slate-400">Active services are available for selection in offers and portal</div>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>

              {/* LIVE CLIENT PREVIEW */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Live Client Offer Preview
                </Label>
                <div className="p-5 rounded-2xl bg-[#082043] border border-blue-800/40 shadow-xl space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-base font-bold text-white">
                        {clientFacingTitle || "Service Title Preview"}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {deliveryTimeLabel || "Standard delivery"}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-extrabold text-blue-400">
                        ${parseFloat(standardPriceDollars || "0").toLocaleString()}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {billingType === "recurring" ? `per ${billingInterval}` : "one-time"}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {shortDescription || "Short description will appear here for parents to review before accepting."}
                  </p>

                  {includedItems.filter((it) => it.isActive).length > 0 && (
                    <div className="pt-2 border-t border-blue-900/40 space-y-1.5">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Included Deliverables:
                      </div>
                      {includedItems
                        .filter((it) => it.isActive)
                        .map((it) => (
                          <div key={it.id} className="flex items-center gap-2 text-xs text-slate-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{it.text}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
