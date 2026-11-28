/**
 * Seamless Equal-Power Crossfaded Ambient Soundscape Generators (30 Built-In Presets Across 6 Channels)
 * - 5 distinct selectable presets per ambient channel: Fan, Rain, Ocean, Train (No Horn), Coffee Shop, Thunder.
 * - Zero loop clicks or seams across hours of continuous listening.
 * - Shared by both ObservatoryAudioEngine and Radio Settings Ambience live preview.
 */

import type { AmbientCategoryId } from "@shared/waypointRadio";
import {
  createCoffeeShopPresetBuffer,
  createThunderPresetBuffer,
} from "./ambientCafeThunderGenerators";

export interface BuiltInAmbientSpec {
  buffer: AudioBuffer;
  lpHz: number;
  hpHz?: number;
  lowShelfHz?: number;
  lowShelfDb?: number;
  peakHz?: number;
  peakDb?: number;
  scale: number;
}

/** Deterministic fast PRNG so every acoustic event placement is organic yet consistent */
export function createSeededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Creates an equal-power loop-crossfaded AudioBuffer from any uploaded ambient MP3/WAV */
export function makeSeamlessLoopBuffer(
  ctx: AudioContext,
  decoded: AudioBuffer,
  crossfadeSec = 2.0
): AudioBuffer {
  const sr = decoded.sampleRate;
  const xfadeLen = Math.min(Math.floor(sr * crossfadeSec), Math.floor(decoded.length / 4));
  if (xfadeLen < 128 || decoded.length <= xfadeLen * 2) return decoded;
  const loopLen = decoded.length - xfadeLen;
  const outBuf = ctx.createBuffer(decoded.numberOfChannels, loopLen, sr);
  for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
    const src = decoded.getChannelData(ch);
    const dst = outBuf.getChannelData(ch);
    for (let i = 0; i < loopLen; i++) dst[i] = src[i];
    for (let i = 0; i < xfadeLen; i++) {
      const t = i / xfadeLen;
      dst[i] = src[i] * Math.sin(t * Math.PI * 0.5) + src[loopLen + i] * Math.cos(t * Math.PI * 0.5);
    }
  }
  return outBuf;
}

/** Equal-power crossfade helper for raw stereo arrays of length (loopLen + xfadeLen) */
export function foldSeamlessStereo(
  ctx: AudioContext,
  rawL: Float32Array,
  rawR: Float32Array,
  loopLen: number,
  xfadeLen: number
): AudioBuffer {
  const buf = ctx.createBuffer(2, loopLen, ctx.sampleRate);
  const channels = [
    { raw: rawL, out: buf.getChannelData(0) },
    { raw: rawR, out: buf.getChannelData(1) },
  ];
  for (const { raw, out } of channels) {
    for (let i = 0; i < loopLen; i++) out[i] = raw[i];
    for (let i = 0; i < xfadeLen; i++) {
      const t = i / xfadeLen;
      out[i] =
        raw[i] * Math.sin(t * Math.PI * 0.5) +
        raw[loopLen + i] * Math.cos(t * Math.PI * 0.5);
    }
  }
  return buf;
}

export function createSeamlessNoiseBuffer(
  ctx: AudioContext,
  loopSeconds: number,
  kind: "pink" | "brown",
  crossfadeSeconds = 2.5
): AudioBuffer {
  const sr = ctx.sampleRate;
  const loopLen = Math.floor(sr * loopSeconds);
  const xfadeLen = Math.min(Math.floor(sr * crossfadeSeconds), Math.floor(loopLen / 3));
  const totalGen = loopLen + xfadeLen;
  const rawL = new Float32Array(totalGen);
  const rawR = new Float32Array(totalGen);

  for (const raw of [rawL, rawR]) {
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
      for (let w = 0; w < 2048; w++) last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      for (let i = 0; i < totalGen; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        raw[i] = last * 1.4;
      }
    }
  }
  return foldSeamlessStereo(ctx, rawL, rawR, loopLen, xfadeLen);
}

