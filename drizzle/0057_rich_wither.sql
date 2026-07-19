CREATE TABLE `discoveryCalls` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`leadId` int NOT NULL,
	`currentStepId` int,
	`status` enum('Preparing','In Progress','Completed','Lost') NOT NULL DEFAULT 'Preparing',
	`callScriptNotes` text,
	`theirStoryNotes` text,
	`questionNotes` text,
	`questionMode` varchar(10) DEFAULT 'IEP/504',
	`howItWorksNotes` text,
	`pricingNotes` text,
	`closingResponse` varchar(50),
	`nextStepsCompleted` text,
	`lostStepsCompleted` text,
	`additionalNotes` text,
	`privateNotes` text,
	`callRecordingKey` text,
	`scheduledAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `discoveryCalls_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `discoveryPipelineSteps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`label` varchar(100) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `discoveryPipelineSteps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `discoveryQuestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`label` varchar(200) NOT NULL,
	`subLabel` varchar(300),
	`mode` varchar(10) DEFAULT 'both',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `discoveryQuestions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `resources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`specialty` varchar(200),
	`phone` varchar(50),
	`email` varchar(320),
	`website` varchar(500),
	`address` text,
	`notes` text,
	`category` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `resources_id` PRIMARY KEY(`id`)
);
