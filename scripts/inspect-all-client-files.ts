import { queryCloudflareD1 } from '../server/_core/d1Client';

async function check() {
  console.log('--- ALL CLIENT FILES ---');
  const cf = await queryCloudflareD1('SELECT id, client_id, project_id, file_name, file_key, file_url, category, created_at FROM client_files ORDER BY id ASC');
  console.log('Total client_files:', cf?.length);
  cf?.forEach((f: any) => console.log(JSON.stringify(f)));

  console.log('\n--- ALL IEP DOCUMENTS ---');
  const iep = await queryCloudflareD1('SELECT * FROM iep_documents ORDER BY id ASC');
  console.log('Total iep_documents:', iep?.length);
  iep?.forEach((f: any) => console.log(JSON.stringify(f)));
}

check().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
