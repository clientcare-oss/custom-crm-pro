import { getLocalDbClient, queryCloudflareD1 } from '../server/_core/d1Client';

async function main() {
  console.log('Ensuring complaint_drafts table in local.sqlite...');
  const local = getLocalDbClient();

  await local.execute(`
    CREATE TABLE IF NOT EXISTS complaint_drafts (
      id TEXT PRIMARY KEY,
      student_id INTEGER,
      title TEXT,
      draft_json TEXT,
      started_at TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('Fetching drafts from Cloudflare D1...');
  const d1Drafts = await queryCloudflareD1(
    'SELECT id, student_id, title, draft_json, started_at, updated_at FROM complaint_drafts'
  );

  console.log(`Found ${d1Drafts?.length || 0} drafts in D1.`);

  for (const row of (d1Drafts || [])) {
    console.log(`Syncing ${row.id} (${row.title})...`);
    await local.execute({
      sql: `
        INSERT INTO complaint_drafts (id, student_id, title, draft_json, started_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          student_id = excluded.student_id,
          title = excluded.title,
          draft_json = excluded.draft_json,
          started_at = excluded.started_at,
          updated_at = excluded.updated_at
      `,
      args: [row.id, row.student_id, row.title, row.draft_json, row.started_at, row.updated_at],
    });
  }

  // Verify in local SQLite
  const localRows = await local.execute('SELECT id, student_id, title, updated_at, length(draft_json) as len FROM complaint_drafts');
  console.log('\nVerified local SQLite complaint_drafts:', localRows.rows);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
