import { queryCloudflareD1 } from '../server/_core/d1Client';

async function main() {
  console.log("Checking columns on services table...");
  const cols = ['isAdvocacyPackage', 'allowancesLocked', 'allowancesConfig'];
  for (const col of cols) {
    try {
      if (col === 'allowancesConfig') {
        await queryCloudflareD1(`ALTER TABLE services ADD COLUMN ${col} TEXT;`);
      } else {
        await queryCloudflareD1(`ALTER TABLE services ADD COLUMN ${col} INTEGER DEFAULT 0;`);
      }
      console.log(`Added column ${col} to services`);
    } catch (e: any) {
      console.log(`Column ${col} already exists or error:`, e.message);
    }
  }

  // Also check if plan_service_matrix has is_locked column or similar
  try {
    await queryCloudflareD1(`ALTER TABLE plan_service_matrix ADD COLUMN is_locked INTEGER DEFAULT 0;`);
    console.log("Added is_locked to plan_service_matrix");
  } catch (e: any) {
    console.log("plan_service_matrix is_locked exists or error:", e.message);
  }

  console.log("Columns verified!");
}

main().catch(err => {
  console.error("Migration error:", err);
  process.exit(1);
});
