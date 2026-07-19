import { z } from "zod";
import * as db from "../db";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure, adminProcedure, portalProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import { storagePut } from "../storage";
import { notifyOwner } from "../_core/notification";
import { brainDumpItems, brainDumpImages } from "../../drizzle/schema";

export const voiceRouter = router({

    transcribe: protectedProcedure
      .input(z.object({
        // base64-encoded audio blob — avoids S3 URL resolution issues
        audioBase64: z.string(),
        mimeType: z.string().default("audio/webm"),
        language: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Voice transcription service is not configured" });
        }
        const audioBuffer = Buffer.from(input.audioBase64, "base64");
        if (audioBuffer.length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Empty audio data" });
        }
        const sizeMB = audioBuffer.length / (1024 * 1024);
        if (sizeMB > 16) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Audio file too large (${sizeMB.toFixed(1)}MB, max 16MB)` });
        }
        const mimeType = input.mimeType || "audio/webm";
        const ext = mimeType.includes("webm") ? "webm" : mimeType.includes("mp4") ? "mp4" : "webm";
        const formData = new FormData();
        const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
        formData.append("file", audioBlob, `audio.${ext}`);
        formData.append("model", "whisper-1");
        formData.append("response_format", "json");
        formData.append("prompt", "Transcribe the user's voice input for a CRM field. Return exact words spoken.");
        if (input.language) formData.append("language", input.language);
        const baseUrl = ENV.forgeApiUrl.endsWith("/") ? ENV.forgeApiUrl : `${ENV.forgeApiUrl}/`;
        const whisperUrl = new URL("v1/audio/transcriptions", baseUrl).toString();
        const response = await fetch(whisperUrl, {
          method: "POST",
          headers: { authorization: `Bearer ${ENV.forgeApiKey}`, "Accept-Encoding": "identity" },
          body: formData,
        });
        if (!response.ok) {
          const errorText = await response.text().catch(() => "");
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Transcription failed: ${response.status} ${errorText}` });
        }
        const result = await response.json() as { text?: string };
        if (!result.text) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Transcription returned empty result" });
        }
        return { text: result.text.trim() };
      }),
  
});
