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
import { Plus, Check } from "lucide-react";
import { toast } from "sonner";
import type { PipelineStageItem } from "./types";

interface AddStageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddStage: (stage: Partial<PipelineStageItem>) => void;
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
  { value: "active", label: "Active Stage (Ongoing Case Work)" },
  { value: "waiting", label: "Waiting / External Action" },
  { value: "escalation", label: "Escalation / Formal Dispute" },
  { value: "completed", label: "Completed / Closed Case" },
  { value: "neutral", label: "Neutral / Holding" },
];

export function AddStageModal({ open, onOpenChange, onAddStage }: AddStageModalProps) {
  const [stageName, setStageName] = useState("");
  const [accentColor, setAccentColor] = useState("#38BDF8");
  const [category, setCategory] = useState("active");

  const handleSave = () => {
    if (!stageName.trim()) {
      toast.error("Please enter a stage name");
      return;
    }

    onAddStage({
      name: stageName.trim(),
      slug: stageName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      accentColor,
      category,
      iconName: "Compass",
      isArchived: false,
    });

    toast.success(`Stage "${stageName.trim()}" created!`);
    setStageName("");
    setAccentColor("#38BDF8");
    setCategory("active");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#07162B] border-[#0E274D] text-slate-100 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
            <Plus className="h-5 w-5 text-[#F5B544]" />
            Add Pipeline Stage
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300">Stage Name *</Label>
            <Input
              value={stageName}
              onChange={(e) => setStageName(e.target.value)}
              placeholder="e.g. IEP Transition, BIP Strategy, MDR..."
              className="bg-[#0A1A33] border-[#0E274D] text-white text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300">Workflow Category</Label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-9 rounded-md bg-[#0A1A33] border border-[#0E274D] text-white text-xs px-3 focus:ring-1 focus:ring-[#F5B544]"
            >
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 pt-1">
            <Label className="text-xs text-slate-300">Accent Color</Label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setAccentColor(color)}
                  className="w-7 h-7 rounded-full border border-white/20 flex items-center justify-center transition-transform hover:scale-110 cursor-pointer"
                  style={{ backgroundColor: color }}
                >
                  {accentColor === color && <Check className="h-3.5 w-3.5 text-black font-bold" />}
                </button>
              ))}
            </div>
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
            disabled={!stageName.trim()}
            className="bg-[#F5B544] text-[#07162B] hover:bg-[#F5B544]/90 font-bold text-xs"
          >
            Create Stage
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
