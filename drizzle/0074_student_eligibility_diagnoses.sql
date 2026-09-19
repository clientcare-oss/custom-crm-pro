-- Migration 0074: Add dedicated iepEligibility and medicalDiagnoses fields to contacts table
ALTER TABLE `contacts` ADD COLUMN `iepEligibility` text;
ALTER TABLE `contacts` ADD COLUMN `medicalDiagnoses` text;
