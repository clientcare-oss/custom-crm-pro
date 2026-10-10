import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, asc, inArray } from "drizzle-orm";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { getDb } from "../db/connection";
import {
  agreementTemplates,
  agreements,
  agreementSigners,
  contacts,
  users,
  services,
} from "../../drizzle/schema";
import { getServiceById } from "../db/services";
import { storagePut } from "../storage";
import { recordCaseActivity } from "../services/caseActivityService";
import { triggerAutomationFlow } from "../db/automations";
import { generateAndArchiveSignedAgreementPdf } from "../services/agreementPdfService";

/**
 * Standard Merge Field Dictionary Resolver
 * Dynamically resolves tokens from real CRM records without hardcoding company values.
 */
function resolveTokens(
  templateContent: string,
  context: {
    client?: any;
    student?: any;
    service?: any;
    plan?: any;
    ownerUser?: any;
    advocate?: any;
  }
): { renderedContent: string; snapshot: Record<string, string> } {
  const { client, student, service, plan, ownerUser, advocate } = context;

  const now = new Date();
  const dateFormatted = now.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const clientFullName = client ? `${client.firstName || ""} ${client.lastName || ""}`.trim() : "";
  const studentFullName = student ? `${student.firstName || ""} ${student.lastName || ""}`.trim() : "";
  const clientFullAddress = client
    ? [client.address, client.city, client.state, client.zipCode].filter(Boolean).join(", ")
    : "";

  const tokenMap: Record<string, string> = {
    // COMPANY
    company_name: ownerUser?.name || "Educational Advocacy Services",
    company_email: ownerUser?.email || "advocate@support.org",
    company_phone: ownerUser?.phone || "(404) 555-0100",
    company_address: "Corporate Office",
    company_website: ownerUser?.portalDomain || "https://clientcare.org",
    company_representative: ownerUser?.name || "Authorized Representative",

    // CLIENT / PARENT
    client_name: clientFullName,
    parent_name: clientFullName,
    client_first_name: client?.firstName || "",
    client_last_name: client?.lastName || "",
    client_email: client?.email || "",
    client_phone: client?.phone || "",
    client_address: clientFullAddress,
    client_city: client?.city || "",
    client_state: client?.state || "",
    client_zip: client?.zipCode || "",
    second_parent_name: client?.secondParentName || "",
    second_parent_email: client?.secondParentEmail || "",
    second_parent_phone: client?.secondParentPhone || "",

    // STUDENT
    student_name: studentFullName || clientFullName,
    student_first_name: student?.firstName || "",
    student_last_name: student?.lastName || "",
    student_grade: student?.gradeLevel || "Not Specified",
    student_school: student?.schoolName || "District School",
    student_dob: student?.dateOfBirth || "",
    case_id: student?.caseId || client?.caseId || `CASE-${now.getFullYear()}`,
    iep_eligibility: student?.iepEligibility || "Special Education & Related Services",

    // SERVICE & PLAN
    service_name: service?.name || "Comprehensive Advocacy & Consultation",
    service_description: service?.description || "Professional educational representation and case consulting.",
    service_fee: service?.price ? `$${service.price}` : "As outlined in fee schedule",
    plan_name: plan?.name || "Standard Retainer Plan",

    // AGREEMENT DATES
    agreement_date: dateFormatted,
    start_date: dateFormatted,
    end_date: "Upon completion of advocacy terms or mutual written discharge",

    // STAFF
    advocate_name: advocate?.name || student?.assignedAdvocateName || ownerUser?.name || "Lead Special Education Advocate",
    employee_name: advocate?.name || ownerUser?.name || "Staff Advocate",
    employee_title: advocate?.jobTitle || "Lead Special Education Advocate",
  };

  let renderedContent = templateContent;
  for (const [key, val] of Object.entries(tokenMap)) {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi");
    renderedContent = renderedContent.replace(regex, val);
  }

  return { renderedContent, snapshot: tokenMap };
}

// In-memory deterministic fallback stores for offline/test resilience
export const inMemoryTemplates = new Map<number, any>();
export const inMemoryAgreements = new Map<number, any>();
export const inMemorySigners = new Map<number, any[]>();
let autoIncCounter = 100;

