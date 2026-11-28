/**
 * Waypoint Radio & Observatory Soundscape Engine
 *
 * Key guarantees:
 * 1. Strictly Sequential Music Playback (ZERO shuffle / ZERO randomization):
 *    - Plays uploaded MP3/WAV tracks for the selected official station strictly in saved `sortOrder`.
 *    - 3-second default music fade-in, 5-second default music fade-out, smooth crossfade transitions,
 *      and gentle DynamicsCompressor loudness leveling for consistent perceived volume.
 *    - Spoken announcements and commercials play between songs with ZERO fade-in, ZERO fade-out,
 *      and ZERO crossfade.
 *    - Prevents multiple stations from playing simultaneously (except during intentional crossfade).
 *    - Respects employee Repeat ON / Repeat OFF preference cleanly.
 * 2. Zero ambient hum when silent & 6 independent seamless ambient channels:
 *    - Fan, Rain, Ocean, Train on Tracks (No Horn), Coffee Shop (Mug icon), Thunder.
 *    - Each channel supports 5 selectable built-in acoustic presets (hot-swapped live!) OR
 *      custom uploaded MP3/WAV files with equal-power loop crossfading.
 */

import {
  WAYPOINT_RADIO_STATIONS,
  DEFAULT_WAYPOINT_RADIO_SETTINGS,
  type AmbientCategoryId,
  type RadioStationDefinition,
  type RadioStationId,
  type WaypointRadioSettings,
  type WaypointRadioTrack,
} from "@shared/waypointRadio";
import {
  createBuiltInAmbientSpec,
  connectAmbientSpecChain,
  makeSeamlessLoopBuffer,
  type BuiltInAmbientSpec,
} from "./ambientSoundGenerators";

export { makeSeamlessLoopBuffer, createBuiltInAmbientSpec, connectAmbientSpecChain };

export type FocusStationId = RadioStationId;
export type FocusStationConfig = RadioStationDefinition;
export const FOCUS_STATIONS = WAYPOINT_RADIO_STATIONS;

export interface AmbianceLevels {
  fan: number;
  rain: number;
  ocean: number;
  train: number;
  coffeeShop: number;
  thunder: number;
}

export type AmbianceChannelKey = keyof AmbianceLevels;

export const EMPTY_AMBIANCE: AmbianceLevels = {
  fan: 0,
  rain: 0,
  ocean: 0,
  train: 0,
  coffeeShop: 0,
  thunder: 0,
};

const CHANNEL_TO_CATEGORY: Record<AmbianceChannelKey, AmbientCategoryId> = {
  fan: "fan",
  rain: "rain-shower",
  ocean: "ocean",
  train: "train",
  coffeeShop: "coffee-shop",
  thunder: "thunder",
};

export interface PlaybackStatusSnapshot {
  stationId: RadioStationId;
  isMusicPlaying: boolean;
  currentTrack: WaypointRadioTrack | null;
  currentTrackIndex: number;
  playlistLength: number;
  isPlayingAnnouncement: boolean;
  activeAnnouncementTitle: string | null;
}

interface MusicDeck {
  el: HTMLAudioElement;
  source: MediaElementAudioSourceNode;
  gain: GainNode;
  trackId: number | null;
  crossfadeTriggered: boolean;
  fadeOutTriggered: boolean;
}

function emptyChannelMap<T>(val: T): Record<AmbianceChannelKey, T> {
  return { fan: val, rain: val, ocean: val, train: val, coffeeShop: val, thunder: val };
}

