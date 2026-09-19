-- Migration 0076: Guide Client Live Co-Browsing Sessions & Presence System (PG-030-GCL)

CREATE TABLE IF NOT EXISTS `guidance_sessions` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `sessionId` text NOT NULL UNIQUE,
  `studentContactId` integer NOT NULL,
  `parentContactId` integer,
  `employeeId` text NOT NULL,
  `employeeName` text NOT NULL,
  `status` text DEFAULT 'pending' NOT NULL,
  `currentSection` text DEFAULT 'Overview',
  `currentPath` text DEFAULT '/portal',
  `currentTab` text DEFAULT 'dashboard',
  `isPaymentArea` integer DEFAULT 0 NOT NULL,
  `pointerX` real,
  `pointerY` real,
  `highlightSelector` text,
  `startedAt` integer NOT NULL,
  `connectedAt` integer,
  `endedAt` integer,
  `durationSeconds` integer DEFAULT 0 NOT NULL,
  `endReason` text,
  `createdAt` integer NOT NULL,
  `updatedAt` integer NOT NULL
);

CREATE INDEX IF NOT EXISTS `guidance_sessionId_idx` ON `guidance_sessions` (`sessionId`);
CREATE INDEX IF NOT EXISTS `guidance_studentContactId_idx` ON `guidance_sessions` (`studentContactId`);
CREATE INDEX IF NOT EXISTS `guidance_status_idx` ON `guidance_sessions` (`status`);

CREATE TABLE IF NOT EXISTS `client_presence` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `studentContactId` integer NOT NULL,
  `parentContactId` integer,
  `currentPath` text DEFAULT '/portal',
  `currentSection` text DEFAULT 'Overview',
  `isPaymentArea` integer DEFAULT 0 NOT NULL,
  `lastSeenAt` integer NOT NULL,
  `isOnline` integer DEFAULT 1 NOT NULL
);

CREATE INDEX IF NOT EXISTS `client_presence_studentContactId_idx` ON `client_presence` (`studentContactId`);
CREATE INDEX IF NOT EXISTS `client_presence_lastSeenAt_idx` ON `client_presence` (`lastSeenAt`);
