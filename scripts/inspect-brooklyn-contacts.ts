import { queryCloudflareD1 } from '../server/_core/d1Client';

async function check() {
  const contacts = await queryCloudflareD1('SELECT id, firstName, lastName, email, phone, jobTitle, notes FROM contacts WHERE firstName LIKE "%Brooklyn%" OR lastName LIKE "%Smith%"');
  console.log('Contacts matching Brooklyn/Smith:');
  contacts?.forEach((c: any) => console.log(JSON.stringify(c)));
}

check().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
