import { useState } from "react";
import {
  LayoutTemplate, FilePlus2, FileText, Mail, ShoppingBag,
  PlusCircle, Wand2, Library, ArrowRight, Pencil, Trash2,
  Star, Package, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type SmartFile = {
  id: number;
  name: string;
  type: string;
  updatedAt: string;
  tags: string[];
};

type EmailTemplate = {
  id: number;
  name: string;
  subject: string;
  updatedAt: string;
  category: string;
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

const MOCK_EMAIL_TEMPLATES: EmailTemplate[] = [
  { id: 1, name: "Welcome Parent Email", subject: "Welcome to our program!", updatedAt: "May 1, 2026", category: "Onboarding" },
  { id: 2, name: "Meeting Reminder", subject: "Reminder: IEP Meeting Tomorrow", updatedAt: "Apr 22, 2026", category: "Reminders" },
  { id: 3, name: "Progress Update", subject: "Your child's progress update", updatedAt: "Apr 15, 2026", category: "Updates" },
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

// ─── Sub-views ────────────────────────────────────────────────────────────────

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

function EmailTemplates({ onBack }: { onBack: () => void }) {
  const [templates, setTemplates] = useState(MOCK_EMAIL_TEMPLATES);

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Delete "${name}"?`)) {
      setTemplates((t) => t.filter((x) => x.id !== id));
      toast.success("Email template deleted");
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
            <Mail className="h-5 w-5 text-blue-500" /> Email Templates
          </h2>
        </div>
        <Button size="sm" className="gap-2" onClick={() => toast.info("Feature coming soon")}>
          <PlusCircle className="h-4 w-4" /> New Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center border-dashed">
          <Mail className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No email templates yet</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {templates.map((tpl) => (
            <div key={tpl.id} className="group flex items-center gap-4 rounded-xl border bg-card px-4 py-3 hover:shadow-sm transition-shadow">
              <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                <Mail className="h-4 w-4 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{tpl.name}</p>
                <p className="text-xs text-muted-foreground truncate">Subject: {tpl.subject}</p>
              </div>
              <Badge variant="outline" className="text-xs shrink-0">{tpl.category}</Badge>
              <p className="text-xs text-muted-foreground shrink-0 hidden sm:block">Updated {tpl.updatedAt}</p>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => toast.info("Feature coming soon")} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => handleDelete(tpl.id, tpl.name)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
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
    count: MOCK_EMAIL_TEMPLATES.length,
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

export default function Templates() {
  const [view, setView] = useState<View>("hub");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

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

      {/* Four hub blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {HUB_BLOCKS.map((block) => {
          const Icon = block.icon;
          return (
            <button
              key={block.id}
              onClick={() => handleBlockClick(block.id)}
              className={`group text-left rounded-2xl border bg-card p-6 transition-all hover:shadow-lg ${block.accent} focus:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`h-12 w-12 rounded-xl ${block.iconBg} flex items-center justify-center`}>
                  <Icon className={`h-6 w-6 ${block.iconColor}`} />
                </div>
                {block.count !== null && (
                  <span className="text-xs font-semibold bg-muted px-2.5 py-1 rounded-full text-muted-foreground">
                    {block.count} {block.count === 1 ? "item" : "items"}
                  </span>
                )}
              </div>
              <h2 className="text-base font-semibold mb-1.5">{block.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{block.description}</p>
              <div className={`inline-flex items-center gap-1.5 text-sm font-medium ${block.iconColor} group-hover:gap-2.5 transition-all`}>
                {block.id === "create-smart-file" ? <Wand2 className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                {block.cta}
              </div>
            </button>
          );
        })}
      </div>

      {/* Create Smart File dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FilePlus2 className="h-5 w-5 text-emerald-500" />
              Create Smart File
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">How would you like to start?</p>
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => { setCreateDialogOpen(false); toast.info("Smart file editor coming soon"); }}
              className="group flex items-center gap-4 rounded-xl border-2 border-dashed p-4 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors text-left"
            >
              <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                <Pencil className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="font-semibold text-sm">Start from Scratch</p>
                <p className="text-xs text-muted-foreground mt-0.5">Blank canvas — build exactly what you need</p>
              </div>
            </button>
            <button
              onClick={() => { setCreateDialogOpen(false); toast.info("Template gallery coming soon"); }}
              className="group flex items-center gap-4 rounded-xl border-2 border-dashed p-4 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/10 transition-colors text-left"
            >
              <div className="h-10 w-10 rounded-lg bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center shrink-0">
                <Library className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                <p className="font-semibold text-sm">From Template Gallery</p>
                <p className="text-xs text-muted-foreground mt-0.5">Pick a pre-built template and customize it</p>
              </div>
            </button>
          </div>

          {/* Gallery preview */}
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Gallery Preview</p>
            <div className="grid grid-cols-3 gap-2">
              {GALLERY_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => { setCreateDialogOpen(false); toast.info("Template gallery coming soon"); }}
                  className="flex flex-col items-center gap-1.5 rounded-lg border p-2.5 hover:bg-accent/50 transition-colors text-center"
                >
                  <span className="text-xl">{tpl.icon}</span>
                  <p className="text-xs font-medium leading-tight">{tpl.name}</p>
                  <p className="text-xs text-muted-foreground">{tpl.category}</p>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
