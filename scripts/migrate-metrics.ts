import "dotenv/config";
import { queryCloudflareD1 } from "../server/_core/d1Client";

async function runMigration() {
  console.log("=== Starting Waypoint Metrics (PG-042) Schema Migration ===");

  // 1. Create crm_lifecycle_events table
  console.log("Creating crm_lifecycle_events table...");
  await queryCloudflareD1(`
    CREATE TABLE IF NOT EXISTS crm_lifecycle_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT NOT NULL DEFAULT 'waypoint',
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      from_stage TEXT,
      to_stage TEXT NOT NULL,
      stage_duration_seconds INTEGER,
      reason TEXT,
      note TEXT,
      performed_by INTEGER,
      metadata TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Create advocate_time_entries table
  console.log("Creating advocate_time_entries table...");
  await queryCloudflareD1(`
    CREATE TABLE IF NOT EXISTS advocate_time_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT NOT NULL DEFAULT 'waypoint',
      user_id INTEGER NOT NULL,
      family_contact_id INTEGER,
      student_contact_id INTEGER,
      work_type TEXT NOT NULL,
      entry_date TEXT NOT NULL,
      start_time TEXT,
      end_time TEXT,
      duration_minutes INTEGER NOT NULL,
      related_record_type TEXT,
      related_record_id TEXT,
      plan_tier_at_time TEXT DEFAULT '$55',
      notes TEXT,
      is_auto_generated INTEGER NOT NULL DEFAULT 0,
      is_timer_running INTEGER NOT NULL DEFAULT 0,
      timer_started_at DATETIME,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 3. Create advocacy_case_outcomes table
  console.log("Creating advocacy_case_outcomes table...");
  await queryCloudflareD1(`
    CREATE TABLE IF NOT EXISTS advocacy_case_outcomes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT NOT NULL DEFAULT 'waypoint',
      student_contact_id INTEGER NOT NULL,
      goal_description TEXT,
      goal_status TEXT NOT NULL DEFAULT 'in_progress',
      outcome_type TEXT NOT NULL,
      idea_risk_level TEXT NOT NULL DEFAULT 'moderate',
      escalated INTEGER NOT NULL DEFAULT 0,
      complaint_filed INTEGER NOT NULL DEFAULT 0,
      complaint_outcome TEXT,
      time_to_resolution_days INTEGER,
      details TEXT,
      recorded_by INTEGER,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 4. Create client_satisfaction_surveys table
  console.log("Creating client_satisfaction_surveys table...");
  await queryCloudflareD1(`
    CREATE TABLE IF NOT EXISTS client_satisfaction_surveys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT NOT NULL DEFAULT 'waypoint',
      family_contact_id INTEGER NOT NULL,
      student_contact_id INTEGER,
      advocate_user_id INTEGER,
      overall_rating INTEGER NOT NULL,
      advocate_rating INTEGER NOT NULL,
      communication_rating INTEGER NOT NULL,
      meeting_prep_rating INTEGER NOT NULL,
      portal_rating INTEGER NOT NULL,
      confidence_gained INTEGER NOT NULL DEFAULT 1,
      goals_achieved INTEGER NOT NULL DEFAULT 1,
      nps_score INTEGER NOT NULL,
      survey_type TEXT NOT NULL DEFAULT 'post_meeting',
      testimonial_text TEXT,
      testimonial_permission INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 5. Create membership_plan_history table
  console.log("Creating membership_plan_history table...");
  await queryCloudflareD1(`
    CREATE TABLE IF NOT EXISTS membership_plan_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT NOT NULL DEFAULT 'waypoint',
      contact_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      from_plan TEXT,
      to_plan TEXT NOT NULL,
      billing_cadence TEXT NOT NULL DEFAULT 'monthly',
      monthly_amount REAL DEFAULT 55.00,
      collected_amount REAL DEFAULT 55.00,
      cancellation_reason TEXT,
      cancellation_note TEXT,
      effective_date TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 6. Create indexes
  console.log("Creating indexes...");
  await queryCloudflareD1(`CREATE INDEX IF NOT EXISTS idx_crm_event_entity ON crm_lifecycle_events (entity_type, entity_id);`);
  await queryCloudflareD1(`CREATE INDEX IF NOT EXISTS idx_crm_event_stage ON crm_lifecycle_events (to_stage);`);
  await queryCloudflareD1(`CREATE INDEX IF NOT EXISTS idx_time_entry_user ON advocate_time_entries (user_id, entry_date);`);
  await queryCloudflareD1(`CREATE INDEX IF NOT EXISTS idx_time_entry_student ON advocate_time_entries (student_contact_id);`);
  await queryCloudflareD1(`CREATE INDEX IF NOT EXISTS idx_outcome_student ON advocacy_case_outcomes (student_contact_id);`);
  await queryCloudflareD1(`CREATE INDEX IF NOT EXISTS idx_plan_hist_contact ON membership_plan_history (contact_id);`);

  console.log("=== Waypoint Metrics (PG-042) Migration Completed Successfully ===");
}

runMigration().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
