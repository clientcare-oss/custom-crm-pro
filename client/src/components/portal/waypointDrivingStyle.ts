import { MarinaSpotDef } from "./marinaLotConstants";
import { Waypoint, OrthogonalPath, generateSpotWaypoints, CarDirection } from "./marinaCarKinematics";

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * WAYPOINT ADVOCATES — DRIVING STYLE & VEHICLE VARIATION ENGINE
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * Signature Driving Style:
 * 1. 100% Orthogonal Paths: Strictly 90° right-angle turns. No diagonal drifting,
 *    no curved arcs. True asphalt-lane driving through apron, central thoroughfare,
 *    and row aisles.
 * 2. Zero-Fade Transitions: Discrete, instantaneous 1/0 sprite switching. No
 *    opacity cross-fading, no translucent ghost cars.
 * 3. Normalized Visual Mass: Scaled container and sprites so vehicle proportions
 *    remain standard and balanced whether traveling North (Rear View) or
 *    East/West (Side View).
 * 4. 3-Phase Kinetic Pacing: Smooth launch from gate (0-10%), steady handsome
 *    cruise through right-angle turns (10-85%), and gentle deceleration into
 *    parking stall (85-100%) with active glowing red LED brake lights.
 * 5. Natural Fleet Color Spawning: Random or pseudo-random color assignments
 *    (Onyx Black, Arctic Pearl White, Crimson Red, Cobalt Blue, Emerald Green)
 *    so the parking lot feels organic, diverse, and authentic.
 */

export interface BrakeLightDef {
  id: string;
  left: string;
  top: string;
  className: string;
}

export interface VehicleVariation {
  id: string;
  name: string;
  colorName: string;
  category: "suv" | "crossover" | "sedan" | "truck" | "van" | "sports";
  rearSprite: string;
  sideRightSprite: string;
  sideLeftSprite: string;
  rearAspectRatio: string;
  sideScale: number;
  brakeLights: BrakeLightDef[];
}

const COMMON_SUV_BRAKE_LIGHTS: BrakeLightDef[] = [
  {
    id: "suv-left",
    left: "16.9%",
    top: "75.8%",
    className: "w-2.5 h-1.5 rounded-full bg-red-500 blur-[0.5px] shadow-[0_0_10px_#ff2222,0_0_20px_#ef4444]",
  },
  {
    id: "suv-right",
    left: "82.9%",
    top: "75.5%",
    className: "w-2.5 h-1.5 rounded-full bg-red-500 blur-[0.5px] shadow-[0_0_10px_#ff2222,0_0_20px_#ef4444]",
  },
  {
    id: "suv-spoiler",
    left: "50.0%",
    top: "58.0%",
    className: "w-2 h-1 rounded-full bg-red-500 blur-[0.5px] shadow-[0_0_8px_#ef4444]",
  },
];

const COMMON_SEDAN_BRAKE_LIGHTS: BrakeLightDef[] = [
  {
    id: "sedan-left",
    left: "22.5%",
    top: "82.5%",
    className: "w-3 h-1.5 rounded-full bg-red-500 blur-[0.5px] shadow-[0_0_10px_#ff2222,0_0_18px_#ef4444]",
  },
  {
    id: "sedan-right",
    left: "77.5%",
    top: "82.5%",
    className: "w-3 h-1.5 rounded-full bg-red-500 blur-[0.5px] shadow-[0_0_10px_#ff2222,0_0_18px_#ef4444]",
  },
  {
    id: "sedan-center",
    left: "50.0%",
    top: "45.0%",
    className: "w-3 h-1 rounded-full bg-red-500 blur-[0.5px] shadow-[0_0_8px_#ef4444]",
  },
];

