import React, { useState, useEffect, useRef } from "react";
import { MARINA_SPOTS, MarinaSpotDef, GLOW_THEMES, CAR_COLORS } from "./marinaLotConstants";
import { Sparkles, CheckCircle2, AlertCircle, Eye, EyeOff, ChevronLeft, ChevronRight, Square } from "lucide-react";
import { SplinePath, generateSpotWaypoints, getCarRenderState } from "./marinaCarKinematics";

// Temporary background versions for quick side-by-side comparison
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
  addedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

interface MarinaLotViewProps {
  items: ParkedCarItem[];
  animatingSpot: number | null;
  onCarClick: (item: ParkedCarItem) => void;
  onSpotClick?: (spot: MarinaSpotDef, item?: ParkedCarItem) => void;
  isSequencing?: boolean;
  onSequenceFill?: () => void;
  onStopSequence?: () => void;
  onClearDemo?: () => void;
}

// Studio-grade 3D photorealistic luxury crossover SUV (Clean, shadow-free on asphalt)
function SmartStallVehicle({
  spot,
  theme,
  isJustParked = false,
  priority,
}: { spot: MarinaSpotDef; theme: (typeof GLOW_THEMES)["blue"]; isJustParked?: boolean; priority?: string }) {
  return (
    <div
      className={`relative w-[92%] h-[90%] flex items-center justify-center transition-all duration-300 ${
        isJustParked ? "animate-park-shrink" : "hover:scale-105"
      }`}
    >
      {/* Studio-Grade 3D Luxury SUV Image - Fitted cleanly inside stall box */}
      <img
        src="/cars/norm_rear_top.png"
        alt={`Vehicle parked in spot ${spot.spotNumber}`}
        className="relative z-10 w-full h-full object-fill cursor-pointer select-none transition-transform duration-200"
      />
    </div>
  );
}

// Ultra-smooth GPU-driven Driving Car Animation with soft left/right turning and zero tilt
function DrivingCarAnimation({
  targetSpot,
  onFinish,
}: { targetSpot: MarinaSpotDef; onFinish: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rearImgRef = useRef<HTMLImageElement>(null);
  const turnRightImgRef = useRef<HTMLImageElement>(null);
  const sideRightImgRef = useRef<HTMLImageElement>(null);
  const turnLeftImgRef = useRef<HTMLImageElement>(null);
  const sideLeftImgRef = useRef<HTMLImageElement>(null);
  const brakeLightRef = useRef<HTMLDivElement>(null);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    const waypoints = generateSpotWaypoints(targetSpot);
    const spline = new SplinePath(waypoints);
    const duration = 2850; // Stately 2.85s driving pace
    let startTime: number | null = null;
    let animFrameId: number;

    const tick = (now: number) => {
      if (startTime === null) startTime = now;
      const elapsed = now - startTime;
      const linearP = Math.min(1, elapsed / duration);

      // Natural physical easing curve:
      let progress = 0;
      if (linearP < 0.15) {
        progress = (linearP / 0.15) * (linearP / 0.15) * 0.12;
      } else if (linearP < 0.82) {
        const u = (linearP - 0.15) / (0.82 - 0.15);
        progress = 0.12 + u * (0.88 - 0.12);
      } else {
        const u = (linearP - 0.82) / (1 - 0.82);
        const easeOut = 1 - Math.pow(1 - u, 3);
        progress = 0.88 + easeOut * 0.12;
      }

      const pt = spline.sample(progress);
      const heading = spline.getHeading(progress);
      const state = getCarRenderState(pt, heading, progress, targetSpot.y);

      if (containerRef.current) {
        containerRef.current.style.left = `${state.x}%`;
        containerRef.current.style.top = `${state.y}%`;
        // NO TILT / NO ROLL: strictly translate and scale to keep tires level on asphalt
        containerRef.current.style.transform = `translate(-50%, -50%) scale(${state.perspScale})`;
      }

      // Direct continuous opacity blending without CSS transitions to eliminate stutter
      if (rearImgRef.current) rearImgRef.current.style.opacity = `${state.rearOpacity}`;
      if (turnRightImgRef.current) turnRightImgRef.current.style.opacity = `${state.turnRightOpacity}`;
      if (sideRightImgRef.current) sideRightImgRef.current.style.opacity = `${state.sideRightOpacity}`;
      if (turnLeftImgRef.current) turnLeftImgRef.current.style.opacity = `${state.turnLeftOpacity}`;
      if (sideLeftImgRef.current) sideLeftImgRef.current.style.opacity = `${state.sideLeftOpacity}`;

      // Glowing LED Brake Light Effect:
      // Active during deceleration into the stall when car is straight
      if (brakeLightRef.current) {
        const isBraking = linearP >= 0.80 && state.rearOpacity >= 0.70;
        brakeLightRef.current.style.opacity = isBraking ? "1" : "0";
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
        width: `${targetSpot.width}%`,
        height: `${targetSpot.height}%`,
        transform: "translate(-50%, -50%) scale(1.32)",
      }}
    >
      <div className="relative w-full h-full">
        {/* All 5 normalized views anchored identically at ground contact point with zero shadow */}
        <img
          ref={rearImgRef}
          src="/cars/norm_rear_top.png"
          alt="Rear View"
          className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none transition-none"
          style={{ opacity: 1 }}
        />
        <img
          ref={turnRightImgRef}
          src="/cars/norm_turn_right.png"
          alt="Turn Right"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none transition-none"
          style={{ opacity: 0 }}
        />
        <img
          ref={sideRightImgRef}
          src="/cars/norm_side_right.png"
          alt="Side Right"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none transition-none"
          style={{ opacity: 0 }}
        />
        <img
          ref={turnLeftImgRef}
          src="/cars/norm_turn_left.png"
          alt="Turn Left"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none transition-none"
          style={{ opacity: 0 }}
        />
        <img
          ref={sideLeftImgRef}
          src="/cars/norm_side_left.png"
          alt="Side Left"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none transition-none"
          style={{ opacity: 0 }}
        />

        {/* Authentic Glowing Red LED Brake Lights on Vehicle Rear */}
        <div
          ref={brakeLightRef}
          className="absolute inset-0 pointer-events-none z-30 transition-opacity duration-150"
          style={{ opacity: 0 }}
        >
          {/* Left Brake Light Cluster - Exact Mazda Taillight Center */}
          <span
            className="absolute w-3 h-2 rounded-full bg-red-500 blur-[0.5px] shadow-[0_0_12px_#ff2222,0_0_24px_#ef4444]"
            style={{ left: "16.9%", top: "75.8%", transform: "translate(-50%, -50%)" }}
          />
          {/* Right Brake Light Cluster - Exact Mazda Taillight Center */}
          <span
            className="absolute w-3 h-2 rounded-full bg-red-500 blur-[0.5px] shadow-[0_0_12px_#ff2222,0_0_24px_#ef4444]"
            style={{ left: "82.9%", top: "75.5%", transform: "translate(-50%, -50%)" }}
          />
          {/* Center High-Mount Stop Lamp - Roof Spoiler */}
          <span
            className="absolute w-2.5 h-1 rounded-full bg-red-500 blur-[0.5px] shadow-[0_0_10px_#ef4444]"
            style={{ left: "50.0%", top: "58.0%", transform: "translate(-50%, -50%)" }}
          />
        </div>
      </div>
    </div>
  );
}