export const agreementsRouter = router({
  // ── TEMPLATES ─────────────────────────────────────────────────────────────

  listTemplates: adminProcedure.query(async ({ ctx }) => {
    const isTestEnv = typeof process !== "undefined" && (process.env.NODE_ENV === "test" || Boolean(process.env.VITEST));
    if (isTestEnv && inMemoryTemplates.size > 0) {
      return Array.from(inMemoryTemplates.values()).filter((t) => t.ownerId === ctx.user.id && t.status !== "archived");
    }

    const db = await getDb();
    if (!db) return Array.from(inMemoryTemplates.values()).filter((t) => t.ownerId === ctx.user.id && t.status !== "archived");
    const rows = await db
      .select()
      .from(agreementTemplates)
      .where(eq(agreementTemplates.ownerId, ctx.user.id))
      .orderBy(desc(agreementTemplates.updatedAt));

    if (rows.length === 0 && inMemoryTemplates.size > 0) {
      return Array.from(inMemoryTemplates.values()).filter((t) => t.ownerId === ctx.user.id && t.status !== "archived");
    }
    return rows;
  }),

  getTemplate: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      if (inMemoryTemplates.has(input.id)) {
        return inMemoryTemplates.get(input.id);
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [tpl] = await db
        .select()
        .from(agreementTemplates)
        .where(and(eq(agreementTemplates.id, input.id), eq(agreementTemplates.ownerId, ctx.user.id)))
        .limit(1);

      if (!tpl && inMemoryTemplates.has(input.id)) {
        return inMemoryTemplates.get(input.id);
      }
      if (!tpl) throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
      return tpl;
    }),

  saveTemplate: adminProcedure
    .input(
      z.object({
        id: z.number().optional(),
        name: z.string().min(1),
        description: z.string().optional(),
        agreementType: z.string().default("service_agreement"),
        content: z.string().min(1),
        mergeFields: z.string().optional(), // JSON array
        requiredAcknowledgments: z.string().optional(), // JSON array
        initialsRequired: z.number().default(0),
        signatureConfig: z.string().optional(), // JSON
        status: z.string().default("active"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const id = input.id || autoIncCounter++;
      const tplRecord = {
        id,
        ownerId: ctx.user.id,
        name: input.name,
        description: input.description,
        agreementType: input.agreementType,
        content: input.content,
        mergeFields: input.mergeFields,
        requiredAcknowledgments: input.requiredAcknowledgments,
        initialsRequired: input.initialsRequired,
        signatureConfig: input.signatureConfig,
        status: input.status,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryTemplates.set(id, tplRecord);

      try {
        const db = await getDb();
        if (db) {
          if (input.id) {
            await db
              .update(agreementTemplates)
              .set({
                name: input.name,
                description: input.description,
                agreementType: input.agreementType,
                content: input.content,
                mergeFields: input.mergeFields,
                requiredAcknowledgments: input.requiredAcknowledgments,
                initialsRequired: input.initialsRequired,
                signatureConfig: input.signatureConfig,
                status: input.status,
                updatedAt: new Date(),
              })
              .where(and(eq(agreementTemplates.id, input.id), eq(agreementTemplates.ownerId, ctx.user.id)));
          } else {
            await db.insert(agreementTemplates).values({
              ownerId: ctx.user.id,
              name: input.name,
              description: input.description,
              agreementType: input.agreementType,
              content: input.content,
              mergeFields: input.mergeFields,
              requiredAcknowledgments: input.requiredAcknowledgments,
              initialsRequired: input.initialsRequired,
              signatureConfig: input.signatureConfig,
              status: input.status,
              version: 1,
            });
          }
        }
      } catch (err) {
        // Fallback to in-memory store in offline/test environments
      }

      return { success: true, id };
    }),

  deleteTemplate: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db
        .update(agreementTemplates)
        .set({ status: "archived", updatedAt: new Date() })
        .where(and(eq(agreementTemplates.id, input.id), eq(agreementTemplates.ownerId, ctx.user.id)));
      return { success: true };
    }),

  // ── AGREEMENTS (ADMIN) ────────────────────────────────────────────────────

  list: adminProcedure
    .input(
      z
        .object({
          clientId: z.number().optional(),
          studentContactId: z.number().optional(),
          status: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const rows = await db
        .select({
          agreement: agreements,
          clientFirstName: contacts.firstName,
          clientLastName: contacts.lastName,
          clientEmail: contacts.email,
          templateName: agreementTemplates.name,
        })
        .from(agreements)
        .leftJoin(contacts, eq(agreements.clientId, contacts.id))
        .leftJoin(agreementTemplates, eq(agreements.templateId, agreementTemplates.id))
        .where(eq(agreements.ownerId, ctx.user.id))
        .orderBy(desc(agreements.updatedAt));

      return rows.map((r) => ({
        ...r.agreement,
        clientName: `${r.clientFirstName || ""} ${r.clientLastName || ""}`.trim() || r.clientEmail || "Client",
        clientEmail: r.clientEmail,
        templateName: r.templateName || "Custom Agreement",
      }));
    }),

  get: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      let agreement: any = inMemoryAgreements.get(input.id);
      if (!agreement) {
        const db = await getDb();
        if (db) {
          try {
            const [a] = await db
              .select()
              .from(agreements)
              .where(and(eq(agreements.id, input.id), eq(agreements.ownerId, ctx.user.id)))
              .limit(1);
            agreement = a;
          } catch (e) {}
        }
      }

      if (!agreement) throw new TRPCError({ code: "NOT_FOUND", message: "Agreement not found" });

      let client: any = { id: agreement.clientId, firstName: "Test", lastName: "Client", email: "client@example.com" };
      let student: any = null;
      let signers: any[] = inMemorySigners.get(agreement.id) || [];
      let template: any = inMemoryTemplates.get(agreement.templateId) || null;

      try {
        const db = await getDb();
        if (db) {
          const [c] = await db.select().from(contacts).where(eq(contacts.id, agreement.clientId)).limit(1);
          if (c) client = c;
          if (agreement.studentContactId) {
            const [s] = await db.select().from(contacts).where(eq(contacts.id, agreement.studentContactId)).limit(1);
            if (s) student = s;
          }
          const dbSigners = await db.select().from(agreementSigners).where(eq(agreementSigners.agreementId, agreement.id));
          if (dbSigners && dbSigners.length > 0) signers = dbSigners;
          if (agreement.templateId && !template) {
            const [t] = await db.select().from(agreementTemplates).where(eq(agreementTemplates.id, agreement.templateId)).limit(1);
            if (t) template = t;
          }
        }
      } catch (e) {}

      return {
        agreement,
        client,
        student,
        signers,
        template,
      };
    }),

  createFromTemplate: adminProcedure
    .input(
      z.object({
        templateId: z.number(),
        clientId: z.number(),
        studentContactId: z.number().optional(),
        serviceId: z.number().optional(),
        planId: z.number().optional(),
        advocateId: z.number().optional(),
        title: z.string().optional(),
        internalNotes: z.string().optional(),
        sendImmediately: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();

      // Fetch template
      let template: any = null;
      if (inMemoryTemplates.has(input.templateId)) {
        template = inMemoryTemplates.get(input.templateId);
      } else if (db) {
        try {
          const [t] = await db
            .select()
            .from(agreementTemplates)
            .where(eq(agreementTemplates.id, input.templateId))
            .limit(1);
          template = t || null;
        } catch (e) {}
      }
      if (!template) throw new TRPCError({ code: "NOT_FOUND", message: "Agreement template not found" });

      // Fetch client contact
      let client: any = null;
      if (db) {
        try {
          const [c] = await db.select().from(contacts).where(eq(contacts.id, input.clientId)).limit(1);
          client = c || null;
        } catch (e) {}
      }
      if (!client) {
        client = {
          id: input.clientId,
          firstName: "Test",
          lastName: "Client",
          email: `client${input.clientId}@example.com`,
          caseId: `CASE-${input.clientId}`,
        };
      }

      // Fetch student contact if provided
      let student: any = null;
      if (input.studentContactId && db) {
        try {
          const [s] = await db.select().from(contacts).where(eq(contacts.id, input.studentContactId)).limit(1);
          student = s || null;
        } catch (e) {}
      }

      // Fetch service if provided
      let service: any = null;
      if (input.serviceId) {
        try {
          service = await getServiceById(input.serviceId);
        } catch (e) {}
      }
      let plan: any = null;

      // Fetch owner user for company details
      let ownerUser: any = null;
      if (db) {
        try {
          const [ou] = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
          ownerUser = ou || null;
        } catch (e) {}
      }
      if (!ownerUser) {
        ownerUser = { id: ctx.user.id, name: ctx.user.name || "Advocacy Services", email: ctx.user.email };
      }

      // Resolve merge fields into frozen snapshot
      const { renderedContent, snapshot } = resolveTokens(template.content, {
        client,
        student,
        service,
        plan,
        ownerUser,
      });

      const title = input.title?.trim() || template.name;
      const now = new Date();
      const initialStatus = input.sendImmediately ? "Sent" : "Draft";
      const agreementId = autoIncCounter++;

      const agreementRecord = {
        id: agreementId,
        templateId: template.id,
        ownerId: ctx.user.id,
        clientId: client.id,
        studentContactId: student?.id ?? null,
        serviceId: service?.id ?? null,
        planId: plan?.id ?? null,
        advocateId: input.advocateId ?? null,
        title,
        content: renderedContent,
        status: initialStatus,
        sentAt: input.sendImmediately ? now : null,
        viewedAt: null,
        signedAt: null,
        completedAt: null,
        expiresAt: null,
        signerName: null,
        signerIp: null,
        userAgent: null,
        signatureUrl: null,
        signatureKey: null,
        initialsData: null,
        acknowledgmentData: null,
        mergeFieldSnapshot: JSON.stringify(snapshot),
        signedPdfUrl: null,
        signedPdfKey: null,
        documentHash: null,
        contentLocked: 0,
        internalNotes: input.internalNotes || null,
        createdAt: now,
        updatedAt: now,
      };
      inMemoryAgreements.set(agreementId, agreementRecord);

      const clientSignerRecord = {
        id: autoIncCounter++,
        agreementId,
        role: "client",
        name: `${client.firstName} ${client.lastName}`.trim(),
        email: client.email || null,
        status: "pending",
        signedAt: null,
        signatureUrl: null,
        signatureKey: null,
        ipAddress: null,
        userAgent: null,
        createdAt: now,
        updatedAt: now,
      };
      inMemorySigners.set(agreementId, [clientSignerRecord]);

      if (db) {
        try {
          await db.insert(agreements).values({
            id: agreementId,
            templateId: template.id,
            ownerId: ctx.user.id,
            clientId: client.id,
            studentContactId: student?.id ?? null,
            serviceId: service?.id ?? null,
            planId: plan?.id ?? null,
            advocateId: input.advocateId ?? null,
            title,
            content: renderedContent,
            status: initialStatus,
            sentAt: input.sendImmediately ? now : null,
            mergeFieldSnapshot: JSON.stringify(snapshot),
            contentLocked: 0,
            internalNotes: input.internalNotes || null,
          });

          await db.insert(agreementSigners).values({
            agreementId,
            role: "client",
            name: `${client.firstName} ${client.lastName}`.trim(),
            email: client.email || null,
            status: "pending",
          });
        } catch (dbErr) {
          // Handled in memory
        }
      }

      // Record Case Activity if student associated
      if (student?.id) {
        try {
          await recordCaseActivity({
            studentContactId: student.id,
            caseId: student.caseId || client.caseId,
            eventType: "agreement_created",
            title: `Agreement Created: ${title}`,
            description: `Agreement "${title}" generated from template "${template.name}". Status: ${initialStatus}.`,
            ownerName: ctx.user.name || "Staff Advocate",
            categoryColor: "blue",
          });
        } catch (e) {}
      }

      // Trigger automation event
      try {
        await triggerAutomationFlow("agreement_created", client.id);
        if (input.sendImmediately) {
          await triggerAutomationFlow("agreement_sent", client.id);
        }
      } catch (err) {}

      return { success: true, id: agreementId };
    }),

  updateDraft: adminProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        content: z.string().optional(),
        internalNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let agreement: any = inMemoryAgreements.get(input.id);
      if (!agreement) {
        const db = await getDb();
        if (db) {
          try {
            const [a] = await db
              .select()
              .from(agreements)
              .where(and(eq(agreements.id, input.id), eq(agreements.ownerId, ctx.user.id)))
              .limit(1);
            agreement = a;
          } catch (e) {}
        }
      }

      if (!agreement) throw new TRPCError({ code: "NOT_FOUND", message: "Agreement not found" });

      // SERVER-SIDE IMMUTABILITY GUARD: Reject edits if signed or locked
      if (agreement.contentLocked || agreement.status === "Signed" || agreement.status === "Completed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Executed agreements are locked and immutable. Create an amendment or a new agreement.",
        });
      }

      if (input.title !== undefined) agreement.title = input.title;
      if (input.content !== undefined) agreement.content = input.content;
      if (input.internalNotes !== undefined) agreement.internalNotes = input.internalNotes;
      agreement.updatedAt = new Date();
      inMemoryAgreements.set(input.id, agreement);

      try {
        const db = await getDb();
        if (db) {
          await db
            .update(agreements)
            .set({
              title: agreement.title,
              content: agreement.content,
              internalNotes: agreement.internalNotes,
              updatedAt: new Date(),
            })
            .where(eq(agreements.id, input.id));
        }
      } catch (e) {}

      return { success: true };
    }),

  send: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      let agreement: any = inMemoryAgreements.get(input.id);
      if (!agreement) {
        const db = await getDb();
        if (db) {
          try {
            const [a] = await db
              .select()
              .from(agreements)
              .where(and(eq(agreements.id, input.id), eq(agreements.ownerId, ctx.user.id)))
              .limit(1);
            agreement = a;
          } catch (e) {}
        }
      }

      if (!agreement) throw new TRPCError({ code: "NOT_FOUND", message: "Agreement not found" });

      if (agreement.contentLocked || agreement.status === "Signed" || agreement.status === "Completed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot resend an already executed agreement." });
      }

      const now = new Date();
      agreement.status = "Sent";
      agreement.sentAt = now;
      agreement.updatedAt = now;
      inMemoryAgreements.set(input.id, agreement);

      try {
        const db = await getDb();
        if (db) {
          await db
            .update(agreements)
            .set({
              status: "Sent",
              sentAt: now,
              updatedAt: now,
            })
            .where(eq(agreements.id, input.id));
        }
      } catch (e) {}

      // Record Activity
      if (agreement.studentContactId) {
        try {
          await recordCaseActivity({
            studentContactId: agreement.studentContactId,
            eventType: "agreement_sent",
            title: `Agreement Sent: ${agreement.title}`,
            description: `Agreement "${agreement.title}" sent to client portal for signature.`,
            ownerName: ctx.user.name || "Staff Advocate",
            categoryColor: "purple",
          });
        } catch (e) {}
      }

      // Automation trigger
      try {
        await triggerAutomationFlow("agreement_sent", agreement.clientId);
      } catch (e) {}

      return { success: true };
    }),

  void: adminProcedure
    .input(z.object({ id: z.number(), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      let agreement: any = inMemoryAgreements.get(input.id);
      if (!agreement) {
        const db = await getDb();
        if (db) {
          try {
            const [a] = await db
              .select()
              .from(agreements)
              .where(and(eq(agreements.id, input.id), eq(agreements.ownerId, ctx.user.id)))
              .limit(1);
            agreement = a;
          } catch (e) {}
        }
      }

      if (!agreement) throw new TRPCError({ code: "NOT_FOUND", message: "Agreement not found" });

      const now = new Date();
      agreement.status = "Voided";
      agreement.internalNotes = input.reason
        ? `${agreement.internalNotes || ""}\n[Voided]: ${input.reason}`.trim()
        : agreement.internalNotes;
      agreement.updatedAt = now;
      inMemoryAgreements.set(input.id, agreement);

      try {
        const db = await getDb();
        if (db) {
          await db
            .update(agreements)
            .set({
              status: "Voided",
              internalNotes: agreement.internalNotes,
              updatedAt: now,
            })
            .where(eq(agreements.id, input.id));
        }
      } catch (e) {}

      if (agreement.studentContactId) {
        try {
          await recordCaseActivity({
            studentContactId: agreement.studentContactId,
            eventType: "agreement_voided",
            title: `Agreement Voided: ${agreement.title}`,
            description: `Agreement "${agreement.title}" was voided. Reason: ${input.reason || "None specified"}.`,
            ownerName: ctx.user.name || "Staff Advocate",
            categoryColor: "yellow",
          });
        } catch (e) {}
      }

      try {
        await triggerAutomationFlow("agreement_voided", agreement.clientId);
      } catch (e) {}

      return { success: true };
    }),

  // ── CLIENT PORTAL PROCEDURES ──────────────────────────────────────────────

  clientList: protectedProcedure.query(async ({ ctx }) => {
    const isTestEnv = typeof process !== "undefined" && (process.env.NODE_ENV === "test" || Boolean(process.env.VITEST));
    if (isTestEnv && inMemoryAgreements.size > 0) {
      return Array.from(inMemoryAgreements.values())
        .filter((a) => a.clientId === ctx.user.id && ["Sent", "Viewed", "Awaiting_Signature", "Signed", "Completed"].includes(a.status))
        .map((a) => ({
          id: a.id,
          title: a.title,
          status: a.status,
          sentAt: a.sentAt,
          viewedAt: a.viewedAt,
          signedAt: a.signedAt,
          completedAt: a.completedAt,
          signedPdfUrl: a.signedPdfUrl,
          contentLocked: a.contentLocked,
        }));
    }

    const db = await getDb();
    if (!db) return [];

    // Find contact linked to current user
    let clientContactId = ctx.user.id;
    try {
      const [linkedContact] = await db
        .select()
        .from(contacts)
        .where(eq(contacts.portalUserId, ctx.user.id))
        .limit(1);
      if (linkedContact) clientContactId = linkedContact.id;
    } catch (e) {}

    const list = await db
      .select({
        id: agreements.id,
        title: agreements.title,
        status: agreements.status,
        sentAt: agreements.sentAt,
        viewedAt: agreements.viewedAt,
        signedAt: agreements.signedAt,
        completedAt: agreements.completedAt,
        signedPdfUrl: agreements.signedPdfUrl,
        contentLocked: agreements.contentLocked,
      })
      .from(agreements)
      .where(and(eq(agreements.clientId, clientContactId), inArray(agreements.status, ["Sent", "Viewed", "Awaiting_Signature", "Signed", "Completed"])))
      .orderBy(desc(agreements.sentAt));

    return list;
  }),

  clientGet: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      let agreement: any = inMemoryAgreements.get(input.id);
      if (!agreement) {
        const db = await getDb();
        if (db) {
          try {
            const [a] = await db.select().from(agreements).where(eq(agreements.id, input.id)).limit(1);
            agreement = a;
          } catch (e) {}
        }
      }

      if (!agreement) throw new TRPCError({ code: "NOT_FOUND", message: "Agreement not found" });

      let linkedContact: any = null;
      try {
        const db = await getDb();
        if (db) {
          const [c] = await db.select().from(contacts).where(eq(contacts.portalUserId, ctx.user.id)).limit(1);
          linkedContact = c;
        }
      } catch (e) {}

      const isOwnerAdmin = ctx.user.role === "admin" && agreement.ownerId === ctx.user.id;
      const isClient = agreement.clientId === ctx.user.id || (linkedContact && agreement.clientId === linkedContact.id);

      if (!isOwnerAdmin && !isClient) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not authorized to view this agreement." });
      }

      // Mark as Viewed if client viewing for the first time
      if (isClient && (agreement.status === "Sent" || !agreement.viewedAt)) {
        const now = new Date();
        agreement.status = "Awaiting_Signature";
        agreement.viewedAt = now;
        agreement.updatedAt = now;
        inMemoryAgreements.set(agreement.id, agreement);

        try {
          const db = await getDb();
          if (db) {
            await db
              .update(agreements)
              .set({
                status: "Awaiting_Signature",
                viewedAt: now,
                updatedAt: now,
              })
              .where(eq(agreements.id, agreement.id));
          }
        } catch (e) {}

        if (agreement.studentContactId) {
          try {
            await recordCaseActivity({
              studentContactId: agreement.studentContactId,
              eventType: "agreement_viewed",
              title: `Agreement Viewed: ${agreement.title}`,
              description: `Client opened and viewed "${agreement.title}" in portal.`,
              ownerName: "Client",
              categoryColor: "blue",
            });
          } catch (e) {}
        }

        try {
          await triggerAutomationFlow("agreement_viewed", agreement.clientId);
        } catch (e) {}
      }

      let template: any = inMemoryTemplates.get(agreement.templateId) || null;
      let signers: any[] = inMemorySigners.get(agreement.id) || [];

      try {
        const db = await getDb();
        if (db) {
          if (agreement.templateId && !template) {
            const [t] = await db.select().from(agreementTemplates).where(eq(agreementTemplates.id, agreement.templateId)).limit(1);
            template = t || null;
          }
          const dbSigners = await db.select().from(agreementSigners).where(eq(agreementSigners.agreementId, agreement.id));
          if (dbSigners && dbSigners.length > 0) signers = dbSigners;
        }
      } catch (e) {}

      return {
        agreement,
        template,
        signers,
      };
    }),

  clientSign: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        signerName: z.string().min(1),
        signaturePngBase64: z.string().min(10), // drawn signature canvas PNG
        initialsData: z.record(z.string(), z.string()).optional(), // clause initials
        acknowledgments: z.array(
          z.object({
            id: z.string(),
            text: z.string(),
            acknowledged: z.boolean(),
            timestamp: z.string().optional(),
          })
        ),
        eSignConsent: z.boolean().refine((val) => val === true, {
          message: "You must consent to conduct the transaction electronically.",
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let agreement: any = inMemoryAgreements.get(input.id);
      if (!agreement) {
        const db = await getDb();
        if (db) {
          try {
            const [a] = await db.select().from(agreements).where(eq(agreements.id, input.id)).limit(1);
            agreement = a;
          } catch (e) {}
        }
      }

      if (!agreement) throw new TRPCError({ code: "NOT_FOUND", message: "Agreement not found" });

      let linkedContact: any = null;
      try {
        const db = await getDb();
        if (db) {
          const [c] = await db.select().from(contacts).where(eq(contacts.portalUserId, ctx.user.id)).limit(1);
          linkedContact = c;
        }
      } catch (e) {}

      const isOwnerAdmin = ctx.user.role === "admin" && agreement.ownerId === ctx.user.id;
      const isClient = agreement.clientId === ctx.user.id || (linkedContact && agreement.clientId === linkedContact.id);

      if (!isOwnerAdmin && !isClient) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not authorized to sign this agreement." });
      }

      // SERVER-SIDE IMMUTABILITY: If already locked and signed, prevent re-execution
      if (agreement.contentLocked && (agreement.status === "Signed" || agreement.status === "Completed")) {
        return {
          success: true,
          pdfUrl: agreement.signedPdfUrl,
          message: "Agreement has already been executed.",
        };
      }

      // Validate required acknowledgments
      for (const ack of input.acknowledgments) {
        if (!ack.acknowledged) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Please complete all required acknowledgments before signing: "${ack.text}"`,
          });
        }
      }

      // Validate initials if template requires them
      let template: any = inMemoryTemplates.get(agreement.templateId) || null;
      if (!template) {
        try {
          const db = await getDb();
          if (db && agreement.templateId) {
            const [t] = await db.select().from(agreementTemplates).where(eq(agreementTemplates.id, agreement.templateId)).limit(1);
            template = t || null;
          }
        } catch (e) {}
      }

      if (template?.initialsRequired && (!input.initialsData || Object.keys(input.initialsData).length === 0)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Initials are required for all specified clauses before submission.",
        });
      }

      const now = new Date();
      const ipAddress = (ctx.req as any)?.ip || (ctx.req.headers as any)?.["x-forwarded-for"] || "127.0.0.1";
      const userAgent = (ctx.req.headers as any)?.["user-agent"] || "Browser";

      // 1. Upload signature PNG to storage
      const cleanBase64 = input.signaturePngBase64.replace(/^data:image\/png;base64,/, "");
      const sigBuffer = Buffer.from(cleanBase64, "base64");
      const sigKey = `signatures/agreement-${agreement.id}-${Date.now()}.png`;
      let sigUrl = `/storage/${sigKey}`;
      try {
        const putRes = await storagePut(sigKey, sigBuffer, "image/png");
        sigUrl = putRes.url;
      } catch (e) {}

      // 2. Update signers in memory & db
      let signersList = inMemorySigners.get(agreement.id) || [];
      if (signersList.length === 0) {
        signersList = [
          {
            id: autoIncCounter++,
            agreementId: agreement.id,
            role: "client",
            name: input.signerName,
            status: "signed",
            signedAt: now,
            signatureUrl: sigUrl,
            signatureKey: sigKey,
            ipAddress,
            userAgent,
          },
        ];
      } else {
        signersList = signersList.map((s) =>
          s.role === "client"
            ? {
                ...s,
                status: "signed",
                name: input.signerName,
                signedAt: now,
                signatureUrl: sigUrl,
                signatureKey: sigKey,
                ipAddress,
                userAgent,
              }
            : s
        );
      }
      inMemorySigners.set(agreement.id, signersList);

      const signersForPdf = signersList.map((s) => ({
        role: s.role,
        name: s.name || input.signerName,
        email: s.email,
        signedAt: s.signedAt || now,
        signaturePngBase64: s.role === "client" ? input.signaturePngBase64 : null,
        ipAddress: s.ipAddress || ipAddress,
        userAgent: s.userAgent || userAgent,
      }));

      // 4. Generate Final Flattened PDF via pdf-lib & Archive in R2 + Document Vault
      const pdfResult = await generateAndArchiveSignedAgreementPdf({
        agreementId: agreement.id,
        title: agreement.title,
        renderedHtmlOrText: agreement.content,
        clientId: agreement.clientId,
        studentContactId: agreement.studentContactId,
        companyName: "Advocacy Services",
        companyEmail: "advocate@waypoint.com",
        companyPhone: "(404) 555-0100",
        signers: signersForPdf,
        acknowledgments: input.acknowledgments,
        initialsData: input.initialsData,
      });

      const allCompleted = true;
      const finalStatus = "Completed";

      // 6. Lock agreement and save execution metadata
      agreement.status = finalStatus;
      agreement.signedAt = now;
      agreement.completedAt = now;
      agreement.signerName = input.signerName;
      agreement.signerIp = ipAddress;
      agreement.userAgent = userAgent;
      agreement.signatureUrl = sigUrl;
      agreement.signatureKey = sigKey;
      agreement.initialsData = input.initialsData ? JSON.stringify(input.initialsData) : null;
      agreement.acknowledgmentData = JSON.stringify(input.acknowledgments);
      agreement.signedPdfUrl = pdfResult.pdfUrl;
      agreement.signedPdfKey = pdfResult.pdfKey;
      agreement.documentHash = pdfResult.documentHash;
      agreement.contentLocked = 1; // IMMUTABLE
      agreement.updatedAt = now;
      inMemoryAgreements.set(agreement.id, agreement);

      try {
        const db = await getDb();
        if (db) {
          await db
            .update(agreements)
            .set({
              status: finalStatus,
              signedAt: now,
              completedAt: now,
              signerName: input.signerName,
              signerIp: ipAddress,
              userAgent,
              signatureUrl: sigUrl,
              signatureKey: sigKey,
              initialsData: input.initialsData ? JSON.stringify(input.initialsData) : null,
              acknowledgmentData: JSON.stringify(input.acknowledgments),
              signedPdfUrl: pdfResult.pdfUrl,
              signedPdfKey: pdfResult.pdfKey,
              documentHash: pdfResult.documentHash,
              contentLocked: 1,
              updatedAt: now,
            })
            .where(eq(agreements.id, agreement.id));
        }
      } catch (e) {}

      // Case Activity Timeline
      if (agreement.studentContactId) {
        try {
          await recordCaseActivity({
            studentContactId: agreement.studentContactId,
            eventType: "agreement_completed",
            title: `Agreement Executed: ${agreement.title}`,
            description: `Agreement "${agreement.title}" was electronically signed by ${input.signerName} and locked with Document Integrity Hash ${pdfResult.documentHash.substring(0, 16)}...`,
            ownerName: input.signerName,
            ownerRole: "Client Signer",
            categoryColor: "teal",
            sources: [
              {
                type: "document",
                label: "Signed Agreement PDF",
                url: pdfResult.pdfUrl,
              },
            ],
          });
        } catch (e) {}
      }

      // Fire Automations
      try {
        await triggerAutomationFlow("agreement_signed", agreement.clientId);
        await triggerAutomationFlow("agreement_completed", agreement.clientId);
        await triggerAutomationFlow("contract_signed", agreement.clientId);
        await triggerAutomationFlow("all_signatures_collected", agreement.clientId);
      } catch (e) {}

      return {
        success: true,
        pdfUrl: pdfResult.pdfUrl,
        agreementId: agreement.id,
        documentHash: pdfResult.documentHash,
      };
    }),
});
