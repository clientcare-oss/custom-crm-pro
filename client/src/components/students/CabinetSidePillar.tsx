import React from "react";
import { cn } from "@/lib/utils";

interface CabinetSidePillarProps {
  side: "left" | "right";
  className?: string;
}

/**
 * Photorealistic 3D Cabinet Side Pillar / Stile Border
 * 
 * - Flat cut at the top so it bumps flush directly under the "Active Students" drawer piece.
 * - Extends down the entire height of the cabinet / page seamlessly.
 * - Anchors an authentic antique brass bolt/rivet cap firmly at the bottom base.
 */
export function CabinetSidePillar({ side, className }: CabinetSidePillarProps) {
  const isLeft = side === "left";

  return (
    <div
      className={cn(
        "w-[18px] sm:w-[28px] lg:w-[34px] shrink-0 relative flex flex-col z-20 pointer-events-none select-none",
        isLeft
          ? "border-r border-[#8A6731]/30 shadow-[4px_0_12px_rgba(0,0,0,0.85)]"
          : "border-l border-[#8A6731]/30 shadow-[-4px_0_12px_rgba(0,0,0,0.85)]",
        className
      )}
    >
      {/* ─── Seamless Vertical Dark Navy Wooden Shaft (Flat cut at top, tiles continuously) ─── */}
      <div
        className={cn("flex-1 w-full", !isLeft && "scale-x-[-1]")}
        style={{
          backgroundImage: "url('/decor/cabinet-pillar-shaft.png')",
          backgroundRepeat: "repeat-y",
          backgroundSize: "100% auto",
          backgroundPosition: "top center",
        }}
      />

      {/* ─── Bottom Brass Rivet Cap (Anchored to the very bottom of the page) ─── */}
      <div className={cn("w-full h-[39px] shrink-0", !isLeft && "scale-x-[-1]")}>
        <img
          src="/decor/cabinet-pillar-bottom-cap.png"
          alt=""
          className="w-full h-[39px] object-cover pointer-events-none select-none"
        />
      </div>
    </div>
  );
}
