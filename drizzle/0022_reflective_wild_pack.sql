CREATE TABLE `brainDumpItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`title` text NOT NULL,
	`body` text,
	`category` varchar(100) NOT NULL DEFAULT 'General',
	`status` enum('not_started','in_progress','done','archived') NOT NULL DEFAULT 'not_started',
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`nextStep` text,
	`pinned` boolean NOT NULL DEFAULT false,
	`tags` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `brainDumpItems_id` PRIMARY KEY(`id`)
);
