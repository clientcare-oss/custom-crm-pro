import { queryCloudflareD1 } from '../server/_core/d1Client';

async function check() {
  console.log('=== CHECKING clientFiles FOR IDS (2002, 2004, 120041, 120042, 120044) ===');
  const cf = await queryCloudflareD1('SELECT * FROM clientFiles WHERE clientId IN (2002, 2004, 120041, 120042, 120044) OR studentContactId IN (2002, 2004, 120041, 120042, 120044)');
  console.log('clientFiles matching count:', cf?.length);
  cf?.forEach((r: any) => console.log(JSON.stringify(r)));

  console.log('\n=== CHECKING iepDocuments FOR IDS (2002, 2004, 120041, 120042, 120044) ===');
  const iep = await queryCloudflareD1('SELECT * FROM iepDocuments WHERE contactId IN (2002, 2004, 120041, 120042, 120044)');
  console.log('iepDocuments matching count:', iep?.length);
  iep?.forEach((r: any) => console.log(JSON.stringify(r)));

  console.log('\n=== CHECKING projectFiles FOR IDS (2002, 2004, 120041, 120042, 120044) ===');
  const pf = await queryCloudflareD1('SELECT * FROM projectFiles');
  console.log('projectFiles count:', pf?.length);
  pf?.forEach((r: any) => console.log(JSON.stringify(r)));

  console.log('\n=== CHECKING ALL CONTACTS FOR IDS (2002, 2004) ===');
  const contacts = await queryCloudflareD1('SELECT * FROM contacts WHERE id IN (2002, 2004, 120041, 120042, 120044)');
  contacts?.forEach((c: any) => console.log(JSON.stringify(c)));
}

check().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
