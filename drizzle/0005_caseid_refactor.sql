ALTER TABLE `caseCompass` RENAME COLUMN `clientId` TO `caseId`;--> statement-breakpoint
ALTER TABLE `caseCompassHistory` RENAME COLUMN `clientId` TO `caseId`;--> statement-breakpoint
ALTER TABLE `caseCompass` DROP INDEX `caseCompass_clientId_unique`;--> statement-breakpoint
ALTER TABLE `caseCompass` MODIFY COLUMN `caseId` varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE `caseCompassHistory` MODIFY COLUMN `caseId` varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE `contacts` ADD `caseId` varchar(20);--> statement-breakpoint
ALTER TABLE `caseCompass` ADD CONSTRAINT `caseCompass_caseId_unique` UNIQUE(`caseId`);