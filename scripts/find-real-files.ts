import { queryCloudflareD1 } from '../server/_core/d1Client';

async function check() {
  const blobs = await queryCloudflareD1('SELECT key, mime_type, length(base64_data) as len, created_at FROM file_blobs');
  console.log('Total blobs:', blobs?.length);
  
  // Group by prefix / type
  const nonReceipts = blobs?.filter((b: any) => !b.key.startsWith('receipts/') && !b.key.startsWith('signatures/') && !b.key.startsWith('agreements/'));
  console.log('Non-receipt / non-agreement blobs count:', nonReceipts?.length);
  nonReceipts?.forEach((b: any) => console.log(JSON.stringify(b)));
}

check().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
