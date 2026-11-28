import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { queryCloudflareD1 } from "../_core/d1Client";
import { deleteFromR2 } from "../_core/r2Client";
import { isAuthorizedRadioAdminUser } from "../radioUpload";
import {
  ALL_WAYPOINT_RADIO_FOLDERS,
  DEFAULT_WAYPOINT_RADIO_SETTINGS,
  resolveFolderForTrack,
  type AmbientCategoryId,
  type RadioStationId,
  type RadioTrackKind,
  type WaypointRadioSettings,
  type WaypointRadioTrack,
} from "../../shared/waypointRadio";

const stationIdSchema = z.enum([
  "the-lobby",
  "smooth-92",
  "flow-fm",
  "midnight-lounge",
  "easy-street",
]);

const trackKindSchema = z.enum([
  "music",
  "announcement",
  "commercial",
  "general_announcement",
  "ambience",
]);

const ambientCategorySchema = z.enum([
  "fan",
  "rain-shower",
  "ocean",
  "train",
  "coffee-shop",
  "thunder",
]);

let schemaReady = false;

async function ensureWaypointRadioTables(): Promise<void> {
  if (schemaReady) return;
  await queryCloudflareD1(
    `CREATE TABLE IF NOT EXISTS waypoint_radio_tracks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL,
      station_id TEXT,
      ambient_category TEXT,
      folder_path TEXT NOT NULL,
      title TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_key TEXT NOT NULL,
      file_url TEXT NOT NULL,
      mime_type TEXT NOT NULL DEFAULT 'audio/mpeg',
      file_size INTEGER NOT NULL DEFAULT 0,
      duration_sec REAL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1,
      album_description TEXT NOT NULL DEFAULT '',
      suno_prompt TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  );
  await queryCloudflareD1(
    `CREATE TABLE IF NOT EXISTS waypoint_radio_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      settings_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  );
  schemaReady = true;
}

function mapTrackRow(row: Record<string, any>): WaypointRadioTrack {
  return {
    id: Number(row.id),
    kind: String(row.kind) as RadioTrackKind,
    stationId: row.station_id ? String(row.station_id) : null,
    ambientCategory: row.ambient_category ? (String(row.ambient_category) as AmbientCategoryId) : null,
    folderPath: String(row.folder_path || ""),
    title: String(row.title || "Untitled Track"),
    fileName: String(row.file_name || ""),
    fileKey: String(row.file_key || ""),
    fileUrl: String(row.file_url || ""),
    mimeType: String(row.mime_type || "audio/mpeg"),
    fileSize: Number(row.file_size || 0),
    durationSec: row.duration_sec !== null && row.duration_sec !== undefined ? Number(row.duration_sec) : null,
    sortOrder: Number(row.sort_order || 0),
    enabled: Number(row.enabled ?? 1) !== 0,
    albumDescription: String(row.album_description || ""),
    sunoPrompt: String(row.suno_prompt || ""),
    createdAt: String(row.created_at || ""),
    updatedAt: String(row.updated_at || ""),
  };
}

async function loadRadioSettings(): Promise<WaypointRadioSettings> {
  await ensureWaypointRadioTables();
  const rows = await queryCloudflareD1("SELECT settings_json FROM waypoint_radio_settings WHERE id = 1");
  if (!rows || rows.length === 0 || !rows[0]?.settings_json) {
    return { ...DEFAULT_WAYPOINT_RADIO_SETTINGS };
  }
  try {
    const parsed = JSON.parse(String(rows[0].settings_json));
    return {
      ...DEFAULT_WAYPOINT_RADIO_SETTINGS,
      ...parsed,
      ambientDefaultVolumes: {
        ...DEFAULT_WAYPOINT_RADIO_SETTINGS.ambientDefaultVolumes,
        ...(parsed?.ambientDefaultVolumes || {}),
      },
      ambientPresetByCategory: {
        ...DEFAULT_WAYPOINT_RADIO_SETTINGS.ambientPresetByCategory,
        ...(parsed?.ambientPresetByCategory || {}),
      },
    };
  } catch {
    return { ...DEFAULT_WAYPOINT_RADIO_SETTINGS };
  }
}

