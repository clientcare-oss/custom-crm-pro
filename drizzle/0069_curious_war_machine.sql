CREATE TABLE `emailTemplateFolders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`color` varchar(30) DEFAULT 'blue',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `emailTemplateFolders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `emailTemplates` ADD `folderId` int;