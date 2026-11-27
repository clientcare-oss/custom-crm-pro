/**
 * Luxury hardware audio feedback for Waypoint Register (PG-050):
 * - Receipt Printer Sound: LOCKED to Epson POS impact receipt burst (CC0 real recording)
 * - Settings / Manager Key Access Sound: LOCKED to Ding-Pong two-tone elevator chime
 * - Payment Paid ("Cha-Ching") Sound: LOCKED to Vintage public-domain cash register cha-ching
 * - Card Declined Sound: 5 authentic, modern luxury POS decline sounds (Tap Fail, Chip POS, Soft Deny, Terminal, POS Low)
 */

export type DeclinedSoundStyle =
  | "pos_low_loud"
  | "deep_ehh"
  | "classic_pos"
  | "firm_triple"
  | "heavy_low";

export interface PosAudioSampleOption<T extends string = string> {
  id: T;
  label: string;
  title: string;
  url?: string;
  offsetSec?: number;
  durationSec?: number;
  gain?: number;
}

/**
 * LOCKED receipt printer sound: Classic Epson POS impact receipt printer burst (CC0).
 */
export const LOCKED_RECEIPT_PRINTER_SOUND: Required<PosAudioSampleOption<"epson_pos">> = {
  id: "epson_pos",
  label: "Epson",
  title: "Classic Epson POS impact receipt printer burst (locked)",
  url: "/assets/pos/sounds/printer-epson-pos.mp3",
  offsetSec: 0.05,
  durationSec: 1.45,
  gain: 0.72,
};

/**
 * LOCKED payment paid ("Cha-Ching!") sound: Instant public-domain vintage brass cash register.
 */
export const LOCKED_CHACHING_SOUND: Required<PosAudioSampleOption<"vintage">> = {
  id: "vintage",
  label: "Vintage",
  title: "Instant iconic public-domain 'CHA-CHING!' brass cash register bell (locked)",
  url: "/assets/pos/sounds/chaching-wiki.mp3",
  offsetSec: 0.23,
  durationSec: 1.75,
  gain: 0.65,
};

/**
 * 5 Loud, authoritative retail POS card-declined variations in the warm "POS Low" family.
 */
export const DECLINED_SOUND_OPTIONS: PosAudioSampleOption<DeclinedSoundStyle>[] = [
  {
    id: "pos_low_loud",
    label: "POS Loud",
    title: "Your POS Low double refusal boosted loud, warm & full-bodied (204 Hz → 174 Hz)",
  },
  {
    id: "deep_ehh",
    label: "Deep Ehh",
    title: "Deeper, heavier brass-register double 'EHH — EHH' (165 Hz → 138 Hz)",
  },
  {
    id: "classic_pos",
    label: "Classic",
    title: "Punchy retail card-terminal double 'EHH — EHH' with crisp speaker presence (225 Hz → 198 Hz)",
  },
  {
    id: "firm_triple",
    label: "Triple",
    title: "Authoritative 3-pulse rapid POS card-declined buzz ('ehh-ehh-ehh')",
  },
  {
    id: "heavy_low",
    label: "Heavy",
    title: "Bold descending low terminal buzz-drop with firm resonant finish (188 Hz → 142 Hz)",
  },
];

const DECLINED_STORAGE_KEY = "waypoint_pos_declined_sound_style_v3";

export function getSavedDeclinedSoundStyle(): DeclinedSoundStyle {
  try {
    if (typeof window === "undefined") return "pos_low_loud";
    const raw = window.localStorage.getItem(DECLINED_STORAGE_KEY);
    if (DECLINED_SOUND_OPTIONS.some((o) => o.id === raw)) {
      return raw as DeclinedSoundStyle;
    }
  } catch { }
  return "pos_low_loud";
}

export function setSavedDeclinedSoundStyle(style: DeclinedSoundStyle): void {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DECLINED_STORAGE_KEY, style);
    }
  } catch { }
}

function createResumedAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  const ctx = new AudioCtx();
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
  return ctx;
}

/**
 * Generates a smooth stereo warm marble-lobby room impulse response for Web Audio ConvolverNode.
 */
function createLobbyReverbBuffer(
  ctx: AudioContext,
  durationSec = 1.65,
  decayRate = 3.2
): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.floor(rate * durationSec);
  const impulse = ctx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const channelData = impulse.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < length; i++) {
      const t = i / length;
      const white = Math.random() * 2 - 1;
      lp = lp * 0.72 + white * 0.28;
      const attack = Math.min(1, i / (rate * 0.012));
      channelData[i] = lp * attack * Math.pow(1 - t, decayRate);
    }
  }
  return impulse;
}

