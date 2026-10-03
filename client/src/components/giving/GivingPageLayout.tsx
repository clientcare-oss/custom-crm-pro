import React from "react";
import { cn } from "@/lib/utils";
import { GivingDeskHeader } from "./GivingDeskHeader";

export interface GivingPageLayoutProps {
  children: React.ReactNode;
  className?: string;
  onOpen501c3?: () => void;
  onOpenScholarship?: () => void;
  onRecordDonation?: () => void;
}

/**
 * Universal Giving & Impact Page Layout Shell.
 * Provides the shared Waypoint ambient nautical background, edge-to-edge
 * hanging antique shelf decor with cascading ivy, and the 8-destination
 * physical navigation control plates header mounted cleanly at the top.
 */
export function GivingPageLayout({
  children,
  className,
  onOpen501c3,
  onOpenScholarship,
  onRecordDonation,
}: GivingPageLayoutProps) {
  return (
    <div 
      className="min-h-screen w-full select-none relative overflow-x-hidden bg-[#07162B]"
      style={{
        backgroundColor: "#07162B",
        backgroundImage: "radial-gradient(ellipse at 50% 0%, #102B4E 0%, #07162B 55%, #030D1A 100%)",
      }}
    >
      {/* ─── Hanging Shelf Decor & Cascading Ivy Overlap Asset (In front of buttons at z-[25] with pointer-events-none) ─── */}
      <div className="absolute top-0 left-0 right-0 w-full pointer-events-none select-none z-[25] flex justify-center overflow-visible">
        <img
          src="/decor/giving-shelf-header.png"
          alt="Antique shelf with glowing lantern, astrolabe, and cascading ivy"
          className="w-full h-auto object-cover object-top drop-shadow-[0_12px_28px_rgba(0,0,0,0.85)]"
        />
      </div>

      {/* ─── Main Content Deck with Horizontal Padding & Central Alignment ─── */}
      <div className={cn("w-full px-4 sm:px-6 md:px-8 pb-12 pt-2 sm:pt-4 space-y-5 relative max-w-[1720px] mx-auto", className)}>
        {/* Top Ambient Shelf & Central Navy Plaque with 8 Navigation Buttons */}
        <GivingDeskHeader
          onOpen501c3={onOpen501c3}
          onOpenScholarship={onOpenScholarship}
          onRecordDonation={onRecordDonation}
        />

        {/* Page-Specific Content Deck */}
        <div className="relative z-10 space-y-5">
          {children}
        </div>
      </div>
    </div>
  );
}

export default GivingPageLayout;