/** 5 Fan Presets: Box Fan, Ceiling Fan, Desk Fan, Oscillating Stand Fan, Deep Air Purifier */
function createFanPresetBuffer(ctx: AudioContext, presetId: string): BuiltInAmbientSpec {
  if (presetId === "ceiling-fan" || presetId === "oscillating-fan") {
    const sr = ctx.sampleRate;
    const isOsc = presetId === "oscillating-fan";
    const loopSeconds = isOsc ? 22.0 : 16.0;
    const xfadeSec = 2.0;
    const loopLen = Math.floor(sr * loopSeconds);
    const xfadeLen = Math.floor(sr * xfadeSec);
    const totalGen = loopLen + xfadeLen;
    const rawL = new Float32Array(totalGen);
    const rawR = new Float32Array(totalGen);
    let bL = 0, bR = 0;
    for (let i = 0; i < totalGen; i++) {
      const t = i / sr;
      bL = (bL + 0.022 * (Math.random() * 2 - 1)) / 1.022;
      bR = (bR + 0.022 * (Math.random() * 2 - 1)) / 1.022;
      if (isOsc) {
        // Smooth stereo oscillation every 11s (2 full cycles in 22s loop)
        const pan = 0.5 + 0.34 * Math.sin((2 * Math.PI * t) / 11.0);
        rawL[i] = bL * 1.35 * (1.2 - pan * 0.7);
        rawR[i] = bR * 1.35 * (0.5 + pan * 0.7);
      } else {
        // Gentle overhead ceiling-fan blade pulse (~1.0 Hz)
        const pulse = 0.84 + 0.16 * Math.sin(2 * Math.PI * 1.0 * t);
        rawL[i] = bL * 1.35 * pulse;
        rawR[i] = bR * 1.35 * (0.84 + 0.16 * Math.sin(2 * Math.PI * 1.0 * t + 0.6));
      }
    }
    return {
      buffer: foldSeamlessStereo(ctx, rawL, rawR, loopLen, xfadeLen),
      lpHz: isOsc ? 640 : 420,
      peakHz: isOsc ? 180 : 115,
      peakDb: 3.5,
      scale: 0.36,
    };
  }

  if (presetId === "desk-fan") {
    return {
      buffer: createSeamlessNoiseBuffer(ctx, 17, "pink", 2.5),
      hpHz: 140,
      lpHz: 1050,
      peakHz: 240,
      peakDb: 3.0,
      scale: 0.28,
    };
  }

  if (presetId === "heavy-air-purifier") {
    return {
      buffer: createSeamlessNoiseBuffer(ctx, 19, "brown", 2.5),
      lpHz: 310,
      lowShelfHz: 110,
      lowShelfDb: 4.5,
      scale: 0.42,
    };
  }

  // Default: Classic Box Fan
  return {
    buffer: createSeamlessNoiseBuffer(ctx, 17, "brown", 2.5),
    lpHz: 500,
    peakHz: 135,
    peakDb: 4.5,
    scale: 0.35,
  };
}

