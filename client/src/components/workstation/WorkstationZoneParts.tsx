import React, { useEffect, useRef } from "react";
import { CheckSquare, Calendar, Mail, AlertTriangle, ArrowRight, X } from "lucide-react";

const DRUM_W = 385;
const DRUM_H = 330;
const SLICE_STEP = 2;
const PANEL_ARC_RAD = 1.55; // ~4 bull's-eye prism panels around full 360-degree lighthouse drum
const ROTATION_SPEED_RAD_PER_SEC = 0.24; // Calm, majestic real-lighthouse drum rotation

/**
 * Physically accurate 3D cylindrical rotating Fresnel glass lens behind the 100% stationary
 * dark bronze cage bars. Zero artificial glow/shine is added — uses exact natural amber glass
 * tones from the photograph so only the interior glass prisms revolve around the lantern.
 */
function FresnelRotatingLens() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let cancelled = false;
    let rafId = 0;

    const glassImg = new Image();
    glassImg.src = "/assets/workstation/fresnel-glass-panel.jpg";

    // Precompute cylindrical projection angle & natural curved-glass edge shading per 2px column
    const cols: Array<{ x: number; theta: number; shadeAlpha: number }> = [];
    for (let x = 0; x < DRUM_W; x += SLICE_STEP) {
      const nx = (x + SLICE_STEP * 0.5 - DRUM_W * 0.5) / (DRUM_W * 0.455);
      if (Math.abs(nx) >= 0.995) continue;
      const theta = Math.asin(nx);
      const shade = 0.85 + 0.15 * Math.cos(theta * 0.82);
      cols.push({ x, theta, shadeAlpha: Math.max(0, 1 - shade) });
    }

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    let rot = 0;
    let lastTime = performance.now();

    const drawFrame = (now: number) => {
      if (cancelled) return;
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      if (!prefersReduced) {
        rot = (rot + dt * ROTATION_SPEED_RAD_PER_SEC) % (Math.PI * 2);
      }

      const srcW = glassImg.naturalWidth || 384;
      const srcH = glassImg.naturalHeight || DRUM_H;
      ctx.clearRect(0, 0, DRUM_W, DRUM_H);

      for (let i = 0; i < cols.length; i++) {
        const col = cols[i];
        const raw = (col.theta + rot) / PANEL_ARC_RAD;
        const u = ((raw % 1) + 1) % 1;
        const sx = Math.min(srcW - 2, Math.floor(u * (srcW - 2)));
        ctx.drawImage(glassImg, sx, 0, 2, srcH, col.x, 0, SLICE_STEP, DRUM_H);
        if (col.shadeAlpha > 0.01) {
          ctx.fillStyle = `rgba(18, 9, 2, ${col.shadeAlpha.toFixed(3)})`;
          ctx.fillRect(col.x, 0, SLICE_STEP, DRUM_H);
        }
      }

      if (!prefersReduced) {
        rafId = window.requestAnimationFrame(drawFrame);
      }
    };

    glassImg.onload = () => {
      if (cancelled) return;
      lastTime = performance.now();
      drawFrame(lastTime);
    };

    return () => {
      cancelled = true;
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="wp-wz-fresnel-drum-box" aria-hidden="true">
      {/* Layer 1: Smoothly rotating 3D cylindrical glass Fresnel prisms */}
      <canvas
        ref={canvasRef}
        width={DRUM_W}
        height={DRUM_H}
        className="absolute inset-0 w-full h-full block"
      />
      {/* Layer 2: 100% Stationary dark cast-bronze cage bars & riveted belts strictly on top */}
      <img
        src="/assets/workstation/fresnel-cage-foreground.png"
        alt=""
        draggable={false}
        className="absolute inset-0 w-full h-full object-fill block pointer-events-none select-none"
      />
    </div>
  );
}

/** Crisp maritime ship silhouette rendered inside the live emerald Harbor Radar */
function RadarShipSilhouette({
  style,
}: {
  style: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 36 22"
      className="wp-wz-radar-ship"
      style={style}
      fill="none"
      aria-hidden="true"
    >
      {/* Upper bridge & mast */}
      <line x1="18" y1="2" x2="18" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="13" y="6.5" width="10" height="4" rx="0.8" fill="currentColor" />
      <rect x="9.5" y="10" width="17" height="3.2" rx="0.6" fill="currentColor" />
      {/* Hull */}
      <path d="M3.5 13.4H32.5L28.5 19.2H7.5L3.5 13.4Z" fill="currentColor" />
      {/* Tiny porthole cutouts */}
      <circle cx="13.5" cy="16" r="0.9" fill="#062c22" />
      <circle cx="18" cy="16" r="0.9" fill="#062c22" />
      <circle cx="22.5" cy="16" r="0.9" fill="#062c22" />
    </svg>
  );
}

