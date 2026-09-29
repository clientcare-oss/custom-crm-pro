import React, { useState, useRef, useCallback } from "react";
import { BrainItem, Status } from "./types";
import StickyNote from "./StickyNote";
import {
  IvyGreeneryDecor,
  BrassCompassDecor,
  PencilCupDecor,
  BigIdeasSignDecor,
  PolaroidLighthouseDecor,
} from "./CorkboardDecorations";
import {
  Zap,
  Image as ImageIcon,
  Mic,
  MicOff,
  Loader2,
  Plus,
  Send,
  UserCheck,
  Calendar,
  Archive,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { uploadImageFile } from "./uploadImage";

interface NotesWallViewProps {
  notes: BrainItem[];
  summaryCounts: {
    total: number;
    pinned: number;
    inProgress: number;
    done: number;
    notStarted: number;
  };
  onNoteClick: (note: BrainItem) => void;
  onQuickAdd: (title: string, category?: string) => Promise<any>;
  onTakeActionClick: (action: "my_tasks" | "recommend" | "assign" | "bring_up" | "archive") => void;
  isQuickAdding?: boolean;
}

export default function NotesWallView({
  notes,
  summaryCounts,
  onNoteClick,
  onQuickAdd,
  onTakeActionClick,
  isQuickAdding = false,
}: NotesWallViewProps) {
  const [quickText, setQuickText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const transcribeMutation = trpc.voice.transcribe.useMutation({
    onSuccess: (data) => {
      if (data.text) {
        setQuickText((prev) => (prev ? `${prev} ${data.text}` : data.text));
      }
      setIsUploading(false);
      setIsRecording(false);
    },
    onError: (err) => {
      toast.error(`Transcription failed: ${err.message}`);
      setIsUploading(false);
      setIsRecording(false);
    },
  });

  const startVoiceRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (blob.size === 0) return;
        setIsUploading(true);
        const arrayBuffer = await blob.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
        );
        await transcribeMutation.mutateAsync({
          audioBase64: base64,
          mimeType: "audio/webm",
        });
      };
      recorder.start(250);
      setIsRecording(true);
    } catch {
      toast.error("Microphone access denied or unavailable.");
      setIsRecording(false);
    }
  }, [transcribeMutation]);

  const stopVoiceRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const handleQuickSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = quickText.trim();
    if (!text) return;
    try {
      await onQuickAdd(text);
      setQuickText("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to add note");
    }
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const toastId = toast.loading("Capturing image note...");
    try {
      const url = await uploadImageFile(file);
      const title =
        quickText.trim() ||
        `Image Note — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
      await onQuickAdd(title, "Resources");
      setQuickText("");
      toast.success("Image note captured!", { id: toastId });
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload image", { id: toastId });
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* ── Main Physical Corkboard Outer Frame ──────────────────────────── */}
      <div
        className="relative w-full rounded-[28px] sm:rounded-[36px] p-4 sm:p-7 lg:p-9 overflow-hidden transition-all duration-300"
        style={{
          backgroundColor: "#3a2212",
          backgroundImage:
            "linear-gradient(135deg, #422815 0%, #2b170a 50%, #422815 100%)",
          boxShadow:
            "inset 0 0 20px rgba(0,0,0,0.8), 0 15px 45px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08)",
        }}
      >
        {/* Inner Wood Bevel Rim Shadow */}
        <div className="absolute inset-2 sm:inset-3 rounded-[22px] sm:rounded-[30px] border border-[#52331b] pointer-events-none shadow-inner" />

        {/* ── Corkboard Surface ─────────────────────────────────────────── */}
        <div
          className="relative rounded-[20px] sm:rounded-[26px] p-6 sm:p-10 lg:p-12 min-h-[560px] overflow-hidden"
          style={{
            backgroundColor: "#a87a51",
            backgroundImage: `
              radial-gradient(ellipse at 50% 30%, rgba(255, 237, 204, 0.22) 0%, rgba(0,0,0,0.38) 100%),
              radial-gradient(#875c36 15%, transparent 16%),
              radial-gradient(#b8875c 15%, transparent 16%)
            `,
            backgroundSize: "100% 100%, 8px 8px, 12px 12px",
            backgroundPosition: "0 0, 0 0, 4px 4px",
            boxShadow:
              "inset 0 0 40px rgba(0,0,0,0.65), inset 0 2px 8px rgba(0,0,0,0.7)",
          }}
        >
          {/* Subtle Warm Lighting Highlights */}
          <div className="absolute -top-32 left-1/4 w-96 h-96 bg-amber-200/10 rounded-full blur-3xl pointer-events-none" />

          {/* ── Atmospheric Perimeter Decorations ───────────────────────── */}
          <IvyGreeneryDecor className="absolute -top-3 -left-3" />
          <BrassCompassDecor className="absolute top-28 -left-2 hidden sm:block" />
          <PencilCupDecor className="absolute -bottom-2 left-4 hidden md:block" />
          <PolaroidLighthouseDecor className="absolute top-14 -right-1 hidden lg:block" />
          <BigIdeasSignDecor className="absolute bottom-20 -right-2 hidden lg:block" />

          {/* ── Sticky Notes Grid ───────────────────────────────────────── */}
          {notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[380px] text-center p-8 z-10 relative">
              <div className="p-4 rounded-3xl bg-[#fef9c3]/90 shadow-[0_8px_25px_rgba(0,0,0,0.3)] max-w-sm transform -rotate-1 border border-amber-300">
                <p className="text-base font-bold text-slate-900 font-serif italic">
                  "No notes on the board yet."
                </p>
                <p className="text-xs text-slate-700 mt-1.5 leading-relaxed">
                  Click <span className="font-bold text-amber-800">+ Add Note</span> above or use the Quick Capture dock below to post your first thought!
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 sm:gap-7 relative z-10">
              {notes.map((note, index) => (
                <StickyNote
                  key={note.id}
                  note={note}
                  onClick={onNoteClick}
                  index={index}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Operational Dock (Quick Capture, Take Action, Live Summary) ── */}
      <div className="w-full rounded-2xl bg-[#0c1424] border border-blue-900/60 p-3 sm:p-4 shadow-[0_8px_30px_rgba(0,0,0,0.7)] text-slate-200">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          {/* Left Block: ⚡ Quick Capture (Cols 1-5) */}
          <div className="lg:col-span-5 flex flex-col gap-1.5 pr-0 lg:pr-3 border-b lg:border-b-0 lg:border-r border-blue-900/40 pb-3 lg:pb-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
              <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>Quick Capture</span>
            </div>

            <form onSubmit={handleQuickSubmit} className="flex items-center gap-1.5 w-full">
              <div className="relative flex-1 flex items-center bg-[#070c18] border border-slate-700/80 rounded-xl px-2.5 h-9 focus-within:border-amber-400 transition-colors">
                <input
                  type="text"
                  value={quickText}
                  onChange={(e) => setQuickText(e.target.value)}
                  placeholder="Type an idea, record audio, or paste an image..."
                  className="w-full bg-transparent text-xs text-white placeholder:text-slate-500 outline-none pr-14"
                />

                {/* Hidden file input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e.target.files)}
                  className="hidden"
                />

                {/* Image button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-slate-400 hover:text-amber-400 p-1 cursor-pointer transition-colors"
                  title="Attach screenshot or image"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>

                {/* Voice button */}
                <button
                  type="button"
                  onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                  disabled={isUploading}
                  className={`p-1 cursor-pointer transition-colors ${
                    isRecording
                      ? "text-rose-500 animate-pulse"
                      : "text-slate-400 hover:text-amber-400"
                  }`}
                  title={isRecording ? "Stop recording" : "Record voice note"}
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  ) : isRecording ? (
                    <MicOff className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </button>
              </div>

              <Button
                type="submit"
                size="sm"
                disabled={!quickText.trim() || isQuickAdding}
                className="h-9 px-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-bold text-xs shrink-0 shadow-sm cursor-pointer"
              >
                {isQuickAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Add"}
              </Button>
            </form>
          </div>

          {/* Middle Block: ⚡ Take Action (Cols 6-9) */}
          <div className="lg:col-span-4 flex flex-col gap-1.5 px-0 lg:px-2 border-b lg:border-b-0 lg:border-r border-blue-900/40 pb-3 lg:pb-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
              <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>Take Action</span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => onTakeActionClick("my_tasks")}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#070c18] hover:bg-[#121c32] border border-blue-900/60 hover:border-amber-400/60 text-[11px] font-semibold text-slate-200 transition-all cursor-pointer whitespace-nowrap"
                title="Convert note into task for yourself"
              >
                <Plus className="w-3 h-3 text-emerald-400" />
                <span>Add to My Tasks</span>
              </button>

              <button
                onClick={() => onTakeActionClick("recommend")}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#070c18] hover:bg-[#121c32] border border-blue-900/60 hover:border-amber-400/60 text-[11px] font-semibold text-slate-200 transition-all cursor-pointer whitespace-nowrap"
                title="Recommend this task to a teammate via Crew Messages"
              >
                <Send className="w-3 h-3 text-cyan-400" />
                <span>Recommend</span>
              </button>

              <button
                onClick={() => onTakeActionClick("assign")}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#070c18] hover:bg-[#121c32] border border-blue-900/60 hover:border-amber-400/60 text-[11px] font-semibold text-slate-200 transition-all cursor-pointer whitespace-nowrap"
                title="Directly assign task (Manager / Admin)"
              >
                <UserCheck className="w-3 h-3 text-amber-400" />
                <span>Assign</span>
              </button>

              <button
                onClick={() => onTakeActionClick("bring_up")}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#070c18] hover:bg-[#121c32] border border-blue-900/60 hover:border-amber-400/60 text-[11px] font-semibold text-slate-200 transition-all cursor-pointer whitespace-nowrap"
                title="Schedule a Bring Up reminder"
              >
                <Calendar className="w-3 h-3 text-indigo-400" />
                <span>Bring Up</span>
              </button>

              <button
                onClick={() => onTakeActionClick("archive")}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#070c18] hover:bg-[#121c32] border border-blue-900/60 hover:border-amber-400/60 text-[11px] font-semibold text-slate-200 transition-all cursor-pointer whitespace-nowrap"
                title="Archive selected note"
              >
                <Archive className="w-3 h-3 text-slate-400" />
                <span>Archive</span>
              </button>
            </div>
          </div>

          {/* Right Block: 📈 Live Calculated Summary (Cols 10-12) */}
          <div className="lg:col-span-3 flex flex-col gap-1.5 pl-0 lg:pl-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Summary</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-orange-400" />
                  Total:
                </span>
                <span className="font-mono font-bold text-white text-[13px]">
                  {summaryCounts.total}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Pinned:
                </span>
                <span className="font-mono font-bold text-white text-[13px]">
                  {summaryCounts.pinned}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  In Progress:
                </span>
                <span className="font-mono font-bold text-white text-[13px]">
                  {summaryCounts.inProgress}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Done:
                </span>
                <span className="font-mono font-bold text-white text-[13px]">
                  {summaryCounts.done}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
