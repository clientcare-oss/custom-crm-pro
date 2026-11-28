/**
 * Dedicated Seamless Preset Generators for Coffee Shop (5 Café Variations) & Thunder (5 Storm Variations)
 * Shared by both ObservatoryAudioEngine (live radio sliders) and RadioAmbienceTab (Settings audition).
 */

import {
  createSeededRng,
  foldSeamlessStereo,
  type BuiltInAmbientSpec,
} from "./ambientSoundGenerators";

/**
 * Real Modal Porcelain / Glass / Silverware Impulse Helper
 * Adds realistic physical dishware sounds (ceramic ring modes + short contact knock + stereo room reflection).
 */
function addCeramicDishHit(
  rawL: Float32Array,
  rawR: Float32Array,
  sr: number,
  timeSec: number,
  pan: number, // 0 = left, 1 = right
  amp: number,
  kind: "mug-saucer" | "spoon-stir" | "plate-stack" | "glass-clink" | "table-set"
) {
  const startIdx = Math.floor(timeSec * sr);
  const durSec = kind === "glass-clink" ? 0.36 : kind === "plate-stack" ? 0.24 : 0.22;
  const len = Math.floor(durSec * sr);
  const pL = Math.cos(pan * Math.PI * 0.5);
  const pR = Math.sin(pan * Math.PI * 0.5);

  // Authentic physical modal frequencies (Hz) & damping rates per dishware material
  const modes =
    kind === "spoon-stir"
      ? [
          { f: 3180, d: 38, w: 0.65 },
          { f: 4920, d: 46, w: 0.45 },
          { f: 6840, d: 58, w: 0.22 },
          { f: 1420, d: 52, w: 0.18 },
        ]
      : kind === "plate-stack"
        ? [
            { f: 1280, d: 28, w: 0.55 },
            { f: 2390, d: 34, w: 0.52 },
            { f: 3910, d: 44, w: 0.32 },
            { f: 520, d: 48, w: 0.36 },
          ]
        : kind === "glass-clink"
          ? [
              { f: 1940, d: 14, w: 0.72 },
              { f: 3560, d: 19, w: 0.44 },
              { f: 5410, d: 26, w: 0.20 },
            ]
          : kind === "table-set"
            ? [
                { f: 290, d: 46, w: 0.68 },
                { f: 640, d: 55, w: 0.38 },
                { f: 1920, d: 42, w: 0.22 },
              ]
            : [
                // mug-saucer: warm ceramic body + crisp porcelain ring
                { f: 460, d: 42, w: 0.38 },
                { f: 2140, d: 26, w: 0.62 },
                { f: 3420, d: 32, w: 0.42 },
                { f: 5180, d: 46, w: 0.18 },
              ];

  // Early room reflection (~32ms delayed opposite stereo ear for genuine indoor café acoustics)
  const reflDelay = Math.floor(0.032 * sr);

  for (let j = 0; j < len && startIdx + j < rawL.length; j++) {
    const dt = j / sr;
    const attack = Math.min(1, dt / 0.0014);
    let sig = 0;
    for (let m = 0; m < modes.length; m++) {
      const md = modes[m];
      sig += Math.sin(2 * Math.PI * md.f * dt) * Math.exp(-dt * md.d) * md.w;
    }
    const sample = sig * attack * amp;
    rawL[startIdx + j] += sample * pL;
    rawR[startIdx + j] += sample * pR;

    const rIdx = startIdx + j + reflDelay;
    if (rIdx < rawL.length) {
      rawL[rIdx] += sample * pR * 0.26;
      rawR[rIdx] += sample * pL * 0.26;
    }
  }
}

/**
 * Adds a realistic cozy fresh coffee pouring into a ceramic mug (rising resonant cavity-fill pitch + droplets)
 */
