const fs = require("fs");
const path = require("path");

function runSafetyCheck() {
  console.log("=== RUNNING PRE-DEPLOYMENT STAGING SAFETY AUDIT ===");

  const wranglerPath = path.resolve(__dirname, "../wrangler.jsonc");
  if (!fs.existsSync(wranglerPath)) {
    throw new Error("FAIL: wrangler.jsonc missing!");
  }

  const wranglerConfig = JSON.parse(fs.readFileSync(wranglerPath, "utf-8"));
  const stagingEnv = wranglerConfig.env?.staging;

  if (!stagingEnv) {
    throw new Error("FAIL: No env.staging configuration defined in wrangler.jsonc!");
  }

  // Check 1: Dedicated Worker Name
  if (stagingEnv.name !== "custom-crm-pro-staging") {
    throw new Error(`FAIL: Staging worker name must be 'custom-crm-pro-staging', found '${stagingEnv.name}'`);
  }
  console.log("PASS: Staging Worker name is isolated: custom-crm-pro-staging");

  // Check 2: Dedicated D1 Database Binding
  const stagingDb = stagingEnv.d1_databases?.[0];
  if (!stagingDb) {
    throw new Error("FAIL: No staging D1 database binding defined!");
  }

  const PROD_DB_ID = "f90072b5-4842-4423-a221-ab62a01a25a6";
  const STAGING_DB_ID = "53704ce6-552e-4d19-bdf1-b8b0c424353a";

  if (stagingDb.database_id === PROD_DB_ID) {
    throw new Error("CRITICAL SAFETY FAILURE: Staging environment is bound to PRODUCTION database ID!");
  }
  if (stagingDb.database_id !== STAGING_DB_ID) {
    throw new Error(`FAIL: Unexpected staging database ID: ${stagingDb.database_id}`);
  }
  if (stagingDb.database_name !== "custom-crm-pro-staging-db") {
    throw new Error(`FAIL: Unexpected staging database name: ${stagingDb.database_name}`);
  }
  console.log("PASS: Staging D1 database is strictly isolated: custom-crm-pro-staging-db (53704ce6-552e-4d19-bdf1-b8b0c424353a)");

  // Check 3: Auth & Secrets
  const envPath = path.resolve(__dirname, "../.env");
  const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";

  if (envContent.includes("sk_live_") || envContent.includes("pk_live_")) {
    throw new Error("CRITICAL SAFETY FAILURE: Live production Stripe keys found in environment!");
  }
  console.log("PASS: Zero live Stripe keys detected.");

  if (envContent.includes("live_clerk")) {
    throw new Error("CRITICAL SAFETY FAILURE: Live production Clerk instance detected!");
  }
  console.log("PASS: Clerk configuration is restricted to development/test instances.");

  // Check 4: Real Client Messaging
  if (stagingEnv.vars?.ENVIRONMENT !== "staging" || stagingEnv.vars?.NODE_ENV !== "staging") {
    throw new Error("FAIL: Staging environment variables ENVIRONMENT and NODE_ENV must be set to 'staging'");
  }
  console.log("PASS: Staging environment flags verified (ENVIRONMENT=staging, NODE_ENV=staging).");

  console.log("=== ALL STAGING SAFETY CHECKS PASSED. AUTHORIZED FOR STAGING DEPLOYMENT ===");
}

try {
  runSafetyCheck();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
