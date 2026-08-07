import { drizzle } from "drizzle-orm/sqlite-proxy";
import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import { queryCloudflareD1 } from "../_core/d1Client";

let _db: any = null;

export async function getDb() {
  const cfDb = (globalThis as any).__CF_ENV_DB__;
  if (cfDb) {
    return drizzleD1(cfDb);
  }

  if (!_db) {
    try {
      _db = drizzle(async (sql, params, method) => {
        const res = await queryCloudflareD1(sql, params);
        const rows = Array.isArray(res) ? res : (res?.results || []);
        if (method === "get") {
          return { rows: rows[0] ? Object.values(rows[0]) : [] };
        }
        return { rows: rows.map((r: any) => Object.values(r)) };
      });
    } catch (error) {
      console.warn("[Database] Failed to connect to Cloudflare D1:", error);
      _db = null;
    }
  }
  return _db;
}
