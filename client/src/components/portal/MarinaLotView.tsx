import React, { useState, useEffect, useRef } from "react";
import { MARINA_SPOTS, MarinaSpotDef, GLOW_THEMES, CAR_COLORS } from "./marinaLotConstants";
import { Sparkles, CheckCircle2, AlertCircle, Eye, EyeOff, Square } from "lucide-react";
import { OrthogonalPath, generateSpotWaypoints, getCarRenderState } from "./marinaCarKinematics";
import {
  WAYPOINT_DRIVING_STYLE,
  getVehicleVariation,
  VehicleVariation,
  VEHICLE_VARIATIONS,
} from "./waypointDrivingStyle";

// Official parking lot background (v4 Planter Island)
export const MARINA_LOT_BACKGROUND = "/marina-lot-v4.jpg";

export const LOT_BACKGROUNDS = [
  { id: "v4", label: "v4 (Planter Island)", src: "/marina-lot-v4.jpg" },
  { id: "v3", label: "v3 (Entrance/Exit Arrows)", src: "/marina-lot-v3.jpg" },
  { id: "v2", label: "v2 (Previous Upload)", src: "/marina-lot-v2.jpg" },
  { id: "v1", label: "v1 (Initial Upload)", src: "/marina-lot-v1.jpg" },
  { id: "v0", label: "v0 (Blueprint AI)", src: "/marina-lot-full.jpg" },
];

