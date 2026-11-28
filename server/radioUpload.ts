import express from "express";
import type { Express, Request as ExpressRequest, Response as ExpressResponse } from "express";
import fs from "fs";
import path from "path";
import { createContext, authenticateClerkOrSession } from "./_core/context";
import { resolveStaffAccess } from "./_core/staffAccess";
import { getR2SignedUploadUrl, uploadToR2 } from "./_core/r2Client";
import { isValidRadioFolder } from "../shared/waypointRadio";

const MAX_AUDIO_BYTES = 120 * 1024 * 1024; // 120MB (supports high-res Suno WAV & MP3 files)

const ALLOWED_AUDIO_EXTS: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
};

export async function isAuthorizedRadioAdminUser(user: any): Promise<boolean> {
  if (!user) return false;
  if (Number(user.id) === 9060031 || user.openId === "katkins-admin-openid") return false;
  if (user.role === "admin" || Number(user.id) === 1) return true;
  try {
    const staffAccess = await resolveStaffAccess(user);
    if (staffAccess.accountStatus === "inactive") return false;
    return Boolean(staffAccess.hasAdminAccess);
  } catch {
    return false;
  }
}

function sanitizeAudioFileName(
  fileName: string
): { safeName: string; ext: string; mimeType: string } | null {
  const trimmed = String(fileName || "").trim();
  const lastDot = trimmed.lastIndexOf(".");
  if (lastDot <= 0) return null;
  const ext = trimmed.slice(lastDot).toLowerCase();
  const mimeType = ALLOWED_AUDIO_EXTS[ext];
  if (!mimeType) return null;
  const base = trimmed
    .slice(0, lastDot)
    .replace(/[^a-zA-Z0-9 _.-]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  if (!base) return null;
  return { safeName: `${base}${ext}`, ext, mimeType };
}

function buildRadioStorageKey(folderPath: string, safeName: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const stamp = Date.now();
  return `${folderPath}/${stamp}_${hash}_${safeName}`;
}

function persistLocalRadioFile(fileKey: string, buffer: Buffer): void {
  try {
    const uploadPath = path.resolve(process.cwd(), "uploads", fileKey);
    fs.mkdirSync(path.dirname(uploadPath), { recursive: true });
    fs.writeFileSync(uploadPath, buffer);
  } catch (err) {
    console.warn("[RadioUpload] Local uploads/ write skipped:", err);
  }
}

function decodeHeaderValue(raw: string | string[] | null | undefined): string {
  const val = Array.isArray(raw) ? raw[0] : raw;
  if (!val) return "";
  try {
    return decodeURIComponent(val);
  } catch {
    return val;
  }
}

/** Express routes for local dev & Node server */
export function registerRadioUploadRoutes(app: Express) {
  app.post("/api/radio/presign", async (req: ExpressRequest, res: ExpressResponse) => {
    try {
      const ctx = await createContext({ req, res } as any);
      const isAdmin = await isAuthorizedRadioAdminUser(ctx.user);
      if (!isAdmin) {
        return res
          .status(403)
          .json({ error: "Administrator access required to upload Waypoint Radio audio." });
      }

      const { folderPath, fileName, fileSize } = req.body || {};
      if (!folderPath || !isValidRadioFolder(String(folderPath))) {
        return res.status(400).json({ error: "Invalid Waypoint Radio folder path." });
      }
      const parsed = sanitizeAudioFileName(String(fileName || ""));
      if (!parsed) {
        return res.status(400).json({ error: "Only MP3 and WAV audio files are supported." });
      }
      if (fileSize && Number(fileSize) > MAX_AUDIO_BYTES) {
        return res.status(400).json({ error: "Audio file exceeds 120MB upload limit." });
      }

      const fileKey = buildRadioStorageKey(String(folderPath), parsed.safeName);
      const uploadUrl = await getR2SignedUploadUrl(fileKey, parsed.mimeType, 3600);
      return res.json({
        uploadUrl,
        fileKey,
        fileUrl: `/storage/${encodeURI(fileKey)}`,
        mimeType: parsed.mimeType,
        safeName: parsed.safeName,
      });
    } catch (err: any) {
      console.error("[RadioUpload] Presign error:", err);
      return res.status(500).json({ error: err?.message || "Failed to generate audio upload URL." });
    }
  });

  app.post(
    "/api/radio/upload",
    express.raw({ type: () => true, limit: "120mb" }),
    async (req: ExpressRequest, res: ExpressResponse) => {
      try {
        const ctx = await createContext({ req, res } as any);
        const isAdmin = await isAuthorizedRadioAdminUser(ctx.user);
        if (!isAdmin) {
          return res
            .status(403)
            .json({ error: "Administrator access required to upload Waypoint Radio audio." });
        }

        const folderPath = decodeHeaderValue(
          req.headers["x-radio-folder"] || (req.query.folderPath as string | undefined)
        );
        if (!isValidRadioFolder(folderPath)) {
          return res.status(400).json({ error: "Invalid Waypoint Radio folder path." });
        }

        const rawName = decodeHeaderValue(
          req.headers["x-radio-filename"] || (req.query.fileName as string | undefined)
        );
        const parsed = sanitizeAudioFileName(rawName);
        if (!parsed) {
          return res.status(400).json({ error: "Only MP3 and WAV audio files are supported." });
        }

        const buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || "");
        if (!buffer || buffer.length === 0) {
          return res.status(400).json({ error: "No audio file payload received." });
        }
        if (buffer.length > MAX_AUDIO_BYTES) {
          return res.status(400).json({ error: "Audio file exceeds 120MB upload limit." });
        }

        const fileKey = buildRadioStorageKey(folderPath, parsed.safeName);
        persistLocalRadioFile(fileKey, buffer);
        await uploadToR2(fileKey, buffer, parsed.mimeType);

        return res.json({
          fileKey,
          fileUrl: `/storage/${encodeURI(fileKey)}`,
          fileName: parsed.safeName,
          fileSize: buffer.length,
          mimeType: parsed.mimeType,
        });
      } catch (err: any) {
        console.error("[RadioUpload] Direct binary upload error:", err);
        return res.status(500).json({ error: err?.message || "Audio upload failed." });
      }
    }
  );
}

