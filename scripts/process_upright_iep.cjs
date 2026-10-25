const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function processUprightIep() {
  const inputPath = 'C:\\Users\\conta\\.gemini\\antigravity-ide\\brain\\f3a3bd1e-0896-4f87-9db7-44a948e869d5\\iep_doc_upright_straight_1792943593068.jpg';
  const outDir = path.resolve(__dirname, '../client/public/assets/vault');

  console.log('Loading input image:', inputPath);
  const { data, info } = await sharp(inputPath).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  // Background is dark/neutral background around the folio
  const isBg = (x, y) => {
    const idx = (y * width + x) * channels;
    const r = data[idx], g = data[idx+1], b = data[idx+2];
    const maxVal = Math.max(r, g, b);
    const chroma = Math.abs(r - g) + Math.abs(g - b) + Math.abs(b - r);
    // Dark neutral background
    return (maxVal <= 42 && chroma <= 22) || (maxVal <= 24);
  };

  const visited = new Uint8Array(width * height);
  const queue = [];

  for (let x = 0; x < width; x++) {
    if (isBg(x, 0)) { visited[x] = 1; queue.push(x, 0); }
    if (isBg(x, height - 1)) { visited[(height - 1) * width + x] = 1; queue.push(x, height - 1); }
  }
  for (let y = 0; y < height; y++) {
    if (isBg(0, y) && !visited[y * width]) { visited[y * width] = 1; queue.push(0, y); }
    if (isBg(width - 1, y) && !visited[y * width + width - 1]) { visited[y * width + width - 1] = 1; queue.push(width - 1, y); }
  }

  let head = 0;
  while (head < queue.length) {
    const qx = queue[head++];
    const qy = queue[head++];
    const neighbors = [
      [qx + 1, qy], [qx - 1, qy], [qx, qy + 1], [qx, qy - 1]
    ];
    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nidx = ny * width + nx;
        if (!visited[nidx] && isBg(nx, ny)) {
          visited[nidx] = 1;
          queue.push(nx, ny);
        }
      }
    }
  }

  // Second pass: clean any isolated dark residual pixels adjacent to visited background
  for (let iter = 0; iter < 3; iter++) {
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const pIdx = y * width + x;
        if (!visited[pIdx]) {
          const idx = pIdx * channels;
          const r = data[idx], g = data[idx+1], b = data[idx+2];
          const maxVal = Math.max(r, g, b);
          // If this pixel is very dark (<= 28) and touches a visited pixel, it is background shadow/bleed
          if (maxVal <= 28) {
            if (visited[pIdx - 1] || visited[pIdx + 1] || visited[pIdx - width] || visited[pIdx + width]) {
              visited[pIdx] = 1;
            }
          }
        }
      }
    }
  }

  // Build RGBA buffer with soft edge feathering
  const rgba = Buffer.alloc(width * height * 4);
  let minX = width, maxX = 0, minY = height, maxY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * channels;
      const dstIdx = (y * width + x) * 4;
      const pIdx = y * width + x;

      rgba[dstIdx] = data[srcIdx];
      rgba[dstIdx + 1] = data[srcIdx + 1];
      rgba[dstIdx + 2] = data[srcIdx + 2];

      if (visited[pIdx]) {
        rgba[dstIdx + 3] = 0; // Transparent background
      } else {
        // Check if on boundary for anti-aliasing
        let bgNeighbors = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const checkX = x + dx;
            const checkY = y + dy;
            if (checkX >= 0 && checkX < width && checkY >= 0 && checkY < height) {
              if (visited[checkY * width + checkX]) bgNeighbors++;
            }
          }
        }

        if (bgNeighbors > 0) {
          rgba[dstIdx + 3] = Math.max(90, Math.round(255 * (1 - (bgNeighbors / 9) * 0.45)));
        } else {
          rgba[dstIdx + 3] = 255;
        }

        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  console.log('Bounding box:', { minX, maxX, minY, maxY, w: maxX - minX + 1, h: maxY - minY + 1 });

  // Add 28px margin so borders are NEVER clipped
  const pad = 28;
  const cropLeft = Math.max(0, minX - pad);
  const cropTop = Math.max(0, minY - pad);
  const cropWidth = Math.min(width - cropLeft, (maxX - minX + 1) + pad * 2);
  const cropHeight = Math.min(height - cropTop, (maxY - minY + 1) + pad * 2);

  const cropped = await sharp(rgba, { raw: { width, height, channels: 4 } })
    .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
    .png({ quality: 100 })
    .toBuffer();

  const target1 = path.join(outDir, 'iep_booklet_3d.png');
  const target2 = path.join(outDir, 'iep_booklet_exact.png');

  await fs.promises.writeFile(target1, cropped);
  await fs.promises.writeFile(target2, cropped);

  console.log('Successfully saved cleaned upright un-skewed IEP document to:');
  console.log(' -', target1);
  console.log(' -', target2);
}

processUprightIep().catch(err => {
  console.error('Error processing:', err);
  process.exit(1);
});
