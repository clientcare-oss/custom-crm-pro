import { queryCloudflareD1 } from '../server/_core/d1Client';

async function main() {
  const row = await queryCloudflareD1('SELECT * FROM meeting_workspaces WHERE id = 3');
  console.log('Workspace 3 keys and sizes:');
  const ws = row?.[0];
  if (!ws) {
    console.log('No workspace 3 found in D1!');
    return;
  }
  for (const k of Object.keys(ws)) {
    const val = ws[k];
    console.log(k, ':', typeof val === 'string' && val.length > 100 ? val.slice(0, 100) + '... (len: ' + val.length + ')' : val);
  }
}

main().catch(console.error);
