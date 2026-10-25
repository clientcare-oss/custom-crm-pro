const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function processFourGoldCorners() {
  const inputPath = 'C:\\Users\\conta\\.gemini\\antigravity-ide\\brain\\f3a3bd1e-0896-4f87-9db7-44a948e869d5\\iep_504_four_gold_corners_1792945714572.jpg';
  const outDir = path.resolve(__dirname, '../client/public/assets/vault');

  console.log('Processing IEP/504 dossier with gold brackets on BOTH sides:', inputPath);

  // Folio spans ~x: 175..825, y: 100..915
  // Balanced extraction with starlight margin around all 4 gold corners
  const left = 90;
  const top = 35;
  const width = 844;
  const height = 950;

  const radius = 32;
  const svgMask = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="#ffffff" />
    </svg>
  `;

  const maskBuffer = await sharp(Buffer.from(svgMask)).png().toBuffer();

  const result = await sharp(inputPath)
    .extract({ left, top, width, height })
    .composite([{ input: maskBuffer, blend: 'dest-in' }])
    .png({ quality: 100 })
    .toBuffer();

  const target1 = path.join(outDir, 'iep_booklet_3d.png');
  const target2 = path.join(outDir, 'iep_booklet_exact.png');

  await fs.promises.writeFile(target1, result);
  await fs.promises.writeFile(target2, result);

  console.log('Successfully saved dossier with 4 gold brackets to:');
  console.log(' -', target1);
  console.log(' -', target2);
}

processFourGoldCorners().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
