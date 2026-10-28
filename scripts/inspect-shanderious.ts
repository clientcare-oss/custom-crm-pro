import { queryCloudflareD1, getLocalDbClient } from '../server/_core/d1Client';

async function main() {
  console.log('=== Cloudflare D1 ===');
  const d1Contacts = await queryCloudflareD1("SELECT id, firstName, lastName, jobTitle, parentContactId FROM contacts WHERE firstName LIKE '%Shanderious%' OR lastName LIKE '%Test%'");
  console.log('D1 Contacts:', JSON.stringify(d1Contacts, null, 2));

  const d1Mw = await queryCloudflareD1("SELECT id, student_contact_id, title FROM meeting_workspaces");
  console.log('D1 Meeting Workspaces:', JSON.stringify(d1Mw, null, 2));

  console.log('=== Local SQLite ===');
  const local = getLocalDbClient();
  const localContacts = await local.execute("SELECT id, firstName, lastName, jobTitle, parentContactId FROM contacts WHERE firstName LIKE '%Shanderious%' OR lastName LIKE '%Test%'");
  console.log('Local Contacts:', JSON.stringify(localContacts.rows, null, 2));

  const localMw = await local.execute("SELECT id, student_contact_id, title FROM meeting_workspaces");
  console.log('Local Meeting Workspaces:', JSON.stringify(localMw.rows, null, 2));
}

main().catch(console.error);
