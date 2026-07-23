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
  X, Save, Inbox, MoveRight, Briefcase, Clock, DollarSign,
} from "lucide-react";
import { toast } from "sonner";

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
            <Briefcase className="h-5 w-5 text-blue-500" />
            {initial?.id ? "Edit Service" : "New Service"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Service Name *</Label>
            <Input placeholder="e.g. IEP Advocacy Session" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input placeholder="Brief description of this service" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Price ($)</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Duration (min)</Label>
              <Input type="number" placeholder="60" value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Folder</Label>
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
          <div className="flex items-center gap-2">
            <Switch checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
            <Label>Active (visible to clients)</Label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving}><X className="h-4 w-4 mr-1" /> Cancel</Button>
            <Button onClick={() => onSave(form)} disabled={saving || !form.name.trim()}>
              <Save className="h-4 w-4 mr-1" />{saving ? "Saving..." : "Save"}
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
            <Input placeholder="e.g. Consultation Services" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
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

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-blue-500" />
            Services
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage services clients can choose from</p>
        </div>
        <Button onClick={() => { setEditingService(null); setServiceDialog(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> New Service
        </Button>
      </div>

      <div className="flex gap-6">
        {/* Folder Sidebar */}
        <div className="w-56 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Folders</span>
            <button onClick={() => { setEditingFolder(null); setFolderDialog(true); }} className="text-muted-foreground hover:text-foreground" title="New Folder">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-0.5">
            {/* All */}
            <button
              onClick={() => setActiveFolder("all")}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${activeFolder === "all" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
            >
              <Briefcase className="h-4 w-4 shrink-0" />
              <span className="truncate">All Services</span>
              <span className="ml-auto text-xs opacity-60">{servicesList.length}</span>
            </button>
            {/* Unfiled */}
            <button
              onClick={() => setActiveFolder("unfiled")}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${activeFolder === "unfiled" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
            >
              <Inbox className="h-4 w-4 shrink-0" />
              <span className="truncate">Unfiled</span>
            </button>
            {/* Folders */}
            {(folders as any[]).map((folder: any) => {
              const style = getFolderStyle(folder.color);
              const isActive = activeFolder === folder.id;
              return (
                <div key={folder.id} className={`group flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors cursor-pointer ${isActive ? "bg-primary/10 font-medium" : "hover:bg-muted"}`}>
                  <button onClick={() => setActiveFolder(folder.id)} className="flex items-center gap-2 flex-1 min-w-0">
                    {isActive
                      ? <FolderOpen className={`h-4 w-4 shrink-0 ${style.text}`} />
                      : <Folder className={`h-4 w-4 shrink-0 ${style.text}`} />
                    }
                    <span className="truncate">{folder.name}</span>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity"><MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" /></button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => { setEditingFolder({ id: folder.id, name: folder.name, color: folder.color ?? "blue" }); setFolderDialog(true); }}>
                        <Pencil className="h-3.5 w-3.5 mr-2" /> Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={() => { if (confirm(`Delete "${folder.name}"? Services will move to Unfiled.`)) deleteFolder.mutate({ id: folder.id }); }}>
                        <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        </div>

        {/* Services List */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted/40 rounded-lg animate-pulse" />)}
            </div>
          ) : (servicesList as any[]).length === 0 ? (
            <div className="border border-dashed border-border rounded-lg p-8 text-center">
              <Briefcase className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">No services yet</p>
              <Button variant="outline" className="mt-3 gap-2" onClick={() => { setEditingService(null); setServiceDialog(true); }}>
                <Plus className="h-4 w-4" /> Add Service
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {(servicesList as any[]).map((service: any) => {
                const folder = (folders as any[]).find((f: any) => f.id === service.folderId);
                const folderStyle = folder ? getFolderStyle(folder.color) : null;
                return (
                  <Card key={service.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors group">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${service.isActive ? "bg-blue-100 dark:bg-blue-900/30" : "bg-muted"}`}>
                        <Briefcase className={`h-4 w-4 ${service.isActive ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground truncate">{service.name}</p>
                          {!service.isActive && <Badge variant="outline" className="text-xs text-muted-foreground">Inactive</Badge>}
                          {folderStyle && activeFolder === "all" && (
                            <Badge variant="outline" className={`text-xs ${folderStyle.text}`}>{folder.name}</Badge>
                          )}
                        </div>
                        {service.description && <p className="text-xs text-muted-foreground truncate">{service.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {service.price != null && (
                        <span className="text-sm font-medium text-foreground flex items-center gap-1">
                          <DollarSign className="h-3.5 w-3.5 text-green-600" />
                          {(service.price / 100).toFixed(2)}
                        </span>
                      )}
                      {service.duration != null && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {service.duration}m
                        </span>
                      )}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><MoveRight className="h-3.5 w-3.5" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => moveService.mutate({ id: service.id, folderId: null })}>Unfiled</DropdownMenuItem>
                            {(folders as any[]).map((f: any) => (
                              <DropdownMenuItem key={f.id} onClick={() => moveService.mutate({ id: service.id, folderId: f.id })}>{f.name}</DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
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
                        }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => { if (confirm("Delete this service?")) deleteService.mutate({ id: service.id }); }}>
                          <Trash2 className="h-3.5 w-3.5" />
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
