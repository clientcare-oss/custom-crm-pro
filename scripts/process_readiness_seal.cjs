const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function processSeal() {
  const inputPath = 'C:\\Users\\conta\\.gemini\\antigravity-ide\\brain\\f3a3bd1e-0896-4f87-9db7-44a948e869d5\\vault_readiness_shield_1792945030420.jpg';
  const outPath = path.resolve(__dirname, '../client/public/assets/vault/file_readiness_seal_3d.png');

  console.log('Loading seal image:', inputPath);
  const { data, info } = await sharp(inputPath).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const isBg = (x, y) => {
    const idx = (y * width + x) * channels;
    return data[idx] <= 18 && data[idx+1] <= 18 && data[idx+2] <= 18;
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
        rgba[dstIdx + 3] = 0;
      } else {
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
          rgba[dstIdx + 3] = Math.max(80, Math.round(255 * (1 - (bgNeighbors / 9) * 0.5)));
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

  const pad = 12;
  const cropLeft = Math.max(0, minX - pad);
  const cropTop = Math.max(0, minY - pad);
  const cropWidth = Math.min(width - cropLeft, (maxX - minX + 1) + pad * 2);
  const cropHeight = Math.min(height - cropTop, (maxY - minY + 1) + pad * 2);

  const cropped = await sharp(rgba, { raw: { width, height, channels: 4 } })
    .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
    .png({ quality: 100 })
    .toBuffer();

  await fs.promises.writeFile(outPath, cropped);
  console.log('Saved 3D file readiness seal to:', outPath);
}

processSeal().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
