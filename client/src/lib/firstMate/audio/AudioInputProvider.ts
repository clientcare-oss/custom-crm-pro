import type { AudioInputStatus } from "../../../../../shared/firstMate";

export interface AudioInputProvider {
  /**
   * Request microphone permission (if needed) and begin audio capture.
   */
  start(): Promise<void>;

  /**
   * Stop audio capture and release hardware streams.
   */
  stop(): Promise<void>;

  /**
   * Temporarily pause audio capture without tearing down permissions.
   */
  pause(): void;

  /**
   * Resume audio capture from paused state.
   */
  resume(): void;

  /**
   * Current operational status of the audio provider.
   */
  getStatus(): AudioInputStatus;

  /**
   * Subscribe to incoming encoded audio chunks.
   * Returns an unsubscribe function.
   */
  onAudioChunk(handler: (chunk: Blob, mimeType: string) => void): () => void;

  /**
   * Subscribe to provider error events.
   * Returns an unsubscribe function.
   */
  onError(handler: (err: Error) => void): () => void;

  /**
   * Subscribe to status changes.
   * Returns an unsubscribe function.
   */
  onStatusChange(handler: (status: AudioInputStatus) => void): () => void;
}
