-- Migration 0086: Family Enrollment Payments and Membership Activation (Phase 2C)
-- Connects signed enrollment agreements to Stripe checkout, recurring billing, manual invoices, and document review gates.

ALTER TABLE `family_enrollment_offers` ADD COLUMN `stripeCheckoutSessionId` TEXT;
ALTER TABLE `family_enrollment_offers` ADD COLUMN `paymentAttentionReason` TEXT;
ALTER TABLE `family_enrollment_offers` ADD COLUMN `membershipStartedAt` TEXT;
ALTER TABLE `family_enrollment_offers` ADD COLUMN `commitmentEndsAt` TEXT;
ALTER TABLE `family_enrollment_offers` ADD COLUMN `gracePeriodEndsAt` TEXT;
ALTER TABLE `family_enrollment_offers` ADD COLUMN `initialInvoiceId` INTEGER;
ALTER TABLE `family_enrollment_offers` ADD COLUMN `documentReviewStatus` TEXT DEFAULT 'pending';
ALTER TABLE `family_enrollment_offers` ADD COLUMN `documentReviewCompletedAt` TEXT;
ALTER TABLE `family_enrollment_offers` ADD COLUMN `documentReviewCompletedBy` INTEGER;
ALTER TABLE `family_enrollment_offers` ADD COLUMN `documentReviewCompletedByName` TEXT;
