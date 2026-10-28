import { queryCloudflareD1 } from '../server/_core/d1Client';

async function check() {
  const rows = await queryCloudflareD1('SELECT key, base64_data FROM file_blobs WHERE key LIKE "client-files/42/%" ORDER BY created_at DESC LIMIT 5');
  for (const r of rows || []) {
    console.log('KEY:', r.key);
    console.log('BASE64:', r.base64_data);
    try {
      const decoded = Buffer.from(r.base64_data, 'base64').toString('utf8');
      console.log('DECODED UTF8:', decoded);
    } catch (e: any) {
      console.log('Decode error:', e.message);
    }
  }
}

check().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