/** Rotating Interior Fresnel Glass Lens (Zero Extra Shine) + Delicate Coffee Mug Steam */
export function LighthouseAmbientEffects() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-[2]" aria-hidden="true">
      {/* Interior cylindrical Fresnel glass drum rotating smoothly behind stationary brass bars */}
      <FresnelRotatingLens />

      {/* Delicate rising steam wisps above the Waypoint lighthouse coffee mug */}
      <div
        className="absolute overflow-visible"
        style={{ left: "14.8%", top: "53.5%", width: "4.6%", height: "15.0%" }}
      >
        <div
          className="wp-wz-steam-wisp"
          style={{ left: "26%", width: "28%", height: "42%", animationDelay: "0s" }}
        />
        <div
          className="wp-wz-steam-wisp"
          style={{ left: "48%", width: "32%", height: "48%", animationDelay: "1.5s", animationDuration: "5.1s" }}
        />
        <div
          className="wp-wz-steam-wisp"
          style={{ left: "34%", width: "24%", height: "38%", animationDelay: "2.9s", animationDuration: "4.8s" }}
        />
      </div>
    </div>
  );
}

export interface WatchCounts {
  tasks: number;
  meetings: number;
  messages: number;
  atRisk: number;
}

interface TodaysWatchBoardProps {
  counts: WatchCounts;
  onNavigate: (path: string) => void;
}

/** Left Hanging Aged Parchment Board — Live CRM "Today's Watch" */
export function TodaysWatchBoard({ counts, onNavigate }: TodaysWatchBoardProps) {
  return (
    <div className="wp-wz-watch-board" role="region" aria-label="Today's Watch summary">
      <div className="wp-wz-watch-heading">Today&apos;s Watch</div>

      <div className="flex flex-col flex-1 justify-evenly pt-[0.25cqw]">
        <button
          type="button"
          onClick={() => onNavigate("/tasks")}
          className="wp-wz-watch-row"
          title="Open My Tasks (PG-009)"
        >
          <span className="flex items-center gap-[0.45cqw] min-w-0">
            <CheckSquare className="w-[1.28cqw] h-[1.28cqw] text-[#2B1A0A] stroke-[2.2] shrink-0" />
            <span className="wp-wz-watch-label">Tasks</span>
          </span>
          <span className="wp-wz-watch-pill">{counts.tasks}</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("/calendar")}
          className="wp-wz-watch-row"
          title="Open Calendar & Meetings (PG-007)"
        >
          <span className="flex items-center gap-[0.45cqw] min-w-0">
            <Calendar className="w-[1.28cqw] h-[1.28cqw] text-[#2B1A0A] stroke-[2.2] shrink-0" />
            <span className="wp-wz-watch-label">Meetings</span>
          </span>
          <span className="wp-wz-watch-pill">{counts.meetings}</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("/crew-quarters?tab=messages")}
          className="wp-wz-watch-row"
          title="Open Crew Messages (PG-038-MSG)"
        >
          <span className="flex items-center gap-[0.45cqw] min-w-0">
            <Mail className="w-[1.28cqw] h-[1.28cqw] text-[#2B1A0A] stroke-[2.2] shrink-0" />
            <span className="wp-wz-watch-label">Messages</span>
          </span>
          <span className="wp-wz-watch-pill">{counts.messages}</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("/students")}
          className="wp-wz-watch-row"
          title="Review At-Risk / Priority Student Cases (PG-004)"
        >
          <span className="flex items-center gap-[0.45cqw] min-w-0">
            <AlertTriangle className="w-[1.28cqw] h-[1.28cqw] text-[#B91C1C] fill-[#DC2626]/25 stroke-[2.3] shrink-0" />
            <span className="wp-wz-watch-label">At Risk</span>
          </span>
          <span className="wp-wz-watch-pill wp-wz-watch-pill-risk">{counts.atRisk}</span>
        </button>
      </div>
    </div>
  );
}

interface HarborRadarPortholeProps {
  activeCasesCount: number;
  onOpenPipeline: () => void;
}

