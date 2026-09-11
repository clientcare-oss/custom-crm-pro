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
  - `PG-027-S01` to `PG-027-S14`: Portal Journey Stages
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
  - `PG-037`: First Mate (`/first-mate`)
  - `PG-038`: Crew Quarters (`/crew-quarters`)
  - `PG-404`: Not Found (`/404`)

---

## 6. Verification Checklist Before Committing
Before finishing any task or merging changes:
1. `npm run check` must pass with zero TypeScript errors.
2. `npm run test` must pass cleanly (all tests must pass without external API keys).
3. Verify interactive UI flows visually on dev server port.

---

## 7. AI Architecture & Cloudflare Workers AI Standards (No OpenAI Key Required)

### 🤖 Primary AI Engine: Cloudflare Workers AI
- **No OpenAI Key Needed**: This application runs natively on **Cloudflare Workers AI**. Developers (and AI coding agents) do NOT need an `OPENAI_API_KEY`.
- Never throw precondition errors or fail procedures when `OPENAI_API_KEY` is missing. The system automatically routes through Cloudflare Workers AI via `server/_core/llm.ts` or native `env.AI` bindings.

### 💰 Cost-Effective Model Selection
To ensure maximum cost-effectiveness and speed within Cloudflare Workers AI, always use the following tiered models:
- **Fast Tasks & Conversational Assist**: Use `@cf/meta/llama-3.1-8b-instruct` (`CF_MODELS.FAST`) for sub-second live meeting guidance (First Mate Fast Assist), voice turn parsing, and quick text rephrasing.
- **Deep Synthesis & Complex Reasoning**: Use `@cf/meta/llama-3.3-70b-instruct-fp8-fast` (`CF_MODELS.DEEP`) for comprehensive IEP review, dispute detection, prior written notice analysis, and session summaries.
- **Audio Speech-to-Text**: Use `@cf/openai/whisper` (`CF_MODELS.WHISPER`) for transcribing meeting audio chunks.

### ☁️ Cloudflare Deployment Architecture
- **Worker + Static Assets**: The application is deployed as a **Cloudflare Worker with Static Assets** (`main: "server/worker.ts"`, assets in `./dist/public`), **NOT** Cloudflare Pages.
- **Account Identification**:
  - Account: `Clientcare@waypointadvocates.com's Account` (`fa65a33e99b08d8202d3afa0b305a1c4`)
  - Worker Name: `custom-crm-pro`
  - D1 Database: `custom-crm-pro-db` (`f90072b5-4842-4423-a221-ab62a01a25a6`)
  - Live Production URL: `https://custom-crm-pro.clientcare-fa6.workers.dev`
- **Dashboard Location**: Find the project in the Cloudflare Dashboard under **Compute (Workers) > Workers & Pages > Workers**, not the Pages tab.

### 🧪 Vibe-Coding & CI/CD Testing Guardrails
- **Self-Contained Unit Tests**: Unit tests in `server/*.test.ts` run in GitHub Actions CI where third-party API keys (`OPENAI_API_KEY`, `LINEAR_API_KEY`) may not be injected.
- All AI callers and external integrations must provide smart local heuristic fallbacks when offline so `npm run test` executes deterministically and passes with **0 failures**.
- A failing test will block the GitHub Actions CI/CD pipeline and halt deployment to Cloudflare!

---

## 8. Waypoint Driving Style Engine (`PG-023-PRK`)
The Marina Parking Lot (`client/src/components/portal/MarinaLotView.tsx`) uses the **Waypoint Driving Style Engine** defined in `client/src/components/portal/waypointDrivingStyle.ts`:
1. **100% Orthogonal Paths**: All transit is strictly right-angle (90°) grid movements (`OrthogonalPath` in `marinaCarKinematics.ts`). Zero diagonal travel, zero curved arcs. Vehicles drive along real lane corridors: Gate -> Apron -> Central Thoroughfare -> Row Aisle -> Stall.
2. **Zero-Fade Transitions**: Discrete instantaneous 1 or 0 sprite visibility (`WAYPOINT_DRIVING_STYLE.getSpriteOpacities`). Never apply opacity cross-fading or translucent overlapping sprites.
   - North: `rearSprite` (100%)
   - East: `sideRightSprite` (100%)
   - West: `sideLeftSprite` (100%)
3. **Vehicle Variations**: Sizing, assets, and brake light coordinates are decoupled into `VehicleVariation` definitions (`VEHICLE_VARIATIONS` in `waypointDrivingStyle.ts`).
   - Side profile sprites use proportional `sideScale` (SUV: 1.45, Sedan: 1.42, Sports: 1.35, Truck: 1.48) to match the visual mass and lane presence of the 3D rear view.
   - Container enforces an exact 1:1 square `(12.0% * 608) / 1024 = 7.125%` width by `12.0%` height.
4. **Brake Lights**: Authentic LED brake light clusters illuminate during deceleration into the final parking stall (`progress >= 0.82` on `isFinalLeg`). Each body style features tailored LED optics:
   - SUV: Triple cluster (left, right, roof spoiler).
   - Sedan: Wide horizontal bar clusters + upper windshield center brake light.
   - Sports Car: Aggressive full-width horizontal LED light bar.
   - Pickup Truck: Dual vertical taillight columns + cab third brake light.
5. **Standard Waypoint Fleet Colors (Locked Palette)**:
   To prevent color drift and eliminate redesign across future vehicle shapes, all vehicle models strictly adhere to the 5 official Waypoint fleet colors:
   - **Onyx Black** (`"black"`): Deep obsidian executive black with clearcoat metallic glints.
   - **Cobalt Blue** (`"blue"`): Executive midnight/sapphire metallic (`H: 0.600, S: 0.46, L_mul: 0.78`).
   - **Crimson Red** (`"red"`): Deep luxury burgundy/wine metallic (`H: 0.985, S: 0.52, L_mul: 0.75`).
   - **Emerald Green** (`"green"`): British Racing Green / dark forest metallic (`H: 0.388, S: 0.42, L_mul: 0.72`).
   - **Burnished Bronze** (`"bronze"`): Warm sunset amber / copper metallic (`H: 0.080, S: 0.50, L_mul: 0.78`).
   - Never use flat white or light silver/gray tints (they wash out dark studio lighting and lose contrast against parking lot asphalt).
   - Sprites follow the automotive clearcoat pipeline in `scripts/generate-car-colors.cjs` preserving smoke-tinted windows, dark tire rubber ($L < 0.13$), and red LED taillight assemblies.
6. **Multi-Vehicle Fleet & Weighted Spawning**:
   The fleet includes 4 distinct body styles across the 5 official colors (20 total vehicle variations):
   - **Executive SUV** (`suv`): 35% spawn weight
   - **Regular Sedan** (`sedan`): 30% spawn weight
   - **Luxury Sports Car** (`sports`): 25% spawn weight
   - **Crew-Cab Pickup Truck** (`truck`): 10% spawn weight (least spawned)



