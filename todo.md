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

## Templates & Lead Forms (Placeholders)
- [x] Add Templates sidebar nav item (LayoutTemplate icon, /templates route)
- [x] Add Lead Forms sidebar nav item (ClipboardList icon, /lead-forms route)
- [x] Create stub Templates page (/templates) — coming soon placeholder
- [x] Create stub Lead Forms page (/lead-forms) — coming soon placeholder
- [x] Wire both routes in App.tsx

## Automations & Integrations (Placeholders)
- [x] Create stub Automations page (/automations) — coming soon placeholder
- [x] Create stub Integrations page (/integrations) — coming soon placeholder
- [x] Add Automations sidebar nav item (Zap icon)
- [x] Add Integrations sidebar nav item (Plug icon)
- [x] Wire both routes in App.tsx

## Workflows Feature
- [x] DB: workflows table (id, title, description, category, color, createdBy, createdAt, updatedAt)
- [x] DB: workflowSteps table (id, workflowId, stepNumber, title, description, notes, role, createdAt)
- [x] DB: migration applied
- [x] Backend: workflows.list, workflows.get, workflows.create, workflows.update, workflows.delete procedures
- [x] Backend: workflowSteps.saveSteps (replace all steps) procedure
- [x] Workflows page (/workflows): grid of workflow cards (title, category, step count, color)
- [x] Owner view: create workflow (dialog), then edit steps inline after selection (two-step flow by design)
- [x] Employee view: read-only accordion/list of steps with title, description, notes, role
- [x] Role-based: admin/owner can create/edit, all users can view
- [x] Add Workflows sidebar nav item (GitBranch icon)
- [x] Wire /workflows route in App.tsx

## Workflows Visual Canvas (replaces step-list)
- [x] Install @xyflow/react (React Flow v12)
- [x] Update workflows table: add canvasData JSON column (stores nodes + edges), drop workflowSteps table dependency
- [x] Apply DB migration for canvasData column
- [x] Backend: update workflows.get to return canvasData, update workflows.saveCanvas procedure
- [x] Build visual Workflows page: left panel = workflow list, right = React Flow canvas
- [x] Canvas node types: default card (label, color, notes), decision diamond, sticky note
- [x] Toolbar: add node button, node color picker, delete selected, zoom in/out, fit view
- [x] Admin: drag nodes, connect edges, edit labels inline, save canvas
- [x] Employee: read-only pan/zoom canvas view
- [x] Remove old workflowSteps-based Workflows.tsx and replace with canvas version

## Tasks Page Rebuild (Monday-style)
- [x] DB: internalTasks table (title, description, status, projectId, assigneeId, dueDate, resources JSON, createdBy)
- [x] DB: internalSubtasks table (taskId, title, isComplete, assigneeId, dueDate, resources JSON, sortOrder)
- [x] DB: migration applied
- [x] Backend: internalTasks.list (with subtasks joined), create, update, delete procedures
- [x] Backend: internalTasks.addSubtask, toggleSubtask, deleteSubtask procedures
- [x] Backend: internalTasks.addResource, removeResource, addSubtaskResource, removeSubtaskResource
- [x] Tasks page: Monday-style list view with expandable rows
- [x] Each row: title, assignee, project badge, due date, status badge, progress bar
- [x] Progress bar: auto-calculates from subtask completion, animates on change
- [x] Completion animation: confetti burst when all subtasks done, auto-marks Complete
- [x] Status badges: Not Started (gray), In Progress (blue), Stuck (red), Complete (green)
- [x] Resource panel: multiple URL+label items per task and subtask
- [x] Create task dialog: title, description, assignee, project, due date, status
- [x] Add subtask inline within expanded row
- [x] Admin and employees can create/edit; clients cannot access
- [x] Client Tasks stub section at bottom (coming soon)

## Tasks: Due Date + Time
- [x] DB: dueDate column already stores datetime — verify it accepts time component
- [x] Backend: ensure dueDate is passed as full ISO datetime string (not date-only)
- [x] Tasks UI: replace date-only input with datetime-local input for task create dialog
- [x] Tasks UI: replace date-only input with datetime-local input for subtask add form
- [x] Tasks UI: display due date+time in task rows and subtask rows (formatted local time)

## Tasks: Student File Reference
- [x] DB: add linkedFileId (nullable int FK to contactFiles) and linkedFileName (nullable varchar) to internalTasks
- [x] DB migration: generate and apply migration for new columns
- [x] Backend: update internalTasks.create to accept linkedFileId/linkedFileName
- [x] Backend: update internalTasks.update to accept linkedFileId/linkedFileName
- [x] Backend: update internalTasks.list to return linkedFileId/linkedFileName
- [x] Backend: add getStudentsWithFiles procedure for task file picker
- [x] Tasks UI: add optional student file picker in CreateTaskDialog (select student → select file from their Files section)
- [x] Tasks UI: display linked file badge in task row with link to file

