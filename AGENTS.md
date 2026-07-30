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
- Database schemas are defined in `drizzle/schema.ts` (or `server/db.ts`).
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

## 5. Verification Checklist Before Committing
Before finishing any task or merging changes:
1. `npm run check` must pass with zero TypeScript errors.
2. `npm run test` must pass cleanly.
3. Verify interactive UI flows visually on `localhost:5173` or dev server port.