/** 5 Rain Presets: Gentle Shower, Rain on Cabin Roof, Soft Window Drizzle, Heavy Downpour, Forest Canopy Rain */
function createRainPresetBuffer(ctx: AudioContext, presetId: string): BuiltInAmbientSpec {
  if (presetId === "rain-on-roof" || presetId === "window-drizzle" || presetId === "rain-in-leaves") {
    const sr = ctx.sampleRate;
    const loopSeconds = 17.0;
    const xfadeSec = 2.5;
    const loopLen = Math.floor(sr * loopSeconds);
    const xfadeLen = Math.floor(sr * xfadeSec);
    const totalGen = loopLen + xfadeLen;
    const rng = createSeededRng(presetId === "rain-on-roof" ? 4101 : presetId === "window-drizzle" ? 4102 : 4103);
    const rawL = new Float32Array(totalGen);
    const rawR = new Float32Array(totalGen);

    let b0L = 0, b1L = 0, b2L = 0, b0R = 0, b1R = 0, b2R = 0;
    const isRoof = presetId === "rain-on-roof";
    const isDrizzle = presetId === "window-drizzle";

    for (let i = 0; i < totalGen; i++) {
      const wL = rng() * 2 - 1;
      const wR = rng() * 2 - 1;
      b0L = 0.995 * b0L + wL * 0.055;
      b1L = 0.955 * b1L + wL * 0.095;
      b2L = 0.78 * b2L + wL * 0.17;
      b0R = 0.995 * b0R + wR * 0.055;
      b1R = 0.955 * b1R + wR * 0.095;
      b2R = 0.78 * b2R + wR * 0.17;
      const baseMul = isDrizzle ? 0.11 : isRoof ? 0.22 : 0.18;
      // Gentle leaf rustle swell for rain-in-leaves
      const rustle =
        !isRoof && !isDrizzle ? 0.82 + 0.18 * Math.sin((2 * Math.PI * i) / (sr * 4.25)) : 1.0;
      rawL[i] = (b0L + b1L + b2L) * baseMul * rustle;
      rawR[i] = (b0R + b1R + b2R) * baseMul * (2 - rustle);
    }

    // Individual organic raindrop patters on roof/window/leaves
    const dropCount = isDrizzle ? 210 : isRoof ? 310 : 250;
    for (let d = 0; d < dropCount; d++) {
      const idx = Math.floor(rng() * (totalGen - sr * 0.03));
      const len = Math.floor((0.008 + rng() * 0.014) * sr);
      const freq = isRoof ? 420 + rng() * 680 : isDrizzle ? 1400 + rng() * 2200 : 850 + rng() * 1400;
      const amp = (isRoof ? 0.075 : isDrizzle ? 0.055 : 0.048) * (0.5 + rng() * 0.7);
      const panL = 0.2 + rng() * 0.8;
      const panR = 1.2 - panL;
      for (let j = 0; j < len && idx + j < totalGen; j++) {
        const dt = j / sr;
        const env = Math.exp(-dt * (isRoof ? 180 : 280));
        const s = (Math.sin(2 * Math.PI * freq * dt) * 0.55 + (rng() * 2 - 1) * 0.45) * env * amp;
        rawL[idx + j] += s * panL;
        rawR[idx + j] += s * panR;
      }
    }

    return {
      buffer: foldSeamlessStereo(ctx, rawL, rawR, loopLen, xfadeLen),
      hpHz: isRoof ? 180 : isDrizzle ? 650 : 380,
      lpHz: isRoof ? 2100 : isDrizzle ? 4500 : 3800,
      peakHz: isRoof ? 270 : undefined,
      peakDb: isRoof ? 4.0 : undefined,
      scale: isDrizzle ? 0.32 : 0.34,
    };
  }

  if (presetId === "heavy-downpour") {
    return {
      buffer: createSeamlessNoiseBuffer(ctx, 19, "pink", 3.0),
      hpHz: 200,
      lpHz: 4200,
      lowShelfHz: 220,
      lowShelfDb: 3.5,
      scale: 0.36,
    };
  }

  // Default: Steady Rain Shower
  return {
    buffer: createSeamlessNoiseBuffer(ctx, 13, "pink", 2.5),
    hpHz: 340,
    lpHz: 3400,
    scale: 0.25,
  };
}

