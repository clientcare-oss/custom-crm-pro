async function main() {
  const commitSha = '17670a2be1005ca592f694db091b61907cb5b546';
  const res = await fetch(`https://api.github.com/repos/clientcare-oss/custom-crm-pro/commits/${commitSha}/check-runs`, {
    headers: { 'User-Agent': 'Node-Fetch' }
  });
  const json = await res.json();
  for (const cr of json.check_runs || []) {
    console.log(`Check: ${cr.name} | Status: ${cr.status} | Conclusion: ${cr.conclusion}`);
    console.log(`Title: ${cr.output?.title}`);
    console.log(`Summary: ${cr.output?.summary}`);
    console.log(`Text: ${cr.output?.text}`);
    if (cr.output?.annotations_count > 0) {
      const annRes = await fetch(cr.output.annotations_url, { headers: { 'User-Agent': 'Node-Fetch' } });
      const ann = await annRes.json();
      console.log('Annotations:', JSON.stringify(ann, null, 2));
    }
  }
}
main().catch(console.error);
