-- Migration 0089: Persistent Family Enrollment Payment Ledger with UNIQUE Stripe Invoice Idempotency
-- Guarantees atomic invoice deduplication under high-concurrency webhook deliveries, retries, and multi-event replays.

CREATE TABLE IF NOT EXISTS `family_enrollment_payment_ledger` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `offer_id` INTEGER NOT NULL,
  `stripe_invoice_id` TEXT NOT NULL,
  `stripe_payment_intent_id` TEXT,
  `stripe_event_id` TEXT,
  `event_type` TEXT NOT NULL,
  `installment_number` INTEGER NOT NULL,
  `amount_paid_cents` INTEGER NOT NULL,
  `currency` TEXT NOT NULL DEFAULT 'usd',
  `status` TEXT NOT NULL DEFAULT 'paid',
  `refunded_amount_cents` INTEGER NOT NULL DEFAULT 0,
  `processed_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `metadata` TEXT,
  FOREIGN KEY (`offer_id`) REFERENCES `family_enrollment_offers`(`id`) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS `family_ledger_stripe_invoice_uidx` ON `family_enrollment_payment_ledger` (`stripe_invoice_id`);
CREATE INDEX IF NOT EXISTS `family_ledger_offer_idx` ON `family_enrollment_payment_ledger` (`offer_id`);
