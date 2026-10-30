import { z } from "zod";
import {
  router,
  requireStaffModule,
  requireStaffPermission,
} from "../_core/trpc";
import {
  resolveStaffAccess,
  isProtectedOwnerAccount,
  CONFIRMED_STAFF_PROFILES,
} from "../_core/staffAccess";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import { getDb } from "../db";
import { contacts, users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { createClerkClient } from "@clerk/backend";
import { recordCaseActivity } from "../services/caseActivityService";

const clerkSecretKey =
  process.env.CLERK_SECRET_KEY ||
  "sk_test_U4yP1Lyw6R0y1ihGBLWu3R2GbB8is2jtabFMleZQvq";

const clerkClient = createClerkClient({ secretKey: clerkSecretKey });

async function assertTargetIsNotStaffAccount(params: {
  email?: string | null;
  userId?: number | null;
  openId?: string | null;
}) {
  const normalizedEmail = (params.email || "").trim().toLowerCase();
  if (normalizedEmail) {
    const matchedConfirmed = CONFIRMED_STAFF_PROFILES.find(
      p => p.email.toLowerCase() === normalizedEmail
    );
    if (matchedConfirmed) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message:
          "Client account administration cannot target or modify staff, developer, or administrator accounts.",
      });
    }
  }

  if (
    params.userId &&
    (isProtectedOwnerAccount(params.userId) ||
      CONFIRMED_STAFF_PROFILES.some(p => p.userId === Number(params.userId)))
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Client account administration cannot target or modify staff, developer, or administrator accounts.",
    });
  }

  if (params.userId || params.openId) {
    const resolved = await resolveStaffAccess({
      id: params.userId ?? undefined,
      openId: params.openId ?? undefined,
      email: normalizedEmail || undefined,
    });
    if (resolved.isStaff || resolved.hasAdminAccess || resolved.isProtectedOwner) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message:
          "Client account administration cannot target or modify staff, developer, or administrator accounts.",
      });
    }
  }
}

async function resolveTargetClientContact(contactId: number): Promise<any> {
  const database = await getDb();
  if (database) {
    try {
      const rows = await database
        .select()
        .from(contacts)
        .where(eq(contacts.id, contactId))
        .limit(1);
      if (rows.length > 0) return rows[0];
    } catch {}
  }
  const fallback = await db.getContactById(contactId);
  if (fallback) return fallback;
  throw new TRPCError({
    code: "NOT_FOUND",
    message: "Client contact not found",
  });
}

