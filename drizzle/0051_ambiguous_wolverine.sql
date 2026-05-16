CREATE TABLE `smart_file_add_ons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`template_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`short_description` text,
	`price` decimal(10,2) NOT NULL DEFAULT '0.00',
	`contract_text` text,
	`is_required` tinyint NOT NULL DEFAULT 0,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `smart_file_add_ons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `smart_file_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`template_id` int NOT NULL,
	`owner_id` int NOT NULL,
	`contact_id` int NOT NULL,
	`student_contact_id` int,
	`status` enum('draft','sent','viewed','in_progress','completed','payment_selected','payment_completed','overdue','cancelled') NOT NULL DEFAULT 'draft',
	`due_date` datetime,
	`sent_at` datetime,
	`viewed_at` datetime,
	`completed_at` datetime,
	`signed_at` datetime,
	`signature_name` varchar(255),
	`signature_ip` varchar(64),
	`initials_data` text,
	`field_values` text,
	`payment_option` enum('one_time','monthly'),
	`payment_amount` decimal(10,2),
	`selected_add_on_ids` text,
	`pdf_url` text,
	`internal_notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `smart_file_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `smart_file_blocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`template_id` int NOT NULL,
	`block_order` int NOT NULL DEFAULT 0,
	`type` varchar(50) NOT NULL,
	`content` text,
	`settings` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `smart_file_blocks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `smart_file_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`owner_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`status` enum('draft','active','archived') NOT NULL DEFAULT 'draft',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `smart_file_templates_id` PRIMARY KEY(`id`)
);
