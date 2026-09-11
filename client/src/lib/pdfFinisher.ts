/**
 * Waypoint Scan PDF Finisher
 * Uses pdf-lib to compile, flatten, and export standard high-resolution PDFs.
 * Generates both the original clean scan and the completed/signed document.
 * Handles Web Share API and native device saving.
 */

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { DocumentAnnotation, WaypointScanPageDraft } from "./waypointScanStorage";

export interface GeneratePdfResult {
  originalBytes: Uint8Array;
  completedBytes: Uint8Array;
  originalFileName: string;
  completedFileName: string;
}

/**
 * Compiles scanned pages and annotations into standard PDF documents.
 */
export async function compileWaypointPdfs(
  pages: WaypointScanPageDraft[],
  annotations: Record<string, DocumentAnnotation[]>,
  baseTitle: string
): Promise<GeneratePdfResult> {
  const safeTitle = baseTitle.trim().replace(/\.pdf$/i, "") || "Waypoint Document";
  const originalFileName = `${safeTitle}.pdf`;
  const completedFileName = `${safeTitle} - Completed.pdf`;

  // 1. Build Original Clean PDF (Unannotated)
  const originalDoc = await PDFDocument.create();
  for (const page of pages) {
    await renderSinglePdfPage(originalDoc, page, []);
  }
  const originalBytes = await originalDoc.save();

  // 2. Build Completed PDF (Flattened with Annotations & Signatures)
  const completedDoc = await PDFDocument.create();
  for (const page of pages) {
    const pageAnnots = annotations[page.id] || [];
    await renderSinglePdfPage(completedDoc, page, pageAnnots);
  }
  const completedBytes = await completedDoc.save();

  return {
    originalBytes,
    completedBytes,
    originalFileName,
    completedFileName,
  };
}

function cleanWinAnsiText(str: string): string {
  return str
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2026]/g, "...")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, ""); // keep standard printable characters
}