export interface ParkedCarItem {
  id: string;
  title: string;
  notes?: string;
  category: string;
  priority: "Normal" | "High" | "Urgent" | string;
  status: "Parked" | "In Discussion" | "Resolved" | string;
  spotNumber: number;
  carColor?: string;
  vehicleId?: string;
  addedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

interface MarinaLotViewProps {
  items: ParkedCarItem[];
  animatingSpot: number | null;
  animatingVehicleId?: string;
  onCarClick: (item: ParkedCarItem) => void;
  onSpotClick?: (spot: MarinaSpotDef, item?: ParkedCarItem) => void;
  isSequencing?: boolean;
  onSequenceFill?: () => void;
  onStopSequence?: () => void;
  onClearDemo?: () => void;
}

// Studio-grade 3D photorealistic luxury crossover SUV (Clean, shadow-free on asphalt, authentic slender proportions)
function SmartStallVehicle({
  spot,
  theme,
  isJustParked = false,
  priority,
  vehicleId,
}: {
  spot: MarinaSpotDef;
  theme: (typeof GLOW_THEMES)["blue"];
  isJustParked?: boolean;
  priority?: string;
  vehicleId?: string;
}) {
  const vehicle = getVehicleVariation(vehicleId, `spot-${spot.spotNumber}`);
  return (
    <div
      className={`relative w-full h-full flex items-center justify-center transition-all duration-300 ${
        isJustParked ? "animate-park-settle" : "hover:scale-105"
      }`}
    >
      {/* Studio-Grade Vehicle Image - Slender proportions, NEVER stretched or fat */}
      <img
        src={vehicle.rearSprite}
        alt={`Vehicle parked in spot ${spot.spotNumber}`}
        className="relative z-10 h-[92%] w-auto max-w-full object-contain cursor-pointer select-none transition-transform duration-200 drop-shadow-md"
      />
    </div>
  );
}

// Standard moving car size in percentage of 1024x608 parking lot (one uniform square container so all angles render at identical size)
const STANDARD_CAR_HEIGHT = WAYPOINT_DRIVING_STYLE.container.heightPercent;
const STANDARD_CAR_WIDTH = WAYPOINT_DRIVING_STYLE.container.widthPercent;

// Ultra-smooth GPU-driven Driving Car Animation with Waypoint Driving Style
function DrivingCarAnimation({
  targetSpot,
  vehicleId,
  onFinish,
}: {
  targetSpot: MarinaSpotDef;
  vehicleId?: string;
  onFinish: () => void;
}) {
  const vehicle = getVehicleVariation(vehicleId, `spot-${targetSpot.spotNumber}`);
  const containerRef = useRef<HTMLDivElement>(null);
  const rearContainerRef = useRef<HTMLDivElement>(null);
  const sideRightImgRef = useRef<HTMLImageElement>(null);
  const sideLeftImgRef = useRef<HTMLImageElement>(null);
  const brakeLightRef = useRef<HTMLDivElement>(null);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    const waypoints = generateSpotWaypoints(targetSpot);
    const path = new OrthogonalPath(waypoints);
    // Steady, handsome cruising speed proportional to distance (approx 2.4s - 2.9s):
    const duration = Math.round(1800 + (path.totalLength / 125) * 1100);
    let startTime: number | null = null;
    let animFrameId: number;

    const tick = (now: number) => {
      if (startTime === null) startTime = now;
      const elapsed = now - startTime;
      const linearP = Math.min(1, elapsed / duration);

      // Natural physical easing: gentle launch from gate, steady cruise, gentle braking into stall
      let progress = 0;
      if (linearP < 0.10) {
        progress = (linearP / 0.10) * (linearP / 0.10) * 0.08;
      } else if (linearP < 0.85) {
        const u = (linearP - 0.10) / (0.85 - 0.10);
        progress = 0.08 + u * (0.90 - 0.08);
      } else {
        const u = (linearP - 0.85) / (1 - 0.85);
        const easeOut = 1 - Math.pow(1 - u, 2);
        progress = 0.90 + easeOut * 0.10;
      }

      const sample = path.sample(progress);
      const state = getCarRenderState(sample, progress);

      if (containerRef.current) {
        containerRef.current.style.left = `${state.x}%`;
        containerRef.current.style.top = `${state.y}%`;
        // One standard size throughout transit: strictly translate with zero growing or shrinking
        containerRef.current.style.transform = `translate(-50%, -50%)`;
      }

      // Discrete 1 or 0 sprite switching — ONLY RIGHT ANGLE TURNS, NO FADE TURNS:
      if (rearContainerRef.current) rearContainerRef.current.style.opacity = `${state.rearOpacity}`;
      if (sideRightImgRef.current) sideRightImgRef.current.style.opacity = `${state.sideRightOpacity}`;
      if (sideLeftImgRef.current) sideLeftImgRef.current.style.opacity = `${state.sideLeftOpacity}`;

      // Glowing LED Brake Light Effect: active only when pulling into final parking stall
      if (brakeLightRef.current) {
        brakeLightRef.current.style.opacity = state.isBraking ? "1" : "0";
      }

      if (linearP < 1) {
        animFrameId = requestAnimationFrame(tick);
      } else {
        onFinishRef.current();
      }
    };

    animFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameId);
  }, [targetSpot.spotNumber, targetSpot.y]);

  return (
    <div
      ref={containerRef}
      className="absolute z-50 pointer-events-none will-change-transform"
      style={{
        left: "16.5%",
        top: "96.0%",
        width: `${STANDARD_CAR_WIDTH}%`,
        height: `${STANDARD_CAR_HEIGHT}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Rear View with Tailored Brake Lights */}
        <div
          ref={rearContainerRef}
          className="absolute inset-0 flex items-center justify-center pointer-events-none transition-none"
          style={{ opacity: 1 }}
        >
          <div
            className="relative h-full flex items-center justify-center"
            style={{ aspectRatio: vehicle.rearAspectRatio }}
          >
            <img
              src={vehicle.rearSprite}
              alt="Rear View"
              className="w-full h-full object-contain pointer-events-none select-none transition-none"
            />

            {/* Authentic Glowing Red LED Brake Lights on Vehicle Rear */}
            <div
              ref={brakeLightRef}
              className="absolute inset-0 pointer-events-none z-30 transition-opacity duration-150"
              style={{ opacity: 0 }}
            >
              {vehicle.brakeLights.map((bl) => (
                <span
                  key={bl.id}
                  className={`absolute ${bl.className}`}
                  style={{ left: bl.left, top: bl.top, transform: "translate(-50%, -50%)" }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Side Views scaled per vehicle style so visual mass matches the straight rear view */}
        <img
          ref={sideRightImgRef}
          src={vehicle.sideRightSprite}
          alt="Side Right"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none transition-none"
          style={{ opacity: 0, transform: `scale(${vehicle.sideScale})` }}
        />
        <img
          ref={sideLeftImgRef}
          src={vehicle.sideLeftSprite}
          alt="Side Left"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none transition-none"
          style={{ opacity: 0, transform: `scale(${vehicle.sideScale})` }}
        />
      </div>
    </div>
  );
}

export function MarinaLotView({
  items,
  animatingSpot,
  animatingVehicleId,
  onCarClick,
  onSpotClick,
  isSequencing = false,
  onSequenceFill,
  onStopSequence,
  onClearDemo,
}: MarinaLotViewProps) {
  const [hoveredSpot, setHoveredSpot] = useState<number | null>(null);
  const [showIdTags, setShowIdTags] = useState(true);

  const [justParkedSpot, setJustParkedSpot] = useState<number | null>(null);
  const prevAnimRef = useRef<number | null>(null);
  useEffect(() => {
    if (prevAnimRef.current !== null && animatingSpot === null) {
      setJustParkedSpot(prevAnimRef.current);
      const t = setTimeout(() => setJustParkedSpot(null), 1000);
      return () => clearTimeout(t);
    }
    prevAnimRef.current = animatingSpot;
  }, [animatingSpot]);

  // Map spotNumber -> item
  const spotItemMap = new Map<number, ParkedCarItem>();
  items.forEach((item) => {
    if (item.status !== "Resolved" && item.spotNumber) {
      spotItemMap.set(item.spotNumber, item);
    }
  });

  const animatingSpotDef = animatingSpot
    ? MARINA_SPOTS.find((s) => s.spotNumber === animatingSpot) || null
    : null;

  return (
    <div className="w-full relative rounded-2xl overflow-hidden shadow-2xl border border-blue-900/40 bg-[#061426] select-none">
      {/* ── Marina Parking Lot Backdrop (1024x608 Aspect Ratio) ── */}
      <div className="relative w-full pb-[59.38%] overflow-hidden">
        {/* Background Image */}
        <img
          src={MARINA_LOT_BACKGROUND}
          alt="Waypoint Advocates Marina Parking Lot"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />

        {/* Ambient subtle vignette overlay to enhance contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#020914]/40 via-transparent to-transparent pointer-events-none" />

        {/* ── Driving Car Animation Layer ── */}
        {animatingSpotDef && (
          <DrivingCarAnimation
            key={`driving-car-${animatingSpotDef.spotNumber}-${animatingVehicleId || "default"}`}
            targetSpot={animatingSpotDef}
            vehicleId={
              animatingVehicleId ||
              spotItemMap.get(animatingSpotDef.spotNumber)?.vehicleId ||
              spotItemMap.get(animatingSpotDef.spotNumber)?.carColor
            }
            onFinish={() => {
              // Animation handled in parent state
            }}
          />
        )}

        {/* ── 18 Interactive Parking Spaces Overlay ── */}
        {MARINA_SPOTS.map((spot) => {
          const item = spotItemMap.get(spot.spotNumber);
          const isOccupied = !!item;
          const isAnimatingThis = animatingSpot === spot.spotNumber;
          const isHovered = hoveredSpot === spot.spotNumber;
          const theme = GLOW_THEMES[spot.glowTheme];

          return (
            <React.Fragment key={spot.spotNumber}>
              {/* 1. Sign Badge: ONLY display when spot is occupied, not animating, AND (showIdTags || isHovered) */}
              {isOccupied && item && !isAnimatingThis && (showIdTags || isHovered) && (
                <div
                  className={`absolute z-20 transition-all duration-200 cursor-pointer ${
                    isHovered ? "scale-110 z-30" : ""
                  }`}
                  style={{
                    left: `${spot.signX}%`,
                    top: `${spot.signY}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                  onMouseEnter={() => setHoveredSpot(spot.spotNumber)}
                  onMouseLeave={() => setHoveredSpot(null)}
                  onClick={() => onCarClick(item)}
                  title={`${item.title} (Click to inspect or resolve)`}
                >
                  <div
                    className={`px-2 py-0.5 max-w-[160px] rounded-md border flex items-center gap-1.5 backdrop-blur-md transition-all truncate shadow-lg ${
                      item.priority === "Urgent"
                        ? "border-red-400/80 bg-red-950/90 text-red-200 shadow-[0_0_12px_rgba(239,68,68,0.5)]"
                        : item.priority === "High"
                        ? "border-amber-400/80 bg-amber-950/90 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.5)]"
                        : theme.badge
                    }`}
                  >
                    <span className="text-[10px] font-mono font-black shrink-0 text-white/80">#{spot.spotNumber}</span>
                    <span className="text-[9px] font-semibold tracking-tight truncate">
                      {item.title}
                    </span>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  </div>
                </div>
              )}

              {/* 2. Interactive Parking Stall & Car Slot */}
              <div
                className={`absolute z-10 transition-all duration-200 rounded-xl flex items-center justify-center ${
                  isOccupied ? "cursor-pointer" : "pointer-events-none"
                } ${
                  isOccupied && isHovered
                    ? "ring-2 ring-amber-400/50 bg-amber-400/5 shadow-[0_0_12px_rgba(251,191,36,0.25)]"
                    : ""
                }`}
                style={{
                  left: `${spot.x}%`,
                  top: `${spot.y}%`,
                  width: `${spot.width}%`,
                  height: `${spot.height}%`,
                  transform: "translate(-50%, -50%)",
                }}
                onMouseEnter={() => isOccupied && setHoveredSpot(spot.spotNumber)}
                onMouseLeave={() => setHoveredSpot(null)}
                onClick={() => {
                  if (item) onCarClick(item);
                }}
              >
                {/* When Occupied & Not currently mid-flight animation: Show Parked Vehicle */}
                {isOccupied && !isAnimatingThis && (
                  <div className="w-full h-full p-0.5 relative flex items-center justify-center">
                    <SmartStallVehicle
                      spot={spot}
                      theme={theme}
                      isJustParked={justParkedSpot === spot.spotNumber}
                      priority={item.priority}
                      vehicleId={item.vehicleId || item.carColor}
                    />
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* ── Quick Footer Status Ribbon ── */}
      <div className="px-4 py-2.5 bg-[#030c18] border-t border-blue-900/40 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            <span className="text-white/80 font-medium">
              {spotItemMap.size} of 18 Spaces Parked
            </span>
          </div>
          <span className="text-white/30">•</span>
          <span className="text-white/50 text-[11px]">
            Click any parked car to inspect concern or mark resolved
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Sequence Fill Animation Button or Stop Button */}
          {onSequenceFill && (
            isSequencing ? (
              <button
                type="button"
                onClick={onStopSequence}
                className="px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border bg-red-950/90 text-red-200 border-red-500/60 shadow-[0_0_12px_rgba(239,68,68,0.4)] hover:bg-red-900 animate-pulse"
                title="Immediately stop filling remaining stalls"
              >
                <Square className="w-3 h-3 fill-current text-red-400" />
                <span>⏹ Stop Filling Stalls</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onSequenceFill}
                className="px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border bg-blue-900/40 hover:bg-amber-400 hover:text-slate-950 text-amber-300 border-amber-400/40 shadow-[0_0_8px_rgba(251,191,36,0.25)]"
                title="Watch cars arrive in sequence through the entrance gate and park into vacant stalls"
              >
                <span>▶ Fill Lot in Sequence</span>
              </button>
            )
          )}

          {/* Toggle Hide/Show ID Tags Button Beside Fill Lot */}
          <button
            type="button"
            onClick={() => setShowIdTags((prev) => !prev)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border ${
              !showIdTags
                ? "bg-amber-500/20 text-amber-300 border-amber-400/50 shadow-[0_0_8px_rgba(251,191,36,0.2)]"
                : "bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-700/60"
            }`}
            title={showIdTags ? "Hide note ID tags on parked cars" : "Show note ID tags on parked cars"}
          >
            {!showIdTags ? (
              <>
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span>Show ID Tags</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                <span>Hide ID Tags</span>
              </>
            )}
          </button>


          {onClearDemo && spotItemMap.size > 0 && (
            <button type="button" disabled={isSequencing} onClick={onClearDemo} className="px-2 py-1 rounded-lg text-[11px] font-medium text-white/40 hover:text-white hover:bg-white/10 transition-all cursor-pointer" title="Clear all parked cars">
              Reset Stalls
            </button>
          )}

          <span className="px-2 py-0.5 rounded bg-blue-950/60 border border-blue-800/40 text-[10px] text-amber-300 font-mono">
            ⚓ Marina Lot · PG-023-PRK
          </span>
        </div>
      </div>
    </div>
  );
}
