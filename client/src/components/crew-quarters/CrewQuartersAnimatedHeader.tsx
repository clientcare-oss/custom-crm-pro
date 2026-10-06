import React from "react";

/**
 * CrewQuartersAnimatedHeader — PG-038
 * Panoramic Steampunk Observation Window Canopy with:
 * 1. Gentle, subtle star twinkles
 * 2. Small shooting star with NO TAIL gliding across the cosmos
 * 3. Lava lamp animation perfectly aligned directly over the glass chamber
 * 4. Globe kept completely static (no animation)
 */

interface StarDef {
  id: number;
  x: number; // percentage relative to window pane
  y: number; // percentage relative to window pane
  size: number; // px
  color: string;
  delay: number; // seconds
  duration: number; // seconds
}

// Subtle, peaceful handful of stars
const LEFT_WINDOW_STARS: StarDef[] = [
  { id: 1, x: 48, y: 32, size: 1.8, color: "#FFFFFF", delay: 0.5, duration: 6.2 },
];

const CENTER_WINDOW_STARS: StarDef[] = [
  { id: 101, x: 22, y: 26, size: 2.0, color: "#FFFFFF", delay: 0.2, duration: 5.8 },
  { id: 102, x: 52, y: 19, size: 2.2, color: "#BAE6FD", delay: 1.8, duration: 6.5 },
  { id: 103, x: 74, y: 34, size: 1.6, color: "#FEF08A", delay: 2.9, duration: 5.4 },
  { id: 104, x: 86, y: 22, size: 1.8, color: "#FFFFFF", delay: 0.9, duration: 7.1 },
];

const RIGHT_WINDOW_STARS: StarDef[] = [
  { id: 201, x: 55, y: 28, size: 1.9, color: "#FFFFFF", delay: 1.2, duration: 6.0 },
];

