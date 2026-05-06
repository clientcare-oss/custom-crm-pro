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

## Parent Portal System
- [x] Add parentContactId field to contacts table (migration)
- [x] Link Woolbert and Baaarbra to Shawn in the database
- [x] Backend: getStudentsByParentPortalUser procedure (portal.getMyStudents, portal.getStudentCompass, portal.getStudentHistory, portal.getStudentsForParent)
- [x] Client portal: case selector when parent has multiple students
- [x] Client portal: Compass and content switch per selected student (by caseId)
- [x] Preview Portal button on parent contact detail page
- [x] Add Student form: parent selector dropdown to auto-link on creation

## Parent Contact Detail Page Redesign
- [x] ContactDetail: detect parent vs student (jobTitle !== "Student" = parent)
- [x] Parent view: replace Compass tab with "Students" overview tab showing case cards
- [x] Student case card: student name, case ID, next meeting date, task alert (⚠️ if tasks assigned)
- [x] Parent view: show Financials, Activity, Files, Appointments, Details tabs (no Compass)
- [x] Student view: keep existing Compass tab as default
- [x] Backend: getStudentsWithSummary(parentContactId) — returns linked students with next meeting + task count

## WCC Section Label Redesign
- [x] Redesign Compass section labels (Current Status, Last Meeting, Next Step, Who Has the Ball, Next Meeting) with icons, stronger typography, and polished visual hierarchy
- [x] Apply same label style to CaseCompassCard (client portal view)

## Swipeable Compass Carousel (Client Portal)
- [x] Build CompassCarousel component: touch swipe, arrow nav, dot indicators, slide animation
- [x] Integrate carousel into CaseCompassCard (portal view only, admin keeps stacked layout)

## Student-Centric Portal Restructure
- [x] Audit DB: how appointments, files, invoices link to students/projects
- [x] Backend: portal.getStudentAppointments — appointments for student's contact ID
- [x] Backend: portal.getStudentFiles — files for student's contact ID
- [x] Backend: portal.getStudentBilling — invoices/contracts for student's contact ID
- [x] Portal UI: tabs (Appointments, Files, Billing) scope to selected student
- [x] Portal UI: WCC carousel stays at top, tabs below update when student card is clicked

## Sidebar Cleanup
- [x] Remove "Client Files" from sidebar navigation
- [x] Remove /client-files route from App.tsx

## Communication Rename & Sidebar Cleanup
- [x] Remove "Messages" from sidebar navigation
- [x] Remove /messages route from App.tsx
- [x] Rename "Activity" tab to "Communication" in ContactDetail (student and parent views)
- [x] Rename "Messages" tab to "Communication" in ClientPortal

## Tasks Feature
- [x] Add Tasks tab to student ContactDetail (alongside Communication tab)
- [x] Tasks tab: show tasks assigned to this student, allow adding/completing tasks
- [x] Add Tasks to sidebar navigation
- [x] Create placeholder Tasks main page (/tasks)
- [x] Wire up Tasks route in App.tsx

## Client Portal Tab Restructure
- [ ] Move tab bar above WCC carousel in client portal
- [ ] Tab bar: Compass, Communication, Tasks, Files, Cases, Financials, Appointments, Details
- [ ] Compass tab: shows WCC carousel (current behavior)
- [ ] Communication tab: message thread scoped to student
- [ ] Tasks tab: tasks assigned to student
- [ ] Files tab: files scoped to student
- [ ] Cases tab: case/project info for student
- [ ] Financials tab: invoices/billing scoped to student
- [ ] Appointments tab: appointments scoped to student
- [ ] Details tab: student contact details

## Theme Toggle
- [x] Add light/dark mode toggle to admin sidebar (bottom, near user profile)
- [x] Add light/dark mode toggle to client portal header

## IEP Document System & Tools
- [x] DB: iepDocuments table (contactId, currentFileKey, currentFileName, currentUploadedAt, previousFileKey, previousFileName, previousUploadedAt)
- [x] DB: migration applied via webdev_execute_sql
- [x] Backend: iep.get(contactId), iep.upload(contactId, file) procedures
- [x] IEP blocks in student Files tab: Current IEP card, Upload New/Amended card, Compare card (locked until both versions exist)
- [x] IEP blocks in client portal Files tab: same 3-block layout, parent-friendly language
- [x] Auto-archive: when new IEP uploaded, old current moves to previous slot
- [x] Tools tab on student ContactDetail page
- [x] Tools tab in client portal (pre-loaded with selected student)
- [x] Tools sidebar nav item with hub page listing all tools
- [x] IEP Comparison tool card on Tools hub (placeholder/coming soon state)

## Scheduler Feature (replaces Appointments)
- [x] DB: sessionTypes table (name, description, sessionType phone/video, videoType, videoLink, duration, durationUnit, timezone, dateRange, dateRangeDays, color, instructions, confirmationMessage, bufferBefore, bufferBeforeUnit, bufferAfter, bufferAfterUnit, minNotice, minNoticeUnit, customIncrements, teamAvailability, roundRobin, canReschedule, canCancel, sendConfirmationEmail, reminderSettings JSON, weeklyHours JSON, isActive)
- [x] DB: migration applied via webdev_execute_sql
- [x] Backend: sessionTypes CRUD procedures (list, get, create, update, delete, toggleActive)
- [x] Backend: default availability settings stored per session type (weekly hours, buffer, notice, increments)
- [x] Scheduler admin page (/scheduler): session type cards grid with + New session type card
- [x] Session type card: color dot, name, duration, meeting type, date range, active toggle, edit/copy/preview/link icons
- [x] Session type edit form: Details section (name, type, video type, video link, timezone, duration, date range, color, instructions)
- [x] Session type edit form: Availability section (weekly hours Mon-Sun with time pickers, buffer time, min notice, custom increments, team/round-robin)
- [x] Session type edit form: Confirmation section (customizable message, reminders, reschedule/cancel/confirmation email toggles)
- [x] Pre-populate all new session types with standard defaults (Mon/Tue/Thu/Fri 8am-5pm, 30min buffer before, 6hr after, 3 day min notice, 15min increments, round robin, 1hr + 15min reminders, reschedule on, cancel off, confirmation email on)
- [x] Rename "Appointments" to "Calendar" in sidebar nav
- [x] Update DashboardLayout sidebar label from Appointments to Calendar
- [x] Keep existing appointments/calendar view accessible under /calendar route
