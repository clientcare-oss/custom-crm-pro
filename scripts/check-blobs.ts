import { queryCloudflareD1 } from '../server/_core/d1Client';

async function main() {
  try {
    const blobs = await queryCloudflareD1('SELECT key, length(base64_data) as len FROM file_blobs');
    console.log('file_blobs count:', blobs?.length);
    for (const b of (blobs || [])) {
      console.log(`- Key: ${b.key}, Size: ${b.len} bytes`);
    }
  } catch (e: any) {
    console.log('file_blobs query error:', e.message);
  }
}

main().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
