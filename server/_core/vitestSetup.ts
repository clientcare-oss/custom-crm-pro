import fs from "fs";
import os from "os";
import path from "path";
import { vi } from "vitest";

const workspaceSqlitePath = path.resolve(process.cwd(), "local.sqlite");
const isolatedSqlitePath = path.join(
  os.tmpdir(),
  `waypoint-vitest-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.sqlite`
);

try {
  if (fs.existsSync(workspaceSqlitePath)) {
    fs.copyFileSync(workspaceSqlitePath, isolatedSqlitePath);
  }
} catch {
  // Ignore if copy fails; libsql will initialize an isolated file at isolatedSqlitePath
}

process.on("exit", () => {
  for (const suffix of ["", "-wal", "-shm", "-journal"]) {
    try {
      const target = `${isolatedSqlitePath}${suffix}`;
      if (fs.existsSync(target)) {
        fs.unlinkSync(target);
      }
    } catch {
      // Ignore cleanup errors on process exit
    }
  }
});

vi.mock("@libsql/client", async importOriginal => {
  const actual = await importOriginal<typeof import("@libsql/client")>();
  return {
    ...actual,
    createClient: (config: Parameters<typeof actual.createClient>[0]) => {
      if (config && typeof config.url === "string" && config.url.includes("local.sqlite")) {
        return actual.createClient({
          ...config,
          url: `file:${isolatedSqlitePath}`,
        });
      }
      return actual.createClient(config);
    },
  };
});

