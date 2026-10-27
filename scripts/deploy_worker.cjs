const fs = require('fs');
const { execSync } = require('child_process');

const env = fs.readFileSync('.env', 'utf8');
const tokenLine = env.split('\n').find(l => l.startsWith('CLOUDFLARE_API_TOKEN='));
const token = tokenLine ? tokenLine.split('=')[1].trim() : '';

if (!token) {
  console.error('CLOUDFLARE_API_TOKEN not found in .env');
  process.exit(1);
}

console.log('Deploying to Cloudflare Workers with account fa65a33e99b08d8202d3afa0b305a1c4...');
try {
  execSync('npx.cmd wrangler deploy', {
    stdio: 'inherit',
    env: {
      ...process.env,
      CLOUDFLARE_API_TOKEN: token,
      CLOUDFLARE_ACCOUNT_ID: 'fa65a33e99b08d8202d3afa0b305a1c4'
    }
  });
  console.log('Deployment completed successfully!');
} catch (e) {
  console.error('Deployment failed:', e.message);
  process.exit(1);
}
