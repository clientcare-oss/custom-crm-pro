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
  GripVertical,
  Pencil,
  Trash2,
  Archive,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import type { PipelineStageItem } from "./types";

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

  React.useEffect(() => {
    setStageList(stages);
  }, [stages]);

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...stageList];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    // Re-assign order numbers
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
    // Re-assign order numbers
    updated.forEach((s, idx) => {
      s.order = idx + 1;
    });
    setStageList(updated);
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
      isArchived: false,
      isDefault: false,
    };

    setStageList([...stageList, newStage]);
    setNewStageName("");
    toast.success(`Stage "${newStage.name}" added to pipeline`);
  };

  const handleToggleArchive = (id: number) => {
    setStageList(
      stageList.map((s) => (s.id === id ? { ...s, isArchived: !s.isArchived } : s))
    );
  };

  const handleDelete = (id: number) => {
    setStageList(stageList.filter((s) => s.id !== id));
  };

  const handleSave = () => {
    onSaveStages(stageList);
    toast.success("Pipeline stages saved successfully");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#07162B] border-[#0E274D] text-slate-100 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-sky-400" />
            Customize Advocacy Pipeline Stages
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2 max-h-[70vh] overflow-y-auto pr-1">
          {/* Active Stages Reorder List */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Pipeline Stage Order & Settings
            </Label>

            <div className="space-y-2">
              {stageList.map((stage, idx) => (
                <div
                  key={stage.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#081F42] border border-[#0D366B]"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: stage.accentColor }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">{stage.name}</p>
                      <p className="text-[10px] text-slate-400 capitalize">
                        {stage.category} stage {stage.isArchived && "(Archived)"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={idx === 0}
                      onClick={() => handleMoveUp(idx)}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-white"
                      title="Move stage left/up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={idx === stageList.length - 1}
                      onClick={() => handleMoveDown(idx)}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-white"
                      title="Move stage right/down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleArchive(stage.id)}
                      className="h-7 px-2 text-[11px] text-slate-400 hover:text-white"
                    >
                      {stage.isArchived ? "Restore" : "Archive"}
                    </Button>
                    {!stage.isDefault && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(stage.id)}
                        className="h-7 w-7 p-0 text-rose-400 hover:text-rose-300"
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
          <div className="p-4 rounded-xl bg-[#081930] border border-[#0E2F5E] space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5 text-[#F5B544]" />
              Add Custom Stage
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Stage Name *</Label>
                <Input
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  placeholder="e.g. MDR Hearing, FBA Review..."
                  className="bg-[#0A1A33] border-[#0E274D] text-white text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Workflow Category</Label>
                <select
                  value={newStageCategory}
                  onChange={(e) => setNewStageCategory(e.target.value)}
                  className="w-full h-9 rounded-md bg-[#0A1A33] border border-[#0E274D] text-white text-xs px-3 focus:ring-1 focus:ring-[#F5B544]"
                >
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Color Swatches */}
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs text-slate-300">Accent Color</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewStageColor(color)}
                    className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center transition-transform hover:scale-110 cursor-pointer"
                    style={{ backgroundColor: color }}
                  >
                    {newStageColor === color && <Check className="h-3 w-3 text-black font-bold" />}
                  </button>
                ))}
              </div>
            </div>

            <Button
              size="sm"
              onClick={handleAddStage}
              className="bg-[#F5B544] text-[#07162B] hover:bg-[#F5B544]/90 font-bold text-xs"
            >
              Add Stage to List
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-[#0E274D] text-slate-300 hover:bg-white/[0.06] text-xs"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-[#F5B544] text-[#07162B] hover:bg-[#F5B544]/90 font-bold text-xs"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
