# Custom CRM Pro — AI Agent & Developer Guidelines (`AGENTS.md`)

Welcome! This repository contains **Waypoint Advocates — Custom CRM Pro**, an owned IEP advocacy CRM platform built for Byron Honea (Master IEP Coach®, Atlanta GA).

## Tech Stack Overview
- **Frontend**: React 19, Vite, Tailwind CSS v4, Radix UI, tRPC Client, Wouter Routing.
- **Backend & API**: Cloudflare Workers / Express API server (`server/_core/index.ts`), tRPC Server.
- **Database**: Cloudflare D1 (`custom-crm-pro-db`) with Drizzle ORM.
- **Authentication**: Clerk (`@clerk/clerk-react` & `@clerk/express`).
- **File Storage**: Cloudflare R2 (S3-compatible API).

---

## 1. Package Manager & Script Standards
- **Package Manager**: Always use **`npm`**. Do NOT use `pnpm` or `yarn`.
- **Development**: Run `npm run dev` to launch local dev server. Always output the clickable server URL (e.g., `http://localhost:3000/`) whenever asked to start the dev server.
- **Type Checking**: Run `npm run check` (`tsc --noEmit`) to verify TypeScript compiler state.
- **Testing**: Run `npm run test` (`vitest run`).
- **Build**: Run `npm run build`.
- **Deployment**: Deployments are managed via GitHub Actions CI/CD to Cloudflare Workers (`staging` and `main` branches).

---

## 2. Database Schema & Migrations (Drizzle + Cloudflare D1)
- Database schemas are defined in `drizzle/schema.ts`.
- Never perform ad-hoc direct SQL mutations in production D1 without a Drizzle migration step.
- To generate and apply migrations locally:
  ```bash
  npm run db:push
  ```

---

## 3. UI Aesthetics & Component Guidelines
- **UI Quality**: Ensure rich aesthetics, clean dark/light mode balance, accessible tap targets, and responsive design.
- **Component Libraries**: Leverage Radix UI primitives (`@radix-ui/*`) styled with Tailwind CSS (`clsx`, `tailwind-merge`).
- **Icons**: Use `lucide-react` icons.
- **Forms**: Use `react-hook-form` + `zod` for type-safe form validation.

---

## 4. Safety & Security Guardrails
- **Data Protection**: This system handles FERPA-adjacent student records, IEP documents, evaluations, and family contact details. Never expose plain secret keys or internal API routes.
- **Auth Enforcement**: All `/admin/*` and `/portal/*` routes MUST be protected by Clerk authentication hooks/middleware.
- **AI Endpoints**: Ensure LLM integrations sanitize input prompts and protect student identity.

---

## 5. Coding Standards & Code Organization

### 📐 Rule A: File Size & Component Modularization
- **Soft Limit**: Keep files under **500 lines**. Hard cap of **800 lines** for top-level page controllers.
- **Component Placement**:
  - `client/src/pages/`: Thin controllers handling routing, top-level layout, and tRPC queries.
  - `client/src/components/<domain>/`: Feature-specific sub-tabs, cards, forms, and widgets (e.g. `client/src/components/contact/`, `client/src/components/portal/`, `client/src/components/tasks/`).
  - `client/src/components/ui/`: Reusable primitive UI components.

### 🛡️ Rule B: Error Boundaries & Resiliency
- Every major route section and interactive module MUST be wrapped in a `ScopedErrorBoundary`.
- Uncaught component errors must render a localized, branded error card with a retry button instead of failing the entire application view.
- All async tRPC mutations must handle errors gracefully using `toast.error()` with user-friendly error messages.

### 🗄️ Rule C: Server Database Layering
- `server/db.ts` acts exclusively as a **re-export barrel**.
- Database query implementations must reside in domain modules under `server/db/<domain>.ts` (`users.ts`, `contacts.ts`, `tasks.ts`, `billing.ts`, `compass.ts`).

### 🔒 Rule D: Strict Type Safety
- Avoid `any` types. Use Drizzle `$inferSelect` / `$inferInsert` types or explicit TypeScript interfaces.
- Zero TypeScript compiler warnings/errors (`npm run check`).

