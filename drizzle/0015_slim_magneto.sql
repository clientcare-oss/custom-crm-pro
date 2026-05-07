CREATE TABLE `timeEntries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`ownerId` int NOT NULL,
	`startedAt` bigint NOT NULL,
	`endedAt` bigint,
	`durationSeconds` int,
	`notes` text,
	`hourlyRate` decimal(10,2),
	`billable` boolean NOT NULL DEFAULT true,
	`invoiced` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `timeEntries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `contacts` ADD `hourlyRate` decimal(10,2);