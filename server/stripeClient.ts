import Stripe from "stripe";

let _stripe: Stripe | null = null;
let _currentKey: string | null = null;

export function resetStripeClient(): void {
  _stripe = null;
  _currentKey = null;
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY || (globalThis as any).__CF_ENV__?.STRIPE_SECRET_KEY;
  if (!key) {
    _stripe = null;
    _currentKey = null;
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  if (!_stripe || _currentKey !== key) {
    const isProduction = process.env.NODE_ENV === "production";
    if (!isProduction && key.startsWith("sk_live_")) {
      throw new Error("[CRITICAL SECURITY GUARD] Live Stripe API key detected in non-production environment! Development must use sk_test_... keys.");
    }
    if (isProduction && key.startsWith("sk_test_")) {
      throw new Error("[CRITICAL SECURITY GUARD] Test Stripe API key detected in production environment! Production requires a valid sk_live_... key.");
    }

    _stripe = new Stripe(key, { apiVersion: "2025-04-30.basil" as any });
    _currentKey = key;
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
