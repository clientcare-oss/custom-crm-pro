import React, { useEffect, useRef, useState } from "react";

export interface MonorailTrainProps {
  /** Reference to the main SVG rail <path> element so the train follows true track geometry */
  pathElement: SVGPathElement | null;
  /** Target fractional progress along the path (0 to 1) when not running continuous demo */
  targetFraction: number;
  /** Optional continuous station-to-station demo mode (stops briefly at each station, never mutates real cases!) */
  demoPlaying?: boolean;
  /** Exact fractions along the rail for each station (used by continuous demo mode to pause gently at stations) */
  stationFractions?: number[];
  /** Callback when continuous demo arrives at a station */
  onArriveStation?: (stationIndex: number) => void;
  /** Distinct accessible label, e.g. "Preview Train" or "Emma Carter — Records Review" */
  label: string;
  /** Short visible badge text shown on hover/focus (e.g. "Preview" or student initials) */
  shortBadge: string;
  /** Whether this is a Designer preview train vs a live Case progress train */
  variant: "preview" | "case";
  /** Click handler (opens compact case progress summary or selects current station) */
  onClick?: () => void;
  /** Respect prefers-reduced-motion */
  reducedMotion?: boolean;
  /** Unique suffix for SVG gradient IDs */
  trainId: string;
}

interface CarPose {
  x: number;
  y: number;
  angleDeg: number;
}

function sampleCarPoses(
  pathEl: SVGPathElement | null,
  fraction: number,
  carSpacing = 33
): [CarPose, CarPose, CarPose, CarPose] | null {
  if (!pathEl) return null;
  try {
    const total = pathEl.getTotalLength();
    if (!Number.isFinite(total) || total <= 1) return null;

    // Allow the 4-car train to stop dead center on Station 0 (fraction=0) and Last Station (fraction=1)
    // by extrapolating smoothly along the terminal track tangents so full nose & tail cars peek out cleanly!
    const clamped = Math.max(0, Math.min(1, fraction));
    const centerDist = clamped * total;

    const sampleAt = (dist: number): CarPose => {
      if (dist < 0) {
        const p0 = pathEl.getPointAtLength(0);
        const p1 = pathEl.getPointAtLength(Math.min(total, 4));
        const dx = p1.x - p0.x;
        const dy = p1.y - p0.y;
        const len = Math.hypot(dx, dy) || 1;
        const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
        return {
          x: p0.x + (dx / len) * dist,
          y: p0.y + (dy / len) * dist,
          angleDeg,
        };
      }
      if (dist > total) {
        const p0 = pathEl.getPointAtLength(Math.max(0, total - 4));
        const p1 = pathEl.getPointAtLength(total);
        const dx = p1.x - p0.x;
        const dy = p1.y - p0.y;
        const len = Math.hypot(dx, dy) || 1;
        const extra = dist - total;
        const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
        return {
          x: p1.x + (dx / len) * extra,
          y: p1.y + (dy / len) * extra,
          angleDeg,
        };
      }
      const p = pathEl.getPointAtLength(dist);
      const pAhead = pathEl.getPointAtLength(Math.min(total, dist + 3.2));
      const pBehind = pathEl.getPointAtLength(Math.max(0, dist - 3.2));
      const angleDeg =
        (Math.atan2(pAhead.y - pBehind.y, pAhead.x - pBehind.x) * 180) / Math.PI;
      return { x: p.x, y: p.y, angleDeg };
    };

    // 4 independently tangent-aligned articulated cars:
    // forward bullet nose, front-middle cabin, rear-middle cabin, rear bullet nose
    return [
      sampleAt(centerDist + carSpacing * 1.5),
      sampleAt(centerDist + carSpacing * 0.5),
      sampleAt(centerDist - carSpacing * 0.5),
      sampleAt(centerDist - carSpacing * 1.5),
    ];
  } catch {
    return null;
  }
}

