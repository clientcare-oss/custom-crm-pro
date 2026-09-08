import type {
  TranscriptionProviderStatus,
  SpeakerRole,
  MicrophoneDiagnostics,
} from "../../../../../shared/firstMate";

export interface TranscriptionCallbacks {
  onInterimTranscript: (text: string) => void;
  onFinalTranscript: (text: string, latencyMs: number) => void;
  onStatusChange: (status: TranscriptionProviderStatus) => void;
  onDiagnosticsUpdate: (metrics: Partial<MicrophoneDiagnostics>) => void;
  onError: (err: Error) => void;
}

export class OpenAIRealtimeTranscriptionProvider {
  private status: TranscriptionProviderStatus = "disconnected";
  private callbacks: Partial<TranscriptionCallbacks> = {};
  private activeSpeaker: SpeakerRole = "Parent";
  private isProcessingChunk: boolean = false;
  private chunkQueue: Array<{ blob: Blob; mimeType: string }> = [];
  private trpcClient: any;
  private sessionId: string;

  // Development & Real-time Diagnostic Counters
  public audioChunksCaptured: number = 0;
  public audioChunksSent: number = 0;
  public totalAudioBytesSent: number = 0;
  public openAiEventsReceived: "YES" | "NO" = "NO";
  public interimTranscriptCount: number = 0;
  public finalTranscriptCount: number = 0;
  public lastTranscriptEvent: string = "";
  public lastFinalTranscript: string = "";
  public realtimeSessionCreated: "YES" | "NO" = "NO";
  public transport: "WebRTC" | "WebSocket" | "Chunked Whisper" | "None" = "None";
  public openAiAuth: "SUCCESS" | "FAIL" | "PENDING" = "PENDING";
  public lastError?: string = undefined;

  constructor(options: {
    trpcClient: any;
    sessionId: string;
    callbacks?: Partial<TranscriptionCallbacks>;
    speakerRole?: SpeakerRole;
  }) {
    this.trpcClient = options.trpcClient;
    this.sessionId = options.sessionId;
    this.callbacks = options.callbacks || {};
    this.activeSpeaker = options.speakerRole || "Parent";
  }

  public setCallbacks(callbacks: Partial<TranscriptionCallbacks>) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public setSpeaker(role: SpeakerRole) {
    this.activeSpeaker = role;
  }

  public getStatus(): TranscriptionProviderStatus {
    return this.status;
  }

  private setStatus(newStatus: TranscriptionProviderStatus) {
    if (this.status === newStatus) return;
    this.status = newStatus;
    this.callbacks.onStatusChange?.(newStatus);
    this.emitDiagnostics();
  }

  private emitDiagnostics() {
    this.callbacks.onDiagnosticsUpdate?.({
      realtimeSessionCreated: this.realtimeSessionCreated,
      transport: this.transport,
      connectionState:
        this.status === "connected" || this.status === "transcribing"
          ? "CONNECTED"
          : this.status === "connecting"
          ? "CONNECTING"
          : this.status === "error"
          ? "ERROR"
          : "CLOSED",
      realtimeConnection:
        this.status === "connected" || this.status === "transcribing"
          ? "CONNECTED"
          : this.status === "connecting"
          ? "CONNECTING"
          : this.status === "error"
          ? "ERROR"
          : "DISCONNECTED",
      openAiAuth: this.openAiAuth,
      transcriptionModel: "whisper-1",
      audioChunksCaptured: this.audioChunksCaptured,
      audioChunksSent: this.audioChunksSent,
      totalAudioBytesSent: this.totalAudioBytesSent,
      openAiEventsReceived: this.openAiEventsReceived,
      interimTranscriptCount: this.interimTranscriptCount,
      finalTranscriptCount: this.finalTranscriptCount,
      lastTranscriptEvent: this.lastTranscriptEvent,
      lastFinalTranscript: this.lastFinalTranscript,
      lastError: this.lastError,
    });
  }

