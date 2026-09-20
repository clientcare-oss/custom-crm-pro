import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Settings,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Check,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  Calendar,
  Send,
  Save,
  Eye,
  ShieldCheck,
  FileText,
  Zap,
  Info,
  ExternalLink,
  Lock,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// ── Fallback Waypoint Services Catalog ─────────────────────────────────────────
const FALLBACK_SERVICES = [
  {
    id: 101,
    name: "IEP Document Review & Strategy Session",
    description:
      "Comprehensive analysis of your student's draft IEP, identification of missing accommodations, behavioral needs review, and a 60-minute strategy prep session with written recommendations.",
    price: 75000, // cents ($750)
    deliveryTime: "3 business days",
    includedItems: [
      "Full IEP audit and accommodation review",
      "Identification of goal measurable criteria gaps",
      "60-minute virtual strategy prep call",
      "Written advocate amendment recommendations",
    ],
  },
  {
    id: 102,
    name: "Advocacy Only Membership ($55/mo)",
    description:
      "Year-round special education IEP advocacy representation, IEP meeting strategy & attendance, document & evaluation review, and direct advocate communications.",
    price: 5500, // cents ($55/mo)
    deliveryTime: "24 hours",
    includedItems: [
      "Live advocate attendance at all IEP/504 meetings",
      "Ongoing document & progress monitoring",
      "Priority messaging with Byron Honea",
      "School correspondence templates & review",
    ],
  },
  {
    id: 103,
    name: "BIP / FBA Deep-Dive Audit",
    description:
      "Targeted behavioral intervention plan analysis, function-of-behavior audit, crisis plan compliance check, and positive reinforcement protocol development.",
    price: 35000, // cents ($350)
    deliveryTime: "3 business days",
    includedItems: [
      "Functional Behavior Assessment (FBA) validity review",
      "Behavior Intervention Plan (BIP) deficiency analysis",
      "Replacement behavior strategy recommendations",
      "Direct consultation with family",
    ],
  },
  {
    id: 104,
    name: "Single-Use State Complaint",
    description:
      "Standalone single-use Georgia IDEA State Complaint Builder, formal legal drafting, citation indexing, systemic violation narrative, evidence exhibit preparation, and filing support.",
    price: 125000, // cents ($1,250)
    deliveryTime: "7 business days",
    includedItems: [
      "Full procedural violation audit",
      "GaDOE State Complaint drafting & legal citations",
      "Organized exhibit binder preparation",
      "Filing guidance and state investigator prep",
    ],
  },
  {
    id: 105,
    name: "Full IEP Representation Package",
    description:
      "End-to-end IEP coaching, record analysis, strategy agendas, and live advocate attendance at all school meetings.",
    price: 185000, // cents ($1,850)
    deliveryTime: "5 business days",
    includedItems: [
      "All historical school records review",
      "Custom meeting agenda & parent concerns letter",
      "Live advocate attendance at full IEP meeting",
      "Post-meeting Prior Written Notice (PWN) review",
    ],
  },
];

interface SupportOfferPanelProps {
  contact: any;
  parentContact?: any;
  onTimelineRefresh?: () => void;
}

