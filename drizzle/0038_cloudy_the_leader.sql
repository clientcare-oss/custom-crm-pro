ALTER TABLE `contacts` MODIFY COLUMN `phone` varchar(50);--> statement-breakpoint
ALTER TABLE `contacts` MODIFY COLUMN `secondParentPhone` varchar(50);--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(50);