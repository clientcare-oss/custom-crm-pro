import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTerminology, ICON_OPTIONS, type ProjectIconKey } from "@/contexts/TerminologyContext";
import { CheckCircle, Settings2, GraduationCap, Briefcase, FolderOpen, BookOpen, Users, Star, Heart, Target, Compass, ClipboardList, FileText, Layers, type LucideIcon } from "lucide-react";
import { toast } from "sonner";

const ICON_COMPONENT_MAP: Record<ProjectIconKey, LucideIcon> = {
  GraduationCap, Briefcase, FolderOpen, BookOpen, Users, Star, Heart, Target, Compass, ClipboardList, FileText, Layers,
};

export default function Settings() {
  const { projectLabel, setProjectLabel, presetOptions, projectIconKey, setProjectIconKey } = useTerminology();
  const [customValue, setCustomValue] = useState(
    presetOptions.some((o) => o.value === projectLabel) ? "" : projectLabel
  );
  const [selected, setSelected] = useState(
    presetOptions.some((o) => o.value === projectLabel) ? projectLabel : "__custom__"
  );

  const handleSelect = (value: string) => {
    setSelected(value);
    if (value !== "__custom__") {
      setProjectLabel(value);
      toast.success(`Label updated to "${value}"`);
    }
  };

  const handleCustomSave = () => {
    const trimmed = customValue.trim();
    if (!trimmed) {
      toast.error("Custom label cannot be empty");
      return;
    }
    setProjectLabel(trimmed);
    setSelected("__custom__");
    toast.success(`Label updated to "${trimmed}"`);
  };

  return (
    <div className="space-y-8 p-8 max-w-2xl">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
            <Settings2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        </div>
        <p className="text-muted-foreground">
          Customize how the CRM works for your business.
        </p>
      </div>

      {/* Terminology Section */}
      <Card className="rounded-xl border border-border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Terminology</CardTitle>
          <CardDescription>
            Choose the label used throughout the CRM for what you call a "Project". This
            affects the sidebar, page titles, and all headings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-3 text-sm font-semibold text-foreground">
              Current label:{" "}
              <span className="text-primary font-bold">{projectLabel}</span>
            </p>

            {/* Preset options */}
            <div className="grid gap-2 sm:grid-cols-2">
              {presetOptions.map((option) => {
                const isActive = selected === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => handleSelect(option.value)}
                    className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm font-medium transition-all text-left ${
                      isActive
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    <span>{option.label}</span>
                    {isActive && <CheckCircle className="h-4 w-4 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom label */}
          <div className="space-y-2 pt-2 border-t border-border">
            <label className="text-sm font-semibold">Custom label</label>
            <p className="text-xs text-muted-foreground">
              Enter any word that fits your workflow (e.g., "Enrollment", "Engagement", "File").
            </p>
            <div className="flex gap-2">
              <Input
                value={customValue}
                onChange={(e) => {
                  setCustomValue(e.target.value);
                  setSelected("__custom__");
                }}
                placeholder="e.g., Enrollment"
                className="flex-1"
              />
              <Button
                onClick={handleCustomSave}
                className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Apply
              </Button>
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-lg bg-muted/50 border border-border p-4 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Preview
            </p>
            <p className="text-sm text-foreground">
              Sidebar: <span className="font-semibold">{projectLabel}s</span>
            </p>
            <p className="text-sm text-foreground">
              Page title: <span className="font-semibold">{projectLabel} Management</span>
            </p>
            <p className="text-sm text-foreground">
              Dashboard card: <span className="font-semibold">Active {projectLabel}s</span>
            </p>
            <p className="text-sm text-foreground">
              Button: <span className="font-semibold">New {projectLabel}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Icon Picker Section */}
      <Card className="rounded-xl border border-border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Sidebar Icon</CardTitle>
          <CardDescription>
            Choose the icon shown next to the {projectLabel}s label in the sidebar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {ICON_OPTIONS.map((opt) => {
              const IconComp = ICON_COMPONENT_MAP[opt.key];
              const isActive = projectIconKey === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => {
                    setProjectIconKey(opt.key);
                    toast.success(`Icon updated to ${opt.label}`);
                  }}
                  title={opt.label}
                  className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-xs font-medium transition-all ${
                    isActive
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  <IconComp className="h-5 w-5" />
                  <span className="truncate w-full text-center">{opt.label}</span>
                  {isActive && <CheckCircle className="h-3 w-3 text-primary" />}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Business Info placeholder */}
      <Card className="rounded-xl border border-border shadow-sm opacity-60">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Business Information</CardTitle>
          <CardDescription>
            Business name, logo, and contact details — coming soon.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground italic">This section will be available in a future update.</p>
        </CardContent>
      </Card>
    </div>
  );
}
