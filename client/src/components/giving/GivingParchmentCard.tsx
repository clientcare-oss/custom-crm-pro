import React from "react";
import { cn } from "@/lib/utils";

interface GivingParchmentCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  showScrews?: boolean;
}

/**
 * Photorealistic warm vintage parchment card framed in antique brass with 4 slotted corner screws.
 * Faithfully matches the Waypoint executive desk aesthetic in PG-040.
 */
export function GivingParchmentCard({
  children,
  className,
  showScrews = true,
  ...props
}: GivingParchmentCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-[14px] p-4 text-[#1B2838] transition-all select-none",
        // Warm aged parchment gradient
        "bg-gradient-to-b from-[#FAF4E8] via-[#F3E9D5] to-[#EDE0C4]",
        // Antique brass / burnished gold border
        "border border-[#C5A059]/75",
        // Physical layered shadow and fine paper bevel
        "shadow-[0_4px_16px_rgba(0,0,0,0.45),inset_0_1px_1px_rgba(255,255,255,0.75),inset_0_-1px_2px_rgba(95,65,25,0.15)]",
        className
      )}
      {...props}
    >
      {showScrews && (
        <>
          {/* Top-Left Brass Slotted Screw */}
          <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-gradient-to-br from-[#FFE7A3] via-[#D4AF37] to-[#8C6511] ring-1 ring-black/40 shadow-[0_1px_2px_rgba(0,0,0,0.5)] flex items-center justify-center pointer-events-none select-none">
            <div className="w-[1px] h-[4px] bg-[#5C4008]/80 rotate-45" />
          </div>

          {/* Top-Right Brass Slotted Screw */}
          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-gradient-to-br from-[#FFE7A3] via-[#D4AF37] to-[#8C6511] ring-1 ring-black/40 shadow-[0_1px_2px_rgba(0,0,0,0.5)] flex items-center justify-center pointer-events-none select-none">
            <div className="w-[1px] h-[4px] bg-[#5C4008]/80 -rotate-45" />
          </div>

          {/* Bottom-Left Brass Slotted Screw */}
          <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-gradient-to-br from-[#FFE7A3] via-[#D4AF37] to-[#8C6511] ring-1 ring-black/40 shadow-[0_1px_2px_rgba(0,0,0,0.5)] flex items-center justify-center pointer-events-none select-none">
            <div className="w-[1px] h-[4px] bg-[#5C4008]/80 -rotate-30" />
          </div>

          {/* Bottom-Right Brass Slotted Screw */}
          <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-gradient-to-br from-[#FFE7A3] via-[#D4AF37] to-[#8C6511] ring-1 ring-black/40 shadow-[0_1px_2px_rgba(0,0,0,0.5)] flex items-center justify-center pointer-events-none select-none">
            <div className="w-[1px] h-[4px] bg-[#5C4008]/80 rotate-60" />
          </div>
        </>
      )}

      {children}
    </div>
  );
}
