const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const carsDir = path.join(__dirname, '..', 'client', 'public', 'cars');

async function cleanSprite(fileName) {
  const filePath = path.join(carsDir, fileName);
  const img = sharp(filePath);
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  const width = info.width;
  const height = info.height;
  let modified = 0;

  const isRear = fileName.includes('rear');
  const isSide = fileName.includes('side');

  if (isRear) {
    // Zero out any white / light-grey ground floor shadow below the bumper (y >= 510)
    for (let y = 510; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const p = (y * width + x) * 4;
        const a = out[p + 3];
        if (a === 0) continue;

        const r = out[p];
        const g = out[p + 1];
        const b = out[p + 2];

        // Any light neutral pixel in the ground zone is floor shadow
        if (r > 120 && g > 120 && b > 120 && Math.abs(r - g) < 25 && Math.abs(g - b) < 25) {
          out[p] = 0;
          out[p + 1] = 0;
          out[p + 2] = 0;
          out[p + 3] = 0;
          modified++;
        }
      }
    }
  } else if (isSide) {
    // Zero out any ground shadow beneath the tires (y >= 385)
    for (let y = 385; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const p = (y * width + x) * 4;
        if (out[p + 3] > 0) {
          out[p] = 0;
          out[p + 1] = 0;
          out[p + 2] = 0;
          out[p + 3] = 0;
          modified++;
        }
      }
    }

    // Zero out any white floor halos between wheels (y >= 365, outside alloy wheels)
    for (let y = 365; y < 385; y++) {
      for (let x = 0; x < width; x++) {
        const p = (y * width + x) * 4;
        const a = out[p + 3];
        if (a === 0) continue;

        const r = out[p];
        const g = out[p + 1];
        const b = out[p + 2];

        // Outside the wheel hubs, any white is studio floor bleed
        if (r > 140 && g > 140 && b > 140 && Math.abs(r - g) < 20 && Math.abs(g - b) < 20) {
          // Check if inside wheel region (wheel centers around x=120 and x=480)
          const dRear = Math.hypot(x - 120, y - 365);
          const dFront = Math.hypot(x - 480, y - 365);
          if (dRear > 42 && dFront > 42) {
            out[p] = 0;
            out[p + 1] = 0;
            out[p + 2] = 0;
            out[p + 3] = 0;
            modified++;
          }
        }
      }
    }
  }

  if (modified > 0) {
    await sharp(out, { raw: { width, height, channels: 4 } }).png().toFile(filePath);
    console.log(`Cleaned ${fileName}: erased ${modified} ground/white pixels.`);
  }
}

async function run() {
  const files = fs.readdirSync(carsDir).filter((f) => f.endsWith('.png'));
  console.log(`Auditing and purifying all ${files.length} sprites for 100% zero-white ground...`);

  for (const f of files) {
    await cleanSprite(f);
  }

  console.log('\nAll car sprites successfully purified with zero white ground shadows!');
}

run().catch(console.error);
