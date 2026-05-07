import { createConnection } from "mysql2/promise";
import { config } from "dotenv";
config();

const conn = await createConnection(process.env.DATABASE_URL);
try {
  await conn.execute("ALTER TABLE `workflows` ADD COLUMN IF NOT EXISTS `canvasData` text");
  console.log("Migration applied: canvasData column added to workflows");
} catch (e) {
  if (e.code === "ER_DUP_FIELDNAME") {
    console.log("Column canvasData already exists, skipping.");
  } else {
    throw e;
  }
} finally {
  await conn.end();
}
