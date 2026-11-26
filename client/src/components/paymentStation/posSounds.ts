/**
 * Synthesized luxury hardware audio feedback for Waypoint Payment Station (PG-050).
 * Uses zero external audio files — generated cleanly via Web Audio API with
 * stereo room-reverb convolution and safe graceful fallback.
 */

export type ManagerKeyChimeStyle = "otis_pong" | "elevator_two_tone" | "deep_pong";
export type PrinterSoundStyle =
  | "thermal_cut"
  | "epson_pos"
  | "retail_till"
  | "drawer_print"
  | "retro_matrix";

export interface PrinterSoundOption {
  id: PrinterSoundStyle;
  label: string;
  title: string;
  url: string;
  offsetSec: number;
  durationSec: number;
  gain: number;
}

/**
 * Curated CC0 (Public Domain) real recorded receipt printer audio samples.
 * Every clip is studio-clean with zero background voices or chatter.
 */
export const PRINTER_SOUND_OPTIONS: PrinterSoundOption[] = [
  {
    id: "thermal_cut",
    label: "Thermal",
    title: "Modern thermal receipt print & auto-cutter snip (real recording)",
    url: "/assets/pos/sounds/printer-thermal-cut.mp3",
    offsetSec: 0,
    durationSec: 1.57,
    gain: 0.95,
  },
  {
    id: "epson_pos",
    label: "Epson",
    title: "Classic Epson POS impact receipt printer burst (real recording)",
    url: "/assets/pos/sounds/printer-epson-pos.mp3",
    offsetSec: 0.05,
    durationSec: 1.45,
    gain: 0.72,
  },
  {
    id: "retail_till",
    label: "Till",
    title: "Compact retail thermal receipt motor feed (real recording)",
    url: "/assets/pos/sounds/printer-retail-till.mp3",
    offsetSec: 0.04,
    durationSec: 1.4,
    gain: 0.9,
  },
  {
    id: "drawer_print",
    label: "Drawer",
    title: "Cash register drawer & thermal receipt feed (real recording)",
    url: "/assets/pos/sounds/printer-drawer-print.mp3",
    offsetSec: 0,
    durationSec: 1.9,
    gain: 0.85,
  },
  {
    id: "retro_matrix",
    label: "Matrix",
    title: "Vintage dot-matrix receipt printer chatter (real recording)",
    url: "/assets/pos/sounds/printer-retro-matrix.mp3",
    offsetSec: 0.1,
    durationSec: 1.25,
    gain: 0.65,
  },
];

const CHIME_STORAGE_KEY = "waypoint_pos_manager_chime_style";
const PRINTER_SOUND_STORAGE_KEY = "waypoint_pos_printer_sound_style";

export function getSavedPrinterSoundStyle(): PrinterSoundStyle {
  try {
    if (typeof window === "undefined") return "thermal_cut";
    const raw = window.localStorage.getItem(PRINTER_SOUND_STORAGE_KEY);
    if (PRINTER_SOUND_OPTIONS.some((o) => o.id === raw)) {
      return raw as PrinterSoundStyle;
    }
  } catch {}
  return "thermal_cut";
}

export function setSavedPrinterSoundStyle(style: PrinterSoundStyle): void {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PRINTER_SOUND_STORAGE_KEY, style);
    }
  } catch {}
}

export function getSavedManagerKeyChimeStyle(): ManagerKeyChimeStyle {
  try {
    if (typeof window === "undefined") return "otis_pong";
    const raw = window.localStorage.getItem(CHIME_STORAGE_KEY);
    if (raw === "otis_pong" || raw === "elevator_two_tone" || raw === "deep_pong") {
      return raw;
    }
  } catch { }
  return "otis_pong";
}

export function setSavedManagerKeyChimeStyle(style: ManagerKeyChimeStyle): void {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CHIME_STORAGE_KEY, style);
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
 * Generates a smooth stereo warm marble-lobby room impulse response for Web Audio ConvolverNode
 * so elevator chimes sound naturally spacious and authentic instead of dry/electronic.
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
      // Gentle single-pole low-pass smoothing for warm lobby reflections (never metallic/harsh)
      lp = lp * 0.72 + white * 0.28;
      // Soft early-reflection pre-fade + smooth exponential tail
      const attack = Math.min(1, i / (rate * 0.012));
      channelData[i] = lp * attack * Math.pow(1 - t, decayRate);
    }
  }
  return impulse;
}

