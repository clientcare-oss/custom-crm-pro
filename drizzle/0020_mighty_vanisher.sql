CREATE TABLE `teamInvites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`name` varchar(200),
	`role` enum('admin','member') NOT NULL DEFAULT 'member',
	`token` varchar(128) NOT NULL,
	`status` enum('pending','accepted','revoked') NOT NULL DEFAULT 'pending',
	`acceptedUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`acceptedAt` timestamp,
	CONSTRAINT `teamInvites_id` PRIMARY KEY(`id`),
	CONSTRAINT `teamInvites_token_unique` UNIQUE(`token`)
);
