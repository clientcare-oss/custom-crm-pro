/**
 * VoiceTextarea — drop-in replacement for <Textarea> that adds a microphone
 * button in the bottom-right corner. Click to start recording, click again to
 * stop. The transcript is appended directly to the field value.
 *
 * Usage:
 *   <VoiceTextarea value={val} onChange={(e) => setVal(e.target.value)} />
 *
 * All standard <textarea> props are forwarded.
 */
import { useRef, useState, useCallback, forwardRef } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
// ─── Types ────────────────────────────────────────────────────────────────────
type RecordingState = "idle" | "recording" | "uploading";

export interface VoiceTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Called when the textarea value changes (same as onChange) */
  onValueChange?: (value: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
const VoiceTextarea = forwardRef<HTMLTextAreaElement, VoiceTextareaProps>(
  ({ className, onChange, onValueChange, value, ...props }, ref) => {
    const [recordingState, setRecordingState] = useState<RecordingState>("idle");
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const mimeTypeRef = useRef<string>("audio/webm");

    const transcribeMutation = trpc.voice.transcribe.useMutation({
      onSuccess: (data) => {
        if (!data.text) return;
        const appended = value ? `${value} ${data.text}` : data.text;
        // Fire both onChange and onValueChange so the parent state updates
        if (onChange) {
          const syntheticEvent = {
            target: { value: appended },
          } as React.ChangeEvent<HTMLTextAreaElement>;
          onChange(syntheticEvent);
        }
        if (onValueChange) onValueChange(appended);
        setRecordingState("idle");
      },
      onError: (err) => {
        toast.error(`Transcription failed: ${err.message}`);
        setRecordingState("idle");
      },
    });

    const startRecording = useCallback(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        chunksRef.current = [];

        // Prefer webm/opus for best Whisper compatibility
        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4";
        mimeTypeRef.current = mimeType;

        const recorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = async () => {
          // Stop all tracks
          stream.getTracks().forEach((t) => t.stop());
          streamRef.current = null;

          const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
          if (blob.size === 0) {
            toast.error("No audio captured. Please try again.");
            setRecordingState("idle");
            return;
          }

          setRecordingState("uploading");

          // Convert blob to base64 and send directly to tRPC — no S3 needed
          try {
            const arrayBuffer = await blob.arrayBuffer();
            const base64 = btoa(
              new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
            );
            await transcribeMutation.mutateAsync({
              audioBase64: base64,
              mimeType: mimeTypeRef.current,
            });
          } catch (err) {
            toast.error(
              err instanceof Error ? err.message : "Transcription failed"
            );
            setRecordingState("idle");
          }
        };

        recorder.start(250); // collect chunks every 250ms
        setRecordingState("recording");
      } catch (err) {
        if (err instanceof DOMException && err.name === "NotAllowedError") {
          toast.error("Microphone access denied. Please allow microphone in your browser settings.");
        } else {
          toast.error("Could not start recording. Please try again.");
        }
        setRecordingState("idle");
      }
    }, [transcribeMutation, value, onChange, onValueChange]);

    const stopRecording = useCallback(() => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    }, []);

    const handleMicClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (recordingState === "recording") {
        stopRecording();
      } else if (recordingState === "idle") {
        startRecording();
      }
    };

    const micIcon = () => {
      if (recordingState === "uploading") {
        return <Loader2 className="h-4 w-4 animate-spin" />;
      }
      if (recordingState === "recording") {
        return <MicOff className="h-4 w-4" />;
      }
      return <Mic className="h-4 w-4" />;
    };

    const micTitle = () => {
      if (recordingState === "uploading") return "Transcribing…";
      if (recordingState === "recording") return "Stop recording";
      return "Click to dictate";
    };

    return (
      <div className="relative group">
        <Textarea
          ref={ref}
          value={value}
          onChange={onChange}
          className={cn(
            // Add right padding so text doesn't overlap the mic button
            "pr-10",
            className
          )}
          {...props}
        />
        <button
          type="button"
          onClick={handleMicClick}
          title={micTitle()}
          disabled={recordingState === "uploading"}
          className={cn(
            "absolute bottom-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200",
            "border border-border/60 shadow-sm",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            recordingState === "recording"
              ? "bg-red-500 text-white border-red-500 animate-pulse shadow-red-500/40 shadow-md"
              : recordingState === "uploading"
              ? "bg-muted text-muted-foreground cursor-wait"
              : "bg-background/80 text-muted-foreground hover:text-foreground hover:bg-accent hover:border-accent opacity-0 group-hover:opacity-100 focus:opacity-100 group-focus-within:opacity-100"
          )}
          aria-label={micTitle()}
        >
          {micIcon()}
        </button>

        {/* Recording indicator label */}
        {recordingState === "recording" && (
          <div className="absolute bottom-2.5 right-10 flex items-center gap-1.5 rounded-full bg-red-500/10 border border-red-500/30 px-2 py-0.5 text-xs font-semibold text-red-500">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            Recording…
          </div>
        )}
        {recordingState === "uploading" && (
          <div className="absolute bottom-2.5 right-10 flex items-center gap-1.5 rounded-full bg-muted border border-border px-2 py-0.5 text-xs font-semibold text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Transcribing…
          </div>
        )}
      </div>
    );
  }
);

VoiceTextarea.displayName = "VoiceTextarea";
export default VoiceTextarea;
