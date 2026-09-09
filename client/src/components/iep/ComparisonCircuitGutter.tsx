import React from "react";
import { ComparisonItem, getStatusTheme } from "./types";

interface ComparisonCircuitGutterProps {
  item: ComparisonItem;
  isHovered: boolean;
  isSelected: boolean;
  onHover: (hovered: boolean) => void;
  onClick: () => void;
}

export function ComparisonCircuitGutter({
  item,
  isHovered,
  isSelected,
  onHover,
  onClick,
}: ComparisonCircuitGutterProps) {
  const theme = getStatusTheme(item.status);
  const active = isHovered || isSelected;

  // Visual coordinates for SVG circuit inside 120px wide gutter
  // Start from (0, 50%) to (120, 50%) with a graceful slight S-curve or pulse node
  const width = 120;
  const height = 48; // reference SVG viewport height
  const yMid = height / 2;

  // Cubic bezier control points
  const p1x = 0;
  const p1y = yMid;
  const p2x = width;
  const p2y = yMid;
  const cp1x = width * 0.4;
  const cp1y = yMid;
  const cp2x = width * 0.6;
  const cp2y = yMid;

  const pathD = `M ${p1x} ${p1y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2x} ${p2y}`;

  return (
    <div
      className="relative w-full h-full min-h-[72px] flex items-center justify-center cursor-pointer select-none group"
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onClick={onClick}
      title={`Click to inspect ${item.title} comparison details`}
    >
      {/* Central comparison engine ambient glow */}
      <div
        className={`absolute inset-x-2 h-10 rounded-full blur-xl transition-opacity duration-300 pointer-events-none ${
          active ? "opacity-70" : "opacity-20"
        }`}
        style={{
          background: `radial-gradient(circle, ${theme.circuitHex} 0%, transparent 70%)`,
        }}
      />

      {/* SVG Circuit Canvas */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full h-12 overflow-visible relative z-10"
      >
        <defs>
          {/* Neon soft glow filter */}
          <filter id={`glow-${item.id}`} x="-20%" y="-40%" width="140%" height="180%">
            <feGaussianBlur stdDeviation={active ? "3.5" : "2"} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Gradient along circuit line */}
          <linearGradient id={`circuitGrad-${item.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={theme.circuitHex} stopOpacity={active ? 1 : 0.75} />
            <stop offset="50%" stopColor={active ? "#ffffff" : theme.circuitHex} stopOpacity={active ? 1 : 0.9} />
            <stop offset="100%" stopColor={theme.circuitHex} stopOpacity={active ? 1 : 0.75} />
          </linearGradient>
        </defs>

        {/* 1. Outer Soft Neon Glow Track */}
        <path
          d={pathD}
          fill="none"
          stroke={theme.circuitHex}
          strokeWidth={active ? "7" : "3.5"}
          strokeOpacity={active ? "0.45" : "0.18"}
          strokeLinecap="round"
          filter={`url(#glow-${item.id})`}
          className="transition-all duration-200"
        />

        {/* 2. Core Solid Illuminated Circuit Pathway */}
        <path
          d={pathD}
          fill="none"
          stroke={`url(#circuitGrad-${item.id})`}
          strokeWidth={active ? "2.5" : "1.75"}
          strokeLinecap="round"
          className="transition-all duration-200"
        />

        {/* 3. Subtle Animated Light-Flow Traveling Through Line */}
        <path
          d={pathD}
          fill="none"
          stroke="#ffffff"
          strokeWidth={active ? "2.5" : "1.75"}
          strokeDasharray="5 15"
          strokeDashoffset="0"
          strokeOpacity={active ? "0.9" : "0.55"}
          className={active ? "animate-circuit-flow-fast" : "animate-circuit-flow"}
        />

        {/* Left Connection Terminal Node (Attaches cleanly to New IEP Card) */}
        <g transform={`translate(${p1x}, ${p1y})`}>
          {/* Outer illuminated halo ring */}
          <circle
            r={active ? "5.5" : "4"}
            fill="none"
            stroke={theme.circuitHex}
            strokeWidth="1.5"
            strokeOpacity={active ? "1" : "0.7"}
            className="transition-all duration-200"
          />
          {/* Core dot */}
          <circle
            r={active ? "3" : "2"}
            fill={active ? "#ffffff" : theme.circuitHex}
            className="transition-all duration-200"
          />
        </g>

        {/* Right Connection Terminal Node (Attaches cleanly to Previous IEP Card) */}
        <g transform={`translate(${p2x}, ${p2y})`}>
          {/* Outer illuminated halo ring */}
          <circle
            r={active ? "5.5" : "4"}
            fill="none"
            stroke={theme.circuitHex}
            strokeWidth="1.5"
            strokeOpacity={active ? "1" : "0.7"}
            className="transition-all duration-200"
          />
          {/* Core dot */}
          <circle
            r={active ? "3" : "2"}
            fill={active ? "#ffffff" : theme.circuitHex}
            className="transition-all duration-200"
          />
        </g>

        {/* Center Comparison Engine Logic Chip / Node */}
        <g transform={`translate(${width / 2}, ${yMid})`}>
          {/* Micro terminal diamond or pulse hub */}
          <rect
            x="-4"
            y="-4"
            width="8"
            height="8"
            transform="rotate(45)"
            fill="#060e1a"
            stroke={theme.circuitHex}
            strokeWidth={active ? "1.5" : "1"}
            className="transition-all duration-200"
          />
          <circle
            r={active ? "2" : "1.2"}
            fill={active ? "#ffffff" : theme.circuitHex}
            className="transition-all duration-200"
          />
        </g>
      </svg>

      {/* Comparison Engine center hover badge */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded-full text-[8px] font-mono tracking-wider uppercase border transition-all duration-200 pointer-events-none z-20 ${
          active
            ? "scale-105 opacity-100 bg-slate-950 text-white border-white/20 shadow-md shadow-black"
            : "scale-90 opacity-0 group-hover:opacity-100 bg-slate-950/90 text-slate-400 border-white/10"
        }`}
      >
        DELTA
      </div>
    </div>
  );
}