async function assertRadioAdmin(user: any): Promise<void> {
  const ok = await isAuthorizedRadioAdminUser(user);
  if (!ok) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only authorized administrators can modify Waypoint Radio settings or audio files.",
    });
  }
}

export const waypointRadioRouter = router({
  /** Returns complete ordered library (strictly sequential sortOrder, never shuffled) & settings */
  getLibrary: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role === "client") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Waypoint Radio is for staff members only." });
    }
    await ensureWaypointRadioTables();
    const rows = await queryCloudflareD1(
      "SELECT * FROM waypoint_radio_tracks ORDER BY sort_order ASC, id ASC"
    );
    const settings = await loadRadioSettings();
    const isAdmin = await isAuthorizedRadioAdminUser(ctx.user);
    return {
      tracks: (rows || []).map(mapTrackRow),
      settings,
      isAdmin,
      folderStructure: ALL_WAYPOINT_RADIO_FOLDERS,
    };
  }),

  /** Register a newly uploaded MP3/WAV track at the END of its playlist */
  registerTrack: protectedProcedure
    .input(
      z.object({
        kind: trackKindSchema,
        stationId: stationIdSchema.nullable().optional(),
        ambientCategory: ambientCategorySchema.nullable().optional(),
        title: z.string().min(1).max(200),
        fileName: z.string().min(1).max(260),
        fileKey: z.string().min(1).max(500),
        fileUrl: z.string().min(1).max(600),
        mimeType: z.string().default("audio/mpeg"),
        fileSize: z.number().int().nonnegative().default(0),
        durationSec: z.number().nonnegative().nullable().optional(),
        albumDescription: z.string().max(4000).optional(),
        sunoPrompt: z.string().max(4000).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertRadioAdmin(ctx.user);
      await ensureWaypointRadioTables();

      const folderPath = resolveFolderForTrack({
        kind: input.kind,
        stationId: input.stationId ?? null,
        ambientCategory: input.ambientCategory ?? null,
      });
      if (!folderPath) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid station or category for track." });
      }

      // Compute next sequential sort_order so newly uploaded tracks ALWAYS appear at the end
      const maxRows = await queryCloudflareD1(
        "SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM waypoint_radio_tracks WHERE folder_path = ?",
        [folderPath]
      );
      const nextSortOrder = Number(maxRows?.[0]?.max_order ?? -1) + 1;

      await queryCloudflareD1(
        `INSERT INTO waypoint_radio_tracks (
          kind, station_id, ambient_category, folder_path, title, file_name, file_key, file_url,
          mime_type, file_size, duration_sec, sort_order, enabled, album_description, suno_prompt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [
          input.kind,
          input.stationId ?? null,
          input.ambientCategory ?? null,
          folderPath,
          input.title.trim(),
          input.fileName,
          input.fileKey,
          input.fileUrl,
          input.mimeType,
          input.fileSize,
          input.durationSec ?? null,
          nextSortOrder,
          input.albumDescription ?? "",
          input.sunoPrompt ?? "",
        ]
      );

      const inserted = await queryCloudflareD1(
        "SELECT * FROM waypoint_radio_tracks WHERE file_key = ? ORDER BY id DESC LIMIT 1",
        [input.fileKey]
      );
      return inserted?.[0] ? mapTrackRow(inserted[0]) : null;
    }),

  /** Update track metadata, toggle enable/disable, or replace underlying audio file cleanly */
  updateTrack: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        title: z.string().min(1).max(200).optional(),
        enabled: z.boolean().optional(),
        albumDescription: z.string().max(4000).optional(),
        sunoPrompt: z.string().max(4000).optional(),
        fileName: z.string().min(1).max(260).optional(),
        fileKey: z.string().min(1).max(500).optional(),
        fileUrl: z.string().min(1).max(600).optional(),
        mimeType: z.string().optional(),
        fileSize: z.number().int().nonnegative().optional(),
        durationSec: z.number().nonnegative().nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertRadioAdmin(ctx.user);
      await ensureWaypointRadioTables();

      const existingRows = await queryCloudflareD1(
        "SELECT * FROM waypoint_radio_tracks WHERE id = ? LIMIT 1",
        [input.id]
      );
      if (!existingRows || existingRows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Track not found." });
      }
      const existing = mapTrackRow(existingRows[0]);

      const sets: string[] = ["updated_at = datetime('now')"];
      const params: unknown[] = [];

      if (input.title !== undefined) {
        sets.push("title = ?");
        params.push(input.title.trim());
      }
      if (input.enabled !== undefined) {
        sets.push("enabled = ?");
        params.push(input.enabled ? 1 : 0);
      }
      if (input.albumDescription !== undefined) {
        sets.push("album_description = ?");
        params.push(input.albumDescription);
      }
      if (input.sunoPrompt !== undefined) {
        sets.push("suno_prompt = ?");
        params.push(input.sunoPrompt);
      }
      if (input.fileName !== undefined) {
        sets.push("file_name = ?");
        params.push(input.fileName);
      }
      if (input.fileKey !== undefined) {
        sets.push("file_key = ?");
        params.push(input.fileKey);
      }
      if (input.fileUrl !== undefined) {
        sets.push("file_url = ?");
        params.push(input.fileUrl);
      }
      if (input.mimeType !== undefined) {
        sets.push("mime_type = ?");
        params.push(input.mimeType);
      }
      if (input.fileSize !== undefined) {
        sets.push("file_size = ?");
        params.push(input.fileSize);
      }
      if (input.durationSec !== undefined) {
        sets.push("duration_sec = ?");
        params.push(input.durationSec);
      }

      params.push(input.id);
      await queryCloudflareD1(
        `UPDATE waypoint_radio_tracks SET ${sets.join(", ")} WHERE id = ?`,
        params
      );

      // If audio file was replaced, clean up old R2 object
      if (input.fileKey && input.fileKey !== existing.fileKey && existing.fileKey) {
        await deleteFromR2(existing.fileKey);
      }

      const updated = await queryCloudflareD1(
        "SELECT * FROM waypoint_radio_tracks WHERE id = ? LIMIT 1",
        [input.id]
      );
      return updated?.[0] ? mapTrackRow(updated[0]) : null;
    }),

  /** Reorder playlist sequentially without modifying any underlying audio files */
  reorderTracks: protectedProcedure
    .input(
      z.object({
        orderedIds: z.array(z.number().int().positive()).min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertRadioAdmin(ctx.user);
      await ensureWaypointRadioTables();

      for (let i = 0; i < input.orderedIds.length; i++) {
        await queryCloudflareD1(
          "UPDATE waypoint_radio_tracks SET sort_order = ?, updated_at = datetime('now') WHERE id = ?",
          [i, input.orderedIds[i]]
        );
      }
      return { success: true, count: input.orderedIds.length };
    }),

  /** Move a song or announcement to another official station (preserves audio file, appends to end) */
  moveTrack: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        targetStationId: stationIdSchema.nullable().optional(),
        targetKind: trackKindSchema.optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertRadioAdmin(ctx.user);
      await ensureWaypointRadioTables();

      const existingRows = await queryCloudflareD1(
        "SELECT * FROM waypoint_radio_tracks WHERE id = ? LIMIT 1",
        [input.id]
      );
      if (!existingRows || existingRows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Track not found." });
      }
      const existing = mapTrackRow(existingRows[0]);
      const nextKind: RadioTrackKind = input.targetKind ?? existing.kind;
      const nextStationId: RadioStationId | null =
        nextKind === "music" || nextKind === "announcement"
          ? (input.targetStationId ?? null)
          : null;

      const nextFolder = resolveFolderForTrack({
        kind: nextKind,
        stationId: nextStationId,
        ambientCategory: existing.ambientCategory,
      });
      if (!nextFolder) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Please select a valid official destination station.",
        });
      }

      const maxRows = await queryCloudflareD1(
        "SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM waypoint_radio_tracks WHERE folder_path = ?",
        [nextFolder]
      );
      const nextSortOrder = Number(maxRows?.[0]?.max_order ?? -1) + 1;

      await queryCloudflareD1(
        `UPDATE waypoint_radio_tracks
         SET kind = ?, station_id = ?, folder_path = ?, sort_order = ?, updated_at = datetime('now')
         WHERE id = ?`,
        [nextKind, nextStationId, nextFolder, nextSortOrder, input.id]
      );

      const updated = await queryCloudflareD1(
        "SELECT * FROM waypoint_radio_tracks WHERE id = ? LIMIT 1",
        [input.id]
      );
      return updated?.[0] ? mapTrackRow(updated[0]) : null;
    }),

  /** Delete a track from the library and remove its object from storage */
  deleteTrack: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      await assertRadioAdmin(ctx.user);
      await ensureWaypointRadioTables();

      const existingRows = await queryCloudflareD1(
        "SELECT file_key FROM waypoint_radio_tracks WHERE id = ? LIMIT 1",
        [input.id]
      );
      const oldKey = existingRows?.[0]?.file_key ? String(existingRows[0].file_key) : null;

      await queryCloudflareD1("DELETE FROM waypoint_radio_tracks WHERE id = ?", [input.id]);
      if (oldKey) {
        await deleteFromR2(oldKey);
      }
      return { success: true };
    }),

  /** Persist global Waypoint Radio playback, fade, crossfade, repeat, announcement & ambience settings */
  updateSettings: protectedProcedure
    .input(
      z.object({
        fadeInSec: z.number().min(0).max(15).optional(),
        fadeOutSec: z.number().min(0).max(15).optional(),
        crossfadeSec: z.number().min(0).max(15).optional(),
        musicVolume: z.number().min(0).max(1).optional(),
        announcementVolume: z.number().min(0).max(1).optional(),
        defaultRepeat: z.boolean().optional(),
        announcementEveryNSongs: z.number().int().min(0).max(50).optional(),
        commercialEveryNSongs: z.number().int().min(0).max(50).optional(),
        ambientDefaultVolumes: z
          .object({
            fan: z.number().min(0).max(1),
            "rain-shower": z.number().min(0).max(1),
            ocean: z.number().min(0).max(1),
            train: z.number().min(0).max(1),
            "coffee-shop": z.number().min(0).max(1),
            thunder: z.number().min(0).max(1),
          })
          .optional(),
        ambientPresetByCategory: z
          .object({
            fan: z.string().min(1).max(60),
            "rain-shower": z.string().min(1).max(60),
            ocean: z.string().min(1).max(60),
            train: z.string().min(1).max(60),
            "coffee-shop": z.string().min(1).max(60),
            thunder: z.string().min(1).max(60),
          })
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertRadioAdmin(ctx.user);
      const current = await loadRadioSettings();
      const merged: WaypointRadioSettings = {
        ...current,
        ...input,
        ambientDefaultVolumes: {
          ...current.ambientDefaultVolumes,
          ...(input.ambientDefaultVolumes || {}),
        },
        ambientPresetByCategory: {
          ...current.ambientPresetByCategory,
          ...(input.ambientPresetByCategory || {}),
        },
      };

      await queryCloudflareD1(
        `INSERT INTO waypoint_radio_settings (id, settings_json, updated_at)
         VALUES (1, ?, datetime('now'))
         ON CONFLICT(id) DO UPDATE SET settings_json = excluded.settings_json, updated_at = datetime('now')`,
        [JSON.stringify(merged)]
      );
      return merged;
    }),
});
