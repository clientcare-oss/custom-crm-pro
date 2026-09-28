-- Migration 0079: Waypoint Referral and Credit System
-- Connects existing clients to referral links, single lead capture, referral status tracking, and credit ledger.

ALTER TABLE `contacts` ADD COLUMN `referralCode` TEXT;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `contacts_referralCode_idx` ON `contacts` (`referralCode`);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `referrals` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `referral_code` TEXT NOT NULL,
  `referrer_client_id` INTEGER NOT NULL,
  `referred_lead_id` INTEGER,
  `referred_client_id` INTEGER,
  `status` TEXT DEFAULT 'pending' NOT NULL,
  `discount_amount` INTEGER DEFAULT 2500 NOT NULL,
  `credit_amount` INTEGER DEFAULT 2500 NOT NULL,
  `qualifying_invoice_id` INTEGER,
  `qualified_at` TIMESTAMP,
  `rewarded_at` TIMESTAMP,
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS `referrals_code_idx` ON `referrals` (`referral_code`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `referrals_referrer_idx` ON `referrals` (`referrer_client_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `referrals_lead_idx` ON `referrals` (`referred_lead_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `referrals_client_idx` ON `referrals` (`referred_client_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `referrals_status_idx` ON `referrals` (`status`);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `waypoint_credit_ledger` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `client_id` INTEGER NOT NULL,
  `referral_id` INTEGER,
  `transaction_type` TEXT NOT NULL,
  `amount` INTEGER NOT NULL,
  `related_invoice_id` INTEGER,
  `related_payment_id` TEXT,
  `staff_user_id` INTEGER,
  `staff_user_name` TEXT,
  `note` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS `waypoint_credit_ledger_client_idx` ON `waypoint_credit_ledger` (`client_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `waypoint_credit_ledger_referral_idx` ON `waypoint_credit_ledger` (`referral_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `waypoint_credit_ledger_type_idx` ON `waypoint_credit_ledger` (`transaction_type`);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `referral_program_settings` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `program_enabled` INTEGER DEFAULT 1 NOT NULL,
  `new_client_discount_cents` INTEGER DEFAULT 2500 NOT NULL,
  `referrer_credit_cents` INTEGER DEFAULT 2500 NOT NULL,
  `qualification_trigger` TEXT DEFAULT 'First successful eligible payment' NOT NULL,
  `credit_type` TEXT DEFAULT 'Waypoint Credit' NOT NULL,
  `cash_value` TEXT DEFAULT 'NONE' NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
