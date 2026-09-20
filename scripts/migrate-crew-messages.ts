import "dotenv/config";
import { queryCloudflareD1 } from "../server/_core/d1Client";

async function runMigration() {
  console.log("=== Starting Crew Messages (PG-038) Schema Migration ===");

  // 1. Create tables
  console.log("Creating Crew Messages tables...");

  await queryCloudflareD1(`
    CREATE TABLE IF NOT EXISTS crew_conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT NOT NULL DEFAULT 'waypoint',
      type TEXT NOT NULL,
      name TEXT,
      description TEXT,
      linked_student_id INTEGER,
      created_by INTEGER NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      archived_at DATETIME
    );
  `);

  await queryCloudflareD1(`
    CREATE TABLE IF NOT EXISTS crew_conversation_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      tenant_id TEXT NOT NULL DEFAULT 'waypoint',
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_read_message_id INTEGER,
      last_read_at DATETIME,
      muted INTEGER NOT NULL DEFAULT 0,
      followed INTEGER NOT NULL DEFAULT 1
    );
  `);

  await queryCloudflareD1(`
    CREATE TABLE IF NOT EXISTS crew_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT NOT NULL DEFAULT 'waypoint',
      conversation_id INTEGER NOT NULL,
      sender_user_id INTEGER NOT NULL,
      message_type TEXT NOT NULL DEFAULT 'text',
      body TEXT NOT NULL,
      reply_to_message_id INTEGER,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      edited_at DATETIME,
      deleted_at DATETIME
    );
  `);

  await queryCloudflareD1(`
    CREATE TABLE IF NOT EXISTS crew_message_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT NOT NULL DEFAULT 'waypoint',
      message_id INTEGER NOT NULL,
      document_id INTEGER,
      r2_key TEXT,
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      uploaded_by INTEGER NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await queryCloudflareD1(`
    CREATE TABLE IF NOT EXISTS crew_message_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT NOT NULL DEFAULT 'waypoint',
      message_id INTEGER NOT NULL,
      record_type TEXT NOT NULL,
      record_id TEXT NOT NULL,
      metadata TEXT,
      created_by INTEGER NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await queryCloudflareD1(`
    CREATE TABLE IF NOT EXISTS crew_message_reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT NOT NULL DEFAULT 'waypoint',
      message_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      emoji TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await queryCloudflareD1(`
    CREATE TABLE IF NOT EXISTS crew_action_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT NOT NULL DEFAULT 'waypoint',
      conversation_id INTEGER NOT NULL,
      message_id INTEGER NOT NULL,
      request_type TEXT NOT NULL,
      title TEXT NOT NULL,
      explanation TEXT,
      requested_by INTEGER NOT NULL,
      assigned_approver_id INTEGER NOT NULL,
      related_record_type TEXT,
      related_record_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      due_at DATETIME,
      decided_by INTEGER,
      decided_at DATETIME,
      decision_note TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log("✓ Tables created or confirmed existing.");

  // 2. Create indexes
  console.log("Creating indexes...");
  await queryCloudflareD1(`CREATE INDEX IF NOT EXISTS idx_crew_conv_tenant ON crew_conversations(tenant_id);`);
  await queryCloudflareD1(`CREATE INDEX IF NOT EXISTS idx_crew_conv_type ON crew_conversations(type);`);
  await queryCloudflareD1(`CREATE INDEX IF NOT EXISTS idx_crew_conv_student ON crew_conversations(linked_student_id);`);
  await queryCloudflareD1(`CREATE INDEX IF NOT EXISTS idx_crew_conv_members ON crew_conversation_members(conversation_id, user_id);`);
  await queryCloudflareD1(`CREATE INDEX IF NOT EXISTS idx_crew_msg_conv ON crew_messages(conversation_id, created_at);`);
  await queryCloudflareD1(`CREATE INDEX IF NOT EXISTS idx_crew_ar_conv ON crew_action_requests(conversation_id);`);
  await queryCloudflareD1(`CREATE INDEX IF NOT EXISTS idx_crew_ar_approver ON crew_action_requests(assigned_approver_id, status);`);

  console.log("✓ Indexes ready.");

  // 3. Seed standard channels if they don't exist
  console.log("Checking standard channels...");
  const channels = [
    { name: "All Crew", description: "Company-wide employee announcements, updates, and open discussions." },
    { name: "Operations", description: "Schedules, internal logistics, paperwork, and office coordination." },
    { name: "Advocacy", description: "IEP strategy, state complaints, meeting preparation, and case collaboration." },
  ];

  for (const ch of channels) {
    const existing: any[] = await queryCloudflareD1(
      `SELECT id FROM crew_conversations WHERE tenant_id = 'waypoint' AND type = 'channel' AND name = ?;`,
      [ch.name]
    );
    if (existing.length === 0) {
      await queryCloudflareD1(
        `INSERT INTO crew_conversations (tenant_id, type, name, description, created_by)
         VALUES ('waypoint', 'channel', ?, ?, 1);`,
        [ch.name, ch.description]
      );
      console.log(`✓ Seeded default channel: #${ch.name}`);
    } else {
      console.log(`- Channel already exists: #${ch.name} (id: ${existing[0].id})`);
    }
  }

  console.log("\n=== Crew Messages Migration Completed Successfully ===");
}

runMigration().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
