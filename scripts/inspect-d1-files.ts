import { queryCloudflareD1 } from '../server/_core/d1Client';

async function check() {
  console.log('=== clientFiles ===');
  const cf = await queryCloudflareD1('SELECT * FROM clientFiles ORDER BY id DESC');
  console.log('clientFiles count:', cf?.length);
  cf?.forEach((f: any) => console.log(JSON.stringify(f)));

  console.log('\n=== iepDocuments ===');
  const iep = await queryCloudflareD1('SELECT * FROM iepDocuments ORDER BY id DESC');
  console.log('iepDocuments count:', iep?.length);
  iep?.forEach((f: any) => console.log(JSON.stringify(f)));

  console.log('\n=== draftIepHistory ===');
  const draftIep = await queryCloudflareD1('SELECT * FROM draftIepHistory ORDER BY id DESC');
  console.log('draftIepHistory count:', draftIep?.length);
  draftIep?.forEach((f: any) => console.log(JSON.stringify(f)));

  console.log('\n=== projectFiles ===');
  const pf = await queryCloudflareD1('SELECT * FROM projectFiles ORDER BY id DESC');
  console.log('projectFiles count:', pf?.length);
  pf?.forEach((f: any) => console.log(JSON.stringify(f)));

  console.log('\n=== evidence_items ===');
  const ev = await queryCloudflareD1('SELECT * FROM evidence_items ORDER BY id DESC');
  console.log('evidence_items count:', ev?.length);
  ev?.forEach((f: any) => console.log(JSON.stringify(f)));
}

check().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
