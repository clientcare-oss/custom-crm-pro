import { queryCloudflareD1 } from '../server/_core/d1Client';

async function check() {
  const tables = await queryCloudflareD1("SELECT name, sql FROM sqlite_master WHERE type='table'");
  for (const t of tables || []) {
    const sql = (t.sql || '').toLowerCase();
    if (sql.includes('file') || sql.includes('doc') || sql.includes('pdf') || sql.includes('upload') || sql.includes('blob') || sql.includes('url')) {
      console.log(`Table: ${t.name}`);
      console.log(t.sql);
      console.log('---');
    }
  }
}

check().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
