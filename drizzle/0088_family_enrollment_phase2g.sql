-- Migration 0088: Family Enrollment Phase 2F.1 and Phase 2G Additions
-- Safe agreement revisions, student coverage, installment tracking, and persistent Stripe invoice deduplication.

ALTER TABLE `family_enrollment_offers` ADD COLUMN `has_pending_revision` integer DEFAULT 0 NOT NULL;
ALTER TABLE `family_enrollment_offers` ADD COLUMN `pending_revision_agreement_id` integer;
ALTER TABLE `family_enrollment_offers` ADD COLUMN `pending_revision_structure` text;
ALTER TABLE `family_enrollment_offers` ADD COLUMN `pending_revision_created_at` text;
ALTER TABLE `family_enrollment_offers` ADD COLUMN `coveredStudentIds` text;
ALTER TABLE `family_enrollment_offers` ADD COLUMN `coveredStudentNames` text;
ALTER TABLE `family_enrollment_offers` ADD COLUMN `totalScheduledInstallments` integer DEFAULT 12 NOT NULL;
ALTER TABLE `family_enrollment_offers` ADD COLUMN `collectedInstallmentCount` integer DEFAULT 0 NOT NULL;
ALTER TABLE `family_enrollment_offers` ADD COLUMN `outstandingBalanceCents` integer DEFAULT 0 NOT NULL;
ALTER TABLE `family_enrollment_offers` ADD COLUMN `lastProcessedWebhookEventId` text;
ALTER TABLE `family_enrollment_offers` ADD COLUMN `processedStripeInvoiceIds` text;
