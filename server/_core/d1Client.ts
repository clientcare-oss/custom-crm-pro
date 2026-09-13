import "dotenv/config";
import fs from 'fs';
import path from 'path';
import { createClient } from '@libsql/client';

let cachedToken: string | null = null;
let localClient: any = null;

export function getLocalDbClient() {
  if (!localClient) {
    const dbPath = path.resolve(process.cwd(), 'local.sqlite');
    localClient = createClient({ url: `file:${dbPath}` });
  }
  return localClient;
}

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
  // Sanitize MySQL-specific constructs for SQLite / D1 compatibility
  let sanitizedSql = sql
    .replace(/\(now\(\)\)/gi, 'CURRENT_TIMESTAMP')
    .replace(/on duplicate key update/gi, 'ON CONFLICT DO UPDATE SET');

  const isWrite = /^\s*(insert|update|delete|replace)/i.test(sanitizedSql);
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || 'fa65a33e99b08d8202d3afa0b305a1c4';
  const databaseId = process.env.CLOUDFLARE_DATABASE_ID || 'f90072b5-4842-4423-a221-ab62a01a25a6';
  const token = getCloudflareToken();

  // If token is missing, directly use local SQLite
  if (!token) {
    try {
      const res = await getLocalDbClient().execute({ sql: sanitizedSql, args: params });
      return res.rows || [];
    } catch (localErr: any) {
      console.error(`[Local DB] Query failed:`, localErr.message);
      return [];
    }
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql: sanitizedSql, params }),
    });

    const json = await response.json();
    if (json.success && json.result?.[0]?.results !== undefined) {
      // Shadow write to local SQLite to keep local database in sync
      if (isWrite) {
        getLocalDbClient().execute({ sql: sanitizedSql, args: params }).catch(() => {});
      }
      return json.result[0].results;
    }

    const errorMsg = json.errors?.map((e: any) => e.message).join('; ') || 'D1 returned unsuccessful status';
    // Fall back to local SQLite on rate limit, auth errors, missing columns/tables, or account limits
    console.warn(`[Cloudflare D1 Fallback] ${errorMsg}. Routing query to local SQLite database.`);
    const localRes = await getLocalDbClient().execute({ sql: sanitizedSql, args: params });
    return localRes.rows || [];
  } catch (err: any) {
    console.warn(`[Cloudflare D1 Network Error] ${err.message}. Routing query to local SQLite database.`);
    try {
      const localRes = await getLocalDbClient().execute({ sql: sanitizedSql, args: params });
      return localRes.rows || [];
    } catch (localErr: any) {
      console.error(`[Local DB Fallback Error]`, localErr.message);
      return [];
    }
  }
}

