CREATE TABLE `billGuardianAccounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`bankName` varchar(255) NOT NULL,
	`accountName` varchar(255) NOT NULL,
	`accountType` varchar(100) NOT NULL DEFAULT 'checking',
	`lastSyncedAt` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `billGuardianAccounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `billGuardianBills` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`vendorName` varchar(255) NOT NULL,
	`vendorAliases` text,
	`expectedAmount` decimal(10,2) NOT NULL,
	`dueDay` int NOT NULL,
	`frequency` enum('monthly','quarterly','annual','weekly') NOT NULL DEFAULT 'monthly',
	`category` varchar(100) NOT NULL DEFAULT 'General',
	`autopay` boolean NOT NULL DEFAULT false,
	`priority` enum('critical','high','medium','low') NOT NULL DEFAULT 'medium',
	`notes` text,
	`fileKey` varchar(500),
	`fileUrl` varchar(1000),
	`fileName` varchar(255),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `billGuardianBills_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `billGuardianTransactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`bankAccountId` int,
	`externalId` varchar(255),
	`description` varchar(500) NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`transactionDate` timestamp NOT NULL,
	`category` varchar(100),
	`matchedBillId` int,
	`matchStatus` enum('unmatched','matched','duplicate','increased','needs_review','ignored') NOT NULL DEFAULT 'unmatched',
	`matchConfidence` int NOT NULL DEFAULT 0,
	`matchNotes` text,
	`isManuallyVerified` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `billGuardianTransactions_id` PRIMARY KEY(`id`)
);
