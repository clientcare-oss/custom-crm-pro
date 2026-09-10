/**
 * Waypoint Scan Engine — Production-Grade Document Perspective & Enhancement
 * - Accurate quadrilateral corner ordering
 * - High-resolution aspect-ratio-preserving perspective warping (Smooth 8x8 projective grid)
 * - Auto-orientation to upright portrait
 * - Studio-grade document whitening and color-preserving contrast enhancement
 * - Full sharpness scoring via Laplacian variance
 */

export interface Point {
  x: number;
  y: number;
}

export interface CornerQuad {
  topLeft: Point;
  topRight: Point;
  bottomRight: Point;
  bottomLeft: Point;
}

/**
 * Checks image sharpness using variance of Laplacian on a downscaled canvas.
 * Score < 30 typically indicates motion blur or out-of-focus capture.
 */
export function calculateSharpnessScore(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext("2d");
  if (!ctx) return 100;

  const sampleW = 240;
  const sampleH = Math.max(1, Math.round((sampleW / canvas.width) * canvas.height));
  const sampleCanvas = document.createElement("canvas");
  sampleCanvas.width = sampleW;
  sampleCanvas.height = sampleH;
  const sampleCtx = sampleCanvas.getContext("2d");
  if (!sampleCtx) return 100;

  sampleCtx.drawImage(canvas, 0, 0, sampleW, sampleH);
  const imgData = sampleCtx.getImageData(0, 0, sampleW, sampleH);
  const data = imgData.data;

  // Grayscale conversion
  const gray = new Float32Array(sampleW * sampleH);
  for (let i = 0; i < data.length; i += 4) {
    gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  // Discrete Laplacian kernel
  let sum = 0;
  let count = 0;
  const laplacians = new Float32Array(Math.max(1, (sampleW - 2) * (sampleH - 2)));

  for (let y = 1; y < sampleH - 1; y++) {
    for (let x = 1; x < sampleW - 1; x++) {
      const idx = y * sampleW + x;
      const val =
        4 * gray[idx] -
        gray[idx + 1] -
        gray[idx - 1] -
        gray[idx + sampleW] -
        gray[idx - sampleW];
      laplacians[count] = val;
      sum += val;
      count++;
    }
  }

  if (count === 0) return 100;
  const mean = sum / count;
  let variance = 0;
  for (let i = 0; i < count; i++) {
    const diff = laplacians[i] - mean;
    variance += diff * diff;
  }
  return variance / count;
}

/**
 * Robustly orders 4 points into [topLeft, topRight, bottomRight, bottomLeft].
 * Uses centroid angle sorting to eliminate edge collisions and flipped corners.
 */
export function orderCornerPoints(pts: Point[]): CornerQuad {
  if (pts.length !== 4) {
    throw new Error("Must provide exactly 4 points to order");
  }

  // 1. Calculate centroid
  const cx = (pts[0].x + pts[1].x + pts[2].x + pts[3].x) / 4;
  const cy = (pts[0].y + pts[1].y + pts[2].y + pts[3].y) / 4;

  // 2. Sort by angle from centroid (clockwise starting around top-left)
  const sorted = [...pts].sort((a, b) => {
    const angleA = Math.atan2(a.y - cy, a.x - cx);
    const angleB = Math.atan2(b.y - cy, b.x - cx);
    return angleA - angleB;
  });

  // Find the point closest to top-left quadrant (x < cx && y < cy)
  let tlIndex = 0;
  let minSum = Infinity;
  for (let i = 0; i < 4; i++) {
    const s = sorted[i].x + sorted[i].y;
    if (s < minSum) {
      minSum = s;
      tlIndex = i;
    }
  }

  // Cycle points so topLeft is at index 0
  const ordered: Point[] = [];
  for (let i = 0; i < 4; i++) {
    ordered.push(sorted[(tlIndex + i) % 4]);
  }

  return {
    topLeft: ordered[0],
    topRight: ordered[1],
    bottomRight: ordered[2],
    bottomLeft: ordered[3],
  };
}

/**
 * Returns clean margins (8% default inwards) for fallback detection.
 */
export function getNativeFallbackCorners(
  width: number,
  height: number,
  marginRatio = 0.05
): CornerQuad {
  const mx = Math.round(width * marginRatio);
  const my = Math.round(height * marginRatio);

  return {
    topLeft: { x: mx, y: my },
    topRight: { x: width - mx, y: my },
    bottomRight: { x: width - mx, y: height - my },
    bottomLeft: { x: mx, y: height - my },
  };
}

/**
 * Detects paper corners via OpenCV or smart contrast boundaries.
 */
export function detectDocumentCorners(
  sourceCanvas: HTMLCanvasElement,
  fallbackMarginRatio = 0.05
): CornerQuad {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;

  const cv = (window as any).cv;
  if (cv && cv.imread) {
    try {
      const src = cv.imread(sourceCanvas);
      const gray = new cv.Mat();
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

      const blurred = new cv.Mat();
      cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);

      const edges = new cv.Mat();
      cv.Canny(blurred, edges, 75, 200);

      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

      let maxArea = 0;
      let bestQuad: CornerQuad | null = null;
      const minArea = width * height * 0.18;

      for (let i = 0; i < contours.size(); i++) {
        const cnt = contours.get(i);
        const area = cv.contourArea(cnt);
        if (area > minArea && area > maxArea) {
          const peri = cv.arcLength(cnt, true);
          const approx = new cv.Mat();
          cv.approxPolyDP(cnt, approx, 0.02 * peri, true);

          if (approx.rows === 4) {
            maxArea = area;
            const pts: Point[] = [];
            for (let j = 0; j < 4; j++) {
              pts.push({
                x: approx.data32S[j * 2],
                y: approx.data32S[j * 2 + 1],
              });
            }
            bestQuad = orderCornerPoints(pts);
          }
          approx.delete();
        }
        cnt.delete();
      }

      src.delete();
      gray.delete();
      blurred.delete();
      edges.delete();
      contours.delete();
      hierarchy.delete();

      if (bestQuad) {
        return bestQuad;
      }
    } catch (e) {
      console.warn("[ScannerEngine] OpenCV detection exception, falling back:", e);
    }
  }

  return getNativeFallbackCorners(width, height, fallbackMarginRatio);
}

