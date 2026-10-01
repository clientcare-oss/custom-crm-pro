import React from "react";
import { cn } from "@/lib/utils";

interface CabinetSidePillarProps {
  side: "left" | "right";
  className?: string;
}

/**
 * 3D Solid Cast Brass Peg / Bolt Hardware
 * Features antique bronze mounting collar, convex brass head with specular glint, and drop shadow
 */
export function BrassPegBolt({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <div className={cn("relative shrink-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.98)]", className)}>
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Outer dark steel / bronze mounting collar */}
        <circle cx="12" cy="12" r="11" fill="url(#bp-collar)" stroke="#1A1105" strokeWidth="1.2" />
        {/* Raised beveled brass bezel */}
        <circle cx="12" cy="12" r="8.5" fill="url(#bp-brass)" stroke="#4A310A" strokeWidth="0.8" />
        {/* Inner convex dome highlight */}
        <circle cx="10" cy="10" r="4.5" fill="url(#bp-highlight)" opacity="0.9" />
        {/* Slotted pin / hex center peg */}
        <circle cx="12" cy="12" r="2.2" fill="#1C1004" />
        <line x1="8" y1="12" x2="16" y2="12" stroke="#4A310A" strokeWidth="1.2" strokeLinecap="round" />
        <defs>
          <linearGradient id="bp-collar" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
            <stop stopColor="#4A3B2C" />
            <stop offset="0.5" stopColor="#24190E" />
            <stop offset="1" stopColor="#0E0803" />
          </linearGradient>
          <linearGradient id="bp-brass" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFF4D4" />
            <stop offset="0.25" stopColor="#F9D788" />
            <stop offset="0.6" stopColor="#D4A045" />
            <stop offset="0.85" stopColor="#8C5E1B" />
            <stop offset="1" stopColor="#4A3008" />
          </linearGradient>
          <linearGradient id="bp-highlight" x1="7" y1="7" x2="15" y2="15" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="0.6" stopColor="#FDE3A7" stopOpacity="0.5" />
            <stop offset="1" stopColor="#D4A045" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

/**
 * Photorealistic 3D Cabinet Side Pillar / Stile Border
 * 
 * - Rich, warm walnut wood grain texture clearly visible against dark backdrop.
 * - Flat-cut top runs up behind the "Active Students" drawer piece.
 * - Solid antique brass collar bracket with a prominent 3D metal bolt on peg at the bottom base.
 * - Identical, balanced construction for left and right barriers.
 */
export function CabinetSidePillar({ side, className }: CabinetSidePillarProps) {
  const isLeft = side === "left";

  return (
    <div
      className={cn(
        "w-[22px] sm:w-[30px] lg:w-[36px] shrink-0 relative flex flex-col z-10 pointer-events-none select-none self-stretch",
        isLeft
          ? "border-r-2 border-[#8A6731]/50 shadow-[5px_0_16px_rgba(0,0,0,0.92)]"
          : "border-l-2 border-[#8A6731]/50 shadow-[-5px_0_16px_rgba(0,0,0,0.92)]",
        className
      )}
    >
      {/* ─── Seamless Vertical Rich Walnut Wood Grain Shaft (Runs behind top bar, tiles continuously) ─── */}
      <div
        className={cn("flex-1 w-full", !isLeft && "scale-x-[-1]")}
        style={{
          backgroundImage: "url('/decor/cabinet-pillar-shaft.png')",
          backgroundRepeat: "repeat-y",
          backgroundSize: "100% auto",
          backgroundPosition: "top center",
        }}
      />

      {/* ─── Bottom Metal Collar Bracket & 3D Brass Bolt on Peg ─── */}
      <div
        className={cn(
          "w-full shrink-0 flex flex-col items-center justify-end pb-2 pt-2 relative z-20",
          "border-t-2 border-[#B88943]/80 bg-gradient-to-b from-[#2B1B0A] via-[#140D05] to-[#0A0502]",
          "shadow-[0_-3px_10px_rgba(0,0,0,0.85)]"
        )}
      >
        <BrassPegBolt className="w-4 h-4 sm:w-5 sm:h-5 lg:w-5.5 lg:h-5.5" />
      </div>
    </div>
  );
}
