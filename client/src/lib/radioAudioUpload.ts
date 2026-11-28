/**
 * Client-side Waypoint Radio Audio Upload Helper
 * - Supports MP3 & WAV files up to 120MB.
 * - Probes duration locally via HTMLAudioElement before saving track metadata.
 * - Uses direct R2 presigned PUT with live XHR progress and seamlessly falls back
 *   to multipart POST /api/radio/upload if direct PUT is unavailable (e.g., local dev).
 */

export const MAX_RADIO_AUDIO_BYTES = 120 * 1024 * 1024;

export interface UploadedAudioResult {
  fileKey: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  durationSec: number | null;
  suggestedTitle: string;
}

export function isSupportedRadioAudioFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  return lower.endsWith(".mp3") || lower.endsWith(".wav");
}

export function deriveTrackTitleFromFileName(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  const raw = lastDot > 0 ? fileName.slice(0, lastDot) : fileName;
  return raw.replace(/[_]+/g, " ").replace(/\s+/g, " ").trim() || "Untitled Track";
}

export function formatAudioDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds < 0) {
    return "--:--";
  }
  const total = Math.round(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function formatAudioFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function probeAudioDurationSec(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    try {
      const objectUrl = URL.createObjectURL(file);
      const audio = new Audio();
      audio.preload = "metadata";
      const cleanup = (val: number | null) => {
        audio.onloadedmetadata = null;
        audio.onerror = null;
        URL.revokeObjectURL(objectUrl);
        resolve(val);
      };
      const timer = window.setTimeout(() => cleanup(null), 5000);
      audio.onloadedmetadata = () => {
        window.clearTimeout(timer);
        const dur = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : null;
        cleanup(dur);
      };
      audio.onerror = () => {
        window.clearTimeout(timer);
        cleanup(null);
      };
      audio.src = objectUrl;
    } catch {
      resolve(null);
    }
  });
}

function xhrPutBinary(
  url: string,
  file: File,
  mimeType: string,
  onProgress?: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-Type", mimeType);
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && onProgress) {
        onProgress(Math.min(99, Math.round((ev.loaded / ev.total) * 100)));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
      } else {
        reject(new Error(`Direct storage upload returned HTTP ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error("Direct storage upload network error"));
    xhr.send(file);
  });
}

function xhrDirectServerUpload(
  folderPath: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<{
  fileKey: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/radio/upload", true);
    xhr.withCredentials = true;
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.setRequestHeader("X-Radio-Folder", encodeURIComponent(folderPath));
    xhr.setRequestHeader("X-Radio-Filename", encodeURIComponent(file.name));
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && onProgress) {
        onProgress(Math.min(99, Math.round((ev.loaded / ev.total) * 100)));
      }
    };
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText || "{}");
        if (xhr.status >= 200 && xhr.status < 300 && data?.fileKey && data?.fileUrl) {
          onProgress?.(100);
          resolve(data);
        } else {
          reject(new Error(data?.error || `Audio upload failed (HTTP ${xhr.status})`));
        }
      } catch {
        reject(new Error(`Audio upload failed (HTTP ${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error while uploading audio file."));
    xhr.send(file);
  });
}

export async function uploadWaypointRadioAudio(
  file: File,
  folderPath: string,
  onProgress?: (pct: number) => void
): Promise<UploadedAudioResult> {
  if (!isSupportedRadioAudioFile(file)) {
    throw new Error(`"${file.name}" is not supported. Please upload MP3 or WAV files only.`);
  }
  if (file.size > MAX_RADIO_AUDIO_BYTES) {
    throw new Error(`"${file.name}" exceeds the 120MB audio file size limit.`);
  }

  onProgress?.(4);
  const durationSec = await probeAudioDurationSec(file);
  const suggestedTitle = deriveTrackTitleFromFileName(file.name);

  // Use direct multipart upload on localhost so local uploads/ mirror is guaranteed for instant dev streaming,
  // and try R2 presigned PUT first in hosted production for large WAV files.
  const isLocalhost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  if (!isLocalhost) {
    try {
      const presignRes = await fetch("/api/radio/presign", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderPath,
          fileName: file.name,
          fileSize: file.size,
        }),
      });
      if (presignRes.ok) {
        const presigned = await presignRes.json();
        if (presigned?.uploadUrl && presigned?.fileKey && presigned?.fileUrl) {
          await xhrPutBinary(presigned.uploadUrl, file, presigned.mimeType || "audio/mpeg", onProgress);
          return {
            fileKey: presigned.fileKey,
            fileUrl: presigned.fileUrl,
            fileName: presigned.safeName || file.name,
            fileSize: file.size,
            mimeType: presigned.mimeType || "audio/mpeg",
            durationSec,
            suggestedTitle,
          };
        }
      }
    } catch {
      // Fall back cleanly to /api/radio/upload
    }
  }

  const uploaded = await xhrDirectServerUpload(folderPath, file, onProgress);
  return {
    fileKey: uploaded.fileKey,
    fileUrl: uploaded.fileUrl,
    fileName: uploaded.fileName || file.name,
    fileSize: uploaded.fileSize || file.size,
    mimeType: uploaded.mimeType || "audio/mpeg",
    durationSec,
    suggestedTitle,
  };
}
