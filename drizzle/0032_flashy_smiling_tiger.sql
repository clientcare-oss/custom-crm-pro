CREATE TABLE `aiConnectionRuns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`connectionId` int NOT NULL,
	`contactId` int NOT NULL,
	`projectId` int,
	`inputSummary` text,
	`outputText` text NOT NULL,
	`savedToNoteId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aiConnectionRuns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `aiConnections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`icon` varchar(50) NOT NULL DEFAULT 'Sparkles',
	`color` varchar(50) NOT NULL DEFAULT 'blue',
	`location` enum('notes','compass','files','tasks','details','any') NOT NULL DEFAULT 'notes',
	`outputTarget` enum('note','compass','popup') NOT NULL DEFAULT 'popup',
	`promptTemplate` text NOT NULL,
	`description` varchar(500),
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `aiConnections_id` PRIMARY KEY(`id`)
);
