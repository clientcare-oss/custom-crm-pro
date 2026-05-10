CREATE TABLE `leadForms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`description` text,
	`schedulingEnabled` boolean NOT NULL DEFAULT false,
	`schedulingUrl` text,
	`schedulingLabel` varchar(200),
	`isActive` boolean NOT NULL DEFAULT true,
	`submissionCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leadForms_id` PRIMARY KEY(`id`)
);
