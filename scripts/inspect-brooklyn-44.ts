import { queryCloudflareD1 } from '../server/_core/d1Client';

async function main() {
  const c44 = await queryCloudflareD1('SELECT * FROM contacts WHERE id = 120044');
  console.log('Contact 120044:', JSON.stringify(c44, null, 2));

  const c43 = await queryCloudflareD1('SELECT * FROM contacts WHERE id = 120043');
  console.log('Contact 120043:', JSON.stringify(c43, null, 2));

  const allBrooklyn = await queryCloudflareD1('SELECT id, firstName, lastName, caseId, parentContactId, notes, createdAt FROM contacts WHERE firstName LIKE "%Brooklyn%" OR lastName LIKE "%Smith%"');
  console.log('All Brooklyn / Smith contacts:', JSON.stringify(allBrooklyn, null, 2));

  const allDrafts = await queryCloudflareD1('SELECT id, student_id, title, started_at, updated_at, length(draft_json) as len FROM complaint_drafts');
  console.log('All complaint_drafts:', JSON.stringify(allDrafts, null, 2));

  // Check if there are any other drafts in any table or local sqlite
  const { getLocalDbClient } = await import('../server/_core/d1Client');
  const local = getLocalDbClient();
  const localDrafts = await local.execute('SELECT * FROM complaint_drafts');
  console.log('Local drafts count:', localDrafts.rows?.length);
}

main().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
