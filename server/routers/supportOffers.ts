import { z } from "zod";
import { router, adminProcedure, publicProcedure } from "../_core/trpc";
import {
  listOffersForStudent,
  getOfferById,
  getActiveOfferForPortal,
  saveDraftOffer,
  sendOffer,
  updateOfferStatus,
  recordOfferEvent,
  listOfferEvents,
} from "../db/supportOffers";
import { recordCaseActivity } from "../services/caseActivityService";
import { getContactById } from "../db/contacts";

export const supportOffersRouter = router({
  /**
   * List all offers (drafts, sent, accepted, paid, etc.) for a specific student workspace.
   */
  listForStudent: adminProcedure
    .input(z.object({ studentId: z.number() }))
    .query(async ({ input }) => {
      return await listOffersForStudent(input.studentId);
    }),

  /**
   * Get single offer by ID along with its audit events.
   */
  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const offer = await getOfferById(input.id);
      if (!offer) return null;
      const events = await listOfferEvents(input.id);
      return { offer, events };
    }),

  /**
   * Save a support offer as a draft.
   */
  saveDraft: adminProcedure
    .input(
      z.object({
        id: z.number().optional(),
        organizationId: z.number().optional().default(1),
        familyId: z.number().optional().nullable(),
        studentId: z.number(),
        parentContactId: z.number().optional().nullable(),
        sourceType: z.enum(["library", "custom"]).default("library"),
        sourceServiceId: z.number().optional().nullable(),
        title: z.string().min(1, "Title is required"),
        description: z.string().min(1, "Description is required"),
        price: z.number().min(0, "Price cannot be negative"), // cents
        currency: z.string().default("usd"),
        deliveryTime: z.string().min(1),
        includedItems: z.array(z.string()).optional(),
        planEligibility: z.string().default("one-time add-on"),
        personalNote: z.string().optional().nullable(),
        allowDocumentUpload: z.boolean().default(false),
        requirePayment: z.boolean().default(true),
        priorityEnabled: z.boolean().default(false),
        priorityPrice: z.number().optional().nullable(),
        priorityDeliveryTime: z.string().optional().nullable(),
        priorityDescription: z.string().optional().nullable(),
        expiresAt: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const actor = ctx.user?.name || ctx.user?.email || "Waypoint Advocate";
      const previous = input.id ? await getOfferById(input.id) : null;

      const offer = await saveDraftOffer({
        id: input.id,
        organizationId: input.organizationId,
        familyId: input.familyId,
        studentId: input.studentId,
        parentContactId: input.parentContactId,
        sourceType: input.sourceType,
        sourceServiceId: input.sourceServiceId,
        title: input.title,
        description: input.description,
        price: input.price,
        currency: input.currency,
        deliveryTime: input.deliveryTime,
        includedItems: input.includedItems,
        planEligibility: input.planEligibility,
        personalNote: input.personalNote,
        allowDocumentUpload: input.allowDocumentUpload,
        requirePayment: input.requirePayment,
        priorityEnabled: input.priorityEnabled,
        priorityPrice: input.priorityPrice,
        priorityDeliveryTime: input.priorityDeliveryTime,
        priorityDescription: input.priorityDescription,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        createdBy: previous?.createdBy || actor,
      });

      // Record offer event
      const eventType = input.id ? "offer_edited" : "offer_created";
      await recordOfferEvent({
        offerId: offer.id,
        studentId: offer.studentId,
        familyId: offer.familyId,
        serviceId: offer.sourceServiceId,
        eventType,
        actor,
        previousStatus: previous?.status || null,
        newStatus: offer.status,
        metadata: JSON.stringify({
          title: offer.title,
          price: offer.price,
          isDraft: true,
        }),
      });

      // Also record "draft_saved" event
      await recordOfferEvent({
        offerId: offer.id,
        studentId: offer.studentId,
        familyId: offer.familyId,
        serviceId: offer.sourceServiceId,
        eventType: "draft_saved",
        actor,
        previousStatus: offer.status,
        newStatus: offer.status,
      });

      // Log in Student Case Activity Timeline
      try {
        await recordCaseActivity({
          studentContactId: offer.studentId,
          eventType: "note",
          title: `Draft support offer saved: ${offer.title}`,
          description: `Saved a draft support offer for $${(offer.price / 100).toFixed(2)} (${offer.deliveryTime}). Invisible to parent until sent.`,
          whyReason: "Customized support options tailored to student needs.",
          ownerName: actor,
          ownerRole: "Advocate",
          categoryColor: "blue",
        });
      } catch (e) {
        console.warn("[SupportOffers] Activity logging notice:", e);
      }

      return offer;
    }),

  /**
   * Send support offer to the Parent Portal.
   */
  sendOffer: adminProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const actor = ctx.user?.name || ctx.user?.email || "Waypoint Advocate";
      const existing = await getOfferById(input.id);
      if (!existing) {
        throw new Error("Offer not found");
      }

      const updated = await sendOffer(input.id, actor);

      // Record offer_sent event
      await recordOfferEvent({
        offerId: updated.id,
        studentId: updated.studentId,
        familyId: updated.familyId,
        serviceId: updated.sourceServiceId,
        eventType: "offer_sent",
        actor,
        previousStatus: existing.status,
        newStatus: "sent",
        metadata: JSON.stringify({
          sentBy: actor,
          sentAt: updated.sentAt,
          price: updated.price,
        }),
      });

      // Record parent_notified event
      await recordOfferEvent({
        offerId: updated.id,
        studentId: updated.studentId,
        familyId: updated.familyId,
        serviceId: updated.sourceServiceId,
        eventType: "parent_notified",
        actor: "System Notification",
        previousStatus: "sent",
        newStatus: "sent",
        metadata: JSON.stringify({
          channel: "portal_and_email",
          headline: "New Support Recommended by Waypoint",
        }),
      });

      // Record in Student Case Activity Timeline
      try {
        await recordCaseActivity({
          studentContactId: updated.studentId,
          eventType: "document",
          title: `Support offer sent: ${updated.title}`,
          description: `Published offer ($${(updated.price / 100).toFixed(2)}) to the Parent Portal. Parent notified to review recommended support.`,
          whyReason: "Advocate recommended additional targeted services for IEP progress.",
          ownerName: actor,
          ownerRole: "Advocate",
          categoryColor: "purple",
        });
      } catch (e) {
        console.warn("[SupportOffers] Case activity notification error:", e);
      }

      return updated;
    }),

  /**
   * Cancel an offer before or during review.
   */
  cancelOffer: adminProcedure
    .input(z.object({ id: z.number(), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const actor = ctx.user?.name || ctx.user?.email || "Waypoint Advocate";
      const existing = await getOfferById(input.id);
      if (!existing) throw new Error("Offer not found");

      const updated = await updateOfferStatus(input.id, "canceled");
      await recordOfferEvent({
        offerId: input.id,
        studentId: existing.studentId,
        familyId: existing.familyId,
        serviceId: existing.sourceServiceId,
        eventType: "offer_canceled",
        actor,
        previousStatus: existing.status,
        newStatus: "canceled",
        metadata: JSON.stringify({ reason: input.reason || "Canceled by advocate" }),
      });
      return updated;
    }),

  /**
   * Parent Portal: Fetch active visible offer for this student.
   */
  portalGetActive: publicProcedure
    .input(z.object({ studentId: z.number() }))
    .query(async ({ input }) => {
      const offer = await getActiveOfferForPortal(input.studentId);
      if (!offer) return null;

      // Automatically mark as viewed if first time
      if (offer.status === "sent" && !offer.viewedAt) {
        await updateOfferStatus(offer.id, "viewed", { viewedAt: new Date() });
        await recordOfferEvent({
          offerId: offer.id,
          studentId: offer.studentId,
          familyId: offer.familyId,
          serviceId: offer.sourceServiceId,
          eventType: "offer_viewed",
          actor: "Client Parent",
          previousStatus: "sent",
          newStatus: "viewed",
        });
      }

      return offer;
    }),

  /**
   * Parent Portal: Record offer view explicitly.
   */
  portalRecordView: publicProcedure
    .input(z.object({ offerId: z.number() }))
    .mutation(async ({ input }) => {
      const offer = await getOfferById(input.offerId);
      if (!offer) return null;
      if (!offer.viewedAt) {
        await updateOfferStatus(offer.id, "viewed", { viewedAt: new Date() });
        await recordOfferEvent({
          offerId: offer.id,
          studentId: offer.studentId,
          familyId: offer.familyId,
          serviceId: offer.sourceServiceId,
          eventType: "offer_viewed",
          actor: "Client Parent",
          previousStatus: offer.status,
          newStatus: "viewed",
        });
      }
      return { success: true };
    }),

  /**
   * Parent Portal: Accept a free or non-payment required offer.
   */
  portalAcceptFreeOffer: publicProcedure
    .input(
      z.object({
        offerId: z.number(),
        selectedPriority: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ input }) => {
      const offer = await getOfferById(input.offerId);
      if (!offer) throw new Error("Offer not found");

      const now = new Date();
      const updated = await updateOfferStatus(input.offerId, "accepted", {
        acceptedAt: now,
        selectedPriority: input.selectedPriority,
      });

      // Record timeline events
      await recordOfferEvent({
        offerId: offer.id,
        studentId: offer.studentId,
        familyId: offer.familyId,
        serviceId: offer.sourceServiceId,
        eventType: "offer_accepted",
        actor: "Client Parent",
        previousStatus: offer.status,
        newStatus: "accepted",
      });

      await recordOfferEvent({
        offerId: offer.id,
        studentId: offer.studentId,
        familyId: offer.familyId,
        serviceId: offer.sourceServiceId,
        eventType: "service_started",
        actor: "Waypoint System",
        previousStatus: "accepted",
        newStatus: "in_progress",
      });

      // Log in Student Case Activity
      try {
        await recordCaseActivity({
          studentContactId: offer.studentId,
          eventType: "task",
          title: `Support Accepted by Family: ${offer.title}`,
          description: `Family confirmed acceptance of support offer ($0 / no-charge). Service activated.`,
          whyReason: "Parent authorized recommended support in Parent Portal.",
          ownerName: "Client Parent",
          ownerRole: "Parent",
          categoryColor: "green",
        });
      } catch (e) {
        console.warn("[SupportOffers] Case activity log error:", e);
      }

      return updated;
    }),

  /**
   * Parent Portal: Immediate Payment flow for Paid Offers.
   * Uses idempotencyKey to prevent duplicate charges.
   */
  portalProcessPayment: publicProcedure
    .input(
      z.object({
        offerId: z.number(),
        selectedPriority: z.boolean().optional().default(false),
        paymentMethodToken: z.string().optional(),
        idempotencyKey: z.string().min(1),
        simulateFailure: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ input }) => {
      const offer = await getOfferById(input.offerId);
      if (!offer) throw new Error("Offer not found");

      // Idempotency check: if already paid, return existing state
      if (offer.status === "paid" || offer.paidAt) {
        return {
          success: true,
          alreadyPaid: true,
          offer,
          message: "Payment was already completed for this offer.",
        };
      }

      const totalCents =
        offer.price + (input.selectedPriority && offer.priorityPrice ? offer.priorityPrice : 0);

      // Record payment_started
      await recordOfferEvent({
        offerId: offer.id,
        studentId: offer.studentId,
        familyId: offer.familyId,
        serviceId: offer.sourceServiceId,
        eventType: "payment_started",
        actor: "Client Parent",
        previousStatus: offer.status,
        newStatus: "payment_pending",
        metadata: JSON.stringify({
          amountCents: totalCents,
          selectedPriority: input.selectedPriority,
          idempotencyKey: input.idempotencyKey,
        }),
      });

      // Handle deliberate failure simulation / card error
      if (input.simulateFailure) {
        await updateOfferStatus(offer.id, "payment_failed");
        await recordOfferEvent({
          offerId: offer.id,
          studentId: offer.studentId,
          familyId: offer.familyId,
          serviceId: offer.sourceServiceId,
          eventType: "payment_failed",
          actor: "Stripe Payment Gateway",
          previousStatus: "payment_pending",
          newStatus: "payment_failed",
          metadata: JSON.stringify({
            reason: "Card was declined or insufficient funds",
            idempotencyKey: input.idempotencyKey,
          }),
        });

        return {
          success: false,
          error: "Payment authorization failed. Please try a different card or retry.",
        };
      }

      const now = new Date();
      const mockPaymentIntentId = `pi_mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // Update offer to paid
      const updatedOffer = await updateOfferStatus(offer.id, "paid", {
        paidAt: now,
        acceptedAt: offer.acceptedAt || now,
        stripePaymentIntentId: mockPaymentIntentId,
        selectedPriority: input.selectedPriority,
      });

      // Record payment_completed
      await recordOfferEvent({
        offerId: offer.id,
        studentId: offer.studentId,
        familyId: offer.familyId,
        serviceId: offer.sourceServiceId,
        eventType: "payment_completed",
        actor: "Stripe Payment Gateway",
        previousStatus: "payment_pending",
        newStatus: "paid",
        metadata: JSON.stringify({
          amountCents: totalCents,
          paymentIntentId: mockPaymentIntentId,
          selectedPriority: input.selectedPriority,
        }),
      });

      // Record service_started
      await recordOfferEvent({
        offerId: offer.id,
        studentId: offer.studentId,
        familyId: offer.familyId,
        serviceId: offer.sourceServiceId,
        eventType: "service_started",
        actor: "Waypoint System",
        previousStatus: "paid",
        newStatus: "in_progress",
        metadata: JSON.stringify({
          purchasedTitle: offer.title,
          deliveryTime: input.selectedPriority && offer.priorityDeliveryTime ? offer.priorityDeliveryTime : offer.deliveryTime,
        }),
      });

      // Log in Student Case Activity Timeline
      try {
        await recordCaseActivity({
          studentContactId: offer.studentId,
          eventType: "task",
          title: `Support Purchased & Activated: ${offer.title}`,
          description: `Parent completed payment of $${(totalCents / 100).toFixed(2)}${
            input.selectedPriority ? " (with Priority Option)" : ""
          }. Service activated and added to student case.`,
          whyReason: "Payment confirmed via Stripe. Deliverable timeline scheduled.",
          ownerName: "Client Parent",
          ownerRole: "Parent",
          categoryColor: "green",
        });
      } catch (e) {
        console.warn("[SupportOffers] Case activity log error:", e);
      }

      return {
        success: true,
        offer: updatedOffer,
        paymentIntentId: mockPaymentIntentId,
        amountCharged: totalCents,
      };
    }),

  /**
   * Parent Portal: Decline offer.
   */
  portalDecline: publicProcedure
    .input(z.object({ offerId: z.number(), reason: z.string().optional() }))
    .mutation(async ({ input }) => {
      const offer = await getOfferById(input.offerId);
      if (!offer) throw new Error("Offer not found");

      const now = new Date();
      const updated = await updateOfferStatus(input.offerId, "declined", {
        declinedAt: now,
      });

      await recordOfferEvent({
        offerId: offer.id,
        studentId: offer.studentId,
        familyId: offer.familyId,
        serviceId: offer.sourceServiceId,
        eventType: "offer_declined",
        actor: "Client Parent",
        previousStatus: offer.status,
        newStatus: "declined",
        metadata: JSON.stringify({ reason: input.reason || "Declined by family" }),
      });

      return updated;
    }),
});
