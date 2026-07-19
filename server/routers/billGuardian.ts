import { z } from "zod";
import * as db from "../db";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure, adminProcedure, portalProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import { storagePut } from "../storage";
import { notifyOwner } from "../_core/notification";
import { brainDumpItems, brainDumpImages } from "../../drizzle/schema";

export const billGuardianRouter = router({

    // ── Accounts
    listAccounts: protectedProcedure.query(async ({ ctx }) => {
      const { billGuardianAccounts: bga } = await import("../../drizzle/schema");
      const { eq: geq } = await import("drizzle-orm");
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return dbConn.select().from(bga).where(geq(bga.ownerId, ctx.user.id)).orderBy(bga.createdAt);
    }),
    addAccount: protectedProcedure
      .input(z.object({ bankName: z.string(), accountName: z.string(), accountType: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const { billGuardianAccounts: bga } = await import("../../drizzle/schema");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await dbConn.insert(bga).values({ ownerId: ctx.user.id, bankName: input.bankName, accountName: input.accountName, accountType: input.accountType || "checking" });
        return { ok: true };
      }),
    deleteAccount: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { billGuardianAccounts: bga } = await import("../../drizzle/schema");
        const { eq: geq, and: gand } = await import("drizzle-orm");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await dbConn.delete(bga).where(gand(geq(bga.id, input.id), geq(bga.ownerId, ctx.user.id)));
        return { ok: true };
      }),

    // ── Bills
    listBills: protectedProcedure.query(async ({ ctx }) => {
      const { billGuardianBills: bgb } = await import("../../drizzle/schema");
      const { eq: beq } = await import("drizzle-orm");
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return dbConn.select().from(bgb).where(beq(bgb.ownerId, ctx.user.id)).orderBy(bgb.dueDay);
    }),
    createBill: protectedProcedure
      .input(z.object({
        vendorName: z.string(),
        vendorAliases: z.array(z.string()).optional(),
        expectedAmount: z.string(),
        dueDay: z.number().min(1).max(31),
        frequency: z.enum(["monthly", "quarterly", "annual", "weekly"]).default("monthly"),
        category: z.string().default("General"),
        autopay: z.boolean().default(false),
        priority: z.enum(["critical", "high", "medium", "low"]).default("medium"),
        notes: z.string().optional(),
        paymentLink: z.string().optional(),
        paymentLinkNote: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { billGuardianBills: bgb } = await import("../../drizzle/schema");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { vendorAliases, ...rest } = input;
        await dbConn.insert(bgb).values({ ...rest, expectedAmount: rest.expectedAmount, ownerId: ctx.user.id, vendorAliases: vendorAliases ? JSON.stringify(vendorAliases) : null });
        return { ok: true };
      }),
    updateBill: protectedProcedure
      .input(z.object({
        id: z.number(),
        vendorName: z.string().optional(),
        vendorAliases: z.array(z.string()).optional(),
        expectedAmount: z.string().optional(),
        dueDay: z.number().min(1).max(31).optional(),
        frequency: z.enum(["monthly", "quarterly", "annual", "weekly"]).optional(),
        category: z.string().optional(),
        autopay: z.boolean().optional(),
        priority: z.enum(["critical", "high", "medium", "low"]).optional(),
        notes: z.string().optional(),
        paymentLink: z.string().optional(),
        paymentLinkNote: z.string().optional(),
        manuallyPaid: z.boolean().optional(),
        paymentStatus: z.enum(["unpaid", "paid", "autopay_on", "disputed", "skipped"]).optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { billGuardianBills: bgb } = await import("../../drizzle/schema");
        const { eq: beq, and: band } = await import("drizzle-orm");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { id, vendorAliases, ...rest } = input;
        const updateData: Record<string, any> = { ...rest };
        if (vendorAliases !== undefined) updateData.vendorAliases = JSON.stringify(vendorAliases);
        await dbConn.update(bgb).set(updateData).where(band(beq(bgb.id, id), beq(bgb.ownerId, ctx.user.id)));
        return { ok: true };
      }),
    deleteBill: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { billGuardianBills: bgb } = await import("../../drizzle/schema");
        const { eq: beq, and: band } = await import("drizzle-orm");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await dbConn.delete(bgb).where(band(beq(bgb.id, input.id), beq(bgb.ownerId, ctx.user.id)));
        return { ok: true };
      }),

    // ── Transactions
    listTransactions: protectedProcedure
      .input(z.object({ bankAccountId: z.number().optional(), matchStatus: z.string().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const { billGuardianTransactions: bgt } = await import("../../drizzle/schema");
        const { eq: teq, and: tand, desc: tdesc } = await import("drizzle-orm");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const conditions: any[] = [teq(bgt.ownerId, ctx.user.id)];
        if (input?.bankAccountId) conditions.push(teq(bgt.bankAccountId, input.bankAccountId));
        return dbConn.select().from(bgt).where(tand(...conditions)).orderBy(tdesc(bgt.transactionDate)).limit(500);
      }),
    importTransactions: protectedProcedure
      .input(z.object({
        transactions: z.array(z.object({
          description: z.string(),
          amount: z.string(),
          transactionDate: z.string(),
          category: z.string().optional(),
          bankAccountId: z.number().optional(),
          externalId: z.string().optional(),
        }))
      }))
      .mutation(async ({ ctx, input }) => {
        const { billGuardianTransactions: bgt } = await import("../../drizzle/schema");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const rows = input.transactions.map(t => ({
          ownerId: ctx.user.id,
          description: t.description,
          amount: t.amount.toString(),
          transactionDate: new Date(t.transactionDate),
          category: t.category,
          bankAccountId: t.bankAccountId,
          externalId: t.externalId,
          matchStatus: "unmatched" as const,
        }));
        await dbConn.insert(bgt).values(rows);
        return { ok: true, count: rows.length };
      }),
    deleteTransaction: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { billGuardianTransactions: bgt } = await import("../../drizzle/schema");
        const { eq: teq, and: tand } = await import("drizzle-orm");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await dbConn.delete(bgt).where(tand(teq(bgt.id, input.id), teq(bgt.ownerId, ctx.user.id)));
        return { ok: true };
      }),
    overrideMatch: protectedProcedure
      .input(z.object({
        transactionId: z.number(),
        billId: z.number().optional(),
        matchStatus: z.enum(["matched", "duplicate", "increased", "needs_review", "ignored", "unmatched"]),
        matchNotes: z.string().optional(),
        isManuallyVerified: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { billGuardianTransactions: bgt } = await import("../../drizzle/schema");
        const { eq: teq, and: tand } = await import("drizzle-orm");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await dbConn.update(bgt).set({
          matchedBillId: input.billId ?? null,
          matchStatus: input.matchStatus,
          matchNotes: input.matchNotes,
          isManuallyVerified: input.isManuallyVerified ?? true,
          matchConfidence: 100,
        }).where(tand(teq(bgt.id, input.transactionId), teq(bgt.ownerId, ctx.user.id)));
        return { ok: true };
      }),

    // ── AI Matching Engine
    runMatching: protectedProcedure.mutation(async ({ ctx }) => {
      const { billGuardianBills: bgb, billGuardianTransactions: bgt } = await import("../../drizzle/schema");
      const { eq: meq, and: mand, gte: mgte } = await import("drizzle-orm");
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const bills = await dbConn.select().from(bgb).where(mand(meq(bgb.ownerId, ctx.user.id), meq(bgb.isActive, true)));
      const since = new Date();
      since.setDate(since.getDate() - 60);
      const transactions = await dbConn.select().from(bgt).where(mand(meq(bgt.ownerId, ctx.user.id), mgte(bgt.transactionDate, since)));
      if (bills.length === 0 || transactions.length === 0) return { ok: true, matched: 0, total: 0 };
      const billList = bills.map(b => `ID:${b.id} vendor:"${b.vendorName}" aliases:${b.vendorAliases || '[]'} amount:$${b.expectedAmount} dueDay:${b.dueDay} freq:${b.frequency}`).join('\n');
      const txList = transactions.map(t => `ID:${t.id} desc:"${t.description}" amount:$${t.amount} date:${new Date(t.transactionDate).toISOString().slice(0,10)}`).join('\n');
      const prompt = `You are a financial bill-matching AI. Match bank transactions to expected recurring bills.\n\nEXPECTED BILLS:\n${billList}\n\nBANK TRANSACTIONS (last 60 days):\n${txList}\n\nFor each transaction determine: which bill it matches (if any) using vendor name similarity, amount proximity (within 20%), and date proximity to dueDay. Match status options: matched (normal pay), duplicate (same bill paid twice in same period), increased (amount >5% over expected), needs_review (partial match), unmatched (no match). Return ONLY JSON: {"matches":[{"transactionId":number,"billId":number|null,"matchStatus":string,"confidence":number,"notes":string}]}`;
      const { invokeLLM } = await import("../_core/llm");
      const response = await invokeLLM({
        messages: [{ role: "user", content: prompt as string }],
        response_format: { type: "json_schema", json_schema: { name: "bill_matches", strict: true, schema: { type: "object", properties: { matches: { type: "array", items: { type: "object", properties: { transactionId: { type: "number" }, billId: { type: ["number", "null"] }, matchStatus: { type: "string" }, confidence: { type: "number" }, notes: { type: "string" } }, required: ["transactionId", "billId", "matchStatus", "confidence", "notes"], additionalProperties: false } } }, required: ["matches"], additionalProperties: false } } },
      });
      let matches: Array<{transactionId: number; billId: number|null; matchStatus: string; confidence: number; notes: string}> = [];
      try {
        const raw = response.choices[0].message.content as string;
        const parsed = JSON.parse(raw);
        matches = parsed.matches || parsed;
      } catch { return { ok: false, error: "Failed to parse AI response", matched: 0, total: 0 }; }
      let matchedCount = 0;
      const validStatuses = ["matched", "duplicate", "increased", "needs_review", "unmatched", "ignored"];
      
      await Promise.all(matches.map(async (m) => {
        const status = validStatuses.includes(m.matchStatus) ? m.matchStatus as any : "needs_review";
        if (status === "matched") matchedCount++;
        return dbConn.update(bgt)
          .set({ 
            matchedBillId: m.billId ?? null, 
            matchStatus: status, 
            matchConfidence: Math.min(100, Math.max(0, m.confidence)), 
            matchNotes: m.notes, 
            isManuallyVerified: false 
          })
          .where(mand(meq(bgt.id, m.transactionId), meq(bgt.ownerId, ctx.user.id)));
      }));

      return { ok: true, matched: matchedCount, total: matches.length };
    }),

    // ── Dashboard
    getDashboard: protectedProcedure.query(async ({ ctx }) => {
      const { billGuardianBills: bgb, billGuardianTransactions: bgt } = await import("../../drizzle/schema");
      const { eq: deq, and: dand, gte: dgte } = await import("drizzle-orm");
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const bills = await dbConn.select().from(bgb).where(dand(deq(bgb.ownerId, ctx.user.id), deq(bgb.isActive, true)));
      const since = new Date();
      since.setDate(since.getDate() - 60);
      const transactions = await dbConn.select().from(bgt).where(dand(deq(bgt.ownerId, ctx.user.id), dgte(bgt.transactionDate, since)));
      const currentDay = new Date().getDate();
      const billStatuses = bills.map(bill => {
        const matchedTx = transactions.filter(t => t.matchedBillId === bill.id && t.matchStatus === "matched");
        const duplicateTx = transactions.filter(t => t.matchedBillId === bill.id && t.matchStatus === "duplicate");
        const increasedTx = transactions.filter(t => t.matchedBillId === bill.id && t.matchStatus === "increased");
        const daysUntilDue = bill.dueDay - currentDay;
        let status: string;
        if (matchedTx.length > 0 || transactions.some(t => t.matchedBillId === bill.id && t.isManuallyVerified)) status = "paid";
        else if (duplicateTx.length > 0) status = "duplicate";
        else if (increasedTx.length > 0) status = "increased";
        else if (daysUntilDue >= 0 && daysUntilDue <= 5) status = "due_soon";
        else if (daysUntilDue < 0) status = "missing";
        else status = "upcoming";
        return { bill, status, matchedTx, duplicateTx, increasedTx };
      });
      return {
        bills: billStatuses,
        summary: {
          paid: billStatuses.filter(b => b.status === "paid").length,
          dueSoon: billStatuses.filter(b => b.status === "due_soon").length,
          missing: billStatuses.filter(b => b.status === "missing").length,
          duplicate: billStatuses.filter(b => b.status === "duplicate").length,
          increased: billStatuses.filter(b => b.status === "increased").length,
          needsReview: transactions.filter(t => t.matchStatus === "needs_review").length,
          unmatched: transactions.filter(t => t.matchStatus === "unmatched").length,
          totalBills: bills.length,
          totalTransactions: transactions.length,
        },
      };
    }),
    // ── Alert Summary (no bill details exposed — dashboard use only)
    getAlertSummary: protectedProcedure.query(async ({ ctx }) => {
      const { billGuardianBills: bgb, billGuardianTransactions: bgt } = await import("../../drizzle/schema");
      const { eq: aeq, and: aand, gte: agte } = await import("drizzle-orm");
      const dbConn = await db.getDb();
      if (!dbConn) return { needsAttention: false, count: 0, severity: "info" as const };
      const bills = await dbConn.select().from(bgb).where(aand(aeq(bgb.ownerId, ctx.user.id), aeq(bgb.isActive, true)));
      if (bills.length === 0) return { needsAttention: false, count: 0, severity: "info" as const };
      const since = new Date();
      since.setDate(since.getDate() - 60);
      const transactions = await dbConn.select().from(bgt).where(aand(aeq(bgt.ownerId, ctx.user.id), agte(bgt.transactionDate, since)));
      const currentDay = new Date().getDate();
      let critical = 0, warning = 0;
      for (const bill of bills) {
        // Skip bills manually marked as paid/autopay/skipped
        const ps = (bill as any).paymentStatus;
        if (ps === "paid" || ps === "autopay_on" || ps === "skipped") continue;
        const matched = transactions.some(t => t.matchedBillId === bill.id && (t.matchStatus === "matched" || t.isManuallyVerified));
        if (matched) continue;
        const daysUntilDue = bill.dueDay - currentDay;
        const duplicate = transactions.some(t => t.matchedBillId === bill.id && t.matchStatus === "duplicate");
        const increased = transactions.some(t => t.matchedBillId === bill.id && t.matchStatus === "increased");
        if (daysUntilDue < 0) critical++;
        else if (daysUntilDue <= 5 || duplicate || increased) warning++;
      }
      const count = critical + warning;
      const severity = critical > 0 ? "critical" : warning > 0 ? "warning" : "info";
      return { needsAttention: count > 0, count, severity: severity as "critical" | "warning" | "info" };
    }),
  
});
