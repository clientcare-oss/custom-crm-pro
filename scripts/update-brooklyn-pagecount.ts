import { queryCloudflareD1, getLocalDbClient } from '../server/_core/d1Client';

async function main() {
  console.log('Fetching draft_student_120042...');
  const rows = await queryCloudflareD1('SELECT draft_json FROM complaint_drafts WHERE id = "draft_student_120042"');
  if (rows && rows.length > 0) {
    const draft = JSON.parse(rows[0].draft_json);
    console.log('Current stored pageCount:', draft.pageCount);
    
    // Update to 14 pages (4 State Form pages + 5 Binders of 2 pages each)
    draft.pageCount = 14;
    draft.docketPageCount = 14;
    const updatedJson = JSON.stringify(draft);

    console.log('Updating Cloudflare D1...');
    await queryCloudflareD1(
      'UPDATE complaint_drafts SET draft_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = "draft_student_120042"',
      [updatedJson]
    );

    console.log('Updating local SQLite...');
    const local = getLocalDbClient();
    await local.execute({
      sql: "UPDATE complaint_drafts SET draft_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [updatedJson, "draft_student_120042"],
    });

    console.log('Successfully updated Brooklyn Smith state complaint pageCount to 14 in both D1 and local SQLite!');
  }
}

main().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
