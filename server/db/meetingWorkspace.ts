import { eq, desc } from "drizzle-orm";
import { getDb } from "./connection";
import { queryCloudflareD1, getLocalDbClient } from "../_core/d1Client";
import { meetingWorkspaces, type MeetingWorkspace, type InsertMeetingWorkspace } from "../../drizzle/schema";

/**
 * Ensures the meeting_workspaces table exists in D1/SQLite.
 */
async function ensureTable(db?: any) {
  const ddl = `
    CREATE TABLE IF NOT EXISTS meeting_workspaces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_contact_id INTEGER NOT NULL,
      appointment_id INTEGER,
      title TEXT DEFAULT 'IEP Meeting Workspace' NOT NULL,
      meeting_date TEXT,
      meeting_type TEXT DEFAULT 'Annual IEP Meeting',
      status TEXT DEFAULT 'PREPARING' NOT NULL,
      active_tab TEXT DEFAULT 'PREP' NOT NULL,
      prep_step TEXT DEFAULT 'iep_intel' NOT NULL,
      detected_iep_order TEXT,
      iep_intel_findings TEXT,
      parent_intel_concerns TEXT,
      parent_concern_statement TEXT,
      pcs_approved INTEGER DEFAULT 0 NOT NULL,
      pcs_last_approved_at TIMESTAMP,
      meeting_targets TEXT,
      parking_lot TEXT,
      additional_items TEXT,
      closeout_checks TEXT,
      completed_at TIMESTAMP,
      completed_summary TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
  `;
  try {
    const cfDb = (globalThis as any).__CF_ENV_DB__;
    if (cfDb) {
      await cfDb.prepare(ddl).run();
    }
  } catch {}

  try {
    const local = getLocalDbClient();
    await local.execute(ddl);
  } catch {}
}

// In-memory cache for deterministic test isolation and offline resilience
const inMemoryWorkspaces = new Map<number, MeetingWorkspace>();

/**
 * Normalizes snake_case / camelCase database row into standard MeetingWorkspace.
 */
function formatWorkspaceRow(row: any): MeetingWorkspace {
  if (!row) return row;
  return {
    id: Number(row.id),
    studentContactId: Number(row.studentContactId ?? row.student_contact_id),
    appointmentId: row.appointmentId ?? row.appointment_id ?? null,
    title: row.title || "IEP Meeting Workspace",
    meetingDate: row.meetingDate ?? row.meeting_date ?? null,
    meetingType: row.meetingType ?? row.meeting_type ?? "Annual IEP Meeting",
    status: (row.status || "PREPARING") as MeetingWorkspace["status"],
    activeTab: (row.activeTab ?? row.active_tab ?? "PREP") as MeetingWorkspace["activeTab"],
    prepStep: (row.prepStep ?? row.prep_step ?? "iep_intel") as MeetingWorkspace["prepStep"],
    detectedIepOrder: row.detectedIepOrder ?? row.detected_iep_order ?? null,
    iepIntelFindings: row.iepIntelFindings ?? row.iep_intel_findings ?? null,
    parentIntelConcerns: row.parentIntelConcerns ?? row.parent_intel_concerns ?? null,
    parentConcernStatement: row.parentConcernStatement ?? row.parent_concern_statement ?? null,
    pcsApproved: Boolean(row.pcsApproved ?? row.pcs_approved),
    pcsLastApprovedAt: row.pcsLastApprovedAt ? new Date(row.pcsLastApprovedAt) : (row.pcs_last_approved_at ? new Date(row.pcs_last_approved_at) : null),
    meetingTargets: row.meetingTargets ?? row.meeting_targets ?? null,
    parkingLot: row.parkingLot ?? row.parking_lot ?? null,
    additionalItems: row.additionalItems ?? row.additional_items ?? null,
    closeoutChecks: row.closeoutChecks ?? row.closeout_checks ?? null,
    completedAt: row.completedAt ? new Date(row.completedAt) : (row.completed_at ? new Date(row.completed_at) : null),
    completedSummary: row.completedSummary ?? row.completed_summary ?? null,
    createdAt: row.createdAt ? new Date(row.createdAt) : (row.created_at ? new Date(row.created_at) : new Date()),
    updatedAt: row.updatedAt ? new Date(row.updatedAt) : (row.updated_at ? new Date(row.updated_at) : new Date()),
  };
}

