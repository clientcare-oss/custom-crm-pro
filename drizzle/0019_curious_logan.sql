CREATE TABLE `draftIepHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contactId` int NOT NULL,
	`ownerId` int NOT NULL,
	`fileKey` text NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileUrl` text NOT NULL,
	`notes` text,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `draftIepHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `iepDocuments` DROP COLUMN `draftFileKey`;--> statement-breakpoint
ALTER TABLE `iepDocuments` DROP COLUMN `draftFileName`;--> statement-breakpoint
ALTER TABLE `iepDocuments` DROP COLUMN `draftFileUrl`;--> statement-breakpoint
ALTER TABLE `iepDocuments` DROP COLUMN `draftUploadedAt`;--> statement-breakpoint
ALTER TABLE `iepDocuments` DROP COLUMN `draftNotes`;