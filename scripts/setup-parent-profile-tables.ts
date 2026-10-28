import { queryCloudflareD1, getLocalDbClient } from "../server/_core/d1Client";

async function main() {
  console.log("Setting up parent_profile_change_history, staff_notifications, and contacts columns...");

  const queries = [
    `CREATE TABLE IF NOT EXISTS parent_profile_change_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parentContactId INTEGER NOT NULL,
      fieldModified TEXT NOT NULL,
      previousValue TEXT,
      newValue TEXT,
      changedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      actorId TEXT,
      actorName TEXT NOT NULL,
      actorRole TEXT NOT NULL,
      source TEXT NOT NULL,
      verificationStatus TEXT DEFAULT 'verified' NOT NULL,
      approvalStatus TEXT DEFAULT 'auto_approved' NOT NULL,
      approvalNotes TEXT,
      ipAddress TEXT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS staff_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      parentContactId INTEGER,
      studentContactId INTEGER,
      severity TEXT DEFAULT 'info' NOT NULL,
      isRead INTEGER DEFAULT 0 NOT NULL,
      metadata TEXT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,
  ];

  const contactColumns = [
    "preferredName TEXT",
    "altPhone TEXT",
    "emergencyContactName TEXT",
    "emergencyContactRelationship TEXT",
    "emergencyContactPhone TEXT",
    "pendingEmail TEXT",
    "emailVerificationToken TEXT",
    "emailVerificationExpiresAt TIMESTAMP",
    "pendingPhone TEXT",
    "phoneVerificationCode TEXT",
    "phoneVerificationExpiresAt TIMESTAMP",
    "contactConcernStatus TEXT DEFAULT 'none'",
    "contactConcernReason TEXT",
    "contactConcernNotes TEXT",
    "contactConcernFollowUpDate TEXT",
    "contactConcernAssignedTo TEXT",
    "contactConcernReportedBy TEXT",
    "contactConcernReportedAt TIMESTAMP",
    "contactConcernResolvedAt TIMESTAMP",
    "contactConcernResolvedBy TEXT",
  ];

  // 1. Apply to local SQLite
  const localDb = getLocalDbClient();
  for (const q of queries) {
    try {
      await localDb.execute(q);
      console.log("Local SQLite table created / verified.");
    } catch (e: any) {
      console.warn("Local SQLite table query warning:", e.message);
    }
  }

  for (const col of contactColumns) {
    try {
      await localDb.execute(`ALTER TABLE contacts ADD COLUMN ${col};`);
      console.log(`Local SQLite contacts column added: ${col.split(" ")[0]}`);
    } catch (e: any) {
      // Column may already exist
      if (!e.message?.includes("duplicate column name")) {
        console.warn(`Local SQLite add column ${col.split(" ")[0]}:`, e.message);
      }
    }
  }

  // 2. Apply to Cloudflare D1
  for (const q of queries) {
    try {
      await queryCloudflareD1(q);
      console.log("Cloudflare D1 table created / verified.");
    } catch (e: any) {
      console.warn("Cloudflare D1 table query warning:", e.message);
    }
  }

  for (const col of contactColumns) {
    try {
      await queryCloudflareD1(`ALTER TABLE contacts ADD COLUMN ${col};`);
      console.log(`Cloudflare D1 contacts column added: ${col.split(" ")[0]}`);
    } catch (e: any) {
      // Column may already exist
      if (!e.message?.includes("duplicate column name")) {
        console.warn(`Cloudflare D1 add column ${col.split(" ")[0]}:`, e.message);
      }
    }
  }

  console.log("Parent profile database setup complete!");
}

main().catch(console.error);
