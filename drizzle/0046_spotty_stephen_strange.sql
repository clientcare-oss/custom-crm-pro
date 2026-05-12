CREATE TABLE `brain_dump_images` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brain_dump_item_id` int NOT NULL,
	`image_url` text NOT NULL,
	`uploaded_at` timestamp DEFAULT (now()),
	CONSTRAINT `brain_dump_images_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `brain_dump_images` ADD CONSTRAINT `brain_dump_images_brain_dump_item_id_brainDumpItems_id_fk` FOREIGN KEY (`brain_dump_item_id`) REFERENCES `brainDumpItems`(`id`) ON DELETE cascade ON UPDATE no action;