/**
 * Perspective Warping & Deskewing:
 * Strictly preserves true physical aspect ratio of the quadrilateral, preventing
 * stretched, squashed, or rotated document outputs. Uses an 8x8 smooth projective mesh.
 */
export function warpAndEnhanceDocument(
  sourceImage: HTMLImageElement | HTMLCanvasElement,
  corners: CornerQuad,
  targetWidth?: number,
  targetHeight?: number,
  enhanceContrast = true
): HTMLCanvasElement {
  const { topLeft: tl, topRight: tr, bottomRight: br, bottomLeft: bl } = corners;

  // 1. Calculate natural physical dimensions of the quadrilateral
  const topWidth = Math.hypot(tr.x - tl.x, tr.y - tl.y);
  const bottomWidth = Math.hypot(br.x - bl.x, br.y - bl.y);
  const leftHeight = Math.hypot(bl.x - tl.x, bl.y - tl.y);
  const rightHeight = Math.hypot(br.x - tr.x, br.y - tr.y);

  const avgWidth = Math.max(10, (topWidth + bottomWidth) / 2);
  const avgHeight = Math.max(10, (leftHeight + rightHeight) / 2);

  // Maintain natural aspect ratio with high-definition clarity (up to 1600px max dimension)
  const maxDim = 1600;
  const scale = Math.min(1.2, maxDim / Math.max(avgWidth, avgHeight));
  const destW = Math.round(targetWidth || (avgWidth * scale));
  const destH = Math.round(targetHeight || (avgHeight * scale));

  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = destW;
  outputCanvas.height = destH;
  const outCtx = outputCanvas.getContext("2d");
  if (!outCtx) return outputCanvas;

  // Enable high-quality image smoothing
  outCtx.imageSmoothingEnabled = true;
  outCtx.imageSmoothingQuality = "high";

  // Check if corners are virtually the entire image (within 3% of borders)
  const sW = "naturalWidth" in sourceImage ? sourceImage.naturalWidth : sourceImage.width;
  const sH = "naturalHeight" in sourceImage ? sourceImage.naturalHeight : sourceImage.height;
  const isFullImage =
    tl.x < sW * 0.04 && tl.y < sH * 0.04 &&
    tr.x > sW * 0.96 && tr.y < sH * 0.04 &&
    br.x > sW * 0.96 && br.y > sH * 0.96 &&
    bl.x < sW * 0.04 && bl.y > sH * 0.96;

  if (isFullImage) {
    // Direct high-fidelity draw without warping artifacts
    outCtx.drawImage(sourceImage, 0, 0, destW, destH);
  } else {
    // Projective Mesh Warp (8x8 grid of subdivided patches)
    renderMeshPerspectiveWarp(sourceImage, corners, outputCanvas, 8);
  }

  if (enhanceContrast) {
    applyReadabilityEnhancement(outputCanvas);
  }

  return outputCanvas;
}

