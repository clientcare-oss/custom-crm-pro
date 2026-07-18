CREATE TABLE `techTaskSubtasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`isComplete` boolean NOT NULL DEFAULT false,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `techTaskSubtasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `techTasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`status` enum('Backlog','In Progress','In Review','Done','Stuck') NOT NULL DEFAULT 'Backlog',
	`priority` enum('High','Medium','Low') NOT NULL DEFAULT 'Medium',
	`category` enum('Implementation','Refinement','Compliance','Bug Fix','Infrastructure') NOT NULL DEFAULT 'Implementation',
	`assignee` varchar(200),
	`dueDate` datetime,
	`resourceUrl` text,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `techTasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `contacts` ADD `archivedAt` timestamp;--> statement-breakpoint
ALTER TABLE `contacts` ADD `archiveReason` text;