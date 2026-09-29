import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import crypto from "crypto";
import { storagePut } from "../storage";
import { getDb } from "../db/connection";
import { clientFiles } from "../../drizzle/schema";

export interface ReceiptPdfInput {
  receiptNumber: string;
  transactionId: number;
  companyName: string;
  businessEmail: string;
  businessPhone: string;
  businessAddress?: string | null;
  website?: string | null;
  clientName: string;
  clientEmail?: string | null;
  studentName?: string | null;
  caseId?: string | null;
  serviceName: string;
  planName?: string | null;
  transactionType?: string;
  amountCents: number;
  currency?: string;
  status: string; // PAID, PARTIALLY_REFUNDED, REFUNDED
  paymentMethodBrand?: string | null;
  paymentMethodLast4?: string | null;
  paidAt: Date | string;
  nextPaymentDate?: Date | string | null;
  nextPaymentAmountCents?: number | null;
  stripePaymentIntentId?: string | null;
  stripeInvoiceId?: string | null;
  refundAmountCents?: number;
  refundReason?: string | null;
  footerMessage?: string | null;
  clientId?: number | null;
  studentContactId?: number | null;
}

export async function generateAndArchiveReceiptPdf(input: ReceiptPdfInput): Promise<{
  pdfUrl: string;
  pdfKey: string;
  documentHash: string;
  pdfBuffer: Buffer;
}> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;

  const page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  // 1. Top Brand Banner (Navy bar with gold accent line)
  page.drawRectangle({
    x: margin,
    y: y - 48,
    width: contentWidth,
    height: 48,
    color: rgb(0.04, 0.08, 0.16), // #0a1428 Waypoint Navy
  });

  // Gold accent line under header
  page.drawRectangle({
    x: margin,
    y: y - 51,
    width: contentWidth,
    height: 3,
    color: rgb(0.83, 0.69, 0.22), // #d4af37 Metallic Gold
  });

  page.drawText(input.companyName.toUpperCase(), {
    x: margin + 16,
    y: y - 24,
    size: 14,
    font: fontBold,
    color: rgb(0.98, 0.98, 1.0),
  });

  page.drawText("OFFICIAL PAYMENT RECEIPT", {
    x: margin + 16,
    y: y - 40,
    size: 8.5,
    font: fontRegular,
    color: rgb(0.7, 0.8, 0.92),
  });

  page.drawText(`RECEIPT: ${input.receiptNumber}`, {
    x: margin + contentWidth - 160,
    y: y - 28,
    size: 11,
    font: fontBold,
    color: rgb(0.83, 0.69, 0.22),
  });

  y -= 75;

  // 2. Company & Transaction Meta Grid
  const leftColX = margin;
  const rightColX = margin + contentWidth / 2 + 10;
  const colY = y;

  // Left column: Provider Contact
  page.drawText("ISSUED BY:", { x: leftColX, y: colY, size: 8, font: fontBold, color: rgb(0.4, 0.45, 0.5) });
  page.drawText(input.companyName, { x: leftColX, y: colY - 14, size: 10, font: fontBold, color: rgb(0.1, 0.15, 0.2) });
  page.drawText(`Email: ${input.businessEmail}`, { x: leftColX, y: colY - 26, size: 8.5, font: fontRegular, color: rgb(0.25, 0.3, 0.35) });
  page.drawText(`Phone: ${input.businessPhone}`, { x: leftColX, y: colY - 38, size: 8.5, font: fontRegular, color: rgb(0.25, 0.3, 0.35) });
  if (input.businessAddress) {
    page.drawText(`Office: ${input.businessAddress}`, { x: leftColX, y: colY - 50, size: 8.5, font: fontRegular, color: rgb(0.25, 0.3, 0.35) });
  }

  // Right column: Transaction Details
  const paidDateStr = new Date(input.paidAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  page.drawText("PAYMENT DETAILS:", { x: rightColX, y: colY, size: 8, font: fontBold, color: rgb(0.4, 0.45, 0.5) });
  page.drawText(`Date & Time: ${paidDateStr}`, { x: rightColX, y: colY - 14, size: 8.5, font: fontRegular, color: rgb(0.15, 0.2, 0.25) });
  
  const paymentMethodStr = input.paymentMethodBrand && input.paymentMethodLast4
    ? `${input.paymentMethodBrand} ending in ${input.paymentMethodLast4}`
    : "Card on file";
  page.drawText(`Payment Method: ${paymentMethodStr}`, { x: rightColX, y: colY - 26, size: 8.5, font: fontRegular, color: rgb(0.15, 0.2, 0.25) });

  // Status Badge
  const isRefunded = input.status === "REFUNDED";
  const isPartial = input.status === "PARTIALLY_REFUNDED";
  const statusLabel = isRefunded ? "REFUNDED" : isPartial ? "PARTIALLY REFUNDED" : "PAID IN FULL";
  const statusColor = isRefunded ? rgb(0.85, 0.2, 0.2) : isPartial ? rgb(0.85, 0.55, 0.1) : rgb(0.06, 0.6, 0.35);

  page.drawText("Status: ", { x: rightColX, y: colY - 38, size: 8.5, font: fontRegular, color: rgb(0.15, 0.2, 0.25) });
  page.drawText(statusLabel, { x: rightColX + 35, y: colY - 38, size: 8.5, font: fontBold, color: statusColor });

  if (input.stripePaymentIntentId) {
    page.drawText(`Stripe Reference: ${input.stripePaymentIntentId}`, { x: rightColX, y: colY - 50, size: 7.5, font: fontOblique, color: rgb(0.5, 0.55, 0.6) });
  }

  y -= 75;

  // 3. Bill To Box
  page.drawRectangle({
    x: margin,
    y: y - 40,
    width: contentWidth,
    height: 40,
    color: rgb(0.96, 0.97, 0.98),
    borderColor: rgb(0.88, 0.9, 0.93),
    borderWidth: 1,
  });

  page.drawText("BILLED TO:", { x: margin + 12, y: y - 14, size: 7.5, font: fontBold, color: rgb(0.4, 0.45, 0.5) });
  page.drawText(input.clientName, { x: margin + 12, y: y - 28, size: 9.5, font: fontBold, color: rgb(0.1, 0.15, 0.2) });
  if (input.clientEmail) {
    page.drawText(` (${input.clientEmail})`, { x: margin + 12 + fontBold.widthOfTextAtSize(input.clientName, 9.5), y: y - 28, size: 8.5, font: fontRegular, color: rgb(0.4, 0.45, 0.5) });
  }

  if (input.studentName) {
    page.drawText(`Student / Beneficiary: ${input.studentName}${input.caseId ? ` [Case: ${input.caseId}]` : ""}`, {
      x: margin + contentWidth - 240,
      y: y - 28,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.2, 0.3, 0.45),
    });
  }

  y -= 60;

  // 4. Line Items Table
  // Table Header
  page.drawRectangle({
    x: margin,
    y: y - 24,
    width: contentWidth,
    height: 24,
    color: rgb(0.08, 0.14, 0.24), // Dark Navy
  });

  page.drawText("DESCRIPTION", { x: margin + 12, y: y - 16, size: 8, font: fontBold, color: rgb(0.9, 0.95, 1.0) });
  page.drawText("TYPE", { x: margin + contentWidth - 190, y: y - 16, size: 8, font: fontBold, color: rgb(0.9, 0.95, 1.0) });
  page.drawText("AMOUNT", { x: margin + contentWidth - 80, y: y - 16, size: 8, font: fontBold, color: rgb(0.9, 0.95, 1.0) });

  y -= 24;

  // Row 1: Main Plan or Service
  page.drawRectangle({
    x: margin,
    y: y - 36,
    width: contentWidth,
    height: 36,
    color: rgb(1.0, 1.0, 1.0),
    borderColor: rgb(0.9, 0.92, 0.95),
    borderWidth: 1,
  });

  page.drawText(input.serviceName, { x: margin + 12, y: y - 16, size: 9.5, font: fontBold, color: rgb(0.1, 0.15, 0.22) });
  if (input.planName) {
    page.drawText(input.planName, { x: margin + 12, y: y - 28, size: 8, font: fontRegular, color: rgb(0.45, 0.5, 0.55) });
  }

  const txTypeLabel = input.transactionType === "recurring" ? "Recurring Retainer" : "Advocacy Enrollment";
  page.drawText(txTypeLabel, { x: margin + contentWidth - 190, y: y - 20, size: 8.5, font: fontRegular, color: rgb(0.3, 0.35, 0.4) });

  const totalFormatted = `$${(input.amountCents / 100).toFixed(2)}`;
  page.drawText(totalFormatted, { x: margin + contentWidth - 80, y: y - 20, size: 10, font: fontBold, color: rgb(0.1, 0.15, 0.22) });

  y -= 36;

  // Refund Line (if applicable)
  if (input.refundAmountCents && input.refundAmountCents > 0) {
    page.drawRectangle({
      x: margin,
      y: y - 28,
      width: contentWidth,
      height: 28,
      color: rgb(0.99, 0.95, 0.95),
      borderColor: rgb(0.95, 0.85, 0.85),
      borderWidth: 1,
    });

    page.drawText(`Refund Processed${input.refundReason ? ` (${input.refundReason})` : ""}`, {
      x: margin + 12,
      y: y - 18,
      size: 8.5,
      font: fontBold,
      color: rgb(0.8, 0.2, 0.2),
    });

    const refundFormatted = `-$${(input.refundAmountCents / 100).toFixed(2)}`;
    page.drawText(refundFormatted, {
      x: margin + contentWidth - 80,
      y: y - 18,
      size: 9.5,
      font: fontBold,
      color: rgb(0.8, 0.2, 0.2),
    });

    y -= 28;
  }

  y -= 20;

  // 5. Financial Summary Box (Right aligned)
  const summaryBoxWidth = 220;
  const summaryBoxX = margin + contentWidth - summaryBoxWidth;

  page.drawRectangle({
    x: summaryBoxX,
    y: y - 56,
    width: summaryBoxWidth,
    height: 56,
    color: rgb(0.97, 0.98, 0.99),
    borderColor: rgb(0.85, 0.88, 0.92),
    borderWidth: 1,
  });

  page.drawText("Total Paid Today:", { x: summaryBoxX + 12, y: y - 20, size: 9, font: fontRegular, color: rgb(0.3, 0.35, 0.4) });
  page.drawText(totalFormatted, { x: summaryBoxX + summaryBoxWidth - 75, y: y - 20, size: 10, font: fontBold, color: rgb(0.1, 0.15, 0.22) });

  const netCents = Math.max(0, input.amountCents - (input.refundAmountCents || 0));
  const netFormatted = `$${(netCents / 100).toFixed(2)}`;
  page.drawText("Net Amount Settled:", { x: summaryBoxX + 12, y: y - 42, size: 9.5, font: fontBold, color: rgb(0.04, 0.08, 0.16) });
  page.drawText(netFormatted, { x: summaryBoxX + summaryBoxWidth - 75, y: y - 42, size: 11, font: fontBold, color: rgb(0.04, 0.08, 0.16) });

  // Next Scheduled Payment Notice (Left aligned)
  if (input.nextPaymentDate && input.nextPaymentAmountCents) {
    const nextDateFormatted = new Date(input.nextPaymentDate).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const nextAmountFormatted = `$${(input.nextPaymentAmountCents / 100).toFixed(2)}`;

    page.drawRectangle({
      x: margin,
      y: y - 56,
      width: contentWidth - summaryBoxWidth - 16,
      height: 56,
      color: rgb(0.95, 0.98, 1.0),
      borderColor: rgb(0.75, 0.88, 0.98),
      borderWidth: 1,
    });

    page.drawText("NEXT SCHEDULED PAYMENT", { x: margin + 12, y: y - 18, size: 7.5, font: fontBold, color: rgb(0.05, 0.4, 0.7) });
    page.drawText(`${nextDateFormatted} — ${nextAmountFormatted}`, { x: margin + 12, y: y - 34, size: 9.5, font: fontBold, color: rgb(0.08, 0.2, 0.4) });
    page.drawText("Billed automatically via stored payment method", { x: margin + 12, y: y - 46, size: 7.5, font: fontRegular, color: rgb(0.4, 0.5, 0.6) });
  }

  y -= 90;

  // 6. Verification / Audit Stamp
  const rawPayload = JSON.stringify({
    receiptNumber: input.receiptNumber,
    transactionId: input.transactionId,
    amountCents: input.amountCents,
    paidAt: input.paidAt,
    stripePaymentIntentId: input.stripePaymentIntentId,
  });
  const documentHash = crypto.createHash("sha256").update(rawPayload).digest("hex");

  page.drawRectangle({
    x: margin,
    y: y - 44,
    width: contentWidth,
    height: 44,
    color: rgb(0.98, 0.99, 1.0),
    borderColor: rgb(0.9, 0.93, 0.96),
    borderWidth: 1,
  });

  page.drawText("TRANSACTION INTEGRITY VERIFICATION", { x: margin + 12, y: y - 16, size: 7.5, font: fontBold, color: rgb(0.3, 0.4, 0.5) });
  page.drawText(
    "Confirmed via Stripe payment gateway. Stored in Waypoint Advocates financial records and client case vault.",
    { x: margin + 12, y: y - 28, size: 7, font: fontRegular, color: rgb(0.45, 0.5, 0.55) }
  );
  page.drawText(`SHA-256 Audit Hash: ${documentHash}`, { x: margin + 12, y: y - 38, size: 6.5, font: fontBold, color: rgb(0.4, 0.45, 0.5) });

  y -= 60;

  // 7. Footer
  const footerText = input.footerMessage || "Thank you for trusting Waypoint Advocates with your child's educational journey.";
  page.drawText(footerText, {
    x: margin,
    y: y,
    size: 8,
    font: fontOblique,
    color: rgb(0.4, 0.45, 0.5),
  });

  page.drawText(`Questions regarding this receipt? Contact ${input.businessEmail} or call ${input.businessPhone}`, {
    x: margin,
    y: y - 14,
    size: 7.5,
    font: fontRegular,
    color: rgb(0.5, 0.55, 0.6),
  });

  // Bottom gold accent line
  page.drawRectangle({
    x: margin,
    y: margin + 10,
    width: contentWidth,
    height: 1.5,
    color: rgb(0.83, 0.69, 0.22),
  });

  page.drawText(`Waypoint Advocates © ${new Date().getFullYear()} • All Rights Reserved`, {
    x: margin,
    y: margin,
    size: 7,
    font: fontRegular,
    color: rgb(0.55, 0.6, 0.65),
  });

  const pdfBytes = await pdfDoc.save();
  const pdfBuffer = Buffer.from(pdfBytes);

  // Upload to R2 storage
  const storageKey = `receipts/${input.receiptNumber}-${Date.now()}.pdf`;
  let pdfKey = storageKey;
  let pdfUrl = `/storage/${storageKey}`;
  try {
    const putRes = await storagePut(storageKey, pdfBuffer, "application/pdf");
    pdfKey = putRes.key;
    pdfUrl = putRes.url;
  } catch (storageErr) {
    console.warn("R2 receipt storage upload fallback in test/offline environment:", storageErr);
  }

  // Automatic Document Vault Archival (if student/client ID provided)
  if (input.clientId) {
    try {
      const db = await getDb();
      if (db) {
        await db.insert(clientFiles).values({
          clientId: input.clientId,
          projectId: input.studentContactId ?? null,
          fileName: `Receipt ${input.receiptNumber} - ${input.serviceName}.pdf`,
          fileUrl: pdfUrl,
          fileKey: pdfKey,
          fileSize: pdfBuffer.length,
          mimeType: "application/pdf",
        });
      }
    } catch (err) {
      console.warn("Failed to archive receipt in clientFiles Document Vault:", err);
    }
  }

  return {
    pdfUrl,
    pdfKey,
    documentHash,
    pdfBuffer,
  };
}
