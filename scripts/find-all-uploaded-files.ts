import { queryCloudflareD1 } from '../server/_core/d1Client';
import { createClient } from '@libsql/client';

async function search() {
  console.log('=== SEARCHING CLIENT_FILES IN CLOUDFLARE D1 ===');
  try {
    const cf = await queryCloudflareD1('SELECT id, client_id, project_id, file_name, file_key, file_url, file_size, mime_type, category, created_at FROM client_files ORDER BY id DESC');
    console.log('client_files count:', cf?.length);
    cf?.forEach(f => console.log(JSON.stringify(f)));
  } catch(e: any) { console.error('cf error', e.message); }

  console.log('\n=== SEARCHING IEP_DOCUMENTS IN CLOUDFLARE D1 ===');
  try {
    const iep = await queryCloudflareD1('SELECT * FROM iep_documents ORDER BY id DESC');
    console.log('iep_documents count:', iep?.length);
    iep?.forEach(f => console.log(JSON.stringify(f)));
  } catch(e: any) { console.error('iep error', e.message); }

  console.log('\n=== SEARCHING FILE_BLOBS IN CLOUDFLARE D1 ===');
  try {
    const blobs = await queryCloudflareD1('SELECT key, mime_type, length(base64_data) as len, created_at FROM file_blobs ORDER BY created_at DESC');
    console.log('file_blobs count:', blobs?.length);
    blobs?.forEach(f => console.log(JSON.stringify(f)));
  } catch(e: any) { console.error('blobs error', e.message); }

  console.log('\n=== SEARCHING COMPLAINT_DRAFTS IN CLOUDFLARE D1 ===');
  try {
    const drafts = await queryCloudflareD1('SELECT id, student_id, title, updated_at FROM complaint_drafts ORDER BY updated_at DESC');
    console.log('complaint_drafts count:', drafts?.length);
    drafts?.forEach(d => console.log(JSON.stringify(d)));
  } catch(e: any) { console.error('drafts error', e.message); }

  console.log('\n=== SEARCHING LOCAL SQLITE CLIENT_FILES ===');
  try {
    const local = createClient({ url: 'file:local.sqlite' });
    const localCf = await local.execute('SELECT id, client_id, project_id, file_name, file_key, file_url, category, created_at FROM client_files ORDER BY id DESC');
    console.log('local client_files count:', localCf.rows.length);
    localCf.rows.forEach(r => console.log(JSON.stringify(r)));
  } catch(e: any) { console.error('local cf error', e.message); }

  console.log('\n=== SEARCHING LOCAL SQLITE IEP_DOCUMENTS ===');
  try {
    const local = createClient({ url: 'file:local.sqlite' });
    const localIep = await local.execute('SELECT * FROM iep_documents ORDER BY id DESC');
    console.log('local iep_documents count:', localIep.rows.length);
    localIep.rows.forEach(r => console.log(JSON.stringify(r)));
  } catch(e: any) { console.error('local iep error', e.message); }
}

search().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
