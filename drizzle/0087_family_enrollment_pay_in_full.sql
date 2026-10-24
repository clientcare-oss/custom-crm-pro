ALTER TABLE `family_enrollment_offers` ADD COLUMN `payment_structure` varchar(50) DEFAULT 'monthly_autopay' NOT NULL;
ALTER TABLE `family_enrollment_offers` ADD COLUMN `pay_in_full_discount_type` varchar(50) DEFAULT 'none' NOT NULL;
ALTER TABLE `family_enrollment_offers` ADD COLUMN `pay_in_full_discount_value` decimal(10,2) DEFAULT '0.00';
ALTER TABLE `family_enrollment_offers` ADD COLUMN `pay_in_full_original_amount` decimal(10,2);
ALTER TABLE `family_enrollment_offers` ADD COLUMN `pay_in_full_discount_amount` decimal(10,2) DEFAULT '0.00';
ALTER TABLE `family_enrollment_offers` ADD COLUMN `pay_in_full_final_amount` decimal(10,2);
ALTER TABLE `family_enrollment_offers` ADD COLUMN `pay_in_full_payment_method` varchar(50);