function addCoffeePourEvent(
  rawL: Float32Array,
  rawR: Float32Array,
  sr: number,
  rng: () => number,
  startSec: number,
  durSec: number,
  pan: number,
  amp: number
) {
  const startIdx = Math.floor(startSec * sr);
  const len = Math.floor(durSec * sr);
  const pL = Math.cos(pan * Math.PI * 0.5);
  const pR = Math.sin(pan * Math.PI * 0.5);

  let y1 = 0, y2 = 0;
  for (let j = 0; j < len && startIdx + j < rawL.length; j++) {
    const u = j / len;
    const env = Math.min(1, u / 0.08) * Math.min(1, (1 - u) / 0.14);
    // Resonant mug cavity pitch rises naturally from 440 Hz -> 980 Hz as mug fills!
    const cavityHz = 440 + 540 * u * u;
    const w = (2 * Math.PI * cavityHz) / sr;
    const r = 0.965;
    const norm = (1 - r) * Math.sin(w) * 3.5;
    const n = rng() * 2 - 1;
    const out = n * norm - (-2 * r * Math.cos(w)) * y1 - (r * r) * y2;
    y2 = y1;
    y1 = out;

    // Gentle liquid bubble blips
    const bubble =
      Math.sin(2 * Math.PI * (cavityHz * 1.45 + 120 * Math.sin(u * 48)) * (j / sr)) *
      Math.max(0, Math.sin(u * 65)) *
      0.08;

    const sample = (out * 0.72 + bubble) * env * amp;
    rawL[startIdx + j] += sample * pL;
    rawR[startIdx + j] += sample * pR;
  }
}

