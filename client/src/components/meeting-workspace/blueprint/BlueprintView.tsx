import React, { useState } from "react";
import { Sparkles, Map as MapIcon, Plus, Pencil, Trash2, Copy, Check, Eye, PlayCircle, Layers, ArrowUpDown, ChevronDown, ChevronRight, FileCheck, Shield, User, HelpCircle, Loader2, Download, HeartHandshake, Printer } from "lucide-react";
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
      <div className="rounded-xl bg-[#092244]/90 border border-[#144A7E] p-2.5 sm:p-3 shadow-md flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 flex-wrap min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="p-1 rounded-md bg-amber-500/20 text-[#F5B544] shrink-0">
              <MapIcon className="h-4 w-4" />
            </span>
            <h2 className="text-sm sm:text-base font-bold text-white tracking-wide whitespace-nowrap">
              IEP Meeting Blueprint
            </h2>
          </div>
          <span className="text-blue-400/40 hidden sm:inline">·</span>
          <span className="px-2 py-0.5 rounded-md bg-[#06172E] border border-[#144E8A] text-[11px] font-mono font-bold text-amber-300 shrink-0">
            {targets.length} Planned {targets.length === 1 ? "Target" : "Targets"}
          </span>
          <span className="text-blue-400/40 hidden md:inline">·</span>
          <span className="text-xs text-blue-200/70 hidden md:inline truncate max-w-sm">
            1 Request · 1 IEP Location · 1 Team Decision
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowParentPreviewModal(true)}
            disabled={targets.length === 0}
            className="h-8 text-xs font-semibold border-emerald-500/50 bg-[#07241A] text-emerald-300 hover:text-white hover:bg-emerald-900/60 hover:border-emerald-400 cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
            title="Open parent-facing preview with plain-language requests and evidence"
          >
            <HeartHandshake className="h-3.5 w-3.5 text-emerald-400" />
            <span>Parent Preview</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => openPrintDialog("PARENT_BLUEPRINT", studentName, meetingType, meetingDate, targets)}
            disabled={targets.length === 0}
            className="h-8 text-xs font-semibold border-[#1E62A6] bg-[#0A2E59] text-blue-200 hover:text-white hover:border-[#F5B544]/60 cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
            title="Generate a compact, multi-target printer-friendly document / PDF"
          >
            <Printer className="h-3.5 w-3.5 text-[#F5B544]" />
            <span>Print Blueprint</span>
          </Button>

          {onOpenImportModal && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenImportModal}
              className="h-8 text-xs font-semibold border-[#1E62A6] bg-[#0A2E59] text-blue-200 hover:text-[#F5B544] hover:border-[#F5B544]/60 cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
              title="Paste or drop an Advocate Ready document"
            >
              <Download className="h-3.5 w-3.5 text-[#F5B544]" />
              <span>Import</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowReorganizeModal(true)}
            className="h-8 text-xs font-semibold border-[#1E62A6] bg-[#0A2E59] text-blue-200 hover:text-white hover:border-[#F5B544]/60 cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
          >
            <ArrowUpDown className="h-3.5 w-3.5 text-[#F5B544]" />
            <span>Reorganize</span>
          </Button>

          <Button
            size="sm"
            onClick={onPreviewMeetingMode}
            disabled={targets.length === 0}
            className="h-8 text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md px-3.5 cursor-pointer inline-flex items-center gap-1.5 border border-amber-400/40"
          >
            <PlayCircle className="h-3.5 w-3.5 text-slate-950" />
            <span>Enter Meeting Mode</span>
          </Button>
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
              className="rounded-2xl bg-[#071A33] border border-[#0F3D70] overflow-hidden shadow-lg"
            >
              {/* Section Header */}
              <div
                onClick={() => toggleSection(section)}
                className="px-5 py-3.5 bg-gradient-to-r from-[#09254D] to-[#071A33] border-b border-[#0F3D70] flex items-center justify-between cursor-pointer hover:bg-[#0C2D5A] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-blue-400">
                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </span>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="text-[#F5B544]">{section}</span>
                    <span className="text-[11px] font-mono text-blue-300/60 font-normal">
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
                  className="text-xs text-blue-300 hover:text-white hover:bg-white/10 h-7 px-2.5 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 text-[#F5B544]" />
                  Add Target
                </Button>
              </div>

              {/* Section Targets */}
              {!isCollapsed && (
                <div className="p-4 space-y-3">
                  {sectionTargets.length === 0 ? (
                    <p className="text-xs text-blue-300/50 italic py-2 text-center">
                      No active targets in this section. Click "+ Add Target" to assign one.
                    </p>
                  ) : (
                    sectionTargets.map((target) => (
                      <div
                        key={target.id}
                        className="rounded-xl border border-[#13457A] bg-[#092244] p-4 space-y-3 hover:border-[#1E68B8] transition-all shadow-md"
                      >
                        {/* Target Header Row */}
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {target.externalTargetId && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#071C3C] border border-[#175294] text-[#F5B544] font-bold">
                                  {target.externalTargetId}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTarget(target);
                                  setIsNewTargetModal(false);
                                }}
                                className="inline-flex items-center gap-1.5 bg-[#0E427B] hover:bg-[#135398] text-[#F5B544] border border-[#2368B2] hover:border-[#F5B544] text-xs font-bold px-2.5 py-0.5 rounded-full cursor-pointer transition-colors"
                                title="Click to edit topic title & details"
                              >
                                <span>🎯 {target.targetName}</span>
                                <Pencil className="h-3 w-3 text-amber-300" />
                              </button>
                              <span className="text-[11px] text-blue-200/70 font-mono">
                                ✍ {target.putItHereLocation}
                              </span>
                            </div>

                            {/* Quick Say This */}
                            <div className="pt-1">
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-blue-300/70 uppercase tracking-wider font-semibold text-[10.5px]">
                                  Quick Advocate Say This (Live Script)
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingTarget(target);
                                    setIsNewTargetModal(false);
                                  }}
                                  className="text-[11px] text-[#F5B544] hover:text-amber-300 flex items-center gap-1 cursor-pointer font-medium"
                                  title="Edit phrasing / what to ask for"
                                >
                                  <Pencil className="h-3 w-3" />
                                  <span>Edit Phrasing</span>
                                </button>
                              </div>
                              <p className="text-sm font-semibold text-white mt-0.5 leading-snug">
                                "{target.quickAdvocateSayThis}"
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
                              className="p-1.5 rounded-lg text-xs text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer inline-flex items-center gap-1"
                            >
                              <Pencil className="h-3.5 w-3.5 text-blue-400" />
                              <span className="text-[11px]">Edit</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDuplicateTarget(target)}
                              title="Duplicate target"
                              className="p-1.5 rounded-lg text-xs text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                            >
                              <Copy className="h-3.5 w-3.5 text-indigo-400" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setTargetToDelete(target)}
                              title="Delete target"
                              className="p-1.5 rounded-lg text-xs text-blue-200 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Rationale & Evidence Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-[#113E70]/70 text-xs">
                          <div className="rounded-lg bg-[#061830] p-2.5 border border-[#0E3560]">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-300/70 mb-0.5">
                              💡 Why We Want It
                            </p>
                            <p className="text-blue-100 text-[11.5px] leading-relaxed">
                              {target.whyWeWantIt || "No rationale specified."}
                            </p>
                          </div>

                          <div className="rounded-lg bg-[#061830] p-2.5 border border-[#0E3560]">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-300/70 mb-0.5">
                              📊 Supporting Evidence
                            </p>
                            <p className="text-blue-100 text-[11.5px] leading-relaxed">
                              {target.supportingEvidence || "No evidence attached."}
                            </p>
                          </div>
                        </div>

                        {/* Advocate Notes (if populated) */}
                        {target.notes && (
                          <div className="rounded-lg bg-[#061830] p-2.5 border border-amber-500/40 text-xs">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#F5B544] mb-0.5 flex items-center gap-1">
                              <span>📝</span>
                              <span>Advocate Notes / Strategy</span>
                            </p>
                            <p className="text-amber-100 text-[11.5px] leading-relaxed whitespace-pre-wrap">
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
          <DialogContent className="max-w-3xl bg-[#06172E] border border-[#144E8A] text-white shadow-2xl p-0 overflow-hidden">
            <div className="p-6 border-b border-[#0F3D70] bg-gradient-to-r from-[#09254D] to-[#06172E]">
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-[#F5B544]">🎯</span>
                <span>{isNewTargetModal ? "Create Meeting Target" : `Edit: ${editingTarget.targetName}`}</span>
              </DialogTitle>
              <p className="text-xs text-blue-200/70 mt-1">
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

            <DialogFooter className="p-4 border-t border-[#0F3D70] bg-[#051426] flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditingTarget(null)} className="text-xs text-blue-300">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveTargetEdit} className="text-xs bg-[#F5B544] hover:bg-amber-400 text-slate-950 font-bold">
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
    </div>
  );
}
