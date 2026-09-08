import React, { useId } from "react";

interface RadarReticleIconProps {
  className?: string;
  animated?: boolean;
  speedSec?: number;
  showBlips?: boolean;
  pulse?: boolean;
}

/**
 * High-tech animated radar reticle matching Waypoint First Mate brand styling.
 * Features:
 * - Sweeping 360° radar beam with authentic decaying phosphor fade
 * - Synchronized expanding sonar ripple ping
 * - Interactive phosphor target blips in the scope grid
 * - Precision reticle crosshairs & range rings
 */
export function RadarReticleIcon({
  className = "w-10 h-10",
  animated = true,
  speedSec: customSpeed,
  showBlips = true,
  pulse = false,
}: RadarReticleIconProps) {
  const speedSec = customSpeed ?? (pulse ? 1.8 : 2.8);
  const reactId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const glowId = `reticleGlow_${reactId}`;
  const sweepId = `radarSweep_${reactId}`;
  const clipId = `radarClip_${reactId}`;
  const filterId = `radarFilter_${reactId}`;

  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: "visible" }}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="50" cy="50" r="46" />
        </clipPath>

        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
          <stop offset="65%" stopColor="#0891b2" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#0891b2" stopOpacity="0.02" />
        </radialGradient>

        <linearGradient id={sweepId} x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.45" />
          <stop offset="35%" stopColor="#06b6d4" stopOpacity="0.22" />
          <stop offset="75%" stopColor="#0891b2" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
        </linearGradient>

        <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        {animated && (
          <style>{`
            @keyframes radar-sweep-${reactId} {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            @keyframes radar-pulse-wave-${reactId} {
              0% { r: 3; opacity: 0.85; stroke-width: 2; }
              70% { r: 44; opacity: 0.18; stroke-width: 1; }
              100% { r: 46; opacity: 0; stroke-width: 0.5; }
            }
            @keyframes radar-blip-1-${reactId} {
              0%, 7% { opacity: 0.05; transform: scale(0.7); }
              12% { opacity: 1; transform: scale(1.3); }
              22% { opacity: 0.8; }
              45%, 100% { opacity: 0.08; transform: scale(0.9); }
            }
            @keyframes radar-blip-2-${reactId} {
              0%, 55% { opacity: 0.05; transform: scale(0.7); }
              60% { opacity: 1; transform: scale(1.3); }
              70% { opacity: 0.8; }
              90%, 100% { opacity: 0.08; transform: scale(0.9); }
            }
          `}</style>
        )}
      </defs>

      {/* Scope Housing & Outer Glow */}
      <circle cx="50" cy="50" r="46" fill={`url(#${glowId})`} stroke="#06b6d4" strokeWidth="2.5" />

      {/* Animated Radar Sweep & Dynamic Radar Elements */}
      {animated && (
        <g clipPath={`url(#${clipId})`}>
          {/* Sonar Ripple Pulse Wave */}
          <circle
            cx="50"
            cy="50"
            fill="none"
            stroke="#22d3ee"
            style={{
              animation: `radar-pulse-wave-${reactId} ${speedSec}s cubic-bezier(0.2, 0.8, 0.4, 1) infinite`,
            }}
          />

          {/* 360° Rotating Radar Sweep with Trailing Phosphor Glow */}
          <g
            style={{
              transformOrigin: "50px 50px",
              animation: `radar-sweep-${reactId} ${speedSec}s linear infinite`,
            }}
          >
            {/* Trailing wedge / phosphor gradient sector (60° counter-clockwise from 12 o'clock) */}
            <path
              d="M 50 50 L 50 4 A 46 46 0 0 0 10.16 27 Z"
              fill={`url(#${sweepId})`}
            />
            {/* Leading bright sweep line */}
            <line
              x1="50"
              y1="50"
              x2="50"
              y2="4"
              stroke="#67e8f9"
              strokeWidth="2"
              strokeLinecap="round"
              filter={`url(#${filterId})`}
            />
          </g>

          {/* Target Blip 1 (Upper-Right ~45°, position 68, 32) */}
          {showBlips && (
            <g
              style={{
                transformOrigin: "68px 32px",
                animation: `radar-blip-1-${reactId} ${speedSec}s ease-out infinite`,
              }}
            >
              <circle cx="68" cy="32" r="3.5" fill="#22d3ee" fillOpacity="0.4" />
              <circle cx="68" cy="32" r="1.8" fill="#ffffff" />
            </g>
          )}

          {/* Target Blip 2 (Lower-Left ~225°, position 32, 68) */}
          {showBlips && (
            <g
              style={{
                transformOrigin: "32px 68px",
                animation: `radar-blip-2-${reactId} ${speedSec}s ease-out infinite`,
              }}
            >
              <circle cx="32" cy="68" r="3" fill="#06b6d4" fillOpacity="0.4" />
              <circle cx="32" cy="68" r="1.5" fill="#a5f3fc" />
            </g>
          )}
        </g>
      )}

      {/* Scope Reticle Range Rings */}
      <circle cx="50" cy="50" r="34" stroke="#0891b2" strokeWidth="1.75" strokeDasharray="3 3" opacity="0.8" />
      <circle cx="50" cy="50" r="22" stroke="#22d3ee" strokeWidth="1.5" opacity="0.9" />

      {/* Reticle Crosshairs */}
      <line x1="50" y1="4" x2="50" y2="28" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" />
      <line x1="50" y1="72" x2="50" y2="96" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" />
      <line x1="4" y1="50" x2="28" y2="50" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" />
      <line x1="72" y1="50" x2="96" y2="50" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" />

      {/* 4 Diagonal Sub-Ticks on Outer Bezel */}
      <line x1="18.5" y1="18.5" x2="23.5" y2="23.5" stroke="#0891b2" strokeWidth="1.25" strokeLinecap="round" opacity="0.6" />
      <line x1="81.5" y1="18.5" x2="76.5" y2="23.5" stroke="#0891b2" strokeWidth="1.25" strokeLinecap="round" opacity="0.6" />
      <line x1="18.5" y1="81.5" x2="23.5" y2="76.5" stroke="#0891b2" strokeWidth="1.25" strokeLinecap="round" opacity="0.6" />
      <line x1="81.5" y1="81.5" x2="76.5" y2="76.5" stroke="#0891b2" strokeWidth="1.25" strokeLinecap="round" opacity="0.6" />

      {/* Center Bullseye */}
      <circle cx="50" cy="50" r="7" stroke="#38bdf8" strokeWidth="2" fill="#06b6d4" fillOpacity="0.4" />
      <circle cx="50" cy="50" r="2.5" fill="#ffffff" />
    </svg>
  );
}

// Named alias for convenience
export const FirstMateReticleLogo = RadarReticleIcon;
export default RadarReticleIcon;
