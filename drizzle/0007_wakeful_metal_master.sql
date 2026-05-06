CREATE TABLE `iepDocuments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contactId` int NOT NULL,
	`currentFileKey` text,
	`currentFileName` varchar(255),
	`currentFileUrl` text,
	`currentUploadedAt` timestamp,
	`previousFileKey` text,
	`previousFileName` varchar(255),
	`previousFileUrl` text,
	`previousUploadedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `iepDocuments_id` PRIMARY KEY(`id`),
	CONSTRAINT `iepDocuments_contactId_unique` UNIQUE(`contactId`)
);
