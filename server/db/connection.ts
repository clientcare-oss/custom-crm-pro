import { drizzle } from "drizzle-orm/sqlite-proxy";
import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import { queryCloudflareD1 } from "../_core/d1Client";

let _db: any = null;
let _cfD1Db: any = null;
let _lastCfDb: any = null;

function wrapD1WithSanitizer(cfDb: any) {
  if (!cfDb || cfDb.__isSanitized) return cfDb;

  const sanitize = (query: string) => {
    if (typeof query !== "string") return query;
    return query
      .replace(/\(now\(\)\)/gi, 'CURRENT_TIMESTAMP')
      .replace(/\bnow\(\)/gi, 'CURRENT_TIMESTAMP')
      .replace(/on duplicate key update/gi, 'ON CONFLICT DO UPDATE SET');
  };

  return new Proxy(cfDb, {
    get(target, prop, receiver) {
      if (prop === '__isSanitized') return true;
      if (prop === 'prepare') {
        return (query: string) => {
          return target.prepare(sanitize(query));
        };
      }
      if (prop === 'batch') {
        return (statements: any[]) => {
          return target.batch(statements);
        };
      }
      if (prop === 'exec') {
        return (query: string) => {
          return target.exec(sanitize(query));
        };
      }
      const val = Reflect.get(target, prop, receiver);
      if (typeof val === 'function') {
        return val.bind(target);
      }
      return val;
    }
  });
}

export async function getDb() {
  const cfDb = (globalThis as any).__CF_ENV_DB__;
  if (cfDb) {
    if (!_cfD1Db || _lastCfDb !== cfDb) {
      _lastCfDb = cfDb;
      _cfD1Db = drizzleD1(wrapD1WithSanitizer(cfDb));
    }
    return _cfD1Db;
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
