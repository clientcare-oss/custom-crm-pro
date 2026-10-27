// Cloudflare R2 Storage Helpers
// Uploads directly to Cloudflare R2 bucket.
// Downloads return /storage/{key} paths or signed R2 URLs.

import fs from "fs";
import path from "path";
import { uploadToR2, getR2SignedDownloadUrl } from "./_core/r2Client";

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  
  // 0. Persist to local disk under uploads/ for instantaneous, uncompressed local serving
  try {
    const localPath = path.resolve(process.cwd(), "uploads", key);
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    const buffer = typeof data === "string" ? Buffer.from(data) : Buffer.from(data);
    fs.writeFileSync(localPath, buffer);
  } catch (localErr) {
    console.warn("[storagePut] Notice: could not persist to local disk:", localErr);
  }

  // 1. Save to Cloudflare D1 / SQLite file_blobs for guaranteed cross-device availability
  try {
    const base64Data = typeof data === "string"
      ? Buffer.from(data).toString("base64")
      : Buffer.from(data).toString("base64");
    const { queryCloudflareD1 } = await import("./_core/d1Client");
    await queryCloudflareD1(
      "INSERT INTO file_blobs (key, mime_type, base64_data) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET base64_data = excluded.base64_data, mime_type = excluded.mime_type",
      [key, contentType, base64Data]
    );
  } catch (d1Err) {
    console.warn("[storagePut] Notice: could not persist to file_blobs in D1:", d1Err);
  }

  // 2. Also attempt upload to R2
  await uploadToR2(key, data, contentType);
  return { key, url: `/storage/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/storage/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);
  return await getR2SignedDownloadUrl(key);
}

