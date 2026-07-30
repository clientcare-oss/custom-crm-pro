import "dotenv/config";
import fs from 'fs';
import path from 'path';

let cachedToken: string | null = null;

export function getCloudflareToken(): string | null {
  const tokenFromEnv = process.env.CLOUDFLARE_API_TOKEN;
  if (tokenFromEnv && tokenFromEnv.trim()) {
    return tokenFromEnv.trim();
  }

  if (cachedToken) {
    return cachedToken;
  }

  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  const appDataDir = process.env.APPDATA || process.env.LOCALAPPDATA || '';

  const candidatePaths = [
    // macOS default location
    path.join(homeDir, 'Library/Preferences/.wrangler/config/default.toml'),
    // Windows default locations
    path.join(appDataDir, '.wrangler/config/default.toml'),
    path.join(homeDir, '.wrangler/config/default.toml'),
    // Linux / Unix standard locations
    path.join(homeDir, '.config/.wrangler/config/default.toml'),
  ].filter(Boolean);

  for (const wranglerConfigPath of candidatePaths) {
    try {
      if (fs.existsSync(wranglerConfigPath)) {
        const content = fs.readFileSync(wranglerConfigPath, 'utf8');
        const match = content.match(/oauth_token\s*=\s*"([^"]+)"/);
        if (match) {
          cachedToken = match[1];
          return cachedToken;
        }
      }
    } catch (err) {
      // Ignore reading errors on individual path
    }
  }

  return null;
}

export async function queryCloudflareD1(sql: string, params: any[] = []) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || 'fa65a33e99b08d8202d3afa0b305a1c4';
  const databaseId = process.env.CLOUDFLARE_DATABASE_ID || 'f90072b5-4842-4423-a221-ab62a01a25a6';
  const token = getCloudflareToken();

  if (!token) {
    const errorMsg = 'Cloudflare D1 credentials missing. Please set CLOUDFLARE_API_TOKEN in your .env file.';
    console.error(`[Cloudflare D1] ${errorMsg}`);
    throw new Error(errorMsg);
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
    console.error(`[Cloudflare D1] Query failed: ${errorMsg}`);
    throw new Error(`Cloudflare D1 Query Failed: ${errorMsg}`);
  }

  return json.result?.[0]?.results ?? [];
}