/** 5 Ocean Presets: Calm Shoreline, Deep Swell, Lively Surf, Harbor Lapping, Distant Cliffs */
function createOceanPresetBuffer(ctx: AudioContext, presetId: string): BuiltInAmbientSpec {
  const sr = ctx.sampleRate;
  const isDeep = presetId === "deep-swell";
  const isLively = presetId === "lively-surf";
  const isHarbor = presetId === "harbor-lapping";
  const isCliffs = presetId === "distant-cliffs";

  const loopSeconds = isDeep ? 30.0 : isHarbor ? 23.0 : 31.0;
  const crossfadeSeconds = 3.5;
  const loopLen = Math.floor(sr * loopSeconds);
  const xfadeLen = Math.floor(sr * crossfadeSeconds);
  const totalGen = loopLen + xfadeLen;

  const rawL = new Float32Array(totalGen);
  const rawR = new Float32Array(totalGen);

  const waves = isHarbor
    ? [
        { start: 0.5, dur: 4.2, panStart: 0.25, panEnd: 0.55, amp: 0.56, crashiness: 0.42 },
        { start: 4.1, dur: 3.8, panStart: 0.72, panEnd: 0.42, amp: 0.48, crashiness: 0.38 },
        { start: 7.9, dur: 4.6, panStart: 0.35, panEnd: 0.65, amp: 0.60, crashiness: 0.48 },
        { start: 12.2, dur: 3.9, panStart: 0.68, panEnd: 0.38, amp: 0.50, crashiness: 0.36 },
        { start: 15.8, dur: 4.4, panStart: 0.30, panEnd: 0.62, amp: 0.58, crashiness: 0.45 },
        { start: 19.6, dur: 4.1, panStart: 0.65, panEnd: 0.35, amp: 0.52, crashiness: 0.40 },
        { start: 23.5, dur: 4.2, panStart: 0.25, panEnd: 0.55, amp: 0.56, crashiness: 0.42 },
      ]
    : isDeep
      ? [
          { start: 0.6, dur: 15.2, panStart: 0.36, panEnd: 0.66, amp: 1.05, crashiness: 0.62 },
          { start: 15.4, dur: 15.2, panStart: 0.64, panEnd: 0.36, amp: 0.96, crashiness: 0.58 },
          { start: 30.6, dur: 15.2, panStart: 0.36, panEnd: 0.66, amp: 1.05, crashiness: 0.62 },
        ]
      : isLively
        ? [
            { start: 0.5, dur: 8.6, panStart: 0.26, panEnd: 0.76, amp: 1.02, crashiness: 1.15 },
            { start: 8.2, dur: 8.2, panStart: 0.74, panEnd: 0.28, amp: 0.94, crashiness: 1.08 },
            { start: 15.8, dur: 8.8, panStart: 0.32, panEnd: 0.72, amp: 1.04, crashiness: 1.18 },
            { start: 23.6, dur: 8.4, panStart: 0.70, panEnd: 0.30, amp: 0.92, crashiness: 1.05 },
            { start: 31.5, dur: 8.6, panStart: 0.26, panEnd: 0.76, amp: 1.02, crashiness: 1.15 },
          ]
        : [
            { start: 0.8, dur: 11.4, panStart: 0.32, panEnd: 0.72, amp: 1.0, crashiness: isCliffs ? 0.55 : 0.92 },
            { start: 10.6, dur: 10.2, panStart: 0.68, panEnd: 0.36, amp: 0.84, crashiness: isCliffs ? 0.48 : 0.76 },
            { start: 19.8, dur: 11.8, panStart: 0.42, panEnd: 0.66, amp: 0.96, crashiness: isCliffs ? 0.52 : 0.88 },
            { start: 30.8, dur: 11.4, panStart: 0.32, panEnd: 0.72, amp: 1.0, crashiness: isCliffs ? 0.55 : 0.92 },
          ];

  let brownL = 0, brownR = 0;
  let b0L = 0, b1L = 0, b2L = 0, b0R = 0, b1R = 0, b2R = 0;
  let foamHpL = 0, foamHpR = 0, foamLpL = 0, foamLpR = 0;

  for (let i = 0; i < totalGen; i++) {
    const t = i / sr;
    const wL = Math.random() * 2 - 1;
    const wR = Math.random() * 2 - 1;

    brownL = (brownL + 0.015 * wL) / 1.015;
    brownR = (brownR + 0.015 * wR) / 1.015;

    b0L = 0.995 * b0L + wL * 0.055;
    b1L = 0.960 * b1L + wL * 0.095;
    b2L = 0.800 * b2L + wL * 0.165;
    const pinkL = (b0L + b1L + b2L) * 0.25;

    b0R = 0.995 * b0R + wR * 0.055;
    b1R = 0.960 * b1R + wR * 0.095;
    b2R = 0.800 * b2R + wR * 0.165;
    const pinkR = (b0R + b1R + b2R) * 0.25;

    foamLpL = foamLpL * 0.72 + wL * 0.28;
    foamHpL = foamHpL * 0.965 + foamLpL * 0.035;
    const foamL = (foamLpL - foamHpL) * 0.42;

    foamLpR = foamLpR * 0.72 + wR * 0.28;
    foamHpR = foamHpR * 0.965 + foamLpR * 0.035;
    const foamR = (foamLpR - foamHpR) * 0.42;

    let swellL = isCliffs ? 0.28 : isHarbor ? 0.10 : 0.16;
    let swellR = swellL;
    let bodyL = isHarbor ? 0.04 : 0.06;
    let bodyR = bodyL;
    let washL = 0.025;
    let washR = 0.025;

    for (const wv of waves) {
      const dt = t - wv.start;
      if (dt >= 0 && dt < wv.dur) {
        const u = dt / wv.dur;
        const pan = wv.panStart + (wv.panEnd - wv.panStart) * u;
        const pL = Math.cos(pan * Math.PI * 0.5) * 1.25;
        const pR = Math.sin(pan * Math.PI * 0.5) * 1.25;
        const swellEnv = Math.sin(Math.min(1, u / 0.62) * Math.PI) * (u < 0.62 ? 1 : 0);
        const crashDist = (u - 0.34) / 0.16;
        const crashEnv = Math.exp(-crashDist * crashDist) * wv.crashiness;
        let foamEnv = 0;
        if (u > 0.24) {
          const fu = (u - 0.24) / 0.76;
          foamEnv = Math.min(1, fu / 0.15) * Math.pow(1 - fu, 1.65) * wv.crashiness;
        }
        swellL += swellEnv * 0.72 * wv.amp * pL;
        swellR += swellEnv * 0.72 * wv.amp * pR;
        bodyL += (crashEnv * 0.92 + foamEnv * 0.35) * wv.amp * pL;
        bodyR += (crashEnv * 0.92 + foamEnv * 0.35) * wv.amp * pR;
        washL += (crashEnv * 0.42 + foamEnv * 0.88) * wv.amp * pL;
        washR += (crashEnv * 0.42 + foamEnv * 0.88) * wv.amp * pR;
      }
    }

    rawL[i] = Math.tanh(brownL * swellL + pinkL * bodyL + foamL * washL);
    rawR[i] = Math.tanh(brownR * swellR + pinkR * bodyR + foamR * washR);
  }

  return {
    buffer: foldSeamlessStereo(ctx, rawL, rawR, loopLen, xfadeLen),
    lpHz: isCliffs ? 950 : isDeep ? 1900 : isLively ? 4400 : isHarbor ? 2600 : 3400,
    lowShelfHz: 180,
    lowShelfDb: isCliffs || isDeep ? 5.5 : 3.5,
    scale: isHarbor ? 0.46 : 0.42,
  };
}

