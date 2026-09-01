import React, { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import VoiceInput from "@/components/VoiceInput";
import VoiceTextarea from "@/components/VoiceTextarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Brain,
  X,
  Tag,
  ArrowRight,
  Loader2,
  ImagePlus,
  Image as ImageIcon,
} from "lucide-react";
import BrainDumpImageStrip from "./BrainDumpImageStrip";
import { BrainItem, Status, Priority, STATUS_CONFIG, PRIORITY_CONFIG, DEFAULT_CATEGORIES } from "./types";

async function uploadImageFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);
  const res = await fetch("/api/images/upload", { method: "POST", body: formData });
  if (!res.ok) throw new Error("Image upload failed");
  const { url } = await res.json();
  return url as string;
}

export default function BrainDumpEditDialog({
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
      setCustomCat("");
      setTagInput("");
    }
  }, [item, open]);

  const handleImageFiles = useCallback(
    async (files: FileList | File[]) => {
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
    },
    [item, uploadImageMutation]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const files = e.clipboardData?.files;
      if (files && files.length > 0) {
        const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
        if (imageFiles.length > 0) {
          e.preventDefault();
          handleImageFiles(imageFiles);
        }
      }
    },
    [handleImageFiles]
  );

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  const handleSave = () => {
    if (!item) return;
    const finalCategory = customCat.trim() || category;
    onSave({
      id: item.id,
      title,
      body: body || null,
      category: finalCategory,
      status,
      priority,
      nextStep: nextStep || null,
      tags,
    });
    onClose();
  };

  if (!item) return null;

  const cats = Array.from(new Set([...DEFAULT_CATEGORIES, ...allCategories]));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" onPaste={handlePaste}>
        <DialogHeader className="pb-1 border-b border-border/60">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <div className="p-1 rounded-md bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400">
              <Brain className="h-4 w-4" />
            </div>
            Edit Idea
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3.5 pt-2 text-sm">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Title</label>
            <VoiceInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Idea title…"
              className="text-sm font-medium h-9"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Details & Context</label>
            <VoiceTextarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Details, context, or notes… (optional)"
              className="min-h-[75px] text-xs leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cats.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <VoiceInput
                value={customCat}
                onChange={(e) => setCustomCat(e.target.value)}
                placeholder="Or custom category…"
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
                    <SelectItem key={p} value={p} className="text-xs capitalize">
                      {PRIORITY_CONFIG[p].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Status</label>
            <div className="grid grid-cols-4 gap-1.5">
              {(["not_started", "in_progress", "done", "archived"] as Status[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`text-[11px] font-semibold py-1.5 px-2 rounded-lg border text-center transition-all ${
                    status === s
                      ? STATUS_CONFIG[s].color + " ring-2 ring-violet-400 font-bold shadow-2xs"
                      : "bg-muted/40 text-muted-foreground border-border hover:bg-muted/70"
                  }`}
                >
                  {STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <ArrowRight className="h-3 w-3 text-amber-500" /> Next Step
            </label>
            <VoiceInput
              value={nextStep}
              onChange={(e) => setNextStep(e.target.value)}
              placeholder="What's the immediate next action?"
              className="text-xs h-8"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Tag className="h-3 w-3 text-violet-500" /> Tags
            </label>
            <div className="flex gap-2">
              <VoiceInput
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                placeholder="Add tag, press Enter…"
                className="text-xs h-8"
              />
              <Button size="sm" variant="outline" onClick={addTag} className="text-xs px-3 h-8">
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 text-[11px] bg-muted/80 border border-border/60 px-2 py-0.5 rounded-md font-medium text-foreground"
                  >
                    #{t}
                    <button
                      onClick={() => setTags(tags.filter((x) => x !== t))}
                      className="text-muted-foreground hover:text-rose-500 ml-0.5"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ── Image Attachments ──────────────────────────────────────────── */}
          <div className="space-y-2 pt-1 border-t border-border/60">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <ImageIcon className="h-3.5 w-3.5 text-blue-500" /> Images & Screenshots
              </label>
              <span className="text-[10px] text-muted-foreground">Paste image with Ctrl+V</span>
            </div>

            <BrainDumpImageStrip
              images={images as { id: number; imageUrl: string }[]}
              onDelete={(id) => deleteImageMutation.mutate({ imageId: id })}
            />

            <div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="text-xs gap-1.5 h-7"
                disabled={isUploadingImage}
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploadingImage ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <ImagePlus className="h-3 w-3" />
                )}
                {isUploadingImage ? "Uploading…" : "Add Image File"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleImageFiles(e.target.files)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-xs h-8">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!title.trim()}
              className="text-xs h-8 bg-violet-600 hover:bg-violet-700 text-white font-semibold"
            >
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
