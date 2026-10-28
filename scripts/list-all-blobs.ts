import { queryCloudflareD1 } from '../server/_core/d1Client';

async function check() {
  console.log('=== ALL FILE_BLOBS ===');
  const blobs = await queryCloudflareD1('SELECT key, mime_type, length(base64_data) as len, created_at FROM file_blobs ORDER BY created_at DESC');
  console.log('Total file_blobs:', blobs?.length);
  blobs?.forEach((b: any) => console.log(JSON.stringify(b)));
}

check().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
