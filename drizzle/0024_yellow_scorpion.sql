ALTER TABLE `billGuardianBills` ADD `paymentLink` varchar(1000);--> statement-breakpoint
ALTER TABLE `billGuardianBills` ADD `paymentLinkNote` text;--> statement-breakpoint
ALTER TABLE `billGuardianBills` ADD `manuallyPaid` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `billGuardianBills` ADD `manuallyPaidAt` timestamp;