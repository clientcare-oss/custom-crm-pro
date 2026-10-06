import React, { useState } from "react";
import { Flame } from "lucide-react";
import {
  LavaLampCalibrationPanel,
  loadLavaLampConfig,
  saveLavaLampConfig,
  DEFAULT_LAVA_LAMP_CONFIG,
  LavaLampConfig,
} from "./LavaLampCalibrationPanel";

/**
 * CrewQuartersAnimatedHeader — PG-038
 * Panoramic Steampunk Observation Window Canopy with:
 * 1. Gentle, subtle star twinkles
 * 2. Small shooting star with NO TAIL gliding across the cosmos
 * 3. Lava lamp animation perfectly aligned directly over the glass chamber with live calibration controls
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
  const [lavaConfig, setLavaConfig] = useState<LavaLampConfig>(loadLavaLampConfig);
  const [isCalibratorOpen, setIsCalibratorOpen] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

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
            transform: translate3d(-1px, calc(-1px * var(--lava-rise-mid, 28px)), 0) scale(0.85, 1.2);
          }
          60% {
            transform: translate3d(1px, calc(-1px * var(--lava-rise-max, 48px)), 0) scale(1.1, 0.9);
          }
          85% {
            transform: translate3d(0, calc(-1px * var(--lava-rise-low, 14px)), 0) scale(0.95, 1.05);
          }
        }

        @keyframes lavaBlobSecondary {
          0%, 100% {
            transform: translate3d(0, 0, 0) scale(1, 1);
          }
          35% {
            transform: translate3d(1px, calc(-1px * var(--lava-rise-sec-mid, 20px)), 0) scale(0.9, 1.15);
          }
          65% {
            transform: translate3d(-1px, calc(-1px * var(--lava-rise-sec-max, 42px)), 0) scale(1.1, 0.9);
          }
          85% {
            transform: translate3d(0, calc(-1px * var(--lava-rise-sec-low, 10px)), 0) scale(1, 1);
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
        {/* Adjustable via on-screen calibration HUD or clicking directly */}
        {/* ======================================================== */}
        {(() => {
          const topInset = Math.max(0, Math.min(45, (100 - (lavaConfig.topWidth ?? 74)) / 2));
          const bottomInset = Math.max(0, Math.min(45, (100 - (lavaConfig.bottomWidth ?? 96)) / 2));
          const clipPathPolygon = `polygon(${topInset.toFixed(1)}% 0%, ${(100 - topInset).toFixed(1)}% 0%, ${(100 - bottomInset).toFixed(1)}% 98%, ${bottomInset.toFixed(1)}% 98%)`;

          return (
            <div
              className="absolute z-20 group cursor-pointer pointer-events-auto transition-[left,top,width,height] duration-75"
              onClick={() => setIsCalibratorOpen(true)}
              title="Click to adjust Lava Lamp position, top/bottom widths & height (PG-038)"
              style={{
                left: `${lavaConfig.left}%`,
                top: `${lavaConfig.top}%`,
                width: `${lavaConfig.width}%`,
                height: `${lavaConfig.height}%`,
                // @ts-ignore
                "--lava-rise-max": `${lavaConfig.riseTravel}px`,
                "--lava-rise-mid": `${Math.round(lavaConfig.riseTravel * 0.6)}px`,
                "--lava-rise-low": `${Math.round(lavaConfig.riseTravel * 0.28)}px`,
                "--lava-rise-sec-max": `${Math.round(lavaConfig.riseTravel * 0.88)}px`,
                "--lava-rise-sec-mid": `${Math.round(lavaConfig.riseTravel * 0.42)}px`,
                "--lava-rise-sec-low": `${Math.round(lavaConfig.riseTravel * 0.2)}px`,
              } as React.CSSProperties}
            >
              {/* Visual Alignment / Guide Outline when calibrating */}
              {showGuide && (
                <div
                  className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center"
                  style={{
                    clipPath: clipPathPolygon,
                    backgroundColor: "rgba(197, 160, 89, 0.35)",
                    outline: "2px dashed #FFE394",
                    filter: "drop-shadow(0 0 6px rgba(255, 227, 148, 0.8))",
                  }}
                >
                  <span className="text-[9px] font-mono text-[#FFF4D4] bg-[#05142B]/95 px-1 py-0.5 rounded border border-[#C5A059] shadow whitespace-nowrap">
                    top {lavaConfig.topWidth}% / bot {lavaConfig.bottomWidth}%
                  </span>
                </div>
              )}

              {/* Hover indicator hint badge */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 whitespace-nowrap bg-[#05142B]/90 text-[#FFE394] border border-[#C5A059]/60 px-2 py-0.5 rounded text-[10px] shadow-lg flex items-center gap-1">
                <Flame className="w-2.5 h-2.5 text-[#C5A059]" />
                <span>Click to adjust</span>
              </div>

              {/* Glass Tapered Chamber: Dynamic geometric polygon of the lamp based on independent top/bottom flow widths */}
              <div
                className="w-full h-full relative overflow-hidden"
                style={{
                  clipPath: clipPathPolygon,
                }}
              >
            {/* Ambient Liquid Core Glow */}
            <div
              className="absolute inset-0 mix-blend-screen"
              style={{
                opacity: 0.45 * lavaConfig.glowIntensity,
                background: "radial-gradient(ellipse at 50% 80%, rgba(96, 165, 250, 0.7) 0%, rgba(139, 92, 246, 0.4) 50%, rgba(30, 58, 138, 0.15) 85%)",
                animation: "lavaGlowPulse 4s ease-in-out infinite",
              }}
            />

            {/* Molten Wax Blob 1 (Main Rising Bubble - travels up to meet top cap) */}
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
                animation: `lavaBlobMain ${(6.8 / lavaConfig.speedMultiplier).toFixed(2)}s ease-in-out infinite`,
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
                animation: `lavaBlobSecondary ${(5.2 / lavaConfig.speedMultiplier).toFixed(2)}s ease-in-out infinite`,
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
          );
        })()}

      </div>

      {/* ── Top-Right Quick Calibration Trigger ── */}
      <div className="absolute top-2.5 right-3 z-30 pointer-events-auto">
        <button
          type="button"
          onClick={() => setIsCalibratorOpen(true)}
          title="Adjust Lava Lamp position & height (PG-038)"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#05142B]/85 hover:bg-[#0E2749] text-[#FFE394] border border-[#3A2C18] hover:border-[#C5A059]/70 text-xs font-medium shadow-[0_4px_16px_rgba(0,0,0,0.8)] backdrop-blur-md transition-all group"
        >
          <Flame className="w-3.5 h-3.5 text-[#C5A059] group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline">Adjust Lamp</span>
        </button>
      </div>

      {/* ── Calibration & Positioning Panel ── */}
      <LavaLampCalibrationPanel
        isOpen={isCalibratorOpen}
        onClose={() => setIsCalibratorOpen(false)}
        config={lavaConfig}
        onChange={setLavaConfig}
        onReset={() => {
          setLavaConfig(DEFAULT_LAVA_LAMP_CONFIG);
          saveLavaLampConfig(DEFAULT_LAVA_LAMP_CONFIG);
        }}
        showGuide={showGuide}
        onToggleGuide={setShowGuide}
      />
    </div>
  );
}

export default CrewQuartersAnimatedHeader;