async function renderSinglePdfPage(
  pdfDoc: PDFDocument,
  pageDraft: WaypointScanPageDraft,
  annotations: DocumentAnnotation[]
) {
  // Convert DataURL to bytes
  const imageBytes = dataUrlToUint8Array(pageDraft.dataUrl);

  // Embed image based on type (PNG vs JPG)
  let embeddedImage;
  if (pageDraft.dataUrl.startsWith("data:image/png")) {
    embeddedImage = await pdfDoc.embedPng(imageBytes);
  } else {
    embeddedImage = await pdfDoc.embedJpg(imageBytes);
  }

  const imgWidth = embeddedImage.width;
  const imgHeight = embeddedImage.height;

  // Professional PDF dimensions: Base width 612pt (standard Letter width), height proportional to scanned page.
  // If the scanned page is within 3% of standard Letter (8.5x11), snap cleanly to 612x792.
  const letterAspect = 612 / 792;
  const imageAspect = imgWidth / imgHeight;
  const isNearLetter = Math.abs(imageAspect - letterAspect) < 0.03;

  const pageWidth = 612;
  const pageHeight = isNearLetter ? 792 : Math.round(612 * (imgHeight / imgWidth));

  const scale = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
  const renderW = imgWidth * scale;
  const renderH = imgHeight * scale;
  const offsetX = (pageWidth - renderW) / 2;
  const offsetY = (pageHeight - renderH) / 2;

  const pdfPage = pdfDoc.addPage([pageWidth, pageHeight]);

  // Note: pageDraft.dataUrl is already physically rotated via canvas rotateCanvas,
  // so no secondary pdfPage.setRotation is needed.

  // Draw background document image
  pdfPage.drawImage(embeddedImage, {
    x: offsetX,
    y: offsetY,
    width: renderW,
    height: renderH,
  });

  // Render annotations on top of document image with exact center alignment
  if (annotations.length > 0) {
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    for (const annot of annotations) {
      // Coordinate conversions:
      // annot.x and annot.y are percentages (0-100) relative to the document image
      // In DOM preview, all annotations are centered at (annot.x, annot.y) with -translate-x-1/2 -translate-y-1/2
      // PDF coordinate system has (0,0) at bottom-left
      const centerX = offsetX + (annot.x / 100) * renderW;
      const centerY = offsetY + renderH - ((annot.y / 100) * renderH);

      switch (annot.type) {
        case "check": {
          // Guard minimum size: 7pt min, 40pt max
          const checkSize = Math.max(7, Math.min(40, annot.fontSize || 20));

          // Draw vector checkmark directly onto PDF page:
          // Eliminates WinAnsi Unicode 0x2713 font encoding errors entirely
          const w = checkSize * 0.85;
          const h = checkSize * 0.75;
          const leftX = centerX - w / 2;
          const leftY = centerY + h * 0.1;
          const midX = centerX - w * 0.12;
          const midY = centerY - h * 0.45;
          const rightX = centerX + w / 2;
          const rightY = centerY + h * 0.45;

          const strokeWidth = Math.max(1.3, checkSize * 0.14);
          const strokeColor = rgb(0.05, 0.15, 0.35); // Waypoint navy ink

          pdfPage.drawLine({
            start: { x: leftX, y: leftY },
            end: { x: midX, y: midY },
            thickness: strokeWidth,
            color: strokeColor,
            lineCap: 1 as any, // round cap
          });
          pdfPage.drawLine({
            start: { x: midX, y: midY },
            end: { x: rightX, y: rightY },
            thickness: strokeWidth,
            color: strokeColor,
            lineCap: 1 as any, // round cap
          });
          break;
        }

        case "text":
        case "date":
        case "initials": {
          // Guard minimum size: 7pt min, 32pt max
          const fontSize = Math.max(7, Math.min(32, annot.fontSize || (annot.type === "initials" ? 13 : 11)));
          const rawContent = annot.content || (annot.type === "date" ? new Date().toLocaleDateString("en-US") : "");
          const content = cleanWinAnsiText(rawContent);
          if (content) {
            try {
              const selectedFont = annot.type === "initials" ? fontBold : font;
              const textWidth = selectedFont.widthOfTextAtSize(content, fontSize);
              const textHeight = selectedFont.heightAtSize(fontSize);

              // Center horizontally on centerX, baseline aligned to vertical center
              pdfPage.drawText(content, {
                x: centerX - (textWidth / 2),
                y: centerY - (textHeight * 0.32),
                size: fontSize,
                font: selectedFont,
                color: rgb(0.04, 0.12, 0.28),
              });
            } catch (textErr) {
              console.warn("[PdfFinisher] Text draw fallback:", textErr);
            }
          }
          break;
        }

        case "signature": {
          if (annot.content && annot.content.startsWith("data:image")) {
            try {
              const sigBytes = dataUrlToUint8Array(annot.content);
              const sigImg = await pdfDoc.embedPng(sigBytes);

              // Guard minimum width: 7% min, 55% max of document width
              const clampedWidthPct = Math.max(7, Math.min(55, annot.width || 24));
              const sigW = (clampedWidthPct / 100) * renderW;
              const sigH = (sigW / sigImg.width) * sigImg.height;

              // Center signature horizontally and vertically on (centerX, centerY)
              pdfPage.drawImage(sigImg, {
                x: centerX - (sigW / 2),
                y: centerY - (sigH / 2),
                width: sigW,
                height: sigH,
              });
            } catch (sigErr) {
              console.warn("[PdfFinisher] Failed to embed signature:", sigErr);
            }
          }
          break;
        }
      }
    }
  }
}

/**
 * Converts a base64 dataURL to Uint8Array.
 */
export function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const parts = dataUrl.split(",");
  const base64 = parts.length > 1 ? parts[1] : parts[0];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Triggers a direct native browser download for a PDF.
 */
export function savePdfToDevice(pdfBytes: Uint8Array, fileName: string) {
  const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

/**
 * Shares the PDF using the native Web Share API with file sharing if supported.
 * Falls back gracefully to download if file sharing is not supported.
 */
export async function sharePdfFile(
  pdfBytes: Uint8Array,
  fileName: string,
  title = "Waypoint Signed Document"
): Promise<{ shared: boolean; fallbackNeeded: boolean; error?: string }> {
  if (typeof navigator === "undefined" || !navigator.share) {
    return { shared: false, fallbackNeeded: true };
  }

  try {
    const file = new File([pdfBytes as any], fileName, { type: "application/pdf" });

    // Check if navigator.canShare supports files
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title,
        text: `Here is your document: ${fileName}`,
        files: [file],
      });
      return { shared: true, fallbackNeeded: false };
    } else {
      return { shared: false, fallbackNeeded: true };
    }
  } catch (err: any) {
    // User cancelled share dialog or permission denied
    if (err.name === "AbortError") {
      return { shared: false, fallbackNeeded: false };
    }
    console.warn("[PdfFinisher] Web Share failed:", err);
    return { shared: false, fallbackNeeded: true, error: err.message };
  }
}
