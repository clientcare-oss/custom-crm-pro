# Custom CRM Pro # Project TODO

## Task Edit (Active)
- [x] BUG: BrainDump Convert to Task dropdown simplified to show only staff (parent contacts can be assigned via task editing)
- [x] Verify pencil icon edit modal works correctly for all task types (General Tasks, Client Facing Tasks, Case Tasks)
- [x] BUG: Edit modal assignee dropdown must ALWAYS show team members only (never contacts/students — students are the case, not assignees)
- [x] BUG: Selecting one team member (e.g. Byron) saves as another (e.g. Shawn) — wrong ID mapping (fixed with assignedToUserId column)
- [x] Assignee dropdown should show team members (staff) AND parent contacts — but NOT students
- [x] BUG: Assigning task to parent contact should make it client-facing (auto-sets type to Client-Facing)
- [x] Add Task Type selector to edit modal (General / Client-Facing / Case) so user can change task type
- [x] Create Task bar (blue bar): assignee dropdown should show staff AND parent contacts (not just staff)
- [x] BrainDump: Add "Convert to Task" button on each item with assignee picker (staff + parent contacts)

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

## Notes Feature for Student Projects (NEW)
- [x] Database schema: Create projectNotes and projectNotesHistory tables
- [x] Database helpers: Add CRUD functions for notes in db.ts
- [x] tRPC procedures: Create notes router with list, create, update, delete, getHistory
- [x] Visibility control: Implement eye icon toggle (visible to client vs advocate-only)
- [x] Auto-save: Implement auto-save with debounce on content changes
- [x] Edit history: Track all edits with timestamps
- [x] UI Components: Create NoteEditor and NotesSection components
- [x] Integration: Add NotesSection to ContactDetail (advocate view)
- [x] Integration: Add NotesSection to ClientPortal (client view with visibility filtering)
- [x] Manual testing: Verify notes creation, editing, visibility toggle in browser
- [ ] Fix notes vitest coverage (notes CRUD/history tests need database setup fix)
- [x] REDESIGN: Move NotesSection from Cases card embed to a dedicated 'Notes' tab in the student ContactDetail horizontal nav bar
- [x] Remove NotesSection from inside the Cases card in ContactDetail
- [x] Add Notes tab to ClientPortal horizontal nav (only shows client-visible notes)

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
- [x] Contact detail page: add "Related Students" section showing students with same family/company (ParentTabs Students tab with getStudentsWithSummary)
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
- [x] Move tab bar above WCC carousel in client portal
- [x] Tab bar: Compass, Communication, Tasks, Files, Cases, Financials, Appointments, Details (Tools tab also present)
- [x] Compass tab: shows WCC carousel (current behavior)
- [x] Communication tab: message thread (parent-level thread, not per-student)
- [x] Tasks tab: tasks assigned to student
- [x] Files tab: files scoped to student
- [x] Cases tab: show real student case/project info (studentProjects query + project cards + escalation banner)
- [x] Financials tab: invoices/billing scoped to student (labeled Billing)
- [x] Appointments tab: appointments scoped to student
- [x] Details tab: student contact details

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
- [x] PageIdBadge: add copy button inside expanded pill — copies "PG-XXX · Page Name" to clipboard, shows checkmark confirmation for 2 seconds

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

## PG-009 Student Case Tasks — Full Feature Parity
- [x] Backend: add projectTaskSteps table (subtasks for projectTasks) with toggle, add, delete procedures
- [x] Backend: extend tasks.getAll and getByStudent to return steps array per task
- [x] Frontend: StudentTaskRow component on PG-009 — chevron expand, steps list, add step, progress bar, confetti on complete, status badge click-to-change, priority pill, due date, delete
- [x] Frontend: ContactDetailTaskRow on PG-030 — same full-featured row replaces simple card
- [x] Rename "Client Tasks" stub to "Student Case Tasks"

## Auto-Complete Task on All Steps Done
- [x] StudentTaskRow (PG-009): when last step is toggled complete, auto-set task status to "Done" + fire confetti
- [x] ContactDetailTaskRow (PG-030): same auto-complete + confetti when all steps done
- [x] Internal TaskRow (PG-009): added same auto-complete logic (toggleSubtask → all done → status "complete")

## PG-023 Client Portal — Full-Featured Task Rows
- [x] Audit how tasks are rendered in ClientPortal.tsx (Tasks tab)
- [x] Add portal.toggleTaskStep and portal.updateTaskStatus procedures (ownership-verified, protectedProcedure)
- [x] Replace simple task cards in portal Tasks tab with PortalTaskRow — chevron expand, steps list, progress bar, auto-complete + confetti when all steps done

