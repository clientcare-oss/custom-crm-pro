import React from "react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export interface GivingNavButtonProps {
  label: React.ReactNode;
  path: string;
  isActive: boolean;
  icon?: LucideIcon;
  customIcon?: React.ReactNode;
  className?: string;
}

/**
 * Reusable Giving & Impact Physical Control Plate Button.
 * Rebuilt to match the Waypoint reference image exactly in material, depth, proportion, and construction:
 * - Outer Housing: Blue-black rectangular frame with tiny 5-7px radius and aged brass perimeter trim.
 * - Inset Panel: ~3-5px recessed navy leather/enamel plate (#00142D) with authentic tactile micro-texture.
 * - Corner Fasteners: 4 tiny brass mounting studs/rivets at corners.
 * - Icon: Simple cream/off-white (#F4EBD9) centered in upper-middle (no circle/container/glow).
 * - Label: Direct serif typeface ('Playfair Display', Georgia, serif) in warm ivory.
 * - Active State: Same physical construction with subtle warm brass frame illumination and slightly brighter face.
 */
export function GivingNavButton({
  label,
  path,
  isActive,
  icon: Icon,
  customIcon,
  className,
}: GivingNavButtonProps) {
  return (
    <Link href={path} className={cn("block w-full min-w-0 flex-1", className)}>
      <button
        type="button"
        className={cn(
          "w-full h-[68px] sm:h-[72px] rounded-[5px] p-[2px] select-none text-center cursor-pointer transition-all duration-150 relative group",
          // Outer Housing: very dark navy/blue-black rectangular housing
          "bg-[#010A17]",
          // Thin aged brass perimeter trim (restrained, dimensional, slightly worn, NOT bright yellow)
          isActive
            ? "border border-[#C5A059] shadow-[0_2px_8px_rgba(0,0,0,0.85),0_0_8px_rgba(197,160,89,0.25),inset_0_1px_1px_rgba(255,230,150,0.25)]"
            : "border border-[#7D6438]/85 hover:border-[#A6864B] shadow-[0_2px_5px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06),inset_0_-1px_1px_rgba(0,0,0,0.9)]",
          // 1px visual rise on hover
          "hover:-translate-y-[1px]"
        )}
      >
        {/* ─── Inner Recessed Panel (Recessed ~2-3px Behind Outer Frame) ─── */}
        <div
          className={cn(
            "w-full h-full rounded-[3.5px] relative flex flex-col items-center justify-center px-1 py-1 transition-colors overflow-hidden",
            // Deep navy sitting naturally against Waypoint environment (#00142D)
            isActive ? "bg-[#001935]" : "bg-[#00142D] group-hover:bg-[#001732]"
          )}
          style={{
            // Tactile leather / pressed material micro-texture overlay
            backgroundImage: `
              radial-gradient(ellipse at 50% 30%, ${isActive ? "rgba(20, 52, 90, 0.45)" : "rgba(12, 38, 70, 0.45)"} 0%, rgba(0, 12, 28, 0.85) 100%),
              url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E")
            `,
            // Physical Inset Shadows communicating genuine depth
            boxShadow: isActive
              ? "inset 0 2px 5px rgba(0,0,0,0.92), inset 0 0 8px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(197,160,89,0.35), inset 0 1px 1px rgba(255,220,130,0.2)"
              : "inset 0 2px 5px rgba(0,0,0,0.95), inset 0 0 8px rgba(0,0,0,0.75), inset 0 0 0 1px rgba(105,82,44,0.35), inset 0 -1px 1px rgba(255,255,255,0.03)",
          }}
        >
          {/* ─── 4 Tiny Brass Corner Fasteners / Rivets ─── */}
          <span className="absolute top-[2.5px] left-[2.5px] w-[3px] h-[3px] rounded-full bg-gradient-to-br from-[#DFBE77] via-[#94743A] to-[#4F3B15] ring-[0.5px] ring-black/80 shadow-[0_0.5px_1px_rgba(0,0,0,0.9)] pointer-events-none" />
          <span className="absolute top-[2.5px] right-[2.5px] w-[3px] h-[3px] rounded-full bg-gradient-to-br from-[#DFBE77] via-[#94743A] to-[#4F3B15] ring-[0.5px] ring-black/80 shadow-[0_0.5px_1px_rgba(0,0,0,0.9)] pointer-events-none" />
          <span className="absolute bottom-[2.5px] left-[2.5px] w-[3px] h-[3px] rounded-full bg-gradient-to-br from-[#DFBE77] via-[#94743A] to-[#4F3B15] ring-[0.5px] ring-black/80 shadow-[0_0.5px_1px_rgba(0,0,0,0.9)] pointer-events-none" />
          <span className="absolute bottom-[2.5px] right-[2.5px] w-[3px] h-[3px] rounded-full bg-gradient-to-br from-[#DFBE77] via-[#94743A] to-[#4F3B15] ring-[0.5px] ring-black/80 shadow-[0_0.5px_1px_rgba(0,0,0,0.9)] pointer-events-none" />

          {/* ─── Central Content Area ─── */}
          <div className="flex flex-col items-center justify-center gap-1 w-full max-w-[96%] pointer-events-none my-auto">
            {/* Simple Cream / Off-White Icon */}
            <div className="flex items-center justify-center shrink-0 h-5 sm:h-[22px]">
              {customIcon ? (
                customIcon
              ) : Icon ? (
                <Icon
                  className={cn(
                    "w-4 h-4 sm:w-[17px] sm:h-[17px] stroke-[1.8] transition-colors",
                    isActive ? "text-[#FFF8EA]" : "text-[#F4EBD9] group-hover:text-[#FFF8EC]",
                    "drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]"
                  )}
                />
              ) : null}
            </div>

            {/* Label: Warm ivory serif typeface directly underneath */}
            <div className="min-h-[22px] sm:min-h-[24px] flex items-center justify-center text-center">
              <span
                className={cn(
                  "text-[10px] sm:text-[10.5px] leading-[1.14] font-semibold tracking-tight text-center px-0.5",
                  isActive ? "text-[#FFF8EA]" : "text-[#F2E8D5] group-hover:text-[#FFFDF8]",
                  "drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]"
                )}
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {label}
              </span>
            </div>
          </div>
        </div>
      </button>
    </Link>
  );
}
