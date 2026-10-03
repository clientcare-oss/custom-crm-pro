import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  LayoutTemplate, FilePlus2, FileText, Mail, ShoppingBag,
  PlusCircle, Library, ArrowRight, Pencil, Trash2,
  Star, Package, ChevronRight, X, Save, Folder, FolderOpen,
  FolderPlus, MoreHorizontal, MoveRight, Inbox, Search, AlertTriangle, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RichTextEditor from "@/components/RichTextEditor";
import PageIdBadge from "@/components/PageIdBadge";
import { ScopedErrorBoundary } from "@/components/ScopedErrorBoundary";
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
  { id: "discovery-call", name: "Discovery Call Intake", icon: "📋", category: "Intake" },
  { id: "meltdown-reflection", name: "Meltdown Reflection", icon: "🧩", category: "Behavior" },
  { id: "behavior-log", name: "Daily Behavior Log", icon: "📈", category: "Logs" },
  { id: "scratch", name: "Blank Canvas", icon: "✨", category: "Custom" },
];

const EMAIL_CATEGORIES = ["Onboarding", "Reminders", "Follow-up", "Updates", "IEP", "Discovery", "General"];

const FOLDER_COLORS: { value: string; label: string; bg: string; text: string; dot: string }[] = [
  // Blues
  { value: "blue-light",  label: "Light Blue",  bg: "bg-[#020A17] border border-[#3A2C18]", text: "text-blue-300",   dot: "bg-blue-400" },
  { value: "blue",        label: "Blue",        bg: "bg-[#020A17] border border-[#3A2C18]", text: "text-blue-400",   dot: "bg-blue-500" },
  { value: "blue-dark",   label: "Dark Blue",   bg: "bg-[#020A17] border border-[#3A2C18]", text: "text-blue-500",   dot: "bg-blue-700" },
  // Greens
  { value: "green-light", label: "Light Green", bg: "bg-[#020A17] border border-[#3A2C18]", text: "text-emerald-300",dot: "bg-emerald-400" },
  { value: "green",       label: "Green",       bg: "bg-[#020A17] border border-[#3A2C18]", text: "text-emerald-400",dot: "bg-emerald-500" },
  { value: "green-dark",  label: "Dark Green",  bg: "bg-[#020A17] border border-[#3A2C18]", text: "text-emerald-500",dot: "bg-emerald-700" },
  // Purples
  { value: "purple-light",label: "Light Purple",bg: "bg-[#020A17] border border-[#3A2C18]", text: "text-purple-300", dot: "bg-purple-400" },
  { value: "purple",      label: "Purple",      bg: "bg-[#020A17] border border-[#3A2C18]", text: "text-purple-400", dot: "bg-purple-500" },
  { value: "purple-dark", label: "Dark Purple", bg: "bg-[#020A17] border border-[#3A2C18]", text: "text-purple-500", dot: "bg-purple-700" },
  // Amber/Gold
  { value: "amber-light", label: "Light Amber", bg: "bg-[#020A17] border border-[#3A2C18]", text: "text-[#FFE394]",  dot: "bg-amber-300" },
  { value: "amber",       label: "Amber",       bg: "bg-[#020A17] border border-[#3A2C18]", text: "text-[#C5A059]",  dot: "bg-[#C5A059]" },
  { value: "orange",      label: "Orange",      bg: "bg-[#020A17] border border-[#3A2C18]", text: "text-amber-500",  dot: "bg-amber-600" },
  // Reds/Rose
  { value: "rose-light",  label: "Light Rose",  bg: "bg-[#020A17] border border-[#3A2C18]", text: "text-rose-300",   dot: "bg-rose-400" },
  { value: "rose",        label: "Rose",        bg: "bg-[#020A17] border border-[#3A2C18]", text: "text-rose-400",   dot: "bg-rose-500" },
  { value: "red",         label: "Red",         bg: "bg-[#020A17] border border-[#3A2C18]", text: "text-red-400",    dot: "bg-red-500" },
  // Teal/Cyan
  { value: "teal-light",  label: "Light Teal",  bg: "bg-[#020A17] border border-[#3A2C18]", text: "text-teal-300",   dot: "bg-teal-400" },
  { value: "teal",        label: "Teal",        bg: "bg-[#020A17] border border-[#3A2C18]", text: "text-teal-400",   dot: "bg-teal-500" },
  { value: "cyan",        label: "Cyan",        bg: "bg-[#020A17] border border-[#3A2C18]", text: "text-cyan-400",   dot: "bg-cyan-500" },
  // Pinks/Fuchsia
  { value: "pink",        label: "Pink",        bg: "bg-[#020A17] border border-[#3A2C18]", text: "text-pink-400",   dot: "bg-pink-500" },
  { value: "fuchsia",     label: "Fuchsia",     bg: "bg-[#020A17] border border-[#3A2C18]", text: "text-fuchsia-400",dot: "bg-fuchsia-500" },
  // Neutrals / Slate
  { value: "slate",       label: "Slate",       bg: "bg-[#020A17] border border-[#3A2C18]", text: "text-slate-400",  dot: "bg-slate-400" },
  { value: "zinc",        label: "Zinc",        bg: "bg-[#020A17] border border-[#3A2C18]", text: "text-zinc-400",   dot: "bg-zinc-400" },
  // Indigo/Violet
  { value: "indigo",      label: "Indigo",      bg: "bg-[#020A17] border border-[#3A2C18]", text: "text-indigo-400", dot: "bg-indigo-500" },
  { value: "violet",      label: "Violet",      bg: "bg-[#020A17] border border-[#3A2C18]", text: "text-violet-400", dot: "bg-violet-500" },
  // Yellow/Lime
  { value: "yellow",      label: "Yellow",      bg: "bg-[#020A17] border border-[#3A2C18]", text: "text-yellow-400", dot: "bg-yellow-400" },
  { value: "lime",        label: "Lime",        bg: "bg-[#020A17] border border-[#3A2C18]", text: "text-lime-400",   dot: "bg-lime-500" },
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4] shadow-[0_25px_60px_rgba(0,0,0,0.95)] rounded-2xl">
        <DialogHeader className="border-b border-[#3A2C18] pb-4">
          <DialogTitle className="flex items-center gap-2 font-serif text-xl font-bold text-[#FFF4D4]">
            <div className="h-8 w-8 rounded-lg bg-[#020A17] border border-[#3A2C18] flex items-center justify-center shrink-0">
              <Mail className="h-4 w-4 text-[#FFE394]" />
            </div>
            {initial?.id ? "Edit Email Template" : "New Email Template"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-[#C6B697]">Template Name</Label>
              <Input
                placeholder="e.g. IEP Meeting Reminder"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="bg-[#020A17]/90 border-[#3A2C18] text-[#FFF4D4] placeholder:text-[#A69371] focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-[#C6B697]">Folder</Label>
              <Select value={form.folderId?.toString() ?? "none"} onValueChange={(v) => setForm((f) => ({ ...f, folderId: v === "none" ? null : Number(v) }))}>
                <SelectTrigger className="bg-[#020A17]/90 border-[#3A2C18] text-[#FFF4D4] focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059]">
                  <SelectValue placeholder="No folder (Unfiled)" />
                </SelectTrigger>
                <SelectContent className="bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4]">
                  <SelectItem value="none" className="hover:bg-[#07162B] hover:text-[#FFE394] focus:bg-[#07162B] focus:text-[#FFE394] cursor-pointer">
                    No folder (Unfiled)
                  </SelectItem>
                  {folders.map((folder: any) => (
                    <SelectItem key={folder.id} value={folder.id.toString()} className="hover:bg-[#07162B] hover:text-[#FFE394] focus:bg-[#07162B] focus:text-[#FFE394] cursor-pointer">
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-[#C6B697]">Subject Line</Label>
            <Input
              placeholder="e.g. Reminder: IEP Meeting on {{date}}"
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              className="bg-[#020A17]/90 border-[#3A2C18] text-[#FFF4D4] placeholder:text-[#A69371] focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059]"
            />
            <p className="text-xs text-[#A69371]">Use {"{{name}}"}, {"{{date}}"}, {"{{student}}"} as merge tags</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-[#C6B697]">Email Body</Label>
            <div className="rounded-xl border border-[#3A2C18] overflow-hidden bg-[#020A17]/70">
              <RichTextEditor
                content={form.body}
                onChange={(html: string) => setForm((f) => ({ ...f, body: html }))}
                placeholder="Write your email body here..."
                minHeight="250px"
                showInsertOptions={true}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-[#3A2C18]">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4]"
            >
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button
              onClick={() => onSave(form)}
              disabled={saving || !form.name.trim() || !form.subject.trim()}
              className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)] hover:brightness-105"
            >
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
      <DialogContent className="max-w-sm bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4] shadow-[0_25px_60px_rgba(0,0,0,0.95)] rounded-2xl">
        <DialogHeader className="border-b border-[#3A2C18] pb-3">
          <DialogTitle className="flex items-center gap-2 font-serif text-lg font-bold text-[#FFF4D4]">
            <div className="h-7 w-7 rounded-lg bg-[#020A17] border border-[#3A2C18] flex items-center justify-center shrink-0">
              <FolderPlus className="h-4 w-4 text-[#FFE394]" />
            </div>
            {initial?.id ? "Rename Folder" : "New Folder"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-[#C6B697]">Folder Name</Label>
            <Input
              placeholder="e.g. IEP Templates"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="bg-[#020A17]/90 border-[#3A2C18] text-[#FFF4D4] placeholder:text-[#A69371] focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-[#C6B697]">Color & Brightness</Label>
            <div className="grid grid-cols-9 gap-1.5 p-2 rounded-xl bg-[#020A17]/80 border border-[#3A2C18]">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className={`h-6 w-6 rounded-full ${c.dot} ring-2 transition-all hover:scale-110 ${color === c.value ? "ring-[#FFE394] ring-offset-2 ring-offset-[#020A17]" : "ring-transparent"}`}
                  title={c.label}
                />
              ))}
            </div>
            <p className="text-xs text-[#A69371] mt-1">Light → Dark variants per color family</p>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-[#3A2C18]">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4]"
            >
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button
              onClick={() => onSave(name, color)}
              disabled={saving || !name.trim()}
              className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)] hover:brightness-105"
            >
              <Save className="h-4 w-4 mr-1" />{saving ? "Saving..." : initial?.id ? "Rename" : "Create Folder"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Email Templates View ─────────────────────────────────────────────────────

type FolderFilter = "all" | null | number;

function EmailTemplates({ onBack }: { onBack: () => void }) {
  const utils = trpc.useUtils();
  const { data: folders = [] } = trpc.emailTemplates.folders.list.useQuery();
  const [activeFolder, setActiveFolder] = useState<FolderFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const queryInput = activeFolder === "all" ? undefined : { folderId: activeFolder };
  const { data: templates = [], isLoading } = trpc.emailTemplates.list.useQuery(queryInput);
  const { data: automationMap = {} } = trpc.emailTemplates.checkAllAutomationUsage.useQuery();

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3A2C18] pb-5">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="inline-flex items-center gap-1 text-[11px] h-8 px-3 bg-[#020A17] border-[#3A2C18] hover:bg-[#07162B] text-[#C6B697] hover:text-[#FFF4D4]"
          >
            <ChevronRight className="h-4 w-4 rotate-180" /> Back to Hub
          </Button>
          <span className="text-[#3A2C18]">|</span>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#020A17] border border-[#3A2C18] flex items-center justify-center shrink-0">
              <Mail className="h-4 w-4 text-[#FFE394]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-serif font-bold text-[#FFF4D4]">
                  Email Templates
                </h2>
                <PageIdBadge id="PG-011" />
              </div>
              {activeFolderObj && (
                <p className="text-xs text-[#C6B697]">Folder: <span className="text-[#FFE394] font-medium">{activeFolderObj.name}</span></p>
              )}
            </div>
          </div>
        </div>
        <Button
          size="sm"
          className="gap-2 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)] hover:brightness-105"
          onClick={() => { setEditingTemplate(null); setTemplateDialog(true); }}
        >
          <PlusCircle className="h-4 w-4" /> New Template
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A69371]" />
        <Input
          placeholder="Search templates by name, subject, or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-9 py-2 bg-[#020A17]/90 border-[#3A2C18] text-[#FFF4D4] placeholder:text-[#A69371] rounded-xl text-sm focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059]"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#A69371] hover:text-[#FFF4D4]">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Layout: sidebar + content */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Folder Sidebar */}
        <div className="w-full md:w-56 shrink-0 space-y-1.5 bg-[#05142B]/90 border border-[#3A2C18] rounded-xl p-3 shadow-[0_8px_24px_rgba(0,0,0,0.85)] self-start">
          <div className="flex items-center justify-between px-2 py-1 mb-1 border-b border-[#3A2C18]/60 pb-2">
            <span className="text-xs font-semibold text-[#C6B697] uppercase tracking-wider">Folders</span>
            <button
              onClick={() => { setEditingFolder(null); setFolderDialog(true); }}
              className="p-1 rounded-md bg-[#020A17] border border-[#3A2C18] text-[#FFE394] hover:border-[#C5A059] transition-all"
              title="New folder"
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* All Templates */}
          <button
            onClick={() => setActiveFolder("all")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
              activeFolder === "all"
                ? "bg-[#020A17] border border-[#C5A059]/60 text-[#FFE394] font-semibold shadow-inner"
                : "text-[#C6B697] hover:bg-[#020A17]/60 hover:text-[#FFF4D4] border border-transparent"
            }`}
          >
            <LayoutTemplate className="h-4 w-4 shrink-0 text-[#FFE394]" />
            <span className="truncate">All Templates</span>
          </button>

          {/* Unfiled */}
          <button
            onClick={() => setActiveFolder(null)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
              activeFolder === null
                ? "bg-[#020A17] border border-[#C5A059]/60 text-[#FFE394] font-semibold shadow-inner"
                : "text-[#C6B697] hover:bg-[#020A17]/60 hover:text-[#FFF4D4] border border-transparent"
            }`}
          >
            <Inbox className="h-4 w-4 shrink-0 text-[#FFE394]" />
            <span className="truncate">Unfiled</span>
          </button>

          {/* Folder list */}
          {folders.length > 0 && <div className="border-t border-[#3A2C18]/60 my-2" />}
          {folders.map((folder: any) => {
            const style = getFolderStyle(folder.color);
            const isActive = activeFolder === folder.id;
            return (
              <div key={folder.id} className="group relative flex items-center">
                <button
                  onClick={() => setActiveFolder(folder.id)}
                  className={`flex-1 flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                    isActive
                      ? "bg-[#020A17] border border-[#C5A059]/60 text-[#FFE394] font-semibold shadow-inner"
                      : "text-[#C6B697] hover:bg-[#020A17]/60 hover:text-[#FFF4D4] border border-transparent"
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
                    <button className="absolute right-1.5 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-[#07162B] text-[#C6B697] hover:text-[#FFF4D4] transition-opacity">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40 bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4] shadow-[0_12px_32px_rgba(0,0,0,0.95)]">
                    <DropdownMenuItem
                      onClick={() => { setEditingFolder({ id: folder.id, name: folder.name, color: folder.color ?? "blue" }); setFolderDialog(true); }}
                      className="hover:bg-[#07162B] hover:text-[#FFE394] focus:bg-[#07162B] focus:text-[#FFE394] cursor-pointer"
                    >
                      <Pencil className="h-3.5 w-3.5 mr-2" /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-[#3A2C18]" />
                    <DropdownMenuItem
                      className="text-red-400 focus:text-red-300 focus:bg-red-950/40 cursor-pointer"
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
            <p className="px-3 py-2 text-xs text-[#A69371]/80 italic">No folders yet</p>
          )}
        </div>

        {/* Template List */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-xl border border-[#3A2C18] bg-[#05142B]/90 animate-pulse" />
              ))}
            </div>
          ) : filteredTemplates.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-16 text-center border-dashed border-[#3A2C18] bg-[#05142B]/90 rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.85)]">
              <div className="h-14 w-14 rounded-2xl bg-[#020A17] border border-[#3A2C18] flex items-center justify-center mb-3">
                <Mail className="h-7 w-7 text-[#A69371]" />
              </div>
              <p className="text-base font-serif font-bold text-[#FFF4D4]">
                {activeFolder === "all" ? "No templates yet" : activeFolder === null ? "No unfiled templates" : "No templates in this folder"}
              </p>
              <p className="text-xs text-[#C6B697] mt-1">Click "New Template" to craft a reusable outreach document</p>
              <Button
                size="sm"
                className="mt-5 gap-2 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)] hover:brightness-105"
                onClick={() => { setEditingTemplate(null); setTemplateDialog(true); }}
              >
                <PlusCircle className="h-4 w-4" /> New Template
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredTemplates.map((tpl: any) => {
                const tplFolder = folders.find((f: any) => f.id === tpl.folderId);
                const folderStyle = tplFolder ? getFolderStyle(tplFolder.color) : null;
                const linkedAutomations = (automationMap as Record<number, string[]>)[tpl.id] ?? [];
                return (
                  <div
                    key={tpl.id}
                    className="group flex items-center gap-3.5 rounded-xl border border-[#3A2C18] bg-[#05142B]/90 px-4 py-3.5 hover:border-[#C5A059]/60 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] transition-all"
                  >
                    <div className="h-10 w-10 rounded-xl bg-[#020A17] border border-[#3A2C18] flex items-center justify-center shrink-0">
                      <Mail className="h-5 w-5 text-[#FFE394]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-serif font-bold text-sm text-[#FFF4D4]">{tpl.name}</p>
                      <p className="text-xs text-[#C6B697] truncate mt-0.5">Subject: {tpl.subject}</p>
                    </div>

                    {/* Folder badge */}
                    {tplFolder && folderStyle && activeFolder === "all" && (
                      <span className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full ${folderStyle.bg} ${folderStyle.text} shrink-0`}>
                        <Folder className="h-3 w-3" /> {tplFolder.name}
                      </span>
                    )}

                    {/* Automation connected badge */}
                    {linkedAutomations.length > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 font-medium shrink-0 cursor-pointer">
                            <Zap className="h-3 w-3 fill-current" /> Automation
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4]">
                          <p className="font-medium text-xs text-[#FFE394]">Automation connected:</p>
                          {linkedAutomations.map((name: string, i: number) => (
                            <p key={i} className="text-xs text-[#C6B697]">{name}</p>
                          ))}
                        </TooltipContent>
                      </Tooltip>
                    )}

                    {tpl.category && (
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#020A17] border border-[#3A2C18] text-[#C6B697] shrink-0">
                        {tpl.category}
                      </span>
                    )}

                    <p className="text-xs text-[#A69371] shrink-0 hidden sm:block">
                      {new Date(tpl.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingTemplate({ id: tpl.id, name: tpl.name, subject: tpl.subject, body: tpl.body, category: tpl.category ?? "General", folderId: tpl.folderId ?? null }); setTemplateDialog(true); }}
                        className="p-1.5 rounded-lg bg-[#020A17] border border-[#3A2C18] text-[#C6B697] hover:border-[#C5A059] hover:text-[#FFF4D4] transition-all"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>

                      {/* Move to folder dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="p-1.5 rounded-lg bg-[#020A17] border border-[#3A2C18] text-[#C6B697] hover:border-[#C5A059] hover:text-[#FFF4D4] transition-all"
                            title="Move to folder"
                          >
                            <MoveRight className="h-3.5 w-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4] shadow-[0_12px_32px_rgba(0,0,0,0.95)]">
                          <DropdownMenuItem
                            onClick={() => moveTemplate.mutate({ id: tpl.id, folderId: null })}
                            className="hover:bg-[#07162B] hover:text-[#FFE394] focus:bg-[#07162B] focus:text-[#FFE394] cursor-pointer"
                          >
                            <Inbox className="h-3.5 w-3.5 mr-2" /> Unfiled
                          </DropdownMenuItem>
                          {folders.length > 0 && <DropdownMenuSeparator className="bg-[#3A2C18]" />}
                          {folders.map((f: any) => {
                            const s = getFolderStyle(f.color);
                            return (
                              <DropdownMenuItem
                                key={f.id}
                                onClick={() => moveTemplate.mutate({ id: tpl.id, folderId: f.id })}
                                className="hover:bg-[#07162B] hover:text-[#FFE394] focus:bg-[#07162B] focus:text-[#FFE394] cursor-pointer"
                              >
                                <Folder className={`h-3.5 w-3.5 mr-2 ${s.text}`} /> {f.name}
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <button
                        onClick={async () => {
                          try {
                            const usage = await utils.emailTemplates.checkAutomationUsage.fetch({ id: tpl.id });
                            setDeleteConfirm({ id: tpl.id, name: tpl.name, linked: usage.linked, automationNames: usage.automationNames });
                          } catch {
                            setDeleteConfirm({ id: tpl.id, name: tpl.name, linked: false, automationNames: [] });
                          }
                        }}
                        className="p-1.5 rounded-lg bg-[#020A17] border border-[#3A2C18] text-[#C6B697] hover:border-red-500/50 hover:text-red-400 transition-all"
                        title="Delete"
                      >
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
        <DialogContent className="max-w-sm bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4] shadow-[0_25px_60px_rgba(0,0,0,0.95)] rounded-2xl">
          <DialogHeader className="border-b border-[#3A2C18] pb-3">
            <DialogTitle className="flex items-center gap-2 font-serif text-lg font-bold text-[#FFF4D4]">
              {deleteConfirm?.linked ? (
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              ) : (
                <Trash2 className="h-5 w-5 text-red-400" />
              )}
              Delete Template
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {deleteConfirm?.linked ? (
              <>
                <p className="text-sm text-[#FFF4D4]">
                  This email template is currently used by an automation. Deleting it may prevent that automation from working correctly. Are you sure you want to continue?
                </p>
                {deleteConfirm.automationNames.length > 0 && (
                  <div className="bg-[#020A17] border border-amber-500/40 rounded-xl p-3">
                    <p className="text-xs font-medium text-amber-300 mb-1">Connected automations:</p>
                    <ul className="text-xs text-amber-200/80 space-y-0.5">
                      {deleteConfirm.automationNames.map((name, i) => (
                        <li key={i} className="flex items-center gap-1">• {name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-[#C6B697]">
                Are you sure you want to delete "{deleteConfirm?.name}"? This action cannot be undone.
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2 border-t border-[#3A2C18]">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirm(null)}
                className="border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4]"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (deleteConfirm) {
                    deleteTemplate.mutate({ id: deleteConfirm.id });
                    setDeleteConfirm(null);
                  }
                }}
                className="bg-red-700 hover:bg-red-800 text-white border border-red-500/40"
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

function SavedSmartFiles({ onBack, onCreateNew }: { onBack: () => void; onCreateNew: () => void }) {
  const [, navigate] = useLocation();
  const { data: templates = [], isLoading, refetch } = trpc.smartFiles.listTemplates.useQuery();
  const deleteMutation = trpc.smartFiles.deleteTemplate.useMutation();

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete the template "${name}"?`)) return;
    try {
      await deleteMutation.mutateAsync({ templateId: id });
      toast.success("Template deleted!");
      refetch();
    } catch {
      toast.error("Failed to delete template");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3A2C18] pb-5">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="inline-flex items-center gap-1 text-[11px] h-8 px-3 bg-[#020A17] border-[#3A2C18] hover:bg-[#07162B] text-[#C6B697] hover:text-[#FFF4D4]"
          >
            <ChevronRight className="h-4 w-4 rotate-180" /> Back to Hub
          </Button>
          <span className="text-[#3A2C18]">|</span>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#020A17] border border-[#3A2C18] flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4 text-[#FFE394]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-serif font-bold text-[#FFF4D4]">Saved Smart Files</h2>
                <PageIdBadge id="PG-011" />
              </div>
              <p className="text-xs text-[#C6B697]">Custom intake documents and worksheets</p>
            </div>
          </div>
        </div>
        <Button
          size="sm"
          className="gap-2 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)] hover:brightness-105"
          onClick={onCreateNew}
        >
          <PlusCircle className="h-4 w-4" /> New Smart File
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl border border-[#3A2C18] bg-[#05142B]/90 animate-pulse" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center border-dashed border-[#3A2C18] bg-[#05142B]/90 rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.85)]">
          <div className="h-14 w-14 rounded-2xl bg-[#020A17] border border-[#3A2C18] flex items-center justify-center mb-3">
            <FileText className="h-7 w-7 text-[#A69371]" />
          </div>
          <p className="text-base font-serif font-bold text-[#FFF4D4]">No smart files saved yet</p>
          <p className="text-xs text-[#C6B697] mt-1">Click "New Smart File" to create your first client-ready document</p>
          <Button
            size="sm"
            className="mt-5 gap-2 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)] hover:brightness-105"
            onClick={onCreateNew}
          >
            <PlusCircle className="h-4 w-4" /> New Smart File
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map((file) => (
            <div
              key={file.id}
              className="group flex items-center gap-4 rounded-xl border border-[#3A2C18] bg-[#05142B]/90 px-4 py-3.5 hover:border-[#C5A059]/60 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] transition-all"
            >
              <div className="h-10 w-10 rounded-xl bg-[#020A17] border border-[#3A2C18] flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-[#FFE394]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-serif font-bold text-sm text-[#FFF4D4]">{file.name}</p>
                <p className="text-xs text-[#C6B697] mt-0.5">
                  Status: <span className="capitalize font-semibold text-[#FFE394]">{file.status}</span> · Updated {new Date(file.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => navigate(`/smart-files/${file.id}`)}
                  className="p-1.5 rounded-lg bg-[#020A17] border border-[#3A2C18] text-[#C6B697] hover:border-[#C5A059] hover:text-[#FFF4D4] transition-all"
                  title="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(file.id, file.name)}
                  className="p-1.5 rounded-lg bg-[#020A17] border border-[#3A2C18] text-[#C6B697] hover:border-red-500/50 hover:text-red-400 transition-all"
                  title="Delete"
                >
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

// ─── Purchasables View ────────────────────────────────────────────────────────

function Purchasables({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3A2C18] pb-5">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="inline-flex items-center gap-1 text-[11px] h-8 px-3 bg-[#020A17] border-[#3A2C18] hover:bg-[#07162B] text-[#C6B697] hover:text-[#FFF4D4]"
          >
            <ChevronRight className="h-4 w-4 rotate-180" /> Back to Hub
          </Button>
          <span className="text-[#3A2C18]">|</span>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#020A17] border border-[#3A2C18] flex items-center justify-center shrink-0">
              <ShoppingBag className="h-4 w-4 text-[#FFE394]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-serif font-bold text-[#FFF4D4]">Purchasable Kits & Bundles</h2>
                <PageIdBadge id="PG-011" />
              </div>
              <p className="text-xs text-[#C6B697]">Document kits and starter packs for parents and clients</p>
            </div>
          </div>
        </div>
        <Button
          size="sm"
          className="gap-2 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)] hover:brightness-105"
          onClick={() => toast.info("Feature coming soon")}
        >
          <PlusCircle className="h-4 w-4" /> Add Item
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {MOCK_PURCHASABLES.map((item) => (
          <div
            key={item.id}
            className="group relative rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 p-5 hover:border-[#C5A059]/60 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.9)] transition-all flex flex-col gap-3.5"
          >
            {item.badge && (
              <span className={`absolute top-3.5 right-3.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                item.badge === "Popular"
                  ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border-[#FFE394]/60"
                  : "bg-emerald-950/60 text-emerald-300 border-emerald-500/40"
              }`}>
                {item.badge === "Popular" ? <><Star className="inline h-3 w-3 mr-0.5 fill-current" />{item.badge}</> : item.badge}
              </span>
            )}
            <div className="h-11 w-11 rounded-xl bg-[#020A17] border border-[#3A2C18] flex items-center justify-center shrink-0">
              <Package className="h-5 w-5 text-[#FFE394]" />
            </div>
            <div>
              <p className="font-serif font-bold text-base text-[#FFF4D4]">{item.name}</p>
              <p className="text-xs text-[#C6B697] mt-1.5 leading-relaxed">{item.description}</p>
            </div>
            <div className="mt-auto flex items-center justify-between pt-3 border-t border-[#3A2C18]">
              <span className="font-serif text-lg font-bold text-[#FFE394]">{item.price}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => toast.info("Feature coming soon")}
                className="border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] text-xs"
              >
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

type View = "hub" | "email-templates" | "purchasables";

export default function Templates() {
  const [view, setView] = useState<View>("hub");
  const [, navigate] = useLocation();
  const [savedWorksheetsCount, setSavedWorksheetsCount] = useState(0);

  const { data: emailTemplatesList = [] } = trpc.emailTemplates.list.useQuery();

  useEffect(() => {
    const saved = localStorage.getItem("waypoint_saved_worksheets");
    if (saved) {
      try {
        setSavedWorksheetsCount(JSON.parse(saved).length);
      } catch (e) {}
    }
  }, [view]);

  const handleGalleryClick = (templateId: string) => {
    navigate(`/tools/worksheet-builder?tab=create&template=${templateId}`);
  };

  const HUB_BLOCKS = [
    {
      id: "worksheets",
      icon: FileText,
      title: "Saved Worksheets",
      description: "Access and manage your saved custom worksheets — intake forms, reflection sheets, logs, and more.",
      cta: "View Worksheets",
      count: savedWorksheetsCount,
    },
    {
      id: "create-worksheet",
      icon: FilePlus2,
      title: "Create Worksheet",
      description: "Build a new worksheet from scratch with a blank canvas, or jump-start with a pre-built template from the gallery.",
      cta: "Create Now",
      count: null,
    },
    {
      id: "email-templates" as View,
      icon: Mail,
      title: "Email Templates",
      description: "Manage reusable email templates for parent communication, meeting reminders, progress updates, and outreach.",
      cta: "View Templates",
      count: emailTemplatesList.length,
    },
    {
      id: "purchasables" as View,
      icon: ShoppingBag,
      title: "Purchasables",
      description: "Browse and manage purchasable document packs, template bundles, and resource kits available for your clients.",
      cta: "Browse Items",
      count: MOCK_PURCHASABLES.length,
    },
  ];

  const handleBlockClick = (blockId: string) => {
    if (blockId === "worksheets") {
      navigate("/tools/worksheet-builder?tab=saved");
    } else if (blockId === "create-worksheet") {
      navigate("/tools/worksheet-builder?tab=create");
    } else {
      setView(blockId as View);
    }
  };

  return (
    <ScopedErrorBoundary moduleName="Document & Email Templates">
      <div 
        className="min-h-screen w-full relative overflow-x-hidden bg-[#07162B] text-slate-100 p-6 md:p-8"
        style={{
          backgroundColor: "#07162B",
          backgroundImage: "radial-gradient(ellipse at 50% 0%, #102B4E 0%, #07162B 55%, #030D1A 100%)",
        }}
      >
        <div className="max-w-6xl mx-auto w-full space-y-8">
          {view === "email-templates" && (
            <EmailTemplates onBack={() => setView("hub")} />
          )}

          {view === "purchasables" && (
            <Purchasables onBack={() => setView("hub")} />
          )}

          {view === "hub" && (
            <>
              {/* Top Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3A2C18] pb-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#020A17] border border-[#3A2C18] shadow-md shadow-black/40">
                    <LayoutTemplate className="h-6 w-6 text-[#FFE394]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-wide text-[#FFF4D4]">
                        Document & Email Templates
                      </h1>
                      <PageIdBadge id="PG-011" />
                    </div>
                    <p className="text-sm text-[#C6B697] mt-1">
                      Your document hub — worksheets, email templates, intake builders, and advocacy resource packs.
                    </p>
                  </div>
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate("/smart-files")}
                    className="border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] text-xs h-9 px-3.5"
                  >
                    Smart Files Suite
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate("/tools/worksheet-builder?tab=create")}
                    className="gap-2 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)] hover:brightness-105 text-xs h-9 px-3.5"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    Build New
                  </Button>
                </div>
              </div>

              {/* Hub Navigation Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {HUB_BLOCKS.map((block) => {
                  const Icon = block.icon;
                  return (
                    <button
                      key={block.id}
                      onClick={() => handleBlockClick(block.id)}
                      className="group text-left rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 p-6 hover:border-[#C5A059]/60 hover:shadow-[0_12px_32px_rgba(0,0,0,0.9)] shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] transition-all cursor-pointer"
                    >
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-xl bg-[#020A17] border border-[#3A2C18] flex items-center justify-center shrink-0">
                          <Icon className="h-6 w-6 text-[#FFE394]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-serif font-bold text-lg text-[#FFF4D4]">{block.title}</p>
                            {block.count !== null && (
                              <span className="text-xs font-semibold text-[#FFE394] bg-[#020A17] border border-[#3A2C18] rounded-full px-2.5 py-0.5">
                                {block.count}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-[#C6B697] mt-1.5 leading-relaxed">{block.description}</p>
                          <div className="flex items-center gap-1 mt-3.5 text-sm font-semibold text-[#FFE394] group-hover:text-[#FFF4D4] group-hover:gap-2 transition-all">
                            {block.cta} <ArrowRight className="h-4 w-4" />
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Template Gallery */}
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-6 w-6 rounded-md bg-[#020A17] border border-[#3A2C18] flex items-center justify-center">
                    <Library className="h-3.5 w-3.5 text-[#FFE394]" />
                  </div>
                  <h2 className="text-xs font-semibold text-[#C6B697] uppercase tracking-wider">
                    Worksheet Template Gallery
                  </h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {GALLERY_TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleGalleryClick(t.id)}
                      className="group flex flex-col items-center gap-2.5 rounded-xl border border-[#3A2C18] bg-[#05142B]/90 p-5 hover:border-[#C5A059]/60 hover:shadow-[0_8px_24px_rgba(0,0,0,0.85)] shadow-[0_4px_16px_rgba(0,0,0,0.7)] transition-all text-center cursor-pointer"
                    >
                      <span className="text-3xl mb-0.5 group-hover:scale-110 transition-transform">{t.icon}</span>
                      <p className="font-serif text-xs font-bold text-[#FFF4D4] leading-tight">{t.name}</p>
                      <span className="text-[10px] text-[#C6B697] font-semibold px-2 py-0.5 rounded-full bg-[#020A17] border border-[#3A2C18]">
                        {t.category}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </ScopedErrorBoundary>
  );
}
