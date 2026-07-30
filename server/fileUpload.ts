import { Express, Request, Response } from "express";
import { getR2SignedUploadUrl } from "./_core/r2Client";
import { createClientFile } from "./db";

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

      const uploadUrl = await getR2SignedUploadUrl(fileKey, "application/pdf");

      return res.json({
        uploadUrl,
        fileKey,
        fileUrl: `/storage/${fileKey}`,
      });
    } catch (error: any) {
      console.error("[FileUpload] Presign error:", error);
      return res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  // IEP-specific presign endpoint (accepts PDF, DOC, DOCX)
  app.post("/api/files/iep-presign", async (req: Request, res: Response) => {
    try {
      const { fileName, fileSize } = req.body;
      if (!fileName || typeof fileName !== "string") {
        return res.status(400).json({ error: "fileName is required" });
      }
      const ext = fileName.toLowerCase().split('.').pop() ?? '';
      const allowed = ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg'];
      if (!allowed.includes(ext)) {
        return res.status(400).json({ error: "Only PDF, DOC, DOCX, or image files are accepted." });
      }
      if (fileSize && fileSize > 100 * 1024 * 1024) {
        return res.status(400).json({ error: "File size exceeds 100MB limit." });
      }
      const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
      const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const fileKey = `iep-documents/${Date.now()}_${hash}_${sanitizedName}`;
      const uploadUrl = await getR2SignedUploadUrl(fileKey);
      return res.json({
        uploadUrl,
        fileKey,
        fileUrl: `/storage/${fileKey}`,
      });
    } catch (error: any) {
      console.error("[IEPUpload] Presign error:", error);
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