/**
 * Triggers one authentic hollow-tube resonator strike (used by locked Ding-Pong and Soft Deny).
 */
function scheduleElevatorTubeStrike(
  ctx: AudioContext,
  destination: AudioNode,
  startTime: number,
  freqHz: number,
  sustainSec: number,
  gainLevel = 0.42
): void {
  const noteBus = ctx.createGain();
  noteBus.gain.setValueAtTime(0.0001, startTime);
  noteBus.gain.linearRampToValueAtTime(gainLevel, startTime + 0.016);
  noteBus.gain.exponentialRampToValueAtTime(0.0006, startTime + sustainSec);
  noteBus.connect(destination);

  const fundA = ctx.createOscillator();
  const fundAGain = ctx.createGain();
  fundA.type = "sine";
  fundA.frequency.setValueAtTime(freqHz, startTime);
  fundAGain.gain.setValueAtTime(0.76, startTime);
  fundA.connect(fundAGain);
  fundAGain.connect(noteBus);

  const fundB = ctx.createOscillator();
  const fundBGain = ctx.createGain();
  fundB.type = "sine";
  fundB.frequency.setValueAtTime(freqHz + 0.85, startTime);
  fundBGain.gain.setValueAtTime(0.24, startTime);
  fundB.connect(fundBGain);
  fundBGain.connect(noteBus);

  const sub = ctx.createOscillator();
  const subGain = ctx.createGain();
  sub.type = "sine";
  sub.frequency.setValueAtTime(freqHz * 0.5, startTime);
  subGain.gain.setValueAtTime(0.09, startTime);
  subGain.gain.exponentialRampToValueAtTime(0.001, startTime + Math.min(0.75, sustainSec * 0.5));
  sub.connect(subGain);
  subGain.connect(noteBus);

  const oct = ctx.createOscillator();
  const octGain = ctx.createGain();
  oct.type = "sine";
  oct.frequency.setValueAtTime(freqHz * 2.0, startTime);
  octGain.gain.setValueAtTime(0.14, startTime);
  octGain.gain.exponentialRampToValueAtTime(0.0008, startTime + 0.16);
  oct.connect(octGain);
  octGain.connect(noteBus);

  const tapLen = Math.floor(ctx.sampleRate * 0.014);
  const tapBuf = ctx.createBuffer(1, tapLen, ctx.sampleRate);
  const tapData = tapBuf.getChannelData(0);
  for (let i = 0; i < tapLen; i++) {
    tapData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (tapLen * 0.25));
  }
  const tapSrc = ctx.createBufferSource();
  tapSrc.buffer = tapBuf;
  const tapFilter = ctx.createBiquadFilter();
  tapFilter.type = "bandpass";
  tapFilter.frequency.setValueAtTime(980, startTime);
  tapFilter.Q.setValueAtTime(1.6, startTime);
  const tapGain = ctx.createGain();
  tapGain.gain.setValueAtTime(0.18, startTime);
  tapGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.014);
  tapSrc.connect(tapFilter);
  tapFilter.connect(tapGain);
  tapGain.connect(destination);

  fundA.start(startTime);
  fundB.start(startTime);
  sub.start(startTime);
  oct.start(startTime);
  tapSrc.start(startTime);

  const stopAt = startTime + sustainSec + 0.05;
  fundA.stop(stopAt);
  fundB.stop(stopAt);
  sub.stop(startTime + Math.min(0.85, sustainSec));
  oct.stop(startTime + 0.22);
  tapSrc.stop(startTime + 0.018);
}

/**
 * Plays a crisp tiny mechanical brass key-tumbler click at t = 0 right as the key rotates 90°.
 */
function scheduleBrassKeyClick(ctx: AudioContext, destination: AudioNode, startTime: number): void {
  const len = Math.floor(ctx.sampleRate * 0.012);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.18));
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(2400, startTime);
  bp.Q.setValueAtTime(2.8, startTime);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.16, startTime);
  src.connect(bp);
  bp.connect(g);
  g.connect(destination);
  src.start(startTime);
}

/**
 * LOCKED Settings / Manager Key Access Sound:
 * Classic luxury two-tone elevator "DING — PONG" (B5 -> G5 descending major 3rd)
 * preceded by a crisp brass key-tumbler click as the key turns 90°.
 */
