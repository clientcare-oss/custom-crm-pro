import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Volume2, VolumeX, Clock, Power } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { ScopedErrorBoundary } from "@/components/ScopedErrorBoundary";
import {
  AmbianceGlyph,
  CrtObservatoryLighthouse,
  AmbianceVerticalSlider,
  ObservatoryAmbientAnimations,
  ObservatoryMetalLabels,
} from "@/components/workstation/ObservatoryConsoleParts";
import { FOCUS_STATIONS } from "@/lib/observatoryAudioEngine";
import { useObservatoryRadio } from "@/contexts/ObservatoryRadioContext";
import "@/styles/workstationObservatory.css";

const SHIFT_STORAGE_KEY = "waypoint_workstation_shift_start";

function formatElapsedShift(startMs: number, nowMs: number): string {
  const totalSec = Math.max(0, Math.floor((nowMs - startMs) / 1000));
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function MyWorkstation() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Live unread messaging counts for the MESSAGING arrival card
  const { data: crewStats } = trpc.crewMessages.getOverviewStats.useQuery(undefined, {
    enabled: !!user && user.role !== "client",
    refetchInterval: 20000,
  });
  const unreadTotal = crewStats?.unreadTotal ?? 0;

  // Global persistent Observatory Focus Radio state (music & ambiance channels strictly decoupled)
  const {
    stationId,
    activeStation,
    isMusicPlaying,
    hasActiveAmbiance,
    isPlaying,
    isMuted,
    ambiance,
    selectStation,
    stepStation,
    toggleMusic,
    stopRadio,
    setAmbianceChannel,
  } = useObservatoryRadio();

  // Shift Time Clock state (persisted in localStorage)
  const [shiftStartMs, setShiftStartMs] = useState<number | null>(() => {
    try {
      const raw = localStorage.getItem(SHIFT_STORAGE_KEY);
      if (raw) {
        const parsed = Number(raw);
        if (!Number.isNaN(parsed) && parsed > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return null;
  });
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!shiftStartMs) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [shiftStartMs]);

  const handleToggleTimeClock = () => {
    if (shiftStartMs) {
      const elapsed = formatElapsedShift(shiftStartMs, Date.now());
      setShiftStartMs(null);
      try {
        localStorage.removeItem(SHIFT_STORAGE_KEY);
      } catch {
        // ignore
      }
      toast.success(`Shift clocked out — ${elapsed} logged to your workstation.`);
    } else {
      const start = Date.now();
      setShiftStartMs(start);
      setNowMs(start);
      try {
        localStorage.setItem(SHIFT_STORAGE_KEY, String(start));
      } catch {
        // ignore
      }
      toast.success("Clocked in — welcome to your Waypoint Observatory Workstation!");
    }
  };

  return (
    <ScopedErrorBoundary moduleName="My Workstation">
      <div className="wp-ws-viewport">
        <div className="wp-ws-stage">
          {/* ── Photorealistic Observatory Focus Radio & Employee Arrival Backdrop ── */}
          <img
            src="/assets/workstation/workstation-scene-base.jpg?v=6"
            alt="Waypoint Observatory Focus Radio and Employee Arrival Workstation"
            className="wp-ws-backdrop-img"
            draggable={false}
          />

          {/* ── Ambient Sky Shooting Star + Twinkles & Left-Shelf Lava Lamp Animation ── */}
          <ObservatoryAmbientAnimations />

          {/* ── Razor-Sharp Retina Engraved Brass Plaque Labels ── */}
          <ObservatoryMetalLabels />

          {/* ── 1. INTERACTIVE CRT MONITOR (Click to Play / Stop Top Music Station) ── */}
          <button
            type="button"
            onClick={toggleMusic}
            className="wp-ws-crt-zone group"
            title={isMusicPlaying ? "Stop Station Music" : `Start ${activeStation.crtTitle}`}
            aria-label={`Focus Radio CRT — ${activeStation.crtTitle}. Click to ${isMusicPlaying ? "stop" : "play"} music.`}
          >
            {/* Subtle ON AIR / Audio status indicator (shows live EQ when playing, mute hint on hover) */}
            <div className="absolute top-[0.65cqw] right-[0.85cqw] flex items-center gap-[0.3cqw] z-10">
              {isPlaying && !isMuted ? (
                <>
                  <span className="flex items-end gap-[0.12cqw] h-[0.75cqw]">
                    <span className="wp-ws-eq-bar" style={{ animationDelay: "0ms" }} />
                    <span className="wp-ws-eq-bar" style={{ animationDelay: "220ms" }} />
                    <span className="wp-ws-eq-bar" style={{ animationDelay: "440ms" }} />
                  </span>
                  <Volume2 className="w-[0.95cqw] h-[0.95cqw] text-[#FFE394]" />
                </>
              ) : isPlaying && isMuted ? (
                <VolumeX className="w-[0.95cqw] h-[0.95cqw] text-[#F5C04E]/85" />
              ) : (
                <VolumeX className="w-[0.95cqw] h-[0.95cqw] text-[#9CC2F2]/75 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              )}
            </div>

            <div className="relative z-10 font-serif text-[0.76cqw] tracking-[0.14em] uppercase text-[#DCEBFF] drop-shadow-[0_1px_5px_rgba(0,0,0,0.9)]">
              ✦ THE OBSERVATORY ✦
            </div>

            <CrtObservatoryLighthouse isPlaying={isPlaying && !isMuted} />

            <div className="relative z-10 font-serif italic text-[1.72cqw] leading-tight text-[#FAF4E4] drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] mt-[0.15cqw]">
              {activeStation.crtTitle}
            </div>

            <div className="relative z-10 font-serif text-[0.62cqw] tracking-[0.16em] uppercase text-[#C9DCF5]/90 mt-[0.35cqw] drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
              {isMusicPlaying
                ? activeStation.crtSub
                : hasActiveAmbiance
                  ? "AMBIANCE · SEAMLESS LOOP"
                  : activeStation.crtSub}
            </div>
          </button>

          {/* ── 2. UPPER-RIGHT TUNING DIAL (Music Stations Only — Independent of Ambient Sliders) ── */}
          <div className="wp-ws-dial-zone" role="tablist" aria-label="Focus Radio Music Stations">
            <div className="flex items-center justify-between gap-[0.3cqw] px-[0.2cqw]">
              {FOCUS_STATIONS.map((st) => {
                const isSelected = st.id === stationId;
                return (
                  <button
                    key={st.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => selectStation(st.id, true)}
                    className={`wp-ws-station-btn ${isSelected ? "wp-ws-station-btn-active" : ""}`}
                    title={`Select ${st.label} station (ready for custom music)`}
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>

            {/* Gliding Glowing Amber Frequency Needle along the physical ruler line */}
            <div
              className="wp-ws-dial-needle"
              style={{ left: `${activeStation.dialPercent}%` }}
              aria-hidden="true"
            />
          </div>

          {/* ── 2B. CLEAR MASTER RADIO OFF BUTTON (Shuts down Music + All 4 Ambient Sounds) ── */}
          <button
            type="button"
            onClick={stopRadio}
            disabled={!isPlaying}
            data-testid="workstation-radio-off-btn"
            className={`wp-ws-off-btn ${isPlaying ? "wp-ws-off-btn-live" : "opacity-70 cursor-default"}`}
            title={isPlaying ? "Turn off all Focus Radio music and ambient sounds" : "Focus Radio is currently off"}
            aria-label="Turn Focus Radio Off"
          >
            <span className="wp-ws-off-led" aria-hidden="true" />
            <Power className="w-[0.78cqw] h-[0.78cqw] shrink-0" />
            <span>OFF</span>
          </button>

          {/* ── 3. ROTARY BRASS STATION SELECT KNOB + LEFT/RIGHT STEPPERS ── */}
          <button
            type="button"
            onClick={() => stepStation(-1)}
            className="wp-ws-step-btn"
            style={{ left: "70.0%" }}
            title="Previous station"
            aria-label="Previous Focus Radio station"
          />
          <button
            type="button"
            onClick={() => stepStation(1)}
            className="wp-ws-knob-btn"
            title={`Station Select: ${activeStation.label} (click to tune next)`}
            aria-label={`Station Select knob — current station ${activeStation.label}`}
          >
            <span
              className="wp-ws-knob-indicator"
              style={{ transform: `rotate(${activeStation.knobDeg}deg)` }}
            />
          </button>
          <button
            type="button"
            onClick={() => stepStation(1)}
            className="wp-ws-step-btn"
            style={{ left: "77.6%" }}
            title="Next station"
            aria-label="Next Focus Radio station"
          />

          {/* ── 4. FOUR DRAGGABLE ILLUMINATED BRASS VERTICAL AMBIANCE SLIDERS ── */}
          <div className="wp-ws-sliders-zone">
            <AmbianceVerticalSlider
              label="Wind"
              value={ambiance.wind}
              icon={<AmbianceGlyph type="wind" />}
              onChange={(v) => setAmbianceChannel("wind", v)}
            />
            <AmbianceVerticalSlider
              label="Rain"
              value={ambiance.rain}
              icon={<AmbianceGlyph type="rain" />}
              onChange={(v) => setAmbianceChannel("rain", v)}
            />
            <AmbianceVerticalSlider
              label="Ocean Waves"
              value={ambiance.ocean}
              icon={<AmbianceGlyph type="ocean" />}
              onChange={(v) => setAmbianceChannel("ocean", v)}
            />
            <AmbianceVerticalSlider
              label="Forest Night"
              value={ambiance.forest}
              icon={<AmbianceGlyph type="forest" />}
              onChange={(v) => setAmbianceChannel("forest", v)}
            />
          </div>

          {/* ── 5. LOWER EMPLOYEE ARRIVAL INTERACTIVE BRASS CARDS ── */}
          {/* Card 1: TIME CLOCK — Live Shift Clock-In / Clock-Out + Timesheet Link */}
          <div
            role="button"
            tabIndex={0}
            onClick={handleToggleTimeClock}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleToggleTimeClock();
              }
            }}
            className="wp-ws-arrival-hitbox group"
            style={{ left: "7.4%", top: "71.8%", width: "25.8%", height: "19.8%" }}
            title={shiftStartMs ? "Click to Clock Out of Shift" : "Click to Begin Your Shift"}
          >
            <div
              className="wp-ws-arrival-plate"
              style={{ left: "41.5%", top: "20%", width: "53%", height: "65%" }}
            >
              <div className="wp-ws-arrival-title">
                TIME
                <br />
                CLOCK
              </div>
              {shiftStartMs ? (
                <div className="flex items-center gap-[0.3cqw] mt-[0.35cqw]">
                  <span className="inline-block w-[0.45cqw] h-[0.45cqw] rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                  <span className="font-mono text-[0.82cqw] font-bold text-[#9BF5C8] drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]">
                    {formatElapsedShift(shiftStartMs, nowMs)}
                  </span>
                </div>
              ) : (
                <div className="wp-ws-arrival-sub">Begin Your Shift</div>
              )}
            </div>
            {/* Subtle corner link to full Timesheet log (appears cleanly on hover) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLocation("/crew-quarters?tab=timesheet");
              }}
              className="absolute right-[3.8%] top-[24%] p-[0.28cqw] rounded-full text-[#C8B282]/80 opacity-0 group-hover:opacity-100 hover:text-[#FFF3CC] hover:bg-white/10 transition-all cursor-pointer"
              title="Open Full Timesheet & Hours Log (PG-038-TIM)"
              aria-label="Open Full Timesheet"
            >
              <Clock className="w-[0.95cqw] h-[0.95cqw]" />
            </button>
          </div>

          {/* Card 2: WORKSTATION — Enter Your Workspace (Student Workspaces PG-004) */}
          <button
            type="button"
            onClick={() => setLocation("/students")}
            className="wp-ws-arrival-hitbox"
            style={{ left: "36.2%", top: "74.0%", width: "27.5%", height: "16.5%" }}
            title="Enter Your Workspace (Student Workspaces)"
          >
            <div
              className="wp-ws-arrival-plate"
              style={{ left: "34%", top: "14%", width: "62%", height: "72%" }}
            >
              <div className="wp-ws-arrival-title">WORKSTATION</div>
              <div className="wp-ws-arrival-sub">Enter Your Workspace</div>
            </div>
          </button>

          {/* Card 3: MESSAGING — Check & Respond (Crew Messages PG-038-MSG) */}
          <button
            type="button"
            onClick={() => setLocation("/crew-quarters?tab=messages")}
            className="wp-ws-arrival-hitbox"
            style={{ left: "66.4%", top: "74.0%", width: "25.2%", height: "16.5%" }}
            title="Open Crew Messages Workspace"
          >
            <div
              className="wp-ws-arrival-plate"
              style={{ left: "38%", top: "14%", width: "58%", height: "72%" }}
            >
              <div className="wp-ws-arrival-title">MESSAGING</div>
              <div className="wp-ws-arrival-sub flex items-center gap-[0.35cqw]">
                <span>Check &amp; Respond</span>
                {unreadTotal > 0 && (
                  <span className="inline-flex items-center justify-center px-[0.38cqw] py-[0.06cqw] rounded-full bg-amber-400/95 text-[#1A1003] font-sans not-italic font-extrabold text-[0.68cqw] shadow-[0_0_8px_rgba(251,191,36,0.75)]">
                    {unreadTotal}
                  </span>
                )}
              </div>
            </div>
          </button>
        </div>
      </div>
    </ScopedErrorBoundary>
  );
}
