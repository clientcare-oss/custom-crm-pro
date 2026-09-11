import React from "react";

export function LighthouseCottageIcon({
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
      {/* ── Lighthouse Lantern Cap & Roof ── */}
      <path d="M5.5 5.5L7.5 2.5L9.5 5.5Z" fill="currentColor" fillOpacity="0.2" />
      {/* Lantern Housing */}
      <path d="M5.5 5.5H9.5V8H5.5Z" />
      {/* Gallery Balcony Walkway */}
      <path d="M4 8H11" strokeWidth="2" />
      
      {/* Lantern Beam Rays */}
      <path d="M3 4L1.5 3" strokeOpacity="0.8" />
      <path d="M3 6L1 6.5" strokeOpacity="0.8" />
      <path d="M12 4L13.5 3" strokeOpacity="0.8" />

      {/* ── Tapered Lighthouse Tower Body ── */}
      <path d="M5 8L3.5 20H11L9.5 8" />
      {/* Tower Windows */}
      <line x1="7.5" y1="11" x2="7.5" y2="12.5" />
      <line x1="7.5" y1="15" x2="7.5" y2="16.5" />

      {/* ── Attached Keeper's Cottage ── */}
      {/* Cottage Gabled Roof */}
      <path d="M9.5 12.5L16 8.5L22 12.5" strokeWidth="2" />
      {/* Chimney */}
      <path d="M18.5 10V7H20V11" />
      {/* Cottage Walls */}
      <path d="M10.5 13.5V20H21V13" />
      {/* Cottage Window */}
      <rect x="16.5" y="14" width="2.8" height="2.8" rx="0.5" fill="currentColor" fillOpacity="0.15" />
      {/* Cottage Door */}
      <path d="M12.5 20V16H14.5V20" />

      {/* ── Shoreline & Wave Baseline ── */}
      <path d="M1.5 21.5C4.5 20.8 7.5 21.8 11.5 21C15 20.5 18.5 21.8 22.5 21" strokeWidth="1.6" />
    </svg>
  );
}

export default LighthouseCottageIcon;