export function playManagerKeyPong(): void {
  try {
    const ctx = createResumedAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    const warmOut = ctx.createBiquadFilter();
    warmOut.type = "lowpass";
    warmOut.frequency.setValueAtTime(3600, now);
    warmOut.Q.setValueAtTime(0.6, now);
    warmOut.connect(ctx.destination);

    const dryGain = ctx.createGain();
    dryGain.gain.setValueAtTime(0.74, now);
    dryGain.connect(warmOut);

    const convolver = ctx.createConvolver();
    convolver.buffer = createLobbyReverbBuffer(ctx, 1.8, 3.0);
    const wetGain = ctx.createGain();
    wetGain.gain.setValueAtTime(0.36, now);
    convolver.connect(wetGain);
    wetGain.connect(warmOut);

    const chimeBus = ctx.createGain();
    chimeBus.gain.setValueAtTime(1.0, now);
    chimeBus.connect(dryGain);
    chimeBus.connect(convolver);

    scheduleBrassKeyClick(ctx, dryGain, now);
    scheduleElevatorTubeStrike(ctx, chimeBus, now + 0.045, 987.77, 1.35, 0.36);
    scheduleElevatorTubeStrike(ctx, chimeBus, now + 0.285, 783.99, 2.05, 0.44);

    setTimeout(() => {
      ctx.close().catch(() => { });
    }, 2800);
  } catch {
    // Audio playback is best-effort; never block UI interaction
  }
}

// ── Shared Decoded Sample Engine (Zero-Overlap Auditioning + Instant Replay Cache) ──

type SampleChannel = "printer" | "chaching" | "declined";

let sharedSampleAudioCtx: AudioContext | null = null;
const activeChannelSources: Partial<Record<SampleChannel, AudioBufferSourceNode | null>> = {};
const activeSynthContexts: Partial<Record<SampleChannel, AudioContext | null>> = {};
const decodedSampleCache = new Map<string, Promise<AudioBuffer | null>>();

function stopChannelPlayback(channel: SampleChannel): void {
  const prevSrc = activeChannelSources[channel];
  if (prevSrc) {
    try {
      prevSrc.stop();
    } catch { }
    activeChannelSources[channel] = null;
  }
  const prevCtx = activeSynthContexts[channel];
  if (prevCtx) {
    try {
      void prevCtx.close();
    } catch { }
    activeSynthContexts[channel] = null;
  }
}

function getSharedSampleAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!sharedSampleAudioCtx || sharedSampleAudioCtx.state === "closed") {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    sharedSampleAudioCtx = new AudioCtx();
  }
  if (sharedSampleAudioCtx.state === "suspended") {
    void sharedSampleAudioCtx.resume();
  }
  return sharedSampleAudioCtx;
}

function loadSampleAudioBuffer(ctx: AudioContext, url: string): Promise<AudioBuffer | null> {
  const cached = decodedSampleCache.get(url);
  if (cached) return cached;

  const promise = fetch(url)
    .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error(`HTTP ${res.status}`))))
    .then((arr) => ctx.decodeAudioData(arr))
    .catch(() => {
      decodedSampleCache.delete(url);
      return null;
    });

  decodedSampleCache.set(url, promise);
  return promise;
}