## PG-023 Client Portal — Tasks Assigned to Client Only
- [x] Add getTasksAssignedToStudent(studentContactId) db helper — filters by assignedTo = studentContactId
- [x] Add portal.getAssignedTasks procedure (ownership-verified, protectedProcedure)
- [x] ClientPortal.tsx now uses portal.getAssignedTasks — clients only see tasks assigned to them
- [x] Add seenByClient column to projectTasks (migration applied)
- [x] Add portal.markTaskSeen procedure
- [x] PortalTaskRow: pulsing blue "New" badge on unseen tasks; dismissed when client expands the row

## PG-009 Tasks — Remove Wasted Space
- [x] Removed max-w-4xl mx-auto constraint — task list now fills full available width beside the nav sidebar

## Fix Confetti Firing on Page Load
- [x] TaskRow (Tasks.tsx): prevDone initialized to current isComplete — confetti only fires on transition
- [x] StudentTaskRow (Tasks.tsx): same fix
- [x] ContactDetailTaskRow (ContactDetail.tsx): same fix
- [x] PortalTaskRow (ClientPortal.tsx): same fix

## Fix Confetti Animation — PG-030 and PG-023
- [x] PG-030 ContactDetailTaskRow: removed stepCount > 0 guard — confetti now fires on any Done transition
- [x] PG-023 PortalTaskRow: removed stepCount > 0 guard + added circle/check button so client can manually complete tasks → confetti fires

## Student Case Tasks Stub — Wire Up Real Data
- [x] Found dead stub in Tasks.tsx (lines 922-926) — removed
- [x] Renamed real section from "Student Case Tasks" to "Client Facing Tasks"
- [x] Also fixed TaskRow confetti guard (removed subtaskCount > 0) so it fires for tasks without subtasks too

## PG-009 Tasks — Three Sections + Row Metadata Redesign
- [x] Three distinct sections: General Tasks (blue badge), Client Facing Tasks (blue badge), Case Tasks (amber badge)
- [x] StudentTaskRow metadata bar redesigned: 📁 projectName (amber) | ○ assignedToName (circle avatar initial) | 📅 dueDate
- [x] Backend: getAllTasksForOwner now resolves assignedToName from contacts table
- [x] clientFacingTasks = tasks with assignedTo set; caseTasks = tasks without assignedTo
- [x] StudentTaskRow confetti guard fixed (removed stepCount > 0)

## Unified Task Creation — Fix Assignee + Task Type Selector
- [x] Audited all task creation points — found assignee mismatch (users.id vs contacts.id)
- [x] Fixed assignee: General tasks → team users; Client Facing → contacts; Case → no assignee
- [x] Built CreateTaskInline component: Task Type selector (General/Client Facing/Case), correct assignee per type, compact inline style
- [x] PG-009 Tasks page: old modal replaced with always-visible CreateTaskInline
- [x] PG-030 ContactDetail Tasks tab: old form replaced with CreateTaskInline (pre-linked studentContactId + caseId)

## PG-030 CreateTaskInline — Assignee Dropdown Fix
- [x] When studentContactId is pre-linked: Task Type selector hidden; auto-defaults to Case Task
- [x] Assign To shows team members (you + others) + parent contact (green, labelled "parent · client facing")
- [x] Selecting parent auto-switches type to Client Facing; selecting team member keeps Case Task
- [x] CreateTaskInline accepts parentContactId prop; ContactDetail passes it through
- [x] Auto-type indicator badge shown in controls row (Case Task / Client Facing)

## Task Edit Capability
- [x] Backend: tasks.update and internalTasks.update procedures already existed
- [x] Built EditTaskModal component (supports both internal tasks and project tasks)
- [x] TaskRow (PG-009 General Tasks): pencil edit button wired to EditTaskModal
- [x] StudentTaskRow (PG-009 Client Facing / Case Tasks): pencil edit button wired to EditTaskModal
- [x] ContactDetailTaskRow (PG-030): pencil edit button wired to EditTaskModal with studentContactId

## Notes Feature for Student Projects (In Progress)
- [ ] Add notes table to Drizzle schema (projectId, title, content, isVisibleToClient, createdBy, createdAt, updatedAt)
- [ ] Add projectNoteHistory table for edit history tracking
- [ ] Generate and apply migration SQL
- [ ] Build DB helpers: createNote, updateNote, deleteNote, getNotesByProject, getNoteHistory
- [ ] Build tRPC procedures: notes.create, notes.update, notes.delete, notes.list, notes.getHistory
- [ ] Create NoteEditor component with rich text formatting (TipTap or similar)
- [ ] Add eye icon visibility toggle to note header
- [ ] Implement auto-save functionality (debounced)
- [ ] Integrate Notes section into Project Detail page (admin side)
- [ ] Add Notes to Client Portal (filtered by isVisibleToClient flag)
- [ ] Display "Last edited" timestamp and edit history panel
- [ ] Test visibility toggle: eye on = visible to both, eye off = advocate only
- [ ] Write vitest for notes CRUD and visibility filtering

