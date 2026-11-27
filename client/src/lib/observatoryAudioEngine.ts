/**
 * Waypoint Observatory Focus Radio — Pure Web Audio API Seamless Loop & Soundscape Engine
 *
 * Key guarantees:
 * 1. ZERO ambient hum / drone: No synthesized chord hum plays when ambient noises are off.
 *    Top stations (Focus / Calm / Study / Nature / Night) are reserved strictly for custom user
 *    music tracks (via `setCustomStationUrl`) and remain 100% silent until custom music is added.
 * 2. Seamless hours-long looping: Each of the 4 ambient soundscape channels (Wind, Rain, Ocean,
 *    Forest Night) uses its own long prime-length stereo buffer (13s, 17s, 19s, 23s — 26.8-hour
 *    combined phase cycle) with equal-power cosine overlap-add crossfading at the loop boundary
 *    so there is ZERO click, dip, or audible restart.
 * 3. True zero floor when off: Idle or turned-off channels drop to literal `0` gain (zero hum).
 */

export type FocusStationId = "focus" | "calm" | "study" | "nature" | "night";

export interface FocusStationConfig {
  id: FocusStationId;
  label: string;
  crtTitle: string;
  crtSub: string;
  dialPercent: number; // Position along the tuning ruler (0..100)
  knobDeg: number;     // Rotary knob rotation angle
}

export interface AmbianceLevels {
  wind: number;   // 0..1
  rain: number;   // 0..1
  ocean: number;  // 0..1
  forest: number; // 0..1
}

export const EMPTY_AMBIANCE: AmbianceLevels = {
  wind: 0,
  rain: 0,
  ocean: 0,
  forest: 0,
};

export const FOCUS_STATIONS: FocusStationConfig[] = [
  {
    id: "focus",
    label: "Focus",
    crtTitle: "Focus Station",
    crtSub: "MUSIC · AMBIANCE · FOCUS",
    dialPercent: 10,
    knobDeg: -52,
  },
  {
    id: "calm",
    label: "Calm",
    crtTitle: "Calm Waters",
    crtSub: "SERENE · BREATHE · FLOW",
    dialPercent: 30,
    knobDeg: -26,
  },
  {
    id: "study",
    label: "Study",
    crtTitle: "Deep Study",
    crtSub: "CLARITY · STRATEGY · PREP",
    dialPercent: 50,
    knobDeg: 0,
  },
  {
    id: "nature",
    label: "Nature",
    crtTitle: "Woodland Air",
    crtSub: "ORGANIC · PINE · RAINFALL",
    dialPercent: 70,
    knobDeg: 26,
  },
  {
    id: "night",
    label: "Night",
    crtTitle: "Midnight Watch",
    crtSub: "STARLIGHT · QUIET · DRIFT",
    dialPercent: 90,
    knobDeg: 52,
  },
];

/**
 * Generates a truly seamless equal-power cosine-crossfaded noise buffer.
 * We generate `loopSamples + xfadeSamples` of continuous noise and fold the tail into the head
 * using equal-power `sin`/`cos` weights so RMS energy and waveform stay 100% continuous across wrap.
 */
function createSeamlessNoiseBuffer(
  ctx: AudioContext,
  loopSeconds: number,
  kind: "pink" | "brown",
  crossfadeSeconds = 2.5
): AudioBuffer {
  const sr = ctx.sampleRate;
  const loopLen = Math.floor(sr * loopSeconds);
  const xfadeLen = Math.min(Math.floor(sr * crossfadeSeconds), Math.floor(loopLen / 3));
  const totalGen = loopLen + xfadeLen;
  const buffer = ctx.createBuffer(2, loopLen, sr);

  for (let ch = 0; ch < 2; ch++) {
    const raw = new Float32Array(totalGen);
    if (kind === "pink") {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let w = 0; w < 2048; w++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        b6 = white * 0.115926;
      }
      for (let i = 0; i < totalGen; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        raw[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.045;
        b6 = white * 0.115926;
      }
    } else {
      let last = 0;
      for (let w = 0; w < 2048; w++) {
        last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      }
      for (let i = 0; i < totalGen; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        raw[i] = last * 1.4;
      }
    }

    const out = buffer.getChannelData(ch);
    for (let i = 0; i < loopLen; i++) {
      out[i] = raw[i];
    }
    for (let i = 0; i < xfadeLen; i++) {
      const t = i / xfadeLen;
      const fadeIn = Math.sin(t * Math.PI * 0.5);
      const fadeOut = Math.cos(t * Math.PI * 0.5);
      out[i] = raw[i] * fadeIn + raw[loopLen + i] * fadeOut;
    }
  }

  return buffer;
}

