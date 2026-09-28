-- Migration 0078: Advocacy Package Allowances on Services & Plan Service Matrix (PG-035)
ALTER TABLE `services` ADD `isAdvocacyPackage` boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `services` ADD `allowancesLocked` boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `services` ADD `allowancesConfig` text;
--> statement-breakpoint
ALTER TABLE `plan_service_matrix` ADD `is_locked` boolean DEFAULT false NOT NULL;
