import { queryCloudflareD1, getLocalDbClient } from "../server/_core/d1Client";

async function main() {
  const sql = `
    CREATE TABLE IF NOT EXISTS taskDeletionRequests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      taskType TEXT NOT NULL,
      taskId INTEGER NOT NULL,
      taskTitle TEXT NOT NULL,
      taskDescription TEXT,
      taskDetails TEXT,
      requestedByUserId INTEGER NOT NULL,
      requestedByUserName TEXT NOT NULL,
      reason TEXT,
      status TEXT DEFAULT 'pending' NOT NULL,
      reviewedByUserId INTEGER,
      reviewedAt TIMESTAMP,
      declineReason TEXT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `;

  console.log("Creating table taskDeletionRequests in D1 and local SQLite...");
  try {
    const d1Result = await queryCloudflareD1(sql);
    console.log("D1 result:", d1Result);
  } catch (e: any) {
    console.warn("D1 create warning:", e.message);
  }

  try {
    await getLocalDbClient().execute({ sql, args: [] });
    console.log("Local SQLite created table successfully.");
  } catch (e: any) {
    console.warn("Local SQLite warning:", e.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration error:", err);
    process.exit(1);
  });
