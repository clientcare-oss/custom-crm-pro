import React, { useState } from "react";
import { Compass } from "lucide-react";

/**
 * CrewQuartersAnimatedHeader — PG-038
 * Panoramic Steampunk Observation Window Canopy with:
 * 1. Twinkling, shimmering stars across the three window panes
 * 2. An occasional glowing shooting star streaking across the cosmos
 * 3. Animated molten wax blobs inside the lava lamp on the left
 * 4. Interactive celestial globe on the right that spins on hover
 */

interface StarDef {
  id: number;
  x: number; // percentage relative to window pane
  y: number; // percentage relative to window pane
  size: number; // px
  color: string;
  delay: number; // seconds
  duration: number; // seconds
  hasCrossGlint?: boolean;
}

// Precomputed star distributions for the 3 window panes
const LEFT_WINDOW_STARS: StarDef[] = [
  { id: 1, x: 22, y: 28, size: 2.5, color: "#FFFFFF", delay: 0.2, duration: 2.8, hasCrossGlint: true },
  { id: 2, x: 45, y: 18, size: 1.8, color: "#BAE6FD", delay: 1.1, duration: 3.2 },
  { id: 3, x: 72, y: 35, size: 2.2, color: "#FEF08A", delay: 1.9, duration: 2.5, hasCrossGlint: true },
  { id: 4, x: 30, y: 48, size: 1.5, color: "#E0E7FF", delay: 0.7, duration: 3.5 },
  { id: 5, x: 58, y: 42, size: 2.8, color: "#FFFFFF", delay: 2.3, duration: 2.7, hasCrossGlint: true },
  { id: 6, x: 82, y: 22, size: 1.4, color: "#C7D2FE", delay: 1.5, duration: 3.8 },
  { id: 7, x: 38, y: 62, size: 1.6, color: "#DDD6FE", delay: 0.4, duration: 2.9 },
  { id: 8, x: 68, y: 58, size: 2.0, color: "#FEF08A", delay: 2.1, duration: 3.1 },
];

const CENTER_WINDOW_STARS: StarDef[] = [
  { id: 101, x: 14, y: 25, size: 2.2, color: "#FFFFFF", delay: 0.1, duration: 3.0, hasCrossGlint: true },
  { id: 102, x: 24, y: 16, size: 3.0, color: "#BAE6FD", delay: 1.4, duration: 2.4, hasCrossGlint: true },
  { id: 103, x: 38, y: 28, size: 1.6, color: "#FEF08A", delay: 0.8, duration: 3.6 },
  { id: 104, x: 48, y: 18, size: 2.6, color: "#FFFFFF", delay: 2.0, duration: 2.6, hasCrossGlint: true },
  { id: 105, x: 59, y: 32, size: 1.8, color: "#E0E7FF", delay: 1.2, duration: 3.3 },
  { id: 106, x: 70, y: 20, size: 3.2, color: "#BAE6FD", delay: 2.5, duration: 2.2, hasCrossGlint: true },
  { id: 107, x: 82, y: 26, size: 1.5, color: "#FEF9C3", delay: 0.6, duration: 3.8 },
  { id: 108, x: 92, y: 22, size: 2.4, color: "#FFFFFF", delay: 1.8, duration: 2.8, hasCrossGlint: true },
  { id: 109, x: 18, y: 44, size: 1.7, color: "#C7D2FE", delay: 0.9, duration: 3.4 },
  { id: 110, x: 32, y: 40, size: 2.0, color: "#FFFFFF", delay: 2.2, duration: 2.9 },
  { id: 111, x: 44, y: 48, size: 1.4, color: "#FEF08A", delay: 1.5, duration: 4.0 },
  { id: 112, x: 54, y: 42, size: 2.8, color: "#BAE6FD", delay: 0.3, duration: 2.5, hasCrossGlint: true },
  { id: 113, x: 66, y: 50, size: 1.6, color: "#FFFFFF", delay: 1.7, duration: 3.2 },
  { id: 114, x: 78, y: 44, size: 2.2, color: "#E0E7FF", delay: 2.7, duration: 2.7, hasCrossGlint: true },
  { id: 115, x: 88, y: 46, size: 1.5, color: "#FEF08A", delay: 0.5, duration: 3.5 },
  { id: 116, x: 26, y: 56, size: 1.8, color: "#FFFFFF", delay: 1.3, duration: 3.1 },
  { id: 117, x: 62, y: 58, size: 2.0, color: "#BAE6FD", delay: 2.4, duration: 2.8 },
  { id: 118, x: 74, y: 60, size: 1.5, color: "#DDD6FE", delay: 0.8, duration: 3.7 },
];

