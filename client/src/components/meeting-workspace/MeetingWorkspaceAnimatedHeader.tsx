import React from "react";

/**
 * MeetingWorkspaceAnimatedHeader — PG-043
 * Panoramic Steampunk Study & Library Shelf Canopy:
 * - Rich antique mahogany shelves lined with leatherbound advocacy books & brass instruments
 * - Authentic painted illumination from the stained-glass banker's lamp and lantern (NO artificial circular overlays)
 * - Trailing lush green ivy vines with true alpha transparency draped gracefully over the workspace deck below
 */

export function MeetingWorkspaceAnimatedHeader() {
  return (
    <div className="w-full relative select-none overflow-visible">
      {/* ── Panoramic Canopy Container (1024 x 384 native aspect ratio) ── */}
      <div className="relative w-full max-w-[1700px] mx-auto overflow-hidden rounded-b-3xl border-b border-[#3A2C18] bg-[#030914] shadow-[0_16px_45px_rgba(0,0,0,0.95)]">
        
        {/* Deep ambient maritime backdrop behind the shelf */}
        <div className="absolute inset-0 bg-[#07162B] [background:radial-gradient(ellipse_at_50%_0%,_#102B4E_0%,_#07162B_55%,_#030D1A_100%)] pointer-events-none" />

        {/* ── Base High-Res Transparent Study Shelf Image ── */}
        <img
          src="/images/meeting-workspace-shelf.png"
          alt="Advocacy Strategy Library & Study Shelf Canopy"
          className="w-full h-auto block select-none pointer-events-none relative z-10"
        />

        {/* ── Center Navy Wall Title Branding Plaque ── */}
        <div className="absolute inset-0 pointer-events-none z-20">
          <div
            className="absolute flex flex-col items-center justify-center text-center pointer-events-none"
            style={{
              left: "26%",
              top: "16%",
              width: "48%",
              height: "17%",
            }}
          >
            <div className="px-3.5 py-1 rounded-xl bg-[#05142B]/85 border border-[#C5A059]/40 shadow-[0_4px_16px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.1)] backdrop-blur-sm">
              <div className="flex items-center justify-center gap-2">
                <span className="text-[#DFBE77] text-xs sm:text-base">⚡</span>
                <span className="font-serif font-black text-xs sm:text-sm lg:text-base text-[#FFF4D4] tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  Meeting Workspace
                </span>
                <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-[#C5A059]/20 text-[#FFE394] border border-[#C5A059]/40 font-mono font-bold">
                  PG-043
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default MeetingWorkspaceAnimatedHeader;