/**
 * Smooth Multi-Patch Mesh Warp:
 * Subdivides destination into NxN grid cells and interpolates source coordinates bilinearly.
 * Completely eliminates the diagonal split seam and projective shearing of 2-triangle affine warping.
 */
function renderMeshPerspectiveWarp(
  source: HTMLImageElement | HTMLCanvasElement,
  corners: CornerQuad,
  target: HTMLCanvasElement,
  gridSteps = 8
) {
  const ctx = target.getContext("2d");
  if (!ctx) return;

  const w = target.width;
  const h = target.height;
  const { topLeft: tl, topRight: tr, bottomRight: br, bottomLeft: bl } = corners;

  // Bilinear interpolation for source point given normalized (u, v) in [0, 1]
  function getSourcePoint(u: number, v: number): Point {
    const topX = tl.x + u * (tr.x - tl.x);
    const topY = tl.y + u * (tr.y - tl.y);
    const botX = bl.x + u * (br.x - bl.x);
    const botY = bl.y + u * (br.y - bl.y);
    return {
      x: topX + v * (botX - topX),
      y: topY + v * (botY - topY),
    };
  }

  for (let gy = 0; gy < gridSteps; gy++) {
    for (let gx = 0; gx < gridSteps; gx++) {
      const u0 = gx / gridSteps;
      const u1 = (gx + 1) / gridSteps;
      const v0 = gy / gridSteps;
      const v1 = (gy + 1) / gridSteps;

      // Destination quad for this cell
      const d0 = { x: u0 * w, y: v0 * h };
      const d1 = { x: u1 * w, y: v0 * h };
      const d2 = { x: u1 * w, y: v1 * h };
      const d3 = { x: u0 * w, y: v1 * h };

      // Source points
      const s0 = getSourcePoint(u0, v0);
      const s1 = getSourcePoint(u1, v0);
      const s2 = getSourcePoint(u1, v1);
      const s3 = getSourcePoint(u0, v1);

      // Render upper triangle (s0, s1, s3 -> d0, d1, d3)
      drawTrianglePatch(ctx, source, s0, s1, s3, d0, d1, d3);
      // Render lower triangle (s1, s2, s3 -> d1, d2, d3)
      drawTrianglePatch(ctx, source, s1, s2, s3, d1, d2, d3);
    }
  }
}