/** 5 Train on Tracks Presets (ALL Strictly Zero Horn): Luxury Sleeper, Night Express, Ultra-Slow Glide, Wooden Carriage, Rainy Sleeper */
function createTrainPresetBuffer(ctx: AudioContext, presetId: string): BuiltInAmbientSpec {
  const sr = ctx.sampleRate;
  const isExpress = presetId === "night-express";
  const isUltraSlow = presetId === "ultra-slow-freight";
  const isWooden = presetId === "wooden-carriage";
  const isRainy = presetId === "rainy-sleeper";

  const railCycleSec = isExpress ? 1.55 : isUltraSlow ? 3.0 : isWooden ? 2.0 : isRainy ? 2.3 : 2.2;
  const cycleCount = isUltraSlow ? 8 : isExpress ? 14 : 10;
  const loopSeconds = railCycleSec * cycleCount;
  const crossfadeSeconds = railCycleSec;
  const loopLen = Math.floor(sr * loopSeconds);
  const xfadeLen = Math.floor(sr * crossfadeSeconds);
  const totalGen = loopLen + xfadeLen;

  const rawL = new Float32Array(totalGen);
  const rawR = new Float32Array(totalGen);

  let brownL = 0, brownR = 0, pinkL = 0, pinkR = 0, thumpLpL = 0, thumpLpR = 0;
  let rainLpL = 0, rainHpL = 0, rainLpR = 0, rainHpR = 0;

  const impactOffsets = [0.0, railCycleSec * 0.12, railCycleSec * 0.49, railCycleSec * 0.61];

  for (let i = 0; i < totalGen; i++) {
    const t = i / sr;
    const whiteL = Math.random() * 2 - 1;
    const whiteR = Math.random() * 2 - 1;

    brownL = (brownL + 0.017 * whiteL) / 1.017;
    brownR = (brownR + 0.017 * whiteR) / 1.017;
    pinkL = pinkL * 0.91 + whiteL * 0.09;
    pinkR = pinkR * 0.91 + whiteR * 0.09;

    const swayAmp = isWooden ? 0.12 : 0.08;
    const sway = 1 - swayAmp + swayAmp * Math.sin((2 * Math.PI * t) / (railCycleSec * 4));

    const phase = t % railCycleSec;
    let bogieEnv = 0;
    let bodyPulse = 0;
    for (let k = 0; k < impactOffsets.length; k++) {
      const dt = phase - impactOffsets[k];
      if (dt >= 0 && dt < 0.22) {
        const accent = k === 0 ? 1.0 : k === 2 ? 0.88 : 0.68;
        const attack = Math.min(1, dt / (isUltraSlow ? 0.018 : 0.012));
        const decay = Math.exp(-dt * (isExpress ? 22 : isUltraSlow ? 14 : 17.5));
        const subDecay = Math.exp(-dt * 12.5);
        bogieEnv += accent * attack * decay;
        const baseFreq = isWooden ? 88 : 64;
        bodyPulse += accent * attack * subDecay * Math.sin(2 * Math.PI * (baseFreq + (k % 2) * 8) * dt);
      }
    }

    thumpLpL = thumpLpL * 0.92 + whiteL * 0.08;
    thumpLpR = thumpLpR * 0.92 + whiteR * 0.08;

    let rainL = 0, rainR = 0;
    if (isRainy) {
      rainLpL = rainLpL * 0.76 + whiteL * 0.24;
      rainHpL = rainHpL * 0.96 + rainLpL * 0.04;
      rainLpR = rainLpR * 0.76 + whiteR * 0.24;
      rainHpR = rainHpR * 0.96 + rainLpR * 0.04;
      rainL = (rainLpL - rainHpL) * 0.24;
      rainR = (rainLpR - rainHpR) * 0.24;
    }

    const jointGain = isUltraSlow ? 0.20 : isWooden ? 0.34 : 0.28;
    rawL[i] = Math.tanh(brownL * 0.66 * sway + pinkL * 0.14 + bogieEnv * (thumpLpL * jointGain + bodyPulse * 0.11) + rainL);
    rawR[i] = Math.tanh(brownR * 0.66 * (2 - sway) + pinkR * 0.14 + bogieEnv * (thumpLpR * jointGain + bodyPulse * 0.105) + rainR);
  }

  return {
    buffer: foldSeamlessStereo(ctx, rawL, rawR, loopLen, xfadeLen),
    lpHz: isRainy ? 2600 : isWooden ? 1100 : isExpress ? 1050 : isUltraSlow ? 680 : 840,
    peakHz: isWooden ? 185 : undefined,
    peakDb: isWooden ? 4.5 : undefined,
    scale: 0.44,
  };
}

