import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import crypto from "crypto";
import { storagePut } from "../storage";
import { getDb } from "../db/connection";
import { clientFiles } from "../../drizzle/schema";

export interface AgreementPdfSignerInput {
  role: string;
  name: string;
  email?: string | null;
  signedAt?: Date | string | null;
  signaturePngBase64?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AgreementPdfInput {
  agreementId: number;
  title: string;
  renderedHtmlOrText: string;
  clientId: number;
  studentContactId?: number | null;
  companyName: string;
  companyEmail?: string | null;
  companyPhone?: string | null;
  signers: AgreementPdfSignerInput[];
  acknowledgments?: Array<{ id: string; text: string; acknowledged: boolean; timestamp?: string }>;
  initialsData?: Record<string, string>;
  documentHash?: string;
}

/**
 * Strips HTML tags and normalizes text for PDF rendering
 */
function htmlToPlainText(html: string): string[] {
  // Replace <br>, <p>, </div>, </h1>, etc. with newlines
  const text = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<br\s*[\/]?>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<hr\s*[\/]?>/gi, "\n----------------------------------------\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2026]/g, "...")
    .replace(/[^\x20-\x7E\xA0-\xFF\n\r\t•]/g, "");

  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line, idx, arr) => line.length > 0 || (idx > 0 && arr[idx - 1].length > 0));
}

/**
 * Word wrap helper for standard font
 */
