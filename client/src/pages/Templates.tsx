import { useState, useEffect } from "react";
import {
  LayoutTemplate, FilePlus2, FileText, Mail, ShoppingBag,
  PlusCircle, Library, ArrowRight, Pencil, Trash2,
  Star, Package, ChevronRight, X, Save, Folder, FolderOpen,
  FolderPlus, MoreHorizontal, MoveRight, Inbox, Search, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RichTextEditor from "@/components/RichTextEditor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

// ─── Types ────────────────────────────────────────────────────────────────────

type SmartFile = { id: number; name: string; type: string; updatedAt: string; tags: string[] };
type Purchasable = { id: number; name: string; price: string; description: string; badge?: string };

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

const EMAIL_CATEGORIES = ["Onboarding", "Reminders", "Follow-up", "Updates", "IEP", "Discovery", "General"];

const FOLDER_COLORS: { value: string; label: string; bg: string; text: string; dot: string }[] = [
  // Blues
  { value: "blue-light",  label: "Light Blue",  bg: "bg-blue-50 dark:bg-blue-900/10",   text: "text-blue-400 dark:text-blue-300",   dot: "bg-blue-300" },
  { value: "blue",        label: "Blue",        bg: "bg-blue-50 dark:bg-blue-900/20",   text: "text-blue-600 dark:text-blue-400",   dot: "bg-blue-500" },
  { value: "blue-dark",   label: "Dark Blue",   bg: "bg-blue-100 dark:bg-blue-900/40",  text: "text-blue-800 dark:text-blue-300",   dot: "bg-blue-700" },
  // Greens
  { value: "green-light", label: "Light Green", bg: "bg-green-50 dark:bg-green-900/10",  text: "text-green-400 dark:text-green-300",  dot: "bg-green-300" },
  { value: "green",       label: "Green",       bg: "bg-green-50 dark:bg-green-900/20",  text: "text-green-600 dark:text-green-400",  dot: "bg-green-500" },
  { value: "green-dark",  label: "Dark Green",  bg: "bg-green-100 dark:bg-green-900/40", text: "text-green-800 dark:text-green-300",  dot: "bg-green-700" },
  // Purples
  { value: "purple-light",label: "Light Purple",bg: "bg-purple-50 dark:bg-purple-900/10", text: "text-purple-400 dark:text-purple-300", dot: "bg-purple-300" },
  { value: "purple",      label: "Purple",      bg: "bg-purple-50 dark:bg-purple-900/20", text: "text-purple-600 dark:text-purple-400", dot: "bg-purple-500" },
  { value: "purple-dark", label: "Dark Purple", bg: "bg-purple-100 dark:bg-purple-900/40",text: "text-purple-800 dark:text-purple-300", dot: "bg-purple-700" },
  // Amber/Orange
  { value: "amber-light", label: "Light Amber", bg: "bg-amber-50 dark:bg-amber-900/10",  text: "text-amber-400 dark:text-amber-300",  dot: "bg-amber-300" },
  { value: "amber",       label: "Amber",       bg: "bg-amber-50 dark:bg-amber-900/20",  text: "text-amber-600 dark:text-amber-400",  dot: "bg-amber-500" },
  { value: "orange",      label: "Orange",      bg: "bg-orange-50 dark:bg-orange-900/20", text: "text-orange-600 dark:text-orange-400", dot: "bg-orange-500" },
  // Reds/Rose
  { value: "rose-light",  label: "Light Rose",  bg: "bg-rose-50 dark:bg-rose-900/10",   text: "text-rose-400 dark:text-rose-300",   dot: "bg-rose-300" },
  { value: "rose",        label: "Rose",        bg: "bg-rose-50 dark:bg-rose-900/20",   text: "text-rose-600 dark:text-rose-400",   dot: "bg-rose-500" },
  { value: "red",         label: "Red",         bg: "bg-red-50 dark:bg-red-900/20",     text: "text-red-600 dark:text-red-400",     dot: "bg-red-500" },
  // Teal/Cyan
  { value: "teal-light",  label: "Light Teal",  bg: "bg-teal-50 dark:bg-teal-900/10",   text: "text-teal-400 dark:text-teal-300",   dot: "bg-teal-300" },
  { value: "teal",        label: "Teal",        bg: "bg-teal-50 dark:bg-teal-900/20",   text: "text-teal-600 dark:text-teal-400",   dot: "bg-teal-500" },
  { value: "cyan",        label: "Cyan",        bg: "bg-cyan-50 dark:bg-cyan-900/20",   text: "text-cyan-600 dark:text-cyan-400",   dot: "bg-cyan-500" },
  // Pinks/Fuchsia
  { value: "pink",        label: "Pink",        bg: "bg-pink-50 dark:bg-pink-900/20",   text: "text-pink-600 dark:text-pink-400",   dot: "bg-pink-500" },
  { value: "fuchsia",     label: "Fuchsia",     bg: "bg-fuchsia-50 dark:bg-fuchsia-900/20",text: "text-fuchsia-600 dark:text-fuchsia-400",dot: "bg-fuchsia-500" },
  // Neutrals
  { value: "slate",       label: "Slate",       bg: "bg-slate-50 dark:bg-slate-900/20",  text: "text-slate-600 dark:text-slate-400",  dot: "bg-slate-500" },
  { value: "zinc",        label: "Zinc",        bg: "bg-zinc-50 dark:bg-zinc-900/20",   text: "text-zinc-600 dark:text-zinc-400",   dot: "bg-zinc-500" },
  // Indigo/Violet
  { value: "indigo",      label: "Indigo",      bg: "bg-indigo-50 dark:bg-indigo-900/20", text: "text-indigo-600 dark:text-indigo-400", dot: "bg-indigo-500" },
  { value: "violet",      label: "Violet",      bg: "bg-violet-50 dark:bg-violet-900/20", text: "text-violet-600 dark:text-violet-400", dot: "bg-violet-500" },
  // Yellow/Lime
  { value: "yellow",      label: "Yellow",      bg: "bg-yellow-50 dark:bg-yellow-900/20", text: "text-yellow-600 dark:text-yellow-400", dot: "bg-yellow-400" },
  { value: "lime",        label: "Lime",        bg: "bg-lime-50 dark:bg-lime-900/20",   text: "text-lime-600 dark:text-lime-400",   dot: "bg-lime-500" },
];

function getFolderStyle(color?: string | null) {
  return FOLDER_COLORS.find((c) => c.value === color) ?? FOLDER_COLORS[0];
}

// ─── Template Form Dialog ─────────────────────────────────────────────────────

type TemplateFormData = { name: string; subject: string; body: string; category: string; folderId: number | null };

function EmailTemplateDialog({
  open, onClose, initial, onSave, saving, folders,
}: {
  open: boolean;
  onClose: () => void;
  initial?: TemplateFormData & { id?: number };
  onSave: (data: TemplateFormData) => void;
  saving: boolean;
  folders: any[];
}) {
  const [form, setForm] = useState<TemplateFormData>({
    name: initial?.name ?? "",
    subject: initial?.subject ?? "",
    body: initial?.body ?? "",
    category: initial?.category ?? "General",
    folderId: initial?.folderId ?? null,
  });

  // Reset form whenever dialog opens or initial changes
  useEffect(() => {
    if (open) {
      setForm({
        name: initial?.name ?? "",
        subject: initial?.subject ?? "",
        body: initial?.body ?? "",
        category: initial?.category ?? "General",
        folderId: initial?.folderId ?? null,
      });
    }
  }, [open, initial]);

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (!v) onClose();
    }}>
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
              <Input placeholder="e.g. IEP Meeting Reminder" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Folder</Label>
              <Select value={form.folderId?.toString() ?? "none"} onValueChange={(v) => setForm((f) => ({ ...f, folderId: v === "none" ? null : Number(v) }))}>
                <SelectTrigger>
                  <SelectValue placeholder="No folder (Unfiled)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No folder (Unfiled)</SelectItem>
                  {folders.map((folder: any) => (
                    <SelectItem key={folder.id} value={folder.id.toString()}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Subject Line</Label>
            <Input placeholder="e.g. Reminder: IEP Meeting on {{date}}" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
            <p className="text-xs text-muted-foreground">Use {"{{name}}"}, {"{{date}}"}, {"{{student}}"} as merge tags</p>
          </div>
          <div className="space-y-1.5">
            <Label>Email Body</Label>
            <RichTextEditor
              content={form.body}
              onChange={(html: string) => setForm((f) => ({ ...f, body: html }))}
              placeholder="Write your email body here..."
              minHeight="250px"
              showInsertOptions={true}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving}><X className="h-4 w-4 mr-1" /> Cancel</Button>
            <Button onClick={() => onSave(form)} disabled={saving || !form.name.trim() || !form.subject.trim()}>
              <Save className="h-4 w-4 mr-1" />{saving ? "Saving..." : "Save Template"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Folder Form Dialog ───────────────────────────────────────────────────────

function FolderDialog({
  open, onClose, initial, onSave, saving,
}: {
  open: boolean;
  onClose: () => void;
  initial?: { id?: number; name: string; color: string };
  onSave: (name: string, color: string) => void;
  saving: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? "blue");

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); else { setName(initial?.name ?? ""); setColor(initial?.color ?? "blue"); } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-amber-500" />
            {initial?.id ? "Rename Folder" : "New Folder"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Folder Name</Label>
            <Input placeholder="e.g. IEP Templates" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Color & Brightness</Label>
            <div className="grid grid-cols-9 gap-1.5">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className={`h-6 w-6 rounded-full ${c.dot} ring-2 transition-all hover:scale-110 ${color === c.value ? "ring-foreground ring-offset-2 ring-offset-background" : "ring-transparent"}`}
                  title={c.label}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Light → Dark variants per color family</p>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose} disabled={saving}><X className="h-4 w-4 mr-1" /> Cancel</Button>
            <Button onClick={() => onSave(name, color)} disabled={saving || !name.trim()}>
              <Save className="h-4 w-4 mr-1" />{saving ? "Saving..." : initial?.id ? "Rename" : "Create Folder"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Email Templates View ─────────────────────────────────────────────────────

// "all" = show everything, null = unfiled, number = specific folder
type FolderFilter = "all" | null | number;

function EmailTemplates({ onBack }: { onBack: () => void }) {
  const utils = trpc.useUtils();
  const { data: folders = [] } = trpc.emailTemplates.folders.list.useQuery();
  const [activeFolder, setActiveFolder] = useState<FolderFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Build query input based on active folder
  const queryInput = activeFolder === "all" ? undefined : { folderId: activeFolder };
  const { data: templates = [], isLoading } = trpc.emailTemplates.list.useQuery(queryInput);

  // Filter templates by search query
  const filteredTemplates = searchQuery.trim()
    ? templates.filter((tpl: any) =>
        tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tpl.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tpl.category?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : templates;

  const [templateDialog, setTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<(TemplateFormData & { id?: number }) | null>(null);
  const [folderDialog, setFolderDialog] = useState(false);
  const [editingFolder, setEditingFolder] = useState<{ id?: number; name: string; color: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string; linked: boolean; automationNames: string[] } | null>(null);

  // Folder mutations
  const createFolder = trpc.emailTemplates.folders.create.useMutation({
    onSuccess: () => { utils.emailTemplates.folders.list.invalidate(); setFolderDialog(false); toast.success("Folder created"); },
    onError: () => toast.error("Failed to create folder"),
  });
  const renameFolder = trpc.emailTemplates.folders.rename.useMutation({
    onSuccess: () => { utils.emailTemplates.folders.list.invalidate(); setFolderDialog(false); setEditingFolder(null); toast.success("Folder renamed"); },
    onError: () => toast.error("Failed to rename folder"),
  });
  const deleteFolder = trpc.emailTemplates.folders.delete.useMutation({
    onSuccess: () => {
      utils.emailTemplates.folders.list.invalidate();
      utils.emailTemplates.list.invalidate();
      if (typeof activeFolder === "number") setActiveFolder("all");
      toast.success("Folder deleted — templates moved to Unfiled");
    },
    onError: () => toast.error("Failed to delete folder"),
  });

  // Template mutations
  const createTemplate = trpc.emailTemplates.create.useMutation({
    onSuccess: () => { utils.emailTemplates.list.invalidate(); setTemplateDialog(false); setEditingTemplate(null); toast.success("Template created"); },
    onError: () => toast.error("Failed to create template"),
  });
  const updateTemplate = trpc.emailTemplates.update.useMutation({
    onSuccess: () => { utils.emailTemplates.list.invalidate(); setTemplateDialog(false); setEditingTemplate(null); toast.success("Template updated"); },
    onError: () => toast.error("Failed to update template"),
  });
  const deleteTemplate = trpc.emailTemplates.delete.useMutation({
    onSuccess: () => { utils.emailTemplates.list.invalidate(); toast.success("Template deleted"); },
    onError: () => toast.error("Failed to delete template"),
  });
  const moveTemplate = trpc.emailTemplates.update.useMutation({
    onSuccess: () => { utils.emailTemplates.list.invalidate(); toast.success("Template moved"); },
    onError: () => toast.error("Failed to move template"),
  });

  const handleSaveFolder = (name: string, color: string) => {
    if (editingFolder?.id) {
      renameFolder.mutate({ id: editingFolder.id, name, color });
    } else {
      createFolder.mutate({ name, color });
    }
  };

  const handleSaveTemplate = (data: TemplateFormData) => {
    if (editingTemplate?.id) {
      updateTemplate.mutate({ id: editingTemplate.id, ...data });
    } else {
      createTemplate.mutate({ ...data, folderId: typeof activeFolder === "number" ? activeFolder : data.folderId });
    }
  };

  const folderSaving = createFolder.isPending || renameFolder.isPending;
  const templateSaving = createTemplate.isPending || updateTemplate.isPending;

  const activeFolderObj = typeof activeFolder === "number" ? folders.find((f: any) => f.id === activeFolder) : null;

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ChevronRight className="h-4 w-4 rotate-180" /> Back
          </button>
          <span className="text-muted-foreground">/</span>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-500" /> Email Templates
          </h2>
          {activeFolderObj && (
            <>
              <span className="text-muted-foreground">/</span>
              <span className="text-sm font-medium">{activeFolderObj.name}</span>
            </>
          )}
        </div>
        <Button size="sm" className="gap-2" onClick={() => { setEditingTemplate(null); setTemplateDialog(true); }}>
          <PlusCircle className="h-4 w-4" /> New Template
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search templates by name, subject, or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Layout: sidebar + content */}
      <div className="flex gap-4">
        {/* Folder Sidebar */}
        <div className="w-52 shrink-0 space-y-1">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Folders</span>
            <button
              onClick={() => { setEditingFolder(null); setFolderDialog(true); }}
              className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
              title="New folder"
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* All Templates */}
          <button
            onClick={() => setActiveFolder("all")}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              activeFolder === "all" ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            }`}
          >
            <LayoutTemplate className="h-4 w-4 shrink-0" />
            <span className="truncate">All Templates</span>
          </button>

          {/* Unfiled */}
          <button
            onClick={() => setActiveFolder(null)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              activeFolder === null ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            }`}
          >
            <Inbox className="h-4 w-4 shrink-0" />
            <span className="truncate">Unfiled</span>
          </button>

          {/* Folder list */}
          {folders.length > 0 && <div className="border-t my-2" />}
          {folders.map((folder: any) => {
            const style = getFolderStyle(folder.color);
            const isActive = activeFolder === folder.id;
            return (
              <div key={folder.id} className="group relative flex items-center">
                <button
                  onClick={() => setActiveFolder(folder.id)}
                  className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  }`}
                >
                  {isActive
                    ? <FolderOpen className={`h-4 w-4 shrink-0 ${style.text}`} />
                    : <Folder className={`h-4 w-4 shrink-0 ${style.text}`} />
                  }
                  <span className="truncate">{folder.name}</span>
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="absolute right-1 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-accent text-muted-foreground hover:text-foreground transition-opacity">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => { setEditingFolder({ id: folder.id, name: folder.name, color: folder.color ?? "blue" }); setFolderDialog(true); }}>
                      <Pencil className="h-3.5 w-3.5 mr-2" /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => {
                        if (confirm(`Delete folder "${folder.name}"? Templates inside will become unfiled.`)) {
                          deleteFolder.mutate({ id: folder.id });
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}

          {folders.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground/60 italic">No folders yet</p>
          )}
        </div>

        {/* Template List */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl border bg-card animate-pulse" />)}
            </div>
          ) : filteredTemplates.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-16 text-center border-dashed">
              <Mail className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                {activeFolder === "all" ? "No templates yet" : activeFolder === null ? "No unfiled templates" : "No templates in this folder"}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">Click "New Template" to create one</p>
              <Button size="sm" className="mt-4 gap-2" onClick={() => { setEditingTemplate(null); setTemplateDialog(true); }}>
                <PlusCircle className="h-4 w-4" /> New Template
              </Button>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredTemplates.map((tpl: any) => {
                const tplFolder = folders.find((f: any) => f.id === tpl.folderId);
                const folderStyle = tplFolder ? getFolderStyle(tplFolder.color) : null;
                return (
                  <div key={tpl.id} className="group flex items-center gap-3 rounded-xl border bg-card px-4 py-3 hover:shadow-sm transition-shadow">
                    <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                      <Mail className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{tpl.name}</p>
                      <p className="text-xs text-muted-foreground truncate">Subject: {tpl.subject}</p>
                    </div>
                    {/* Folder badge */}
                    {tplFolder && folderStyle && activeFolder === "all" && (
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${folderStyle.bg} ${folderStyle.text} shrink-0`}>
                        <Folder className="h-3 w-3" /> {tplFolder.name}
                      </span>
                    )}
                    {tpl.category && (
                      <Badge variant="outline" className="text-xs shrink-0">{tpl.category}</Badge>
                    )}
                    <p className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                      {new Date(tpl.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingTemplate({ id: tpl.id, name: tpl.name, subject: tpl.subject, body: tpl.body, category: tpl.category ?? "General", folderId: tpl.folderId ?? null }); setTemplateDialog(true); }} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {/* Move to folder dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="Move to folder">
                            <MoveRight className="h-3.5 w-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => moveTemplate.mutate({ id: tpl.id, folderId: null })}>
                            <Inbox className="h-3.5 w-3.5 mr-2" /> Unfiled
                          </DropdownMenuItem>
                          {folders.length > 0 && <DropdownMenuSeparator />}
                          {folders.map((f: any) => {
                            const s = getFolderStyle(f.color);
                            return (
                              <DropdownMenuItem key={f.id} onClick={() => moveTemplate.mutate({ id: tpl.id, folderId: f.id })}>
                                <Folder className={`h-3.5 w-3.5 mr-2 ${s.text}`} /> {f.name}
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <button onClick={async () => {
                        // Check automation usage before deleting
                        try {
                          const usage = await utils.emailTemplates.checkAutomationUsage.fetch({ id: tpl.id });
                          setDeleteConfirm({ id: tpl.id, name: tpl.name, linked: usage.linked, automationNames: usage.automationNames });
                        } catch {
                          setDeleteConfirm({ id: tpl.id, name: tpl.name, linked: false, automationNames: [] });
                        }
                      }} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <EmailTemplateDialog
        open={templateDialog}
        onClose={() => { setTemplateDialog(false); setEditingTemplate(null); }}
        initial={editingTemplate ?? undefined}
        onSave={handleSaveTemplate}
        saving={templateSaving}
        folders={folders}
      />
      <FolderDialog
        open={folderDialog}
        onClose={() => { setFolderDialog(false); setEditingFolder(null); }}
        initial={editingFolder ?? undefined}
        onSave={handleSaveFolder}
        saving={folderSaving}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(v) => { if (!v) setDeleteConfirm(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {deleteConfirm?.linked ? (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              ) : (
                <Trash2 className="h-5 w-5 text-red-500" />
              )}
              Delete Template
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {deleteConfirm?.linked ? (
              <>
                <p className="text-sm text-foreground">
                  This email template is currently used by an automation. Deleting it may prevent that automation from working correctly. Are you sure you want to continue?
                </p>
                {deleteConfirm.automationNames.length > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                    <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-1">Connected automations:</p>
                    <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-0.5">
                      {deleteConfirm.automationNames.map((name, i) => (
                        <li key={i} className="flex items-center gap-1">• {name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete "{deleteConfirm?.name}"? This action cannot be undone.
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (deleteConfirm) {
                    deleteTemplate.mutate({ id: deleteConfirm.id });
                    setDeleteConfirm(null);
                  }
                }}
              >
                {deleteConfirm?.linked ? "Delete Anyway" : "Delete"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Saved Smart Files ────────────────────────────────────────────────────────

function SavedSmartFiles({ onBack }: { onBack: () => void }) {
  const [files, setFiles] = useState(MOCK_SMART_FILES);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ChevronRight className="h-4 w-4 rotate-180" /> Back
          </button>
          <span className="text-muted-foreground">/</span>
          <h2 className="text-lg font-semibold flex items-center gap-2"><FileText className="h-5 w-5 text-violet-500" /> Saved Smart Files</h2>
        </div>
        <Button size="sm" className="gap-2" onClick={() => toast.info("Feature coming soon")}><PlusCircle className="h-4 w-4" /> New Smart File</Button>
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
                {file.tags.map((t) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => toast.info("Feature coming soon")} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => { if (confirm(`Delete "${file.name}"?`)) setFiles((f) => f.filter((x) => x.id !== file.id)); }} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
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
          <h2 className="text-lg font-semibold flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-amber-500" /> Purchasables</h2>
        </div>
        <Button size="sm" className="gap-2" onClick={() => toast.info("Feature coming soon")}><PlusCircle className="h-4 w-4" /> Add Item</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MOCK_PURCHASABLES.map((item) => (
          <div key={item.id} className="group relative rounded-xl border bg-card p-5 hover:shadow-md transition-shadow flex flex-col gap-3">
            {item.badge && (
              <span className={`absolute top-3 right-3 text-xs font-semibold px-2 py-0.5 rounded-full ${item.badge === "Popular" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"}`}>
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
              <Button size="sm" variant="outline" onClick={() => toast.info("Feature coming soon")}>View Details</Button>
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
    { id: "smart-files" as View, icon: FileText, iconBg: "bg-violet-50 dark:bg-violet-900/20", iconColor: "text-violet-500", accent: "hover:border-violet-300 dark:hover:border-violet-700", title: "Saved Smart Files", description: "Access and manage your saved smart document files — IEP forms, evaluation reports, progress logs, and more.", cta: "View Files", count: MOCK_SMART_FILES.length },
    { id: "create-smart-file" as View, icon: FilePlus2, iconBg: "bg-emerald-50 dark:bg-emerald-900/20", iconColor: "text-emerald-500", accent: "hover:border-emerald-300 dark:hover:border-emerald-700", title: "Create Smart File", description: "Build a new smart file from scratch with a blank canvas, or jump-start with a pre-built template from the gallery.", cta: "Create Now", count: null },
    { id: "email-templates" as View, icon: Mail, iconBg: "bg-blue-50 dark:bg-blue-900/20", iconColor: "text-blue-500", accent: "hover:border-blue-300 dark:hover:border-blue-700", title: "Email Templates", description: "Manage reusable email templates for parent communication, meeting reminders, progress updates, and outreach.", cta: "View Templates", count: emailTemplatesList.length },
    { id: "purchasables" as View, icon: ShoppingBag, iconBg: "bg-amber-50 dark:bg-amber-900/20", iconColor: "text-amber-500", accent: "hover:border-amber-300 dark:hover:border-amber-700", title: "Purchasables", description: "Browse and manage purchasable document packs, template bundles, and resource kits available for your clients.", cta: "Browse Items", count: MOCK_PURCHASABLES.length },
  ];

  if (view === "smart-files") return <div className="p-6 max-w-4xl mx-auto"><SavedSmartFiles onBack={() => setView("hub")} /></div>;
  if (view === "email-templates") return <div className="p-6 max-w-5xl mx-auto"><EmailTemplates onBack={() => setView("hub")} /></div>;
  if (view === "purchasables") return <div className="p-6 max-w-4xl mx-auto"><Purchasables onBack={() => setView("hub")} /></div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
          <LayoutTemplate className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Templates</h1>
          <p className="text-sm text-muted-foreground">Your document hub — smart files, email templates, and more</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        {HUB_BLOCKS.map((block) => {
          const Icon = block.icon;
          return (
            <button key={block.id} onClick={() => block.id === "create-smart-file" ? setCreateDialogOpen(true) : setView(block.id)} className={`group text-left rounded-2xl border bg-card p-6 hover:shadow-md transition-all ${block.accent}`}>
              <div className="flex items-start gap-4">
                <div className={`h-11 w-11 rounded-xl ${block.iconBg} flex items-center justify-center shrink-0`}>
                  <Icon className={`h-5 w-5 ${block.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-base">{block.title}</p>
                    {block.count !== null && <span className="text-xs font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">{block.count}</span>}
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

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Library className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Template Gallery</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {GALLERY_TEMPLATES.map((t) => (
            <button key={t.id} onClick={() => toast.info("Feature coming soon")} className="group flex flex-col items-center gap-2 rounded-xl border bg-card p-4 hover:shadow-sm hover:border-accent/40 transition-all text-center">
              <span className="text-2xl">{t.icon}</span>
              <p className="text-xs font-medium leading-tight">{t.name}</p>
              <span className="text-[10px] text-muted-foreground">{t.category}</span>
            </button>
          ))}
        </div>
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FilePlus2 className="h-5 w-5 text-emerald-500" /> Create Smart File</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Smart file creation is coming soon. You'll be able to build custom document templates with dynamic fields.</p>
          <Button className="mt-2" onClick={() => setCreateDialogOpen(false)}>Got it</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
