import React, { createContext, useContext, useState, useRef, useEffect, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  ObservatoryAudioEngine,
  FOCUS_STATIONS,
  EMPTY_AMBIANCE,
  type FocusStationId,
  type FocusStationConfig,
  type AmbianceLevels,
  type PlaybackStatusSnapshot,
} from "@/lib/observatoryAudioEngine";
import {
  DEFAULT_WAYPOINT_RADIO_SETTINGS,
  type WaypointRadioSettings,
  type WaypointRadioTrack,
} from "@shared/waypointRadio";

const STATION_STORAGE_KEY = "waypoint_radio_station_v3";
const REPEAT_STORAGE_KEY = "waypoint_radio_repeat_pref_v1";

interface ObservatoryRadioContextValue {
  stationId: FocusStationId;
  activeStation: FocusStationConfig;
  isMusicPlaying: boolean;
  hasActiveAmbiance: boolean;
  isPlaying: boolean;
  isMuted: boolean;
  repeatEnabled: boolean;
  ambiance: AmbianceLevels;
  currentTrack: WaypointRadioTrack | null;
  currentTrackIndex: number;
  activeStationTrackCount: number;
  isPlayingAnnouncement: boolean;
  activeAnnouncementTitle: string | null;
  tracks: WaypointRadioTrack[];
  settings: WaypointRadioSettings;
  isRadioAdmin: boolean;
  refetchLibrary: () => void;
  selectStation: (nextId: FocusStationId, autoStart?: boolean) => void;
  stepStation: (delta: number) => void;
  toggleMusic: () => void;
  toggleRepeat: () => void;
  stopRadio: () => void;
  toggleMute: () => void;
  setAmbianceChannel: (channel: keyof AmbianceLevels, val: number) => void;
}

const ObservatoryRadioContext = createContext<ObservatoryRadioContextValue | null>(null);

