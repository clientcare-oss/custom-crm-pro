import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import VoiceInput from "@/components/VoiceInput";
import { Textarea } from "@/components/ui/textarea";
import VoiceTextarea from "@/components/VoiceTextarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Brain, Plus, Search, Pin, PinOff, Trash2, Edit3, LayoutList,
  LayoutGrid, Kanban, Star, ChevronDown, X, Check, Zap, Tag, ArrowRight,
  MoreHorizontal, Circle, Clock, AlertCircle, Flame, Zap as ConvertIcon,
  Mic, MicOff, Loader2, ImagePlus, Image as ImageIcon,
} from "lucide-react";

// ─── Image Upload Helper ──────────────────────────────────────────────────────
async function uploadImageFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);
  const res = await fetch("/api/images/upload", { method: "POST", body: formData });
  if (!res.ok) throw new Error("Image upload failed");
  const { url } = await res.json();
  return url as string;
}

// ─── Image Thumbnail Strip ────────────────────────────────────────────────────
function ImageThumbnailStrip({ images, onDelete }: {
  images: { id: number; imageUrl: string }[];
  onDelete?: (id: number) => void;
}) {
  if (!images.length) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {images.map((img) => (
        <div key={img.id} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-border shadow-sm flex-shrink-0">
          <img src={img.imageUrl} alt="attachment" className="w-full h-full object-cover" />
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(img.id); }}
              className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          )}
          <a href={img.imageUrl} target="_blank" rel="noopener noreferrer" className="absolute inset-0" onClick={(e) => e.stopPropagation()} />
        </div>
      ))}
    </div>
  );
}

