-- Migration 0085: Family Offer Revisions and Delivery Status (Phase 2A.1)
-- Adds pre-acceptance revision tracking and separates invitation lifecycle states.

ALTER TABLE `family_enrollment_offers` ADD COLUMN `revisionNumber` INTEGER NOT NULL DEFAULT 1;
ALTER TABLE `family_enrollment_offers` ADD COLUMN `revisionHistory` TEXT DEFAULT '[]';
ALTER TABLE `family_enrollment_offers` ADD COLUMN `invitationStatus` TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE `family_enrollment_offers` ADD COLUMN `invitationDeliveryError` TEXT;
ALTER TABLE `family_enrollment_offers` ADD COLUMN `changeReason` TEXT;
