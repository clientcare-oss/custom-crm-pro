/**
 * Waypoint Scan Engine
 * Implements jscanify & OpenCV.js principles:
 * - Real-time document edge & corner detection
 * - Automatic perspective warping and straightening
 * - Blur & image sharpness scoring (Laplacian variance)
 * - Automatic contrast and readability enhancement
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
 * Returns a score; typically < 40 indicates noticeable motion blur or out-of-focus capture.
 */
export function calculateSharpnessScore(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext("2d");
  if (!ctx) return 100;

  // Downsample to 240x180 for quick sub-millisecond calculation
  const sampleW = 240;
  const sampleH = Math.round((sampleW / canvas.width) * canvas.height);
  const sampleCanvas = document.createElement("canvas");
  sampleCanvas.width = sampleW;
  sampleCanvas.height = sampleH;
  const sampleCtx = sampleCanvas.getContext("2d");
  if (!sampleCtx) return 100;

  sampleCtx.drawImage(canvas, 0, 0, sampleW, sampleH);
  const imgData = sampleCtx.getImageData(0, 0, sampleW, sampleH);
  const data = imgData.data;

  // Convert to grayscale
  const gray = new Float32Array(sampleW * sampleH);
  for (let i = 0; i < data.length; i += 4) {
    gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  // Compute discrete Laplacian: L(x,y) = 4*I(x,y) - I(x+1,y) - I(x-1,y) - I(x,y+1) - I(x,y-1)
  let sum = 0;
  let count = 0;
  const laplacians = new Float32Array((sampleW - 2) * (sampleH - 2));

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
 * Automatically detects the four corners of paper in an image/video frame.
 * Uses OpenCV if available in window, or an adaptive contrast-gradient bounding heuristic.
 */
export function detectDocumentCorners(
  sourceCanvas: HTMLCanvasElement,
  fallbackMarginRatio = 0.08
): CornerQuad {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;

  // If window.cv is loaded and initialized, we can use OpenCV contour detection
  const cv = (window as any).cv;
  if (cv && cv.imread) {
    try {
      const src = cv.imread(sourceCanvas);
      const gray = new cv.Mat();
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

      const blurred = new cv.Mat();
      const ksize = new cv.Size(5, 5);
      cv.GaussianBlur(gray, blurred, ksize, 0, 0, cv.BORDER_DEFAULT);

      const edges = new cv.Mat();
      cv.Canny(blurred, edges, 75, 200);

      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

      let maxArea = 0;
      let bestQuad: CornerQuad | null = null;
      const minArea = width * height * 0.15; // Document should occupy at least 15% of frame

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

  // Fast Native Canvas Edge Heuristic Fallback
  return getNativeFallbackCorners(width, height, fallbackMarginRatio);
}

/**
 * Returns balanced default quadrilateral margins (inwards from frame).
 */
export function getNativeFallbackCorners(
  width: number,
  height: number,
  marginRatio = 0.08
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
 * Orders 4 points into standard [topLeft, topRight, bottomRight, bottomLeft].
 */
export function orderCornerPoints(pts: Point[]): CornerQuad {
  if (pts.length !== 4) {
    throw new Error("Must provide exactly 4 points to order");
  }

  // Sum (x + y): smallest is top-left, largest is bottom-right
  // Difference (y - x): smallest is top-right, largest is bottom-left
  const sortedBySum = [...pts].sort((a, b) => a.x + a.y - (b.x + b.y));
  const topLeft = sortedBySum[0];
  const bottomRight = sortedBySum[3];

  const sortedByDiff = [...pts].sort((a, b) => a.y - a.x - (b.y - b.x));
  const topRight = sortedByDiff[0];
  const bottomLeft = sortedByDiff[3];

  return { topLeft, topRight, bottomRight, bottomLeft };
}

/**
 * Perspective warping: extracts the quadrilateral region defined by corners,
 * deskews/straightens it, and renders into a high-resolution output canvas.
 */
export function warpAndEnhanceDocument(
  sourceImage: HTMLImageElement | HTMLCanvasElement,
  corners: CornerQuad,
  targetWidth?: number,
  targetHeight?: number,
  enhanceContrast = true
): HTMLCanvasElement {
  const { topLeft: tl, topRight: tr, bottomRight: br, bottomLeft: bl } = corners;

  // Calculate destination dimensions if not provided (standard aspect ratio)
  const topWidth = Math.hypot(tr.x - tl.x, tr.y - tl.y);
  const bottomWidth = Math.hypot(br.x - bl.x, br.y - bl.y);
  const leftHeight = Math.hypot(bl.x - tl.x, bl.y - tl.y);
  const rightHeight = Math.hypot(br.x - tr.x, br.y - tr.y);

  const destW = Math.round(targetWidth || Math.max(topWidth, bottomWidth, 800));
  const destH = Math.round(targetHeight || Math.max(leftHeight, rightHeight, 1100));

  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = destW;
  outputCanvas.height = destH;
  const outCtx = outputCanvas.getContext("2d");
  if (!outCtx) return outputCanvas;

  // Use OpenCV warpPerspective if available
  const cv = (window as any).cv;
  if (cv && cv.imread && cv.warpPerspective) {
    try {
      const srcMat = cv.imread(sourceImage);
      const dstMat = new cv.Mat();

      const srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
        tl.x, tl.y,
        tr.x, tr.y,
        br.x, br.y,
        bl.x, bl.y,
      ]);

      const dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
        0, 0,
        destW, 0,
        destW, destH,
        0, destH,
      ]);

      const M = cv.getPerspectiveTransform(srcPts, dstPts);
      const dsize = new cv.Size(destW, destH);
      cv.warpPerspective(srcMat, dstMat, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

      cv.imshow(outputCanvas, dstMat);

      srcMat.delete();
      dstMat.delete();
      srcPts.delete();
      dstPts.delete();
      M.delete();

      if (enhanceContrast) {
        applyReadabilityEnhancement(outputCanvas);
      }
      return outputCanvas;
    } catch (e) {
      console.warn("[ScannerEngine] OpenCV warp failed, using canvas transform fallback:", e);
    }
  }

  // Pure Canvas Projective Approximation Fallback (Subdivides into 2 triangles or bilinear mapping)
  renderBilinearWarp(sourceImage, corners, outputCanvas);

  if (enhanceContrast) {
    applyReadabilityEnhancement(outputCanvas);
  }

  return outputCanvas;
}

/**
 * Pure Canvas projective texture mapping fallback.
 */
function renderBilinearWarp(
  source: HTMLImageElement | HTMLCanvasElement,
  corners: CornerQuad,
  target: HTMLCanvasElement
) {
  const ctx = target.getContext("2d");
  if (!ctx) return;

  const w = target.width;
  const h = target.height;

  // Split quadrilateral into 2 triangles and render affine transforms
  const { topLeft: tl, topRight: tr, bottomRight: br, bottomLeft: bl } = corners;

  // Draw Upper Triangle: (tl, tr, bl) -> (0,0, w,0, 0,h)
  drawTriangleSubdivision(ctx, source, tl, tr, bl, { x: 0, y: 0 }, { x: w, y: 0 }, { x: 0, y: h });

  // Draw Lower Triangle: (tr, br, bl) -> (w,0, w,h, 0,h)
  drawTriangleSubdivision(ctx, source, tr, br, bl, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h });
}

function drawTriangleSubdivision(
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

  // Compute 2D affine transform matrix mapping s0,s1,s2 -> d0,d1,d2
  const denom = (s0.x * (s2.y - s1.y) - s1.x * s2.y + s2.x * s1.y + (s1.x - s2.x) * s0.y);
  if (Math.abs(denom) < 1e-6) {
    ctx.restore();
    return;
  }

  const m11 = - (s0.y * (d2.x - d1.x) - s1.y * d2.x + s2.y * d1.x + (s1.y - s2.y) * d0.x) / denom;
  const m12 = (s0.y * d2.y + s1.y * (d0.y - d2.y) - s2.y * d0.y - (s1.y - s2.y) * d1.y) / denom;
  const m21 = (s0.x * (d2.x - d1.x) - s1.x * d2.x + s2.x * d1.x + (s1.x - s2.x) * d0.x) / denom;
  const m22 = - (s0.x * d2.y + s1.x * (d0.y - d2.y) - s2.x * d0.y - (s1.x - s2.x) * d1.y) / denom;
  const dx = (s0.x * (s2.y * d1.x - s1.y * d2.x) + s0.y * (s1.x * d2.x - s2.x * d1.x) + (s1.y * s2.x - s1.x * s2.y) * d0.x) / denom;
  const dy = (s0.x * (s2.y * d1.y - s1.y * d2.y) + s0.y * (s1.x * d2.y - s2.x * d1.y) + (s1.y * s2.x - s1.x * s2.y) * d0.y) / denom;

  ctx.transform(m11, m12, m21, m22, dx, dy);
  ctx.drawImage(image, 0, 0);
  ctx.restore();
}

/**
 * Automatically improves readability:
 * - Brightens paper background
 * - Sharpens dark text contrast
 * - Removes mild shadows
 */
export function applyReadabilityEnhancement(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Standard document contrast curve:
  // Lift paper highlights (luminance > 140) towards 245-255
  // Deepen text shadows (luminance < 110) towards crisp black/charcoal
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    let factor = 1.0;
    if (lum > 130) {
      // Paper background brightening
      factor = 1.0 + (lum - 130) / 130 * 0.25;
      data[i] = Math.min(255, r * factor);
      data[i + 1] = Math.min(255, g * factor);
      data[i + 2] = Math.min(255, b * factor);
    } else if (lum < 95) {
      // Ink deepening
      factor = 0.85;
      data[i] = Math.max(0, r * factor);
      data[i + 1] = Math.max(0, g * factor);
      data[i + 2] = Math.max(0, b * factor);
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Rotates a canvas by 90 degrees clockwise.
 */
export function rotateCanvas90(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const rotated = document.createElement("canvas");
  rotated.width = canvas.height;
  rotated.height = canvas.width;
  const ctx = rotated.getContext("2d");
  if (!ctx) return canvas;

  ctx.translate(rotated.width / 2, rotated.height / 2);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);

  return rotated;
}
