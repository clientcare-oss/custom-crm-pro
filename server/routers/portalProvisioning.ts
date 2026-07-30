import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { contacts, users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { createClerkClient } from "@clerk/backend";

const clerkSecretKey =
  process.env.CLERK_SECRET_KEY ||
  "sk_test_U4yP1Lyw6R0y1ihGBLWu3R2GbB8is2jtabFMleZQvq";

const clerkClient = createClerkClient({ secretKey: clerkSecretKey });

export const portalProvisioningRouter = router({
  /**
   * Provisions a Client Portal account for a Parent Contact.
   * Can create a pre-activated user (no email confirmation needed) or send an invitation email.
   */
  provisionPortalAccess: protectedProcedure
    .input(
      z.object({
        contactId: z.number(),
        email: z.string().email(),
        password: z.string().min(8).optional().default("TestParent2026!"),
        skipEmailVerification: z.boolean().optional().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      // 1. Verify parent contact exists
      const parentContactList = await db
        .select()
        .from(contacts)
        .where(eq(contacts.id, input.contactId))
        .limit(1);

      if (parentContactList.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Parent contact not found",
        });
      }

      const parentContact = parentContactList[0];

      try {
        let clerkUserId = "";
        let isNewUser = false;

        // 2. Check if a Clerk user already exists with this email
        const existingUsers = await clerkClient.users.getUserList({
          emailAddress: [input.email],
        });

        if (existingUsers.data && existingUsers.data.length > 0) {
          const existingClerkUser = existingUsers.data[0];
          clerkUserId = existingClerkUser.id;

          // Update public metadata with client role & contactId
          await clerkClient.users.updateUserMetadata(clerkUserId, {
            publicMetadata: {
              role: "client",
              contactId: parentContact.id,
            },
          });
        } else if (input.skipEmailVerification) {
          // 3. Create a pre-activated user directly in Clerk (no email required)
          const newClerkUser = await clerkClient.users.createUser({
            emailAddress: [input.email],
            password: input.password,
            firstName: parentContact.firstName,
            lastName: parentContact.lastName,
            publicMetadata: {
              role: "client",
              contactId: parentContact.id,
            },
          });

          clerkUserId = newClerkUser.id;
          isNewUser = true;
        } else {
          // 4. Send an invitation email via Clerk
          await clerkClient.invitations.createInvitation({
            emailAddress: input.email,
            publicMetadata: {
              role: "client",
              contactId: parentContact.id,
            },
          });
        }

        // 5. Create or update internal user record in D1
        const existingAppUsers = await db
          .select()
          .from(users)
          .where(eq(users.email, input.email))
          .limit(1);

        let appUserId = parentContact.portalUserId;

        if (existingAppUsers.length > 0) {
          appUserId = existingAppUsers[0].id;
          await db
            .update(users)
            .set({ role: "client", openId: clerkUserId || `clerk-${parentContact.id}` })
            .where(eq(users.id, appUserId));
        } else {
          const insertResult = await db.insert(users).values({
            openId: clerkUserId || `clerk-${parentContact.id}`,
            email: input.email,
            name: `${parentContact.firstName} ${parentContact.lastName}`,
            role: "client",
          });
          appUserId = Number(insertResult.lastInsertRowid || 999);
        }

        // 6. Link portalUserId on the parent contact record
        await db
          .update(contacts)
          .set({ portalUserId: appUserId, email: input.email })
          .where(eq(contacts.id, parentContact.id));

        return {
          success: true,
          email: input.email,
          contactId: parentContact.id,
          portalUserId: appUserId,
          isNewUser,
          preActivatedPassword: input.skipEmailVerification ? input.password : null,
          message: input.skipEmailVerification
            ? `Account created & pre-activated! You can now log into /portal/login as ${input.email}`
            : `Invitation sent to ${input.email}`,
        };
      } catch (err: any) {
        console.error("[Portal Provisioning Error]", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to provision portal account: ${err.message || String(err)}`,
        });
      }
    }),

  /**
   * Retrieves the current portal access status for a contact.
   */
  getPortalStatus: protectedProcedure
    .input(z.object({ contactId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { isProvisioned: false };

      const contactList = await db
        .select()
        .from(contacts)
        .where(eq(contacts.id, input.contactId))
        .limit(1);

      if (contactList.length === 0) return { isProvisioned: false };
      const contact = contactList[0];

      const isProvisioned = Boolean(contact.portalUserId);

      return {
        isProvisioned,
        contactId: contact.id,
        email: contact.email,
        portalUserId: contact.portalUserId,
      };
    }),
});
