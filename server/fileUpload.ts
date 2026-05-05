import { Express, Request, Response } from "express";
import { ENV } from "./_core/env";
import { createClientFile } from "./db";

/**
 * File upload endpoint that supports large PDF files (up to 1GB).
 * Uses a two-step flow:
 * 1. Client requests a presigned upload URL from the server
 * 2. Client uploads directly to S3 using the presigned URL
 * 3. Client confirms the upload, and server saves metadata to DB
 *
 * This avoids passing file bytes through the Express server.
 */

async function getPresignedUploadUrl(fileKey: string): Promise<string> {
  const forgeUrl = ENV.forgeApiUrl.replace(/\/+$/, "");
  const forgeKey = ENV.forgeApiKey;

  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", fileKey);

  const resp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(`Storage presign failed (${resp.status}): ${msg}`);
  }

  const { url } = (await resp.json()) as { url: string };
  return url;
}

export function registerFileUploadRoutes(app: Express) {
  // Step 1: Request a presigned upload URL
  app.post("/api/files/presign", async (req: Request, res: Response) => {
    try {
      const { fileName, fileSize } = req.body;

      if (!fileName || typeof fileName !== "string") {
        return res.status(400).json({ error: "fileName is required" });
      }

      if (!fileName.toLowerCase().endsWith(".pdf")) {
        return res.status(400).json({ error: "Only PDF files are accepted." });
      }

      if (fileSize && fileSize > 1024 * 1024 * 1024) {
        return res.status(400).json({ error: "File size exceeds 1GB limit." });
      }

      // Generate a unique file key
      const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
      const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const fileKey = `client-files/${Date.now()}_${hash}_${sanitizedName}`;

      const uploadUrl = await getPresignedUploadUrl(fileKey);

      return res.json({
        uploadUrl,
        fileKey,
        fileUrl: `/manus-storage/${fileKey}`,
      });
    } catch (error: any) {
      console.error("[FileUpload] Presign error:", error);
      return res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  // Step 2: Confirm the upload and save metadata to DB
  app.post("/api/files/confirm", async (req: Request, res: Response) => {
    try {
      const { clientId, projectId, fileName, fileKey, fileUrl, fileSize } = req.body;

      if (!clientId || !fileName || !fileKey || !fileUrl) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const result = await createClientFile({
        clientId,
        projectId: projectId || null,
        fileName,
        fileUrl,
        fileKey,
        fileSize: fileSize || 0,
        mimeType: "application/pdf",
      });

      return res.json({ success: true, file: result });
    } catch (error: any) {
      console.error("[FileUpload] Confirm error:", error);
      return res.status(500).json({ error: "Failed to save file metadata" });
    }
  });
}
