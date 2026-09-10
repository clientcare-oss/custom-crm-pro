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

/**
 * Helper to embed page image and render annotations onto a PDFDocument page.
 */
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

  // Standard Letter dimensions or image aspect ratio
  const imgWidth = embeddedImage.width;
  const imgHeight = embeddedImage.height;

  // Fit standard page dimensions
  const pageWidth = 612; // 8.5" at 72 dpi
  const pageHeight = 792; // 11" at 72 dpi

  // Calculate scaled dimensions to preserve aspect ratio within Letter page
  const scale = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
  const renderW = imgWidth * scale;
  const renderH = imgHeight * scale;
  const offsetX = (pageWidth - renderW) / 2;
  const offsetY = (pageHeight - renderH) / 2;

  const pdfPage = pdfDoc.addPage([pageWidth, pageHeight]);

  // Handle page rotation if any
  if (pageDraft.rotation) {
    pdfPage.setRotation({ angle: (pageDraft.rotation % 360) as any, type: 0 as any });
  }

  // Draw background document image
  pdfPage.drawImage(embeddedImage, {
    x: offsetX,
    y: offsetY,
    width: renderW,
    height: renderH,
  });

  // Render annotations on top of document image
  if (annotations.length > 0) {
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    for (const annot of annotations) {
      // Coordinate conversions:
      // annot.x and annot.y are percentages (0-100) relative to the document image
      // PDF coordinate system has (0,0) at bottom-left
      const targetX = offsetX + (annot.x / 100) * renderW;
      const targetY = offsetY + renderH - ((annot.y / 100) * renderH);

      switch (annot.type) {
        case "check": {
          // Render checkmark icon
          const checkSize = Math.max(16, (annot.fontSize || 20));
          pdfPage.drawText("✓", {
            x: targetX,
            y: targetY - checkSize + 2,
            size: checkSize,
            font: fontBold,
            color: rgb(0.05, 0.15, 0.35), // Waypoint navy ink
          });
          break;
        }

        case "text":
        case "date":
        case "initials": {
          const fontSize = annot.fontSize || (annot.type === "initials" ? 14 : 12);
          const content = annot.content || (annot.type === "date" ? new Date().toLocaleDateString("en-US") : "");
          if (content) {
            pdfPage.drawText(content, {
              x: targetX,
              y: targetY - fontSize + 2,
              size: fontSize,
              font: annot.type === "initials" ? fontBold : font,
              color: rgb(0.04, 0.12, 0.28),
            });
          }
          break;
        }

        case "signature": {
          if (annot.content && annot.content.startsWith("data:image")) {
            try {
              const sigBytes = dataUrlToUint8Array(annot.content);
              const sigImg = await pdfDoc.embedPng(sigBytes);

              const sigW = annot.width ? (annot.width / 100) * renderW : 140;
              const sigH = annot.height ? (annot.height / 100) * renderH : (sigW / sigImg.width) * sigImg.height;

              pdfPage.drawImage(sigImg, {
                x: targetX,
                y: targetY - sigH,
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
