import React from "react";

/**
 * Vintage Admiralty Stereo Speaker Grille Bay
 * Sits in the lower bay of the left Instrument Credenza column below the scrollable drawers.
 */
export function VintageSpeakerGrilleBay() {
  return (
    <div className="flex-1 min-h-[158px] p-2 sm:p-2.5 pt-1 flex flex-col">
      {/* Outer Brushed Metal & Brass Recessed Speaker Enclosure */}
      <div className="relative flex-1 w-full rounded-[8px] p-[6px] bg-gradient-to-b from-[#2A2216] via-[#131929] to-[#0A0F1C] border border-[#6E5429]/80 shadow-[0_8px_22px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,232,175,0.22)] flex flex-col">
        {/* Inner Beveled Cast-Brass Trim Frame */}
        <div className="relative flex-1 w-full rounded-[6px] border-2 border-[#8F6E38]/75 bg-[#070B14] overflow-hidden shadow-[inset_0_10px_28px_rgba(0,0,0,0.98)] flex items-center justify-around px-4 py-3">
          {/* 1. Acoustic Speaker Driver Cones (Softly visible behind the woven cloth) */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-around px-6 opacity-80">
            {/* Left Woofer Cone */}
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-[radial-gradient(circle,#1E1912_0%,#0B0E18_58%,#04070E_72%,#1F1910_100%)] border-[3px] border-[#3D301C]/70 shadow-[inset_0_0_22px_rgba(0,0,0,0.95),0_0_18px_rgba(0,0,0,0.9)] flex items-center justify-center">
              {/* Ribbed paper cone rings */}
              <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full border border-[#5C4728]/35 flex items-center justify-center">
                <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full border border-[#785D34]/35 flex items-center justify-center">
                  {/* Spun Brass Center Dust Cap */}
                  <div className="w-7 h-7 rounded-full bg-[radial-gradient(circle_at_35%_35%,#FFE7A8_0%,#B88D40_55%,#4B3512_100%)] border border-[#FCE4A6]/50 shadow-[0_2px_10px_rgba(0,0,0,0.9)]" />
                </div>
              </div>
            </div>

            {/* Right Woofer Cone */}
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-[radial-gradient(circle,#1E1912_0%,#0B0E18_58%,#04070E_72%,#1F1910_100%)] border-[3px] border-[#3D301C]/70 shadow-[inset_0_0_22px_rgba(0,0,0,0.95),0_0_18px_rgba(0,0,0,0.9)] flex items-center justify-center">
              {/* Ribbed paper cone rings */}
              <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full border border-[#5C4728]/35 flex items-center justify-center">
                <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full border border-[#785D34]/35 flex items-center justify-center">
                  {/* Spun Brass Center Dust Cap */}
                  <div className="w-7 h-7 rounded-full bg-[radial-gradient(circle_at_35%_35%,#FFE7A8_0%,#B88D40_55%,#4B3512_100%)] border border-[#FCE4A6]/50 shadow-[0_2px_10px_rgba(0,0,0,0.9)]" />
                </div>
              </div>
            </div>
          </div>

          {/* 2. Authentic Vintage Woven Gold-Thread Herringbone Grille Cloth Mesh */}
          <div
            className="pointer-events-none absolute inset-0 opacity-90"
            style={{
              backgroundImage: `
                radial-gradient(circle, rgba(4, 7, 15, 0.88) 1.25px, transparent 1.75px),
                repeating-linear-gradient(45deg, rgba(197, 160, 89, 0.16) 0px, rgba(197, 160, 89, 0.16) 1px, transparent 1px, transparent 4px),
                repeating-linear-gradient(-45deg, rgba(197, 160, 89, 0.14) 0px, rgba(197, 160, 89, 0.14) 1px, transparent 1px, transparent 4px)
              `,
              backgroundSize: "5px 5px, 6px 6px, 6px 6px",
            }}
          />

          {/* 3. Deep Vignette Shadow Inside the Grille Cavity */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              boxShadow:
                "inset 0 10px 22px rgba(0,0,0,0.92), inset 0 -10px 22px rgba(0,0,0,0.92), inset 12px 0 22px rgba(0,0,0,0.85), inset -12px 0 22px rgba(0,0,0,0.85)",
            }}
          />

          {/* 4. Horizontal Cast-Brass Acoustic Louver Bars */}
          <div className="pointer-events-none absolute inset-x-0 inset-y-3 flex flex-col justify-between py-2">
            <div className="w-full h-[3px] bg-gradient-to-r from-[#4A3718] via-[#D8B56C] to-[#4A3718] shadow-[0_2px_5px_rgba(0,0,0,0.95)] opacity-85" />
            <div className="w-full h-[4px] bg-gradient-to-r from-[#5A431E] via-[#F2D28B] to-[#5A431E] shadow-[0_3px_6px_rgba(0,0,0,0.95)] opacity-95" />
            <div className="w-full h-[3px] bg-gradient-to-r from-[#4A3718] via-[#D8B56C] to-[#4A3718] shadow-[0_2px_5px_rgba(0,0,0,0.95)] opacity-85" />
          </div>

          {/* 5. Center Enameled Cast-Brass Nameplate & Amber Vacuum Tube Pilot Jewel */}
          <div className="relative z-10 px-3.5 py-1.5 rounded-[4px] bg-gradient-to-b from-[#161F36] to-[#090E1A] border border-[#D4AF61]/80 shadow-[0_6px_16px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.2)] flex items-center gap-2.5">
            {/* Warm Amber Tube Pilot Lamp Jewel */}
            <span className="w-2 h-2 rounded-full bg-[#FFB84D] shadow-[0_0_8px_2px_rgba(255,184,77,0.85)]" />
            <span
              className="text-[9.5px] uppercase tracking-[0.26em] text-[#FCE5B2] font-bold"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Waypoint Acoustics
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#B69148]" />
          </div>

          {/* 6. Four Corner Brass Slotted Mounting Screws */}
          {[
            "top-1.5 left-1.5",
            "top-1.5 right-1.5",
            "bottom-1.5 left-1.5",
            "bottom-1.5 right-1.5",
          ].map((pos, idx) => (
            <div
              key={idx}
              className={`pointer-events-none absolute ${pos} w-2.5 h-2.5 rounded-full bg-gradient-to-b from-[#F5D996] to-[#755522] border border-[#3B2A0E] shadow-[0_1px_3px_rgba(0,0,0,0.9)] flex items-center justify-center`}
            >
              <div className="w-2 h-[1px] bg-[#2D1F09] rotate-45" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

