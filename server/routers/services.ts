import { z } from "zod";
import { router, adminProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { services, serviceFolders } from "../../drizzle/schema";
import { eq, and, isNull, desc } from "drizzle-orm";

// ─── Standard Waypoint Services Definition ────────────────────────────────────

export const DEFAULT_WAYPOINT_SERVICES_CATALOG = [
  {
    folderName: "Advocacy Memberships",
    folderColor: "amber",
    services: [
      {
        name: "Advocacy Only Membership ($55/mo)",
        description: "Year-round special education IEP advocacy representation, IEP meeting strategy & attendance, document & evaluation review, and direct advocate communications.",
        price: 5500, // in cents ($55.00/mo)
        duration: null,
        isActive: true,
      },
      {
        name: "Advocacy + State Complaints Membership ($105/mo)",
        description: "Complete advocacy representation plus full drafting, legal citation indexing, and filing of Georgia IDEA State Complaints without separate legal drafting fees.",
        price: 10500, // in cents ($105.00/mo)
        duration: null,
        isActive: true,
      },
    ],
  },
  {
    folderName: "State Complaints & Legal",
    folderColor: "purple",
    services: [
      {
        name: "Single-Use State Complaint",
        description: "Standalone single-use Georgia IDEA State Complaint Builder, formal legal drafting, citation indexing, systemic violation narrative, evidence exhibit preparation, and filing support.",
        price: 125000, // in cents ($1,250.00)
        duration: null,
        isActive: true,
      },
    ],
  },
  {
    folderName: "Representation Packages",
    folderColor: "blue",
    services: [
      {
        name: "Full IEP Representation Package",
        description: "End-to-end IEP coaching, record analysis, strategy agendas, and live advocate attendance at all school meetings.",
        price: 185000, // in cents ($1,850.00)
        duration: null,
        isActive: true,
      },
      {
        name: "Annual Advocacy Retainer",
        description: "Year-round advocacy coverage for multiple meetings, manifestation determinations, and quarterly checkups.",
        price: 320000, // in cents ($3,200.00)
        duration: null,
        isActive: true,
      },
      {
        name: "Advocacy Hourly Retainer Block (15 Hours)",
        description: "Flexible 15-hour block of dedicated advocate time for meetings, correspondence, and record review.",
        price: 195000, // in cents ($1,950.00)
        duration: 900,
        isActive: true,
      },
    ],
  },
  {
    folderName: "Targeted Audits & Sessions",
    folderColor: "green",
    services: [
      {
        name: "IEP Document Review & Strategy Session",
        description: "In-depth review of your child's draft IEP with written amendment recommendations and a 60-min prep call.",
        price: 75000, // in cents ($750.00)
        duration: 60,
        isActive: true,
      },
      {
        name: "IEE (Independent Educational Evaluation) Oversight",
        description: "Criteria review, assessor vetting, and results defense at the IEP table for independent evaluations.",
        price: 45000, // in cents ($450.00)
        duration: null,
        isActive: true,
      },
      {
        name: "BIP / FBA Deep-Dive Audit",
        description: "Function analysis, crisis plan review, and positive reinforcement protocol development.",
        price: 35000, // in cents ($350.00)
        duration: null,
        isActive: true,
      },
    ],
  },
];

async function seedDefaultServicesForOwner(db: any, ownerId: number) {
  for (const group of DEFAULT_WAYPOINT_SERVICES_CATALOG) {
    // Check if folder already exists
    const [existingFolder] = await db
      .select()
      .from(serviceFolders)
      .where(and(eq(serviceFolders.ownerId, ownerId), eq(serviceFolders.name, group.folderName)))
      .limit(1);

    let folderId = existingFolder?.id;
    if (!folderId) {
      await db.insert(serviceFolders).values({
        name: group.folderName,
        color: group.folderColor,
        ownerId,
      });
      const [created] = await db
        .select()
        .from(serviceFolders)
        .where(and(eq(serviceFolders.ownerId, ownerId), eq(serviceFolders.name, group.folderName)))
        .orderBy(desc(serviceFolders.createdAt))
        .limit(1);
      folderId = created?.id;
    }

    for (const s of group.services) {
      const [existingService] = await db
        .select()
        .from(services)
        .where(and(eq(services.ownerId, ownerId), eq(services.name, s.name)))
        .limit(1);

      if (!existingService) {
        await db.insert(services).values({
          ownerId,
          folderId: folderId ?? null,
          name: s.name,
          description: s.description,
          price: s.price,
          duration: s.duration,
          isActive: s.isActive,
        });
      }
    }
  }
}

// ─── Folders ──────────────────────────────────────────────────────────────────

const foldersRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    
    // Auto-seed defaults if database has no folders yet
    const existing = await db
      .select()
      .from(serviceFolders);
      
    if (existing.length === 0) {
      await seedDefaultServicesForOwner(db, ctx.user?.id || 1);
    }

    return await db
      .select()
      .from(serviceFolders)
      .orderBy(serviceFolders.name);
  }),

  create: adminProcedure
    .input(z.object({ name: z.string().min(1), color: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.insert(serviceFolders).values({
        name: input.name,
        color: input.color ?? "blue",
        ownerId: ctx.user?.id || 1,
      });
      const [created] = await db
        .select()
        .from(serviceFolders)
        .where(eq(serviceFolders.name, input.name))
        .orderBy(desc(serviceFolders.createdAt))
        .limit(1);
      return created;
    }),

  rename: adminProcedure
    .input(z.object({ id: z.number(), name: z.string().min(1), color: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db
        .update(serviceFolders)
        .set({ name: input.name, ...(input.color ? { color: input.color } : {}) })
        .where(eq(serviceFolders.id, input.id));
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      // Move services in this folder to unfiled
      await db
        .update(services)
        .set({ folderId: null })
        .where(eq(services.folderId, input.id));
      await db
        .delete(serviceFolders)
        .where(eq(serviceFolders.id, input.id));
      return { success: true };
    }),
});