// ─── Small Thumbnail Strip (for card/list views) ──────────────────────────────
function SmallThumbnailStrip({ itemId }: { itemId: number }) {
  const { data: images = [] } = trpc.brainDumpImages.listByItem.useQuery(
    { brainDumpItemId: itemId },
    { refetchOnWindowFocus: false }
  );
  if (!images.length) return null;
  return (
    <div className="flex gap-1 mt-1.5 flex-wrap">
      {images.slice(0, 4).map((img) => (
        <a
          key={img.id}
          href={img.imageUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="w-8 h-8 rounded overflow-hidden border border-border flex-shrink-0 hover:ring-2 hover:ring-violet-400 transition-all"
          title="Click to view image"
        >
          <img src={img.imageUrl} alt="img" className="w-full h-full object-cover" />
        </a>
      ))}
      {images.length > 4 && (
        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-[9px] text-muted-foreground font-bold flex-shrink-0">
          +{images.length - 4}
        </div>
      )}
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Status = "not_started" | "in_progress" | "done" | "archived";
type Priority = "low" | "medium" | "high" | "urgent";
type ViewMode = "list" | "kanban" | "card";

interface BrainItem {
  id: number;
  title: string;
  body?: string | null;
  category: string;
  status: Status;
  priority: Priority;
  nextStep?: string | null;
  pinned: boolean;
  tags: string[];
  createdAt: string | Date;
  updatedAt: string | Date;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const DEFAULT_CATEGORIES = ["General", "CRM", "AI Tools", "Workflows", "Business", "Feature Requests", "Automations", "Operations"];

const STATUS_CONFIG: Record<Status, { label: string; color: string; dot: string; icon: React.ReactNode }> = {
  not_started: { label: "Not Started", color: "bg-muted/60 text-muted-foreground border-border", dot: "bg-muted-foreground", icon: <Circle className="h-3 w-3" /> },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800", dot: "bg-blue-500", icon: <Clock className="h-3 w-3" /> },
  done: { label: "Done", color: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800", dot: "bg-emerald-500", icon: <Check className="h-3 w-3" /> },
  archived: { label: "Archived", color: "bg-muted/30 text-muted-foreground/60 border-border/40", dot: "bg-muted-foreground/40", icon: <X className="h-3 w-3" /> },
};

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bar: string; icon: React.ReactNode }> = {
  low: { label: "Low", color: "text-muted-foreground", bar: "bg-muted-foreground/30", icon: <Circle className="h-3 w-3" /> },
  medium: { label: "Medium", color: "text-blue-500", bar: "bg-blue-400", icon: <AlertCircle className="h-3 w-3" /> },
  high: { label: "High", color: "text-orange-500", bar: "bg-orange-400", icon: <Zap className="h-3 w-3" /> },
  urgent: { label: "Urgent", color: "text-rose-500", bar: "bg-rose-500", icon: <Flame className="h-3 w-3" /> },
};

const KANBAN_COLUMNS: Status[] = ["not_started", "in_progress", "done", "archived"];

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Status }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── Priority Dot ─────────────────────────────────────────────────────────────
function PriorityDot({ priority }: { priority: Priority }) {
  const cfg = PRIORITY_CONFIG[priority];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${cfg.color}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ─── Category Pill ────────────────────────────────────────────────────────────
function CategoryPill({ category }: { category: string }) {
  const colors: Record<string, string> = {
    CRM: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
    "AI Tools": "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300",
    Workflows: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    Business: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    "Feature Requests": "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
    Automations: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
    Operations: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${colors[category] ?? "bg-muted text-muted-foreground"}`}>
      {category}
    </span>
  );
}

// ─── Edit Dialog ──────────────────────────────────────────────────────────────
function EditDialog({
  item,
  open,
  onClose,
  onSave,
  allCategories,
}: {
  item: BrainItem | null;
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<BrainItem> & { id: number }) => void;
  allCategories: string[];
}) {
  const [title, setTitle] = useState(item?.title ?? "");
  const [body, setBody] = useState(item?.body ?? "");
  const [category, setCategory] = useState(item?.category ?? "General");
  const [customCat, setCustomCat] = useState("");
  const [status, setStatus] = useState<Status>(item?.status ?? "not_started");
  const [priority, setPriority] = useState<Priority>(item?.priority ?? "medium");
  const [nextStep, setNextStep] = useState(item?.nextStep ?? "");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(item?.tags ?? []);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();

  const { data: images = [], refetch: refetchImages } = trpc.brainDumpImages.listByItem.useQuery(
    { brainDumpItemId: item?.id ?? 0 },
    { enabled: !!item && open, refetchOnWindowFocus: false }
  );

  const uploadImageMutation = trpc.brainDumpImages.upload.useMutation({
    onSuccess: () => {
      refetchImages();
      utils.brainDumpImages.listByItem.invalidate({ brainDumpItemId: item?.id ?? 0 });
    },
    onError: (e) => toast.error(`Failed to save image: ${e.message}`),
  });

  const deleteImageMutation = trpc.brainDumpImages.delete.useMutation({
    onSuccess: () => {
      refetchImages();
      utils.brainDumpImages.listByItem.invalidate({ brainDumpItemId: item?.id ?? 0 });
    },
    onError: (e) => toast.error(`Failed to delete image: ${e.message}`),
  });

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setBody(item.body ?? "");
      setCategory(item.category);
      setStatus(item.status);
      setPriority(item.priority);
      setNextStep(item.nextStep ?? "");
      setTags(item.tags ?? []);
    }
  }, [item]);

  const handleImageFiles = useCallback(async (files: FileList | File[]) => {
    if (!item) return;
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!imageFiles.length) return;
    setIsUploadingImage(true);
    try {
      for (const file of imageFiles) {
        const url = await uploadImageFile(file);
        await uploadImageMutation.mutateAsync({ brainDumpItemId: item.id, imageUrl: url });
      }
      toast.success(`${imageFiles.length} image${imageFiles.length > 1 ? "s" : ""} attached`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setIsUploadingImage(false);
    }
  }, [item, uploadImageMutation]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const files = e.clipboardData?.files;
    if (files && files.length > 0) {
      const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (imageFiles.length > 0) {
        e.preventDefault();
        handleImageFiles(imageFiles);
      }
    }
  }, [handleImageFiles]);

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  const handleSave = () => {
    if (!item) return;
    const finalCategory = customCat.trim() || category;
    onSave({ id: item.id, title, body: body || null, category: finalCategory, status, priority, nextStep: nextStep || null, tags });
    onClose();
  };

  if (!item) return null;

  const cats = Array.from(new Set([...DEFAULT_CATEGORIES, ...allCategories]));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" onPaste={handlePaste}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Brain className="h-4 w-4 text-violet-500" />
            Edit Idea
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <VoiceInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Idea title…"
            className="text-sm font-medium"
            autoFocus
          />
          <VoiceTextarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Details, context, or notes… (optional)"
            className="min-h-[80px] text-sm"
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cats.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <VoiceInput
                value={customCat}
                onChange={(e) => setCustomCat(e.target.value)}
                placeholder="Or type a new category…"
                className="text-xs h-7 mt-1"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Priority</label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger className="text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["low", "medium", "high", "urgent"] as Priority[]).map((p) => (
                    <SelectItem key={p} value={p} className="text-xs capitalize">{PRIORITY_CONFIG[p].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Status</label>
            <div className="flex flex-wrap gap-2">
              {(["not_started", "in_progress", "done", "archived"] as Status[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all ${status === s ? STATUS_CONFIG[s].color + " ring-2 ring-offset-1 ring-current" : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/60"}`}
                >
                  {STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <ArrowRight className="h-3 w-3" /> Next Step
            </label>
            <VoiceInput
              value={nextStep}
              onChange={(e) => setNextStep(e.target.value)}
              placeholder="What's the immediate next action?"
              className="text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Tag className="h-3 w-3" /> Tags
            </label>
            <div className="flex gap-2">
              <VoiceInput
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                placeholder="Add tag, press Enter…"
                className="text-xs"
              />
              <Button size="sm" variant="outline" onClick={addTag} className="text-xs px-3">Add</Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 text-[10px] bg-muted px-2 py-0.5 rounded-full">
                    {t}
                    <button onClick={() => setTags(tags.filter((x) => x !== t))} className="text-muted-foreground hover:text-foreground">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ── Image Attachments ──────────────────────────────────────────── */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <ImageIcon className="h-3 w-3" /> Images
            </label>
            <ImageThumbnailStrip
              images={images as { id: number; imageUrl: string }[]}
              onDelete={(id) => deleteImageMutation.mutate({ imageId: id })}
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="text-xs gap-1.5"
                disabled={isUploadingImage}
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploadingImage ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <ImagePlus className="h-3 w-3" />
                )}
                {isUploadingImage ? "Uploading…" : "Add Image"}
              </Button>
              <span className="text-[10px] text-muted-foreground">or paste an image anywhere in this dialog</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleImageFiles(e.target.files)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={!title.trim()} className="text-xs">Save Changes</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── List Row ─────────────────────────────────────────────────────────────────
function ListRow({ item, onEdit, onDelete, onTogglePin, onStatusChange, onConvertToTask }: {
  item: BrainItem;
  onEdit: (item: BrainItem) => void;
  onDelete: (id: number) => void;
  onTogglePin: (item: BrainItem) => void;
  onStatusChange: (id: number, status: Status) => void;
  onConvertToTask: (item: BrainItem) => void;
}) {
  return (
    <div className={`group flex items-start gap-3 px-4 py-2.5 border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer ${item.pinned ? "bg-violet-50/30 dark:bg-violet-950/10" : ""}`}>
      {/* Priority bar */}
      <div className={`w-1 h-8 rounded-full flex-shrink-0 mt-1 ${PRIORITY_CONFIG[item.priority].bar}`} />

      {/* Title + thumbnails */}
      <div className="flex-1 min-w-0" onClick={() => onEdit(item)}>
        <p className={`text-lg font-normal truncate ${item.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>
          {item.pinned && <Star className="inline h-3 w-3 text-amber-400 mr-1 fill-amber-400" />}
          {item.title}
        </p>
        {item.nextStep && (
          <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
            <ArrowRight className="h-2.5 w-2.5 flex-shrink-0" />
            {item.nextStep}
          </p>
        )}
        <SmallThumbnailStrip itemId={item.id} />
      </div>

      {/* Category */}
      <div className="hidden sm:block flex-shrink-0 w-28 mt-1">
        <CategoryPill category={item.category} />
      </div>

      {/* Date */}
      <div className="hidden md:block flex-shrink-0 w-36 text-[11px] text-muted-foreground mt-1">
        {new Date(item.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
      </div>

      {/* Status */}
      <div className="flex-shrink-0 w-28 mt-0.5">
        <Select value={item.status} onValueChange={(v) => onStatusChange(item.id, v as Status)}>
          <SelectTrigger className="h-6 text-[10px] border-none bg-transparent p-0 focus:ring-0 w-auto gap-1">
            <StatusBadge status={item.status} />
          </SelectTrigger>
          <SelectContent>
            {(["not_started", "in_progress", "done", "archived"] as Status[]).map((s) => (
              <SelectItem key={s} value={s} className="text-xs">{STATUS_CONFIG[s].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Priority */}
      <div className="hidden lg:flex flex-shrink-0 w-20 items-center mt-1">
        <PriorityDot priority={item.priority} />
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
        <button onClick={() => onTogglePin(item)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-amber-500 transition-colors" title={item.pinned ? "Unpin" : "Pin"}>
          {item.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
        </button>
        <button onClick={() => onEdit(item)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <Edit3 className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => onConvertToTask(item)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-emerald-500 transition-colors" title="Convert to Task">
          <ConvertIcon className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => onDelete(item.id)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-rose-500 transition-colors">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Kanban Card ──────────────────────────────────────────────────────────────
function KanbanCard({ item, onEdit, onDelete, onTogglePin, onConvertToTask }: {
  item: BrainItem;
  onEdit: (item: BrainItem) => void;
  onDelete: (id: number) => void;
  onTogglePin: (item: BrainItem) => void;
  onConvertToTask: (item: BrainItem) => void;
}) {
  return (
    <div
      className={`group p-3 rounded-lg border bg-card hover:shadow-md transition-all cursor-pointer ${item.pinned ? "border-amber-300 dark:border-amber-700" : "border-border"}`}
      onClick={() => onEdit(item)}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className={`text-base font-normal leading-snug flex-1 ${item.status === "done" ? "line-through text-muted-foreground" : ""}`}>
          {item.pinned && <Star className="inline h-3 w-3 text-amber-400 mr-1 fill-amber-400" />}
          {item.title}
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <button className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-all">
              <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-xs">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onTogglePin(item); }}>
              {item.pinned ? "Unpin" : "Pin"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="text-rose-600">
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <CategoryPill category={item.category} />
        <PriorityDot priority={item.priority} />
      </div>
      {item.nextStep && (
        <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
          <ArrowRight className="h-2.5 w-2.5 flex-shrink-0" />
          {item.nextStep}
        </p>
      )}
      <SmallThumbnailStrip itemId={item.id} />
      <p className="text-[10px] text-muted-foreground mt-2">
        {new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
      </p>
    </div>
  );
}

// ─── Grid Card ────────────────────────────────────────────────────────────────
function GridCard({ item, onEdit, onDelete, onTogglePin, onStatusChange, onConvertToTask }: {
  item: BrainItem;
  onEdit: (item: BrainItem) => void;
  onDelete: (id: number) => void;
  onTogglePin: (item: BrainItem) => void;
  onStatusChange: (id: number, status: Status) => void;
  onConvertToTask: (item: BrainItem) => void;
}) {
  const priorityBorder: Record<Priority, string> = {
    low: "border-l-muted-foreground/30",
    medium: "border-l-blue-400",
    high: "border-l-orange-400",
    urgent: "border-l-rose-500",
  };
  return (
    <Card
      className={`group p-4 rounded-xl border-l-4 ${priorityBorder[item.priority]} hover:shadow-lg transition-all cursor-pointer ${item.pinned ? "ring-1 ring-amber-300 dark:ring-amber-700" : ""}`}
      onClick={() => onEdit(item)}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className={`text-lg font-normal leading-snug flex-1 ${item.status === "done" ? "line-through text-muted-foreground" : ""}`}>
          {item.pinned && <Star className="inline h-3 w-3 text-amber-400 mr-1 fill-amber-400" />}
          {item.title}
        </p>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={(e) => { e.stopPropagation(); onTogglePin(item); }} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-amber-500">
            {item.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); onConvertToTask(item); }} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-emerald-500">
            <ConvertIcon className="h-3.5 w-3.5" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-rose-500">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {item.body && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{item.body}</p>
      )}
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <CategoryPill category={item.category} />
        <StatusBadge status={item.status} />
      </div>
      {item.nextStep && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <ArrowRight className="h-2.5 w-2.5 flex-shrink-0" />
          {item.nextStep}
        </p>
      )}
      <SmallThumbnailStrip itemId={item.id} />
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/40">
        <PriorityDot priority={item.priority} />
        <span className="text-[10px] text-muted-foreground">
          {new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
        </span>
      </div>
    </Card>
  );
}

// ─── Convert to Task Dialog ───────────────────────────────────────────────────
function ConvertToTaskDialog({ item, open, onClose }: {
  item: BrainItem | null;
  open: boolean;
  onClose: () => void;
}) {
  const [selectedAssignee, setSelectedAssignee] = useState<string>("");
  const { data: teamUsers = [] } = trpc.internalTasks.getTeamUsers.useQuery();
  const { data: itemImages = [] } = trpc.brainDumpImages.listByItem.useQuery(
    { brainDumpItemId: item?.id ?? 0 },
    { enabled: !!item && open, refetchOnWindowFocus: false }
  );

  const createTaskMutation = trpc.internalTasks.create.useMutation({
    onSuccess: () => {
      toast.success("Task created from brain dump item");
      onClose();
      setSelectedAssignee("");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleConvert = async () => {
    if (!item || !selectedAssignee) {
      toast.error("Please select an assignee");
      return;
    }

    let assigneeId: number | null = null;
    let assigneeContactId: number | null = null;

    if (selectedAssignee === "__none__") {
      // Unassigned
    } else if (selectedAssignee.startsWith("user-")) {
      assigneeId = parseInt(selectedAssignee.substring(5));
    } else if (selectedAssignee.startsWith("contact-")) {
      assigneeContactId = parseInt(selectedAssignee.substring(8));
    }

    // Build resources from attached images
    const resources = (itemImages as { id: number; imageUrl: string }[]).map((img) => ({
      label: "image",
      url: img.imageUrl,
    }));

    await createTaskMutation.mutateAsync({
      title: item.title,
      description: item.body || undefined,
      assigneeId: assigneeId || undefined,
      assigneeContactId: assigneeContactId || undefined,
      resources: resources.length > 0 ? JSON.stringify(resources) : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convert to Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Task Title</p>
            <p className="text-sm text-muted-foreground">{item?.title}</p>
          </div>
          {itemImages.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                <ImageIcon className="h-3 w-3" />
                {itemImages.length} image{itemImages.length > 1 ? "s" : ""} will be attached to the task
              </p>
              <div className="flex gap-1.5 flex-wrap">
                {(itemImages as { id: number; imageUrl: string }[]).map((img) => (
                  <div key={img.id} className="w-10 h-10 rounded overflow-hidden border border-border">
                    <img src={img.imageUrl} alt="img" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="text-sm font-medium">Assign to</label>
            <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
              <SelectTrigger>
                <SelectValue placeholder="Select assignee..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Unassigned</SelectItem>
                {teamUsers.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">STAFF</div>
                    {teamUsers.map((user: any) => (
                      <SelectItem key={user.id} value={`user-${user.id}`}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleConvert} disabled={createTaskMutation.isPending}>
              {createTaskMutation.isPending ? "Converting..." : "Convert to Task"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BrainDump() {
  const [convertItem, setConvertItem] = useState<BrainItem | null>(null);
  const [convertOpen, setConvertOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [editItem, setEditItem] = useState<BrainItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  // Quick capture state
  const [captureText, setCaptureText] = useState("");
  const [captureCategory, setCaptureCategory] = useState("General");
  const [capturePriority, setCapturePriority] = useState<Priority>("medium");
  const captureRef = useRef<HTMLInputElement>(null);
  // Voice capture state for Quick Capture bar
  const [captureVoiceState, setCaptureVoiceState] = useState<"idle" | "recording" | "uploading">("idle");
  const captureMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const captureChunksRef = useRef<Blob[]>([]);
  const captureStreamRef = useRef<MediaStream | null>(null);

  const utils = trpc.useUtils();

  const captureTranscribeMutation = trpc.voice.transcribe.useMutation({
    onSuccess: (data) => {
      if (!data.text) return;
      setCaptureText((prev) => prev ? `${prev} ${data.text}` : data.text);
      setCaptureVoiceState("idle");
      captureRef.current?.focus();
    },
    onError: (err) => {
      toast.error(`Transcription failed: ${err.message}`);
      setCaptureVoiceState("idle");
    },
  });

  const captureMimeTypeRef = useRef<string>("audio/webm");

  const startCaptureRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      captureStreamRef.current = stream;
      captureChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      captureMimeTypeRef.current = mimeType;
      const recorder = new MediaRecorder(stream, { mimeType });
      captureMediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => { if (e.data.size > 0) captureChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        captureStreamRef.current = null;
        const blob = new Blob(captureChunksRef.current, { type: captureMimeTypeRef.current });
        if (blob.size === 0) { toast.error("No audio captured."); setCaptureVoiceState("idle"); return; }
        setCaptureVoiceState("uploading");
        try {
          const arrayBuffer = await blob.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
          );
          await captureTranscribeMutation.mutateAsync({ audioBase64: base64, mimeType: captureMimeTypeRef.current });
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Transcription failed");
          setCaptureVoiceState("idle");
        }
      };
      recorder.start(250);
      setCaptureVoiceState("recording");
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        toast.error("Microphone access denied. Please allow microphone in your browser settings.");
      } else {
        toast.error("Could not start recording.");
      }
      setCaptureVoiceState("idle");
    }
  }, [captureTranscribeMutation]);

  const stopCaptureRecording = useCallback(() => {
    if (captureMediaRecorderRef.current && captureMediaRecorderRef.current.state !== "inactive") {
      captureMediaRecorderRef.current.stop();
    }
  }, []);

  const { data: items = [], isLoading } = trpc.brainDump.list.useQuery(
    { search: search || undefined, category: activeCategory !== "All" ? activeCategory : undefined },
    { refetchOnWindowFocus: false }
  );

  const { data: dbCategories = [] } = trpc.brainDump.categories.useQuery();
  const allCategories = Array.from(new Set([...DEFAULT_CATEGORIES, ...dbCategories]));

  const createMutation = trpc.brainDump.create.useMutation({
    onSuccess: () => { utils.brainDump.list.invalidate(); utils.brainDump.categories.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.brainDump.update.useMutation({
    onMutate: async (vars) => {
      await utils.brainDump.list.cancel();
      const prev = utils.brainDump.list.getData();
      utils.brainDump.list.setData(undefined, (old) =>
        old?.map((i: any) => i.id === vars.id ? { ...i, ...vars } : i) ?? old
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) utils.brainDump.list.setData(undefined, ctx.prev); },
    onSettled: () => utils.brainDump.list.invalidate(),
  });
  const handleConvertToTask = (item: BrainItem) => {
    setConvertItem(item);
    setConvertOpen(true);
  };

  const deleteMutation = trpc.brainDump.delete.useMutation({
    onMutate: async ({ id }) => {
      await utils.brainDump.list.cancel();
      const prev = utils.brainDump.list.getData();
      utils.brainDump.list.setData(undefined, (old) => old?.filter((i: any) => i.id !== id) ?? old);
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) utils.brainDump.list.setData(undefined, ctx.prev); },
    onSettled: () => utils.brainDump.list.invalidate(),
  });

  const handleCapture = useCallback(() => {
    const text = captureText.trim();
    if (!text) return;
    createMutation.mutate({ title: text, category: captureCategory, priority: capturePriority });
    setCaptureText("");
    captureRef.current?.focus();
    toast.success("Idea captured! 🧠");
  }, [captureText, captureCategory, capturePriority, createMutation]);

  const handleTogglePin = (item: BrainItem) => {
    updateMutation.mutate({ id: item.id, pinned: !item.pinned });
  };

  const handleStatusChange = (id: number, status: Status) => {
    updateMutation.mutate({ id, status });
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ id });
    toast.success("Idea deleted.");
  };

  const handleSaveEdit = (data: Partial<BrainItem> & { id: number }) => {
    updateMutation.mutate(data as any);
    toast.success("Idea updated.");
  };

  const pinnedItems = (items as BrainItem[]).filter((i) => i.pinned);
  const unpinnedItems = (items as BrainItem[]).filter((i) => !i.pinned);

  const categoryTabs = ["All", ...allCategories];

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-950/40">
              <Brain className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">🧠 BrainDump</h1>
              <p className="text-xs text-muted-foreground">Your second brain — capture everything before it disappears</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Copy All / Print buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const text = items.map((item) => {
                    let line = `${item.title}`;
                    if (item.body) line += `\n${item.body}`;
                    if (item.tags.length > 0) line += `\nTags: ${item.tags.join(", ")}`;
                    line += `\nStatus: ${STATUS_CONFIG[item.status].label} | Priority: ${PRIORITY_CONFIG[item.priority].label} | Category: ${item.category}`;
                    return line;
                  }).join("\n\n---\n\n");
                  navigator.clipboard.writeText(text);
                  toast.success("Copied all ideas to clipboard");
                }}
                className="h-8 text-xs"
              >
                Copy All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const text = items.map((item) => {
                    let line = `${item.title}`;
                    if (item.body) line += `\n${item.body}`;
                    if (item.tags.length > 0) line += `\nTags: ${item.tags.join(", ")}`;
                    line += `\nStatus: ${STATUS_CONFIG[item.status].label} | Priority: ${PRIORITY_CONFIG[item.priority].label} | Category: ${item.category}`;
                    return line;
                  }).join("\n\n---\n\n");
                  const printWindow = window.open("", "", "width=800,height=600");
                  if (printWindow) {
                    printWindow.document.write(`<pre style="font-family: monospace; white-space: pre-wrap; word-wrap: break-word; padding: 20px;">${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`);
                    printWindow.document.close();
                    printWindow.print();
                  }
                }}
                className="h-8 text-xs"
              >
                Print
              </Button>
            </div>

            {/* View mode toggle */}
            <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5 border border-border/50">
              {([['list', LayoutList], ['kanban', Kanban], ['card', LayoutGrid]] as [ViewMode, any][]).map(([mode, Icon]) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`p-1.5 rounded-md transition-all ${viewMode === mode ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  title={mode.charAt(0).toUpperCase() + mode.slice(1) + " view"}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Quick Capture ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 flex items-center gap-2 bg-muted/30 border border-border rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-violet-400/40 focus-within:border-violet-400/60 transition-all">
            <Zap className="h-4 w-4 text-violet-500 flex-shrink-0" />
            <input
              ref={captureRef}
              value={captureText}
              onChange={(e) => setCaptureText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCapture()}
              placeholder="Quick capture — type an idea and press Enter…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            />
            {/* Inline mic button */}
            <button
              type="button"
              onClick={() => {
                if (captureVoiceState === "recording") {
                  stopCaptureRecording();
                } else if (captureVoiceState === "idle") {
                  startCaptureRecording();
                }
              }}
              disabled={captureVoiceState === "uploading"}
              className={`flex-shrink-0 p-1.5 rounded-full transition-all ${
                captureVoiceState === "recording"
                  ? "bg-rose-500 text-white animate-pulse"
                  : captureVoiceState === "uploading"
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "text-violet-500 hover:bg-violet-100 dark:hover:bg-violet-950/40"
              }`}
              title={captureVoiceState === "recording" ? "Stop recording" : "Voice capture"}
            >
              {captureVoiceState === "uploading" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : captureVoiceState === "recording" ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </button>
          </div>
          <Select value={captureCategory} onValueChange={setCaptureCategory}>
            <SelectTrigger className="w-36 text-xs h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allCategories.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={capturePriority} onValueChange={(v) => setCapturePriority(v as Priority)}>
            <SelectTrigger className="w-28 text-xs h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["low", "medium", "high", "urgent"] as Priority[]).map((p) => (
                <SelectItem key={p} value={p} className="text-xs">{PRIORITY_CONFIG[p].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleCapture} disabled={!captureText.trim()} size="sm" className="h-9 px-4 bg-violet-600 hover:bg-violet-700 text-white">
            <Plus className="h-4 w-4 mr-1" /> Capture
          </Button>
        </div>

        {/* ── Search + Category Tabs ─────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0 w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ideas…"
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted/30 border border-border rounded-lg outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-400/60 transition-all"
            />
          </div>
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {categoryTabs.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 text-[11px] font-semibold px-3 py-1 rounded-full transition-all ${
                  activeCategory === cat
                    ? "bg-violet-600 text-white"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading ideas…
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
            <Brain className="h-10 w-10 opacity-20" />
            <p className="text-sm font-medium">No ideas yet — start capturing!</p>
            <p className="text-xs opacity-70">Use the Quick Capture bar above to add your first idea.</p>
          </div>
        ) : viewMode === "list" ? (
          <div>
            {pinnedItems.length > 0 && (
              <div>
                <div className="px-4 py-1.5 bg-amber-50/50 dark:bg-amber-950/10 border-b border-border/50">
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                    <Star className="h-3 w-3 fill-current" /> Pinned
                  </span>
                </div>
                {pinnedItems.map((item) => (
                  <ListRow
                    key={item.id}
                    item={item}
                    onEdit={(i) => { setEditItem(i); setEditOpen(true); }}
                    onDelete={handleDelete}
                    onTogglePin={handleTogglePin}
                    onStatusChange={handleStatusChange}
                    onConvertToTask={handleConvertToTask}
                  />
                ))}
              </div>
            )}
            {unpinnedItems.map((item) => (
              <ListRow
                key={item.id}
                item={item}
                onEdit={(i) => { setEditItem(i); setEditOpen(true); }}
                onDelete={handleDelete}
                onTogglePin={handleTogglePin}
                onStatusChange={handleStatusChange}
                onConvertToTask={handleConvertToTask}
              />
            ))}
          </div>
        ) : viewMode === "kanban" ? (
          <div className="flex gap-4 p-4 overflow-x-auto min-h-full">
            {KANBAN_COLUMNS.map((col) => {
              const colItems = (items as BrainItem[]).filter((i) => i.status === col);
              return (
                <div key={col} className="flex-shrink-0 w-64">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`h-2 w-2 rounded-full ${STATUS_CONFIG[col].dot}`} />
                    <span className="text-xs font-bold text-foreground">{STATUS_CONFIG[col].label}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{colItems.length}</span>
                  </div>
                  <div className="space-y-2">
                    {colItems.map((item) => (
                      <KanbanCard
                        key={item.id}
                        item={item}
                        onEdit={(i) => { setEditItem(i); setEditOpen(true); }}
                        onDelete={handleDelete}
                        onTogglePin={handleTogglePin}
                        onConvertToTask={handleConvertToTask}
                      />
                    ))}
                    {colItems.length === 0 && (
                      <div className="h-16 rounded-lg border-2 border-dashed border-border/40 flex items-center justify-center text-[10px] text-muted-foreground/50">
                        Empty
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {(items as BrainItem[]).map((item) => (
              <GridCard
                key={item.id}
                item={item}
                onEdit={(i) => { setEditItem(i); setEditOpen(true); }}
                onDelete={handleDelete}
                onTogglePin={handleTogglePin}
                onStatusChange={handleStatusChange}
                onConvertToTask={handleConvertToTask}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Dialogs ─────────────────────────────────────────────────────────── */}
      <EditDialog
        item={editItem}
        open={editOpen}
        onClose={() => { setEditOpen(false); setEditItem(null); }}
        onSave={handleSaveEdit}
        allCategories={allCategories}
      />
      <ConvertToTaskDialog
        item={convertItem}
        open={convertOpen}
        onClose={() => { setConvertOpen(false); setConvertItem(null); }}
      />
    </div>
  );
}
