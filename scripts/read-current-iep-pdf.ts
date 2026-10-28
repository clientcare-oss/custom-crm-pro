import { queryCloudflareD1 } from '../server/_core/d1Client';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';

async function check() {
  const rows = await queryCloudflareD1('SELECT base64_data FROM file_blobs WHERE key = ?', ['iep-documents/1792527991296_4823fd75_current_IEP_ac7e4441.pdf']);
  if (!rows || rows.length === 0) {
    console.log('Not found in file_blobs');
    return;
  }
  const buf = Buffer.from(rows[0].base64_data, 'base64');
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buf) });
  const pdfDoc = await loadingTask.promise;
  console.log('PDF numPages:', pdfDoc.numPages);
  for (let i = 1; i <= Math.min(5, pdfDoc.numPages); i++) {
    const page = await pdfDoc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item: any) => item.str).join(' ');
    console.log(`\n--- PAGE ${i} ---`);
    console.log(text.substring(0, 400));
  }
}

check().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
