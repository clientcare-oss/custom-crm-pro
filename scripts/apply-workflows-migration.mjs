import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

await conn.execute(`
CREATE TABLE IF NOT EXISTS \`workflowSteps\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`workflowId\` int NOT NULL,
  \`stepNumber\` int NOT NULL,
  \`title\` varchar(255) NOT NULL,
  \`description\` text,
  \`notes\` text,
  \`role\` varchar(128),
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT \`workflowSteps_id\` PRIMARY KEY(\`id\`)
)
`);
console.log("workflowSteps table created");

await conn.execute(`
CREATE TABLE IF NOT EXISTS \`workflows\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`title\` varchar(255) NOT NULL,
  \`description\` text,
  \`category\` varchar(128),
  \`color\` varchar(32) NOT NULL DEFAULT '#3b82f6',
  \`createdBy\` int NOT NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT \`workflows_id\` PRIMARY KEY(\`id\`)
)
`);
console.log("workflows table created");

await conn.end();
console.log("Migration complete");
