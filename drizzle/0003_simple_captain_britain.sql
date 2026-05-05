CREATE TABLE `caseCompass` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`currentStatus` text,
	`lastMeetingSummary` text,
	`nextStep` text,
	`whoHasBall` text,
	`nextMeetingDate` datetime,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `caseCompass_id` PRIMARY KEY(`id`),
	CONSTRAINT `caseCompass_clientId_unique` UNIQUE(`clientId`)
);
--> statement-breakpoint
CREATE TABLE `caseCompassHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`currentStatus` text,
	`lastMeetingSummary` text,
	`nextStep` text,
	`whoHasBall` text,
	`nextMeetingDate` datetime,
	`savedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `caseCompassHistory_id` PRIMARY KEY(`id`)
);
