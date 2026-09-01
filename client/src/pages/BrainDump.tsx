import React, { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Brain,
  Plus,
  Search,
  LayoutList,
  LayoutGrid,
  Kanban,
  Star,
  Zap,
  Mic,
  MicOff,
  Loader2,
  Printer,
  Copy,
  Sparkles,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import PageIdBadge from "@/components/PageIdBadge";

import {
  BrainItem,
  Status,
  Priority,
  ViewMode,
  DEFAULT_CATEGORIES,
  STATUS_CONFIG,
  PRIORITY_CONFIG,
  KANBAN_COLUMNS,
} from "@/components/braindump/types";
import BrainDumpListRow from "@/components/braindump/BrainDumpListRow";
import BrainDumpGridCard from "@/components/braindump/BrainDumpGridCard";
import BrainDumpKanbanCard from "@/components/braindump/BrainDumpKanbanCard";
import BrainDumpEditDialog from "@/components/braindump/BrainDumpEditDialog";
import BrainDumpConvertToTaskDialog from "@/components/braindump/BrainDumpConvertToTaskDialog";

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
  const captureMimeTypeRef = useRef<string>("audio/webm");

  const utils = trpc.useUtils();

  const captureTranscribeMutation = trpc.voice.transcribe.useMutation({
    onSuccess: (data) => {
      if (!data.text) return;
      setCaptureText((prev) => (prev ? `${prev} ${data.text}` : data.text));
      setCaptureVoiceState("idle");
      captureRef.current?.focus();
    },
    onError: (err) => {
      toast.error(`Transcription failed: ${err.message}`);
      setCaptureVoiceState("idle");
    },
  });

  const startCaptureRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      captureStreamRef.current = stream;
      captureChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      captureMimeTypeRef.current = mimeType;
      const recorder = new MediaRecorder(stream, { mimeType });
      captureMediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) captureChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        captureStreamRef.current = null;
        const blob = new Blob(captureChunksRef.current, { type: captureMimeTypeRef.current });
        if (blob.size === 0) {
          toast.error("No audio captured.");
          setCaptureVoiceState("idle");
          return;
        }
        setCaptureVoiceState("uploading");
        try {
          const arrayBuffer = await blob.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
          );
          await captureTranscribeMutation.mutateAsync({
            audioBase64: base64,
            mimeType: captureMimeTypeRef.current,
          });
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Transcription failed");
          setCaptureVoiceState("idle");
        }
      };
      recorder.start(250);
      setCaptureVoiceState("recording");
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        toast.error("Microphone access denied. Please allow microphone permissions.");
      } else {
        toast.error("Could not start microphone.");
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
    onSuccess: () => {
      utils.brainDump.list.invalidate();
      utils.brainDump.categories.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.brainDump.update.useMutation({
    onMutate: async (vars) => {
      await utils.brainDump.list.cancel();
      const prev = utils.brainDump.list.getData();
      utils.brainDump.list.setData(undefined, (old) =>
        old?.map((i: any) => (i.id === vars.id ? { ...i, ...vars } : i)) ?? old
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) utils.brainDump.list.setData(undefined, ctx.prev);
    },
    onSettled: () => utils.brainDump.list.invalidate(),
  });

  const deleteMutation = trpc.brainDump.delete.useMutation({
    onMutate: async ({ id }) => {
      await utils.brainDump.list.cancel();
      const prev = utils.brainDump.list.getData();
      utils.brainDump.list.setData(undefined, (old) => old?.filter((i: any) => i.id !== id) ?? old);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) utils.brainDump.list.setData(undefined, ctx.prev);
    },
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

  const handleConvertToTask = (item: BrainItem) => {
    setConvertItem(item);
    setConvertOpen(true);
  };

  const pinnedItems = (items as BrainItem[]).filter((i) => i.pinned);
  const unpinnedItems = (items as BrainItem[]).filter((i) => !i.pinned);
  const categoryTabs = ["All", ...allCategories];

  const doneCount = (items as BrainItem[]).filter((i) => i.status === "done").length;
  const inProgressCount = (items as BrainItem[]).filter((i) => i.status === "in_progress").length;

  return (
    <div className="w-full space-y-3.5 pb-12">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-2 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 shadow-2xs">
            <Brain className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight text-foreground">Advocate BrainDump</h1>
              <PageIdBadge id="PG-021" name="Advocate BrainDump" />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              High-speed idea capture, advocacy insights, meeting notes & instant task conversion.
            </p>
          </div>
        </div>

        {/* Header Action Tools — with clearance for floating dev buttons */}
        <div className="flex items-center gap-2 flex-wrap lg:mr-64">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const text = items
                .map((item) => {
                  let line = `${item.title}`;
                  if (item.body) line += `\n${item.body}`;
                  if (item.tags.length > 0) line += `\nTags: ${item.tags.join(", ")}`;
                  line += `\nStatus: ${STATUS_CONFIG[item.status]?.label || item.status} | Priority: ${
                    PRIORITY_CONFIG[item.priority]?.label || item.priority
                  } | Category: ${item.category}`;
                  return line;
                })
                .join("\n\n---\n\n");
              navigator.clipboard.writeText(text);
              toast.success("Copied all ideas to clipboard");
            }}
            className="h-8 text-xs gap-1.5"
            title="Copy all ideas to clipboard"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy All
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const text = items
                .map((item) => {
                  let line = `${item.title}`;
                  if (item.body) line += `\n${item.body}`;
                  if (item.tags.length > 0) line += `\nTags: ${item.tags.join(", ")}`;
                  line += `\nStatus: ${STATUS_CONFIG[item.status]?.label || item.status} | Priority: ${
                    PRIORITY_CONFIG[item.priority]?.label || item.priority
                  } | Category: ${item.category}`;
                  return line;
                })
                .join("\n\n---\n\n");
              const printWindow = window.open("", "", "width=800,height=600");
              if (printWindow) {
                printWindow.document.write(
                  `<pre style="font-family: monospace; white-space: pre-wrap; word-wrap: break-word; padding: 20px;">${text
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")}</pre>`
                );
                printWindow.document.close();
                printWindow.print();
              }
            }}
            className="h-8 text-xs gap-1.5"
            title="Print ideas list"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </Button>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-0.5 bg-muted/60 rounded-lg p-0.5 border border-border">
            {(
              [
                ["list", LayoutList, "List"],
                ["kanban", Kanban, "Kanban"],
                ["card", LayoutGrid, "Grid"],
              ] as [ViewMode, any, string][]
            ).map(([mode, Icon, label]) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${
                  viewMode === mode
                    ? "bg-background shadow-xs text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title={`${label} view`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Quick Capture Bar ──────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Main Input with Mic */}
          <div className="flex-1 flex items-center gap-2 bg-muted/40 border border-input rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-violet-400/40 focus-within:border-violet-500 transition-all">
            <Zap className="h-4 w-4 text-violet-500 flex-shrink-0" />
            <input
              ref={captureRef}
              value={captureText}
              onChange={(e) => setCaptureText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCapture()}
              placeholder="Quick capture — type an idea and hit Enter (or record audio)..."
              className="flex-1 bg-transparent text-xs sm:text-sm outline-none placeholder:text-muted-foreground/60 text-foreground"
            />
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
                  : "text-violet-500 hover:bg-violet-100 dark:hover:bg-violet-950/50"
              }`}
              title={captureVoiceState === "recording" ? "Stop recording" : "Voice input capture"}
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

          {/* Category Select */}
          <div className="w-full sm:w-36 flex-shrink-0">
            <Select value={captureCategory} onValueChange={setCaptureCategory}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allCategories.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority Select */}
          <div className="w-full sm:w-32 flex-shrink-0">
            <Select value={capturePriority} onValueChange={(v) => setCapturePriority(v as Priority)}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["low", "medium", "high", "urgent"] as Priority[]).map((p) => (
                  <SelectItem key={p} value={p} className="text-xs">
                    {PRIORITY_CONFIG[p].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Capture Submit Button */}
          <Button
            onClick={handleCapture}
            disabled={!captureText.trim()}
            size="sm"
            className="h-9 px-4 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs flex-shrink-0 shadow-xs"
          >
            <Plus className="h-4 w-4 mr-1" /> Capture
          </Button>
        </div>

        {/* Quick Stats & Tips Bar */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-2 pt-2 border-t border-border/40 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span>
              Total: <strong className="text-foreground">{items.length}</strong>
            </span>
            <span>•</span>
            <span>
              Pinned: <strong className="text-amber-500">{pinnedItems.length}</strong>
            </span>
            <span>•</span>
            <span>
              In Progress: <strong className="text-blue-500">{inProgressCount}</strong>
            </span>
            <span>•</span>
            <span>
              Done: <strong className="text-emerald-500">{doneCount}</strong>
            </span>
          </div>
          <span className="hidden md:inline text-muted-foreground/80">
            Tip: Press <kbd className="px-1 py-0.5 bg-muted rounded border text-[10px]">Enter</kbd> to save immediately
          </span>
        </div>
      </div>

      {/* ── Search & Category Filter Strip ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        {/* Search input */}
        <div className="relative flex-shrink-0 sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ideas, tags or notes…"
            className="w-full pl-8 pr-8 py-1.5 text-xs bg-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-500 transition-all placeholder:text-muted-foreground/70"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none flex-1">
          {categoryTabs.map((cat) => {
            const count =
              cat === "All"
                ? items.length
                : (items as BrainItem[]).filter((i) => i.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeCategory === cat
                    ? "bg-violet-600 text-white shadow-2xs font-bold"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40"
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    activeCategory === cat
                      ? "bg-white/20 text-white"
                      : "bg-muted text-muted-foreground/80"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main Content View ──────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
            <p className="text-xs">Loading advocate ideas…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground text-center px-4">
            <div className="p-3 rounded-2xl bg-violet-100 dark:bg-violet-950/40 text-violet-500">
              <Brain className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">No ideas found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                {search || activeCategory !== "All"
                  ? "Try adjusting your search query or category filter."
                  : "Use the Quick Capture bar above to record notes, IEP strategies, or action items."}
              </p>
            </div>
          </div>
        ) : viewMode === "list" ? (
          <div>
            {/* List Header Bar */}
            <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-muted/40 border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider w-full">
              <div className="w-1 flex-shrink-0" />
              <div className="flex-1 min-w-0">Idea / Title</div>
              <div className="w-28 flex-shrink-0 text-center">Category</div>
              <div className="w-28 flex-shrink-0 text-center">Status</div>
              <div className="hidden lg:block w-20 flex-shrink-0 text-center">Priority</div>
              <div className="hidden md:block w-24 flex-shrink-0 text-center">Date</div>
              <div className="w-24 flex-shrink-0 text-right pr-1">Actions</div>
            </div>

            {/* Pinned Section */}
            {pinnedItems.length > 0 && (
              <div className="border-b border-border/80">
                <div className="px-4 py-1.5 bg-amber-500/10 border-b border-border/50 flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                  <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    Pinned Ideas ({pinnedItems.length})
                  </span>
                </div>
                {pinnedItems.map((item) => (
                  <BrainDumpListRow
                    key={item.id}
                    item={item}
                    onEdit={(i) => {
                      setEditItem(i);
                      setEditOpen(true);
                    }}
                    onDelete={handleDelete}
                    onTogglePin={handleTogglePin}
                    onStatusChange={handleStatusChange}
                    onConvertToTask={handleConvertToTask}
                  />
                ))}
              </div>
            )}

            {/* Unpinned Items */}
            {unpinnedItems.map((item) => (
              <BrainDumpListRow
                key={item.id}
                item={item}
                onEdit={(i) => {
                  setEditItem(i);
                  setEditOpen(true);
                }}
                onDelete={handleDelete}
                onTogglePin={handleTogglePin}
                onStatusChange={handleStatusChange}
                onConvertToTask={handleConvertToTask}
              />
            ))}
          </div>
        ) : viewMode === "kanban" ? (
          <div className="p-4 overflow-x-auto">
            <div className="flex gap-4 min-w-[900px]">
              {KANBAN_COLUMNS.map((col) => {
                const colItems = (items as BrainItem[]).filter((i) => i.status === col);
                const cfg = STATUS_CONFIG[col];
                return (
                  <div key={col} className="flex-1 min-w-[220px] bg-muted/20 rounded-xl p-3 border border-border/60">
                    <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-border/50">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                        <span className="text-xs font-bold text-foreground">{cfg.label}</span>
                      </div>
                      <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                        {colItems.length}
                      </Badge>
                    </div>

                    <div className="space-y-2.5 min-h-[300px]">
                      {colItems.map((item) => (
                        <BrainDumpKanbanCard
                          key={item.id}
                          item={item}
                          onEdit={(i) => {
                            setEditItem(i);
                            setEditOpen(true);
                          }}
                          onDelete={handleDelete}
                          onTogglePin={handleTogglePin}
                          onConvertToTask={handleConvertToTask}
                        />
                      ))}
                      {colItems.length === 0 && (
                        <div className="h-24 rounded-lg border-2 border-dashed border-border/50 flex items-center justify-center text-xs text-muted-foreground/60">
                          No items
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {(items as BrainItem[]).map((item) => (
              <BrainDumpGridCard
                key={item.id}
                item={item}
                onEdit={(i) => {
                  setEditItem(i);
                  setEditOpen(true);
                }}
                onDelete={handleDelete}
                onTogglePin={handleTogglePin}
                onStatusChange={handleStatusChange}
                onConvertToTask={handleConvertToTask}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Dialog Modals ──────────────────────────────────────────────────── */}
      <BrainDumpEditDialog
        item={editItem}
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditItem(null);
        }}
        onSave={handleSaveEdit}
        allCategories={allCategories}
      />

      <BrainDumpConvertToTaskDialog
        item={convertItem}
        open={convertOpen}
        onClose={() => {
          setConvertOpen(false);
          setConvertItem(null);
        }}
      />
    </div>
  );
}
