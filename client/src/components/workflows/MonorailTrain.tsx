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
  carSpacing = 23.5
): [CarPose, CarPose, CarPose] | null {
  if (!pathEl) return null;
  try {
    const total = pathEl.getTotalLength();
    if (!Number.isFinite(total) || total <= 1) return null;

    // Keep all 3 cars strictly inside valid path bounds
    const padFrac = Math.min(0.08, (carSpacing * 1.4) / total);
    const clamped = Math.max(padFrac, Math.min(1 - padFrac, fraction));
    const centerDist = clamped * total;

    const sampleAt = (dist: number): CarPose => {
      const d = Math.max(1, Math.min(total - 1, dist));
      const p = pathEl.getPointAtLength(d);
      const pAhead = pathEl.getPointAtLength(Math.min(total, d + 3));
      const pBehind = pathEl.getPointAtLength(Math.max(0, d - 3));
      const angleDeg =
        (Math.atan2(pAhead.y - pBehind.y, pAhead.x - pBehind.x) * 180) / Math.PI;
      return { x: p.x, y: p.y, angleDeg };
    };

    // 3 independently tangent-aligned articulated sections: lead nose, center car, tail nose
    return [
      sampleAt(centerDist + carSpacing),
      sampleAt(centerDist),
      sampleAt(centerDist - carSpacing),
    ];
  } catch {
    return null;
  }
}