## Knowledge Base Hub
- [x] DB: knowledgeBase table (id, ownerId, title, description, category, fileKey, fileUrl, fileName, fileSize, createdAt)
- [x] DB migration: generate and apply migration
- [x] Backend: knowledgeBase.list procedure (filter by category, search query)
- [x] Backend: knowledgeBase.upload procedure (base64 upload → S3)
- [x] Backend: knowledgeBase.delete procedure
- [x] Frontend: KnowledgeBase page with category sidebar, upload dialog, search bar, document grid
- [x] Frontend: open PDF in new tab or inline viewer
- [x] Frontend: sidebar nav entry "Knowledge Base" with BookOpen icon
- [x] Predefined categories: Law Books, Test Books, OSEP Letters, Work Documents, Other

## Templates Hub Redesign
- [x] Templates page: four hub blocks (Saved Smart Files, Create Smart File, Email Templates, Purchasables)
- [x] Saved Smart Files block: list/manage previously saved smart files
- [x] Create Smart File block: dialog asking "Start from Scratch" or "From Template Gallery"
- [x] Email Templates block: list/manage email templates
- [x] Purchasables block: placeholder section for purchasable items/packages

## Student Time Tracker
- [x] DB: timeEntries table (id, studentId, ownerId, startedAt, endedAt, durationSeconds, notes, hourlyRate, billable, invoiced, createdAt)
- [x] DB: add hourlyRate column to contacts table (default rate per student)
- [x] DB migration: generate and apply
- [x] Backend: timeEntries.start procedure (create open entry)
- [x] Backend: timeEntries.stop procedure (close open entry, calc duration)
- [x] Backend: timeEntries.list procedure (by studentId)
- [x] Backend: timeEntries.delete procedure
- [x] Backend: timeEntries.updateNotes procedure
- [x] Backend: timeEntries.getActive procedure (check if timer running)
- [x] Backend: contacts.setHourlyRate procedure
- [x] Frontend: Time Tracker tab in ContactDetail page
- [x] Frontend: live start/stop timer with elapsed display
- [x] Frontend: session log table (date, duration, notes, rate, amount, billable toggle)
- [x] Frontend: hourly rate setting per student (editable inline)
- [x] Frontend: billing summary (total hours, total unbilled amount)
- [x] Frontend: mark entries as invoiced / unbilled filter

## Walkthroughs (SOP)
- [x] DB: walkthroughs table (id, ownerId, title, description, category, steps JSON, createdAt, updatedAt)
- [x] DB: walkthroughRuns table (id, walkthroughId, studentId, ownerId, completedSteps JSON, status, startedAt, completedAt)
- [x] DB migration: generate and apply
- [x] Backend: walkthroughs.list procedure
- [x] Backend: walkthroughs.create procedure
- [x] Backend: walkthroughs.update procedure
- [x] Backend: walkthroughs.delete procedure
- [x] Backend: walkthroughRuns.start procedure
- [x] Backend: walkthroughRuns.updateProgress procedure
- [x] Backend: walkthroughRuns.list procedure (by studentId)
- [x] Frontend: Walkthroughs sidebar nav item (separate from Templates)
- [x] Frontend: Walkthroughs page — list of SOP templates with category filter
- [x] Frontend: SOP builder — create/edit walkthrough with ordered steps (title, instructions/script, notes)
- [x] Frontend: Live runner — step-by-step guided view with checkboxes, script display, progress bar
- [x] Frontend: "Run Walkthrough" button inside student detail page

