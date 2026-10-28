import { queryCloudflareD1 } from '../server/_core/d1Client';

async function check() {
  const tables = await queryCloudflareD1("SELECT name, sql FROM sqlite_master WHERE type='table' ORDER BY name");
  console.log('Tables in D1:', tables?.map((t: any) => t.name));
}

check().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
