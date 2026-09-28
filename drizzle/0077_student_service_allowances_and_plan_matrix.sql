-- Migration 0077: student_service_allowances and plan_service_matrix
-- PG-030 Student Workspace Service Allowances & Usage

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

CREATE INDEX IF NOT EXISTS student_service_allowances_student_idx ON student_service_allowances (student_contact_id);
CREATE INDEX IF NOT EXISTS student_service_allowances_key_idx ON student_service_allowances (service_key);

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

CREATE INDEX IF NOT EXISTS plan_service_matrix_plan_idx ON plan_service_matrix (plan_key);
CREATE INDEX IF NOT EXISTS plan_service_matrix_service_idx ON plan_service_matrix (service_key);
