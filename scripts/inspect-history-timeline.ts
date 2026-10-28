import { queryCloudflareD1 } from '../server/_core/d1Client';

async function check() {
  console.log('=== case_activity_timeline ===');
  const cat = await queryCloudflareD1('SELECT * FROM case_activity_timeline ORDER BY id DESC LIMIT 30');
  cat?.forEach((r: any) => console.log(JSON.stringify(r)));

  console.log('\n=== crm_lifecycle_events ===');
  const cle = await queryCloudflareD1('SELECT * FROM crm_lifecycle_events ORDER BY id DESC LIMIT 30');
  cle?.forEach((r: any) => console.log(JSON.stringify(r)));

  console.log('\n=== meeting_workspaces ===');
  const mw = await queryCloudflareD1('SELECT id, studentId, meetingTitle, sessionDate, status, createdAt FROM meeting_workspaces ORDER BY id DESC');
  mw?.forEach((r: any) => console.log(JSON.stringify(r)));
}

check().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