## BUG: Notes Not Showing in Client Portal
- [ ] BUG: Client portal Notes tab not showing client-visible notes for Baaarbra Sheep (notes marked eye-on not appearing)
- [ ] Diagnose: check if studentProjects is populated in ClientPortal when viewing Baaarbra's student
- [ ] Diagnose: check if the notes.list tRPC query is being called with the correct projectId in client portal
- [ ] Diagnose: check if visibleToClient field is being saved/returned correctly from the database
- [ ] Fix and verify the notes visibility flow end-to-end in the client portal

## AI Connections Feature (NEW)
- [ ] DB: Create aiConnections table (id, name, icon, color, location, outputTarget, promptTemplate, isActive, createdAt, updatedAt)
- [ ] DB: Create aiConnectionRuns table (id, connectionId, contactId, projectId, inputData, outputText, createdAt)
- [ ] DB: Generate migration SQL and apply via webdev_execute_sql
- [ ] DB helpers: CRUD functions for aiConnections and aiConnectionRuns in db.ts
- [ ] tRPC: procedures for list, create, update, delete AI connections (adminProcedure)
- [ ] tRPC: procedure to run an AI connection (execute prompt with student context, save run)
- [ ] UI: AI Connections page with card list showing icon + label + location + prompt preview
- [ ] UI: Create/Edit form with icon picker, label, location dropdown, output target, prompt textarea
- [ ] UI: Live button preview chip on each card
- [ ] UI: Add AI Connections to sidebar nav
- [ ] UI: Render AI buttons on student ContactDetail page in the correct tab
- [ ] UI: AI run modal (shows result, option to save to Note or Compass)
- [ ] Pre-built: Seed 3 starter AI connections (Compare IEPs, Draft Parent Summary, Identify Missing Services)
- [ ] Test: Create a button, run it on a student, verify output appears

## Lead Intake Form (NEW - Replaces HubSpot Form)
- [ ] Add missing columns to contacts table: timezone, bestTimeToCall, referredBy, howHeardAboutUs, diagnosis, dateOfBirth, schoolName, gradeLevel, countyDistrict, state, zipcode, challenges, secondParentName, secondParentPhone, secondParentEmail
- [ ] Build public tRPC procedure: leads.submitIntakeForm (no auth required)
- [ ] Auto-create parent contact record on submission
- [ ] Auto-create student contact record on submission with all details
- [ ] Auto-create initial project/case for student on submission
- [ ] Auto-populate student Details tab with all submitted fields
- [ ] Notify advocate (owner) of new lead submission via platform notification
- [ ] Build multi-step public lead form UI at /intake route (dark mode, branded, Waypoint style)
- [ ] Step 1: Parent/Guardian Info (name, email, phone, 2nd parent optional, timezone, best time, referral)
- [ ] Step 2: Student Info (name, age, DOB, diagnosis, school, grade, county, state, zip, challenges)
- [ ] Step 3: Success/confirmation screen (next steps, what to expect)
- [ ] Add /intake route to App.tsx (public, no auth required)
- [ ] Add lead form link/embed to Lead Forms nav page
- [ ] Test full submission flow: form → parent contact → student contact → project → Details tab populated

## Quick Setup (Internal Phone Call Form)
- [x] Build QuickSetupModal component — 2-step slide-in modal (Parent Info + Student Info) with script prompt for advocate
- [x] Add "Quick Setup" button to Leads page header (prominent, always visible)
- [x] Add "Quick Setup" button to DashboardLayout sidebar (bottom, above user profile)- [x] Add quickSetup.create tRPC procedure (protectedProcedure) — creates parent contact, student contact, project, lead record, sends notification
- [x] Show success state with Case ID and "Go to Student" / "View in Contacts" links after submission
- [x] Include the "What to Tell the Client" script prompt in the modal header

## Lead Forms Overhaul
- [ ] Redesign Lead Forms page to show two form cards: Internal (Quick Setup) and Public (Intake)
- [ ] Internal form card: shows description, links to Quick Setup modal (opens it inline), no public URL
- [ ] Public form card: shows shareable link, copy-link button, preview button, edit button
- [ ] Add edit capability for the Public intake form (editable fields/settings stored in DB)
- [ ] Public intake form: add scheduling option section with link to scheduler (Calendly-style embed or direct link to /scheduler)
- [ ] Public intake form: show scheduler link field that advocate can configure (paste their scheduling URL)
- [ ] Update /intake route to show scheduling option at the end of the form
- [ ] Lead Forms page: show form submission count for each form