/**
 * Triggers one authentic hollow-tube elevator chime strike (soft rubber plunger + pure
 * resonator tube bloom + ultra-subtle acoustic beating + clean fast-fading octave sheen).
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
  // 16ms hollow-resonator tube bloom (key signature of a real elevator chime vs. a sharp digital beep)
  noteBus.gain.linearRampToValueAtTime(gainLevel, startTime + 0.016);
  noteBus.gain.exponentialRampToValueAtTime(0.0006, startTime + sustainSec);
  noteBus.connect(destination);

  // 1. Pure warm resonator fundamental
  const fundA = ctx.createOscillator();
  const fundAGain = ctx.createGain();
  fundA.type = "sine";
  fundA.frequency.setValueAtTime(freqHz, startTime);
  fundAGain.gain.setValueAtTime(0.76, startTime);
  fundA.connect(fundAGain);
  fundAGain.connect(noteBus);

  // 2. Whisper-detuned acoustic shimmer twin (~0.85 Hz slow natural lobby beat)
  const fundB = ctx.createOscillator();
  const fundBGain = ctx.createGain();
  fundB.type = "sine";
  fundB.frequency.setValueAtTime(freqHz + 0.85, startTime);
  fundBGain.gain.setValueAtTime(0.24, startTime);
  fundB.connect(fundBGain);
  fundBGain.connect(noteBus);

  // 3. Soft hollow-tube lower octave warmth for the round "PONG" vowel body
  const sub = ctx.createOscillator();
  const subGain = ctx.createGain();
  sub.type = "sine";
  sub.frequency.setValueAtTime(freqHz * 0.5, startTime);
  subGain.gain.setValueAtTime(0.09, startTime);
  subGain.gain.exponentialRampToValueAtTime(0.001, startTime + Math.min(0.75, sustainSec * 0.5));
  sub.connect(subGain);
  subGain.connect(noteBus);

  // 4. Clean brief 2x chime sheen (fades rapidly so tone stays glassy-pure, never organ-like)
  const oct = ctx.createOscillator();
  const octGain = ctx.createGain();
  oct.type = "sine";
  oct.frequency.setValueAtTime(freqHz * 2.0, startTime);
  octGain.gain.setValueAtTime(0.14, startTime);
  octGain.gain.exponentialRampToValueAtTime(0.0008, startTime + 0.16);
  oct.connect(octGain);
  octGain.connect(noteBus);

  // 5. Soft rubber-tipped solenoid plunger tap (low-mid thump, zero harsh hiss)
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
 * Plays the realistic elevator-door access "pong" chime when the Manager Key turns 90°
 * on a valid 4-digit unlock code. Uses genuine ConvolverNode lobby reverb and pure
 * resonator-tube acoustics.
 */
export function playManagerKeyPong(styleOverride?: ManagerKeyChimeStyle): void {
  try {
    const ctx = createResumedAudioContext();
    if (!ctx) return;

    const style = styleOverride ?? getSavedManagerKeyChimeStyle();
    const now = ctx.currentTime;

    // Gentle warm output low-pass filter
    const warmOut = ctx.createBiquadFilter();
    warmOut.type = "lowpass";
    warmOut.frequency.setValueAtTime(3600, now);
    warmOut.Q.setValueAtTime(0.6, now);
    warmOut.connect(ctx.destination);

    // Dry + Stereo Marble-Lobby Wet Reverb Bus
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

    // Tiny physical brass key tumbler click as the key snaps 90°
    scheduleBrassKeyClick(ctx, dryGain, now);

    if (style === "elevator_two_tone") {
      // Classic luxury hotel elevator door "DING — PONG" (B5 -> G5 descending major 3rd)
      scheduleElevatorTubeStrike(ctx, chimeBus, now + 0.045, 987.77, 1.35, 0.36);
      scheduleElevatorTubeStrike(ctx, chimeBus, now + 0.285, 783.99, 2.05, 0.44);
    } else if (style === "deep_pong") {
      // Rich low resonant brass elevator "POOOONG" (D5 hollow bar)
      scheduleElevatorTubeStrike(ctx, chimeBus, now + 0.045, 587.33, 2.25, 0.48);
    } else {
      // Default: Classic Otis single-tone elevator arrival "PONG" (G5 pure hollow resonator)
      scheduleElevatorTubeStrike(ctx, chimeBus, now + 0.045, 783.99, 2.1, 0.46);
    }

    setTimeout(() => {
      ctx.close().catch(() => { });
    }, 2800);
  } catch {
    // Audio playback is best-effort; never block UI interaction
  }
}

