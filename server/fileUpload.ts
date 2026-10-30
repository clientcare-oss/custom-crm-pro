import { Express, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { getR2SignedUploadUrl } from "./_core/r2Client";
import { createClientFile, getDb } from "./db";
import { createContext } from "./_core/context";
import { resolveStaffAccess, checkBackendCaseAccess } from "./_core/staffAccess";
import { isClientOwnedContactId } from "./_core/trpc";
import { portalSessions } from "../drizzle/schema";

function extractPortalToken(req: any): string | undefined {
  const cookieToken = req?.cookies?.portal_session;
  if (cookieToken) return cookieToken;
  const cookieHeader =
    typeof req?.headers?.get === "function"
      ? req.headers.get("cookie")
      : req?.headers?.cookie;
  if (cookieHeader) {
    const match = String(cookieHeader).match(/portal_session=([^;]+)/);
    if (match) return match[1];
  }
  const headerToken =
    typeof req?.headers?.get === "function"
      ? req.headers.get("x-portal-token")
      : req?.headers?.["x-portal-token"];
  if (headerToken) return String(headerToken);
  return undefined;
}

export async function authorizeFileUploadRequest(
  req: any,
  res: any,
  opts?: { targetContactId?: number | null; requireTargetOwnershipForClient?: boolean }
): Promise<{ status: 200 | 401 | 403; message?: string }> {
  const ctx = await createContext({ req, res } as any);
  const user = (req as any)?.user || ctx.user;

  let portalContactId: number | null = null;
  const portalToken = extractPortalToken(req);
  if (!user && portalToken) {
    const conn = await getDb();
    if (conn) {
      const [session] = await conn
        .select()
        .from(portalSessions)
        .where(eq(portalSessions.token, portalToken))
        .limit(1);
      if (session && session.expiresAt >= new Date()) {
        portalContactId = Number(session.contactId);
      }
    }
  }

  if (!user && !portalContactId) {
    return { status: 401, message: "Authentication required to upload files" };
  }

  if (user) {
    const staffAccess = await resolveStaffAccess(user);
    if (
      staffAccess.accountStatus === "inactive" ||
      Number(user.id) === 9060031 ||
      user.openId === "katkins-admin-openid"
    ) {
      return { status: 403, message: "Account is deactivated or unauthorized" };
    }

    if (staffAccess.isStaff) {
      const filesLevel = checkBackendCaseAccess(staffAccess, "files");
      if (filesLevel !== "edit" && filesLevel !== "manage") {
        return {
          status: 403,
          message: "Staff role does not have document upload permission ('files' edit access required)",
        };
      }
      return { status: 200 };
    }
  }

  // Client / parent caller: verify target contact ownership if provided or required
  const targetId = Number(opts?.targetContactId || 0);
  if (opts?.requireTargetOwnershipForClient && targetId <= 0) {
    return { status: 403, message: "Valid clientId is required to confirm file upload" };
  }

  if (targetId > 0) {
    const owns = await isClientOwnedContactId(
      {
        user: user || (portalContactId ? { id: portalContactId, contactId: portalContactId } : null),
        portalContactId,
      },
      targetId
    );
    if (!owns) {
      return {
        status: 403,
        message: "You do not have permission to upload files to another family's record",
      };
    }
  }

  return { status: 200 };
}

export function registerFileUploadRoutes(app: Express) {
  // Step 1: Request a presigned upload URL
  app.post("/api/files/presign", async (req: Request, res: Response) => {
    try {
      const auth = await authorizeFileUploadRequest(req, res, {
        targetContactId: req.body?.clientId ? Number(req.body.clientId) : null,
      });
      if (auth.status !== 200) {
        return res.status(auth.status).json({ error: auth.message });
      }

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
      const auth = await authorizeFileUploadRequest(req, res, {
        targetContactId: req.body?.clientId ? Number(req.body.clientId) : null,
      });
      if (auth.status !== 200) {
        return res.status(auth.status).json({ error: auth.message });
      }

      const { fileName, fileSize } = req.body;
      if (!fileName || typeof fileName !== "string") {
        return res.status(400).json({ error: "fileName is required" });
      }
      const ext = fileName.toLowerCase().split(".").pop() ?? "";
      const allowed = ["pdf", "doc", "docx", "png", "jpg", "jpeg"];
      if (!allowed.includes(ext)) {
        return res.status(400).json({ error: "Only PDF, DOC, DOCX, or image files are accepted." });
      }
      if (fileSize && fileSize > 100 * 1024 * 1024) {
        return res.status(400).json({ error: "File size exceeds 100MB limit." });
      }
      const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
      const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const fileKey = `iep-documents/${Date.now()}_${hash}_${sanitizedName}`;
      const mimeMap: Record<string, string> = {
        pdf: "application/pdf",
        doc: "application/msword",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
      };
      const contentType = mimeMap[ext] || "application/octet-stream";
      const uploadUrl = await getR2SignedUploadUrl(fileKey, contentType);
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

      const auth = await authorizeFileUploadRequest(req, res, {
        targetContactId: Number(clientId),
        requireTargetOwnershipForClient: true,
      });
      if (auth.status !== 200) {
        return res.status(auth.status).json({ error: auth.message });
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
