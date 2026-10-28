import { queryCloudflareD1, getLocalDbClient } from "../server/_core/d1Client";

async function main() {
  console.log("Setting up client_review_trackers new columns for Review Opportunity Automation...");

  const newColumns = [
    "triggerMilestone TEXT",
    "milestoneEventId TEXT",
    "opportunityCreatedAt TIMESTAMP",
    "assignedEmployee TEXT",
    "reminderDate TIMESTAMP",
    "clientConfirmedAt TIMESTAMP",
    "clientConfirmedBy TEXT",
    "suppressionReason TEXT",
    "suppressionNotes TEXT",
    "suppressedAt TIMESTAMP",
    "suppressedBy TEXT",
  ];

  for (const col of newColumns) {
    const colName = col.split(" ")[0];
    const sql = `ALTER TABLE client_review_trackers ADD COLUMN ${col};`;

    // Try Cloudflare D1
    try {
      await queryCloudflareD1(sql);
      console.log(`[D1] Added column: ${colName}`);
    } catch (e: any) {
      if (e.message?.includes("duplicate column") || e.message?.includes("already exists")) {
        console.log(`[D1] Column ${colName} already exists.`);
      } else {
        console.warn(`[D1] Column ${colName} skip/warn:`, e.message);
      }
    }

    // Try Local SQLite
    try {
      await getLocalDbClient().execute(sql);
      console.log(`[Local SQLite] Added column: ${colName}`);
    } catch (e: any) {
      if (e.message?.includes("duplicate column") || e.message?.includes("already exists")) {
        console.log(`[Local SQLite] Column ${colName} already exists.`);
      } else {
        console.warn(`[Local SQLite] Column ${colName} skip/warn:`, e.message);
      }
    }
  }

  console.log("client_review_trackers columns successfully ensured.");
}

main().catch(console.error);
