import type { AudioInputStatus } from "../../../../../shared/firstMate";
import type { AudioInputProvider } from "./AudioInputProvider";

export interface AudioInputDeviceInfo {
  deviceId: string;
  label: string;
}

export class BrowserMicrophoneAudioProvider implements AudioInputProvider {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private status: AudioInputStatus = "inactive";
  private selectedDeviceId: string = "";

  private chunkListeners: Set<(chunk: Blob, mimeType: string) => void> = new Set();
  private errorListeners: Set<(err: Error) => void> = new Set();
  private statusListeners: Set<(status: AudioInputStatus) => void> = new Set();
  private levelListeners: Set<(level: number) => void> = new Set();

  private currentAudioLevel: number = 0;
  private levelInterval: any = null;
  private flushInterval: any = null;

  // Audio buffering for 16kHz WAV chunk packaging
  private pcmBuffer: Float32Array[] = [];
  private pcmBufferSampleCount: number = 0;
  private currentBufferPeak: number = 0;

  // Emitting chunk interval: every 2.5 seconds while listening
  private readonly CHUNK_INTERVAL_MS = 2500;
  private readonly MIN_AUDIO_PEAK = 0.005; // Peak amplitude required to send audio (rejects ambient silence/hiss)

  constructor(options?: { deviceId?: string }) {
    if (options?.deviceId) {
      this.selectedDeviceId = options.deviceId;
    }
  }

