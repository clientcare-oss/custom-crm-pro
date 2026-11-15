-- Migration 0090: Internal Staff-Only Do Not Serve Register, Identifiers, Notes, Resolutions & Audit History
-- Strictly internal staff tables; never exposed to Parent Portal or public endpoints.

CREATE TABLE IF NOT EXISTS `do_not_serve_entries` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `owner_id` INTEGER NOT NULL DEFAULT 1,
  `status` TEXT NOT NULL DEFAULT 'active',
  `applies_to` TEXT NOT NULL DEFAULT 'individual',
  `source_type` TEXT NOT NULL DEFAULT 'archive',
  `linked_contact_id` INTEGER,
  `household_anchor_id` INTEGER,
  `display_name` TEXT NOT NULL,
  `normalized_full_name` TEXT,
  `primary_phone` TEXT,
  `normalized_primary_phone` TEXT,
  `primary_email` TEXT,
  `normalized_primary_email` TEXT,
  `reason_summary` TEXT NOT NULL,
  `original_reason_summary` TEXT NOT NULL,
  `additional_notes` TEXT,
  `supporting_links_json` TEXT,
  `created_by_user_id` INTEGER NOT NULL,
  `created_by_employee_id` TEXT,
  `created_by_name` TEXT NOT NULL,
  `created_at` TEXT NOT NULL,
  `lifted_at` TEXT,
  `lifted_by_user_id` INTEGER,
  `lifted_by_employee_id` TEXT,
  `lifted_by_name` TEXT,
  `lifted_reason` TEXT,
  `reactivated_at` TEXT,
  `reactivated_by_user_id` INTEGER,
  `reactivated_by_employee_id` TEXT,
  `reactivated_by_name` TEXT,
  `reactivated_reason` TEXT,
  `version` INTEGER NOT NULL DEFAULT 1,
  `updated_at` TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS `dns_entries_owner_status_idx` ON `do_not_serve_entries` (`owner_id`, `status`);
CREATE INDEX IF NOT EXISTS `dns_entries_linked_contact_idx` ON `do_not_serve_entries` (`linked_contact_id`);
CREATE INDEX IF NOT EXISTS `dns_entries_household_anchor_idx` ON `do_not_serve_entries` (`household_anchor_id`);

CREATE TABLE IF NOT EXISTS `do_not_serve_identifiers` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `entry_id` INTEGER NOT NULL,
  `owner_id` INTEGER NOT NULL DEFAULT 1,
  `identifier_type` TEXT NOT NULL,
  `raw_value` TEXT NOT NULL,
  `normalized_value` TEXT NOT NULL,
  `label` TEXT,
  `is_auto_synced` INTEGER NOT NULL DEFAULT 0,
  `created_at` TEXT NOT NULL,
  `created_by_name` TEXT NOT NULL,
  FOREIGN KEY (`entry_id`) REFERENCES `do_not_serve_entries`(`id`) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS `dns_identifiers_entry_idx` ON `do_not_serve_identifiers` (`entry_id`);
CREATE INDEX IF NOT EXISTS `dns_identifiers_lookup_idx` ON `do_not_serve_identifiers` (`owner_id`, `identifier_type`, `normalized_value`);

CREATE TABLE IF NOT EXISTS `do_not_serve_notes` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `entry_id` INTEGER NOT NULL,
  `owner_id` INTEGER NOT NULL DEFAULT 1,
  `body` TEXT NOT NULL,
  `previous_body` TEXT,
  `author_user_id` INTEGER NOT NULL,
  `author_employee_id` TEXT,
  `author_name` TEXT NOT NULL,
  `created_at` TEXT NOT NULL,
  `updated_at` TEXT,
  `updated_by_name` TEXT,
  FOREIGN KEY (`entry_id`) REFERENCES `do_not_serve_entries`(`id`) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS `dns_notes_entry_idx` ON `do_not_serve_notes` (`entry_id`);

CREATE TABLE IF NOT EXISTS `do_not_serve_resolutions` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `entry_id` INTEGER NOT NULL,
  `owner_id` INTEGER NOT NULL DEFAULT 1,
  `target_entity_type` TEXT NOT NULL,
  `target_entity_id` TEXT NOT NULL,
  `resolution_type` TEXT NOT NULL,
  `identifier_fingerprint` TEXT NOT NULL,
  `reason` TEXT,
  `actor_user_id` INTEGER NOT NULL,
  `actor_employee_id` TEXT,
  `actor_name` TEXT NOT NULL,
  `created_at` TEXT NOT NULL,
  FOREIGN KEY (`entry_id`) REFERENCES `do_not_serve_entries`(`id`) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS `dns_resolutions_target_idx` ON `do_not_serve_resolutions` (`owner_id`, `target_entity_type`, `target_entity_id`);
CREATE INDEX IF NOT EXISTS `dns_resolutions_entry_idx` ON `do_not_serve_resolutions` (`entry_id`);

CREATE TABLE IF NOT EXISTS `do_not_serve_audit_log` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `entry_id` INTEGER NOT NULL,
  `owner_id` INTEGER NOT NULL DEFAULT 1,
  `action` TEXT NOT NULL,
  `summary` TEXT NOT NULL,
  `reason` TEXT,
  `previous_value_json` TEXT,
  `new_value_json` TEXT,
  `channel` TEXT,
  `target_entity_type` TEXT,
  `target_entity_id` TEXT,
  `actor_user_id` INTEGER,
  `actor_employee_id` TEXT,
  `actor_name` TEXT NOT NULL,
  `created_at` TEXT NOT NULL,
  FOREIGN KEY (`entry_id`) REFERENCES `do_not_serve_entries`(`id`) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS `dns_audit_entry_idx` ON `do_not_serve_audit_log` (`entry_id`);

CREATE TABLE IF NOT EXISTS `do_not_serve_alert_seen` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `owner_id` INTEGER NOT NULL DEFAULT 1,
  `staff_user_id` INTEGER NOT NULL,
  `event_key` TEXT NOT NULL,
  `entry_id` INTEGER NOT NULL,
  `dismissed_action` TEXT NOT NULL,
  `created_at` TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS `dns_alert_seen_staff_event_uidx` ON `do_not_serve_alert_seen` (`staff_user_id`, `event_key`);