let sharedPrinterAudioCtx: AudioContext | null = null;
let activePrinterSource: AudioBufferSourceNode | null = null;
const decodedPrinterBufferCache = new Map<string, Promise<AudioBuffer | null>>();

function getSharedPrinterAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!sharedPrinterAudioCtx || sharedPrinterAudioCtx.state === "closed") {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    sharedPrinterAudioCtx = new AudioCtx();
  }
  if (sharedPrinterAudioCtx.state === "suspended") {
    void sharedPrinterAudioCtx.resume();
  }
  return sharedPrinterAudioCtx;
}

function loadPrinterAudioBuffer(ctx: AudioContext, url: string): Promise<AudioBuffer | null> {
  const cached = decodedPrinterBufferCache.get(url);
  if (cached) return cached;

  const promise = fetch(url)
    .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error(`HTTP ${res.status}`))))
    .then((arr) => ctx.decodeAudioData(arr))
    .catch(() => {
      decodedPrinterBufferCache.delete(url);
      return null;
    });

  decodedPrinterBufferCache.set(url, promise);
  return promise;
}

/**
 * Plays the selected real recorded CC0 thermal/POS receipt printer audio sample
 * with clean slice timing, smooth fade-out, and zero overlapping when auditioning.
 */
export function playReceiptPaperFeedSound(styleOverride?: PrinterSoundStyle): void {
  try {
    const style = styleOverride ?? getSavedPrinterSoundStyle();
    const opt =
      PRINTER_SOUND_OPTIONS.find((o) => o.id === style) ?? PRINTER_SOUND_OPTIONS[0];

    const ctx = getSharedPrinterAudioContext();
    if (!ctx) {
      if (typeof Audio !== "undefined") {
        const el = new Audio(opt.url);
        el.volume = Math.min(1, opt.gain);
        void el.play().catch(() => {});
      }
      return;
    }

    // Stop any prior audition immediately so rapid clicking between options sounds razor-clean
    if (activePrinterSource) {
      try {
        activePrinterSource.stop();
      } catch {}
      activePrinterSource = null;
    }

    void loadPrinterAudioBuffer(ctx, opt.url).then((buffer) => {
      if (!buffer) return;
      if (ctx.state === "suspended") {
        void ctx.resume();
      }
      const now = ctx.currentTime;
      const offset = Math.min(opt.offsetSec, Math.max(0, buffer.duration - 0.1));
      const playDur = Math.min(opt.durationSec, Math.max(0.1, buffer.duration - offset));

      const src = ctx.createBufferSource();
      src.buffer = buffer;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(opt.gain, now + 0.014);
      const fadeStart = now + Math.max(0.05, playDur - 0.065);
      gain.gain.setValueAtTime(opt.gain, fadeStart);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + playDur);

      src.connect(gain);
      gain.connect(ctx.destination);
      activePrinterSource = src;
      src.onended = () => {
        if (activePrinterSource === src) {
          activePrinterSource = null;
        }
      };
      src.start(now, offset, playDur + 0.02);
    });
  } catch {
    // Audio playback is best-effort; never block receipt updates
  }
}

/**
 * Schedules one crisp POS card-terminal decline buzz pulse ("ehh") using a detuned
 * sawtooth/square piezo pair shaped through a warm nasal vowel-formant filter.
 */
function scheduleDeclineBuzzPulse(
  ctx: AudioContext,
  destination: AudioNode,
  startTime: number,
  durationSec: number,
  freqHz: number,
  gainLevel = 0.28
): void {
  const bus = ctx.createGain();
  bus.gain.setValueAtTime(0.0001, startTime);
  bus.gain.linearRampToValueAtTime(gainLevel, startTime + 0.007);
  bus.gain.setValueAtTime(gainLevel * 0.96, startTime + Math.max(0.02, durationSec - 0.02));
  bus.gain.exponentialRampToValueAtTime(0.0008, startTime + durationSec);
  bus.connect(destination);

  // Primary buzzy reed/piezo sawtooth
  const saw = ctx.createOscillator();
  saw.type = "sawtooth";
  saw.frequency.setValueAtTime(freqHz, startTime);
  saw.frequency.linearRampToValueAtTime(freqHz * 0.97, startTime + durationSec);
  const sawGain = ctx.createGain();
  sawGain.gain.setValueAtTime(0.68, startTime);
  saw.connect(sawGain);
  sawGain.connect(bus);

  // Slightly detuned square twin for unmistakable POS buzzer "ehh" grit
  const sq = ctx.createOscillator();
  sq.type = "square";
  sq.frequency.setValueAtTime(freqHz - 1.6, startTime);
  sq.frequency.linearRampToValueAtTime((freqHz - 1.6) * 0.97, startTime + durationSec);
  const sqGain = ctx.createGain();
  sqGain.gain.setValueAtTime(0.32, startTime);
  sq.connect(sqGain);
  sqGain.connect(bus);

  const stopAt = startTime + durationSec + 0.015;
  saw.start(startTime);
  sq.start(startTime);
  saw.stop(stopAt);
  sq.stop(stopAt);
}

