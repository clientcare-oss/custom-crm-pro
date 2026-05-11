import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import VoiceInput from "@/components/VoiceInput";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import VoiceTextarea from "@/components/VoiceTextarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Sparkles, Plus, Pencil, Trash2, Eye, FileText, Compass, ListTodo,
  Info, Layers, Zap, Brain, BookOpen, Search, ClipboardList, AlertCircle,
  CheckCircle, Star, Target, MessageSquare, ChevronRight, Copy
} from "lucide-react";

// Available icons for AI buttons
const ICON_OPTIONS = [
  { name: "Sparkles", icon: Sparkles, label: "Sparkles" },
  { name: "Brain", icon: Brain, label: "Brain" },
  { name: "Zap", icon: Zap, label: "Zap" },
  { name: "Search", icon: Search, label: "Search" },
  { name: "FileText", icon: FileText, label: "Document" },
  { name: "BookOpen", icon: BookOpen, label: "Book" },
  { name: "ClipboardList", icon: ClipboardList, label: "Checklist" },
  { name: "Target", icon: Target, label: "Target" },
  { name: "AlertCircle", icon: AlertCircle, label: "Alert" },
  { name: "CheckCircle", icon: CheckCircle, label: "Check" },
  { name: "Star", icon: Star, label: "Star" },
  { name: "MessageSquare", icon: MessageSquare, label: "Message" },
  { name: "Layers", icon: Layers, label: "Layers" },
  { name: "Compass", icon: Compass, label: "Compass" },
  { name: "ListTodo", icon: ListTodo, label: "Todo" },
];