function playCuratedAudioSample(
  channel: SampleChannel,
  opt: PosAudioSampleOption,
  fallbackSynth?: () => void
): void {
  if (!opt.url) {
    fallbackSynth?.();
    return;
  }
  try {
    stopChannelPlayback(channel);
    const ctx = getSharedSampleAudioContext();
    if (!ctx) {
      if (typeof Audio !== "undefined") {
        const el = new Audio(opt.url);
        el.volume = Math.min(1, Math.max(0.1, opt.gain ?? 0.8));
        void el.play().catch(() => {
          fallbackSynth?.();
        });
      } else {
        fallbackSynth?.();
      }
      return;
    }

    void loadSampleAudioBuffer(ctx, opt.url).then((buffer) => {
      if (!buffer) {
        fallbackSynth?.();
        return;
      }
      if (ctx.state === "suspended") {
        void ctx.resume();
      }
      const now = ctx.currentTime;
      const offset = Math.min(opt.offsetSec ?? 0, Math.max(0, buffer.duration - 0.05));
      const playDur = Math.min(
        opt.durationSec ?? buffer.duration,
        Math.max(0.05, buffer.duration - offset)
      );

      const src = ctx.createBufferSource();
      src.buffer = buffer;

      const gain = ctx.createGain();
      const targetGain = Math.max(0.05, opt.gain ?? 0.8);
      const attack = Math.min(0.01, playDur * 0.14);
      const fadeDur = Math.min(0.06, playDur * 0.22);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(targetGain, now + attack);
      const fadeStart = now + Math.max(attack + 0.01, playDur - fadeDur);
      gain.gain.setValueAtTime(targetGain, fadeStart);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + playDur);

      if (targetGain > 1.0) {
        const limiter = ctx.createDynamicsCompressor();
        limiter.threshold.setValueAtTime(-3, now);
        limiter.knee.setValueAtTime(6, now);
        limiter.ratio.setValueAtTime(12, now);
        limiter.attack.setValueAtTime(0.002, now);
        limiter.release.setValueAtTime(0.08, now);
        src.connect(gain);
        gain.connect(limiter);
        limiter.connect(ctx.destination);
      } else {
        src.connect(gain);
        gain.connect(ctx.destination);
      }

      activeChannelSources[channel] = src;
      src.onended = () => {
        if (activeChannelSources[channel] === src) {
          activeChannelSources[channel] = null;
        }
      };
      src.start(now, offset, playDur + 0.02);
    });
  } catch {
    fallbackSynth?.();
  }
}

/**
 * LOCKED Receipt Paper Feed Sound:
 * Plays the real recorded CC0 Epson POS impact receipt printer burst.
 */
export function playReceiptPaperFeedSound(): void {
  playCuratedAudioSample("printer", LOCKED_RECEIPT_PRINTER_SOUND);
}

// ── Bespoke Zero-Rattle Studio Brass "Ting-CHING!" ──

function playStudioZeroRattleChaChing(): void {
  try {
    stopChannelPlayback("chaching");
    const ctx = createResumedAudioContext();
    if (!ctx) return;
    activeSynthContexts.chaching = ctx;

    const now = ctx.currentTime;
    const masterOut = ctx.createGain();
    masterOut.gain.setValueAtTime(0.46, now);
    masterOut.connect(ctx.destination);

    const dry = ctx.createGain();
    dry.gain.setValueAtTime(0.78, now);
    dry.connect(masterOut);

    const convolver = ctx.createConvolver();
    convolver.buffer = createLobbyReverbBuffer(ctx, 1.4, 3.5);
    const wet = ctx.createGain();
    wet.gain.setValueAtTime(0.28, now);
    convolver.connect(wet);
    wet.connect(masterOut);

    const bus = ctx.createGain();
    bus.connect(dry);
    bus.connect(convolver);

    // Two sparkling micro silver-coin glints ("cha-") — zero low rattle
    for (const [offset, freq, gainVal] of [
      [0.0, 3520, 0.14],
      [0.042, 4698.6, 0.16],
    ] as const) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + offset);
      g.gain.setValueAtTime(0.0001, now + offset);
      g.gain.linearRampToValueAtTime(gainVal, now + offset + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0006, now + offset + 0.085);
      osc.connect(g);
      g.connect(bus);
      osc.start(now + offset);
      osc.stop(now + offset + 0.1);
    }

    // Immediate singing brass cash-register dome bell ("-CHING!") at t = 0.078s
    const bellStart = now + 0.078;
    const partials: Array<[number, number, number]> = [
      [1318.5, 0.4, 1.42],  // E6 bright brass body
      [1321.1, 0.22, 1.32], // Acoustic shimmer twin
      [2637.0, 0.18, 0.92], // Clean octave sparkle
      [3633.8, 0.24, 0.68], // Classic 2.756x dome bell harmonic
      [5274.0, 0.12, 0.42], // Upper metallic sheen
      [7125.0, 0.06, 0.22], // Striker gleam
    ];
    for (const [freq, gainVal, decay] of partials) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, bellStart);
      g.gain.setValueAtTime(0.0001, bellStart);
      g.gain.linearRampToValueAtTime(gainVal, bellStart + 0.0035);
      g.gain.exponentialRampToValueAtTime(0.0006, bellStart + decay);
      osc.connect(g);
      g.connect(bus);
      osc.start(bellStart);
      osc.stop(bellStart + decay + 0.04);
    }

    setTimeout(() => {
      if (activeSynthContexts.chaching === ctx) activeSynthContexts.chaching = null;
      ctx.close().catch(() => { });
    }, 1750);
  } catch { }
}

