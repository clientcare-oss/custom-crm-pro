import { z } from "zod";
import { router, adminProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db/connection";
import { contacts, pipelineStages, pipelineSavedViews } from "../../drizzle/schema";
import { eq, and, desc, asc } from "drizzle-orm";

// ── Default Pipeline Stages ──────────────────────────────────────────────────
export const DEFAULT_PIPELINE_STAGES = [
  {
    id: 1,
    name: "Discovery",
    slug: "discovery",
    order: 1,
    accentColor: "#38BDF8", // Cyan / Sky
    iconName: "Compass",
    category: "active",
    isArchived: false,
    isDefault: true,
  },
  {
    id: 2,
    name: "Intake / Onboarding",
    slug: "intake-onboarding",
    order: 2,
    accentColor: "#34D399", // Emerald
    iconName: "FileText",
    category: "active",
    isArchived: false,
    isDefault: true,
  },
  {
    id: 3,
    name: "Records Review",
    slug: "records-review",
    order: 3,
    accentColor: "#F59E0B", // Amber
    iconName: "FileSearch",
    category: "active",
    isArchived: false,
    isDefault: true,
  },
  {
    id: 4,
    name: "School Contact",
    slug: "school-contact",
    order: 4,
    accentColor: "#F5B544", // Gold
    iconName: "School",
    category: "active",
    isArchived: false,
    isDefault: true,
  },
  {
    id: 5,
    name: "Meeting Scheduled",
    slug: "meeting-scheduled",
    order: 5,
    accentColor: "#818CF8", // Indigo
    iconName: "Calendar",
    category: "active",
    isArchived: false,
    isDefault: true,
  },
  {
    id: 6,
    name: "State Complaint",
    slug: "state-complaint",
    order: 6,
    accentColor: "#F87171", // Coral / Red
    iconName: "Scale",
    category: "escalation",
    isArchived: false,
    isDefault: true,
  },
  {
    id: 7,
    name: "Monitoring",
    slug: "monitoring",
    order: 7,
    accentColor: "#2DD4BF", // Teal
    iconName: "Activity",
    category: "active",
    isArchived: false,
    isDefault: true,
  },
  {
    id: 8,
    name: "Closed",
    slug: "closed",
    order: 8,
    accentColor: "#94A3B8", // Slate
    iconName: "CheckCircle2",
    category: "completed",
    isArchived: false,
    isDefault: true,
  },
];

// ── Default Saved Views ──────────────────────────────────────────────────────
export const DEFAULT_SAVED_VIEWS = [
  { id: 1, name: "All Clients", slug: "all-clients", filtersJson: JSON.stringify({}), isPinned: true, isDefault: true, order: 1 },
  { id: 2, name: "$55 Plan", slug: "plan-55", filtersJson: JSON.stringify({ planTier: "$55" }), isPinned: true, isDefault: true, order: 2 },
  { id: 3, name: "$105 Plan", slug: "plan-105", filtersJson: JSON.stringify({ planTier: "$105" }), isPinned: true, isDefault: true, order: 3 },
  { id: 4, name: "Scholarship", slug: "scholarship", filtersJson: JSON.stringify({ planTier: "Scholarship" }), isPinned: true, isDefault: true, order: 4 },
  { id: 5, name: "Pay Per Use", slug: "pay-per-use", filtersJson: JSON.stringify({ planTier: "Pay Per Use" }), isPinned: true, isDefault: true, order: 5 },
  { id: 6, name: "Renewals", slug: "renewals", filtersJson: JSON.stringify({ accountStatus: "Renewal Needed" }), isPinned: true, isDefault: true, order: 6 },
  { id: 7, name: "Nonpay", slug: "nonpay", filtersJson: JSON.stringify({ billingStatus: "Payment Failed" }), isPinned: true, isDefault: true, order: 7 },
  { id: 8, name: "Tools Only", slug: "tools-only", filtersJson: JSON.stringify({ planTier: "Tools Only" }), isPinned: true, isDefault: true, order: 8 },
  { id: 9, name: "On Hold", slug: "on-hold", filtersJson: JSON.stringify({ accountStatus: "On Hold" }), isPinned: true, isDefault: true, order: 9 },
];

export const pipelineRouter = router({
  // ── Stages Management ──────────────────────────────────────────────────────
  stages: router({
    list: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return DEFAULT_PIPELINE_STAGES;

      try {
        const rows = await db
          .select()
          .from(pipelineStages)
          .orderBy(asc(pipelineStages.order));

        if (rows.length === 0) {
          return DEFAULT_PIPELINE_STAGES;
        }

        return rows;
      } catch (e) {
        return DEFAULT_PIPELINE_STAGES;
      }
    }),

    upsert: adminProcedure
      .input(
        z.object({
          id: z.number().optional(),
          name: z.string().min(1),
          order: z.number().optional(),
          accentColor: z.string().optional(),
          iconName: z.string().optional(),
          category: z.string().optional(),
          isArchived: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

        if (input.id) {
          await db
            .update(pipelineStages)
            .set({
              name: input.name,
              slug,
              order: input.order,
              accentColor: input.accentColor || "#38BDF8",
              iconName: input.iconName || "Compass",
              category: input.category || "active",
              isArchived: input.isArchived ?? false,
              updatedAt: new Date(),
            })
            .where(eq(pipelineStages.id, input.id));
          return { success: true, id: input.id };
        } else {
          const count = await db.select().from(pipelineStages);
          const [result] = await db.insert(pipelineStages).values({
            name: input.name,
            slug,
            order: input.order ?? count.length + 1,
            accentColor: input.accentColor || "#38BDF8",
            iconName: input.iconName || "Compass",
            category: input.category || "active",
            isArchived: false,
            isDefault: false,
          });
          return { success: true, id: result.insertId };
        }
      }),

    reorder: adminProcedure
      .input(
        z.array(
          z.object({
            id: z.number(),
            order: z.number(),
          })
        )
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: true };

        try {
          for (const item of input) {
            await db
              .update(pipelineStages)
              .set({ order: item.order, updatedAt: new Date() })
              .where(eq(pipelineStages.id, item.id));
          }
          return { success: true };
        } catch (e) {
          return { success: true };
        }
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: true };

        await db.delete(pipelineStages).where(eq(pipelineStages.id, input.id));
        return { success: true };
      }),
  }),

  // ── Saved Views Management ─────────────────────────────────────────────────
  views: router({
    list: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return DEFAULT_SAVED_VIEWS;

      try {
        const customRows = await db
          .select()
          .from(pipelineSavedViews)
          .orderBy(asc(pipelineSavedViews.order));

        if (customRows.length === 0) {
          return DEFAULT_SAVED_VIEWS;
        }

        const customSlugs = new Set(customRows.map((r) => r.slug));
        const activeDefaults = DEFAULT_SAVED_VIEWS.filter((d) => !customSlugs.has(d.slug));
        return [...activeDefaults, ...customRows];
      } catch (e) {
        return DEFAULT_SAVED_VIEWS;
      }
    }),

    upsert: adminProcedure
      .input(
        z.object({
          id: z.number().optional(),
          name: z.string().min(1),
          filtersJson: z.string(),
          isPinned: z.boolean().optional(),
          order: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

        if (input.id) {
          await db
            .update(pipelineSavedViews)
            .set({
              name: input.name,
              slug,
              filtersJson: input.filtersJson,
              isPinned: input.isPinned ?? true,
              order: input.order ?? 99,
              updatedAt: new Date(),
            })
            .where(eq(pipelineSavedViews.id, input.id));
          return { success: true, id: input.id };
        } else {
          const [result] = await db.insert(pipelineSavedViews).values({
            name: input.name,
            slug,
            filtersJson: input.filtersJson,
            isPinned: input.isPinned ?? true,
            isDefault: false,
            order: input.order ?? 99,
          });
          return { success: true, id: result.insertId };
        }
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: true };

        await db.delete(pipelineSavedViews).where(eq(pipelineSavedViews.id, input.id));
        return { success: true };
      }),
  }),

  // ── Kanban Cards & Student Workflow ─────────────────────────────────────────
  cards: router({
    list: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];

      const rows = await db
        .select()
        .from(contacts)
        .where(eq(contacts.jobTitle, "Student"))
        .orderBy(desc(contacts.updatedAt));

      return rows.map((c: any) => {
        const advocateName = c.assignedAdvocateName || "Byron Honea";
        const initials = advocateName
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);

        return {
          id: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
          fullName: `${c.firstName} ${c.lastName}`.trim(),
          schoolName: c.schoolName || c.goingToSchool || "School Not Set",
          countyDistrict: c.countyDistrict || "General",
          planType: c.planType || "No IEP/504 Yet",
          planTier: c.planTier || "$55",
          pipelineStage: c.pipelineStage || "Discovery",
          accountStatus: c.accountStatus || "Active",
          billingStatus: c.billingStatus || "Current",
          contractStatus: c.contractStatus || "Active",
          assignedAdvocateName: advocateName,
          assignedAdvocateInitials: initials,
          caseId: c.caseId,
          needsAttention: c.billingStatus === "Payment Failed" || c.accountStatus === "Renewal Needed",
          primaryTask:
            c.pipelineStage === "Records Review"
              ? "Review evaluation data"
              : c.pipelineStage === "State Complaint"
              ? "Draft complaint filing"
              : c.pipelineStage === "Meeting Scheduled"
              ? "Prepare pre-meeting strategy brief"
              : c.pipelineStage === "Intake / Onboarding"
              ? "Portal setup & welcome email"
              : "Discovery call pending",
          nextDate: "Sep 22, 2026",
          meetingDate: c.pipelineStage === "Meeting Scheduled" ? "Oct 05, 2026" : undefined,
          updatedAt: c.updatedAt,
        };
      });
    }),

    updateStage: adminProcedure
      .input(
        z.object({
          contactId: z.number(),
          stage: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        await db
          .update(contacts)
          .set({
            pipelineStage: input.stage,
            updatedAt: new Date(),
          })
          .where(eq(contacts.id, input.contactId));

        return { success: true, contactId: input.contactId, stage: input.stage };
      }),
  }),
});
