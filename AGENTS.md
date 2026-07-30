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
- **Development**: Run `npm run dev` to launch local dev server.
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

---

## 6. Verification Checklist Before Committing
Before finishing any task or merging changes:
1. `npm run check` must pass with zero TypeScript errors.
2. `npm run test` must pass cleanly.
3. Verify interactive UI flows visually on `localhost:5173` or dev server port.
