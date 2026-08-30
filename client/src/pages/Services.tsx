import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus, Folder, FolderOpen, FolderPlus, MoreHorizontal, Pencil, Trash2,
  X, Save, Inbox, MoveRight, Briefcase, Clock, DollarSign, Sparkles,
  RefreshCw, CheckCircle2, ShieldCheck, Scale, Info, Zap
} from "lucide-react";
import { toast } from "sonner";
import { InteractivePageIdPill } from "@/components/portal-experience/InteractivePageIdPill";

// ─── Folder Colors ───────────────────────────────────────────────────────────

const FOLDER_COLORS: { value: string; label: string; bg: string; text: string; dot: string }[] = [
  { value: "blue-light",  label: "Light Blue",  bg: "bg-blue-50 dark:bg-blue-900/10",   text: "text-blue-400 dark:text-blue-300",   dot: "bg-blue-300" },
  { value: "blue",        label: "Blue",        bg: "bg-blue-50 dark:bg-blue-900/20",   text: "text-blue-600 dark:text-blue-400",   dot: "bg-blue-500" },
  { value: "blue-dark",   label: "Dark Blue",   bg: "bg-blue-100 dark:bg-blue-900/40",  text: "text-blue-800 dark:text-blue-300",   dot: "bg-blue-700" },
  { value: "green-light", label: "Light Green", bg: "bg-green-50 dark:bg-green-900/10",  text: "text-green-400 dark:text-green-300",  dot: "bg-green-300" },
  { value: "green",       label: "Green",       bg: "bg-green-50 dark:bg-green-900/20",  text: "text-green-600 dark:text-green-400",  dot: "bg-green-500" },
  { value: "green-dark",  label: "Dark Green",  bg: "bg-green-100 dark:bg-green-900/40", text: "text-green-800 dark:text-green-300",  dot: "bg-green-700" },
  { value: "purple-light",label: "Light Purple",bg: "bg-purple-50 dark:bg-purple-900/10", text: "text-purple-400 dark:text-purple-300", dot: "bg-purple-300" },
  { value: "purple",      label: "Purple",      bg: "bg-purple-50 dark:bg-purple-900/20", text: "text-purple-600 dark:text-purple-400", dot: "bg-purple-500" },
  { value: "purple-dark", label: "Dark Purple", bg: "bg-purple-100 dark:bg-purple-900/40",text: "text-purple-800 dark:text-purple-300", dot: "bg-purple-700" },
  { value: "amber",       label: "Amber",       bg: "bg-amber-50 dark:bg-amber-900/20",  text: "text-amber-600 dark:text-amber-400",  dot: "bg-amber-500" },
  { value: "orange",      label: "Orange",      bg: "bg-orange-50 dark:bg-orange-900/20", text: "text-orange-600 dark:text-orange-400", dot: "bg-orange-500" },
  { value: "rose",        label: "Rose",        bg: "bg-rose-50 dark:bg-rose-900/20",   text: "text-rose-600 dark:text-rose-400",   dot: "bg-rose-500" },
  { value: "teal",        label: "Teal",        bg: "bg-teal-50 dark:bg-teal-900/20",   text: "text-teal-600 dark:text-teal-400",   dot: "bg-teal-500" },
  { value: "pink",        label: "Pink",        bg: "bg-pink-50 dark:bg-pink-900/20",   text: "text-pink-600 dark:text-pink-400",   dot: "bg-pink-500" },
  { value: "indigo",      label: "Indigo",      bg: "bg-indigo-50 dark:bg-indigo-900/20", text: "text-indigo-600 dark:text-indigo-400", dot: "bg-indigo-500" },
  { value: "slate",       label: "Slate",       bg: "bg-slate-50 dark:bg-slate-900/20",  text: "text-slate-600 dark:text-slate-400",  dot: "bg-slate-500" },
];

function getFolderStyle(color?: string | null) {
  return FOLDER_COLORS.find((c) => c.value === color) ?? FOLDER_COLORS[1];
}

