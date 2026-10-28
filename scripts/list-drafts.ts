import { queryCloudflareD1, getLocalDbClient } from '../server/_core/d1Client';

async function main() {
  const drafts = await queryCloudflareD1('SELECT id, student_id, title, started_at, updated_at, length(draft_json) as len FROM complaint_drafts ORDER BY updated_at DESC');
  console.log(`D1 drafts (${drafts?.length || 0}):`, JSON.stringify(drafts, null, 2));

  const local = getLocalDbClient();
  const localDrafts = await local.execute('SELECT id, student_id, title, started_at, updated_at, length(draft_json) as len FROM complaint_drafts ORDER BY updated_at DESC');
  console.log(`Local drafts (${localDrafts.rows?.length || 0}):`, JSON.stringify(localDrafts.rows, null, 2));
}

main().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