/**
 * Plays the classic two-pulse POS terminal card-declined sound ("ehh — ehh"):
 * two crisp, warm-filtered downward buzzes with a clean gap in between.
 */
export function playCardDeclinedSound(): void {
  try {
    const ctx = createResumedAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Compact terminal speaker + "ehh" nasal vowel formant EQ (clear, never shrill/harsh)
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.setValueAtTime(145, now);

    const formant = ctx.createBiquadFilter();
    formant.type = "peaking";
    formant.frequency.setValueAtTime(670, now);
    formant.Q.setValueAtTime(1.55, now);
    formant.gain.setValueAtTime(5.2, now);

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(1620, now);
    lp.Q.setValueAtTime(0.85, now);

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.36, now);

    hp.connect(formant);
    formant.connect(lp);
    lp.connect(masterGain);
    masterGain.connect(ctx.destination);

    // Pulse 1: first short "ehh" (218 Hz, 132ms)
    scheduleDeclineBuzzPulse(ctx, hp, now, 0.132, 218, 0.3);
    // Clean 66ms gap -> Pulse 2: slightly lower, firmer second "ehh" (196 Hz, 185ms)
    scheduleDeclineBuzzPulse(ctx, hp, now + 0.198, 0.185, 196, 0.32);

    setTimeout(() => {
      ctx.close().catch(() => { });
    }, 650);
  } catch {
    // Audio playback is best-effort; never block decline UI
  }
}

/**
 * Plays a crisp metallic coin/latch micro-clink inside the cash drawer for the "CHA-" onset.
 */
function scheduleCoinClink(
  ctx: AudioContext,
  destination: AudioNode,
  startTime: number,
  freqHz: number,
  gainLevel: number
): void {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freqHz, startTime);
  g.gain.setValueAtTime(0.0001, startTime);
  g.gain.linearRampToValueAtTime(gainLevel, startTime + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0006, startTime + 0.095);
  osc.connect(g);
  g.connect(destination);
  osc.start(startTime);
  osc.stop(startTime + 0.11);
}

/**
 * Plays a lush vintage brass cash-register "CHA-CHING!" sound (~1.55s) on payment success:
 * 1) Crisp brass drawer latch release + metallic slide + subtle coin-tray clinks ("CHA-")
 * 2) Bright inharmonic brass dome bell strike with warm room shimmer ("-CHING!")
 */
