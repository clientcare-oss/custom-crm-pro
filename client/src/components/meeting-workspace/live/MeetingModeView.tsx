import React, { useState } from "react";
import { Check, CheckSquare, Square, ChevronRight, X, Plus, AlertCircle, PlayCircle, Shield, FileCheck, HelpCircle, Flag, ArrowRight, CornerDownRight, CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { MeetingTarget, TargetMeetingStatus, ParkingLotItem, AdditionalItem, CloseoutChecks } from "../types";

interface MeetingModeViewProps {
  studentName: string;
  targets: MeetingTarget[];
  detectedOrder: string[];
  parkingLot: ParkingLotItem[];
  additionalItems: AdditionalItem[];
  closeoutChecks: CloseoutChecks;
  onUpdateTargets: (targets: MeetingTarget[]) => void;
  onUpdateParkingLot: (items: ParkingLotItem[]) => void;
  onUpdateAdditionalItems: (items: AdditionalItem[]) => void;
  onUpdateCloseoutChecks: (checks: CloseoutChecks) => void;
  onCompleteMeeting: (summary: any) => Promise<void>;
}

export function MeetingModeView({
  studentName,
  targets,
  detectedOrder,
  parkingLot,
  additionalItems,
  closeoutChecks,
  onUpdateTargets,
  onUpdateParkingLot,
  onUpdateAdditionalItems,
  onUpdateCloseoutChecks,
  onCompleteMeeting,
}: MeetingModeViewProps) {
  // Slide-over Details Drawer state
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  // Quick Park It input
  const [parkInput, setParkInput] = useState("");

  // Add Target on the fly modal
  const [showAddTargetModal, setShowAddTargetModal] = useState(false);
  const [quickTopic, setQuickTopic] = useState("");
  const [quickSayThis, setQuickSayThis] = useState("");
  const [quickSection, setQuickSection] = useState(detectedOrder[0] || "Accommodations / Supports");

  // Additional Things to Discuss input
  const [additionalInput, setAdditionalInput] = useState("");

  // Meeting Closeout Modal
  const [showCloseoutModal, setShowCloseoutModal] = useState(false);
  const [closeoutNotes, setCloseoutNotes] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);

  const selectedTarget = targets.find((t) => t.id === selectedTargetId) || null;

  // Toggle Request Raised checkbox
  const toggleRequestRaised = (id: string) => {
    onUpdateTargets(
      targets.map((t) =>
        t.id === id ? { ...t, requestRaised: !t.requestRaised } : t
      )
    );
  };

  // Change meeting status
  const handleStatusChange = (id: string, meetingStatus: TargetMeetingStatus) => {
    onUpdateTargets(
      targets.map((t) => (t.id === id ? { ...t, meetingStatus } : t))
    );
  };

  // Update specific target flags inside drawer
  const updateTargetFlag = (
    id: string,
    key: keyof MeetingTarget,
    value: any
  ) => {
    onUpdateTargets(
      targets.map((t) => (t.id === id ? { ...t, [key]: value } : t))
    );
  };

  // Add item to parking lot
  const handleAddParkItem = () => {
    if (!parkInput.trim()) return;
    const newItem: ParkingLotItem = {
      id: `pk-${Date.now()}`,
      note: parkInput.trim(),
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: "open",
    };
    onUpdateParkingLot([...parkingLot, newItem]);
    setParkInput("");
  };

  // Add Additional item
  const handleAddAdditionalItem = () => {
    if (!additionalInput.trim()) return;
    const newItem: AdditionalItem = {
      id: `add-${Date.now()}`,
      text: additionalInput.trim(),
      status: "open",
    };
    onUpdateAdditionalItems([...additionalItems, newItem]);
    setAdditionalInput("");
  };

  // Fast Add Target on the fly
  const handleSaveQuickTarget = () => {
    if (!quickTopic.trim()) return;
    const newTarget: MeetingTarget = {
      id: `live-tgt-${Date.now()}`,
      targetName: quickTopic.trim(),
      iepSection: quickSection,
      sectionOrder: detectedOrder.indexOf(quickSection) + 1 || 99,
      targetOrder: targets.length + 1,
      quickAdvocateSayThis: quickSayThis.trim() || `We are requesting ${quickTopic.trim()} be documented in the IEP.`,
      fullAdvocateScript: "",
      putItHereLocation: `IEP: ${quickSection}`,
      possibleIepWording: "",
      whyWeWantIt: "Identified during live IEP team discussion.",
      supportingEvidence: "Raised during session.",
      sources: ["Live IEP Meeting"],
      ifTeamDisagrees: "Document denial in Prior Written Notice.",
      parentWhatWeWant: quickTopic.trim(),
      parentWhyWeWantIt: "",
      parentSupportingEvidence: "",
      meetingStatus: "DISCUSSED",
      requestRaised: true,
      pwnNeeded: false,
      addedToIep: false,
      followUpNeeded: false,
      isCustom: true,
    };
    onUpdateTargets([...targets, newTarget]);
    setQuickTopic("");
    setQuickSayThis("");
    setShowAddTargetModal(false);
  };

  // Complete meeting execution
  const handleFinalizeMeeting = async () => {
    setIsCompleting(true);
    try {
      const summary = {
        totalTargets: targets.length,
        raisedTargets: targets.filter((t) => t.requestRaised).length,
        agreedTargets: targets.filter((t) => t.meetingStatus === "AGREED" || t.addedToIep).map((t) => t.targetName),
        deniedTargets: targets.filter((t) => t.meetingStatus === "DENIED").map((t) => t.targetName),
        pwnTargets: targets.filter((t) => t.pwnNeeded || t.meetingStatus === "DENIED").map((t) => t.targetName),
        parkingLotItems: parkingLot.map((p) => p.note),
        followUpItems: targets
          .filter((t) => t.followUpNeeded || t.meetingStatus === "FOLLOW_UP")
          .map((t) => ({ title: t.targetName, ownerDate: t.followUpOwnerDate })),
        notes: closeoutNotes,
      };

      await onCompleteMeeting(summary);
      setShowCloseoutModal(false);
    } catch (err: any) {
      console.error("Failed to complete meeting:", err);
    } finally {
      setIsCompleting(false);
    }
  };

  // Progress metrics
  const totalTargets = targets.length;
  const raisedCount = targets.filter((t) => t.requestRaised).length;
  const agreedCount = targets.filter((t) => t.meetingStatus === "AGREED" || t.addedToIep).length;

  // Group active targets by detected section
  const sectionMap = new Map<string, MeetingTarget[]>();
  detectedOrder.forEach((sec) => sectionMap.set(sec, []));
  targets.forEach((t) => {
    const sec = t.iepSection || "General";
    if (!sectionMap.has(sec)) sectionMap.set(sec, []);
    sectionMap.get(sec)!.push(t);
  });

  const getStatusBadgeStyle = (status: TargetMeetingStatus) => {
    switch (status) {
      case "AGREED":
        return "bg-emerald-950/80 border-emerald-500/60 text-emerald-300 font-bold";
      case "DENIED":
        return "bg-rose-950/80 border-rose-500/60 text-rose-300 font-bold";
      case "FOLLOW_UP":
        return "bg-amber-950/80 border-amber-500/60 text-[#F5B544] font-bold";
      case "DISCUSSED":
        return "bg-blue-950/80 border-blue-500/60 text-blue-200 font-bold";
      default:
        return "bg-[#081F3D] border-[#134273] text-blue-300/60";
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Top Quick Status & Progress Bar */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0B3767] via-[#09254D] to-[#071C38] border border-[#144E8A] p-4 sm:p-5 shadow-2xl flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
            <h2 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-2">
              <span>⚡ MEETING QUICK LIST</span>
            </h2>
          </div>
          <p className="text-xs text-blue-200/70 mt-0.5">
            {raisedCount} of {totalTargets} requests raised · {agreedCount} agreed to IEP
          </p>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            size="sm"
            onClick={() => setShowAddTargetModal(true)}
            className="text-xs font-bold bg-[#0D4B84] hover:bg-[#145D9F] text-white border border-[#206BBC] px-3.5 py-1.5 cursor-pointer inline-flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5 text-[#F5B544]" />
            + Add Target
          </Button>

          <Button
            size="sm"
            onClick={() => setShowCloseoutModal(true)}
            className="text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg px-4 py-1.5 cursor-pointer inline-flex items-center gap-1.5"
          >
            <span>🚦 End Meeting</span>
          </Button>
        </div>
      </div>

      {/* Persistent Park It Instant Capture Bar */}
      <div className="rounded-xl bg-[#08203E] border border-[#144D87] p-3 flex items-center gap-2.5 shadow-lg">
        <span className="text-xs font-extrabold text-[#F5B544] uppercase tracking-wider px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/40 shrink-0">
          🅿 Park It
        </span>
        <Input
          value={parkInput}
          onChange={(e) => setParkInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddParkItem()}
          placeholder="Capture an unexpected thought or side-topic instantly (e.g. 'Check transportation time')..."
          className="h-8 text-xs bg-[#051426] border-[#0E3560] text-white flex-1"
        />
        <Button
          size="sm"
          onClick={handleAddParkItem}
          disabled={!parkInput.trim()}
          className="h-8 text-xs bg-[#0E427B] hover:bg-[#16569C] text-blue-100 font-bold shrink-0 cursor-pointer"
        >
          Park
        </Button>
      </div>

      {/* Main Quick List */}
      <div className="space-y-4">
        {Array.from(sectionMap.entries()).map(([section, sectionTargets]) => {
          if (sectionTargets.length === 0) return null;

          return (
            <div
              key={section}
              className="rounded-2xl bg-[#071A33] border border-[#0F3D70] overflow-hidden shadow-lg"
            >
              {/* Small Visual Section Divider */}
              <div className="px-4 py-2 bg-gradient-to-r from-[#0A2750] to-[#071A33] border-b border-[#0F3D70] flex items-center justify-between">
                <span className="text-xs font-bold text-[#F5B544] uppercase tracking-wider">
                  {section}
                </span>
                <span className="text-[10.5px] font-mono text-blue-300/60">
                  {sectionTargets.filter((t) => t.requestRaised).length}/{sectionTargets.length} Raised
                </span>
              </div>

              {/* Quick Targets in Section */}
              <div className="divide-y divide-[#0D2F54]">
                {sectionTargets.map((target) => (
                  <div
                    key={target.id}
                    className={cn(
                      "p-3.5 sm:p-4 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3",
                      target.requestRaised
                        ? "bg-[#092244]/40"
                        : "bg-[#07182E] hover:bg-[#0A2548]"
                    )}
                  >
                    {/* Left: Checkbox + Topic + Say This */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleRequestRaised(target.id)}
                        className="mt-0.5 text-blue-300 hover:text-[#F5B544] cursor-pointer shrink-0"
                        title={target.requestRaised ? "Request was raised" : "Mark as raised"}
                      >
                        {target.requestRaised ? (
                          <CheckSquare className="h-5 w-5 text-emerald-400" />
                        ) : (
                          <Square className="h-5 w-5 text-blue-400/50 hover:text-white" />
                        )}
                      </button>

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={cn(
                              "text-xs sm:text-[13px] font-bold tracking-wide",
                              target.requestRaised ? "text-blue-100" : "text-white"
                            )}
                          >
                            {target.targetName}
                          </span>
                          {target.pwnNeeded && (
                            <span className="text-[10px] font-bold text-rose-300 bg-rose-950/70 border border-rose-500/40 px-1.5 py-0.2 rounded">
                              PWN Flagged
                            </span>
                          )}
                        </div>

                        {/* One-Sentence Advocate Say This */}
                        <p className="text-xs sm:text-[12.5px] text-blue-200/90 leading-snug">
                          <span className="text-blue-400 font-bold mr-1">🗣</span>
                          "{target.quickAdvocateSayThis}"
                        </p>
                      </div>
                    </div>

                    {/* Right: Status Dropdown + Details Drawer Trigger */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      <select
                        value={target.meetingStatus}
                        onChange={(e) => handleStatusChange(target.id, e.target.value as TargetMeetingStatus)}
                        className={cn(
                          "h-8 text-xs rounded-lg px-2.5 border cursor-pointer focus:outline-none transition-colors",
                          getStatusBadgeStyle(target.meetingStatus)
                        )}
                      >
                        <option value="NOT_DISCUSSED" className="bg-[#07162B] text-slate-300">NOT DISCUSSED</option>
                        <option value="DISCUSSED" className="bg-[#07162B] text-blue-300">DISCUSSED</option>
                        <option value="AGREED" className="bg-[#07162B] text-emerald-300">AGREED</option>
                        <option value="DENIED" className="bg-[#07162B] text-rose-300">DENIED</option>
                        <option value="FOLLOW_UP" className="bg-[#07162B] text-amber-300">FOLLOW-UP</option>
                      </select>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTargetId(target.id)}
                        className="h-8 text-xs border-[#13497F] bg-[#0A2B52] text-blue-200 hover:text-white hover:border-[#F5B544]/60 cursor-pointer inline-flex items-center gap-1 shadow-sm"
                      >
                        <span>Details</span>
                        <ChevronRight className="h-3.5 w-3.5 text-[#F5B544]" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Before We Close Section */}
      <div className="rounded-2xl bg-[#071A33] border border-[#0F3D70] p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">🚦</span>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Before We Close — Additional Things to Discuss
            </h3>
          </div>
          <span className="text-[11px] text-blue-300/60">
            {parkingLot.length} Parked · {additionalItems.length} Notes
          </span>
        </div>

        {/* Parked Items list */}
        {parkingLot.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10.5px] font-bold text-[#F5B544] uppercase tracking-wider">
              Parked During Session:
            </p>
            {parkingLot.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#051426] border border-[#0F355E] text-xs text-white"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="font-bold text-[#F5B544]">🅿</span>
                  <span className="truncate">{item.note}</span>
                  <span className="text-[10px] text-blue-300/50 font-mono">({item.createdAt})</span>
                </div>
                <Badge className="text-[10px] bg-[#0E427B] text-blue-200 border-none">
                  {item.status.toUpperCase()}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* Additional items quick entry */}
        <div className="flex items-center gap-2 pt-1">
          <Input
            value={additionalInput}
            onChange={(e) => setAdditionalInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddAdditionalItem()}
            placeholder="Add a final point to clarify before adjourning..."
            className="h-8 text-xs bg-[#051426] border-[#0E3560] text-white"
          />
          <Button
            size="sm"
            onClick={handleAddAdditionalItem}
            className="h-8 text-xs bg-[#0E427B] text-blue-100 font-bold shrink-0 cursor-pointer"
          >
            Add
          </Button>
        </div>

        {additionalItems.length > 0 && (
          <div className="space-y-1.5 pt-1">
            {additionalItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-[#051426] border border-[#0F355E] text-xs text-blue-100"
              >
                <span className="text-blue-400">☐</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Slide-over Target Details Drawer (Preserves Scroll Position) */}
      {selectedTarget && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-[#06172E] border-l border-[#144E8A] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          {/* Drawer Header */}
          <div className="p-5 border-b border-[#0F3D70] bg-gradient-to-r from-[#09254D] to-[#06172E] flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10.5px] font-bold text-[#F5B544] uppercase tracking-wider">
                Target Details Drawer
              </span>
              <h3 className="text-base font-bold text-white truncate max-w-[340px]">
                🎯 {selectedTarget.targetName}
              </h3>
            </div>

            <button
              type="button"
              onClick={() => setSelectedTargetId(null)}
              className="p-1.5 rounded-lg text-blue-300 hover:text-white hover:bg-white/10 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
            {/* Live Status Controls */}
            <div className="rounded-xl bg-[#092244] border border-[#144A7E] p-3.5 space-y-2.5">
              <p className="text-[11px] font-bold text-[#F5B544] uppercase tracking-wider">
                Meeting Status & Tracking Flags
              </p>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateTargetFlag(selectedTarget.id, "requestRaised", !selectedTarget.requestRaised)}
                  className={cn(
                    "p-2 rounded-lg border text-left text-xs font-semibold flex items-center gap-2 cursor-pointer",
                    selectedTarget.requestRaised ? "bg-emerald-950/60 border-emerald-500/60 text-emerald-200" : "bg-[#051426] border-[#0E3560] text-slate-300"
                  )}
                >
                  <CheckSquare className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span>Request Raised</span>
                </button>

                <button
                  type="button"
                  onClick={() => updateTargetFlag(selectedTarget.id, "addedToIep", !selectedTarget.addedToIep)}
                  className={cn(
                    "p-2 rounded-lg border text-left text-xs font-semibold flex items-center gap-2 cursor-pointer",
                    selectedTarget.addedToIep ? "bg-emerald-950/60 border-emerald-500/60 text-emerald-200" : "bg-[#051426] border-[#0E3560] text-slate-300"
                  )}
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span>Added to IEP</span>
                </button>

                <button
                  type="button"
                  onClick={() => updateTargetFlag(selectedTarget.id, "pwnNeeded", !selectedTarget.pwnNeeded)}
                  className={cn(
                    "p-2 rounded-lg border text-left text-xs font-semibold flex items-center gap-2 cursor-pointer",
                    selectedTarget.pwnNeeded ? "bg-rose-950/60 border-rose-500/60 text-rose-200" : "bg-[#051426] border-[#0E3560] text-slate-300"
                  )}
                >
                  <Flag className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>PWN Needed</span>
                </button>

                <button
                  type="button"
                  onClick={() => updateTargetFlag(selectedTarget.id, "followUpNeeded", !selectedTarget.followUpNeeded)}
                  className={cn(
                    "p-2 rounded-lg border text-left text-xs font-semibold flex items-center gap-2 cursor-pointer",
                    selectedTarget.followUpNeeded ? "bg-amber-950/60 border-amber-500/60 text-amber-200" : "bg-[#051426] border-[#0E3560] text-slate-300"
                  )}
                >
                  <ArrowRight className="h-4 w-4 shrink-0 text-[#F5B544]" />
                  <span>Follow-Up</span>
                </button>
              </div>
            </div>

            {/* Advocate Say This */}
            <div className="space-y-1">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-blue-300">
                🗣 Advocate Say This
              </span>
              <p className="text-sm font-semibold text-white bg-[#051426] p-3 rounded-xl border border-[#0E3560] leading-relaxed">
                "{selectedTarget.quickAdvocateSayThis}"
              </p>
            </div>

            {/* Put It Here & Possible Wording */}
            <div className="space-y-1">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-blue-300">
                ✍ Put It Here / IEP Location
              </span>
              <p className="text-xs text-blue-200 font-mono bg-[#051426] p-2.5 rounded-xl border border-[#0E3560]">
                {selectedTarget.putItHereLocation}
              </p>
            </div>

            {selectedTarget.possibleIepWording && (
              <div className="space-y-1">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-blue-300">
                  💬 Proposed IEP Wording
                </span>
                <p className="text-xs text-blue-100 bg-[#051426] p-2.5 rounded-xl border border-[#0E3560] leading-relaxed">
                  {selectedTarget.possibleIepWording}
                </p>
              </div>
            )}

            {/* Why & Evidence */}
            <div className="space-y-1">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-blue-300">
                💡 Why We Want It
              </span>
              <p className="text-xs text-blue-100 bg-[#051426] p-2.5 rounded-xl border border-[#0E3560] leading-relaxed">
                {selectedTarget.whyWeWantIt}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-blue-300">
                📊 Supporting Evidence
              </span>
              <p className="text-xs text-blue-100 bg-[#051426] p-2.5 rounded-xl border border-[#0E3560] leading-relaxed">
                {selectedTarget.supportingEvidence}
              </p>
            </div>

            {/* If Team Disagrees */}
            <div className="space-y-1">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-rose-300">
                🛡 If Team Disagrees
              </span>
              <p className="text-xs text-rose-100 bg-rose-950/30 p-2.5 rounded-xl border border-rose-500/30 leading-relaxed">
                {selectedTarget.ifTeamDisagrees}
              </p>
            </div>
          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-[#0F3D70] bg-[#051426] flex justify-end">
            <Button
              size="sm"
              onClick={() => setSelectedTargetId(null)}
              className="text-xs bg-[#0E427B] hover:bg-[#16569C] text-white font-bold cursor-pointer"
            >
              Close Details (Return to Quick List)
            </Button>
          </div>
        </div>
      )}

      {/* Add Target On The Fly Modal */}
      {showAddTargetModal && (
        <Dialog open={showAddTargetModal} onOpenChange={setShowAddTargetModal}>
          <DialogContent className="max-w-md bg-[#06172E] border border-[#144E8A] text-white shadow-2xl p-6">
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="h-4 w-4 text-[#F5B544]" />
              Add Target During Meeting
            </DialogTitle>
            <div className="space-y-3 pt-3 text-xs">
              <div>
                <label className="text-[11px] font-bold text-blue-300 uppercase block mb-1">Topic *</label>
                <Input
                  value={quickTopic}
                  onChange={(e) => setQuickTopic(e.target.value)}
                  placeholder="e.g. Sensory Break Routine"
                  className="h-8 text-xs bg-[#051426] border-[#124274] text-white"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-blue-300 uppercase block mb-1">Quick Say This</label>
                <Input
                  value={quickSayThis}
                  onChange={(e) => setQuickSayThis(e.target.value)}
                  placeholder="e.g. We're requesting a 5-min sensory break..."
                  className="h-8 text-xs bg-[#051426] border-[#124274] text-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-blue-300 uppercase block mb-1">IEP Section</label>
                <select
                  value={quickSection}
                  onChange={(e) => setQuickSection(e.target.value)}
                  className="w-full h-8 text-xs bg-[#051426] border border-[#124274] rounded-lg px-2 text-white focus:outline-none"
                >
                  {detectedOrder.map((sec) => (
                    <option key={sec} value={sec}>{sec}</option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter className="pt-4 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowAddTargetModal(false)} className="text-xs text-blue-300">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveQuickTarget} className="text-xs bg-[#F5B544] text-slate-950 font-bold">
                Add to Quick List
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Meeting Close-Out Modal */}
      {showCloseoutModal && (
        <Dialog open={showCloseoutModal} onOpenChange={setShowCloseoutModal}>
          <DialogContent className="max-w-2xl bg-[#06172E] border border-[#144E8A] text-white shadow-2xl p-0 overflow-hidden">
            <div className="p-6 border-b border-[#0F3D70] bg-gradient-to-r from-[#09254D] to-[#06172E]">
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-[#F5B544]">🚦</span>
                <span>Meeting Close-Out & Outcome Summary</span>
              </DialogTitle>
              <p className="text-xs text-blue-200/70 mt-1">
                Review unresolved targets, confirm PWN requests, and finalize meeting outcomes for {studentName}.
              </p>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4 text-xs">
              {/* Unresolved Targets */}
              {targets.filter((t) => !t.requestRaised || t.meetingStatus === "NOT_DISCUSSED").length > 0 && (
                <div className="rounded-xl bg-amber-950/30 border border-amber-500/40 p-3.5 space-y-2">
                  <p className="font-bold text-amber-300 uppercase tracking-wider text-[11px]">
                    ⚠️ Prepared Targets Not Discussed ({targets.filter((t) => !t.requestRaised).length})
                  </p>
                  {targets
                    .filter((t) => !t.requestRaised)
                    .map((t) => (
                      <div key={t.id} className="flex items-center justify-between text-xs text-blue-100">
                        <span>• {t.targetName} ({t.iepSection})</span>
                        <span className="text-[10.5px] text-amber-400 font-semibold">Not Raised</span>
                      </div>
                    ))}
                </div>
              )}

              {/* PWN Needed */}
              {targets.filter((t) => t.pwnNeeded || t.meetingStatus === "DENIED").length > 0 && (
                <div className="rounded-xl bg-rose-950/30 border border-rose-500/40 p-3.5 space-y-2">
                  <p className="font-bold text-rose-300 uppercase tracking-wider text-[11px]">
                    🛡 Targets Flagged for Prior Written Notice (PWN)
                  </p>
                  {targets
                    .filter((t) => t.pwnNeeded || t.meetingStatus === "DENIED")
                    .map((t) => (
                      <div key={t.id} className="text-xs text-rose-100">
                        • <strong>{t.targetName}</strong>: {t.ifTeamDisagrees}
                      </div>
                    ))}
                </div>
              )}

              {/* Final Check Checklist */}
              <div className="rounded-xl bg-[#08203E] border border-[#144E8A] p-4 space-y-2.5">
                <p className="font-bold text-white uppercase tracking-wider text-[11px]">
                  Final Meeting Checklist
                </p>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={closeoutChecks.allRequestsRaised}
                    onChange={(e) => onUpdateCloseoutChecks({ ...closeoutChecks, allRequestsRaised: e.target.checked })}
                    className="rounded border-[#144E8A]"
                  />
                  <span>All prepared advocacy requests were raised to the team</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={closeoutChecks.pwnIdentified}
                    onChange={(e) => onUpdateCloseoutChecks({ ...closeoutChecks, pwnIdentified: e.target.checked })}
                    className="rounded border-[#144E8A]"
                  />
                  <span>Any denied requests clearly identified for Prior Written Notice</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={closeoutChecks.agreedLocationsClear}
                    onChange={(e) => onUpdateCloseoutChecks({ ...closeoutChecks, agreedLocationsClear: e.target.checked })}
                    className="rounded border-[#144E8A]"
                  />
                  <span>Agreed changes have a clear documented location in the IEP</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={closeoutChecks.followUpAssigned}
                    onChange={(e) => onUpdateCloseoutChecks({ ...closeoutChecks, followUpAssigned: e.target.checked })}
                    className="rounded border-[#144E8A]"
                  />
                  <span>Follow-up items have an assigned owner and review timeline</span>
                </label>
              </div>

              {/* Closing Notes */}
              <div>
                <label className="text-[11px] font-bold text-blue-300 uppercase block mb-1">
                  Advocate Closeout Notes
                </label>
                <textarea
                  value={closeoutNotes}
                  onChange={(e) => setCloseoutNotes(e.target.value)}
                  placeholder="Record any immediate reflections or next steps..."
                  rows={3}
                  className="w-full text-xs bg-[#051426] border border-[#124274] rounded-xl p-3 text-white focus:outline-none"
                />
              </div>
            </div>

            <DialogFooter className="p-4 border-t border-[#0F3D70] bg-[#051426] flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowCloseoutModal(false)} className="text-xs text-blue-300">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleFinalizeMeeting}
                disabled={isCompleting}
                className="text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-4 cursor-pointer shadow-lg"
              >
                {isCompleting ? "Finalizing Session..." : "Complete Meeting"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
