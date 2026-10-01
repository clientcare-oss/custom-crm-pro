import React from "react";
import { cn } from "@/lib/utils";

interface CabinetSidePillarProps {
  side: "left" | "right";
  className?: string;
}

/**
 * Photorealistic 3D Cabinet Side Pillar / Stile Border
 * 
 * - Runs up behind the "Active Students" drawer piece with a flat cut top.
 * - The Active Students bar with the view cards options remains firmly on top.
 * - Extends down the entire height of the cabinet / page seamlessly.
 * - Anchors an authentic antique brass bolt/rivet cap firmly at the bottom base.
 * - Calibrated dark midnight tone matching the credenza chassis.
 */
export function CabinetSidePillar({ side, className }: CabinetSidePillarProps) {
  const isLeft = side === "left";

  return (
    <div
      className={cn(
        "w-[18px] sm:w-[28px] lg:w-[34px] shrink-0 relative flex flex-col z-10 pointer-events-none select-none",
        "-mt-[48px] h-[calc(100%+48px)]",
        "brightness-[0.92] contrast-[1.06]",
        isLeft
          ? "border-r border-[#8A6731]/30 shadow-[4px_0_12px_rgba(0,0,0,0.85)]"
          : "border-l border-[#8A6731]/30 shadow-[-4px_0_12px_rgba(0,0,0,0.85)]",
        className
      )}
    >
      {/* ─── Seamless Vertical Dark Navy Wooden Shaft (Runs behind top bar, tiles continuously) ─── */}
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
