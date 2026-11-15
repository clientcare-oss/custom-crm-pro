#!/usr/bin/env node
/**
 * Myco MCP Server for Waypoint Advocates — Custom CRM Pro
 *
 * Implements a zero-dependency Model Context Protocol (MCP) server over stdio
 * supporting JSON-RPC 2.0 (both newline-delimited JSON and Content-Length framed messages).
 *
 * Tools exposed:
 *  - myco_recall: Search and filter persistent project spores, decisions, and CRM knowledge
 *  - myco_memorize: Record a new spore (architecture, guardrail, decision, discovery, workflow, case_note)
 *  - myco_project_summary: Return Waypoint CRM architectural overview, active guardrails, and spore counts
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");
const SPORES_PATH = path.join(REPO_ROOT, ".myco", "spores.json");

function ensureSporesStore() {
  const dir = path.dirname(SPORES_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(SPORES_PATH)) {
    const initial = {
      version: "1.0.0",
      project: "custom-crm-pro",
      practice: "Waypoint Advocates",
      updatedAt: new Date().toISOString(),
      spores: [],
    };
    fs.writeFileSync(SPORES_PATH, JSON.stringify(initial, null, 2), "utf8");
  }
}

export function loadSporesData() {
  ensureSporesStore();
  try {
    const raw = fs.readFileSync(SPORES_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return {
      version: parsed.version || "1.0.0",
      project: parsed.project || "custom-crm-pro",
      practice: parsed.practice || "Waypoint Advocates",
      updatedAt: parsed.updatedAt || new Date().toISOString(),
      spores: Array.isArray(parsed.spores) ? parsed.spores : [],
    };
  } catch {
    return {
      version: "1.0.0",
      project: "custom-crm-pro",
      practice: "Waypoint Advocates",
      updatedAt: new Date().toISOString(),
      spores: [],
    };
  }
}

export function saveSporesData(data) {
  ensureSporesStore();
  const payload = {
    ...data,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(SPORES_PATH, JSON.stringify(payload, null, 2), "utf8");
  return payload;
}

export function recallSpores({ query = "", kind = "", tag = "", limit = 20 } = {}) {
  const store = loadSporesData();
  const q = String(query || "").trim().toLowerCase();
  const k = String(kind || "").trim().toLowerCase();
  const t = String(tag || "").trim().toLowerCase();

  const matches = store.spores.filter((spore) => {
    if (k && k !== "all" && String(spore.kind || "").toLowerCase() !== k) {
      return false;
    }
    if (t && !(Array.isArray(spore.tags) && spore.tags.some((item) => String(item).toLowerCase() === t))) {
      return false;
    }
    if (!q) return true;
    const haystack = [
      spore.id,
      spore.title,
      spore.summary,
      spore.source,
      spore.author,
      ...(Array.isArray(spore.tags) ? spore.tags : []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });

  return matches.slice(0, Math.max(1, Math.min(100, Number(limit) || 20)));
}

export function memorizeSpore({
  title,
  summary,
  kind = "discovery",
  tags = [],
  source = "myco-mcp",
  author = "Antigravity Agent",
  ferpaSanitized = true,
}) {
  const cleanTitle = String(title || "").trim();
  const cleanSummary = String(summary || "").trim();
  if (!cleanTitle || !cleanSummary) {
    throw new Error("Both title and summary are required to memorize a Myco spore.");
  }

  const store = loadSporesData();
  const id = `spore-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const normalizedTags = Array.isArray(tags)
    ? tags.map((item) => String(item).trim()).filter(Boolean)
    : String(tags || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

  const newSpore = {
    id,
    kind: String(kind || "discovery").trim().toLowerCase(),
    title: cleanTitle,
    summary: cleanSummary,
    tags: normalizedTags,
    source: String(source || "myco-mcp").trim(),
    author: String(author || "Antigravity Agent").trim(),
    ferpaSanitized: Boolean(ferpaSanitized),
    createdAt: new Date().toISOString(),
  };

  store.spores.unshift(newSpore);
  saveSporesData(store);
  return newSpore;
}

export function buildProjectSummary() {
  const store = loadSporesData();
  const countsByKind = {};
  for (const spore of store.spores) {
    const k = spore.kind || "unknown";
    countsByKind[k] = (countsByKind[k] || 0) + 1;
  }

  return {
    project: store.project,
    practice: store.practice,
    totalSpores: store.spores.length,
    countsByKind,
    updatedAt: store.updatedAt,
    keyEndpoints: {
      integrationsPage: "/integrations (PG-014 / PG-014-MYC)",
      archiveAndDoNotServe: "/archive (PG-048 / PG-048-DNS)",
      inboundWebhook: "POST /api/myco/webhook",
      trpcNamespace: "trpc.myco.*",
    },
    recentSpores: store.spores.slice(0, 5),
  };
}

export const MCP_TOOLS = [
  {
    name: "myco_recall",
    description:
      "Search and retrieve persistent Myco project spores, architectural decisions, guardrails, and CRM notes for Waypoint Custom CRM Pro.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Optional search keyword matching title, summary, tags, or source file.",
        },
        kind: {
          type: "string",
          description: "Optional filter by spore kind: architecture, guardrail, decision, discovery, workflow, case_note.",
        },
        tag: {
          type: "string",
          description: "Optional exact tag filter (e.g. 'do-not-serve', 'PG-014', 'cloudflare-d1').",
        },
        limit: {
          type: "number",
          description: "Maximum number of spores to return (default 20).",
        },
      },
    },
  },
  {
    name: "myco_memorize",
    description:
      "Record a new durable Myco spore (decision, bugfix, architectural rule, workflow note) into the shared .myco/spores.json store.",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Short descriptive title of the spore or decision.",
        },
        summary: {
          type: "string",
          description: "Detailed explanation, file paths, and rationale to preserve across sessions.",
        },
        kind: {
          type: "string",
          enum: ["architecture", "guardrail", "decision", "discovery", "workflow", "case_note"],
          description: "Category of the spore.",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "List of searchable tags (e.g. ['PG-014', 'myco', 'webhook']).",
        },
        source: {
          type: "string",
          description: "Primary file path or module associated with this spore.",
        },
        author: {
          type: "string",
          description: "Author or agent recording the spore.",
        },
      },
      required: ["title", "summary"],
    },
  },
  {
    name: "myco_project_summary",
    description:
      "Return a structured summary of Waypoint Custom CRM Pro's Myco collective memory, spore counts, key routes, and recent spores.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

export function handleJsonRpcMessage(msg) {
  if (!msg || typeof msg !== "object") return null;

  const { id, method, params } = msg;

  // Notifications have no id and expect no response
  if (id === undefined || id === null) {
    return null;
  }

  try {
    if (method === "initialize") {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: (params && params.protocolVersion) || "2024-11-05",
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: "myco-waypoint-mcp",
            version: "1.0.0",
          },
        },
      };
    }

    if (method === "ping") {
      return { jsonrpc: "2.0", id, result: {} };
    }

    if (method === "tools/list") {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          tools: MCP_TOOLS,
        },
      };
    }

    if (method === "tools/call") {
      const toolName = params?.name;
      const args = params?.arguments || {};

      if (toolName === "myco_recall") {
        const results = recallSpores(args);
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify({ count: results.length, spores: results }, null, 2),
              },
            ],
          },
        };
      }

      if (toolName === "myco_memorize") {
        const created = memorizeSpore(args);
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify({ ok: true, spore: created }, null, 2),
              },
            ],
          },
        };
      }

      if (toolName === "myco_project_summary") {
        const summary = buildProjectSummary();
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(summary, null, 2),
              },
            ],
          },
        };
      }

      return {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32601,
          message: `Unknown Myco MCP tool: ${toolName}`,
        },
      };
    }

    return {
      jsonrpc: "2.0",
      id,
      error: {
        code: -32601,
        message: `Method not found: ${method}`,
      },
    };
  } catch (err) {
    return {
      jsonrpc: "2.0",
      id,
      error: {
        code: -32000,
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }
}

// Start stdio transport only when executed directly
const isDirectExecution =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);

if (isDirectExecution) {
  let buffer = "";
  let useContentLength = false;

  function sendResponse(responseObj) {
    if (!responseObj) return;
    const json = JSON.stringify(responseObj);
    if (useContentLength) {
      const byteLength = Buffer.byteLength(json, "utf8");
      process.stdout.write(`Content-Length: ${byteLength}\r\n\r\n${json}`);
    } else {
      process.stdout.write(`${json}\n`);
    }
  }

  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => {
    buffer += chunk;

    while (true) {
      if (buffer.startsWith("Content-Length:")) {
        useContentLength = true;
        const headerEnd = buffer.indexOf("\r\n\r\n");
        if (headerEnd === -1) break;
        const header = buffer.slice(0, headerEnd);
        const match = header.match(/Content-Length:\s*(\d+)/i);
        const contentLength = match ? parseInt(match[1], 10) : 0;
        const totalLength = headerEnd + 4 + contentLength;
        if (buffer.length < totalLength) break;
        const body = buffer.slice(headerEnd + 4, totalLength);
        buffer = buffer.slice(totalLength);
        try {
          const parsed = JSON.parse(body);
          const res = handleJsonRpcMessage(parsed);
          sendResponse(res);
        } catch {
          // ignore malformed frame
        }
      } else {
        const newlineIndex = buffer.indexOf("\n");
        if (newlineIndex === -1) break;
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (!line) continue;
        try {
          const parsed = JSON.parse(line);
          const res = handleJsonRpcMessage(parsed);
          sendResponse(res);
        } catch {
          // ignore non-json line
        }
      }
    }
  });
}

