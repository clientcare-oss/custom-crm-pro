import { MarinaSpotDef } from "./marinaLotConstants";

export interface SplinePoint {
  x: number;
  y: number;
  dx: number;
  dy: number;
}


function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

function catmullRomDeriv(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  return (
    0.5 *
    (-p0 +
      p2 +
      2 * (2 * p0 - 5 * p1 + 4 * p2 - p3) * t +
      3 * (-p0 + 3 * p1 - 3 * p2 + p3) * t2)
  );
}

export class SplinePath {
  private pts: { x: number; y: number }[];
  private n: number;
  private samples: { s: number; u: number; pt: SplinePoint }[] = [];
  public totalLen: number = 0;

  constructor(waypoints: { x: number; y: number }[]) {
    this.pts = waypoints;
    this.n = waypoints.length;

    let totalLen = 0;
    let prev = this.evalRaw(0);
    this.samples.push({ s: 0, u: 0, pt: prev });

    const steps = 150;
    for (let i = 1; i <= steps; i++) {
      const u = i / steps;
      const curr = this.evalRaw(u);
      const dist = Math.hypot(curr.x - prev.x, curr.y - prev.y);
      totalLen += dist;
      this.samples.push({ s: totalLen, u, pt: curr });
      prev = curr;
    }

    this.totalLen = totalLen;
    for (const sample of this.samples) {
      sample.s /= Math.max(0.001, totalLen);
    }
  }

  private evalRaw(progress: number): SplinePoint {
    if (this.n === 0) return { x: 18, y: 98, dx: 0, dy: -1 };
    if (this.n === 1) return { x: this.pts[0].x, y: this.pts[0].y, dx: 0, dy: -1 };

    if (progress <= 0) {
      const p0 = this.pts[0];
      const p1 = this.pts[1];
      return { x: p0.x, y: p0.y, dx: p1.x - p0.x, dy: p1.y - p0.y };
    }
    if (progress >= 1) {
      const pn2 = this.pts[this.n - 2];
      const pn1 = this.pts[this.n - 1];
      return { x: pn1.x, y: pn1.y, dx: 0, dy: -1 };
    }

    const segProg = progress * (this.n - 1);
    const idx = Math.min(Math.floor(segProg), this.n - 2);
    const t = segProg - idx;

    const p0 = this.pts[Math.max(0, idx - 1)];
    const p1 = this.pts[idx];
    const p2 = this.pts[idx + 1];
    const p3 = this.pts[Math.min(this.n - 1, idx + 2)];

    return {
      x: catmullRom(p0.x, p1.x, p2.x, p3.x, t),
      y: catmullRom(p0.y, p1.y, p2.y, p3.y, t),
      dx: catmullRomDeriv(p0.x, p1.x, p2.x, p3.x, t),
      dy: catmullRomDeriv(p0.y, p1.y, p2.y, p3.y, t),
    };
  }

  public sample(arcProgress: number): SplinePoint {
    const p = Math.max(0, Math.min(1, arcProgress));
    let low = 0;
    let high = this.samples.length - 1;
    while (low < high - 1) {
      const mid = (low + high) >> 1;
      if (this.samples[mid].s <= p) low = mid;
      else high = mid;
    }
    const s0 = this.samples[low];
    const s1 = this.samples[high];
    const range = s1.s - s0.s;
    const frac = range > 0.00001 ? (p - s0.s) / range : 0;
    const u = s0.u + frac * (s1.u - s0.u);
    return this.evalRaw(u);
  }

  /**
   * Compute a smooth, jitter-free compass heading (0° is North) using a localized chord vector
   */
  public getHeading(arcProgress: number): number {
    const p = Math.max(0, Math.min(1, arcProgress));
    const delta = 0.02;
    const p1 = Math.max(0, p - delta);
    const p2 = Math.min(1, p + delta);
    const s1 = this.sample(p1);
    const s2 = this.sample(p2);
    const dx = s2.x - s1.x;
    const dy = s2.y - s1.y;
    if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
      return 0;
    }
    return Math.atan2(dx, -dy) * (180 / Math.PI);
  }
}

/**
 * Generate authentic, obstacle-aware waypoints through the marina parking lot aisles
 */
