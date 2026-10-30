import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Settings2,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Check,
  Sparkles,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import type { PipelineStageItem, PipelineGroupType } from "./types";

interface CustomizePipelineModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: PipelineStageItem[];
  onSaveStages: (updatedStages: PipelineStageItem[]) => void;
}

const COLOR_OPTIONS = [
  "#38BDF8", // Sky
  "#34D399", // Emerald
  "#F59E0B", // Amber
  "#F5B544", // Gold
  "#818CF8", // Indigo
  "#F87171", // Rose / Red
  "#2DD4BF", // Teal
  "#C084FC", // Purple
  "#94A3B8", // Slate
];

const CATEGORY_OPTIONS = [
  { value: "active", label: "Active Stage" },
  { value: "waiting", label: "Waiting / External Action" },
  { value: "escalation", label: "Escalation / Legal Dispute" },
  { value: "completed", label: "Completed / Outcome" },
  { value: "neutral", label: "Neutral / Holding" },
];

export function CustomizePipelineModal({
  open,
  onOpenChange,
  stages,
  onSaveStages,
}: CustomizePipelineModalProps) {
  const [stageList, setStageList] = useState<PipelineStageItem[]>(stages);
  const [newStageName, setNewStageName] = useState("");
  const [newStageColor, setNewStageColor] = useState("#38BDF8");
  const [newStageCategory, setNewStageCategory] = useState("active");
  const [newStageGroup, setNewStageGroup] =
    useState<PipelineGroupType>("active_project");

  React.useEffect(() => {
    setStageList(stages);
  }, [stages]);

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...stageList];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    updated.forEach((s, idx) => {
      s.order = idx + 1;
    });
    setStageList(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === stageList.length - 1) return;
    const updated = [...stageList];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    updated.forEach((s, idx) => {
      s.order = idx + 1;
    });
    setStageList(updated);
  };

  const handleRenameStage = (id: number, newName: string) => {
    setStageList((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              name: newName,
              slug: newName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            }
          : s
      )
    );
  };

  const handleGroupChange = (id: number, group: PipelineGroupType) => {
    setStageList((prev) =>
      prev.map((s) => (s.id === id ? { ...s, pipelineGroup: group } : s))
    );
  };

  const handleAddStage = () => {
    if (!newStageName.trim()) {
      toast.error("Please enter a stage name");
      return;
    }

    const newStage: PipelineStageItem = {
      id: Date.now(),
      name: newStageName.trim(),
      slug: newStageName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      order: stageList.length + 1,
      accentColor: newStageColor,
      iconName: "Compass",
      category: newStageCategory,
      pipelineGroup: newStageGroup,
      isArchived: false,
      isDefault: false,
    };

    setStageList([...stageList, newStage]);
    setNewStageName("");
    toast.success(`Stage "${newStage.name}" added to list`);
  };

  const handleToggleArchive = (id: number) => {
    setStageList(
      stageList.map((s) =>
        s.id === id ? { ...s, isArchived: !s.isArchived } : s
      )
    );
  };

  const handleDelete = (id: number) => {
    setStageList(stageList.filter((s) => s.id !== id));
  };

  const handleSave = () => {
    onSaveStages(stageList);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#05142B]/95 border-[#3A2C18] text-[#FFF4D4] shadow-[0_16px_48px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.06)] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-serif font-bold text-[#FFF4D4] flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-[#C5A059]" />
            Customize Advocacy Pipeline Stages
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2 max-h-[70vh] overflow-y-auto pr-1">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-[#C6B697]">
              Pipeline Stage Order, Names & Group Assignment
            </Label>

            <div className="space-y-2">
              {stageList.map((stage, idx) => (
                <div
                  key={stage.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 rounded-xl bg-[#020A17]/85 border border-[#3A2C18]"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: stage.accentColor }}
                    />
                    <Input
                      value={stage.name}
                      onChange={(e) =>
                        handleRenameStage(stage.id, e.target.value)
                      }
                      className="h-7 bg-[#000814] border-[#3A2C18] text-[#FFF4D4] text-xs font-serif font-bold px-2 rounded-lg max-w-[210px]"
                    />
                    <select
                      value={stage.pipelineGroup || "active_project"}
                      onChange={(e) =>
                        handleGroupChange(
                          stage.id,
                          e.target.value as PipelineGroupType
                        )
                      }
                      className="h-7 rounded-lg bg-[#000814] border border-[#3A2C18] text-[#C6B697] text-[11px] px-2 focus:outline-hidden focus:border-[#C5A059]"
                    >
                      <option value="opportunity">Opportunities</option>
                      <option value="active_project">Active Advocacy</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={idx === 0}
                      onClick={() => handleMoveUp(idx)}
                      className="h-7 w-7 p-0 text-[#A69371] hover:text-[#FFF4D4] hover:bg-[#07162B] cursor-pointer"
                      title="Move stage earlier"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={idx === stageList.length - 1}
                      onClick={() => handleMoveDown(idx)}
                      className="h-7 w-7 p-0 text-[#A69371] hover:text-[#FFF4D4] hover:bg-[#07162B] cursor-pointer"
                      title="Move stage later"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleArchive(stage.id)}
                      className="h-7 px-2 text-[11px] text-[#C6B697] hover:text-[#FFF4D4] hover:bg-[#07162B] cursor-pointer"
                    >
                      {stage.isArchived ? "Restore" : "Archive"}
                    </Button>
                    {!stage.isDefault && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(stage.id)}
                        className="h-7 w-7 p-0 text-rose-400 hover:text-rose-300 hover:bg-[#07162B] cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add New Custom Stage Form */}
          <div className="p-4 rounded-xl bg-[#020A17]/95 border border-[#3A2C18] space-y-3">
            <h4 className="text-xs font-bold text-[#FFF4D4] uppercase tracking-wider flex items-center gap-1.5 font-serif">
              <Plus className="h-3.5 w-3.5 text-[#C5A059]" />
              Add Custom Stage
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-[#C6B697] font-semibold">
                  Stage Name *
                </Label>
                <Input
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  placeholder="e.g. MDR Hearing, FBA Review..."
                  className="bg-[#000814] border-[#3A2C18] text-[#FFF4D4] text-xs focus:border-[#C5A059] rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-[#C6B697] font-semibold">
                  Pipeline Group
                </Label>
                <select
                  value={newStageGroup}
                  onChange={(e) =>
                    setNewStageGroup(e.target.value as PipelineGroupType)
                  }
                  className="w-full h-9 rounded-lg bg-[#000814] border border-[#3A2C18] text-[#FFF4D4] text-xs px-3 focus:outline-hidden focus:border-[#C5A059]"
                >
                  <option value="opportunity">Opportunities (Lead / Follow-Up)</option>
                  <option value="active_project">Projects / Active Advocacy</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-[#C6B697] font-semibold">
                  Workflow Category
                </Label>
                <select
                  value={newStageCategory}
                  onChange={(e) => setNewStageCategory(e.target.value)}
                  className="w-full h-9 rounded-lg bg-[#000814] border border-[#3A2C18] text-[#FFF4D4] text-xs px-3 focus:outline-hidden focus:border-[#C5A059]"
                >
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <Label className="text-xs text-[#C6B697] font-semibold">
                Accent Color
              </Label>
              <div className="flex items-center gap-2 flex-wrap">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewStageColor(color)}
                    className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center transition-transform hover:scale-110 cursor-pointer shadow-xs"
                    style={{ backgroundColor: color }}
                  >
                    {newStageColor === color && (
                      <Check className="h-3 w-3 text-black font-bold" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <Button
              size="sm"
              onClick={handleAddStage}
              className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)] hover:brightness-110 text-xs cursor-pointer"
            >
              Add Stage to List
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-[#3A2C18]">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] text-xs cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)] hover:brightness-110 text-xs cursor-pointer"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
