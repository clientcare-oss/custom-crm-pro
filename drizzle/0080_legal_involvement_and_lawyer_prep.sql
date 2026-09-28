-- Migration: 0080_legal_involvement_and_lawyer_prep.sql
-- Add legal representation fields to contacts
ALTER TABLE contacts ADD COLUMN lawyerInvolved INTEGER DEFAULT 0;
ALTER TABLE contacts ADD COLUMN attorneyRepresents TEXT DEFAULT 'Parent/Student';
ALTER TABLE contacts ADD COLUMN attorneyInvolvementDate TEXT;
ALTER TABLE contacts ADD COLUMN legalNotes TEXT;
ALTER TABLE contacts ADD COLUMN attorneyDocuments TEXT;
ALTER TABLE contacts ADD COLUMN legalStatusUpdatedAt TIMESTAMP;
ALTER TABLE contacts ADD COLUMN legalStatusUpdatedBy TEXT;

-- Create ai_lawyer_preps table
CREATE TABLE IF NOT EXISTS ai_lawyer_preps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_contact_id INTEGER NOT NULL,
  version INTEGER DEFAULT 1 NOT NULL,
  title TEXT NOT NULL,
  attorney_name TEXT,
  attorney_firm TEXT,
  attorney_represents TEXT,
  snapshot_data TEXT NOT NULL,
  advocate_notes TEXT,
  missing_info_checklist TEXT,
  selected_packet_sections TEXT,
  generated_by TEXT,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS ai_lawyer_preps_student_idx ON ai_lawyer_preps (student_contact_id);