const RIGHT_WINDOW_STARS: StarDef[] = [
  { id: 201, x: 25, y: 22, size: 2.8, color: "#FFFFFF", delay: 0.3, duration: 2.6, hasCrossGlint: true },
  { id: 202, x: 46, y: 30, size: 1.7, color: "#BAE6FD", delay: 1.6, duration: 3.4 },
  { id: 203, x: 68, y: 20, size: 2.4, color: "#FEF08A", delay: 2.2, duration: 2.8, hasCrossGlint: true },
  { id: 204, x: 84, y: 32, size: 1.5, color: "#FFFFFF", delay: 0.7, duration: 3.6 },
  { id: 205, x: 32, y: 44, size: 2.0, color: "#E0E7FF", delay: 1.1, duration: 3.0 },
  { id: 206, x: 55, y: 40, size: 2.6, color: "#FFFFFF", delay: 2.6, duration: 2.4, hasCrossGlint: true },
  { id: 207, x: 76, y: 48, size: 1.6, color: "#C7D2FE", delay: 1.8, duration: 3.3 },
  { id: 208, x: 40, y: 58, size: 1.8, color: "#FEF08A", delay: 0.5, duration: 3.7 },
];

export function CrewQuartersAnimatedHeader() {
  const [isGlobeHovered, setIsGlobeHovered] = useState(false);

  return (
    <div className="w-full relative select-none overflow-hidden bg-[#020712] border-b border-[#3A2C18] shadow-[0_12px_32px_rgba(0,0,0,0.85)]">
      {/* ── CSS Keyframe Animations ── */}
      <style>{`
        @keyframes starShimmer {
          0%, 100% {
            opacity: 0.25;
            transform: scale(0.85);
          }
          50% {
            opacity: 1;
            transform: scale(1.35);
            filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.95)) drop-shadow(0 0 8px rgba(186, 230, 253, 0.8));
          }
        }

        @keyframes shootingStarFlight {
          0% {
            opacity: 0;
            transform: translate3d(-30px, -20px, 0) scale(0.6) rotate(-26deg);
          }
          4% {
            opacity: 1;
          }
          16% {
            opacity: 0.95;
            transform: translate3d(240px, 115px, 0) scale(1) rotate(-26deg);
          }
          24% {
            opacity: 0;
            transform: translate3d(360px, 170px, 0) scale(0.4) rotate(-26deg);
          }
          100% {
            opacity: 0;
            transform: translate3d(360px, 170px, 0) scale(0.4) rotate(-26deg);
          }
        }

        @keyframes shootingStarSecondary {
          0%, 45% {
            opacity: 0;
            transform: translate3d(20px, -20px, 0) scale(0.5) rotate(-32deg);
          }
          48% {
            opacity: 0.9;
          }
          56% {
            opacity: 0.8;
            transform: translate3d(160px, 90px, 0) scale(0.9) rotate(-32deg);
          }
          62% {
            opacity: 0;
            transform: translate3d(220px, 130px, 0) scale(0.3) rotate(-32deg);
          }
          100% {
            opacity: 0;
            transform: translate3d(220px, 130px, 0) scale(0.3) rotate(-32deg);
          }
        }

        @keyframes lavaBlobRise1 {
          0%, 100% {
            transform: translate3d(0, 0, 0) scale(1, 1);
          }
          40% {
            transform: translate3d(-2px, -36px, 0) scale(0.85, 1.25);
          }
          55% {
            transform: translate3d(1px, -48px, 0) scale(1.1, 0.9);
          }
          85% {
            transform: translate3d(0, -18px, 0) scale(0.95, 1.05);
          }
        }

        @keyframes lavaBlobRise2 {
          0%, 100% {
            transform: translate3d(0, 0, 0) scale(1, 1);
          }
          30% {
            transform: translate3d(2px, -24px, 0) scale(0.9, 1.15);
          }
          65% {
            transform: translate3d(-1px, -52px, 0) scale(1.15, 0.85);
          }
          90% {
            transform: translate3d(1px, -12px, 0) scale(1, 1);
          }
        }

        @keyframes lavaBlobRise3 {
          0%, 100% {
            transform: translate3d(0, -50px, 0) scale(1, 0.9);
          }
          45% {
            transform: translate3d(1px, -15px, 0) scale(0.9, 1.2);
          }
          70% {
            transform: translate3d(0, -32px, 0) scale(1.05, 0.95);
          }
        }

        @keyframes lavaLampPulse {
          0%, 100% {
            opacity: 0.75;
            filter: drop-shadow(0 0 10px rgba(59, 130, 246, 0.6)) drop-shadow(0 0 18px rgba(139, 92, 246, 0.4));
          }
          50% {
            opacity: 1;
            filter: drop-shadow(0 0 16px rgba(96, 165, 250, 0.9)) drop-shadow(0 0 26px rgba(168, 85, 247, 0.65));
          }
        }

        @keyframes globeConstellationSpin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
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
              className="absolute pointer-events-none flex items-center justify-center"
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
                backgroundColor: star.color,
                borderRadius: "50%",
                animation: `starShimmer ${star.duration}s ease-in-out infinite`,
                animationDelay: `${star.delay}s`,
              }}
            >
              {star.hasCrossGlint && (
                <div
                  className="absolute w-2.5 h-2.5 pointer-events-none opacity-80"
                  style={{
                    background: `radial-gradient(circle, ${star.color} 0%, transparent 70%)`,
                  }}
                />
              )}
            </div>
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
          {/* Twinkling Stars */}
          {CENTER_WINDOW_STARS.map((star) => (
            <div
              key={star.id}
              className="absolute pointer-events-none flex items-center justify-center"
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
                backgroundColor: star.color,
                borderRadius: "50%",
                animation: `starShimmer ${star.duration}s ease-in-out infinite`,
                animationDelay: `${star.delay}s`,
              }}
            >
              {star.hasCrossGlint && (
                <div
                  className="absolute w-3 h-3 pointer-events-none opacity-75"
                  style={{
                    background: `radial-gradient(circle, ${star.color} 0%, transparent 75%)`,
                  }}
                />
              )}
            </div>
          ))}

          {/* Primary Shooting Star: Sweeps across the center cosmos every 8.5 seconds */}
          <div
            className="absolute pointer-events-none z-10"
            style={{
              top: "16%",
              left: "12%",
              animation: "shootingStarFlight 8.5s ease-in-out infinite",
              animationDelay: "1.2s",
            }}
          >
            <div className="relative flex items-center">
              {/* Shooting Star Fading Trail */}
              <div
                className="h-[2px] w-28 sm:w-36 rounded-full"
                style={{
                  background: "linear-gradient(90deg, transparent 0%, rgba(147, 197, 253, 0.25) 30%, rgba(255, 255, 255, 0.95) 92%, #FFFFFF 100%)",
                  boxShadow: "0 0 8px rgba(191, 219, 254, 0.8)",
                }}
              />
              {/* Brilliant Glowing Diamond Head */}
              <div
                className="w-2 h-2 sm:w-2.5 sm:h-2.5 -ml-1 rounded-full bg-white shadow-[0_0_10px_#FFFFFF,0_0_18px_#60A5FA,0_0_30px_#3B82F6]"
              />
            </div>
          </div>

          {/* Secondary Shooting Star: Delicate quick streak in lower cosmos every 12 seconds */}
          <div
            className="absolute pointer-events-none z-10"
            style={{
              top: "28%",
              left: "45%",
              animation: "shootingStarSecondary 12s ease-out infinite",
              animationDelay: "5.5s",
            }}
          >
            <div className="relative flex items-center">
              <div
                className="h-[1.5px] w-20 rounded-full"
                style={{
                  background: "linear-gradient(90deg, transparent 0%, rgba(254, 240, 138, 0.3) 40%, rgba(255, 255, 255, 0.9) 100%)",
                  boxShadow: "0 0 6px rgba(254, 240, 138, 0.6)",
                }}
              />
              <div className="w-1.5 h-1.5 -ml-0.5 rounded-full bg-white shadow-[0_0_8px_#FFFFFF,0_0_14px_#FDE047]" />
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
              className="absolute pointer-events-none flex items-center justify-center"
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
                backgroundColor: star.color,
                borderRadius: "50%",
                animation: `starShimmer ${star.duration}s ease-in-out infinite`,
                animationDelay: `${star.delay}s`,
              }}
            >
              {star.hasCrossGlint && (
                <div
                  className="absolute w-2.5 h-2.5 pointer-events-none opacity-80"
                  style={{
                    background: `radial-gradient(circle, ${star.color} 0%, transparent 70%)`,
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* ======================================================== */}
        {/* 4. ANIMATED LAVA LAMP (FAR LEFT) */}
        {/* ======================================================== */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: "2.65%",
            top: "17.72%",
            width: "6.96%",
            height: "62.66%",
          }}
        >
          {/* Glass Chamber Masked Area */}
          <div
            className="w-full h-full relative overflow-hidden"
            style={{
              clipPath: "polygon(22% 4%, 78% 4%, 88% 88%, 12% 88%)",
            }}
          >
            {/* Liquid Ambient Core Glow */}
            <div
              className="absolute inset-0 opacity-40 mix-blend-screen"
              style={{
                background: "radial-gradient(ellipse at 50% 80%, rgba(96, 165, 250, 0.7) 0%, rgba(139, 92, 246, 0.5) 45%, rgba(30, 58, 138, 0.2) 80%)",
                animation: "lavaLampPulse 4s ease-in-out infinite",
              }}
            />

            {/* Molten Wax Blob 1 (Large Rising Bubble) */}
            <div
              className="absolute rounded-full"
              style={{
                bottom: "18%",
                left: "28%",
                width: "44%",
                height: "28%",
                background: "radial-gradient(circle at 40% 35%, #93C5FD 0%, #3B82F6 40%, #1D4ED8 85%, #6B21A8 100%)",
                boxShadow: "0 0 10px rgba(96, 165, 250, 0.8), inset 0 0 6px rgba(255, 255, 255, 0.5)",
                filter: "blur(0.8px)",
                opacity: 0.85,
                mixBlendMode: "screen",
                animation: "lavaBlobRise1 7.2s ease-in-out infinite",
              }}
            />

            {/* Molten Wax Blob 2 (Mid-size Fluid Droplet) */}
            <div
              className="absolute rounded-full"
              style={{
                bottom: "32%",
                left: "35%",
                width: "32%",
                height: "22%",
                background: "radial-gradient(circle at 35% 30%, #C084FC 0%, #8B5CF6 45%, #2563EB 85%)",
                boxShadow: "0 0 8px rgba(168, 85, 247, 0.8), inset 0 0 5px rgba(255, 255, 255, 0.6)",
                filter: "blur(0.6px)",
                opacity: 0.8,
                mixBlendMode: "screen",
                animation: "lavaBlobRise2 5.8s ease-in-out infinite",
                animationDelay: "1.5s",
              }}
            />

            {/* Molten Wax Blob 3 (Descending / Drifting Droplet) */}
            <div
              className="absolute rounded-full"
              style={{
                bottom: "55%",
                left: "40%",
                width: "24%",
                height: "18%",
                background: "radial-gradient(circle at 45% 40%, #67E8F9 0%, #06B6D4 50%, #3B82F6 100%)",
                boxShadow: "0 0 6px rgba(103, 232, 249, 0.8), inset 0 0 4px rgba(255, 255, 255, 0.7)",
                filter: "blur(0.5px)",
                opacity: 0.85,
                mixBlendMode: "screen",
                animation: "lavaBlobRise3 8.5s ease-in-out infinite",
                animationDelay: "3s",
              }}
            />

            {/* Molten Wax Blob 4 (Base Reservoir Heating Bubble) */}
            <div
              className="absolute rounded-t-full"
              style={{
                bottom: "10%",
                left: "18%",
                width: "64%",
                height: "16%",
                background: "radial-gradient(ellipse at 50% 50%, #60A5FA 0%, #2563EB 50%, #7C3AED 100%)",
                boxShadow: "0 0 12px rgba(59, 130, 246, 0.9)",
                opacity: 0.8,
                mixBlendMode: "screen",
                animation: "lavaLampPulse 3s ease-in-out infinite",
              }}
            />
          </div>

          {/* Exterior Glow around Lamp onto Shelf */}
          <div
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-3 rounded-full opacity-60 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse, rgba(59, 130, 246, 0.7) 0%, rgba(139, 92, 246, 0.3) 60%, transparent 80%)",
              filter: "blur(2px)",
            }}
          />
        </div>

        {/* ======================================================== */}
        {/* 5. INTERACTIVE CELESTIAL GLOBE ON HOVER (FAR RIGHT) */}
        {/* ======================================================== */}
        <div
          className="absolute pointer-events-auto cursor-pointer group"
          onMouseEnter={() => setIsGlobeHovered(true)}
          onMouseLeave={() => setIsGlobeHovered(false)}
          title="Antique Celestial Armillary Globe • Hover to spin the heavens"
          style={{
            left: "86.27%",
            top: "0.63%",
            width: "13.53%",
            height: "98.10%",
          }}
        >
          {/* Circular Interactive Hit Area & Rotating Celestial Sphere */}
          <div
            className="absolute rounded-full overflow-hidden transition-all duration-300"
            style={{
              left: "20.5%",
              top: "16%",
              width: "60%",
              height: "60%",
              boxShadow: isGlobeHovered
                ? "0 0 20px rgba(245, 216, 138, 0.5), inset 0 0 14px rgba(245, 216, 138, 0.4)"
                : "none",
            }}
          >
            {/* Spinning Celestial Grid Overlay (Coordinates, Equator, Constellations) */}
            <svg
              viewBox="0 0 100 100"
              className="w-full h-full"
              style={{
                animation: isGlobeHovered
                  ? "globeConstellationSpin 3.5s linear infinite"
                  : "globeConstellationSpin 24s linear infinite",
                opacity: isGlobeHovered ? 0.95 : 0.4,
                transition: "opacity 0.4s ease-out",
                filter: isGlobeHovered
                  ? "drop-shadow(0 0 4px rgba(245, 216, 138, 0.8))"
                  : "none",
              }}
            >
              {/* Outer Golden Sphere Trim */}
              <circle
                cx="50"
                cy="50"
                r="48"
                fill="none"
                stroke="#C5A059"
                strokeWidth="1.2"
                opacity="0.8"
              />

              {/* Longitudinal Meridian Rings */}
              <ellipse
                cx="50"
                cy="50"
                rx="46"
                ry="46"
                fill="none"
                stroke="#FFE394"
                strokeWidth="0.8"
                strokeDasharray="2, 2"
                opacity="0.75"
              />
              <ellipse
                cx="50"
                cy="50"
                rx="30"
                ry="46"
                fill="none"
                stroke="#DFBE77"
                strokeWidth="0.7"
                opacity="0.7"
              />
              <ellipse
                cx="50"
                cy="50"
                rx="14"
                ry="46"
                fill="none"
                stroke="#FFE394"
                strokeWidth="0.6"
                opacity="0.65"
              />
              <line
                x1="50"
                y1="4"
                x2="50"
                y2="96"
                stroke="#FAD77B"
                strokeWidth="0.9"
                opacity="0.85"
              />

              {/* Latitudinal Parallels (Equator, Tropics, Polar Circles) */}
              <line
                x1="4"
                y1="50"
                x2="96"
                y2="50"
                stroke="#FFE394"
                strokeWidth="1.2"
                opacity="0.9"
              />
              <line
                x1="12"
                y1="30"
                x2="88"
                y2="30"
                stroke="#C5A059"
                strokeWidth="0.6"
                strokeDasharray="1.5, 1.5"
                opacity="0.6"
              />
              <line
                x1="12"
                y1="70"
                x2="88"
                y2="70"
                stroke="#C5A059"
                strokeWidth="0.6"
                strokeDasharray="1.5, 1.5"
                opacity="0.6"
              />
              <line
                x1="22"
                y1="18"
                x2="78"
                y2="18"
                stroke="#DFBE77"
                strokeWidth="0.5"
                opacity="0.5"
              />
              <line
                x1="22"
                y1="82"
                x2="78"
                y2="82"
                stroke="#DFBE77"
                strokeWidth="0.5"
                opacity="0.5"
              />

              {/* Constellation Star Markers (Golden Points) */}
              <circle cx="34" cy="38" r="1.4" fill="#FFFFFF" />
              <circle cx="68" cy="34" r="1.3" fill="#FFF4D4" />
              <circle cx="56" cy="62" r="1.5" fill="#FFE394" />
              <circle cx="28" cy="66" r="1.2" fill="#FFFFFF" />
              <circle cx="75" cy="58" r="1.1" fill="#DFBE77" />
              <circle cx="48" cy="24" r="1.3" fill="#FFE394" />

              {/* Zodiac Constellation Line Connection */}
              <polyline
                points="34,38 48,24 68,34"
                fill="none"
                stroke="#FFE394"
                strokeWidth="0.4"
                opacity="0.7"
              />
              <polyline
                points="28,66 56,62 75,58"
                fill="none"
                stroke="#FFE394"
                strokeWidth="0.4"
                opacity="0.7"
              />
            </svg>
          </div>

          {/* Interactive Floating Hover Tooltip Pill */}
          <div
            className={`absolute -bottom-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-[#020A17]/95 border border-[#FFE394]/60 text-[9px] font-mono font-bold text-[#FFE394] shadow-[0_4px_12px_rgba(0,0,0,0.8)] whitespace-nowrap transition-all duration-300 pointer-events-none flex items-center gap-1 ${
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
