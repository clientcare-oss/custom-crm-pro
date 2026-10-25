const sharp = require('sharp');
const path = require('path');

const inPath = 'C:\\Users\\conta\\.gemini\\antigravity-ide\\brain\\f3a3bd1e-0896-4f87-9db7-44a948e869d5\\upload_cloud_3d_1792942386932.jpg';
const outPath = path.join(__dirname, '../client/public/assets/vault/upload_cloud_3d.png');

async function processUploadCloud() {
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
    if (brightness <= 20) {
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
          if (maxVal <= 60) {
            data[idx * 4 + 3] = Math.max(0, Math.min(255, Math.floor((maxVal - 20) / 40 * 255)));
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
    .toFile(outPath);

  console.log(`Saved transparent upload_cloud_3d.png: ${processedBuffer.width}x${processedBuffer.height}`);
}

processUploadCloud().catch(console.error);
