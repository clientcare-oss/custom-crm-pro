async function main() {
  const res = await fetch(`https://api.github.com/repos/clientcare-oss/custom-crm-pro/check-runs/122277314800/annotations`, {
    headers: { 'User-Agent': 'Node-Fetch' }
  });
  const json = await res.json();
  console.log('Annotations:', JSON.stringify(json, null, 2));
}
main().catch(console.error);
