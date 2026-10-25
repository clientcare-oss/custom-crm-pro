const sharp = require('sharp');
const path = require('path');

const brainDir = 'C:\\Users\\conta\\.gemini\\antigravity-ide\\brain\\f3a3bd1e-0896-4f87-9db7-44a948e869d5';
const outDir = path.join(__dirname, '../client/public/assets/vault');

const files = [
  { in: 'folder_3d_amber_1792940974799.jpg', out: 'folder_ieps_3d.png', threshold: 18 },
  { in: 'folder_3d_blue_1792941034039.jpg', out: 'folder_evals_3d.png', threshold: 18 },
  { in: 'folder_3d_green_1792941057266.jpg', out: 'folder_school_3d.png', threshold: 18 },
  { in: 'folder_3d_purple_1792941105298.jpg', out: 'folder_comm_3d.png', threshold: 10 },
  { in: 'folder_3d_red_1792941124733.jpg', out: 'folder_medical_3d.png', threshold: 10 },
  { in: 'folder_3d_orange_1792941188535.jpg', out: 'folder_behavior_3d.png', threshold: 10 },
  { in: 'folder_3d_indigo_1792941206400.jpg', out: 'folder_progress_3d.png', threshold: 12 },
  { in: 'folder_3d_all_1792941226875.jpg', out: 'folder_all_3d.png', threshold: 6 },
];

async function removeBlackBackground(inputPath, outputPath, bgThreshold) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;

  // Flood fill from border
  const visited = new Uint8Array(width * height);
  const queue = [];

  function addPixel(x, y) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = y * width + x;
    if (visited[idx]) return;

    const r = data[idx * 4];
    const g = data[idx * 4 + 1];
    const b = data[idx * 4 + 2];

    const brightness = Math.max(r, g, b);
    if (brightness <= bgThreshold) {
      visited[idx] = 1;
      queue.push(x, y);
    }
  }

  for (let x = 0; x < width; x++) {
    addPixel(x, 0);
    addPixel(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    addPixel(0, y);
    addPixel(width - 1, y);
  }

  let head = 0;
  while (head < queue.length) {
    const x = queue[head++];
    const y = queue[head++];

    addPixel(x + 1, y);
    addPixel(x - 1, y);
    addPixel(x, y + 1);
    addPixel(x, y - 1);
  }

  for (let i = 0; i < width * height; i++) {
    if (visited[i]) {
      data[i * 4 + 3] = 0;
    }
  }

  // Soft feathering on outer boundary
  const featherRange = bgThreshold + 15;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (!visited[idx]) {
        let bgNeighbors = 0;
        if (visited[idx - 1]) bgNeighbors++;
        if (visited[idx + 1]) bgNeighbors++;
        if (visited[idx - width]) bgNeighbors++;
        if (visited[idx + width]) bgNeighbors++;

        if (bgNeighbors > 0) {
          const r = data[idx * 4];
          const g = data[idx * 4 + 1];
          const b = data[idx * 4 + 2];
          const maxVal = Math.max(r, g, b);
          if (maxVal <= featherRange) {
            const factor = (maxVal - bgThreshold) / (featherRange - bgThreshold);
            data[idx * 4 + 3] = Math.max(0, Math.min(255, Math.floor(factor * 255)));
          }
        }
      }
    }
  }

  const processedBuffer = await sharp(data, {
    raw: { width, height, channels: 4 }
  })
    .trim({ threshold: 5 })
    .resize({ width: 512, height: 512, fit: 'inside' })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);

  console.log(`Saved ${path.basename(outputPath)}: ${processedBuffer.width}x${processedBuffer.height}`);
}

async function main() {
  for (const item of files) {
    const inPath = path.join(brainDir, item.in);
    const outPath = path.join(outDir, item.out);
    try {
      await removeBlackBackground(inPath, outPath, item.threshold);
    } catch (err) {
      console.error(`Failed ${item.in}:`, err.message);
    }
  }
}

main().catch(console.error);