const COMMON_SPORTS_BRAKE_LIGHTS: BrakeLightDef[] = [
  {
    id: "sports-lightbar",
    left: "50.0%",
    top: "73.5%",
    className: "w-8 h-1.5 rounded-full bg-red-500 blur-[0.5px] shadow-[0_0_12px_#ff2222,0_0_22px_#ef4444]",
  },
  {
    id: "sports-left-wing",
    left: "22.0%",
    top: "76.0%",
    className: "w-2 h-1.5 rounded-full bg-red-500 blur-[0.5px] shadow-[0_0_8px_#ff2222]",
  },
  {
    id: "sports-right-wing",
    left: "78.0%",
    top: "76.0%",
    className: "w-2 h-1.5 rounded-full bg-red-500 blur-[0.5px] shadow-[0_0_8px_#ef4444]",
  },
];

const COMMON_TRUCK_BRAKE_LIGHTS: BrakeLightDef[] = [
  {
    id: "truck-left-vertical",
    left: "22.5%",
    top: "77.0%",
    className: "w-2 h-4 rounded-sm bg-red-500 blur-[0.5px] shadow-[0_0_10px_#ff2222,0_0_20px_#ef4444]",
  },
  {
    id: "truck-right-vertical",
    left: "77.5%",
    top: "77.0%",
    className: "w-2 h-4 rounded-sm bg-red-500 blur-[0.5px] shadow-[0_0_10px_#ff2222,0_0_20px_#ef4444]",
  },
  {
    id: "truck-cab-brake",
    left: "50.0%",
    top: "36.2%",
    className: "w-2.5 h-1 rounded-full bg-red-500 blur-[0.5px] shadow-[0_0_8px_#ef4444]",
  },
];

// ── Official Locked Waypoint Fleet Color Palette (Standardized across all vehicles) ──
export const WAYPOINT_FLEET_COLORS = [
  {
    id: "black",
    name: "Onyx Black Metallic",
    shortName: "Black",
    badgeHex: "#111417",
    accentColor: "#374151",
    hsl: { h: 0, s: 0, lightMul: 1.0 },
    description: "Deep obsidian executive black with high-gloss clearcoat highlights.",
  },
  {
    id: "bronze",
    name: "Burnished Bronze Metallic",
    shortName: "Bronze",
    badgeHex: "#78411d",
    accentColor: "#b45309",
    hsl: { h: 0.080, s: 0.50, lightMul: 0.78 },
    description: "Rich warm metallic copper and sunset amber with deep shadow creases.",
  },
  {
    id: "red",
    name: "Crimson Burgundy Metallic",
    shortName: "Red",
    badgeHex: "#641b24",
    accentColor: "#b91c1c",
    hsl: { h: 0.985, s: 0.52, lightMul: 0.75 },
    description: "Deep luxury wine red with lustrous body curvature.",
  },
  {
    id: "blue",
    name: "Cobalt Midnight Blue Metallic",
    shortName: "Blue",
    badgeHex: "#1c385b",
    accentColor: "#1d4ed8",
    hsl: { h: 0.600, s: 0.46, lightMul: 0.78 },
    description: "Executive oceanic sapphire deep blue with dark asphalt contrast.",
  },
  {
    id: "green",
    name: "Emerald British Racing Green Metallic",
    shortName: "Green",
    badgeHex: "#1b4226",
    accentColor: "#15803d",
    hsl: { h: 0.388, s: 0.42, lightMul: 0.72 },
    description: "Classic deep forest green metallic preserving tire and window trim detail.",
  },
] as const;

export type WaypointFleetColorId = typeof WAYPOINT_FLEET_COLORS[number]["id"];

/**
 * Universal Vehicle Variation Factory
 * Automatically applies the 5 official Waypoint Fleet Colors to any body model
 * (SUV, Sedan, Truck, Sports Car, Crossover) to eliminate redesigns and maintain visual consistency.
 */
