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
 *    - Fan, Rain, Ocean, Train on Tracks (No Horn), Crickets (Tree icon), Thunder.
 *    - Uses uploaded seamless-crossfaded Ambient Sound MP3/WAV files when available, falling back
 *      to bespoke equal-power crossfaded stereo soundscapes (zero loop seam, zero horn on train).
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
  createSeamlessNoiseBuffer,
  createTrainOnTracksBuffer,
  createCoffeeShopBuffer,
  createThunderBuffer,
  makeSeamlessLoopBuffer,
} from "./ambientSoundGenerators";

export { makeSeamlessLoopBuffer };

export type FocusStationId = RadioStationId;
export type FocusStationConfig = RadioStationDefinition;
export const FOCUS_STATIONS = WAYPOINT_RADIO_STATIONS;

export interface AmbianceLevels {
  fan: number;        // Slider 1 — Steady Fan (Waypoint Radio/Ambient Sounds/Fan)
  rain: number;       // Slider 2 — Rain Shower (Waypoint Radio/Ambient Sounds/Rain Shower)
  ocean: number;      // Slider 3 — Ocean Waves (Waypoint Radio/Ambient Sounds/Ocean)
  train: number;      // Slider 4 — Train on Tracks, No Horn (Waypoint Radio/Ambient Sounds/Train)
  coffeeShop: number; // Slider 5 — Coffee Shop Café Ambience [Coffee Mug Icon] (Waypoint Radio/Ambient Sounds/Coffee Shop)
  thunder: number;    // Slider 6 — Rolling Thunder (Waypoint Radio/Ambient Sounds/Thunder)
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

const AMBIANCE_SYNTH_SCALE: Record<AmbianceChannelKey, number> = {
  fan: 0.34,
  rain: 0.24,
  ocean: 0.32,
  train: 0.36,
  coffeeShop: 0.44,
  thunder: 0.58,
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

  // Built-in seamless ambient nodes
  private synthAmbianceGains = emptyChannelMap<GainNode | null>(null);
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

  /** Returns strictly ordered enabled music tracks for an official station (NEVER randomized) */
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

  /** Sync live track catalog and playback settings WITHOUT interrupting currently playing audio */
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
      const nextUrl = this.getLatestEnabledAmbientUrl(CHANNEL_TO_CATEGORY[ch]);
      if (nextUrl !== this.customAmbianceUrls[ch]) {
        this.customAmbianceUrls[ch] = nextUrl;
        if (this.levels[ch] > 0) {
          void this.refreshAmbientChannelPlayback(ch);
        }
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

    // Consistent perceived volume loudness leveler on Music Bus
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

    // Independent Announcement / Voiceover / Commercial Bus (NEVER faded)
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

    // Dual alternating music decks for smooth crossfades
    this.decks = [this.createDeck(ctx, comp), this.createDeck(ctx, comp)];

    // Built-in seamless stereo soundscapes (Fan, Rain, Ocean, Train [No Horn], Crickets, Thunder)
    this.initBuiltInAmbientChannels(ctx, master);
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

  private initBuiltInAmbientChannels(ctx: AudioContext, master: GainNode) {
    // 1. Steady Box/Ceiling Fan Airflow (17s seamless brown/pink warmth — zero gusty wind)
    const fanSrc = ctx.createBufferSource();
    fanSrc.buffer = createSeamlessNoiseBuffer(ctx, 17, "brown", 2.5);
    fanSrc.loop = true;
    const fanLp = ctx.createBiquadFilter();
    fanLp.type = "lowpass";
    fanLp.frequency.value = 520;
    const fanBody = ctx.createBiquadFilter();
    fanBody.type = "peaking";
    fanBody.frequency.value = 135;
    fanBody.Q.value = 0.85;
    fanBody.gain.value = 4.5;
    const fanGain = ctx.createGain();
    fanGain.gain.value = 0;
    fanSrc.connect(fanLp);
    fanLp.connect(fanBody);
    fanBody.connect(fanGain);
    fanGain.connect(master);
    fanSrc.start();
    this.synthAmbianceGains.fan = fanGain;

    // 2. Rain Shower (13s seamless gentle rainfall)
    const rainSrc = ctx.createBufferSource();
    rainSrc.buffer = createSeamlessNoiseBuffer(ctx, 13, "pink", 2.5);
    rainSrc.loop = true;
    const rainHp = ctx.createBiquadFilter();
    rainHp.type = "highpass";
    rainHp.frequency.value = 340;
    const rainLp = ctx.createBiquadFilter();
    rainLp.type = "lowpass";
    rainLp.frequency.value = 3400;
    const rainGain = ctx.createGain();
    rainGain.gain.value = 0;
    rainSrc.connect(rainHp);
    rainHp.connect(rainLp);
    rainLp.connect(rainGain);
    rainGain.connect(master);
    rainSrc.start();
    this.synthAmbianceGains.rain = rainGain;

    // 3. Ocean Waves (19s seamless surf with slow rolling swell LFO)
    const oceanSrc = ctx.createBufferSource();
    oceanSrc.buffer = createSeamlessNoiseBuffer(ctx, 19, "brown", 3.0);
    oceanSrc.loop = true;
    const oceanFilter = ctx.createBiquadFilter();
    oceanFilter.type = "lowpass";
    oceanFilter.frequency.value = 380;
    const oceanSwell = ctx.createGain();
    oceanSwell.gain.value = 0.56;
    const oceanLfo = ctx.createOscillator();
    oceanLfo.frequency.value = 0.089;
    const oceanLfoDepth = ctx.createGain();
    oceanLfoDepth.gain.value = 0.28;
    oceanLfo.connect(oceanLfoDepth);
    oceanLfoDepth.connect(oceanSwell.gain);
    const oceanGain = ctx.createGain();
    oceanGain.gain.value = 0;
    oceanSrc.connect(oceanFilter);
    oceanFilter.connect(oceanSwell);
    oceanSwell.connect(oceanGain);
    oceanGain.connect(master);
    oceanSrc.start();
    oceanLfo.start();
    this.synthAmbianceGains.ocean = oceanGain;

    // 4. Train on Tracks — Strictly NO Horn (16s seamless rhythmic rail-joint cadence)
    const trainSrc = ctx.createBufferSource();
    trainSrc.buffer = createTrainOnTracksBuffer(ctx);
    trainSrc.loop = true;
    const trainLp = ctx.createBiquadFilter();
    trainLp.type = "lowpass";
    trainLp.frequency.value = 1450;
    const trainGain = ctx.createGain();
    trainGain.gain.value = 0;
    trainSrc.connect(trainLp);
    trainLp.connect(trainGain);
    trainGain.connect(master);
    trainSrc.start();
    this.synthAmbianceGains.train = trainGain;

    // 5. Coffee Shop / Ambient Café — Coffee Mug Icon (23s seamless warm café murmur & porcelain clinks)
    const cafeSrc = ctx.createBufferSource();
    cafeSrc.buffer = createCoffeeShopBuffer(ctx);
    cafeSrc.loop = true;
    const cafeHp = ctx.createBiquadFilter();
    cafeHp.type = "highpass";
    cafeHp.frequency.value = 180;
    const cafeLp = ctx.createBiquadFilter();
    cafeLp.type = "lowpass";
    cafeLp.frequency.value = 3400;
    const cafeGain = ctx.createGain();
    cafeGain.gain.value = 0;
    cafeSrc.connect(cafeHp);
    cafeHp.connect(cafeLp);
    cafeLp.connect(cafeGain);
    cafeGain.connect(master);
    cafeSrc.start();
    this.synthAmbianceGains.coffeeShop = cafeGain;

    // 6. Rolling Distant Thunder (29s seamless prime-length storm swells)
    const thunderSrc = ctx.createBufferSource();
    thunderSrc.buffer = createThunderBuffer(ctx);
    thunderSrc.loop = true;
    const thunderLp = ctx.createBiquadFilter();
    thunderLp.type = "lowpass";
    thunderLp.frequency.value = 240;
    const thunderGain = ctx.createGain();
    thunderGain.gain.value = 0;
    thunderSrc.connect(thunderLp);
    thunderLp.connect(thunderGain);
    thunderGain.connect(master);
    thunderSrc.start();
    this.synthAmbianceGains.thunder = thunderGain;
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
      // NEVER fade or crossfade spoken announcements or commercials
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
        if (this.decks[this.activeDeckIdx] !== prevDeck) {
          oldEl.pause();
        }
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
      const synth = this.synthAmbianceGains[channel];
      if (synth) {
        synth.gain.setTargetAtTime(level * AMBIANCE_SYNTH_SCALE[channel], now, 0.12);
      }
      return;
    }

    const synth = this.synthAmbianceGains[channel];
    if (synth) synth.gain.setTargetAtTime(0, now, 0.12);

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
      console.warn(`[WaypointRadio] Failed to decode custom ambience ${url}, using built-in loop:`, err);
      if (synth && this.ctx) {
        synth.gain.setTargetAtTime(this.levels[channel] * AMBIANCE_SYNTH_SCALE[channel], this.ctx.currentTime, 0.12);
      }
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
        const synth = this.synthAmbianceGains[channel];
        if (synth) synth.gain.setTargetAtTime(0, now, 0.1);
      } else {
        const synth = this.synthAmbianceGains[channel];
        if (synth) {
          synth.gain.cancelScheduledValues(now);
          synth.gain.setTargetAtTime(clamped * AMBIANCE_SYNTH_SCALE[channel], now, 0.12);
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
      } catch {
        // ignore
      }
      this.customAmbianceSources[ch] = null;
    });
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
