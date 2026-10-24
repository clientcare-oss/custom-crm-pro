require("dotenv/config");
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "fa65a33e99b08d8202d3afa0b305a1c4";
const STAGING_DB_ID = "53704ce6-552e-4d19-bdf1-b8b0c424353a";
const TOKEN = process.env.CLOUDFLARE_API_TOKEN || "";

async function queryStaging(sql) {
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

async function verify() {
  console.log("=== VERIFYING STAGING D1 DATABASE (53704ce6-552e-4d19-bdf1-b8b0c424353a) ===");

  // 1. Total table count
  const tablesRes = await queryStaging("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY name ASC");
  const tables = tablesRes.result?.[0]?.results?.map(r => r.name) || [];
  console.log(`Total Tables in Staging: ${tables.length}`);

  // 2. Verify family_enrollment_offers exists
  if (!tables.includes("family_enrollment_offers")) {
    throw new Error("FAIL: family_enrollment_offers table missing from staging!");
  }
  console.log("PASS: family_enrollment_offers table exists.");

  // 3. Verify family_enrollment_payment_ledger exists
  if (!tables.includes("family_enrollment_payment_ledger")) {
    throw new Error("FAIL: family_enrollment_payment_ledger table missing from staging!");
  }
  console.log("PASS: family_enrollment_payment_ledger table exists.");

  // 4. Verify columns in family_enrollment_offers
  const offerColsRes = await queryStaging("PRAGMA table_info(family_enrollment_offers)");
  const offerCols = new Set(offerColsRes.result?.[0]?.results?.map(r => r.name) || []);
  console.log(`family_enrollment_offers Column Count: ${offerCols.size}`);

  const requiredOfferCols = [
    // 0084
    "parentContactId", "studentContactId", "status", "authorizedPlans", "billingArrangement", "selectedPlanKey", "agreementId",
    // 0085
    "revisionNumber", "invitationStatus", "changeReason",
    // 0086
    "stripeCheckoutSessionId", "membershipStartedAt", "commitmentEndsAt", "documentReviewStatus",
    // 0087
    "payment_structure", "pay_in_full_discount_type", "pay_in_full_final_amount",
    // 0088
    "has_pending_revision", "coveredStudentNames", "totalScheduledInstallments", "collectedInstallmentCount", "outstandingBalanceCents", "processedStripeInvoiceIds"
  ];

  for (const col of requiredOfferCols) {
    if (!offerCols.has(col)) {
      throw new Error(`FAIL: Missing column ${col} in family_enrollment_offers!`);
    }
  }
  console.log("PASS: All required columns from Migrations 0084, 0085, 0086, 0087, 0088 verified.");

  // 5. Verify columns in family_enrollment_payment_ledger
  const ledgerColsRes = await queryStaging("PRAGMA table_info(family_enrollment_payment_ledger)");
  const ledgerCols = new Set(ledgerColsRes.result?.[0]?.results?.map(r => r.name) || []);
  console.log(`family_enrollment_payment_ledger Column Count: ${ledgerCols.size}`);

  const requiredLedgerCols = [
    "offer_id", "stripe_invoice_id", "stripe_payment_intent_id", "event_type", "installment_number", "amount_paid_cents", "status"
  ];

  for (const col of requiredLedgerCols) {
    if (!ledgerCols.has(col)) {
      throw new Error(`FAIL: Missing column ${col} in family_enrollment_payment_ledger!`);
    }
  }
  console.log("PASS: All required columns from Migration 0089 verified.");

  // 6. Verify unique index on stripe_invoice_id
  const indexRes = await queryStaging("SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='family_enrollment_payment_ledger'");
  const indexes = indexRes.result?.[0]?.results || [];
  console.log("Ledger indexes:", indexes.map(i => i.name).join(", "));
  const hasUniqueInvoiceIdx = indexes.some(i => i.sql && i.sql.includes("UNIQUE") && i.sql.includes("stripe_invoice_id"));
  if (!hasUniqueInvoiceIdx) {
    throw new Error("FAIL: Missing UNIQUE index on stripe_invoice_id in ledger!");
  }
  console.log("PASS: UNIQUE constraint on stripe_invoice_id verified.");

  // 7. Check contacts table
  const contactsColsRes = await queryStaging("PRAGMA table_info(contacts)");
  console.log(`contacts table Column Count: ${contactsColsRes.result?.[0]?.results?.length}`);
  console.log("=== ALL STAGING DATABASE CHECKS PASSED ===");
}

verify().catch(err => {
  console.error(err);
  process.exit(1);
});