## Lead Forms — Multi-Form Support
- [x] Add lead_forms table to drizzle schema (id, ownerId, name, slug, description, fields JSON, schedulingUrl, schedulingEnabled, isActive, submissionCount, createdAt)
- [x] Run migration for lead_forms table
- [x] Add tRPC procedures: leadForms.list, leadForms.create, leadForms.update, leadForms.delete, leadForms.getBySlug (public)
- [x] Redesign Lead Forms page with: Internal card (fixed), Public Intake card (fixed), + dynamic custom forms list
- [x] Add "Create New Form" button that opens a Create/Edit Form modal
- [x] Create/Edit Form modal: form name, description, scheduling URL toggle + URL field, active/inactive toggle
- [x] Each custom form card: name, shareable link (/form/:slug), copy link, preview, edit, delete, submission count
- [x] Build /form/:slug public route that renders a dynamic form from DB config
- [x] Dynamic form renderer: standard fields + optional scheduling step at the end
- [ ] Add scheduling step to default /intake public form (reads schedulingUrl from settings or hardcoded)
- [x] Wire /form/:slug route in App.tsx (public, no auth required)

## Lead Forms — Multi-Form Support (PG-012) — COMPLETED
- [x] Add lead_forms table to drizzle schema
- [x] Run migration for lead_forms table
- [x] Add tRPC procedures: leadForms.list, create, update, delete, getBySlug (public)
- [x] Redesign Lead Forms page: Internal card, Public Intake card, + dynamic custom forms list
- [x] Add "Create New Form" button that opens Create/Edit Form modal
- [x] Create/Edit Form modal: form name, description, scheduling URL toggle + URL field, active/inactive toggle
- [x] Each custom form card: name, shareable link, copy link, preview, edit, delete, submission count
- [x] Build /form/:slug public route that renders a dynamic form from DB config
- [x] Dynamic form renderer: standard fields + optional scheduling step at the end
- [x] Wire /form/:slug route in App.tsx (public, no auth required)

## Lead Forms UX Fixes
- [x] Add prominent Edit button directly visible on each custom form card (not buried in ⋯ menu)
- [x] Add prominent Edit button to Public Intake Form built-in card
- [x] Fix Preview button on all form cards to open the actual live form in a new tab (window.open) so user can click through all steps
- [x] Fix Preview button on Public Intake Form card to open /intake in a new tab

## Lead Forms — Preview Mode & Field Editor
- [x] DynamicForm: add ?preview=true URL param that disables all field validation and allows free step navigation (click any step in the stepper to jump to it)
- [x] DynamicForm preview mode: show a yellow "Preview Mode" banner at the top, hide the Submit button on the last step (replace with "Close Preview")
- [x] LeadFormModal: add a "Questions" tab / section that shows all available fields with on/off toggles per field
- [x] Store fields config (JSON array of enabled field keys) in the lead_forms.fields column
- [x] DynamicForm: read the fields config from the form and hide/show fields accordingly
- [x] Preview button on Lead Forms page: open /form/:slug?preview=true instead of /form/:slug
- [x] Preview button on Public Intake Form card: open /intake?preview=true
- [x] IntakeForm: also support ?preview=true mode (skip validation, free navigation)

## Lead Forms — Editable Question Labels & Built-in Scheduler
- [ ] LeadFormModal Questions tab: make each field label editable (click pencil icon to rename, save custom label per field)
- [ ] Store custom labels in the fields config JSON alongside enabled/disabled state
- [ ] DynamicForm: render custom field labels from form config instead of hardcoded defaults
- [ ] LeadFormModal Settings tab: add "Use built-in scheduler" toggle (replaces external URL option)
- [ ] When built-in scheduler is selected: scheduling step embeds the /book page or links to it with pre-filled context
- [ ] DynamicForm scheduling step: if schedulingType === "builtin", show embedded /book iframe or redirect button to /book
- [ ] DynamicForm scheduling step: if schedulingType === "external", show the external URL link (existing behavior)

## Lead Forms — Inline Scheduling Widget & Animated Success Screen
- [x] Add sessionTypeId field to leadForms schema (which session type this form uses for booking)
- [x] Run migration for sessionTypeId column
- [x] Add session type selector dropdown to LeadFormModal Settings tab (shows all session types from scheduler)
- [x] Update tRPC leadForms create/update to accept sessionTypeId
- [x] Build inline scheduling widget in DynamicForm scheduling step — embed a mini calendar/time picker that calls the booking API directly (no redirect to /book page)
- [x] Inline widget: pre-fill parent name and email from form data
- [x] Inline widget: show available slots for the selected session type
- [x] Inline widget: calendar on left, AM/PM time slots on right (matching design reference)
- [x] Inline widget: save booking appointment when slot is selected and form is submitted
- [x] Animated success screen: confetti burst + animated checkmark (same style as task completion)
- [x] Success screen: "Remember to save our number!" notice with the business phone number
- [x] Success screen: editable phone number field (user can tap to edit/copy)
- [x] Success screen: no page redirect — stays on same page after submission

