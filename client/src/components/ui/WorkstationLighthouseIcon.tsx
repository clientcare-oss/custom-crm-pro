import React from "react";

/**
 * Distinct Observatory Beacon Lighthouse icon for "My Workstation" (PG-052).
 * Visually distinct from LighthouseCottageIcon: features a curved coastal cliff base,
 * arched entrance doorway, rounded observatory cupola dome with spire, and a directional
 * sweeping spotlight cone beam shining across the right horizon.
 */
export function WorkstationLighthouseIcon({
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
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      {...props}
    >
      {/* ── Directional Sweeping Beacon Cone Beam (shining right, matching Observatory CRT) ── */}
      <path d="M12.6 5.6L21.6 3.1" />
      <path d="M12.6 8.2L21.6 10.4" />
      <line x1="14.2" y1="6.9" x2="21.4" y2="6.9" strokeDasharray="1.8 2.2" />

      {/* ── Observatory Dome Cupola & Finial Spire ── */}
      <line x1="8.8" y1="1.8" x2="8.8" y2="3.2" />
      <path d="M6.2 5.4A2.6 2.6 0 0 1 11.4 5.4" />

      {/* ── Illuminated Lantern Room & Balcony Rim ── */}
      <rect x="6.5" y="5.4" width="4.6" height="3.2" rx="0.5" />
      <line x1="5.0" y1="8.6" x2="12.6" y2="8.6" />

      {/* ── Tapered Stone Observatory Tower + Arched Entry Door ── */}
      <path d="M6.4 8.6L4.8 19.6" />
      <path d="M11.2 8.6L12.8 19.6" />
      <path d="M7.5 19.4V16.4A1.3 1.3 0 0 1 10.1 16.4V19.4" />

      {/* ── Upper Watch Window ── */}
      <line x1="8.8" y1="11.6" x2="8.8" y2="12.8" />

      {/* ── Curved Coastal Rocky Headland Mound ── */}
      <path d="M2.2 21.4C4.2 19.6 7.0 19.2 9.4 19.4C12.2 19.6 14.8 20.1 16.8 21.4" />
      <line x1="2.0" y1="21.4" x2="21.5" y2="21.4" />
    </svg>
  );
}

export default WorkstationLighthouseIcon;
