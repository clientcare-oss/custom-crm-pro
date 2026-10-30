import type { Express } from "express";
import fs from "fs";
import path from "path";
import { eq, or } from "drizzle-orm";
import { getR2SignedDownloadUrl } from "./r2Client";
import { createContext } from "./context";
import { resolveStaffAccess, checkBackendCaseAccess } from "./staffAccess";
import { isClientOwnedContactId } from "./trpc";
import { getDb } from "../db";
import { clientFiles, iepDocuments, draftIepHistory, portalSessions } from "../../drizzle/schema";
import { inMemoryVaultFiles } from "../routers/clientFiles";

function extractPortalTokenFromReq(req: any): string | undefined {
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

export async function authorizeStorageKeyAccess(
  req: any,
  res: any,
  key: string
): Promise<{ status: 200 | 401 | 403; message?: string }> {
  const cleanKey = String(key || "").replace(/^\/+/, "");
  if (!cleanKey || cleanKey.includes("..")) {
    return { status: 403, message: "Invalid storage key" };
  }

  const ctx = await createContext({ req, res } as any);
  const user = (req as any)?.user || ctx.user;

  let portalContactId: number | null = null;
  const portalToken = extractPortalTokenFromReq(req);
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
    return { status: 401, message: "Authentication required to access stored documents" };
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
      if (filesLevel === "none") {
        return {
          status: 403,
          message: "Staff role does not have case document access ('files' permission is 'none')",
        };
      }
      return { status: 200 };
    }
  }

  // Client / parent caller: must own the file record matching this storage key
  const targetUrl = `/storage/${cleanKey}`;
  const candidateOwnerIds = new Set<number>();

  for (const files of Array.from(inMemoryVaultFiles.values())) {
    for (const f of files) {
      if (
        f.fileKey === cleanKey ||
        f.fileUrl === targetUrl ||
        (typeof f.fileUrl === "string" && f.fileUrl.endsWith(`/${cleanKey}`))
      ) {
        if (Number(f.clientId) > 0) candidateOwnerIds.add(Number(f.clientId));
        if (Number(f.studentId) > 0) candidateOwnerIds.add(Number(f.studentId));
      }
    }
  }

  const conn = await getDb();
  if (conn) {
    try {
      const dbFiles = await conn
        .select()
        .from(clientFiles)
        .where(or(eq(clientFiles.fileKey, cleanKey), eq(clientFiles.fileUrl, targetUrl)));
      for (const f of dbFiles) {
        if (Number(f.clientId) > 0) candidateOwnerIds.add(Number(f.clientId));
        if (Number((f as any).studentId) > 0) candidateOwnerIds.add(Number((f as any).studentId));
      }
    } catch {}

    try {
      const dbIepDocs = await conn
        .select()
        .from(iepDocuments)
        .where(
          or(
            eq(iepDocuments.currentFileKey, cleanKey),
            eq(iepDocuments.currentFileUrl, targetUrl),
            eq(iepDocuments.previousFileKey, cleanKey),
            eq(iepDocuments.previousFileUrl, targetUrl)
          )
        );
      for (const d of dbIepDocs) {
        if (Number(d.contactId) > 0) candidateOwnerIds.add(Number(d.contactId));
      }
    } catch {}

    try {
      const dbDraftDocs = await conn
        .select()
        .from(draftIepHistory)
        .where(or(eq(draftIepHistory.fileKey, cleanKey), eq(draftIepHistory.fileUrl, targetUrl)));
      for (const d of dbDraftDocs) {
        if (Number(d.contactId) > 0) candidateOwnerIds.add(Number(d.contactId));
      }
    } catch {}
  }

  if (candidateOwnerIds.size === 0) {
    return { status: 403, message: "Access denied: document ownership could not be verified" };
  }

  for (const ownerId of Array.from(candidateOwnerIds)) {
    const owns = await isClientOwnedContactId(
      {
        user: user || (portalContactId ? { id: portalContactId, contactId: portalContactId } : null),
        portalContactId,
      },
      ownerId
    );
    if (owns) {
      return { status: 200 };
    }
  }

  return {
    status: 403,
    message: "You do not have permission to download another family's document",
  };
}

export function registerStorageProxy(app: Express) {
  const handler = async (req: any, res: any) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    const authResult = await authorizeStorageKeyAccess(req, res, key);
    if (authResult.status !== 200) {
      res.status(authResult.status).json({ error: authResult.message || "Access denied" });
      return;
    }

    try {
      // 0. Check local disk in uploads/
      const localFilePath = path.resolve(process.cwd(), "uploads", key);
      if (fs.existsSync(localFilePath) && fs.statSync(localFilePath).isFile()) {
        const ext = path.extname(localFilePath).toLowerCase();
        const mimeTypes: Record<string, string> = {
          ".pdf": "application/pdf",
          ".png": "image/png",
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".webp": "image/webp",
          ".txt": "text/plain",
        };
        res.set("Content-Type", mimeTypes[ext] || "application/octet-stream");
        res.set("Access-Control-Allow-Origin", "*");
        res.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
        res.set("Cache-Control", "private, max-age=3600");
        res.sendFile(localFilePath);
        return;
      }

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
        res.set("Cache-Control", "private, max-age=3600");
        res.send(buffer);
        return;
      }

      // 2. Fall back to R2 signed URL
      const signedUrl = await getR2SignedDownloadUrl(key);
      res.set("Cache-Control", "private, max-age=3600");
      res.redirect(307, signedUrl);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  };

  app.get("/storage/*", handler);
  app.get("/manus-storage/*", handler);
}