export function createVehicleVariationsForBody(options: {
  category: VehicleVariation["category"];
  bodyLabel: string;
  prefix: string;
  filePrefix?: string;
  rearAspectRatio?: string;
  sideScale?: number;
  brakeLights: BrakeLightDef[];
}): Record<string, VehicleVariation> {
  const result: Record<string, VehicleVariation> = {};
  const filePrefix = options.filePrefix || "car";
  const rearAspect = options.rearAspectRatio || "383/580";
  const sideScale = options.sideScale ?? 1.45;

  for (const color of WAYPOINT_FLEET_COLORS) {
    const key = `${options.prefix}-${color.id}`;
    result[key] = {
      id: key,
      name: `${color.name} ${options.bodyLabel}`,
      colorName: color.shortName,
      category: options.category,
      rearSprite: `/cars/${filePrefix}_${color.id}_rear.png`,
      sideRightSprite: `/cars/${filePrefix}_${color.id}_side_right.png`,
      sideLeftSprite: `/cars/${filePrefix}_${color.id}_side_left.png`,
      rearAspectRatio: rearAspect,
      sideScale: sideScale,
      brakeLights: options.brakeLights,
    };
  }

  return result;
}

// ── Built-in Vehicle Variations Catalog (All 4 Body Styles × 5 Official Colors = 20 Variations) ──
const SUV_VARIATIONS = createVehicleVariationsForBody({
  category: "suv",
  bodyLabel: "Executive SUV",
  prefix: "suv",
  filePrefix: "car",
  rearAspectRatio: "383/580",
  sideScale: 1.45,
  brakeLights: COMMON_SUV_BRAKE_LIGHTS,
});

const SEDAN_VARIATIONS = createVehicleVariationsForBody({
  category: "sedan",
  bodyLabel: "Executive Sedan",
  prefix: "sedan",
  filePrefix: "sedan",
  rearAspectRatio: "383/580",
  sideScale: 1.42,
  brakeLights: COMMON_SEDAN_BRAKE_LIGHTS,
});

const SPORTS_VARIATIONS = createVehicleVariationsForBody({
  category: "sports",
  bodyLabel: "Luxury Sports Car",
  prefix: "sports",
  filePrefix: "sports",
  rearAspectRatio: "383/580",
  sideScale: 1.35,
  brakeLights: COMMON_SPORTS_BRAKE_LIGHTS,
});

const TRUCK_VARIATIONS = createVehicleVariationsForBody({
  category: "truck",
  bodyLabel: "Crew-Cab Luxury Pickup",
  prefix: "truck",
  filePrefix: "truck",
  rearAspectRatio: "383/580",
  sideScale: 1.48,
  brakeLights: COMMON_TRUCK_BRAKE_LIGHTS,
});

export const VEHICLE_VARIATIONS: Record<string, VehicleVariation> = {
  ...SUV_VARIATIONS,
  ...SEDAN_VARIATIONS,
  ...SPORTS_VARIATIONS,
  ...TRUCK_VARIATIONS,
};

// Aliases for friendly color names and legacy keys
VEHICLE_VARIATIONS["black"] = VEHICLE_VARIATIONS["suv-black"];
VEHICLE_VARIATIONS["default-suv"] = VEHICLE_VARIATIONS["suv-black"];
VEHICLE_VARIATIONS["bronze"] = VEHICLE_VARIATIONS["suv-bronze"];
VEHICLE_VARIATIONS["amber"] = VEHICLE_VARIATIONS["suv-bronze"];
VEHICLE_VARIATIONS["copper"] = VEHICLE_VARIATIONS["suv-bronze"];
VEHICLE_VARIATIONS["gold"] = VEHICLE_VARIATIONS["suv-bronze"];
VEHICLE_VARIATIONS["orange"] = VEHICLE_VARIATIONS["suv-bronze"];
VEHICLE_VARIATIONS["red"] = VEHICLE_VARIATIONS["suv-red"];
VEHICLE_VARIATIONS["blue"] = VEHICLE_VARIATIONS["suv-blue"];
VEHICLE_VARIATIONS["navy"] = VEHICLE_VARIATIONS["suv-blue"];
VEHICLE_VARIATIONS["green"] = VEHICLE_VARIATIONS["suv-green"];
VEHICLE_VARIATIONS["onyx"] = VEHICLE_VARIATIONS["suv-black"];
VEHICLE_VARIATIONS["crimson"] = VEHICLE_VARIATIONS["suv-red"];
VEHICLE_VARIATIONS["emerald"] = VEHICLE_VARIATIONS["suv-green"];
VEHICLE_VARIATIONS["cobalt"] = VEHICLE_VARIATIONS["suv-blue"];

