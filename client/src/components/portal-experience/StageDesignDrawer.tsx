import React, { useState, useEffect } from "react";
import { JourneyStage, JourneyStageCategory, JourneyStageStatus } from "./types";
import { InteractivePageIdPill } from "./InteractivePageIdPill";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Sliders, 
  Save, 
  Plus, 
  Trash2, 
  Sparkles, 
  CheckCircle2, 
  Layers, 
  Globe, 
  ExternalLink,
  Code2,
  HelpCircle
} from "lucide-react";
import { toast } from "sonner";

interface StageDesignDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage: JourneyStage | null;
  onSaveStage: (updatedStage: JourneyStage) => void;
}

export function StageDesignDrawer({
  open,
  onOpenChange,
  stage,
  onSaveStage
}: StageDesignDrawerProps) {
  const [formData, setFormData] = useState<JourneyStage | null>(null);
  const [newRequiredAction, setNewRequiredAction] = useState("");
  const [newAvailableAction, setNewAvailableAction] = useState("");

  useEffect(() => {
    if (stage) {
      setFormData({ ...stage });
    }
  }, [stage]);

  if (!formData) return null;

  const handleAddRequiredAction = () => {
    if (!newRequiredAction.trim()) return;
    setFormData({
      ...formData,
      requiredClientActions: [...formData.requiredClientActions, newRequiredAction.trim()]
    });
    setNewRequiredAction("");
  };

  const handleRemoveRequiredAction = (index: number) => {
    setFormData({
      ...formData,
      requiredClientActions: formData.requiredClientActions.filter((_, i) => i !== index)
    });
  };

  const handleAddAvailableAction = () => {
    if (!newAvailableAction.trim()) return;
    setFormData({
      ...formData,
      availableClientActions: [...formData.availableClientActions, newAvailableAction.trim()]
    });
    setNewAvailableAction("");
  };

  const handleRemoveAvailableAction = (index: number) => {
    setFormData({
      ...formData,
      availableClientActions: formData.availableClientActions.filter((_, i) => i !== index)
    });
  };

  const handleSave = () => {
    if (!formData) return;
    onSaveStage(formData);
    toast.success(`Stage ${formData.stepNumber} experience configuration saved!`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 bg-card border-border shadow-2xl">
        <DialogHeader className="border-b border-border/50 pb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                <Sliders className="h-5 w-5 text-primary" />
                Design Experience: Stage {formData.stepNumber}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Configure triggers, required actions, and linked portal pages for this client journey stage.
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2">
              <InteractivePageIdPill pageId={formData.pageId || `PG-027-S${formData.stepNumber}`} size="sm" />
              <Badge variant="outline" className="font-mono text-xs">
                {formData.stateEngineKey}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-4 text-xs">
          {/* Stage Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Stage Title</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="text-xs bg-background/80"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Category</Label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as JourneyStageCategory })}
                className="w-full h-9 rounded-md border border-input bg-background/80 px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="Discovery & Intake">Discovery & Intake</option>
                <option value="Plan & Checkout">Plan & Checkout</option>
                <option value="Progressive Onboarding">Progressive Onboarding</option>
                <option value="Active Service">Active Service</option>
                <option value="Account Lifecycle">Account Lifecycle</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Stage Experience Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="text-xs bg-background/80"
            />
          </div>

          {/* Trigger Condition */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Trigger / Entry Condition Rule
            </Label>
            <Input
              value={formData.triggerCondition}
              onChange={(e) => setFormData({ ...formData, triggerCondition: e.target.value })}
              className="text-xs bg-background/80"
              placeholder="e.g. Calendar booking confirmed, payment webhook received"
            />
          </div>

          {/* Associated Portal Page & Route */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/20 p-3 rounded-lg border border-border/40">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary" />
                Associated Portal Page
              </Label>
              <Input
                value={formData.associatedPortalPage}
                onChange={(e) => setFormData({ ...formData, associatedPortalPage: e.target.value })}
                className="text-xs bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-primary" />
                Portal Route Slug
              </Label>
              <Input
                value={formData.associatedRoute}
                onChange={(e) => setFormData({ ...formData, associatedRoute: e.target.value })}
                className="text-xs font-mono bg-background"
              />
            </div>
          </div>

          {/* Required Client Actions */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Required Client Actions ({formData.requiredClientActions.length})
              </span>
              <span className="text-[10px] text-muted-foreground">Client must complete before stage advances</span>
            </Label>

            <div className="space-y-1.5">
              {formData.requiredClientActions.map((action, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2 p-2 rounded bg-muted/40 border border-border/30">
                  <span className="text-xs text-foreground flex-1">• {action}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveRequiredAction(idx)}
                    className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <Input
                value={newRequiredAction}
                onChange={(e) => setNewRequiredAction(e.target.value)}
                placeholder="Add required client action..."
                className="text-xs bg-background/80 h-8"
                onKeyDown={(e) => e.key === "Enter" && handleAddRequiredAction()}
              />
              <Button size="sm" onClick={handleAddRequiredAction} className="h-8 text-xs shrink-0">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>
          </div>

          {/* Available Client Actions */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                Available Client Actions ({formData.availableClientActions.length})
              </span>
              <span className="text-[10px] text-muted-foreground">Optional actions open to client in this stage</span>
            </Label>

            <div className="space-y-1.5">
              {formData.availableClientActions.map((action, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2 p-2 rounded bg-muted/40 border border-border/30">
                  <span className="text-xs text-foreground flex-1">• {action}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveAvailableAction(idx)}
                    className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <Input
                value={newAvailableAction}
                onChange={(e) => setNewAvailableAction(e.target.value)}
                placeholder="Add optional client action..."
                className="text-xs bg-background/80 h-8"
                onKeyDown={(e) => e.key === "Enter" && handleAddAvailableAction()}
              />
              <Button size="sm" onClick={handleAddAvailableAction} className="h-8 text-xs shrink-0">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>
          </div>

          {/* Publication Status */}
          <div className="space-y-1.5 pt-2 border-t border-border/40">
            <Label className="text-xs font-semibold text-foreground">Publication Status</Label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="published"
                  checked={formData.status === "published"}
                  onChange={() => setFormData({ ...formData, status: "published" })}
                  className="text-primary"
                />
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  Published (Live in State Engine)
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="draft"
                  checked={formData.status === "draft"}
                  onChange={() => setFormData({ ...formData, status: "draft" })}
                  className="text-primary"
                />
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                  Draft (Under Administrative Review)
                </span>
              </label>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border/50 pt-4 flex items-center justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="text-xs">
            Cancel
          </Button>
          <Button onClick={handleSave} className="text-xs font-semibold gap-1.5 bg-primary text-primary-foreground">
            <Save className="h-3.5 w-3.5" />
            Save Stage Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
