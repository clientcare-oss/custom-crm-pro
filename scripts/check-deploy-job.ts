async function main() {
  const commitSha = '17670a2be1005ca592f694db091b61907cb5b546';
  const res = await fetch(`https://api.github.com/repos/clientcare-oss/custom-crm-pro/actions/runs/40528993267/jobs`, {
    headers: { 'User-Agent': 'Node-Fetch' }
  });
  const json = await res.json();
  const deployJob = json.jobs?.find((j: any) => j.name === 'Deploy to Cloudflare Workers');
  console.log('Deploy Job:', JSON.stringify(deployJob, null, 2));
}
main().catch(console.error);
