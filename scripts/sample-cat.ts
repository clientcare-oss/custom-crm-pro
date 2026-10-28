import { queryCloudflareD1 } from '../server/_core/d1Client';

async function check() {
  const cat = await queryCloudflareD1('SELECT * FROM case_activity_timeline ORDER BY id DESC LIMIT 10');
  console.log('Sample rows:', cat?.length);
  cat?.forEach((r: any) => console.log(JSON.stringify(r)));
}

check().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
