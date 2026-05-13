CREATE TABLE `client_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contact_id` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `client_credentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `client_credentials_contact_id_unique` UNIQUE(`contact_id`),
	CONSTRAINT `client_credentials_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `portal_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(128) NOT NULL,
	`contact_id` int NOT NULL,
	`expires_at` datetime NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `portal_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `portal_sessions_token_unique` UNIQUE(`token`)
);