// Available colors
const COLOR_OPTIONS = [
  { name: "blue", label: "Blue", bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300" },
  { name: "purple", label: "Purple", bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-300" },
  { name: "green", label: "Green", bg: "bg-green-100", text: "text-green-700", border: "border-green-300" },
  { name: "orange", label: "Orange", bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300" },
  { name: "red", label: "Red", bg: "bg-red-100", text: "text-red-700", border: "border-red-300" },
  { name: "teal", label: "Teal", bg: "bg-teal-100", text: "text-teal-700", border: "border-teal-300" },
  { name: "pink", label: "Pink", bg: "bg-pink-100", text: "text-pink-700", border: "border-pink-300" },
  { name: "indigo", label: "Indigo", bg: "bg-indigo-100", text: "text-indigo-700", border: "border-indigo-300" },
];

const LOCATION_LABELS: Record<string, string> = {
  notes: "Notes Tab",
  compass: "Compass Tab",
  files: "Files Tab",
  tasks: "Tasks Tab",
  details: "Details Tab",
  any: "All Tabs",
};

const OUTPUT_LABELS: Record<string, string> = {
  note: "Save as Note",
  compass: "Update Compass",
  popup: "Show in Popup",
};

// Starter templates to seed
const STARTER_TEMPLATES = [
  {
    name: "Compare New vs Previous IEP",
    icon: "Search",
    color: "blue",
    location: "files" as const,
    outputTarget: "popup" as const,
    description: "Analyzes differences between the current IEP and the previous one, flagging regressions, new goals, and removed services.",
    promptTemplate: `You are a special education advocate reviewing IEP documents for {{studentName}} (Case ID: {{caseId}}).

Compare the following IEP information and identify:
1. REGRESSIONS - Services, goals, or supports that were reduced or removed
2. NEW GOALS - Goals that were added in the new IEP
3. REMOVED SERVICES - Any services present in the previous IEP that are missing now
4. CONCERNS - Any language changes that could weaken protections
5. POSITIVES - Improvements or additions that benefit the student

Current IEP / Context:
{{compassContent}}

Additional context:
{{extraContext}}

Provide a clear, organized analysis that a parent can understand. Use plain language and be specific about page numbers or section names when possible.`,
  },
  {
    name: "Draft Parent Summary",
    icon: "MessageSquare",
    color: "green",
    location: "compass" as const,
    outputTarget: "note" as const,
    description: "Summarizes the student's case compass into plain language a parent can easily understand.",
    promptTemplate: `You are a special education advocate writing a summary for the parent of {{studentName}} (Case ID: {{caseId}}).

Based on the following case information, write a clear, friendly summary that:
1. Explains the current status of the case in plain language
2. Describes what has been accomplished so far
3. Outlines the next steps and what to expect
4. Lists any action items the parent should be aware of
5. Highlights any upcoming deadlines or meetings

Case Compass Information:
{{compassContent}}

Write in a warm, professional tone. Avoid legal jargon. Keep it to 3-4 paragraphs maximum.`,
  },
  {
    name: "Identify Missing Services",
    icon: "AlertCircle",
    color: "orange",
    location: "notes" as const,
    outputTarget: "popup" as const,
    description: "Reviews the student's IEP and placement to flag services that may be missing or inadequate based on the student's needs.",
    promptTemplate: `You are a special education advocate reviewing services for {{studentName}} (Case ID: {{caseId}}).

Based on the following information, identify:
1. MISSING SERVICES - Services that appear needed but are not in the IEP
2. INADEQUATE FREQUENCY - Services that are present but may not be enough
3. MISSING SUPPORTS - Accommodations or modifications that should be considered
4. RELATED SERVICES - Speech, OT, PT, counseling, or other related services that may be warranted
5. PLACEMENT CONCERNS - Whether the current placement is appropriate

Student Information:
{{compassContent}}

Notes:
{{noteContent}}

Additional Context:
{{extraContext}}

Be specific and cite IDEA requirements where relevant. Provide actionable recommendations.`,
  },
];

function getIconComponent(iconName: string) {
  const found = ICON_OPTIONS.find(i => i.name === iconName);
  return found ? found.icon : Sparkles;
}

function getColorClasses(colorName: string) {
  const found = COLOR_OPTIONS.find(c => c.name === colorName);
  return found || COLOR_OPTIONS[0];
}

interface AiConnectionFormData {
  name: string;
  icon: string;
  color: string;
  location: "notes" | "compass" | "files" | "tasks" | "details" | "any";
  outputTarget: "note" | "compass" | "popup";
  promptTemplate: string;
  description: string;
  sortOrder: number;
}

const DEFAULT_FORM: AiConnectionFormData = {
  name: "",
  icon: "Sparkles",
  color: "blue",
  location: "notes",
  outputTarget: "popup",
  promptTemplate: "",
  description: "",
  sortOrder: 0,
};

export default function AiConnections() {
  const utils = trpc.useUtils();

  const { data: connections = [], isLoading } = trpc.aiConnections.list.useQuery();
  const createMutation = trpc.aiConnections.create.useMutation({
    onSuccess: () => {
      utils.aiConnections.list.invalidate();
      setIsDialogOpen(false);
      setFormData(DEFAULT_FORM);
      toast.success("AI Connection created — your new AI button is ready to use.");
    },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.aiConnections.update.useMutation({
    onSuccess: () => {
      utils.aiConnections.list.invalidate();
      setIsDialogOpen(false);
      setEditingId(null);
      setFormData(DEFAULT_FORM);
      toast.success("AI Connection updated");
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.aiConnections.delete.useMutation({
    onSuccess: () => {
      utils.aiConnections.list.invalidate();
      toast.success("AI Connection deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<AiConnectionFormData>(DEFAULT_FORM);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [seedingStarters, setSeedingStarters] = useState(false);

  const openCreate = () => {
    setEditingId(null);
    setFormData(DEFAULT_FORM);
    setIsDialogOpen(true);
  };

  const openEdit = (conn: any) => {
    setEditingId(conn.id);
    setFormData({
      name: conn.name,
      icon: conn.icon,
      color: conn.color,
      location: conn.location,
      outputTarget: conn.outputTarget,
      promptTemplate: conn.promptTemplate,
      description: conn.description || "",
      sortOrder: conn.sortOrder || 0,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error("Button name is required");
      return;
    }
    if (!formData.promptTemplate.trim()) {
      toast.error("Prompt template is required");
      return;
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleSeedStarters = async () => {
    setSeedingStarters(true);
    try {
      for (const tmpl of STARTER_TEMPLATES) {
        await createMutation.mutateAsync(tmpl);
      }
      toast.success("Starter templates added! 3 AI buttons are ready to use.");
    } catch (e: any) {
      toast.error("Error seeding starters: " + e.message);
    } finally {
      setSeedingStarters(false);
    }
  };

  const colorClasses = getColorClasses(formData.color);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-500" />
            AI Connections
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create AI-powered action buttons that appear on student pages. Each button runs a custom prompt with student context.
          </p>
        </div>
        <div className="flex gap-2">
          {connections.length === 0 && !isLoading && (
            <Button variant="outline" onClick={handleSeedStarters} disabled={seedingStarters}>
              <Layers className="h-4 w-4 mr-2" />
              {seedingStarters ? "Adding..." : "Add Starter Templates"}
            </Button>
          )}
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New AI Button
          </Button>
        </div>
      </div>

      {/* Template Variables Reference */}
      <Card className="mb-6 border-dashed border-blue-200 bg-blue-50/50">
        <CardContent className="pt-4 pb-3">
          <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1">
            <Info className="h-3 w-3" /> Available template variables — use these in your prompts:
          </p>
          <div className="flex flex-wrap gap-2">
            {["{{studentName}}", "{{caseId}}", "{{compassContent}}", "{{noteContent}}", "{{extraContext}}"].map(v => (
              <code key={v} className="text-xs bg-white border border-blue-200 rounded px-2 py-0.5 text-blue-800 font-mono">{v}</code>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            These are automatically replaced with the student's real data when you click the button on a student page.
          </p>
        </CardContent>
      </Card>

      {/* Connection Cards */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading AI connections...</div>
      ) : connections.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-xl">
          <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="font-semibold text-lg mb-1">No AI Buttons Yet</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Create your first AI button or add the starter templates to get going quickly.
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={handleSeedStarters} disabled={seedingStarters}>
              <Layers className="h-4 w-4 mr-2" />
              Add Starter Templates
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Custom Button
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {connections.map((conn: any) => {
            const IconComp = getIconComponent(conn.icon);
            const colors = getColorClasses(conn.color);
            return (
              <Card key={conn.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-4">
                    {/* Button Preview */}
                    <div className="flex-shrink-0">
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium ${colors.bg} ${colors.text} ${colors.border}`}>
                        <IconComp className="h-4 w-4" />
                        {conn.name}
                      </div>
                      <div className="mt-2 flex gap-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {LOCATION_LABELS[conn.location] || conn.location}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {OUTPUT_LABELS[conn.outputTarget] || conn.outputTarget}
                        </Badge>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {conn.description && (
                        <p className="text-sm text-muted-foreground mb-2">{conn.description}</p>
                      )}
                      <div className="bg-muted/50 rounded-lg p-3 border">
                        <p className="text-xs font-mono text-muted-foreground whitespace-pre-wrap line-clamp-4">
                          {conn.promptTemplate}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0 flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(conn)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteConfirmId(conn.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setEditingId(null); setFormData(DEFAULT_FORM); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit AI Button" : "Create AI Button"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Button Preview */}
            <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg border">
              <span className="text-xs text-muted-foreground font-medium">Preview:</span>
              {(() => {
                const IconComp = getIconComponent(formData.icon);
                const colors = getColorClasses(formData.color);
                return (
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium ${colors.bg} ${colors.text} ${colors.border}`}>
                    <IconComp className="h-4 w-4" />
                    {formData.name || "Button Name"}
                  </div>
                );
              })()}
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label>Button Name *</Label>
              <VoiceInput
                placeholder="e.g. Compare New vs Previous IEP"
                value={formData.name}
                onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>Description <span className="text-muted-foreground">(shown on management page)</span></Label>
              <VoiceInput
                placeholder="Brief description of what this button does"
                value={formData.description}
                onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            {/* Icon + Color row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Icon</Label>
                <div className="grid grid-cols-5 gap-1.5">
                  {ICON_OPTIONS.map(({ name, icon: IconComp, label }) => (
                    <button
                      key={name}
                      type="button"
                      title={label}
                      onClick={() => setFormData(f => ({ ...f, icon: name }))}
                      className={`p-2 rounded-lg border-2 flex items-center justify-center transition-colors ${
                        formData.icon === name
                          ? "border-primary bg-primary/10"
                          : "border-transparent hover:border-muted-foreground/30 hover:bg-muted"
                      }`}
                    >
                      <IconComp className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Color</Label>
                <div className="grid grid-cols-4 gap-1.5">
                  {COLOR_OPTIONS.map(({ name, label, bg, text, border }) => (
                    <button
                      key={name}
                      type="button"
                      title={label}
                      onClick={() => setFormData(f => ({ ...f, color: name }))}
                      className={`p-2 rounded-lg border-2 flex items-center justify-center text-xs font-medium ${bg} ${text} transition-all ${
                        formData.color === name ? `border-current ring-2 ring-offset-1 ring-current` : `${border} opacity-60 hover:opacity-100`
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Location + Output */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Appears In</Label>
                <Select value={formData.location} onValueChange={v => setFormData(f => ({ ...f, location: v as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="notes">Notes Tab</SelectItem>
                    <SelectItem value="compass">Compass Tab</SelectItem>
                    <SelectItem value="files">Files Tab</SelectItem>
                    <SelectItem value="tasks">Tasks Tab</SelectItem>
                    <SelectItem value="details">Details Tab</SelectItem>
                    <SelectItem value="any">All Tabs</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Output Goes To</Label>
                <Select value={formData.outputTarget} onValueChange={v => setFormData(f => ({ ...f, outputTarget: v as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popup">Show in Popup</SelectItem>
                    <SelectItem value="note">Save as Note</SelectItem>
                    <SelectItem value="compass">Update Compass</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Prompt Template */}
            <div className="space-y-1.5">
              <Label>Prompt Template *</Label>
              <div className="flex flex-wrap gap-1 mb-1.5">
                {["{{studentName}}", "{{caseId}}", "{{compassContent}}", "{{noteContent}}", "{{extraContext}}"].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setFormData(f => ({ ...f, promptTemplate: f.promptTemplate + v }))}
                    className="text-xs bg-blue-50 border border-blue-200 text-blue-700 rounded px-1.5 py-0.5 font-mono hover:bg-blue-100 transition-colors"
                    title={`Insert ${v}`}
                  >
                    + {v}
                  </button>
                ))}
              </div>
              <VoiceTextarea
                placeholder="Write your AI prompt here. Use {{studentName}}, {{compassContent}}, etc. to inject student data automatically."
                value={formData.promptTemplate}
                onChange={e => setFormData(f => ({ ...f, promptTemplate: e.target.value }))}
                className="min-h-[200px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Click the variable buttons above to insert them at the cursor position.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDialogOpen(false); setEditingId(null); setFormData(DEFAULT_FORM); }}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingId ? "Save Changes" : "Create Button"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete AI Button?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently remove this AI button. This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteConfirmId) {
                  deleteMutation.mutate({ id: deleteConfirmId });
                  setDeleteConfirmId(null);
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
