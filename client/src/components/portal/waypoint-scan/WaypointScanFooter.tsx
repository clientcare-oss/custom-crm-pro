/**
 * Waypoint Scan Footer with Brand Taglines matching the visual spec
 */

import React from "react";

export function WaypointScanFooter() {
  return (
    <div className="shrink-0 pt-3 pb-1 border-t border-blue-900/40 flex flex-col sm:flex-row items-center justify-between gap-2 text-center text-xs select-none">
      {/* Left tagline */}
      <span className="text-[9px] tracking-widest text-blue-300/40 uppercase font-semibold">
        EVERY FAMILY HAS A NEXT STEP.
      </span>

      {/* Center tagline */}
      <span className="text-xs text-blue-200/80 font-medium font-serif italic">
        Simple enough for parents and older clients.
      </span>

      {/* Right tagline */}
      <span className="text-[9px] tracking-widest text-blue-300/40 uppercase font-semibold">
        SAME DIRECTION. BRIGHTER DAYS.
      </span>
    </div>
  );
}

export default WaypointScanFooter;
