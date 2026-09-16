import {
  type TranscriptionProviderStatus,
  type SpeakerRole,
  type MicrophoneDiagnostics,
  WAYPOINT_SPED_KEYTERMS,
  buildCaseAwareKeyterms,
  type FirstMateSession,
} from "../../../../../shared/firstMate";

export interface AssemblyAITranscriptionCallbacks {
  onInterimTranscript: (text: string) => void;
  onFinalTranscript: (text: string, latencyMs: number) => void;
  onStatusChange: (status: TranscriptionProviderStatus) => void;
  onDiagnosticsUpdate: (metrics: Partial<MicrophoneDiagnostics>) => void;
  onError: (err: Error) => void;
}

export class AssemblyAIRealtimeTranscriptionProvider {
  private status: TranscriptionProviderStatus = "disconnected";
  private callbacks: Partial<AssemblyAITranscriptionCallbacks> = {};
  private activeSpeaker: SpeakerRole = "Parent";
  private language: string = "en";
  private trpcClient: any;
  private sessionId: string;
  private socket: WebSocket | null = null;
  private keyterms: string[] = WAYPOINT_SPED_KEYTERMS;
  private turnStartTime: number = Date.now();

  // Reconnection state
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private reconnectTimer: any = null;
  private isExplicitlyClosed: boolean = false;

  // Diagnostics counters
  public audioChunksCaptured: number = 0;
  public audioChunksSent: number = 0;
  public totalAudioBytesSent: number = 0;
  public interimTranscriptCount: number = 0;
  public finalTranscriptCount: number = 0;
  public lastTranscriptEvent: string = "";
  public lastFinalTranscript: string = "";
  public lastError?: string = undefined;

  constructor(options: {
    trpcClient: any;
    sessionId: string;
    callbacks?: Partial<AssemblyAITranscriptionCallbacks>;
    speakerRole?: SpeakerRole;
    language?: string;
    session?: Partial<FirstMateSession>;
  }) {
    this.trpcClient = options.trpcClient;
    this.sessionId = options.sessionId;
    this.callbacks = options.callbacks || {};
    this.activeSpeaker = options.speakerRole || "Parent";
    if (options.language) {
      this.language = options.language;
    }
    if (options.session) {
      this.keyterms = buildCaseAwareKeyterms(options.session);
    }
  }

  public setCallbacks(callbacks: Partial<AssemblyAITranscriptionCallbacks>) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public setSpeaker(role: SpeakerRole) {
    this.activeSpeaker = role;
  }

  public setLanguage(language: string) {
    this.language = language;
  }