/**
 * LOCKED Payment Paid ("Cha-Ching!") Sound:
 * Plays the instant public-domain Vintage brass cash register cha-ching.
 */
export function playPaymentPaidChaChingSound(): void {
  playCuratedAudioSample("chaching", LOCKED_CHACHING_SOUND, playStudioZeroRattleChaChing);
}

// ── 5 Loud, Bold "POS Low" Family Card-Declined Engines ──

interface PosDeclinePulseSpec {
  offset: number;
  freq: number;
  endRatio: number;
  dur: number;
  gain?: number;
}

interface PosDeclineVoiceProfile {
  pulses: PosDeclinePulseSpec[];
  hpHz: number;
  formantHz: number;
  formantGainDb: number;
  lpHz: number;
  masterGain: number;
  sawMix: number;
  squareMix: number;
  subTriMix: number;
  detuneHz: number;
  clickOnset?: boolean;
}

const POS_DECLINE_PROFILES: Record<DeclinedSoundStyle, PosDeclineVoiceProfile> = {
  // 1. POS Loud: Exact POS Low voice boosted loud, warm & full-bodied
  pos_low_loud: {
    pulses: [
      { offset: 0.0, freq: 204, endRatio: 0.96, dur: 0.135, gain: 0.96 },
      { offset: 0.195, freq: 174, endRatio: 0.95, dur: 0.195, gain: 1.0 },
    ],
    hpHz: 110,
    formantHz: 720,
    formantGainDb: 5.5,
    lpHz: 1320,
    masterGain: 0.82,
    sawMix: 0.58,
    squareMix: 0.16,
    subTriMix: 0.42,
    detuneHz: 1.4,
  },
  // 2. Deep Ehh: Heavier, deeper brass-register double "EHH — EHH"
  deep_ehh: {
    pulses: [
      { offset: 0.0, freq: 165, endRatio: 0.95, dur: 0.148, gain: 0.96 },
      { offset: 0.212, freq: 138, endRatio: 0.94, dur: 0.22, gain: 1.0 },
    ],
    hpHz: 85,
    formantHz: 610,
    formantGainDb: 6.2,
    lpHz: 1180,
    masterGain: 0.88,
    sawMix: 0.62,
    squareMix: 0.18,
    subTriMix: 0.48,
    detuneHz: 1.8,
  },
  // 3. Classic: Punchy retail card-reader "EHH — EHH" with clear speaker bite
  classic_pos: {
    pulses: [
      { offset: 0.0, freq: 226, endRatio: 0.97, dur: 0.13, gain: 0.95 },
      { offset: 0.19, freq: 196, endRatio: 0.96, dur: 0.195, gain: 1.0 },
    ],
    hpHz: 135,
    formantHz: 800,
    formantGainDb: 6.0,
    lpHz: 1680,
    masterGain: 0.78,
    sawMix: 0.54,
    squareMix: 0.34,
    subTriMix: 0.26,
    detuneHz: 1.6,
  },
  // 4. Triple: Rapid 3-pulse authoritative POS decline ("ehh-ehh-ehh")
  firm_triple: {
    pulses: [
      { offset: 0.0, freq: 212, endRatio: 0.98, dur: 0.098, gain: 0.92 },
      { offset: 0.148, freq: 194, endRatio: 0.97, dur: 0.098, gain: 0.96 },
      { offset: 0.296, freq: 170, endRatio: 0.94, dur: 0.175, gain: 1.0 },
    ],
    hpHz: 115,
    formantHz: 740,
    formantGainDb: 5.4,
    lpHz: 1420,
    masterGain: 0.82,
    sawMix: 0.56,
    squareMix: 0.24,
    subTriMix: 0.36,
    detuneHz: 1.5,
  },
  // 5. Heavy: Bold resonant low buzz-drop with subtle mechanical lock refusal click
  heavy_low: {
    pulses: [
      { offset: 0.014, freq: 188, endRatio: 0.95, dur: 0.15, gain: 0.96 },
      { offset: 0.225, freq: 142, endRatio: 0.92, dur: 0.255, gain: 1.0 },
    ],
    hpHz: 90,
    formantHz: 650,
    formantGainDb: 6.0,
    lpHz: 1260,
    masterGain: 0.86,
    sawMix: 0.6,
    squareMix: 0.22,
    subTriMix: 0.45,
    detuneHz: 2.1,
    clickOnset: true,
  },
};

