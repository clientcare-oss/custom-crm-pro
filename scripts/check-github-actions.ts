async function main() {
  const res = await fetch('https://api.github.com/repos/clientcare-oss/custom-crm-pro/actions/runs?per_page=5', {
    headers: { 'User-Agent': 'Node-Fetch' }
  });
  const json = await res.json();
  console.log('Recent Workflow Runs:');
  for (const run of json.workflow_runs || []) {
    console.log(`[${run.status} / ${run.conclusion}] ${run.name} - Commit: "${run.head_commit?.message?.split('\n')[0]}" (${run.html_url})`);
  }
}
main().catch(console.error);
