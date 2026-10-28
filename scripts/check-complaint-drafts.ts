import { queryCloudflareD1, getLocalDbClient } from '../server/_core/d1Client';

async function main() {
  console.log('=== Checking complaint_drafts in Cloudflare D1 ===');
  try {
    const drafts = await queryCloudflareD1('SELECT id, student_id, title, started_at, updated_at, length(draft_json) as len FROM complaint_drafts ORDER BY updated_at DESC');
    console.log(`Found ${drafts?.length || 0} drafts in D1:`);
    for (const d of (drafts || [])) {
      console.log(`- ID: ${d.id}, StudentId: ${d.student_id}, Title: "${d.title}", Updated: ${d.updated_at}, Size: ${d.len} bytes`);
    }
  } catch (err: any) {
    console.error('Error querying D1 complaint_drafts:', err.message);
  }

  console.log('\n=== Checking complaint_drafts in Local SQLite ===');
  try {
    const local = getLocalDbClient();
    const localDrafts = await local.execute('SELECT id, student_id, title, started_at, updated_at, length(draft_json) as len FROM complaint_drafts ORDER BY updated_at DESC');
    console.log(`Found ${localDrafts.rows?.length || 0} drafts in local SQLite:`);
    for (const d of (localDrafts.rows || [])) {
      console.log(`- ID: ${d.id}, StudentId: ${d.student_id}, Title: "${d.title}", Updated: ${d.updated_at}, Size: ${d.len} bytes`);
    }
  } catch (err: any) {
    console.error('Error querying Local SQLite complaint_drafts:', err.message);
  }

  console.log('\n=== Checking Brooklyn Smith Contact ID ===');
  try {
    const brooklyn = await queryCloudflareD1('SELECT * FROM contacts WHERE firstName LIKE "%Brooklyn%" OR lastName LIKE "%Smith%"');
    console.log('Brooklyn Smith contacts:', JSON.stringify(brooklyn, null, 2));
  } catch (err: any) {
    console.error('Error querying contacts:', err.message);
  }
}

main().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
