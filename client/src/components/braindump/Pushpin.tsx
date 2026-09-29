import React from "react";

export type PinColor = "blue" | "yellow" | "magenta" | "purple" | "green" | "red";

interface PushpinProps {
  color?: PinColor | string;
  className?: string;
  size?: number;
}

const PIN_PALETTES: Record<PinColor, { head: string; highlight: string; rim: string; shadow: string }> = {
  blue: {
    head: "#2563eb",
    highlight: "#93c5fd",
    rim: "#1d4ed8",
    shadow: "rgba(30, 64, 175, 0.4)",
  },
  yellow: {
    head: "#eab308",
    highlight: "#fef08a",
    rim: "#ca8a04",
    shadow: "rgba(202, 138, 4, 0.4)",
  },
  magenta: {
    head: "#db2777",
    highlight: "#f9a8d4",
    rim: "#be185d",
    shadow: "rgba(190, 24, 93, 0.4)",
  },
  purple: {
    head: "#7c3aed",
    highlight: "#c4b5fd",
    rim: "#6d28d9",
    shadow: "rgba(109, 40, 217, 0.4)",
  },
  green: {
    head: "#16a34a",
    highlight: "#86efac",
    rim: "#15803d",
    shadow: "rgba(21, 128, 61, 0.4)",
  },
  red: {
    head: "#dc2626",
    highlight: "#fca5a5",
    rim: "#b91c1c",
    shadow: "rgba(185, 28, 28, 0.4)",
  },
};

export default function Pushpin({ color = "blue", className = "", size = 22 }: PushpinProps) {
  const palette = PIN_PALETTES[(color as PinColor)] || PIN_PALETTES.blue;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] ${className}`}
    >
      {/* Soft ground shadow under pin */}
      <ellipse cx="12" cy="21" rx="4.5" ry="1.8" fill="rgba(0,0,0,0.35)" />
      
      {/* Metal needle tip point */}
      <path d="M12 16L12 21" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />

      {/* Pin cylindrical base flange */}
      <ellipse cx="12" cy="15.5" rx="4.2" ry="1.6" fill={palette.rim} />

      {/* Plastic Pin Body */}
      <path
        d="M8.5 8C8.5 6 9.5 5 12 5C14.5 5 15.5 6 15.5 8C15.5 10.5 13.8 13.5 13.5 15.2H10.5C10.2 13.5 8.5 10.5 8.5 8Z"
        fill={palette.head}
      />

      {/* Pin Rounded Spherical Head */}
      <circle cx="12" cy="7.5" r="4.2" fill={palette.head} />
      
      {/* Glossy Reflection Highlight */}
      <ellipse cx="10.8" cy="6.2" rx="1.6" ry="1" fill={palette.highlight} opacity="0.85" />
      <circle cx="13.2" cy="8.2" r="0.6" fill="#ffffff" opacity="0.5" />
    </svg>
  );
}
