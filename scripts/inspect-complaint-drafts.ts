import { queryCloudflareD1, getLocalDbClient } from "../server/_core/d1Client";

async function main() {
  console.log("=== CHECKING complaint_drafts IN D1 ===");
  try {
    const d1Rows = await queryCloudflareD1("SELECT id, student_id, title, updated_at FROM complaint_drafts");
    console.log(`D1 drafts count: ${d1Rows.length}`);
    for (const r of d1Rows) {
      console.log(JSON.stringify(r));
    }
  } catch (err: any) {
    console.error("D1 error:", err.message);
  }

  console.log("\n=== CHECKING complaint_drafts IN local.sqlite ===");
  try {
    const local = getLocalDbClient();
    const localRows = await local.execute("SELECT id, student_id, title, updated_at FROM complaint_drafts");
    console.log(`local.sqlite drafts count: ${localRows.rows.length}`);
    for (const r of localRows.rows) {
      console.log(JSON.stringify(r));
    }
  } catch (err: any) {
    console.error("local.sqlite error:", err.message);
  }
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