## Settings — Business Phone Number
- [x] Add Business Information section to Settings page with phone field
- [x] users.phone column already varchar(50) — supports 1-800 toll-free numbers
- [x] Add setBusinessPhone protectedProcedure to systemRouter
- [x] Add updateOwnerPhone db helper
- [x] Settings page: phone input with Save button, shows currently saved number with green checkmark
- [x] Form success screen: "Remember to save our number!" card shows the saved business phone

## Inline Scheduler — Timezone Fix & Calendar Link
- [x] Fix timezone bug in getAvailableSlots: appointments stored in UTC must be compared using correct local timezone so nuggs appointment on May 12 blocks the right slots
- [x] Add "View Live Scheduler" link in the scheduling step of DynamicForm (links to /book page) — REMOVED (families should not see this)

## Admin — View Live Scheduler Button
- [x] Add "View Live Scheduler" button on Lead Forms page header (opens /book in new tab)
- [x] Add "View Live Scheduler" button on Scheduler page header (opens /book in new tab)
- [x] Remove "View full scheduler" link from the public-facing form (families should not see this)

## Lead Forms — View Live Scheduler Button Fix
- [x] Update "View Live Scheduler" button on Lead Forms page to open /form/public-intake?preview=true&step=4 (inline scheduler widget) instead of /book (old standalone page)
- [x] Update DynamicForm to support ?step=N URL param to auto-jump to a specific step on load

## Client Portal — Schedule Meeting Fix
- [x] Replace old /book plain form in client portal "Schedule Meeting" dialog with InlineScheduler widget (same calendar widget families see in the intake form)
- [x] Client portal: show session type selector first, then InlineScheduler for the selected session type
- [x] Pre-fill client name and email in the InlineScheduler from the logged-in user's profile

## Booking Widget — Replace /book Plain Form Everywhere
- [x] Rewrite BookingPage.tsx (/book route) to use InlineScheduler widget with dark theme (matching the intake form widget)
- [x] Support ?session=ID on /book to pre-select a session type directly
- [x] Update Scheduler.tsx copy/preview link buttons to use the new /book page with InlineScheduler (already use /book?session=ID format — now shows InlineScheduler widget)

## Scheduler Availability — Fix Inconsistent Slot Display
- [x] Remove ?preview=true from "View Live Scheduler" button URL so real availability always loads (not fake preview slots)
- [x] Fix InlineScheduler: when opened via admin View Live Scheduler, always fetch real slots regardless of preview param
- [x] Investigate why weeklyHours config may be missing/empty causing no slots to show on some days — Wednesday is intentionally empty in session type config
- [x] Add admin-only "preview=false" override so admin can always see real availability — fixed by removing preview=true from URL

## Lead Forms — Confirmation Page & Post-Submit Features
- [x] Add "Preview Confirmation Page" button on Lead Forms admin page (PG-012) that opens the form confirmation/thank-you screen
- [x] Make the post-submission animation visible/previewable from the admin Lead Forms page
- [x] Add customizable "Save Our Phone Number" message field in form settings — shown on confirmation page after submission
- [x] Store the save-our-number message per form in the database and render it on the confirmation screen

## Lead Forms — Customize Confirmation Section (PG-012)
- [x] Add confirmationHeadline, confirmationBody, saveOurNumberMessage fields to leadForms schema
- [x] Run DB migration to add the new columns
- [x] Update leadForms.update router procedure to accept and save the new fields
- [x] Update leadForms.getBySlug and getPublicIntakeForm to return the new fields
- [x] Add "Customize Confirmation" card/section to LeadForms.tsx admin page with editable fields and live save
- [x] Add "Preview Confirmation" button that opens /form/:slug?preview=true&confirmed=true in new tab
- [x] Update DynamicForm to support ?confirmed=true param — show confirmation screen directly with confetti animation
- [x] DynamicForm confirmation screen: render confirmationHeadline, confirmationBody, saveOurNumberMessage from form config instead of hardcoded text
- [x] Add confirmationImageKey and confirmationImageUrl fields to leadForms schema for QR code / custom image on confirmation page
- [x] Run DB migration for new image fields
- [x] Add image upload to Customize Confirmation section (upload to S3, store key+url)
- [x] Display uploaded QR/image on DynamicForm confirmation screen

## Lead Forms — Phone Number Edit Location Fix
- [x] Move business phone number edit field into the admin "Customize Confirmation" block on PG-012 Lead Forms (not on the client-facing confirmation screen)
- [x] Client-facing confirmation screen: show the phone number read-only (no pencil/edit button, no inline edit)
- [x] Admin Customize Confirmation block: add a "Business Phone" input field that saves via setBusinessPhone procedure