export default function SupportOfferPanel({
  contact,
  parentContact,
  onTimelineRefresh,
}: SupportOfferPanelProps) {
  // Expansion state
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showCollapseWarning, setShowCollapseWarning] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);

  // Parent & Student Names
  const studentName =
    contact?.name ||
    [contact?.firstName, contact?.lastName].filter(Boolean).join(" ") ||
    "Student";
  const parentName =
    parentContact?.name ||
    [parentContact?.firstName, parentContact?.lastName].filter(Boolean).join(" ") ||
    "Parent";

  // Form State
  const [offerId, setOfferId] = useState<number | undefined>(undefined);
  const [sourceType, setSourceType] = useState<"library" | "custom">("library");
  const [sourceServiceId, setSourceServiceId] = useState<number | null>(null);
  const [selectedServiceSearch, setSelectedServiceSearch] = useState("");
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);

  // Editable Offer Details
  const [title, setTitle] = useState("IEP Document Review & Strategy Session");
  const [description, setDescription] = useState(
    "Comprehensive analysis of your student's draft IEP, identification of missing accommodations, behavioral needs review, and a 60-minute strategy prep session with written recommendations."
  );
  const [priceDollars, setPriceDollars] = useState<string>("750.00");
  const [deliveryTimePreset, setDeliveryTimePreset] = useState("3 business days");
  const [customDeliveryTime, setCustomDeliveryTime] = useState("");
  const [includedItems, setIncludedItems] = useState<string[]>([
    "Full IEP audit and accommodation review",
    "Identification of goal measurable criteria gaps",
    "60-minute virtual strategy prep call",
    "Written advocate amendment recommendations",
  ]);
  const [newItemText, setNewItemText] = useState("");
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [editingItemText, setEditingItemText] = useState("");

  const [planEligibility, setPlanEligibility] = useState("one-time add-on");
  const [planWarningAcknowledged, setPlanWarningAcknowledged] = useState(false);
  const [personalNote, setPersonalNote] = useState("");
  const [expirationPreset, setExpirationPreset] = useState("14 days");
  const [customExpirationDate, setCustomExpirationDate] = useState("");

  // Toggles
  const [allowDocumentUpload, setAllowDocumentUpload] = useState(true);
  const [requirePayment, setRequirePayment] = useState(true);
  const [priorityEnabled, setPriorityEnabled] = useState(false);
  const [priorityPriceDollars, setPriorityPriceDollars] = useState("150.00");
  const [priorityDeliveryTime, setPriorityDeliveryTime] = useState("24 hours");
  const [priorityDescription, setPriorityDescription] = useState(
    "Expedited rush turnaround within 24 hours & immediate advocate assignment."
  );

  // Interactive Live Preview Choice
  const [previewSelectedPriority, setPreviewSelectedPriority] = useState(false);

  // tRPC Utilities
  const utils = trpc.useUtils();
  const { data: servicesData } = trpc.services.publicCatalog.useQuery(undefined, {
    staleTime: 60_000,
  });

  const availableServices = useMemo(() => {
    if (servicesData?.services && servicesData.services.length > 0) {
      return servicesData.services.map((s: any) => ({
        id: s.id,
        name: s.name,
        description: s.description || "",
        price: s.price || 0,
        deliveryTime: s.duration ? `${s.duration} min` : "3 business days",
        includedItems: [
          "Direct Master IEP Coach® representation",
          "Written case analysis & action plan",
          "Confidential documentation review",
        ],
      }));
    }
    return FALLBACK_SERVICES;
  }, [servicesData]);

  // Load existing draft for this student if any
  const { data: studentOffers = [] } = trpc.supportOffers.listForStudent.useQuery(
    { studentId: contact.id },
    { enabled: !!contact.id }
  );

  const activeDraft = useMemo(() => {
    return studentOffers.find((o) => o.status === "draft");
  }, [studentOffers]);

  // If a draft exists and we haven't loaded it yet, populate
  useEffect(() => {
    if (activeDraft && !offerId) {
      setOfferId(activeDraft.id);
      setTitle(activeDraft.title);
      setDescription(activeDraft.description);
      setPriceDollars((activeDraft.price / 100).toFixed(2));
      setDeliveryTimePreset(activeDraft.deliveryTime || "3 business days");
      if (activeDraft.includedItems) {
        try {
          const parsed = JSON.parse(activeDraft.includedItems);
          if (Array.isArray(parsed)) setIncludedItems(parsed);
        } catch {
          // ignore
        }
      }
      setPlanEligibility(activeDraft.planEligibility || "one-time add-on");
      setPersonalNote(activeDraft.personalNote || "");
      setAllowDocumentUpload(activeDraft.allowDocumentUpload);
      setRequirePayment(activeDraft.requirePayment);
      setPriorityEnabled(activeDraft.priorityEnabled);
      if (activeDraft.priorityPrice) {
        setPriorityPriceDollars((activeDraft.priorityPrice / 100).toFixed(2));
      }
      if (activeDraft.priorityDeliveryTime) {
        setPriorityDeliveryTime(activeDraft.priorityDeliveryTime);
      }
      if (activeDraft.priorityDescription) {
        setPriorityDescription(activeDraft.priorityDescription);
      }
      setSourceType(activeDraft.sourceType as any);
      setSourceServiceId(activeDraft.sourceServiceId || null);
    }
  }, [activeDraft, offerId]);

  // Track changes to mark unsaved
  const markDirty = () => setHasUnsavedChanges(true);

  // Select a service from the library snapshot
  const handleSelectService = (service: any) => {
    setTitle(service.name);
    setDescription(service.description);
    setPriceDollars((service.price / 100).toFixed(2));
    setDeliveryTimePreset(service.deliveryTime);
    setCustomDeliveryTime("");
    setIncludedItems(
      service.includedItems || [
        "Direct advocate support",
        "Document review & strategy",
      ]
    );
    setSourceType("library");
    setSourceServiceId(service.id);
    setIsServiceDropdownOpen(false);
    setSelectedServiceSearch("");
    markDirty();
    toast.success(`Copied snapshot from ${service.name}`);
  };

  // Switch to Custom Offer
  const handleCreateCustomOffer = () => {
    setTitle("");
    setDescription("");
    setPriceDollars("0.00");
    setDeliveryTimePreset("3 business days");
    setCustomDeliveryTime("");
    setIncludedItems([]);
    setSourceType("custom");
    setSourceServiceId(null);
    setIsServiceDropdownOpen(false);
    markDirty();
    toast.info("Custom offer initialized. Enter details below.");
  };

  // Add Item to Checklist
  const handleAddIncludedItem = () => {
    if (!newItemText.trim()) return;
    setIncludedItems((prev) => [...prev, newItemText.trim()]);
    setNewItemText("");
    markDirty();
  };

  // Remove Item
  const handleRemoveIncludedItem = (index: number) => {
    setIncludedItems((prev) => prev.filter((_, i) => i !== index));
    markDirty();
  };

  // Move Item Up / Down
  const handleMoveItem = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === includedItems.length - 1)
    ) {
      return;
    }
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const updated = [...includedItems];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setIncludedItems(updated);
    markDirty();
  };

  // Save Edit of Checklist Item
  const handleSaveItemEdit = (index: number) => {
    if (!editingItemText.trim()) return;
    setIncludedItems((prev) => {
      const next = [...prev];
      next[index] = editingItemText.trim();
      return next;
    });
    setEditingItemIndex(null);
    setEditingItemText("");
    markDirty();
  };

  // Calculate actual expiration date string
  const calculatedExpiresAt = useMemo(() => {
    if (expirationPreset === "No expiration") return null;
    if (expirationPreset === "Custom date") {
      return customExpirationDate || null;
    }
    const days = parseInt(expirationPreset, 10);
    if (isNaN(days)) return null;
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString();
  }, [expirationPreset, customExpirationDate]);

  // Parse price cents safely
  const parsedPriceCents = useMemo(() => {
    const val = parseFloat(priceDollars);
    if (isNaN(val) || val < 0) return 0;
    return Math.round(val * 100);
  }, [priceDollars]);

  const parsedPriorityPriceCents = useMemo(() => {
    const val = parseFloat(priorityPriceDollars);
    if (isNaN(val) || val < 0) return 0;
    return Math.round(val * 100);
  }, [priorityPriceDollars]);

  const finalDeliveryTime =
    deliveryTimePreset === "Custom timeframe"
      ? customDeliveryTime.trim() || "3 business days"
      : deliveryTimePreset;

  // Mutations
  const saveDraftMutation = trpc.supportOffers.saveDraft.useMutation({
    onSuccess: (offer) => {
      setOfferId(offer.id);
      setHasUnsavedChanges(false);
      utils.supportOffers.listForStudent.invalidate({ studentId: contact.id });
      utils.caseActivity.list.invalidate();
      onTimelineRefresh?.();
      toast.success("Draft offer saved successfully. Invisible to family.");
    },
    onError: (err) => {
      toast.error(`Failed to save draft: ${err.message}`);
    },
  });

  const sendOfferMutation = trpc.supportOffers.sendOffer.useMutation({
    onSuccess: () => {
      setHasUnsavedChanges(false);
      setShowSendModal(false);
      utils.supportOffers.listForStudent.invalidate({ studentId: contact.id });
      utils.caseActivity.list.invalidate();
      onTimelineRefresh?.();
      toast.success("Offer sent to the client’s portal.");
    },
    onError: (err) => {
      toast.error(`Failed to send offer: ${err.message}`);
    },
  });

  // Handle Save Draft
  const handleSaveDraft = async () => {
    if (!title.trim()) {
      toast.error("Please provide an Offer Title before saving.");
      return;
    }
    await saveDraftMutation.mutateAsync({
      id: offerId,
      studentId: contact.id,
      familyId: contact.familyId || null,
      parentContactId: contact.parentContactId || null,
      sourceType,
      sourceServiceId,
      title: title.trim(),
      description: description.trim() || "Recommended advocacy support.",
      price: parsedPriceCents,
      currency: "usd",
      deliveryTime: finalDeliveryTime,
      includedItems,
      planEligibility,
      personalNote: personalNote.trim() || null,
      allowDocumentUpload,
      requirePayment,
      priorityEnabled,
      priorityPrice: priorityEnabled ? parsedPriorityPriceCents : null,
      priorityDeliveryTime: priorityEnabled ? priorityDeliveryTime : null,
      priorityDescription: priorityEnabled ? priorityDescription : null,
      expiresAt: calculatedExpiresAt,
    });
  };

  // Handle Initiate Send
  const handleInitiateSend = () => {
    if (!title.trim()) {
      toast.error("Offer Title is required.");
      return;
    }
    if (!description.trim()) {
      toast.error("Client-Facing Description is required.");
      return;
    }
    if (
      planEligibility === "Included in current plan" &&
      parsedPriceCents > 0 &&
      !planWarningAcknowledged
    ) {
      toast.error(
        "Please acknowledge the plan inclusion warning before sending a paid offer."
      );
      return;
    }
    setShowSendModal(true);
  };

  // Confirm Send
  const handleConfirmSend = async () => {
    try {
      // If offer has not been saved yet or has unsaved edits, save draft first
      let currentOfferId = offerId;
      if (!currentOfferId || hasUnsavedChanges) {
        const saved = await saveDraftMutation.mutateAsync({
          id: offerId,
          studentId: contact.id,
          familyId: contact.familyId || null,
          parentContactId: contact.parentContactId || null,
          sourceType,
          sourceServiceId,
          title: title.trim(),
          description: description.trim(),
          price: parsedPriceCents,
          currency: "usd",
          deliveryTime: finalDeliveryTime,
          includedItems,
          planEligibility,
          personalNote: personalNote.trim() || null,
          allowDocumentUpload,
          requirePayment,
          priorityEnabled,
          priorityPrice: priorityEnabled ? parsedPriorityPriceCents : null,
          priorityDeliveryTime: priorityEnabled ? priorityDeliveryTime : null,
          priorityDescription: priorityEnabled ? priorityDescription : null,
          expiresAt: calculatedExpiresAt,
        });
        currentOfferId = saved.id;
      }

      await sendOfferMutation.mutateAsync({ id: currentOfferId });
    } catch (err: any) {
      toast.error(`Error sending offer: ${err.message}`);
    }
  };

  // Toggle Collapse with Warning
  const handleTogglePanel = () => {
    if (isExpanded && hasUnsavedChanges) {
      setShowCollapseWarning(true);
      return;
    }
    setIsExpanded((prev) => !prev);
  };

  // Confirm Collapse despite unsaved changes
  const handleConfirmCollapse = () => {
    setShowCollapseWarning(false);
    setIsExpanded(false);
  };

  // Filter services for dropdown
  const filteredServices = availableServices.filter((s: any) =>
    s.name.toLowerCase().includes(selectedServiceSearch.toLowerCase())
  );

  return (
    <div className="relative w-full">
      {/* ── COLLAPSED TRIGGER TAB (Peeks from underneath Client Journey bottom-left) ── */}
      {!isExpanded && (
        <div className="flex justify-start -mt-2.5 px-4 mb-3 z-10 relative">
          <button
            type="button"
            onClick={handleTogglePanel}
            aria-expanded={false}
            className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-b-lg border-t-0 border border-[#1e3a5f] bg-[#0B1D35] hover:bg-[#102744] text-slate-200 hover:text-white shadow-lg transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Offer Additional Support</span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      )}

      {/* ── EXPANDABLE PANEL (Smooth vertical accordion slide-down) ── */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out motion-reduce:transition-none ${
          isExpanded ? "max-h-[3800px] opacity-100 my-4" : "max-h-0 opacity-0 my-0 pointer-events-none"
        }`}
      >
        <div className="rounded-xl border border-[#1b3558] bg-[#0B1D35] shadow-2xl p-5 sm:p-7 space-y-7 text-slate-100">
          {/* ── PANEL HEADER ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#18314f]">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-400/30 flex items-center justify-center text-blue-400">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-wide">
                    Offer Additional Support
                  </h2>
                  <p className="text-xs text-slate-400">
                    Create a single-use or custom offer for this client.
                  </p>
                </div>
              </div>
            </div>

            {/* Recipient Badge */}
            <div className="flex items-center gap-2 self-start sm:self-auto bg-[#07162B] border border-[#1e3a5f] px-3.5 py-1.5 rounded-full text-xs">
              <span className="text-slate-400">Recipient:</span>
              <span className="font-semibold text-white">
                {parentName} • {studentName}
              </span>
            </div>
          </div>

          {/* ── SECTION 1: CHOOSE SUPPORT ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Section 1: Choose Support
                </h3>
                <p className="text-xs text-slate-400">
                  Pulled from your Services library
                </p>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href="/services"
                  className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  title="View Services catalog"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Manage Services</span>
                </a>

                <button
                  type="button"
                  onClick={handleCreateCustomOffer}
                  className="px-3 py-1 text-xs font-semibold rounded-md border border-slate-700 bg-[#102744] hover:bg-[#16355d] text-slate-200 transition-colors"
                >
                  Create Custom Offer
                </button>
              </div>
            </div>

            {/* Searchable Service Selector Dropdown */}
            <div className="relative">
              <div
                onClick={() => setIsServiceDropdownOpen(!isServiceDropdownOpen)}
                className="w-full bg-[#07162B] border border-[#1e3a5f] hover:border-blue-500/50 rounded-lg p-3 cursor-pointer flex items-center justify-between text-sm transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white truncate">
                    {sourceType === "custom"
                      ? "Custom One-Time Offer (Not linked to library)"
                      : title || "Select a service from library..."}
                  </p>
                  {sourceType === "library" && (
                    <p className="text-xs text-slate-400 truncate">
                      ${priceDollars} • {deliveryTimePreset}
                    </p>
                  )}
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
              </div>

              {isServiceDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 z-30 bg-[#07162B] border border-[#1e3a5f] rounded-lg shadow-2xl p-2 space-y-2">
                  <input
                    type="text"
                    placeholder="Search services..."
                    value={selectedServiceSearch}
                    onChange={(e) => setSelectedServiceSearch(e.target.value)}
                    className="w-full bg-[#0B1D35] border border-slate-700 rounded px-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-400"
                    autoFocus
                  />

                  <div className="max-h-56 overflow-y-auto space-y-1">
                    {filteredServices.map((service: any) => (
                      <div
                        key={service.id}
                        onClick={() => handleSelectService(service)}
                        className="p-2.5 rounded-md hover:bg-[#102744] cursor-pointer transition-colors flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-white truncate">
                            {service.name}
                          </p>
                          <p className="text-slate-400 text-[11px] truncate">
                            {service.description}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-amber-300">
                            ${(service.price / 100).toFixed(2)}
                          </span>
                          <p className="text-[10px] text-slate-400">
                            {service.deliveryTime}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── SECTION 2: CUSTOMIZE OFFER ── */}
          <div className="space-y-5 pt-4 border-t border-[#18314f]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Section 2: Customize Offer
                </h3>
                <p className="text-xs text-slate-400 italic">
                  Changes here apply only to this client’s offer and will not change the Services library.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Offer Title */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                  <span>Offer Title</span>
                  <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    markDirty();
                  }}
                  placeholder="e.g. IEP Document Review & Strategy Session"
                  className="w-full bg-[#07162B] border border-[#1e3a5f] rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-400"
                />
              </div>

              {/* Client-Facing Description */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                  <span>Client-Facing Description</span>
                  <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    markDirty();
                  }}
                  placeholder="Explain what the client will receive and how it benefits their student..."
                  className="w-full bg-[#07162B] border border-[#1e3a5f] rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-400 leading-relaxed"
                />
              </div>

              {/* Price (USD) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Price (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={priceDollars}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (parseFloat(val) < 0) return;
                      setPriceDollars(val);
                      markDirty();
                    }}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3.5 py-2 bg-[#07162B] border border-[#1e3a5f] rounded-lg text-sm text-white font-mono focus:outline-none focus:border-blue-400"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  All employees may change price. Allows $0 for complimentary support.
                </p>
              </div>

              {/* Delivery Time */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Delivery Time
                </label>
                <select
                  value={deliveryTimePreset}
                  onChange={(e) => {
                    setDeliveryTimePreset(e.target.value);
                    markDirty();
                  }}
                  className="w-full bg-[#07162B] border border-[#1e3a5f] rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-400"
                >
                  <option value="24 hours">24 hours</option>
                  <option value="48 hours">48 hours</option>
                  <option value="3 business days">3 business days</option>
                  <option value="5 business days">5 business days</option>
                  <option value="7 business days">7 business days</option>
                  <option value="Custom timeframe">Custom timeframe</option>
                </select>

                {deliveryTimePreset === "Custom timeframe" && (
                  <input
                    type="text"
                    value={customDeliveryTime}
                    onChange={(e) => {
                      setCustomDeliveryTime(e.target.value);
                      markDirty();
                    }}
                    placeholder="e.g. 10 business days, Before Nov 15th"
                    className="w-full mt-1.5 bg-[#07162B] border border-[#1e3a5f] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-400"
                  />
                )}
              </div>

              {/* What's Included (Reorderable / Editable Checklist) */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-semibold text-slate-300">
                  What’s Included
                </label>
                <div className="space-y-1.5">
                  {includedItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 rounded-lg bg-[#07162B] border border-[#18314f]"
                    >
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveItem(idx, "up")}
                          className="text-slate-500 hover:text-slate-200 disabled:opacity-30"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === includedItems.length - 1}
                          onClick={() => handleMoveItem(idx, "down")}
                          className="text-slate-500 hover:text-slate-200 disabled:opacity-30"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>

                      {editingItemIndex === idx ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={editingItemText}
                            onChange={(e) => setEditingItemText(e.target.value)}
                            className="flex-1 bg-[#0B1D35] border border-blue-400 rounded px-2 py-1 text-xs text-white focus:outline-none"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveItemEdit(idx)}
                            className="px-2 py-1 text-xs bg-blue-600 rounded text-white"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <span
                          onClick={() => {
                            setEditingItemIndex(idx);
                            setEditingItemText(item);
                          }}
                          className="flex-1 text-xs text-slate-200 cursor-pointer hover:text-white"
                          title="Click to edit"
                        >
                          • {item}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveIncludedItem(idx)}
                        className="text-slate-400 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Add item bar */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Add an included deliverable or benefit..."
                      value={newItemText}
                      onChange={(e) => setNewItemText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddIncludedItem();
                        }
                      }}
                      className="flex-1 bg-[#07162B] border border-[#1e3a5f] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400"
                    />
                    <button
                      type="button"
                      onClick={handleAddIncludedItem}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#102744] hover:bg-[#183a66] text-blue-300 border border-blue-500/30 flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Item
                    </button>
                  </div>
                </div>
              </div>

              {/* Plan Eligibility */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Plan Eligibility
                </label>
                <select
                  value={planEligibility}
                  onChange={(e) => {
                    setPlanEligibility(e.target.value);
                    markDirty();
                  }}
                  className="w-full bg-[#07162B] border border-[#1e3a5f] rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-400"
                >
                  <option value="one-time add-on">One-time add-on</option>
                  <option value="Included in current plan">Included in current plan</option>
                  <option value="Pay-per-use service">Pay-per-use service</option>
                  <option value="Custom">Custom</option>
                  <option value="No charge">No charge</option>
                </select>

                {/* Plan warning banner */}
                {planEligibility === "Included in current plan" && parsedPriceCents > 0 && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2 mt-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <p className="leading-snug">
                        <strong>Warning:</strong> This service may already be included in the client’s current plan. Please confirm before sending a paid offer.
                      </p>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer text-[11px] text-amber-100 font-medium">
                      <input
                        type="checkbox"
                        checked={planWarningAcknowledged}
                        onChange={(e) => setPlanWarningAcknowledged(e.target.checked)}
                        className="rounded border-amber-400 text-amber-500 focus:ring-0"
                      />
                      <span>I confirm sending this paid offer despite existing plan coverage.</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Offer Expiration */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Offer Expiration
                </label>
                <select
                  value={expirationPreset}
                  onChange={(e) => {
                    setExpirationPreset(e.target.value);
                    markDirty();
                  }}
                  className="w-full bg-[#07162B] border border-[#1e3a5f] rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-400"
                >
                  <option value="No expiration">No expiration</option>
                  <option value="3 days">3 days</option>
                  <option value="7 days">7 days</option>
                  <option value="14 days">14 days</option>
                  <option value="30 days">30 days</option>
                  <option value="Custom date">Custom date</option>
                </select>

                {expirationPreset === "Custom date" && (
                  <input
                    type="date"
                    value={customExpirationDate}
                    onChange={(e) => {
                      setCustomExpirationDate(e.target.value);
                      markDirty();
                    }}
                    className="w-full mt-1.5 bg-[#07162B] border border-[#1e3a5f] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-400"
                  />
                )}
              </div>

              {/* Personal Note to Family */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-slate-300">
                  Personal Note to Family (Optional)
                </label>
                <textarea
                  rows={2}
                  value={personalNote}
                  onChange={(e) => {
                    setPersonalNote(e.target.value);
                    markDirty();
                  }}
                  placeholder="Add a message for this family..."
                  className="w-full bg-[#07162B] border border-[#1e3a5f] rounded-lg px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 leading-relaxed"
                />
              </div>
            </div>

            {/* Offer Controls (Toggles) */}
            <div className="p-4 rounded-xl bg-[#07162B] border border-[#18314f] space-y-4">
              <p className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                Offer Controls
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Allow Document Upload */}
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowDocumentUpload}
                    onChange={(e) => {
                      setAllowDocumentUpload(e.target.checked);
                      markDirty();
                    }}
                    className="rounded border-slate-600 text-blue-500 focus:ring-0"
                  />
                  <div>
                    <span className="text-xs font-semibold text-white">
                      Allow Document Upload
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Client may upload records after accepting.
                    </p>
                  </div>
                </label>

                {/* Require Payment */}
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requirePayment}
                    onChange={(e) => {
                      setRequirePayment(e.target.checked);
                      markDirty();
                    }}
                    className="rounded border-slate-600 text-blue-500 focus:ring-0"
                  />
                  <div>
                    <span className="text-xs font-semibold text-white">
                      Require Payment
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Payment must succeed before activation.
                    </p>
                  </div>
                </label>

                {/* Add Priority Option */}
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={priorityEnabled}
                    onChange={(e) => {
                      setPriorityEnabled(e.target.checked);
                      markDirty();
                    }}
                    className="rounded border-slate-600 text-blue-500 focus:ring-0"
                  />
                  <div>
                    <span className="text-xs font-semibold text-white">
                      Add Priority Option
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Offer expedited turnaround option.
                    </p>
                  </div>
                </label>
              </div>

              {/* Priority Option Fields */}
              {priorityEnabled && (
                <div className="p-3.5 rounded-lg bg-[#0B1D35] border border-blue-500/30 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-300">
                      Priority Price (USD)
                    </label>
                    <div className="relative mt-1">
                      <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={priorityPriceDollars}
                        onChange={(e) => {
                          setPriorityPriceDollars(e.target.value);
                          markDirty();
                        }}
                        className="w-full pl-7 pr-2 py-1.5 bg-[#07162B] border border-slate-700 rounded text-xs text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-300">
                      Priority Delivery Time
                    </label>
                    <input
                      type="text"
                      value={priorityDeliveryTime}
                      onChange={(e) => {
                        setPriorityDeliveryTime(e.target.value);
                        markDirty();
                      }}
                      className="w-full mt-1 px-2.5 py-1.5 bg-[#07162B] border border-slate-700 rounded text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-300">
                      Priority Description
                    </label>
                    <input
                      type="text"
                      value={priorityDescription}
                      onChange={(e) => {
                        setPriorityDescription(e.target.value);
                        markDirty();
                      }}
                      className="w-full mt-1 px-2.5 py-1.5 bg-[#07162B] border border-slate-700 rounded text-xs text-white"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── SECTION 3: PARENT PORTAL PREVIEW ── */}
          <div className="space-y-3 pt-4 border-t border-[#18314f]">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-400" />
                <span>Section 3: Parent Portal Live Preview</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                Updates dynamically with your changes
              </span>
            </div>

            {/* Live Card Container */}
            <div className="rounded-2xl border-2 border-[#1e3a5f] bg-[#07162B] p-6 shadow-2xl relative overflow-hidden">
              {/* Recommended by Waypoint Badge */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/15 border border-amber-400/40 text-amber-300 shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Recommended by Waypoint</span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>
                    Est. Turnaround:{" "}
                    <strong className="text-white">
                      {previewSelectedPriority && priorityEnabled
                        ? priorityDeliveryTime
                        : finalDeliveryTime}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-1.5 mb-5">
                <h4 className="text-xl font-extrabold text-white">
                  {title || "Untitled Support Offer"}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                  {description || "No description provided."}
                </p>
              </div>

              {/* Personal Note if entered */}
              {personalNote.trim() && (
                <div className="p-3.5 rounded-xl bg-[#0B1D35] border border-blue-500/20 text-xs text-slate-200 mb-5 relative">
                  <p className="text-[10px] font-bold text-blue-300 uppercase tracking-wider mb-1">
                    Note from Byron Honea:
                  </p>
                  <p className="italic text-slate-200">"{personalNote.trim()}"</p>
                </div>
              )}

              {/* What's Included Checklist */}
              {includedItems.length > 0 && (
                <div className="mb-6 space-y-2">
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    What’s Included:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {includedItems.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 text-xs text-slate-200"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Priority Option Selector (Interactive in preview) */}
              {priorityEnabled && (
                <div className="mb-6 p-4 rounded-xl bg-[#0B1D35] border border-[#1e3a5f] space-y-3">
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Select Your Service Speed:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      onClick={() => setPreviewSelectedPriority(false)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        !previewSelectedPriority
                          ? "bg-blue-600/20 border-blue-400 text-white"
                          : "bg-[#07162B] border-slate-700 text-slate-300 hover:border-slate-500"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs">Standard Speed</span>
                        <span className="font-mono text-xs font-bold text-white">
                          ${priceDollars}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Delivery in {finalDeliveryTime}
                      </p>
                    </div>

                    <div
                      onClick={() => setPreviewSelectedPriority(true)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        previewSelectedPriority
                          ? "bg-amber-500/20 border-amber-400 text-white"
                          : "bg-[#07162B] border-slate-700 text-slate-300 hover:border-slate-500"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs flex items-center gap-1 text-amber-300">
                          <Zap className="w-3.5 h-3.5" /> Priority Rush
                        </span>
                        <span className="font-mono text-xs font-bold text-amber-300">
                          $
                          {(
                            (parsedPriceCents + parsedPriorityPriceCents) /
                            100
                          ).toFixed(2)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Turnaround in {priorityDeliveryTime}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Price & Action Button */}
              <div className="pt-4 border-t border-[#18314f] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-400">
                    Total Investment:
                  </span>
                  <div className="text-2xl font-black text-white font-mono flex items-baseline gap-1">
                    {parsedPriceCents === 0 ? (
                      <span className="text-emerald-400">Complimentary ($0.00)</span>
                    ) : (
                      <>
                        $
                        {(
                          (parsedPriceCents +
                            (previewSelectedPriority && priorityEnabled
                              ? parsedPriorityPriceCents
                              : 0)) /
                          100
                        ).toFixed(2)}
                        <span className="text-xs text-slate-400 font-normal">
                          USD
                        </span>
                      </>
                    )}
                  </div>
                  {expirationPreset !== "No expiration" && (
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Valid for {expirationPreset} from issue
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled
                    className={`px-6 py-3 rounded-xl font-bold text-sm shadow-xl flex items-center gap-2 cursor-default ${
                      parsedPriceCents > 0 && requirePayment
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                        : "bg-emerald-600 text-white"
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>
                      {parsedPriceCents > 0 && requirePayment
                        ? "Accept and Continue to Payment"
                        : "Accept Support"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── PANEL FOOTER ACTIONS ── */}
          <div className="pt-5 border-t border-[#18314f] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Info className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Client will not see this offer until you send it.</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={saveDraftMutation.isPending}
                className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold rounded-lg border border-slate-700 bg-[#07162B] hover:bg-[#102744] text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Save className="w-3.5 h-3.5 text-blue-400" />
                <span>
                  {saveDraftMutation.isPending ? "Saving..." : "Save Draft"}
                </span>
              </button>

              <button
                type="button"
                onClick={handleInitiateSend}
                disabled={sendOfferMutation.isPending}
                className="flex-1 sm:flex-none px-5 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send to Client Portal</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── EXPANDED BOTTOM-LEFT TAB (Hide Additional Support) ── */}
        <div className="flex justify-start px-4 -mt-px">
          <button
            type="button"
            onClick={handleTogglePanel}
            aria-expanded={true}
            className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-b-lg border-t-0 border border-[#1e3a5f] bg-[#0B1D35] hover:bg-[#102744] text-slate-200 hover:text-white shadow-lg transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Hide Additional Support</span>
            <ChevronUp className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* ── CONFIRMATION DIALOG: SEND TO CLIENT PORTAL ── */}
      <Dialog open={showSendModal} onOpenChange={setShowSendModal}>
        <DialogContent className="bg-[#0B1D35] border border-[#1b3558] text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-base font-bold">
              Send this offer to {parentName} for {studentName}?
            </DialogTitle>
            <DialogDescription className="text-slate-300 text-xs">
              The offer will appear in their Parent Portal, and they will be notified.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-2 text-xs border-y border-[#18314f]">
            <div className="flex justify-between">
              <span className="text-slate-400">Service:</span>
              <span className="font-semibold text-white">{title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Total Price:</span>
              <span className="font-mono font-bold text-amber-300">
                ${(parsedPriceCents / 100).toFixed(2)} USD
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Delivery:</span>
              <span className="text-slate-200">{finalDeliveryTime}</span>
            </div>
            {priorityEnabled && (
              <div className="flex justify-between text-amber-300">
                <span>Priority Option:</span>
                <span>Available (+${(parsedPriorityPriceCents / 100).toFixed(2)})</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-400">Expiration:</span>
              <span className="text-slate-200">{expirationPreset}</span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => setShowSendModal(false)}
              className="px-4 py-2 rounded-lg border border-slate-700 bg-transparent text-slate-300 hover:bg-[#102744] text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmSend}
              disabled={sendOfferMutation.isPending}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg"
            >
              {sendOfferMutation.isPending ? "Sending..." : "Send Offer"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── UNSAVED CHANGES COLLAPSE WARNING ── */}
      <Dialog open={showCollapseWarning} onOpenChange={setShowCollapseWarning}>
        <DialogContent className="bg-[#0B1D35] border border-[#1b3558] text-slate-100 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white text-sm font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Unsaved Changes
            </DialogTitle>
            <DialogDescription className="text-slate-300 text-xs">
              You have unsaved changes in this support offer. Are you sure you want to collapse the panel?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => setShowCollapseWarning(false)}
              className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-slate-300 text-xs font-semibold"
            >
              Keep Open
            </button>
            <button
              type="button"
              onClick={handleConfirmCollapse}
              className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
            >
              Discard & Hide
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
