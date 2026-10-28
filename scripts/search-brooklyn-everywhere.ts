import { queryCloudflareD1, getLocalDbClient } from '../server/_core/d1Client';

async function main() {
  console.log('=== SEARCHING ALL D1 TABLES FOR BROOKLYN / PAULDING / SMITH / 14 / COMPLAINT ===\n');

  const tables = await queryCloudflareD1("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'sqlite_%'");

  for (const t of tables) {
    try {
      const cols = await queryCloudflareD1(`PRAGMA table_info(${t.name})`);
      const textCols = cols.filter((c: any) => c.type === 'TEXT' || (c.type && c.type.includes('CHAR')));
      if (textCols.length === 0) continue;

      const whereClause = textCols.map((c: any) => `${c.name} LIKE '%Brooklyn%' OR ${c.name} LIKE '%Paulding%'`).join(' OR ');
      const rows = await queryCloudflareD1(`SELECT * FROM ${t.name} WHERE ${whereClause} LIMIT 10`);

      if (rows && rows.length > 0) {
        console.log(`\n>>> Match in table "${t.name}" (${rows.length} rows):`);
        for (const r of rows) {
          const summary: any = {};
          for (const k of Object.keys(r)) {
            const val = String(r[k] || '');
            if (val.toLowerCase().includes('brooklyn') || val.toLowerCase().includes('paulding') || k.toLowerCase().includes('page') || k.toLowerCase().includes('title') || k === 'id') {
              summary[k] = val.length > 200 ? val.slice(0, 200) + '...' : val;
            }
          }
          console.log(JSON.stringify(summary, null, 2));
        }
      }
    } catch (e: any) {
      // ignore
    }
  }

  console.log('\n=== CHECKING clientFiles / iepDocuments FOR BROOKLYN SMITH (120042) ===');
  const files = await queryCloudflareD1('SELECT * FROM clientFiles WHERE clientId = 120042 OR fileName LIKE "%Brooklyn%" OR fileName LIKE "%Complaint%"');
  console.log('clientFiles matches:', files?.length, JSON.stringify(files, null, 2));

  const iepDocs = await queryCloudflareD1('SELECT * FROM iepDocuments WHERE contactId = 120042');
  console.log('iepDocuments matches:', iepDocs?.length, JSON.stringify(iepDocs, null, 2));

  const draftHistory = await queryCloudflareD1('SELECT * FROM draftIepHistory WHERE contactId = 120042');
  console.log('draftIepHistory matches:', draftHistory?.length, JSON.stringify(draftHistory, null, 2));
}

main().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