## Confirmation Screen — Display Fixes
- [x] Fix body text rendering: split on semicolons and newlines so each bullet point shows on its own line (not a wall of text)
- [x] Fix phone number not showing below the amber "save our number" box on the client confirmation screen

## Confirmation Screen — Bug Fixes (Round 2)
- [x] Fix phone number not saving from Customize Confirmation block (save button not persisting to DB) — moved setState calls to useEffect to prevent render-phase reset
- [x] Fix phone number not showing on client-facing confirmation screen — set correct number 1-(833)-696-4377 in DB directly
- [x] Fix booked appointment info not showing on confirmation screen after scheduling — InlineScheduler now auto-submits form after booking so confirmation shows immediately
- [x] Show appointment details (date, time, session type name) on DynamicForm confirmation screen

## Quo Integration — Full Functionality
- [x] Add QUO_WEBHOOK_SECRET input field directly in Integrations page (no need to find hidden Secrets panel)
- [x] Add server procedure to save/get QUO_WEBHOOK_SECRET from DB settings table
- [x] Show webhook status (configured / not configured) on Integrations page
- [x] Update setup instructions to reflect in-app secret entry

## Quo Webhook Debugging & Expansion
- [x] Diagnose why voicemail calls are not importing (check server logs, event types)
- [x] Fix webhook handler to support voicemail.transcription.completed and all Quo event types
- [x] Add raw webhook event logging to DB for debugging
- [x] Add Quo Settings panel in Call Logs sidebar with: event type toggles, auto-assign rules, test webhook button, raw event log viewer

## Portal Booking Page
- [x] Fix "no sessions available" in portal — ensure sessionTypes.listAll uses owner ID not portal user ID
- [x] Replace Schedule Meeting popup/modal with a dedicated portal page /portal/book
- [x] Show clickable session type blocks (like student selector) on /portal/book
- [x] Show full calendar scheduler (date/time picker) after selecting a session type
- [x] Show confirmation screen after booking with appointment details
- [x] Wire "Schedule Meeting" button in portal to navigate to /portal/book

## PG-012 Confirmation Page Fixes
- [x] Fix phone number not saving in Customize Confirmation block (LeadForms admin)
- [x] Add center-text alignment toggle for the large confirmation headline
- [x] Fix phone number not displaying on the DynamicForm confirmation screen

## Portal Book Theme
- [x] Apply dark blue navy theme to /portal/book (session type selector + calendar) matching the /book page style

## Blue Theme Option
- [x] Add "blue" as a third theme option in the theme switcher (alongside dark/light) with navy blue CSS variables

## Voice-to-Text Feature
- [x] Create VoiceTextarea component: mic icon in bottom-right corner, click to start/stop recording, appends transcript directly to field
- [x] Create VoiceInput component: mic icon on right side of Input, click to start/stop recording, appends transcript
- [x] Add server tRPC voice.transcribe mutation using built-in Whisper API
- [x] Add POST /api/voice/upload Express route for audio blob upload (busboy multipart)
- [x] Replace ALL Textarea and Input instances across all 30+ pages and components with VoiceTextarea/VoiceInput
- [x] Replace raw textarea elements in Messages, Appointments, Contracts, NoteEditor
- [x] Voice-to-text now available on every text field in the entire CRM (both short and long fields)
- [x] Workflow: Add hover "+" button at bottom-center of each card/sticky node to add a card below (inherits color, auto-connects with arrow)
- [x] Calendar: clicking an event opens a detail popup showing title, date/time, video link with Join Meeting button, and participants as Parent/Student labels
- [x] Calendar event popup: show Delete and Edit actions
- [ ] Calendar event popup: add Cancel Meeting button with "Notify parent by email" checkbox — marks appointment as Cancelled and optionally sends cancellation email to parent
- [x] Appointments: Add full edit form to popup — pre-filled with all fields (title, date/time, video link, parent name, parent phone, student name, location, description, status), save via tRPC update mutation

## BrainDump Image Attachments
- [x] Add braindumpImages table to schema (braindumpId, imageUrl, uploadedAt)
- [x] Generate and apply DB migration for braindumpImages table
- [x] Add tRPC procedures for braindump image CRUD (upload, delete, list)
- [x] Update BrainDump component with file input button + paste handler for images
- [x] Display image thumbnails next to braindump text in the list
- [x] Support multiple images per braindump item
- [x] Auto-attach images when converting braindump to task
- [ ] Display images on task detail view (same as braindump)

