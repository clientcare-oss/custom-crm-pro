-- Migration 0075: Client Journey & Operational Lifecycle System (PG-030)
ALTER TABLE `contacts` ADD COLUMN `lifecycleStage` text DEFAULT 'Active';
ALTER TABLE `contacts` ADD COLUMN `operationalState` text DEFAULT 'Normal';
ALTER TABLE `contacts` ADD COLUMN `serviceStatus` text DEFAULT 'Active';
ALTER TABLE `contacts` ADD COLUMN `portalLifecycleStatus` text DEFAULT 'Active';

ALTER TABLE `contacts` ADD COLUMN `currentPrimaryAction` text;
ALTER TABLE `contacts` ADD COLUMN `currentActionDestination` text;
ALTER TABLE `contacts` ADD COLUMN `currentActionDueDate` text;
ALTER TABLE `contacts` ADD COLUMN `currentActionHelperText` text;
ALTER TABLE `contacts` ADD COLUMN `journeyProgress` integer DEFAULT 0;
ALTER TABLE `contacts` ADD COLUMN `journeyTotalSteps` integer DEFAULT 6;

ALTER TABLE `contacts` ADD COLUMN `renewalDate` text;
ALTER TABLE `contacts` ADD COLUMN `renewalDaysRemaining` integer;
ALTER TABLE `contacts` ADD COLUMN `serviceTermEndsAt` text;

ALTER TABLE `contacts` ADD COLUMN `pauseReason` text;
ALTER TABLE `contacts` ADD COLUMN `pauseStartDate` text;
ALTER TABLE `contacts` ADD COLUMN `pauseReviewDate` text;
ALTER TABLE `contacts` ADD COLUMN `pauseType` text;
ALTER TABLE `contacts` ADD COLUMN `contractTreatment` text;
ALTER TABLE `contacts` ADD COLUMN `pauseApprovedBy` text;

ALTER TABLE `contacts` ADD COLUMN `paymentFailureDate` text;
ALTER TABLE `contacts` ADD COLUMN `failedAttemptCount` integer DEFAULT 0;
ALTER TABLE `contacts` ADD COLUMN `nextRetryDate` text;
ALTER TABLE `contacts` ADD COLUMN `gracePeriodExpiresAt` text;
ALTER TABLE `contacts` ADD COLUMN `amountDue` text;
ALTER TABLE `contacts` ADD COLUMN `paymentMethodSummary` text;

ALTER TABLE `contacts` ADD COLUMN `offboardingReason` text;
ALTER TABLE `contacts` ADD COLUMN `offboardingRequestedAt` text;
ALTER TABLE `contacts` ADD COLUMN `offboardingEffectiveDate` text;
ALTER TABLE `contacts` ADD COLUMN `closeoutCompletedBy` text;

ALTER TABLE `contacts` ADD COLUMN `managerApprovalStatus` text;
ALTER TABLE `contacts` ADD COLUMN `approvingManager` text;
ALTER TABLE `contacts` ADD COLUMN `approvalTimestamp` integer;
ALTER TABLE `contacts` ADD COLUMN `scholarshipNotes` text;