/** Unified builder for all 6 ambient categories × 5 built-in presets */
export function createBuiltInAmbientSpec(
  ctx: AudioContext,
  category: AmbientCategoryId,
  presetId: string
): BuiltInAmbientSpec {
  switch (category) {
    case "fan":
      return createFanPresetBuffer(ctx, presetId);
    case "rain-shower":
      return createRainPresetBuffer(ctx, presetId);
    case "ocean":
      return createOceanPresetBuffer(ctx, presetId);
    case "train":
      return createTrainPresetBuffer(ctx, presetId);
    case "coffee-shop":
      return createCoffeeShopPresetBuffer(ctx, presetId);
    case "thunder":
      return createThunderPresetBuffer(ctx, presetId);
  }
}

/** Connects a BuiltInAmbientSpec into a looping AudioBufferSourceNode + Biquad filter chain */
export function connectAmbientSpecChain(
  ctx: AudioContext,
  spec: BuiltInAmbientSpec,
  dest: AudioNode,
  initialGain: number
): { source: AudioBufferSourceNode; gain: GainNode } {
  const source = ctx.createBufferSource();
  source.buffer = spec.buffer;
  source.loop = true;

  let tail: AudioNode = source;

  if (spec.hpHz) {
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = spec.hpHz;
    tail.connect(hp);
    tail = hp;
  }

  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = spec.lpHz;
  tail.connect(lp);
  tail = lp;

  if (spec.lowShelfHz && spec.lowShelfDb) {
    const shelf = ctx.createBiquadFilter();
    shelf.type = "lowshelf";
    shelf.frequency.value = spec.lowShelfHz;
    shelf.gain.value = spec.lowShelfDb;
    tail.connect(shelf);
    tail = shelf;
  }

  if (spec.peakHz && spec.peakDb) {
    const peak = ctx.createBiquadFilter();
    peak.type = "peaking";
    peak.frequency.value = spec.peakHz;
    peak.Q.value = 0.85;
    peak.gain.value = spec.peakDb;
    tail.connect(peak);
    tail = peak;
  }

  const gain = ctx.createGain();
  gain.gain.value = initialGain;
  tail.connect(gain);
  gain.connect(dest);
  source.start();

  return { source, gain };
}