export function CrewQuartersAnimatedHeader() {
  return (
    <div className="w-full relative select-none overflow-hidden bg-[#020712] border-b border-[#3A2C18] shadow-[0_12px_32px_rgba(0,0,0,0.85)]">
      {/* ── CSS Keyframe Animations ── */}
      <style>{`
        /* Gentle, calm star shimmer */
        @keyframes gentleStarShimmer {
          0%, 100% {
            opacity: 0.2;
            transform: scale(0.85);
          }
          50% {
            opacity: 0.85;
            transform: scale(1.15);
            filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.8));
          }
        }

        /* Tiny shooting star speck (NO TAIL) gliding in ONE CONTINUOUS FLUID MOTION across the cosmos */
        @keyframes shootingStarSpeckAcross {
          0% {
            opacity: 0;
            transform: translate3d(-20px, 0, 0);
          }
          1.5% {
            opacity: 1;
          }
          16.5% {
            opacity: 0.9;
          }
          18% {
            opacity: 0;
            transform: translate3d(340px, 14px, 0);
          }
          100% {
            opacity: 0;
            transform: translate3d(340px, 14px, 0);
          }
        }

        /* Lava lamp rising & descending molten wax blobs inside glass tube */
        @keyframes lavaBlobMain {
          0%, 100% {
            transform: translate3d(0, 0, 0) scale(1, 1);
          }
          40% {
            transform: translate3d(-1px, -24px, 0) scale(0.85, 1.2);
          }
          60% {
            transform: translate3d(1px, -36px, 0) scale(1.1, 0.9);
          }
          85% {
            transform: translate3d(0, -12px, 0) scale(0.95, 1.05);
          }
        }

        @keyframes lavaBlobSecondary {
          0%, 100% {
            transform: translate3d(0, 0, 0) scale(1, 1);
          }
          35% {
            transform: translate3d(1px, -16px, 0) scale(0.9, 1.15);
          }
          65% {
            transform: translate3d(-1px, -32px, 0) scale(1.1, 0.9);
          }
          85% {
            transform: translate3d(0, -8px, 0) scale(1, 1);
          }
        }

        @keyframes lavaGlowPulse {
          0%, 100% {
            opacity: 0.6;
            filter: drop-shadow(0 0 5px rgba(59, 130, 246, 0.4));
          }
          50% {
            opacity: 0.9;
            filter: drop-shadow(0 0 10px rgba(96, 165, 250, 0.7));
          }
        }
      `}</style>

      {/* ── Base Panoramic Observation Window Image (Includes static celestial globe on right) ── */}
      <img
        src="/images/crew-quarters-window-trimmed.png"
        alt="Crew Quarters Panoramic Observation Window"
        className="w-full h-auto block select-none pointer-events-none"
      />

      {/* ── INTERACTIVE & ANIMATED OVERLAY DECK (Relative to 1020 x 158 Aspect) ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        
        {/* ======================================================== */}
        {/* 1. TWINKLING STARS IN SKY (WINDOW 1: LEFT CIRCULAR PORTHOLE) */}
        {/* ======================================================== */}
        <div
          className="absolute overflow-hidden"
          style={{
            left: "16.47%",
            top: "12.03%",
            width: "13.73%",
            height: "72.78%",
            borderRadius: "45% 45% 40% 40%",
          }}
        >
          {LEFT_WINDOW_STARS.map((star) => (
            <div
              key={star.id}
              className="absolute pointer-events-none rounded-full"
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
                backgroundColor: star.color,
                animation: `gentleStarShimmer ${star.duration}s ease-in-out infinite`,
                animationDelay: `${star.delay}s`,
              }}
            />
          ))}
        </div>

        {/* ======================================================== */}
        {/* 2. TWINKLING STARS & SMALL SHOOTING STAR (NO TAIL) (WINDOW 2: CENTER WIDE) */}
        {/* ======================================================== */}
        <div
          className="absolute overflow-hidden"
          style={{
            left: "33.92%",
            top: "12.03%",
            width: "31.18%",
            height: "75.95%",
            borderRadius: "28px 28px 18px 18px",
          }}
        >
          {/* Subtle Twinkling Stars */}
          {CENTER_WINDOW_STARS.map((star) => (
            <div
              key={star.id}
              className="absolute pointer-events-none rounded-full"
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
                backgroundColor: star.color,
                animation: `gentleStarShimmer ${star.duration}s ease-in-out infinite`,
                animationDelay: `${star.delay}s`,
              }}
            />
          ))}

          {/* Tiny Shooting Star Speck (NO TAIL): Gliding smoothly across the cosmos in one fluid motion */}
          <div
            className="absolute pointer-events-none z-10"
            style={{
              top: "22%",
              left: "4%",
              animation: "shootingStarSpeckAcross 7.5s linear infinite",
              animationDelay: "1.5s",
            }}
          >
            {/* Tiny celestial speck of light */}
            <div
              className="w-[1.5px] h-[1.5px] rounded-full bg-white shadow-[0_0_2px_#FFFFFF,0_0_4px_rgba(255,255,255,0.85)]"
            />
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. TWINKLING STARS IN SKY (WINDOW 3: RIGHT SQUARE PORTHOLE) */}
        {/* ======================================================== */}
        <div
          className="absolute overflow-hidden"
          style={{
            left: "69.02%",
            top: "12.03%",
            width: "14.22%",
            height: "75.95%",
            borderRadius: "38% 38% 34% 34%",
          }}
        >
          {RIGHT_WINDOW_STARS.map((star) => (
            <div
              key={star.id}
              className="absolute pointer-events-none rounded-full"
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
                backgroundColor: star.color,
                animation: `gentleStarShimmer ${star.duration}s ease-in-out infinite`,
                animationDelay: `${star.delay}s`,
              }}
            />
          ))}
        </div>

        {/* ======================================================== */}
        {/* 4. ANIMATED LAVA LAMP (ALIGNED DIRECTLY OVER THE LAMP GLASS) */}
        {/* Center: x = 50px (4.90%), y = 88px (55.70%) */}
        {/* Exact glass tube bounds: left: 3.14%, top: 36.50%, width: 3.73%, height: 38.00% */}
        {/* ======================================================== */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: "3.14%",
            top: "36.50%",
            width: "3.73%",
            height: "38.00%",
          }}
        >
          {/* Glass Tapered Chamber: Exact geometric cone of the lamp */}
          <div
            className="w-full h-full relative overflow-hidden"
            style={{
              clipPath: "polygon(8% 0%, 92% 0%, 98% 98%, 2% 98%)",
            }}
          >
            {/* Ambient Liquid Core Glow */}
            <div
              className="absolute inset-0 opacity-45 mix-blend-screen"
              style={{
                background: "radial-gradient(ellipse at 50% 80%, rgba(96, 165, 250, 0.7) 0%, rgba(139, 92, 246, 0.4) 50%, rgba(30, 58, 138, 0.15) 85%)",
                animation: "lavaGlowPulse 4s ease-in-out infinite",
              }}
            />

            {/* Molten Wax Blob 1 (Main Rising Bubble) */}
            <div
              className="absolute rounded-full"
              style={{
                bottom: "14%",
                left: "22%",
                width: "56%",
                height: "28%",
                background: "radial-gradient(circle at 40% 35%, #93C5FD 0%, #3B82F6 45%, #1D4ED8 85%, #6B21A8 100%)",
                boxShadow: "0 0 6px rgba(96, 165, 250, 0.8), inset 0 0 4px rgba(255, 255, 255, 0.6)",
                filter: "blur(0.6px)",
                opacity: 0.85,
                mixBlendMode: "screen",
                animation: "lavaBlobMain 6.8s ease-in-out infinite",
              }}
            />

            {/* Molten Wax Blob 2 (Mid-size Fluid Droplet) */}
            <div
              className="absolute rounded-full"
              style={{
                bottom: "32%",
                left: "30%",
                width: "40%",
                height: "22%",
                background: "radial-gradient(circle at 35% 30%, #C084FC 0%, #8B5CF6 50%, #2563EB 85%)",
                boxShadow: "0 0 5px rgba(168, 85, 247, 0.8)",
                filter: "blur(0.5px)",
                opacity: 0.8,
                mixBlendMode: "screen",
                animation: "lavaBlobSecondary 5.2s ease-in-out infinite",
                animationDelay: "1s",
              }}
            />

            {/* Molten Wax Base Pool (Heated reservoir at bottom) */}
            <div
              className="absolute rounded-t-full"
              style={{
                bottom: "2%",
                left: "10%",
                width: "80%",
                height: "16%",
                background: "radial-gradient(ellipse at 50% 50%, #60A5FA 0%, #2563EB 50%, #7C3AED 100%)",
                boxShadow: "0 0 8px rgba(59, 130, 246, 0.9)",
                opacity: 0.85,
                mixBlendMode: "screen",
                animation: "lavaGlowPulse 3s ease-in-out infinite",
              }}
            />
          </div>
        </div>

      </div>
    </div>
  );
}

export default CrewQuartersAnimatedHeader;
