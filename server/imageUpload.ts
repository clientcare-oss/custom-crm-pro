/**
 * Image upload endpoint for BrainDump and Tasks image attachments.
 * Accepts a multipart image file, uploads it to S3 via storagePut,
 * and returns the storage URL.
 *
 * POST /api/images/upload
 *   Body: FormData with field "image" (File/Blob)
 *   Response: { url: string }
 */
import { Express, Request, Response } from "express";
import busboy, { FileInfo } from "busboy";
import { Readable } from "stream";
import { storagePut } from "./storage";

export function registerImageUploadRoutes(app: Express) {
  app.post("/api/images/upload", (req: Request, res: Response) => {
    const bb = busboy({
      headers: req.headers,
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for images
    });
    let handled = false;

    bb.on("file", async (_fieldname: string, fileStream: Readable, info: FileInfo) => {
      const { filename, mimeType } = info;
      const chunks: Buffer[] = [];

      fileStream.on("data", (chunk: Buffer) => chunks.push(chunk));
      fileStream.on("limit", () => {
        if (!handled) {
          handled = true;
          res.status(413).json({ error: "Image file exceeds 10 MB limit" });
        }
      });
      fileStream.on("end", async () => {
        if (handled) return;
        handled = true;
        try {
          const buffer = Buffer.concat(chunks);
          const ext = filename?.split(".").pop() || "png";
          const key = `braindump-images/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
          const { url } = await storagePut(key, buffer, mimeType || "image/png");
          res.json({ url });
        } catch (err) {
          console.error("[ImageUpload] storagePut error:", err);
          res.status(500).json({ error: "Failed to upload image" });
        }
      });
    });

    bb.on("error", (err: Error) => {
      if (!handled) {
        handled = true;
        console.error("[ImageUpload] busboy error:", err);
        res.status(500).json({ error: "Upload processing error" });
      }
    });

    req.pipe(bb);
  });
}
