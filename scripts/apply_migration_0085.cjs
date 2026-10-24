const { createClient } = require("@libsql/client");
const path = require("path");
const fs = require("fs");

const dbPath = path.resolve(__dirname, "../local.sqlite");
const client = createClient({ url: `file:${dbPath}` });

async function run() {
  console.log("Applying Migration 0085 to", dbPath);
  const sql = fs.readFileSync(path.resolve(__dirname, "../drizzle/0085_family_offer_revisions_and_delivery.sql"), "utf-8");
  const statements = sql
    .split(";")
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const stmt of statements) {
    try {
      await client.execute(stmt);
      console.log("Executed:", stmt.substring(0, 60));
    } catch (err) {
      if (err.message && err.message.includes("duplicate column")) {
        console.log("Column already exists, skipping:", stmt.substring(0, 60));
      } else {
        console.error("Error executing statement:", stmt, err);
        process.exit(1);
      }
    }
  }

  const tableInfo = await client.execute("PRAGMA table_info(family_enrollment_offers)");
  console.log("Migration 0085 applied successfully. Columns count:", tableInfo.rows.length);
  client.close();
}

run().catch(console.error);