export function createCoffeeShopPresetBuffer(
  ctx: AudioContext,
  presetId: string
): BuiltInAmbientSpec {
  const sr = ctx.sampleRate;
  const loopSeconds = 29.0;
  const crossfadeSeconds = 3.0;
  const loopLen = Math.floor(sr * loopSeconds);
  const xfadeLen = Math.floor(sr * crossfadeSeconds);
  const totalGen = loopLen + xfadeLen;
  const seedMap: Record<string, number> = {
    "cozy-corner": 88101,
    "morning-espresso": 88102,
    "rainy-window": 88103,
    "late-night-bistro": 88104,
    "fireplace-cafe": 88105,
  };
  const rng = createSeededRng(seedMap[presetId] ?? 88101);

  const rawL = new Float32Array(totalGen);
  const rawR = new Float32Array(totalGen);

  const isMorning = presetId === "morning-espresso";
  const isRainy = presetId === "rainy-window";
  const isLateNight = presetId === "late-night-bistro";
  const isFireplace = presetId === "fireplace-cafe";

  // 1. ULTRA-QUIET ROOM AIR (Zero fan-like white/pink static roar!)
  // Only add distinct gentle raindrop taps for rainy-window, or crisp tiny wood crackles for fireplace-cafe.
  if (isRainy) {
    // Very light airy window mist + 180 distinct gentle raindrop taps on glass (NOT fan static!)
    let mL = 0, mR = 0, hpL = 0, hpR = 0;
    for (let i = 0; i < totalGen; i++) {
      const wL = rng() * 2 - 1;
      const wR = rng() * 2 - 1;
      mL = mL * 0.8 + wL * 0.2;
      hpL = hpL * 0.96 + mL * 0.04;
      mR = mR * 0.8 + wR * 0.2;
      hpR = hpR * 0.96 + mR * 0.04;
      rawL[i] = (mL - hpL) * 0.065;
      rawR[i] = (mR - hpR) * 0.065;
    }
    for (let d = 0; d < 220; d++) {
      const idx = Math.floor(rng() * (totalGen - sr * 0.03));
      const len = Math.floor((0.007 + rng() * 0.012) * sr);
      const freq = 1350 + rng() * 1900;
      const amp = 0.045 + rng() * 0.045;
      const pL = 0.25 + rng() * 0.7;
      const pR = 1.15 - pL;
      for (let j = 0; j < len && idx + j < totalGen; j++) {
        const dt = j / sr;
        const s = Math.sin(2 * Math.PI * freq * dt) * Math.exp(-dt * 240) * amp;
        rawL[idx + j] += s * pL;
        rawR[idx + j] += s * pR;
      }
    }
  }

  // 2. AUTHENTIC PITCHED HUMAN CONVERSATION MURMUR (Glottal Vocal-Cord Pulses + Shifting Vowel Formants!)
  // Uses genuine fundamental pitch + harmonics + syllable inflection so it sounds like real distant
  // people softly talking across café tables — ZERO fan-like noise!
  const vowelFormants = [
    [680, 1180], // "ah"
    [480, 1780], // "eh"
    [420, 920],  // "oh"
    [340, 860],  // "oo"
    [540, 1460], // "uh"
  ];

  const speakerPool = [
    { baseF0: 118, pan: 0.18, gain: 0.115, sylRate: 3.3, talkDuty: 0.56 }, // warm male left table
    { baseF0: 204, pan: 0.26, gain: 0.095, sylRate: 3.9, talkDuty: 0.52 }, // conversation partner left
    { baseF0: 132, pan: 0.78, gain: 0.110, sylRate: 3.1, talkDuty: 0.54 }, // warm male right table
    { baseF0: 222, pan: 0.84, gain: 0.092, sylRate: 4.1, talkDuty: 0.50 }, // partner right table
    { baseF0: 192, pan: 0.48, gain: 0.088, sylRate: 3.6, talkDuty: 0.48 }, // mid-room voice
    { baseF0: 124, pan: 0.56, gain: 0.096, sylRate: 2.9, talkDuty: 0.48 }, // mid-room partner
    { baseF0: 236, pan: 0.36, gain: 0.082, sylRate: 4.3, talkDuty: 0.46 }, // counter voice
    { baseF0: 142, pan: 0.68, gain: 0.088, sylRate: 3.5, talkDuty: 0.46 }, // barista voice
  ];

  const speakerCount = isMorning ? 8 : isLateNight ? 3 : isFireplace ? 4 : isRainy ? 5 : 5;
  const activeSpeakers = speakerPool.slice(0, speakerCount);
  const voiceMasterMul = isMorning ? 1.25 : isLateNight ? 0.82 : 1.0;

  for (let sIdx = 0; sIdx < activeSpeakers.length; sIdx++) {
    const sp = activeSpeakers[sIdx];
    const pL = Math.cos(sp.pan * Math.PI * 0.5);
    const pR = Math.sin(sp.pan * Math.PI * 0.5);

    // Create natural conversational phrase & syllable schedule across totalGen
    let cursorSec = 0.25 + rng() * 1.8;
    const phrases: { start: number; dur: number; syllables: { offset: number; dur: number; vIdx: number; pitchMul: number }[] }[] = [];

    while (cursorSec < loopSeconds + crossfadeSeconds - 0.5) {
      const phraseDur = (isLateNight ? 1.4 : 1.9) + rng() * 2.4;
      const syllables: { offset: number; dur: number; vIdx: number; pitchMul: number }[] = [];
      let syOff = 0;
      while (syOff < phraseDur - 0.16) {
        const syDur = 0.14 + rng() * 0.17;
        syllables.push({
          offset: syOff,
          dur: syDur,
          vIdx: Math.floor(rng() * vowelFormants.length),
          pitchMul: 0.88 + rng() * 0.24,
        });
        syOff += syDur + 0.03 + rng() * 0.08;
      }
      phrases.push({ start: cursorSec, dur: phraseDur, syllables });
      // Natural conversational pause while the other person replies
      const pauseSec = (isMorning ? 0.9 : isLateNight ? 3.2 : 1.8) + rng() * 2.4;
      cursorSec += phraseDur + pauseSec;
    }

    // Synthesize each pitched syllable through dual vowel-formant resonators + subtle room reflection
    let phase = 0;
    const reflSamples = Math.floor((0.028 + sIdx * 0.004) * sr);

    for (const ph of phrases) {
      for (const sy of ph.syllables) {
        const [f1, f2] = vowelFormants[sy.vIdx];
        const startIdx = Math.floor((ph.start + sy.offset) * sr);
        const syLen = Math.floor(sy.dur * sr);

        const w1 = (2 * Math.PI * f1) / sr;
        const w2 = (2 * Math.PI * f2) / sr;
        const r1 = 0.972;
        const r2 = 0.968;
        const a1_1 = -2 * r1 * Math.cos(w1);
        const a2_1 = r1 * r1;
        const a1_2 = -2 * r2 * Math.cos(w2);
        const a2_2 = r2 * r2;
        const g1 = (1 - r1) * Math.sin(w1) * 3.0;
        const g2 = (1 - r2) * Math.sin(w2) * 2.4;

        let y1a = 0, y2a = 0, y1b = 0, y2b = 0;

        for (let j = 0; j < syLen && startIdx + j < totalGen; j++) {
          const u = j / syLen;
          // Smooth raised-sine syllable contour + natural slight pitch fall across syllable
          const env = Math.sin(u * Math.PI);
          const f0 = sp.baseF0 * sy.pitchMul * (1.04 - 0.1 * u);
          phase += f0 / sr;
          if (phase >= 1) phase -= 1;

          // Soft warm glottal vocal-cord harmonic wave (fundamental + 2nd + 3rd + 4th + gentle breath)
          const glottal =
            Math.sin(2 * Math.PI * phase) * 0.55 +
            Math.sin(4 * Math.PI * phase) * 0.38 +
            Math.sin(6 * Math.PI * phase) * 0.24 +
            Math.sin(8 * Math.PI * phase) * 0.14 +
            Math.sin(10 * Math.PI * phase) * 0.08 +
            (rng() * 2 - 1) * 0.04;

          const out1 = glottal * g1 - a1_1 * y1a - a2_1 * y2a;
          y2a = y1a; y1a = out1;
          const out2 = glottal * g2 - a1_2 * y1b - a2_2 * y2b;
          y2b = y1b; y1b = out2;

          const voiceSample = (out1 * 0.65 + out2 * 0.35) * env * sp.gain * voiceMasterMul;
          rawL[startIdx + j] += voiceSample * pL;
          rawR[startIdx + j] += voiceSample * pR;

          // Cozy indoor room diffuse reflection so voices sit naturally across the café
          const rIdx = startIdx + j + reflSamples;
          if (rIdx < totalGen) {
            rawL[rIdx] += voiceSample * pR * 0.32;
            rawR[rIdx] += voiceSample * pL * 0.32;
          }
        }
      }
    }
  }

  // 3. CLEAR, TACTILE PORCELAIN DISHES, MUGS, SPOON STIRS, & GLASSES (Unmistakable Café Detail!)
  if (isMorning) {
    // Busy morning espresso bar: dishes, cup-on-saucer, spoon stirring, plates stacking, coffee pouring!
    addCeramicDishHit(rawL, rawR, sr, 1.1, 0.22, 0.20, "mug-saucer");
    addCeramicDishHit(rawL, rawR, sr, 3.8, 0.78, 0.17, "plate-stack");
    addCeramicDishHit(rawL, rawR, sr, 4.18, 0.80, 0.14, "plate-stack");
    // Spoon stirring mug (5 delicate circling taps)
    [6.4, 6.66, 6.94, 7.22, 7.52].forEach((t, idx) =>
      addCeramicDishHit(rawL, rawR, sr, t, 0.72, 0.15 - idx * 0.012, "spoon-stir")
    );
    addCoffeePourEvent(rawL, rawR, sr, rng, 9.2, 2.8, 0.35, 0.22);
    addCeramicDishHit(rawL, rawR, sr, 12.6, 0.32, 0.19, "table-set");
    addCeramicDishHit(rawL, rawR, sr, 14.9, 0.18, 0.18, "mug-saucer");
    addCeramicDishHit(rawL, rawR, sr, 17.4, 0.84, 0.16, "plate-stack");
    addCeramicDishHit(rawL, rawR, sr, 17.75, 0.82, 0.13, "mug-saucer");
    // Second spoon stir
    [20.2, 20.48, 20.78, 21.08].forEach((t, idx) =>
      addCeramicDishHit(rawL, rawR, sr, t, 0.28, 0.14 - idx * 0.014, "spoon-stir")
    );
    addCoffeePourEvent(rawL, rawR, sr, rng, 23.0, 2.4, 0.68, 0.19);
    addCeramicDishHit(rawL, rawR, sr, 26.8, 0.64, 0.19, "mug-saucer");
  } else if (isLateNight) {
    // Intimate late-night bistro: delicate wine/water crystal glass clinks & quiet mug set-downs
    addCeramicDishHit(rawL, rawR, sr, 2.8, 0.28, 0.15, "glass-clink");
    addCeramicDishHit(rawL, rawR, sr, 8.9, 0.76, 0.14, "table-set");
    addCeramicDishHit(rawL, rawR, sr, 13.4, 0.72, 0.16, "glass-clink");
    [18.6, 18.96, 19.34].forEach((t, idx) =>
      addCeramicDishHit(rawL, rawR, sr, t, 0.34, 0.11 - idx * 0.015, "spoon-stir")
    );
    addCeramicDishHit(rawL, rawR, sr, 24.8, 0.62, 0.14, "mug-saucer");
  } else {
    // Quiet Corner Table / Rainy Café Window / Hearthside Coffeehouse
    addCeramicDishHit(rawL, rawR, sr, 2.1, 0.24, 0.18, "mug-saucer");
    [7.2, 7.48, 7.78, 8.10].forEach((t, idx) =>
      addCeramicDishHit(rawL, rawR, sr, t, 0.74, 0.13 - idx * 0.014, "spoon-stir")
    );
    addCoffeePourEvent(rawL, rawR, sr, rng, 11.4, 2.7, 0.36, 0.20);
    addCeramicDishHit(rawL, rawR, sr, 15.2, 0.38, 0.16, "table-set");
    addCeramicDishHit(rawL, rawR, sr, 19.6, 0.80, 0.16, "plate-stack");
    addCeramicDishHit(rawL, rawR, sr, 20.0, 0.78, 0.14, "mug-saucer");
    addCeramicDishHit(rawL, rawR, sr, 25.4, 0.26, 0.17, "mug-saucer");
  }

  // 4. Crisp Hearthside Fireplace Wood Crackles (ONLY for Hearthside Coffeehouse — crisp pops, zero fan hiss!)
  if (isFireplace) {
    for (let c = 0; c < 68; c++) {
      const startIdx = Math.floor(rng() * (totalGen - sr * 0.04));
      const popLen = Math.floor((0.004 + rng() * 0.014) * sr);
      const popAmp = 0.07 + rng() * 0.14;
      const pan = 0.15 + rng() * 0.7;
      const pL = Math.cos(pan * Math.PI * 0.5);
      const pR = Math.sin(pan * Math.PI * 0.5);
      for (let j = 0; j < popLen && startIdx + j < totalGen; j++) {
        const u = j / popLen;
        const env = Math.exp(-u * 8.5);
        const snap = (rng() * 2 - 1) * env * popAmp;
        rawL[startIdx + j] += snap * pL;
        rawR[startIdx + j] += snap * pR;
      }
    }
  }

  for (let i = 0; i < totalGen; i++) {
    rawL[i] = Math.tanh(rawL[i] * 1.15);
    rawR[i] = Math.tanh(rawR[i] * 1.15);
  }

  return {
    buffer: foldSeamlessStereo(ctx, rawL, rawR, loopLen, xfadeLen),
    hpHz: 95,
    lpHz: isLateNight ? 6200 : 7800,
    scale: 0.62,
  };
}

