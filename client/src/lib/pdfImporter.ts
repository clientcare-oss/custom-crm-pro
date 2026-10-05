/**
 * PDF Importer Utility for Waypoint Scan
 * Renders uploaded PDF documents page-by-page into crisp, high-resolution raster images (JPEG data URLs)
 * so parents and advocates can review, rotate, fill, sign, and compile them.
 */

import * as pdfjsLib from "pdfjs-dist";

// Set worker to CDN matching the exact installed version for seamless zero-config browser compatibility
if (typeof window !== "undefined" && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
}

export interface ImportedPdfPage {
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Parses an uploaded PDF ArrayBuffer and converts each page into a high-res image data URL.
 * Scale 2.0 provides retina-quality crisp rendering of text and scanned lines.
 */
export async function convertPdfToPageImages(
  pdfData: ArrayBuffer | Uint8Array,
  scale = 2.0
): Promise<ImportedPdfPage[]> {
  const loadingTask = pdfjsLib.getDocument({
    data: pdfData instanceof Uint8Array ? pdfData : new Uint8Array(pdfData),
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const pages: ImportedPdfPage[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) continue;

    // Fill white background for pages that have transparent backgrounds
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport,
    }).promise;

    const dataUrl = canvas.toDataURL("image/jpeg", 0.94);
    pages.push({
      pageNumber: pageNum,
      dataUrl,
      width: canvas.width,
      height: canvas.height,
    });
  }

  return pages;
}

/**
 * Extracts plain text page-by-page from an uploaded PDF ArrayBuffer or Uint8Array.
 * Preserves line breaks and vertical positioning so structured headings, labels, and
 * multiline Advocate Ready fields parse accurately.
 */
export async function extractTextFromPdf(
  pdfData: ArrayBuffer | Uint8Array
): Promise<{ text: string; numPages: number }> {
  const loadingTask = pdfjsLib.getDocument({
    data: pdfData instanceof Uint8Array ? pdfData : new Uint8Array(pdfData),
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();

    let lastY: number | null = null;
    let pageText = "";

    for (const item of textContent.items as any[]) {
      if (!item || typeof item.str !== "string") continue;

      const currentY = item.transform ? item.transform[5] : null;

      // If vertical Y position shifts significantly, insert a newline
      if (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 5) {
        pageText += "\n";
      } else if (item.hasEOL) {
        pageText += "\n";
      } else if (
        pageText.length > 0 &&
        !pageText.endsWith(" ") &&
        !pageText.endsWith("\n") &&
        !item.str.startsWith(" ")
      ) {
        pageText += " ";
      }

      pageText += item.str;
      if (currentY !== null) {
        lastY = currentY;
      }
    }

    if (pageText.trim()) {
      pageTexts.push(pageText.trim());
    }
  }

  return {
    text: pageTexts.join("\n\n"),
    numPages,
  };
}
