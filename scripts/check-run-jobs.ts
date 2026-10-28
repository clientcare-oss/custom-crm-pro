async function main() {
  const runId = '40528993267';
  const res = await fetch(`https://api.github.com/repos/clientcare-oss/custom-crm-pro/actions/runs/${runId}/jobs`, {
    headers: { 'User-Agent': 'Node-Fetch' }
  });
  const json = await res.json();
  for (const job of json.jobs || []) {
    console.log(`Job: "${job.name}" - Status: ${job.status}, Conclusion: ${job.conclusion}`);
    for (const step of job.steps || []) {
      console.log(`   Step: "${step.name}" [${step.status} / ${step.conclusion}]`);
    }
  }
}
main().catch(console.error);