// ─── Services ─────────────────────────────────────────────────────────────────

export const servicesRouter = router({
  folders: foldersRouter,

  // Public/Shared Catalog procedure for Discovery Call and Client Portal checkout
  publicCatalog: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { folders: [], services: [] };
    
    // Auto-seed if empty
    const existing = await db.select().from(services);
    if (existing.length === 0) {
      await seedDefaultServicesForOwner(db, 1);
    }

    // Fetch all active services
    const allServices = await db
      .select()
      .from(services)
      .where(eq(services.isActive, true))
      .orderBy(services.name);

    const allFolders = await db
      .select()
      .from(serviceFolders)
      .orderBy(serviceFolders.name);

    return {
      folders: allFolders,
      services: allServices,
    };
  }),

  // Seed / Restore Standard Waypoint Catalog
  seedDefaults: adminProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await seedDefaultServicesForOwner(db, ctx.user?.id || 1);
    return { success: true };
  }),

  list: adminProcedure
    .input(z.object({ folderId: z.number().optional(), unfiled: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      // Check if services exist, if 0 auto-seed standard catalog
      const existingCount = await db
        .select()
        .from(services);

      if (existingCount.length === 0) {
        await seedDefaultServicesForOwner(db, ctx.user?.id || 1);
      }

      const conditions: any[] = [];
      if (input?.folderId) conditions.push(eq(services.folderId, input.folderId));
      if (input?.unfiled) conditions.push(isNull(services.folderId));

      if (conditions.length > 0) {
        return await db
          .select()
          .from(services)
          .where(and(...conditions))
          .orderBy(services.name);
      }

      return await db
        .select()
        .from(services)
        .orderBy(services.name);
    }),

  create: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      price: z.number().optional(),
      duration: z.number().optional(),
      folderId: z.number().nullable().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.insert(services).values({
        ownerId: ctx.user?.id || 1,
        name: input.name,
        description: input.description ?? null,
        price: input.price ?? null,
        duration: input.duration ?? null,
        folderId: input.folderId ?? null,
        isActive: input.isActive ?? true,
      });
      return { success: true };
    }),

  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      price: z.number().optional(),
      duration: z.number().optional(),
      folderId: z.number().nullable().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...data } = input;
      await db
        .update(services)
        .set(data)
        .where(eq(services.id, id));
      return { success: true };
    }),

  move: adminProcedure
    .input(z.object({ id: z.number(), folderId: z.number().nullable() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db
        .update(services)
        .set({ folderId: input.folderId })
        .where(eq(services.id, input.id));
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db
        .delete(services)
        .where(eq(services.id, input.id));
      return { success: true };
    }),
});
