import Stripe from "stripe";

// Lazy-initialize Stripe — only created when an endpoint is hit
let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY || (globalThis as any).__CF_ENV__?.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
    _stripe = new Stripe(key, { apiVersion: "2025-04-30.basil" as any });
  }
  return _stripe;
}

export function getSafeStripe(): Stripe | null {
  try {
    return getStripe();
  } catch {
    return null;
  }
}
