import { queryCloudflareD1 } from '../server/_core/d1Client';

async function check() {
  console.log('=== case_activity_timeline for 120042 ===');
  const cat = await queryCloudflareD1('SELECT * FROM case_activity_timeline WHERE student_contact_id = 120042 OR description LIKE "%upload%" OR description LIKE "%iep%" OR title LIKE "%upload%" OR title LIKE "%iep%" ORDER BY id DESC');
  cat?.forEach((r: any) => console.log(JSON.stringify(r)));
}

check().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
