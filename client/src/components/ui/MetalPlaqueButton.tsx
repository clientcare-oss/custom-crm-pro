import React from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MetalPlaqueButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  children: React.ReactNode;
  variant?: "brass" | "bronze";
}

export function MetalCornerBolt({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "absolute w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full pointer-events-none select-none",
        "bg-gradient-to-br from-[#FFF9DC] via-[#C99C35] to-[#4A3205]",
        "border border-[#3D2704]",
        "shadow-[0_1px_1px_rgba(0,0,0,0.8),inset_0_0.5px_0.5px_rgba(255,255,255,0.9)]",
        "flex items-center justify-center",
        className
      )}
    >
      {/* Miniature screwdriver slot in dark antique iron */}
      <div className="w-[3px] h-[0.75px] bg-[#2E1D03] rounded-full transform rotate-45 shadow-[inset_0_0.5px_0.5px_rgba(0,0,0,0.8)]" />
    </div>
  );
}

export const MetalPlaqueButton = React.forwardRef<
  HTMLButtonElement,
  MetalPlaqueButtonProps
>(({ className, icon, children, ...props }, ref) => {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "relative select-none",
        "h-full px-4 sm:px-5 py-1.5 rounded-[7px]",
        // Old-world brushed brass / antique gold metallic gradient
        "bg-gradient-to-b from-[#FFF2B2] via-[#E2BE58] via-[#C59B2E] to-[#8C6212]",
        // Deep antique bronze rim & gold specular ring
        "border border-[#5E420C] ring-1 ring-[#FFEAA3]/60",
        // Heavy 3D stamped metal bevel & dropshadow
        "shadow-[0_4px_12px_rgba(0,0,0,0.85),0_1px_2px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.9),inset_0_-2px_2px_rgba(70,45,10,0.7),inset_1px_0_1px_rgba(255,255,255,0.5),inset_-1px_0_1px_rgba(70,45,10,0.6)]",
        // Hover golden sheen & bloom
        "hover:brightness-110 hover:shadow-[0_0_16px_rgba(229,193,117,0.65),0_4px_14px_rgba(0,0,0,0.9),inset_0_1px_1.5px_rgba(255,255,255,1)]",
        // Tactile physical click depression
        "active:scale-[0.98] active:translate-y-[1px] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]",
        "flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer transition-all group",
        className
      )}
      {...props}
    >
      {/* 4 Corner Bolts */}
      <MetalCornerBolt className="top-1 left-1 sm:top-1.5 sm:left-1.5" />
      <MetalCornerBolt className="top-1 right-1 sm:top-1.5 sm:right-1.5" />
      <MetalCornerBolt className="bottom-1 left-1 sm:bottom-1.5 sm:left-1.5" />
      <MetalCornerBolt className="bottom-1 right-1 sm:bottom-1.5 sm:right-1.5" />

      {/* Milled inner framing line */}
      <div className="absolute inset-[3px] rounded-[4px] border border-[#7D5A12]/30 pointer-events-none" />

      {/* Engraved debossed typography & icon */}
      <div className="relative z-10 flex items-center gap-1.5 px-1 sm:px-1.5">
        {icon !== undefined ? (
          icon
        ) : (
          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[3] text-[#241703] drop-shadow-[0_1px_0_rgba(255,248,220,0.65)] group-hover:scale-110 transition-transform" />
        )}
        <span className="font-serif font-black text-xs sm:text-sm tracking-wider uppercase text-[#241703] drop-shadow-[0_1px_0_rgba(255,248,220,0.65)]">
          {children}
        </span>
      </div>
    </button>
  );
});

MetalPlaqueButton.displayName = "MetalPlaqueButton";

export default MetalPlaqueButton;
