import fs from 'fs';
import path from 'path';

let cachedToken: string | null = null;

export function getCloudflareToken(): string | null {
  if (process.env.CLOUDFLARE_API_TOKEN) {
    return process.env.CLOUDFLARE_API_TOKEN;
  }
  if (cachedToken) {
    return cachedToken;
  }
  try {
    const wranglerConfigPath = path.join(
      process.env.HOME || '/Users/kylepersonal',
      'Library/Preferences/.wrangler/config/default.toml'
    );
    if (fs.existsSync(wranglerConfigPath)) {
      const content = fs.readFileSync(wranglerConfigPath, 'utf8');
      const match = content.match(/oauth_token\s*=\s*"([^"]+)"/);
      if (match) {
        cachedToken = match[1];
        return cachedToken;
      }
    }
  } catch (err) {
    // Ignore errors reading local config
  }
  return null;
}

export async function queryCloudflareD1(sql: string, params: any[] = []) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || 'fa65a33e99b08d8202d3afa0b305a1c4';
  const databaseId = process.env.CLOUDFLARE_DATABASE_ID || 'f90072b5-4842-4423-a221-ab62a01a25a6';
  const token = getCloudflareToken();

  if (!token) {
    throw new Error('Cloudflare API Token or Wrangler credentials missing for Cloudflare D1');
  }

  // Sanitize MySQL-specific constructs for SQLite / D1 compatibility
  let sanitizedSql = sql
    .replace(/\(now\(\)\)/gi, 'CURRENT_TIMESTAMP')
    .replace(/on duplicate key update/gi, 'ON CONFLICT DO UPDATE SET');

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql: sanitizedSql, params }),
  });

  const json = await response.json();
  if (!json.success) {
    const errorMsg = json.errors?.map((e: any) => e.message).join('; ') || 'Unknown D1 query error';
    throw new Error(`Cloudflare D1 Query Failed: ${errorMsg}`);
  }

  return json.result[0];
}
