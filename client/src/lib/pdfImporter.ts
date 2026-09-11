/**
 * PDF Importer Utility for Waypoint Scan
 * Renders uploaded PDF documents page-by-page into crisp, high-resolution raster images (JPEG data URLs)
 * so parents and advocates can review, rotate, fill, sign, and compile them.
 */

import * as pdfjsLib from "pdfjs-dist";

// Set worker to CDN matching the exact installed version for seamless zero-config browser compatibility
if (typeof window !== "undefined" && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
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
    cMapUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/",
    cMapPacked: true,
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