export function MarinaLotView({
  items,
  animatingSpot,
  onCarClick,
  onSpotClick,
  isSequencing = false,
  onSequenceFill,
  onStopSequence,
  onClearDemo,
}: MarinaLotViewProps) {
  const [hoveredSpot, setHoveredSpot] = useState<number | null>(null);
  const [showIdTags, setShowIdTags] = useState(true);
  const [bgIndex, setBgIndex] = useState(() => {
    const saved = localStorage.getItem("marina_lot_bg_idx");
    const parsed = saved !== null ? parseInt(saved, 10) : 0;
    return !isNaN(parsed) && parsed >= 0 && parsed < LOT_BACKGROUNDS.length ? parsed : 0;
  });

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

  const handlePrevBg = () => setBgIndex((curr) => {
    const next = (curr - 1 + LOT_BACKGROUNDS.length) % LOT_BACKGROUNDS.length;
    localStorage.setItem("marina_lot_bg_idx", next.toString());
    return next;
  });
  const handleNextBg = () => setBgIndex((curr) => {
    const next = (curr + 1) % LOT_BACKGROUNDS.length;
    localStorage.setItem("marina_lot_bg_idx", next.toString());
    return next;
  });

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
          src={LOT_BACKGROUNDS[bgIndex].src}
          alt={`Waypoint Advocates Marina Parking Lot (${LOT_BACKGROUNDS[bgIndex].label})`}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />

        {/* Floating Arrow Switcher on Lot (Temporary Dev Tool) */}
        <div className="absolute top-2.5 right-2.5 z-30 flex items-center gap-1 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-amber-400/50 shadow-lg">
          <button
            type="button"
            onClick={handlePrevBg}
            className="text-amber-400 hover:text-white p-0.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            title="Previous background version"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-mono font-semibold text-amber-300 select-none px-0.5">
            {LOT_BACKGROUNDS[bgIndex].label}
          </span>
          <button
            type="button"
            onClick={handleNextBg}
            className="text-amber-400 hover:text-white p-0.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            title="Next background version"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Ambient subtle vignette overlay to enhance contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#020914]/40 via-transparent to-transparent pointer-events-none" />

        {/* ── Driving Car Animation Layer ── */}
        {animatingSpotDef && (
          <DrivingCarAnimation
            key={`driving-car-${animatingSpotDef.spotNumber}`}
            targetSpot={animatingSpotDef}
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

              {/* 2. Interactive Parking Stall & Car Slot (Zero white border overlays) */}
              <div
                className={`absolute z-10 transition-all duration-200 cursor-pointer rounded-xl flex items-center justify-center ${
                  isHovered
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
                onMouseEnter={() => setHoveredSpot(spot.spotNumber)}
                onMouseLeave={() => setHoveredSpot(null)}
                onClick={() => {
                  if (item) onCarClick(item);
                  else onSpotClick?.(spot, item);
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
                    />
                  </div>
                )}

                {/* When Vacant: Clean subtle prompt on hover */}
                {!isOccupied && isHovered && (
                  <div className="flex flex-col items-center justify-center text-center p-1 bg-black/50 backdrop-blur-sm rounded-lg border border-amber-400/30 shadow-lg">
                    <span className="text-[8px] font-bold tracking-widest text-amber-300 uppercase font-mono">
                      OPEN SPOT {spot.spotNumber}
                    </span>
                    <span className="text-[7px] text-white/70">Click to Park Here</span>
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

          {/* Temporary Background Version Switcher */}
          <div className="flex items-center gap-0.5 bg-slate-900/90 border border-slate-700/70 rounded-lg px-1.5 py-0.5">
            <button type="button" onClick={handlePrevBg} className="p-1 text-slate-400 hover:text-amber-300 hover:bg-white/10 rounded transition-colors cursor-pointer" title="Previous background version">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-slate-300 font-medium px-1">BG: {LOT_BACKGROUNDS[bgIndex].label}</span>
            <button type="button" onClick={handleNextBg} className="p-1 text-slate-400 hover:text-amber-300 hover:bg-white/10 rounded transition-colors cursor-pointer" title="Next background version">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

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
