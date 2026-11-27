import React, { useRef, useCallback } from "react";
import type { AmbianceLevels } from "@/lib/observatoryAudioEngine";

/** Custom crisp Observatory Ambiance glyphs matching the photorealistic hardware console */
export function AmbianceGlyph({ type }: { type: keyof AmbianceLevels }) {
  const cls = "w-[1.82cqw] h-[1.82cqw]";
  if (type === "wind") {
    return (
      <svg
        viewBox="0 0 28 24"
        className={cls}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.95"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 8.5h13.5a2.6 2.6 0 1 0-2.1-4.1" />
        <path d="M2.5 13h19a2.8 2.8 0 1 1-2.2 4.5" />
        <path d="M6 17.5h8.2a2.1 2.1 0 1 1-1.7 3.3" />
      </svg>
    );
  }
  if (type === "rain") {
    return (
      <svg viewBox="0 0 28 24" className={cls} fill="none" aria-hidden="true">
        <path
          d="M8.4 14.2h11.6a3.9 3.9 0 0 0 .5-7.75 5.4 5.4 0 0 0-10.3-1.35A4.1 4.1 0 0 0 8.4 14.2Z"
          fill="currentColor"
        />
        <line x1="9.2" y1="16.4" x2="8.1" y2="19.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        <line x1="13.8" y1="16.6" x2="12.6" y2="20.6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        <line x1="18.3" y1="16.4" x2="17.2" y2="19.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        <circle cx="10.6" cy="21.4" r="0.95" fill="currentColor" />
        <circle cx="15.8" cy="21.4" r="0.95" fill="currentColor" />
      </svg>
    );
  }
  if (type === "ocean") {
    return (
      <svg
        viewBox="0 0 28 24"
        className={cls}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4.5 12.6c2.6-4.8 8.2-7.4 12.6-5.2 2.4 1.2 2.5 4.2 0.2 5-1.6.5-3.2-.6-2.5-2.1" strokeWidth="1.95" />
        <path d="M3 14.8c2.8 0 4.2-1.8 7-1.8s4.2 1.8 7 1.8 4.2-1.8 7.5-1.8" strokeWidth="1.8" />
        <path d="M4 19c2.8 0 4.2-1.6 6.8-1.6 2.6 0 4 1.6 6.6 1.6 2.6 0 4-1.6 6.6-1.6" strokeWidth="1.75" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 28 24" className={cls} fill="currentColor" aria-hidden="true">
      <path d="M10.5 3.2 5.4 10.6h2.4L4.4 16.4h3.2L6.8 18.8h7.4l-.8-2.4h3.2l-3.4-5.8h2.4L10.5 3.2Z" />
      <rect x="9.6" y="18.5" width="1.8" height="3.2" rx="0.4" />
      <path d="M19.2 6.8 15.6 12.4h1.7l-2.3 4.3h2.1l-.5 2.1h5.2l-.5-2.1h2.1l-2.3-4.3h1.7L19.2 6.8Z" />
      <rect x="18.4" y="18.5" width="1.6" height="3.2" rx="0.4" />
    </svg>
  );
}

/** Crisp SVG Observatory Lighthouse + animated beacon cone matching the CRT reference */
export function CrtObservatoryLighthouse({ isPlaying }: { isPlaying: boolean }) {
  return (
    <svg
      viewBox="0 0 110 46"
      className="w-[58%] h-auto my-[0.25cqw] drop-shadow-[0_0_8px_rgba(148,208,255,0.45)]"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="crt-beam-grad" x1="53" y1="15" x2="108" y2="15" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF7DC" stopOpacity="0.96" />
          <stop offset="55%" stopColor="#F5DDA0" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#A9C8F5" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points="54,13 108,3 108,26 54,18"
        fill="url(#crt-beam-grad)"
        className={isPlaying ? "wp-ws-crt-beam-live" : "opacity-65"}
      />
      <line x1="48" y1="2" x2="48" y2="6" stroke="#FAF2DC" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M42.5 11.5C42.5 8 45 6 48 6C51 6 53.5 8 53.5 11.5Z" fill="#FAF2DC" />
      <rect x="44" y="11.5" width="8" height="6.5" fill="#FFF8E2" />
      <line x1="41" y1="18" x2="55" y2="18" stroke="#FAF2DC" strokeWidth="1.8" strokeLinecap="round" />
      <polygon points="43,18 53,18 56,39 40,39" fill="#EFE4CC" />
      <rect x="46.8" y="21.5" width="2.4" height="3.2" rx="0.6" fill="#0B2246" />
      <rect x="46.8" y="27.5" width="2.4" height="3.2" rx="0.6" fill="#0B2246" />
      <path d="M46.2 39V34.5C46.2 33.4 47 32.8 48 32.8C49 32.8 49.8 33.4 49.8 34.5V39Z" fill="#0B2246" />
      <path
        d="M27 43C31 39 36 37.5 41 38.2C45 38.5 52 38.5 56 38C61 37.5 66 39.5 70 43Z"
        fill="#D6C7A8"
        fillOpacity="0.88"
      />
    </svg>
  );
}

interface AmbianceSliderProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  onChange: (val: number) => void;
}

