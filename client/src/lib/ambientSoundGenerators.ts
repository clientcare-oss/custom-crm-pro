/**
 * Seamless Equal-Power Crossfaded Ambient Soundscape Generators
 * - Zero clicks or loop seams across hours of continuous listening.
 * - Includes:
 *   1. Pink / Brown seamless noise buffers (for Fan, Rain, Ocean)
 *   2. Train on Tracks (No Horn) — rhythmic steel-wheel-on-rail cadence + warm carriage rumble
 *   3. Crickets — organic layered stereo night field crickets (warm, never shrill)
 *   4. Thunder — deep distant rolling thunder swells across a 29-second prime cycle
 *   5. makeSeamlessLoopBuffer — equal-power loop crossfader for uploaded custom MP3/WAV files
 */

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
function foldSeamlessStereo(
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
      for (let w = 0; w < 2048; w++) {
        last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      }
      for (let i = 0; i < totalGen; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        raw[i] = last * 1.4;
      }
    }
  }
  return foldSeamlessStereo(ctx, rawL, rawR, loopLen, xfadeLen);
}

/**
 * Train on Tracks (Strictly NO Horn / NO Whistle)
 * Rhythmic double-bogie rail-joint clickety-clack ("da-dum ... da-dum") over warm trackbed rumble.
 * Exact 16-second loop aligned to 1.0s rail cycles for mathematically seamless beat continuity.
 */
export function createTrainOnTracksBuffer(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const loopSeconds = 16.0;
  const crossfadeSeconds = 2.0;
  const loopLen = Math.floor(sr * loopSeconds);
  const xfadeLen = Math.floor(sr * crossfadeSeconds);
  const totalGen = loopLen + xfadeLen;

  const rawL = new Float32Array(totalGen);
  const rawR = new Float32Array(totalGen);

  let brownL = 0;
  let brownR = 0;
  let lpL = 0;
  let lpR = 0;

  // Rail joint impact offsets inside each 1.0s rail-length cycle (front bogie pair + rear bogie pair)
  const impactOffsets = [0.0, 0.135, 0.44, 0.575];

  for (let i = 0; i < totalGen; i++) {
    const t = i / sr;
    const whiteL = Math.random() * 2 - 1;
    const whiteR = Math.random() * 2 - 1;

    // Steady warm trackbed & carriage rumble
    brownL = (brownL + 0.024 * whiteL) / 1.024;
    brownR = (brownR + 0.024 * whiteR) / 1.024;

    // Gentle low-frequency carriage sway
    const sway = 0.88 + 0.12 * Math.sin(2 * Math.PI * 0.25 * t);

    // Compute rail-joint clack envelope for current position in 1.0s rail cycle
    const phase = t % 1.0;
    let clackEnv = 0;
    let thudTone = 0;
    for (let k = 0; k < impactOffsets.length; k++) {
      const dt = phase - impactOffsets[k];
      if (dt >= 0 && dt < 0.095) {
        const accent = k === 0 || k === 2 ? 1.0 : 0.72;
        const fastDecay = Math.exp(-dt * 42);
        const bodyDecay = Math.exp(-dt * 24);
        clackEnv += accent * fastDecay;
        thudTone += accent * bodyDecay * Math.sin(2 * Math.PI * (112 + k * 9) * dt);
      }
    }

    // Filtered mid-range rail wheel roll
    lpL = lpL * 0.86 + whiteL * 0.14;
    lpR = lpR * 0.86 + whiteR * 0.14;

    const rumbleL = brownL * 0.52 * sway;
    const rumbleR = brownR * 0.52 * (1.76 - sway);
    const wheelClackL = clackEnv * (lpL * 0.38 + thudTone * 0.11);
    const wheelClackR = clackEnv * (lpR * 0.36 + thudTone * 0.1);

    rawL[i] = rumbleL + wheelClackL + lpL * 0.055;
    rawR[i] = rumbleR + wheelClackR + lpR * 0.055;
  }

  return foldSeamlessStereo(ctx, rawL, rawR, loopLen, xfadeLen);
}

/**
 * Cozy Ambient Coffee Shop / Café Soundscape (Mapped to the Steaming Coffee Mug icon)
 * 23-second prime-length seamless stereo loop combining:
 * - Warm distant café room murmur (soft multi-voice organic conversational swells, never harsh)
 * - Subtle distant porcelain mug & spoon clinks across the stereo field
 * - One gentle distant espresso steam wisp per cycle
 */