### 🏷️ Rule E: Mandatory Page ID Identification System (`PG-XXX`)
- **Requirement**: Every single page, route, modal flow, dynamic view, and tool (new, existing, and future) **MUST** have a unique identification code (`PG-XXX`) assigned in `client/src/lib/pageIdRegistry.ts`.
- **Badge Integration**: The global `<PageIdBadge />` in `App.tsx` automatically detects the current active route and presents a clickable/copyable ID badge on every screen.
- **Header Badges**: Specialized workflow consoles (e.g., Discovery Call `PG-003-DC`, State Complaint Builder `PG-020`, Lead Forms `PG-012`) must feature their `PG-XXX` badge in their top headers for rapid cross-referencing during development and bug reporting.
- **Reference Table**:
  - `PG-001`: Dashboard (`/`)
  - `PG-002`: Contacts (`/contacts`)
  - `PG-003`: Leads (`/leads`)
  - `PG-003-DC`: Discovery Call Process (`/leads/:leadId/discovery`)
  - `PG-004`: Students (`/students`, `/projects`)
  - `PG-005`: Invoices (`/invoices`)
  - `PG-006`: Contracts (`/contracts`)
  - `PG-007`: Appointments & Calendar (`/appointments`, `/calendar`)
  - `PG-008`: Scheduler (`/scheduler`)
  - `PG-009`: Tasks (`/tasks`)
  - `PG-010`: Tools Hub (`/tools`)
  - `PG-010-REC`: Voyage Meeting Recorder (`/tools/voyage-recorder`)
  - `PG-010-WS`: Worksheet Studio (`/tools/worksheet-builder`)
  - `PG-010-IEP`: IEP Comparator (`/tools/iep-comparator`)
  - `PG-011`: Templates (`/templates`)
  - `PG-012`: Lead Forms (`/lead-forms`)
  - `PG-013`: Automations (`/automations`)
  - `PG-014`: Integrations (`/integrations`)
  - `PG-015`: Workflows (`/workflows`)
  - `PG-016`: Knowledge Base (`/knowledge-base`)
  - `PG-017`: Walkthroughs (`/walkthroughs`)
  - `PG-018`: Unassigned Call Logs (`/call-logs`)
  - `PG-019`: Team Management (`/team`)
  - `PG-020`: State Complaint Builder (`/state-complaint-builder`, `/tools/state-complaint-builder`)
  - `PG-020-WS`: State Complaint Workspace (`/tools/state-complaint-builder/:id`)
  - `PG-021`: BrainDump (`/brain-dump`)
  - `PG-022`: Bill Guardian (`/bill-guardian`)
  - `PG-023`: Client Portal (`/portal`, `/client-portal`, `/project-workspace/:id`)
  - `PG-024`: Settings (`/settings`)
  - `PG-025`: Case Compass Console (`/case-compass`, `/tools/case-compass`)
  - `PG-026`: Page ID Showcase (`/page-id-showcase`)
  - `PG-027`: Portal Experience Management (`/portal-management`)
  - `PG-027-S01` to `PG-027-S15`: Portal Journey Stages
  - `PG-028`: Intake & Dynamic Forms (`/intake`, `/form/:slug`)
  - `PG-029`: Booking Page (`/book`, `/portal/book`)
  - `PG-030`: Contact & Student Detail (`/contacts/:id`, `/students/:id`)
  - `PG-031`: Advocate Case Workspace (`/workspace`)
  - `PG-032`: AI Connections (`/ai-connections`)
  - `PG-033`: Smart Files Suite (`/smart-files`)
  - `PG-033-ASN`: Smart File Assignments (`/smart-files/:id/assignments`)
  - `PG-033-EDT`: Smart File Editor (`/smart-files/:id`)
  - `PG-033-VWR`: Smart File Portal Viewer (`/smart-files/response/:id`)
  - `PG-034`: Tech Tasks (`/tech-tasks`)
  - `PG-035`: Services Catalog (`/services`)
  - `PG-036`: Sponsors & Partners (`/sponsors`)
  - `PG-404`: Not Found (`/404`)

---

## 6. Verification Checklist Before Committing
Before finishing any task or merging changes:
1. `npm run check` must pass with zero TypeScript errors.
2. `npm run test` must pass cleanly.
3. Verify interactive UI flows visually on `localhost:5173` or dev server port.