export function AmbianceVerticalSlider({ label, value, icon, onChange }: AmbianceSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const updateFromClientY = useCallback(
    (clientY: number) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect || rect.height <= 0) return;
      const ratio = 1 - (clientY - rect.top) / rect.height;
      onChange(Math.max(0, Math.min(1, ratio)));
    },
    [onChange]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromClientY(e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    updateFromClientY(e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore if already released
    }
  };

  const pct = Math.round(value * 100);

  return (
    <div className="wp-ws-slider-col">
      <button
        type="button"
        onClick={() => onChange(value > 0.05 ? 0 : 0.6)}
        className="wp-ws-slider-icon-btn"
        title={`${label}: ${pct}% (click to mute/unmute)`}
        aria-label={`Toggle ${label} ambiance`}
      >
        {icon}
      </button>

      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label={`${label} volume`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp" || e.key === "ArrowRight") {
            e.preventDefault();
            onChange(Math.min(1, value + 0.08));
          } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
            e.preventDefault();
            onChange(Math.max(0, value - 0.08));
          }
        }}
        className="wp-ws-slider-track"
        title={`Drag to adjust ${label} (${pct}%)`}
      >
        <div
          className="wp-ws-slider-glow"
          style={{ height: `${Math.max(4, pct)}%`, opacity: value > 0.02 ? 1 : 0.18 }}
        />
        <div
          className="wp-ws-slider-thumb"
          style={{ bottom: `${Math.max(6, Math.min(92, pct))}%` }}
        />
      </div>
    </div>
  );
}

interface StarDef {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
}

const WS_LEFT_STARS: StarDef[] = [
  { id: 1, x: 48, y: 32, size: 1.8, color: "#FFFFFF", delay: 0.5, duration: 6.2 },
];

const WS_CENTER_STARS: StarDef[] = [
  { id: 101, x: 22, y: 26, size: 2.0, color: "#FFFFFF", delay: 0.2, duration: 5.8 },
  { id: 102, x: 52, y: 19, size: 2.2, color: "#BAE6FD", delay: 1.8, duration: 6.5 },
  { id: 103, x: 74, y: 34, size: 1.6, color: "#FEF08A", delay: 2.9, duration: 5.4 },
  { id: 104, x: 86, y: 22, size: 1.8, color: "#FFFFFF", delay: 0.9, duration: 7.1 },
];

const WS_RIGHT_STARS: StarDef[] = [
  { id: 201, x: 55, y: 28, size: 1.9, color: "#FFFFFF", delay: 1.2, duration: 6.0 },
];

/**
 * Ambient Observatory Night Sky & Lava Lamp Animation Layer
 * Brought over directly from Dashboard (CrewQuartersAnimatedHeader):
 * 1. Subtle star twinkles + fluid no-tail shooting star gliding across the center Milky Way window
 * 2. Rising & descending molten wax blobs clipped precisely inside the left-shelf blue lava lamp glass cone
 */
