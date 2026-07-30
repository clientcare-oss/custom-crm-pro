# Waypoint Advocates CRM — Developer & Deployment Guide

Welcome to the development guide for **Waypoint Advocates — Custom CRM Pro**. This document is designed to give you a clear, friendly guide for working with the codebase, running local preview servers, and deploying updates safely.

---

## 1. How to Start Coding (Byron's Quickstart)

### Step 1: Open Antigravity & Load Project
1. Launch **Antigravity IDE**.
2. Open the project folder: `custom-crm-pro`.

### Step 2: Always Pull First
Before starting any new work or prompting your AI assistant, fetch the latest updates:
```bash
git pull origin main
```

### Step 3: Run the Local Development Server
To launch your local app on your computer:
```bash
npm run dev
```
Open your browser to `http://localhost:3000` (or `http://localhost:5173`).

---

## 2. Command Reference

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Starts local dev server with auto-reload |
| `npm run check` | Runs TypeScript compiler to verify zero code errors |
| `npm run test` | Runs automated Vitest unit tests |
| `npm run build` | Builds production frontend & server bundles |
| `npm run db:push` | Generates and applies D1 database schema migrations |
| `npm run deploy` | Builds and deploys application to Cloudflare Workers |

---

## 3. Database Architecture (Cloudflare D1)

- **Database Provider**: Cloudflare D1 (`custom-crm-pro-db`).
- **ORM / Schema**: Drizzle ORM located in `drizzle/schema.ts` and `server/db.ts`.
- **Local Database**: Stored in `local.sqlite` during `npm run dev`.

---

## 4. Authentication (Clerk)

- Admin and portal user authentication is managed via **Clerk**.
- **Environment Variables**:
  - `VITE_CLERK_PUBLISHABLE_KEY`: Client-side key for `<ClerkProvider>` in `client/src/main.tsx`.
  - `CLERK_SECRET_KEY`: Server-side API key for token validation.

---

## 5. Deployment Pipeline

- **Staging Preview**: Pushes to `staging` branch automatically deploy to Cloudflare Workers preview environment.
- **Production**: Merges into `main` deploy directly to production workers.
