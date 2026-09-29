import React, { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { BrainItem, Status, Priority, PRIORITY_CONFIG, STATUS_CONFIG, DEFAULT_CATEGORIES } from "./types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Lightbulb,
  X,
  Tag,
  ArrowRight,
  Calendar,
  Image as ImageIcon,
  Loader2,
  Trash2,
  Zap,
  CheckCircle2,
  Building,
  User,
  Star,
  Pin,
} from "lucide-react";
import BrainDumpImageStrip from "./BrainDumpImageStrip";
import { uploadImageFile } from "./uploadImage";

interface NoteEditorDialogProps {
  note: BrainItem | null;
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<BrainItem> & { id: number }) => void;
  onDelete?: (id: number) => void;
  onTakeAction?: (note: BrainItem) => void;
  categories: string[];
  isCeoOrAdmin?: boolean;
  companyName?: string;
}

export default function NoteEditorDialog({
  note,
  open,
  onClose,
  onSave,
  onDelete,
  onTakeAction,
  categories,
  isCeoOrAdmin = true,
  companyName = "Waypoint Advocates",
}: NoteEditorDialogProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("General");
  const [customCat, setCustomCat] = useState("");
  const [status, setStatus] = useState<Status>("not_started");
  const [priority, setPriority] = useState<Priority>("medium");
  const [scope, setScope] = useState<"employee" | "company">("employee");
  const [bringUpDate, setBringUpDate] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [pinned, setPinned] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  const { data: images = [], refetch: refetchImages } = trpc.brainDumpImages.listByItem.useQuery(
    { brainDumpItemId: note?.id ?? 0 },
    { enabled: !!note && open, refetchOnWindowFocus: false }
  );

  const uploadImageMutation = trpc.brainDumpImages.upload.useMutation({
    onSuccess: () => {
      refetchImages();
      utils.brainDumpImages.listByItem.invalidate({ brainDumpItemId: note?.id ?? 0 });
    },
    onError: (e) => toast.error(`Failed to save image: ${e.message}`),
  });

  const deleteImageMutation = trpc.brainDumpImages.delete.useMutation({
    onSuccess: () => {
      refetchImages();
      utils.brainDumpImages.listByItem.invalidate({ brainDumpItemId: note?.id ?? 0 });
    },
    onError: (e) => toast.error(`Failed to delete image: ${e.message}`),
  });

  useEffect(() => {
    if (note) {
      setTitle(note.title || "");
      setBody(note.body || "");
      setCategory(note.category || "General");
      setStatus(note.status || "not_started");
      setPriority(note.priority || "medium");
      setScope(note.scope === "company" ? "company" : "employee");
      setBringUpDate(note.bringUpDate || "");
      setNextStep(note.nextStep || "");
      setPinned(Boolean(note.pinned));
      setTags(note.tags || []);
      setCustomCat("");
      setTagInput("");
    }
  }, [note, open]);

  const handleImageFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!note) return;
      const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (!imageFiles.length) return;
      setIsUploadingImage(true);
      try {
        for (const file of imageFiles) {
          const url = await uploadImageFile(file);
          await uploadImageMutation.mutateAsync({ brainDumpItemId: note.id, imageUrl: url });
        }
        toast.success(`${imageFiles.length} image attached`);
      } catch (err: any) {
        toast.error(err?.message || "Image upload failed");
      } finally {
        setIsUploadingImage(false);
      }
    },
    [note, uploadImageMutation]
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
    if (!note) return;
    const finalCategory = customCat.trim() || category;
    onSave({
      id: note.id,
      title: title.trim(),
      body: body.trim() || null,
      category: finalCategory,
      status,
      priority,
      scope,
      bringUpDate: bringUpDate.trim() || null,
      nextStep: nextStep.trim() || null,
      pinned,
      tags,
    });
    onClose();
  };

  if (!note) return null;

  const allCats = Array.from(new Set([...DEFAULT_CATEGORIES, ...categories]));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        onPaste={handlePaste}
        className="max-w-xl max-h-[90vh] overflow-y-auto bg-[#0f172a] border border-blue-900/60 text-slate-100 p-0 shadow-2xl"
      >
        {/* Header */}
        <DialogHeader className="p-5 pb-3 border-b border-blue-900/40 bg-[#090f19]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-400/15 text-amber-400 border border-amber-400/30">
                <Lightbulb className="w-5 h-5 fill-amber-400/20" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white tracking-tight">
                  Edit Note
                </DialogTitle>
                <span className="text-[11px] text-slate-400">
                  Business workspace item · Not added to client records
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 mr-6">
              {/* Pin toggle button */}
              <button
                type="button"
                onClick={() => setPinned(!pinned)}
                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                  pinned
                    ? "bg-amber-400/20 border-amber-400/50 text-amber-300"
                    : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white"
                }`}
                title={pinned ? "Pinned to top" : "Click to pin"}
              >
                <Pin className={`w-4 h-4 ${pinned ? "fill-amber-400" : ""}`} />
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* Form Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Scope Selector (CEO/Admin only) */}
          {isCeoOrAdmin && (
            <div className="p-2.5 rounded-xl bg-[#090f19] border border-blue-900/40 flex items-center justify-between">
              <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                Note Scope:
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setScope("employee")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    scope === "employee"
                      ? "bg-sky-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <User className="w-3 h-3" />
                  <span>👤 My Notes</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScope("company")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    scope === "company"
                      ? "bg-amber-500 text-slate-950 font-black shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Building className="w-3 h-3" />
                  <span>🏢 Company Notes</span>
                </button>
              </div>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1">
            <Label className="text-slate-300 font-semibold text-xs">Title</Label>
            <VoiceInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title or quick thought..."
              className="bg-[#070c18] border-slate-700 text-sm font-semibold text-white h-9 rounded-xl"
              autoFocus
            />
          </div>

          {/* Details & Body */}
          <div className="space-y-1">
            <Label className="text-slate-300 font-semibold text-xs">Details & Context</Label>
            <VoiceTextarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Add full notes, ideas, research, links, or instructions..."
              className="min-h-[85px] bg-[#070c18] border-slate-700 text-xs text-slate-200 rounded-xl leading-relaxed"
            />
          </div>

          {/* Row: Category & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-slate-300 font-semibold text-xs">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-[#070c18] border-slate-700 text-xs h-8 text-slate-200 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                  {allCats.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-slate-300 font-semibold text-xs">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger className="bg-[#070c18] border-slate-700 text-xs h-8 text-slate-200 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status Buttons */}
          <div className="space-y-1">
            <Label className="text-slate-300 font-semibold text-xs">Status</Label>
            <div className="grid grid-cols-4 gap-1.5">
              {(["not_started", "in_progress", "done", "archived"] as Status[]).map((s) => {
                const isCurrent = status === s;
                const conf = STATUS_CONFIG[s];
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`py-1.5 px-2 rounded-lg border text-center text-[11px] font-bold transition-all cursor-pointer ${
                      isCurrent
                        ? "bg-amber-400 text-slate-950 border-amber-300 shadow-sm"
                        : "bg-[#070c18] border-slate-700 text-slate-400 hover:text-white"
                    }`}
                  >
                    {conf.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row: Bring Up Date & Immediate Next Step */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-slate-300 font-semibold text-xs flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-400" /> Bring Up Date
              </Label>
              <Input
                type="date"
                value={bringUpDate}
                onChange={(e) => setBringUpDate(e.target.value)}
                className="bg-[#070c18] border-slate-700 text-xs text-white h-8 rounded-lg"
              />
              <span className="text-[10px] text-slate-500 block">
                Reminder only · Does not change task due dates
              </span>
            </div>

            <div className="space-y-1">
              <Label className="text-slate-300 font-semibold text-xs flex items-center gap-1">
                <ArrowRight className="w-3.5 h-3.5 text-emerald-400" /> Next Step
              </Label>
              <VoiceInput
                value={nextStep}
                onChange={(e) => setNextStep(e.target.value)}
                placeholder="Immediate next action..."
                className="bg-[#070c18] border-slate-700 text-xs text-white h-8 rounded-lg"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label className="text-slate-300 font-semibold text-xs flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-cyan-400" /> Tags
            </Label>
            <div className="flex gap-2">
              <VoiceInput
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                placeholder="Type tag & press enter..."
                className="bg-[#070c18] border-slate-700 text-xs text-white h-8 rounded-lg flex-1"
              />
              <Button size="sm" variant="outline" onClick={addTag} className="text-xs h-8 border-slate-700">
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 text-[11px] bg-slate-800 text-cyan-200 border border-slate-700 px-2 py-0.5 rounded-md font-medium"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => setTags(tags.filter((x) => x !== t))}
                      className="text-slate-400 hover:text-rose-400 ml-0.5"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Attached Images */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <Label className="text-slate-300 font-semibold text-xs flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5 text-blue-400" /> Images & Screenshots
              </Label>
              <span className="text-[10px] text-slate-500">Paste with Ctrl+V</span>
            </div>

            <BrainDumpImageStrip
              images={images as { id: number; imageUrl: string }[]}
              onDelete={(id) => deleteImageMutation.mutate({ imageId: id })}
            />

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleImageFiles(e.target.files)}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="text-xs h-7 border-slate-700 text-slate-300 hover:text-white"
                disabled={isUploadingImage}
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploadingImage ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                Upload Image
              </Button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-4 border-t border-blue-900/40 bg-[#090f19] flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  onDelete(note.id);
                  onClose();
                }}
                className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 h-8"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
              </Button>
            )}
            {onTakeAction && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onTakeAction(note);
                  onClose();
                }}
                className="text-xs border-amber-400/50 text-amber-300 hover:bg-amber-400/10 h-8"
              >
                <Zap className="w-3.5 h-3.5 mr-1" /> Take Action
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-white h-8"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={!title.trim()}
              className="text-xs bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold h-8 px-4"
            >
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
