# Custom CRM Pro - Project TODO

## Phase 1: Database Schema & Design System
- [x] Design database schema (users, contacts, leads, projects, invoices, contracts, appointments, messages)
- [x] Define API structure and tRPC procedures
- [x] Establish design system (typography, colors, spacing, components)

## Phase 2: Database & Backend Infrastructure
- [x] Create Drizzle schema for all tables
- [x] Generate and apply database migrations
- [x] Build core query helpers in server/db.ts
- [x] Implement tRPC procedures for CRUD operations
- [x] Set up role-based access control (admin vs client)
- [x] Write unit tests for auth and core procedures (9 tests passing)
- [x] Fix Tailwind CSS utility class registration errors
- [x] Complete full CRUD procedures for all resources
- [x] Add ownership/resource-level authorization checks to all protected procedures

## Phase 3: Admin Dashboard & Core Features
- [x] Build admin dashboard layout with sidebar navigation
- [x] Implement contact management (list, create, edit, delete)
- [x] Implement lead management with status tracking (New, Follow-up, Qualified, Won, Lost)
- [x] Build Kanban board for project pipeline
- [x] Implement project management (create, edit, tasks, notes, file attachments)
- [x] Create dashboard overview (revenue metrics, pipeline summary, activity feed)

## Phase 4: Invoicing, Contracts & Payments
- [x] Build invoice generation and tracking
- [x] Implement contract management page
- [x] Add e-signature support for contracts (SignaturePad component, S3 storage, contract signing flow)
- [x] Wire client portal Contracts tab to clientList procedure (client-safe query)
- [x] Add strict authorization in contracts.sign (only assigned client can sign)
- [x] Add vitest for e-signature flow (authorized sign, unauthorized rejection)
- [x] Integrate Stripe payment processing (checkout, billing portal, vault subscriptions)
- [x] Wire invoice payment UI to Stripe checkout for end-to-end client payments
- [x] Persist Stripe payment outcomes in webhook handler (update invoice status)
- [x] Build payment confirmation UX in client portal after successful checkout

### Phase 5: Scheduling, Client Portal & Messaging
- [x] Build branded client portal (invoices, contracts, projects, files)
- [x] Create admin preview button to view client portal in real-time
- [x] Implement client dashboard with their projects and invoices
- [x] Build Billing tab in client portal with payment history
- [x] Add "Update Payment Information" button in Billing tab
- [x] Add "Schedule Meeting" button on client portal pages
- [x] Implement meeting type selection (IEP Meeting, 1:1 with Advocate, etc.)
- [x] FIX: Client Portal Preview button now works for admin users (added preview=true parameter)
- [x] Build admin appointment scheduling page (create, list, status management)
- [x] Build client file upload system (PDF-only, 1GB limit)
- [x] Create file management page in admin dashboard
- [x] Implement vault subscription system with Stripe
- [x] Build vault management for past clients
- [x] Set up S3 storage integration for files
- [x] Build admin messaging page (conversation list, send/receive)
- [x] Wire client portal Messages tab to real messaging API
- [x] Add owner availability management UI (days/hours editor)
- [x] Build public booking links (/book route, public access)
- [x] Implement calendar view for appointments
- [x] Add notification alerts for new messages (owner notified via platform)

## Phase 6: REST API & Webhooks
- [x] Build full REST API layer for all resources
- [x] Implement webhook support for external integrations
- [x] Create API documentation (self-documenting at /api/v1/)
- [x] Build integration hooks for external tools

## Phase 7: Polish & Testing
- [ ] Refine UI/UX for premium aesthetic (needs visual review)
- [ ] Add comprehensive tests for core CRM procedures
- [ ] Performance optimization (lazy loading, caching)
- [ ] Create final checkpoint and prepare for deployment

## Phase 7b: Customizable Terminology (Settings)
- [x] Create a Settings page accessible from the sidebar
- [x] Create a TerminologyContext (React context) that provides the label throughout the app
- [x] Preset options: Project, Case, Student, plus a custom text input
- [x] Update DashboardLayout sidebar nav to use dynamic label for the Projects link
- [x] Update Projects page title/headings to use dynamic label
- [x] Update Dashboard metrics card to use dynamic label
- [x] Update all other pages that reference "Project" to use dynamic label (ClientPortal updated)

## Known Issues
- TypeScript: storageProxy.ts type error (template issue - non-critical)
- Delete operations not implemented for leads, projects, invoices, contracts, appointments
- REST API uses default owner resolution (needs API key table for multi-tenant)
- CRUD: Delete procedures not yet implemented for some resources

## Completed Items
- [x] Complete database schema with 13 tables
- [x] Full tRPC API layer with 50+ procedures
- [x] Dashboard home page with metrics
- [x] Contacts management page
- [x] Leads pipeline with 5-stage Kanban board
- [x] Role-based access control (basic)
- [x] Design system and premium styling

## Waypoint Case Compass™
- [x] Add caseCompass and caseCompassHistory tables to Drizzle schema
- [x] Generate and apply migration SQL
- [x] Add DB helpers for compass CRUD + history snapshots
- [x] Add tRPC procedures: get, upsert (auto-snapshots old version), listHistory
- [x] Build admin Compass edit panel on client detail/profile page
- [x] Build client portal Compass card (read-only, animated compass icon, View History panel)

## Contact Detail Page (/contacts/:id)
- [x] Backend: getContactById, getContactActivity, getContactFiles, getContactInvoices procedures
- [x] Build ContactDetail page: Compass card at top, tabs (Activity, Files, Tasks, Financials, Notes, Details)
- [x] Wire Contacts list rows to navigate to /contacts/:id

## Contacts / Students Separation
- [x] Filter Contacts page to exclude contacts with jobTitle === "Student"
- [ ] Contact detail page: add "Related Students" section showing students with same family/company
- [ ] Future: Quo phone service integration on contact detail page (call button)

## Case Compass Inline Edit
- [x] Remove Case Compass from sidebar nav
- [x] Add inline Edit button to Compass card on student Contact Detail page
- [x] Replace "Go to sidebar" message with inline edit form on the card

## Case Compass caseId Refactor
- [x] Add caseId (unique, auto-generated) to contacts table
- [x] Add caseId column to caseCompass and caseCompassHistory tables
- [x] Backfill caseId for existing student contacts
- [x] Update backend: read/write Compass by caseId
- [x] Update client portal: look up Compass by caseId via linked contact
- [x] Update ContactDetail admin page to use caseId
