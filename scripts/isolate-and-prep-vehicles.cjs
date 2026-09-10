const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

/**
 * Flood-fill background isolation from image borders
 * Replaces pure white/near-white studio background with crisp alpha channel
 */
function removeStudioWhiteBackground(data, width, height, tolerance = 240) {
  const out = Buffer.alloc(width * height * 4);
  const visited = new Uint8Array(width * height);
  const queue = [];

  // Seed boundary pixels
  for (let x = 0; x < width; x++) {
    queue.push(x, 0);
    queue.push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    queue.push(0, y);
    queue.push(width - 1, y);
  }

  // Flood fill outer white background
  let head = 0;
  while (head < queue.length) {
    const x = queue[head++];
    const y = queue[head++];
    const idx = y * width + x;

    if (visited[idx]) continue;
    visited[idx] = 1;

    const p = idx * 4;
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];

    // Check if pixel is background white/light grey
    const isBg = (r >= tolerance && g >= tolerance && b >= tolerance) ||
                 (r >= tolerance - 15 && g >= tolerance - 15 && b >= tolerance - 15 && Math.abs(r - g) < 10 && Math.abs(g - b) < 10);

    if (isBg) {
      // Add 4-neighbors
      if (x > 0 && !visited[idx - 1]) queue.push(x - 1, y);
      if (x < width - 1 && !visited[idx + 1]) queue.push(x + 1, y);
      if (y > 0 && !visited[idx - width]) queue.push(x, y - 1);
      if (y < height - 1 && !visited[idx + width]) queue.push(x, y + 1);
    }
  }

  // Construct output buffer with soft anti-aliased edge
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const p = idx * 4;
      const r = data[p];
      const g = data[p + 1];
      const b = data[p + 2];

      if (visited[idx]) {
        // Transparent outer background
        out[p] = 0;
        out[p + 1] = 0;
        out[p + 2] = 0;
        out[p + 3] = 0;
      } else {
        // Vehicle pixel
        // Check if adjacent to background for subtle edge anti-aliasing
        let hasBgNeighbor = false;
        if (x > 0 && visited[idx - 1]) hasBgNeighbor = true;
        if (x < width - 1 && visited[idx + 1]) hasBgNeighbor = true;
        if (y > 0 && visited[idx - width]) hasBgNeighbor = true;
        if (y < height - 1 && visited[idx + width]) hasBgNeighbor = true;

        out[p] = r;
        out[p + 1] = g;
        out[p + 2] = b;
        out[p + 3] = hasBgNeighbor ? 210 : 255;
      }
    }
  }

  return out;
}

