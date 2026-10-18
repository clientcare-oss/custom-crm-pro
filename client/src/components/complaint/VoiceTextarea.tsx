import { useRef, useState } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  textareaClassName?: string;
  onBlur?: () => void;
};

/** Long-text field with voice-to-text mic per Waypoint CRM convention. */
export function VoiceTextarea({
  value,
  onChange,
  placeholder,
  rows = 4,
  className,
  textareaClassName,
  onBlur,
}: Props) {
  const [recording, setRecording] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const transcribe = trpc.complaintEngine.transcribe.useMutation({
    onSuccess: (r) => onChange(value ? `${value.trim()} ${r.text.trim()}` : r.text.trim()),
    onError: (e) => toast.error(`Transcription failed: ${e.message}`),
  });

  async function toggleRecording() {
    if (recording) {
      mediaRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        const buf = await blob.arrayBuffer();
        let binary = "";
        const bytes = new Uint8Array(buf);
        for (let i = 0; i < bytes.length; i += 8192) {
          binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 8192)));
        }
        transcribe.mutate({ audioBase64: btoa(binary), mimeType: blob.type });
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
    } catch {
      toast.error("Microphone access denied");
    }
  }

  return (
    <div className={cn("relative", className)}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        rows={rows}
        className={cn(
          "w-full rounded-md border border-[#22355499] bg-[#0B1F3A] px-3 py-2 pr-10 text-base text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D9A441]/60",
          textareaClassName
        )}
      />
      <button
        type="button"
        onClick={toggleRecording}
        title={recording ? "Stop recording" : "Speak instead of typing"}
        className={cn(
          "absolute right-2.5 top-2.5 rounded-md p-1.5 transition-all shadow-xs cursor-pointer",
          recording
            ? "bg-red-500 text-white animate-pulse shadow-md"
            : "bg-[#031124]/90 border border-[#C5A059]/50 text-[#DFBE77] hover:text-[#FFF4D4] hover:border-[#FFE394] hover:bg-[#071C3A]",
        )}
      >
        {transcribe.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </button>
    </div>
  );
}
