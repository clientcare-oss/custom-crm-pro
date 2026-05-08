ALTER TABLE `iepDocuments` ADD `draftFileKey` text;--> statement-breakpoint
ALTER TABLE `iepDocuments` ADD `draftFileName` varchar(255);--> statement-breakpoint
ALTER TABLE `iepDocuments` ADD `draftFileUrl` text;--> statement-breakpoint
ALTER TABLE `iepDocuments` ADD `draftUploadedAt` timestamp;--> statement-breakpoint
ALTER TABLE `iepDocuments` ADD `draftNotes` text;