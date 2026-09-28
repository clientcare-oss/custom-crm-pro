import { queryCloudflareD1 } from '../server/_core/d1Client';

async function main() {
  console.log("Applying referrals & credit ledger DDL to Cloudflare D1...");

  // 1. Add referralCode column to contacts
  try {
    await queryCloudflareD1(`ALTER TABLE contacts ADD COLUMN referralCode TEXT;`);
    console.log("Added referralCode column to contacts table.");
  } catch (e: any) {
    console.log("contacts.referralCode column note:", e.message);
  }

  try {
    await queryCloudflareD1(`CREATE INDEX IF NOT EXISTS contacts_referralCode_idx ON contacts (referralCode);`);
    console.log("Created index contacts_referralCode_idx.");
  } catch (e: any) {
    console.log("Index note:", e.message);
  }

  // 2. Create referrals table
  await queryCloudflareD1(`
    CREATE TABLE IF NOT EXISTS referrals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referral_code TEXT NOT NULL,
      referrer_client_id INTEGER NOT NULL,
      referred_lead_id INTEGER,
      referred_client_id INTEGER,
      status TEXT DEFAULT 'pending' NOT NULL,
      discount_amount INTEGER DEFAULT 2500 NOT NULL,
      credit_amount INTEGER DEFAULT 2500 NOT NULL,
      qualifying_invoice_id INTEGER,
      qualified_at TIMESTAMP,
      rewarded_at TIMESTAMP,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `);
  console.log("referrals table created/verified.");

  await queryCloudflareD1(`CREATE INDEX IF NOT EXISTS referrals_code_idx ON referrals (referral_code);`);
  await queryCloudflareD1(`CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON referrals (referrer_client_id);`);
  await queryCloudflareD1(`CREATE INDEX IF NOT EXISTS referrals_lead_idx ON referrals (referred_lead_id);`);
  await queryCloudflareD1(`CREATE INDEX IF NOT EXISTS referrals_client_idx ON referrals (referred_client_id);`);
  await queryCloudflareD1(`CREATE INDEX IF NOT EXISTS referrals_status_idx ON referrals (status);`);

  // 3. Create waypoint_credit_ledger table
  await queryCloudflareD1(`
    CREATE TABLE IF NOT EXISTS waypoint_credit_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      referral_id INTEGER,
      transaction_type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      related_invoice_id INTEGER,
      related_payment_id TEXT,
      staff_user_id INTEGER,
      staff_user_name TEXT,
      note TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `);
  console.log("waypoint_credit_ledger table created/verified.");

  await queryCloudflareD1(`CREATE INDEX IF NOT EXISTS waypoint_credit_ledger_client_idx ON waypoint_credit_ledger (client_id);`);
  await queryCloudflareD1(`CREATE INDEX IF NOT EXISTS waypoint_credit_ledger_referral_idx ON waypoint_credit_ledger (referral_id);`);
  await queryCloudflareD1(`CREATE INDEX IF NOT EXISTS waypoint_credit_ledger_type_idx ON waypoint_credit_ledger (transaction_type);`);

  // 4. Create referral_program_settings table
  await queryCloudflareD1(`
    CREATE TABLE IF NOT EXISTS referral_program_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      program_enabled INTEGER DEFAULT 1 NOT NULL,
      new_client_discount_cents INTEGER DEFAULT 2500 NOT NULL,
      referrer_credit_cents INTEGER DEFAULT 2500 NOT NULL,
      qualification_trigger TEXT DEFAULT 'First successful eligible payment' NOT NULL,
      credit_type TEXT DEFAULT 'Waypoint Credit' NOT NULL,
      cash_value TEXT DEFAULT 'NONE' NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `);
  console.log("referral_program_settings table created/verified.");

  // Check if default row exists in referral_program_settings
  try {
    const settings = await queryCloudflareD1(`SELECT * FROM referral_program_settings LIMIT 1;`);
    const rows = Array.isArray(settings) ? settings : (settings?.results || []);
    if (rows.length === 0) {
      await queryCloudflareD1(`
        INSERT INTO referral_program_settings (program_enabled, new_client_discount_cents, referrer_credit_cents, qualification_trigger, credit_type, cash_value)
        VALUES (1, 2500, 2500, 'First successful eligible payment', 'Waypoint Credit', 'NONE');
      `);
      console.log("Seeded default referral program settings (Give $25. Get $25.).");
    }
  } catch (err: any) {
    console.log("Settings seed note:", err.message);
  }

  console.log("Referrals & Waypoint Credit schema migration complete!");
}

main().catch(err => {
  console.error("Migration error:", err);
  process.exit(1);
});
