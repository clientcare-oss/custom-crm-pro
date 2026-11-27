import React from "react";

/**
 * Clean, unmistakable standalone coastal lighthouse icon (Crew Quarters).
 * Spaced generously so strokes remain crisp under the 3D gold brass sidebar emboss filter.
 */
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
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      {...props}
    >
      {/* ── Beacon Light Beams (left & right) ── */}
      <line x1="2.2" y1="4.8" x2="5.4" y2="6" />
      <line x1="2.2" y1="8.8" x2="5.4" y2="7.6" />
      <line x1="21.8" y1="4.8" x2="18.6" y2="6" />
      <line x1="21.8" y1="8.8" x2="18.6" y2="7.6" />

      {/* ── Pointed Cupola Dome Roof ── */}
      <path d="M8.8 5.2L12 2.2L15.2 5.2Z" />

      {/* ── Glass Lantern Room ── */}
      <path d="M9.2 5.2V9.2M14.8 5.2V9.2" />

      {/* ── Signature Gallery Balcony Deck Overhang ── */}
      <line x1="6.8" y1="9.2" x2="17.2" y2="9.2" />

      {/* ── Classic Tapered Lighthouse Tower ── */}
      <path d="M8.6 9.2L6.6 21.2M15.4 9.2L17.4 21.2" />

      {/* ── Bold Lighthouse Horizontal Bands ── */}
      <line x1="7.9" y1="13.4" x2="16.1" y2="13.4" />
      <line x1="7.2" y1="17.4" x2="16.8" y2="17.4" />

      {/* ── Solid Grounded Base ── */}
      <line x1="4" y1="21.2" x2="20" y2="21.2" />
    </svg>
  );
}

export default LighthouseCottageIcon;
