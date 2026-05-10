import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Calendar, Link2, ClipboardList, Info } from "lucide-react";

interface LeadFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingForm?: any | null;
  onSuccess: () => void;
}

interface FormState {
  name: string;
  description: string;
  schedulingEnabled: boolean;
  schedulingUrl: string;
  schedulingLabel: string;
  isActive: boolean;
}

const EMPTY: FormState = {
  name: "",
  description: "",
  schedulingEnabled: false,
  schedulingUrl: "",
  schedulingLabel: "Schedule Your Consultation",
  isActive: true,
};

export function LeadFormModal({ open, onOpenChange, editingForm, onSuccess }: LeadFormModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const isEditing = !!editingForm;

  useEffect(() => {
    if (editingForm) {
      setForm({
        name: editingForm.name ?? "",
        description: editingForm.description ?? "",
        schedulingEnabled: editingForm.schedulingEnabled ?? false,
        schedulingUrl: editingForm.schedulingUrl ?? "",
        schedulingLabel: editingForm.schedulingLabel ?? "Schedule Your Consultation",
        isActive: editingForm.isActive ?? true,
      });
    } else {
      setForm(EMPTY);
    }
  }, [editingForm, open]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const createMutation = trpc.leadForms.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Form created! Share at /form/${data.slug}`);
      onSuccess();
    },
    onError: (e) => toast.error("Failed to create form: " + e.message),
  });

  const updateMutation = trpc.leadForms.update.useMutation({
    onSuccess: () => {
      toast.success("Form updated!");
      onSuccess();
    },
    onError: (e) => toast.error("Failed to update form: " + e.message),
  });

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error("Form name is required");
      return;
    }
    if (form.schedulingEnabled && !form.schedulingUrl.trim()) {
      toast.error("Please enter a scheduling URL or disable the scheduling option");
      return;
    }

    if (isEditing) {
      updateMutation.mutate({
        id: editingForm.id,
        name: form.name,
        description: form.description || undefined,
        schedulingEnabled: form.schedulingEnabled,
        schedulingUrl: form.schedulingUrl || undefined,
        schedulingLabel: form.schedulingLabel || undefined,
        isActive: form.isActive,
      });
    } else {
      createMutation.mutate({
        name: form.name,
        description: form.description || undefined,
        schedulingEnabled: form.schedulingEnabled,
        schedulingUrl: form.schedulingUrl || undefined,
        schedulingLabel: form.schedulingLabel || undefined,
        isActive: form.isActive,
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Preview slug
  const previewSlug = form.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-accent" />
            {isEditing ? "Edit Form" : "Create New Lead Form"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Form Name */}
          <div className="space-y-1.5">
            <Label>Form Name <span className="text-destructive">*</span></Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g., IEP Consultation Request, Summer Program Intake"
            />
            {form.name && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Link2 className="w-3 h-3" />
                Public URL: <span className="font-mono">/form/{previewSlug || "..."}</span>
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Brief description of what this form is for..."
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Scheduling Option */}
          <div className="border border-border/60 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Include Scheduling Step</p>
                  <p className="text-xs text-muted-foreground">Show a "Schedule a Session" button after form submission</p>
                </div>
              </div>
              <Switch
                checked={form.schedulingEnabled}
                onCheckedChange={(v) => set("schedulingEnabled", v)}
              />
            </div>

            {form.schedulingEnabled && (
              <div className="space-y-3 pt-2 border-t border-border/40">
                <div className="space-y-1.5">
                  <Label className="text-sm">Scheduler URL <span className="text-destructive">*</span></Label>
                  <Input
                    value={form.schedulingUrl}
                    onChange={(e) => set("schedulingUrl", e.target.value)}
                    placeholder="https://calendly.com/waypoint/consultation"
                    type="url"
                  />
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Paste your Calendly, HoneyBook, or any booking link here
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Button Label</Label>
                  <Input
                    value={form.schedulingLabel}
                    onChange={(e) => set("schedulingLabel", e.target.value)}
                    placeholder="Schedule Your Consultation"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Form Active</p>
              <p className="text-xs text-muted-foreground">Inactive forms return a "not found" page</p>
            </div>
            <Switch
              checked={form.isActive}
              onCheckedChange={(v) => set("isActive", v)}
            />
          </div>

          {/* Info box */}
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">What this form includes:</p>
            <p className="text-xs text-muted-foreground">
              All custom forms use the same standard fields as the Public Intake Form — parent info, student info, and challenges — plus your optional scheduling step. Submissions automatically create contacts, a student profile, and a lead in your pipeline.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Saving..." : isEditing ? "Save Changes" : "Create Form"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
