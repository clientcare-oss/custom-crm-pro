// PG-020 — Complaint packet PDF export (GET /api/complaint-export/:caseId)
import type { Express, Request, Response } from "express";
import PDFDocument from "pdfkit";
import * as cdb from "./complaintDb";
import { buildReadinessReport } from "./complaintValidation";
import { ISSUE_CATEGORIES, calcAge } from "../shared/complaintEngine";

const NAVY = "#07162B";
const GOLD = "#B8860B";
const BODY = "#1a2433";
const MUTED = "#5a6472";

export function registerComplaintExportRoute(app: Express) {
  app.get("/api/complaint-export/:caseId", async (req: Request, res: Response) => {
    try {
      const caseId = Number(req.params.caseId);
      if (!Number.isFinite(caseId)) return res.status(400).json({ error: "Invalid case id" });
      const c = await cdb.getCase(caseId);
      if (!c) return res.status(404).json({ error: "Case not found" });

      const [allegs, timeline, links, evidence, remedies, blocks, impacts] = await Promise.all([
        cdb.listAllegations(caseId), cdb.listTimeline(caseId), cdb.listAllLinksForCase(caseId),
        cdb.listEvidence(caseId), cdb.listRemedies(caseId), cdb.listDraftBlocks(caseId), cdb.listImpacts(caseId),
      ]);
      const readiness = buildReadinessReport({
        c, allegations: allegs, timeline, evidenceLinks: links,
        evidenceCount: evidence.length, remedies, draftSections: blocks.map(b => b.sectionKey),
      });
      if (readiness.blockers > 0) {
        return res.status(409).json({ error: `${readiness.blockers} blocking issue(s) remain in Filing Review. Resolve them before exporting.` });
      }

      const accepted = allegs
        .filter(a => ["accepted", "needs_facts", "needs_evidence", "drafted", "ready_for_review"].includes(a.status))
        .sort((a, b) => a.seqNumber - b.seqNumber);
      const acceptedIds = accepted.map(a => a.id);
      const authorities = (await cdb.listAuthoritiesForCase(acceptedIds)).filter(x => x.status === "confirmed");
      const block = (key: string) => blocks.find(b => b.sectionKey === key && b.allegationId === null)?.content?.trim() || "";
      const fmtDate = (d: Date | string | null) => (d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—");

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${c.caseId}-complaint-packet.pdf"`);

      const doc = new PDFDocument({ size: "LETTER", margins: { top: 64, bottom: 64, left: 72, right: 72 } });
      doc.pipe(res);

      // ---- Cover page ----
      doc.rect(0, 0, doc.page.width, doc.page.height).fill(NAVY);
      doc.fill(GOLD).font("Helvetica-Bold").fontSize(11).text("WAYPOINT COMPLAINT ENGINE™", 72, 120, { characterSpacing: 2 });
      doc.moveDown(2);
      doc.fill("white").fontSize(26).text("State Complaint Packet", { width: 440 });
      doc.moveDown(0.5);
      doc.font("Helvetica").fontSize(13).fill("#c8d2e0")
        .text("Formal complaint filed under the Individuals with Disabilities Education Act (IDEA)")
        .text("Georgia Department of Education — Division for Special Education Services and Supports");
      doc.moveDown(2);
      const coverRows: [string, string][] = [
        ["Case ID", c.caseId],
        ["Student", c.studentName ?? "—"],
        ["District", c.studentDistrict ?? c.agencyName ?? "—"],
        ["Complainant", c.complainantName ?? "—"],
        ["Date Prepared", fmtDate(new Date())],
      ];
      for (const [k, v] of coverRows) {
        doc.font("Helvetica-Bold").fontSize(10).fill(GOLD).text(k.toUpperCase(), { characterSpacing: 1 });
        doc.font("Helvetica").fontSize(13).fill("white").text(v);
        doc.moveDown(0.6);
      }
      doc.fontSize(9).fill("#8fa0b8").text("Prepared with Waypoint Advocacy — PG-020 State Complaint Builder", 72, doc.page.height - 100);

      // ---- Complaint body ----
      doc.addPage();
      let sectionNo = 0;
      const heading = (title: string) => {
        sectionNo += 1;
        if (doc.y > doc.page.height - 160) doc.addPage();
        doc.moveDown(sectionNo === 1 ? 0 : 1.2);
        doc.font("Helvetica-Bold").fontSize(13).fill(NAVY).text(`${sectionNo}. ${title}`);
        doc.moveTo(doc.x, doc.y + 2).lineTo(doc.x + 468, doc.y + 2).lineWidth(1).stroke(GOLD);
        doc.moveDown(0.6);
      };
      const para = (text: string, opts: { bold?: boolean; color?: string } = {}) => {
        doc.font(opts.bold ? "Helvetica-Bold" : "Helvetica").fontSize(11).fill(opts.color ?? BODY)
          .text(text, { lineGap: 3 });
        doc.moveDown(0.4);
      };

      doc.font("Helvetica-Bold").fontSize(16).fill(NAVY).text("FORMAL STATE COMPLAINT", { align: "center" });
      doc.font("Helvetica").fontSize(11).fill(MUTED).text(`Case ${c.caseId} · Filed pursuant to 34 C.F.R. §§ 300.151–300.153 and Ga. Comp. R. & Regs. 160-4-7-.12`, { align: "center" });
      doc.moveDown(1.2);

      heading("Parties");
      para(`Complainant: ${c.complainantName ?? "—"} (${c.complainantRelationship ?? "—"}), ${c.complainantAddress ?? "—"}. Telephone: ${c.complainantPhone ?? "—"}. Email: ${c.complainantEmail ?? "—"}.`);
      const age = calcAge(c.studentDob);
      para(`Student: ${c.studentName ?? "—"}${c.studentDob ? `, born ${fmtDate(c.studentDob)}${age !== null ? ` (age ${age})` : ""}` : ""}${c.studentGrade ? `, grade ${c.studentGrade}` : ""}, residing at ${c.studentAddress ?? "—"}, attending ${c.studentSchool ?? "—"} in ${c.studentDistrict ?? "—"}.${c.studentGtid ? ` GTID: ${c.studentGtid}.` : ""}`);
      const cats = (c.disabilityCategories ?? []) as string[];
      if (cats.length) para(`Eligibility categor${cats.length > 1 ? "ies" : "y"}: ${cats.join(", ")}.`);
      if (c.parentDifferent) para(`Parent/guardian: ${c.parentName ?? "—"}${c.parentAddress ? `, ${c.parentAddress}` : ""}${c.parentPhone ? `, ${c.parentPhone}` : ""}.`);

      heading("Public Agency");
      para(`This complaint is filed against ${c.agencyName ?? c.studentDistrict ?? "—"}${c.agencyContact ? `, attention: ${c.agencyContact}` : ""}${c.agencyAddress ? `, ${c.agencyAddress}` : ""}.`);

      heading("Jurisdiction and Timeliness");
      para(block("jurisdiction") || "This complaint is filed with the Georgia Department of Education under 34 C.F.R. §§ 300.151–300.153 and Ga. Comp. R. & Regs. 160-4-7-.12. The violations alleged in this complaint occurred within one year of the date this complaint is filed.");

      heading("Alleged Violations");
      for (const a of accepted) {
        const auth = authorities.filter(x => x.allegationId === a.id);
        const ic = ((a.issueCategories ?? []) as string[]).map(k => ISSUE_CATEGORIES.find(i => i.key === k)?.label ?? k);
        para(`Allegation ${String(a.seqNumber).padStart(2, "0")}: ${a.formalTitle || a.plainTitle}`, { bold: true });
        if (ic.length) para(`Issue area(s): ${ic.join(", ")}`, { color: MUTED });
        if (auth.length) para(`Authority: ${auth.map(x => `${x.citation} (${x.subject})`).join("; ")}`, { color: MUTED });
        if (a.draftStatement) para(a.draftStatement);
        doc.moveDown(0.3);
      }

      heading("Statement of Facts");
      const generalFacts = block("facts");
      if (generalFacts) para(generalFacts);
      for (const a of accepted) {
        if (a.draftFacts) {
          para(`Facts supporting Allegation ${String(a.seqNumber).padStart(2, "0")}:`, { bold: true });
          para(a.draftFacts);
        }
      }

      heading("Student Impact");
      const impactBlock = block("impact");
      if (impactBlock) para(impactBlock);
      else for (const im of impacts) para(`• ${im.narrative ?? im.whatChanged ?? im.category}`);

      heading("Proposed Resolution");
      remedies.filter(r => r.accepted).forEach((r, i) => {
        para(`${i + 1}. ${r.title}${r.quantification ? ` — ${r.quantification}` : ""}${r.detail ? `. ${r.detail}` : ""}`);
      });

      heading("Mediation");
      para(block("mediation") || (c.mediationRequested === "yes"
        ? "The complainant is willing to participate in mediation to resolve this complaint."
        : c.mediationRequested === "no"
          ? "The complainant does not request mediation at this time."
          : "The complainant has not yet decided whether to request mediation."));

      heading("Signature");
      para("The complainant certifies that the information in this complaint is true and correct to the best of their knowledge and belief.");
      doc.moveDown(1.5);
      doc.moveTo(doc.x, doc.y).lineTo(doc.x + 260, doc.y).lineWidth(0.8).stroke(BODY);
      para(`${c.signatureName ?? c.complainantName ?? "—"}    Date: ${fmtDate(c.signatureDate)}`);
      if (c.advocateName && c.advocateName !== c.complainantName) para(`Prepared with the assistance of ${c.advocateName}, advocate.`, { color: MUTED });

      heading("District-Copy Certification");
      para(block("district_copy") || `I certify that a copy of this complaint was forwarded to ${c.districtCopyRecipient ?? "the district serving the student"} on ${fmtDate(c.districtCopyDate)} via ${c.districtCopyMethod?.replaceAll("_", " ") ?? "—"}, at the same time it was filed with the Georgia Department of Education, as required by Ga. Comp. R. & Regs. 160-4-7-.12.`);

      // ---- Exhibit index ----
      doc.addPage();
      doc.font("Helvetica-Bold").fontSize(16).fill(NAVY).text("Exhibit Index");
      doc.moveTo(72, doc.y + 4).lineTo(540, doc.y + 4).lineWidth(1).stroke(GOLD);
      doc.moveDown(1);
      if (!evidence.length) {
        para("No exhibits are attached to this complaint.", { color: MUTED });
      } else {
        for (const ev of evidence) {
          const supports = links
            .filter(l => l.targetType === "allegation" && l.evidenceItemId === ev.id)
            .map(l => accepted.find(a => a.id === l.targetId)?.seqNumber)
            .filter((n): n is number => n !== undefined)
            .map(n => String(n).padStart(2, "0"));
          doc.font("Helvetica-Bold").fontSize(11).fill(NAVY).text(`${ev.evidenceId} — ${ev.title}`);
          doc.font("Helvetica").fontSize(10).fill(MUTED).text(
            [ev.category ? `Type: ${ev.category}` : null, ev.docDate ? `Document date: ${fmtDate(ev.docDate)}` : null,
             supports.length ? `Supports allegation(s): ${supports.join(", ")}` : null].filter(Boolean).join("  ·  "),
            { lineGap: 2 },
          );
          if (ev.summary) doc.fontSize(10).fill(BODY).text(ev.summary, { lineGap: 2 });
          doc.moveDown(0.7);
          if (doc.y > doc.page.height - 120) doc.addPage();
        }
        para("Exhibit files are attached behind this index in labeled order when the packet is filed.", { color: MUTED });
      }

      doc.end();
    } catch (err) {
      console.error("[complaint-export] failed:", err);
      if (!res.headersSent) res.status(500).json({ error: "Failed to generate the complaint packet" });
    }
  });
}
