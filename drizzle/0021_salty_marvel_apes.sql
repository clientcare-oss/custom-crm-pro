CREATE TABLE `caseAssignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contactId` int NOT NULL,
	`teamInviteId` int NOT NULL,
	`assignedBy` int NOT NULL,
	`assignedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `caseAssignments_id` PRIMARY KEY(`id`)
);