export function createCoffeeShopBuffer(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const loopSeconds = 23.0;
  const crossfadeSeconds = 3.0;
  const loopLen = Math.floor(sr * loopSeconds);
  const xfadeLen = Math.floor(sr * crossfadeSeconds);
  const totalGen = loopLen + xfadeLen;

  const rawL = new Float32Array(totalGen);
  const rawR = new Float32Array(totalGen);

  // Subtle distant ceramic cup/saucer clink events across the 23s loop
  const clinks = [
    { t: 3.1, f1: 2480, f2: 3720, panL: 0.78, panR: 0.28, amp: 0.042 },
    { t: 8.6, f1: 2190, f2: 3340, panL: 0.30, panR: 0.80, amp: 0.035 },
    { t: 14.9, f1: 2660, f2: 4050, panL: 0.65, panR: 0.45, amp: 0.038 },
    { t: 19.8, f1: 2320, f2: 3490, panL: 0.35, panR: 0.74, amp: 0.032 },
  ];

  // Warm café murmur pink-ish noise + mid-band smoothed room bed
  let b0L = 0, b1L = 0, b2L = 0, lpL = 0, hpL = 0;
  let b0R = 0, b1R = 0, b2R = 0, lpR = 0, hpR = 0;

  for (let i = 0; i < totalGen; i++) {
    const t = i / sr;
    const wL = Math.random() * 2 - 1;
    const wR = Math.random() * 2 - 1;

    // 3-pole warm pink noise approximation
    b0L = 0.996 * b0L + wL * 0.052;
    b1L = 0.965 * b1L + wL * 0.095;
    b2L = 0.820 * b2L + wL * 0.165;
    const pinkL = (b0L + b1L + b2L) * 0.22;

    b0R = 0.996 * b0R + wR * 0.052;
    b1R = 0.965 * b1R + wR * 0.095;
    b2R = 0.820 * b2R + wR * 0.165;
    const pinkR = (b0R + b1R + b2R) * 0.22;

    // Slow organic café chatter density waves (distinct L/R rhythms)
    const murmurEnvL =
      0.66 +
      0.18 * Math.sin(2 * Math.PI * (t / 4.6) + 0.3) +
      0.14 * Math.sin(2 * Math.PI * (t / 2.9) + 1.4);
    const murmurEnvR =
      0.66 +
      0.18 * Math.sin(2 * Math.PI * (t / 5.75) + 1.9) +
      0.14 * Math.sin(2 * Math.PI * (t / 3.28) + 0.6);

    // Warm voice-band smoothing (~260 Hz - 1600 Hz)
    lpL = lpL * 0.86 + pinkL * 0.14;
    hpL = hpL * 0.985 + lpL * 0.015;
    const chatterL = (lpL - hpL) * 1.15 * murmurEnvL;

    lpR = lpR * 0.86 + pinkR * 0.14;
    hpR = hpR * 0.985 + lpR * 0.015;
    const chatterR = (lpR - hpR) * 1.15 * murmurEnvR;

    // Gentle distant espresso steam burst once per cycle (t = 11.2s..12.8s)
    let steamL = 0;
    let steamR = 0;
    const dtSteam = t - 11.2;
    if (dtSteam >= 0 && dtSteam < 1.6) {
      const sEnv = Math.sin((dtSteam / 1.6) * Math.PI);
      const steamSample = (wL + wR) * 0.012 * sEnv * sEnv;
      steamL = steamSample * 0.45;
      steamR = steamSample * 0.72;
    }

    // Soft distant ceramic mug clinks
    let clinkL = 0;
    let clinkR = 0;
    for (const c of clinks) {
      const dt = t - c.t;
      if (dt >= 0 && dt < 0.22) {
        const env = Math.exp(-dt * 26) * Math.min(1, dt / 0.003);
        const ping =
          (Math.sin(2 * Math.PI * c.f1 * dt) * 0.7 +
            Math.sin(2 * Math.PI * c.f2 * dt) * 0.3) *
          env *
          c.amp;
        clinkL += ping * c.panL;
        clinkR += ping * c.panR;
      }
    }

    rawL[i] = chatterL + pinkL * 0.16 + steamL + clinkL;
    rawR[i] = chatterR + pinkR * 0.16 + steamR + clinkR;
  }

  return foldSeamlessStereo(ctx, rawL, rawR, loopLen, xfadeLen);
}

/**
 * Deep Cozy Distant Rolling Thunder
 * 29-second prime-length seamless cycle with 3 natural rolling distant storm rumbles & soft atmospheric bed.
 */
export function createThunderBuffer(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const loopSeconds = 29.0;
  const crossfadeSeconds = 3.0;
  const loopLen = Math.floor(sr * loopSeconds);
  const xfadeLen = Math.floor(sr * crossfadeSeconds);
  const totalGen = loopLen + xfadeLen;

  const rawL = new Float32Array(totalGen);
  const rawR = new Float32Array(totalGen);

  // Three varied rolling distant thunder events across the 29s storm cycle
  const rumbles = [
    { start: 2.8, dur: 5.8, panL: 0.85, panR: 0.55, amp: 0.95, rollFreq: 1.35 },
    { start: 13.4, dur: 6.6, panL: 0.52, panR: 0.88, amp: 0.82, rollFreq: 1.05 },
    { start: 22.1, dur: 4.9, panL: 0.72, panR: 0.72, amp: 0.74, rollFreq: 1.65 },
  ];

  let brownL = 0;
  let brownR = 0;
  let subL = 0;
  let subR = 0;

  for (let i = 0; i < totalGen; i++) {
    const t = i / sr;
    const wL = Math.random() * 2 - 1;
    const wR = Math.random() * 2 - 1;

    // Deep brown noise + extra-smooth sub-bass filter for authentic distant thunder body
    brownL = (brownL + 0.016 * wL) / 1.016;
    brownR = (brownR + 0.016 * wR) / 1.016;
    subL = subL * 0.985 + brownL * 0.015;
    subR = subR * 0.985 + brownR * 0.015;

    let envL = 0.025; // very quiet distant storm air floor
    let envR = 0.025;

    for (const r of rumbles) {
      const dt = t - r.start;
      if (dt >= 0 && dt < r.dur) {
        const u = dt / r.dur;
        // Soft gradual attack (0..14%) + deep rolling cloud echo modulations + long warm decay tail
        const attack = Math.min(1, u / 0.14);
        const decay = Math.pow(1 - u, 1.85);
        const roll =
          0.62 +
          0.26 * Math.sin(2 * Math.PI * r.rollFreq * dt + 0.4) +
          0.14 * Math.sin(2 * Math.PI * (r.rollFreq * 2.13) * dt);
        const e = attack * decay * Math.max(0.15, roll) * r.amp;
        envL += e * r.panL;
        envR += e * r.panR;
      }
    }

    rawL[i] = (brownL * 0.72 + subL * 1.45) * envL;
    rawR[i] = (brownR * 0.72 + subR * 1.45) * envR;
  }

  return foldSeamlessStereo(ctx, rawL, rawR, loopLen, xfadeLen);
}
