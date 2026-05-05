import Stripe from "stripe";
import { ENV } from "./_core/env";
import { Router, raw } from "express";
import * as db from "./db";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-04-30.basil" as any,
});

export function registerStripeRoutes(app: Router) {
  // Stripe webhook handler - MUST be registered before express.json()
  app.post("/api/stripe/webhook", raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("[Stripe Webhook] No webhook secret configured");
      return res.status(500).json({ error: "Webhook secret not configured" });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      console.error("[Stripe Webhook] Signature verification failed:", err.message);
      return res.status(400).json({ error: "Webhook signature verification failed" });
    }

    // Handle test events
    if (event.id.startsWith("evt_test_")) {
      console.log("[Webhook] Test event detected, returning verification response");
      return res.json({ verified: true });
    }

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("[Stripe] Checkout completed:", session.id);
        // Update invoice status if metadata contains invoice_id
        const invoiceId = session.metadata?.invoice_id;
        if (invoiceId) {
          try {
            // Get the invoice - use admin role since this is a system-level webhook
            const invoice = await db.getInvoiceById(parseInt(invoiceId), 0, "admin");
            if (invoice) {
              await db.updateInvoice(parseInt(invoiceId), invoice.ownerId, {
                status: "Paid",
                stripePaymentIntentId: (session.payment_intent as string) || session.id,
              });
              console.log(`[Stripe] Invoice #${invoiceId} marked as Paid`);
            }
          } catch (err) {
            console.error(`[Stripe] Failed to update invoice #${invoiceId}:`, err);
          }
        }
        break;
      }
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("[Stripe] Payment succeeded:", paymentIntent.id);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("[Stripe] Subscription updated:", subscription.id);
        break;
      }
      default:
        console.log("[Stripe] Unhandled event type:", event.type);
    }

    res.json({ received: true });
  });

  // Create checkout session for invoice payment
  app.post("/api/stripe/create-checkout", async (req, res) => {
    try {
      const { invoiceId, amount, customerEmail, customerName } = req.body;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer_email: customerEmail,
        allow_promotion_codes: true,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `Invoice #${invoiceId}`,
                description: `Payment for invoice #${invoiceId}`,
              },
              unit_amount: Math.round(amount * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        metadata: {
          invoice_id: invoiceId,
          customer_email: customerEmail || "",
          customer_name: customerName || "",
        },
        success_url: `${req.headers.origin}/client-portal?payment=success`,
        cancel_url: `${req.headers.origin}/client-portal?payment=cancelled`,
      });

      res.json({ url: session.url });
    } catch (err: any) {
      console.error("[Stripe] Checkout session error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Create billing portal session for updating payment methods
  app.post("/api/stripe/billing-portal", async (req, res) => {
    try {
      const { customerEmail } = req.body;

      // Find or create customer
      let customer: Stripe.Customer;
      const existing = await stripe.customers.list({ email: customerEmail, limit: 1 });

      if (existing.data.length > 0) {
        customer = existing.data[0];
      } else {
        customer = await stripe.customers.create({ email: customerEmail });
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: customer.id,
        return_url: `${req.headers.origin}/client-portal`,
      });

      res.json({ url: session.url });
    } catch (err: any) {
      console.error("[Stripe] Billing portal error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Create vault subscription checkout
  app.post("/api/stripe/vault-subscription", async (req, res) => {
    try {
      const { tier, customerEmail, customerName } = req.body;

      const prices: Record<string, number> = {
        basic: 900, // $9/month in cents
        pro: 1900, // $19/month in cents
        enterprise: 4900, // $49/month in cents
      };

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "subscription",
        customer_email: customerEmail,
        allow_promotion_codes: true,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `Vault Storage - ${tier.charAt(0).toUpperCase() + tier.slice(1)}`,
                description: `Cloud storage vault - ${tier} tier`,
              },
              unit_amount: prices[tier] || 900,
              recurring: { interval: "month" },
            },
            quantity: 1,
          },
        ],
        metadata: {
          vault_tier: tier,
          customer_email: customerEmail || "",
          customer_name: customerName || "",
        },
        success_url: `${req.headers.origin}/client-portal?vault=success`,
        cancel_url: `${req.headers.origin}/client-portal?vault=cancelled`,
      });

      res.json({ url: session.url });
    } catch (err: any) {
      console.error("[Stripe] Vault subscription error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });
}