## Client Portal Separate Auth (CRITICAL FIX)
- [ ] Add clientCredentials table (email, passwordHash, contactId, createdAt)
- [ ] Add portalSessions table (token, contactId, expiresAt)
- [ ] Generate and apply DB migration for new tables
- [ ] Add backend procedures: setClientPassword (admin), portalLogin, portalLogout, portalMe
- [ ] Build separate PortalLogin page at /portal with email/password form (no Manus OAuth)
- [ ] Portal route shows PortalLogin for unauthenticated users instead of Manus OAuth
- [ ] ClientPortal page checks portal session cookie (not Manus OAuth user)
- [ ] Admin can set/reset client password from Contact Detail page
- [ ] Send login instructions in portal link email

## Forgot Password Flow
- [ ] Add password_reset_tokens table to schema with token, contactId, expiresAt, usedAt
- [ ] Generate and apply DB migration for password_reset_tokens
- [ ] Add requestPasswordReset and resetPassword tRPC procedures to portalAuth router
- [ ] Add Forgot Password link and form to portal login page
- [ ] Add Reset Password view at /portal?reset=TOKEN
- [ ] Send reset email via Gmail with reset link

## Portal Email Link & First-Time Login Fixes
- [x] Fix portal email link to use CRM domain not Wix domain (cleared wrong portalDomain from DB)
- [x] Add first-time "Set your password" link on portal login screen

## Portal Login Bug Fix (May 2026)
- [x] Fix portal login Google redirect bug: portal procedures were using protectedProcedure (Manus auth) — converted to portalProcedure that reads portal_session cookie; fixed main.tsx global redirect to skip /portal paths; made auth.getOwner public; zero TS errors

## Portal Self-Onboarding Fix
- [x] Fix requestPasswordReset to work for contacts without existing credentials (look up contact by email, send setup link that creates credentials on first use)


## Portal Login Bug Fixes (May 16, 2026)
- [x] Fix portal login Google OAuth redirect issue (added portalProcedure, skip redirect for /portal paths)
- [x] Fix requestPasswordReset to work for contacts without existing credentials (self-onboarding)
- [x] Fix portal login button not triggering mutation (added type="button" to prevent form submission)
- [x] Fix require() ESM error in auth.getOwner (replaced require() with proper import)
- [x] Add portalProcedure for portal session authentication (separate from Manus OAuth)
- [ ] Fix portal session cookie cross-domain issue (dev server vs production domain) — cookies work on production domain, dev testing requires local domain workaround
- [x] Fix portal session: store token in localStorage and send as X-Portal-Token header (cookie not persisting in production)
- [x] Set navy as the default theme for the entire app (including portal login screen, ThemeProvider default, localStorage initial value)
- [x] Simplify theme to 2 modes: Blue (light/sun) and Navy (dark/moon), remove light and dark options
- [x] Replace 4-option theme switcher in sidebar with a single sun/moon toggle button
- [x] Add sun/moon theme toggle to client portal top-right header
- [x] Navy remains the default theme
- [x] Ensure portal login, set-password, and reset-password screens always render in navy theme (not dependent on localStorage)
- [x] Fix session type duration display in portal scheduler — shows "3 min" instead of "3 hours" (now uses durationUnit field in ClientPortal and BookingPage)
- [x] Fix calendar appointment duration when booking — server now recomputes endTime from sessionTypeId server-side, ignoring client-side duration calculation entirely (bulletproof fix)
- [x] BUG: Portal booking does not link appointment to the logged-in portal user (parent) or their student — appointment floats with no clientId/studentId
- [x] BUG: Student portal page shows no upcoming appointments because booked appointments are not linked to the student contact

## Smart File Builder Module

### Database Schema
- [x] Create `smartFileTemplates` table (id, ownerId, name, description, status: draft/active/archived, createdAt, updatedAt)
- [x] Create `smartFileBlocks` table (id, templateId, order, type: heading/text/image/contract/service/signature/initial/checkbox/field/payment/conditional/addon/internal_note, content JSON, settings JSON)
- [x] Create `smartFileAddOns` table (id, templateId, name, description, price, contractText, isRequired)
- [x] Create `smartFileAssignments` table (id, templateId, contactId, studentContactId, status: draft/sent/viewed/in_progress/completed/payment_selected/payment_completed/overdue/cancelled, sentAt, viewedAt, completedAt, signedAt, signatureData JSON, ipAddress, paymentOption: one_time/monthly, paymentAmount, dueDate, selectedAddOnIds JSON, fieldValues JSON, pdfUrl)
- [x] Run migration and apply SQL via webdev_execute_sql

