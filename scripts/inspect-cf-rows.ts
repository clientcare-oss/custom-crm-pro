import { queryCloudflareD1 } from '../server/_core/d1Client';

async function check() {
  const cf = await queryCloudflareD1('SELECT id, clientId, studentContactId, fileName, fileUrl, fileKey, category, documentType, uploadedAt FROM clientFiles');
  console.log('All clientFiles (length ' + cf?.length + '):');
  cf?.forEach((f: any) => console.log(JSON.stringify(f)));
}

check().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
