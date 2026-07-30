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

