import React, { useState } from "react";
import { Sparkles, Map as MapIcon, Plus, Pencil, Trash2, Copy, Check, Eye, PlayCircle, Layers, ArrowUpDown, ChevronDown, ChevronRight, FileCheck, Shield, User, HelpCircle, Loader2, Download, HeartHandshake, Printer, Mail, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { MeetingTarget } from "../types";
import { ReorganizeMeetingModal } from "./ReorganizeMeetingModal";
import { DeleteTargetModal } from "../DeleteTargetModal";
import { ParentFriendlyPreviewModal } from "./ParentFriendlyPreviewModal";
import { EmailBlueprintModal } from "./EmailBlueprintModal";
import { openPrintDialog } from "../print/PrintableMeetingDocument";
import { toast } from "sonner";

interface BlueprintViewProps {
  studentName: string;
  meetingType?: string;
  meetingDate?: string;
  clientEmail?: string;
  targets: MeetingTarget[];
  detectedOrder: string[];
  onUpdateTargets: (targets: MeetingTarget[]) => void;
  onUpdateDetectedOrder: (order: string[]) => void;
  onBuildBlueprint?: () => Promise<void>;
  onPreviewMeetingMode: () => void;
  onMarkReady: () => void;
  onOpenImportModal?: () => void;
  isLoading?: boolean;
}

export function BlueprintView({
  studentName,
  meetingType = "Annual IEP Meeting",
  meetingDate = "Upcoming",
  clientEmail = "",
  targets,
  detectedOrder,
  onUpdateTargets,
  onUpdateDetectedOrder,
  onBuildBlueprint,
  onPreviewMeetingMode,
  onMarkReady,
  onOpenImportModal,
  isLoading = false,
}: BlueprintViewProps) {
  const [showReorganizeModal, setShowReorganizeModal] = useState(false);
  const [showParentPreviewModal, setShowParentPreviewModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [editingTarget, setEditingTarget] = useState<MeetingTarget | null>(null);
  const [isNewTargetModal, setIsNewTargetModal] = useState(false);
  const [targetToDelete, setTargetToDelete] = useState<MeetingTarget | null>(null);
  const [expandedSection, setExpandedSection] = useState<Record<string, boolean>>({});

  // Group targets by section
  const sectionMap = new Map<string, MeetingTarget[]>();
  
  // First seed with detectedOrder to preserve sequence
  detectedOrder.forEach((sec) => sectionMap.set(sec, []));
  
  // Place targets into buckets
  targets.forEach((t) => {
    const sec = t.iepSection || "General";
    if (!sectionMap.has(sec)) {
      sectionMap.set(sec, []);
    }
    sectionMap.get(sec)!.push(t);
  });

  const toggleSection = (section: string) => {
    setExpandedSection((prev) => ({
      ...prev,
      [section]: prev[section] === undefined ? false : !prev[section],
    }));
  };

  const handleConfirmDelete = (id: string) => {
    onUpdateTargets(targets.filter((t) => t.id !== id));
    toast.success("Target deleted");
  };

  const handleDuplicateTarget = (target: MeetingTarget) => {
    const copy: MeetingTarget = {
      ...target,
      id: `tgt-${Date.now()}`,
      targetName: `${target.targetName} (Copy)`,
      targetOrder: target.targetOrder + 1,
      isCustom: true,
    };
    onUpdateTargets([...targets, copy]);
  };

  const handleSaveTargetEdit = () => {
    if (!editingTarget) return;
    if (isNewTargetModal) {
      onUpdateTargets([...targets, editingTarget]);
    } else {
      onUpdateTargets(
        targets.map((t) => (t.id === editingTarget.id ? editingTarget : t))
      );
    }
    setEditingTarget(null);
    setIsNewTargetModal(false);
  };

  const handleAddNewTarget = (defaultSection?: string) => {
    const newTarget: MeetingTarget = {
      id: `manual-tgt-${Date.now()}`,
      targetName: "New Meeting Target",
      iepSection: defaultSection || detectedOrder[0] || "Accommodations / Supports",
      sectionOrder: 1,
      targetOrder: targets.length + 1,
      quickAdvocateSayThis: "We are requesting...",
      fullAdvocateScript: "",
      putItHereLocation: "IEP Section: Accommodations",
      possibleIepWording: "",
      whyWeWantIt: "",
      supportingEvidence: "",
      sources: ["Advocate Preparation"],
      ifTeamDisagrees: "Document decision in Prior Written Notice.",
      parentWhatWeWant: "",
      parentWhyWeWantIt: "",
      parentSupportingEvidence: "",
      meetingStatus: "NOT_DISCUSSED",
      requestRaised: false,
      pwnNeeded: false,
      addedToIep: false,
      followUpNeeded: false,
      isCustom: true,
    };
    setEditingTarget(newTarget);
    setIsNewTargetModal(true);
  };

  const handleReorganizeSave = (reorderedSections: string[], reorderedTargets: MeetingTarget[]) => {
    onUpdateDetectedOrder(reorderedSections);
    onUpdateTargets(reorderedTargets);
  };

  return (
    <div className="space-y-4">
      {/* Compact Top Action Bar (Small box, no awkward text wrapping) */}
      <div className="rounded-xl bg-[#05142B]/90 border border-[#3A2C18] p-2.5 sm:p-3 shadow-[0_8px_24px_rgba(0,0,0,0.85)] flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 flex-wrap min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="p-1 rounded-lg bg-[#020A17] border border-[#3A2C18] text-[#DFBE77] shrink-0">
              <MapIcon className="h-4 w-4" />
            </span>
            <h2 className="text-sm sm:text-base font-serif font-black text-[#FFF4D4] tracking-wide whitespace-nowrap">
              IEP Meeting Blueprint
            </h2>
          </div>
          <span className="text-[#3A2C18] hidden sm:inline">·</span>
          <span className="px-2 py-0.5 rounded-lg bg-[#020A17] border border-[#3A2C18] text-[11px] font-mono font-bold text-[#FFE394] shrink-0">
            {targets.length} Planned {targets.length === 1 ? "Target" : "Targets"}
          </span>
          <span className="text-[#3A2C18] hidden md:inline">·</span>
          <span className="text-xs text-[#C6B697] hidden md:inline truncate max-w-sm">
            1 Request · 1 IEP Location · 1 Team Decision
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowParentPreviewModal(true)}
            disabled={targets.length === 0}
            className="h-8 text-xs font-semibold border border-emerald-500/50 bg-[#021A10] text-emerald-300 hover:text-white hover:bg-emerald-950/60 hover:border-emerald-400 cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
            title="Open parent-facing preview with plain-language requests and evidence"
          >
            <HeartHandshake className="h-3.5 w-3.5 text-emerald-400" />
            <span>Parent Preview</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEmailModal(true)}
            disabled={targets.length === 0}
            className="h-8 text-xs font-semibold border border-teal-500/50 bg-[#021A1A] text-teal-300 hover:text-white hover:bg-teal-950/60 hover:border-teal-400 cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
            title="Email the parent-friendly Meeting Blueprint directly to the family"
          >
            <Mail className="h-3.5 w-3.5 text-teal-400" />
            <span>Email to Parent</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => openPrintDialog("PARENT_BLUEPRINT", studentName, meetingType, meetingDate, targets)}
            disabled={targets.length === 0}
            className="h-8 text-xs font-semibold border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] hover:border-[#C5A059]/60 cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
            title="Generate a compact, multi-target printer-friendly document / PDF"
          >
            <Printer className="h-3.5 w-3.5 text-[#DFBE77]" />
            <span>Print Blueprint</span>
          </Button>

          {onOpenImportModal && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenImportModal}
              className="h-8 text-xs font-semibold border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] hover:border-[#C5A059]/60 cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
              title="Paste or drop an Advocate Ready document"
            >
              <Download className="h-3.5 w-3.5 text-[#DFBE77]" />
              <span>Import</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowReorganizeModal(true)}
            className="h-8 text-xs font-semibold border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] hover:border-[#C5A059]/60 cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
          >
            <ArrowUpDown className="h-3.5 w-3.5 text-[#DFBE77]" />
            <span>Reorganize</span>
          </Button>

          <Button
            size="sm"
            onClick={onPreviewMeetingMode}
            disabled={targets.length === 0}
            className="h-8 text-xs font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)] hover:brightness-105 px-3.5 cursor-pointer inline-flex items-center gap-1.5 transition-all"
          >
            <PlayCircle className="h-3.5 w-3.5" />
            <span>Enter Meeting Mode</span>
          </Button>
        </div>
      </div>

      {/* 🧭 MEETING REMINDER (Advocate-Facing, Compact Small Box) */}
      <div className="rounded-xl bg-[#020A17]/90 border border-[#3A2C18] p-2.5 sm:p-3 shadow-md flex items-start gap-2.5">
        <span className="p-1 rounded-md bg-[#05142B] border border-[#3A2C18] text-[#DFBE77] shrink-0 mt-0.5">
          <Compass className="h-3.5 w-3.5" />
        </span>
        <div className="space-y-0.5 text-xs flex-1 min-w-0">
          <span className="font-serif font-bold text-[#FFE394] uppercase tracking-wider text-[11px] block">
            🧭 Meeting Reminder
          </span>
          <p className="text-[#C6B697] leading-relaxed text-[11.5px]">
            Every meeting is different. Depending on the discussion, time available, and decisions that need to be made, not every Target may be addressed in one meeting. It may be necessary to let the client know that some items will need to be continued at a reconvened meeting or addressed as the case progresses.
          </p>
        </div>
      </div>

      {/* Targets List Grouped by Section */}
      <div className="space-y-4">
        {Array.from(sectionMap.entries()).map(([section, sectionTargets]) => {
          if (sectionTargets.length === 0 && !detectedOrder.includes(section)) return null;

          const isCollapsed = expandedSection[section] === false;

          return (
            <div
              key={section}
              className="rounded-xl bg-[#05142B]/90 border border-[#3A2C18] overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.85)]"
            >
              {/* Section Header */}
              <div
                onClick={() => toggleSection(section)}
                className="px-5 py-3 bg-[#020A17] border-b border-[#3A2C18] flex items-center justify-between cursor-pointer hover:bg-[#071E3D]/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[#DFBE77]">
                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </span>
                  <h3 className="text-sm font-serif font-bold text-[#FFF4D4] uppercase tracking-wider flex items-center gap-2">
                    <span className="text-[#FFE394]">{section}</span>
                    <span className="text-[11px] font-mono text-[#A69371] font-normal">
                      ({sectionTargets.length} target{sectionTargets.length !== 1 ? "s" : ""})
                    </span>
                  </h3>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddNewTarget(section);
                  }}
                  className="text-xs text-[#D8C7A5] hover:text-[#FFF4D4] hover:bg-[#071E3D] h-7 px-2.5 inline-flex items-center gap-1 cursor-pointer border border-transparent hover:border-[#3A2C18]"
                >
                  <Plus className="h-3.5 w-3.5 text-[#DFBE77]" />
                  Add Target
                </Button>
              </div>

              {/* Section Targets */}
              {!isCollapsed && (
                <div className="p-4 space-y-3">
                  {sectionTargets.length === 0 ? (
                    <p className="text-xs text-[#A69371] italic py-2 text-center">
                      No active targets in this section. Click "+ Add Target" to assign one.
                    </p>
                  ) : (
                    sectionTargets.map((target) => (
                      <div
                        key={target.id}
                        className="rounded-xl border border-[#3A2C18] bg-[#020A17]/90 p-4 space-y-3 hover:border-[#C5A059]/60 transition-all shadow-[0_4px_16px_rgba(0,0,0,0.6)]"
                      >
                        {/* Target Header Row */}
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {target.externalTargetId && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#05142B] border border-[#3A2C18] text-[#FFE394] font-bold">
                                  {target.externalTargetId}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTarget(target);
                                  setIsNewTargetModal(false);
                                }}
                                className="inline-flex items-center gap-1.5 bg-[#05142B] hover:bg-[#071E3D] text-[#FFE394] border border-[#3A2C18] hover:border-[#C5A059]/60 text-xs font-bold px-2.5 py-0.5 rounded-full cursor-pointer transition-colors shadow-sm"
                                title="Click to edit topic title & details"
                              >
                                <span>🎯 {target.targetName}</span>
                                <Pencil className="h-3 w-3 text-[#DFBE77]" />
                              </button>
                              <span className="text-[11px] text-[#A69371] font-mono">
                                ✍ {target.putItHereLocation}
                              </span>
                            </div>

                            {/* Quick Say This */}
                            <div className="pt-1">
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-[#A69371] uppercase tracking-wider font-semibold text-[10.5px]">
                                  Quick Advocate Say This (Live Script)
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingTarget(target);
                                    setIsNewTargetModal(false);
                                  }}
                                  className="text-[11px] text-[#DFBE77] hover:text-[#FFE394] flex items-center gap-1 cursor-pointer font-medium"
                                  title="Edit phrasing / what to ask for"
                                >
                                  <Pencil className="h-3 w-3" />
                                  <span>Edit Phrasing</span>
                                </button>
                              </div>
                              <p className="text-sm font-semibold text-[#FFF4D4] mt-0.5 leading-snug">
                                &ldquo;{target.quickAdvocateSayThis}&rdquo;
                              </p>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTarget(target);
                                setIsNewTargetModal(false);
                              }}
                              title="Edit full target details"
                              className="p-1.5 rounded-lg text-xs text-[#D8C7A5] hover:text-[#FFF4D4] hover:bg-[#071E3D] transition-colors cursor-pointer inline-flex items-center gap-1"
                            >
                              <Pencil className="h-3.5 w-3.5 text-[#DFBE77]" />
                              <span className="text-[11px]">Edit</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDuplicateTarget(target)}
                              title="Duplicate target"
                              className="p-1.5 rounded-lg text-xs text-[#D8C7A5] hover:text-[#FFF4D4] hover:bg-[#071E3D] transition-colors cursor-pointer"
                            >
                              <Copy className="h-3.5 w-3.5 text-[#DFBE77]" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setTargetToDelete(target)}
                              title="Delete target"
                              className="p-1.5 rounded-lg text-xs text-[#D8C7A5] hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Rationale & Evidence Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-[#3A2C18]/60 text-xs">
                          <div className="rounded-lg bg-[#010812] p-2.5 border border-[#3A2C18]/60">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#FFE394] mb-0.5">
                              💡 Why We Want It
                            </p>
                            <p className="text-[#C6B697] text-[11.5px] leading-relaxed">
                              {target.whyWeWantIt || "No rationale specified."}
                            </p>
                          </div>

                          <div className="rounded-lg bg-[#010812] p-2.5 border border-[#3A2C18]/60">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#FFE394] mb-0.5">
                              📊 Supporting Evidence
                            </p>
                            <p className="text-[#C6B697] text-[11.5px] leading-relaxed">
                              {target.supportingEvidence || "No evidence attached."}
                            </p>
                          </div>
                        </div>

                        {/* Advocate Notes (if populated) */}
                        {target.notes && (
                          <div className="rounded-lg bg-[#05142B] p-2.5 border border-[#C5A059]/50 text-xs">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#FFE394] mb-0.5 flex items-center gap-1">
                              <span>📝</span>
                              <span>Advocate Notes / Strategy</span>
                            </p>
                            <p className="text-[#FFF4D4] text-[11.5px] leading-relaxed whitespace-pre-wrap">
                              {target.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Target Editor Dialog */}
      {editingTarget && (
        <Dialog open={Boolean(editingTarget)} onOpenChange={(open) => !open && setEditingTarget(null)}>
          <DialogContent className="max-w-3xl bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4] shadow-[0_16px_36px_rgba(0,0,0,0.9)] p-0 overflow-hidden">
            <div className="p-6 border-b border-[#3A2C18] bg-[#020A17]">
              <DialogTitle className="text-lg font-serif font-black text-[#FFF4D4] flex items-center gap-2">
                <span className="text-[#DFBE77]">🎯</span>
                <span>{isNewTargetModal ? "Create Meeting Target" : `Edit: ${editingTarget.targetName}`}</span>
              </DialogTitle>
              <p className="text-xs text-[#C6B697] mt-1">
                One Target = One Request, One IEP Location, One Team Decision.
              </p>
            </div>

            <div className="p-6 max-h-[65vh] overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-blue-300 uppercase block mb-1">Target Name *</label>
                  <Input
                    value={editingTarget.targetName}
                    onChange={(e) => setEditingTarget({ ...editingTarget, targetName: e.target.value })}
                    className="h-8 text-xs bg-[#051426] border-[#124274] text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-blue-300 uppercase block mb-1">IEP Section</label>
                  <Input
                    value={editingTarget.iepSection}
                    onChange={(e) => setEditingTarget({ ...editingTarget, iepSection: e.target.value })}
                    className="h-8 text-xs bg-[#051426] border-[#124274] text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#F5B544] uppercase block mb-1">
                  Quick Advocate Say This (One concise sentence for live meeting) *
                </label>
                <Input
                  value={editingTarget.quickAdvocateSayThis}
                  onChange={(e) => setEditingTarget({ ...editingTarget, quickAdvocateSayThis: e.target.value })}
                  placeholder="e.g. We are requesting a discrete help card..."
                  className="h-8 text-xs bg-[#051426] border-[#124274] text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-blue-300 uppercase block mb-1">
                  Put It Here / Exact IEP Location
                </label>
                <Input
                  value={editingTarget.putItHereLocation}
                  onChange={(e) => setEditingTarget({ ...editingTarget, putItHereLocation: e.target.value })}
                  placeholder="e.g. IEP Page 8, Supplementary Aids & Services"
                  className="h-8 text-xs bg-[#051426] border-[#124274] text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-blue-300 uppercase block mb-1">
                  Proposed IEP Wording
                </label>
                <Textarea
                  value={editingTarget.possibleIepWording}
                  onChange={(e) => setEditingTarget({ ...editingTarget, possibleIepWording: e.target.value })}
                  rows={2}
                  className="text-xs bg-[#051426] border-[#124274] text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-blue-300 uppercase block mb-1">Why We Want It</label>
                  <Textarea
                    value={editingTarget.whyWeWantIt}
                    onChange={(e) => setEditingTarget({ ...editingTarget, whyWeWantIt: e.target.value })}
                    rows={2}
                    className="text-xs bg-[#051426] border-[#124274] text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-blue-300 uppercase block mb-1">Supporting Evidence</label>
                  <Textarea
                    value={editingTarget.supportingEvidence}
                    onChange={(e) => setEditingTarget({ ...editingTarget, supportingEvidence: e.target.value })}
                    rows={2}
                    className="text-xs bg-[#051426] border-[#124274] text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-rose-300 uppercase block mb-1">
                  If Team Disagrees (Advocate Objection & PWN Strategy)
                </label>
                <Textarea
                  value={editingTarget.ifTeamDisagrees}
                  onChange={(e) => setEditingTarget({ ...editingTarget, ifTeamDisagrees: e.target.value })}
                  rows={2}
                  className="text-xs bg-[#051426] border-[#124274] text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#F5B544] uppercase block mb-1">
                  📝 Advocate Notes / Meeting Strategy Notes
                </label>
                <Textarea
                  value={editingTarget.notes || ""}
                  onChange={(e) => setEditingTarget({ ...editingTarget, notes: e.target.value })}
                  placeholder="Notes, team commitments, responses, or follow-up details..."
                  rows={2}
                  className="text-xs bg-[#051426] border-[#124274] text-white placeholder:text-slate-500"
                />
              </div>

              {/* Parent-Facing Section */}
              <div className="rounded-xl bg-[#092244] border border-[#164D87] p-3.5 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase">
                  <User className="h-4 w-4" />
                  <span>Parent Ready Projections (Parent-Safe Rationale)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[10px] text-blue-200 block mb-0.5">What We Want</label>
                    <Input
                      value={editingTarget.parentWhatWeWant}
                      onChange={(e) => setEditingTarget({ ...editingTarget, parentWhatWeWant: e.target.value })}
                      className="h-7 text-xs bg-[#051426] border-[#124274] text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-blue-200 block mb-0.5">Why We Want It</label>
                    <Input
                      value={editingTarget.parentWhyWeWantIt}
                      onChange={(e) => setEditingTarget({ ...editingTarget, parentWhyWeWantIt: e.target.value })}
                      className="h-7 text-xs bg-[#051426] border-[#124274] text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-blue-200 block mb-0.5">Parent Evidence</label>
                    <Input
                      value={editingTarget.parentSupportingEvidence}
                      onChange={(e) => setEditingTarget({ ...editingTarget, parentSupportingEvidence: e.target.value })}
                      className="h-7 text-xs bg-[#051426] border-[#124274] text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="p-4 border-t border-[#3A2C18] bg-[#020A17] flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditingTarget(null)} className="text-xs text-[#A69371] hover:text-[#FFF4D4] hover:bg-[#071E3D] cursor-pointer">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveTargetEdit} className="text-xs bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)] hover:brightness-105 cursor-pointer">
                Save Target
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Reorganize Meeting Modal */}
      <ReorganizeMeetingModal
        open={showReorganizeModal}
        onOpenChange={setShowReorganizeModal}
        detectedOrder={detectedOrder}
        targets={targets}
        onSaveOrder={handleReorganizeSave}
      />

      {/* Delete Target Confirmation Modal */}
      <DeleteTargetModal
        isOpen={!!targetToDelete}
        onClose={() => setTargetToDelete(null)}
        target={targetToDelete}
        onConfirmDelete={handleConfirmDelete}
      />

      {/* Parent-Friendly Preview Modal */}
      <ParentFriendlyPreviewModal
        isOpen={showParentPreviewModal}
        onClose={() => setShowParentPreviewModal(false)}
        studentName={studentName}
        meetingType={meetingType}
        meetingDate={meetingDate}
        targets={targets}
        clientEmail={clientEmail}
      />

      {/* Email Blueprint to Parent Modal */}
      <EmailBlueprintModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        studentName={studentName}
        meetingType={meetingType}
        meetingDate={meetingDate}
        targets={targets}
        clientEmail={clientEmail}
      />
    </div>
  );
}
