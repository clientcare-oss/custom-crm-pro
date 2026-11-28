import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Volume2, VolumeX, Clock, Power, Settings, Repeat } from "lucide-react";
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
import { WaypointRadioSettingsModal } from "@/components/workstation/WaypointRadioSettingsModal";
import { FOCUS_STATIONS, type FocusStationId } from "@/lib/observatoryAudioEngine";
import { useObservatoryRadio } from "@/contexts/ObservatoryRadioContext";
import {
  loadTimeClockState,
  computeLiveTotals,
  formatHMS,
  type TimeClockDayState,
} from "@/lib/employeeTimeClock";
import "@/styles/workstationObservatory.css";

export default function MyWorkstation() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [radioSettingsOpen, setRadioSettingsOpen] = useState(false);

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
    repeatEnabled,
    ambiance,
    currentTrack,
    currentTrackIndex,
    activeStationTrackCount,
    isPlayingAnnouncement,
    activeAnnouncementTitle,
    tracks,
    settings,
    isRadioAdmin,
    selectStation,
    stepStation,
    toggleMusic,
    toggleRepeat,
    stopRadio,
    setAmbianceChannel,
  } = useObservatoryRadio();

  // Sequential incandescent dial lamp relay: previous station fades OFF completely (250ms), THEN next lights UP
  const [litStationId, setLitStationId] = useState<FocusStationId | null>(stationId);
  const prevStationRef = useRef<FocusStationId>(stationId);
  const lampTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (prevStationRef.current === stationId) return;
    prevStationRef.current = stationId;
    if (lampTimerRef.current !== null) {
      window.clearTimeout(lampTimerRef.current);
      lampTimerRef.current = null;
    }
    // Step 1: extinguish current station lamp cleanly
    setLitStationId(null);
    // Step 2: once faded off, warm up and illuminate the newly selected station lamp
    lampTimerRef.current = window.setTimeout(() => {
      setLitStationId(stationId);
      lampTimerRef.current = null;
    }, 260);

    return () => {
      if (lampTimerRef.current !== null) {
        window.clearTimeout(lampTimerRef.current);
        lampTimerRef.current = null;
      }
    };
  }, [stationId]);

  const handleSelectStation = (nextId: FocusStationId) => {
    const stationTrackCount = tracks.filter(
      (t) => t.kind === "music" && t.stationId === nextId && t.enabled
    ).length;
    selectStation(nextId, true);
    if (stationTrackCount === 0) {
      const target = FOCUS_STATIONS.find((s) => s.id === nextId);
      toast.info(
        isRadioAdmin
          ? `${target?.name ?? "Station"} selected — upload songs via the radio settings gear to start playback.`
          : `${target?.name ?? "Station"} has no songs uploaded yet.`
      );
    }
  };

  const handleToggleCrtMusic = () => {
    if (!isMusicPlaying && activeStationTrackCount === 0) {
      toast.info(
        isRadioAdmin
          ? `No songs uploaded to ${activeStation.name} yet — click the radio settings gear to upload music.`
          : `No songs uploaded to ${activeStation.name} yet.`
      );
      return;
    }
    toggleMusic();
  };

  // Synced live Employee Time Clock state (from PG-055 Employee Time Clock)
  const [timeClockState, setTimeClockState] = useState<TimeClockDayState>(() => loadTimeClockState());
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const syncClock = () => setTimeClockState(loadTimeClockState());
    window.addEventListener("waypoint-time-clock-updated", syncClock);
    window.addEventListener("storage", syncClock);
    return () => {
      window.removeEventListener("waypoint-time-clock-updated", syncClock);
      window.removeEventListener("storage", syncClock);
    };
  }, []);

  useEffect(() => {
    if (timeClockState.status === "clocked_out") return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [timeClockState.status]);

  const timeClockTotals = computeLiveTotals(timeClockState, nowMs);
  const isShiftActive = timeClockState.status !== "clocked_out";

  const crtSubtitle = isPlayingAnnouncement && activeAnnouncementTitle
    ? `${activeStation.frequency} · ${activeAnnouncementTitle}`
    : isMusicPlaying && currentTrack
      ? `${activeStation.frequency} · ${currentTrackIndex + 1}/${Math.max(1, activeStationTrackCount)} · ${currentTrack.title}`
      : hasActiveAmbiance
        ? `${activeStation.frequency} · AMBIANCE LOOP`
        : activeStation.frequency;

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

          {/* ── 1. INTERACTIVE CRT MONITOR (Click to Play / Stop Sequential Station Playlist) ── */}
          <button
            type="button"
            onClick={handleToggleCrtMusic}
            className="wp-ws-crt-zone group"
            title={isMusicPlaying ? "Stop Station Music" : `Start ${activeStation.crtTitle}`}
            aria-label={`Focus Radio CRT — ${activeStation.crtTitle}. Click to ${isMusicPlaying ? "stop" : "play"} music.`}
          >
            {/* Subtle ON AIR / Audio status indicator */}
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

            <div className="relative z-10 font-serif italic text-[1.58cqw] leading-tight text-[#FAF4E4] drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] mt-[0.15cqw]">
              {activeStation.crtTitle}
            </div>

            <div className="relative z-10 max-w-full truncate px-[0.3cqw] font-serif text-[0.58cqw] tracking-[0.13em] uppercase text-[#C9DCF5]/90 mt-[0.35cqw] drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
              {crtSubtitle}
            </div>
          </button>

          {/* ── 2. UPPER-RIGHT TUNING DIAL (5 Waypoint Radio Stations — Sequential Glow Lamps) ── */}
          <div className="wp-ws-dial-zone" role="tablist" aria-label="Waypoint Radio Stations">
            <div className="flex items-center justify-between gap-[0.12cqw] px-[0.1cqw]">
              {FOCUS_STATIONS.map((st) => {
                const isSelected = st.id === stationId;
                const isLit = st.id === litStationId;
                return (
                  <button
                    key={st.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => handleSelectStation(st.id)}
                    className={`wp-ws-station-btn ${isLit ? "wp-ws-station-btn-active" : ""}`}
                    title={`${st.name} (${st.frequency}) — sequential station playlist`}
                  >
                    <span className="relative z-10">{st.dialLabel}</span>
                  </button>
                );
              })}
            </div>

            {/* Subtle Official FM Frequency Markers Aligned Above the Tuning Ruler */}
            <div className="wp-ws-dial-freqs" aria-hidden="true">
              {FOCUS_STATIONS.map((st) => (
                <span
                  key={st.id}
                  className={st.id === litStationId ? "wp-ws-dial-freq-active" : ""}
                >
                  {st.shortFrequency}
                </span>
              ))}
            </div>

            {/* Gliding Glowing Amber Frequency Needle along the physical ruler line */}
            <div
              className="wp-ws-dial-needle"
              style={{ left: `${activeStation.dialPercent}%` }}
              aria-hidden="true"
            />
          </div>

          {/* ── 2A. UNDERSTATED RECESSED PLAYLIST REPEAT TOGGLE (Remembers Employee Preference) ── */}
          <button
            type="button"
            onClick={toggleRepeat}
            data-testid="workstation-radio-repeat-btn"
            aria-pressed={repeatEnabled}
            className={`wp-ws-recessed-icon-btn wp-ws-repeat-btn ${repeatEnabled ? "wp-ws-recessed-icon-btn-active" : ""
              }`}
            title={
              repeatEnabled
                ? "Playlist Repeat: ON (loops back to song #1 after final song)"
                : "Playlist Repeat: OFF (stops after final song)"
            }
            aria-label={`Playlist repeat ${repeatEnabled ? "enabled" : "disabled"}`}
          >
            <Repeat className="w-[0.9cqw] h-[0.9cqw]" />
          </button>

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

          {/* ── 2C. UNDERSTATED ADMIN-ONLY RECESSED BRUSHED-BRASS SETTINGS GEAR ── */}
          {isRadioAdmin && (
            <button
              type="button"
              onClick={() => setRadioSettingsOpen(true)}
              data-testid="workstation-radio-settings-gear"
              className="wp-ws-recessed-icon-btn wp-ws-gear-btn"
              title="Waypoint Radio Settings (Admin)"
              aria-label="Open Waypoint Radio Settings"
            >
              <Settings className="w-[0.92cqw] h-[0.92cqw]" />
            </button>
          )}

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
            title={`Station Select: ${activeStation.name} (click to tune next)`}
            aria-label={`Station Select knob — current station ${activeStation.name}`}
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

          {/* ── 4. SIX DRAGGABLE ILLUMINATED BRASS VERTICAL AMBIANCE SLIDERS ── */}
          <div className="wp-ws-sliders-zone">
            <AmbianceVerticalSlider
              label="Fan"
              value={ambiance.fan}
              defaultOnValue={settings.ambientDefaultVolumes.fan}
              icon={<AmbianceGlyph type="fan" />}
              onChange={(v) => setAmbianceChannel("fan", v)}
            />
            <AmbianceVerticalSlider
              label="Rain"
              value={ambiance.rain}
              defaultOnValue={settings.ambientDefaultVolumes["rain-shower"]}
              icon={<AmbianceGlyph type="rain" />}
              onChange={(v) => setAmbianceChannel("rain", v)}
            />
            <AmbianceVerticalSlider
              label="Ocean"
              value={ambiance.ocean}
              defaultOnValue={settings.ambientDefaultVolumes.ocean}
              icon={<AmbianceGlyph type="ocean" />}
              onChange={(v) => setAmbianceChannel("ocean", v)}
            />
            <AmbianceVerticalSlider
              label="Train on Tracks (No Horn)"
              value={ambiance.train}
              defaultOnValue={settings.ambientDefaultVolumes.train}
              icon={<AmbianceGlyph type="train" />}
              onChange={(v) => setAmbianceChannel("train", v)}
            />
            <AmbianceVerticalSlider
              label="Coffee Shop"
              value={ambiance.coffeeShop}
              defaultOnValue={settings.ambientDefaultVolumes["coffee-shop"]}
              icon={<AmbianceGlyph type="coffeeShop" />}
              onChange={(v) => setAmbianceChannel("coffeeShop", v)}
            />
            <AmbianceVerticalSlider
              label="Thunder"
              value={ambiance.thunder}
              defaultOnValue={settings.ambientDefaultVolumes.thunder}
              icon={<AmbianceGlyph type="thunder" />}
              onChange={(v) => setAmbianceChannel("thunder", v)}
            />
          </div>

          {/* ── 5. LOWER EMPLOYEE ARRIVAL INTERACTIVE BRASS CARDS ── */}
          {/* Card 1: TIME CLOCK — Opens Employee Time Clock (PG-055) with Live Shift Status */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setLocation("/my-workstation/time-clock")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setLocation("/my-workstation/time-clock");
              }
            }}
            className="wp-ws-arrival-hitbox group"
            style={{ left: "7.4%", top: "71.8%", width: "25.8%", height: "19.8%" }}
            title="Open Employee Time Clock (PG-055)"
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
              {isShiftActive ? (
                <div className="flex items-center gap-[0.3cqw] mt-[0.35cqw]">
                  <span
                    className={`inline-block w-[0.45cqw] h-[0.45cqw] rounded-full ${timeClockState.status === "working"
                      ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                      : "bg-amber-400 shadow-[0_0_8px_#fbbf24]"
                      }`}
                  />
                  <span className="font-mono text-[0.78cqw] font-bold text-[#9BF5C8] drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]">
                    {timeClockState.status === "on_break"
                      ? `Break · ${formatHMS(timeClockTotals.currentSegmentMs)}`
                      : timeClockState.status === "on_lunch"
                        ? `Lunch · ${formatHMS(timeClockTotals.currentSegmentMs)}`
                        : formatHMS(timeClockTotals.workedMs)}
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

          {/* Card 2: WORKSTATION — Enter Your Workspace (Employee Workstation Zone PG-053) */}
          <button
            type="button"
            onClick={() => setLocation("/my-workstation/zone")}
            className="wp-ws-arrival-hitbox"
            style={{ left: "36.2%", top: "74.0%", width: "27.5%", height: "16.5%" }}
            title="Enter Your Employee Workstation Zone (PG-053)"
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

      {/* Admin-Only In-Place Waypoint Radio Settings Pop-Up Modal (Never Interrupts Playback) */}
      <WaypointRadioSettingsModal
        open={radioSettingsOpen}
        onClose={() => setRadioSettingsOpen(false)}
      />
    </ScopedErrorBoundary>
  );
}
