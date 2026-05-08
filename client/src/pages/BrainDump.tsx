import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  MoreHorizontal, Circle, Clock, AlertCircle, Flame,
} from "lucide-react";

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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Brain className="h-4 w-4 text-violet-500" />
            Edit Idea
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Idea title…"
            className="text-sm font-medium"
            autoFocus
          />
          <Textarea
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
              <Input
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
            <Input
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
              <Input
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
function ListRow({ item, onEdit, onDelete, onTogglePin, onStatusChange }: {
  item: BrainItem;
  onEdit: (item: BrainItem) => void;
  onDelete: (id: number) => void;
  onTogglePin: (item: BrainItem) => void;
  onStatusChange: (id: number, status: Status) => void;
}) {
  return (
    <div className={`group flex items-center gap-3 px-4 py-2.5 border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer ${item.pinned ? "bg-violet-50/30 dark:bg-violet-950/10" : ""}`}>
      {/* Priority bar */}
      <div className={`w-1 h-8 rounded-full flex-shrink-0 ${PRIORITY_CONFIG[item.priority].bar}`} />

      {/* Title */}
      <div className="flex-1 min-w-0" onClick={() => onEdit(item)}>
        <p className={`text-sm font-medium truncate ${item.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>
          {item.pinned && <Star className="inline h-3 w-3 text-amber-400 mr-1 fill-amber-400" />}
          {item.title}
        </p>
        {item.nextStep && (
          <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
            <ArrowRight className="h-2.5 w-2.5 flex-shrink-0" />
            {item.nextStep}
          </p>
        )}
      </div>

      {/* Category */}
      <div className="hidden sm:block flex-shrink-0 w-28">
        <CategoryPill category={item.category} />
      </div>

      {/* Date */}
      <div className="hidden md:block flex-shrink-0 w-36 text-[11px] text-muted-foreground">
        {new Date(item.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
      </div>

      {/* Status */}
      <div className="flex-shrink-0 w-28">
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
      <div className="hidden lg:flex flex-shrink-0 w-20 items-center">
        <PriorityDot priority={item.priority} />
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onTogglePin(item)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-amber-500 transition-colors" title={item.pinned ? "Unpin" : "Pin"}>
          {item.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
        </button>
        <button onClick={() => onEdit(item)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <Edit3 className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => onDelete(item.id)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-rose-500 transition-colors">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Kanban Card ──────────────────────────────────────────────────────────────
function KanbanCard({ item, onEdit, onDelete, onTogglePin }: {
  item: BrainItem;
  onEdit: (item: BrainItem) => void;
  onDelete: (id: number) => void;
  onTogglePin: (item: BrainItem) => void;
}) {
  return (
    <div
      className={`group p-3 rounded-lg border bg-card hover:shadow-md transition-all cursor-pointer ${item.pinned ? "border-amber-300 dark:border-amber-700" : "border-border"}`}
      onClick={() => onEdit(item)}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className={`text-xs font-semibold leading-snug flex-1 ${item.status === "done" ? "line-through text-muted-foreground" : ""}`}>
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
      <p className="text-[10px] text-muted-foreground mt-2">
        {new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
      </p>
    </div>
  );
}

// ─── Grid Card ────────────────────────────────────────────────────────────────
function GridCard({ item, onEdit, onDelete, onTogglePin, onStatusChange }: {
  item: BrainItem;
  onEdit: (item: BrainItem) => void;
  onDelete: (id: number) => void;
  onTogglePin: (item: BrainItem) => void;
  onStatusChange: (id: number, status: Status) => void;
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
        <p className={`text-sm font-semibold leading-snug flex-1 ${item.status === "done" ? "line-through text-muted-foreground" : ""}`}>
          {item.pinned && <Star className="inline h-3 w-3 text-amber-400 mr-1 fill-amber-400" />}
          {item.title}
        </p>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={(e) => { e.stopPropagation(); onTogglePin(item); }} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-amber-500">
            {item.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
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
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/40">
        <PriorityDot priority={item.priority} />
        <span className="text-[10px] text-muted-foreground">
          {new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
        </span>
      </div>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BrainDump() {
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

  const utils = trpc.useUtils();

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
            {/* View mode toggle */}
            <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5 border border-border/50">
              {([["list", LayoutList], ["kanban", Kanban], ["card", LayoutGrid]] as [ViewMode, any][]).map(([mode, Icon]) => (
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
              placeholder="Quick capture — type your idea and press Enter…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            />
            <Select value={captureCategory} onValueChange={setCaptureCategory}>
              <SelectTrigger className="h-6 w-28 text-[10px] border-none bg-muted/60 rounded-lg focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allCategories.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={capturePriority} onValueChange={(v) => setCapturePriority(v as Priority)}>
              <SelectTrigger className="h-6 w-24 text-[10px] border-none bg-muted/60 rounded-lg focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["low", "medium", "high", "urgent"] as Priority[]).map((p) => (
                  <SelectItem key={p} value={p} className="text-xs capitalize">{PRIORITY_CONFIG[p].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleCapture}
            disabled={!captureText.trim() || createMutation.isPending}
            size="sm"
            className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-4 gap-1.5 flex-shrink-0"
          >
            <Plus className="h-4 w-4" />
            Capture
          </Button>
        </div>

        {/* ── Category tabs + search ──────────────────────────────────────── */}
        <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide">
          <div className="flex items-center gap-1 flex-shrink-0">
            {categoryTabs.slice(0, 8).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap transition-all ${activeCategory === cat ? "bg-violet-600 text-white shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                {cat}
              </button>
            ))}
            {categoryTabs.length > 8 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="text-xs font-medium px-3 py-1 rounded-full bg-muted/50 text-muted-foreground hover:bg-muted flex items-center gap-1">
                    More <ChevronDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {categoryTabs.slice(8).map((cat) => (
                    <DropdownMenuItem key={cat} onClick={() => setActiveCategory(cat)} className="text-xs">{cat}</DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <div className="flex-1 min-w-[120px] max-w-xs ml-auto">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ideas…"
                className="pl-8 h-7 text-xs rounded-lg"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            Loading your brain dump…
          </div>
        ) : (items as BrainItem[]).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center px-6">
            <Brain className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Nothing here yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Type an idea above and press Enter to capture it instantly</p>
          </div>
        ) : (
          <>
            {/* ── LIST VIEW ─────────────────────────────────────────────── */}
            {viewMode === "list" && (
              <div>
                {/* Column headers */}
                <div className="flex items-center gap-3 px-4 py-2 border-b border-border/50 bg-muted/20 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <div className="w-1 flex-shrink-0" />
                  <div className="flex-1">Idea</div>
                  <div className="hidden sm:block w-28">Category</div>
                  <div className="hidden md:block w-36">Date Captured</div>
                  <div className="w-28">Status</div>
                  <div className="hidden lg:block w-20">Priority</div>
                  <div className="w-20" />
                </div>

                {/* Pinned section */}
                {pinnedItems.length > 0 && (
                  <>
                    <div className="px-4 py-1.5 bg-amber-50/50 dark:bg-amber-950/10 border-b border-amber-200/50 dark:border-amber-800/30">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Star className="h-3 w-3 fill-amber-400" /> Pinned
                      </span>
                    </div>
                    {pinnedItems.map((item) => (
                      <ListRow key={item.id} item={item} onEdit={(i) => { setEditItem(i); setEditOpen(true); }} onDelete={handleDelete} onTogglePin={handleTogglePin} onStatusChange={handleStatusChange} />
                    ))}
                  </>
                )}

                {/* All ideas */}
                {unpinnedItems.length > 0 && (
                  <>
                    {pinnedItems.length > 0 && (
                      <div className="px-4 py-1.5 bg-muted/10 border-b border-border/30">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">All Ideas</span>
                      </div>
                    )}
                    {unpinnedItems.map((item) => (
                      <ListRow key={item.id} item={item} onEdit={(i) => { setEditItem(i); setEditOpen(true); }} onDelete={handleDelete} onTogglePin={handleTogglePin} onStatusChange={handleStatusChange} />
                    ))}
                  </>
                )}
              </div>
            )}

            {/* ── KANBAN VIEW ───────────────────────────────────────────── */}
            {viewMode === "kanban" && (
              <div className="flex gap-4 p-6 overflow-x-auto min-h-full">
                {KANBAN_COLUMNS.map((col) => {
                  const colItems = (items as BrainItem[]).filter((i) => i.status === col);
                  return (
                    <div key={col} className="flex-shrink-0 w-64">
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`h-2 w-2 rounded-full ${STATUS_CONFIG[col].dot}`} />
                        <span className="text-xs font-bold text-foreground">{STATUS_CONFIG[col].label}</span>
                        <span className="ml-auto text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">{colItems.length}</span>
                      </div>
                      <div className="space-y-2">
                        {colItems.map((item) => (
                          <KanbanCard key={item.id} item={item} onEdit={(i) => { setEditItem(i); setEditOpen(true); }} onDelete={handleDelete} onTogglePin={handleTogglePin} />
                        ))}
                        {colItems.length === 0 && (
                          <div className="border border-dashed border-border/50 rounded-lg p-4 text-center text-[11px] text-muted-foreground/50">
                            No ideas here
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── CARD VIEW ─────────────────────────────────────────────── */}
            {viewMode === "card" && (
              <div className="p-6">
                {pinnedItems.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                      <span className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">Pinned</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {pinnedItems.map((item) => (
                        <GridCard key={item.id} item={item} onEdit={(i) => { setEditItem(i); setEditOpen(true); }} onDelete={handleDelete} onTogglePin={handleTogglePin} onStatusChange={handleStatusChange} />
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {unpinnedItems.map((item) => (
                    <GridCard key={item.id} item={item} onEdit={(i) => { setEditItem(i); setEditOpen(true); }} onDelete={handleDelete} onTogglePin={handleTogglePin} onStatusChange={handleStatusChange} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Edit Dialog ──────────────────────────────────────────────────── */}
      <EditDialog
        item={editItem}
        open={editOpen}
        onClose={() => { setEditOpen(false); setEditItem(null); }}
        onSave={handleSaveEdit}
        allCategories={allCategories}
      />
    </div>
  );
}