// Body-only aliases default to Black or Bronze:
VEHICLE_VARIATIONS["suv"] = VEHICLE_VARIATIONS["suv-black"];
VEHICLE_VARIATIONS["sedan"] = VEHICLE_VARIATIONS["sedan-black"];
VEHICLE_VARIATIONS["sports"] = VEHICLE_VARIATIONS["sports-red"];
VEHICLE_VARIATIONS["truck"] = VEHICLE_VARIATIONS["truck-bronze"];

// Safely remap any old white/silver references to rich bronze or black:
VEHICLE_VARIATIONS["silver"] = VEHICLE_VARIATIONS["suv-bronze"];
VEHICLE_VARIATIONS["suv-silver"] = VEHICLE_VARIATIONS["suv-bronze"];
VEHICLE_VARIATIONS["white"] = VEHICLE_VARIATIONS["suv-bronze"];
VEHICLE_VARIATIONS["suv-white"] = VEHICLE_VARIATIONS["suv-bronze"];
VEHICLE_VARIATIONS["pearl"] = VEHICLE_VARIATIONS["suv-bronze"];
VEHICLE_VARIATIONS["gray"] = VEHICLE_VARIATIONS["suv-black"];
VEHICLE_VARIATIONS["grey"] = VEHICLE_VARIATIONS["suv-black"];

export const VEHICLE_COLOR_KEYS = Object.keys(VEHICLE_VARIATIONS);

export const DEFAULT_VEHICLE_VARIATION = VEHICLE_VARIATIONS["suv-black"];

// ── Weighted Fleet Spawner Distribution ──
// SUV: 35%, Sedan: 30%, Sports Car: 25%, Pickup Truck: 10% (least spawned)
export const VEHICLE_BODY_DISTRIBUTION = [
  { prefix: "suv", weight: 35 },
  { prefix: "sedan", weight: 30 },
  { prefix: "sports", weight: 25 },
  { prefix: "truck", weight: 10 },
] as const;

/**
 * Deterministically or randomly select a vehicle variation across all body styles and official colors.
 * - Respects the user-requested distribution: Pickup Truck is least spawned (~10%), followed by Sports (25%), Sedan (30%), SUV (35%).
 * - Passing a seed (spot number or item ID) guarantees a consistent vehicle and color for that stall.
 */
export function getRandomVehicleVariation(seed?: string | number): VehicleVariation {
  if (seed !== undefined && seed !== null) {
    const str = String(seed);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }

    // 1. Pick body type via weighted roll (0 - 99)
    const bodyRoll = Math.abs(hash) % 100;
    let selectedPrefix = "suv";
    let cumulative = 0;
    for (const b of VEHICLE_BODY_DISTRIBUTION) {
      cumulative += b.weight;
      if (bodyRoll < cumulative) {
        selectedPrefix = b.prefix;
        break;
      }
    }

    // 2. Pick color uniformly across the 5 official fleet colors
    const colorRoll = Math.abs((hash >> 8) ^ (hash << 3)) % WAYPOINT_FLEET_COLORS.length;
    const selectedColor = WAYPOINT_FLEET_COLORS[colorRoll].id;

    const key = `${selectedPrefix}-${selectedColor}`;
    return VEHICLE_VARIATIONS[key] || DEFAULT_VEHICLE_VARIATION;
  }

  // Pure random roll
  const bodyRoll = Math.random() * 100;
  let selectedPrefix = "suv";
  let cumulative = 0;
  for (const b of VEHICLE_BODY_DISTRIBUTION) {
    cumulative += b.weight;
    if (bodyRoll < cumulative) {
      selectedPrefix = b.prefix;
      break;
    }
  }

  const colorRoll = Math.floor(Math.random() * WAYPOINT_FLEET_COLORS.length);
  const selectedColor = WAYPOINT_FLEET_COLORS[colorRoll].id;
  const key = `${selectedPrefix}-${selectedColor}`;
  return VEHICLE_VARIATIONS[key] || DEFAULT_VEHICLE_VARIATION;
}

