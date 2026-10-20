import type { Express } from "express";
import { getR2SignedDownloadUrl } from "./r2Client";

export function registerStorageProxy(app: Express) {
  const handler = async (req: any, res: any) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    try {
      // 1. Check Cloudflare D1 / SQLite file_blobs
      const { queryCloudflareD1 } = await import("./d1Client");
      const rows = await queryCloudflareD1(
        "SELECT mime_type, base64_data FROM file_blobs WHERE key = ?",
        [key]
      );
      if (rows && rows.length > 0 && rows[0].base64_data) {
        const buffer = Buffer.from(rows[0].base64_data, "base64");
        res.set("Content-Type", rows[0].mime_type || "application/pdf");
        res.set("Access-Control-Allow-Origin", "*");
        res.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
        res.set("Cache-Control", "public, max-age=86400");
        res.send(buffer);
        return;
      }

      // 2. Fall back to R2 signed URL
      const signedUrl = await getR2SignedDownloadUrl(key);
      res.set("Cache-Control", "public, max-age=3600");
      res.redirect(307, signedUrl);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  };

  app.get("/storage/*", handler);
  app.get("/manus-storage/*", handler);
}

