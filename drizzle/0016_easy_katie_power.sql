CREATE TABLE `walkthroughRuns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`walkthroughId` int NOT NULL,
	`studentId` int,
	`ownerId` int NOT NULL,
	`completedSteps` json NOT NULL,
	`status` varchar(50) NOT NULL DEFAULT 'in_progress',
	`notes` text,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `walkthroughRuns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `walkthroughs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`category` varchar(100) NOT NULL DEFAULT 'General',
	`steps` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `walkthroughs_id` PRIMARY KEY(`id`)
);
