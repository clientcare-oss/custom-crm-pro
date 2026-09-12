import React from "react";

export function MarineRadarIcon({
  className = "h-4 w-4",
  size,
  ...props
}: React.SVGProps<SVGSVGElement> & { size?: number | string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      {...props}
    >
      {/* Outer Radar Scope Bezel */}
      <circle cx="12" cy="12" r="9.5" strokeWidth="1.8" />

      {/* Inner Range Ring */}
      <circle cx="12" cy="12" r="5" strokeWidth="1.2" strokeDasharray="2 2" strokeOpacity="0.7" />

      {/* Phosphor Radar Sweep Beam (45° sector) */}
      <path
        d="M 12 12 L 18.72 5.28 A 9.5 9.5 0 0 0 12 2.5 Z"
        fill="currentColor"
        fillOpacity="0.25"
        stroke="none"
      />

      {/* Leading Radar Sweep Scanner Line */}
      <line x1="12" y1="12" x2="18.72" y2="5.28" strokeWidth="2" />

      {/* Crosshairs */}
      <line x1="12" y1="2.5" x2="12" y2="7" strokeWidth="1.6" />
      <line x1="12" y1="17" x2="12" y2="21.5" strokeWidth="1.6" />
      <line x1="2.5" y1="12" x2="7" y2="12" strokeWidth="1.6" />
      <line x1="17" y1="12" x2="21.5" y2="12" strokeWidth="1.6" />

      {/* Detected Target Contact Blip */}
      <circle cx="15.8" cy="8.2" r="1.3" fill="currentColor" stroke="none" />

      {/* Center Bullseye Pivot */}
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default MarineRadarIcon;
