import { queryCloudflareD1 } from '../server/_core/d1Client';

async function main() {
  console.log("Applying Legal Involvement & AI Lawyer Prep DDL to Cloudflare D1...");

  const columnsToAdd = [
    { col: "lawyerInvolved", type: "INTEGER DEFAULT 0" },
    { col: "attorneyRepresents", type: "TEXT DEFAULT 'Parent/Student'" },
    { col: "attorneyInvolvementDate", type: "TEXT" },
    { col: "legalNotes", type: "TEXT" },
    { col: "attorneyDocuments", type: "TEXT" },
    { col: "legalStatusUpdatedAt", type: "TIMESTAMP" },
    { col: "legalStatusUpdatedBy", type: "TEXT" },
  ];

  for (const item of columnsToAdd) {
    try {
      await queryCloudflareD1(`ALTER TABLE contacts ADD COLUMN ${item.col} ${item.type};`);
      console.log(`Added column ${item.col} to contacts table.`);
    } catch (e: any) {
      console.log(`Column ${item.col} note:`, e.message);
    }
  }

  // Create ai_lawyer_preps table
  try {
    await queryCloudflareD1(`
      CREATE TABLE IF NOT EXISTS ai_lawyer_preps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_contact_id INTEGER NOT NULL,
        version INTEGER DEFAULT 1 NOT NULL,
        title TEXT NOT NULL,
        attorney_name TEXT,
        attorney_firm TEXT,
        attorney_represents TEXT,
        snapshot_data TEXT NOT NULL,
        advocate_notes TEXT,
        missing_info_checklist TEXT,
        selected_packet_sections TEXT,
        generated_by TEXT,
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
    console.log("ai_lawyer_preps table created/verified.");
  } catch (e: any) {
    console.error("ai_lawyer_preps creation error:", e.message);
  }

  try {
    await queryCloudflareD1(`CREATE INDEX IF NOT EXISTS ai_lawyer_preps_student_idx ON ai_lawyer_preps (student_contact_id);`);
    console.log("Created index ai_lawyer_preps_student_idx.");
  } catch (e: any) {
    console.log("Index note:", e.message);
  }

  console.log("Migration complete!");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
