import React, { createContext, useContext, useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  ObservatoryAudioEngine,
  FOCUS_STATIONS,
  EMPTY_AMBIANCE,
  type FocusStationId,
  type FocusStationConfig,
  type AmbianceLevels,
} from "@/lib/observatoryAudioEngine";

const STATION_STORAGE_KEY = "waypoint_workstation_station";

interface ObservatoryRadioContextValue {
  stationId: FocusStationId;
  activeStation: FocusStationConfig;
  /** True only if a custom music track is actively playing on the selected station */
  isMusicPlaying: boolean;
  /** True if any of the 4 bottom ambient noise sliders is above 0 */
  hasActiveAmbiance: boolean;
  /** True if ANY real audio (ambient sound or custom station music) is currently playing */
  isPlaying: boolean;
  isMuted: boolean;
  ambiance: AmbianceLevels;
  /** Select a top music station — never touches ambient sliders and never plays a hum */
  selectStation: (nextId: FocusStationId, autoStart?: boolean) => void;
  /** Step to next/previous music station — never touches ambient sliders */
  stepStation: (delta: number) => void;
  /** Toggle custom station music if configured */
  toggleMusic: () => void;
  /** Turn the ENTIRE radio cleanly OFF (stops music AND zeroes all 4 ambient sliders) */
  stopRadio: () => void;
  /** Mute/unmute master output without losing your active mix */
  toggleMute: () => void;
  /** Adjust a single bottom ambient channel independently */
  setAmbianceChannel: (channel: keyof AmbianceLevels, val: number) => void;
}

const ObservatoryRadioContext = createContext<ObservatoryRadioContextValue | null>(null);

export function ObservatoryRadioProvider({ children }: { children: React.ReactNode }) {
  const [stationId, setStationId] = useState<FocusStationId>(() => {
    try {
      const saved = localStorage.getItem(STATION_STORAGE_KEY) as FocusStationId | null;
      if (saved && FOCUS_STATIONS.some((s) => s.id === saved)) return saved;
    } catch {
      // ignore storage failures
    }
    return "focus";
  });

  const activeStation = useMemo(
    () => FOCUS_STATIONS.find((s) => s.id === stationId) || FOCUS_STATIONS[0],
    [stationId]
  );

  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [ambiance, setAmbiance] = useState<AmbianceLevels>(() => ({ ...EMPTY_AMBIANCE }));

  const hasActiveAmbiance = useMemo(
    () => ambiance.wind > 0.02 || ambiance.rain > 0.02 || ambiance.ocean > 0.02 || ambiance.forest > 0.02,
    [ambiance]
  );
  const isPlaying = isMusicPlaying || hasActiveAmbiance;

  const engineRef = useRef<ObservatoryAudioEngine | null>(null);
  const isMusicPlayingRef = useRef(isMusicPlaying);
  isMusicPlayingRef.current = isMusicPlaying;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;

  const getEngine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = new ObservatoryAudioEngine();
    }
    return engineRef.current;
  }, []);

  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  const selectStation = useCallback(
    (nextId: FocusStationId, autoStart = true) => {
      const st = FOCUS_STATIONS.find((s) => s.id === nextId);
      if (!st) return;

      if (nextId === stationId && isMusicPlayingRef.current && autoStart) {
        engineRef.current?.stopMusic();
        setIsMusicPlaying(false);
        return;
      }

      setStationId(nextId);
      try {
        localStorage.setItem(STATION_STORAGE_KEY, nextId);
      } catch {
        // ignore
      }

      const eng = getEngine();
      if (autoStart) {
        const started = eng.startStationMusic(nextId);
        if (started && isMutedRef.current) {
          eng.setMuted(false);
          setIsMuted(false);
        }
        setIsMusicPlaying(started);
      }
    },
    [getEngine, stationId]
  );

  const stepStation = useCallback(
    (delta: number) => {
      const idx = FOCUS_STATIONS.findIndex((s) => s.id === stationId);
      const nextIdx = (idx + delta + FOCUS_STATIONS.length) % FOCUS_STATIONS.length;
      const nextSt = FOCUS_STATIONS[nextIdx];
      setStationId(nextSt.id);
      try {
        localStorage.setItem(STATION_STORAGE_KEY, nextSt.id);
      } catch {
        // ignore
      }
      const eng = getEngine();
      const started = eng.startStationMusic(nextSt.id);
      setIsMusicPlaying(started);
    },
    [stationId, getEngine]
  );

  const toggleMusic = useCallback(() => {
    const eng = getEngine();
    if (isMusicPlayingRef.current) {
      eng.stopMusic();
      setIsMusicPlaying(false);
    } else {
      const started = eng.startStationMusic(stationId);
      if (started && isMutedRef.current) {
        eng.setMuted(false);
        setIsMuted(false);
      }
      setIsMusicPlaying(started);
    }
  }, [getEngine, stationId]);

  const stopRadio = useCallback(() => {
    engineRef.current?.stopAll();
    setIsMusicPlaying(false);
    setIsMuted(false);
    setAmbiance({ ...EMPTY_AMBIANCE });
  }, []);

  const toggleMute = useCallback(() => {
    if (!isPlayingRef.current) return;
    setIsMuted((prev) => {
      const next = !prev;
      engineRef.current?.setMuted(next);
      return next;
    });
  }, []);

  const setAmbianceChannel = useCallback(
    (channel: keyof AmbianceLevels, val: number) => {
      const cleanVal = val < 0.03 ? 0 : Math.min(1, val);
      setAmbiance((prev) => ({ ...prev, [channel]: cleanVal }));
      const eng = getEngine();
      if (cleanVal > 0 && isMutedRef.current) {
        eng.setMuted(false);
        setIsMuted(false);
      }
      eng.setAmbianceLevel(channel, cleanVal);
    },
    [getEngine]
  );

  const value = useMemo<ObservatoryRadioContextValue>(
    () => ({
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
      toggleMute,
      setAmbianceChannel,
    }),
    [
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
      toggleMute,
      setAmbianceChannel,
    ]
  );

  return (
    <ObservatoryRadioContext.Provider value={value}>
      {children}
    </ObservatoryRadioContext.Provider>
  );
}

export function useObservatoryRadio(): ObservatoryRadioContextValue {
  const ctx = useContext(ObservatoryRadioContext);
  if (!ctx) {
    throw new Error("useObservatoryRadio must be used within an ObservatoryRadioProvider");
  }
  return ctx;
}