  public async connect(): Promise<void> {
    this.setStatus("connecting");
    this.openAiAuth = "PENDING";
    this.emitDiagnostics();

    try {
      // 1. Check/initialize session capability with OpenAI Realtime token endpoint
      await this.trpcClient.firstMate.getRealtimeSessionToken.mutate();
      this.realtimeSessionCreated = "YES";
      this.openAiAuth = "SUCCESS";
      this.transport = "Chunked Whisper";
      this.setStatus("connected");
      this.emitDiagnostics();
      if (this.chunkQueue.length > 0) {
        this.processNextChunk();
      }
    } catch (err: any) {
      console.warn("[OpenAITranscription] Realtime session handshake warning:", err?.message);
      // If client_secrets token fails, fallback to direct Whisper chunk streaming
      this.realtimeSessionCreated = "NO";
      this.transport = "Chunked Whisper";
      this.openAiAuth = "PENDING";
      this.setStatus("connected");
      this.emitDiagnostics();
      if (this.chunkQueue.length > 0) {
        this.processNextChunk();
      }
    }
  }

  public disconnect(): void {
    this.chunkQueue = [];
    this.isProcessingChunk = false;
    this.setStatus("disconnected");
    this.emitDiagnostics();
  }

  /**
   * Feed a new audio chunk from AudioInputProvider
   */
  public handleAudioChunk(blob: Blob, mimeType: string): void {
    if (this.status === "disconnected" || this.status === "error") {
      return;
    }

    this.audioChunksCaptured++;
    this.chunkQueue.push({ blob, mimeType });
    this.emitDiagnostics();
    if (this.status === "connected" || this.status === "transcribing") {
      this.processNextChunk();
    }
  }

  private async processNextChunk(): Promise<void> {
    if (this.isProcessingChunk || this.chunkQueue.length === 0) return;

    this.isProcessingChunk = true;
    this.setStatus("transcribing");

    const item = this.chunkQueue.shift();
    if (!item) {
      this.isProcessingChunk = false;
      this.setStatus("connected");
      return;
    }

    const startTime = Date.now();
    try {
      const arrayBuffer = await item.blob.arrayBuffer();

      // Only process chunks that contain actual audio samples (> 44 bytes WAV header)
      if (arrayBuffer.byteLength > 100) {
        this.audioChunksSent++;
        this.totalAudioBytesSent += arrayBuffer.byteLength;

        // Convert arrayBuffer to base64
        const bytes = new Uint8Array(arrayBuffer);
        let binary = "";
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);

        const result = await this.trpcClient.firstMate.transcribeAudioChunk.mutate({
          sessionId: this.sessionId,
          audioBase64: base64,
          mimeType: item.mimeType,
          speakerRole: this.activeSpeaker,
        });

        const latencyMs = Date.now() - startTime;
        this.openAiEventsReceived = "YES";
        this.openAiAuth = "SUCCESS";

        const text = (result.text || "").trim();
        this.lastTranscriptEvent = text ? `[text: "${text}"]` : "[empty]";

        if (text && !this.isHallucination(text)) {
          this.finalTranscriptCount++;
          this.lastFinalTranscript = text;
          this.callbacks.onFinalTranscript?.(text, latencyMs);
        }

        this.emitDiagnostics();
      }
    } catch (err: any) {
      console.warn("[OpenAITranscription] Chunk transcription error:", err?.message);
      this.lastError = err?.message;
      this.openAiAuth = "FAIL";
      this.callbacks.onError?.(err);
      this.emitDiagnostics();
    } finally {
      this.isProcessingChunk = false;
      if (this.chunkQueue.length > 0) {
        this.processNextChunk();
      } else {
        this.setStatus("connected");
      }
    }
  }

  /**
   * Filter empty sound artifacts produced by Whisper on low-volume background noise
   */
  private isHallucination(text: string): boolean {
    const clean = text.toLowerCase().trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
    return (
      clean === "you" ||
      clean === "thank you" ||
      clean === "thank you for watching" ||
      clean === "thanks for watching" ||
      clean === "thank you so much for watching" ||
      clean === "thank you for listening" ||
      clean === "thanks for listening" ||
      clean === "bye" ||
      clean === "goodbye" ||
      clean === "subscribe" ||
      clean === "the end" ||
      clean === "subtitles by" ||
      clean === "subtitles" ||
      clean.length < 2
    );
  }
}