/** Right Circular Cast-Brass Harbor Radar with live 360° emerald sweep & phase-synced ship blips */
export function HarborRadarPorthole({ activeCasesCount, onOpenPipeline }: HarborRadarPortholeProps) {
  return (
    <>
      {/* Upper Emerald Status Beacon */}
      <div className="wp-wz-radar-led" aria-hidden="true" />

      {/* Circular Glass Radar Display */}
      <button
        type="button"
        onClick={onOpenPipeline}
        className="wp-wz-radar-porthole"
        title={`Harbor Radar — Open Task Operations Radar (PG-054)`}
        aria-label={`Harbor Radar — ${activeCasesCount} active items. Click to open Task Operations Radar.`}
      >
        {/* Rotating Emerald Conic Sweep */}
        <div className="wp-wz-radar-sweep" aria-hidden="true" />

        {/* Glowing Center Phosphor Origin Dot */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[5.5%] h-[5.5%] rounded-full bg-[#D1FAE5] shadow-[0_0_8px_#34D399,0_0_14px_rgba(16,185,129,0.9)] pointer-events-none"
          aria-hidden="true"
        />

        {/* 3 Maritime Ship Silhouettes — Phase-matched to light up right as the 4.8s sweep beam passes */}
        <RadarShipSilhouette style={{ left: "30%", top: "36%", animationDelay: "-0.65s" }} />
        <RadarShipSilhouette style={{ left: "73%", top: "46%", animationDelay: "-3.65s" }} />
        <RadarShipSilhouette style={{ left: "51%", top: "68%", animationDelay: "-2.35s" }} />
      </button>

      {/* Razor-Sharp Vector Brass Nameplate Below Radar */}
      <div className="wp-wz-radar-label" aria-hidden="true">
        Harbor Radar
      </div>
    </>
  );
}

interface WatchAlertsPopoverProps {
  open: boolean;
  onClose: () => void;
  counts: WatchCounts;
  onNavigate: (path: string) => void;
}

/** Compact Admiralty Watch Alerts popover anchored below the top-right Bell button */
export function WatchAlertsPopover({ open, onClose, counts, onNavigate }: WatchAlertsPopoverProps) {
  if (!open) return null;
  const totalAlerts = counts.messages + counts.atRisk;

  return (
    <div
      role="dialog"
      aria-label="Watch Alerts"
      className="absolute right-[1.6%] top-[12.4%] z-30 w-[22cqw] min-w-[240px] rounded-xl bg-[#05142B]/96 border border-[#C5A059]/60 shadow-[0_18px_46px_rgba(0,0,0,0.92)] backdrop-blur-md p-3.5 text-[#F6E8C8]"
    >
      <div className="flex items-center justify-between border-b border-[#C5A059]/25 pb-2 mb-2.5">
        <span className="font-serif font-bold text-sm tracking-wide text-[#FFE4A0]">
          Watch Alerts ({totalAlerts})
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-[#C6B697] hover:text-white hover:bg-white/10 cursor-pointer"
          aria-label="Close alerts"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-1.5 text-xs">
        <button
          type="button"
          onClick={() => {
            onClose();
            onNavigate("/crew-quarters?tab=messages");
          }}
          className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg bg-[#020A17]/80 border border-[#3A2C18]/70 hover:border-[#C5A059]/60 transition-colors cursor-pointer"
        >
          <span>Unread Messages</span>
          <span className="flex items-center gap-1.5 font-bold text-[#FFE394]">
            {counts.messages}
            <ArrowRight className="w-3 h-3" />
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            onClose();
            onNavigate("/students");
          }}
          className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg bg-[#020A17]/80 border border-[#3A2C18]/70 hover:border-rose-400/60 transition-colors cursor-pointer"
        >
          <span>At-Risk / Priority Cases</span>
          <span className="flex items-center gap-1.5 font-bold text-rose-300">
            {counts.atRisk}
            <ArrowRight className="w-3 h-3" />
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            onClose();
            onNavigate("/tasks");
          }}
          className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg bg-[#020A17]/80 border border-[#3A2C18]/70 hover:border-[#C5A059]/60 transition-colors cursor-pointer"
        >
          <span>Pending Tasks</span>
          <span className="flex items-center gap-1.5 font-bold text-[#FFE394]">
            {counts.tasks}
            <ArrowRight className="w-3 h-3" />
          </span>
        </button>
      </div>
    </div>
  );
}
