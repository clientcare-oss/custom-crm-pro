import React, { useState } from "react";
import { Compass } from "lucide-react";

/**
 * CrewQuartersAnimatedHeader — PG-038
 * Panoramic Steampunk Observation Window Canopy with:
 * 1. Reduced, subtle star twinkles (peaceful night sky)
 * 2. Properly oriented shooting star traveling across the sky with trailing tail
 * 3. Pixel-perfect aligned animated lava lamp
 * 4. Pixel-perfect centered interactive spinning celestial globe on hover
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

// Subtle, peaceful handful of stars (reduced from previous 34)
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
  const [isGlobeHovered, setIsGlobeHovered] = useState(false);

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

        /* Shooting star moving ACROSS the center window from left to right (head leading, tail trailing) */
        @keyframes shootingStarAcross {
          0% {
            opacity: 0;
            transform: translate3d(-100px, 0, 0) rotate(-6deg);
          }
          4% {
            opacity: 1;
          }
          20% {
            opacity: 0.95;
            transform: translate3d(240px, 20px, 0) rotate(-6deg);
          }
          28% {
            opacity: 0;
            transform: translate3d(360px, 30px, 0) rotate(-6deg);
          }
          100% {
            opacity: 0;
            transform: translate3d(360px, 30px, 0) rotate(-6deg);
          }
        }

        /* Lava lamp rising & descending molten wax blobs */
        @keyframes lavaBlobRiseMain {
          0%, 100% {
            transform: translate3d(0, 0, 0) scale(1, 1);
          }
          38% {
            transform: translate3d(-1px, -32px, 0) scale(0.85, 1.2);
          }
          55% {
            transform: translate3d(1px, -46px, 0) scale(1.1, 0.9);
          }
          80% {
            transform: translate3d(0, -16px, 0) scale(0.95, 1.05);
          }
        }

        @keyframes lavaBlobRiseSecond {
          0%, 100% {
            transform: translate3d(0, 0, 0) scale(1, 1);
          }
          32% {
            transform: translate3d(1px, -20px, 0) scale(0.9, 1.15);
          }
          62% {
            transform: translate3d(-1px, -42px, 0) scale(1.1, 0.9);
          }
          88% {
            transform: translate3d(0, -10px, 0) scale(1, 1);
          }
        }

        @keyframes lavaThermalGlow {
          0%, 100% {
            opacity: 0.7;
            filter: drop-shadow(0 0 6px rgba(59, 130, 246, 0.5));
          }
          50% {
            opacity: 0.95;
            filter: drop-shadow(0 0 12px rgba(96, 165, 250, 0.8));
          }
        }

        /* 3D Celestial sphere horizontal rotation */
        @keyframes celestialSphereSpin {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>

      {/* ── Base Panoramic Observation Window Image ── */}
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
        {/* 2. TWINKLING STARS & SHOOTING STAR (WINDOW 2: CENTER WIDE) */}
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

          {/* Shooting Star: Traveling ACROSS the cosmos from left to right */}
          {/* Head is on the RIGHT leading the movement; tail trails to the LEFT */}
          <div
            className="absolute pointer-events-none z-10"
            style={{
              top: "22%",
              left: "10%",
              animation: "shootingStarAcross 9s ease-out infinite",
              animationDelay: "2s",
            }}
          >
            <div className="relative flex items-center">
              {/* TAIL: Fades out towards the left behind the head */}
              <div
                className="h-[2px] w-24 sm:w-36 rounded-l-full"
                style={{
                  background: "linear-gradient(90deg, transparent 0%, rgba(147, 197, 253, 0.25) 30%, rgba(255, 255, 255, 0.95) 100%)",
                  boxShadow: "0 0 6px rgba(191, 219, 254, 0.6)",
                }}
              />
              {/* HEAD: Leading the motion on the right with glowing celestial core */}
              <div
                className="w-2.5 h-2.5 -ml-1 rounded-full bg-white shadow-[0_0_10px_#FFFFFF,0_0_18px_#60A5FA,0_0_28px_#3B82F6] shrink-0"
              />
            </div>
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
        {/* 4. PIXEL-PERFECT ANIMATED LAVA LAMP (FAR LEFT) */}
        {/* Aligned to x: 23-79 (2.25%-7.74%), y: 34-118 (21.52%-74.68%) */}
        {/* ======================================================== */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: "2.25%",
            top: "21.52%",
            width: "5.49%",
            height: "53.16%",
          }}
        >
          {/* Glass Tapered Chamber: Exact geometric cone of the lamp */}
          <div
            className="w-full h-full relative overflow-hidden"
            style={{
              clipPath: "polygon(21% 1%, 79% 1%, 98% 96%, 2% 96%)",
            }}
          >
            {/* Ambient Liquid Glow */}
            <div
              className="absolute inset-0 opacity-45 mix-blend-screen"
              style={{
                background: "radial-gradient(ellipse at 50% 85%, rgba(96, 165, 250, 0.7) 0%, rgba(139, 92, 246, 0.45) 50%, rgba(30, 58, 138, 0.2) 85%)",
                animation: "lavaThermalGlow 4s ease-in-out infinite",
              }}
            />

            {/* Molten Wax Blob 1 (Main Rising Bubble) */}
            <div
              className="absolute rounded-full"
              style={{
                bottom: "16%",
                left: "24%",
                width: "52%",
                height: "26%",
                background: "radial-gradient(circle at 40% 35%, #93C5FD 0%, #3B82F6 45%, #1D4ED8 85%, #6B21A8 100%)",
                boxShadow: "0 0 8px rgba(96, 165, 250, 0.8), inset 0 0 5px rgba(255, 255, 255, 0.6)",
                filter: "blur(0.8px)",
                opacity: 0.85,
                mixBlendMode: "screen",
                animation: "lavaBlobRiseMain 7s ease-in-out infinite",
              }}
            />

            {/* Molten Wax Blob 2 (Mid-size Fluid Droplet) */}
            <div
              className="absolute rounded-full"
              style={{
                bottom: "34%",
                left: "32%",
                width: "36%",
                height: "20%",
                background: "radial-gradient(circle at 35% 30%, #C084FC 0%, #8B5CF6 50%, #2563EB 85%)",
                boxShadow: "0 0 6px rgba(168, 85, 247, 0.8)",
                filter: "blur(0.6px)",
                opacity: 0.8,
                mixBlendMode: "screen",
                animation: "lavaBlobRiseSecond 5.5s ease-in-out infinite",
                animationDelay: "1.2s",
              }}
            />

            {/* Molten Wax Base Reservoir (Heated pool at bottom) */}
            <div
              className="absolute rounded-t-full"
              style={{
                bottom: "6%",
                left: "14%",
                width: "72%",
                height: "14%",
                background: "radial-gradient(ellipse at 50% 50%, #60A5FA 0%, #2563EB 50%, #7C3AED 100%)",
                boxShadow: "0 0 10px rgba(59, 130, 246, 0.9)",
                opacity: 0.85,
                mixBlendMode: "screen",
                animation: "lavaThermalGlow 3s ease-in-out infinite",
              }}
            />
          </div>
        </div>

        {/* ======================================================== */}
        {/* 5. PIXEL-PERFECT INTERACTIVE CELESTIAL GLOBE ON HOVER (FAR RIGHT) */}
        {/* Center: x = 959 (94.02%), y = 86 (54.43%), Radius: 57px */}
        {/* Box: left: 88.43%, top: 18.35%, width: 11.18%, height: 72.15% */}
        {/* ======================================================== */}
        <div
          className="absolute pointer-events-auto cursor-pointer group"
          onMouseEnter={() => setIsGlobeHovered(true)}
          onMouseLeave={() => setIsGlobeHovered(false)}
          title="Antique Celestial Armillary Globe • Hover to spin the heavens"
          style={{
            left: "88.43%",
            top: "18.35%",
            width: "11.18%",
            height: "72.15%",
            borderRadius: "50%",
          }}
        >
          {/* Exact Circular Spherical Boundary */}
          <div
            className="w-full h-full rounded-full overflow-hidden relative transition-all duration-300"
            style={{
              boxShadow: isGlobeHovered
                ? "0 0 16px rgba(245, 216, 138, 0.6), inset 0 0 12px rgba(245, 216, 138, 0.45)"
                : "none",
            }}
          >
            {/* Seamless Horizontally Rotating Celestial Grid (Repeated 200% width) */}
            <div
              className="absolute top-0 left-0 h-full w-[200%] flex"
              style={{
                animation: isGlobeHovered
                  ? "celestialSphereSpin 4s linear infinite"
                  : "celestialSphereSpin 28s linear infinite",
                opacity: isGlobeHovered ? 0.95 : 0.45,
                transition: "opacity 0.3s ease-out",
                filter: isGlobeHovered
                  ? "drop-shadow(0 0 4px rgba(245, 216, 138, 0.8))"
                  : "none",
              }}
            >
              {/* Pattern Tile 1 */}
              <svg viewBox="0 0 100 100" className="w-1/2 h-full shrink-0">
                {/* Latitudes & Meridians */}
                <ellipse cx="50" cy="50" rx="46" ry="46" fill="none" stroke="#FFE394" strokeWidth="0.8" strokeDasharray="2, 2" opacity="0.8" />
                <ellipse cx="50" cy="50" rx="28" ry="46" fill="none" stroke="#DFBE77" strokeWidth="0.7" opacity="0.75" />
                <ellipse cx="50" cy="50" rx="12" ry="46" fill="none" stroke="#FFE394" strokeWidth="0.6" opacity="0.7" />
                <line x1="50" y1="4" x2="50" y2="96" stroke="#FAD77B" strokeWidth="1" opacity="0.9" />
                <line x1="4" y1="50" x2="96" y2="50" stroke="#FFE394" strokeWidth="1.2" opacity="0.9" />
                <line x1="12" y1="30" x2="88" y2="30" stroke="#C5A059" strokeWidth="0.6" strokeDasharray="1.5, 1.5" opacity="0.6" />
                <line x1="12" y1="70" x2="88" y2="70" stroke="#C5A059" strokeWidth="0.6" strokeDasharray="1.5, 1.5" opacity="0.6" />
                {/* Constellation Star Points */}
                <circle cx="28" cy="36" r="1.3" fill="#FFFFFF" />
                <circle cx="68" cy="32" r="1.3" fill="#FFF4D4" />
                <circle cx="54" cy="62" r="1.4" fill="#FFE394" />
                <circle cx="36" cy="68" r="1.2" fill="#FFFFFF" />
                <polyline points="28,36 46,24 68,32" fill="none" stroke="#FFE394" strokeWidth="0.4" opacity="0.7" />
              </svg>

              {/* Pattern Tile 2 (Seamless loop companion) */}
              <svg viewBox="0 0 100 100" className="w-1/2 h-full shrink-0">
                <ellipse cx="50" cy="50" rx="46" ry="46" fill="none" stroke="#FFE394" strokeWidth="0.8" strokeDasharray="2, 2" opacity="0.8" />
                <ellipse cx="50" cy="50" rx="28" ry="46" fill="none" stroke="#DFBE77" strokeWidth="0.7" opacity="0.75" />
                <ellipse cx="50" cy="50" rx="12" ry="46" fill="none" stroke="#FFE394" strokeWidth="0.6" opacity="0.7" />
                <line x1="50" y1="4" x2="50" y2="96" stroke="#FAD77B" strokeWidth="1" opacity="0.9" />
                <line x1="4" y1="50" x2="96" y2="50" stroke="#FFE394" strokeWidth="1.2" opacity="0.9" />
                <line x1="12" y1="30" x2="88" y2="30" stroke="#C5A059" strokeWidth="0.6" strokeDasharray="1.5, 1.5" opacity="0.6" />
                <line x1="12" y1="70" x2="88" y2="70" stroke="#C5A059" strokeWidth="0.6" strokeDasharray="1.5, 1.5" opacity="0.6" />
                <circle cx="28" cy="36" r="1.3" fill="#FFFFFF" />
                <circle cx="68" cy="32" r="1.3" fill="#FFF4D4" />
                <circle cx="54" cy="62" r="1.4" fill="#FFE394" />
                <circle cx="36" cy="68" r="1.2" fill="#FFFFFF" />
                <polyline points="28,36 46,24 68,32" fill="none" stroke="#FFE394" strokeWidth="0.4" opacity="0.7" />
              </svg>
            </div>
          </div>

          {/* Interactive Floating Hover Tooltip Pill */}
          <div
            className={`absolute -bottom-3.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-[#020A17]/95 border border-[#FFE394]/60 text-[9px] font-mono font-bold text-[#FFE394] shadow-[0_4px_12px_rgba(0,0,0,0.8)] whitespace-nowrap transition-all duration-300 pointer-events-none flex items-center gap-1 ${
              isGlobeHovered ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-1 scale-95"
            }`}
          >
            <Compass className="w-2.5 h-2.5 text-[#C5A059] animate-spin" />
            <span>Celestial Sphere • Spinning</span>
          </div>
        </div>

      </div>
    </div>
  );
}

export default CrewQuartersAnimatedHeader;
