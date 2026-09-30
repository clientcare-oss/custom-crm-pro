import sharp from 'sharp';
import path from 'path';

const refPath = 'C:/Users/conta/.gemini/antigravity-ide/brain/b76acaeb-147f-420c-b1ad-f57bfedc9f4f/.user_uploaded/media_1790723690539.jpg';
const outDir = path.join(process.cwd(), 'client/public/assets/vault');

async function main() {
  // Archive books without any text overlay: x: 840 to 1000, y: 450 to 665
  await sharp(refPath)
    .extract({ left: 838, top: 450, width: 165, height: 215 })
    .png()
    .toFile(path.join(outDir, 'archive_books_clean.png'));

  // Let's also extract each of the 7 folder 3D graphics cleanly!
  // From folders_exact.png (y: 290):
  // Let's find exact coordinates of each folder icon:
  // Card width is ~134, icons are at the top-center of each card.
  // Card 1: left 36, top 308, width 110, height 52
  // Card 2: left 175, top 308, width 110, height 52
  // Card 3: left 315, top 308, width 110, height 52
  // Card 4: left 455, top 308, width 110, height 52
  // Card 5: left 595, top 308, width 110, height 52
  // Card 6: left 735, top 308, width 110, height 52
  // Card 7: left 875, top 308, width 110, height 52
  const folders = [
    { name: 'folder_ieps', left: 40 },
    { name: 'folder_evals', left: 180 },
    { name: 'folder_school', left: 320 },
    { name: 'folder_comm', left: 460 },
    { name: 'folder_medical', left: 600 },
    { name: 'folder_behavior', left: 740 },
    { name: 'folder_progress', left: 880 },
  ];

  for (const f of folders) {
    await sharp(refPath)
      .extract({ left: f.left, top: 308, width: 104, height: 50 })
      .png()
      .toFile(path.join(outDir, `${f.name}.png`));
  }

  console.log("Clean crops extracted!");
}

main().catch(console.error);
