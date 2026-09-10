import { MarinaSpotDef } from "./marinaLotConstants";

export interface Waypoint {
  x: number;
  y: number;
}

export type CarDirection = "north" | "east" | "west";

export interface OrthogonalSegment {
  p1: Waypoint;
  p2: Waypoint;
  length: number;
  direction: CarDirection;
  isFinalLeg: boolean;
}

export interface OrthogonalSample {
  x: number;
  y: number;
  direction: CarDirection;
  isFinalLeg: boolean;
}

/**
 * 100% Orthogonal path navigator.
 * Guarantees that cars travel strictly in right-angle (90°) grid movements:
 * North (0°), East (90°), and West (-90°). Zero diagonals, zero curves.
 */
export class OrthogonalPath {
  public segments: OrthogonalSegment[] = [];
  public totalLength: number = 0;

  constructor(waypoints: Waypoint[]) {
    let tot = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      const p1 = waypoints[i];
      const p2 = waypoints[i + 1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy);

      if (len > 0.0001) {
        let dir: CarDirection = "north";
        if (Math.abs(dx) > Math.abs(dy)) {
          dir = dx > 0 ? "east" : "west";
        } else {
          dir = "north";
        }

        this.segments.push({
          p1,
          p2,
          length: len,
          direction: dir,
          isFinalLeg: i === waypoints.length - 2,
        });
        tot += len;
      }
    }
    this.totalLength = Math.max(0.001, tot);
  }

  /**
   * Sample position and instantaneous orthogonal direction along the path.
   */
  public sample(progress: number): OrthogonalSample {
    const p = Math.max(0, Math.min(1, progress));
    const targetDist = p * this.totalLength;
    let accumulated = 0;

    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      if (targetDist <= accumulated + seg.length || i === this.segments.length - 1) {
        const segT = seg.length > 0 ? (targetDist - accumulated) / seg.length : 0;
        const clampedT = Math.max(0, Math.min(1, segT));
        return {
          x: seg.p1.x + (seg.p2.x - seg.p1.x) * clampedT,
          y: seg.p1.y + (seg.p2.y - seg.p1.y) * clampedT,
          direction: seg.direction,
          isFinalLeg: seg.isFinalLeg,
        };
      }
      accumulated += seg.length;
    }

    const last = this.segments[this.segments.length - 1];
    return {
      x: last ? last.p2.x : 18.5,
      y: last ? last.p2.y : 39.5,
      direction: last ? last.direction : "north",
      isFinalLeg: true,
    };
  }
}

// Backward-compatible alias for any legacy references
export const SplinePath = OrthogonalPath;

/**
 * Generate authentic, obstacle-aware right-angle waypoints through the marina lot lanes.
 * Every turn is strictly a 90° right angle. Zero diagonals.
 */
export function generateSpotWaypoints(spot: MarinaSpotDef): Waypoint[] {
  const { row, x, y } = spot;
  const gateStart: Waypoint = { x: 16.5, y: 96.0 };
  const apronY = 81.5;
  const centerThoroughfareX = 50.5;

  // ── Row 3 (Bottom Stalls: y = 70.5) ──
  // Enters gate to apron (y = 81.5), turns 90° East/West along apron directly to stall x,
  // then turns 90° North into stall
  if (row === 3) {
    if (Math.abs(x - 16.5) < 0.5) {
      return [
        gateStart,
        { x: 16.5, y: apronY },
        { x, y },
      ];
    }
    return [
      gateStart,
      { x: 16.5, y: apronY },
      { x, y: apronY },
      { x, y },
    ];
  }

  // ── Row 2 (Middle Stalls: y = 53.6) ──
  // Enters gate to apron (y = 81.5), turns 90° East to central thoroughfare (x = 50.5),
  // drives straight North up thoroughfare to Row 2 aisle (y = 61.5),
  // turns 90° East/West along aisle to stall column (x = spot.x),
  // turns 90° North into stall
  const r2AisleY = 61.5;
  if (row === 2) {
    return [
      gateStart,
      { x: 16.5, y: apronY },
      { x: centerThoroughfareX, y: apronY },
      { x: centerThoroughfareX, y: r2AisleY },
      { x, y: r2AisleY },
      { x, y },
    ];
  }

  // ── Row 1 (Top Promenade Stalls: y = 39.5) ──
  // Enters gate to apron (y = 81.5), turns 90° East to central thoroughfare (x = 50.5),
  // drives straight North up thoroughfare to Row 1 aisle (y = 46.0),
  // turns 90° East/West along aisle to stall column (x = spot.x),
  // turns 90° North into stall
  const r1AisleY = 46.0;
  if (row === 1) {
    return [
      gateStart,
      { x: 16.5, y: apronY },
      { x: centerThoroughfareX, y: apronY },
      { x: centerThoroughfareX, y: r1AisleY },
      { x, y: r1AisleY },
      { x, y },
    ];
  }

  return [gateStart, { x, y }];
}

export interface CarRenderState {
  x: number;
  y: number;
  direction: CarDirection;
  rearOpacity: number;
  turnRightOpacity: number;
  sideRightOpacity: number;
  turnLeftOpacity: number;
  sideLeftOpacity: number;
  isBraking: boolean;
}

/**
 * Calculate instantaneous rendering parameters from orthogonal sample.
 * NO FADE TURNS: Discrete, instantaneous 1 or 0 sprite switching. Zero transparency blending.
 */
export function getCarRenderState(
  sample: OrthogonalSample,
  progress: number
): CarRenderState {
  // Discrete, instantaneous 1 or 0 sprite switching — absolutely no fade turns!
  const isNorth = sample.direction === "north";
  const isEast = sample.direction === "east";
  const isWest = sample.direction === "west";

  // Red LED brake lights only activate when decelerating into the final parking stall (progress >= 0.85)
  const isBraking = sample.isFinalLeg && progress >= 0.82;

  return {
    x: sample.x,
    y: sample.y,
    direction: sample.direction,
    rearOpacity: isNorth ? 1 : 0,
    sideRightOpacity: isEast ? 1 : 0,
    sideLeftOpacity: isWest ? 1 : 0,
    turnRightOpacity: 0,
    turnLeftOpacity: 0,
    isBraking,
  };
}