  /**
   * Enumerate available microphone devices on the system
   */
  public static async getAudioInputDevices(): Promise<AudioInputDeviceInfo[]> {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
      return [];
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter((d) => d.kind === "audioinput")
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${index + 1}`,
        }));
    } catch {
      return [];
    }
  }

  public setDeviceId(deviceId: string) {
    this.selectedDeviceId = deviceId;
  }

  public getDeviceId(): string {
    return this.selectedDeviceId;
  }

  private setStatus(newStatus: AudioInputStatus) {
    if (this.status === newStatus) return;
    this.status = newStatus;
    this.statusListeners.forEach((fn) => fn(newStatus));
  }

  public getStatus(): AudioInputStatus {
    return this.status;
  }

  public getAudioLevel(): number {
    return this.currentAudioLevel;
  }

  public getTrackState(): "live" | "ended" | "none" {
    if (!this.mediaStream) return "none";
    const tracks = this.mediaStream.getAudioTracks();
    if (tracks.length === 0) return "none";
    return (tracks[0].readyState as "live" | "ended") || "none";
  }

  public getPermissionStatus(): "GRANTED" | "DENIED" | "ERROR" | "UNKNOWN" {
    if (this.status === "permission_denied") return "DENIED";
    if (this.status === "listening" || this.status === "paused") return "GRANTED";
    if (this.status === "error") return "ERROR";
    return "UNKNOWN";
  }

  public getStream(): MediaStream | null {
    return this.mediaStream;
  }

  public async start(): Promise<void> {
    if (this.status === "listening") return;

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      const err = new Error("Microphone API (navigator.mediaDevices.getUserMedia) is not supported in this browser.");
      this.setStatus("error");
      this.errorListeners.forEach((fn) => fn(err));
      throw err;
    }

    try {
      this.setStatus("requesting_permission");

      // Audio stream constraints with optional device selection
      const audioConstraints: MediaTrackConstraints = {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: false, // Don't aggressively filter out quiet or conversational speech
        autoGainControl: true,
      };

      if (this.selectedDeviceId) {
        audioConstraints.deviceId = { exact: this.selectedDeviceId };
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      });

      this.mediaStream = stream;

      // Update selected deviceId if it was default
      const activeTrack = stream.getAudioTracks()[0];
      if (activeTrack) {
        const settings = activeTrack.getSettings();
        if (settings.deviceId) {
          this.selectedDeviceId = settings.deviceId;
        }
      }

      // Initialize Web Audio Context
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      let ctx: AudioContext;
      try {
        // Prefer native 16kHz context if supported by hardware/browser
        ctx = new AudioCtx({ sampleRate: 16000 });
      } catch {
        ctx = new AudioCtx();
      }
      this.audioContext = ctx;

      // Resume context if suspended
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      // Auto-resume if browser suspends AudioContext
      ctx.onstatechange = () => {
        if (ctx.state === "suspended" && this.status === "listening") {
          ctx.resume().catch(() => {});
        }
      };

      const source = ctx.createMediaStreamSource(stream);
      this.sourceNode = source;

      // 1. Analyser Node for real-time RMS meter
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.2;
      source.connect(analyser);
      this.analyserNode = analyser;

      // 2. High-sensitivity continuous RMS volume monitor (~25fps)
      const dataArray = new Float32Array(analyser.fftSize);
      if (this.levelInterval) clearInterval(this.levelInterval);
      this.levelInterval = setInterval(() => {
        if (!this.analyserNode || this.status !== "listening") {
          this.currentAudioLevel = 0;
          this.levelListeners.forEach((fn) => fn(0));
          return;
        }

        // Keep AudioContext active
        if (ctx.state === "suspended") {
          ctx.resume().catch(() => {});
        }

        this.analyserNode.getFloatTimeDomainData(dataArray);
        let sumSquares = 0;
        let peak = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const val = dataArray[i];
          sumSquares += val * val;
          const abs = Math.abs(val);
          if (abs > peak) peak = abs;
        }
        const rms = Math.sqrt(sumSquares / dataArray.length);

        // Responsive logarithmic / power scaling: maps conversational speech (0.003 to 0.05) to 0.15 - 0.85
        let normalized = 0;
        if (rms > 0.001) {
          normalized = Math.min(1, Math.max(0, Math.round(Math.pow(rms * 25, 0.6) * 100) / 100));
        }
        this.currentAudioLevel = normalized;
        this.levelListeners.forEach((fn) => fn(normalized));
      }, 40);

      // 3. ScriptProcessorNode to capture PCM audio continuously
      const bufferSize = 4096;
      const processor = ctx.createScriptProcessor(bufferSize, 1, 1);
      this.scriptProcessor = processor;

      processor.onaudioprocess = (e) => {
        if (this.status !== "listening") return;

        const inputChannelData = e.inputBuffer.getChannelData(0);
        const copy = new Float32Array(inputChannelData);
        this.pcmBuffer.push(copy);
        this.pcmBufferSampleCount += copy.length;

        // Track peak amplitude in current buffer
        for (let i = 0; i < copy.length; i++) {
          const abs = Math.abs(copy[i]);
          if (abs > this.currentBufferPeak) {
            this.currentBufferPeak = abs;
          }
        }
      };

      source.connect(processor);

      // Connect to destination with non-zero inaudible gain to completely prevent Chromium silence optimization
      const muteNode = ctx.createGain();
      muteNode.gain.value = 0.00001;
      processor.connect(muteNode);
      muteNode.connect(ctx.destination);

      // 4. Fixed cadence chunk flusher (every 2.5s)
      if (this.flushInterval) clearInterval(this.flushInterval);
      this.flushInterval = setInterval(() => {
        if (this.status !== "listening") return;
        this.flushCurrentBuffer(ctx.sampleRate);
      }, this.CHUNK_INTERVAL_MS);

      this.setStatus("listening");
    } catch (err: any) {
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError" ||
        err.message?.includes("Permission denied")
      ) {
        this.setStatus("permission_denied");
      } else {
        this.setStatus("error");
      }
      this.errorListeners.forEach((fn) => fn(err));
      throw err;
    }
  }

  /**
   * Resamples captured PCM to 16kHz mono, encodes to self-contained WAV Blob with 44-byte header
   */
  private flushCurrentBuffer(inputSampleRate: number) {
    if (this.pcmBufferSampleCount < 2000) {
      return;
    }

    const peak = this.currentBufferPeak;
    const sampleCount = this.pcmBufferSampleCount;
    const rawChunks = this.pcmBuffer;

    // Reset buffer for next cycle
    this.pcmBuffer = [];
    this.pcmBufferSampleCount = 0;
    this.currentBufferPeak = 0;

    // If complete digital silence (e.g. muted hardware switch), skip sending
    if (peak < this.MIN_AUDIO_PEAK) {
      return;
    }

    // Flatten captured float buffers
    const flattened = new Float32Array(sampleCount);
    let offset = 0;
    for (const buf of rawChunks) {
      flattened.set(buf, offset);
      offset += buf.length;
    }

    // Downsample to 16,000 Hz if context was running at 44.1k/48k
    const targetSampleRate = 16000;
    const resampled = this.downsampleTo16kHz(flattened, inputSampleRate, targetSampleRate);

    // Convert Float32 (-1.0 to 1.0) to 16-bit PCM Int16Array
    const int16Samples = new Int16Array(resampled.length);
    for (let i = 0; i < resampled.length; i++) {
      const s = Math.max(-1, Math.min(1, resampled[i]));
      int16Samples[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    // Encode as self-contained WAV container with 44-byte RIFF header
    const wavBlob = this.encodeWav(int16Samples, targetSampleRate);

    // Emit to chunk listeners
    this.chunkListeners.forEach((fn) => fn(wavBlob, "audio/wav"));
  }

  private downsampleTo16kHz(buffer: Float32Array, fromRate: number, toRate: number = 16000): Float32Array {
    if (fromRate === toRate) return buffer;
    const ratio = fromRate / toRate;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const originalIndex = Math.round(i * ratio);
      result[i] = buffer[Math.min(originalIndex, buffer.length - 1)];
    }
    return result;
  }

  private encodeWav(samples: Int16Array, sampleRate: number): Blob {
    const dataSize = samples.length * 2;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    view.setUint32(0, 0x52494646, false); // 'RIFF'
    view.setUint32(4, 36 + dataSize, true); // Total file size - 8
    view.setUint32(8, 0x57415645, false); // 'WAVE'

    // fmt sub-chunk
    view.setUint32(12, 0x666d7420, false); // 'fmt '
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
    view.setUint16(22, 1, true); // NumChannels (1 = Mono)
    view.setUint32(24, sampleRate, true); // SampleRate (16000)
    view.setUint32(28, sampleRate * 2, true); // ByteRate (sampleRate * 1 * 16/8)
    view.setUint16(32, 2, true); // BlockAlign (1 * 16/8)
    view.setUint16(34, 16, true); // BitsPerSample (16)

    // data sub-chunk
    view.setUint32(36, 0x64617461, false); // 'data'
    view.setUint32(40, dataSize, true); // Subchunk2Size

    // Copy raw PCM byte data into buffer starting at offset 44
    const pcmBytes = new Uint8Array(buffer, 44);
    const sampleBytes = new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength);
    pcmBytes.set(sampleBytes);

    return new Blob([buffer], { type: "audio/wav" });
  }

  public async stop(): Promise<void> {
    if (this.levelInterval) {
      clearInterval(this.levelInterval);
      this.levelInterval = null;
    }
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.currentAudioLevel = 0;
    this.levelListeners.forEach((fn) => fn(0));

    try {
      this.scriptProcessor?.disconnect();
      this.sourceNode?.disconnect();
      this.analyserNode?.disconnect();
      if (this.audioContext && this.audioContext.state !== "closed") {
        await this.audioContext.close();
      }
    } catch {}

    this.scriptProcessor = null;
    this.sourceNode = null;
    this.analyserNode = null;
    this.audioContext = null;

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }

    this.pcmBuffer = [];
    this.pcmBufferSampleCount = 0;
    this.currentBufferPeak = 0;
    this.setStatus("inactive");
  }

  public pause(): void {
    if (this.status !== "listening") return;
    this.setStatus("paused");
  }

  public resume(): void {
    if (this.status !== "paused") return;
    this.setStatus("listening");
  }

  public onAudioChunk(handler: (chunk: Blob, mimeType: string) => void): () => void {
    this.chunkListeners.add(handler);
    return () => this.chunkListeners.delete(handler);
  }

  public onAudioLevel(handler: (level: number) => void): () => void {
    this.levelListeners.add(handler);
    return () => this.levelListeners.delete(handler);
  }

  public onError(handler: (err: Error) => void): () => void {
    this.errorListeners.add(handler);
    return () => this.errorListeners.delete(handler);
  }

  public onStatusChange(handler: (status: AudioInputStatus) => void): () => void {
    this.statusListeners.add(handler);
    handler(this.status);
    return () => this.statusListeners.delete(handler);
  }
}
