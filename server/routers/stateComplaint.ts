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

        // Resolve practice business credentials from PG-024-BIZ
        const { receiptSettings } = await import("../../drizzle/schema");
        let practicePhone = "(404) 919-8664";
        let practiceEmail = "clientcare@waypointadvocates.com";
        let practiceAddress = "PO Box 724944, Atlanta, GA 31139";
        let practiceName = "Waypoint Advocates";
        let advocateName = "Byron Honea";

        try {
          const [receiptRow] = await database.select().from(receiptSettings).limit(1);
          if (receiptRow) {
            if (receiptRow.businessPhone) practicePhone = receiptRow.businessPhone;
            if (receiptRow.contactEmail) practiceEmail = receiptRow.contactEmail;
            if (receiptRow.businessAddress) practiceAddress = receiptRow.businessAddress;
            if (receiptRow.companyName) practiceName = receiptRow.companyName;
          }
        } catch (e) {}

        const { invokeLLM } = await import("../_core/llm");
        const { sanitizeComplaintText } = await import("../../shared/complaintEngine");
        const systemContent: string = `You are an expert special education advocate helping draft a formal state complaint letter to a State Education Agency (SEA) under IDEA (Individuals with Disabilities Education Act). Your output must be a complete, professional, and legally structured state complaint document. Use clear section headers. Be specific, cite IDEA regulations where applicable (e.g., 34 CFR Part 300), and maintain a formal but assertive tone. Do not include placeholder brackets — write complete sentences using the information provided.
STRICT TERMINOLOGY RULE: NEVER use the terms "Master Coach", "Master IEP Coach", "Master Coaching", or "IEP Coach". In state complaints and IDEA proceedings, advocates and non-attorney representatives must strictly be identified as "Lead Special Education Advocate" or "Special Education Advocate". Never use "coach" or "coaching".`;
        const userContent: string = `Please draft a formal state complaint for the following student:

Student Name: ${studentName}
${student.caseId ? `Case ID: ${student.caseId}` : ""}
${iepContext}

Advocate / Complainant Representative (PG-024-BIZ):
Representative: ${advocateName}, Lead Special Education Advocate
Practice: ${practiceName}
Official Address: ${practiceAddress}
Phone: ${practicePhone}
Email: ${practiceEmail}

Alleged Violations / Summary of Concerns:
${input.violationSummary}

Desired Resolution:
${input.desiredResolution}

${input.additionalContext ? `Additional Context:\n${input.additionalContext}` : ""}

Please structure the complaint with the following sections:
1. Introduction & Parties (include the official advocate practice credentials above)
2. Jurisdiction & Legal Basis
3. Statement of Facts
4. Alleged Violations (cite specific IDEA regulations)
5. Requested Relief / Corrective Actions
6. Conclusion`;
        const response = await invokeLLM({
          messages: [
            { role: "system" as const, content: systemContent },
            { role: "user" as const, content: userContent },
          ],
        });

        const rawContent = response?.choices?.[0]?.message?.content;
        const content = typeof rawContent === "string" ? rawContent : Array.isArray(rawContent) ? rawContent.map((p: any) => p.text ?? "").join("") : "";
        return { complaint: sanitizeComplaintText(content), studentName };
      }),
  
});
