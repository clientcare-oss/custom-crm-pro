/**
 * Waypoint Scan Offline & Draft Storage
 * Uses IndexedDB to persist in-progress scan sessions so users never lose work
 * if the browser refreshes, device rotates, or an accidental navigation occurs.
 */

export interface DocumentAnnotation {
  id: string;
  type: "check" | "text" | "date" | "initials" | "signature";
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  width?: number; // percentage
  height?: number; // percentage
  content?: string; // text string or dataUrl for signature
  fontSize?: number;
}

export interface WaypointScanPageDraft {
  id: string;
  dataUrl: string;
  rotation: number;
  timestamp: number;
}

export interface WaypointScanDraft {
  id: string;
  studentId: number;
  studentName?: string;
  docTitle: string;
  category: string;
  pages: WaypointScanPageDraft[];
  annotations: Record<string, DocumentAnnotation[]>; // keyed by pageId
  stage: "get" | "review" | "fill-sign" | "finish";
  savedAt: number;
}

const DB_NAME = "WaypointScanDB";
const DB_VERSION = 1;
const STORE_NAME = "scan_drafts";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not supported"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "studentId" });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

export async function saveScanDraft(draft: WaypointScanDraft): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const req = store.put({
        ...draft,
        savedAt: Date.now(),
      });

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[WaypointScanStorage] Failed to save draft:", err);
  }
}

export async function getScanDraft(studentId: number): Promise<WaypointScanDraft | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const req = store.get(studentId);

      req.onsuccess = () => {
        resolve(req.result || null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[WaypointScanStorage] Failed to get draft:", err);
    return null;
  }
}

export async function clearScanDraft(studentId: number): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const req = store.delete(studentId);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[WaypointScanStorage] Failed to clear draft:", err);
  }
}