/**
 * Get active/latest workspace for a student contact.
 * Guaranteed D1 sync across Cloudflare Workers and Node dev server.
 */
export async function getWorkspaceByStudentId(studentContactId: number): Promise<MeetingWorkspace | null> {
  const isTest = process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);

  if (!isTest) {
    const cfDb = (globalThis as any).__CF_ENV_DB__;
    if (cfDb) {
      try {
        const stmt = cfDb
          .prepare("SELECT * FROM meeting_workspaces WHERE student_contact_id = ? ORDER BY id DESC LIMIT 1")
          .bind(studentContactId);
        const row = await stmt.first();
        if (row) {
          const formatted = formatWorkspaceRow(row);
          inMemoryWorkspaces.set(studentContactId, formatted);
          return formatted;
        }
      } catch (e) {
        console.warn("[getWorkspaceByStudentId] CF D1 direct query error:", e);
      }
    }

    // Direct query via Cloudflare D1 HTTP API (Node server / dev mode)
    try {
      const results = await queryCloudflareD1(
        "SELECT * FROM meeting_workspaces WHERE student_contact_id = ? ORDER BY id DESC LIMIT 1",
        [studentContactId]
      );
      if (results && Array.isArray(results) && results.length > 0) {
        const formatted = formatWorkspaceRow(results[0]);
        inMemoryWorkspaces.set(studentContactId, formatted);

        // Shadow sync to local SQLite
        try {
          const local = getLocalDbClient();
          await ensureTable();
          await local.execute({
            sql: `
              INSERT INTO meeting_workspaces (
                id, student_contact_id, appointment_id, title, meeting_date, meeting_type,
                status, active_tab, prep_step, detected_iep_order, iep_intel_findings,
                parent_intel_concerns, parent_concern_statement, pcs_approved, meeting_targets,
                parking_lot, additional_items, closeout_checks, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
              ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                meeting_date = excluded.meeting_date,
                meeting_type = excluded.meeting_type,
                status = excluded.status,
                active_tab = excluded.active_tab,
                prep_step = excluded.prep_step,
                detected_iep_order = excluded.detected_iep_order,
                iep_intel_findings = excluded.iep_intel_findings,
                parent_intel_concerns = excluded.parent_intel_concerns,
                parent_concern_statement = excluded.parent_concern_statement,
                pcs_approved = excluded.pcs_approved,
                meeting_targets = excluded.meeting_targets,
                parking_lot = excluded.parking_lot,
                additional_items = excluded.additional_items,
                closeout_checks = excluded.closeout_checks,
                updated_at = CURRENT_TIMESTAMP
            `,
            args: [
              formatted.id,
              formatted.studentContactId,
              formatted.appointmentId,
              formatted.title,
              formatted.meetingDate,
              formatted.meetingType,
              formatted.status,
              formatted.activeTab,
              formatted.prepStep,
              formatted.detectedIepOrder,
              formatted.iepIntelFindings,
              formatted.parentIntelConcerns,
              formatted.parentConcernStatement,
              formatted.pcsApproved ? 1 : 0,
              formatted.meetingTargets,
              formatted.parkingLot,
              formatted.additionalItems,
              formatted.closeoutChecks,
            ],
          });
        } catch {}

        return formatted;
      }
    } catch (directErr) {
      console.warn("[getWorkspaceByStudentId] D1 query error, falling back to local:", directErr);
    }
  }

  // Local SQLite fallback
  try {
    const local = getLocalDbClient();
    await ensureTable();
    const res = await local.execute({
      sql: "SELECT * FROM meeting_workspaces WHERE student_contact_id = ? ORDER BY id DESC LIMIT 1",
      args: [studentContactId],
    });
    if (res.rows && res.rows.length > 0) {
      const formatted = formatWorkspaceRow(res.rows[0]);
      inMemoryWorkspaces.set(studentContactId, formatted);
      return formatted;
    }
  } catch {}

  const db = await getDb();
  if (db) {
    try {
      const rows = await db
        .select()
        .from(meetingWorkspaces)
        .where(eq(meetingWorkspaces.studentContactId, studentContactId))
        .orderBy(desc(meetingWorkspaces.updatedAt))
        .limit(1);

      if (rows[0]) {
        const formatted = formatWorkspaceRow(rows[0]);
        inMemoryWorkspaces.set(studentContactId, formatted);
        return formatted;
      }
    } catch {}
  }

  return inMemoryWorkspaces.get(studentContactId) || null;
}

