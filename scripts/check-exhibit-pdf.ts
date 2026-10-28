import { queryCloudflareD1 } from '../server/_core/d1Client';
import { PDFDocument } from 'pdf-lib';

async function main() {
  const rows = await queryCloudflareD1('SELECT base64_data FROM file_blobs WHERE key = ?', ['iep-documents/1792527991296_4823fd75_current_IEP_ac7e4441.pdf']);
  if (rows && rows.length > 0) {
    const buf = Buffer.from(rows[0].base64_data, 'base64');
    console.log('Buffer length:', buf.length);
    const pdfDoc = await PDFDocument.load(buf);
    console.log('PDF Page count:', pdfDoc.getPageCount());
  } else {
    console.log('Not found in file_blobs');
  }
}

main().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
