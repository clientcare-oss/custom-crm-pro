ALTER TABLE `internalTasks` MODIFY COLUMN `status` enum('not_started','in_progress','paused','stuck','complete') NOT NULL DEFAULT 'not_started';--> statement-breakpoint
ALTER TABLE `internalTasks` ADD `pausedAt` timestamp;--> statement-breakpoint
ALTER TABLE `internalTasks` ADD `stuckAt` timestamp;