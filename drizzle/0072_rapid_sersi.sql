CREATE TABLE `ai_suggestion_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int NOT NULL,
	`kind` varchar(64) NOT NULL,
	`inputSummary` text,
	`outputSummary` text,
	`action` enum('generated','accepted','rejected','edited','regenerated') NOT NULL DEFAULT 'generated',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_suggestion_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `allegations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int NOT NULL,
	`seqNumber` int NOT NULL,
	`plainTitle` varchar(500) NOT NULL,
	`formalTitle` varchar(500),
	`status` enum('suggested','accepted','needs_facts','needs_evidence','drafted','ready_for_review','excluded','rejected') NOT NULL DEFAULT 'suggested',
	`issueCategories` json,
	`confidence` enum('possible','likely','strong') NOT NULL DEFAULT 'possible',
	`reasonSuggested` text,
	`requiredElements` json,
	`missingInfo` json,
	`factsUsed` json,
	`districtNotice` text,
	`districtResponse` enum('none','action','denial','delay','no_response','incomplete','disputed') NOT NULL DEFAULT 'none',
	`districtResponseDetail` text,
	`impactSummary` text,
	`draftStatement` text,
	`draftFacts` text,
	`aiSuggested` boolean NOT NULL DEFAULT false,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `allegations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `complaint_cases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` varchar(32) NOT NULL,
	`status` enum('draft','in_review','ready_to_file','filed','investigation','closed') NOT NULL DEFAULT 'draft',
	`priority` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
	`complainantName` varchar(255),
	`complainantRelationship` varchar(120),
	`complainantAddress` text,
	`complainantPhone` varchar(40),
	`complainantEmail` varchar(320),
	`studentName` varchar(255),
	`studentDob` datetime,
	`studentAddress` text,
	`studentGrade` varchar(32),
	`studentGtid` varchar(32),
	`studentSchool` varchar(255),
	`studentDistrict` varchar(255),
	`disabilityCategories` json,
	`isHomeless` boolean NOT NULL DEFAULT false,
	`homelessContactInfo` text,
	`parentDifferent` boolean NOT NULL DEFAULT false,
	`parentName` varchar(255),
	`parentAddress` text,
	`parentPhone` varchar(40),
	`parentEmail` varchar(320),
	`agencyName` varchar(255),
	`agencyContact` varchar(255),
	`agencyAddress` text,
	`advocateName` varchar(255),
	`intakeDate` datetime,
	`complaintOwner` varchar(255),
	`targetFilingDate` datetime,
	`confirmedIssues` json,
	`mediationRequested` enum('undecided','yes','no') NOT NULL DEFAULT 'undecided',
	`signatureName` varchar(255),
	`signatureDate` datetime,
	`districtCopyDelivered` boolean NOT NULL DEFAULT false,
	`districtCopyRecipient` varchar(255),
	`districtCopyDate` datetime,
	`districtCopyMethod` varchar(120),
	`confirmedAccuracy` boolean NOT NULL DEFAULT false,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `complaint_cases_id` PRIMARY KEY(`id`),
	CONSTRAINT `complaint_cases_caseId_unique` UNIQUE(`caseId`)
);
--> statement-breakpoint
CREATE TABLE `draft_blocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int NOT NULL,
	`sectionKey` varchar(64) NOT NULL,
	`allegationId` int,
	`content` text,
	`builtFrom` json,
	`aiGenerated` boolean NOT NULL DEFAULT false,
	`userAccepted` boolean NOT NULL DEFAULT false,
	`version` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `draft_blocks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `evidence_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int NOT NULL,
	`evidenceId` varchar(24) NOT NULL,
	`title` varchar(500) NOT NULL,
	`category` varchar(64) NOT NULL DEFAULT 'other',
	`fileKey` text,
	`fileUrl` text,
	`fileName` varchar(500),
	`mimeType` varchar(120),
	`fileSize` int,
	`pageCount` int,
	`docDate` datetime,
	`source` varchar(255),
	`summary` text,
	`summaryVerified` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `evidence_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `evidence_items_evidenceId_unique` UNIQUE(`evidenceId`)
);
--> statement-breakpoint
CREATE TABLE `evidence_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`evidenceItemId` int NOT NULL,
	`targetType` enum('allegation','timeline_event') NOT NULL,
	`targetId` int NOT NULL,
	`pageSelection` varchar(255),
	`pageNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `evidence_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `extracted_facts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int NOT NULL,
	`factType` enum('date','person','service','meeting','decision','denial','delay','missed_action','issue_category','other') NOT NULL,
	`factText` text NOT NULL,
	`sourcePrompt` varchar(64),
	`status` enum('unconfirmed','confirmed','rejected') NOT NULL DEFAULT 'unconfirmed',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `extracted_facts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `legal_authorities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`allegationId` int NOT NULL,
	`group` enum('federal','georgia','guidance','case_law') NOT NULL,
	`citation` varchar(255) NOT NULL,
	`subject` varchar(500),
	`whyApplies` text,
	`status` enum('suggested','confirmed','removed') NOT NULL DEFAULT 'suggested',
	`verifiedForFilingDate` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `legal_authorities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `requested_remedies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int NOT NULL,
	`allegationId` int,
	`remedyType` varchar(64) NOT NULL,
	`title` varchar(500) NOT NULL,
	`detail` text,
	`purpose` text,
	`quantification` text,
	`aiSuggested` boolean NOT NULL DEFAULT false,
	`accepted` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `requested_remedies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `story_answers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int NOT NULL,
	`promptKey` varchar(64) NOT NULL,
	`answerText` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `story_answers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `student_impacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int NOT NULL,
	`allegationId` int,
	`category` varchar(64) NOT NULL,
	`whatChanged` text,
	`frequency` varchar(255),
	`duration` varchar(255),
	`supportBasis` enum('direct_evidence','parent_observation','student_report','school_report','inference') NOT NULL DEFAULT 'parent_observation',
	`supportDetail` text,
	`narrative` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `student_impacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `timeline_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`dateCertainty` enum('exact','approximate','month_year','before','after','unknown') NOT NULL DEFAULT 'exact',
	`eventDate` datetime,
	`eventEndDate` datetime,
	`details` text,
	`peopleInvolved` text,
	`schoolResponse` text,
	`parentResponse` text,
	`linkedAllegationIds` json,
	`linkedEvidenceIds` json,
	`aiDrafted` boolean NOT NULL DEFAULT false,
	`confirmed` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `timeline_events_id` PRIMARY KEY(`id`)
);