export function createThunderPresetBuffer(
  ctx: AudioContext,
  presetId: string
): BuiltInAmbientSpec {
  const sr = ctx.sampleRate;
  const isSparse = presetId === "sparse-far-thunder";
  const isDeep = presetId === "deep-rumble";
  const isSquall = presetId === "approaching-storm";
  const isWithRain = presetId === "storm-with-rain";

  const loopSeconds = isSparse ? 41.0 : 37.0;
  const crossfadeSeconds = 4.0;
  const loopLen = Math.floor(sr * loopSeconds);
  const xfadeLen = Math.floor(sr * crossfadeSeconds);
  const totalGen = loopLen + xfadeLen;
  const rng = createSeededRng(isSquall ? 774201 : isDeep ? 774202 : isSparse ? 774203 : isWithRain ? 774204 : 774123);

  const rawL = new Float32Array(totalGen);
  const rawR = new Float32Array(totalGen);

  const claps = isSparse
    ? [
        { start: 6.5, dur: 6.4, delayL: 0.0, delayR: 0.024, panL: 0.84, panR: 0.58, amp: 0.78, crack: 0.25, echoes: [0.55, 2.1, 3.8] },
        { start: 25.4, dur: 6.8, delayL: 0.02, delayR: 0.0, panL: 0.55, panR: 0.86, amp: 0.82, crack: 0.28, echoes: [0.48, 1.9, 3.6] },
      ]
    : isSquall
      ? [
          { start: 1.8, dur: 8.0, delayL: 0.0, delayR: 0.018, panL: 0.96, panR: 0.66, amp: 1.18, crack: 1.05, echoes: [0.25, 1.15, 2.4, 3.9, 5.5] },
          { start: 11.6, dur: 7.2, delayL: 0.016, delayR: 0.0, panL: 0.62, panR: 0.95, amp: 1.05, crack: 0.88, echoes: [0.3, 1.45, 2.9, 4.4] },
          { start: 20.4, dur: 8.6, delayL: 0.0, delayR: 0.014, panL: 0.88, panR: 0.86, amp: 1.16, crack: 1.0, echoes: [0.22, 1.0, 2.25, 3.7, 5.4] },
          { start: 30.2, dur: 6.8, delayL: 0.022, delayR: 0.0, panL: 0.7, panR: 0.84, amp: 0.94, crack: 0.72, echoes: [0.38, 1.7, 3.2] },
        ]
      : [
          { start: 2.2, dur: 7.4, delayL: 0.0, delayR: 0.022, panL: 0.92, panR: 0.62, amp: 1.05, crack: isDeep ? 0.14 : 0.72, echoes: [0.35, 1.35, 2.75, 4.35] },
          { start: 12.8, dur: 6.2, delayL: 0.018, delayR: 0.0, panL: 0.55, panR: 0.90, amp: 0.82, crack: isDeep ? 0.10 : 0.42, echoes: [0.40, 1.85, 3.30] },
          { start: 21.4, dur: 8.2, delayL: 0.0, delayR: 0.014, panL: 0.78, panR: 0.82, amp: 0.98, crack: isDeep ? 0.12 : 0.65, echoes: [0.28, 1.15, 2.40, 3.90, 5.45] },
          { start: 31.2, dur: 5.8, delayL: 0.024, delayR: 0.0, panL: 0.64, panR: 0.76, amp: 0.74, crack: isDeep ? 0.08 : 0.30, echoes: [0.55, 2.05, 3.45] },
        ];

  let brownL = 0, brownR = 0;
  let subL = 0, subR = 0;
  let midL = 0, midR = 0;
  let rainLpL = 0, rainHpL = 0, rainLpR = 0, rainHpR = 0;

  for (let i = 0; i < totalGen; i++) {
    const t = i / sr;
    const wL = rng() * 2 - 1;
    const wR = rng() * 2 - 1;

    brownL = (brownL + 0.015 * wL) / 1.015;
    brownR = (brownR + 0.015 * wR) / 1.015;
    subL = subL * 0.982 + brownL * 0.018;
    subR = subR * 0.982 + brownR * 0.018;
    midL = midL * 0.88 + wL * 0.12;
    midR = midR * 0.88 + wR * 0.12;

    let lowEnvL = isDeep ? 0.045 : 0.018;
    let lowEnvR = isDeep ? 0.045 : 0.018;
    let midEnvL = 0;
    let midEnvR = 0;

    for (const c of claps) {
      const dtL = t - (c.start + c.delayL);
      const dtR = t - (c.start + c.delayR);

      if (dtL >= 0 && dtL < c.dur) {
        const u = dtL / c.dur;
        const crackEnv = Math.min(1, dtL / 0.05) * Math.exp(-dtL * 2.4) * (0.65 + 0.35 * Math.sin(dtL * 29)) * c.crack;
        let echoSum = 0;
        for (let eIdx = 0; eIdx < c.echoes.length; eIdx++) {
          const d = (dtL - c.echoes[eIdx]) / (0.45 + eIdx * 0.28);
          echoSum += Math.exp(-d * d) * Math.pow(0.76, eIdx);
        }
        const tailEnv = Math.min(1, u / 0.08) * Math.pow(1 - u, 1.45);
        lowEnvL += (crackEnv * 0.55 + echoSum * 0.62 + tailEnv * 0.35) * c.amp * c.panL;
        midEnvL += (crackEnv * 0.85 + echoSum * 0.24 * (1 - u)) * c.amp * c.panL;
      }

      if (dtR >= 0 && dtR < c.dur) {
        const u = dtR / c.dur;
        const crackEnv = Math.min(1, dtR / 0.05) * Math.exp(-dtR * 2.4) * (0.65 + 0.35 * Math.sin(dtR * 27 + 0.8)) * c.crack;
        let echoSum = 0;
        for (let eIdx = 0; eIdx < c.echoes.length; eIdx++) {
          const d = (dtR - c.echoes[eIdx]) / (0.45 + eIdx * 0.28);
          echoSum += Math.exp(-d * d) * Math.pow(0.76, eIdx);
        }
        const tailEnv = Math.min(1, u / 0.08) * Math.pow(1 - u, 1.45);
        lowEnvR += (crackEnv * 0.55 + echoSum * 0.62 + tailEnv * 0.35) * c.amp * c.panR;
        midEnvR += (crackEnv * 0.85 + echoSum * 0.24 * (1 - u)) * c.amp * c.panR;
      }
    }

    let rainAddL = 0;
    let rainAddR = 0;
    if (isWithRain) {
      rainLpL = rainLpL * 0.74 + wL * 0.26;
      rainHpL = rainHpL * 0.96 + rainLpL * 0.04;
      rainLpR = rainLpR * 0.74 + wR * 0.26;
      rainHpR = rainHpR * 0.96 + rainLpR * 0.04;
      rainAddL = (rainLpL - rainHpL) * 0.26;
      rainAddR = (rainLpR - rainHpR) * 0.26;
    }

    rawL[i] = Math.tanh((brownL * 0.85 + subL * 1.95) * lowEnvL + midL * 0.28 * midEnvL + rainAddL);
    rawR[i] = Math.tanh((brownR * 0.85 + subR * 1.95) * lowEnvR + midR * 0.28 * midEnvR + rainAddR);
  }

  return {
    buffer: foldSeamlessStereo(ctx, rawL, rawR, loopLen, xfadeLen),
    lpHz: isWithRain ? 2900 : isSquall ? 980 : isDeep ? 320 : isSparse ? 480 : 680,
    lowShelfHz: 95,
    lowShelfDb: isDeep ? 6.0 : isSquall ? 5.0 : 4.5,
    scale: 0.62,
  };
}