/** Cloudflare Worker handler for /api/radio/presign and /api/radio/upload */
export async function handleRadioWorkerRequest(
  request: globalThis.Request
): Promise<globalThis.Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== "/api/radio/presign" && url.pathname !== "/api/radio/upload") {
    return null;
  }

  if (request.method !== "POST") {
    return new globalThis.Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let user: any = null;
  try {
    user = await authenticateClerkOrSession(request);
  } catch {
    user = null;
  }

  const isAdmin = await isAuthorizedRadioAdminUser(user);
  if (!isAdmin) {
    return new globalThis.Response(
      JSON.stringify({ error: "Administrator access required to upload Waypoint Radio audio." }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  if (url.pathname === "/api/radio/presign") {
    try {
      const body = (await request.json().catch(() => ({}))) as any;
      const folderPath = String(body.folderPath || "");
      if (!isValidRadioFolder(folderPath)) {
        return new globalThis.Response(JSON.stringify({ error: "Invalid Waypoint Radio folder path." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      const parsed = sanitizeAudioFileName(String(body.fileName || ""));
      if (!parsed) {
        return new globalThis.Response(
          JSON.stringify({ error: "Only MP3 and WAV audio files are supported." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      if (body.fileSize && Number(body.fileSize) > MAX_AUDIO_BYTES) {
        return new globalThis.Response(
          JSON.stringify({ error: "Audio file exceeds 120MB upload limit." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const fileKey = buildRadioStorageKey(folderPath, parsed.safeName);
      const uploadUrl = await getR2SignedUploadUrl(fileKey, parsed.mimeType, 3600);
      return new globalThis.Response(
        JSON.stringify({
          uploadUrl,
          fileKey,
          fileUrl: `/storage/${encodeURI(fileKey)}`,
          mimeType: parsed.mimeType,
          safeName: parsed.safeName,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (err: any) {
      return new globalThis.Response(JSON.stringify({ error: err?.message || "Presign failed." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // /api/radio/upload direct binary or multipart fallback via Cloudflare Worker -> R2
  try {
    const contentType = request.headers.get("content-type") || "";
    let folderPath = "";
    let rawName = "";
    let buffer: Buffer;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      folderPath = String(formData.get("folderPath") || "");
      const file = formData.get("file") as File | null;
      if (!file) {
        return new globalThis.Response(JSON.stringify({ error: "No audio file uploaded." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      rawName = file.name;
      buffer = Buffer.from(await file.arrayBuffer());
    } else {
      folderPath = decodeHeaderValue(
        request.headers.get("x-radio-folder") || url.searchParams.get("folderPath")
      );
      rawName = decodeHeaderValue(
        request.headers.get("x-radio-filename") || url.searchParams.get("fileName")
      );
      buffer = Buffer.from(await request.arrayBuffer());
    }

    if (!isValidRadioFolder(folderPath)) {
      return new globalThis.Response(JSON.stringify({ error: "Invalid Waypoint Radio folder path." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const parsed = sanitizeAudioFileName(rawName);
    if (!parsed) {
      return new globalThis.Response(
        JSON.stringify({ error: "Only MP3 and WAV audio files are supported." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!buffer || buffer.length === 0) {
      return new globalThis.Response(JSON.stringify({ error: "No audio file payload received." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (buffer.length > MAX_AUDIO_BYTES) {
      return new globalThis.Response(JSON.stringify({ error: "Audio file exceeds 120MB upload limit." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const fileKey = buildRadioStorageKey(folderPath, parsed.safeName);
    await uploadToR2(fileKey, buffer, parsed.mimeType);

    return new globalThis.Response(
      JSON.stringify({
        fileKey,
        fileUrl: `/storage/${encodeURI(fileKey)}`,
        fileName: parsed.safeName,
        fileSize: buffer.length,
        mimeType: parsed.mimeType,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new globalThis.Response(JSON.stringify({ error: err?.message || "Audio upload failed." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
