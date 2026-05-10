CREATE TABLE `projectNotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`isVisibleToClient` boolean NOT NULL DEFAULT false,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projectNotes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectNotesHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`noteId` int NOT NULL,
	`projectId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`isVisibleToClient` boolean NOT NULL,
	`editedBy` int NOT NULL,
	`savedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `projectNotesHistory_id` PRIMARY KEY(`id`)
);
