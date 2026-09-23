import { queryCloudflareD1 } from '../server/_core/d1Client';

async function check() {
  console.log('--- Querying Cloudflare D1 (custom-crm-pro-db) ---');
  
  const workspaces = await queryCloudflareD1(
    'SELECT id, student_contact_id, title, status, meeting_targets, updated_at FROM meeting_workspaces WHERE student_contact_id = ?',
    [120034]
  );
  
  console.log('Workspaces found in D1:', workspaces.length);
  for (const ws of workspaces) {
    const targets = JSON.parse(ws.meeting_targets || '[]');
    console.log(`- Workspace ID: ${ws.id}`);
    console.log(`- Student ID: ${ws.student_contact_id}`);
    console.log(`- Title: ${ws.title}`);
    console.log(`- Status: ${ws.status}`);
    console.log(`- Total Saved Targets: ${targets.length}`);
    console.log(`- First Target: ${targets[0]?.externalTargetId} - ${targets[0]?.targetName}`);
    console.log(`- Last Target: ${targets[targets.length - 1]?.externalTargetId} - ${targets[targets.length - 1]?.targetName}`);
    console.log(`- Updated At: ${ws.updated_at}`);
  }

  const contacts = await queryCloudflareD1(
    'SELECT id, firstName, lastName, caseId, schoolName, planType FROM contacts WHERE id = ?',
    [120034]
  );
  console.log('Contact found in D1:', contacts);
}

check().catch(console.error);
