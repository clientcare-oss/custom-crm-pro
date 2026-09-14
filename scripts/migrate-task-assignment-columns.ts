import { queryCloudflareD1 } from "../server/_core/d1Client";

async function main() {
  console.log("Checking and migrating task assignment columns in Cloudflare D1...");

  // Check internalTasks
  const internalCols = await queryCloudflareD1<any>("PRAGMA table_info(internalTasks)");
  const internalColNames = new Set(internalCols.map((c: any) => c.name));

  if (!internalColNames.has("assignmentSource")) {
    console.log("Adding assignmentSource to internalTasks...");
    await queryCloudflareD1("ALTER TABLE internalTasks ADD COLUMN assignmentSource TEXT DEFAULT 'manager'");
  }
  if (!internalColNames.has("assignedByUserId")) {
    console.log("Adding assignedByUserId to internalTasks...");
    await queryCloudflareD1("ALTER TABLE internalTasks ADD COLUMN assignedByUserId INTEGER");
  }
  if (!internalColNames.has("assignedByName")) {
    console.log("Adding assignedByName to internalTasks...");
    await queryCloudflareD1("ALTER TABLE internalTasks ADD COLUMN assignedByName TEXT");
  }

  // Check projectTasks
  const projectCols = await queryCloudflareD1<any>("PRAGMA table_info(projectTasks)");
  const projectColNames = new Set(projectCols.map((c: any) => c.name));

  if (!projectColNames.has("assignmentSource")) {
    console.log("Adding assignmentSource to projectTasks...");
    await queryCloudflareD1("ALTER TABLE projectTasks ADD COLUMN assignmentSource TEXT DEFAULT 'manager'");
  }
  if (!projectColNames.has("assignedByUserId")) {
    console.log("Adding assignedByUserId to projectTasks...");
    await queryCloudflareD1("ALTER TABLE projectTasks ADD COLUMN assignedByUserId INTEGER");
  }
  if (!projectColNames.has("assignedByName")) {
    console.log("Adding assignedByName to projectTasks...");
    await queryCloudflareD1("ALTER TABLE projectTasks ADD COLUMN assignedByName TEXT");
  }

  console.log("Migration complete!");
}

main().catch(console.error);
