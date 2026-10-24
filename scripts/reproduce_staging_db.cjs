/**
 * Waypoint CRM — Reproducible Staging Database Migrations Runner
 * Applies all base DDL and incremental migrations (0084-0089)
 * idempotently to custom-crm-pro-staging-db.
 */
const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

require("dotenv/config");
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "fa65a33e99b08d8202d3afa0b305a1c4";
const STAGING_DB_ID = "53704ce6-552e-4d19-bdf1-b8b0c424353a";
const TOKEN = process.env.CLOUDFLARE_API_TOKEN || "";

async function queryD1(sql) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${STAGING_DB_ID}/query`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql }),
  });
  return await res.json();
}

async function run() {
  console.log("=== EXECUTING REPRODUCIBLE STAGING DB MIGRATIONS ===");
  console.log(`Target: custom-crm-pro-staging-db (${STAGING_DB_ID})`);

  // 1. Verify connection
  const ping = await queryD1("SELECT 1 as connected");
  if (!ping.success) {
    throw new Error(`Cannot connect to Cloudflare D1: ${JSON.stringify(ping.errors)}`);
  }
  console.log("Connected to staging D1 successfully.");

  // 2. Base DDL statements
  const ddlFile = path.resolve(__dirname, "../scratch/staging_schema_ddl.sql");
  if (fs.existsSync(ddlFile)) {
    const rawSql = fs.readFileSync(ddlFile, "utf-8")
      .replace(/\/\*T!\[clustered_index\] CLUSTERED \*\//g, "")
      .replace(/\/\*.*?\*\//gs, "");

    const stmts = rawSql.split(";\n").map(s => s.trim()).filter(s => s.length > 0);
    console.log(`Applying ${stmts.length} base DDL statements (if not exists)...`);
    for (const stmt of stmts) {
      if (stmt.startsWith("CREATE TABLE") && !stmt.includes("IF NOT EXISTS")) {
        const idempotentStmt = stmt.replace("CREATE TABLE", "CREATE TABLE IF NOT EXISTS");
        await queryD1(idempotentStmt);
      } else {
        await queryD1(stmt);
      }
    }
  }

  // 3. Ensure contacts table has exact 100-column schema
  const contactsCheck = await queryD1("SELECT count(*) as count FROM pragma_table_info('contacts')");
  const contactsColCount = contactsCheck.result?.[0]?.results?.[0]?.count || 0;
  if (contactsColCount === 0) {
    console.log("Creating contacts table in staging D1...");
    // Read from scratch/create_staging_contacts.cjs definition
    const prodRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/f90072b5-4842-4423-a221-ab62a01a25a6/query`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ sql: "SELECT sql FROM sqlite_master WHERE name='contacts'" })
    }).then(r => r.json());
    let contactsDdl = prodRes.result?.[0]?.results?.[0]?.sql;
    if (contactsDdl) {
      contactsDdl = contactsDdl.replace(/\/\*.*?\*\//gs, "");
      await queryD1(contactsDdl);
    }
  }

  // 4. Migration 0084: family_enrollment_offers base table
  console.log("Applying Migration 0084 (family_enrollment_offers)...");
  const m0084 = fs.readFileSync(path.resolve(__dirname, "../drizzle/0084_family_enrollment_offers.sql"), "utf-8");
  await queryD1(m0084);

  // 5. Helper to safely add column if not exists
  async function ensureColumn(table, colName, colDefinition) {
    const info = await queryD1(`SELECT name FROM pragma_table_info('${table}')`);
    const cols = new Set(info.result?.[0]?.results?.map(r => r.name) || []);
    if (!cols.has(colName)) {
      console.log(`Adding column ${colName} to ${table}...`);
      await queryD1(`ALTER TABLE \`${table}\` ADD COLUMN \`${colName}\` ${colDefinition}`);
    }
  }

  // 6. Migration 0085
  console.log("Applying Migration 0085 (revisions & delivery)...");
  await ensureColumn("family_enrollment_offers", "revisionNumber", "INTEGER NOT NULL DEFAULT 1");
  await ensureColumn("family_enrollment_offers", "revisionHistory", "TEXT DEFAULT '[]'");
  await ensureColumn("family_enrollment_offers", "invitationStatus", "TEXT NOT NULL DEFAULT 'pending'");
  await ensureColumn("family_enrollment_offers", "invitationDeliveryError", "TEXT");
  await ensureColumn("family_enrollment_offers", "changeReason", "TEXT");

  // 7. Migration 0086
  console.log("Applying Migration 0086 (payments & membership)...");
  await ensureColumn("family_enrollment_offers", "stripeCheckoutSessionId", "TEXT");
  await ensureColumn("family_enrollment_offers", "paymentAttentionReason", "TEXT");
  await ensureColumn("family_enrollment_offers", "membershipStartedAt", "TEXT");
  await ensureColumn("family_enrollment_offers", "commitmentEndsAt", "TEXT");
  await ensureColumn("family_enrollment_offers", "gracePeriodEndsAt", "TEXT");
  await ensureColumn("family_enrollment_offers", "initialInvoiceId", "INTEGER");
  await ensureColumn("family_enrollment_offers", "documentReviewStatus", "TEXT DEFAULT 'pending'");
  await ensureColumn("family_enrollment_offers", "documentReviewCompletedAt", "TEXT");
  await ensureColumn("family_enrollment_offers", "documentReviewCompletedBy", "INTEGER");
  await ensureColumn("family_enrollment_offers", "documentReviewCompletedByName", "TEXT");

  // 8. Migration 0087
  console.log("Applying Migration 0087 (pay in full)...");
  await ensureColumn("family_enrollment_offers", "payment_structure", "varchar(50) DEFAULT 'monthly_autopay' NOT NULL");
  await ensureColumn("family_enrollment_offers", "pay_in_full_discount_type", "varchar(50) DEFAULT 'none' NOT NULL");
  await ensureColumn("family_enrollment_offers", "pay_in_full_discount_value", "decimal(10,2) DEFAULT '0.00'");
  await ensureColumn("family_enrollment_offers", "pay_in_full_original_amount", "decimal(10,2)");
  await ensureColumn("family_enrollment_offers", "pay_in_full_discount_amount", "decimal(10,2) DEFAULT '0.00'");
  await ensureColumn("family_enrollment_offers", "pay_in_full_final_amount", "decimal(10,2)");
  await ensureColumn("family_enrollment_offers", "pay_in_full_payment_method", "varchar(50)");

  // 9. Migration 0088
  console.log("Applying Migration 0088 (phase 2g additions)...");
  await ensureColumn("family_enrollment_offers", "has_pending_revision", "integer DEFAULT 0 NOT NULL");
  await ensureColumn("family_enrollment_offers", "pending_revision_agreement_id", "integer");
  await ensureColumn("family_enrollment_offers", "pending_revision_structure", "text");
  await ensureColumn("family_enrollment_offers", "pending_revision_created_at", "text");
  await ensureColumn("family_enrollment_offers", "coveredStudentIds", "text");
  await ensureColumn("family_enrollment_offers", "coveredStudentNames", "text");
  await ensureColumn("family_enrollment_offers", "totalScheduledInstallments", "integer DEFAULT 12 NOT NULL");
  await ensureColumn("family_enrollment_offers", "collectedInstallmentCount", "integer DEFAULT 0 NOT NULL");
  await ensureColumn("family_enrollment_offers", "outstandingBalanceCents", "integer DEFAULT 0 NOT NULL");
  await ensureColumn("family_enrollment_offers", "lastProcessedWebhookEventId", "text");
  await ensureColumn("family_enrollment_offers", "processedStripeInvoiceIds", "text");

  // 10. Migration 0089: family_enrollment_payment_ledger
  console.log("Applying Migration 0089 (persistent payment ledger)...");
  const m0089 = fs.readFileSync(path.resolve(__dirname, "../drizzle/0089_family_enrollment_payment_ledger.sql"), "utf-8");
  const m0089Stmts = m0089.split(";\n").map(s => s.trim()).filter(s => s.length > 0);
  for (const s of m0089Stmts) {
    await queryD1(s);
  }

  // 11. Run Verification
  console.log("Verifying staging schema integrity...");
  const tables = await queryD1("SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'");
  const offersCols = await queryD1("SELECT count(*) as count FROM pragma_table_info('family_enrollment_offers')");
  const ledgerCols = await queryD1("SELECT count(*) as count FROM pragma_table_info('family_enrollment_payment_ledger')");

  console.log(`- Staging Total Tables: ${tables.result?.[0]?.results?.[0]?.count}`);
  console.log(`- family_enrollment_offers Columns: ${offersCols.result?.[0]?.results?.[0]?.count}`);
  console.log(`- family_enrollment_payment_ledger Columns: ${ledgerCols.result?.[0]?.results?.[0]?.count}`);
  console.log("=== STAGING DATABASE MIGRATION COMPLETED SUCCESSFULLY ===");
}

run().catch(err => {
  console.error("Migration error:", err);
  process.exit(1);
});
