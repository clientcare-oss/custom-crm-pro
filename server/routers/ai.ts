import { z } from "zod";
import * as db from "../db";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure, adminProcedure, portalProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import { storagePut } from "../storage";
import { notifyOwner } from "../_core/notification";
import { brainDumpItems, brainDumpImages } from "../../drizzle/schema";

export const aiRouter = router({

    chat: protectedProcedure
      .input(z.object({
        messages: z.array(z.object({
          role: z.enum(["user", "assistant", "system"]),
          content: z.string(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const { invokeLLM } = await import("../_core/llm");
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { contacts, internalTasks, appointments } = await import("../../drizzle/schema");
        const { eq: dbEq, and: dbAnd } = await import("drizzle-orm");
        const todayStart = new Date(); todayStart.setHours(0,0,0,0);
        const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
        // Today's appointments
        const allAppts = await database
          .select({ id: appointments.id, title: appointments.title, startTime: appointments.startTime, endTime: appointments.endTime, status: appointments.status })
          .from(appointments)
          .where(dbEq(appointments.ownerId, ctx.user.id))
          .limit(30);
        const todayAppts = allAppts.filter(a => {
          const d = new Date(a.startTime);
          return d >= todayStart && d <= todayEnd;
        });
        // Tasks
        const allTasks = await database
          .select({ id: internalTasks.id, title: internalTasks.title, status: internalTasks.status, dueDate: internalTasks.dueDate, linkedStudentName: internalTasks.linkedStudentName })
          .from(internalTasks)
          .where(dbEq(internalTasks.createdBy, ctx.user.id))
          .limit(100);
        const overdueTasks = allTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "complete");
        const openTasks = allTasks.filter(t => t.status !== "complete");
        // Students
        const students = await database
          .select({ id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName, caseId: contacts.caseId })
          .from(contacts)
          .where(dbAnd(dbEq(contacts.ownerId, ctx.user.id), dbEq(contacts.jobTitle, "Student")))
          .limit(30);
        const dateStr = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
        const apptLines = todayAppts.length === 0 ? "None scheduled today." : todayAppts.map(a => "- " + a.title + " at " + new Date(a.startTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) + " [" + a.status + "]").join("\n");
        const overdueLines = overdueTasks.length === 0 ? "No overdue tasks." : overdueTasks.slice(0, 10).map(t => "- " + t.title + (t.dueDate ? " (due " + new Date(t.dueDate).toLocaleDateString() + ")" : "") + (t.linkedStudentName ? " — Student: " + t.linkedStudentName : "")).join("\n");
        const openLines = openTasks.length === 0 ? "No open tasks." : openTasks.slice(0, 15).map(t => "- [" + t.status + "] " + t.title + (t.dueDate ? " (due " + new Date(t.dueDate).toLocaleDateString() + ")" : "") + (t.linkedStudentName ? " — " + t.linkedStudentName : "")).join("\n");
        const studentLines = students.map(s => "- " + s.firstName + " " + s.lastName + " (Case: " + (s.caseId ?? "N/A") + ")").join("\n");
        const contextBlock = "Today is " + dateStr + ".\n\nTODAY'S APPOINTMENTS (" + todayAppts.length + "):\n" + apptLines + "\n\nOVERDUE TASKS (" + overdueTasks.length + "):\n" + overdueLines + "\n\nALL OPEN TASKS (" + openTasks.length + "):\n" + openLines + "\n\nACTIVE STUDENTS (" + students.length + "):\n" + studentLines;
        const systemPrompt = "You are an AI assistant for a special education advocacy CRM called Waypoint Advocates. You help advocates manage their caseload, stay on top of tasks, and support families navigating the IEP process.\n\nYou have access to the following live data from the CRM:\n\n" + contextBlock + "\n\nGuidelines:\n- Be concise, warm, and professional\n- When asked about tasks, meetings, or students, reference the actual data above\n- For prioritization questions, consider overdue items and today's schedule first\n- You can suggest next steps, draft messages, or summarize case status\n- If asked about something not in the data, say so honestly";
        const llmMessages = [
          { role: "system" as const, content: systemPrompt },
          ...input.messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
        ];
        const response = await invokeLLM({ messages: llmMessages });
        const reply = (response.choices?.[0]?.message?.content as string) ?? "I couldn't generate a response. Please try again.";
        return { reply };
      }),
    dailyBriefing: protectedProcedure
      .query(async ({ ctx }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { internalTasks, appointments } = await import("../../drizzle/schema");
        const { eq: dbEq } = await import("drizzle-orm");
        const todayStart = new Date(); todayStart.setHours(0,0,0,0);
        const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
        const allAppts = await database
          .select({ id: appointments.id, title: appointments.title, startTime: appointments.startTime, endTime: appointments.endTime, status: appointments.status })
          .from(appointments)
          .where(dbEq(appointments.ownerId, ctx.user.id))
          .limit(30);
        const todayAppts = allAppts.filter(a => {
          const d = new Date(a.startTime);
          return d >= todayStart && d <= todayEnd;
        });
        const allTasks = await database
          .select({ id: internalTasks.id, title: internalTasks.title, status: internalTasks.status, dueDate: internalTasks.dueDate, linkedStudentName: internalTasks.linkedStudentName })
          .from(internalTasks)
          .where(dbEq(internalTasks.createdBy, ctx.user.id))
          .limit(100);
        const overdueTasks = allTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "complete");
        const dueTodayTasks = allTasks.filter(t => {
          if (!t.dueDate || t.status === "complete") return false;
          const d = new Date(t.dueDate);
          return d >= todayStart && d <= todayEnd;
        });
        const openCount = allTasks.filter(t => t.status !== "complete").length;
        return {
          todayAppointments: todayAppts,
          overdueTasks,
          dueTodayTasks,
          openTaskCount: openCount,
          date: new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
        };
      }),

    rewriteText: protectedProcedure
      .input(z.object({
        text: z.string().min(1),
        mode: z.enum(["rewrite", "rephrase"]),
      }))
      .mutation(async ({ input }) => {
        const { invokeLLM } = await import("../_core/llm");
        const systemPrompt = input.mode === "rewrite"
          ? "You are a professional writing assistant. Rewrite the following text to be clearer, more professional, and well-structured. Keep the same meaning and intent. Return only the rewritten text, no explanations."
          : "You are a professional writing assistant. Rephrase the following sentence to be clearer and more professional while keeping the same meaning. Return only the rephrased sentence, no explanations.";
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: input.text },
          ],
        });
        const result = response.choices?.[0]?.message?.content ?? input.text;
        return { text: result };
      }),

});