export function playPaymentPaidChaChingSound(): void {
  try {
    const ctx = createResumedAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const sampleRate = ctx.sampleRate;

    const masterOut = ctx.createGain();
    masterOut.gain.setValueAtTime(0.42, now);
    masterOut.connect(ctx.destination);

    // Subtle warm boutique room reverb so the brass dome bell rings naturally
    const dryBus = ctx.createGain();
    dryBus.gain.setValueAtTime(0.8, now);
    dryBus.connect(masterOut);

    const convolver = ctx.createConvolver();
    convolver.buffer = createLobbyReverbBuffer(ctx, 1.35, 3.6);
    const wetBus = ctx.createGain();
    wetBus.gain.setValueAtTime(0.26, now);
    convolver.connect(wetBus);
    wetBus.connect(masterOut);

    const bellBus = ctx.createGain();
    bellBus.gain.setValueAtTime(1.0, now);
    bellBus.connect(dryBus);
    bellBus.connect(convolver);

    // ── Part 1 (0.00s -> 0.11s): Mechanical brass latch + drawer slide + coin tray ("CHA-") ──
    scheduleBrassKeyClick(ctx, dryBus, now);

    // Short metallic cash-drawer roller slide burst
    const slideLen = Math.floor(sampleRate * 0.095);
    const slideBuf = ctx.createBuffer(1, slideLen, sampleRate);
    const slideData = slideBuf.getChannelData(0);
    for (let i = 0; i < slideLen; i++) {
      const p = i / slideLen;
      const env = Math.sin(Math.PI * Math.min(1, p * 1.15)) * (1 - p * 0.45);
      slideData[i] = (Math.random() * 2 - 1) * env;
    }
    const slideSrc = ctx.createBufferSource();
    slideSrc.buffer = slideBuf;
    const slideBp = ctx.createBiquadFilter();
    slideBp.type = "bandpass";
    slideBp.frequency.setValueAtTime(2850, now);
    slideBp.frequency.linearRampToValueAtTime(4200, now + 0.095);
    slideBp.Q.setValueAtTime(1.5, now);
    const slideGain = ctx.createGain();
    slideGain.gain.setValueAtTime(0.24, now);
    slideSrc.connect(slideBp);
    slideBp.connect(slideGain);
    slideGain.connect(dryBus);
    slideSrc.start(now + 0.008);

    // Warm wood/brass drawer stop thump
    const drawerThump = ctx.createOscillator();
    drawerThump.type = "triangle";
    drawerThump.frequency.setValueAtTime(210, now + 0.01);
    drawerThump.frequency.exponentialRampToValueAtTime(88, now + 0.085);
    const thumpGain = ctx.createGain();
    thumpGain.gain.setValueAtTime(0.24, now + 0.01);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    drawerThump.connect(thumpGain);
    thumpGain.connect(dryBus);
    drawerThump.start(now + 0.01);
    drawerThump.stop(now + 0.095);

    // Subtle staggered brass coin-cup clinks leading into the bell
    scheduleCoinClink(ctx, bellBus, now + 0.022, 4186, 0.09);
    scheduleCoinClink(ctx, bellBus, now + 0.048, 5274, 0.11);
    scheduleCoinClink(ctx, bellBus, now + 0.072, 3520, 0.08);
    scheduleCoinClink(ctx, bellBus, now + 0.092, 6272, 0.09);

    // ── Part 2 (0.112s -> 1.55s): Iconic Vintage Brass Cash-Register Dome Bell ("-CHING!") ──
    const bellStart = now + 0.112;

    // Tiny crisp bronze striker impact transient
    const strikeLen = Math.floor(sampleRate * 0.01);
    const strikeBuf = ctx.createBuffer(1, strikeLen, sampleRate);
    const strikeData = strikeBuf.getChannelData(0);
    for (let i = 0; i < strikeLen; i++) {
      strikeData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (strikeLen * 0.16));
    }
    const strikeSrc = ctx.createBufferSource();
    strikeSrc.buffer = strikeBuf;
    const strikeHp = ctx.createBiquadFilter();
    strikeHp.type = "highpass";
    strikeHp.frequency.setValueAtTime(3200, bellStart);
    const strikeGain = ctx.createGain();
    strikeGain.gain.setValueAtTime(0.28, bellStart);
    strikeSrc.connect(strikeHp);
    strikeHp.connect(strikeGain);
    strikeGain.connect(bellBus);
    strikeSrc.start(bellStart);

    // Real metallic bell partials (fundamental + acoustic shimmer twin + 2.756x + 5.404x brass modes)
    const bellPartials: Array<{ freq: number; gain: number; decay: number }> = [
      { freq: 1318.5, gain: 0.36, decay: 1.38 }, // E6 bright brass bell body
      { freq: 1321.4, gain: 0.2, decay: 1.28 },  // Shimmer twin (~2.9 Hz classic bell beat)
      { freq: 2637.0, gain: 0.16, decay: 0.88 }, // Octave ring
      { freq: 3633.8, gain: 0.22, decay: 0.68 }, // Authentic 2.756x dome bell overtone
      { freq: 5274.0, gain: 0.1, decay: 0.42 },  // Sparkling upper brass sheen
      { freq: 7125.0, gain: 0.06, decay: 0.24 }, // Crisp metallic strike gleam
    ];

    for (const p of bellPartials) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(p.freq, bellStart);
      g.gain.setValueAtTime(0.0001, bellStart);
      g.gain.linearRampToValueAtTime(p.gain, bellStart + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0006, bellStart + p.decay);
      osc.connect(g);
      g.connect(bellBus);
      osc.start(bellStart);
      osc.stop(bellStart + p.decay + 0.03);
    }

    setTimeout(() => {
      ctx.close().catch(() => { });
    }, 1850);
  } catch {
    // Audio playback is best-effort; never block payment confirmation
  }
}
