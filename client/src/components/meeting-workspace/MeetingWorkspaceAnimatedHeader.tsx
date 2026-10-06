import React from "react";
import { Sparkles, BookOpen } from "lucide-react";

/**
 * MeetingWorkspaceAnimatedHeader — PG-043
 * Panoramic Steampunk Study & Library Shelf Canopy:
 * - Rich antique mahogany shelves lined with leatherbound advocacy books & brass instruments
 * - Banker's stained-glass desk lamp with warm ambient glow & ray casting
 * - Brass lantern with gentle warm hearth flame flicker
 * - Trailing lush green ivy vines with true alpha transparency draped gracefully over the workspace deck below
 */

export function MeetingWorkspaceAnimatedHeader() {
  return (
    <div className="w-full relative select-none overflow-visible">
      {/* ── CSS Animations for Lighting & Ambience ── */}
      <style>{`
        /* Warm ambient hearth flicker on the round brass lantern */
        @keyframes lanternHearthFlicker {
          0%, 100% {
            opacity: 0.85;
            filter: drop-shadow(0 0 10px rgba(245, 158, 11, 0.75)) drop-shadow(0 0 20px rgba(217, 119, 6, 0.45));
          }
          30% {
            opacity: 0.7;
            filter: drop-shadow(0 0 6px rgba(245, 158, 11, 0.55)) drop-shadow(0 0 14px rgba(217, 119, 6, 0.35));
          }
          65% {
            opacity: 0.95;
            filter: drop-shadow(0 0 14px rgba(251, 191, 36, 0.85)) drop-shadow(0 0 28px rgba(245, 158, 11, 0.55));
          }
          85% {
            opacity: 0.78;
            filter: drop-shadow(0 0 8px rgba(245, 158, 11, 0.65));
          }
        }

        /* Warm glow and desk pool illumination from the banker's lamp */
        @keyframes bankerLampGlow {
          0%, 100% {
            opacity: 0.8;
            filter: drop-shadow(0 0 12px rgba(251, 191, 36, 0.8)) drop-shadow(0 0 28px rgba(245, 158, 11, 0.5));
          }
          50% {
            opacity: 0.95;
            filter: drop-shadow(0 0 18px rgba(253, 224, 71, 0.9)) drop-shadow(0 0 36px rgba(245, 158, 11, 0.65));
          }
        }

        /* Subtle brass glint on the nautical clock and instruments */
        @keyframes brassGlint {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.75;
            filter: drop-shadow(0 0 4px rgba(255, 227, 148, 0.7));
          }
        }
      `}</style>

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

        {/* ── AMBIENT LIGHTING OVERLAYS (Positioned relative to 1024 x 384) ── */}
        <div className="absolute inset-0 pointer-events-none z-20">
          
          {/* 1. Central Brass Lantern Hearth Light (x: ~37.2%, y: ~12%) */}
          <div
            className="absolute rounded-full mix-blend-screen pointer-events-none"
            style={{
              left: "35.5%",
              top: "6.5%",
              width: "4.5%",
              height: "12%",
              background: "radial-gradient(circle, rgba(254, 240, 138, 0.95) 0%, rgba(245, 158, 11, 0.75) 45%, rgba(180, 83, 9, 0) 75%)",
              animation: "lanternHearthFlicker 4.2s ease-in-out infinite",
            }}
          />

          {/* 2. Banker's Desk Lamp Warm Light Cone (x: ~89%, y: ~28%) */}
          <div
            className="absolute rounded-full mix-blend-screen pointer-events-none"
            style={{
              left: "86.5%",
              top: "20%",
              width: "6.5%",
              height: "18%",
              background: "radial-gradient(ellipse at 50% 40%, rgba(254, 240, 138, 0.9) 0%, rgba(245, 158, 11, 0.65) 50%, rgba(146, 64, 14, 0) 80%)",
              animation: "bankerLampGlow 5.5s ease-in-out infinite",
            }}
          />

          {/* Warm pool of light cast onto the bottom right counter */}
          <div
            className="absolute rounded-full mix-blend-screen pointer-events-none opacity-40"
            style={{
              left: "84%",
              top: "34%",
              width: "11%",
              height: "16%",
              background: "radial-gradient(ellipse at 50% 50%, rgba(251, 191, 36, 0.55) 0%, rgba(217, 119, 6, 0.25) 50%, rgba(0, 0, 0, 0) 80%)",
            }}
          />

          {/* 3. Antique Brass Clock Dial Subtle Glint (x: ~14.5%, y: ~41%) */}
          <div
            className="absolute rounded-full mix-blend-screen pointer-events-none"
            style={{
              left: "13.2%",
              top: "37%",
              width: "3.2%",
              height: "8.5%",
              background: "radial-gradient(circle, rgba(255, 244, 212, 0.6) 0%, rgba(197, 160, 89, 0.2) 60%, rgba(0, 0, 0, 0) 90%)",
              animation: "brassGlint 6s ease-in-out infinite",
            }}
          />

          {/* Center Navy Wall Title Branding Plaque (x: ~36% to 64%, y: ~28% to ~44%) */}
          <div
            className="absolute flex flex-col items-center justify-center text-center pointer-events-none"
            style={{
              left: "28%",
              top: "24%",
              width: "44%",
              height: "22%",
            }}
          >
            <div className="px-4 py-1.5 rounded-xl bg-[#05142B]/85 border border-[#C5A059]/40 shadow-[0_4px_20px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.1)] backdrop-blur-sm">
              <div className="flex items-center justify-center gap-2">
                <span className="text-[#DFBE77] text-sm sm:text-base">⚡</span>
                <span className="font-serif font-black text-xs sm:text-base lg:text-lg text-[#FFF4D4] tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  Meeting Workspace
                </span>
                <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-[#C5A059]/20 text-[#FFE394] border border-[#C5A059]/40 font-mono font-bold">
                  PG-043
                </span>
              </div>
              <p className="text-[9px] sm:text-[11px] text-[#C6B697] tracking-wider hidden sm:block mt-0.5">
                Strategic Assembly · Parent Blueprint · Live Meeting Navigation
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default MeetingWorkspaceAnimatedHeader;
