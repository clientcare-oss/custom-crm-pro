# Custom CRM Pro - Project TODO

## Phase 1: Database Schema & Design System
- [x] Design database schema (users, contacts, leads, projects, invoices, contracts, appointments, messages)
- [x] Define API structure and tRPC procedures
- [ ] Establish design system (typography, colors, spacing, components) - CSS build errors need fixing

## Phase 2: Database & Backend Infrastructure
- [x] Create Drizzle schema for all tables
- [x] Generate and apply database migrations
- [x] Build core query helpers in server/db.ts
- [x] Implement tRPC procedures for CRUD operations
- [ ] Set up role-based access control (admin vs client) - needs stricter ownership checks
- [ ] Write unit tests for auth and core procedures
- [ ] Fix Tailwind CSS utility class registration errors
- [ ] Complete full CRUD procedures for all resources (add missing delete operations)
- [ ] Add ownership/resource-level authorization checks to all protected procedures

## Phase 3: Admin Dashboard & Core Features
- [ ] Build admin dashboard layout with sidebar navigation
- [ ] Implement contact management (list, create, edit, delete)
- [ ] Implement lead management with status tracking (New, Follow-up, Qualified, Won, Lost)
- [ ] Build Kanban board for project pipeline
- [ ] Implement project management (create, edit, tasks, notes, file attachments)
- [ ] Create dashboard overview (revenue metrics, pipeline summary, activity feed)

## Phase 4: Invoicing, Contracts & Payments
- [ ] Build invoice generation and tracking
- [ ] Implement contract template builder
- [ ] Add e-signature support for contracts
- [ ] Integrate Stripe payment processing
- [ ] Build payment tracking and confirmation flow

## Phase 5: Scheduling, Client Portal & Messaging
- [ ] Implement appointment scheduling with availability management
- [ ] Build public booking links
- [ ] Create calendar view for appointments
- [ ] Build client portal with login
- [ ] Implement client-facing views (invoices, contracts, projects, files)
- [ ] Build two-way messaging system between owner and clients
- [ ] Add notification alerts for new messages

## Phase 6: REST API & Webhooks
- [ ] Build full REST API layer for all resources
- [ ] Implement webhook support for external integrations
- [ ] Create API documentation
- [ ] Build integration hooks for external tools

## Phase 7: Polish & Testing
- [ ] Refine UI/UX for premium aesthetic
- [ ] Test all features end-to-end
- [ ] Optimize performance
- [ ] Create checkpoint and prepare for deployment

## Known Issues
- Tailwind CSS: Cannot apply unknown utility class `card-base` in index.css
- TypeScript: storageProxy.ts type error (template issue)
- RBAC: Some procedures lack ownership verification
- CRUD: Missing delete procedures for several resources

## Completed Items
(None yet)
