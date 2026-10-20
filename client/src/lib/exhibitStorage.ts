/**
 * IndexedDB storage for State Complaint Exhibit documents and rendered page images.
 * Provides high-capacity, persistent client-side storage that survives browser refreshes
 * and eliminates localStorage 5MB quota exhaustion on high-resolution PDF facsimile images.
 */

import { type ImportedPdfPage } from "./pdfImporter";

export interface CachedExhibitRecord {
  pageId: string;
  fileName?: string;
  fileUrl?: string;
  fileBlob?: Blob;
  renderedPages?: ImportedPdfPage[];
  updatedAt: number;
}

const DB_NAME = "WaypointComplaintExhibits_v1";
const STORE_NAME = "exhibit_cache";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "pageId" });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = (err) => {
        console.warn("[exhibitStorage] IndexedDB open error:", err);
        resolve(null);
      };
    } catch (err) {
      console.warn("[exhibitStorage] IndexedDB initialization error:", err);
      resolve(null);
    }
  });
}

/**
 * Persistently save exhibit rendered pages and original file blob into IndexedDB.
 */
export async function saveExhibitToDb(record: CachedExhibitRecord): Promise<void> {
  const db = await openDb();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const cleanRecord: CachedExhibitRecord = {
        ...record,
        updatedAt: Date.now(),
      };
      const req = store.put(cleanRecord);
      req.onsuccess = () => resolve();
      req.onerror = (err) => {
        console.warn("[exhibitStorage] save error:", err);
        resolve();
      };
    } catch (err) {
      console.warn("[exhibitStorage] transaction error:", err);
      resolve();
    }
  });
}

/**
 * Retrieve cached exhibit record (rendered pages & original file blob) by binder pageId.
 */
export async function getExhibitFromDb(pageId: string): Promise<CachedExhibitRecord | null> {
  const db = await openDb();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(pageId);
      req.onsuccess = () => {
        resolve(req.result || null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Retrieve all cached exhibits mapped by pageId for rapid restore on page load.
 */
export async function getAllExhibitsFromDb(): Promise<Record<string, CachedExhibitRecord>> {
  const db = await openDb();
  if (!db) return {};

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const results = req.result as CachedExhibitRecord[];
        const map: Record<string, CachedExhibitRecord> = {};
        if (Array.isArray(results)) {
          for (const r of results) {
            if (r.pageId) map[r.pageId] = r;
          }
        }
        resolve(map);
      };
      req.onerror = () => resolve({});
    } catch {
      resolve({});
    }
  });
}

/**
 * Delete cached exhibit record from IndexedDB when a binder is permanently removed.
 */
export async function deleteExhibitFromDb(pageId: string): Promise<void> {
  const db = await openDb();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(pageId);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}
