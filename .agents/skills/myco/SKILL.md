---
name: myco
description: Persistent Myco collective memory, spore recall/memorize tools, and live Waypoint CRM Myco integration guide (`PG-014-MYC`, `/api/myco/webhook`, `trpc.myco.*`). Activate when working with Myco spores, agent memory, MCP configuration, or syncing Waypoint CRM events/snapshots with Myco.
---

# Myco Collective Memory & CRM Bridge (`custom-crm-pro`)

This workspace connects **Waypoint Advocates — Custom CRM Pro** to **Myco** in two complementary ways:

1. **Developer & AI Agent Memory Layer (`.myco/spores.json` + MCP Server)**
   - Persistent project spores live in [`.myco/spores.json`](../../.myco/spores.json).
   - The local stdio MCP server at [`scripts/myco-mcp-server.mjs`](../../scripts/myco-mcp-server.mjs) (registered in [`.agents/mcp_config.json`](../mcp_config.json) and [`.mcp.json`](../../.mcp.json)) exposes three tools:
     - `myco_recall`: Search spores by `query`, `kind` (`architecture`, `guardrail`, `decision`, `discovery`, `workflow`, `case_note`), or `tag`.
     - `myco_memorize`: Record new spores when completing major features, bugfixes, or architectural decisions.
     - `myco_project_summary`: Inspect overall spore counts and key CRM integration routes.

2. **Live Waypoint CRM Application Integration (`PG-014-MYC`)**
   - **UI Console**: Located in `/integrations` (`PG-014`) via [`client/src/components/integrations/MycoIntegrationCard.tsx`](../../client/src/components/integrations/MycoIntegrationCard.tsx).
   - **Database Layer**: [`server/db/myco.ts`](../../server/db/myco.ts) manages `myco_config`, `myco_spores`, and `myco_sync_logs` via `CREATE TABLE IF NOT EXISTS` (preserving the locked `drizzle/schema.ts` hash) and mirrors spores to `.myco/spores.json` in local development.
   - **Service & Security Guardrails**: [`server/services/mycoService.ts`](../../server/services/mycoService.ts) enforces:
     - **FERPA Sanitization**: Scrubs student names, birthdates, and direct family identifiers before forwarding payloads to any external Myco daemon when FERPA mode is enabled.
     - **Do Not Serve Screening**: Runs `evaluateDoNotServeCandidate()` on inbound webhook payloads and suppresses restricted records from outbound marketing/automation syncs.
   - **Inbound Webhook**: `POST /api/myco/webhook` (and `POST /api/webhooks/myco`) in [`server/mycoWebhook.ts`](../../server/mycoWebhook.ts) verifies `x-myco-signature` (HMAC SHA-256) or `x-myco-secret`.
   - **tRPC Router**: `trpc.myco.*` in [`server/routers/myco.ts`](../../server/routers/myco.ts) provides `getStatus`, `saveConfig`, `listSpores`, `createSpore`, `deleteSpore`, `syncCrmSnapshot`, and `simulateWebhook`.

