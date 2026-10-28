import fs from "fs";
import path from "path";
import { queryCloudflareD1, getLocalDbClient } from "../server/_core/d1Client";

async function main() {
  console.log("=== RESTORING AUTHENTIC BROOKLYN SMITH EVIDENCE ===");

  const basePath = "C:/Users/conta/OneDrive/01-Waypoint/CLIENTS/brooklyn smith";
  const stateComplaintFolder = path.join(basePath, "state complaint 10.20.2026");
  const communicationsFolder = path.join(stateComplaintFolder, "communications");
  const reevalFolder = path.join(basePath, "9.1.2026");

  const authenticFiles = [
    {
      source: path.join(stateComplaintFolder, "current IEP.pdf"),
      targets: [
        "uploads/iep-documents/1792527991296_4823fd75_current_IEP_ac7e4441.pdf",
        "uploads/iep-documents/current_IEP.pdf",
      ],
      mimeType: "application/pdf",
      name: "current IEP.pdf",
    },
    {
      source: path.join(stateComplaintFolder, "Previous IEP.pdf"),
      targets: [
        "uploads/iep-documents/Previous_IEP.pdf",
      ],
      mimeType: "application/pdf",
      name: "Previous IEP.pdf",
    },
    {
      source: path.join(stateComplaintFolder, "Brooklyn Smith State Complaint 10.21.2026.pdf"),
      targets: [
        "uploads/complaints/Brooklyn_Smith_State_Complaint_10.21.2026.pdf",
        "uploads/client-files/120042/Brooklyn_Smith_State_Complaint_10.21.2026.pdf",
      ],
      mimeType: "application/pdf",
      name: "Brooklyn Smith State Complaint 10.21.2026.pdf",
    },
    {
      source: path.join(communicationsFolder, "brooklyns statement.png"),
      targets: [
        "uploads/iep-documents/1792535426508_2a033bbf_brooklyns_statement_ef0bd98a.png",
      ],
      mimeType: "image/png",
      name: "brooklyns statement.png",
    },
    {
      source: path.join(communicationsFolder, "communications.pdf"),
      targets: [
        "uploads/iep-documents/1792532758503_c09eecef_communications_00824121.pdf",
      ],
      mimeType: "application/pdf",
      name: "communications.pdf",
    },
    {
      source: path.join(reevalFolder, "B.Smith.1Sept2026.IEP.ReevaluationResults.pdf"),
      targets: [
        "uploads/iep-documents/1792169607590_53e52faa_B.Smith.1Sept2026.IEP.ReevaluationResults_1fef5379.pdf",
      ],
      mimeType: "application/pdf",
      name: "B.Smith.1Sept2026.IEP.ReevaluationResults.pdf",
    },
  ];

  // 1. Copy files to local uploads directory
  for (const item of authenticFiles) {
    if (!fs.existsSync(item.source)) {
      console.warn(`Source not found: ${item.source}`);
      continue;
    }
    const buf = fs.readFileSync(item.source);
    console.log(`Authentic file found: ${item.name} (${buf.length} bytes)`);

    for (const targetRel of item.targets) {
      const targetAbs = path.resolve(process.cwd(), targetRel);
      fs.mkdirSync(path.dirname(targetAbs), { recursive: true });
      fs.writeFileSync(targetAbs, buf);
      console.log(`  -> Copied to: ${targetRel}`);
    }
  }

  // 2. Ensure file_blobs table exists in local.sqlite
  const local = getLocalDbClient();
  await local.execute(`
    CREATE TABLE IF NOT EXISTS file_blobs (
      key TEXT PRIMARY KEY,
      mime_type TEXT,
      base64_data TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert blobs under 3MB into local.sqlite file_blobs as well
  for (const item of authenticFiles) {
    if (!fs.existsSync(item.source)) continue;
    const buf = fs.readFileSync(item.source);
    if (buf.length <= 4000000) { // under 4MB
      const base64 = buf.toString("base64");
      for (const targetRel of item.targets) {
        const key = targetRel.replace(/^uploads\//, "");
        await local.execute({
          sql: "INSERT INTO file_blobs (key, mime_type, base64_data) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET base64_data = excluded.base64_data, mime_type = excluded.mime_type",
          args: [key, item.mimeType, base64],
        });
      }
    }
  }

  // Also update D1 file_blobs for key iep-documents/1792527991296_4823fd75_current_IEP_ac7e4441.pdf with authentic 1.8MB data
  try {
    const currentIepBuf = fs.readFileSync(path.join(stateComplaintFolder, "current IEP.pdf"));
    const currentIepBase64 = currentIepBuf.toString("base64");
    console.log(`Updating D1 file_blobs with authentic 24-page current IEP (${currentIepBuf.length} bytes)...`);
    await queryCloudflareD1(
      "INSERT INTO file_blobs (key, mime_type, base64_data) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET base64_data = excluded.base64_data, mime_type = excluded.mime_type",
      ["iep-documents/1792527991296_4823fd75_current_IEP_ac7e4441.pdf", "application/pdf", currentIepBase64]
    );
    console.log("  -> D1 file_blobs updated successfully.");
  } catch (err: any) {
    console.warn("  -> D1 file_blobs direct insert notice:", err.message);
  }

  // 3. Update iepDocuments table in both D1 and local.sqlite for Brooklyn Smith (120042)
  console.log("Updating iepDocuments record for Brooklyn Smith (120042)...");
  const iepDocUpdateSql = `
    UPDATE iepDocuments
    SET
      currentFileName = 'current IEP.pdf',
      currentFileKey = 'iep-documents/1792527991296_4823fd75_current_IEP_ac7e4441.pdf',
      currentFileUrl = '/storage/iep-documents/1792527991296_4823fd75_current_IEP_ac7e4441.pdf',
      currentUploadedAt = '2026-10-16 11:06:15',
      previousFileName = 'Previous IEP.pdf',
      previousFileKey = 'iep-documents/Previous_IEP.pdf',
      previousFileUrl = '/storage/iep-documents/Previous_IEP.pdf',
      previousUploadedAt = '2026-10-10 12:36:38',
      updatedAt = '2026-10-21 17:56:07'
    WHERE contactId = 120042
  `;

  await local.execute({ sql: iepDocUpdateSql, args: [] });
  try {
    await queryCloudflareD1(iepDocUpdateSql);
  } catch (e: any) {
    console.warn("D1 iepDocuments update notice:", e.message);
  }

  // 4. Update clientFiles for Brooklyn Smith (120042) & Chris Smith (120041)
  console.log("Updating clientFiles in local.sqlite and D1...");
  const filesToInsert = [
    {
      fileName: "Brooklyn Smith State Complaint 10.21.2026.pdf",
      fileUrl: "/storage/complaints/Brooklyn_Smith_State_Complaint_10.21.2026.pdf",
      fileKey: "complaints/Brooklyn_Smith_State_Complaint_10.21.2026.pdf",
      fileSize: 16732148,
      mimeType: "application/pdf",
      category: "legal-complaints",
      documentType: "State Complaint (40 Pgs)",
      documentDate: "2026-10-21",
      uploadedAt: "2026-10-21 13:56:07",
      isCurrentPlan: 0,
      summary: "Paulding County School District · Formal 40-Page State Complaint filing on record (October 21, 2026).",
    },
    {
      fileName: "current IEP.pdf",
      fileUrl: "/storage/iep-documents/1792527991296_4823fd75_current_IEP_ac7e4441.pdf",
      fileKey: "iep-documents/1792527991296_4823fd75_current_IEP_ac7e4441.pdf",
      fileSize: 1798086,
      mimeType: "application/pdf",
      category: "ieps-504s",
      documentType: "Current IEP",
      documentDate: "2026-10-16",
      uploadedAt: "2026-10-16 11:06:15",
      isCurrentPlan: 1,
      summary: "Paulding County School District · Operative 24-Page Individualized Education Program.",
    },
    {
      fileName: "Previous IEP.pdf",
      fileUrl: "/storage/iep-documents/Previous_IEP.pdf",
      fileKey: "iep-documents/Previous_IEP.pdf",
      fileSize: 1786876,
      mimeType: "application/pdf",
      category: "ieps-504s",
      documentType: "Previous IEP",
      documentDate: "2026-10-10",
      uploadedAt: "2026-10-10 12:36:38",
      isCurrentPlan: 0,
      summary: "Paulding County School District · Prior 22-Page IEP Record.",
    },
    {
      fileName: "B.Smith.1Sept2026.IEP.ReevaluationResults.pdf",
      fileUrl: "/storage/iep-documents/1792169607590_53e52faa_B.Smith.1Sept2026.IEP.ReevaluationResults_1fef5379.pdf",
      fileKey: "iep-documents/1792169607590_53e52faa_B.Smith.1Sept2026.IEP.ReevaluationResults_1fef5379.pdf",
      fileSize: 1100000,
      mimeType: "application/pdf",
      category: "evaluations",
      documentType: "Evaluation Report",
      documentDate: "2026-09-01",
      uploadedAt: "2026-10-16 16:53:28",
      isCurrentPlan: 0,
      summary: "Multidisciplinary Reevaluation Results & Educational Assessment Report.",
    },
    {
      fileName: "brooklyns statement.png",
      fileUrl: "/storage/iep-documents/1792535426508_2a033bbf_brooklyns_statement_ef0bd98a.png",
      fileKey: "iep-documents/1792535426508_2a033bbf_brooklyns_statement_ef0bd98a.png",
      fileSize: 1751916,
      mimeType: "image/png",
      category: "communications",
      documentType: "Student Statement",
      documentDate: "2026-10-20",
      uploadedAt: "2026-10-20 22:30:26",
      isCurrentPlan: 0,
      summary: "Handwritten Student Impact Statement.",
    },
    {
      fileName: "communications.pdf",
      fileUrl: "/storage/iep-documents/1792532758503_c09eecef_communications_00824121.pdf",
      fileKey: "iep-documents/1792532758503_c09eecef_communications_00824121.pdf",
      fileSize: 110033,
      mimeType: "application/pdf",
      category: "communications",
      documentType: "Written Communications",
      documentDate: "2026-10-20",
      uploadedAt: "2026-10-20 21:45:58",
      isCurrentPlan: 0,
      summary: "Written Correspondence and Service Notification Records.",
    },
  ];

  for (const f of filesToInsert) {
    // Check if already in local.sqlite
    const existing = await local.execute({
      sql: "SELECT id FROM clientFiles WHERE studentContactId = 120042 AND fileName = ?",
      args: [f.fileName],
    });

    if (existing.rows.length === 0) {
      await local.execute({
        sql: `INSERT INTO clientFiles (clientId, studentContactId, fileName, fileUrl, fileKey, fileSize, mimeType, category, documentType, documentDate, uploadedAt, isCurrentPlan, summary, uploadOrigin, isReviewed)
              VALUES (120041, 120042, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Advocate', 1)`,
        args: [f.fileName, f.fileUrl, f.fileKey, f.fileSize, f.mimeType, f.category, f.documentType, f.documentDate, f.uploadedAt, f.isCurrentPlan, f.summary],
      });
      console.log(`  -> Inserted into clientFiles: ${f.fileName}`);
    } else {
      await local.execute({
        sql: `UPDATE clientFiles SET fileUrl = ?, fileKey = ?, fileSize = ?, category = ?, documentType = ?, isCurrentPlan = ?, summary = ? WHERE id = ?`,
        args: [f.fileUrl, f.fileKey, f.fileSize, f.category, f.documentType, f.isCurrentPlan, f.summary, existing.rows[0].id],
      });
      console.log(`  -> Updated clientFiles: ${f.fileName}`);
    }

    try {
      const d1Existing = await queryCloudflareD1("SELECT id FROM clientFiles WHERE studentContactId = 120042 AND fileName = ?", [f.fileName]);
      if (d1Existing.length === 0) {
        await queryCloudflareD1(
          `INSERT INTO clientFiles (clientId, studentContactId, fileName, fileUrl, fileKey, fileSize, mimeType, category, documentType, documentDate, uploadedAt, isCurrentPlan, summary, uploadOrigin, isReviewed)
           VALUES (120041, 120042, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Advocate', 1)`,
          [f.fileName, f.fileUrl, f.fileKey, f.fileSize, f.mimeType, f.category, f.documentType, f.documentDate, f.uploadedAt, f.isCurrentPlan, f.summary]
        );
      } else {
        await queryCloudflareD1(
          `UPDATE clientFiles SET fileUrl = ?, fileKey = ?, fileSize = ?, category = ?, documentType = ?, isCurrentPlan = ?, summary = ? WHERE id = ?`,
          [f.fileUrl, f.fileKey, f.fileSize, f.category, f.documentType, f.isCurrentPlan, f.summary, d1Existing[0].id]
        );
      }
    } catch (e: any) {
      console.warn(`  D1 insert notice for ${f.fileName}:`, e.message);
    }
  }

  // 5. Update complaint_drafts for Brooklyn Smith
  console.log("Updating complaint_drafts draft_student_120042 with authentic exhibits...");
  const draftRow = await local.execute({
    sql: "SELECT draft_json FROM complaint_drafts WHERE id = 'draft_student_120042'",
    args: [],
  });

  if (draftRow.rows.length > 0 && draftRow.rows[0].draft_json) {
    const draftData = JSON.parse(draftRow.rows[0].draft_json as string);

    draftData.title = "State Complaint – Brooklyn Smith";
    draftData.studentName = "Brooklyn Smith";
    draftData.pageCount = 40;
    draftData.startedAt = "2026-10-20T17:28:39.489Z";
    draftData.updatedAt = "2026-10-21T17:56:07.000Z";

    // Set Exhibit A to authentic 24-page current IEP
    if (draftData.pages && Array.isArray(draftData.pages)) {
      draftData.pages = draftData.pages.map((p: any) => {
        if (p.title?.includes("Exhibit A") || p.exhibitTag === "Exhibit A") {
          return {
            ...p,
            title: "Exhibit A (Student's IEP)",
            fileName: "current IEP.pdf",
            fileUrl: "/storage/iep-documents/1792527991296_4823fd75_current_IEP_ac7e4441.pdf",
            fileKey: "iep-documents/1792527991296_4823fd75_current_IEP_ac7e4441.pdf",
            fileSize: 1798086,
            pageCount: 24,
            renderedPages: undefined, // Let client render crisp authentic pages
          };
        }
        if (p.title?.includes("Exhibit C") || p.exhibitTag === "Exhibit C") {
          return {
            ...p,
            title: "Exhibit C (Communications)",
            fileName: "communications.pdf",
            fileUrl: "/storage/iep-documents/1792532758503_c09eecef_communications_00824121.pdf",
            fileKey: "iep-documents/1792532758503_c09eecef_communications_00824121.pdf",
            fileSize: 110033,
            renderedPages: undefined,
          };
        }
        return p;
      });
    }

    const updatedDraftJson = JSON.stringify(draftData);
    await local.execute({
      sql: "UPDATE complaint_drafts SET draft_json = ?, title = ?, updated_at = '2026-10-21 17:56:07' WHERE id = 'draft_student_120042'",
      args: [updatedDraftJson, "State Complaint – Brooklyn Smith"],
    });

    try {
      await queryCloudflareD1(
        "UPDATE complaint_drafts SET draft_json = ?, title = ?, updated_at = '2026-10-21 17:56:07' WHERE id = 'draft_student_120042'",
        [updatedDraftJson, "State Complaint – Brooklyn Smith"]
      );
    } catch (e: any) {
      console.warn("D1 complaint_drafts update notice:", e.message);
    }
    console.log("  -> Updated draft_student_120042 with 40 pages and authentic exhibits.");
  }

  console.log("=== COMPLETED AUTHENTIC EVIDENCE RESTORATION ===");
}

main().then(() => process.exit(0)).catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
