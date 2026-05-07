CREATE TABLE `callLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`studentId` int,
	`quoCallId` varchar(255),
	`fromNumber` varchar(30),
	`toNumber` varchar(30),
	`durationSeconds` int DEFAULT 0,
	`direction` varchar(20) DEFAULT 'inbound',
	`transcript` text,
	`summary` text,
	`participants` json,
	`status` varchar(20) NOT NULL DEFAULT 'unassigned',
	`matchedPhone` varchar(30),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`assignedAt` timestamp,
	CONSTRAINT `callLogs_id` PRIMARY KEY(`id`),
	CONSTRAINT `callLogs_quoCallId_unique` UNIQUE(`quoCallId`)
);
