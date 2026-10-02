import React from "react";

/**
 * FolioCornerBrackets
 * Renders authentic, photorealistic brass corner brackets pinned to the 4 corners
 * of the student workspace leather folio desk pad.
 *
 * Because these brackets use fixed physical dimensions (w-8 to md:w-11) instead of stretching
 * with the background image, they remain 100% distortion-free and never change size when switching tabs.
 */
export function FolioCornerBrackets() {
  return (
    <div className="absolute inset-0 pointer-events-none select-none z-30">
      {/* Top Left Brass Bracket */}
      <img
        src="/decor/folio-corner-tl.png"
        alt=""
        className="absolute top-0 left-0 w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 object-contain drop-shadow-[0_2px_5px_rgba(0,0,0,0.7)]"
      />

      {/* Top Right Brass Bracket */}
      <img
        src="/decor/folio-corner-tr.png"
        alt=""
        className="absolute top-0 right-0 w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 object-contain drop-shadow-[0_2px_5px_rgba(0,0,0,0.7)]"
      />

      {/* Bottom Left Brass Bracket */}
      <img
        src="/decor/folio-corner-bl.png"
        alt=""
        className="absolute bottom-0 left-0 w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 object-contain drop-shadow-[0_2px_5px_rgba(0,0,0,0.7)]"
      />

      {/* Bottom Right Brass Bracket */}
      <img
        src="/decor/folio-corner-br.png"
        alt=""
        className="absolute bottom-0 right-0 w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 object-contain drop-shadow-[0_2px_5px_rgba(0,0,0,0.7)]"
      />
    </div>
  );
}
