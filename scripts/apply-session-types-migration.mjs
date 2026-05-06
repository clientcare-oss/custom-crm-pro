import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const sql = `CREATE TABLE IF NOT EXISTS \`sessionTypes\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`ownerId\` int NOT NULL,
  \`name\` varchar(255) NOT NULL,
  \`description\` text,
  \`sessionFormat\` enum('phone','video') NOT NULL DEFAULT 'phone',
  \`videoType\` varchar(64),
  \`videoLink\` varchar(512),
  \`timezone\` varchar(64) NOT NULL DEFAULT 'America/New_York',
  \`duration\` int NOT NULL DEFAULT 60,
  \`durationUnit\` enum('minutes','hours') NOT NULL DEFAULT 'minutes',
  \`dateRange\` enum('rolling','indefinitely','fixed') NOT NULL DEFAULT 'indefinitely',
  \`dateRangeDays\` int,
  \`color\` varchar(32) NOT NULL DEFAULT '#e11d48',
  \`instructions\` text,
  \`confirmationMessage\` text,
  \`bufferBefore\` int NOT NULL DEFAULT 30,
  \`bufferBeforeUnit\` enum('minutes','hours') NOT NULL DEFAULT 'minutes',
  \`bufferAfter\` int NOT NULL DEFAULT 6,
  \`bufferAfterUnit\` enum('minutes','hours') NOT NULL DEFAULT 'hours',
  \`minNotice\` int NOT NULL DEFAULT 3,
  \`minNoticeUnit\` enum('minutes','hours','days') NOT NULL DEFAULT 'days',
  \`customIncrements\` int NOT NULL DEFAULT 15,
  \`teamMemberIds\` text,
  \`weeklyHours\` text,
  \`reminderSettings\` text,
  \`canReschedule\` boolean NOT NULL DEFAULT true,
  \`canCancel\` boolean NOT NULL DEFAULT false,
  \`sendConfirmationEmail\` boolean NOT NULL DEFAULT true,
  \`isActive\` boolean NOT NULL DEFAULT true,
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT \`sessionTypes_id\` PRIMARY KEY(\`id\`)
)`;

try {
  await connection.execute(sql);
  console.log("✅ sessionTypes table created successfully");
} catch (err) {
  if (err.code === "ER_TABLE_EXISTS_ERROR") {
    console.log("ℹ️  sessionTypes table already exists — skipping");
  } else {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
} finally {
  await connection.end();
}