  public updateCaseContext(session: Partial<FirstMateSession>) {
    this.keyterms = buildCaseAwareKeyterms(session);
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(
          JSON.stringify({
            type: "UpdateConfiguration",
            keyterms_prompt: this.keyterms,
          })
        );
      } catch (e) {
        console.warn("[AssemblyAI] Failed to send updated keyterms:", e);
      }
    }
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
      realtimeSessionCreated: "YES",
      transport: "WebSocket",
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
      openAiAuth: "SUCCESS",
      transcriptionModel: "assemblyai-universal-3.5-pro",
      audioChunksCaptured: this.audioChunksCaptured,
      audioChunksSent: this.audioChunksSent,
      totalAudioBytesSent: this.totalAudioBytesSent,
      interimTranscriptCount: this.interimTranscriptCount,
      finalTranscriptCount: this.finalTranscriptCount,
      lastTranscriptEvent: this.lastTranscriptEvent,
      lastFinalTranscript: this.lastFinalTranscript,
      lastError: this.lastError,
    });
  }

  /**
   * Connect to AssemblyAI v3 streaming WebSocket using temporary token from backend
   */
  public async connect(): Promise<void> {
    this.isExplicitlyClosed = false;
    this.setStatus("connecting");
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    try {
      // 1. Request temporary AssemblyAI token from secure Cloudflare Worker backend
      console.log("[AssemblyAI] Requesting temporary streaming token from backend...");
      let token = "";
      try {
        const tokenRes = await this.trpcClient.firstMate.getAssemblyAiToken.mutate({
          expiresInSeconds: 480,
        });
        token = tokenRes.token;
      } catch (trpcErr) {
        // Fallback to direct REST endpoint
        const restRes = await fetch("/api/first-mate/assembly-token", { method: "POST" });
        if (restRes.ok) {
          const restJson = await restRes.json();
          token = restJson.token;
        } else {
          throw trpcErr;
        }
      }

      if (!token) {
        throw new Error("Received empty AssemblyAI token from backend");
      }

      console.log("[AssemblyAI] Received temporary token, opening streaming WebSocket...");

      // 2. Open AssemblyAI v3 Realtime Streaming WebSocket
      // Universal-3.5 Pro model with balanced conversational turn detection
      const wsUrl = `wss://streaming.assemblyai.com/v3/ws?sample_rate=16000&speech_model=universal-3-5-pro&mode=balanced&token=${encodeURIComponent(
        token
      )}`;

      const socket = new WebSocket(wsUrl);
      this.socket = socket;
      socket.binaryType = "arraybuffer";

      socket.onopen = () => {
        console.log("[AssemblyAI] WebSocket connected successfully");
        this.reconnectAttempts = 0;
        this.setStatus("connected");

        // Send domain vocabulary keyterms to boost special education recognition
        try {
          socket.send(
            JSON.stringify({
              type: "UpdateConfiguration",
              keyterms_prompt: this.keyterms,
            })
          );
          console.log(`[AssemblyAI] Configured ${this.keyterms.length} special-education keyterms`);
        } catch (err) {
          console.warn("[AssemblyAI] Error sending keyterms configuration:", err);
        }
      };

      socket.onmessage = (event) => {
        try {
          if (typeof event.data !== "string") return;
          const msg = JSON.parse(event.data);

          if (msg.type === "Begin") {
            console.log("[AssemblyAI] Stream began. Session ID:", msg.session_id);
            this.setStatus("connected");
          } else if (msg.type === "SpeechStarted") {
            this.turnStartTime = Date.now();
            this.setStatus("transcribing");
          } else if (msg.type === "Turn") {
            const transcriptText = (msg.transcript || "").trim();

            if (msg.end_of_turn === false) {
              // PARTIAL TRANSCRIPT: Update live UI preview only; NEVER send to OpenAI or D1
              this.interimTranscriptCount++;
              this.callbacks.onInterimTranscript?.(transcriptText);
              this.lastTranscriptEvent = `[partial: "${transcriptText}"]`;
              this.emitDiagnostics();
            } else {
              // FINALIZED TURN: Conversational turn completed by speaker
              const latencyMs = Date.now() - this.turnStartTime;
              this.finalTranscriptCount++;
              this.lastFinalTranscript = transcriptText;
              this.lastTranscriptEvent = `[final: "${transcriptText}"]`;

              // Clear interim and pass finalized turn to response gate
              this.callbacks.onInterimTranscript?.("");
              if (transcriptText) {
                console.log(`[AssemblyAI] Finalized conversational turn (${latencyMs}ms): "${transcriptText}"`);
                this.callbacks.onFinalTranscript?.(transcriptText, latencyMs);
              }
              this.setStatus("connected");
              this.emitDiagnostics();
            }
          } else if (msg.type === "Termination") {
            console.log("[AssemblyAI] Stream terminated by server");
            if (!this.isExplicitlyClosed) {
              this.handleDisconnect();
            }
          }
        } catch (err: any) {
          console.warn("[AssemblyAI] Message parse error:", err?.message);
        }
      };

      socket.onerror = (event: any) => {
        console.warn("[AssemblyAI] WebSocket error:", event);
        this.lastError = "AssemblyAI WebSocket connection error";
        this.callbacks.onError?.(new Error("AssemblyAI connection error"));
        this.emitDiagnostics();
      };

      socket.onclose = (event) => {
        console.log(`[AssemblyAI] WebSocket closed (code: ${event.code}, clean: ${event.wasClean})`);
        if (!this.isExplicitlyClosed) {
          this.handleDisconnect();
        } else {
          this.setStatus("disconnected");
        }
      };
    } catch (err: any) {
      console.warn("[AssemblyAI] Connect failed:", err?.message);
      this.lastError = err?.message;
      this.setStatus("error");
      this.callbacks.onError?.(err);
      this.handleDisconnect();
    }
  }

  private handleDisconnect() {
    if (this.isExplicitlyClosed) return;

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 8000);
      console.log(`[AssemblyAI] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      this.setStatus("connecting");
      this.reconnectTimer = setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.warn("[AssemblyAI] Max reconnection attempts reached");
      this.setStatus("error");
    }
  }

  /**
   * Feed raw PCM16 binary chunks from microphone directly to AssemblyAI
   */
  public handleRawPcmChunk(pcm16Buffer: ArrayBuffer): void {
    if (this.isExplicitlyClosed || this.status === "disconnected" || this.status === "error") {
      return;
    }

    this.audioChunksCaptured++;

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(pcm16Buffer);
        this.audioChunksSent++;
        this.totalAudioBytesSent += pcm16Buffer.byteLength;
        this.emitDiagnostics();
      } catch (err: any) {
        console.warn("[AssemblyAI] Error sending audio buffer:", err?.message);
      }
    }
  }

  /**
   * Cleanly terminate AssemblyAI session and close socket
   */
  public disconnect(): void {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      try {
        if (this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({ type: "Terminate" }));
        }
        this.socket.close();
      } catch {}
      this.socket = null;
    }

    this.setStatus("disconnected");
  }
}