const AMBIANCE_GAIN_SCALE: Record<keyof AmbianceLevels, number> = {
  wind: 0.28,
  rain: 0.23,
  ocean: 0.32,
  forest: 0.09,
};

export class ObservatoryAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambianceGains: Record<keyof AmbianceLevels, GainNode | null> = {
    wind: null,
    rain: null,
    ocean: null,
    forest: null,
  };

  private levels: AmbianceLevels = { ...EMPTY_AMBIANCE };
  private muted = false;

  // Custom user music playback slot (completely silent until user adds custom station audio later)
  private customStationUrls: Partial<Record<FocusStationId, string>> = {};
  private musicAudioEl: HTMLAudioElement | null = null;

  private ensureContext() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : 0.9;
    master.connect(ctx.destination);
    this.masterGain = master;

    // Four distinct prime-length seamlessly crossfaded stereo buffers (26.8-hour non-repeating cycle)
    const windBuf = createSeamlessNoiseBuffer(ctx, 17, "pink", 2.5);
    const rainBuf = createSeamlessNoiseBuffer(ctx, 13, "pink", 2.5);
    const oceanBuf = createSeamlessNoiseBuffer(ctx, 19, "brown", 3.0);
    const forestBuf = createSeamlessNoiseBuffer(ctx, 23, "pink", 3.0);

    // 1. WIND: Dual-LFO gently sweeping band-pass breeze
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = windBuf;
    windSrc.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = "bandpass";
    windFilter.frequency.value = 410;
    windFilter.Q.value = 1.65;
    const windLfoA = ctx.createOscillator();
    windLfoA.frequency.value = 0.073;
    const windLfoAGain = ctx.createGain();
    windLfoAGain.gain.value = 140;
    windLfoA.connect(windLfoAGain);
    windLfoAGain.connect(windFilter.frequency);
    const windLfoB = ctx.createOscillator();
    windLfoB.frequency.value = 0.029;
    const windLfoBGain = ctx.createGain();
    windLfoBGain.gain.value = 85;
    windLfoB.connect(windLfoBGain);
    windLfoBGain.connect(windFilter.frequency);
    const windGain = ctx.createGain();
    windGain.gain.value = this.levels.wind * AMBIANCE_GAIN_SCALE.wind;
    windSrc.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(master);
    windSrc.start();
    windLfoA.start();
    windLfoB.start();
    this.ambianceGains.wind = windGain;

    // 2. RAIN: Smooth continuous rainfall
    const rainSrc = ctx.createBufferSource();
    rainSrc.buffer = rainBuf;
    rainSrc.loop = true;
    const rainHp = ctx.createBiquadFilter();
    rainHp.type = "highpass";
    rainHp.frequency.value = 340;
    const rainLp = ctx.createBiquadFilter();
    rainLp.type = "lowpass";
    rainLp.frequency.value = 3600;
    const rainGain = ctx.createGain();
    rainGain.gain.value = this.levels.rain * AMBIANCE_GAIN_SCALE.rain;
    rainSrc.connect(rainHp);
    rainHp.connect(rainLp);
    rainLp.connect(rainGain);
    rainGain.connect(master);
    rainSrc.start();
    this.ambianceGains.rain = rainGain;

    // 3. OCEAN WAVES: Dual slow incommensurate tidal swell LFOs over deep seamless brown surf
    const oceanSrc = ctx.createBufferSource();
    oceanSrc.buffer = oceanBuf;
    oceanSrc.loop = true;
    const oceanFilter = ctx.createBiquadFilter();
    oceanFilter.type = "lowpass";
    oceanFilter.frequency.value = 360;
    const oceanSwell = ctx.createGain();
    oceanSwell.gain.value = 0.56;
    const oceanLfoA = ctx.createOscillator();
    oceanLfoA.frequency.value = 0.089;
    const oceanLfoADepth = ctx.createGain();
    oceanLfoADepth.gain.value = 0.28;
    oceanLfoA.connect(oceanLfoADepth);
    oceanLfoADepth.connect(oceanSwell.gain);
    const oceanLfoB = ctx.createOscillator();
    oceanLfoB.frequency.value = 0.037;
    const oceanLfoBDepth = ctx.createGain();
    oceanLfoBDepth.gain.value = 0.14;
    oceanLfoB.connect(oceanLfoBDepth);
    oceanLfoBDepth.connect(oceanSwell.gain);
    const oceanGain = ctx.createGain();
    oceanGain.gain.value = this.levels.ocean * AMBIANCE_GAIN_SCALE.ocean;
    oceanSrc.connect(oceanFilter);
    oceanFilter.connect(oceanSwell);
    oceanSwell.connect(oceanGain);
    oceanGain.connect(master);
    oceanSrc.start();
    oceanLfoA.start();
    oceanLfoB.start();
    this.ambianceGains.ocean = oceanGain;

    // 4. FOREST NIGHT: Soft whispering nocturnal canopy breeze
    const forestSrc = ctx.createBufferSource();
    forestSrc.buffer = forestBuf;
    forestSrc.loop = true;
    const forestFilter = ctx.createBiquadFilter();
    forestFilter.type = "bandpass";
    forestFilter.frequency.value = 2350;
    forestFilter.Q.value = 0.65;
    const forestLfo = ctx.createOscillator();
    forestLfo.frequency.value = 0.053;
    const forestLfoGain = ctx.createGain();
    forestLfoGain.gain.value = 320;
    forestLfo.connect(forestLfoGain);
    forestLfoGain.connect(forestFilter.frequency);
    const forestGain = ctx.createGain();
    forestGain.gain.value = this.levels.forest * AMBIANCE_GAIN_SCALE.forest;
    forestSrc.connect(forestFilter);
    forestFilter.connect(forestGain);
    forestGain.connect(master);
    forestSrc.start();
    forestLfo.start();
    this.ambianceGains.forest = forestGain;
  }

  private wakeContext() {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 0.9, now, 0.12);
  }

  /** Play ONLY a custom user-supplied station audio track if configured — ZERO synthesized hum */
  public startStationMusic(stationId: FocusStationId): boolean {
    const url = this.customStationUrls[stationId];
    if (!url) {
      this.stopMusic();
      return false;
    }
    if (!this.musicAudioEl) {
      this.musicAudioEl = new Audio();
      this.musicAudioEl.loop = true;
    }
    if (this.musicAudioEl.src !== url) {
      this.musicAudioEl.src = url;
    }
    this.musicAudioEl.muted = this.muted;
    void this.musicAudioEl.play().catch(() => {
      // ignore autoplay rejections
    });
    return true;
  }

  public stopMusic() {
    if (this.musicAudioEl) {
      this.musicAudioEl.pause();
    }
  }

  public hasCustomStationUrl(stationId: FocusStationId): boolean {
    return Boolean(this.customStationUrls[stationId]);
  }

  public setCustomStationUrl(stationId: FocusStationId, url: string | null) {
    if (url) {
      this.customStationUrls[stationId] = url;
    } else {
      delete this.customStationUrls[stationId];
    }
  }

  /** Adjust a single ambient channel independently (literal 0 gain when off, zero hum) */
  public setAmbianceLevel(channel: keyof AmbianceLevels, value: number) {
    const clamped = value < 0.02 ? 0 : Math.min(1, value);
    this.levels[channel] = clamped;
    if (clamped > 0) {
      this.wakeContext();
    }
    const node = this.ambianceGains[channel];
    if (node && this.ctx) {
      const now = this.ctx.currentTime;
      node.gain.cancelScheduledValues(now);
      node.gain.setTargetAtTime(clamped * AMBIANCE_GAIN_SCALE[channel], now, 0.12);
    }
    // If all ambient channels are off, cleanly suspend context to guarantee 100% digital silence
    const anyActive =
      this.levels.wind > 0 ||
      this.levels.rain > 0 ||
      this.levels.ocean > 0 ||
      this.levels.forest > 0;
    if (!anyActive && this.ctx && this.ctx.state === "running") {
      window.setTimeout(() => {
        const stillSilent =
          this.levels.wind === 0 &&
          this.levels.rain === 0 &&
          this.levels.ocean === 0 &&
          this.levels.forest === 0;
        if (stillSilent && this.ctx && this.ctx.state === "running") {
          void this.ctx.suspend();
        }
      }, 350);
    }
  }

  /** Shut off EVERYTHING (Custom Music + all 4 Ambiance channels) to literal 0 silence */
  public stopAll() {
    this.muted = false;
    this.stopMusic();
    (Object.keys(this.levels) as (keyof AmbianceLevels)[]).forEach((ch) => {
      this.levels[ch] = 0;
      const node = this.ambianceGains[ch];
      if (node && this.ctx) {
        const now = this.ctx.currentTime;
        node.gain.cancelScheduledValues(now);
        node.gain.setTargetAtTime(0, now, 0.08);
      }
    });
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(0, now, 0.08);
      window.setTimeout(() => {
        const allOff =
          this.levels.wind === 0 &&
          this.levels.rain === 0 &&
          this.levels.ocean === 0 &&
          this.levels.forest === 0;
        if (allOff && this.ctx && this.ctx.state === "running") {
          void this.ctx.suspend();
        }
      }, 280);
    }
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (this.musicAudioEl) {
      this.musicAudioEl.muted = muted;
    }
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.9, now, 0.08);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public dispose() {
    this.stopAll();
    if (this.musicAudioEl) {
      this.musicAudioEl.src = "";
      this.musicAudioEl = null;
    }
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
