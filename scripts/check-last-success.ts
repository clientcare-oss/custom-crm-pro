async function main() {
  const res = await fetch(`https://api.github.com/repos/clientcare-oss/custom-crm-pro/actions/runs?status=success&per_page=5`, {
    headers: { 'User-Agent': 'Node-Fetch' }
  });
  const json = await res.json();
  console.log('Total successful runs:', json.total_count);
  for (const run of json.workflow_runs || []) {
    console.log(`Success Run ${run.id}: ${run.created_at} - "${run.head_commit?.message?.split('\n')[0]}"`);
  }
}
main().catch(console.error);
