import { useState } from "react";
import {
  LayoutTemplate, FilePlus2, FileText, Mail, ShoppingBag,
  PlusCircle, Library, ArrowRight, Pencil, Trash2,
  Star, Package, ChevronRight, X, Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

// ─── Types ────────────────────────────────────────────────────────────────────

type SmartFile = {
  id: number;
  name: string;
  type: string;
  updatedAt: string;
  tags: string[];
};

type Purchasable = {
  id: number;
  name: string;
  price: string;
  description: string;
  badge?: string;
};

// ─── Mock data (placeholder until backend is wired) ───────────────────────────

const MOCK_SMART_FILES: SmartFile[] = [
  { id: 1, name: "IEP Meeting Agenda", type: "Document", updatedAt: "May 5, 2026", tags: ["IEP", "Meeting"] },
  { id: 2, name: "Evaluation Summary Report", type: "Report", updatedAt: "Apr 28, 2026", tags: ["Evaluation"] },
  { id: 3, name: "Progress Monitoring Log", type: "Log", updatedAt: "Apr 20, 2026", tags: ["Progress"] },
];

const MOCK_PURCHASABLES: Purchasable[] = [
  { id: 1, name: "IEP Starter Pack", price: "$49", description: "Complete set of IEP forms, templates, and guides for new advocates.", badge: "Popular" },
  { id: 2, name: "Evaluation Bundle", price: "$79", description: "Comprehensive evaluation templates, checklists, and report formats.", badge: "New" },
  { id: 3, name: "Parent Communication Kit", price: "$29", description: "Email templates, letter formats, and communication logs for parent outreach." },
];

const GALLERY_TEMPLATES = [
  { id: 1, name: "IEP Document", icon: "📋", category: "Special Ed" },
  { id: 2, name: "Meeting Agenda", icon: "📅", category: "Meetings" },
  { id: 3, name: "Evaluation Report", icon: "📊", category: "Evaluation" },
  { id: 4, name: "Progress Report", icon: "📈", category: "Progress" },
  { id: 5, name: "Accommodation Plan", icon: "🎯", category: "Planning" },
  { id: 6, name: "Behavior Plan", icon: "🧩", category: "Behavior" },
];

const EMAIL_CATEGORIES = [
  "Onboarding",
  "Reminders",
  "Follow-up",
  "Updates",
  "IEP",
  "Discovery",
  "General",
];

// ─── Email Template Form Dialog ───────────────────────────────────────────────

type TemplateFormData = {
  name: string;
  subject: string;
  body: string;
  category: string;
};

function EmailTemplateDialog({
  open,
  onClose,
  initial,
  onSave,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  initial?: TemplateFormData & { id?: number };
  onSave: (data: TemplateFormData) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<TemplateFormData>({
    name: initial?.name ?? "",
    subject: initial?.subject ?? "",
    body: initial?.body ?? "",
    category: initial?.category ?? "General",
  });

  // Reset form when dialog opens with new initial values
  const handleOpen = () => {
    setForm({
      name: initial?.name ?? "",
      subject: initial?.subject ?? "",
      body: initial?.body ?? "",
      category: initial?.category ?? "General",
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); else handleOpen(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-500" />
            {initial?.id ? "Edit Email Template" : "New Email Template"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Template Name</Label>
              <Input
                placeholder="e.g. IEP Meeting Reminder"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMAIL_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Subject Line</Label>
            <Input
              placeholder="e.g. Reminder: IEP Meeting on {{date}}"
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">Use {"{{name}}"}, {"{{date}}"}, {"{{student}}"} as merge tags</p>
          </div>

          <div className="space-y-1.5">
            <Label>Email Body</Label>
            <Textarea
              placeholder="Write your email body here..."
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              rows={12}
              className="font-mono text-sm resize-y"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button
              onClick={() => onSave(form)}
              disabled={saving || !form.name.trim() || !form.subject.trim()}
            >
              <Save className="h-4 w-4 mr-1" />
              {saving ? "Saving..." : "Save Template"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Email Templates Sub-view ─────────────────────────────────────────────────

function EmailTemplates({ onBack }: { onBack: () => void }) {
  const utils = trpc.useUtils();
  const { data: templates = [], isLoading } = trpc.emailTemplates.list.useQuery();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<(TemplateFormData & { id?: number }) | null>(null);

  const createMutation = trpc.emailTemplates.create.useMutation({
    onSuccess: () => {
      utils.emailTemplates.list.invalidate();
      setDialogOpen(false);
      setEditing(null);
      toast.success("Template created");
    },
    onError: () => toast.error("Failed to create template"),
  });

  const updateMutation = trpc.emailTemplates.update.useMutation({
    onSuccess: () => {
      utils.emailTemplates.list.invalidate();
      setDialogOpen(false);
      setEditing(null);
      toast.success("Template updated");
    },
    onError: () => toast.error("Failed to update template"),
  });

  const deleteMutation = trpc.emailTemplates.delete.useMutation({
    onSuccess: () => {
      utils.emailTemplates.list.invalidate();
      toast.success("Template deleted");
    },
    onError: () => toast.error("Failed to delete template"),
  });

  const handleNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const handleEdit = (tpl: any) => {
    setEditing({ id: tpl.id, name: tpl.name, subject: tpl.subject, body: tpl.body, category: tpl.category ?? "General" });
    setDialogOpen(true);
  };

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Delete "${name}"?`)) {
      deleteMutation.mutate({ id });
    }
  };

  const handleSave = (data: TemplateFormData) => {
    if (editing?.id) {
      updateMutation.mutate({ id: editing.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ChevronRight className="h-4 w-4 rotate-180" /> Back
          </button>
          <span className="text-muted-foreground">/</span>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-500" /> Email Templates
          </h2>
        </div>
        <Button size="sm" className="gap-2" onClick={handleNew}>
          <PlusCircle className="h-4 w-4" /> New Template
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl border bg-card animate-pulse" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center border-dashed">
          <Mail className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No email templates yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Click "New Template" to create your first one</p>
          <Button size="sm" className="mt-4 gap-2" onClick={handleNew}>
            <PlusCircle className="h-4 w-4" /> New Template
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {templates.map((tpl: any) => (
            <div key={tpl.id} className="group flex items-center gap-4 rounded-xl border bg-card px-4 py-3 hover:shadow-sm transition-shadow">
              <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                <Mail className="h-4 w-4 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{tpl.name}</p>
                <p className="text-xs text-muted-foreground truncate">Subject: {tpl.subject}</p>
              </div>
              {tpl.category && (
                <Badge variant="outline" className="text-xs shrink-0">{tpl.category}</Badge>
              )}
              <p className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                Updated {new Date(tpl.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </p>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleEdit(tpl)}
                  className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                  title="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(tpl.id, tpl.name)}
                  className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <EmailTemplateDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
        initial={editing ?? undefined}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}

// ─── Saved Smart Files Sub-view ───────────────────────────────────────────────

function SavedSmartFiles({ onBack }: { onBack: () => void }) {
  const [files, setFiles] = useState(MOCK_SMART_FILES);

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Delete "${name}"?`)) {
      setFiles((f) => f.filter((x) => x.id !== id));
      toast.success("Smart file deleted");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ChevronRight className="h-4 w-4 rotate-180" /> Back
          </button>
          <span className="text-muted-foreground">/</span>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-violet-500" /> Saved Smart Files
          </h2>
        </div>
        <Button size="sm" className="gap-2" onClick={() => toast.info("Feature coming soon")}>
          <PlusCircle className="h-4 w-4" /> New Smart File
        </Button>
      </div>

      {files.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center border-dashed">
          <FileText className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No smart files saved yet</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {files.map((file) => (
            <div key={file.id} className="group flex items-center gap-4 rounded-xl border bg-card px-4 py-3 hover:shadow-sm transition-shadow">
              <div className="h-9 w-9 rounded-lg bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4 text-violet-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{file.name}</p>
                <p className="text-xs text-muted-foreground">{file.type} · Updated {file.updatedAt}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {file.tags.map((t) => (
                  <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                ))}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => toast.info("Feature coming soon")} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => handleDelete(file.id, file.name)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Purchasables({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ChevronRight className="h-4 w-4 rotate-180" /> Back
          </button>
          <span className="text-muted-foreground">/</span>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-amber-500" /> Purchasables
          </h2>
        </div>
        <Button size="sm" className="gap-2" onClick={() => toast.info("Feature coming soon")}>
          <PlusCircle className="h-4 w-4" /> Add Item
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MOCK_PURCHASABLES.map((item) => (
          <div key={item.id} className="group relative rounded-xl border bg-card p-5 hover:shadow-md transition-shadow flex flex-col gap-3">
            {item.badge && (
              <span className={`absolute top-3 right-3 text-xs font-semibold px-2 py-0.5 rounded-full ${
                item.badge === "Popular" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" :
                "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
              }`}>
                {item.badge === "Popular" ? <><Star className="inline h-3 w-3 mr-0.5" />{item.badge}</> : item.badge}
              </span>
            )}
            <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
              <Package className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="font-semibold text-sm">{item.name}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.description}</p>
            </div>
            <div className="mt-auto flex items-center justify-between pt-2 border-t">
              <span className="text-lg font-bold text-foreground">{item.price}</span>
              <Button size="sm" variant="outline" onClick={() => toast.info("Feature coming soon")}>
                View Details
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Hub ─────────────────────────────────────────────────────────────────

type View = "hub" | "smart-files" | "create-smart-file" | "email-templates" | "purchasables";

export default function Templates() {
  const [view, setView] = useState<View>("hub");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: emailTemplatesList = [] } = trpc.emailTemplates.list.useQuery();

  const HUB_BLOCKS = [
    {
      id: "smart-files" as View,
      icon: FileText,
      iconBg: "bg-violet-50 dark:bg-violet-900/20",
      iconColor: "text-violet-500",
      accent: "hover:border-violet-300 dark:hover:border-violet-700",
      title: "Saved Smart Files",
      description: "Access and manage your saved smart document files — IEP forms, evaluation reports, progress logs, and more.",
      cta: "View Files",
      count: MOCK_SMART_FILES.length,
    },
    {
      id: "create-smart-file" as View,
      icon: FilePlus2,
      iconBg: "bg-emerald-50 dark:bg-emerald-900/20",
      iconColor: "text-emerald-500",
      accent: "hover:border-emerald-300 dark:hover:border-emerald-700",
      title: "Create Smart File",
      description: "Build a new smart file from scratch with a blank canvas, or jump-start with a pre-built template from the gallery.",
      cta: "Create Now",
      count: null,
    },
    {
      id: "email-templates" as View,
      icon: Mail,
      iconBg: "bg-blue-50 dark:bg-blue-900/20",
      iconColor: "text-blue-500",
      accent: "hover:border-blue-300 dark:hover:border-blue-700",
      title: "Email Templates",
      description: "Manage reusable email templates for parent communication, meeting reminders, progress updates, and outreach.",
      cta: "View Templates",
      count: emailTemplatesList.length,
    },
    {
      id: "purchasables" as View,
      icon: ShoppingBag,
      iconBg: "bg-amber-50 dark:bg-amber-900/20",
      iconColor: "text-amber-500",
      accent: "hover:border-amber-300 dark:hover:border-amber-700",
      title: "Purchasables",
      description: "Browse and manage purchasable document packs, template bundles, and resource kits available for your clients.",
      cta: "Browse Items",
      count: MOCK_PURCHASABLES.length,
    },
  ];

  const handleBlockClick = (id: View) => {
    if (id === "create-smart-file") {
      setCreateDialogOpen(true);
    } else {
      setView(id);
    }
  };

  if (view === "smart-files") return (
    <div className="p-6 max-w-4xl mx-auto">
      <SavedSmartFiles onBack={() => setView("hub")} />
    </div>
  );
  if (view === "email-templates") return (
    <div className="p-6 max-w-4xl mx-auto">
      <EmailTemplates onBack={() => setView("hub")} />
    </div>
  );
  if (view === "purchasables") return (
    <div className="p-6 max-w-4xl mx-auto">
      <Purchasables onBack={() => setView("hub")} />
    </div>
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
          <LayoutTemplate className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Templates</h1>
          <p className="text-sm text-muted-foreground">Your document hub — smart files, email templates, and more</p>
        </div>
      </div>

      {/* Hub blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        {HUB_BLOCKS.map((block) => {
          const Icon = block.icon;
          return (
            <button
              key={block.id}
              onClick={() => handleBlockClick(block.id)}
              className={`group text-left rounded-2xl border bg-card p-6 hover:shadow-md transition-all ${block.accent}`}
            >
              <div className="flex items-start gap-4">
                <div className={`h-11 w-11 rounded-xl ${block.iconBg} flex items-center justify-center shrink-0`}>
                  <Icon className={`h-5 w-5 ${block.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-base">{block.title}</p>
                    {block.count !== null && (
                      <span className="text-xs font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                        {block.count}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{block.description}</p>
                  <div className="flex items-center gap-1 mt-3 text-sm font-medium text-accent group-hover:gap-2 transition-all">
                    {block.cta} <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Template Gallery */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Library className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Template Gallery</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {GALLERY_TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => toast.info("Feature coming soon")}
              className="group flex flex-col items-center gap-2 rounded-xl border bg-card p-4 hover:shadow-sm hover:border-accent/40 transition-all text-center"
            >
              <span className="text-2xl">{t.icon}</span>
              <p className="text-xs font-medium leading-tight">{t.name}</p>
              <span className="text-[10px] text-muted-foreground">{t.category}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Create Smart File Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FilePlus2 className="h-5 w-5 text-emerald-500" /> Create Smart File
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Smart file creation is coming soon. You'll be able to build custom document templates with dynamic fields.</p>
          <Button className="mt-2" onClick={() => setCreateDialogOpen(false)}>Got it</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
