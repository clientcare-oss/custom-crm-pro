const sharp = require('sharp');
const path = require('path');

const inPath = 'C:\\Users\\conta\\.gemini\\antigravity-ide\\brain\\f3a3bd1e-0896-4f87-9db7-44a948e869d5\\iep_booklet_angled_1792942049400.jpg';
const outPath = path.join(__dirname, '../client/public/assets/vault/iep_booklet_3d.png');
const outExactPath = path.join(__dirname, '../client/public/assets/vault/iep_booklet_exact.png');

async function processBooklet() {
  const { data, info } = await sharp(inPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;

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
    // Background threshold (black and floor shadow)
    if (brightness <= 24) {
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
          if (maxVal <= 65) {
            data[idx * 4 + 3] = Math.max(0, Math.min(255, Math.floor((maxVal - 24) / 41 * 255)));
          }
        }
      }
    }
  }

  // Clean isolated stray shadow speckles (e.g. bottom left outer shadow)
  // For pixels with x < 120 and y > 820 in 1024 space:
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      // Below spine bottom shadow
      if (x < 110 && y > 840) {
        data[idx * 4 + 3] = 0;
      }
    }
  }

  // Add 48px generous padding border all around so it NEVER looks chopped!
  const processedBuffer = await sharp(data, {
    raw: { width, height, channels: 4 }
  })
    .trim({ threshold: 5 })
    .extend({
      top: 40,
      bottom: 40,
      left: 40,
      right: 40,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .resize({ width: 600, height: 600, fit: 'inside' })
    .png({ compressionLevel: 9 })
    .toBuffer();

  await sharp(processedBuffer).toFile(outPath);
  await sharp(processedBuffer).toFile(outExactPath);

  console.log('Successfully saved pristine unchopped 3D IEP Booklet!');
}

processBooklet().catch(console.error);