/**
 * Reusable Component #3: Sculpted, Realistic 3-Car Articulated Streamlined Monorail Train
 * Photorealistic layered vector shading:
 * - Sculpted cylindrical pearl-silver / brushed-titanium roof fading to midnight-navy straddle skirt
 * - Flush smoked-glass panoramic windows with thin mullions, warm interior cabin glow, and glass sheen
 * - Ribbed articulated gangway bellows flexing seamlessly between cars around 180° curves
 * - Sweeping champagne-gold metallic livery pinstripe and flush panel seams
 * - Direction-aware LED headlamp cone illuminating the gold track ahead + ruby tail LEDs
 * - Soft ambient occlusion contact shadow grounding the straddle skirt directly onto the rail
 */
export function MonorailTrain({
  pathElement,
  targetFraction,
  demoPlaying = false,
  stationFractions = [],
  onArriveStation,
  label,
  shortBadge,
  variant,
  onClick,
  reducedMotion = false,
  trainId,
}: MonorailTrainProps) {
  const [currentFraction, setCurrentFraction] = useState(targetFraction);
  const [travelDir, setTravelDir] = useState<1 | -1>(1);
  const [hovered, setHovered] = useState(false);
  const currentFracRef = useRef(targetFraction);
  const hasInitializedPathRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const onArriveRef = useRef(onArriveStation);
  onArriveRef.current = onArriveStation;

  // 1. Continuous Demo Playback: glide smoothly from station to station, pausing gently at each station
  useEffect(() => {
    if (!demoPlaying || reducedMotion || !pathElement || stationFractions.length < 2) {
      return;
    }

    let cancelled = false;
    let targetIdx = stationFractions.findIndex((f) => f > currentFracRef.current + 0.015);
    if (targetIdx < 0) targetIdx = 1;

    let phase: "gliding" | "dwelling" = "gliding";
    let startFrac = currentFracRef.current;
    let endFrac = stationFractions[targetIdx];
    let phaseStart: number | null = null;
    const dwellMs = 880;
    setTravelDir(endFrac >= startFrac ? 1 : -1);

    const tick = (ts: number) => {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.hidden) {
        phaseStart = null;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      if (phaseStart === null) phaseStart = ts;
      const elapsed = ts - phaseStart;

      if (phase === "gliding") {
        const dist = Math.abs(endFrac - startFrac);
        const glideMs = Math.max(700, Math.min(1850, dist * 9500));
        const t = Math.min(1, elapsed / glideMs);
        const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const next = startFrac + (endFrac - startFrac) * eased;
        currentFracRef.current = next;
        setCurrentFraction(next);

        if (t >= 1) {
          onArriveRef.current?.(targetIdx);
          phase = "dwelling";
          phaseStart = ts;
        }
      } else {
        if (elapsed >= dwellMs) {
          const nextIdx = targetIdx + 1;
          if (nextIdx >= stationFractions.length) {
            targetIdx = 0;
            currentFracRef.current = stationFractions[0];
            setCurrentFraction(stationFractions[0]);
            startFrac = stationFractions[0];
            targetIdx = 1;
            endFrac = stationFractions[1];
          } else {
            startFrac = currentFracRef.current;
            targetIdx = nextIdx;
            endFrac = stationFractions[targetIdx];
          }
          setTravelDir(endFrac >= startFrac ? 1 : -1);
          phase = "gliding";
          phaseStart = ts;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [demoPlaying, reducedMotion, pathElement, stationFractions]);

  // 2. Controlled targetFraction animation (station click summon, step button, or live Case Train)
  useEffect(() => {
    if (demoPlaying) return;

    // On initial path hydration, snap cleanly into starting position facing forward along the route
    if (!hasInitializedPathRef.current && pathElement) {
      hasInitializedPathRef.current = true;
      currentFracRef.current = targetFraction;
      setCurrentFraction(targetFraction);
      setTravelDir(1);
      return;
    }

    if (reducedMotion || !pathElement) {
      currentFracRef.current = targetFraction;
      setCurrentFraction(targetFraction);
      return;
    }

    const startFrac = currentFracRef.current;
    const delta = targetFraction - startFrac;
    if (Math.abs(delta) < 0.0005) {
      currentFracRef.current = targetFraction;
      setCurrentFraction(targetFraction);
      return;
    }

    setTravelDir(delta >= 0 ? 1 : -1);
    const durationMs = Math.min(2200, Math.max(480, Math.abs(delta) * 2800));
    let startTime: number | null = null;

    const step = (ts: number) => {
      if (typeof document !== "undefined" && document.hidden) {
        rafRef.current = requestAnimationFrame(step);
        return;
      }
      if (startTime === null) startTime = ts;
      const elapsed = ts - startTime;
      const t = Math.min(1, elapsed / durationMs);
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const next = startFrac + delta * eased;
      currentFracRef.current = next;
      setCurrentFraction(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [targetFraction, demoPlaying, reducedMotion, pathElement]);

  const poses = sampleCarPoses(pathElement, currentFraction, 33);
  if (!poses) return null;

  const [frontCar, midFrontCar, midRearCar, rearCar] = poses;
  const carScale = 1.16;
  const hullGradId = `train-hull-${trainId}`;
  const skirtGradId = `train-skirt-${trainId}`;
  const roofSheenId = `train-roof-${trainId}`;
  const glassGradId = `train-glass-${trainId}`;
  const cabinGlowId = `train-cabin-${trainId}`;
  const goldTrimId = `train-gold-${trainId}`;
  const beamForwardId = `train-beam-f-${trainId}`;
  const beamRearId = `train-beam-r-${trainId}`;
  const shadowFilterId = `train-ao-${trainId}`;

  const rimColor = hovered ? "#FFF4D4" : "#A9BCD9";
  const isMovingForward = travelDir === 1;

  // Compute midpoints for all 3 articulated ribbed gangway bellows
  const bellowsList = [
    { a: rearCar, b: midRearCar, key: "b1" },
    { a: midRearCar, b: midFrontCar, key: "b2" },
    { a: midFrontCar, b: frontCar, key: "b3" },
  ].map(({ a, b, key }) => ({
    key,
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    angleDeg: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
  }));

  const centerAnchorX = (midFrontCar.x + midRearCar.x) / 2;
  const centerAnchorY = (midFrontCar.y + midRearCar.y) / 2;
  const centerAnchorAngle =
    (Math.atan2(midFrontCar.y - midRearCar.y, midFrontCar.x - midRearCar.x) * 180) / Math.PI;

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={label}
      data-interactive-node="true"
      data-testid={`monorail-train-${trainId}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          onClick?.();
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="cursor-pointer outline-none"
      filter={`url(#${shadowFilterId})`}
    >
      <defs>
        {/* Realistic Grounding Shadow beneath straddle chassis */}
        <filter id={shadowFilterId} x="-35%" y="-60%" width="170%" height="240%">
          <feDropShadow dx="0" dy="5.5" stdDeviation="3.2" floodColor="#00020B" floodOpacity="0.92" />
        </filter>

        {/* Sculpted 3D Brushed Pearl-Platinum -> Steel-Blue -> Deep Navy Fuselage */}
        <linearGradient id={hullGradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#94A9C8" />
          <stop offset="14%" stopColor="#F5F9FF" />
          <stop offset="30%" stopColor="#FFFFFF" />
          <stop offset="46%" stopColor="#C4D4EB" />
          <stop offset="66%" stopColor="#546E97" />
          <stop offset="84%" stopColor="#1B2E52" />
          <stop offset="100%" stopColor="#071024" />
        </linearGradient>

        {/* Lower Straddle Skirt hugging the Gold Beam */}
        <linearGradient id={skirtGradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1E3156" />
          <stop offset="55%" stopColor="#0B1630" />
          <stop offset="100%" stopColor="#030816" />
        </linearGradient>

        {/* Subtle Brushed Roof Metallic Crown Reflection */}
        <linearGradient id={roofSheenId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.18" />
          <stop offset="35%" stopColor="#FFFFFF" stopOpacity="0.88" />
          <stop offset="65%" stopColor="#E6F0FF" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.15" />
        </linearGradient>

        {/* Deep Smoked Panoramic Aviation Glass */}
        <linearGradient id={glassGradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#050B1C" />
          <stop offset="38%" stopColor="#132952" />
          <stop offset="72%" stopColor="#0A1938" />
          <stop offset="100%" stopColor="#030714" />
        </linearGradient>

        {/* Warm Ambient Cabin Interior Light subtly visible inside smoked glass */}
        <linearGradient id={cabinGlowId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFE8B0" stopOpacity="0.12" />
          <stop offset="56%" stopColor="#FAD584" stopOpacity="0.48" />
          <stop offset="100%" stopColor="#C99B42" stopOpacity="0.18" />
        </linearGradient>

        {/* Brushed Champagne Gold Livery Stripe */}
        <linearGradient id={goldTrimId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFF4CE" />
          <stop offset="50%" stopColor={variant === "case" ? "#F0CD7A" : "#DFBA69"} />
          <stop offset="100%" stopColor="#8E6B2B" />
        </linearGradient>

        {/* Volumetric Warm LED Headlight Cone projecting along the Gold Track */}
        <linearGradient id={beamForwardId} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#FFF7DC" stopOpacity="0.58" />
          <stop offset="45%" stopColor="#FDE7AC" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#FDE7AC" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={beamRearId} x1="100%" y1="50%" x2="0%" y2="50%">
          <stop offset="0%" stopColor="#FFF7DC" stopOpacity="0.58" />
          <stop offset="45%" stopColor="#FDE7AC" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#FDE7AC" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Generous accessible hit target centered on the 4-car train */}
      <g transform={`translate(${centerAnchorX}, ${centerAnchorY}) rotate(${centerAnchorAngle})`}>
        <rect x={-76} y={-24} width={152} height={48} rx={14} fill="transparent" />
      </g>

      {/* Soft Contact Ambient Occlusion directly along the rail underside */}
      <path
        d={`M ${rearCar.x} ${rearCar.y + 3.8} L ${midRearCar.x} ${midRearCar.y + 4.0} L ${midFrontCar.x} ${midFrontCar.y + 4.0} L ${frontCar.x} ${frontCar.y + 3.8}`}
        fill="none"
        stroke="#00030C"
        strokeOpacity={0.75}
        strokeWidth={12.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* ── 3 ARTICULATED ACCORDION GANGWAY BELLOWS (Rear <-> MidRear <-> MidFront <-> Front) ── */}
      {bellowsList.map((bel) => (
        <g key={bel.key} transform={`translate(${bel.x}, ${bel.y}) rotate(${bel.angleDeg}) scale(${carScale})`}>
          <rect x={-5.8} y={-5.4} width={11.6} height={10.8} rx={1.6} fill="#081126" stroke="#23375E" strokeWidth={0.55} />
          <line x1={-2.8} y1={-5.1} x2={-2.8} y2={5.1} stroke="#364E7C" strokeWidth={0.7} />
          <line x1={0} y1={-5.1} x2={0} y2={5.1} stroke="#1B2D52" strokeWidth={0.85} />
          <line x1={2.8} y1={-5.1} x2={2.8} y2={5.1} stroke="#364E7C" strokeWidth={0.7} />
          <line x1={-4.6} y1={-4.6} x2={4.6} y2={-4.6} stroke="#8EA5C7" strokeOpacity={0.45} strokeWidth={0.9} />
        </g>
      ))}

      {/* ── REAR STREAMLINED BULLET CAR ── */}
      <g transform={`translate(${rearCar.x}, ${rearCar.y}) rotate(${rearCar.angleDeg}) scale(${carScale})`}>
        {/* Direction-aware volumetric LED headlight cone when traveling in reverse */}
        {!isMovingForward && (
          <path d="M -18.5 -2.2 L -44 -8.2 L -44 8.2 L -18.5 2.2 Z" fill={`url(#${beamRearId})`} pointerEvents="none" />
        )}

        {/* Sculpted Aerodynamic Rear Bullet Fuselage */}
        <path
          d="M -19.5 0.6 C -17.5 -3.8, -11.5 -6.5, -2 -6.8 L 11.2 -6.8 C 12.2 -6.8, 12.8 -6.1, 12.8 -5.2 L 12.8 5.2 C 12.8 6.1, 12.2 6.6, 11.2 6.6 L -3.5 6.6 C -12.5 6.6, -17.6 4.4, -19.5 0.6 Z"
          fill={`url(#${hullGradId})`}
          stroke={rimColor}
          strokeWidth={hovered ? 0.95 : 0.55}
        />

        {/* Lower Midnight-Navy Straddle Skirt */}
        <path
          d="M -16.2 3.3 C -13.2 5.3, -8.5 6.3, -2 6.3 L 12.4 6.3 L 12.4 3.4 L -15.4 3.4 Z"
          fill={`url(#${skirtGradId})`}
        />

        {/* Flush Wrap-Around Rear Cockpit Visor + Cabin Windows */}
        <path
          d="M -14.8 -0.8 C -12.6 -3.3, -8.2 -3.9, -2.5 -3.9 L 11.2 -3.9 L 11.2 1.1 L -14.2 1.1 C -15.2 1.1, -15.4 0.1, -14.8 -0.8 Z"
          fill={`url(#${glassGradId})`}
        />
        {/* Subtle Warm Interior Cabin Illumination inside window panes */}
        <rect x={-3.5} y={-2.8} width={5.8} height={3.2} rx={0.7} fill={`url(#${cabinGlowId})`} />
        <rect x={3.8} y={-2.8} width={6.2} height={3.2} rx={0.7} fill={`url(#${cabinGlowId})`} />
        {/* Flush dark smoked window pillars */}
        <line x1={-4.6} y1={-3.8} x2={-4.6} y2={1.1} stroke="#070F22" strokeWidth={1.1} />
        <line x1={2.9} y1={-3.8} x2={2.9} y2={1.1} stroke="#070F22" strokeWidth={1.0} />
        {/* Diagonal aviation glass reflection glints */}
        <path d="M -11.5 -2.6 L -8.2 -0.2 M -1.2 -2.9 L 1.2 0.2 M 6.2 -2.9 L 8.5 0.2" stroke="#DCEBFF" strokeOpacity={0.28} strokeWidth={0.85} strokeLinecap="round" />

        {/* Roof Specular Crown Highlight + Subtle Rooftop Aero Fairing */}
        <path d="M -8.5 -5.3 C -4 -5.7, 3 -5.7, 11 -5.7" fill="none" stroke={`url(#${roofSheenId})`} strokeWidth={1.25} strokeLinecap="round" />
        <rect x={1} y={-6.4} width={7} height={1.1} rx={0.5} fill="#89A0C4" opacity={0.45} />

        {/* Sweeping Champagne-Gold Metallic Livery Stripe */}
        <path
          d="M -16.8 2.2 C -12 3.1, -6 3.3, 12.2 3.3"
          fill="none"
          stroke={`url(#${goldTrimId})`}
          strokeWidth={1.35}
          strokeLinecap="round"
        />

        {/* Subtle Flush Door Seam */}
        <line x1={10.5} y1={-4.5} x2={10.5} y2={5.4} stroke="#10203F" strokeOpacity={0.55} strokeWidth={0.55} />

        {/* Direction-aware Nose Lighting: Warm LED Headlamp (reverse) OR Ruby LED Tail Strip (forward) */}
        {!isMovingForward ? (
          <>
            <ellipse cx={-17.8} cy={0.3} rx={2.2} ry={1.4} fill="#FFF8E2" opacity={0.95} />
            <circle cx={-18.3} cy={0.3} r={0.9} fill="#FFFFFF" />
          </>
        ) : (
          <path d="M -18.2 -0.9 C -18.9 0, -18.9 1.1, -18.1 1.7" fill="none" stroke="#FB7185" strokeWidth={1.55} strokeLinecap="round" />
        )}
      </g>

      {/* ── TWO CENTER ARTICULATED PASSENGER CABIN CARS ── */}
      {[
        { pose: midRearCar, key: "mid-rear" },
        { pose: midFrontCar, key: "mid-front" },
      ].map(({ pose, key }) => (
        <g key={key} transform={`translate(${pose.x}, ${pose.y}) rotate(${pose.angleDeg}) scale(${carScale})`}>
          {/* Sculpted Cylindrical Metallic Cabin Body */}
          <rect
            x={-13.2}
            y={-6.8}
            width={26.4}
            height={13.4}
            rx={2.2}
            fill={`url(#${hullGradId})`}
            stroke={rimColor}
            strokeWidth={hovered ? 0.95 : 0.55}
          />

          {/* Lower Midnight-Navy Straddle Skirt */}
          <rect x={-12.9} y={3.4} width={25.8} height={3.0} rx={1} fill={`url(#${skirtGradId})`} />

          {/* Continuous Smoked Panoramic Window Band */}
          <rect x={-11.8} y={-3.9} width={23.6} height={5.0} rx={1.1} fill={`url(#${glassGradId})`} />
          {/* 3 Warmly Lit Flush Cabin Panes */}
          <rect x={-10.7} y={-2.9} width={6.3} height={3.3} rx={0.7} fill={`url(#${cabinGlowId})`} />
          <rect x={-3.1} y={-2.9} width={6.2} height={3.3} rx={0.7} fill={`url(#${cabinGlowId})`} />
          <rect x={4.4} y={-2.9} width={6.3} height={3.3} rx={0.7} fill={`url(#${cabinGlowId})`} />
          {/* Ultra-thin Flush Window Mullions */}
          <line x1={-3.8} y1={-3.8} x2={-3.8} y2={1.1} stroke="#060E21" strokeWidth={1.05} />
          <line x1={3.8} y1={-3.8} x2={3.8} y2={1.1} stroke="#060E21" strokeWidth={1.05} />
          {/* Glass Sky Reflection Streaks */}
          <path d="M -8.6 -2.9 L -6.2 0.2 M -0.8 -2.9 L 1.6 0.2 M 6.8 -2.9 L 9.2 0.2" stroke="#DCEBFF" strokeOpacity={0.28} strokeWidth={0.85} strokeLinecap="round" />

          {/* Roof Metallic Crown Specular Line & Aero Pod */}
          <line x1={-11.5} y1={-5.6} x2={11.5} y2={-5.6} stroke={`url(#${roofSheenId})`} strokeWidth={1.3} strokeLinecap="round" />
          <rect x={-5.5} y={-6.4} width={11} height={1.15} rx={0.55} fill="#8FA6C9" opacity={0.45} />

          {/* Brushed Champagne-Gold Livery Stripe */}
          <line x1={-12.4} y1={3.3} x2={12.4} y2={3.3} stroke={`url(#${goldTrimId})`} strokeWidth={1.35} />

          {/* Subtle Flush Boarding Door Seams */}
          <line x1={-10.2} y1={-4.6} x2={-10.2} y2={5.5} stroke="#0E1D3B" strokeOpacity={0.5} strokeWidth={0.55} />
          <line x1={10.2} y1={-4.6} x2={10.2} y2={5.5} stroke="#0E1D3B" strokeOpacity={0.5} strokeWidth={0.55} />
        </g>
      ))}

      {/* ── FRONT AERODYNAMIC BULLET NOSE CAR ── */}
      <g transform={`translate(${frontCar.x}, ${frontCar.y}) rotate(${frontCar.angleDeg}) scale(${carScale})`}>
        {/* Direction-aware volumetric LED headlight beam illuminating the gold rail ahead */}
        {isMovingForward && (
          <path d="M 18.5 -2.2 L 46 -8.4 L 46 8.4 L 18.5 2.2 Z" fill={`url(#${beamForwardId})`} pointerEvents="none" />
        )}

        {/* Sculpted Aerodynamic Forward Bullet Fuselage */}
        <path
          d="M -12.8 -5.2 C -12.8 -6.1, -12.2 -6.8, -11.2 -6.8 L 2 -6.8 C 11.8 -6.5, 17.8 -3.7, 20.2 0.4 C 17.8 4.4, 12.6 6.6, 3.5 6.6 L -11.2 6.6 C -12.2 6.6, -12.8 6.1, -12.8 5.2 Z"
          fill={`url(#${hullGradId})`}
          stroke={rimColor}
          strokeWidth={hovered ? 0.95 : 0.55}
        />

        {/* Lower Midnight-Navy Straddle Skirt */}
        <path
          d="M -12.4 3.4 L 15.8 3.4 C 13.4 5.3, 8.6 6.3, 2 6.3 L -12.4 6.3 Z"
          fill={`url(#${skirtGradId})`}
        />

        {/* Continuous Cabin Windows Sweeping Into Aerodynamic Cockpit Visor */}
        <path
          d="M -11.2 -3.9 L 2.8 -3.9 C 8.6 -3.9, 13.2 -3.1, 15.6 -0.6 C 16.2 0.2, 15.8 1.1, 14.5 1.1 L -11.2 1.1 Z"
          fill={`url(#${glassGradId})`}
        />
        {/* Warm Interior Cabin Illumination + Subtle Cockpit Console Glow */}
        <rect x={-10.0} y={-2.8} width={6.2} height={3.2} rx={0.7} fill={`url(#${cabinGlowId})`} />
        <rect x={-2.3} y={-2.8} width={5.8} height={3.2} rx={0.7} fill={`url(#${cabinGlowId})`} />
        <path d="M 6.2 -2.6 C 9.4 -2.5, 12.2 -1.6, 13.8 -0.2 L 12.6 0.6 L 6.2 0.6 Z" fill="#93C5FD" fillOpacity={0.14} />

        {/* Flush Smoked Window Pillars */}
        <line x1={-3.0} y1={-3.8} x2={-3.0} y2={1.1} stroke="#070F22" strokeWidth={1.0} />
        <line x1={4.8} y1={-3.8} x2={4.8} y2={1.1} stroke="#070F22" strokeWidth={1.15} />
        {/* Aviation Cockpit Specular Glass Glints */}
        <path d="M -8.0 -2.9 L -5.6 0.2 M -0.2 -2.9 L 2.1 0.2 M 8.4 -2.4 L 11.8 -0.1" stroke="#E0F0FF" strokeOpacity={0.34} strokeWidth={0.9} strokeLinecap="round" />

        {/* Roof Specular Crown Highlight + Aero Fairing */}
        <path d="M -11 -5.7 L 3 -5.7 C 6.5 -5.7, 9.8 -5.1, 12.4 -4.1" fill="none" stroke={`url(#${roofSheenId})`} strokeWidth={1.3} strokeLinecap="round" />
        <rect x={-8} y={-6.4} width={7} height={1.1} rx={0.5} fill="#89A0C4" opacity={0.45} />

        {/* Sweeping Champagne-Gold Metallic Livery Stripe curving into nosecone */}
        <path
          d="M -12.2 3.3 L 6 3.3 C 11.8 3.3, 15.6 2.7, 17.6 1.7"
          fill="none"
          stroke={`url(#${goldTrimId})`}
          strokeWidth={1.35}
          strokeLinecap="round"
        />

        {/* Subtle Flush Nose Panel & Door Seam */}
        <line x1={-10.5} y1={-4.5} x2={-10.5} y2={5.4} stroke="#10203F" strokeOpacity={0.55} strokeWidth={0.55} />

        {/* Direction-aware Nose Lighting: Dual Warm LED Headlamps (forward) OR Ruby LED Tail Strip (reverse) */}
        {isMovingForward ? (
          <>
            <ellipse cx={18.3} cy={0.3} rx={2.4} ry={1.5} fill="#FFF7DE" opacity={0.95} />
            <circle cx={19.0} cy={0.3} r={0.95} fill="#FFFFFF" />
          </>
        ) : (
          <path d="M 18.6 -0.9 C 19.3 0, 19.3 1.1, 18.5 1.7" fill="none" stroke="#FB7185" strokeWidth={1.55} strokeLinecap="round" />
        )}
      </g>

      {/* Subtle floating badge near exposed lead nose (stays visible outside tunnel station dome!) */}
      {(hovered || variant === "case") && (
        <g transform={`translate(${(isMovingForward ? frontCar : rearCar).x}, ${(isMovingForward ? frontCar : rearCar).y - 21})`}>
          <rect
            x={-Math.max(32, shortBadge.length * 3.7 + 12)}
            y={-10}
            width={Math.max(64, shortBadge.length * 7.4 + 24)}
            height={19}
            rx={9.5}
            fill="#06122E"
            fillOpacity={0.95}
            stroke={variant === "case" ? "#DFBA6A" : "#7CC4FF"}
            strokeWidth={0.95}
          />
          <text
            x={0}
            y={2.8}
            textAnchor="middle"
            fill={variant === "case" ? "#FFF2CC" : "#CDE6FF"}
            fontSize={9.5}
            fontWeight={600}
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            {shortBadge}
          </text>
        </g>
      )}
    </g>
  );
}