/**
 * Get a specific workspace by primary ID.
 */
export async function getWorkspaceById(id: number): Promise<MeetingWorkspace | null> {
  const isTest = process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);

  if (!isTest) {
    const cfDb = (globalThis as any).__CF_ENV_DB__;
    if (cfDb) {
      try {
        const stmt = cfDb.prepare("SELECT * FROM meeting_workspaces WHERE id = ? LIMIT 1").bind(id);
        const row = await stmt.first();
        if (row) {
          const formatted = formatWorkspaceRow(row);
          inMemoryWorkspaces.set(formatted.studentContactId, formatted);
          return formatted;
        }
      } catch (e) {
        console.warn("[getWorkspaceById] CF D1 direct query error:", e);
      }
    }

    try {
      const results = await queryCloudflareD1("SELECT * FROM meeting_workspaces WHERE id = ? LIMIT 1", [id]);
      if (results && Array.isArray(results) && results.length > 0) {
        const formatted = formatWorkspaceRow(results[0]);
        inMemoryWorkspaces.set(formatted.studentContactId, formatted);
        return formatted;
      }
    } catch {}
  }

  try {
    const local = getLocalDbClient();
    const res = await local.execute({
      sql: "SELECT * FROM meeting_workspaces WHERE id = ? LIMIT 1",
      args: [id],
    });
    if (res.rows && res.rows.length > 0) {
      const formatted = formatWorkspaceRow(res.rows[0]);
      inMemoryWorkspaces.set(formatted.studentContactId, formatted);
      return formatted;
    }
  } catch {}

  for (const ws of Array.from(inMemoryWorkspaces.values())) {
    if (ws.id === id) return ws;
  }

  return null;
}

/**
 * List all workspaces for a student (history and current).
 */
export async function listWorkspacesByStudentId(studentContactId: number): Promise<MeetingWorkspace[]> {
  const isTest = process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);

  if (!isTest) {
    const cfDb = (globalThis as any).__CF_ENV_DB__;
    if (cfDb) {
      try {
        const stmt = cfDb
          .prepare("SELECT * FROM meeting_workspaces WHERE student_contact_id = ? ORDER BY id DESC")
          .bind(studentContactId);
        const { results } = await stmt.all();
        if (results && Array.isArray(results) && results.length > 0) {
          return results.map(formatWorkspaceRow);
        }
      } catch {}
    }

    try {
      const results = await queryCloudflareD1(
        "SELECT * FROM meeting_workspaces WHERE student_contact_id = ? ORDER BY id DESC",
        [studentContactId]
      );
      if (results && Array.isArray(results) && results.length > 0) {
        return results.map(formatWorkspaceRow);
      }
    } catch {}
  }

  try {
    const local = getLocalDbClient();
    const res = await local.execute({
      sql: "SELECT * FROM meeting_workspaces WHERE student_contact_id = ? ORDER BY id DESC",
      args: [studentContactId],
    });
    if (res.rows && res.rows.length > 0) {
      return res.rows.map(formatWorkspaceRow);
    }
  } catch {}

  const mem = inMemoryWorkspaces.get(studentContactId);
  return mem ? [mem] : [];
}

