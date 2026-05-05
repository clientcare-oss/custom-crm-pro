CREATE TABLE `clientFiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`projectId` int,
	`fileName` varchar(255) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` text NOT NULL,
	`fileSize` int,
	`mimeType` varchar(100) DEFAULT 'application/pdf',
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `clientFiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vaultSubscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`tier` enum('basic','pro','enterprise') NOT NULL DEFAULT 'basic',
	`storageLimit` int NOT NULL,
	`storageUsed` int NOT NULL DEFAULT 0,
	`stripeSubscriptionId` varchar(255),
	`status` enum('active','cancelled','past_due') NOT NULL DEFAULT 'active',
	`startDate` datetime NOT NULL,
	`renewalDate` datetime,
	`cancelledAt` datetime,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vaultSubscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `vaultSubscriptions_clientId_unique` UNIQUE(`clientId`)
);