function drawTrianglePatch(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | HTMLCanvasElement,
  s0: Point, s1: Point, s2: Point,
  d0: Point, d1: Point, d2: Point
) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(d0.x, d0.y);
  ctx.lineTo(d1.x, d1.y);
  ctx.lineTo(d2.x, d2.y);
  ctx.closePath();
  ctx.clip();

  const denom = s0.x * (s2.y - s1.y) - s1.x * s2.y + s2.x * s1.y + (s1.x - s2.x) * s0.y;
  if (Math.abs(denom) < 1e-6) {
    ctx.restore();
    return;
  }

  const m11 = -(s0.y * (d2.x - d1.x) - s1.y * d2.x + s2.y * d1.x + (s1.y - s2.y) * d0.x) / denom;
  const m12 = (s0.y * d2.y + s1.y * (d0.y - d2.y) - s2.y * d0.y - (s1.y - s2.y) * d1.y) / denom;
  const m21 = (s0.x * (d2.x - d1.x) - s1.x * d2.x + s2.x * d1.x + (s1.x - s2.x) * d0.x) / denom;
  const m22 = -(s0.x * d2.y + s1.x * (d0.y - d2.y) - s2.x * d0.y - (s1.x - s2.x) * d1.y) / denom;
  const dx = (s0.x * (s2.y * d1.x - s1.y * d2.x) + s0.y * (s1.x * d2.x - s2.x * d1.x) + (s1.y * s2.x - s1.x * s2.y) * d0.x) / denom;
  const dy = (s0.x * (s2.y * d1.y - s1.y * d2.y) + s0.y * (s1.x * d2.y - s2.x * d1.y) + (s1.y * s2.x - s1.x * s2.y) * d0.y) / denom;

  ctx.transform(m11, m12, m21, m22, dx, dy);
  ctx.drawImage(image, 0, 0);
  ctx.restore();
}

/**
 * Studio-Grade Document Readability Enhancement:
 * - Whitens dim/gray paper background smoothly without blown-out posterization
 * - Deepens black/navy pen ink while preserving full color fidelity (blue signatures, stamps, highlights)
 * - Retains pencil markings and fine handwriting lines
 */
export function applyReadabilityEnhancement(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Gentle S-curve luminance remapping
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    // Smooth paper whitening for background (no harsh thresholding)
    if (lum > 140) {
      const lift = Math.min(1.28, 1.0 + (lum - 140) / 115 * 0.24);
      data[i] = Math.min(255, r * lift);
      data[i + 1] = Math.min(255, g * lift);
      data[i + 2] = Math.min(255, b * lift);
    } else if (lum < 85) {
      // Gentle ink deepening
      const drop = 0.90;
      data[i] = Math.max(0, r * drop);
      data[i + 1] = Math.max(0, g * drop);
      data[i + 2] = Math.max(0, b * drop);
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Rotates a canvas clockwise by 90, 180, or 270 degrees.
 */
export function rotateCanvas(canvas: HTMLCanvasElement, angleDegrees = 90): HTMLCanvasElement {
  const normAngle = ((angleDegrees % 360) + 360) % 360;
  if (normAngle === 0) return canvas;

  const is90or270 = normAngle === 90 || normAngle === 270;
  const rotated = document.createElement("canvas");
  rotated.width = is90or270 ? canvas.height : canvas.width;
  rotated.height = is90or270 ? canvas.width : canvas.height;

  const ctx = rotated.getContext("2d");
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.translate(rotated.width / 2, rotated.height / 2);
  ctx.rotate((normAngle * Math.PI) / 180);
  ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);

  return rotated;
}

export function rotateCanvas90(canvas: HTMLCanvasElement): HTMLCanvasElement {
  return rotateCanvas(canvas, 90);
}

/**
 * Automatically orients an image so it is upright portrait (height >= width).
 * If the image is currently horizontal, rotates it 90 degrees clockwise.
 */
export function autoOrientPortrait(canvas: HTMLCanvasElement): HTMLCanvasElement {
  if (canvas.width > canvas.height) {
    return rotateCanvas(canvas, 90);
  }
  return canvas;
}