export const portalProvisioningRouter = router({
  /**
   * Provisions a Client Portal account for a Parent Contact.
   * Authorized for staff with `manage_portal_access` (including Call Center, Advocates, Operations, Management).
   * Strictly blocked from targeting staff/admin identities or cross-linking unrelated families.
   */
  provisionPortalAccess: requireStaffPermission("manage_portal_access")
    .input(
      z.object({
        contactId: z.number(),
        email: z.string().email(),
        password: z.string().min(8).optional().default("TestParent2026!"),
        skipEmailVerification: z.boolean().optional().default(true),
        role: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.role && input.role !== "client") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Clients cannot be promoted or provisioned into staff, advocate, or administrator roles.",
        });
      }

      const normalizedEmail = input.email.trim().toLowerCase();
      await assertTargetIsNotStaffAccount({ email: normalizedEmail });

      const parentContact = await resolveTargetClientContact(input.contactId);
      await assertTargetIsNotStaffAccount({
        email: parentContact.email,
        userId: parentContact.portalUserId,
      });

      // Prevent linking an email that already belongs to a different unrelated family
      const allContacts = await db.getContactsByOwner(ctx.user.id);
      const conflictingContact = allContacts.find(
        (c: any) =>
          c.id !== parentContact.id &&
          c.parentContactId !== parentContact.id &&
          parentContact.parentContactId !== c.id &&
          c.email &&
          String(c.email).trim().toLowerCase() === normalizedEmail &&
          c.portalUserId
      );
      if (conflictingContact) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "This email is already provisioned for a different family account. Cross-family portal sharing is prohibited.",
        });
      }

      const isTestEnv = process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);
      const database = await getDb();

      try {
        let clerkUserId = "";
        let isNewUser = false;

        if (!isTestEnv) {
          // Check if a Clerk user already exists with this email
          const existingUsers = await clerkClient.users.getUserList({
            emailAddress: [normalizedEmail],
          });

          if (existingUsers.data && existingUsers.data.length > 0) {
            const existingClerkUser = existingUsers.data[0];
            clerkUserId = existingClerkUser.id;
            const existingMetaRole = (existingClerkUser.publicMetadata as any)?.role;
            if (existingMetaRole && existingMetaRole !== "client") {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: "Cannot overwrite or modify a staff or administrator Clerk account via client provisioning.",
              });
            }

            await clerkClient.users.updateUserMetadata(clerkUserId, {
              publicMetadata: {
                role: "client",
                contactId: parentContact.id,
              },
            });
          } else if (input.skipEmailVerification) {
            const newClerkUser = await clerkClient.users.createUser({
              emailAddress: [normalizedEmail],
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

            if (newClerkUser.emailAddresses) {
              for (const emailObj of newClerkUser.emailAddresses) {
                try {
                  await clerkClient.emailAddresses.updateEmailAddress(emailObj.id, { verified: true });
                } catch {}
              }
            }
          } else {
            await clerkClient.invitations.createInvitation({
              emailAddress: normalizedEmail,
              publicMetadata: {
                role: "client",
                contactId: parentContact.id,
              },
            });
          }
        } else {
          clerkUserId = `clerk-client-${parentContact.id}`;
          isNewUser = !parentContact.portalUserId;
        }

        let appUserId = parentContact.portalUserId || parentContact.id;

        if (database && !isTestEnv) {
          const existingAppUsers = await database
            .select()
            .from(users)
            .where(eq(users.email, normalizedEmail))
            .limit(1);

          if (existingAppUsers.length > 0) {
            await assertTargetIsNotStaffAccount({
              userId: existingAppUsers[0].id,
              openId: existingAppUsers[0].openId,
              email: existingAppUsers[0].email,
            });
            appUserId = existingAppUsers[0].id;
            await database
              .update(users)
              .set({ role: "client", openId: clerkUserId || `clerk-${parentContact.id}` })
              .where(eq(users.id, appUserId));
          } else {
            const insertResult = await database.insert(users).values({
              openId: clerkUserId || `clerk-${parentContact.id}`,
              email: normalizedEmail,
              name: `${parentContact.firstName} ${parentContact.lastName}`,
              role: "client",
            });
            appUserId = Number((insertResult as any).lastInsertRowid || parentContact.id);
          }

          await database
            .update(contacts)
            .set({ portalUserId: appUserId, email: normalizedEmail, portalAccess: "active" })
            .where(eq(contacts.id, parentContact.id));
        }

        await db.updateContact(parentContact.id, ctx.user.id, {
          portalUserId: appUserId,
          email: normalizedEmail,
          portalAccess: "active",
        });

        try {
          await recordCaseActivity({
            studentContactId: parentContact.id,
            caseId: parentContact.caseId || `WP-${parentContact.id}`,
            eventType: "portal_provisioned",
            title: "Parent Portal Access Provisioned",
            description: `Client portal provisioned for ${normalizedEmail} by ${ctx.user.name || "Waypoint Staff"}`,
            ownerName: ctx.user.name || "Waypoint Staff",
            ownerRole: ctx.staffAccess?.primaryRole || "Staff",
            eventDate: new Date(),
          });
        } catch {}

        return {
          success: true,
          email: normalizedEmail,
          contactId: parentContact.id,
          portalUserId: appUserId,
          isNewUser,
          preActivatedPassword: input.skipEmailVerification ? input.password : null,
          message: input.skipEmailVerification
            ? `Account created & pre-activated! You can now log into /portal/login as ${normalizedEmail}`
            : `Invitation sent to ${normalizedEmail}`,
        };
      } catch (err: any) {
        if (err instanceof TRPCError) throw err;
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
  getPortalStatus: requireStaffModule("contacts", "view")
    .input(z.object({ contactId: z.number() }))
    .query(async ({ input }) => {
      try {
        const contact = await resolveTargetClientContact(input.contactId);
        const isProvisioned = Boolean(contact.portalUserId || contact.portalAccess === "active");
        return {
          isProvisioned,
          contactId: contact.id,
          email: contact.email,
          portalUserId: contact.portalUserId,
          portalAccess: contact.portalAccess || (isProvisioned ? "active" : "inactive"),
        };
      } catch {
        return { isProvisioned: false };
      }
    }),

  /**
   * Resends a Client Portal invitation email via Clerk.
   */
  resendPortalLink: requireStaffPermission("manage_portal_access")
    .input(
      z.object({
        contactId: z.number(),
        email: z.string().email(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const normalizedEmail = input.email.trim().toLowerCase();
      await assertTargetIsNotStaffAccount({ email: normalizedEmail });
      const parentContact = await resolveTargetClientContact(input.contactId);

      const isTestEnv = process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);
      try {
        if (!isTestEnv) {
          await clerkClient.invitations.createInvitation({
            emailAddress: normalizedEmail,
            publicMetadata: {
              role: "client",
              contactId: parentContact.id,
            },
          });
        }

        try {
          await recordCaseActivity({
            studentContactId: parentContact.id,
            caseId: parentContact.caseId || `WP-${parentContact.id}`,
            eventType: "portal_invite_resent",
            title: "Parent Portal Invitation Resent",
            description: `Portal invitation resent to ${normalizedEmail} by ${ctx.user.name || "Waypoint Staff"}`,
            ownerName: ctx.user.name || "Waypoint Staff",
            ownerRole: ctx.staffAccess?.primaryRole || "Staff",
            eventDate: new Date(),
          });
        } catch {}

        return {
          success: true,
          message: `Portal invitation link resent to ${normalizedEmail}!`,
        };
      } catch (err: any) {
        if (err instanceof TRPCError) throw err;
        console.error("[Portal Resend Error]", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to resend portal link: ${err.message || String(err)}`,
        });
      }
    }),

  /**
   * Enable or disable a client's portal access.
   */
  setPortalAccessEnabled: requireStaffPermission("manage_portal_access")
    .input(
      z.object({
        contactId: z.number(),
        enabled: z.boolean(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const contact = await resolveTargetClientContact(input.contactId);
      await assertTargetIsNotStaffAccount({
        email: contact.email,
        userId: contact.portalUserId,
      });

      const nextStatus = input.enabled ? "active" : "disabled";
      await db.updateContact(contact.id, ctx.user.id, {
        portalAccess: nextStatus,
      });

      try {
        await recordCaseActivity({
          studentContactId: contact.id,
          caseId: contact.caseId || `WP-${contact.id}`,
          eventType: "portal_access_updated",
          title: input.enabled ? "Client Portal Access Enabled" : "Client Portal Access Disabled",
          description: `Portal access set to ${nextStatus} by ${ctx.user.name || "Waypoint Staff"}${input.reason ? ` (${input.reason})` : ""}`,
          ownerName: ctx.user.name || "Waypoint Staff",
          ownerRole: ctx.staffAccess?.primaryRole || "Staff",
          eventDate: new Date(),
        });
      } catch {}

      return {
        success: true,
        contactId: contact.id,
        portalAccess: nextStatus,
      };
    }),
});
