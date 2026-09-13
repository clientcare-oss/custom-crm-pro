import { z } from "zod";
import { router, adminProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { sponsors } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import {
  storedOrgSettings,
  storedFunds,
  storedScholarships,
  storedDonations,
  storedSupporters,
  WebsiteToolType,
  getWebsiteToolsList,
  getWebsiteToolByIdOrSlug,
  createWebsiteToolRecord,
  updateWebsiteToolRecord,
  deleteWebsiteToolRecord,
  processPublicDonationTransaction,
  processSupporterSignupSubmission,
  CharitableFund,
  ScholarshipAward,
} from "../db/giving";

export const givingRouter = router({
  // ── Overview Statistics ──────────────────────────────────────────
  getOverviewStats: adminProcedure.query(async ({ ctx }) => {
    let dbSponsors: any[] = [];
    try {
      const db = await getDb();
      if (db) {
        dbSponsors = await db
          .select()
          .from(sponsors)
          .where(eq(sponsors.ownerId, ctx.user.id))
          .orderBy(desc(sponsors.donatedAt));
      }
    } catch (e) {
      console.warn("Could not query sponsors table in getOverviewStats:", e);
    }

    // Calculate real totals from DB or fallback store
    const totalSponsorCents = dbSponsors.reduce((sum, s) => sum + (s.amount || 0), 0);
    const storeDonationCents = storedDonations.reduce((sum, d) => sum + d.amountCents, 0);
    const effectiveDonationsCents = totalSponsorCents > 0 ? totalSponsorCents : storeDonationCents;

    const activeSupportersCount =
      dbSponsors.length > 0
        ? new Set(dbSponsors.map((s) => s.donorEmail || s.donorName)).size
        : storedSupporters.length;

    // Total fund balances
    const totalFundBalance = storedFunds.reduce((sum, f) => sum + f.currentBalance, 0);
    const scholarshipFundBalance = storedFunds.find((f) => f.id === "fnd-1")?.currentBalance || 2475000;
    const activeScholarshipsCount = storedScholarships.filter((s) => s.status === "active").length;

    // Monthly recurring estimate
    const monthlyRecurringCents = storedDonations
      .filter((d) => d.frequency === "monthly")
      .reduce((sum, d) => sum + d.amountCents, 0) || 125000;

    return {
      totalDonationsCents: effectiveDonationsCents,
      donationsYtdCents: effectiveDonationsCents,
      monthlyRecurringCents,
      activeSupportersCount,
      totalFundBalanceCents: totalFundBalance,
      scholarshipFundBalanceCents: scholarshipFundBalance,
      activeScholarshipsCount,
      recentDonations:
        dbSponsors.length > 0
          ? dbSponsors.slice(0, 5).map((s) => ({
              id: s.id,
              donorName: s.donorName,
              amount: s.amount || 0,
              type: s.type,
              familyName: s.familyName,
              status: s.status || "received",
              donatedAt: s.donatedAt,
            }))
          : storedDonations.slice(0, 5).map((d) => ({
              id: d.id,
              donorName: d.donorName,
              amount: d.amountCents,
              type: "gift",
              familyName: undefined,
              status: "received",
              donatedAt: d.donatedAt,
            })),
      recentScholarships: storedScholarships.slice(0, 5),
    };
  }),

  // ── 501(c)(3) Organization Settings ──────────────────────────────
  getSettings: adminProcedure.query(async () => {
    return storedOrgSettings;
  }),

  updateSettings: adminProcedure
    .input(
      z.object({
        legalName: z.string().optional(),
        dbaName: z.string().optional(),
        ein: z.string().optional(),
        address: z.string().optional(),
        status501c3: z.string().optional(),
        effectiveDate: z.string().optional(),
        determinationLetterUrl: z.string().optional(),
        defaultAcknowledgment: z.string().optional(),
        logoUrl: z.string().optional(),
        authorizedSigner: z.string().optional(),
        receiptFooter: z.string().optional(),
        taxDeductibleText: z.string().optional(),
        noGoodsProvidedDefault: z.boolean().optional(),
        stripeConnected: z.boolean().optional(),
        stripeAccountId: z.string().optional(),
        stripeMode: z.enum(["test", "live"]).optional(),
        stripeWebhookStatus: z.enum(["active", "inactive", "pending"]).optional(),
        scholarshipProgramName: z.string().optional(),
        scholarshipDescription: z.string().optional(),
        scholarshipEligibility: z.string().optional(),
        scholarshipApplicationDates: z.string().optional(),
        scholarshipAwardRules: z.string().optional(),
        scholarshipDefaultFund: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      Object.assign(storedOrgSettings, input);
      return { success: true, settings: storedOrgSettings };
    }),

  // ── Supporters (Unified with Sponsors & Family Gifts) ───────────
  listSupporters: adminProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          type: z.string().optional(),
          status: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      let result = [...storedSupporters];

      if (input?.search) {
        const q = input.search.toLowerCase();
        result = result.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.email.toLowerCase().includes(q) ||
            s.phone.includes(q) ||
            (s.supporterType && s.supporterType.toLowerCase().includes(q))
        );
      }

      if (input?.type && input.type !== "all") {
        result = result.filter((s) => s.supporterType.toLowerCase().includes(input.type!.toLowerCase()));
      }

      return result;
    }),

  createSupporter: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        entityType: z.enum(["individual", "organization"]).default("individual"),
        supporterType: z.string().default("One-Time Donor"),
        email: z.string().optional(),
        phone: z.string().optional(),
        notes: z.string().optional(),
        initialAmount: z.number().optional(), // in cents
        fundName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const nowIso = new Date().toISOString();
      const newSup = {
        id: `sup-${Date.now()}`,
        name: input.name,
        entityType: input.entityType,
        supporterType: input.supporterType,
        email: input.email || "",
        phone: input.phone || "",
        lifetimeGivingCents: input.initialAmount || 0,
        donationCount: input.initialAmount ? 1 : 0,
        lastGiftDate: nowIso,
        status: "active" as const,
        notes: input.notes,
      };
      storedSupporters.unshift(newSup);

      try {
        const db = await getDb();
        if (db) {
          await db.insert(sponsors).values({
            ownerId: ctx.user.id,
            type: input.supporterType.includes("Sponsor") ? "sponsor" : "gift",
            donorName: input.name,
            donorEmail: input.email ?? null,
            donorPhone: input.phone ?? null,
            amount: input.initialAmount ?? null,
            notes: input.notes ?? null,
            status: "received",
            donatedAt: new Date(),
          });
        }
      } catch (e) {
        console.warn("Could not insert into sponsors in createSupporter:", e);
      }
      return { success: true, supporter: newSup };
    }),

  // ── Donations Ledger ─────────────────────────────────────────────
  listDonations: adminProcedure
    .input(
      z
        .object({
          fundId: z.string().optional(),
          search: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      let result = [...storedDonations];

      if (input?.fundId && input.fundId !== "all") {
        result = result.filter((d) => d.fundId === input.fundId);
      }

      if (input?.search) {
        const q = input.search.toLowerCase();
        result = result.filter(
          (d) =>
            d.donorName.toLowerCase().includes(q) ||
            (d.donorEmail && d.donorEmail.toLowerCase().includes(q)) ||
            d.receiptNumber.toLowerCase().includes(q) ||
            d.fundName.toLowerCase().includes(q)
        );
      }

      return result;
    }),

  createDonation: adminProcedure
    .input(
      z.object({
        donorName: z.string().min(1),
        donorEmail: z.string().optional(),
        donorPhone: z.string().optional(),
        amountCents: z.number().min(100),
        fundId: z.string().default("fnd-1"),
        paymentMethod: z.string().default("Stripe"),
        notes: z.string().optional(),
        familyContactId: z.number().optional(),
        familyName: z.string().optional(),
        donatedAt: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const fund = storedFunds.find((f) => f.id === input.fundId) || storedFunds[0];
      const nowIso = input.donatedAt ? new Date(input.donatedAt).toISOString() : new Date().toISOString();
      const receiptNumber = `REC-2026-${String(storedDonations.length + 101).padStart(4, "0")}`;

      const newDonation = {
        id: `don-${Date.now()}`,
        donorName: input.donorName,
        donorEmail: input.donorEmail,
        donorPhone: input.donorPhone,
        amountCents: input.amountCents,
        fundId: fund.id,
        fundName: fund.name,
        paymentMethod: input.paymentMethod,
        frequency: "one_time" as const,
        coverFees: false,
        anonymous: false,
        taxDeductible: true,
        receiptNumber,
        receiptStatus: "Ready" as const,
        donatedAt: nowIso,
        notes: input.notes,
      };

      storedDonations.unshift(newDonation);
      fund.currentBalance += input.amountCents;

      // Update supporter if matching email
      if (input.donorEmail) {
        const sup = storedSupporters.find((s) => s.email.toLowerCase() === input.donorEmail!.toLowerCase());
        if (sup) {
          sup.lifetimeGivingCents += input.amountCents;
          sup.donationCount += 1;
          sup.lastGiftDate = nowIso;
        }
      }

      try {
        const db = await getDb();
        if (db) {
          await db.insert(sponsors).values({
            ownerId: ctx.user.id,
            type: input.familyContactId ? "gift" : "sponsor",
            donorName: input.donorName,
            donorEmail: input.donorEmail ?? null,
            donorPhone: input.donorPhone ?? null,
            amount: input.amountCents,
            familyContactId: input.familyContactId ?? null,
            familyName: input.familyName ?? null,
            notes: input.notes ?? null,
            status: "acknowledged",
            donatedAt: new Date(nowIso),
          });
        }
      } catch (e) {
        console.warn("Could not insert into sponsors in createDonation:", e);
      }

      return { success: true, donation: newDonation };
    }),

  // ── Scholarships & Grants ─────────────────────────────────────────
  listScholarships: adminProcedure.query(async () => {
    return storedScholarships;
  }),

  awardScholarship: adminProcedure
    .input(
      z.object({
        studentName: z.string().min(1),
        familyContactName: z.string().min(1),
        familyEmail: z.string().optional(),
        programTier: z.string().min(1),
        monthlyGrantAmount: z.number().min(0), // cents
        fundId: z.string(),
        sponsorName: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const fund = storedFunds.find((f) => f.id === input.fundId) || storedFunds[0];
      const newAward: ScholarshipAward = {
        id: `sch-${Date.now()}`,
        studentName: input.studentName,
        familyContactName: input.familyContactName,
        familyEmail: input.familyEmail,
        programTier: input.programTier,
        monthlyGrantAmount: input.monthlyGrantAmount,
        fundId: fund.id,
        fundName: fund.name,
        sponsorName: input.sponsorName,
        awardedAt: new Date().toISOString().split("T")[0],
        status: "active",
        notes: input.notes,
      };
      storedScholarships.unshift(newAward);
      return { success: true, award: newAward };
    }),

  // ── Charitable Funds ─────────────────────────────────────────────
  listFunds: adminProcedure.query(async () => {
    return storedFunds;
  }),

  createFund: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        code: z.string().min(1),
        description: z.string().min(1),
        targetGoal: z.number().min(0),
        restrictionType: z.enum(["unrestricted", "restricted", "endowment"]).default("restricted"),
      })
    )
    .mutation(async ({ input }) => {
      const newFund: CharitableFund = {
        id: `fnd-${Date.now()}`,
        name: input.name,
        code: input.code.toUpperCase(),
        description: input.description,
        targetGoal: input.targetGoal,
        currentBalance: 0,
        restrictionType: input.restrictionType,
        isDefault: false,
        status: "active",
      };
      storedFunds.push(newFund);
      return { success: true, fund: newFund };
    }),

  // ── Receipts & Statements ────────────────────────────────────────
  listReceipts: adminProcedure.query(async () => {
    return storedDonations.map((d) => ({
      receiptNumber: d.receiptNumber,
      donorName: d.donorName,
      donorEmail: d.donorEmail,
      amountCents: d.amountCents,
      fundName: d.fundName,
      donatedAt: d.donatedAt,
      status: d.receiptStatus === "Sent" ? "Delivered" : "Ready to Send",
      legalText: storedOrgSettings.taxDeductibleText,
    }));
  }),

  // ── Reports & Form 990 Preparedness ──────────────────────────────
  getReports: adminProcedure.query(async () => {
    const totalCents = storedDonations.reduce((sum, d) => sum + d.amountCents, 0);
    return {
      annualTotals: [
        { year: "2024", totalDonatedCents: 1840000, donorsCount: 8 },
        { year: "2025", totalDonatedCents: 3620000, donorsCount: 15 },
        { year: "2026 (YTD)", totalDonatedCents: totalCents || 4715000, donorsCount: storedSupporters.length },
      ],
      fundBreakdown: storedFunds.map((f) => ({
        fundName: f.name,
        allocatedCents: f.currentBalance,
        percent: Math.round((f.currentBalance / (storedFunds.reduce((s, x) => s + x.currentBalance, 0) || 1)) * 100),
      })),
      publicSupportPercentage: 88.4, // Form 990 Schedule A metric (>33.3% test)
      recurringDonorRetention: 92.5,
    };
  }),

  // ── WEBSITE TOOLS (Forms, Buttons, Progress Bars, Campaigns) ─────
  listWebsiteTools: adminProcedure
    .input(
      z
        .object({
          type: z.string().optional(),
          status: z.string().optional(),
          search: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return await getWebsiteToolsList(input?.type, input?.status, input?.search);
    }),

  getWebsiteTool: publicProcedure
    .input(z.object({ idOrSlug: z.string() }))
    .query(async ({ input }) => {
      const tool = await getWebsiteToolByIdOrSlug(input.idOrSlug);
      if (!tool) throw new Error("Website tool not found");
      return tool;
    }),

  createWebsiteTool: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        slug: z.string().min(1),
        type: z.enum([
          "donation_form",
          "donate_button",
          "floating_button",
          "progress_bar",
          "campaign_page",
          "supporter_signup",
        ] as [WebsiteToolType, ...WebsiteToolType[]]),
        fundId: z.string(),
        status: z.enum(["active", "draft", "archived"]).default("active"),
        headline: z.string().min(1),
        description: z.string().optional(),
        settings: z.record(z.string(), z.any()).default({}),
      })
    )
    .mutation(async ({ input }) => {
      return await createWebsiteToolRecord(input);
    }),

  updateWebsiteTool: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        slug: z.string().optional(),
        type: z
          .enum([
            "donation_form",
            "donate_button",
            "floating_button",
            "progress_bar",
            "campaign_page",
            "supporter_signup",
          ] as [WebsiteToolType, ...WebsiteToolType[]])
          .optional(),
        fundId: z.string().optional(),
        status: z.enum(["active", "draft", "archived"]).optional(),
        headline: z.string().optional(),
        description: z.string().optional(),
        settings: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      return await updateWebsiteToolRecord(id, updates);
    }),

  deleteWebsiteTool: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await deleteWebsiteToolRecord(input.id);
    }),

  // ── Public Submission Endpoints ──────────────────────────────────
  submitPublicDonation: publicProcedure
    .input(
      z.object({
        toolId: z.string().optional(),
        fundId: z.string().optional(),
        amountCents: z.number().min(100),
        frequency: z.enum(["one_time", "monthly"]).default("one_time"),
        coverFees: z.boolean().default(false),
        anonymous: z.boolean().default(false),
        donorName: z.string().min(1),
        donorEmail: z.string().email(),
        donorPhone: z.string().optional(),
        donorAddress: z.string().optional(),
        donorOrganization: z.string().optional(),
        notes: z.string().optional(),
        paymentMethod: z.string().default("Stripe"),
      })
    )
    .mutation(async ({ input }) => {
      return await processPublicDonationTransaction(input);
    }),

  submitSupporterSignup: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        organization: z.string().optional(),
        areasOfInterest: z.array(z.string()).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await processSupporterSignupSubmission(input);
    }),
});
