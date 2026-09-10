import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  CircleParking,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  MessageSquare,
  Sparkles,
  Tag,
  AlertCircle,
  Copy,
  Trash2,
  Edit2,
  FileDown,
  Filter,
  Check,
  Calendar,
  Layers,
  ChevronDown,
  Info,
  Car,
  RotateCcw,
  ExternalLink,
  Maximize2,
  Minimize2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import PageIdBadge from "@/components/PageIdBadge";
import { MarinaLotView, ParkedCarItem } from "./MarinaLotView";
import { MARINA_SPOTS, MARINA_CATEGORIES, MarinaSpotDef, GLOW_THEMES } from "./marinaLotConstants";
import { getRandomVehicleVariation, VEHICLE_COLOR_KEYS } from "./waypointDrivingStyle";
import { trpc } from "@/lib/trpc";

interface PortalParkingLotTabProps {
  studentContactId?: number | null;
  studentName?: string;
  displayName?: string;
  isAdminView?: boolean;
  isLight?: boolean;
  onNavigateTab?: (tab: string) => void;
}

export default function PortalParkingLotTab({
  studentContactId,
  studentName = "Student",
  displayName,
  isAdminView = false,
  isLight = false,
  onNavigateTab,
}: PortalParkingLotTabProps) {
  const storageKey = studentContactId
    ? `waypoint_parking_lot_${studentContactId}`
    : "waypoint_parking_lot_default";

  // Initial Seed Items matching the Marina Parking Lot spaces (Showcasing all 4 body models)
  const defaultItems: ParkedCarItem[] = [
    {
      id: "pl-1",
      title: "Request Assistive Technology Screen for Speech-to-Text in Math",
      notes: "Student is struggling with written math calculations when explanation is required. Ask if school OT or AT specialist can trial speech-to-text or MathType.",
      category: "Parent Concerns",
      priority: "High",
      status: "Parked",
      spotNumber: 1,
      carColor: "blue",
      vehicleId: "sports-blue",
      addedBy: "Parent",
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      id: "pl-2",
      title: "Clarify Paraeducator Transition Protocol between 4th & 5th Period",
      notes: "Student reported sensory overload in the hallway during locker transition. Need dedicated staff escort written explicitly into Section 4 accommodations.",
      category: "IEP Meeting",
      priority: "Urgent",
      status: "Parked",
      spotNumber: 2,
      carColor: "bronze",
      vehicleId: "suv-bronze",
      addedBy: "Advocate",
      createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    },
    {
      id: "pl-7",
      title: "Noise-Canceling Headphones Accommodation in Testing Room",
      notes: "School agreed to allow standard over-ear headphones for state milestone testing. Verify placement in testing accommodation grid.",
      category: "Accommodations",
      priority: "Normal",
      status: "Parked",
      spotNumber: 7,
      carColor: "red",
      vehicleId: "sedan-red",
      addedBy: "Parent",
      createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    },
    {
      id: "pl-10",
      title: "Check Timeline for Independent Educational Evaluation (IEE) Funding Letter",
      notes: "Follow up with district LEA on whether funding authorization letter has been transmitted to Dr. Keller's neuropsychology clinic.",
      category: "State Complaint",
      priority: "High",
      status: "Parked",
      spotNumber: 10,
      carColor: "black",
      vehicleId: "truck-black",
      addedBy: "Advocate",
      createdAt: new Date(Date.now() - 9 * 86400000).toISOString(),
    },
  ];

  // Database Query via tRPC with fallback to localStorage
  const { data: dbItems, refetch: refetchDbItems } = trpc.portal.getParkingLotItems.useQuery(
    { studentContactId },
    { enabled: typeof window !== "undefined" }
  );

  const parkItemMutation = trpc.portal.parkItem.useMutation({
    onSuccess: () => refetchDbItems(),
    onError: (err) => console.warn("DB park error, using local persistence:", err.message),
  });

  const updateItemMutation = trpc.portal.updateParkingLotItem.useMutation({
    onSuccess: () => refetchDbItems(),
  });

  const deleteItemMutation = trpc.portal.deleteParkingLotItem.useMutation({
    onSuccess: () => refetchDbItems(),
  });

  const [items, setItems] = useState<ParkedCarItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(storageKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((item: any) => ({
              ...item,
              carColor: item.carColor || "blue",
              vehicleId: item.vehicleId || item.carColor || "suv-blue",
            }));
          }
        }
      } catch (e) {
        console.error("Failed to load parking lot items from localStorage", e);
      }
    }
    return defaultItems;
  });

  // Sync with DB items if returned
  useEffect(() => {
    if (dbItems && dbItems.length > 0) {
      const normalized: ParkedCarItem[] = dbItems.map((dbRow: any) => ({
        id: String(dbRow.id),
        title: dbRow.title,
        notes: dbRow.notes || "",
        category: dbRow.category || "Other",
        priority: dbRow.priority || "Normal",
        status: dbRow.status || "Parked",
        spotNumber: dbRow.spotNumber || 1,
        carColor: dbRow.carColor || "blue",
        vehicleId: dbRow.carColor ? `suv-${dbRow.carColor}` : "suv-blue",
        addedBy: dbRow.addedBy || "Parent",
        createdAt: dbRow.createdAt ? new Date(dbRow.createdAt).toISOString() : new Date().toISOString(),
      }));
      setItems(normalized);
    }
  }, [dbItems]);

  // Persist to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(storageKey, JSON.stringify(items));
      } catch (e) {
        console.error("Failed to persist items to localStorage", e);
      }
    }
  }, [items, storageKey]);

  // ── "PARK IT" Intake Form State ──
  const [newTitle, setNewTitle] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newCategory, setNewCategory] = useState<string>("Parent Concerns");
  const [newPriority, setNewPriority] = useState<"Normal" | "High" | "Urgent">("Normal");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormExpanded, setIsFormExpanded] = useState(false);

  // ── Animation & Inspection State ──
  const [animatingSpot, setAnimatingSpot] = useState<number | null>(null);
  const [animatingVehicleId, setAnimatingVehicleId] = useState<string | undefined>(undefined);
  const [inspectedCar, setInspectedCar] = useState<ParkedCarItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<{ title: string; notes: string; category: string; priority: string }>({
    title: "",
    notes: "",
    category: "Other",
    priority: "Normal",
  });

  // ── View Toggle: Marina Visual vs. List ──
  const [viewMode, setViewMode] = useState<"marina" | "agenda">("marina");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  // Find next available spot filling strictly from top to bottom:
  // Row 1: Spots 1–6 (Top Promenade)
  // Row 2: Spots 7–12 (Middle Stalls)
  // Row 3: Spots 13–18 (Bottom Stalls)
  const findAvailableSpot = (): number | null => {
    const occupiedSpotNumbers = new Set(
      items.filter((i) => i.status !== "Resolved").map((i) => i.spotNumber)
    );

    // Fill top to bottom (1 to 18)
    for (let i = 1; i <= 18; i++) {
      if (!occupiedSpotNumbers.has(i)) {
        return i;
      }
    }

    return null;
  };

  // ── Core "PARK IT" Submission Handler ──
  const handleParkIt = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTitle.trim()) {
      toast.error("Please enter a concern, question, or update to park.");
      return;
    }

    const assignedSpot = findAvailableSpot();
    if (assignedSpot === null) {
      toast.error("All 18 parking stalls are currently occupied. Please resolve or clear existing items to free up spaces.");
      return;
    }

    const assignedSpotDef = MARINA_SPOTS.find((s) => s.spotNumber === assignedSpot);
    const assignedCategory = assignedSpotDef?.category || "General Concern";

    // Randomly select one of the 5 executive vehicle colors (Black, Bronze, Red, Blue, Green)
    const randomVariation = getRandomVehicleVariation();
    const assignedVehicleId = randomVariation.id;
    const assignedColor = randomVariation.colorName.toLowerCase();

    const newItem: ParkedCarItem = {
      id: `pl-${Date.now()}`,
      title: newTitle.trim(),
      notes: newNotes.trim() || undefined,
      category: assignedCategory,
      priority: newPriority,
      status: "Parked",
      spotNumber: assignedSpot,
      carColor: assignedColor,
      vehicleId: assignedVehicleId,
      addedBy: isAdminView ? "Advocate" : "Parent",
      createdAt: new Date().toISOString(),
    };

    setIsSubmitting(true);

    // 1. Clear inputs and notify parent/advocate immediately
    setNewTitle("");
    setNewNotes("");
    setIsFormExpanded(false);
    toast.success(`Space #${assignedSpot} reserved! Watch your vehicle arrive.`);

    // 2. Trigger Car Animation into the assigned spot FIRST
    // Keep stall completely vacant while the car physically drives from the gate!
    setAnimatingVehicleId(assignedVehicleId);
    setAnimatingSpot(assignedSpot);
    setIsSubmitting(false);

    // 3. Mount car and save to database only AFTER it has finished driving in (2850ms)
    setTimeout(() => {
      try {
        parkItemMutation.mutate({
          studentContactId: studentContactId || undefined,
          title: newItem.title,
          notes: newItem.notes,
          category: newItem.category,
          priority: newItem.priority,
          spotNumber: assignedSpot,
          carColor: assignedColor,
          addedBy: newItem.addedBy,
        });
      } catch (err) {
        console.error("DB persistence failed, continuing with optimistic update", err);
      }

      setItems((prev) => [newItem, ...prev.filter((p) => p.spotNumber !== assignedSpot || p.status === "Resolved")]);
      setAnimatingSpot(null);
      setAnimatingVehicleId(undefined);
      setIsFormExpanded(false);
    }, 2850);
  };


  // ── Sequential Lot Filling Animation ──
  const [isSequencing, setIsSequencing] = useState(false);
  const stopSequencingRef = useRef(false);

  const handleStopSequence = () => {
    stopSequencingRef.current = true;
    setAnimatingVehicleId(undefined);
    toast.info("Stopping sequential filling...");
  };

  const handleSequenceFill = async () => {
    if (isSequencing) return;
    setIsSequencing(true);
    stopSequencingRef.current = false;

    const demoTitles = [
      "Speech-to-text assistive tech for essay writing",
      "Draft IEP meeting scheduling for next month",
      "Comprehensive neuropsychological evaluation request",
      "Occupational therapy sensory diet documentation",
      "Behavior intervention plan check-in data",
      "Follow-up email with case manager re: paraprofessional",
      "Testing accommodations: 50% extended time & quiet room",
      "Eligibility redetermination meeting agenda",
      "High school graduation credit pathway & transition goals",
      "State complaint draft review with advocate",
      "Physical therapy consultation schedule",
      "Quarterly IEP progress benchmark update",
      "Specialized bus transportation harness confirmation",
      "Updated seizure action plan & nurse protocol",
      "504 Plan accommodation checklist for finals",
      "General education inclusion time tracking (LRE)",
      "Bullying incident report & safety plan follow-up",
      "General advocacy question for Byron",
    ];

    // Find all currently vacant spots
    const occupied = new Set(items.filter((i) => i.status !== "Resolved").map((i) => i.spotNumber));
    const vacantSpots = MARINA_SPOTS.map((s) => s.spotNumber).filter((num) => !occupied.has(num));

    if (vacantSpots.length === 0) {
      toast.info("All 18 marina stalls are already parked! Click Reset Stalls to start fresh.");
      setIsSequencing(false);
      return;
    }

    toast.success(`Starting sequential arrival of ${vacantSpots.length} vehicles!`);

    for (let i = 0; i < vacantSpots.length; i++) {
      if (stopSequencingRef.current) break;
      const spotNum = vacantSpots[i];
      const spotDef = MARINA_SPOTS.find((s) => s.spotNumber === spotNum)!;
      const title = demoTitles[(spotNum - 1) % demoTitles.length];

      // Assign diverse vehicle variation across the 5 colors
      const assignedVariation = getRandomVehicleVariation(spotNum * 17 + i * 3);
      const assignedVehicleId = assignedVariation.id;

      // 1. Trigger car driving into entrance and navigating to this spot
      setAnimatingVehicleId(assignedVehicleId);
      setAnimatingSpot(spotNum);

      // Wait for car to arrive and settle into stall (2850ms)
      await new Promise((resolve) => setTimeout(resolve, 2850));

      if (stopSequencingRef.current) {
        setAnimatingSpot(null);
        setAnimatingVehicleId(undefined);
        break;
      }

      // 2. NOW park item into stall and clear animation state
      const newItem: ParkedCarItem = {
        id: `seq-${Date.now()}-${spotNum}`,
        title,
        notes: `Auto-parked topic for Spot #${spotNum}: ${spotDef.category}`,
        category: spotDef.category,
        priority: spotNum % 5 === 0 ? "Urgent" : spotNum % 3 === 0 ? "High" : "Normal",
        status: "Parked",
        spotNumber: spotNum,
        carColor: assignedVariation.colorName.toLowerCase(),
        vehicleId: assignedVehicleId,
        addedBy: "Demo Sequence",
        createdAt: new Date().toISOString(),
      };

      setItems((prev) => [...prev.filter((p) => p.spotNumber !== spotNum || p.status === "Resolved"), newItem]);
      setAnimatingSpot(null);
      setAnimatingVehicleId(undefined);

      if (stopSequencingRef.current) break;

      // Short breath between cars (400ms)
      await new Promise((resolve) => setTimeout(resolve, 400));
      if (stopSequencingRef.current) break;
    }

    setAnimatingSpot(null);
    setAnimatingVehicleId(undefined);
    setIsSequencing(false);
    if (stopSequencingRef.current) {
      toast.info("Sequential filling stopped.");
    } else {
      toast.success("Marina Parking Lot fully populated in sequence!");
    }
  };

  const handleClearDemo = () => {
    setItems((prev) => prev.map((item) => ({ ...item, status: "Resolved" })));
    toast.info("All marina parking spaces are now open and ready.");
  };

  // ── Resolve Item (Frees up space) ──
  const handleResolveItem = (item: ParkedCarItem) => {
    const updated = items.map((i) =>
      i.id === item.id ? { ...i, status: "Resolved", updatedAt: new Date().toISOString() } : i
    );
    setItems(updated);

    const numId = parseInt(item.id.replace("pl-", ""), 10);
    if (!isNaN(numId)) {
      updateItemMutation.mutate({ id: numId, status: "Resolved" });
    }

    setInspectedCar(null);
    toast.success(`Space #${item.spotNumber} is now open! Marked concern as resolved.`);
  };

  // ── Remove / Delete Item ──
  const handleDeleteItem = (item: ParkedCarItem) => {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    const numId = parseInt(item.id.replace("pl-", ""), 10);
    if (!isNaN(numId)) {
      deleteItemMutation.mutate({ id: numId });
    }
    setInspectedCar(null);
    toast.info(`Removed from Space #${item.spotNumber}.`);
  };

  // ── Save Edited Item ──
  const handleSaveEdit = () => {
    if (!inspectedCar) return;
    const updated: ParkedCarItem = {
      ...inspectedCar,
      title: editForm.title.trim() || inspectedCar.title,
      notes: editForm.notes.trim() || undefined,
      category: editForm.category,
      priority: editForm.priority as any,
      updatedAt: new Date().toISOString(),
    };

    setItems((prev) => prev.map((i) => (i.id === inspectedCar.id ? updated : i)));
    const numId = parseInt(inspectedCar.id.replace("pl-", ""), 10);
    if (!isNaN(numId)) {
      updateItemMutation.mutate({
        id: numId,
        title: updated.title,
        notes: updated.notes,
        category: updated.category,
        priority: updated.priority,
      });
    }

    setInspectedCar(updated);
    setIsEditModalOpen(false);
    toast.success("Concern updated successfully.");
  };

  // ── Copy Agenda Export ──
  const handleCopyAgenda = () => {
    const activeItems = items.filter((i) => i.status !== "Resolved");
    if (activeItems.length === 0) {
      toast.error("No active parked items to copy.");
      return;
    }

    const text = [
      `🚗 WAYPOINT ADVOCATES — IEP ADVOCACY PARKING LOT AGENDA`,
      `Student: ${studentName}`,
      `Date: ${new Date().toLocaleDateString()}`,
      `--------------------------------------------------`,
      ...activeItems.map(
        (it, idx) =>
          `${idx + 1}. [Spot #${it.spotNumber} - ${it.category}] (${it.priority} Priority)\n   ${it.title}${
            it.notes ? `\n   Notes: ${it.notes}` : ""
          }`
      ),
      `--------------------------------------------------`,
      `*Generated from Waypoint Advocates Client Portal (PG-023-PRK)*`,
    ].join("\n\n");

    navigator.clipboard.writeText(text);
    toast.success("Meeting agenda copied to clipboard!");
  };

  // Active parked items count
  const activeParkedCount = items.filter((i) => i.status !== "Resolved").length;

  return (
    <div className={`p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto ${isLight ? "text-slate-900" : "text-white"}`}>
      {/* ── Top Header with PG-023-PRK Page ID ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-blue-900/40 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-400/10 text-amber-300 border border-amber-400/30 shadow-[0_0_15px_rgba(245,158,11,0.2)] shrink-0">
            <CircleParking className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">Marina Parking Lot</h1>
              <PageIdBadge id="PG-023-PRK" name="Parking Lot" />
            </div>
            <p className="text-xs sm:text-sm text-white/60">
              Parking lot for <span className="text-amber-300 font-semibold">{studentName}</span>
            </p>
          </div>
        </div>

        {/* Sticky Note Box beside Marina View & View Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-stretch gap-3">
          {/* Expanded Standard Lighter Blue Fill Info Box */}
          <div className="px-4 py-2.5 rounded-xl bg-[#0e2a4a] border border-blue-600/40 text-blue-100 shadow-md max-w-lg flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-300 shrink-0">
              <Info className="h-4 w-4" />
            </div>
            <p className="font-semibold text-white/95 text-sm leading-snug">
              Think of this as a sticky note area for your case, not a message to your advocate.
            </p>
          </div>

          {/* View Switcher: Marina View / Agenda List */}
          <div className="p-1.5 rounded-xl bg-[#06172F] border border-blue-900/40 flex items-center shrink-0 self-start sm:self-center">
            <button
              onClick={() => setViewMode("marina")}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === "marina"
                  ? "bg-amber-400 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <Car className="h-3.5 w-3.5" />
              <span>Marina View</span>
            </button>
            <button
              onClick={() => setViewMode("agenda")}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === "agenda"
                  ? "bg-amber-400 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>List View ({activeParkedCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Super Compact / Expandable "PARK IT" Quick Entry Console ── */}
      {!isFormExpanded ? (
        <Card className="rounded-2xl border border-blue-900/50 bg-[#06172F]/95 backdrop-blur-md px-3 py-2 sm:py-2.5 shadow-xl transition-all">
          <form onSubmit={handleParkIt} className="flex flex-col sm:flex-row items-center gap-2">
            {/* Quick Topic / Concern Input */}
            <div className="relative flex-1 w-full flex items-center">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 pointer-events-none flex items-center gap-1">
                <Car className="h-4 w-4" />
              </div>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Park a concern, question, or meeting topic..."
                className="pl-9 pr-24 bg-[#030C22] border-blue-900/60 text-white placeholder:text-white/40 rounded-xl text-xs sm:text-sm h-10 focus:border-amber-400/80 w-full"
              />
              {/* Expand Button embedded at right edge of input */}
              <button
                type="button"
                onClick={() => setIsFormExpanded(true)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-sky-400 hover:text-white hover:bg-sky-500/20 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                title="Expand form to add notes, details, and priority"
              >
                <Maximize2 className="h-3 w-3" />
                <span className="hidden md:inline">Expand</span>
              </button>
            </div>

            {/* Expand Toggle & Main Submit Button */}
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-between sm:justify-start">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsFormExpanded(true)}
                className="text-xs text-blue-300 hover:text-white hover:bg-blue-900/40 border border-blue-800/50 rounded-xl h-10 px-2.5 flex items-center gap-1.5 cursor-pointer"
                title="Need more room? Expand to add notes, background, and priority"
              >
                <ChevronDown className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-[11px] font-semibold">More Room</span>
              </Button>

              <Button
                type="submit"
                disabled={isSubmitting || !newTitle.trim()}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-4 h-10 rounded-xl shadow-[0_0_12px_rgba(245,158,11,0.3)] transition-all hover:scale-[1.02] flex items-center gap-1.5 cursor-pointer ml-auto sm:ml-0"
              >
                <span>🚗</span>
                <span>PARK IT</span>
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <Card className="rounded-2xl border border-blue-800/60 bg-[#06172F] p-4 sm:p-5 shadow-2xl transition-all animate-in fade-in-50 duration-200">
          <form onSubmit={handleParkIt} className="space-y-4">
            {/* Header with quick collapse */}
            <div className="flex items-center justify-between gap-2 border-b border-blue-900/50 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-400/10 text-amber-300 border border-amber-400/30">
                  <Car className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Park a Concern, Question, or Meeting Topic</span>
                  </h3>
                  <p className="text-[11px] text-white/50">Fills automatically from top to bottom into the next open stall</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsFormExpanded(false)}
                className="text-xs text-sky-300 hover:text-white hover:bg-blue-900/40 border border-blue-800/40 rounded-xl h-8 px-2.5 flex items-center gap-1.5 cursor-pointer"
                title="Collapse back to compact single bar"
              >
                <Minimize2 className="h-3 w-3" />
                <span className="text-[11px] font-medium">Compact View</span>
              </Button>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
              {/* Concern / Question Input */}
              <div className="md:col-span-8 space-y-1.5">
                <Label className="text-xs font-semibold text-white/90">
                  What's on your mind? <span className="text-amber-400">*</span>
                </Label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Speech-to-text in math, bus sensory accommodation, question on IEP draft..."
                  className="bg-[#030C22] border-blue-900/60 text-white placeholder:text-white/40 rounded-xl text-sm h-11 focus:border-amber-400/80"
                  autoFocus
                />
              </div>

              {/* Priority */}
              <div className="md:col-span-4 space-y-1.5">
                <Label className="text-xs font-semibold text-white/90">Priority</Label>
                <div className="grid grid-cols-3 gap-1.5 h-11">
                  {(["Normal", "High", "Urgent"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewPriority(p)}
                      className={`rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        newPriority === p
                          ? p === "Urgent"
                            ? "bg-red-500/20 text-red-300 border-red-500/60 shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                            : p === "High"
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                            : "bg-sky-500/20 text-sky-300 border-sky-500/60 shadow-[0_0_8px_rgba(56,189,248,0.4)]"
                          : "bg-[#030C22] text-white/50 border-blue-900/40 hover:text-white"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Roomy Notes & Meeting Agenda Details */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-white/90">Notes & Meeting Agenda Details</Label>
                <span className="text-[11px] text-white/40">Optional context for advocate & school team</span>
              </div>
              <Textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Add optional notes, student impact, specific questions for Byron, or talking points for the meeting agenda..."
                className="bg-[#030C22]/90 border-blue-900/50 text-white text-xs placeholder:text-white/40 rounded-xl min-h-[85px] leading-relaxed resize-y"
              />
            </div>

            {/* Action Row */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 border-t border-blue-900/40">
              <span className="text-[11px] text-white/50 text-center sm:text-left">
                💡 Submitting saves immediately to database, then drives your car into park.
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFormExpanded(false)}
                  className="text-xs text-white/60 hover:text-white hover:bg-white/10 rounded-xl h-10 px-3 cursor-pointer"
                >
                  Collapse
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !newTitle.trim()}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm px-6 h-10 rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.35)] transition-all hover:scale-[1.02] flex items-center gap-2 cursor-pointer"
                >
                  <span>🚗</span>
                  <span>PARK IT</span>
                </Button>
              </div>
            </div>
          </form>
        </Card>
      )}

      {/* ── Main View Area: Marina Parking Lot vs Agenda Table ── */}
      {viewMode === "marina" ? (
        <div className="space-y-3">
          <MarinaLotView
            items={items}
            animatingSpot={animatingSpot}
            animatingVehicleId={animatingVehicleId}
            isSequencing={isSequencing}
            onSequenceFill={handleSequenceFill}
            onStopSequence={handleStopSequence}
            onClearDemo={handleClearDemo}
            onCarClick={(item) => {
              setInspectedCar(item);
              setEditForm({
                title: item.title,
                notes: item.notes || "",
                category: item.category,
                priority: item.priority,
              });
            }}
          />
        </div>
      ) : (
        /* ── Agenda List View ── */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search parked items..."
                className="pl-9 bg-[#06172F] border-blue-900/40 text-white text-xs rounded-xl h-9"
              />
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-[#06172F] border border-blue-900/40 text-white rounded-xl text-xs h-9 px-3 outline-none"
              >
                <option value="All">All Categories</option>
                {MARINA_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyAgenda}
                className="border-blue-900/40 bg-[#06172F] text-amber-300 hover:bg-[#081B36] text-xs rounded-xl gap-1.5 shadow-md h-9 cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Agenda</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {items
              .filter((it) => {
                if (categoryFilter !== "All" && it.category !== categoryFilter) return false;
                if (searchQuery && !it.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                return true;
              })
              .map((item) => (
                <Card
                  key={item.id}
                  onClick={() => {
                    setInspectedCar(item);
                    setEditForm({
                      title: item.title,
                      notes: item.notes || "",
                      category: item.category,
                      priority: item.priority,
                    });
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-lg hover:border-amber-400/50 ${
                    item.status === "Resolved"
                      ? "bg-slate-950/40 border-slate-800 opacity-60"
                      : "bg-[#06172F] border-blue-900/40 hover:bg-[#081B36]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/30 text-amber-300 font-mono font-bold text-[10px]">
                          Spot #{item.spotNumber}
                        </span>
                        <span className="text-xs font-semibold text-sky-400">{item.category}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.priority === "Urgent"
                              ? "bg-red-500/20 text-red-300 border border-red-500/30"
                              : item.priority === "High"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                          }`}
                        >
                          {item.priority}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white line-clamp-2">{item.title}</h4>
                      {item.notes && <p className="text-xs text-white/60 line-clamp-2">{item.notes}</p>}
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.status === "Resolved"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                        }`}
                      >
                        {item.status}
                      </span>
                      <p className="text-[10px] text-white/40 mt-1">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
          </div>
        </div>
      )}

      {/* ── Clicked Parked Car Details Modal (Clean Marina UX) ── */}
      <Dialog open={inspectedCar !== null} onOpenChange={(open) => !open && setInspectedCar(null)}>
        <DialogContent className="max-w-md bg-[#06172F] border border-blue-900/50 text-white rounded-2xl shadow-2xl p-6">
          {inspectedCar && (
            <div className="space-y-4">
              <DialogHeader className="text-left space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-amber-400/10 border border-amber-400/40 text-amber-300 font-mono font-bold text-xs">
                      🚗 Spot #{inspectedCar.spotNumber}
                    </span>
                    <span className="text-xs font-bold text-sky-400">{inspectedCar.category}</span>
                  </div>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      inspectedCar.priority === "Urgent"
                        ? "bg-red-500/20 text-red-300 border border-red-500/30"
                        : inspectedCar.priority === "High"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                    }`}
                  >
                    {inspectedCar.priority} Priority
                  </span>
                </div>
                <DialogTitle className="text-base font-extrabold text-white pt-2 leading-snug">
                  {inspectedCar.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-white/50">
                  Parked on {new Date(inspectedCar.createdAt).toLocaleDateString()} by {inspectedCar.addedBy || "Parent"}
                </DialogDescription>
              </DialogHeader>

              {/* Notes Display */}
              {inspectedCar.notes ? (
                <div className="p-3.5 rounded-xl bg-[#030C22] border border-blue-900/40 space-y-1">
                  <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
                    Discussion Notes
                  </span>
                  <p className="text-xs text-white/80 leading-relaxed whitespace-pre-wrap">
                    {inspectedCar.notes}
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-[#030C22]/60 border border-blue-900/30 text-xs text-white/40 italic">
                  No additional notes. Click edit below to add meeting context.
                </div>
              )}

              {/* Reminder Banner inside modal */}
              <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-900/30 text-[11px] text-white/60 flex items-center gap-2">
                <Info className="h-4 w-4 text-amber-400 shrink-0" />
                <span>Saved for next IEP review or team touchpoint.</span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-blue-900/40">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeleteItem(inspectedCar)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs rounded-xl gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Remove</span>
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsEditModalOpen(true);
                    }}
                    className="border-blue-900/50 bg-[#030C22] text-white hover:bg-blue-900/40 text-xs rounded-xl gap-1.5"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </Button>

                  {inspectedCar.status !== "Resolved" ? (
                    <Button
                      size="sm"
                      onClick={() => handleResolveItem(inspectedCar)}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl gap-1.5 shadow-[0_0_10px_rgba(52,211,153,0.3)]"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Mark Resolved</span>
                    </Button>
                  ) : (
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs py-1 px-3">
                      ✓ Resolved
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Edit Concern Modal ── */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md bg-[#06172F] border border-blue-900/50 text-white rounded-2xl shadow-2xl p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white">Edit Parked Concern</DialogTitle>
            <DialogDescription className="text-xs text-white/50">
              Update concern details, notes, or priority.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-white/80">Concern / Title</Label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="bg-[#030C22] border-blue-900/50 text-white text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-white/80">Category</Label>
              <select
                value={editForm.category}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                className="w-full bg-[#030C22] border border-blue-900/50 text-white rounded-xl text-xs h-9 px-3 outline-none"
              >
                {MARINA_CATEGORIES.map((c) => (
                  <option key={c} value={c} className="bg-[#06172F]">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-white/80">Priority</Label>
              <select
                value={editForm.priority}
                onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                className="w-full bg-[#030C22] border border-blue-900/50 text-white rounded-xl text-xs h-9 px-3 outline-none"
              >
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-white/80">Discussion Notes</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                rows={3}
                className="bg-[#030C22] border-blue-900/50 text-white text-xs rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditModalOpen(false)}
              className="text-white/60 hover:text-white text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveEdit}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl px-4"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