export function ObservatoryAmbientAnimations() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-[2]" aria-hidden="true">
      {/* Left Arched Window — Gentle Star Twinkle */}
      <div
        className="absolute overflow-hidden"
        style={{
          left: "15.8%",
          top: "2.8%",
          width: "15.2%",
          height: "31.0%",
          borderRadius: "30% 30% 4% 4%",
        }}
      >
        {WS_LEFT_STARS.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              backgroundColor: star.color,
              animation: `wpWsStarShimmer ${star.duration}s ease-in-out infinite`,
              animationDelay: `${star.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Center Wide Arched Window — Subtle Twinkling Stars + Shooting Star Speck */}
      <div
        className="absolute overflow-hidden"
        style={{
          left: "34.8%",
          top: "2.8%",
          width: "30.4%",
          height: "30.8%",
          borderRadius: "14% 14% 4% 4%",
        }}
      >
        {WS_CENTER_STARS.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              backgroundColor: star.color,
              animation: `wpWsStarShimmer ${star.duration}s ease-in-out infinite`,
              animationDelay: `${star.delay}s`,
            }}
          />
        ))}

        {/* Shooting Star Speck (NO TAIL): Part 1 gliding across the Center Milky Way Window */}
        <div
          className="absolute z-10"
          style={{
            top: "6.8cqh",
            left: "0.6cqw",
            animation: "wpWsShootingStarAcross 9.2s linear infinite",
            animationDelay: "1.4s",
          }}
        >
          <div className="w-[2px] h-[2px] rounded-full bg-white shadow-[0_0_3px_#FFFFFF,0_0_6px_rgba(255,255,255,0.92)]" />
        </div>
      </div>

      {/* Right Arched Window — Gentle Star Twinkle + Seamless Continuation of Shooting Star */}
      <div
        className="absolute overflow-hidden"
        style={{
          left: "68.8%",
          top: "2.8%",
          width: "15.3%",
          height: "31.0%",
          borderRadius: "30% 30% 4% 4%",
        }}
      >
        {WS_RIGHT_STARS.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              backgroundColor: star.color,
              animation: `wpWsStarShimmer ${star.duration}s ease-in-out infinite`,
              animationDelay: `${star.delay}s`,
            }}
          />
        ))}

        {/* Shooting Star Speck (NO TAIL): Part 2 emerging behind brass mullion (68.8 - 34.8 = 34.0cqw offset) & continuing across Right Window */}
        <div
          className="absolute z-10"
          style={{
            top: "6.8cqh",
            left: "-33.4cqw",
            animation: "wpWsShootingStarAcross 9.2s linear infinite",
            animationDelay: "1.4s",
          }}
        >
          <div className="w-[2px] h-[2px] rounded-full bg-white shadow-[0_0_3px_#FFFFFF,0_0_6px_rgba(255,255,255,0.92)]" />
        </div>
      </div>

      {/* Left-Shelf Blue Lava Lamp — Clipped Tightly Inside the Tapered Glass Chamber */}
      <div
        className="absolute"
        style={{
          left: "3.4%",
          top: "33.0%",
          width: "5.0%",
          height: "15.1%",
        }}
      >
        <div
          className="w-full h-full relative overflow-hidden"
          style={{
            clipPath: "polygon(20% 0%, 80% 0%, 100% 78%, 88% 100%, 12% 100%, 0% 78%)",
          }}
        >
          {/* Ambient Liquid Core Glow */}
          <div
            className="absolute inset-0 mix-blend-screen"
            style={{
              opacity: 0.45,
              background:
                "radial-gradient(ellipse at 50% 80%, rgba(96, 165, 250, 0.72) 0%, rgba(139, 92, 246, 0.42) 50%, rgba(30, 58, 138, 0.16) 85%)",
              animation: "wpWsLavaGlowPulse 4s ease-in-out infinite",
            }}
          />

          {/* Molten Wax Blob 1 (Main Rising Bubble) */}
          <div
            className="absolute rounded-full"
            style={{
              bottom: "12%",
              left: "22%",
              width: "56%",
              height: "28%",
              background: "radial-gradient(circle at 40% 35%, #93C5FD 0%, #3B82F6 45%, #1D4ED8 85%, #6B21A8 100%)",
              boxShadow: "0 0 6px rgba(96, 165, 250, 0.8), inset 0 0 4px rgba(255, 255, 255, 0.6)",
              filter: "blur(0.6px)",
              opacity: 0.86,
              mixBlendMode: "screen",
              animation: "wpWsLavaBlobMain 6.8s ease-in-out infinite",
            }}
          />

          {/* Molten Wax Blob 2 (Mid-size Fluid Droplet) */}
          <div
            className="absolute rounded-full"
            style={{
              bottom: "28%",
              left: "30%",
              width: "40%",
              height: "22%",
              background: "radial-gradient(circle at 35% 30%, #C084FC 0%, #8B5CF6 50%, #2563EB 85%)",
              boxShadow: "0 0 5px rgba(168, 85, 247, 0.8)",
              filter: "blur(0.5px)",
              opacity: 0.82,
              mixBlendMode: "screen",
              animation: "wpWsLavaBlobSecondary 5.2s ease-in-out infinite",
              animationDelay: "1s",
            }}
          />

          {/* Molten Wax Heated Base Reservoir */}
          <div
            className="absolute rounded-t-full"
            style={{
              bottom: "1%",
              left: "10%",
              width: "80%",
              height: "16%",
              background: "radial-gradient(ellipse at 50% 50%, #60A5FA 0%, #2563EB 50%, #7C3AED 100%)",
              boxShadow: "0 0 8px rgba(59, 130, 246, 0.9)",
              opacity: 0.85,
              mixBlendMode: "screen",
              animation: "wpWsLavaGlowPulse 3s ease-in-out infinite",
            }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Razor-Sharp Retina Vector Engraved Metal Plaque Labels
 * Replaces the 5 low-res bitmap labels baked into the JPEG backdrop while preserving 100% of the
 * photorealistic brushed-brass plates, corner rivets, specular sheen, and curved leather bezel.
 */
export function ObservatoryMetalLabels() {
  return (
    <div className="absolute inset-0 pointer-events-none select-none z-[4]" aria-hidden="true">
      {/* 1. FOCUS RADIO — Top Brushed-Brass Radio Nameplate */}
      <div
        className="wp-ws-metal-engraved"
        style={{
          left: "47.2%",
          top: "34.4%",
          width: "13.2%",
          height: "3.7%",
          fontSize: "1.34cqw",
          letterSpacing: "0.095em",
        }}
      >
        FOCUS RADIO
      </div>

      {/* 2. AMBIANCE CONTROLS — Center Gold-Etched Obsidian Strip */}
      <div
        className="wp-ws-metal-gold-etched"
        style={{
          left: "47.2%",
          top: "49.2%",
          width: "15.6%",
          height: "2.6%",
          fontSize: "0.88cqw",
          letterSpacing: "0.115em",
        }}
      >
        AMBIANCE CONTROLS
      </div>

      {/* 4. STATION SELECT — Razor-Sharp Curved Gold SVG Arc Above Rotary Brass Knob */}
      <svg
        viewBox="0 0 160 88"
        className="absolute pointer-events-none overflow-visible"
        style={{
          left: "69.5%",
          top: "35.8%",
          width: "10.7%",
          height: "11.2%",
          filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.96))",
        }}
      >
        <defs>
          <path id="ws-station-select-arc" d="M 16,66 A 66,66 0 0,1 144,66" fill="none" />
        </defs>
        <text
          fill="#F7E3B2"
          fontFamily="'Playfair Display', Georgia, serif"
          fontWeight="700"
          fontSize="12.2"
          letterSpacing="1.65"
        >
          <textPath href="#ws-station-select-arc" startOffset="50%" textAnchor="middle">
            STATION SELECT
          </textPath>
        </text>
      </svg>

      {/* 5. EMPLOYEE ARRIVAL — Wide Gleaming Brass Mantel Nameplate */}
      <div
        className="wp-ws-metal-engraved"
        style={{
          left: "40.2%",
          top: "67.5%",
          width: "19.8%",
          height: "3.7%",
          fontSize: "1.48cqw",
          letterSpacing: "0.115em",
        }}
      >
        EMPLOYEE ARRIVAL
      </div>
    </div>
  );
}
