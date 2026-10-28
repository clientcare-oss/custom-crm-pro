async function main() {
  const runId = '40526798387';
  const res = await fetch(`https://api.github.com/repos/clientcare-oss/custom-crm-pro/actions/runs/${runId}/jobs`, {
    headers: { 'User-Agent': 'Node-Fetch' }
  });
  const json = await res.json();
  for (const job of json.jobs || []) {
    console.log(`Job: ${job.name} - Status: ${job.status}, Conclusion: ${job.conclusion}`);
    for (const step of job.steps || []) {
      if (step.conclusion === 'failure') {
        console.log(`  Failed step: ${step.name}`);
      }
    }
  }
}
main().catch(console.error);