export function generateSpotWaypoints(spot: MarinaSpotDef): { x: number; y: number }[] {
  const { row, bank, x, y } = spot;
  const gateStart = { x: 16.5, y: 96.0 };
  const gateThrough = { x: 16.5, y: 81.5 };

  // ── Row 3 (Bottom Stalls: y = 71.0) ──
  // The flower bed is at y >= 85.5%. The apron runs at y = 81.0% (just a little higher than flower bed)
  if (row === 3) {
    if (x <= 15.0) {
      // Spot 13: Left of gate
      return [
        gateStart,
        gateThrough,
        { x: 13.5, y: 81.0 },
        { x: x, y: 78.0 },
        { x: x, y: y },
      ];
    } else if (x <= 26.0) {
      // Spot 14: Just right of gate
      return [
        gateStart,
        gateThrough,
        { x: 20.0, y: 81.0 },
        { x: x, y: 78.0 },
        { x: x, y: y },
      ];
    } else if (x <= 40.0) {
      // Spot 15: East along apron
      return [
        gateStart,
        gateThrough,
        { x: 23.0, y: 81.0 },
        { x: 31.0, y: 81.0 },
        { x: x, y: 78.0 },
        { x: x, y: y },
      ];
    } else {
      // Spots 16, 17, 18: Cross along apron (y = 81.0, just higher than flower bed) into right bank
      return [
        gateStart,
        gateThrough,
        { x: 25.0, y: 81.0 },
        { x: 40.0, y: 81.0 },
        { x: 50.5, y: 81.0 },
        { x: Math.max(50.5, x - 5.0), y: 81.0 },
        { x: x, y: 78.0 },
        { x: x, y: y },
      ];
    }
  }

  // ── Common Driveway to Central Thoroughfare (Hugs just higher than flower bed at y = 81.0) ──
  const commonDriveway = [
    gateStart,
    gateThrough,
    { x: 25.0, y: 81.0 },
    { x: 38.0, y: 81.0 },
    { x: 48.0, y: 78.0 },
    { x: 50.5, y: 72.0 },
  ];

  // ── Row 2 (Middle Stalls: y = 54.2) ──
  if (row === 2) {
    const r2Center = [
      ...commonDriveway,
      { x: 50.5, y: 64.0 },
      { x: 50.5, y: 60.0 },
    ];
    if (bank === "left") {
      return [
        ...r2Center,
        { x: 45.0, y: 61.0 },
        { x: Math.min(45.0, x + 5.0), y: 61.0 },
        { x: x, y: 58.5 },
        { x: x, y: y },
      ];
    } else {
      return [
        ...r2Center,
        { x: 55.0, y: 61.0 },
        { x: Math.max(55.0, x - 5.0), y: 61.0 },
        { x: x, y: 58.5 },
        { x: x, y: y },
      ];
    }
  }

  // ── Row 1 (Top Promenade Stalls: y = 41.5) ──
  if (row === 1) {
    const r1Center = [
      ...commonDriveway,
      { x: 50.5, y: 58.0 },
      { x: 50.5, y: 49.0 },
      { x: 50.5, y: 46.5 },
    ];
    if (bank === "left") {
      return [
        ...r1Center,
        { x: 45.0, y: 46.5 },
        { x: Math.min(45.0, x + 4.0), y: 46.5 },
        { x: x, y: 44.0 },
        { x: x, y: y },
      ];
    } else {
      return [
        ...r1Center,
        { x: 55.0, y: 46.5 },
        { x: Math.max(55.0, x - 4.0), y: 46.5 },
        { x: x, y: 44.0 },
        { x: x, y: y },
      ];
    }
  }

  return [gateStart, { x, y }];
}

function cosineBell(val: number, center: number, width: number): number {
  const d = Math.abs(val - center);
  if (d >= width) return 0;
  return 0.5 * (1 + Math.cos((Math.PI * d) / width));
}

export interface CarRenderState {
  x: number;
  y: number;
  heading: number;
  perspScale: number;
  rearOpacity: number;
  turnRightOpacity: number;
  sideRightOpacity: number;
  turnLeftOpacity: number;
  sideLeftOpacity: number;
}

/**
 * Calculate instantaneous rendering parameters from spline point and animation progress.
 * Soft, natural left/right turning with zero tilt, zero roll, and zero shaking.
 */
export function getCarRenderState(
  pt: SplinePoint,
  headingDeg: number,
  progress: number,
  targetSpotY: number
): CarRenderState {
  const p = Math.max(0, Math.min(1, progress));

  // When easing into stall, smoothly align straight to North (0°)
  let h = headingDeg;
  if (p >= 0.75) {
    const align = (p - 0.75) / 0.25;
    h = headingDeg * (1 - align);
  }

  // Smooth continuous cosine bell weights (C1 continuous):
  const wRear = cosineBell(h, 0, 45);
  const wTurnR = cosineBell(h, 45, 45);
  const wSideR = h >= 90 ? 1 : cosineBell(h, 90, 45);
  const wTurnL = cosineBell(h, -45, 45);
  const wSideL = h <= -90 ? 1 : cosineBell(h, -90, 45);

  let tot = wRear + wTurnR + wSideR + wTurnL + wSideL;
  if (tot <= 0.0001) tot = 1;

  // Natural perspective depth: large & prominent while driving so brake lights & turns are clearly visible.
  // DO NOT shrink while driving; only shrinks to the box once done parking!
  const yDiff = Math.max(0, pt.y - targetSpotY);
  const perspScale = 1.05 + (yDiff / 55) * 0.27;

  return {
    x: pt.x,
    y: pt.y,
    heading: h,
    perspScale,
    rearOpacity: wRear / tot,
    turnRightOpacity: wTurnR / tot,
    sideRightOpacity: wSideR / tot,
    turnLeftOpacity: wTurnL / tot,
    sideLeftOpacity: wSideL / tot,
  };
}