function playPosDeclineProfile(profile: PosDeclineVoiceProfile): void {
  try {
    stopChannelPlayback("declined");
    const ctx = createResumedAudioContext();
    if (!ctx) return;
    activeSynthContexts.declined = ctx;
    const now = ctx.currentTime;

    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.setValueAtTime(profile.hpHz, now);

    // Warm nasal POS speaker formant boost so low tones cut clearly on any speaker
    const formant = ctx.createBiquadFilter();
    formant.type = "peaking";
    formant.frequency.setValueAtTime(profile.formantHz, now);
    formant.Q.setValueAtTime(1.4, now);
    formant.gain.setValueAtTime(profile.formantGainDb, now);

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(profile.lpHz, now);
    lp.Q.setValueAtTime(0.85, now);

    // Clean brickwall limiter for loud, punchy output with zero digital clipping
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.setValueAtTime(-2.5, now);
    limiter.knee.setValueAtTime(6, now);
    limiter.ratio.setValueAtTime(12, now);
    limiter.attack.setValueAtTime(0.002, now);
    limiter.release.setValueAtTime(0.07, now);

    const master = ctx.createGain();
    master.gain.setValueAtTime(profile.masterGain, now);

    hp.connect(formant);
    formant.connect(lp);
    lp.connect(master);
    master.connect(limiter);
    limiter.connect(ctx.destination);

    if (profile.clickOnset) {
      scheduleBrassKeyClick(ctx, limiter, now);
    }

    let maxEnd = 0;
    for (const p of profile.pulses) {
      const start = now + p.offset;
      const pulseGain = p.gain ?? 1.0;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, start);
      env.gain.linearRampToValueAtTime(pulseGain, start + 0.008);
      env.gain.setValueAtTime(pulseGain * 0.94, start + Math.max(0.02, p.dur - 0.022));
      env.gain.exponentialRampToValueAtTime(0.0008, start + p.dur);
      env.connect(hp);

      // 1. Primary warm reed sawtooth
      const saw = ctx.createOscillator();
      saw.type = "sawtooth";
      saw.frequency.setValueAtTime(p.freq, start);
      saw.frequency.linearRampToValueAtTime(p.freq * p.endRatio, start + p.dur);
      const gSaw = ctx.createGain();
      gSaw.gain.setValueAtTime(profile.sawMix, start);
      saw.connect(gSaw);
      gSaw.connect(env);

      // 2. Slightly detuned square twin for bold POS terminal texture
      const sq = ctx.createOscillator();
      sq.type = "square";
      sq.frequency.setValueAtTime(p.freq - profile.detuneHz, start);
      sq.frequency.linearRampToValueAtTime((p.freq - profile.detuneHz) * p.endRatio, start + p.dur);
      const gSq = ctx.createGain();
      gSq.gain.setValueAtTime(profile.squareMix, start);
      sq.connect(gSq);
      gSq.connect(env);

      // 3. Lower-octave triangle chest body so it sounds big and loud
      const sub = ctx.createOscillator();
      sub.type = "triangle";
      sub.frequency.setValueAtTime(p.freq * 0.5, start);
      sub.frequency.linearRampToValueAtTime(p.freq * 0.5 * p.endRatio, start + p.dur);
      const gSub = ctx.createGain();
      gSub.gain.setValueAtTime(profile.subTriMix, start);
      sub.connect(gSub);
      gSub.connect(env);

      const stopAt = start + p.dur + 0.02;
      saw.start(start);
      sq.start(start);
      sub.start(start);
      saw.stop(stopAt);
      sq.stop(stopAt);
      sub.stop(stopAt);
      maxEnd = Math.max(maxEnd, p.offset + p.dur);
    }

    setTimeout(() => {
      if (activeSynthContexts.declined === ctx) activeSynthContexts.declined = null;
      ctx.close().catch(() => { });
    }, Math.round((maxEnd + 0.25) * 1000));
  } catch { }
}

/**
 * Plays the selected bold POS Low family card-declined sound.
 */
export function playCardDeclinedSound(styleOverride?: DeclinedSoundStyle): void {
  const style = styleOverride ?? getSavedDeclinedSoundStyle();
  const profile = POS_DECLINE_PROFILES[style] ?? POS_DECLINE_PROFILES.pos_low_loud;
  playPosDeclineProfile(profile);
}
