async function main() {
  const res = await fetch('https://api.github.com/repos/clientcare-oss/custom-crm-pro/actions/runs?per_page=3', {
    headers: { 'User-Agent': 'Node-Fetch' }
  });
  const json = await res.json();
  for (const run of json.workflow_runs || []) {
    console.log(run.id, run.status, run.conclusion, run.created_at, run.updated_at, run.head_commit?.id);
  }
}
main().catch(console.error);
