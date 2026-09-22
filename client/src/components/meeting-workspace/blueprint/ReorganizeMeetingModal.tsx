import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GripVertical, Plus, ChevronUp, ChevronDown, Trash2, RotateCcw, Check, Layers, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MeetingTarget } from "../types";

interface ReorganizeMeetingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detectedOrder: string[];
  targets: MeetingTarget[];
  onSaveOrder: (reorderedSections: string[], reorderedTargets: MeetingTarget[]) => void;
}

export function ReorganizeMeetingModal({
  open,
  onOpenChange,
  detectedOrder,
  targets,
  onSaveOrder,
}: ReorganizeMeetingModalProps) {
  const [sections, setSections] = useState<string[]>([]);
  const [localTargets, setLocalTargets] = useState<MeetingTarget[]>([]);
  const [newSectionName, setNewSectionName] = useState("");
  const [showAddSection, setShowAddSection] = useState(false);

  useEffect(() => {
    if (open) {
      // Gather all distinct sections from detected order + targets
      const targetSections = Array.from(new Set(targets.map((t) => t.iepSection)));
      const combined = Array.from(new Set([...detectedOrder, ...targetSections])).filter(Boolean);
      setSections(combined);
      setLocalTargets([...targets]);
    }
  }, [open, detectedOrder, targets]);

  // Section Reordering
  const moveSection = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= sections.length) return;
    const copy = [...sections];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, moved);
    setSections(copy);
  };

  // Target Reordering within section
  const moveTarget = (targetId: string, direction: "up" | "down") => {
    const target = localTargets.find((t) => t.id === targetId);
    if (!target) return;
    const sectionTargets = localTargets.filter((t) => t.iepSection === target.iepSection);
    const index = sectionTargets.findIndex((t) => t.id === targetId);
    const newIdx = direction === "up" ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= sectionTargets.length) return;

    // Swap positions
    const otherTarget = sectionTargets[newIdx];
    setLocalTargets(
      localTargets.map((t) => {
        if (t.id === target.id) return { ...t, targetOrder: otherTarget.targetOrder };
        if (t.id === otherTarget.id) return { ...t, targetOrder: target.targetOrder };
        return t;
      })
    );
  };

  const handleAddSection = () => {
    if (!newSectionName.trim()) return;
    if (!sections.includes(newSectionName.trim())) {
      setSections([...sections, newSectionName.trim()]);
    }
    setNewSectionName("");
    setShowAddSection(false);
  };

  const handleRenameSection = (oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName) return;
    setSections(sections.map((s) => (s === oldName ? newName.trim() : s)));
    setLocalTargets(
      localTargets.map((t) => (t.iepSection === oldName ? { ...t, iepSection: newName.trim() } : t))
    );
  };

  const handleReset = () => {
    setSections([...detectedOrder]);
    setLocalTargets([...targets]);
  };

  const handleSave = () => {
    // Reassign sectionOrder according to sections array
    const finalizedTargets = localTargets.map((t) => {
      const secIdx = sections.indexOf(t.iepSection);
      return {
        ...t,
        sectionOrder: secIdx !== -1 ? secIdx + 1 : 999,
      };
    });
    onSaveOrder(sections, finalizedTargets);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#06172E] border border-[#144E8A] text-white shadow-2xl p-0 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-[#0F3D70] bg-gradient-to-r from-[#09254D] to-[#06172E]">
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-[#F5B544]">↕</span>
            <span>Reorganize Meeting</span>
          </DialogTitle>
          <p className="text-xs text-blue-200/70 mt-1">
            Reorder sections or individual targets to match how you plan to navigate the IEP table. Changes synchronize to Meeting Mode, Advocate Ready, and Parent Ready.
          </p>
        </div>

        {/* Sections and Targets List */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
          {sections.map((section, secIdx) => {
            const sectionTargets = localTargets
              .filter((t) => t.iepSection === section)
              .sort((a, b) => a.targetOrder - b.targetOrder);

            return (
              <div
                key={section}
                className="rounded-xl bg-[#08203E] border border-[#124274] p-3 space-y-2.5 shadow-md"
              >
                {/* Section Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <GripVertical className="h-4 w-4 text-blue-400/50 shrink-0" />
                    <Input
                      defaultValue={section}
                      onBlur={(e) => handleRenameSection(section, e.target.value)}
                      className="h-7 text-xs font-bold text-[#F5B544] bg-[#051426] border-[#0E3560] px-2 w-full max-w-sm"
                    />
                    <span className="text-[10px] text-blue-300/60 font-mono">
                      ({sectionTargets.length} target{sectionTargets.length !== 1 ? "s" : ""})
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={secIdx === 0}
                      onClick={() => moveSection(secIdx, "up")}
                      className="p-1 rounded text-blue-300 hover:text-white hover:bg-white/10 disabled:opacity-20 cursor-pointer"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={secIdx === sections.length - 1}
                      onClick={() => moveSection(secIdx, "down")}
                      className="p-1 rounded text-blue-300 hover:text-white hover:bg-white/10 disabled:opacity-20 cursor-pointer"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Targets inside section */}
                {sectionTargets.length > 0 && (
                  <div className="pl-6 space-y-1.5 border-l-2 border-[#124274] ml-2">
                    {sectionTargets.map((target, tIdx) => (
                      <div
                        key={target.id}
                        className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#051528] border border-[#0F355E] text-xs text-white"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Target className="h-3 w-3 text-blue-400 shrink-0" />
                          <span className="font-medium truncate">{target.targetName}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={tIdx === 0}
                            onClick={() => moveTarget(target.id, "up")}
                            className="p-1 rounded text-blue-300 hover:text-white disabled:opacity-20 cursor-pointer"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            disabled={tIdx === sectionTargets.length - 1}
                            onClick={() => moveTarget(target.id, "down")}
                            className="p-1 rounded text-blue-300 hover:text-white disabled:opacity-20 cursor-pointer"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add Section */}
          {showAddSection ? (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-[#09244A] border border-blue-500/40">
              <Input
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="New section name (e.g. Behavioral Interventions)"
                className="h-8 text-xs bg-[#051426] border-[#16487A] text-white"
                autoFocus
              />
              <Button size="sm" onClick={handleAddSection} className="text-xs bg-[#F5B544] text-slate-950 font-bold">
                Add
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowAddSection(false)} className="text-xs text-blue-300">
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddSection(true)}
              className="text-xs border-dashed border-[#144E8A] bg-[#071A33] text-blue-200 hover:text-white w-full cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5 text-[#F5B544]" />
              Add Custom Section
            </Button>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#0F3D70] bg-[#051426] flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-xs text-blue-300 hover:text-white inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to Detected IEP Order
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs text-blue-300 hover:text-white cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              className="text-xs font-bold bg-[#F5B544] hover:bg-amber-400 text-slate-950 inline-flex items-center gap-1.5 shadow-lg cursor-pointer"
            >
              <Check className="h-3.5 w-3.5" />
              Save Order
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
