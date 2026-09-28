import { queryCloudflareD1 } from '../server/_core/d1Client';

async function main() {
  console.log("Applying Referral Credit Billing Application DDL to Cloudflare D1...");

  const invoiceColumns = [
    { col: "regularPlanAmount", type: "DECIMAL(12, 2)" },
    { col: "referralCreditApplied", type: "DECIMAL(12, 2) DEFAULT '0.00'" },
    { col: "creditApplicationStatus", type: "TEXT DEFAULT 'none'" },
    { col: "paymentStatusNote", type: "TEXT" },
  ];

  for (const item of invoiceColumns) {
    try {
      await queryCloudflareD1(`ALTER TABLE invoices ADD COLUMN ${item.col} ${item.type};`);
      console.log(`Added column ${item.col} to invoices table.`);
    } catch (e: any) {
      console.log(`Column ${item.col} note:`, e.message);
    }
  }

  const ledgerColumns = [
    { col: "status", type: "TEXT DEFAULT 'posted'" },
    { col: "source", type: "TEXT DEFAULT 'system'" },
  ];

  for (const item of ledgerColumns) {
    try {
      await queryCloudflareD1(`ALTER TABLE waypoint_credit_ledger ADD COLUMN ${item.col} ${item.type};`);
      console.log(`Added column ${item.col} to waypoint_credit_ledger table.`);
    } catch (e: any) {
      console.log(`Column ${item.col} note:`, e.message);
    }
  }

  try {
    await queryCloudflareD1(`CREATE INDEX IF NOT EXISTS invoices_credit_app_status_idx ON invoices (creditApplicationStatus);`);
    console.log("Created index invoices_credit_app_status_idx.");
  } catch (e: any) {
    console.log("Index note:", e.message);
  }

  try {
    await queryCloudflareD1(`CREATE INDEX IF NOT EXISTS waypoint_credit_ledger_status_idx ON waypoint_credit_ledger (status);`);
    console.log("Created index waypoint_credit_ledger_status_idx.");
  } catch (e: any) {
    console.log("Index note:", e.message);
  }

  console.log("Migration complete!");
}

main().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