export function getVehicleVariation(idOrColor?: string, fallbackSeed?: string | number): VehicleVariation {
  if (idOrColor) {
    const normalized = idOrColor.toLowerCase().trim();
    if (VEHICLE_VARIATIONS[normalized]) {
      return VEHICLE_VARIATIONS[normalized];
    }
    const clean = normalized.replace(/^(car_|suv[_-]?)/, "").replace(/(_rear|_side.*|\.png)$/, "").trim();
    if (VEHICLE_VARIATIONS[clean]) {
      return VEHICLE_VARIATIONS[clean];
    }
    if (VEHICLE_VARIATIONS[`suv-${clean}`]) {
      return VEHICLE_VARIATIONS[`suv-${clean}`];
    }
    if (VEHICLE_VARIATIONS[`sedan-${clean}`]) {
      return VEHICLE_VARIATIONS[`sedan-${clean}`];
    }
    if (VEHICLE_VARIATIONS[`sports-${clean}`]) {
      return VEHICLE_VARIATIONS[`sports-${clean}`];
    }
    if (VEHICLE_VARIATIONS[`truck-${clean}`]) {
      return VEHICLE_VARIATIONS[`truck-${clean}`];
    }
  }
  if (fallbackSeed !== undefined && fallbackSeed !== null) {
    return getRandomVehicleVariation(fallbackSeed);
  }
  return DEFAULT_VEHICLE_VARIATION;
}

/**
 * Standard Waypoint Driving Style Parameters
 */
export const WAYPOINT_DRIVING_STYLE = {
  name: "Waypoint Standard Right-Angle Driving Style",
  version: "1.0.0",

  // 1:1 Square Motion Container in 1024x608 Aspect Ratio Parking Lot
  container: {
    heightPercent: 12.0, // 72.96px in 608h
    widthPercent: (12.0 * 608) / 1024, // 7.125% -> 72.96px in 1024w (exact 1:1 square)
  },

  // Steady velocity calculation proportional to path distance
  computeDuration(pathLength: number): number {
    return Math.round(1800 + (pathLength / 125) * 1100);
  },

  // 3-Phase Natural Physical Easing
  applyEasing(linearP: number): number {
    if (linearP < 0.10) {
      // Phase 1: Gentle acceleration from gate
      return (linearP / 0.10) * (linearP / 0.10) * 0.08;
    } else if (linearP < 0.85) {
      // Phase 2: Steady handsome cruising speed along lanes & right-angle corners
      const u = (linearP - 0.10) / (0.85 - 0.10);
      return 0.08 + u * (0.90 - 0.08);
    } else {
      // Phase 3: Smooth deceleration into final parking stall
      const u = (linearP - 0.85) / (1 - 0.85);
      const easeOut = 1 - Math.pow(1 - u, 2);
      return 0.90 + easeOut * 0.10;
    }
  },

  // Discrete 1/0 sprite visibility: Strictly no fade turns
  getSpriteOpacities(direction: CarDirection) {
    return {
      rearOpacity: direction === "north" ? "1" : "0",
      sideRightOpacity: direction === "east" ? "1" : "0",
      sideLeftOpacity: direction === "west" ? "1" : "0",
      turnRightOpacity: "0",
      turnLeftOpacity: "0",
    };
  },

  // Brake Light Trigger: Active during deceleration in final stall
  isBraking(isFinalLeg: boolean, progress: number): boolean {
    return isFinalLeg && progress >= 0.82;
  },
};