export function ObservatoryRadioProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const isStaff = Boolean(user && user.role !== "client");

  const { data: libraryData, refetch: refetchLibraryQuery } = trpc.waypointRadio.getLibrary.useQuery(
    undefined,
    {
      enabled: isStaff,
      refetchOnWindowFocus: false,
      staleTime: 15000,
    }
  );

  const tracks = useMemo<WaypointRadioTrack[]>(
    () => libraryData?.tracks ?? [],
    [libraryData?.tracks]
  );
  const settings = useMemo<WaypointRadioSettings>(
    () => libraryData?.settings ?? DEFAULT_WAYPOINT_RADIO_SETTINGS,
    [libraryData?.settings]
  );
  const isClientAdmin = Boolean(
    user &&
      Number(user.id) !== 9060031 &&
      (user as any).openId !== "katkins-admin-openid" &&
      (user.role === "admin" || Number(user.id) === 1)
  );
  const isRadioAdmin = Boolean(libraryData?.isAdmin || isClientAdmin);

  const [stationId, setStationId] = useState<FocusStationId>(() => {
    try {
      const saved = localStorage.getItem(STATION_STORAGE_KEY) as FocusStationId | null;
      if (saved && FOCUS_STATIONS.some((s) => s.id === saved)) return saved;
    } catch {
      // ignore storage failures
    }
    return FOCUS_STATIONS[0].id;
  });

  const [repeatEnabled, setRepeatEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(REPEAT_STORAGE_KEY);
      if (saved === "true") return true;
      if (saved === "false") return false;
    } catch {
      // ignore
    }
    return true;
  });

  const activeStation = useMemo(
    () => FOCUS_STATIONS.find((s) => s.id === stationId) || FOCUS_STATIONS[0],
    [stationId]
  );

  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<WaypointRadioTrack | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlayingAnnouncement, setIsPlayingAnnouncement] = useState(false);
  const [activeAnnouncementTitle, setActiveAnnouncementTitle] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [ambiance, setAmbiance] = useState<AmbianceLevels>(() => ({ ...EMPTY_AMBIANCE }));

  const hasActiveAmbiance = useMemo(
    () =>
      ambiance.fan > 0.02 ||
      ambiance.rain > 0.02 ||
      ambiance.ocean > 0.02 ||
      ambiance.train > 0.02 ||
      ambiance.coffeeShop > 0.02 ||
      ambiance.thunder > 0.02,
    [ambiance]
  );
  const isPlaying = isMusicPlaying || hasActiveAmbiance;

  const activeStationTrackCount = useMemo(
    () => tracks.filter((t) => t.kind === "music" && t.stationId === stationId && t.enabled).length,
    [tracks, stationId]
  );

  const engineRef = useRef<ObservatoryAudioEngine | null>(null);
  const isMusicPlayingRef = useRef(isMusicPlaying);
  isMusicPlayingRef.current = isMusicPlaying;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;

  const getEngine = useCallback(() => {
    if (!engineRef.current) {
      const eng = new ObservatoryAudioEngine();
      eng.setRepeat(repeatEnabled);
      eng.syncLibrary(tracks, settings);
      eng.setStatusListener((snap: PlaybackStatusSnapshot) => {
        setIsMusicPlaying(snap.isMusicPlaying);
        setCurrentTrack(snap.currentTrack);
        setCurrentTrackIndex(snap.currentTrackIndex);
        setIsPlayingAnnouncement(snap.isPlayingAnnouncement);
        setActiveAnnouncementTitle(snap.activeAnnouncementTitle);
      });
      engineRef.current = eng;
    }
    return engineRef.current;
  }, [repeatEnabled, tracks, settings]);

  // Keep engine synced live whenever library tracks or playback settings change
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.syncLibrary(tracks, settings);
    }
  }, [tracks, settings]);

  // Keep repeat preference synced with engine & employee localStorage
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setRepeat(repeatEnabled);
    }
  }, [repeatEnabled]);

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

      // Clicking the already-playing station pill toggles music cleanly without touching ambient sliders
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
      eng.syncLibrary(tracks, settings);
      if (autoStart) {
        const started = eng.startStationMusic(nextId, 0);
        if (started && isMutedRef.current) {
          eng.setMuted(false);
          setIsMuted(false);
        }
        setIsMusicPlaying(started);
      }
    },
    [getEngine, stationId, tracks, settings]
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
      eng.syncLibrary(tracks, settings);
      const started = eng.startStationMusic(nextSt.id, 0);
      if (started && isMutedRef.current) {
        eng.setMuted(false);
        setIsMuted(false);
      }
      setIsMusicPlaying(started);
    },
    [stationId, getEngine, tracks, settings]
  );

  const toggleMusic = useCallback(() => {
    const eng = getEngine();
    eng.syncLibrary(tracks, settings);
    if (isMusicPlayingRef.current) {
      eng.stopMusic();
      setIsMusicPlaying(false);
    } else {
      const started = eng.startStationMusic(stationId, 0);
      if (started && isMutedRef.current) {
        eng.setMuted(false);
        setIsMuted(false);
      }
      setIsMusicPlaying(started);
    }
  }, [getEngine, stationId, tracks, settings]);

  const toggleRepeat = useCallback(() => {
    setRepeatEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(REPEAT_STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      engineRef.current?.setRepeat(next);
      return next;
    });
  }, []);

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
      eng.syncLibrary(tracks, settings);
      if (cleanVal > 0 && isMutedRef.current) {
        eng.setMuted(false);
        setIsMuted(false);
      }
      eng.setAmbianceLevel(channel, cleanVal);
    },
    [getEngine, tracks, settings]
  );

  const refetchLibrary = useCallback(() => {
    void refetchLibraryQuery();
  }, [refetchLibraryQuery]);

  const value = useMemo<ObservatoryRadioContextValue>(
    () => ({
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
      refetchLibrary,
      selectStation,
      stepStation,
      toggleMusic,
      toggleRepeat,
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
      refetchLibrary,
      selectStation,
      stepStation,
      toggleMusic,
      toggleRepeat,
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
