import { drizzle } from "drizzle-orm/sqlite-proxy";
import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import { queryCloudflareD1 } from "../_core/d1Client";

let _db: any = null;

export async function getDb() {
  const cfDb = (globalThis as any).__CF_ENV_DB__;
  if (cfDb) {
    return drizzleD1(cfDb);
  }

  // In test mode, use isolated mock proxy to never query or mutate live production D1
  if (process.env.NODE_ENV === "test" || process.env.VITEST) {
    if (!_db) {
      _db = drizzle(async (_sql, _params, method) => {
        if (method === "get") {
          return { rows: [] };
        }
        return { rows: [] };
      });
    }
    return _db;
  }

  if (!_db) {
    try {
      _db = drizzle(async (sql, params, method) => {
        try {
          const res = await queryCloudflareD1(sql, params);
          const rows = Array.isArray(res) ? res : (res?.results || []);
          if (method === "get") {
            return { rows: rows[0] ? Object.values(rows[0]) : [] };
          }
          return { rows: rows.map((r: any) => Object.values(r)) };
        } catch (err) {
          console.warn("[Database] D1 query fallback to empty result:", err);
          return { rows: [] };
        }
      });
    } catch (error) {
      console.warn("[Database] Failed to connect to Cloudflare D1:", error);
      _db = null;
    }
  }
  return _db;
}
