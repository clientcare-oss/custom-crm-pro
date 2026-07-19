import { z } from "zod";
import * as db from "../db";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure, adminProcedure, portalProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import { storagePut } from "../storage";
import { notifyOwner } from "../_core/notification";
import { brainDumpItems, brainDumpImages } from "../../drizzle/schema";

export const stateComplaintRouter = router({

    generate: protectedProcedure
      .input(z.object({
        contactId: z.number(),
        violationSummary: z.string().min(10),
        desiredResolution: z.string().min(10),
        additionalContext: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { contacts, iepDocuments } = await import("../../drizzle/schema");
        const { eq: ceq, and: cand } = await import("drizzle-orm");

        const [student] = await database
          .select()
          .from(contacts)
          .where(cand(ceq(contacts.id, input.contactId), ceq(contacts.ownerId, ctx.user.id)))
          .limit(1);
        if (!student) throw new TRPCError({ code: "NOT_FOUND", message: "Student not found" });

        const [iep] = await database
          .select()
          .from(iepDocuments)
          .where(ceq(iepDocuments.contactId, input.contactId))
          .limit(1);

        const studentName = `${student.firstName} ${student.lastName}`;
        const iepContext = iep?.currentFileName
          ? `The student has a current IEP on file: "${iep.currentFileName}".`
          : "No IEP document is currently on file.";

        const { invokeLLM } = await import("../_core/llm");
        const systemContent: string = `You are an expert special education advocate helping draft a formal state complaint letter to a State Education Agency (SEA) under IDEA (Individuals with Disabilities Education Act). Your output must be a complete, professional, and legally structured state complaint document. Use clear section headers. Be specific, cite IDEA regulations where applicable (e.g., 34 CFR Part 300), and maintain a formal but assertive tone. Do not include placeholder brackets — write complete sentences using the information provided.`;
        const userContent: string = `Please draft a formal state complaint for the following student:\n\nStudent Name: ${studentName}\n${student.caseId ? `Case ID: ${student.caseId}` : ""}\n${iepContext}\n\nAlleged Violations / Summary of Concerns:\n${input.violationSummary}\n\nDesired Resolution:\n${input.desiredResolution}\n\n${input.additionalContext ? `Additional Context:\n${input.additionalContext}` : ""}\n\nPlease structure the complaint with the following sections:\n1. Introduction & Parties\n2. Jurisdiction & Legal Basis\n3. Statement of Facts\n4. Alleged Violations (cite specific IDEA regulations)\n5. Requested Relief / Corrective Actions\n6. Conclusion`;
        const response = await invokeLLM({
          messages: [
            { role: "system" as const, content: systemContent },
            { role: "user" as const, content: userContent },
          ],
        });

        const rawContent = response?.choices?.[0]?.message?.content;
        const content = typeof rawContent === "string" ? rawContent : Array.isArray(rawContent) ? rawContent.map((p: any) => p.text ?? "").join("") : "";
        return { complaint: content, studentName };
      }),
  
});
