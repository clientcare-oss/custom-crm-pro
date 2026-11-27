import React from "react";

/**
 * Bespoke vintage brass Cash Register icon for the Waypoint Admiralty sidebar & Register module.
 * Uses currentColor strokes so the Admiralty 3D chiseled-brass SVG gradient & bevel filter
 * renders it seamlessly alongside LighthouseCottageIcon and Lucide navigation icons.
 */
export function CashRegisterIcon({
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
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      {...props}
    >
      {/* Top vintage amount display hood */}
      <rect x="7" y="2.5" width="10" height="4.5" rx="1.2" fill="currentColor" fillOpacity="0.14" />
      <line x1="9.5" y1="4.75" x2="14.5" y2="4.75" />

      {/* Sloped brass register body */}
      <path d="M5.8 7H18.2L19.8 14.2H4.2L5.8 7Z" fill="currentColor" fillOpacity="0.08" />

      {/* Classic staggered mechanical cash register keys */}
      <line x1="8.4" y1="9.6" x2="8.5" y2="9.6" strokeWidth="2.3" />
      <line x1="12" y1="9.6" x2="12.1" y2="9.6" strokeWidth="2.3" />
      <line x1="15.6" y1="9.6" x2="15.7" y2="9.6" strokeWidth="2.3" />
      <line x1="7.8" y1="12.1" x2="7.9" y2="12.1" strokeWidth="2.3" />
      <line x1="12" y1="12.1" x2="12.1" y2="12.1" strokeWidth="2.3" />
      <line x1="16.2" y1="12.1" x2="16.3" y2="12.1" strokeWidth="2.3" />

      {/* Heavy lower cash drawer & centered brass pull */}
      <rect x="2.8" y="14.2" width="18.4" height="6.3" rx="1.6" fill="currentColor" fillOpacity="0.16" />
      <line x1="9.2" y1="17.35" x2="14.8" y2="17.35" strokeWidth="2.1" />
    </svg>
  );
}

export default CashRegisterIcon;
