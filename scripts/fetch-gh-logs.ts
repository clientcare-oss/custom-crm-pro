async function main() {
  const jobId = '122268456629';
  const logRes = await fetch(`https://api.github.com/repos/clientcare-oss/custom-crm-pro/actions/jobs/${jobId}/logs`, {
    headers: { 'User-Agent': 'Node-Fetch' },
    redirect: 'follow'
  });
  const text = await logRes.text();
  console.log('Log size:', text.length);
  const lines = text.split('\n');
  const failureSection = lines.slice(-100).join('\n');
  console.log('Last 100 lines:\n', failureSection);
}
main().catch(console.error);
