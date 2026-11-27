/**
 * Luxury hardware audio feedback for Waypoint Register (PG-050):
 * - Receipt Printer Sound: LOCKED to Epson POS impact receipt burst (CC0 real recording)
 * - Settings / Manager Key Access Sound: LOCKED to Ding-Pong two-tone elevator chime
 * - Payment Paid ("Cha-Ching") Sound: LOCKED to Vintage public-domain cash register cha-ching
 * - Card Declined Sound: LOCKED to Feud X TV game-show wrong-answer strike buzzer
 */

export interface PosAudioSampleHit {
  /** Start delay in seconds from trigger time */
  atSec: number;
  /** Trim offset in seconds inside the audio file */
  offsetSec: number;
  /** Play duration in seconds */
  durationSec: number;
  /** Playback rate (e.g. 1.0 for first "EH", 0.92 for deeper second "EH") */
  playbackRate?: number;
  /** Per-hit gain multiplier */
  gain?: number;
}

export interface PosAudioSampleOption<T extends string = string> {
  id: T;
  label: string;
  title: string;
  url?: string;
  offsetSec?: number;
  durationSec?: number;
  gain?: number;
  hits?: PosAudioSampleHit[];
}

/**
 * LOCKED receipt printer sound: Classic Epson POS impact receipt printer burst (CC0).
 */
export const LOCKED_RECEIPT_PRINTER_SOUND: Required<
  Pick<PosAudioSampleOption<"epson_pos">, "id" | "label" | "title" | "url" | "offsetSec" | "durationSec" | "gain">
> = {
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
export const LOCKED_CHACHING_SOUND: Required<
  Pick<PosAudioSampleOption<"vintage">, "id" | "label" | "title" | "url" | "offsetSec" | "durationSec" | "gain">
> = {
  id: "vintage",
  label: "Vintage",
  title: "Instant iconic public-domain 'CHA-CHING!' brass cash register bell (locked)",
  url: "/assets/pos/sounds/chaching-wiki.mp3",
  offsetSec: 0.23,
  durationSec: 1.75,
  gain: 0.65,
};

/**
 * LOCKED card declined sound: Punchy classic TV game-show "Feud X" wrong-answer strike buzzer.
 */
export const LOCKED_DECLINED_SOUND: Required<
  Pick<PosAudioSampleOption<"feud_x">, "id" | "label" | "title" | "url" | "offsetSec" | "durationSec" | "gain">
> = {
  id: "feud_x",
  label: "Feud X",
  title: "Punchy, tight classic TV game-show wrong-answer 'EHHHH!' buzzer (locked)",
  url: "/assets/pos/sounds/declined-feud-x.mp3",
  offsetSec: 0.072,
  durationSec: 0.62,
  gain: 0.92,
};

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
const activeChannelSources: Partial<Record<SampleChannel, AudioBufferSourceNode[]>> = {};
const activeSynthContexts: Partial<Record<SampleChannel, AudioContext | null>> = {};
const decodedSampleCache = new Map<string, Promise<AudioBuffer | null>>();

function stopChannelPlayback(channel: SampleChannel): void {
  const prevList = activeChannelSources[channel];
  if (prevList && prevList.length > 0) {
    for (const prevSrc of prevList) {
      try {
        prevSrc.stop();
      } catch { }
    }
    activeChannelSources[channel] = [];
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
      const baseGain = Math.max(0.05, opt.gain ?? 0.8);

      const hits: PosAudioSampleHit[] =
        opt.hits && opt.hits.length > 0
          ? opt.hits
          : [
              {
                atSec: 0,
                offsetSec: opt.offsetSec ?? 0,
                durationSec: opt.durationSec ?? buffer.duration,
                playbackRate: 1.0,
                gain: 1.0,
              },
            ];

      let outNode: AudioNode = ctx.destination;
      if (baseGain > 0.98) {
        const limiter = ctx.createDynamicsCompressor();
        limiter.threshold.setValueAtTime(-2.5, now);
        limiter.knee.setValueAtTime(6, now);
        limiter.ratio.setValueAtTime(12, now);
        limiter.attack.setValueAtTime(0.002, now);
        limiter.release.setValueAtTime(0.07, now);
        limiter.connect(ctx.destination);
        outNode = limiter;
      }

      const started: AudioBufferSourceNode[] = [];
      for (const hit of hits) {
        const startAt = now + Math.max(0, hit.atSec);
        const rate = Math.max(0.5, Math.min(2.0, hit.playbackRate ?? 1.0));
        const offset = Math.min(hit.offsetSec ?? 0, Math.max(0, buffer.duration - 0.04));
        const maxSourceDur = Math.max(0.04, (buffer.duration - offset) / rate);
        const playDur = Math.min(hit.durationSec, maxSourceDur);

        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.playbackRate.setValueAtTime(rate, startAt);

        const gain = ctx.createGain();
        const targetGain = Math.max(0.05, baseGain * (hit.gain ?? 1.0));
        const attack = Math.min(0.006, playDur * 0.12);
        const fadeDur = Math.min(0.028, playDur * 0.22);

        gain.gain.setValueAtTime(0.0001, startAt);
        gain.gain.linearRampToValueAtTime(targetGain, startAt + attack);
        const fadeStart = startAt + Math.max(attack + 0.01, playDur - fadeDur);
        gain.gain.setValueAtTime(targetGain, fadeStart);
        gain.gain.exponentialRampToValueAtTime(0.0008, startAt + playDur);

        src.connect(gain);
        gain.connect(outNode);
        started.push(src);

        src.onended = () => {
          const list = activeChannelSources[channel];
          if (list) {
            const idx = list.indexOf(src);
            if (idx >= 0) list.splice(idx, 1);
          }
        };
        src.start(startAt, offset, playDur * rate + 0.02);
      }

      activeChannelSources[channel] = started;
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

// ── Offline Fallback Game-Show "EH — EH!" Buzzer Synth ──

function playFallbackGameShowBuzzer(): void {
  try {
    stopChannelPlayback("declined");
    const ctx = createResumedAudioContext();
    if (!ctx) return;
    activeSynthContexts.declined = ctx;
    const now = ctx.currentTime;

    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(640, now);
    bp.Q.setValueAtTime(1.1, now);

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.75, now);
    bp.connect(master);
    master.connect(ctx.destination);

    const hits: Array<[number, number, number]> = [
      [0.0, 142, 0.17],
      [0.22, 128, 0.28],
    ];
    for (const [offset, baseHz, dur] of hits) {
      const start = now + offset;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, start);
      env.gain.linearRampToValueAtTime(1.0, start + 0.006);
      env.gain.setValueAtTime(0.95, start + dur - 0.02);
      env.gain.exponentialRampToValueAtTime(0.0008, start + dur);
      env.connect(bp);

      for (const ratio of [1.0, 1.06, 1.49]) {
        const osc = ctx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(baseHz * ratio, start);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.35, start);
        osc.connect(g);
        g.connect(env);
        osc.start(start);
        osc.stop(start + dur + 0.02);
      }
    }

    setTimeout(() => {
      if (activeSynthContexts.declined === ctx) activeSynthContexts.declined = null;
      ctx.close().catch(() => { });
    }, 800);
  } catch { }
}

/**
 * LOCKED Card Declined Sound:
 * Plays the punchy TV game-show "Feud X" wrong-answer buzzer.
 */
export function playCardDeclinedSound(): void {
  playCuratedAudioSample("declined", LOCKED_DECLINED_SOUND, playFallbackGameShowBuzzer);
}
