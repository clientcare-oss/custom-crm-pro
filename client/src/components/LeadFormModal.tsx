import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Calendar, Link2, ClipboardList, Info, Settings, ListChecks, CheckSquare, Square } from "lucide-react";
import { ALL_FIELDS, DEFAULT_FIELDS, type FieldKey } from "@/pages/DynamicForm";

interface LeadFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingForm?: {
    id: number;
    name: string;
    description?: string | null;
    schedulingEnabled: boolean;
    schedulingUrl?: string | null;
    schedulingLabel?: string | null;
    isActive: boolean;
    fields?: string | null;
  } | null;
  onSuccess: () => void;
}

interface FormState {
  name: string;
  description: string;
  schedulingEnabled: boolean;
  schedulingUrl: string;
  schedulingLabel: string;
  isActive: boolean;
  enabledFields: FieldKey[];
}

const EMPTY: FormState = {
  name: "",
  description: "",
  schedulingEnabled: false,
  schedulingUrl: "",
  schedulingLabel: "Schedule Your Consultation",
  isActive: true,
  enabledFields: [...DEFAULT_FIELDS],
};

// Group fields by step for display
const STEP_GROUPS = [
  { step: 1, label: "Parent / Guardian Info", fields: ALL_FIELDS.filter((f) => f.step === 1) },
  { step: 2, label: "Student Info", fields: ALL_FIELDS.filter((f) => f.step === 2) },
  { step: 3, label: "Challenges & Concerns", fields: ALL_FIELDS.filter((f) => f.step === 3) },
];

type Tab = "settings" | "questions";

export function LeadFormModal({ open, onOpenChange, editingForm, onSuccess }: LeadFormModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [activeTab, setActiveTab] = useState<Tab>("settings");
  const isEditing = !!editingForm;

  useEffect(() => {
    if (editingForm) {
      // Parse saved fields config
      let enabledFields: FieldKey[] = [...DEFAULT_FIELDS];
      if (editingForm.fields) {
        try {
          const parsed = JSON.parse(editingForm.fields);
          if (Array.isArray(parsed) && parsed.length > 0) {
            enabledFields = parsed as FieldKey[];
          }
        } catch { /* ignore */ }
      }
      setForm({
        name: editingForm.name ?? "",
        description: editingForm.description ?? "",
        schedulingEnabled: editingForm.schedulingEnabled ?? false,
        schedulingUrl: editingForm.schedulingUrl ?? "",
        schedulingLabel: editingForm.schedulingLabel ?? "Schedule Your Consultation",
        isActive: editingForm.isActive ?? true,
        enabledFields,
      });
    } else {
      setForm(EMPTY);
    }
    setActiveTab("settings");
  }, [editingForm, open]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleField = (key: FieldKey) => {
    const field = ALL_FIELDS.find((f) => f.key === key);
    if (field?.required) {
      toast.info(`"${field.label}" is required and cannot be disabled`);
      return;
    }
    setForm((prev) => ({
      ...prev,
      enabledFields: prev.enabledFields.includes(key)
        ? prev.enabledFields.filter((k) => k !== key)
        : [...prev.enabledFields, key],
    }));
  };

  const selectAllInStep = (step: number) => {
    const stepFields = ALL_FIELDS.filter((f) => f.step === step).map((f) => f.key);
    setForm((prev) => {
      const without = prev.enabledFields.filter((k) => !stepFields.includes(k));
      return { ...prev, enabledFields: [...without, ...stepFields] };
    });
  };

  const deselectAllInStep = (step: number) => {
    const requiredInStep = ALL_FIELDS.filter((f) => f.step === step && f.required).map((f) => f.key);
    setForm((prev) => ({
      ...prev,
      enabledFields: prev.enabledFields.filter((k) => {
        const field = ALL_FIELDS.find((f) => f.key === k);
        if (!field) return true;
        if (field.step !== step) return true;
        return requiredInStep.includes(k); // keep required fields
      }),
    }));
  };

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

    const payload = {
      name: form.name,
      description: form.description || undefined,
      schedulingEnabled: form.schedulingEnabled,
      schedulingUrl: form.schedulingUrl || undefined,
      schedulingLabel: form.schedulingLabel || undefined,
      isActive: form.isActive,
      fields: form.enabledFields,
    };

    if (isEditing) {
      updateMutation.mutate({ id: editingForm.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Preview slug
  const previewSlug = form.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  const enabledCount = form.enabledFields.length;
  const totalCount = ALL_FIELDS.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-accent" />
            {isEditing ? "Edit Form" : "Create New Lead Form"}
          </DialogTitle>
        </DialogHeader>

        {/* Tab Bar */}
        <div className="flex border-b border-border -mx-6 px-6">
          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "settings"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            Settings
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("questions")}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "questions"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <ListChecks className="w-3.5 h-3.5" />
            Questions
            <Badge variant="secondary" className="text-xs px-1.5 py-0 ml-1">
              {enabledCount}/{totalCount}
            </Badge>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "settings" && (
            <div className="space-y-5 py-4">
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
                      <p className="text-xs text-muted-foreground">Show a "Schedule a Session" step after form submission</p>
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
            </div>
          )}

          {activeTab === "questions" && (
            <div className="space-y-5 py-4">
              <p className="text-sm text-muted-foreground">
                Choose which questions appear on this form. Required fields (marked with <span className="text-destructive">*</span>) cannot be disabled.
              </p>

              {STEP_GROUPS.map((group) => {
                const groupEnabled = group.fields.filter((f) => form.enabledFields.includes(f.key)).length;
                const groupTotal = group.fields.length;
                const allSelected = groupEnabled === groupTotal;

                return (
                  <div key={group.step} className="border border-border/60 rounded-xl overflow-hidden">
                    {/* Group Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border/40">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">Step {group.step}: {group.label}</span>
                        <Badge variant="outline" className="text-xs">
                          {groupEnabled}/{groupTotal}
                        </Badge>
                      </div>
                      <button
                        type="button"
                        onClick={() => allSelected ? deselectAllInStep(group.step) : selectAllInStep(group.step)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                      >
                        {allSelected ? (
                          <><CheckSquare className="w-3.5 h-3.5" /> Deselect all</>
                        ) : (
                          <><Square className="w-3.5 h-3.5" /> Select all</>
                        )}
                      </button>
                    </div>

                    {/* Fields */}
                    <div className="divide-y divide-border/30">
                      {group.fields.map((field) => {
                        const isEnabled = form.enabledFields.includes(field.key);
                        return (
                          <div
                            key={field.key}
                            className={`flex items-center justify-between px-4 py-3 transition-colors ${
                              field.required ? "cursor-default" : "cursor-pointer hover:bg-muted/20"
                            }`}
                            onClick={() => !field.required && toggleField(field.key)}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{field.label}</span>
                              {field.required && (
                                <span className="text-destructive text-xs font-medium">Required</span>
                              )}
                            </div>
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={() => toggleField(field.key)}
                              disabled={field.required}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3">
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  <strong>Tip:</strong> The scheduling step (if enabled) always appears as the final step and is configured in the Settings tab.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border pt-4">
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