/**
 * Reusable Component #3: Tiny Streamlined Articulated Monorail Train
 * Low aerodynamic profile, pearl-silver/midnight-navy metallic body, continuous obsidian
 * window band, 3 articulated sections following curves cleanly, restrained champagne gold trim,
 * zero road wheels, seated directly on the monorail track.
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
  const [hovered, setHovered] = useState(false);
  const currentFracRef = useRef(targetFraction);
  const rafRef = useRef<number | null>(null);
  const onArriveRef = useRef(onArriveStation);
  onArriveRef.current = onArriveStation;

  // 1. Continuous Demo Playback: glide smoothly from station to station, pausing gently at each station
  useEffect(() => {
    if (!demoPlaying || reducedMotion || !pathElement || stationFractions.length < 2) {
      return;
    }

    let cancelled = false;
    // Start targeting the next station ahead of current position
    let targetIdx = stationFractions.findIndex((f) => f > currentFracRef.current + 0.015);
    if (targetIdx < 0) targetIdx = 1;

    let phase: "gliding" | "dwelling" = "gliding";
    let startFrac = currentFracRef.current;
    let endFrac = stationFractions[targetIdx];
    let phaseStart: number | null = null;
    const dwellMs = 880;

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
        // Dwelling calmly at station before departing to next station
        if (elapsed >= dwellMs) {
          const nextIdx = targetIdx + 1;
          if (nextIdx >= stationFractions.length) {
            // Smoothly loop back to start of route
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

  // 2. Controlled targetFraction animation (used when stepping manually, stopping demo, or moving a live Case Train)
  useEffect(() => {
    if (demoPlaying) return;

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

    const durationMs = Math.min(1350, Math.max(420, Math.abs(delta) * 2600));
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

  const poses = sampleCarPoses(pathElement, currentFraction, 22.5);
  if (!poses) return null;

  const [lead, middle, tail] = poses;
  const hullGradId = `train-hull-${trainId}`;
  const glassGradId = `train-glass-${trainId}`;
  const accentColor = variant === "case" ? "#F0D084" : "#DFBE76";
  const rimHighlight = hovered ? "#FFF4D4" : "#BFD0E8";

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
      style={{ filter: "drop-shadow(0 5px 5px rgba(0, 2, 12, 0.9))" }}
    >
      <defs>
        {/* Pearl Silver -> Midnight Navy Aerodynamic Metallic Hull */}
        <linearGradient id={hullGradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="28%" stopColor="#DCE6F5" />
          <stop offset="56%" stopColor="#849BBE" />
          <stop offset="82%" stopColor="#263B63" />
          <stop offset="100%" stopColor="#09132B" />
        </linearGradient>
        {/* Continuous Smoked Obsidian Panoramic Glass Band */}
        <linearGradient id={glassGradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#030816" />
          <stop offset="48%" stopColor="#172E5B" />
          <stop offset="100%" stopColor="#040A19" />
        </linearGradient>
      </defs>

      {/* Large accessible hit target */}
      <g transform={`translate(${middle.x}, ${middle.y}) rotate(${middle.angleDeg})`}>
        <rect x={-42} y={-20} width={84} height={40} rx={14} fill="transparent" />
      </g>

      {/* Articulated obsidian bellows connecting tail -> middle -> lead cleanly around bends */}
      <line
        x1={tail.x}
        y1={tail.y}
        x2={middle.x}
        y2={middle.y}
        stroke="#071024"
        strokeWidth={7.5}
        strokeLinecap="round"
      />
      <line
        x1={middle.x}
        y1={middle.y}
        x2={lead.x}
        y2={lead.y}
        stroke="#071024"
        strokeWidth={7.5}
        strokeLinecap="round"
      />

      {/* Tail Streamlined Tapered End Car */}
      <g transform={`translate(${tail.x}, ${tail.y}) rotate(${tail.angleDeg})`}>
        <path
          d="M -15 0.5 C -12.5 -4.4, -5.5 -5.8, 9.5 -5.8 L 11 -5.8 L 11 5.6 L 9.5 5.6 C -5.5 5.6, -12.5 4.4, -15 0.5 Z"
          fill={`url(#${hullGradId})`}
          stroke={rimHighlight}
          strokeWidth={hovered ? 0.95 : 0.55}
        />
        <path
          d="M -10 -1.3 C -7.5 -2.6, -2.5 -2.8, 9.5 -2.8 L 9.5 0.9 L -10 0.9 Z"
          fill={`url(#${glassGradId})`}
        />
        <line x1={-9.5} y1={2.7} x2={10} y2={2.7} stroke={accentColor} strokeWidth={1.15} />
        {/* Tiny warm ruby tail marker */}
        <circle cx={-13.2} cy={0.3} r={1.1} fill="#FDA4AF" opacity={0.85} />
      </g>

      {/* Center Articulated Cabin Car */}
      <g transform={`translate(${middle.x}, ${middle.y}) rotate(${middle.angleDeg})`}>
        <rect
          x={-11}
          y={-5.8}
          width={22}
          height={11.4}
          rx={2.2}
          fill={`url(#${hullGradId})`}
          stroke={rimHighlight}
          strokeWidth={hovered ? 0.95 : 0.55}
        />
        <rect
          x={-10}
          y={-2.8}
          width={20}
          height={3.6}
          rx={1}
          fill={`url(#${glassGradId})`}
        />
        <line x1={-8.5} y1={-4.3} x2={8.5} y2={-4.3} stroke="#FFFFFF" strokeOpacity={0.65} strokeWidth={0.75} />
        <line x1={-10} y1={2.7} x2={10} y2={2.7} stroke={accentColor} strokeWidth={1.15} />
      </g>

      {/* Lead Aerodynamic Bullet Nose Car */}
      <g transform={`translate(${lead.x}, ${lead.y}) rotate(${lead.angleDeg})`}>
        <path
          d="M -11 -5.8 L -9.5 -5.8 C 5.5 -5.8, 12.8 -4.4, 16.5 0.2 C 12.8 4.4, 5.5 5.6, -9.5 5.6 L -11 5.6 Z"
          fill={`url(#${hullGradId})`}
          stroke={rimHighlight}
          strokeWidth={hovered ? 0.95 : 0.55}
        />
        {/* Swept wrap-around smoked cockpit visor */}
        <path
          d="M -9.5 -2.8 L 5.2 -2.8 C 9.2 -2.8, 12.2 -1.6, 13.4 -0.1 L 11.4 0.9 L -9.5 0.9 Z"
          fill={`url(#${glassGradId})`}
        />
        <line x1={-9} y1={-4.3} x2={5} y2={-4.3} stroke="#FFFFFF" strokeOpacity={0.65} strokeWidth={0.75} />
        <line x1={-10} y1={2.7} x2={10.5} y2={2.7} stroke={accentColor} strokeWidth={1.15} />
        {/* Subtle warm champagne headlamp beam & pinpoint */}
        <ellipse cx={18} cy={0.2} rx={4.5} ry={2.2} fill="#FFF5D6" opacity={0.22} />
        <circle cx={14.8} cy={0.2} r={1.45} fill="#FFF7DF" opacity={0.96} />
      </g>

      {/* Subtle floating badge on hover or for live Case Train */}
      {(hovered || variant === "case") && (
        <g transform={`translate(${middle.x}, ${middle.y - 23})`}>
          <rect
            x={-Math.max(30, shortBadge.length * 3.7 + 12)}
            y={-10}
            width={Math.max(60, shortBadge.length * 7.4 + 24)}
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
