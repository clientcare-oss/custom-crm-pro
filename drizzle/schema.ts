import {
  int,
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
  phone: varchar("phone", { length: 20 }),
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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProjectTask = typeof projectTasks.$inferSelect;
export type InsertProjectTask = typeof projectTasks.$inferInsert;

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
 * Stores the current and previous IEP/504 document.
 * When a new IEP is uploaded, the current becomes previous automatically (auto-archive).
 */
export const iepDocuments = mysqlTable("iepDocuments", {
  id: int("id").autoincrement().primaryKey(),
  contactId: int("contactId").notNull().unique(), // links to contacts.id (student)
  // Current IEP/504
  currentFileKey: text("currentFileKey"),
  currentFileName: varchar("currentFileName", { length: 255 }),
  currentFileUrl: text("currentFileUrl"),
  currentUploadedAt: timestamp("currentUploadedAt"),
  // Previous IEP/504 (auto-archived when new one is uploaded)
  previousFileKey: text("previousFileKey"),
  previousFileName: varchar("previousFileName", { length: 255 }),
  previousFileUrl: text("previousFileUrl"),
  previousUploadedAt: timestamp("previousUploadedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type IepDocument = typeof iepDocuments.$inferSelect;
export type InsertIepDocument = typeof iepDocuments.$inferInsert;
