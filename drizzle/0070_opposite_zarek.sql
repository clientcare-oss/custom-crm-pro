CREATE TABLE `sponsors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`type` varchar(20) NOT NULL,
	`donorName` varchar(200) NOT NULL,
	`donorEmail` varchar(200),
	`donorPhone` varchar(50),
	`amount` int,
	`familyContactId` int,
	`familyName` varchar(200),
	`notes` text,
	`status` varchar(30) DEFAULT 'received',
	`donatedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sponsors_id` PRIMARY KEY(`id`)
);
