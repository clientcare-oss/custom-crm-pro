import {
  int,
  bigint,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  tinyint,
  datetime,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended with role field for admin/client separation.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["admin", "client"]).default("client").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Contacts table for managing business contacts.
 * Only visible to the admin (owner).
 */
export const contacts = mysqlTable("contacts", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 30 }),
  company: varchar("company", { length: 200 }),
  jobTitle: varchar("jobTitle", { length: 100 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  zipCode: varchar("zipCode", { length: 20 }),
  country: varchar("country", { length: 100 }),
  notes: text("notes"),
  portalUserId: int("portalUserId"),  // links to users.id when client has a portal account
  caseId: varchar("caseId", { length: 20 }),  // unique case identifier e.g. WP-2026-0001
  parentContactId: int("parentContactId"),  // for students: links to parent contact's id
  hourlyRate: decimal("hourlyRate", { precision: 10, scale: 2 }),  // billing rate per hour
  // Lead intake form fields
  timezone: varchar("timezone", { length: 50 }),
  bestTimeToCall: varchar("bestTimeToCall", { length: 200 }),
  howHeardAboutUs: varchar("howHeardAboutUs", { length: 200 }),
  referredBy: varchar("referredBy", { length: 200 }),
  // Second parent fields (stored on parent contact record)
  secondParentName: varchar("secondParentName", { length: 200 }),
  secondParentPhone: varchar("secondParentPhone", { length: 30 }),
  secondParentEmail: varchar("secondParentEmail", { length: 320 }),
  // Student-specific fields
  dateOfBirth: varchar("dateOfBirth", { length: 20 }),
  diagnosis: text("diagnosis"),
  schoolName: varchar("schoolName", { length: 200 }),
  gradeLevel: varchar("gradeLevel", { length: 50 }),
  countyDistrict: varchar("countyDistrict", { length: 200 }),
  challenges: text("challenges"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;

/**
 * Leads table for sales pipeline tracking.
 * Statuses: New, Follow-up, Qualified, Won, Lost
 */
export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  contactId: int("contactId"),
  source: varchar("source", { length: 100 }),
  status: mysqlEnum("status", ["New", "Follow-up", "Qualified", "Won", "Lost"])
    .default("New")
    .notNull(),
  value: decimal("value", { precision: 12, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

/**
 * Projects table for managing client projects.
 * Links to both owner and client users.
 */
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  clientId: int("clientId"),
  leadId: int("leadId"),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", [
    "Planning",
    "In Progress",
    "On Hold",
    "Completed",
  ])
    .default("Planning")
    .notNull(),
  startDate: datetime("startDate"),
  endDate: datetime("endDate"),
  budget: decimal("budget", { precision: 12, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Project tasks for breaking down project work.
 */
export const projectTasks = mysqlTable("projectTasks", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["Todo", "In Progress", "Done"])
    .default("Todo")
    .notNull(),
  dueDate: datetime("dueDate"),
  assignedTo: int("assignedTo"),
  /** Team member (user) assigned to work on this task */
  assignedToUserId: int("assignedToUserId"),
  priority: mysqlEnum("priority", ["High", "Medium", "Low"]).default("Medium").notNull(),
  seenByClient: boolean("seenByClient").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProjectTask = typeof projectTasks.$inferSelect;
export type InsertProjectTask = typeof projectTasks.$inferInsert;

/**
 * Steps (subtasks) for project tasks — mirrors internalSubtasks pattern.
 */
export const projectTaskSteps = mysqlTable("projectTaskSteps", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  isComplete: boolean("isComplete").default(false).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ProjectTaskStep = typeof projectTaskSteps.$inferSelect;
export type InsertProjectTaskStep = typeof projectTaskSteps.$inferInsert;

/**
 * Project files for storing file references and metadata.
 * Files are stored in S3, only the reference is stored here.
 */
export const projectFiles = mysqlTable("projectFiles", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: text("fileKey").notNull(),
  fileSize: int("fileSize"),
  mimeType: varchar("mimeType", { length: 100 }),
  uploadedBy: int("uploadedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProjectFile = typeof projectFiles.$inferSelect;
export type InsertProjectFile = typeof projectFiles.$inferInsert;

/**
 * Invoices table for billing and payment tracking.
 */
export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  clientId: int("clientId"),
  projectId: int("projectId"),
  invoiceNumber: varchar("invoiceNumber", { length: 50 }).notNull().unique(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 12, scale: 2 }).default("0"),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  status: mysqlEnum("status", [
    "Draft",
    "Sent",
    "Paid",
    "Overdue",
    "Cancelled",
  ])
    .default("Draft")
    .notNull(),
  dueDate: datetime("dueDate"),
  paidDate: datetime("paidDate"),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

/**
 * Invoice line items for itemized billing.
 */
export const invoiceLineItems = mysqlTable("invoiceLineItems", {
  id: int("id").autoincrement().primaryKey(),
  invoiceId: int("invoiceId").notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }).notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
});

export type InvoiceLineItem = typeof invoiceLineItems.$inferSelect;
export type InsertInvoiceLineItem = typeof invoiceLineItems.$inferInsert;

/**
 * Contracts table for managing agreements and proposals.
 */
export const contracts = mysqlTable("contracts", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  clientId: int("clientId"),
  projectId: int("projectId"),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  status: mysqlEnum("status", [
    "Draft",
    "Sent",
    "Signed",
    "Executed",
    "Cancelled",
  ])
    .default("Draft")
    .notNull(),
  signedDate: datetime("signedDate"),
  expiryDate: datetime("expiryDate"),
  signatureUrl: text("signatureUrl"),
  signatureKey: text("signatureKey"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Contract = typeof contracts.$inferSelect;
export type InsertContract = typeof contracts.$inferInsert;

/**
 * Appointments table for scheduling meetings and calls.
 */
export const appointments = mysqlTable("appointments", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  clientId: int("clientId"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  startTime: datetime("startTime").notNull(),
  endTime: datetime("endTime").notNull(),
  location: varchar("location", { length: 255 }),
  status: mysqlEnum("status", [
    "Scheduled",
    "Confirmed",
    "Completed",
    "Cancelled",
  ])
    .default("Scheduled")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;

/**
 * Owner availability for public booking links.
 */
export const ownerAvailability = mysqlTable("ownerAvailability", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  dayOfWeek: tinyint("dayOfWeek").notNull(),
  startTime: varchar("startTime", { length: 5 }).notNull(),
  endTime: varchar("endTime", { length: 5 }).notNull(),
  isAvailable: boolean("isAvailable").default(true).notNull(),
});

export type OwnerAvailability = typeof ownerAvailability.$inferSelect;
export type InsertOwnerAvailability = typeof ownerAvailability.$inferInsert;

/**
 * Messages table for two-way communication between owner and clients.
 */
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  senderId: int("senderId").notNull(),
  recipientId: int("recipientId").notNull(),
  content: text("content").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * Client files table for file uploads from clients.
 * Clients can upload PDFs to share with the owner.
 * Files are stored in S3, only metadata is stored here.
 */
export const clientFiles = mysqlTable("clientFiles", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  projectId: int("projectId"),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: text("fileKey").notNull(),
  fileSize: int("fileSize"),
  mimeType: varchar("mimeType", { length: 100 }).default("application/pdf"),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
});

export type ClientFile = typeof clientFiles.$inferSelect;
export type InsertClientFile = typeof clientFiles.$inferInsert;

/**
 * Vault subscriptions for clients to maintain file access after service ends.
 * Clients can subscribe to monthly/yearly vault storage.
 */
export const vaultSubscriptions = mysqlTable("vaultSubscriptions", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull().unique(),
  tier: mysqlEnum("tier", ["basic", "pro", "enterprise"])
    .default("basic")
    .notNull(),
  storageLimit: int("storageLimit").notNull(),
  storageUsed: int("storageUsed").default(0).notNull(),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  status: mysqlEnum("status", ["active", "cancelled", "past_due"])
    .default("active")
    .notNull(),
  startDate: datetime("startDate").notNull(),
  renewalDate: datetime("renewalDate"),
  cancelledAt: datetime("cancelledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VaultSubscription = typeof vaultSubscriptions.$inferSelect;
export type InsertVaultSubscription = typeof vaultSubscriptions.$inferInsert;

/**
 * Webhooks table for external integrations.
 */
export const webhooks = mysqlTable("webhooks", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  eventType: varchar("eventType", { length: 100 }).notNull(),
  targetUrl: text("targetUrl").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Webhook = typeof webhooks.$inferSelect;
export type InsertWebhook = typeof webhooks.$inferInsert;

/**
 * Case Compass™ — one per client, tracks current case status.
 * When updated, the old version is automatically snapshotted to caseCompassHistory.
 */
export const caseCompass = mysqlTable("caseCompass", {
  id: int("id").autoincrement().primaryKey(),
  caseId: varchar("caseId", { length: 20 }).notNull().unique(),  // links to contacts.caseId
  currentStatus: text("currentStatus"),
  lastMeetingSummary: text("lastMeetingSummary"),
  nextStep: text("nextStep"),
  whoHasBall: text("whoHasBall"),
  nextMeetingDate: datetime("nextMeetingDate"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CaseCompass = typeof caseCompass.$inferSelect;
export type InsertCaseCompass = typeof caseCompass.$inferInsert;

/**
 * Case Compass History — immutable snapshots saved every time the Compass is updated.
 * Provides a full audit trail of case progress over time.
 */
export const caseCompassHistory = mysqlTable("caseCompassHistory", {
  id: int("id").autoincrement().primaryKey(),
  caseId: varchar("caseId", { length: 20 }).notNull(),  // links to contacts.caseId
  currentStatus: text("currentStatus"),
  lastMeetingSummary: text("lastMeetingSummary"),
  nextStep: text("nextStep"),
  whoHasBall: text("whoHasBall"),
  nextMeetingDate: datetime("nextMeetingDate"),
  savedAt: timestamp("savedAt").defaultNow().notNull(),
});

export type CaseCompassHistory = typeof caseCompassHistory.$inferSelect;
export type InsertCaseCompassHistory = typeof caseCompassHistory.$inferInsert;

/**
 * IEP Documents — one record per student contact.
 * Stores the current and previous OFFICIAL IEP/504 document.
 * When a new IEP is uploaded, the current becomes previous automatically (auto-archive).
 * NOTE: Draft IEPs are stored separately in draftIepHistory — they must never mix.
 */
export const iepDocuments = mysqlTable("iepDocuments", {
  id: int("id").autoincrement().primaryKey(),
  contactId: int("contactId").notNull().unique(), // links to contacts.id (student)
  // Current official IEP/504
  currentFileKey: text("currentFileKey"),
  currentFileName: varchar("currentFileName", { length: 255 }),
  currentFileUrl: text("currentFileUrl"),
  currentUploadedAt: timestamp("currentUploadedAt"),
  // Previous official IEP/504 (auto-archived when new one is uploaded)
  previousFileKey: text("previousFileKey"),
  previousFileName: varchar("previousFileName", { length: 255 }),
  previousFileUrl: text("previousFileUrl"),
  previousUploadedAt: timestamp("previousUploadedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type IepDocument = typeof iepDocuments.$inferSelect;
export type InsertIepDocument = typeof iepDocuments.$inferInsert;

/**
 * Draft IEP History — completely separate from official IEP records.
 * Stores school-provided draft IEPs received before meetings.
 * Each upload creates a new row — full history is preserved, nothing is overwritten.
 * AI tools reference this table independently from iepDocuments.
 */
export const draftIepHistory = mysqlTable("draftIepHistory", {
  id: int("id").autoincrement().primaryKey(),
  contactId: int("contactId").notNull(),   // links to contacts.id (student)
  ownerId: int("ownerId").notNull(),
  fileKey: text("fileKey").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  notes: text("notes"),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
});
export type DraftIepHistory = typeof draftIepHistory.$inferSelect;
export type InsertDraftIepHistory = typeof draftIepHistory.$inferInsert;

/**
 * Session types for the Scheduler feature.
 * Each session type defines a bookable meeting format with full configuration.
 */
export const sessionTypes = mysqlTable("sessionTypes", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  // Meeting format
  sessionFormat: mysqlEnum("sessionFormat", ["phone", "video"]).default("phone").notNull(),
  videoType: varchar("videoType", { length: 64 }), // "zoom", "google_meet", "teams", "other"
  videoLink: varchar("videoLink", { length: 512 }),
  // Timing
  timezone: varchar("timezone", { length: 64 }).default("America/New_York").notNull(),
  duration: int("duration").default(60).notNull(),
  durationUnit: mysqlEnum("durationUnit", ["minutes", "hours"]).default("minutes").notNull(),
  // Date range
  dateRange: mysqlEnum("dateRange", ["rolling", "indefinitely", "fixed"]).default("indefinitely").notNull(),
  dateRangeDays: int("dateRangeDays"), // used when dateRange = "rolling"
  // Color (hex or named color key)
  color: varchar("color", { length: 32 }).default("#e11d48").notNull(),
  // Instructions shown on booking page
  instructions: text("instructions"),
  // Confirmation message shown after booking
  confirmationMessage: text("confirmationMessage"),
  // Buffer time
  bufferBefore: int("bufferBefore").default(30).notNull(),
  bufferBeforeUnit: mysqlEnum("bufferBeforeUnit", ["minutes", "hours"]).default("minutes").notNull(),
  bufferAfter: int("bufferAfter").default(6).notNull(),
  bufferAfterUnit: mysqlEnum("bufferAfterUnit", ["minutes", "hours"]).default("hours").notNull(),
  // Minimum notice
  minNotice: int("minNotice").default(3).notNull(),
  minNoticeUnit: mysqlEnum("minNoticeUnit", ["minutes", "hours", "days"]).default("days").notNull(),
  // Custom increments (slot interval in minutes)
  customIncrements: int("customIncrements").default(15).notNull(),
  // Team / round-robin (stored as JSON array of user IDs)
  teamMemberIds: text("teamMemberIds"), // JSON array e.g. "[1,2]"
  // Weekly availability (JSON: { mon: [{start:"08:00",end:"17:00"}], tue: [...], ... })
  weeklyHours: text("weeklyHours"),
  // Reminder settings (JSON array of { method: "email"|"sms"|"both", amount: number, unit: "minutes"|"hours", notifyOwner: boolean })
  reminderSettings: text("reminderSettings"),
  // Confirmation toggles
  canReschedule: boolean("canReschedule").default(true).notNull(),
  canCancel: boolean("canCancel").default(false).notNull(),
  sendConfirmationEmail: boolean("sendConfirmationEmail").default(true).notNull(),
  // Active / inactive
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SessionType = typeof sessionTypes.$inferSelect;
export type InsertSessionType = typeof sessionTypes.$inferInsert;

// ── Workflows ──────────────────────────────────────────────────────────────
export const workflows = mysqlTable("workflows", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 128 }),
  color: varchar("color", { length: 32 }).default("#3b82f6").notNull(),
  canvasData: text("canvasData"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Workflow = typeof workflows.$inferSelect;
export type InsertWorkflow = typeof workflows.$inferInsert;

export const workflowSteps = mysqlTable("workflowSteps", {
  id: int("id").autoincrement().primaryKey(),
  workflowId: int("workflowId").notNull(),
  stepNumber: int("stepNumber").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  notes: text("notes"),
  role: varchar("role", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WorkflowStep = typeof workflowSteps.$inferSelect;
export type InsertWorkflowStep = typeof workflowSteps.$inferInsert;

// ── Internal Tasks (team-only, Monday-style) ───────────────────────────────
export const internalTasks = mysqlTable("internalTasks", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["not_started", "in_progress", "stuck", "complete"])
    .default("not_started")
    .notNull(),
  projectId: int("projectId"),
  assigneeId: int("assigneeId"),
  assigneeContactId: int("assigneeContactId"),
  dueDate: datetime("dueDate"),
  resources: text("resources"), // JSON: [{label, url}]
  linkedFileId: int("linkedFileId"),
  linkedFileName: varchar("linkedFileName", { length: 255 }),
  linkedFileUrl: text("linkedFileUrl"),
  linkedStudentId: int("linkedStudentId"),
  linkedStudentName: varchar("linkedStudentName", { length: 255 }),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InternalTask = typeof internalTasks.$inferSelect;
export type InsertInternalTask = typeof internalTasks.$inferInsert;

export const internalSubtasks = mysqlTable("internalSubtasks", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  isComplete: boolean("isComplete").default(false).notNull(),
  assigneeId: int("assigneeId"),
  dueDate: datetime("dueDate"),
  resources: text("resources"), // JSON: [{label, url}]
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InternalSubtask = typeof internalSubtasks.$inferSelect;
export type InsertInternalSubtask = typeof internalSubtasks.$inferInsert;

// ============ KNOWLEDGE BASE ============
export const knowledgeBase = mysqlTable("knowledgeBase", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }).notNull().default("Other"),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 500 }).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileSize: int("fileSize"),  // bytes
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type KnowledgeBase = typeof knowledgeBase.$inferSelect;
export type InsertKnowledgeBase = typeof knowledgeBase.$inferInsert;

// ============ TIME ENTRIES ============
export const timeEntries = mysqlTable("timeEntries", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull(),
  ownerId: int("ownerId").notNull(),
  startedAt: bigint("startedAt", { mode: "number" }).notNull(),
  endedAt: bigint("endedAt", { mode: "number" }),
  durationSeconds: int("durationSeconds"),
  notes: text("notes"),
  hourlyRate: decimal("hourlyRate", { precision: 10, scale: 2 }),
  billable: boolean("billable").default(true).notNull(),
  invoiced: boolean("invoiced").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type TimeEntry = typeof timeEntries.$inferSelect;
export type InsertTimeEntry = typeof timeEntries.$inferInsert;

// ============ WALKTHROUGHS (SOP) ============
import { json } from "drizzle-orm/mysql-core";

export const walkthroughs = mysqlTable("walkthroughs", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }).default("General").notNull(),
  // JSON array of steps: [{id, title, instructions, script, notes, order}]
  steps: json("steps").notNull().$type<Array<{
    id: string;
    title: string;
    instructions: string;
    script?: string;
    notes?: string;
    order: number;
  }>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Walkthrough = typeof walkthroughs.$inferSelect;
export type InsertWalkthrough = typeof walkthroughs.$inferInsert;

export const walkthroughRuns = mysqlTable("walkthroughRuns", {
  id: int("id").autoincrement().primaryKey(),
  walkthroughId: int("walkthroughId").notNull(),
  studentId: int("studentId"),
  ownerId: int("ownerId").notNull(),
  // JSON array of completed step IDs
  completedSteps: json("completedSteps").notNull().$type<string[]>(),
  status: varchar("status", { length: 50 }).default("in_progress").notNull(),
  notes: text("notes"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});
export type WalkthroughRun = typeof walkthroughRuns.$inferSelect;
export type InsertWalkthroughRun = typeof walkthroughRuns.$inferInsert;

// ============ QUO (OPENPHONE) CALL LOGS ============
export const callLogs = mysqlTable("callLogs", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  studentId: int("studentId"),           // null = unassigned
  quoCallId: varchar("quoCallId", { length: 255 }).unique(),
  fromNumber: varchar("fromNumber", { length: 30 }),
  toNumber: varchar("toNumber", { length: 30 }),
  durationSeconds: int("durationSeconds").default(0),
  direction: varchar("direction", { length: 20 }).default("inbound"),
  transcript: text("transcript"),
  summary: text("summary"),
  participants: json("participants").$type<string[]>(),
  status: varchar("status", { length: 20 }).default("unassigned").notNull(),
  matchedPhone: varchar("matchedPhone", { length: 30 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  assignedAt: timestamp("assignedAt"),
});
export type CallLog = typeof callLogs.$inferSelect;
export type InsertCallLog = typeof callLogs.$inferInsert;

// ============ TEAM MANAGEMENT ============
/**
 * Team invites — owner sends invite links to staff.
 * When accepted, the invited user's record is linked via acceptedUserId.
 * role: 'admin' = full access; 'member' = view/edit clients, no billing/settings.
 */
export const teamInvites = mysqlTable("teamInvites", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),          // the owner who sent the invite
  email: varchar("email", { length: 320 }).notNull(),
  name: varchar("name", { length: 200 }),
  role: mysqlEnum("role", ["admin", "member"]).default("member").notNull(),
  token: varchar("token", { length: 128 }).notNull().unique(), // invite link token
  status: mysqlEnum("status", ["pending", "accepted", "revoked"]).default("pending").notNull(),
  acceptedUserId: int("acceptedUserId"),       // links to users.id once accepted
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  acceptedAt: timestamp("acceptedAt"),
});
export type TeamInvite = typeof teamInvites.$inferSelect;
export type InsertTeamInvite = typeof teamInvites.$inferInsert;

/**
 * Case Assignments — links team members to specific student/contact cases.
 * Drives the "Visible to" participant bar on the student detail page.
 */
export const caseAssignments = mysqlTable("caseAssignments", {
  id: int("id").autoincrement().primaryKey(),
  contactId: int("contactId").notNull(),       // the student/contact (case)
  teamInviteId: int("teamInviteId").notNull(), // links to teamInvites.id
  assignedBy: int("assignedBy").notNull(),     // owner user id
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
});
export type CaseAssignment = typeof caseAssignments.$inferSelect;
export type InsertCaseAssignment = typeof caseAssignments.$inferInsert;

/**
 * BrainDump — fast idea capture workspace for advocates.
 * ADHD-friendly second brain for operational intelligence and creative ideas.
 */
export const brainDumpItems = mysqlTable("brainDumpItems", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  category: varchar("category", { length: 100 }).default("General").notNull(),
  status: mysqlEnum("status", ["not_started", "in_progress", "done", "archived"]).default("not_started").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
  nextStep: text("nextStep"),
  pinned: boolean("pinned").default(false).notNull(),
  tags: text("tags"),   // JSON array of strings
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type BrainDumpItem = typeof brainDumpItems.$inferSelect;
export type InsertBrainDumpItem = typeof brainDumpItems.$inferInsert;

// ─── Bill Guardian™ ──────────────────────────────────────────────────────────
export const billGuardianAccounts = mysqlTable("billGuardianAccounts", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  bankName: varchar("bankName", { length: 255 }).notNull(),
  accountName: varchar("accountName", { length: 255 }).notNull(),
  accountType: varchar("accountType", { length: 100 }).default("checking").notNull(),
  lastSyncedAt: timestamp("lastSyncedAt"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type BillGuardianAccount = typeof billGuardianAccounts.$inferSelect;
export type InsertBillGuardianAccount = typeof billGuardianAccounts.$inferInsert;

export const billGuardianBills = mysqlTable("billGuardianBills", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  vendorName: varchar("vendorName", { length: 255 }).notNull(),
  vendorAliases: text("vendorAliases"),
  expectedAmount: decimal("expectedAmount", { precision: 10, scale: 2 }).notNull(),
  dueDay: int("dueDay").notNull(),
  frequency: mysqlEnum("frequency", ["monthly", "quarterly", "annual", "weekly"]).default("monthly").notNull(),
  category: varchar("category", { length: 100 }).default("General").notNull(),
  autopay: boolean("autopay").default(false).notNull(),
  priority: mysqlEnum("priority", ["critical", "high", "medium", "low"]).default("medium").notNull(),
  notes: text("notes"),
  fileKey: varchar("fileKey", { length: 500 }),
  fileUrl: varchar("fileUrl", { length: 1000 }),
  fileName: varchar("fileName", { length: 255 }),
  paymentLink: varchar("paymentLink", { length: 1000 }),
  paymentLinkNote: text("paymentLinkNote"),
  manuallyPaid: boolean("manuallyPaid").default(false).notNull(),
  manuallyPaidAt: timestamp("manuallyPaidAt"),
  paymentStatus: mysqlEnum("paymentStatus", ["unpaid", "paid", "autopay_on", "disputed", "skipped"]).default("unpaid").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type BillGuardianBill = typeof billGuardianBills.$inferSelect;
export type InsertBillGuardianBill = typeof billGuardianBills.$inferInsert;

export const billGuardianTransactions = mysqlTable("billGuardianTransactions", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  bankAccountId: int("bankAccountId"),
  externalId: varchar("externalId", { length: 255 }),
  description: varchar("description", { length: 500 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  transactionDate: timestamp("transactionDate").notNull(),
  category: varchar("category", { length: 100 }),
  matchedBillId: int("matchedBillId"),
  matchStatus: mysqlEnum("matchStatus", ["unmatched", "matched", "duplicate", "increased", "needs_review", "ignored"]).default("unmatched").notNull(),
  matchConfidence: int("matchConfidence").default(0).notNull(),
  matchNotes: text("matchNotes"),
  isManuallyVerified: boolean("isManuallyVerified").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type BillGuardianTransaction = typeof billGuardianTransactions.$inferSelect;
export type InsertBillGuardianTransaction = typeof billGuardianTransactions.$inferInsert;


// ============ PROJECT NOTES ============
/**
 * Project notes for student projects.
 * Each note can be visible to client portal (isVisibleToClient=true) or advocate-only (isVisibleToClient=false).
 * Supports rich text content with auto-save and edit history tracking.
 */
export const projectNotes = mysqlTable("projectNotes", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(), // Rich text content (HTML or markdown)
  isVisibleToClient: boolean("isVisibleToClient").default(false).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProjectNote = typeof projectNotes.$inferSelect;
export type InsertProjectNote = typeof projectNotes.$inferInsert;

/**
 * Project notes history for tracking edits and changes.
 * Immutable snapshots saved every time a note is updated.
 */
export const projectNotesHistory = mysqlTable("projectNotesHistory", {
  id: int("id").autoincrement().primaryKey(),
  noteId: int("noteId").notNull(),
  projectId: int("projectId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  isVisibleToClient: boolean("isVisibleToClient").notNull(),
  editedBy: int("editedBy").notNull(),
  savedAt: timestamp("savedAt").defaultNow().notNull(),
});

export type ProjectNotesHistory = typeof projectNotesHistory.$inferSelect;
export type InsertProjectNotesHistory = typeof projectNotesHistory.$inferInsert;

// ============ AI CONNECTIONS ============
/**
 * AI Connections: user-defined AI action buttons with custom prompts.
 * Each connection appears as a button on student pages in the specified location.
 * When clicked, runs the prompt with student context and writes output to the specified target.
 */
export const aiConnections = mysqlTable("aiConnections", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  icon: varchar("icon", { length: 50 }).notNull().default("Sparkles"),
  color: varchar("color", { length: 50 }).notNull().default("blue"),
  location: mysqlEnum("location", ["notes", "compass", "files", "tasks", "details", "any"]).notNull().default("notes"),
  outputTarget: mysqlEnum("outputTarget", ["note", "compass", "popup"]).notNull().default("popup"),
  promptTemplate: text("promptTemplate").notNull(),
  description: varchar("description", { length: 500 }),
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AiConnection = typeof aiConnections.$inferSelect;
export type InsertAiConnection = typeof aiConnections.$inferInsert;

/**
 * AI Connection run history: records each time a button was clicked and the AI result.
 */
export const aiConnectionRuns = mysqlTable("aiConnectionRuns", {
  id: int("id").autoincrement().primaryKey(),
  connectionId: int("connectionId").notNull(),
  contactId: int("contactId").notNull(),
  projectId: int("projectId"),
  inputSummary: text("inputSummary"),
  outputText: text("outputText").notNull(),
  savedToNoteId: int("savedToNoteId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AiConnectionRun = typeof aiConnectionRuns.$inferSelect;
export type InsertAiConnectionRun = typeof aiConnectionRuns.$inferInsert;

/**
 * Lead Forms table for managing multiple custom intake forms.
 * Each form has a unique slug for its public URL (/form/:slug).
 */
export const leadForms = mysqlTable("leadForms", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull(),
  description: text("description"),
  // Scheduling options
  schedulingEnabled: boolean("schedulingEnabled").default(false).notNull(),
  schedulingUrl: text("schedulingUrl"),
  schedulingLabel: varchar("schedulingLabel", { length: 200 }),
  // Custom fields config — JSON array of enabled field keys (null = all fields enabled)
  fields: text("fields"),
  // Status
  isActive: boolean("isActive").default(true).notNull(),
  submissionCount: int("submissionCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LeadForm = typeof leadForms.$inferSelect;
export type InsertLeadForm = typeof leadForms.$inferInsert;
