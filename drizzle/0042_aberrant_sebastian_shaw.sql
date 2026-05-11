ALTER TABLE `callLogs` ADD `eventType` varchar(50);--> statement-breakpoint
ALTER TABLE `callLogs` ADD `isVoicemail` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `callLogs` ADD `voicemailTranscript` text;--> statement-breakpoint
ALTER TABLE `callLogs` ADD `recordingUrl` text;--> statement-breakpoint
ALTER TABLE `callLogs` ADD `smsBody` text;--> statement-breakpoint
ALTER TABLE `callLogs` ADD `rawPayload` json;