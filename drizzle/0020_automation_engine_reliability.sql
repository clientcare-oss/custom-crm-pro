-- Migration: 0020_automation_engine_reliability.sql
-- Purpose: Add persistent custom student tags on contacts, durable background job queue for PG-013 Automations Engine,
--          and persistent trigger request storage.
-- Rollback instructions:
--   DROP INDEX IF EXISTS idx_hb_jobs_dedup_key;
--   DROP INDEX IF EXISTS idx_hb_jobs_status_sched;
--   DROP INDEX IF EXISTS idx_hb_jobs_appt;
--   DROP TABLE IF EXISTS honeybook_automation_jobs;
--   DROP TABLE IF EXISTS automation_trigger_requests;
--   (SQLite/D1 contacts.tags column can remain unused on rollback without breaking older code)

ALTER TABLE contacts ADD COLUMN tags TEXT;

CREATE TABLE IF NOT EXISTS honeybook_automation_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL,
  automation_id INTEGER NOT NULL,
  automation_name TEXT NOT NULL,
  contact_id INTEGER NOT NULL,
  contact_name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  step_number INTEGER NOT NULL,
  step_type TEXT NOT NULL,
  step_title TEXT NOT NULL,
  step_json TEXT NOT NULL,
  event_context_json TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  scheduled_for TEXT NOT NULL,
  due_date TEXT,
  appointment_id INTEGER,
  event_date TEXT,
  job_dedup_key TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  next_retry_at TEXT,
  locked_at TEXT,
  worker_id TEXT,
  provider_message_id TEXT,
  delivery_status TEXT,
  result_detail TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hb_jobs_dedup_key
  ON honeybook_automation_jobs(job_dedup_key);

CREATE INDEX IF NOT EXISTS idx_hb_jobs_status_sched
  ON honeybook_automation_jobs(status, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_hb_jobs_appt
  ON honeybook_automation_jobs(appointment_id);

CREATE TABLE IF NOT EXISTS automation_trigger_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  requested_by_user_id INTEGER,
  requested_by_name TEXT,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted',
  created_at TEXT NOT NULL
);