// ─── Service Form Dialog ─────────────────────────────────────────────────────

type ServiceFormData = { name: string; description: string; price: string; duration: string; folderId: number | null; isActive: boolean };

function ServiceDialog({
  open, onClose, initial, onSave, saving, folders,
}: {
  open: boolean;
  onClose: () => void;
  initial?: ServiceFormData & { id?: number };
  onSave: (data: ServiceFormData) => void;
  saving: boolean;
  folders: any[];
}) {
  const [form, setForm] = useState<ServiceFormData>({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    price: initial?.price ?? "",
    duration: initial?.duration ?? "",
    folderId: initial?.folderId ?? null,
    isActive: initial?.isActive ?? true,
  });

  useEffect(() => {
    if (open) {
      setForm({
        name: initial?.name ?? "",
        description: initial?.description ?? "",
        price: initial?.price ?? "",
        duration: initial?.duration ?? "",
        folderId: initial?.folderId ?? null,
        isActive: initial?.isActive ?? true,
      });
    }
  }, [open, initial]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-amber-500" />
            {initial?.id ? "Edit Service Offering" : "New Advocacy Service"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Service Name *</Label>
            <Input placeholder="e.g. Advocacy Only Membership ($55/mo)" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <p className="text-[11px] text-muted-foreground">Tip: Suffix with ($55/mo) or ($105/mo) to automatically link to Discovery Call recommended plans.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input placeholder="Scope of advocacy representation, review, or drafting included" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Base Price ($ USD) *</Label>
              <Input type="number" step="0.01" placeholder="55.00" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Duration (minutes)</Label>
              <Input type="number" placeholder="Optional (e.g. 60)" value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Folder / Category</Label>
            <Select value={form.folderId?.toString() ?? "none"} onValueChange={(v) => setForm((f) => ({ ...f, folderId: v === "none" ? null : Number(v) }))}>
              <SelectTrigger><SelectValue placeholder="No folder (Unfiled)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No folder (Unfiled)</SelectItem>
                {folders.map((folder: any) => (
                  <SelectItem key={folder.id} value={folder.id.toString()}>{folder.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/50">
            <div>
              <Label className="font-semibold text-sm">Active & Published</Label>
              <p className="text-xs text-muted-foreground">Visible to Discovery Call consoles and Client Portal checkout</p>
            </div>
            <Switch checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving}><X className="h-4 w-4 mr-1" /> Cancel</Button>
            <Button onClick={() => onSave(form)} disabled={saving || !form.name.trim()} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold">
              <Save className="h-4 w-4 mr-1" />{saving ? "Saving..." : "Save Service"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Folder Dialog ───────────────────────────────────────────────────────────

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
            <Input placeholder="e.g. Advocacy Memberships" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Color & Brightness</Label>
            <div className="grid grid-cols-8 gap-1.5">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className={`h-6 w-6 rounded-full ${c.dot} ring-2 transition-all hover:scale-110 ${color === c.value ? "ring-foreground ring-offset-2 ring-offset-background" : "ring-transparent"}`}
                  title={c.label}
                />
              ))}
            </div>
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

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Services() {
  const [activeFolder, setActiveFolder] = useState<number | "all" | "unfiled">("all");
  const [serviceDialog, setServiceDialog] = useState(false);
  const [folderDialog, setFolderDialog] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [editingFolder, setEditingFolder] = useState<any>(null);

  const utils = trpc.useUtils();
  const { data: folders = [] } = trpc.services.folders.list.useQuery();
  const queryInput = activeFolder === "all" ? undefined : activeFolder === "unfiled" ? { unfiled: true } : { folderId: activeFolder };
  const { data: servicesList = [], isLoading } = trpc.services.list.useQuery(queryInput);

  const seedDefaultsMutation = trpc.services.seedDefaults.useMutation({
    onSuccess: () => {
      utils.services.folders.list.invalidate();
      utils.services.list.invalidate();
      toast.success("Standard Waypoint Services restored into Catalog!");
    },
    onError: (err) => toast.error(err.message || "Failed to seed defaults"),
  });

  const createFolder = trpc.services.folders.create.useMutation({
    onSuccess: () => { utils.services.folders.list.invalidate(); setFolderDialog(false); toast.success("Folder created"); },
    onError: () => toast.error("Failed to create folder"),
  });
  const renameFolder = trpc.services.folders.rename.useMutation({
    onSuccess: () => { utils.services.folders.list.invalidate(); setFolderDialog(false); setEditingFolder(null); toast.success("Folder updated"); },
    onError: () => toast.error("Failed to rename folder"),
  });
  const deleteFolder = trpc.services.folders.delete.useMutation({
    onSuccess: () => { utils.services.folders.list.invalidate(); utils.services.list.invalidate(); setActiveFolder("all"); toast.success("Folder deleted"); },
    onError: () => toast.error("Failed to delete folder"),
  });

  const createService = trpc.services.create.useMutation({
    onSuccess: () => { utils.services.list.invalidate(); setServiceDialog(false); toast.success("Service created"); },
    onError: () => toast.error("Failed to create service"),
  });
  const updateService = trpc.services.update.useMutation({
    onSuccess: () => { utils.services.list.invalidate(); setServiceDialog(false); setEditingService(null); toast.success("Service updated"); },
    onError: () => toast.error("Failed to update service"),
  });
  const moveService = trpc.services.move.useMutation({
    onSuccess: () => { utils.services.list.invalidate(); toast.success("Moved"); },
  });
  const deleteService = trpc.services.delete.useMutation({
    onSuccess: () => { utils.services.list.invalidate(); toast.success("Deleted"); },
    onError: () => toast.error("Failed to delete"),
  });

  const handleFolderSave = (name: string, color: string) => {
    if (editingFolder?.id) {
      renameFolder.mutate({ id: editingFolder.id, name, color });
    } else {
      createFolder.mutate({ name, color });
    }
  };

  const handleServiceSave = (form: ServiceFormData) => {
    const payload = {
      name: form.name,
      description: form.description || undefined,
      price: form.price ? Math.round(parseFloat(form.price) * 100) : undefined,
      duration: form.duration ? parseInt(form.duration) : undefined,
      folderId: form.folderId,
      isActive: form.isActive,
    };
    if (editingService?.id) {
      updateService.mutate({ id: editingService.id, ...payload });
    } else {
      createService.mutate(payload);
    }
  };

  const folderSaving = createFolder.isPending || renameFolder.isPending;
  const serviceSaving = createService.isPending || updateService.isPending;

  const totalActive = (servicesList as any[]).filter((s) => s.isActive).length;
  const membershipsCount = (servicesList as any[]).filter((s) => s.name.toLowerCase().includes("membership") || s.name.includes("/mo")).length;
  const legalCount = (servicesList as any[]).filter((s) => s.name.toLowerCase().includes("complaint") || s.name.toLowerCase().includes("legal")).length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header with Page ID Pill */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <InteractivePageIdPill pageId="PG-035" name="Advocacy Services Catalog" size="default" />
            <h1 className="text-2xl font-black text-foreground flex items-center gap-2 tracking-tight">
              <Briefcase className="h-6 w-6 text-amber-500" />
              Advocacy Services Catalog
            </h1>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Centralized pricing matrix and service definitions. Prices configured here dynamically feed into the Discovery Call process (<span className="font-semibold text-foreground">PG-003-DC</span>), Lead Recommended Plans, and the Client Portal service checkout (<span className="font-semibold text-foreground">PG-027-S04</span>).
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (confirm("Restore standard Waypoint services ($55/mo, $105/mo, Single-Use State Complaint, Packages)?")) {
                seedDefaultsMutation.mutate();
              }
            }}
            disabled={seedDefaultsMutation.isPending}
            className="text-xs font-semibold gap-1.5 border-border/70 hover:bg-muted"
            title="Populate or restore missing Waypoint default services into the catalog"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-amber-500 ${seedDefaultsMutation.isPending ? "animate-spin" : ""}`} />
            <span>Restore Defaults</span>
          </Button>

          <Button
            onClick={() => { setEditingService(null); setServiceDialog(true); }}
            className="text-xs font-bold gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/10"
          >
            <Plus className="h-4 w-4" /> Add Service
          </Button>
        </div>
      </div>

      {/* Dynamic Sync Banner */}
      <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-amber-400/20 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
            <Zap className="h-4 w-4" />
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
              Live Synchronized Advocacy Engine
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 py-0">Active</Badge>
            </p>
            <p className="text-xs text-muted-foreground">
              Editing the <strong className="text-foreground">$55/mo Advocacy Only</strong>, <strong className="text-foreground">$105/mo State Complaints</strong>, or <strong className="text-foreground">Single-Use State Complaint</strong> prices here instantly reflects in Discovery Calls and parent portal proposals.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <Badge variant="outline" className="text-xs font-mono bg-background/80">
            {totalActive} Active Offerings
          </Badge>
        </div>
      </div>

      {/* Main 2-Column Catalog Browser */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Folder Sidebar */}
        <div className="w-full lg:w-64 shrink-0 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Service Categories</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setEditingFolder(null); setFolderDialog(true); }}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
              title="Add Category Folder"
            >
              <FolderPlus className="h-3.5 w-3.5 text-amber-500" />
              <span>New Folder</span>
            </Button>
          </div>

          <div className="space-y-1 bg-card/60 border border-border/60 rounded-xl p-2">
            {/* All */}
            <button
              onClick={() => setActiveFolder("all")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all ${
                activeFolder === "all"
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <Briefcase className="h-4 w-4 shrink-0" />
              <span className="truncate flex-1 text-left">All Offerings</span>
              <span className="text-[11px] opacity-75 font-mono">{(servicesList as any[]).length}</span>
            </button>

            {/* Unfiled */}
            <button
              onClick={() => setActiveFolder("unfiled")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all ${
                activeFolder === "unfiled"
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <Inbox className="h-4 w-4 shrink-0" />
              <span className="truncate flex-1 text-left">Unfiled Services</span>
            </button>

            <div className="border-t border-border/40 my-1 pt-1" />

            {/* Folders */}
            {(folders as any[]).map((folder: any) => {
              const style = getFolderStyle(folder.color);
              const isActive = activeFolder === folder.id;
              const countInFolder = (servicesList as any[]).filter((s) => s.folderId === folder.id).length;

              return (
                <div
                  key={folder.id}
                  className={`group flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                    isActive ? "bg-muted font-bold text-foreground border border-border/70" : "hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <button onClick={() => setActiveFolder(folder.id)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${style.dot}`} />
                    {isActive ? (
                      <FolderOpen className={`h-4 w-4 shrink-0 ${style.text}`} />
                    ) : (
                      <Folder className={`h-4 w-4 shrink-0 ${style.text}`} />
                    )}
                    <span className="truncate">{folder.name}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-mono text-muted-foreground opacity-60">
                      {countInFolder}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded">
                          <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem onClick={() => { setEditingFolder({ id: folder.id, name: folder.name, color: folder.color ?? "blue" }); setFolderDialog(true); }}>
                          <Pencil className="h-3.5 w-3.5 mr-2" /> Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => { if (confirm(`Delete "${folder.name}"? Services will move to Unfiled.`)) deleteFolder.mutate({ id: folder.id }); }}>
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Services List Grid */}
        <div className="flex-1 min-w-0 space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 bg-muted/40 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (servicesList as any[]).length === 0 ? (
            <div className="border border-dashed border-border rounded-2xl p-12 text-center bg-card/40 space-y-3">
              <div className="h-12 w-12 rounded-full bg-amber-400/10 text-amber-500 flex items-center justify-center mx-auto">
                <Briefcase className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">No Services In This Category</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Add custom services or restore the standard Waypoint advocacy pricing matrix.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => seedDefaultsMutation.mutate()}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1 text-amber-500" /> Restore Waypoint Defaults
                </Button>
                <Button size="sm" onClick={() => { setEditingService(null); setServiceDialog(true); }} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Service
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {(servicesList as any[]).map((service: any) => {
                const folder = (folders as any[]).find((f: any) => f.id === service.folderId);
                const folderStyle = folder ? getFolderStyle(folder.color) : null;

                const isMonthly = service.name.toLowerCase().includes("/mo") || service.name.toLowerCase().includes("monthly") || folder?.name?.includes("Membership");
                const isDiscoverySpecial = service.name.includes("55") || service.name.includes("105") || service.name.toLowerCase().includes("state complaint");

                return (
                  <Card
                    key={service.id}
                    className="p-4 border-border/70 hover:border-amber-400/50 bg-card/80 hover:bg-card transition-all duration-200 shadow-xs group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${
                        service.isActive ? "bg-amber-500/10 border-amber-500/30 text-amber-500" : "bg-muted border-border text-muted-foreground"
                      }`}>
                        {service.name.toLowerCase().includes("complaint") ? (
                          <Scale className="h-5 w-5" />
                        ) : service.name.toLowerCase().includes("membership") ? (
                          <ShieldCheck className="h-5 w-5" />
                        ) : (
                          <Briefcase className="h-5 w-5" />
                        )}
                      </div>

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                            {service.name}
                          </h4>

                          {isDiscoverySpecial && (
                            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] gap-1 py-0">
                              <Sparkles className="h-2.5 w-2.5" /> Discovery Call Ready
                            </Badge>
                          )}

                          {!service.isActive && (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground bg-muted">Inactive</Badge>
                          )}

                          {folderStyle && (
                            <Badge variant="outline" className={`text-[10px] font-medium py-0 ${folderStyle.text}`}>
                              {folder.name}
                            </Badge>
                          )}
                        </div>

                        {service.description && (
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                            {service.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-border/40">
                      <div className="text-right">
                        {service.price != null ? (
                          <div className="flex items-baseline gap-1 justify-end">
                            <span className="text-base font-black text-foreground">
                              ${(service.price / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            {isMonthly && (
                              <span className="text-[11px] font-medium text-muted-foreground">/mo</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Custom Quote</span>
                        )}

                        {service.duration != null && (
                          <div className="flex items-center gap-1 justify-end text-[11px] text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{service.duration} mins</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Move Category">
                              <MoveRight className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => moveService.mutate({ id: service.id, folderId: null })}>
                              <Inbox className="h-3.5 w-3.5 mr-2" /> Unfiled
                            </DropdownMenuItem>
                            {(folders as any[]).map((f: any) => (
                              <DropdownMenuItem key={f.id} onClick={() => moveService.mutate({ id: service.id, folderId: f.id })}>
                                <Folder className="h-3.5 w-3.5 mr-2" /> {f.name}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingService({
                              id: service.id,
                              name: service.name,
                              description: service.description ?? "",
                              price: service.price ? (service.price / 100).toString() : "",
                              duration: service.duration?.toString() ?? "",
                              folderId: service.folderId,
                              isActive: service.isActive ?? true,
                            });
                            setServiceDialog(true);
                          }}
                          className="h-8 text-xs font-semibold gap-1"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500/70 hover:text-red-500 hover:bg-red-500/10"
                          onClick={() => {
                            if (confirm(`Delete service "${service.name}"?`)) {
                              deleteService.mutate({ id: service.id });
                            }
                          }}
                          title="Delete Service"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <ServiceDialog
        open={serviceDialog}
        onClose={() => { setServiceDialog(false); setEditingService(null); }}
        initial={editingService}
        onSave={handleServiceSave}
        saving={serviceSaving}
        folders={folders as any[]}
      />
      <FolderDialog
        open={folderDialog}
        onClose={() => { setFolderDialog(false); setEditingFolder(null); }}
        initial={editingFolder}
        onSave={handleFolderSave}
        saving={folderSaving}
      />
    </div>
  );
}