async function processVehicle(rawPath, outputPrefix, isRear) {
  const carsDir = path.join(__dirname, '..', 'client', 'public', 'cars');
  const img = sharp(rawPath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const isolated = removeStudioWhiteBackground(data, info.width, info.height, 245);

  if (rawPath.includes('sedan_side')) {
    // Zero out ground shadow below tire contact patch
    for (let y = 638; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const p = (y * info.width + x) * 4;
        isolated[p] = 0;
        isolated[p + 1] = 0;
        isolated[p + 2] = 0;
        isolated[p + 3] = 0;
      }
    }
  }

  if (rawPath.includes('truck_rear')) {
    // 1. Erase all floor shadow below the trailer hitch (y >= 1132)
    for (let y = 1132; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const p = (y * info.width + x) * 4;
        isolated[p] = 0; isolated[p+1] = 0; isolated[p+2] = 0; isolated[p+3] = 0;
      }
    }
    // 2. Erase white shadow halo to the sides of the hitch (y >= 1090, x < 415 or x > 480)
    for (let y = 1090; y < 1132; y++) {
      for (let x = 0; x < info.width; x++) {
        if (x < 415 || x > 480) {
          const p = (y * info.width + x) * 4;
          const r = isolated[p], g = isolated[p+1], b = isolated[p+2];
          if (r > 100 || g > 100 || b > 100) {
            isolated[p] = 0; isolated[p+1] = 0; isolated[p+2] = 0; isolated[p+3] = 0;
          }
        }
      }
    }
    // 3. Remove any remaining white ground puddle below bumper (y >= 1060)
    for (let y = 1060; y < 1132; y++) {
      for (let x = 0; x < info.width; x++) {
        const p = (y * info.width + x) * 4;
        const r = isolated[p], g = isolated[p+1], b = isolated[p+2];
        if (r > 150 && g > 150 && b > 150 && Math.abs(r - g) < 20 && Math.abs(g - b) < 20) {
          isolated[p] = 0; isolated[p+1] = 0; isolated[p+2] = 0; isolated[p+3] = 0;
        }
      }
    }
  }

  if (rawPath.includes('sedan_rear')) {
    // Erase all floor shadow below the sedan exhaust/bumper (y >= 1097)
    for (let y = 1097; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const p = (y * info.width + x) * 4;
        isolated[p] = 0; isolated[p+1] = 0; isolated[p+2] = 0; isolated[p+3] = 0;
      }
    }
    // Erase any white edge halo under bumper (y >= 1060)
    for (let y = 1060; y < 1097; y++) {
      for (let x = 0; x < info.width; x++) {
        const p = (y * info.width + x) * 4;
        const r = isolated[p], g = isolated[p+1], b = isolated[p+2];
        if (r > 150 && g > 150 && b > 150 && Math.abs(r - g) < 20 && Math.abs(g - b) < 20) {
          isolated[p] = 0; isolated[p+1] = 0; isolated[p+2] = 0; isolated[p+3] = 0;
        }
      }
    }
  }

  if (rawPath.includes('sports_rear')) {
    // Erase all floor shadow below sports car diffuser/exhaust (y >= 1082)
    for (let y = 1082; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const p = (y * info.width + x) * 4;
        isolated[p] = 0; isolated[p+1] = 0; isolated[p+2] = 0; isolated[p+3] = 0;
      }
    }
  }

  if (isRear) {
    // Rear view: trim transparent space and resize to standard slender proportions ~383x580
    const rearBuffer = await sharp(isolated, { raw: { width: info.width, height: info.height, channels: 4 } })
      .trim()
      .resize({ height: 580, width: 383, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const cleanData = Buffer.from(rearBuffer.data);
    const rW = rearBuffer.info.width;
    const rH = rearBuffer.info.height;

    // Universal rule: "no white should show under any car in any view"
    // Erase any light/white ground pixels in the lower undercarriage zone (y >= 520)
    for (let y = 520; y < rH; y++) {
      for (let x = 0; x < rW; x++) {
        const p = (y * rW + x) * 4;
        const r = cleanData[p], g = cleanData[p+1], b = cleanData[p+2];
        if (r > 140 && g > 140 && b > 140 && Math.abs(r - g) < 25 && Math.abs(g - b) < 25) {
          cleanData[p] = 0;
          cleanData[p + 1] = 0;
          cleanData[p + 2] = 0;
          cleanData[p + 3] = 0;
        }
      }
    }

    await sharp(cleanData, { raw: { width: rW, height: rH, channels: 4 } })
      .png()
      .toFile(path.join(carsDir, `${outputPrefix}_norm_rear.png`));

    console.log(`Saved clean rear view (zero white ground): ${outputPrefix}_norm_rear.png`);
  } else {
    // Raw generated image faces LEFT (nose on left).
    // Therefore:
    // - side_left must face LEFT (West) -> isolated
    // - side_right must face RIGHT (East) -> flopped
    const leftPath = path.join(carsDir, `${outputPrefix}_norm_side_left.png`);
    const rightPath = path.join(carsDir, `${outputPrefix}_norm_side_right.png`);

    const sideBuffer = await sharp(isolated, { raw: { width: info.width, height: info.height, channels: 4 } })
      .trim()
      .resize({ width: 560, height: 260, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({
        top: 170,
        bottom: 170,
        left: 20,
        right: 20,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const cleanSide = Buffer.from(sideBuffer.data);
    const sW = sideBuffer.info.width;
    const sH = sideBuffer.info.height;

    // Erase any ground shadow underneath the tires (y >= 380)
    for (let y = 380; y < sH; y++) {
      for (let x = 0; x < sW; x++) {
        const p = (y * sW + x) * 4;
        cleanSide[p] = 0; cleanSide[p+1] = 0; cleanSide[p+2] = 0; cleanSide[p+3] = 0;
      }
    }

    await sharp(cleanSide, { raw: { width: sW, height: sH, channels: 4 } })
      .png()
      .toFile(leftPath);

    // Right profile (facing East/Right): horizontal flip of leftPath
    await sharp(leftPath).flop().toFile(rightPath);

    console.log(`Saved correctly-oriented clean side views: ${outputPrefix}_norm_side_right.png (facing East) and side_left.png (facing West)`);
  }
}

async function run() {
  const brainDir = path.resolve('C:/Users/conta/.gemini/antigravity-ide/brain/683024c8-4d0e-49b8-8eea-359e7a05cab9');

  const models = [
    {
      prefix: 'sedan',
      rear: path.join(brainDir, 'sedan_rear_raw_1789040412263.jpg'),
      side: path.join(brainDir, 'sedan_side_raw_1789040425927.jpg'),
    },
    {
      prefix: 'sports',
      rear: path.join(brainDir, 'sports_rear_raw_1789040441047.jpg'),
      side: path.join(brainDir, 'sports_side_raw_1789040456676.jpg'),
    },
    {
      prefix: 'truck',
      rear: path.join(brainDir, 'truck_rear_raw_1789040471656.jpg'),
      side: path.join(brainDir, 'truck_side_raw_1789040488402.jpg'),
    },
  ];

  for (const m of models) {
    console.log(`\nProcessing ${m.prefix}...`);
    await processVehicle(m.rear, m.prefix, true);
    await processVehicle(m.side, m.prefix, false);
  }

  console.log('\nAll raw vehicle models isolated and prepped successfully!');
}

run().catch(console.error);
