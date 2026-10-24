-- Migration 0084: Family Enrollment Offers Table (PG-002, PG-003, PG-030, PG-023)
-- Persistent family-level enrollment offer records for Waypoint Advocates.
-- Anchors enrollment approval to Parent Contact ID.

CREATE TABLE IF NOT EXISTS `family_enrollment_offers` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `parentContactId` INTEGER NOT NULL,
  `studentContactId` INTEGER,
  `leadId` INTEGER,
  `status` TEXT NOT NULL DEFAULT 'draft',
  `enrollmentMode` TEXT NOT NULL DEFAULT 'standard',
  `authorizedPlans` TEXT NOT NULL DEFAULT '["navigator","anchor","family"]',
  `customPlanKey` TEXT,
  `customPlanName` TEXT,
  `customMonthlyPrice` NUMERIC,
  `customBillingFrequency` TEXT DEFAULT 'monthly',
  `customCommitmentMonths` INTEGER DEFAULT 12,
  `customTerms` TEXT,
  `billingArrangement` TEXT NOT NULL DEFAULT 'autopay',
  `manualInvoiceDueDate` TEXT,
  `manualInvoiceReason` TEXT,
  `isDiscoveryOverridden` INTEGER NOT NULL DEFAULT 0,
  `discoveryOverrideReason` TEXT,
  `approvedBy` INTEGER,
  `approvedByName` TEXT,
  `approvedAt` TEXT,
  `invitationExpiresAt` TEXT,
  `invitationSentAt` TEXT,
  `resendCount` INTEGER NOT NULL DEFAULT 0,
  `selectedPlanKey` TEXT,
  `selectedPlanName` TEXT,
  `selectedPlanPrice` NUMERIC,
  `selectedAt` TEXT,
  `agreementId` INTEGER,
  `agreementStatus` TEXT,
  `agreementSignedAt` TEXT,
  `stripeCustomerId` TEXT,
  `stripeSubscriptionId` TEXT,
  `stripePaymentIntentId` TEXT,
  `paymentStatus` TEXT,
  `paidAt` TEXT,
  `revokedAt` TEXT,
  `revokedBy` INTEGER,
  `revokedByName` TEXT,
  `revokedReason` TEXT,
  `completedAt` TEXT,
  `internalNotes` TEXT,
  `createdAt` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS `family_offers_parent_idx` ON `family_enrollment_offers` (`parentContactId`);
CREATE INDEX IF NOT EXISTS `family_offers_status_idx` ON `family_enrollment_offers` (`status`);
CREATE INDEX IF NOT EXISTS `family_offers_mode_idx` ON `family_enrollment_offers` (`enrollmentMode`);
