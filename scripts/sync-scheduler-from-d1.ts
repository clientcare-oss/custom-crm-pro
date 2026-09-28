import { execSync } from 'child_process';
import { getLocalDbClient } from '../server/_core/d1Client';

async function main() {
  console.log('🔄 Fetching scheduler data safely from live Cloudflare D1 (READ ONLY)...');

  // 1. Fetch remote sessionTypes
  const rawSessionTypes = execSync(
    'npx wrangler d1 execute custom-crm-pro-db --remote --json --command="SELECT * FROM sessionTypes ORDER BY id ASC;"',
    { encoding: 'utf8' }
  );
  const parsedSessionTypes = JSON.parse(rawSessionTypes)[0]?.results || [];
  console.log(`Found ${parsedSessionTypes.length} remote session types.`);

  // 2. Fetch remote ownerAvailability
  const rawAvailability = execSync(
    'npx wrangler d1 execute custom-crm-pro-db --remote --json --command="SELECT * FROM ownerAvailability ORDER BY id ASC;"',
    { encoding: 'utf8' }
  );
  const parsedAvailability = JSON.parse(rawAvailability)[0]?.results || [];
  console.log(`Found ${parsedAvailability.length} remote ownerAvailability records.`);

  // 3. Fetch remote leadForms
  const rawLeadForms = execSync(
    'npx wrangler d1 execute custom-crm-pro-db --remote --json --command="SELECT * FROM leadForms ORDER BY id ASC;"',
    { encoding: 'utf8' }
  );
  const parsedLeadForms = JSON.parse(rawLeadForms)[0]?.results || [];
  console.log(`Found ${parsedLeadForms.length} remote leadForms records.`);

  const localClient = getLocalDbClient();

  // Sync sessionTypes into local.sqlite
  for (const st of parsedSessionTypes) {
    const keys = Object.keys(st);
    const placeholders = keys.map(() => '?').join(', ');
    const values = keys.map((k) => st[k]);
    const updateClauses = keys
      .filter((k) => k !== 'id')
      .map((k) => `"${k}" = excluded."${k}"`)
      .join(', ');

    const sql = `
      INSERT INTO sessionTypes (${keys.map((k) => `"${k}"`).join(', ')})
      VALUES (${placeholders})
      ON CONFLICT(id) DO UPDATE SET ${updateClauses};
    `;

    await localClient.execute({ sql, args: values });
    console.log(`  ✓ Synced session type: [${st.id}] "${st.name}"`);
  }

  // Sync ownerAvailability into local.sqlite
  for (const oa of parsedAvailability) {
    const keys = Object.keys(oa);
    const placeholders = keys.map(() => '?').join(', ');
    const values = keys.map((k) => oa[k]);
    const updateClauses = keys
      .filter((k) => k !== 'id')
      .map((k) => `"${k}" = excluded."${k}"`)
      .join(', ');

    const sql = `
      INSERT INTO ownerAvailability (${keys.map((k) => `"${k}"`).join(', ')})
      VALUES (${placeholders})
      ON CONFLICT(id) DO UPDATE SET ${updateClauses};
    `;

    await localClient.execute({ sql, args: values });
    console.log(`  ✓ Synced owner availability: [${oa.id}] Day ${oa.dayOfWeek} (${oa.startTime}-${oa.endTime})`);
  }

  // Sync leadForms into local.sqlite
  for (const lf of parsedLeadForms) {
    const keys = Object.keys(lf);
    const placeholders = keys.map(() => '?').join(', ');
    const values = keys.map((k) => lf[k]);
    const updateClauses = keys
      .filter((k) => k !== 'id')
      .map((k) => `"${k}" = excluded."${k}"`)
      .join(', ');

    const sql = `
      INSERT INTO leadForms (${keys.map((k) => `"${k}"`).join(', ')})
      VALUES (${placeholders})
      ON CONFLICT(id) DO UPDATE SET ${updateClauses};
    `;

    await localClient.execute({ sql, args: values });
    console.log(`  ✓ Synced lead form: [${lf.id}] "${lf.name}" (sessionTypeId: ${lf.sessionTypeId})`);
  }

  console.log('\n✅ Sync complete! Local SQLite now has 100% of live scheduler data.');
}

main().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});
