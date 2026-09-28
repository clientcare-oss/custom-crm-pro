-- Migration 0081: Client-Controlled Referral Credit Application to Billing
-- Enables clients to schedule Waypoint referral credits toward upcoming billing/payments
-- with 5-day cutoff, double-use prevention, real billing amount adjustments, and $0 satisfaction.

ALTER TABLE `invoices` ADD COLUMN `regularPlanAmount` DECIMAL(12, 2);
--> statement-breakpoint
ALTER TABLE `invoices` ADD COLUMN `referralCreditApplied` DECIMAL(12, 2) DEFAULT '0.00';
--> statement-breakpoint
ALTER TABLE `invoices` ADD COLUMN `creditApplicationStatus` TEXT DEFAULT 'none';
--> statement-breakpoint
ALTER TABLE `invoices` ADD COLUMN `paymentStatusNote` TEXT;
--> statement-breakpoint
ALTER TABLE `waypoint_credit_ledger` ADD COLUMN `status` TEXT DEFAULT 'posted';
--> statement-breakpoint
ALTER TABLE `waypoint_credit_ledger` ADD COLUMN `source` TEXT DEFAULT 'system';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `invoices_credit_app_status_idx` ON `invoices` (`creditApplicationStatus`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `waypoint_credit_ledger_status_idx` ON `waypoint_credit_ledger` (`status`);
