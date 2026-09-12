-- Drizzle Migration: Quo Phone System Integration (PG-014-QUO)
CREATE TABLE IF NOT EXISTS `quoSettings` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `ownerId` integer NOT NULL,
  `status` text DEFAULT 'disconnected' NOT NULL,
  `hasApiKey` integer DEFAULT 0 NOT NULL,
  `webhookUrl` text,
  `webhookSecret` text,
  `primaryPhoneId` text,
  `primaryPhoneNumber` text,
  `primaryPhoneDisplayName` text,
  `lastSyncAt` integer,
  `createdAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
  `updatedAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);

CREATE INDEX IF NOT EXISTS `quoSettings_ownerId_idx` ON `quoSettings` (`ownerId`);

CREATE TABLE IF NOT EXISTS `quoEmployeeMappings` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `ownerId` integer NOT NULL,
  `employeeId` integer NOT NULL,
  `employeeName` text,
  `quoUserId` text NOT NULL,
  `quoUserDisplayName` text,
  `createdAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
  `updatedAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);

CREATE INDEX IF NOT EXISTS `quoEmployeeMappings_ownerId_idx` ON `quoEmployeeMappings` (`ownerId`);
CREATE INDEX IF NOT EXISTS `quoEmployeeMappings_employeeId_idx` ON `quoEmployeeMappings` (`employeeId`);

CREATE TABLE IF NOT EXISTS `employeeDevices` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `employeeId` integer NOT NULL,
  `deviceId` text NOT NULL UNIQUE,
  `deviceName` text,
  `platform` text DEFAULT 'web' NOT NULL,
  `pushSubscription` text,
  `enabled` integer DEFAULT 1 NOT NULL,
  `lastSeenAt` integer,
  `createdAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);

CREATE INDEX IF NOT EXISTS `employeeDevices_employeeId_idx` ON `employeeDevices` (`employeeId`);

-- Contact Quo Sync Fields
ALTER TABLE `contacts` ADD COLUMN `quoContactId` text;
ALTER TABLE `contacts` ADD COLUMN `quoSyncStatus` text DEFAULT 'not_synced';
ALTER TABLE `contacts` ADD COLUMN `quoLastSyncAt` integer;
ALTER TABLE `contacts` ADD COLUMN `quoSyncError` text;

-- CallLog Extended Fields
ALTER TABLE `callLogs` ADD COLUMN `contactId` integer;
ALTER TABLE `callLogs` ADD COLUMN `isMissed` integer DEFAULT 0;
ALTER TABLE `callLogs` ADD COLUMN `callbackStatus` text DEFAULT 'none';
ALTER TABLE `callLogs` ADD COLUMN `callbackTaskId` integer;

CREATE INDEX IF NOT EXISTS `callLogs_contactId_idx` ON `callLogs` (`contactId`);
