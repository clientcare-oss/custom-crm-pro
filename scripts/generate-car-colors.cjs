const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
}

function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function processAutomotivePixels(data, info, viewName, colorId, targetH, targetS, lightMul) {
  const out = Buffer.alloc(data.length);
  const width = info.width;
  const height = info.height;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];

      if (a < 15) {
        out[i] = r; out[i+1] = g; out[i+2] = b; out[i+3] = a;
        continue;
      }

      // 1. Preserve authentic red LED taillight assemblies
      if (r > 125 && r > g * 1.45 && r > b * 1.45) {
        out[i] = r; out[i+1] = g; out[i+2] = b; out[i+3] = a;
        continue;
      }

      const [h, s, l] = rgbToHsl(r, g, b);

      // 2. Deep shadows, tire rubber, dark undercarriage: preserve pitch black
      if (l < 0.13) {
        out[i] = r; out[i+1] = g; out[i+2] = b; out[i+3] = a;
        continue;
      }

      // 3. Preserve silver alloy wheel rims on side profile views
      if (viewName.startsWith('side')) {
        const dFront = Math.hypot(x - 120, y - 365);
        const dRear = Math.hypot(x - 480, y - 365);
        if (dFront < 42 || dRear < 42) {
          out[i] = r; out[i+1] = g; out[i+2] = b; out[i+3] = a;
          continue;
        }
      }

      // 4. Specular highlights & chrome window accents: keep clean metallic reflection
      if (l > 0.78) {
        out[i] = r; out[i+1] = g; out[i+2] = b; out[i+3] = a;
        continue;
      }

      let nr, ng, nb;
      if (colorId === 'black') {
        nr = r; ng = g; nb = b;
      } else {
        // Deep Automotive Metallic Finish:
        // Midtone body saturation curve, smoothly desaturating into shadow and clearcoat glint
        let sat = targetS;
        if (l > 0.52) {
          sat = targetS * Math.max(0, 1 - (l - 0.52) / 0.24);
        } else if (l < 0.22) {
          sat = targetS * Math.max(0, (l - 0.13) / 0.09);
        }

        const finalL = Math.max(0.06, Math.min(0.56, l * lightMul));
        [nr, ng, nb] = hslToRgb(targetH, sat, finalL);

        // Blend with original specular reflection on highlights
        if (l > 0.52) {
          const specWeight = (l - 0.52) / 0.24;
          nr = Math.round(nr * (1 - specWeight) + r * specWeight);
          ng = Math.round(ng * (1 - specWeight) + g * specWeight);
          nb = Math.round(nb * (1 - specWeight) + b * specWeight);
        }
      }

      out[i] = nr; out[i+1] = ng; out[i+2] = nb; out[i+3] = a;
    }
  }

  return out;
}

// ── Official Locked Waypoint Fleet Color Palette ──
const WAYPOINT_FLEET_COLORS = [
  { id: 'black', name: 'Onyx Black', h: 0, s: 0, lightMul: 1 },
  { id: 'bronze', name: 'Burnished Bronze', h: 0.080, s: 0.50, lightMul: 0.78 },
  { id: 'red', name: 'Crimson Red', h: 0.985, s: 0.52, lightMul: 0.75 },
  { id: 'blue', name: 'Cobalt Blue', h: 0.600, s: 0.46, lightMul: 0.78 },
  { id: 'green', name: 'Emerald Green', h: 0.388, s: 0.42, lightMul: 0.72 },
];

async function generateAll(bodyPrefix = 'car') {
  const carsDir = path.join(__dirname, '..', 'client', 'public', 'cars');
  const views = bodyPrefix === 'car'
    ? [
        { src: 'norm_rear_top.png', name: 'rear' },
        { src: 'norm_side_right.png', name: 'side_right' },
        { src: 'norm_side_left.png', name: 'side_left' },
      ]
    : [
        { src: `${bodyPrefix}_norm_rear.png`, name: 'rear' },
        { src: `${bodyPrefix}_norm_side_right.png`, name: 'side_right' },
        { src: `${bodyPrefix}_norm_side_left.png`, name: 'side_left' },
      ];

  console.log(`Applying official 5 Waypoint Fleet Colors to body type "${bodyPrefix}"...`);

  for (const c of WAYPOINT_FLEET_COLORS) {
    for (const v of views) {
      const srcPath = path.join(carsDir, v.src);
      const destPath = path.join(carsDir, `${bodyPrefix}_${c.id}_${v.name}.png`);
      const img = sharp(srcPath);
      const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
      const processed = processAutomotivePixels(data, info, v.name, c.id, c.h, c.s, c.lightMul);
      await sharp(processed, { raw: info }).png().toFile(destPath);
      console.log(`Generated authentic ${c.name} sprite: ${bodyPrefix}_${c.id}_${v.name}.png`);
    }
  }

  console.log(`Successfully generated all 15 authentic sprites for "${bodyPrefix}" with official Waypoint fleet colors!`);
}

const args = process.argv.slice(2);
const bodyArg = args.find(a => a.startsWith('--body='));
const targetBody = bodyArg ? bodyArg.split('=')[1] : 'car';

generateAll(targetBody).catch(console.error);