export class ObservatoryAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicMasterGain: GainNode | null = null;
  private musicCompressor: DynamicsCompressorNode | null = null;
  private announcementGain: GainNode | null = null;

  private decks: [MusicDeck | null, MusicDeck | null] = [null, null];
  private activeDeckIdx: 0 | 1 = 0;
  private announcementEl: HTMLAudioElement | null = null;
  private announcementSource: MediaElementAudioSourceNode | null = null;

  // Built-in preset ambient nodes (lazily created & live hot-swappable!)
  private synthAmbianceSources = emptyChannelMap<AudioBufferSourceNode | null>(null);
  private synthAmbianceGains = emptyChannelMap<GainNode | null>(null);
  private synthAmbianceScales = emptyChannelMap<number>(0.4);
  private activePresetIds = emptyChannelMap<string>("");
  private builtInSpecCache = new Map<string, BuiltInAmbientSpec>();

  // Custom uploaded seamless ambient audio buffer players
  private customAmbianceSources = emptyChannelMap<AudioBufferSourceNode | null>(null);
  private customAmbianceGains = emptyChannelMap<GainNode | null>(null);
  private customAmbianceUrls = emptyChannelMap<string | null>(null);
  private decodedAmbientCache = new Map<string, AudioBuffer>();

  // State
  private levels: AmbianceLevels = { ...EMPTY_AMBIANCE };
  private muted = false;
  private settings: WaypointRadioSettings = { ...DEFAULT_WAYPOINT_RADIO_SETTINGS };
  private repeatEnabled = true;

  // Library snapshot (strictly sequential — NEVER shuffled)
  private allTracks: WaypointRadioTrack[] = [];
  private activeStationId: RadioStationId = "the-lobby";
  private isMusicPlaying = false;
  private currentTrackId: number | null = null;
  private currentTrackIndex = 0;
  private songsPlayedSinceAnnouncement = 0;
  private songsPlayedSinceCommercial = 0;
  private announcementCursorByScope = new Map<string, number>();
  private commercialCursor = 0;
  private isPlayingAnnouncement = false;
  private activeAnnouncementTitle: string | null = null;
  private playbackGeneration = 0;
  private onStatusChange: ((snap: PlaybackStatusSnapshot) => void) | null = null;

  public setStatusListener(cb: ((snap: PlaybackStatusSnapshot) => void) | null) {
    this.onStatusChange = cb;
  }

  private emitStatus() {
    if (!this.onStatusChange) return;
    const playlist = this.getStationMusicPlaylist(this.activeStationId);
    const currentTrack =
      this.currentTrackId !== null
        ? playlist.find((t) => t.id === this.currentTrackId) || null
        : null;
    const idx = currentTrack ? playlist.findIndex((t) => t.id === currentTrack.id) : -1;
    this.onStatusChange({
      stationId: this.activeStationId,
      isMusicPlaying: this.isMusicPlaying,
      currentTrack,
      currentTrackIndex: idx >= 0 ? idx : this.currentTrackIndex,
      playlistLength: playlist.length,
      isPlayingAnnouncement: this.isPlayingAnnouncement,
      activeAnnouncementTitle: this.activeAnnouncementTitle,
    });
  }

  public getStationMusicPlaylist(stationId: RadioStationId): WaypointRadioTrack[] {
    return this.allTracks
      .filter((t) => t.kind === "music" && t.stationId === stationId && t.enabled)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  }

  private getStationAnnouncements(stationId: RadioStationId): WaypointRadioTrack[] {
    const stationSpecific = this.allTracks
      .filter((t) => t.kind === "announcement" && t.stationId === stationId && t.enabled)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
    if (stationSpecific.length > 0) return stationSpecific;
    return this.allTracks
      .filter((t) => t.kind === "general_announcement" && t.enabled)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  }

  private getCommercials(): WaypointRadioTrack[] {
    return this.allTracks
      .filter((t) => t.kind === "commercial" && t.enabled)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  }

  private getLatestEnabledAmbientUrl(category: AmbientCategoryId): string | null {
    const items = this.allTracks
      .filter((t) => t.kind === "ambience" && t.ambientCategory === category && t.enabled)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
    return items.length > 0 ? items[items.length - 1].fileUrl : null;
  }

  private getConfiguredPresetId(channel: AmbianceChannelKey): string {
    const cat = CHANNEL_TO_CATEGORY[channel];
    return (
      this.settings.ambientPresetByCategory?.[cat] ||
      DEFAULT_WAYPOINT_RADIO_SETTINGS.ambientPresetByCategory[cat]
    );
  }

  /** Sync live track catalog and playback/ambient preset settings WITHOUT interrupting music */
  public syncLibrary(tracks: WaypointRadioTrack[], settings: WaypointRadioSettings) {
    this.allTracks = tracks;
    this.settings = settings;

    if (this.ctx && this.musicMasterGain) {
      this.musicMasterGain.gain.setTargetAtTime(settings.musicVolume, this.ctx.currentTime, 0.1);
    }
    if (this.ctx && this.announcementGain) {
      this.announcementGain.gain.setTargetAtTime(settings.announcementVolume, this.ctx.currentTime, 0.05);
    }

    if (this.currentTrackId !== null) {
      const playlist = this.getStationMusicPlaylist(this.activeStationId);
      const foundIdx = playlist.findIndex((t) => t.id === this.currentTrackId);
      if (foundIdx >= 0) this.currentTrackIndex = foundIdx;
    }

    (Object.keys(CHANNEL_TO_CATEGORY) as AmbianceChannelKey[]).forEach((ch) => {
      const cat = CHANNEL_TO_CATEGORY[ch];
      const nextUrl = this.getLatestEnabledAmbientUrl(cat);
      const urlChanged = nextUrl !== this.customAmbianceUrls[ch];
      if (urlChanged) {
        this.customAmbianceUrls[ch] = nextUrl;
        if (this.levels[ch] > 0) {
          void this.refreshAmbientChannelPlayback(ch);
        }
      }

      const desiredPreset = this.getConfiguredPresetId(ch);
      if (!this.customAmbianceUrls[ch] && this.activePresetIds[ch] && this.activePresetIds[ch] !== desiredPreset) {
        this.rebuildBuiltInChannel(ch, desiredPreset);
      }
    });

    this.emitStatus();
  }

  public setRepeat(enabled: boolean) {
    this.repeatEnabled = enabled;
  }

  private ensureContext() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : 1.0;
    master.connect(ctx.destination);
    this.masterGain = master;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 18;
    comp.ratio.value = 3.2;
    comp.attack.value = 0.008;
    comp.release.value = 0.25;
    this.musicCompressor = comp;

    const musicMaster = ctx.createGain();
    musicMaster.gain.value = this.settings.musicVolume;
    comp.connect(musicMaster);
    musicMaster.connect(master);
    this.musicMasterGain = musicMaster;

    const annGain = ctx.createGain();
    annGain.gain.value = this.settings.announcementVolume;
    annGain.connect(master);
    this.announcementGain = annGain;

    const annEl = new Audio();
    annEl.crossOrigin = "anonymous";
    annEl.preload = "auto";
    const annSource = ctx.createMediaElementSource(annEl);
    annSource.connect(annGain);
    this.announcementEl = annEl;
    this.announcementSource = annSource;

    this.decks = [this.createDeck(ctx, comp), this.createDeck(ctx, comp)];
  }

  /** Lazily creates or live-swaps the built-in preset soundscape for a single ambient slider */
  private rebuildBuiltInChannel(channel: AmbianceChannelKey, presetId: string) {
    if (!this.ctx || !this.masterGain) return;

    // Gracefully stop previous built-in source for this channel
    if (this.synthAmbianceSources[channel]) {
      try {
        this.synthAmbianceSources[channel]!.stop();
        this.synthAmbianceSources[channel]!.disconnect();
      } catch {
        // ignore
      }
      this.synthAmbianceSources[channel] = null;
    }
    if (this.synthAmbianceGains[channel]) {
      try {
        this.synthAmbianceGains[channel]!.disconnect();
      } catch {
        // ignore
      }
      this.synthAmbianceGains[channel] = null;
    }

    const cat = CHANNEL_TO_CATEGORY[channel];
    const cacheKey = `${cat}:${presetId}`;
    let spec = this.builtInSpecCache.get(cacheKey);
    if (!spec) {
      spec = createBuiltInAmbientSpec(this.ctx, cat, presetId);
      this.builtInSpecCache.set(cacheKey, spec);
    }

    const targetGain = this.customAmbianceUrls[channel] ? 0 : this.levels[channel] * spec.scale;
    const { source, gain } = connectAmbientSpecChain(this.ctx, spec, this.masterGain, 0);
    gain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.14);

    this.synthAmbianceSources[channel] = source;
    this.synthAmbianceGains[channel] = gain;
    this.synthAmbianceScales[channel] = spec.scale;
    this.activePresetIds[channel] = presetId;
  }

  private createDeck(ctx: AudioContext, dest: AudioNode): MusicDeck {
    const el = new Audio();
    el.crossOrigin = "anonymous";
    el.preload = "auto";
    const source = ctx.createMediaElementSource(el);
    const gain = ctx.createGain();
    gain.gain.value = 0;
    source.connect(gain);
    gain.connect(dest);
    const deck: MusicDeck = {
      el,
      source,
      gain,
      trackId: null,
      crossfadeTriggered: false,
      fadeOutTriggered: false,
    };

    el.addEventListener("timeupdate", () => {
      if (!this.isMusicPlaying || this.isPlayingAnnouncement) return;
      if (this.decks[this.activeDeckIdx] !== deck) return;
      if (deck.crossfadeTriggered) return;
      const dur = el.duration;
      if (!dur || !Number.isFinite(dur) || dur <= 0) return;

      const remaining = dur - el.currentTime;
      const interruptionDue = this.isInterruptionDueAfterCurrentSong();
      const playlist = this.getStationMusicPlaylist(this.activeStationId);
      const currIdx =
        this.currentTrackId !== null
          ? playlist.findIndex((t) => t.id === this.currentTrackId)
          : this.currentTrackIndex;
      const isFinalSongWithoutRepeat = !this.repeatEnabled && currIdx >= playlist.length - 1;

      if (interruptionDue || isFinalSongWithoutRepeat || this.settings.crossfadeSec <= 0.25) {
        const fadeOut = Math.min(this.settings.fadeOutSec, Math.max(0.5, dur * 0.3));
        if (!deck.fadeOutTriggered && fadeOut > 0.2 && remaining <= fadeOut && this.ctx) {
          deck.fadeOutTriggered = true;
          const now = this.ctx.currentTime;
          deck.gain.gain.cancelScheduledValues(now);
          deck.gain.gain.setValueAtTime(deck.gain.gain.value, now);
          deck.gain.gain.linearRampToValueAtTime(0.0001, now + Math.max(0.15, remaining));
        }
        return;
      }

      const xfade = Math.min(this.settings.crossfadeSec, Math.max(0, dur * 0.25));
      if (xfade > 0.25 && remaining <= xfade) {
        deck.crossfadeTriggered = true;
        void this.advanceSequentialTrack(true);
      }
    });

    el.addEventListener("ended", () => {
      if (!this.isMusicPlaying) return;
      if (this.decks[this.activeDeckIdx] !== deck) return;
      if (deck.crossfadeTriggered) return;
      deck.crossfadeTriggered = true;
      void this.advanceSequentialTrack(false);
    });

    return deck;
  }

  private wakeContext() {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 1.0, now, 0.08);
  }

  private isInterruptionDueAfterCurrentSong(): boolean {
    const annEvery = this.settings.announcementEveryNSongs;
    const commEvery = this.settings.commercialEveryNSongs;
    const hasAnn = this.getStationAnnouncements(this.activeStationId).length > 0;
    const hasComm = this.getCommercials().length > 0;
    if (commEvery > 0 && hasComm && this.songsPlayedSinceCommercial + 1 >= commEvery) return true;
    if (annEvery > 0 && hasAnn && this.songsPlayedSinceAnnouncement + 1 >= annEvery) return true;
    return false;
  }

  private playOneShotAnnouncement(track: WaypointRadioTrack, generation: number): Promise<void> {
    return new Promise((resolve) => {
      if (!this.announcementEl || !this.isMusicPlaying || generation !== this.playbackGeneration) {
        resolve();
        return;
      }
      const el = this.announcementEl;
      if (this.ctx && this.announcementGain) {
        const now = this.ctx.currentTime;
        this.announcementGain.gain.cancelScheduledValues(now);
        this.announcementGain.gain.setValueAtTime(this.settings.announcementVolume, now);
      }
      this.isPlayingAnnouncement = true;
      this.activeAnnouncementTitle = track.title;
      this.emitStatus();

      const finish = () => {
        el.onended = null;
        el.onerror = null;
        this.isPlayingAnnouncement = false;
        this.activeAnnouncementTitle = null;
        this.emitStatus();
        resolve();
      };

      el.onended = finish;
      el.onerror = finish;
      el.src = track.fileUrl;
      el.currentTime = 0;
      void el.play().catch(finish);
    });
  }

  private async advanceSequentialTrack(useCrossfade: boolean) {
    const gen = this.playbackGeneration;
    const playlist = this.getStationMusicPlaylist(this.activeStationId);
    if (!this.isMusicPlaying || playlist.length === 0) {
      this.stopMusic();
      return;
    }

    this.songsPlayedSinceAnnouncement += 1;
    this.songsPlayedSinceCommercial += 1;

    if (!useCrossfade) {
      const commEvery = this.settings.commercialEveryNSongs;
      const commercials = this.getCommercials();
      if (commEvery > 0 && commercials.length > 0 && this.songsPlayedSinceCommercial >= commEvery) {
        this.songsPlayedSinceCommercial = 0;
        const comm = commercials[this.commercialCursor % commercials.length];
        this.commercialCursor = (this.commercialCursor + 1) % commercials.length;
        await this.playOneShotAnnouncement(comm, gen);
        if (!this.isMusicPlaying || gen !== this.playbackGeneration) return;
      } else {
        const annEvery = this.settings.announcementEveryNSongs;
        const anns = this.getStationAnnouncements(this.activeStationId);
        if (annEvery > 0 && anns.length > 0 && this.songsPlayedSinceAnnouncement >= annEvery) {
          this.songsPlayedSinceAnnouncement = 0;
          const cur = this.announcementCursorByScope.get(this.activeStationId) || 0;
          const ann = anns[cur % anns.length];
          this.announcementCursorByScope.set(this.activeStationId, (cur + 1) % anns.length);
          await this.playOneShotAnnouncement(ann, gen);
          if (!this.isMusicPlaying || gen !== this.playbackGeneration) return;
        }
      }
    }

    const freshPlaylist = this.getStationMusicPlaylist(this.activeStationId);
    if (freshPlaylist.length === 0) {
      this.stopMusic();
      return;
    }

    const currIdx =
      this.currentTrackId !== null
        ? freshPlaylist.findIndex((t) => t.id === this.currentTrackId)
        : this.currentTrackIndex;
    const nextIdx = (currIdx >= 0 ? currIdx : this.currentTrackIndex) + 1;

    if (nextIdx >= freshPlaylist.length) {
      if (!this.repeatEnabled) {
        this.stopMusic();
        return;
      }
      this.currentTrackIndex = 0;
    } else {
      this.currentTrackIndex = nextIdx;
    }

    const nextTrack = freshPlaylist[this.currentTrackIndex];
    if (!nextTrack) {
      this.stopMusic();
      return;
    }
    this.playTrackOnNextDeck(nextTrack, useCrossfade ? this.settings.crossfadeSec : this.settings.fadeInSec);
  }

  private playTrackOnNextDeck(track: WaypointRadioTrack, fadeInSec: number) {
    this.wakeContext();
    if (!this.ctx) return;
    const prevDeck = this.decks[this.activeDeckIdx];
    const nextIdx: 0 | 1 = this.activeDeckIdx === 0 ? 1 : 0;
    const nextDeck = this.decks[nextIdx];
    if (!nextDeck) return;

    const now = this.ctx.currentTime;
    const fadeOutSec = Math.max(
      0.15,
      this.settings.crossfadeSec > 0 ? this.settings.crossfadeSec : this.settings.fadeOutSec
    );

    if (prevDeck && !prevDeck.el.paused) {
      prevDeck.gain.gain.cancelScheduledValues(now);
      prevDeck.gain.gain.setValueAtTime(prevDeck.gain.gain.value, now);
      prevDeck.gain.gain.linearRampToValueAtTime(0, now + fadeOutSec);
      const oldEl = prevDeck.el;
      window.setTimeout(() => {
        if (this.decks[this.activeDeckIdx] !== prevDeck) oldEl.pause();
      }, Math.round((fadeOutSec + 0.15) * 1000));
    }

    this.activeDeckIdx = nextIdx;
    this.currentTrackId = track.id;
    nextDeck.trackId = track.id;
    nextDeck.crossfadeTriggered = false;
    nextDeck.fadeOutTriggered = false;
    nextDeck.el.src = track.fileUrl;
    nextDeck.el.currentTime = 0;

    nextDeck.gain.gain.cancelScheduledValues(now);
    nextDeck.gain.gain.setValueAtTime(0.0001, now);
    nextDeck.gain.gain.linearRampToValueAtTime(1.0, now + Math.max(0.08, fadeInSec));

    void nextDeck.el.play().catch((err) => {
      console.warn("[WaypointRadio] Track playback error:", err);
    });

    this.emitStatus();
  }

  public startStationMusic(stationId: RadioStationId, startIndex = 0): boolean {
    this.activeStationId = stationId;
    const playlist = this.getStationMusicPlaylist(stationId);
    if (playlist.length === 0) {
      this.stopMusic();
      return false;
    }

    this.playbackGeneration += 1;
    if (this.announcementEl) {
      this.announcementEl.pause();
      this.isPlayingAnnouncement = false;
      this.activeAnnouncementTitle = null;
    }

    const safeIdx = Math.max(0, Math.min(playlist.length - 1, startIndex));
    this.currentTrackIndex = safeIdx;
    this.isMusicPlaying = true;
    this.songsPlayedSinceAnnouncement = 0;
    this.songsPlayedSinceCommercial = 0;

    this.playTrackOnNextDeck(playlist[safeIdx], this.settings.fadeInSec);
    return true;
  }

  public stopMusic() {
    this.playbackGeneration += 1;
    this.isMusicPlaying = false;
    this.currentTrackId = null;
    this.isPlayingAnnouncement = false;
    this.activeAnnouncementTitle = null;

    if (this.announcementEl) {
      this.announcementEl.pause();
      this.announcementEl.currentTime = 0;
    }

    const fadeOut = Math.max(0.12, this.settings.fadeOutSec);
    if (this.ctx) {
      const now = this.ctx.currentTime;
      this.decks.forEach((d) => {
        if (!d) return;
        d.gain.gain.cancelScheduledValues(now);
        d.gain.gain.setValueAtTime(d.gain.gain.value, now);
        d.gain.gain.linearRampToValueAtTime(0, now + fadeOut);
        const el = d.el;
        window.setTimeout(() => {
          if (!this.isMusicPlaying) el.pause();
        }, Math.round((fadeOut + 0.1) * 1000));
      });
    } else {
      this.decks.forEach((d) => d?.el.pause());
    }

    this.emitStatus();
    this.suspendContextIfAllSilent();
  }

  private async refreshAmbientChannelPlayback(channel: AmbianceChannelKey) {
    if (!this.ctx || !this.masterGain) return;
    const url = this.customAmbianceUrls[channel];
    const level = this.levels[channel];
    const now = this.ctx.currentTime;

    if (this.customAmbianceSources[channel]) {
      try {
        this.customAmbianceSources[channel]!.stop();
      } catch {
        // already stopped
      }
      this.customAmbianceSources[channel] = null;
    }

    if (!url || level <= 0) {
      if (this.customAmbianceGains[channel]) {
        this.customAmbianceGains[channel]!.gain.setTargetAtTime(0, now, 0.1);
      }
      if (level > 0 && !this.synthAmbianceSources[channel]) {
        this.rebuildBuiltInChannel(channel, this.getConfiguredPresetId(channel));
      } else if (this.synthAmbianceGains[channel]) {
        this.synthAmbianceGains[channel]!.gain.setTargetAtTime(
          level * this.synthAmbianceScales[channel],
          now,
          0.12
        );
      }
      return;
    }

    if (this.synthAmbianceGains[channel]) {
      this.synthAmbianceGains[channel]!.gain.setTargetAtTime(0, now, 0.12);
    }

    try {
      let buf = this.decodedAmbientCache.get(url);
      if (!buf) {
        const res = await fetch(url);
        const arr = await res.arrayBuffer();
        const decoded = await this.ctx.decodeAudioData(arr);
        buf = makeSeamlessLoopBuffer(this.ctx, decoded, 2.0);
        this.decodedAmbientCache.set(url, buf);
      }
      if (!this.ctx || !this.masterGain || this.customAmbianceUrls[channel] !== url) return;

      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      let gain = this.customAmbianceGains[channel];
      if (!gain) {
        gain = this.ctx.createGain();
        gain.gain.value = 0;
        gain.connect(this.masterGain);
        this.customAmbianceGains[channel] = gain;
      }
      src.connect(gain);
      src.start();
      this.customAmbianceSources[channel] = src;
      gain.gain.setTargetAtTime(this.levels[channel] * 0.75, this.ctx.currentTime, 0.15);
    } catch (err) {
      console.warn(`[WaypointRadio] Failed to decode custom ambience ${url}, using built-in preset:`, err);
      this.rebuildBuiltInChannel(channel, this.getConfiguredPresetId(channel));
    }
  }

  public setAmbianceLevel(channel: AmbianceChannelKey, value: number) {
    const clamped = value < 0.02 ? 0 : Math.min(1, value);
    this.levels[channel] = clamped;
    if (clamped > 0) this.wakeContext();

    if (this.ctx) {
      const now = this.ctx.currentTime;
      const customUrl = this.customAmbianceUrls[channel];
      if (customUrl) {
        if (clamped > 0 && !this.customAmbianceSources[channel]) {
          void this.refreshAmbientChannelPlayback(channel);
        } else if (this.customAmbianceGains[channel]) {
          this.customAmbianceGains[channel]!.gain.setTargetAtTime(clamped * 0.75, now, 0.12);
        }
        this.synthAmbianceGains[channel]?.gain.setTargetAtTime(0, now, 0.1);
      } else {
        const desiredPreset = this.getConfiguredPresetId(channel);
        if (clamped > 0 && (!this.synthAmbianceSources[channel] || this.activePresetIds[channel] !== desiredPreset)) {
          this.rebuildBuiltInChannel(channel, desiredPreset);
        } else if (this.synthAmbianceGains[channel]) {
          this.synthAmbianceGains[channel]!.gain.cancelScheduledValues(now);
          this.synthAmbianceGains[channel]!.gain.setTargetAtTime(
            clamped * this.synthAmbianceScales[channel],
            now,
            0.12
          );
        }
      }
    }

    this.suspendContextIfAllSilent();
  }

  private isAnyAmbianceActive(): boolean {
    return (Object.values(this.levels) as number[]).some((v) => v > 0);
  }

  private suspendContextIfAllSilent() {
    if (!this.isAnyAmbianceActive() && !this.isMusicPlaying && this.ctx && this.ctx.state === "running") {
      window.setTimeout(() => {
        if (!this.isMusicPlaying && !this.isAnyAmbianceActive() && this.ctx && this.ctx.state === "running") {
          void this.ctx.suspend();
        }
      }, 450);
    }
  }

  public stopAll() {
    this.muted = false;
    this.stopMusic();
    (Object.keys(this.levels) as AmbianceChannelKey[]).forEach((ch) => {
      this.levels[ch] = 0;
      if (this.ctx) {
        const now = this.ctx.currentTime;
        this.synthAmbianceGains[ch]?.gain.setTargetAtTime(0, now, 0.08);
        this.customAmbianceGains[ch]?.gain.setTargetAtTime(0, now, 0.08);
      }
    });
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(0, now, 0.08);
    }
    this.suspendContextIfAllSilent();
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 1.0, now, 0.08);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public dispose() {
    this.stopAll();
    (Object.keys(this.customAmbianceSources) as AmbianceChannelKey[]).forEach((ch) => {
      try {
        this.customAmbianceSources[ch]?.stop();
        this.synthAmbianceSources[ch]?.stop();
      } catch {
        // ignore
      }
      this.customAmbianceSources[ch] = null;
      this.synthAmbianceSources[ch] = null;
    });
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
