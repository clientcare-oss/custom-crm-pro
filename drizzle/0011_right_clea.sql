CREATE TABLE `internalSubtasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`isComplete` boolean NOT NULL DEFAULT false,
	`assigneeId` int,
	`dueDate` datetime,
	`resources` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `internalSubtasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `internalTasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`status` enum('not_started','in_progress','stuck','complete') NOT NULL DEFAULT 'not_started',
	`projectId` int,
	`assigneeId` int,
	`dueDate` datetime,
	`resources` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `internalTasks_id` PRIMARY KEY(`id`)
);