/**
 * Create a new meeting workspace session.
 */
export async function createWorkspace(data: InsertMeetingWorkspace): Promise<MeetingWorkspace | null> {
  const sql = `
    INSERT INTO meeting_workspaces (
      student_contact_id, appointment_id, title, meeting_date, meeting_type,
      status, active_tab, prep_step, detected_iep_order, iep_intel_findings,
      parent_intel_concerns, parent_concern_statement, pcs_approved, meeting_targets,
      parking_lot, additional_items, closeout_checks, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;

  const values = [
    data.studentContactId,
    data.appointmentId ?? null,
    data.title ?? "IEP Meeting Workspace",
    data.meetingDate ?? null,
    data.meetingType ?? "Annual IEP Meeting",
    data.status ?? "PREPARING",
    data.activeTab ?? "PREP",
    data.prepStep ?? "iep_intel",
    data.detectedIepOrder ?? null,
    data.iepIntelFindings ?? null,
    data.parentIntelConcerns ?? null,
    data.parentConcernStatement ?? null,
    data.pcsApproved ? 1 : 0,
    data.meetingTargets ?? null,
    data.parkingLot ?? null,
    data.additionalItems ?? null,
    data.closeoutChecks ?? null,
  ];

  let createdId: number | null = null;

  // Cloudflare D1
  const cfDb = (globalThis as any).__CF_ENV_DB__;
  if (cfDb) {
    try {
      const res = await cfDb.prepare(sql).bind(...values).run();
      if (res?.meta?.last_row_id) {
        createdId = Number(res.meta.last_row_id);
      }
    } catch (e) {
      console.warn("[createWorkspace] CF D1 direct error:", e);
    }
  }

  if (!createdId) {
    try {
      await queryCloudflareD1(sql, values);
      const latest = await queryCloudflareD1(
        "SELECT id FROM meeting_workspaces WHERE student_contact_id = ? ORDER BY id DESC LIMIT 1",
        [data.studentContactId]
      );
      if (latest && latest[0]?.id) {
        createdId = Number(latest[0].id);
      }
    } catch (e) {}
  }

  // Shadow write to local SQLite
  try {
    const local = getLocalDbClient();
    await ensureTable();
    const localRes = await local.execute({ sql, args: values });
    if (!createdId && localRes.lastInsertRowid) {
      createdId = Number(localRes.lastInsertRowid);
    }
  } catch {}

  const result = createdId ? await getWorkspaceById(createdId) : null;
  if (result) {
    inMemoryWorkspaces.set(result.studentContactId, result);
    return result;
  }

  const fallback: MeetingWorkspace = {
    id: Date.now(),
    studentContactId: data.studentContactId,
    appointmentId: data.appointmentId ?? null,
    title: data.title ?? "IEP Meeting Workspace",
    meetingDate: data.meetingDate ?? null,
    meetingType: data.meetingType ?? "Annual IEP Meeting",
    status: (data.status ?? "PREPARING") as MeetingWorkspace["status"],
    activeTab: (data.activeTab ?? "PREP") as MeetingWorkspace["activeTab"],
    prepStep: (data.prepStep ?? "iep_intel") as MeetingWorkspace["prepStep"],
    detectedIepOrder: data.detectedIepOrder ?? null,
    iepIntelFindings: data.iepIntelFindings ?? null,
    parentIntelConcerns: data.parentIntelConcerns ?? null,
    parentConcernStatement: data.parentConcernStatement ?? null,
    pcsApproved: Boolean(data.pcsApproved),
    pcsLastApprovedAt: data.pcsLastApprovedAt ? new Date(data.pcsLastApprovedAt) : null,
    meetingTargets: data.meetingTargets ?? null,
    parkingLot: data.parkingLot ?? null,
    additionalItems: data.additionalItems ?? null,
    closeoutChecks: data.closeoutChecks ?? null,
    completedAt: data.completedAt ? new Date(data.completedAt) : null,
    completedSummary: data.completedSummary ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  inMemoryWorkspaces.set(fallback.studentContactId, fallback);
  return fallback;
}

/**
 * Update an existing meeting workspace session.
 * Permanently updates Cloudflare D1, shadow-updates local SQLite, and syncs memory.
 */
export async function updateWorkspace(
  id: number,
  data: Partial<InsertMeetingWorkspace>
): Promise<MeetingWorkspace | null> {
  const fieldsMap: Record<string, string> = {
    studentContactId: "student_contact_id",
    appointmentId: "appointment_id",
    title: "title",
    meetingDate: "meeting_date",
    meetingType: "meeting_type",
    status: "status",
    activeTab: "active_tab",
    prepStep: "prep_step",
    detectedIepOrder: "detected_iep_order",
    iepIntelFindings: "iep_intel_findings",
    parentIntelConcerns: "parent_intel_concerns",
    parentConcernStatement: "parent_concern_statement",
    pcsApproved: "pcs_approved",
    pcsLastApprovedAt: "pcs_last_approved_at",
    meetingTargets: "meeting_targets",
    parkingLot: "parking_lot",
    additionalItems: "additional_items",
    closeoutChecks: "closeout_checks",
    completedAt: "completed_at",
    completedSummary: "completed_summary",
  };

  const setClauses: string[] = [];
  const setValues: any[] = [];

  for (const [key, val] of Object.entries(data)) {
    const col = fieldsMap[key] || key;
    if (col && val !== undefined) {
      setClauses.push(`${col} = ?`);
      if (typeof val === "boolean") {
        setValues.push(val ? 1 : 0);
      } else if (val instanceof Date) {
        setValues.push(val.toISOString());
      } else {
        setValues.push(val);
      }
    }
  }

  setClauses.push("updated_at = CURRENT_TIMESTAMP");

  if (setClauses.length > 1) {
    const sql = `UPDATE meeting_workspaces SET ${setClauses.join(", ")} WHERE id = ?`;
    const params = [...setValues, id];

    // 1. Cloudflare D1 Native Worker
    const cfDb = (globalThis as any).__CF_ENV_DB__;
    if (cfDb) {
      try {
        await cfDb.prepare(sql).bind(...params).run();
      } catch (e) {
        console.warn("[updateWorkspace] CF D1 native update error:", e);
      }
    }

    // 2. Cloudflare D1 HTTP API (Node dev server)
    try {
      await queryCloudflareD1(sql, params);
    } catch (e) {}

    // 3. Shadow write to local SQLite
    try {
      const local = getLocalDbClient();
      await ensureTable();
      await local.execute({ sql, args: params });
    } catch (e) {}
  }

  // Refresh and update memory store
  const updated = await getWorkspaceById(id);
  if (updated) {
    inMemoryWorkspaces.set(updated.studentContactId, updated);
    return updated;
  }

  // Fallback memory merge
  for (const [sId, ws] of Array.from(inMemoryWorkspaces.entries())) {
    if (ws.id === id) {
      const merged = { ...ws, ...data, updatedAt: new Date() } as MeetingWorkspace;
      inMemoryWorkspaces.set(sId, merged);
      return merged;
    }
  }

  return null;
}

/**
 * Verifies that a vault file record belongs to the requested student (directly, via parentContactId,
 * or via an established iepDocuments fileKey link for that student).
 */
export async function isFileLinkedToStudent(
  fileRecord: {
    id?: number;
    clientId?: number | null;
    studentContactId?: number | null;
    fileKey?: string | null;
  },
  studentContactId: number
): Promise<boolean> {
  if (!fileRecord || !studentContactId) return false;
  if (
    Number(fileRecord.studentContactId) === Number(studentContactId) ||
    Number(fileRecord.clientId) === Number(studentContactId)
  ) {
    return true;
  }

  try {
    const contactRows = await queryCloudflareD1(
      "SELECT id, parentContactId FROM contacts WHERE id = ? LIMIT 1",
      [studentContactId]
    );
    const studentRow = contactRows?.[0] as Record<string, any> | undefined;
    if (
      studentRow?.parentContactId &&
      Number(fileRecord.clientId) === Number(studentRow.parentContactId) &&
      (!fileRecord.studentContactId ||
        Number(fileRecord.studentContactId) === Number(studentContactId))
    ) {
      return true;
    }

    if (fileRecord.studentContactId) {
      const linkedRows = await queryCloudflareD1(
        `SELECT 1 FROM clientFiles cf2
         INNER JOIN iepDocuments iep ON (iep.currentFileKey = cf2.fileKey OR iep.previousFileKey = cf2.fileKey)
         WHERE iep.contactId = ? AND cf2.studentContactId = ?
         LIMIT 1`,
        [studentContactId, fileRecord.studentContactId]
      );
      if (linkedRows && linkedRows.length > 0) {
        return true;
      }
    }
  } catch {}

  return false;
}

/**
 * Resolves the binary PDF buffer for an authorized vault file from memory, local uploads/, or D1/SQLite file_blobs.
 * Never exposes public storage URLs or credentials.
 */
export async function resolveVaultFileBinary(fileRecord: {
  id: number;
  fileName?: string | null;
  fileKey?: string | null;
  fileUrl?: string | null;
  pdfBuffer?: Buffer | Uint8Array;
  base64Data?: string;
}): Promise<Buffer | null> {
  if (fileRecord.pdfBuffer) {
    return Buffer.from(fileRecord.pdfBuffer);
  }
  if (fileRecord.base64Data) {
    return Buffer.from(fileRecord.base64Data, "base64");
  }

  const candidateKeys = new Set<string>();
  if (fileRecord.fileKey && String(fileRecord.fileKey).trim()) {
    candidateKeys.add(String(fileRecord.fileKey).trim().replace(/^\/+/, ""));
  }
  if (fileRecord.fileUrl && String(fileRecord.fileUrl).trim()) {
    const urlStr = String(fileRecord.fileUrl).trim();
    if (urlStr.startsWith("/api/storage/")) {
      candidateKeys.add(
        decodeURIComponent(urlStr.replace(/^\/api\/storage\//, "")).replace(
          /^\/+/,
          ""
        )
      );
    } else if (urlStr.startsWith("/")) {
      candidateKeys.add(urlStr.replace(/^\/+/, ""));
    }
  }
  if (fileRecord.fileName && String(fileRecord.fileName).trim()) {
    const rawName = String(fileRecord.fileName).trim();
    const normalizedName = rawName.replace(/\s+/g, "_");
    candidateKeys.add(`iep-documents/${normalizedName}`);
    candidateKeys.add(`iep-documents/${rawName}`);
  }

  // 1. Check local uploads/ directory safely (preventing path traversal)
  try {
    const fs = await import("fs");
    const path = await import("path");
    const uploadsBase = path.resolve(process.cwd(), "uploads");
    for (const key of Array.from(candidateKeys)) {
      const safeRel = key.replace(/\.\./g, "");
      const candidatePath = path.resolve(uploadsBase, safeRel);
      if (
        candidatePath.startsWith(uploadsBase) &&
        fs.existsSync(candidatePath) &&
        fs.statSync(candidatePath).isFile()
      ) {
        return fs.readFileSync(candidatePath);
      }
    }
  } catch {}

  // 2. Check file_blobs table in D1 / local SQLite
  try {
    for (const key of Array.from(candidateKeys)) {
      const rows = await queryCloudflareD1(
        "SELECT * FROM file_blobs WHERE file_key = ? LIMIT 1",
        [key]
      );
      const row = rows?.[0] as Record<string, any> | undefined;
      const blobBase64 = row?.data || row?.base64_data || row?.blob_data;
      if (blobBase64) {
        return Buffer.from(String(blobBase64), "base64");
      }
    }
  } catch {}

  return null;
}