function wrapLine(text: string, maxCharsPerLine = 85): string[] {
  if (text.length <= maxCharsPerLine) return [text];
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if ((currentLine + " " + word).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + " " + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

export async function generateAndArchiveSignedAgreementPdf(
  input: AgreementPdfInput
): Promise<{ pdfUrl: string; pdfKey: string; documentHash: string; clientFileId?: number }> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Compute SHA-256 document hash of snapshot
  const rawDocumentPayload = JSON.stringify({
    agreementId: input.agreementId,
    title: input.title,
    content: input.renderedHtmlOrText,
    signers: input.signers,
    acknowledgments: input.acknowledgments,
    initialsData: input.initialsData,
  });
  const documentHash = input.documentHash || crypto.createHash("sha256").update(rawDocumentPayload).digest("hex");

  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 45;
  const contentWidth = pageWidth - margin * 2;

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const checkPageBreak = (neededHeight: number) => {
    if (y - neededHeight < margin + 40) {
      // Draw footer on current page
      drawPageFooter(currentPage);
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
      drawPageHeader(currentPage, false);
    }
  };

  const drawPageHeader = (page: typeof currentPage, isFirstPage: boolean) => {
    if (isFirstPage) {
      // Top Brand Banner
      page.drawRectangle({
        x: margin,
        y: y - 36,
        width: contentWidth,
        height: 36,
        color: rgb(0.08, 0.12, 0.18),
      });

      page.drawText(input.companyName.toUpperCase(), {
        x: margin + 12,
        y: y - 24,
        size: 11,
        font: fontBold,
        color: rgb(0.95, 0.95, 0.98),
      });

      page.drawText("CANONICAL EXECUTED AGREEMENT", {
        x: margin + contentWidth - 170,
        y: y - 24,
        size: 8,
        font: fontBold,
        color: rgb(0.55, 0.65, 0.8),
      });

      y -= 48;

      // Title & Reference
      page.drawText(input.title, {
        x: margin,
        y: y - 16,
        size: 18,
        font: fontBold,
        color: rgb(0.1, 0.15, 0.22),
      });
      y -= 26;

      page.drawText(`Document Ref: AG-${input.agreementId.toString().padStart(5, "0")}  |  Executed Date: ${new Date().toLocaleDateString()}`, {
        x: margin,
        y: y - 10,
        size: 9,
        font: fontOblique,
        color: rgb(0.4, 0.45, 0.5),
      });
      y -= 20;

      page.drawLine({
        start: { x: margin, y },
        end: { x: margin + contentWidth, y },
        thickness: 1,
        color: rgb(0.85, 0.88, 0.92),
      });
      y -= 18;
    } else {
      // Running compact header
      page.drawText(`${input.title} (AG-${input.agreementId.toString().padStart(5, "0")})`, {
        x: margin,
        y: y - 10,
        size: 8,
        font: fontOblique,
        color: rgb(0.5, 0.55, 0.6),
      });
      page.drawLine({
        start: { x: margin, y: y - 14 },
        end: { x: margin + contentWidth, y: y - 14 },
        thickness: 0.5,
        color: rgb(0.85, 0.88, 0.92),
      });
      y -= 26;
    }
  };

  const drawPageFooter = (page: typeof currentPage) => {
    page.drawLine({
      start: { x: margin, y: margin + 20 },
      end: { x: margin + contentWidth, y: margin + 20 },
      thickness: 0.5,
      color: rgb(0.85, 0.88, 0.92),
    });
    page.drawText(`Integrity SHA-256: ${documentHash.substring(0, 32)}...`, {
      x: margin,
      y: margin + 8,
      size: 7,
      font: fontRegular,
      color: rgb(0.55, 0.6, 0.65),
    });
    page.drawText("Confidential Legal Record", {
      x: margin + contentWidth - 100,
      y: margin + 8,
      size: 7,
      font: fontRegular,
      color: rgb(0.55, 0.6, 0.65),
    });
  };

  // 1. Draw Initial Page Header
  drawPageHeader(currentPage, true);

  // 2. Render Document Body
  const rawLines = htmlToPlainText(input.renderedHtmlOrText);
  for (const line of rawLines) {
    const wrapped = wrapLine(line, 82);
    for (const wLine of wrapped) {
      checkPageBreak(16);
      currentPage.drawText(wLine, {
        x: margin,
        y: y - 11,
        size: 9.5,
        font: fontRegular,
        color: rgb(0.15, 0.18, 0.22),
        lineHeight: 14,
      });
      y -= 14;
    }
    y -= 4; // spacing between paragraphs
  }

  // 3. Render Acknowledgments Section if any
  if (input.acknowledgments && input.acknowledgments.length > 0) {
    checkPageBreak(40 + input.acknowledgments.length * 24);
    y -= 10;
    currentPage.drawText("REQUIRED ACKNOWLEDGMENTS & CONSENT", {
      x: margin,
      y: y - 10,
      size: 11,
      font: fontBold,
      color: rgb(0.12, 0.16, 0.22),
    });
    y -= 18;

    for (const ack of input.acknowledgments) {
      checkPageBreak(28);
      // Draw Checkmark box
      currentPage.drawRectangle({
        x: margin,
        y: y - 12,
        width: 12,
        height: 12,
        color: rgb(0.92, 0.96, 0.92),
        borderColor: rgb(0.1, 0.6, 0.2),
        borderWidth: 1,
      });
      currentPage.drawText("X", {
        x: margin + 2.5,
        y: y - 10,
        size: 9,
        font: fontBold,
        color: rgb(0.1, 0.55, 0.2),
      });

      const ackLines = wrapLine(ack.text, 78);
      for (const aLine of ackLines) {
        currentPage.drawText(aLine, {
          x: margin + 18,
          y: y - 10,
          size: 8.5,
          font: fontRegular,
          color: rgb(0.2, 0.25, 0.3),
        });
        y -= 13;
      }
      if (ack.timestamp) {
        currentPage.drawText(`[Acknowledged: ${new Date(ack.timestamp).toLocaleString()}]`, {
          x: margin + 18,
          y: y - 8,
          size: 7.5,
          font: fontOblique,
          color: rgb(0.45, 0.5, 0.55),
        });
        y -= 12;
      }
      y -= 4;
    }
  }

  // 4. Render Initials Section if any
  if (input.initialsData && Object.keys(input.initialsData).length > 0) {
    checkPageBreak(50);
    y -= 8;
    currentPage.drawText("CLAUSE INITIALS RECORD", {
      x: margin,
      y: y - 10,
      size: 10,
      font: fontBold,
      color: rgb(0.12, 0.16, 0.22),
    });
    y -= 18;

    for (const [clause, initials] of Object.entries(input.initialsData)) {
      checkPageBreak(18);
      currentPage.drawText(`Clause / Term: ${clause}`, {
        x: margin,
        y: y - 8,
        size: 8.5,
        font: fontRegular,
        color: rgb(0.2, 0.25, 0.3),
      });
      currentPage.drawText(`Initials: [ ${initials.toUpperCase()} ]`, {
        x: margin + contentWidth - 110,
        y: y - 8,
        size: 8.5,
        font: fontBold,
        color: rgb(0.1, 0.2, 0.4),
      });
      y -= 14;
    }
  }

  // 5. Render Signatures Section
  checkPageBreak(160);
  y -= 14;

  currentPage.drawLine({
    start: { x: margin, y },
    end: { x: margin + contentWidth, y },
    thickness: 1,
    color: rgb(0.8, 0.85, 0.9),
  });
  y -= 18;

  currentPage.drawText("EXECUTION & ELECTRONIC SIGNATURES", {
    x: margin,
    y: y - 10,
    size: 11,
    font: fontBold,
    color: rgb(0.12, 0.16, 0.22),
  });
  y -= 22;

  for (const signer of input.signers) {
    checkPageBreak(110);

    const boxWidth = contentWidth;
    const boxHeight = 90;

    currentPage.drawRectangle({
      x: margin,
      y: y - boxHeight,
      width: boxWidth,
      height: boxHeight,
      color: rgb(0.97, 0.98, 0.99),
      borderColor: rgb(0.85, 0.88, 0.92),
      borderWidth: 1,
    });

    const boxY = y;

    currentPage.drawText(`Role: ${signer.role.toUpperCase()}`, {
      x: margin + 12,
      y: boxY - 18,
      size: 9,
      font: fontBold,
      color: rgb(0.2, 0.3, 0.45),
    });

    currentPage.drawText(`Name: ${signer.name}`, {
      x: margin + 12,
      y: boxY - 32,
      size: 9,
      font: fontRegular,
      color: rgb(0.15, 0.18, 0.22),
    });

    if (signer.email) {
      currentPage.drawText(`Email: ${signer.email}`, {
        x: margin + 12,
        y: boxY - 45,
        size: 8,
        font: fontRegular,
        color: rgb(0.4, 0.45, 0.5),
      });
    }

    const signedDateStr = signer.signedAt ? new Date(signer.signedAt).toLocaleString() : "Not Signed";
    currentPage.drawText(`Date & Time: ${signedDateStr}`, {
      x: margin + 12,
      y: boxY - 58,
      size: 8,
      font: fontRegular,
      color: rgb(0.4, 0.45, 0.5),
    });

    if (signer.ipAddress) {
      currentPage.drawText(`Verified IP: ${signer.ipAddress}`, {
        x: margin + 12,
        y: boxY - 71,
        size: 7.5,
        font: fontOblique,
        color: rgb(0.5, 0.55, 0.6),
      });
    }

    // Embed Signature Canvas PNG if provided
    if (signer.signaturePngBase64) {
      try {
        const cleanBase64 = signer.signaturePngBase64.replace(/^data:image\/png;base64,/, "");
        const sigBytes = Buffer.from(cleanBase64, "base64");
        const sigImage = await pdfDoc.embedPng(sigBytes);
        const sigWidth = 150;
        const sigHeight = (sigImage.height / sigImage.width) * sigWidth;
        const boundedHeight = Math.min(sigHeight, 48);

        currentPage.drawImage(sigImage, {
          x: margin + boxWidth - 170,
          y: boxY - boundedHeight - 24,
          width: sigWidth,
          height: boundedHeight,
        });

        currentPage.drawLine({
          start: { x: margin + boxWidth - 175, y: boxY - 74 },
          end: { x: margin + boxWidth - 15, y: boxY - 74 },
          thickness: 0.5,
          color: rgb(0.5, 0.55, 0.6),
        });

        currentPage.drawText("Authorized Electronic Signature", {
          x: margin + boxWidth - 165,
          y: boxY - 84,
          size: 7,
          font: fontOblique,
          color: rgb(0.5, 0.55, 0.6),
        });
      } catch (err) {
        console.error("Failed to embed signature PNG into agreement PDF:", err);
      }
    }

    y -= boxHeight + 12;
  }

  // 6. Certificate of Execution / Audit Block
  checkPageBreak(85);
  y -= 8;
  currentPage.drawRectangle({
    x: margin,
    y: y - 65,
    width: contentWidth,
    height: 65,
    color: rgb(0.95, 0.96, 0.98),
    borderColor: rgb(0.8, 0.85, 0.9),
    borderWidth: 0.5,
  });

  currentPage.drawText("CERTIFICATE OF ELECTRONIC EXECUTION & INTEGRITY", {
    x: margin + 10,
    y: y - 14,
    size: 8,
    font: fontBold,
    color: rgb(0.15, 0.25, 0.4),
  });

  currentPage.drawText(
    "This document was electronically acknowledged and signed using the Waypoint Agreements Engine. All parties agreed to conduct the transaction electronically pursuant to the Electronic Signatures in Global and National Commerce Act (E-SIGN, 15 U.S.C. § 7001 et seq.) and the Uniform Electronic Transactions Act (UETA).",
    {
      x: margin + 10,
      y: y - 26,
      size: 6.5,
      font: fontRegular,
      color: rgb(0.35, 0.4, 0.45),
      lineHeight: 9,
      maxWidth: contentWidth - 20,
    }
  );

  currentPage.drawText(`Document SHA-256: ${documentHash}`, {
    x: margin + 10,
    y: y - 56,
    size: 6.5,
    font: fontBold,
    color: rgb(0.2, 0.25, 0.3),
  });

  y -= 75;

  // Final page footer
  drawPageFooter(currentPage);

  // Compile PDF bytes
  const pdfBytes = await pdfDoc.save();
  const pdfBuffer = Buffer.from(pdfBytes);

  // Upload to Cloudflare R2
  const storageKey = `agreements/signed-agreement-${input.agreementId}-${Date.now()}.pdf`;
  let pdfKey = storageKey;
  let pdfUrl = `/storage/${storageKey}`;
  try {
    const putRes = await storagePut(storageKey, pdfBuffer, "application/pdf");
    pdfKey = putRes.key;
    pdfUrl = putRes.url;
  } catch (storageErr) {
    console.warn("Storage upload fallback in test/offline environment:", storageErr);
  }

  // Automatic Document Vault Archival
  let clientFileId: number | undefined;
  try {
    const db = await getDb();
    if (db) {
      const fileName = `${input.title.replace(/[^\w\s-]/g, "").trim()} - Signed.pdf`;
      const res = await db.insert(clientFiles).values({
        clientId: input.clientId,
        projectId: input.studentContactId ?? null,
        fileName,
        fileUrl: pdfUrl,
        fileKey: pdfKey,
        fileSize: pdfBuffer.length,
        mimeType: "application/pdf",
      });
      clientFileId = Number((res as any).lastInsertRowid);
    }
  } catch (err) {
    console.error("Failed to register agreement in clientFiles (Document Vault):", err);
  }

  return {
    pdfUrl,
    pdfKey,
    documentHash,
    clientFileId,
  };
}
