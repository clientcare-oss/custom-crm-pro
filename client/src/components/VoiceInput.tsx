/**
 * VoiceInput — drop-in replacement for <Input> that adds a microphone button
 * on the right side. Click to start recording, click again to stop.
 * The transcript is appended directly to the field value.
 *
 * Usage:
 *   <VoiceInput value={val} onChange={(e) => setVal(e.target.value)} />
 *
 * All standard <input> props are forwarded.
 */
import { useRef, useState, useCallback, forwardRef } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type RecordingState = "idle" | "recording" | "uploading";

export interface VoiceInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onValueChange?: (value: string) => void;
}

const VoiceInput = forwardRef<HTMLInputElement, VoiceInputProps>(
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
        if (onChange) {
          const syntheticEvent = {
            target: { value: appended },
          } as React.ChangeEvent<HTMLInputElement>;
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
          stream.getTracks().forEach((t) => t.stop());
          streamRef.current = null;

          const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
          if (blob.size === 0) {
            toast.error("No audio captured. Please try again.");
            setRecordingState("idle");
            return;
          }

          setRecordingState("uploading");

          try {
            // Convert blob to base64 and send directly to tRPC — no S3 needed
            const arrayBuffer = await blob.arrayBuffer();
            const base64 = btoa(
              new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
            );
            await transcribeMutation.mutateAsync({
              audioBase64: base64,
              mimeType: mimeTypeRef.current,
            });
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Transcription failed");
            setRecordingState("idle");
          }
        };

        recorder.start(250);
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
      if (recordingState === "recording") stopRecording();
      else if (recordingState === "idle") startRecording();
    };

    return (
      <div className="relative group">
        <Input
          ref={ref}
          value={value}
          onChange={onChange}
          className={cn("pr-8", className)}
          {...props}
        />
        <button
          type="button"
          onClick={handleMicClick}
          title={
            recordingState === "uploading" ? "Transcribing…"
            : recordingState === "recording" ? "Stop recording"
            : "Click to dictate"
          }
          disabled={recordingState === "uploading"}
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full transition-all duration-200",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            recordingState === "recording"
              ? "text-red-500 animate-pulse"
              : recordingState === "uploading"
              ? "text-muted-foreground cursor-wait"
              : "text-muted-foreground/50 hover:text-foreground opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
          )}
          aria-label={
            recordingState === "recording" ? "Stop recording" : "Click to dictate"
          }
        >
          {recordingState === "uploading" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : recordingState === "recording" ? (
            <MicOff className="h-3.5 w-3.5" />
          ) : (
            <Mic className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    );
  }
);

VoiceInput.displayName = "VoiceInput";
export default VoiceInput;
