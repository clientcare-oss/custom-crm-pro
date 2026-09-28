import { queryCloudflareD1 } from '../server/_core/d1Client';

async function main() {
  console.log("Applying allowances DDL...");
  await queryCloudflareD1(`
    CREATE TABLE IF NOT EXISTS student_service_allowances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_contact_id INTEGER NOT NULL,
      service_key TEXT NOT NULL,
      service_name TEXT NOT NULL,
      category TEXT DEFAULT 'meeting',
      allowance_type TEXT DEFAULT 'limited',
      base_allowance INTEGER DEFAULT 0,
      extra_allowance INTEGER DEFAULT 0,
      tracking_method TEXT DEFAULT 'calendar',
      reserve_on_open INTEGER DEFAULT 1,
      plan_period_start TEXT,
      plan_period_end TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `);

  await queryCloudflareD1(`
    CREATE TABLE IF NOT EXISTS plan_service_matrix (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_key TEXT NOT NULL,
      plan_name TEXT NOT NULL,
      service_key TEXT NOT NULL,
      service_name TEXT NOT NULL,
      category TEXT DEFAULT 'meeting',
      allowance_type TEXT DEFAULT 'limited',
      base_allowance INTEGER DEFAULT 0,
      tracking_method TEXT DEFAULT 'calendar',
      reserve_on_open INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `);

  console.log("Allowances tables successfully created / verified in local & D1!");
}

main().catch(err => {
  console.error("Migration error:", err);
  process.exit(1);
});