### Server Procedures (tRPC)
- [x] `smartFiles.listTemplates` — list all templates (admin)
- [x] `smartFiles.getTemplate` — get template with all blocks and add-ons (admin)
- [x] `smartFiles.createTemplate` — create new template (admin)
- [x] `smartFiles.updateTemplate` — update template metadata (admin)
- [x] `smartFiles.duplicateTemplate` — clone a template (admin)
- [x] `smartFiles.deleteTemplate` — soft delete template (admin)
- [x] `smartFiles.saveBlocks` — save/reorder all blocks for a template (admin)
- [ ] `smartFiles.listAddOns` — list add-ons for a template (admin)
- [x] `smartFiles.saveAddOns` — create/update/delete add-ons for a template (admin)
- [x] `smartFiles.assignToClient` — create assignment for a contact/student (admin)
- [x] `smartFiles.listAssignments` — list all assignments with status (admin)
- [x] `smartFiles.getAssignment` — get full assignment with resolved smart fields (portal + admin)
- [x] `smartFiles.submitAssignment` (portalSubmit) — client submits completed file with field values, signature, payment selection, add-on selections (portal)
- [x] `smartFiles.markViewed` (portalMarkViewed) — mark assignment as viewed when client opens it (portal)
- [x] `smartFiles.voidAssignment` — void/cancel an assignment (admin)
- [ ] `smartFiles.resendReminder` — send reminder email to client (admin)

### Admin UI — Template Builder
- [x] Add "Smart Files" to sidebar navigation (admin only)
- [x] Smart Files index page: list templates with status badges, Create New button, Duplicate, Delete actions
- [x] Template editor page: block palette + canvas + block settings panel
- [x] Block types: Heading, Text, Contract Language, Service Package, Signature Block, Initials Block, Checkbox, Required/Optional Field, Payment Section, Conditional Section, Add-On Section, Internal Note
- [x] Drag-and-drop block reordering in the canvas
- [x] Smart field insert menu: click to insert {{parent_name}}, {{student_name}}, {{advocate_name}}, {{case_id}}, {{date_created}}, {{email}}, {{phone}}
- [x] Conditional block settings: yes/no branching question that shows/hides subsequent blocks
- [x] Payment section settings: one-time amount, monthly amount, number of months
- [x] Add-On manager: name, short description, price, full contract text, required toggle
- [ ] Template preview mode: renders as client would see it with sample data
- [x] Assign template to client: select contact + student, optional due date, send now

### Client Portal — Smart File Viewer
- [x] Smart Files tab (Documents) in client portal showing assigned files with status
- [x] Smart File viewer page: renders all blocks in order, resolves smart fields with real contact data
- [x] Conditional sections: show/hide blocks based on client's yes/no answers in real time
- [x] Add-On selection: show name, short description, price; client clicks to add/remove
- [x] Payment selection: show one-time vs monthly plan; client selects one
- [x] Signature block: typed name input, cursive preview
- [x] Initials block: typed initials input per block
- [x] Checkbox acknowledgment blocks: must be checked before submit
- [x] Required field validation before allowing submit
- [x] Submit confirmation page with success state

### PDF Generation & Records
- [ ] On submit: generate PDF of completed Smart File including all selected add-on contract text, payment terms, signature, and field values
- [ ] Store PDF in S3 via storagePut, save URL to assignment record
- [ ] Admin can download completed PDF from assignment detail view

### Status Tracking & Admin Controls
- [ ] Assignment detail view: show full timeline (sent, viewed, in progress, signed, payment selected, completed)
- [ ] Admin list view: filter by status, contact, template
- [ ] Lock completed files (read-only after completion)
- [ ] Void/cancel assignment with confirmation
- [ ] Resend reminder email to client

### Billing Integration
- [ ] When client selects payment option in Smart File, update contact's billing section with: payment option, total amount, discount, monthly amount, due dates, autopay status, contract completion status

## Tech Tasks — Technology Department Section
- [x] DB: create techTasks table (id, ownerId, title, description, status: Backlog/In Progress/In Review/Done/Stuck, priority: High/Medium/Low, category: Implementation/Refinement/Compliance/Bug Fix/Infrastructure, assignee text, dueDate, resourceUrl, completedAt, createdAt, updatedAt)
- [x] DB: create techTaskSubtasks table (id, taskId, title, isComplete, sortOrder, createdAt)
- [x] Run migration and apply SQL
- [x] Backend: techTasks.list, create, update, delete, reorder procedures (protectedProcedure)
- [x] Backend: techTasks.subtasks.create, update, delete procedures
- [x] Tech Tasks page (/tech-tasks): list view grouped by status with progress bars showing subtask completion
- [x] Task card: title, category badge, priority badge, assignee, due date, resource link, subtask progress bar
- [x] Create/edit task dialog: all fields including subtask editor, resource URL, due date+time
- [x] Sidebar nav: add "Tech Tasks" item under Tasks in sidebar nav
- [x] Wire /tech-tasks route in App.tsx