## AI Assistant
- [x] Backend: ai.chat tRPC procedure — fetches live CRM context (today's appointments, overdue tasks, recent students) and sends to LLM with system prompt
- [x] Backend: ai.dailyBriefing procedure — structured summary of today's schedule, overdue items, and priority actions
- [x] Frontend: floating AI chat button (bottom-right, all pages) with slide-up panel
- [x] Frontend: chat history per session, markdown rendering, loading state
- [x] Frontend: daily briefing card on dashboard

## Quo (OpenPhone) Integration
- [x] DB: callLogs table (id, ownerId, studentId nullable, quoCallId, fromNumber, toNumber, durationSeconds, direction, transcript, summary, participants, status: assigned/unassigned, createdAt)
- [x] DB migration: generate and apply
- [x] Backend: /api/quo/webhook Express route with HMAC-SHA256 signature verification
- [x] Backend: phone number matching logic (normalize + match against contacts.phone)
- [x] Backend: auto-attach if 1 match, queue as unassigned if 0 or 2+ matches
- [x] Backend: tRPC callLogs.listByStudent procedure
- [x] Backend: tRPC callLogs.listUnassigned procedure
- [x] Backend: tRPC callLogs.assign procedure (assign unassigned log to a student)
- [x] Backend: tRPC callLogs.delete procedure
- [x] Frontend: Call Logs tab on student profile (transcript, summary, duration, date, direction)
- [x] Frontend: Unassigned Transcripts inbox page (sidebar nav item)
- [x] Frontend: assign dialog on unassigned transcripts (pick student)
- [x] Settings: QUO_WEBHOOK_SECRET secret via webdev_request_secrets

## Draft IEP History Separation
- [x] DB: create draftIepHistory table (id, contactId, ownerId, fileKey, fileName, fileUrl, notes, uploadedAt)
- [x] DB: remove draft columns from iepDocuments table (keep only official current/previous)
- [x] DB migration: generate and apply both changes
- [x] Backend: iep.uploadDraft saves new row to draftIepHistory (never overwrites, full history)
- [x] Backend: iep.listDraftHistory(contactId) returns all draft rows ordered by uploadedAt desc
- [x] Backend: iep.deleteDraftHistory(id) deletes a specific draft entry
- [x] Backend: iep.updateDraftNotes(id, notes) updates notes on a draft entry
- [x] Frontend: Draft block in IepDocumentBlocks uploads to draftIepHistory
- [x] Frontend: Separate amber-themed "Draft History" list below the 3 official IEP blocks
- [x] Frontend: Official IEP history (3 blocks) remains completely separate from Draft History section

## Team Management
- [x] DB: teamInvites table (id, ownerId, email, name, role: admin/member, token, status: pending/accepted/revoked, createdAt, acceptedAt)
- [x] DB migration: generate and apply
- [x] Backend: team.listMembers — list all users who have accepted an invite from this owner
- [x] Backend: team.listInvites — list pending/revoked invites
- [x] Backend: team.invite — create invite record, return invite link
- [x] Backend: team.revokeInvite — revoke a pending invite
- [x] Backend: team.removeMember — remove an accepted team member
- [x] Backend: team.updateRole — change a member's role (admin/member)
- [x] Backend: public team.acceptInvite — accept invite by token, link user to owner
- [x] Frontend: Team sidebar nav item (UserCheck icon, /team route)
- [x] Frontend: Team page — member list with avatar, name, email, role badge, joined date, remove button
- [x] Frontend: Pending invites section — email, role, sent date, revoke button
- [x] Frontend: Invite dialog — email input, role selector (Admin/Member), copy invite link
- [x] Frontend: Role descriptions (Admin = full access; Member = view/edit clients, no billing/settings)
- [x] Wire /team route in App.tsx

## Case Participant Bar (Student/Contact Detail)
- [x] DB: caseAssignments table (id, contactId, teamInviteId, assignedBy, assignedAt)
- [x] DB migration: generate and apply
- [x] Backend: team.listCaseAssignments(contactId) — list team members assigned to a case
- [x] Backend: team.assignToCase(contactId, teamInviteId) — assign a team member to a case
- [x] Backend: team.removeFromCase(contactId, teamInviteId) — remove assignment
- [x] Frontend: CaseParticipants component — horizontal bar showing owner avatar, contact avatar/initials, assigned team member chips, + Add button
- [x] Frontend: Add participant popover — searchable list of team members to assign
- [x] Frontend: Integrate CaseParticipants bar into ContactDetail page (below header, above tabs)

## Student Tab Bar Cleanup
- [x] Redesign StudentTabs tab bar: remove icon clutter, improve spacing, match parent/client side clean style
- [x] Group or slim down tab labels so they don't overflow on normal screen widths

## State Complaint Builder (Tools Tab)
- [x] Add State Complaint Builder block to ToolsTabContent on student/advocate side
- [x] Create /state-complaint-builder route and page
- [x] Backend: stateComplaint.generate tRPC procedure using LLM with student context

## State Complaint Builder — Tools Page & Student Picker
- [x] Add State Complaint Builder card to main Tools page (under a new "Formal Actions" section)
- [x] StateComplaintBuilder: if no contactId in URL, show student picker dropdown before the form

## 🧠 BrainDump Workspace
- [x] DB: brainDumpItems table (id, ownerId, title, body, category, status: not_started/in_progress/done/archived, priority: low/medium/high/urgent, nextStep, pinned, tags JSON, createdAt, updatedAt)
- [x] DB migration: generate and apply
- [x] Backend: brainDump.list procedure (filter by category, status, priority, search, pinned)
- [x] Backend: brainDump.create procedure
- [x] Backend: brainDump.update procedure (title, body, category, status, priority, nextStep, pinned, tags)
- [x] Backend: brainDump.delete procedure
- [x] Frontend: 🧠 BrainDump sidebar nav item (/brain-dump route)
- [x] Frontend: Quick capture bar (always visible at top, press Enter to save)
- [x] Frontend: List view (Notion-style table: idea, category, date, status, next step, priority)
- [x] Frontend: Kanban view (columns by status: Not Started, In Progress, Done, Archived)
- [x] Frontend: Card view (grid of cards with color-coded priority)
- [x] Frontend: Category filter tabs at top (All Ideas, CRM, AI Tools, Workflows, Business, Feature Requests, etc.)
- [x] Frontend: Search bar
- [x] Frontend: Pin/favorite toggle on each item
- [x] Frontend: Pinned items section at top of list
- [x] Frontend: Inline edit on click (expand item to edit all fields)
- [x] Frontend: Priority color coding (urgent=red, high=orange, medium=blue, low=gray)
- [x] Frontend: Status badges with dot indicators
- [x] Frontend: Dark mode friendly styling

## 💸 Bill Guardian™
- [x] DB: billGuardianBills table (id, ownerId, vendorName, expectedAmount, dueDay, frequency, category, autopay, priority, notes, fileKey, fileUrl, fileName, isActive, createdAt, updatedAt)
- [x] DB: billGuardianTransactions table (id, ownerId, bankAccountId, externalId, description, amount, transactionDate, category, matchedBillId, matchStatus, matchConfidence, matchNotes, isManuallyVerified, createdAt)
- [x] DB: billGuardianAccounts table (id, ownerId, bankName, accountName, accountType, lastSyncedAt, isActive, createdAt)
- [x] DB migrations: generate and apply all three tables
- [x] Backend: billGuardian.listBills, createBill, updateBill, deleteBill procedures
- [x] Backend: billGuardian.listTransactions, importTransactions (manual CSV/paste), deleteTransaction procedures
- [x] Backend: billGuardian.runMatching — AI-powered matching of transactions to bills (LLM vendor similarity + amount/date proximity)
- [x] Backend: billGuardian.getDashboard — aggregate status counts (paid, due soon, missing, duplicate, increased, needs review)
- [x] Backend: billGuardian.overrideMatch — manually verify/override a match
- [x] Backend: billGuardian.listAccounts, addAccount, deleteAccount procedures
- [x] Frontend: /bill-guardian route and page
- [x] Frontend: 💸 Bill Guardian sidebar nav item (ShieldCheck icon)
- [x] Frontend: Dashboard tab — status cards (Paid/Due Soon/Missing/Duplicate/Increased/Needs Review), monthly summary
- [x] Frontend: Bills tab — list of recurring bills with status badges, add/edit/delete, receipt upload
- [x] Frontend: Transactions tab — imported transactions list with match status, manual import dialog
- [x] Frontend: Add Bill dialog — all fields (vendor, amount, due day, frequency, category, autopay, priority, notes)
- [x] Frontend: Run AI Matching button — triggers matching engine, shows results with confidence scores
- [x] Frontend: Match result cards — show matched transaction, confidence %, override buttons
- [x] Frontend: Alert banner for missing/overdue bills
- [x] Frontend: Color coding — green=paid, amber=due soon, red=missing, orange=duplicate/increased, gray=needs review

## Bill Guardian — Edit, Manual Paid & Payment Link
- [x] DB: add paymentLink, paymentLinkNote, manuallyPaid, manuallyPaidAt columns to billGuardianBills
- [x] DB migration: generated and applied
- [x] Backend: billGuardian.updateBill accepts paymentLink, paymentLinkNote, manuallyPaid fields
- [x] Frontend: edit bill dialog — Payment Method Info section with Payment Link URL + Payment Notes fields
- [x] Frontend: Bills list — Mark Paid / Paid toggle button on each row (green when paid)
- [x] Frontend: Bills list — external link icon when paymentLink is set (opens in new tab)
- [x] Frontend: Bills list — payment notes shown below row when paymentLinkNote is set

## Bill Guardian — Click-Through Status Pill
- [x] DB: add paymentStatus column to billGuardianBills (enum: unpaid, paid, autopay_on, disputed, skipped)
- [x] DB migration: generate and apply
- [x] Backend: updateBill accepts paymentStatus field
- [x] Frontend: replace Mark Paid button with a colored status pill that cycles on click (Unpaid → Paid → Autopay On → Disputed → Skipped → Unpaid)

## Bill Guardian — Dashboard Attention Banner
- [x] Backend: billGuardian.getAlertSummary — returns { needsAttention: boolean, count: number, severity: 'critical'|'warning'|'info' } with NO bill names/amounts
- [x] Frontend: Dashboard — sleek Bill Guardian status card when needsAttention is true, links to /bill-guardian
- [x] Frontend: Card design — professional icon, "Bill Guardian needs your attention" copy, severity-based color, no bill details exposed

## Client Portal — Cases Tab Mirror Fix
- [x] Replace generic blue "Active" card in client portal Cases tab with exact mirror of advocate-side: Formal Escalation Files rose banner + type tag pills + empty state ("No formal cases on file — Great news, this is exactly where we want to be.")
- [x] Add ScrollText icon import to ClientPortal.tsx

## Rename "Financials" → "Billing" on All Client-Facing Pages
- [x] ClientPortal.tsx: tab label "Financials" → "Billing", tab comment, h2 heading, subtitle copy
- [x] ContactDetail.tsx: parent-side tab trigger label (line ~273) already says "Billing" — verified; student-side tab trigger label (line ~670) already says "Billing" — verified; no visible heading changes needed (no h2 in those tab contents)

## Page ID Corner Badge
- [x] Create PageIdBadge component — small fixed bottom-right badge showing page ID (Hash icon + PG-XXX code), subtle muted style, non-intrusive
- [x] Create PAGE_IDS registry mapping every route path to a unique PG-XXX id and page name
- [x] Wire badge into DashboardLayout so it auto-reads current route and shows the correct ID on every page
- [x] Verify badge appears correctly on Dashboard, Contacts, ContactDetail, ClientPortal, BillGuardian, BrainDump, Tools, Invoices, Settings
- [ ] PageIdBadge: add copy button inside expanded pill — copies "PG-XXX · Page Name" to clipboard, shows checkmark confirmation for 2 seconds

## PG-030 Contact Detail — Participants Bar Fix
- [x] Participants bar: auto-include the linked parent contact (parentId relationship) as a permanent participant with their name, avatar, and CONTACT badge
- [x] Participants bar: show advocate/owner (logged-in user) as first avatar always
- [x] Participants bar: clicking the parent participant shows quick-action options (call, text, email) using their stored phone/email
- [x] Backend: used existing contacts.get procedure to fetch parent contact on demand

## PG-004 Students List — Parent Name on Cards
- [x] Backend: no change needed — contacts.list already returns parentContactId; parentMap built client-side from the same query
- [x] Frontend: Family/Parent column now shows parent avatar + name (clickable → navigates to parent contact); falls back to company name or dash

## PG-030 Contact Detail — Link to Case Auto-Link
- [x] Remove empty dropdown from "Link to Case" box; auto-link to current student's own contact ID (or caseId) on open
- [x] If 1 project: show project name as read-only "auto-linked" chip; if 0 projects: show amber hint to create a case first; if 2+: show dropdown to choose

## PG-030 Contact Detail — Case ID Header + Task Link Fix
- [x] Show student's caseId under their name in the contact header (small monospace badge, only for students)
- [x] Task "Link to case" chip should display the student's actual caseId string, not a project reference

## PG-030 Tasks Tab — Create Task Button Fix
- [x] Create Task button disabled because projectId not pre-populated; fixed — button now enabled when title is filled and projects.length > 0; projectId resolved at submit time from projects[0] fallback

## PG-030 Tasks Tab — Button Fix + Assignee Picker
- [x] Fix Create Task button still disabled — root cause: priority column missing from DB; added column + migration 0026
- [x] Add Assign To dropdown in Add Task form showing: You (advocate), parent contact (from parentContactId), team members (from internalTasks.getTeamUsers)

## PG-030 Tasks Tab — Task Save Fix
- [x] Fix: projectId undefined at submit — added tasks.createForStudent backend procedure that auto-creates project if none exists
- [x] Ensure saved tasks appear on student detail Tasks tab AND global Tasks page — both use same projectTasks table via getByStudent and getAllTasksForOwner

## PG-009 Tasks Main Page — Show Student Tasks
- [x] Fix getAllTasksForOwner to include tasks from student-linked projects (clientId-based projects) — added Student Case Tasks section to PG-009 below existing Client Tasks stub
