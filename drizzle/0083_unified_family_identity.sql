-- Phase 1: Unified Family Identity & Discovery Connections Migration
-- Adds persistent relationships between Appointments, Leads, Parent Contacts, Students, and Discovery Calls.

ALTER TABLE appointments ADD COLUMN leadId INTEGER;
ALTER TABLE appointments ADD COLUMN discoveryCallId INTEGER;
ALTER TABLE appointments ADD COLUMN parentContactId INTEGER;

ALTER TABLE discoveryCalls ADD COLUMN appointmentId INTEGER;
ALTER TABLE discoveryCalls ADD COLUMN contactId INTEGER;
ALTER TABLE discoveryCalls ADD COLUMN studentContactId INTEGER;

ALTER TABLE contacts ADD COLUMN stripeCustomerId TEXT;
ALTER TABLE contacts ADD COLUMN stripeSubscriptionId TEXT;
ALTER TABLE contacts ADD COLUMN enrollmentOfferId INTEGER;
