CREATE TABLE `discoveryWorksheets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`fileKey` varchar(500),
	`fileName` varchar(200),
	`fileSize` int,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `discoveryWorksheets_id` PRIMARY KEY(`id`),
	CONSTRAINT `discoveryWorksheets_ownerId_unique` UNIQUE(`ownerId`)
);
